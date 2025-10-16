import { http, HttpResponse } from 'msw';

/**
 * HTTP test helpers for mocking external endpoints
 * Extracted to keep test files clean and reusable
 */

export const createHttpbinMocks = () => [
  // GET endpoint with compression support
  http.get('https://httpbin.org/get', ({ request }) => {
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    let responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Server': 'nginx/1.10.0'
    };

    // Simulate compression behavior based on Accept-Encoding header
    if (acceptEncoding.includes('gzip') && !acceptEncoding.includes('identity')) {
      responseHeaders['Content-Encoding'] = 'gzip';
      responseHeaders['Content-Length'] = '150'; // Compressed size
    } else if (acceptEncoding.includes('br') && !acceptEncoding.includes('identity')) {
      responseHeaders['Content-Encoding'] = 'br';
      responseHeaders['Content-Length'] = '140'; // Brotli compressed size
    } else if (acceptEncoding.includes('deflate') && !acceptEncoding.includes('identity')) {
      responseHeaders['Content-Encoding'] = 'deflate';
      responseHeaders['Content-Length'] = '155'; // Deflate compressed size
    } else if (acceptEncoding.includes('identity')) {
      // No compression
      responseHeaders['Content-Length'] = '200'; // Uncompressed size
    } else {
      // Default response with auto compression
      responseHeaders['Content-Encoding'] = 'gzip';
      responseHeaders['Content-Length'] = '150';
    }

    return HttpResponse.json({
      args: {},
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': acceptEncoding,
        'User-Agent': 'test-agent',
        'Host': 'httpbin.org'
      },
      origin: '127.0.0.1',
      url: 'https://httpbin.org/get'
    }, {
      headers: responseHeaders
    });
  }),

  // POST endpoint
  http.post('https://httpbin.org/post', () => {
    return HttpResponse.json({
      args: {},
      data: '',
      files: {},
      form: {},
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'test-agent'
      },
      json: null,
      origin: '127.0.0.1',
      url: 'https://httpbin.org/post'
    });
  }),

  // PUT endpoint
  http.put('https://httpbin.org/put', () => {
    return HttpResponse.json({
      args: {},
      data: '',
      files: {},
      form: {},
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'test-agent'
      },
      json: null,
      origin: '127.0.0.1',
      url: 'https://httpbin.org/put'
    });
  }),

  // Headers endpoint
  http.get('https://httpbin.org/headers', () => {
    return HttpResponse.json({
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'test-agent',
        'X-Test-Header': 'test-value'
      }
    });
  }),

  // Redirect endpoint
  http.get('https://httpbin.org/redirect/:count', ({ params }) => {
    const count = parseInt(params.count as string);
    if (count > 1) {
      return HttpResponse.redirect(`https://httpbin.org/redirect/${count - 1}`, 302);
    }
    return HttpResponse.redirect('https://httpbin.org/get', 302);
  }),

  // Gzip endpoint with compression support
  http.get('https://httpbin.org/gzip', ({ request }) => {
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    let responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Server': 'nginx/1.10.0'
    };

    // This endpoint always returns gzipped content unless explicitly told not to
    if (acceptEncoding.includes('identity')) {
      responseHeaders['Content-Length'] = '220'; // Uncompressed size
    } else {
      responseHeaders['Content-Encoding'] = 'gzip';
      responseHeaders['Content-Length'] = '130'; // Compressed size
    }

    return HttpResponse.json({
      gzipped: !acceptEncoding.includes('identity'),
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': acceptEncoding,
        'User-Agent': 'test-agent'
      },
      origin: '127.0.0.1',
      url: 'https://httpbin.org/gzip'
    }, {
      headers: responseHeaders
    });
  }),

  // Cookie setting endpoint
  http.get('https://httpbin.org/cookies/set/:name/:value', ({ params }) => {
    return HttpResponse.json({
      cookies: {
        [params.name as string]: params.value as string
      }
    }, {
      headers: {
        'Set-Cookie': `${params.name}=${params.value}; Path=/`
      }
    });
  }),

  // Delay endpoint for timeout testing
  http.get('https://httpbin.org/delay/:seconds', ({ params }) => {
    const seconds = parseInt(params.seconds as string);
    // Simulate timeout for delay tests - delay/1 with 500ms timeout should timeout
    if (seconds >= 1) {
      return new Promise(() => {}); // Never resolves to simulate timeout
    }
    return HttpResponse.json({
      args: {},
      headers: {
        'Accept': 'application/json'
      },
      origin: '127.0.0.1'
    });
  }),

  // Status code endpoint
  http.get('https://httpbin.org/status/:code', ({ params }) => {
    const code = parseInt(params.code as string);
    return HttpResponse.json({
      status: code
    }, { status: code });
  })
];

export const createExampleComMocks = () => [
  // HTTPS example.com
  http.get('https://example.com', () => {
    return HttpResponse.text('<!DOCTYPE html><html><head><title>Example Domain</title></head><body><h1>Example Domain</h1></body></html>', {
      headers: {
        'Content-Type': 'text/html',
        'Server': 'ECS (dcb/7F83)'
      }
    });
  }),

  // HTTP example.com
  http.get('http://example.com', () => {
    return HttpResponse.text('<!DOCTYPE html><html><head><title>Example Domain</title></head><body><h1>Example Domain</h1></body></html>', {
      headers: {
        'Content-Type': 'text/html',
        'Server': 'ECS (dcb/7F83)'
      }
    });
  })
];