import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';
import { logger } from '$lib/utils/logger';

type Action = 'domain-lookup' | 'ip-lookup' | 'asn-lookup';

interface BaseReq {
  action: Action;
}

interface DomainLookupReq extends BaseReq {
  action: 'domain-lookup';
  domain: string;
}

interface IPLookupReq extends BaseReq {
  action: 'ip-lookup';
  ip: string;
}

interface ASNLookupReq extends BaseReq {
  action: 'asn-lookup';
  asn: string;
}

type RequestBody = DomainLookupReq | IPLookupReq | ASNLookupReq;

// IANA RDAP Bootstrap Registry URLs
const RDAP_BOOTSTRAP = {
  domain: 'https://data.iana.org/rdap/dns.json',
  ipv4: 'https://data.iana.org/rdap/ipv4.json',
  ipv6: 'https://data.iana.org/rdap/ipv6.json',
  asn: 'https://data.iana.org/rdap/asn.json',
};

// Team Cymru ASN lookup as fallback
async function _getASNFromTeamCymru(ip: string): Promise<{ asn: string; country: string; registry: string } | null> {
  try {
    // Team Cymru DNS-based ASN lookup
    const reversedIP = ip.split('.').reverse().join('.');
    const _hostname = `${reversedIP}.origin.asn.cymru.com`;

    // This is a simplified implementation - in a real scenario you'd use DNS TXT queries
    // For now, we'll return null and rely on RDAP
    return null;
  } catch (err) {
    logger.warn('Team Cymru ASN lookup failed', { component: 'RDAP API', error: err });
    return null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'IP-Calc-Diagnostics/1.0',
        Accept: 'application/rdap+json, application/json',
      },
    });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function getBootstrapRegistries(type: keyof typeof RDAP_BOOTSTRAP) {
  try {
    const response = await fetchWithTimeout(RDAP_BOOTSTRAP[type]);
    if (!response.ok) {
      throw new Error(`Bootstrap registry fetch failed: ${response.status}`);
    }
    return await response.json();
  } catch (err: any) {
    throw new Error(`Failed to fetch RDAP bootstrap registry: ${(err as Error).message}`);
  }
}

function findRDAPService(registries: any, query: string, type: 'domain' | 'ip' | 'asn'): string | null {
  try {
    const services = registries.services || [];

    for (const service of services) {
      const [patterns, urls] = service;

      if (type === 'domain') {
        // For domains, check TLD matching
        const tld = query.split('.').pop()?.toLowerCase();
        if (tld && patterns.some((pattern: string) => pattern.toLowerCase() === tld)) {
          return urls[0];
        }
      } else if (type === 'asn') {
        // For ASN, check numeric ranges
        const asnNum = parseInt(query.replace(/^AS/i, ''));
        for (const pattern of patterns) {
          if (typeof pattern === 'string') {
            const [start, end] = pattern.split('-').map(Number);
            if (asnNum >= start && (!end || asnNum <= end)) {
              return urls[0];
            }
          }
        }
      } else if (type === 'ip') {
        // For IP, check CIDR ranges - simplified implementation
        for (const pattern of patterns) {
          if (typeof pattern === 'string' && pattern.includes('.')) {
            // Basic IP range matching - would need proper CIDR matching in production
            return urls[0];
          }
        }
      }
    }

    return null;
  } catch (err) {
    logger.warn('Error finding RDAP service', { component: 'RDAP API', error: err });
    return null;
  }
}

async function queryRDAP(serviceUrl: string, query: string, type: 'domain' | 'ip' | 'asn') {
  try {
    let rdapUrl: string;

    if (type === 'domain') {
      rdapUrl = `${serviceUrl.replace(/\/$/, '')}/domain/${encodeURIComponent(query)}`;
    } else if (type === 'ip') {
      rdapUrl = `${serviceUrl.replace(/\/$/, '')}/ip/${encodeURIComponent(query)}`;
    } else if (type === 'asn') {
      const asnNum = query.replace(/^AS/i, '');
      rdapUrl = `${serviceUrl.replace(/\/$/, '')}/autnum/${encodeURIComponent(asnNum)}`;
    } else {
      throw new Error('Invalid RDAP query type');
    }

    const response = await fetchWithTimeout(rdapUrl);

    if (!response.ok) {
      throw new Error(`RDAP query failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (err: any) {
    throw new Error(`RDAP lookup failed: ${(err as Error).message}`);
  }
}

function parseRDAPDomain(rdapData: any) {
  return {
    domain: rdapData.ldhName || rdapData.unicodeName,
    status: rdapData.status || [],
    registrar:
      rdapData.entities?.find((e: any) => e.roles?.includes('registrar'))?.vcardArray?.[1]?.[1]?.[3] || 'Unknown',
    nameservers: rdapData.nameservers?.map((ns: any) => ns.ldhName || ns.unicodeName) || [],
    created: rdapData.events?.find((e: any) => e.eventAction === 'registration')?.eventDate,
    updated: rdapData.events?.find((e: any) => e.eventAction === 'last changed')?.eventDate,
    expires: rdapData.events?.find((e: any) => e.eventAction === 'expiration')?.eventDate,
    contacts:
      rdapData.entities?.filter((e: any) =>
        e.roles?.some((r: string) => ['registrant', 'administrative', 'technical'].includes(r)),
      ) || [],
  };
}

function parseRDAPIP(rdapData: any) {
  return {
    network:
      rdapData.cidr0_cidrs?.[0]?.v4prefix ||
      rdapData.cidr0_cidrs?.[0]?.v6prefix ||
      rdapData.startAddress + '-' + rdapData.endAddress,
    name: rdapData.name,
    type: rdapData.type,
    country: rdapData.country,
    status: rdapData.status || [],
    allocation: rdapData.events?.find((e: any) => e.eventAction === 'allocation')?.eventDate,
    lastChanged: rdapData.events?.find((e: any) => e.eventAction === 'last changed')?.eventDate,
    registry: rdapData.entities?.find((e: any) => e.roles?.includes('registrar'))?.handle,
    contacts:
      rdapData.entities?.filter((e: any) =>
        e.roles?.some((r: string) => ['registrant', 'administrative', 'technical', 'abuse'].includes(r)),
      ) || [],
  };
}

function parseRDAPASN(rdapData: any) {
  return {
    asn: rdapData.startAutnum || rdapData.handle,
    name: rdapData.name,
    country: rdapData.country,
    type: rdapData.type,
    status: rdapData.status || [],
    allocation: rdapData.events?.find((e: any) => e.eventAction === 'allocation')?.eventDate,
    lastChanged: rdapData.events?.find((e: any) => e.eventAction === 'last changed')?.eventDate,
    registry: rdapData.entities?.find((e: any) => e.roles?.includes('registrar'))?.handle,
    contacts:
      rdapData.entities?.filter((e: any) =>
        e.roles?.some((r: string) => ['registrant', 'administrative', 'technical', 'abuse'].includes(r)),
      ) || [],
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: RequestBody = await request.json();

    switch (body.action) {
      case 'domain-lookup': {
        const { domain } = body as DomainLookupReq;

        if (!domain || !domain.includes('.')) {
          throw new Error('Valid domain name required');
        }

        // Get bootstrap registries
        const registries = await getBootstrapRegistries('domain');

        // Find appropriate RDAP service
        const serviceUrl = findRDAPService(registries, domain, 'domain');
        if (!serviceUrl) {
          throw new Error('No RDAP service found for this domain');
        }

        // Query RDAP
        const rdapData = await queryRDAP(serviceUrl, domain, 'domain');
        const parsed = parseRDAPDomain(rdapData);

        return json({
          domain,
          serviceUrl,
          data: parsed,
          raw: rdapData,
        });
      }

      case 'ip-lookup': {
        const { ip } = body as IPLookupReq;

        if (!ip) {
          throw new Error('IP address required');
        }

        // Determine if IPv4 or IPv6
        const isIPv6 = ip.includes(':');
        const registries = await getBootstrapRegistries(isIPv6 ? 'ipv6' : 'ipv4');

        // Find appropriate RDAP service
        const serviceUrl = findRDAPService(registries, ip, 'ip');
        if (!serviceUrl) {
          throw new Error('No RDAP service found for this IP address');
        }

        // Query RDAP
        const rdapData = await queryRDAP(serviceUrl, ip, 'ip');
        const parsed = parseRDAPIP(rdapData);

        return json({
          ip,
          serviceUrl,
          data: parsed,
          raw: rdapData,
        });
      }

      case 'asn-lookup': {
        const { asn } = body as ASNLookupReq;

        if (!asn) {
          throw new Error('ASN required');
        }

        try {
          // Get bootstrap registries
          const registries = await getBootstrapRegistries('asn');

          // Find appropriate RDAP service
          const serviceUrl = findRDAPService(registries, asn, 'asn');
          if (!serviceUrl) {
            throw new Error('No RDAP service found for this ASN');
          }

          // Query RDAP
          const rdapData = await queryRDAP(serviceUrl, asn, 'asn');
          const parsed = parseRDAPASN(rdapData);

          return json({
            asn,
            serviceUrl,
            data: parsed,
            raw: rdapData,
          });
        } catch (rdapErr: any) {
          // Fallback to Team Cymru (if we had a working IP)
          logger.warn('RDAP ASN lookup failed, fallback not implemented', {
            component: 'RDAP API',
            error: rdapErr.message,
          });
          throw rdapErr;
        }
      }

      default:
        throw error(400, `Unknown action: ${(body as any).action}`);
    }
  } catch (err: any) {
    errorManager.captureException(err, 'error', { component: 'RDAP API' });
    throw error(500, `RDAP lookup failed: ${(err as Error).message}`);
  }
};
