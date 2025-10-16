import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as dns } from 'node:dns';
import { errorManager } from '$lib/utils/error-manager';

interface DNSBLRequest {
  target: string; // IP or domain
}

interface RBLResult {
  rbl: string;
  listed: boolean;
  response?: string;
  reason?: string;
  responseTime: number;
  error?: string;
  url?: string;
  description?: string;
}

interface DNSBLResponse {
  target: string;
  targetType: 'ipv4' | 'ipv6' | 'domain';
  resolvedIPs?: string[];
  results: RBLResult[];
  summary: {
    totalChecked: number;
    listedCount: number;
    cleanCount: number;
    errorCount: number;
  };
  timestamp: string;
}

type RBLType = 'ip' | 'domain' | 'both';

interface RBL {
  zone: string;
  name: string;
  description?: string;
  url?: string;
  type: RBLType;
  requiresAuth?: boolean;
  supportsIPv6?: boolean;
}

// Comprehensive list of major RBLs with explicit types
const RBLS: RBL[] = [
  // Spamhaus
  {
    zone: 'zen.spamhaus.org',
    name: 'Spamhaus ZEN',
    description: 'Combined blocklist',
    url: 'https://www.spamhaus.org/lookup/',
    type: 'both',
    supportsIPv6: true,
  },
  {
    zone: 'sbl.spamhaus.org',
    name: 'Spamhaus SBL',
    description: 'Spam sources',
    url: 'https://www.spamhaus.org/lookup/',
    type: 'ip',
    supportsIPv6: true,
  },
  {
    zone: 'xbl.spamhaus.org',
    name: 'Spamhaus XBL',
    description: 'Exploits',
    url: 'https://www.spamhaus.org/lookup/',
    type: 'ip',
    supportsIPv6: true,
  },
  {
    zone: 'pbl.spamhaus.org',
    name: 'Spamhaus PBL',
    description: 'Policy blocklist',
    url: 'https://www.spamhaus.org/lookup/',
    type: 'ip',
    supportsIPv6: true,
  },
  {
    zone: 'dbl.spamhaus.org',
    name: 'Spamhaus DBL',
    description: 'Domain blocklist',
    url: 'https://www.spamhaus.org/lookup/',
    type: 'domain',
  },

  // SORBS
  {
    zone: 'dnsbl.sorbs.net',
    name: 'SORBS',
    description: 'Spam sources',
    url: 'https://www.sorbs.net/lookup.shtml',
    type: 'ip',
    supportsIPv6: false,
  },

  // SpamCop
  {
    zone: 'bl.spamcop.net',
    name: 'SpamCop',
    description: 'Spam reports',
    url: 'https://www.spamcop.net/bl.shtml',
    type: 'ip',
    supportsIPv6: false,
  },

  // Barracuda
  {
    zone: 'b.barracudacentral.org',
    name: 'Barracuda',
    description: 'Reputation system',
    url: 'https://barracudacentral.org/lookups',
    type: 'ip',
    requiresAuth: true,
    supportsIPv6: false,
  },

  // UCEPROTECT
  {
    zone: 'dnsbl-1.uceprotect.net',
    name: 'UCEPROTECT L1',
    description: 'Single IPs',
    url: 'https://www.uceprotect.net/en/rblcheck.php',
    type: 'ip',
    supportsIPv6: false,
  },
  {
    zone: 'dnsbl-2.uceprotect.net',
    name: 'UCEPROTECT L2',
    description: 'ISP ranges',
    url: 'https://www.uceprotect.net/en/rblcheck.php',
    type: 'ip',
    supportsIPv6: false,
  },
  {
    zone: 'dnsbl-3.uceprotect.net',
    name: 'UCEPROTECT L3',
    description: 'Countries/ASNs',
    url: 'https://www.uceprotect.net/en/rblcheck.php',
    type: 'ip',
    supportsIPv6: false,
  },

  // PSBL
  {
    zone: 'psbl.surriel.com',
    name: 'PSBL',
    description: 'Passive spam block',
    url: 'https://psbl.org/',
    type: 'ip',
    supportsIPv6: false,
  },

  // Others
  {
    zone: 'dnsbl.dronebl.org',
    name: 'DroneBL',
    description: 'Drones/zombies',
    url: 'https://dronebl.org/lookup',
    type: 'ip',
    supportsIPv6: true,
  },
  {
    zone: 'spam.dnsbl.sorbs.net',
    name: 'SORBS Spam',
    description: 'Verified spam',
    url: 'https://www.sorbs.net/lookup.shtml',
    type: 'ip',
    supportsIPv6: false,
  },
  {
    zone: 'dul.dnsbl.sorbs.net',
    name: 'SORBS DUL',
    description: 'Dynamic IPs',
    url: 'https://www.sorbs.net/lookup.shtml',
    type: 'ip',
    supportsIPv6: false,
  },
  {
    zone: 'bl.blocklist.de',
    name: 'Blocklist.de',
    description: 'Abusive mail servers',
    url: 'https://www.blocklist.de/en/index.html',
    type: 'ip',
    supportsIPv6: false,
  },
  {
    zone: 'bl.mailspike.net',
    name: 'Mailspike',
    description: 'Mailspike abuse list',
    url: 'https://mailspike.org/',
    type: 'ip',
    supportsIPv6: false,
  },
  {
    zone: 'all.spamrats.com',
    name: 'SpamRats',
    description: 'SpamRats RBL',
    url: 'https://www.spamrats.com/',
    type: 'ip',
    supportsIPv6: false,
  },
  {
    zone: 'multi.surbl.org',
    name: 'SURBL Multi',
    description: 'URI/domain lists',
    url: 'https://www.surbl.org/',
    type: 'domain',
  },
];

const DNS_TIMEOUT_MS = 1000;
const CONCURRENCY_LIMIT = 8;

function isIPv4(str: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str);
}

function isIPv6(str: string): boolean {
  return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(str);
}

function reverseIPv4(ip: string): string {
  return ip.split('.').reverse().join('.');
}

function reverseIPv6(ip: string): string {
  // Strip scope id if present (e.g. fe80::1%eth0)
  const scoped = ip.split('%')[0].toLowerCase();

  // Split and expand :: once
  const parts = scoped.split('::');
  const left = parts[0]?.split(':').filter(Boolean) ?? [];
  const right = parts[1]?.split(':').filter(Boolean) ?? [];

  // Pad to 8 groups
  const pad = 8 - (left.length + right.length);
  if (pad < 0) throw new Error('Invalid IPv6 address');

  const full = [...left, ...Array(pad).fill('0'), ...right].map((h) => h.padStart(4, '0'));

  // Convert to nibbles, reverse, dotted
  return full.join('').split('').reverse().join('.');
}

function withTimeout<T>(promise: Promise<T>, ms = DNS_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            Object.assign(new Error('DNS query timeout'), {
              code: 'ETIMEOUT',
            }),
          ),
        ms,
      ),
    ),
  ]);
}

function pLimit(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;

  const next = () => {
    active--;
    queue.shift()?.();
  };

  return <T>(fn: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(resolve, reject).finally(next);
      };
      if (active < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
}

function canQuery(rbl: RBL, targetType: DNSBLResponse['targetType']): boolean {
  if (rbl.type === 'both') return true;
  if (rbl.type === 'domain') return targetType === 'domain';
  // rbl.type === 'ip'
  if (targetType === 'ipv4') return true;
  if (targetType === 'ipv6') return rbl.supportsIPv6 ?? false;
  return false;
}

async function checkRBL(ip: string, rbl: RBL, isDomain: boolean): Promise<RBLResult> {
  const startTime = Date.now();

  try {
    let query: string;

    if (isDomain) {
      query = `${ip}.${rbl.zone}`;
    } else if (isIPv4(ip)) {
      query = `${reverseIPv4(ip)}.${rbl.zone}`;
    } else if (isIPv6(ip)) {
      query = `${reverseIPv6(ip)}.${rbl.zone}`;
    } else {
      throw new Error('Invalid IP format');
    }

    const addresses = (await withTimeout(dns.resolve4(query))) as string[];
    const responseTime = Date.now() - startTime;

    // Get TXT record for listing reason
    let reason: string | undefined;
    try {
      const txtRecords = (await withTimeout(dns.resolveTxt(query))) as string[][];
      reason = txtRecords.flat().join(' ');
    } catch {
      // TXT record optional
    }

    const response = addresses[0];
    const isErrorA = response.startsWith('127.255.');
    const isBlockedTXT = /open resolver|query refused|access denied|blocked - see|please use|not supported/i.test(
      reason ?? '',
    );

    if (isErrorA || isBlockedTXT) {
      return {
        rbl: rbl.name,
        listed: false,
        responseTime,
        error: reason || 'RBL query blocked or unsupported',
      };
    }

    return {
      rbl: rbl.name,
      listed: true,
      response,
      reason,
      responseTime,
      url: rbl.url,
      description: rbl.description,
    };
  } catch (err: any) {
    const responseTime = Date.now() - startTime;

    const notListedCodes = new Set(['ENOTFOUND', 'ENODATA']);
    if (notListedCodes.has(err?.code)) {
      return {
        rbl: rbl.name,
        listed: false,
        responseTime,
      };
    }

    // Handle timeout specifically
    if (err?.code === 'ETIMEOUT') {
      return {
        rbl: rbl.name,
        listed: false,
        responseTime,
        error: 'Query timeout (>1s)',
      };
    }

    return {
      rbl: rbl.name,
      listed: false,
      responseTime,
      error: err?.message ?? String(err),
    };
  }
}

async function resolveTarget(target: string): Promise<{ type: 'ipv4' | 'ipv6' | 'domain'; ips?: string[] }> {
  if (isIPv4(target)) {
    return { type: 'ipv4' };
  }

  if (isIPv6(target)) {
    return { type: 'ipv6' };
  }

  // It's a domain, resolve to IPs
  try {
    const ips: string[] = [];
    let lastError: Error | null = null;

    try {
      const ipv4s = await dns.resolve4(target);
      ips.push(...ipv4s);
    } catch (err) {
      lastError = err as Error;
    }

    try {
      const ipv6s = await dns.resolve6(target);
      ips.push(...ipv6s);
    } catch (err) {
      if (!lastError) lastError = err as Error;
    }

    if (ips.length === 0) {
      if (lastError && 'code' in lastError) {
        if (lastError.code === 'ENOTFOUND') {
          throw new Error(`Domain "${target}" does not exist or could not be found`);
        } else if (lastError.code === 'ENODATA') {
          throw new Error(`Domain "${target}" exists but has no A or AAAA records`);
        } else if (lastError.code === 'ETIMEOUT') {
          throw new Error(`DNS lookup timed out for "${target}"`);
        }
      }
      throw new Error(`Could not resolve domain "${target}" to any IP addresses`);
    }

    return { type: 'domain', ips };
  } catch (err) {
    throw new Error(`Failed to resolve domain: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: DNSBLRequest = await request.json();
    const { target } = body;

    if (!target || typeof target !== 'string' || !target.trim()) {
      throw error(400, 'Target IP or domain is required');
    }

    let trimmedTarget = target.trim().toLowerCase();

    // Strip trailing dot on FQDNs
    if (trimmedTarget.endsWith('.')) {
      trimmedTarget = trimmedTarget.slice(0, -1);
    }

    // Normalize domains with punycode (if available in Node.js version)
    if (!isIPv4(trimmedTarget) && !isIPv6(trimmedTarget)) {
      try {
        // Try to use domainToASCII if available
        const urlModule = await import('node:url');
        if ('domainToASCII' in urlModule) {
          trimmedTarget = (urlModule as any).domainToASCII(trimmedTarget);
        }
      } catch {
        // If punycode fails, continue with original
      }
    }

    const { type, ips } = await resolveTarget(trimmedTarget);

    const limit = pLimit(CONCURRENCY_LIMIT);
    let allResults: RBLResult[] = [];

    if (type === 'domain') {
      // Check domain blacklists
      const domainRBLs = RBLS.filter((r) => canQuery(r, 'domain'));
      const domainChecks = domainRBLs.map((rbl) => limit(() => checkRBL(trimmedTarget, rbl, true)));
      allResults.push(...(await Promise.all(domainChecks)));

      // Check IPs against IP blacklists
      if (ips?.length) {
        for (const ip of ips) {
          const ipType = isIPv4(ip) ? 'ipv4' : 'ipv6';
          const ipRBLs = RBLS.filter((r) => canQuery(r, ipType));
          const ipChecks = ipRBLs.map((rbl) => limit(() => checkRBL(ip, rbl, false)));
          const ipResults = await Promise.all(ipChecks);
          allResults.push(...ipResults.map((r) => ({ ...r, rbl: `${r.rbl} (${ip})` })));
        }
      }
    } else {
      const ipRBLs = RBLS.filter((r) => canQuery(r, type));
      const checks = ipRBLs.map((rbl) => limit(() => checkRBL(trimmedTarget, rbl, false)));
      allResults = await Promise.all(checks);
    }

    const summary = {
      totalChecked: allResults.length,
      listedCount: allResults.filter((r) => r.listed).length,
      cleanCount: allResults.filter((r) => !r.listed && !r.error).length,
      errorCount: allResults.filter((r) => r.error).length,
    };

    const response: DNSBLResponse = {
      target: trimmedTarget,
      targetType: type,
      resolvedIPs: ips,
      results: allResults,
      summary,
      timestamp: new Date().toISOString(),
    };

    return json(response);
  } catch (err) {
    errorManager.captureException(err, 'error', { component: 'DNSBL API' });
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, `DNSBL check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
