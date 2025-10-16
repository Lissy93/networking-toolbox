import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { performance } from 'perf_hooks';
import { errorManager } from '$lib/utils/error-manager';

interface HTTPTimings {
  dns: number;
  tcp: number;
  tls: number;
  ttfb: number;
  total: number;
}

interface SecurityHeaders {
  'strict-transport-security'?: string;
  'content-security-policy'?: string;
  'x-frame-options'?: string;
  'x-content-type-options'?: string;
  'referrer-policy'?: string;
  'x-xss-protection'?: string;
  'permissions-policy'?: string;
  'cross-origin-embedder-policy'?: string;
  'cross-origin-opener-policy'?: string;
  'cross-origin-resource-policy'?: string;
}

function validateURL(url: string): { isValid: boolean; error?: string; parsed?: URL } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    return { isValid: true, parsed };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

async function performHTTPRequest(
  url: string,
  method: string = 'GET',
  customHeaders: Record<string, string> = {},
  followRedirects: boolean = true,
  maxRedirects: number = 10,
  timeout: number = 10000,
): Promise<{
  response: Response;
  timings: HTTPTimings;
  redirectChain?: Array<{ url: string; status: number; location?: string; headers: Record<string, string> }>;
}> {
  const startTime = performance.now();
  let dns = 0,
    tcp = 0,
    tls = 0,
    ttfb = 0;

  const redirectChain: Array<{ url: string; status: number; location?: string; headers: Record<string, string> }> = [];
  let currentUrl = url;
  let redirectCount = 0;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    while (redirectCount <= maxRedirects) {
      const requestStart = performance.now();

      const response = await fetch(currentUrl, {
        method,
        headers: customHeaders,
        redirect: 'manual',
        signal: controller.signal,
      });

      const requestEnd = performance.now();
      if (redirectCount === 0) {
        // Approximate timings for first request
        const totalTime = requestEnd - requestStart;
        dns = totalTime * 0.1; // ~10% DNS (approximation)
        tcp = totalTime * 0.2; // ~20% TCP connect
        tls = currentUrl.startsWith('https:') ? totalTime * 0.3 : 0; // ~30% TLS if HTTPS
        ttfb = totalTime * 0.4; // ~40% TTFB
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        redirectChain.push({
          url: currentUrl,
          status: response.status,
          location: location || undefined,
          headers: responseHeaders,
        });

        if (!location) {
          throw new Error(`Redirect response (${response.status}) missing Location header`);
        }

        if (!followRedirects) {
          const total = performance.now() - startTime;
          return {
            response,
            timings: { dns, tcp, tls, ttfb, total },
            redirectChain,
          };
        }

        currentUrl = new URL(location, currentUrl).href;
        redirectCount++;

        if (redirectCount > maxRedirects) {
          throw new Error(`Too many redirects (>${maxRedirects})`);
        }
      } else {
        // Final response
        const total = performance.now() - startTime;
        if (redirectChain.length > 0) {
          redirectChain.push({
            url: currentUrl,
            status: response.status,
            headers: responseHeaders,
          });
        }

        return {
          response,
          timings: { dns, tcp, tls, ttfb, total },
          redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
        };
      }
    }

    throw new Error(`Maximum redirects (${maxRedirects}) exceeded`);
  } finally {
    clearTimeout(timeoutId);
  }
}

function analyzeSecurityHeaders(headers: Headers): {
  headers: SecurityHeaders;
  analysis: Array<{ header: string; status: 'present' | 'missing' | 'weak'; message: string; recommendation?: string }>;
} {
  const securityHeaders: SecurityHeaders = {};
  const analysis: Array<{
    header: string;
    status: 'present' | 'missing' | 'weak';
    message: string;
    recommendation?: string;
  }> = [];

  // Check HSTS
  const hsts = headers.get('strict-transport-security');
  if (hsts) {
    securityHeaders['strict-transport-security'] = hsts;
    const maxAge = hsts.match(/max-age=(\d+)/)?.[1];
    if (maxAge && parseInt(maxAge) < 31536000) {
      analysis.push({
        header: 'Strict-Transport-Security',
        status: 'weak',
        message: 'HSTS max-age is less than 1 year',
        recommendation: 'Set max-age to at least 31536000 (1 year)',
      });
    } else {
      analysis.push({
        header: 'Strict-Transport-Security',
        status: 'present',
        message: 'HSTS properly configured',
      });
    }
  } else {
    analysis.push({
      header: 'Strict-Transport-Security',
      status: 'missing',
      message: 'HSTS header not present',
      recommendation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains"',
    });
  }

  // Check CSP
  const csp = headers.get('content-security-policy');
  if (csp) {
    securityHeaders['content-security-policy'] = csp;
    if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
      analysis.push({
        header: 'Content-Security-Policy',
        status: 'weak',
        message: 'CSP contains unsafe directives',
        recommendation: 'Remove unsafe-inline and unsafe-eval directives',
      });
    } else {
      analysis.push({
        header: 'Content-Security-Policy',
        status: 'present',
        message: 'CSP configured (review directives)',
      });
    }
  } else {
    analysis.push({
      header: 'Content-Security-Policy',
      status: 'missing',
      message: 'CSP header not present',
      recommendation: 'Add a Content-Security-Policy header',
    });
  }

  // Check X-Frame-Options
  const xFrame = headers.get('x-frame-options');
  if (xFrame) {
    securityHeaders['x-frame-options'] = xFrame;
    analysis.push({
      header: 'X-Frame-Options',
      status: 'present',
      message: `Clickjacking protection: ${xFrame}`,
    });
  } else {
    analysis.push({
      header: 'X-Frame-Options',
      status: 'missing',
      message: 'X-Frame-Options header not present',
      recommendation: 'Add "X-Frame-Options: DENY" or use CSP frame-ancestors',
    });
  }

  // Check X-Content-Type-Options
  const xContentType = headers.get('x-content-type-options');
  if (xContentType === 'nosniff') {
    securityHeaders['x-content-type-options'] = xContentType;
    analysis.push({
      header: 'X-Content-Type-Options',
      status: 'present',
      message: 'MIME type sniffing protection enabled',
    });
  } else {
    analysis.push({
      header: 'X-Content-Type-Options',
      status: 'missing',
      message: 'X-Content-Type-Options header not present',
      recommendation: 'Add "X-Content-Type-Options: nosniff"',
    });
  }

  // Check Referrer-Policy
  const referrerPolicy = headers.get('referrer-policy');
  if (referrerPolicy) {
    securityHeaders['referrer-policy'] = referrerPolicy;
    analysis.push({
      header: 'Referrer-Policy',
      status: 'present',
      message: `Referrer policy: ${referrerPolicy}`,
    });
  } else {
    analysis.push({
      header: 'Referrer-Policy',
      status: 'missing',
      message: 'Referrer-Policy header not present',
      recommendation: 'Add "Referrer-Policy: strict-origin-when-cross-origin"',
    });
  }

  return { headers: securityHeaders, analysis };
}

function parseCookie(cookieHeader: string): {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
} {
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const [nameValue] = parts;
  const [name, value] = nameValue.split('=', 2);

  const cookie = {
    name: name?.trim() || '',
    value: value?.trim() || '',
  };

  const attributes: any = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const [attrName, attrValue] = part.split('=', 2);
    const attr = attrName.toLowerCase().trim();

    switch (attr) {
      case 'domain':
        attributes.domain = attrValue?.trim();
        break;
      case 'path':
        attributes.path = attrValue?.trim();
        break;
      case 'expires':
        attributes.expires = attrValue?.trim();
        break;
      case 'max-age':
        attributes.maxAge = parseInt(attrValue?.trim() || '0');
        break;
      case 'secure':
        attributes.secure = true;
        break;
      case 'httponly':
        attributes.httpOnly = true;
        break;
      case 'samesite':
        attributes.sameSite = attrValue?.trim() || 'None';
        break;
    }
  }

  return { ...cookie, ...attributes };
}

function analyzeCookieSecurity(cookie: any): any {
  const issues = [];
  let score = 100;
  let securityLevel = 'secure';

  // Check cookie name for sensitive patterns
  const sensitiveName = /session|auth|token|login|csrf|jwt|api[-_]?key|sid|ssid/i.test(cookie.name);
  const analyticsCookie = /_ga|_gid|_utm|analytics|tracking|fbp|fbc|cfm|optimizely/i.test(cookie.name);

  // Check Secure flag
  if (!cookie.secure) {
    issues.push('Missing Secure flag - cookie can be sent over unencrypted connections');
    score -= 30;
    securityLevel = 'error';
  }

  // Check HttpOnly flag (more important for auth cookies)
  if (!cookie.httpOnly) {
    if (sensitiveName) {
      issues.push('Missing HttpOnly on sensitive cookie - vulnerable to XSS attacks');
      score -= 25;
      securityLevel = 'error';
    } else if (!analyticsCookie) {
      issues.push('Missing HttpOnly flag - cookie accessible via JavaScript');
      score -= 10;
      if (securityLevel === 'secure') securityLevel = 'warning';
    }
    // Analytics cookies legitimately need JavaScript access
  }

  // Check SameSite attribute
  const sameSite = cookie.sameSite?.toLowerCase();
  if (!sameSite || sameSite === 'none') {
    if (sensitiveName) {
      issues.push('Missing or weak SameSite on sensitive cookie - vulnerable to CSRF');
      score -= 25;
      securityLevel = 'error';
    } else {
      issues.push('Missing or weak SameSite attribute - potential CSRF risk');
      score -= 15;
      if (securityLevel === 'secure') securityLevel = 'warning';
    }
  } else if (sameSite === 'lax') {
    if (sensitiveName) {
      issues.push('SameSite=Lax on sensitive cookie - consider Strict for better protection');
      score -= 10;
      if (securityLevel === 'secure') securityLevel = 'warning';
    } else {
      score -= 5; // Minor deduction for non-sensitive cookies
    }
  }

  // Check for overly broad domain (less critical for analytics)
  if (cookie.domain && cookie.domain.startsWith('.')) {
    if (sensitiveName) {
      issues.push('Wildcard domain on sensitive cookie - may expose to subdomains');
      score -= 10;
      if (securityLevel === 'secure') securityLevel = 'warning';
    } else if (!analyticsCookie) {
      issues.push('Wildcard domain may expose cookie to subdomains unnecessarily');
      score -= 5;
    }
    // Analytics cookies often need wildcard domains
  }

  // Check for missing expiration
  if (!cookie.expires && !cookie.maxAge) {
    if (sensitiveName) {
      // Session cookies can be good for auth
      issues.push('Session cookie - will be cleared when browser closes');
    } else {
      issues.push('No expiration set - cookie will persist as session cookie');
      score -= 3;
    }
  }

  return {
    ...cookie,
    score: Math.max(0, score),
    securityLevel,
    issues: issues.length > 0 ? issues : undefined,
  };
}

function generateCookieRecommendations(cookies: any[]): any[] {
  const recommendations = [];
  const hasInsecure = cookies.some((c) => !c.secure);
  const hasNoHttpOnly = cookies.some((c) => !c.httpOnly);
  const hasWeakSameSite = cookies.some((c) => !c.sameSite || ['none', 'lax'].includes(c.sameSite?.toLowerCase()));

  if (hasInsecure) {
    recommendations.push({
      title: 'Add Secure Flag',
      description: 'Always set the Secure flag for cookies to prevent transmission over unencrypted connections.',
      example: 'Set-Cookie: sessionid=abc123; Secure; HttpOnly; SameSite=Strict',
    });
  }

  if (hasNoHttpOnly) {
    recommendations.push({
      title: 'Add HttpOnly Flag',
      description: 'Set HttpOnly to prevent client-side scripts from accessing sensitive cookies.',
      example: 'Set-Cookie: token=xyz789; Secure; HttpOnly; SameSite=Strict',
    });
  }

  if (hasWeakSameSite) {
    recommendations.push({
      title: 'Strengthen SameSite Policy',
      description:
        'Use SameSite=Strict for sensitive cookies to prevent CSRF attacks. Use Lax for less sensitive cookies that need cross-site functionality.',
      example: 'Set-Cookie: auth=token123; Secure; HttpOnly; SameSite=Strict',
    });
  }

  if (cookies.length === 0) {
    recommendations.push({
      title: 'No Cookies Detected',
      description: 'This server does not set any cookies, which may be intentional for stateless applications.',
    });
  }

  return recommendations;
}

function generateSecuritySummary(score: number | null, cookieCount: number): string {
  if (cookieCount === 0) {
    return 'No cookies detected in response headers. This may be intentional for stateless applications.';
  }

  if (score === null || score >= 90) {
    return 'Excellent cookie security! All security best practices are followed.';
  } else if (score >= 80) {
    return 'Good cookie security with minor improvements possible.';
  } else if (score >= 70) {
    return 'Moderate cookie security - some important flags may be missing.';
  } else if (score >= 60) {
    return 'Poor cookie security - multiple security issues detected.';
  } else {
    return 'Critical cookie security issues - immediate attention required.';
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const {
      action,
      url,
      method = 'GET',
      headers: customHeaders = {},
      maxRedirects = 10,
      timeout = 10000,
    } = await request.json();

    if (!action || !url) {
      throw error(400, 'Missing required parameters: action and url');
    }

    const urlValidation = validateURL(url);
    if (!urlValidation.isValid) {
      throw error(400, urlValidation.error || 'Invalid URL');
    }

    switch (action) {
      case 'headers': {
        const { response, timings } = await performHTTPRequest(url, method, customHeaders, true, maxRedirects, timeout);

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key.toLowerCase()] = value;
        });

        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength) : null;

        return json({
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          size,
          timings,
          url: response.url,
        });
      }

      case 'redirect-trace': {
        const { response, timings, redirectChain } = await performHTTPRequest(
          url,
          method,
          customHeaders,
          true,
          maxRedirects,
          timeout,
        );

        return json({
          finalStatus: response.status,
          finalUrl: response.url,
          redirectChain: redirectChain || [],
          totalRedirects: redirectChain ? redirectChain.length - 1 : 0,
          timings,
        });
      }

      case 'security': {
        const { response, timings } = await performHTTPRequest(url, method, customHeaders, true, maxRedirects, timeout);
        const { headers: securityHeaders, analysis } = analyzeSecurityHeaders(response.headers);

        return json({
          url: response.url,
          status: response.status,
          headers: securityHeaders,
          analysis,
          timings,
        });
      }

      case 'cors-check': {
        const origin = customHeaders.origin || 'https://example.com';

        // First try OPTIONS preflight
        const preflightHeaders = {
          Origin: origin,
          'Access-Control-Request-Method': method,
          'Access-Control-Request-Headers': 'content-type,authorization',
        };

        try {
          const preflightResponse = await fetch(url, {
            method: 'OPTIONS',
            headers: preflightHeaders,
            signal: AbortSignal.timeout(timeout),
          });

          const corsHeaders: Record<string, string> = {};
          preflightResponse.headers.forEach((value, key) => {
            if (key.toLowerCase().startsWith('access-control-')) {
              corsHeaders[key.toLowerCase()] = value;
            }
          });

          const allowsOrigin =
            corsHeaders['access-control-allow-origin'] === '*' || corsHeaders['access-control-allow-origin'] === origin;

          return json({
            preflight: {
              status: preflightResponse.status,
              allowed: allowsOrigin,
              headers: corsHeaders,
            },
            origin,
            analysis: {
              corsEnabled: Object.keys(corsHeaders).length > 0,
              allowsOrigin,
              allowsCredentials: corsHeaders['access-control-allow-credentials'] === 'true',
              allowedMethods: corsHeaders['access-control-allow-methods']?.split(',').map((m) => m.trim()) || [],
              allowedHeaders: corsHeaders['access-control-allow-headers']?.split(',').map((h) => h.trim()) || [],
              maxAge: corsHeaders['access-control-max-age'] ? parseInt(corsHeaders['access-control-max-age']) : null,
            },
          });
        } catch (err: unknown) {
          return json({
            preflight: {
              status: 0,
              allowed: false,
              error: (err as Error).message,
            },
            origin,
            analysis: {
              corsEnabled: false,
              allowsOrigin: false,
              allowsCredentials: false,
              allowedMethods: [],
              allowedHeaders: [],
              maxAge: null,
            },
          });
        }
      }

      case 'perf': {
        const { response, timings } = await performHTTPRequest(url, method, customHeaders, true, maxRedirects, timeout);

        // Additional performance metrics
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength) : null;
        const isHTTPS = url.startsWith('https:');

        return json({
          url: response.url,
          status: response.status,
          timings: {
            ...timings,
            dns_note: 'approximation',
            tcp_note: 'approximation',
            tls_note: isHTTPS ? 'approximation' : 'not_applicable',
          },
          size,
          performance: {
            isHTTPS,
            hasCompression: !!response.headers.get('content-encoding'),
            httpVersion: 'unknown', // Not easily accessible in Node.js fetch
            connectionReused: 'unknown',
          },
        });
      }

      case 'compression': {
        const compressionEncodings = ['gzip', 'br', 'deflate'];
        const results = [];

        // Get uncompressed version first
        const startTime = performance.now();
        const { response: uncompressedResponse, timings: uncompressedTimings } = await performHTTPRequest(
          url,
          'GET',
          { 'Accept-Encoding': 'identity' },
          true,
          maxRedirects,
          timeout,
        );

        const uncompressedBody = await uncompressedResponse.text();
        const uncompressedSize = new TextEncoder().encode(uncompressedBody).length;

        // Test each compression method
        for (const encoding of compressionEncodings) {
          try {
            const testStartTime = performance.now();
            const { response: compressedResponse } = await performHTTPRequest(
              url,
              'GET',
              { 'Accept-Encoding': encoding },
              true,
              maxRedirects,
              timeout,
            );
            const testEndTime = performance.now();

            const actualEncoding = compressedResponse.headers.get('content-encoding');
            const contentLength = compressedResponse.headers.get('content-length');

            const supported = actualEncoding?.includes(encoding) || false;
            let compressedSize = uncompressedSize;

            if (supported && contentLength) {
              compressedSize = parseInt(contentLength);
            } else if (supported) {
              // If no content-length, get the actual body size
              const compressedBody = await compressedResponse.text();
              compressedSize = new TextEncoder().encode(compressedBody).length;
            }

            const ratio = uncompressedSize > 0 ? ((uncompressedSize - compressedSize) / uncompressedSize) * 100 : 0;

            results.push({
              encoding,
              supported,
              compressedSize,
              ratio,
              responseTime: Math.round(testEndTime - testStartTime),
              actualEncoding: actualEncoding || 'none',
            });
          } catch (err) {
            results.push({
              encoding,
              supported: false,
              compressedSize: uncompressedSize,
              ratio: 0,
              responseTime: 0,
              error: (err as Error).message,
            });
          }
        }

        // Find best compression
        const supportedResults = results.filter((r) => r.supported && r.ratio > 0);
        const bestCompression =
          supportedResults.length > 0
            ? supportedResults.reduce((best, current) => (current.ratio > best.ratio ? current : best))
            : { encoding: 'none', ratio: 0 };

        // Check what the server naturally uses
        const { response: naturalResponse } = await performHTTPRequest(url, 'GET', {}, true, maxRedirects, timeout);
        const serverEncoding = naturalResponse.headers.get('content-encoding');

        const responseHeaders: Record<string, string> = {};
        naturalResponse.headers.forEach((value, key) => {
          responseHeaders[key.toLowerCase()] = value;
        });

        const totalTime = performance.now() - startTime;

        return json({
          url: naturalResponse.url,
          uncompressed: {
            size: uncompressedSize,
          },
          serverCompression: {
            enabled: !!serverEncoding,
            encoding: serverEncoding || 'none',
          },
          compressionResults: results,
          bestCompression,
          headers: responseHeaders,
          timings: {
            ...uncompressedTimings,
            total: Math.round(totalTime),
          },
        });
      }

      case 'cookie-security': {
        const { response, timings } = await performHTTPRequest(url, method, customHeaders, true, maxRedirects, timeout);

        // Parse all Set-Cookie headers
        const setCookieHeaders: string[] = [];
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') {
            // Handle multiple Set-Cookie headers (some servers send multiple with same name)
            if (Array.isArray(value)) {
              setCookieHeaders.push(...value);
            } else {
              setCookieHeaders.push(value);
            }
          }
        });

        const cookies = [];
        let totalSecurityScore = 0;
        let secureCookies = 0;
        let httpOnlyCookies = 0;

        const seenCookies = new Set<string>();

        for (let i = 0; i < setCookieHeaders.length; i++) {
          const cookieHeader = setCookieHeaders[i];
          const cookie = parseCookie(cookieHeader);

          // Skip empty cookie names or deletion cookies
          if (
            !cookie.name ||
            (cookie.expires && new Date(cookie.expires).getTime() < Date.now()) ||
            (cookie.maxAge !== undefined && cookie.maxAge <= 0)
          ) {
            continue;
          }

          // Skip duplicate cookie names (keep only the first/latest)
          const cookieKey = `${cookie.name}_${cookie.domain || ''}_${cookie.path || '/'}`;
          if (seenCookies.has(cookieKey)) {
            continue;
          }
          seenCookies.add(cookieKey);

          const analysis = analyzeCookieSecurity(cookie);
          // Add unique identifier to prevent key conflicts
          analysis.id = `${cookie.name}_${i}`;
          cookies.push(analysis);
          totalSecurityScore += analysis.score;
          if (analysis.secure) secureCookies++;
          if (analysis.httpOnly) httpOnlyCookies++;
        }

        const averageScore = cookies.length > 0 ? Math.round(totalSecurityScore / cookies.length) : null;
        const recommendations = generateCookieRecommendations(cookies);
        const summary = generateSecuritySummary(averageScore, cookies.length);

        return json({
          url: response.url,
          status: response.status,
          totalCookies: cookies.length,
          secureCookies,
          httpOnlyCookies,
          securityScore: averageScore,
          summary,
          cookies,
          recommendations,
          timings,
        });
      }

      default:
        throw error(400, `Unknown action: ${action}`);
    }
  } catch (err: unknown) {
    errorManager.captureException(err, 'error', { component: 'HTTP API' });

    if ((err as any).status) {
      throw err; // Re-throw SvelteKit errors
    }

    if ((err as any).name === 'AbortError') {
      throw error(408, 'Request timeout');
    }

    if ((err as any).code === 'ENOTFOUND') {
      throw error(400, 'Host not found');
    }

    if ((err as any).code === 'ECONNREFUSED') {
      throw error(400, 'Connection refused');
    }

    throw error(500, (err as Error).message || 'HTTP request failed');
  }
};
