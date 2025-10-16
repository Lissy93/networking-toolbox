import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

interface CTLogRequest {
  domain: string;
}

interface CTCertificate {
  id: number;
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  entry_timestamp: string;
  not_before: string;
  not_after: string;
  serial_number: string;
}

interface ProcessedCertificate {
  id: number;
  commonName: string;
  sans: string[];
  issuer: string;
  issuerId: number;
  entryTimestamp: string;
  notBefore: string;
  notAfter: string;
  serialNumber: string;
  isValid: boolean;
  daysUntilExpiry: number;
  isWildcard: boolean;
  ctLogUrl: string;
}

interface CTLogResponse {
  domain: string;
  certificates: ProcessedCertificate[];
  totalCertificates: number;
  discoveredHostnames: string[];
  issuers: Array<{ name: string; count: number }>;
  validCertificates: number;
  expiringSoon: number;
  wildcardCertificates: number;
  timestamp: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: CTLogRequest = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      throw error(400, 'Domain is required');
    }

    const trimmedDomain = domain.trim().toLowerCase();

    // Basic domain validation
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(trimmedDomain)) {
      throw error(400, 'Invalid domain format');
    }

    const result = await searchCTLogs(trimmedDomain);
    return json(result);
  } catch (err) {
    errorManager.captureException(err, 'error', { component: 'CT Log Search API' });
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, `CT log search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

async function searchCTLogs(domain: string): Promise<CTLogResponse> {
  // Query crt.sh API
  const url = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'CT-Log-Search/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`crt.sh API returned ${response.status}`);
  }

  const data: CTCertificate[] = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return {
      domain,
      certificates: [],
      totalCertificates: 0,
      discoveredHostnames: [],
      issuers: [],
      validCertificates: 0,
      expiringSoon: 0,
      wildcardCertificates: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Process certificates
  const processedCerts: ProcessedCertificate[] = data.map((cert) => {
    const sans = cert.name_value
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);

    const notBefore = new Date(cert.not_before);
    const notAfter = new Date(cert.not_after);
    const isValid = now >= notBefore && now <= notAfter;
    const daysUntilExpiry = Math.ceil((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isWildcard = cert.common_name.startsWith('*.') || sans.some((san) => san.startsWith('*.'));

    return {
      id: cert.id,
      commonName: cert.common_name,
      sans,
      issuer: cert.issuer_name,
      issuerId: cert.issuer_ca_id,
      entryTimestamp: cert.entry_timestamp,
      notBefore: cert.not_before,
      notAfter: cert.not_after,
      serialNumber: cert.serial_number,
      isValid,
      daysUntilExpiry,
      isWildcard,
      ctLogUrl: `https://crt.sh/?id=${cert.id}`,
    };
  });

  // Deduplicate and collect all hostnames
  const hostnamesSet = new Set<string>();
  processedCerts.forEach((cert) => {
    cert.sans.forEach((san) => hostnamesSet.add(san));
  });
  const discoveredHostnames = Array.from(hostnamesSet).sort();

  // Count issuers
  const issuerCounts = new Map<string, number>();
  processedCerts.forEach((cert) => {
    issuerCounts.set(cert.issuer, (issuerCounts.get(cert.issuer) || 0) + 1);
  });
  const issuers = Array.from(issuerCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const validCertificates = processedCerts.filter((c) => c.isValid).length;
  const expiringSoon = processedCerts.filter((c) => c.isValid && new Date(c.notAfter) <= thirtyDaysFromNow).length;
  const wildcardCertificates = processedCerts.filter((c) => c.isWildcard).length;

  return {
    domain,
    certificates: processedCerts,
    totalCertificates: processedCerts.length,
    discoveredHostnames,
    issuers,
    validCertificates,
    expiringSoon,
    wildcardCertificates,
    timestamp: new Date().toISOString(),
  };
}
