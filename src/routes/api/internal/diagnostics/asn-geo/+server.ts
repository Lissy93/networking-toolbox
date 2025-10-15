import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

interface ASNGeoRequest {
  ip: string;
}

interface ASNGeoResponse {
  ip: string;
  asn?: number;
  asnOrg?: string;
  isp?: string;
  organization?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
  timestamp: string;
}

async function lookupIPAPI(ip: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Using ip-api.com (free, no auth required, allows HTTPS)
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`IP-API failed: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: ASNGeoRequest = await request.json();
    const { ip } = body;

    if (!ip || typeof ip !== 'string' || !ip.trim()) {
      throw error(400, 'IP address is required');
    }

    const trimmedIP = ip.trim();

    // Basic IP validation
    const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    const ipv6Regex =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    if (!ipv4Regex.test(trimmedIP) && !ipv6Regex.test(trimmedIP)) {
      throw error(400, 'Invalid IP address format');
    }

    // Lookup IP information
    const data = await lookupIPAPI(trimmedIP);

    if (data.status === 'fail') {
      throw error(404, data.message || 'IP lookup failed');
    }

    // Parse ASN from the 'as' field (format: "AS15169 Google LLC")
    let asn: number | undefined;
    let asnOrg: string | undefined;
    if (data.as) {
      const asParts = data.as.match(/^AS(\d+)\s*(.*)$/);
      if (asParts) {
        asn = parseInt(asParts[1], 10);
        asnOrg = asParts[2] || data.asname;
      }
    }

    const response: ASNGeoResponse = {
      ip: data.query || trimmedIP,
      asn,
      asnOrg,
      isp: data.isp,
      organization: data.org,
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      regionName: data.regionName,
      city: data.city,
      zip: data.zip,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      mobile: data.mobile || false,
      proxy: data.proxy || false,
      hosting: data.hosting || false,
      timestamp: new Date().toISOString(),
    };

    return json(response);
  } catch (err) {
    errorManager.captureException(err, 'error', { component: 'ASN/Geo API' });
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, `ASN/Geo lookup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
