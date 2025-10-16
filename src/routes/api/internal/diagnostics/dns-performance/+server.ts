import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as dns } from 'node:dns';
import type { MxRecord, SoaRecord } from 'node:dns';
import { errorManager } from '$lib/utils/error-manager';

interface DNSPerformanceRequest {
  domain: string;
  recordType?: string;
  customResolvers?: string[];
  includeDefaultResolvers?: boolean;
  timeoutMs?: number;
}

interface ResolverResult {
  resolver: string;
  resolverName: string;
  success: boolean;
  responseTime: number;
  records?: string[];
  error?: string;
}

interface DNSPerformanceResponse {
  domain: string;
  recordType: string;
  results: ResolverResult[];
  statistics: {
    fastest: { resolver: string; time: number };
    slowest: { resolver: string; time: number };
    average: number;
    median: number;
    successRate: number;
  };
  timestamp: string;
}

const RESOLVERS = [
  { ip: '1.1.1.1', name: 'Cloudflare' },
  { ip: '8.8.8.8', name: 'Google' },
  { ip: '9.9.9.9', name: 'Quad9' },
  { ip: '208.67.222.222', name: 'OpenDNS' },
  { ip: '76.76.2.0', name: 'ControlD' },
  { ip: '94.140.14.14', name: 'AdGuard' },
  { ip: '185.228.168.9', name: 'CleanBrowsing' },
  { ip: '77.88.8.8', name: 'Yandex' },
];

const DNS_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 30000;
const MIN_TIMEOUT_MS = 1000;
const RECORD_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'] as const;
const MAX_DOMAIN_LENGTH = 253;
const MAX_CUSTOM_RESOLVERS = 20;
const DOMAIN_PATTERN = /^([a-zA-Z0-9_]([a-zA-Z0-9_-]{0,61}[a-zA-Z0-9_])?\.)+[a-zA-Z]{2,}$/;
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_PATTERN = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

function withTimeout<T>(promise: Promise<T>, ms = DNS_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('DNS query timeout'), { code: 'ETIMEOUT' })), ms),
    ),
  ]);
}

function validateDomain(domain: string): boolean {
  if (!domain || domain.length > MAX_DOMAIN_LENGTH) return false;
  return DOMAIN_PATTERN.test(domain);
}

function validateIPAddress(ip: string): boolean {
  if (!ip || typeof ip !== 'string' || ip.length > 45) return false;

  // Validate IPv4
  if (IPV4_PATTERN.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  // Validate IPv6
  if (IPV6_PATTERN.test(ip)) {
    const segments = ip.split(':');
    return segments.length >= 3 && segments.length <= 8;
  }

  return false;
}

async function queryResolver(
  domain: string,
  recordType: string,
  resolverIp: string,
  timeoutMs = DNS_TIMEOUT_MS,
): Promise<{ records: string[]; time: number }> {
  const resolver = new dns.Resolver();
  resolver.setServers([resolverIp]);

  const startTime = performance.now();

  let records: string[];
  switch (recordType.toUpperCase()) {
    case 'A':
      records = await withTimeout(resolver.resolve4(domain), timeoutMs);
      break;
    case 'AAAA':
      records = await withTimeout(resolver.resolve6(domain), timeoutMs);
      break;
    case 'MX': {
      const mxRecords = (await withTimeout(resolver.resolveMx(domain), timeoutMs)) as MxRecord[];
      records = mxRecords.map((r: MxRecord) => `${r.priority} ${r.exchange}`);
      break;
    }
    case 'TXT': {
      const txtRecords = (await withTimeout(resolver.resolveTxt(domain), timeoutMs)) as string[][];
      records = txtRecords.map((r: string[]) => r.join(' '));
      break;
    }
    case 'NS':
      records = await withTimeout(resolver.resolveNs(domain), timeoutMs);
      break;
    case 'CNAME':
      records = await withTimeout(resolver.resolveCname(domain), timeoutMs);
      break;
    case 'SOA': {
      const soaRecord = (await withTimeout(resolver.resolveSoa(domain), timeoutMs)) as SoaRecord;
      records = [
        `${soaRecord.nsname} ${soaRecord.hostmaster} ${soaRecord.serial} ${soaRecord.refresh} ${soaRecord.retry} ${soaRecord.expire} ${soaRecord.minttl}`,
      ];
      break;
    }
    default:
      throw new Error(`Unsupported record type: ${recordType}`);
  }

  const endTime = performance.now();
  return { records, time: Math.round((endTime - startTime) * 100) / 100 };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    let body: DNSPerformanceRequest;
    try {
      body = await request.json();
    } catch {
      throw error(400, 'Invalid JSON in request body');
    }
    const {
      domain,
      recordType = 'A',
      customResolvers = [],
      includeDefaultResolvers = true,
      timeoutMs = DNS_TIMEOUT_MS,
    } = body;

    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      throw error(400, 'Domain is required');
    }

    const trimmedDomain = domain.trim().toLowerCase();

    // Validate domain format
    if (!validateDomain(trimmedDomain)) {
      throw error(400, 'Invalid domain name format');
    }

    // Validate record type
    if (!RECORD_TYPES.includes(recordType.toUpperCase() as any)) {
      throw error(400, `Invalid record type. Supported types: ${RECORD_TYPES.join(', ')}`);
    }

    // Validate and sanitize custom resolvers
    if (customResolvers && !Array.isArray(customResolvers)) {
      throw error(400, 'customResolvers must be an array');
    }

    // Validate timeout
    if (typeof timeoutMs !== 'number' || isNaN(timeoutMs)) {
      throw error(400, 'timeoutMs must be a valid number');
    }
    const validTimeout = Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, timeoutMs));

    // Build resolver list
    let resolversToTest: Array<{ ip: string; name: string }> = [];
    const seenIPs = new Set<string>();

    // Add default resolvers
    if (includeDefaultResolvers) {
      for (const resolver of RESOLVERS) {
        seenIPs.add(resolver.ip);
        resolversToTest.push(resolver);
      }
    }

    // Add custom resolvers (deduplicate)
    if (customResolvers && customResolvers.length > 0) {
      const validCustomResolvers = customResolvers
        .filter((ip) => {
          // Type check and validate
          if (typeof ip !== 'string') return false;
          if (seenIPs.has(ip)) return false; // Skip duplicates
          if (!validateIPAddress(ip)) return false;
          seenIPs.add(ip);
          return true;
        })
        .slice(0, MAX_CUSTOM_RESOLVERS)
        .map((ip) => ({ ip, name: `Custom (${ip})` }));

      resolversToTest = [...resolversToTest, ...validCustomResolvers];
    }

    if (resolversToTest.length === 0) {
      throw error(400, 'No valid DNS resolvers to test');
    }

    // Security: limit total resolvers
    if (resolversToTest.length > RESOLVERS.length + MAX_CUSTOM_RESOLVERS) {
      throw error(400, `Too many resolvers. Maximum is ${RESOLVERS.length + MAX_CUSTOM_RESOLVERS}`);
    }

    // Query all resolvers in parallel
    const results = await Promise.all(
      resolversToTest.map(async (resolver): Promise<ResolverResult> => {
        try {
          const { records, time } = await queryResolver(trimmedDomain, recordType, resolver.ip, validTimeout);
          return {
            resolver: resolver.ip,
            resolverName: resolver.name,
            success: true,
            responseTime: time,
            records: records.slice(0, 10), // Limit to first 10 records
          };
        } catch (err: any) {
          let errorMsg = 'Unknown error';

          if (err?.code === 'ENOTFOUND') {
            errorMsg = 'Domain not found';
          } else if (err?.code === 'ENODATA') {
            errorMsg = `No ${recordType} records`;
          } else if (err?.code === 'ETIMEOUT') {
            errorMsg = `Query timeout (>${validTimeout}ms)`;
          } else if (err?.code === 'ESERVFAIL') {
            errorMsg = 'Server failure';
          } else if (err?.code === 'EREFUSED') {
            errorMsg = 'Query refused';
          } else if (err?.message) {
            errorMsg = err.message;
          }

          return {
            resolver: resolver.ip,
            resolverName: resolver.name,
            success: false,
            responseTime: 0,
            error: errorMsg,
          };
        }
      }),
    );

    // Calculate statistics
    const successfulResults = results.filter((r) => r.success);
    const responseTimes = successfulResults.map((r) => r.responseTime).sort((a, b) => a - b);

    let statistics;
    if (successfulResults.length === 0) {
      statistics = {
        fastest: { resolver: 'N/A', time: 0 },
        slowest: { resolver: 'N/A', time: 0 },
        average: 0,
        median: 0,
        successRate: 0,
      };
    } else {
      const fastestResult = successfulResults.reduce((prev, curr) =>
        prev.responseTime < curr.responseTime ? prev : curr,
      );
      const slowestResult = successfulResults.reduce((prev, curr) =>
        prev.responseTime > curr.responseTime ? prev : curr,
      );
      const average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const median =
        responseTimes.length % 2 === 0
          ? (responseTimes[responseTimes.length / 2 - 1] + responseTimes[responseTimes.length / 2]) / 2
          : responseTimes[Math.floor(responseTimes.length / 2)];

      statistics = {
        fastest: { resolver: fastestResult.resolverName, time: fastestResult.responseTime },
        slowest: { resolver: slowestResult.resolverName, time: slowestResult.responseTime },
        average: Math.round(average * 100) / 100,
        median: Math.round(median * 100) / 100,
        successRate: Math.round((successfulResults.length / results.length) * 100),
      };
    }

    const response: DNSPerformanceResponse = {
      domain: trimmedDomain,
      recordType: recordType.toUpperCase(),
      results,
      statistics,
      timestamp: new Date().toISOString(),
    };

    return json(response);
  } catch (err) {
    errorManager.captureException(err, 'error', { component: 'DNS Performance API' });
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, `DNS performance check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
