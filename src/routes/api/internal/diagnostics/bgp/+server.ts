import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

interface BGPLookupRequest {
  resource: string; // IP address or prefix
}

interface BGPPrefix {
  prefix: string;
  asn: number;
  holder: string;
  country?: string;
}

interface BGPPeer {
  asn: number;
  country?: string;
  prefix: string;
}

interface ASPath {
  path: number[];
  origin: number;
}

interface BGPLookupResponse {
  resource: string;
  prefixes: BGPPrefix[];
  asPath?: ASPath;
  peers: BGPPeer[];
  originAS?: number;
  originName?: string;
  announced: boolean;
  moreSpecifics?: string[];
  lessSpecifics?: string[];
  timestamp: string;
}

async function lookupRIPERIS(resource: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent(resource)}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`RIPE RIS API failed: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function lookupASNInfo(asn: number): Promise<{ holder?: string; country?: string }> {
  try {
    const url = `https://stat.ripe.net/data/as-overview/data.json?resource=AS${asn}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return {};

    const data = await response.json();
    return {
      holder: data.data?.holder || undefined,
      country: data.data?.country || undefined,
    };
  } catch {
    return {};
  }
}

async function lookupBGPRouting(resource: string): Promise<any> {
  try {
    const url = `https://stat.ripe.net/data/routing-status/data.json?resource=${encodeURIComponent(resource)}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

async function lookupASPath(resource: string): Promise<any> {
  try {
    const url = `https://stat.ripe.net/data/looking-glass/data.json?resource=${encodeURIComponent(resource)}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: BGPLookupRequest = await request.json();
    const { resource } = body;

    if (!resource || typeof resource !== 'string' || !resource.trim()) {
      throw error(400, 'Resource (IP address or prefix) is required');
    }

    const trimmedResource = resource.trim();

    // Lookup prefix overview
    const prefixData = await lookupRIPERIS(trimmedResource);

    if (!prefixData.data) {
      throw error(404, 'No BGP data found for this resource');
    }

    // Get routing status
    const routingData = await lookupBGPRouting(trimmedResource);

    // Get AS path data
    const asPathData = await lookupASPath(trimmedResource);

    // Extract prefixes
    const prefixes: BGPPrefix[] = [];
    const asns = new Set<number>();

    if (prefixData.data.asns && Array.isArray(prefixData.data.asns)) {
      for (const asnData of prefixData.data.asns) {
        const asn = asnData.asn;
        asns.add(asn);
        const asnInfo = await lookupASNInfo(asn);
        prefixes.push({
          prefix: prefixData.data.resource || trimmedResource,
          asn,
          holder: asnInfo.holder || asnData.holder || 'Unknown',
          country: asnInfo.country,
        });
      }
    }

    // Extract AS path
    let asPath: ASPath | undefined;
    if (asPathData?.data?.rrcs) {
      const rrcs = asPathData.data.rrcs;
      if (rrcs.length > 0 && rrcs[0].peers && rrcs[0].peers.length > 0) {
        const peer = rrcs[0].peers[0];
        if (peer.as_path) {
          asPath = {
            path: peer.as_path
              .split(' ')
              .map(Number)
              .filter((n: number) => !isNaN(n)),
            origin: peer.origin_asn || 0,
          };
        }
      }
    }

    // Extract peers
    const peers: BGPPeer[] = [];
    if (routingData?.data?.observed_neighbours) {
      for (const peer of routingData.data.observed_neighbours.slice(0, 10)) {
        peers.push({
          asn: peer.asn,
          country: peer.country,
          prefix: peer.prefix || trimmedResource,
        });
      }
    }

    // Determine origin AS
    let originAS: number | undefined;
    let originName: string | undefined;

    if (asPath?.origin) {
      originAS = asPath.origin;
      const originInfo = await lookupASNInfo(originAS);
      originName = originInfo.holder;
    } else if (prefixes.length > 0) {
      originAS = prefixes[0].asn;
      originName = prefixes[0].holder;
    }

    // Check if announced
    const announced = routingData?.data?.announced || prefixes.length > 0;

    // More/less specifics
    const moreSpecifics = routingData?.data?.more_specifics?.map((m: any) => m.prefix) || [];
    const lessSpecifics = routingData?.data?.less_specifics?.map((l: any) => l.prefix) || [];

    const response: BGPLookupResponse = {
      resource: trimmedResource,
      prefixes,
      asPath,
      peers,
      originAS,
      originName,
      announced,
      moreSpecifics: moreSpecifics.slice(0, 10),
      lessSpecifics: lessSpecifics.slice(0, 10),
      timestamp: new Date().toISOString(),
    };

    return json(response);
  } catch (err) {
    errorManager.captureException(err, 'error', { component: 'BGP API' });
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, `BGP lookup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
