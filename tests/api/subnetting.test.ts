import { describe, it, expect } from 'vitest';
import { makeApiRequest, validateSuccessResponse, isValidIPv4, isValidIPv6, ipObjectToString } from './utils/api-test-helpers';

describe('Subnetting API Endpoints', () => {
  describe('POST /api/subnetting/ipv4-subnet-calculator', () => {
    it('should calculate IPv4 subnet for /24 network', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv4-subnet-calculator', 'POST', {
        cidr: '192.168.1.0/24',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv4-subnet-calculator');

      const result = data.result;
      expect(ipObjectToString(result.network)).toBe('192.168.1.0');
      expect(ipObjectToString(result.broadcast)).toBe('192.168.1.255');
      expect(ipObjectToString(result.subnet)).toBe('255.255.255.0');
      expect(ipObjectToString(result.wildcardMask)).toBe('0.0.0.255');
      expect(result.cidr).toBe(24);
      expect(result.hostCount).toBe(256);
      expect(result.usableHosts).toBe(254);
      expect(ipObjectToString(result.firstHost)).toBe('192.168.1.1');
      expect(ipObjectToString(result.lastHost)).toBe('192.168.1.254');
    });

    it('should calculate IPv4 subnet for /8 network', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv4-subnet-calculator', 'POST', {
        cidr: '10.0.0.0/8',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv4-subnet-calculator');

      const result = data.result;
      expect(ipObjectToString(result.network)).toBe('10.0.0.0');
      expect(ipObjectToString(result.broadcast)).toBe('10.255.255.255');
      expect(ipObjectToString(result.subnet)).toBe('255.0.0.0');
      expect(ipObjectToString(result.wildcardMask)).toBe('0.255.255.255');
      expect(result.cidr).toBe(8);
      expect(result.hostCount).toBe(16777216);
      expect(result.usableHosts).toBe(16777214);
    });

    it('should calculate IPv4 subnet for /30 point-to-point network', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv4-subnet-calculator', 'POST', {
        cidr: '192.168.1.0/30',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv4-subnet-calculator');

      const result = data.result;
      expect(ipObjectToString(result.network)).toBe('192.168.1.0');
      expect(ipObjectToString(result.broadcast)).toBe('192.168.1.3');
      expect(ipObjectToString(result.subnet)).toBe('255.255.255.252');
      expect(result.hostCount).toBe(4);
      expect(result.usableHosts).toBe(2);
      expect(ipObjectToString(result.firstHost)).toBe('192.168.1.1');
      expect(ipObjectToString(result.lastHost)).toBe('192.168.1.2');
    });

    it('should calculate IPv4 subnet for /32 single host', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv4-subnet-calculator', 'POST', {
        cidr: '192.168.1.1/32',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv4-subnet-calculator');

      const result = data.result;
      expect(ipObjectToString(result.network)).toBe('192.168.1.1');
      expect(ipObjectToString(result.broadcast)).toBe('192.168.1.1');
      expect(ipObjectToString(result.subnet)).toBe('255.255.255.255');
      expect(result.hostCount).toBe(1);
      expect(result.usableHosts).toBe(1); // RFC 3021: /32 is a single usable host
    });

    it('should handle invalid CIDR format', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv4-subnet-calculator', 'POST', {
        cidr: 'invalid-cidr',
      });

      expect(status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.tool).toBe('ipv4-subnet-calculator');
    });

    it('should handle missing CIDR parameter', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv4-subnet-calculator', 'POST', {});

      expect(status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.tool).toBe('ipv4-subnet-calculator');
    });

    it('should handle invalid prefix length', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv4-subnet-calculator', 'POST', {
        cidr: '192.168.1.0/33',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv4-subnet-calculator');
    });
  });

  describe('POST /api/subnetting/ipv6-subnet-calculator', () => {
    it('should calculate IPv6 subnet for /64 network', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv6-subnet-calculator', 'POST', {
        cidr: '2001:db8::/64',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv6-subnet-calculator');

      const result = data.result.subnet;
      expect(result.network).toBe('2001:db8::');
      expect(result.prefixLength).toBe(64);
      expect(result.totalAddresses).toBeDefined();
      expect(result.firstAddress).toBe('2001:db8::1');
      expect(result.lastAddress).toBeDefined();
      expect(isValidIPv6(result.network)).toBe(true);
      expect(isValidIPv6(result.firstAddress)).toBe(true);
      expect(isValidIPv6(result.lastAddress)).toBe(true);
    });

    it('should calculate IPv6 subnet for /48 allocation', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv6-subnet-calculator', 'POST', {
        cidr: '2001:db8::/48',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv6-subnet-calculator');

      const result = data.result.subnet;
      expect(result.network).toBe('2001:db8::');
      expect(result.prefixLength).toBe(48);
      expect(result.firstAddress).toBe('2001:db8::1');
      // The last address should contain ffff
      expect(result.lastAddress).toMatch(/ffff/);
    });

    it('should calculate IPv6 subnet for /128 single host', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv6-subnet-calculator', 'POST', {
        cidr: '2001:db8::1/128',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv6-subnet-calculator');

      const result = data.result.subnet;
      expect(result.network).toBe('2001:db8::1');
      expect(result.prefixLength).toBe(128);
      expect(result.totalAddresses).toBeDefined();
      expect(result.firstAddress).toBeDefined();
      expect(result.lastAddress).toBeDefined();
    });

    it('should handle compressed IPv6 notation', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv6-subnet-calculator', 'POST', {
        cidr: '::1/128',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv6-subnet-calculator');

      const result = data.result.subnet;
      expect(result.network).toBe('::1');
      expect(result.prefixLength).toBe(128);
    });

    it('should handle invalid IPv6 CIDR format', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv6-subnet-calculator', 'POST', {
        cidr: 'invalid:ipv6:address',
      });

      expect(status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.tool).toBe('ipv6-subnet-calculator');
    });

    it('should handle invalid IPv6 prefix length', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv6-subnet-calculator', 'POST', {
        cidr: '2001:db8::/129',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv6-subnet-calculator');
    });

    it('should return expanded notation', async () => {
      const { status, data } = await makeApiRequest('/api/subnetting/ipv6-subnet-calculator', 'POST', {
        cidr: '2001:db8::1/64',
      });

      expect(status).toBe(200);
      validateSuccessResponse(data, 'ipv6-subnet-calculator');

      const result = data.result.subnet;
      expect(result.networkExpanded).toBeDefined();
      // Should be fully expanded format
      expect(result.networkExpanded).toMatch(/^[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}$/);
    });
  });
});