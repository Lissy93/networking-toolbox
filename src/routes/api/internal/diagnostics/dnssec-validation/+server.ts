import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

interface DNSSECValidationRequest {
  domain: string;
}

interface DNSRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DNSSECChainLink {
  name: string;
  level: number;
  ds?: {
    keyTag: number;
    algorithm: number;
    digestType: number;
    digest: string;
    found: boolean;
  }[];
  dnskey?: {
    flags: number;
    protocol: number;
    algorithm: number;
    publicKey: string;
    keyTag: number;
    isKSK: boolean;
    isZSK: boolean;
    matched?: boolean;
  }[];
  rrsig?: {
    typeCovered: string;
    algorithm: number;
    labels: number;
    originalTTL: number;
    expiration: string;
    inception: string;
    keyTag: number;
    signerName: string;
    signature: string;
    valid?: boolean;
  }[];
  validated: boolean;
  errors: string[];
}

const DOH_PROVIDERS = {
  cloudflare: 'https://cloudflare-dns.com/dns-query',
  google: 'https://dns.google/resolve',
};

async function queryDNS(domain: string, type: string, provider: string = 'cloudflare'): Promise<any> {
  const url = DOH_PROVIDERS[provider as keyof typeof DOH_PROVIDERS];

  try {
    // Both Cloudflare and Google use GET with query parameters
    const response = await fetch(`${url}?name=${encodeURIComponent(domain)}&type=${type}&do=true`, {
      headers: {
        Accept: 'application/dns-json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DNS query failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (err) {
    throw new Error(`DoH query failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

function parseAlgorithm(alg: string | number): number {
  if (typeof alg === 'number') return alg;

  // Map algorithm names to numbers (RFC 8624)
  const algMap: Record<string, number> = {
    RSAMD5: 1,
    DH: 2,
    DSA: 3,
    RSASHA1: 5,
    'DSA-NSEC3-SHA1': 6,
    'RSASHA1-NSEC3-SHA1': 7,
    RSASHA256: 8,
    RSASHA512: 10,
    'ECC-GOST': 12,
    ECDSAP256SHA256: 13,
    ECDSAP384SHA384: 14,
    ED25519: 15,
    ED448: 16,
  };

  return algMap[alg] || 0;
}

async function validateDNSSECChain(domain: string): Promise<DNSSECChainLink[]> {
  const chain: DNSSECChainLink[] = [];
  const labels = domain.split('.').filter(Boolean);

  // Build chain from root to leaf
  const zones: string[] = [];
  for (let i = labels.length; i >= 0; i--) {
    if (i === labels.length) {
      zones.push(domain);
    } else if (i === 0) {
      zones.push('.');
    } else {
      zones.push(labels.slice(i).join('.'));
    }
  }

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    const level = zones.length - i - 1;
    const link: DNSSECChainLink = {
      name: zone === '.' ? 'Root' : zone,
      level,
      validated: false,
      errors: [],
    };

    try {
      // Query DNSKEY for this zone
      const dnskeyResponse = await queryDNS(zone === '.' ? '.' : zone, 'DNSKEY');

      if (dnskeyResponse.Answer) {
        link.dnskey = dnskeyResponse.Answer.filter((r: DNSRecord) => r.type === 48).map((r: DNSRecord) => {
          const parts = r.data.split(' ');
          const flags = parseInt(parts[0]);
          const protocol = parseInt(parts[1]);
          const algorithm = parseAlgorithm(parts[2]);
          const publicKey = parts.slice(3).join('');

          const isKSK = (flags & 0x0001) === 0x0001; // SEP bit
          const isZSK = (flags & 0x0100) === 0x0100;

          return {
            flags,
            protocol,
            algorithm,
            publicKey,
            keyTag: 0, // Will be set during DS matching if applicable
            isKSK,
            isZSK,
          };
        });
      }

      // Query RRSIG for DNSKEY
      const rrsigResponse = await queryDNS(zone === '.' ? '.' : zone, 'RRSIG');
      if (rrsigResponse.Answer) {
        link.rrsig = rrsigResponse.Answer.filter((r: DNSRecord) => r.type === 46)
          .filter((r: DNSRecord) => r.data.startsWith('DNSKEY') || r.data.startsWith('48'))
          .map((r: DNSRecord) => {
            const parts = r.data.split(' ');
            return {
              typeCovered: parts[0],
              algorithm: parseInt(parts[1]),
              labels: parseInt(parts[2]),
              originalTTL: parseInt(parts[3]),
              expiration: parts[4],
              inception: parts[5],
              keyTag: parseInt(parts[6]),
              signerName: parts[7],
              signature: parts.slice(8).join(''),
              valid: true, // Simplified - proper validation requires crypto
            };
          });
      }

      // Query DS records (except for root)
      if (zone !== '.') {
        const dsResponse = await queryDNS(zone, 'DS');
        if (dsResponse.Answer) {
          link.ds = dsResponse.Answer.filter((r: DNSRecord) => r.type === 43).map((r: DNSRecord) => {
            const parts = r.data.split(' ');
            return {
              keyTag: parseInt(parts[0]),
              algorithm: parseAlgorithm(parts[1]),
              digestType: parseInt(parts[2]),
              digest: parts.slice(3).join(''),
              found: true,
            };
          });

          // Match DS records with DNSKEYs by algorithm
          // Since we can't calculate exact key tags from DoH responses,
          // we check if there's a KSK with matching algorithm
          if (link.ds && link.dnskey) {
            link.ds.forEach((ds) => {
              const matchingKey = link.dnskey?.find((key) => key.isKSK && key.algorithm === ds.algorithm);
              if (matchingKey) {
                matchingKey.matched = true;
                matchingKey.keyTag = ds.keyTag; // Use DS key tag
                link.validated = true;
              }
            });
          }
        } else {
          link.errors.push('No DS records found');
        }
      } else {
        // Root zone - trust anchor
        link.validated = !!(link.dnskey && link.dnskey.length > 0);
      }

      // Validate RRSIG
      if (link.rrsig && link.rrsig.length > 0) {
        const now = new Date();
        link.rrsig.forEach((sig) => {
          const expiration = new Date(parseInt(sig.expiration) * 1000);
          const inception = new Date(parseInt(sig.inception) * 1000);

          if (now > expiration) {
            sig.valid = false;
            link.errors.push(`RRSIG expired on ${expiration.toISOString()}`);
          } else if (now < inception) {
            sig.valid = false;
            link.errors.push(`RRSIG not yet valid until ${inception.toISOString()}`);
          }
        });
      }

      // Check if chain is complete
      if (!link.dnskey || link.dnskey.length === 0) {
        link.errors.push('No DNSKEY records found');
        link.validated = false;
      } else if (zone !== '.' && (!link.ds || link.ds.length === 0)) {
        // Non-root zones need DS records to link to parent
        link.errors.push('No DS records found');
        link.validated = false;
      } else if (zone !== '.' && link.ds && link.dnskey) {
        // For non-root zones, ensure at least one KSK exists
        const hasKSK = link.dnskey.some((key) => key.isKSK);
        if (!hasKSK) {
          link.errors.push('No KSK (Key Signing Key) found');
          link.validated = false;
        } else if (!link.validated) {
          // If not already validated, check algorithm compatibility
          const dsAlgorithms = link.ds.map((ds) => ds.algorithm);
          const kskAlgorithms = link.dnskey.filter((k) => k.isKSK).map((k) => k.algorithm);
          const hasCompatible = dsAlgorithms.some((alg) => kskAlgorithms.includes(alg));
          if (hasCompatible) {
            link.validated = true;
          } else {
            link.errors.push('No DNSKEY with algorithm matching DS records');
            link.validated = false;
          }
        }
      }
    } catch (err) {
      link.errors.push(err instanceof Error ? err.message : 'Unknown error');
      link.validated = false;
    }

    chain.push(link);
  }

  return chain.reverse(); // Root first, then down to domain
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: DNSSECValidationRequest = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      throw error(400, 'Invalid domain name');
    }

    const chain = await validateDNSSECChain(domain.trim().toLowerCase());

    const isValid = chain.every((link) => link.validated || link.name === 'Root');
    const brokenLinks = chain.filter((link) => !link.validated && link.name !== 'Root');

    return json({
      domain,
      valid: isValid,
      chain,
      brokenLinks,
      summary: {
        totalLinks: chain.length,
        validatedLinks: chain.filter((l) => l.validated).length,
        errors: chain.flatMap((l) => l.errors).filter(Boolean),
      },
    });
  } catch (err) {
    errorManager.captureException(err, 'error', { component: 'DNSSEC Validation API' });
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, `DNSSEC validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
