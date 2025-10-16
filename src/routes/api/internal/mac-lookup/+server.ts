import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

export const GET: RequestHandler = async ({ url }) => {
  const oui = url.searchParams.get('oui');

  if (!oui) {
    return json({ error: 'OUI parameter is required' }, { status: 400 });
  }

  try {
    // Use maclookup.app API for detailed information
    const cleanOui = oui.replace(/[:-]/g, '');
    const response = await fetch(`https://api.maclookup.app/v2/macs/${cleanOui}`, {
      headers: {
        'User-Agent': 'IP-Calc/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return json({ found: false, manufacturer: null }, { status: 200 });
      }
      return json({ error: 'Failed to fetch OUI data' }, { status: response.status });
    }

    const data = await response.json();

    if (!data.success || !data.found) {
      return json({ found: false, manufacturer: null }, { status: 200 });
    }

    return json({
      found: true,
      manufacturer: data.company,
      country: data.country,
      address: data.address,
      blockType: data.blockType, // MA-L, MA-M, MA-S, CID
      blockStart: data.blockStart,
      blockEnd: data.blockEnd,
      blockSize: data.blockSize,
      isPrivate: data.isPrivate,
      isRand: data.isRand,
      updated: data.updated,
    });
  } catch (error) {
    errorManager.captureException(error, 'error', { component: 'MAC Lookup API' });
    return json({ error: 'Failed to fetch OUI data', found: false }, { status: 500 });
  }
};
