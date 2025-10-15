import { json, error } from '@sveltejs/kit';
import { promises as dns } from 'node:dns';
import { connect as netConnect } from 'node:net';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

type Action = 'mx-health' | 'spf-check' | 'dmarc-check';

interface BaseReq {
  action: Action;
}

interface MXHealthReq extends BaseReq {
  action: 'mx-health';
  domain: string;
  checkPorts?: boolean;
}

interface SPFCheckReq extends BaseReq {
  action: 'spf-check';
  domain: string;
}

interface DMARCCheckReq extends BaseReq {
  action: 'dmarc-check';
  domain: string;
}

type RequestBody = MXHealthReq | SPFCheckReq | DMARCCheckReq;

interface MXRecord {
  priority: number;
  exchange: string;
  addresses?: { ipv4: string[]; ipv6: string[] };
  portChecks?: { port: number; open: boolean; latency?: number }[];
  error?: string;
}

async function resolveMXRecords(domain: string): Promise<MXRecord[]> {
  try {
    const mxRecords = await dns.resolveMx(domain);
    const results: MXRecord[] = [];

    for (const mx of mxRecords) {
      const record: MXRecord = {
        priority: mx.priority,
        exchange: mx.exchange,
      };

      try {
        // Resolve A and AAAA records for the MX host
        const [ipv4, ipv6] = await Promise.allSettled([
          dns.resolve4(mx.exchange).catch(() => []),
          dns.resolve6(mx.exchange).catch(() => []),
        ]);

        record.addresses = {
          ipv4: ipv4.status === 'fulfilled' ? ipv4.value : [],
          ipv6: ipv6.status === 'fulfilled' ? ipv6.value : [],
        };
      } catch (err: unknown) {
        record.error = `Failed to resolve addresses: ${err instanceof Error ? (err as Error).message : 'Unknown error'}`;
      }

      results.push(record);
    }

    return results.sort((a, b) => a.priority - b.priority);
  } catch (err: unknown) {
    throw new Error(`Failed to resolve MX records: ${err instanceof Error ? (err as Error).message : 'Unknown error'}`);
  }
}

async function checkTCPPort(
  host: string,
  port: number,
  timeout: number = 5000,
): Promise<{ open: boolean; latency?: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = netConnect({ host, port, timeout });

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.on('connect', () => {
      const latency = Date.now() - start;
      cleanup();
      resolve({ open: true, latency });
    });

    socket.on('error', () => {
      cleanup();
      resolve({ open: false });
    });

    socket.on('timeout', () => {
      cleanup();
      resolve({ open: false });
    });
  });
}

async function checkMXHealth(domain: string, checkPorts: boolean = false): Promise<any> {
  const mxRecords = await resolveMXRecords(domain);

  if (checkPorts) {
    const ports = [25, 587, 465]; // SMTP, Submission, SMTPS

    for (const record of mxRecords) {
      if (record.addresses && !record.error) {
        record.portChecks = [];

        // Test ports on the first available IP (prefer IPv4)
        const testIP = record.addresses.ipv4[0] || record.addresses.ipv6[0];
        if (testIP) {
          for (const port of ports) {
            const result = await checkTCPPort(testIP, port);
            record.portChecks.push({ port, ...result });
          }
        }
      }
    }
  }

  // Calculate health summary
  const totalMX = mxRecords.length;
  const healthyMX = mxRecords.filter(
    (mx) => !mx.error && mx.addresses && (mx.addresses.ipv4.length > 0 || mx.addresses.ipv6.length > 0),
  ).length;
  const reachableMX = checkPorts ? mxRecords.filter((mx) => mx.portChecks?.some((p) => p.open)).length : null;

  return {
    domain,
    mxRecords,
    summary: {
      totalMX,
      healthyMX,
      reachableMX,
      healthy: healthyMX === totalMX && totalMX > 0,
      hasRedundancy: totalMX > 1,
    },
  };
}

// Re-use DNS functions for SPF and DMARC
async function checkSPF(domain: string): Promise<any> {
  // Call the DNS endpoint internally
  const response = await fetch('http://localhost:5174/api/internal/diagnostics/dns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'spf-evaluator', domain }),
  });

  if (!response.ok) {
    throw new Error(`SPF check failed: ${response.status}`);
  }

  const result = await response.json();

  // Add email-specific analysis
  return {
    ...result,
    emailAnalysis: {
      hasHardFail: result.record?.includes('~all') === false && result.record?.includes('-all'),
      hasSoftFail: result.record?.includes('~all'),
      allowsAll: result.record?.includes('+all'),
      deliverabilityRisk: result.record?.includes('-all') ? 'low' : result.record?.includes('~all') ? 'medium' : 'high',
    },
  };
}

async function checkDMARC(domain: string): Promise<any> {
  // Call the DNS endpoint internally
  const response = await fetch('http://localhost:5174/api/internal/diagnostics/dns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dmarc-check', domain }),
  });

  if (!response.ok) {
    throw new Error(`DMARC check failed: ${response.status}`);
  }

  const result = await response.json();

  // Add email deliverability hints
  if (result.hasRecord && result.parsed) {
    const policy = result.parsed.policy;
    const alignment = result.parsed.alignment;

    result.deliverabilityHints = {
      policyImpact:
        (
          {
            none: 'No impact on delivery - monitoring only',
            quarantine: 'Failed messages may go to spam/junk folder',
            reject: 'Failed messages will be rejected outright',
          } as any
        )[policy] || 'Unknown policy impact',

      alignmentComplexity: {
        strict:
          alignment.dkim === 's' || alignment.spf === 's'
            ? "Strict alignment may cause delivery issues if domains don't match exactly"
            : null,
        relaxed: 'Relaxed alignment allows organizational domain matching',
      },

      recommendations: [
        ...(policy === 'none' ? ['Consider upgrading to p=quarantine after monitoring'] : []),
        ...(policy === 'quarantine' ? ['Consider upgrading to p=reject for maximum protection'] : []),
        ...(!result.parsed.reporting?.aggregate ? ['Add rua= for aggregate reporting'] : []),
        ...(result.parsed.percentage !== '100' ? ['Consider increasing percentage to 100%'] : []),
      ],
    };
  }

  return result;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: RequestBody = await request.json();

    switch (body.action) {
      case 'mx-health': {
        const { domain, checkPorts = false } = body as MXHealthReq;
        const result = await checkMXHealth(domain, checkPorts);
        return json(result);
      }

      case 'spf-check': {
        const { domain } = body as SPFCheckReq;
        const result = await checkSPF(domain);
        return json(result);
      }

      case 'dmarc-check': {
        const { domain } = body as DMARCCheckReq;
        const result = await checkDMARC(domain);
        return json(result);
      }

      default:
        throw error(400, `Unknown action: ${(body as any).action}`);
    }
  } catch (err: unknown) {
    errorManager.captureException(err, 'error', { component: 'Email API' });
    throw error(500, `Email diagnostics failed: ${(err as Error).message}`);
  }
};
