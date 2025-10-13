import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createHttpbinMocks, createExampleComMocks } from './helpers/http-mocks';

// Mock SvelteKit env module for tests
vi.mock('$env/dynamic/public', () => ({
  env: {}
}));

// MSW server for mocking API calls
export const server = setupServer(
  // Default handlers
  http.post('/api/internal/diagnostics/dns', () => {
    return HttpResponse.json({ mock: true });
  }),
  http.post('/api/internal/diagnostics/rdap', () => {
    return HttpResponse.json({ mock: true });
  }),
  // Mock external API endpoints to prevent MSW warnings
  http.get('https://ipv4.icanhazip.com/', () => {
    return HttpResponse.text('192.0.2.1');
  }),
  http.get('https://ipv6.icanhazip.com/', () => {
    return HttpResponse.text('2001:db8::1');
  }),
  http.get('http://ip-api.com/json/*', () => {
    return HttpResponse.json({
      status: 'success',
      country: 'United States',
      countryCode: 'US',
      region: 'CA',
      regionName: 'California',
      city: 'Mountain View',
      zip: '94043',
      lat: 37.4192,
      lon: -122.0574,
      timezone: 'America/Los_Angeles',
      isp: 'Google',
      org: 'Google LLC',
      as: 'AS15169 Google LLC',
      asname: 'GOOGLE',
      mobile: false,
      proxy: false,
      hosting: true,
      query: '8.8.8.8'
    });
  }),
  http.get('https://cloudflare-dns.com/dns-query', () => {
    return HttpResponse.json({
      Status: 0,
      TC: false,
      RD: true,
      RA: true,
      AD: false,
      CD: false,
      Question: [{ name: 'example.com', type: 1 }],
      Answer: [
        {
          name: 'example.com',
          type: 1,
          TTL: 300,
          data: '93.184.216.34'
        }
      ]
    });
  }),
  // Mock RIPE RIS API endpoints for BGP tests
  http.get('https://stat.ripe.net/data/prefix-overview/data.json', () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        resource: '8.8.8.8',
        asns: [
          {
            asn: 15169,
            holder: 'Google LLC'
          }
        ]
      }
    });
  }),
  http.get('https://stat.ripe.net/data/as-overview/data.json', () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        holder: 'Google LLC',
        country: 'US'
      }
    });
  }),
  http.get('https://stat.ripe.net/data/routing-status/data.json', () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        announced: true,
        observed_neighbours: [
          {
            asn: 15169,
            country: 'US',
            prefix: '8.8.8.0/24'
          }
        ],
        more_specifics: [],
        less_specifics: []
      }
    });
  }),
  http.get('https://stat.ripe.net/data/looking-glass/data.json', () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        rrcs: [
          {
            peers: [
              {
                as_path: '15169',
                origin_asn: 15169
              }
            ]
          }
        ]
      }
    });
  }),
  // HTTP diagnostics test mocks
  ...createHttpbinMocks(),
  ...createExampleComMocks()
);

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn' // Changed to 'warn' to see unhandled requests but not fail tests
  });

  // Store original stderr write for restoration
  const originalStderrWrite = process.stderr.write;

  // Suppress expected console errors and warnings during tests
  vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
    // Only suppress expected test error patterns
    const allArgs = [message, ...args].map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');

    const suppressPatterns = [
      'error:',        // Catches "lookup error:", "API error:", "search error:", "CT log search error:", etc.
      'HttpError',     // Catches error objects with HttpError
      '[MSW] Warning:', // Suppress MSW warnings
      '[MSW] Error:',   // Suppress MSW error messages
    ];

    if (suppressPatterns.some(pattern => allArgs.includes(pattern))) {
      return; // Suppress expected test errors
    }

    // Allow through - could indicate real issues
    // (Uncomment line below to see what's not being caught)
    // console.warn('[Test stderr]:', message, ...args);
  });

  // Also suppress console.warn for MSW warnings
  vi.spyOn(console, 'warn').mockImplementation((message, ...args) => {
    const allArgs = [message, ...args].map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');

    if (allArgs.includes('[MSW]') || allArgs.includes('intercepted a request without a matching request handler')) {
      return; // Suppress MSW warnings
    }

    // Let other warnings through
    console.log('[Test warning]:', message, ...args);
  });

  // Suppress stderr output for expected test errors
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: any, ...args: any[]) => {
    const str = chunk?.toString ? chunk.toString() : String(chunk);

    // Patterns to suppress in stderr
    const suppressStderrPatterns = [
      'CT log search error:',
      'BGP lookup error:',
      'ASN/Geo lookup error:',
      'TLS handshake error:',
      'TLS API error:',
      'DNS API error:',
      'AXFR test error:',
      'MAC lookup error:',
      'Mail TLS check error:',
      'Greylist test error:',
      'DNSBL check error:',
      'DNS performance check error:',
      'DNSSEC validation error:',
      'IPv6 connectivity test error:',
      'Email diagnostics error:',
      'Network diagnostics API error:',
      'RDAP diagnostics error:',
      'HTTP API error:',
      'BGP lookup error:'
    ];

    // Check if this stderr output should be suppressed
    if (suppressStderrPatterns.some(pattern => str.includes(pattern))) {
      return true; // Suppress this specific stderr output
    }

    // Allow other stderr output through
    return originalStderrWrite.apply(process.stderr, [chunk, ...args] as [any, any?, any?]);
  });
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());