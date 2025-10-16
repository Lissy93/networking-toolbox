import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

interface ConnectivityTest {
  protocol: 'IPv4' | 'IPv6';
  success: boolean;
  ip?: string;
  latency?: number;
  error?: string;
}

interface IPv6ConnectivityResponse {
  ipv4: ConnectivityTest;
  ipv6: ConnectivityTest;
  dualStack: boolean;
  preferredProtocol?: 'IPv4' | 'IPv6';
  timestamp: string;
}

const TEST_TARGETS = {
  ipv4: 'https://ipv4.icanhazip.com',
  ipv6: 'https://ipv6.icanhazip.com',
};

export const POST: RequestHandler = async () => {
  try {
    const [ipv4Result, ipv6Result] = await Promise.allSettled([
      testConnectivity('IPv4', TEST_TARGETS.ipv4),
      testConnectivity('IPv6', TEST_TARGETS.ipv6),
    ]);

    const ipv4Test: ConnectivityTest =
      ipv4Result.status === 'fulfilled'
        ? ipv4Result.value
        : { protocol: 'IPv4', success: false, error: 'Connection failed' };

    const ipv6Test: ConnectivityTest =
      ipv6Result.status === 'fulfilled'
        ? ipv6Result.value
        : { protocol: 'IPv6', success: false, error: 'Connection failed' };

    const dualStack = ipv4Test.success && ipv6Test.success;
    let preferredProtocol: 'IPv4' | 'IPv6' | undefined;

    if (dualStack && ipv4Test.latency && ipv6Test.latency) {
      preferredProtocol = ipv6Test.latency < ipv4Test.latency ? 'IPv6' : 'IPv4';
    }

    const response: IPv6ConnectivityResponse = {
      ipv4: ipv4Test,
      ipv6: ipv6Test,
      dualStack,
      preferredProtocol,
      timestamp: new Date().toISOString(),
    };

    return json(response);
  } catch (err) {
    errorManager.captureException(err, 'error', { component: 'IPv6 Connectivity API' });
    throw error(500, `Connectivity test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

async function testConnectivity(protocol: 'IPv4' | 'IPv6', url: string): Promise<ConnectivityTest> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'IPv6-Connectivity-Checker/1.0' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        protocol,
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const ip = (await response.text()).trim();
    const latency = Date.now() - startTime;

    return {
      protocol,
      success: true,
      ip,
      latency,
    };
  } catch (err) {
    return {
      protocol,
      success: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}
