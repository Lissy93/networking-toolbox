import { json, error } from '@sveltejs/kit';
import * as net from 'node:net';
import type { RequestHandler } from './$types';
import { errorManager } from '$lib/utils/error-manager';

type Action = 'tcp-port-check' | 'http-ping';

interface BaseReq {
  action: Action;
}

interface TcpPortCheckReq extends BaseReq {
  action: 'tcp-port-check';
  targets: string[]; // Array of host:port strings
  timeout?: number;
}

interface HttpPingReq extends BaseReq {
  action: 'http-ping';
  url: string;
  count?: number;
  method?: string;
  timeout?: number;
}

type RequestBody = TcpPortCheckReq | HttpPingReq;

function parseHostPort(hostPort: string): { host: string; port: number } {
  const match = hostPort.match(/^(.+?):(\d+)$/);
  if (match) {
    return { host: match[1], port: parseInt(match[2], 10) };
  }
  throw new Error(`Invalid host:port format: ${hostPort}`);
}

async function checkTcpPort(
  host: string,
  port: number,
  timeout: number = 5000,
): Promise<{
  host: string;
  port: number;
  open: boolean;
  latency: number | null;
  error: string | null;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    const timeoutHandle = setTimeout(() => {
      cleanup();
      resolve({
        host,
        port,
        open: false,
        latency: null,
        error: 'Connection timeout',
      });
    }, timeout);

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const latency = Date.now() - startTime;
      clearTimeout(timeoutHandle);
      cleanup();
      resolve({
        host,
        port,
        open: true,
        latency,
        error: null,
      });
    });

    socket.on('error', (err: unknown) => {
      clearTimeout(timeoutHandle);
      cleanup();
      resolve({
        host,
        port,
        open: false,
        latency: null,
        error: (err as Error).message,
      });
    });

    socket.on('timeout', () => {
      clearTimeout(timeoutHandle);
      cleanup();
      resolve({
        host,
        port,
        open: false,
        latency: null,
        error: 'Socket timeout',
      });
    });

    socket.connect(port, host);
  });
}

async function httpPing(
  url: string,
  count: number = 5,
  method: string = 'HEAD',
  timeout: number = 10000,
): Promise<{
  url: string;
  method: string;
  count: number;
  successful: number;
  failed: number;
  latencies: number[];
  statistics: {
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
  };
  errors: string[];
}> {
  const latencies: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const startTime = Date.now();

      const response = await fetch(url, {
        method: method.toUpperCase(),
        signal: AbortSignal.timeout(timeout),
        // Don't follow redirects for more consistent timing
        redirect: 'manual',
      });

      const latency = Date.now() - startTime;
      latencies.push(latency);

      // Consume the response to ensure complete timing
      if (method.toLowerCase() !== 'head') {
        await response.text();
      }
    } catch (err: unknown) {
      errors.push((err as Error).message);
    }

    // Small delay between requests to avoid overwhelming the server
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const successful = latencies.length;
  const failed = count - successful;

  // Calculate statistics
  let statistics = {
    min: 0,
    max: 0,
    avg: 0,
    median: 0,
    p95: 0,
  };

  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b);
    statistics = {
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      avg: Math.round(latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length),
      median:
        sorted.length % 2 === 0
          ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
          : sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
    };
  }

  return {
    url,
    method,
    count,
    successful,
    failed,
    latencies,
    statistics,
    errors,
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: RequestBody = await request.json();

    switch (body.action) {
      case 'tcp-port-check': {
        const { targets, timeout = 5000 } = body as TcpPortCheckReq;
        if (!targets || targets.length === 0) {
          throw error(400, 'No targets provided');
        }

        if (targets.length > 50) {
          throw error(400, 'Too many targets (max 50)');
        }

        const results = await Promise.all(
          targets.map(async (target) => {
            try {
              const { host, port } = parseHostPort(target.trim());
              return await checkTcpPort(host, port, timeout);
            } catch (err: unknown) {
              return {
                host: target,
                port: 0,
                open: false,
                latency: null,
                error: (err as Error).message,
              };
            }
          }),
        );

        const summary = {
          total: results.length,
          open: results.filter((r) => r.open).length,
          closed: results.filter((r) => !r.open).length,
          avgLatency:
            results.filter((r) => r.latency !== null).length > 0
              ? Math.round(
                  results.filter((r) => r.latency !== null).reduce((sum, r) => sum + (r.latency || 0), 0) /
                    results.filter((r) => r.latency !== null).length,
                )
              : null,
        };

        return json({
          targets,
          timeout,
          results,
          summary,
          timestamp: new Date().toISOString(),
        });
      }

      case 'http-ping': {
        const { url, count = 5, method = 'HEAD', timeout = 10000 } = body as HttpPingReq;

        if (!url) {
          throw error(400, 'URL is required');
        }

        if (count < 1 || count > 20) {
          throw error(400, 'Count must be between 1 and 20');
        }

        // Validate URL
        try {
          new URL(url);
        } catch {
          throw error(400, 'Invalid URL format');
        }

        const result = await httpPing(url, count, method, timeout);

        return json({
          ...result,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        throw error(400, `Unknown action: ${(body as any).action}`);
    }
  } catch (err: unknown) {
    errorManager.captureException(err, 'error', { component: 'Network API' });
    throw error(500, `Network diagnostic failed: ${(err as Error).message}`);
  }
};
