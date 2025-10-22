import { describe, it, expect } from 'vitest';
import {
  validateDNSv6Config,
  buildDNSv6Options,
  getDefaultDNSv6Config,
  type DNSv6Config,
} from '$lib/utils/dhcpv6-dns-rfc3646';

describe('dhcpv6-dns-rfc3646', () => {
  describe('validateDNSv6Config', () => {
    it('should require at least one DNS server or search domain', () => {
      const emptyConfig: DNSv6Config = {
        dnsServers: [],
        searchDomains: [],
      };
      const errors = validateDNSv6Config(emptyConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('At least one DNS server or search domain');
    });

    it('should validate IPv6 DNS servers', () => {
      const invalidConfig: DNSv6Config = {
        dnsServers: ['not-an-ipv6'],
        searchDomains: [],
      };
      const errors = validateDNSv6Config(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid IPv6 address');
    });

    it('should accept valid IPv6 addresses', () => {
      const validConfig: DNSv6Config = {
        dnsServers: ['2001:4860:4860::8888', '2001:4860:4860::8844'],
        searchDomains: [],
      };
      const errors = validateDNSv6Config(validConfig);
      expect(errors).toEqual([]);
    });

    it('should accept compressed IPv6 addresses', () => {
      const validConfig: DNSv6Config = {
        dnsServers: ['::1', 'fe80::1', '2001:db8::1'],
        searchDomains: [],
      };
      const errors = validateDNSv6Config(validConfig);
      expect(errors).toEqual([]);
    });

    it('should validate search domain format', () => {
      const invalidConfig: DNSv6Config = {
        dnsServers: [],
        searchDomains: ['-invalid-.com'],
      };
      const errors = validateDNSv6Config(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid domain name format');
    });

    it('should accept valid FQDNs', () => {
      const validConfig: DNSv6Config = {
        dnsServers: [],
        searchDomains: ['example.com', 'subdomain.example.org'],
      };
      const errors = validateDNSv6Config(validConfig);
      expect(errors).toEqual([]);
    });

    it('should skip empty entries in validation', () => {
      const config: DNSv6Config = {
        dnsServers: ['2001:4860:4860::8888', ''],
        searchDomains: ['example.com', ''],
      };
      const errors = validateDNSv6Config(config);
      expect(errors).toEqual([]);
    });
  });

  describe('buildDNSv6Options', () => {
    it('should build Option 23 for DNS servers', () => {
      const config: DNSv6Config = {
        dnsServers: ['2001:4860:4860::8888'],
        searchDomains: [],
      };
      const result = buildDNSv6Options(config);
      expect(result.option23).toBeDefined();
      expect(result.option23!.servers).toEqual(['2001:4860:4860::8888']);
      expect(result.option23!.totalLength).toBe(16); // IPv6 is 16 bytes
    });

    it('should encode IPv6 address correctly', () => {
      const config: DNSv6Config = {
        dnsServers: ['2001:db8::1'],
        searchDomains: [],
      };
      const result = buildDNSv6Options(config);
      expect(result.option23!.hexEncoded).toBe('20010db8000000000000000000000001');
    });

    it('should handle multiple DNS servers', () => {
      const config: DNSv6Config = {
        dnsServers: ['2001:4860:4860::8888', '2001:4860:4860::8844'],
        searchDomains: [],
      };
      const result = buildDNSv6Options(config);
      expect(result.option23!.servers.length).toBe(2);
      expect(result.option23!.totalLength).toBe(32); // 2 * 16 bytes
    });

    it('should build Option 24 for search domains', () => {
      const config: DNSv6Config = {
        dnsServers: [],
        searchDomains: ['example.com'],
      };
      const result = buildDNSv6Options(config);
      expect(result.option24).toBeDefined();
      expect(result.option24!.domains).toEqual(['example.com']);
    });

    it('should encode FQDN in DNS wire format', () => {
      const config: DNSv6Config = {
        dnsServers: [],
        searchDomains: ['example.com'],
      };
      const result = buildDNSv6Options(config);
      // 07 (length) + example + 03 (length) + com + 00 (null terminator)
      expect(result.option24!.hexEncoded).toBe('076578616d706c6503636f6d00');
    });

    it('should handle multiple search domains', () => {
      const config: DNSv6Config = {
        dnsServers: [],
        searchDomains: ['example.com', 'example.org'],
      };
      const result = buildDNSv6Options(config);
      expect(result.option24!.domains.length).toBe(2);
      expect(result.option24!.breakdown.length).toBe(2);
    });

    it('should build both options when provided', () => {
      const config: DNSv6Config = {
        dnsServers: ['2001:4860:4860::8888'],
        searchDomains: ['example.com'],
      };
      const result = buildDNSv6Options(config);
      expect(result.option23).toBeDefined();
      expect(result.option24).toBeDefined();
    });

    it('should generate Kea configuration examples', () => {
      const config: DNSv6Config = {
        dnsServers: ['2001:4860:4860::8888'],
        searchDomains: ['example.com'],
      };
      const result = buildDNSv6Options(config);
      expect(result.examples.keaDhcp6).toBeDefined();
      expect(result.examples.keaDhcp6).toContain('"code": 23');
      expect(result.examples.keaDhcp6).toContain('"code": 24');
      expect(result.examples.keaDhcp6).toContain('dns-servers');
      expect(result.examples.keaDhcp6).toContain('domain-search');
    });

    it('should generate Kea config with only DNS servers', () => {
      const config: DNSv6Config = {
        dnsServers: ['2001:4860:4860::8888'],
        searchDomains: [],
      };
      const result = buildDNSv6Options(config);
      expect(result.examples.keaDhcp6).toBeDefined();
      expect(result.examples.keaDhcp6).toContain('"code": 23');
      expect(result.examples.keaDhcp6).not.toContain('"code": 24');
    });

    it('should generate Kea config with only search domains', () => {
      const config: DNSv6Config = {
        dnsServers: [],
        searchDomains: ['example.com'],
      };
      const result = buildDNSv6Options(config);
      expect(result.examples.keaDhcp6).toBeDefined();
      expect(result.examples.keaDhcp6).not.toContain('"code": 23');
      expect(result.examples.keaDhcp6).toContain('"code": 24');
    });

    it('should format wire format with spaces', () => {
      const config: DNSv6Config = {
        dnsServers: ['::1'],
        searchDomains: [],
      };
      const result = buildDNSv6Options(config);
      expect(result.option23!.wireFormat).toContain(' ');
      expect(result.option23!.wireFormat.split(' ').length).toBe(16);
    });

    it('should throw error for invalid configuration', () => {
      const invalidConfig: DNSv6Config = {
        dnsServers: ['invalid-ipv6'],
        searchDomains: [],
      };
      expect(() => buildDNSv6Options(invalidConfig)).toThrow();
    });

    it('should skip empty DNS servers', () => {
      const config: DNSv6Config = {
        dnsServers: ['2001:4860:4860::8888', '', '2001:4860:4860::8844'],
        searchDomains: [],
      };
      const result = buildDNSv6Options(config);
      expect(result.option23!.servers.length).toBe(2);
    });

    it('should skip empty search domains', () => {
      const config: DNSv6Config = {
        dnsServers: [],
        searchDomains: ['example.com', '', 'example.org'],
      };
      const result = buildDNSv6Options(config);
      expect(result.option24!.domains.length).toBe(2);
    });
  });

  describe('getDefaultDNSv6Config', () => {
    it('should return default configuration', () => {
      const defaultConfig = getDefaultDNSv6Config();
      expect(defaultConfig.dnsServers).toEqual([]);
      expect(defaultConfig.searchDomains).toEqual([]);
    });
  });
});
