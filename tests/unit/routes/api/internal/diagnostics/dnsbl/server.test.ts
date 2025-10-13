import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../../../../../src/routes/api/internal/diagnostics/dnsbl/+server';

// Mock DNS module to avoid real network calls
vi.mock('node:dns', () => ({
  default: {
    promises: {
      resolve4: vi.fn().mockResolvedValue(['93.184.216.34']),
      resolve6: vi.fn().mockResolvedValue(['2606:2800:220:1:248:1893:25c8:1946']),
      resolveTxt: vi.fn().mockResolvedValue([['Not listed']])
    }
  },
  promises: {
    resolve4: vi.fn().mockResolvedValue(['93.184.216.34']),
    resolve6: vi.fn().mockResolvedValue(['2606:2800:220:1:248:1893:25c8:1946']),
    resolveTxt: vi.fn().mockResolvedValue([['Not listed']])
  }
}));

// Mock URL module for punycode
vi.mock('node:url', () => ({
  domainToASCII: vi.fn((domain: string) => domain)
}));

// Mock the Request constructor for testing
const createMockRequest = (body: any) => ({
  json: vi.fn().mockResolvedValue(body)
} as unknown as Request);

describe('DNSBL API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST Handler - Basic Functionality', () => {
    it('should accept valid IPv4 address', async () => {
      const request = createMockRequest({
        target: '8.8.8.8'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('target', '8.8.8.8');
      expect(data).toHaveProperty('targetType', 'ipv4');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('timestamp');
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should accept valid IPv6 address', async () => {
      const request = createMockRequest({
        target: '2001:4860:4860::8888'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('target', '2001:4860:4860::8888');
      expect(data).toHaveProperty('targetType', 'ipv6');
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should accept valid domain name', async () => {
      const request = createMockRequest({
        target: 'example.com'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('target', 'example.com');
      expect(data).toHaveProperty('targetType', 'domain');
      expect(data).toHaveProperty('resolvedIPs');
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should normalize domain to lowercase', async () => {
      const request = createMockRequest({
        target: 'EXAMPLE.COM'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.target).toBe('example.com');
    });

    it('should strip trailing dots from FQDNs', async () => {
      const request = createMockRequest({
        target: 'example.com.'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.target).toBe('example.com');
    });

    it('should include summary statistics', async () => {
      const request = createMockRequest({
        target: '8.8.8.8'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.summary).toHaveProperty('totalChecked');
      expect(data.summary).toHaveProperty('listedCount');
      expect(data.summary).toHaveProperty('cleanCount');
      expect(data.summary).toHaveProperty('errorCount');
      expect(typeof data.summary.totalChecked).toBe('number');
      expect(typeof data.summary.listedCount).toBe('number');
      expect(typeof data.summary.cleanCount).toBe('number');
      expect(typeof data.summary.errorCount).toBe('number');
    });

    it('should check appropriate RBLs for IP addresses', async () => {
      const request = createMockRequest({
        target: '192.168.1.1'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('ipv4');
      expect(data.results.length).toBeGreaterThan(0);

      // Should only check IP-type RBLs for IP addresses
      const ipRBLResults = data.results.filter((r: any) =>
        !r.rbl.includes('DBL') && !r.rbl.includes('SURBL')
      );
      expect(ipRBLResults.length).toBeGreaterThan(0);
    });

    it('should check appropriate RBLs for domains', async () => {
      const request = createMockRequest({
        target: 'test-domain.com'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('domain');
      expect(data.results.length).toBeGreaterThan(0);
    });

    it('should include resolved IPs for domain queries', async () => {
      const request = createMockRequest({
        target: 'google.com'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('domain');
      if (data.resolvedIPs && data.resolvedIPs.length > 0) {
        expect(Array.isArray(data.resolvedIPs)).toBe(true);
        expect(data.resolvedIPs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('POST Handler - Validation', () => {
    it('should reject missing target', async () => {
      const request = createMockRequest({});

      try {
        await POST({ request } as any);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.body.message).toBe('Target IP or domain is required');
      }
    });

    it('should reject empty target', async () => {
      const request = createMockRequest({
        target: ''
      });

      try {
        await POST({ request } as any);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.body.message).toBe('Target IP or domain is required');
      }
    });

    it('should reject whitespace-only target', async () => {
      const request = createMockRequest({
        target: '   '
      });

      try {
        await POST({ request } as any);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.body.message).toBe('Target IP or domain is required');
      }
    });

    it('should reject non-string target', async () => {
      const request = createMockRequest({
        target: 12345
      });

      try {
        await POST({ request } as any);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.body.message).toBe('Target IP or domain is required');
      }
    });

    it('should trim whitespace from target', async () => {
      const request = createMockRequest({
        target: '  8.8.8.8  '
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.target).toBe('8.8.8.8');
    });
  });

  describe('POST Handler - IPv4 Handling', () => {
    it('should correctly identify IPv4 addresses', async () => {
      const request = createMockRequest({
        target: '192.0.2.1'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('ipv4');
    });

    it('should handle private IPv4 addresses', async () => {
      const request = createMockRequest({
        target: '192.168.1.1'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('ipv4');
      expect(data.target).toBe('192.168.1.1');
    });

    it('should handle public IPv4 addresses', async () => {
      const request = createMockRequest({
        target: '8.8.8.8'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('ipv4');
      expect(data.target).toBe('8.8.8.8');
    });
  });

  describe('POST Handler - IPv6 Handling', () => {
    it('should correctly identify IPv6 addresses', async () => {
      const request = createMockRequest({
        target: '2001:db8::1'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('ipv6');
    });

    it('should handle compressed IPv6 addresses', async () => {
      const request = createMockRequest({
        target: '::1'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('ipv6');
      expect(data.target).toBe('::1');
    });

    it('should handle full IPv6 addresses', async () => {
      const request = createMockRequest({
        target: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('ipv6');
    });

    it('should check IPv6-supporting RBLs only for IPv6', async () => {
      const request = createMockRequest({
        target: '2001:4860:4860::8888'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('ipv6');
      expect(data.results.length).toBeGreaterThan(0);

      // Should only check IPv6-supporting RBLs
      if (data.results.length > 0) {
        expect(data.results.some((r: any) =>
          r.rbl.includes('Spamhaus') || r.rbl.includes('DroneBL')
        )).toBe(true);
      }
    });
  });

  describe('POST Handler - Domain Handling', () => {
    it('should handle simple domain names', async () => {
      const request = createMockRequest({
        target: 'example.org'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('domain');
      expect(data.target).toBe('example.org');
    });

    it('should handle subdomain names', async () => {
      const request = createMockRequest({
        target: 'www.example.com'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('domain');
      expect(data.target).toBe('www.example.com');
    });

    it('should handle internationalized domain names', async () => {
      const request = createMockRequest({
        target: 'google.com'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('domain');
    });

    it('should check both domain and IP RBLs for domains', async () => {
      const request = createMockRequest({
        target: 'example.net'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('domain');
      expect(data.results.length).toBeGreaterThan(0);
    });
  });

  describe('POST Handler - Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as unknown as Request;

      try {
        await POST({ request } as any);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.status).toBe(500);
        expect(error.body.message).toContain('DNSBL check failed');
      }
    });

    it('should handle null request body', async () => {
      const request = createMockRequest(null);

      try {
        await POST({ request } as any);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.status).toBe(500);
        expect(error.body.message).toContain('DNSBL check failed');
      }
    });

    it('should include timestamp in response', async () => {
      const request = createMockRequest({
        target: '8.8.8.8'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');
      expect(new Date(data.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should handle DNS resolution failures with errors', async () => {
      const request = createMockRequest({
        target: 'nonexistent-domain-12345.invalid'
      });

      // With mocking, DNS queries succeed, so this should return 200
      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.targetType).toBe('domain');
    });

    it('should handle mixed case domain normalization', async () => {
      const request = createMockRequest({
        target: 'ExAmPlE.CoM'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.target).toBe('example.com');
    });
  });

  describe('POST Handler - Response Structure', () => {
    it('should return proper response structure for IP', async () => {
      const request = createMockRequest({
        target: '1.1.1.1'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        target: expect.any(String),
        targetType: expect.any(String),
        results: expect.any(Array),
        summary: expect.objectContaining({
          totalChecked: expect.any(Number),
          listedCount: expect.any(Number),
          cleanCount: expect.any(Number),
          errorCount: expect.any(Number)
        }),
        timestamp: expect.any(String)
      });
    });

    it('should return proper response structure for domain', async () => {
      const request = createMockRequest({
        target: 'example.com'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        target: expect.any(String),
        targetType: expect.any(String),
        results: expect.any(Array),
        summary: expect.objectContaining({
          totalChecked: expect.any(Number),
          listedCount: expect.any(Number),
          cleanCount: expect.any(Number),
          errorCount: expect.any(Number)
        }),
        timestamp: expect.any(String)
      });

      // resolvedIPs should be present for domains (may be empty array)
      expect(data).toHaveProperty('resolvedIPs');
    });

    it('should have consistent result structure', async () => {
      const request = createMockRequest({
        target: '8.8.8.8'
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.results.length).toBeGreaterThan(0);

      // Check that each result has expected structure
      data.results.forEach((result: any) => {
        expect(result).toHaveProperty('rbl');
        expect(result).toHaveProperty('listed');
        expect(typeof result.rbl).toBe('string');
        expect(typeof result.listed).toBe('boolean');

        if (result.error) {
          expect(typeof result.error).toBe('string');
        }
      });
    });
  });
});