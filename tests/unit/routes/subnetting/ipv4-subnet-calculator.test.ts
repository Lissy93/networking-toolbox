import { describe, it, expect } from 'vitest';
import { calculateSubnet, getNetworkAddress, getBroadcastAddress, getWildcardMask } from '../../../../src/lib/utils/ip-calculations';
import { validateCIDR } from '../../../../src/lib/utils/ip-validation';

describe('IPv4 Subnet Calculator Route Functionality', () => {
  describe('Core subnet calculation logic', () => {
    it('calculates correct subnet information for /24 network', () => {
      const result = calculateSubnet('192.168.1.0', 24);

      expect(result.network.octets).toEqual([192, 168, 1, 0]);
      expect(result.broadcast.octets).toEqual([192, 168, 1, 255]);
      expect(result.subnet.octets).toEqual([255, 255, 255, 0]);
      expect(result.wildcardMask.octets).toEqual([0, 0, 0, 255]);
      expect(result.cidr).toBe(24);
      expect(result.hostCount).toBe(256);
      expect(result.usableHosts).toBe(254);
      expect(result.firstHost.octets).toEqual([192, 168, 1, 1]);
      expect(result.lastHost.octets).toEqual([192, 168, 1, 254]);
    });

    it('calculates correct subnet information for /16 network', () => {
      const result = calculateSubnet('10.0.0.0', 16);

      expect(result.network.octets).toEqual([10, 0, 0, 0]);
      expect(result.broadcast.octets).toEqual([10, 0, 255, 255]);
      expect(result.subnet.octets).toEqual([255, 255, 0, 0]);
      expect(result.wildcardMask.octets).toEqual([0, 0, 255, 255]);
      expect(result.cidr).toBe(16);
      expect(result.hostCount).toBe(65536);
      expect(result.usableHosts).toBe(65534);
    });

    it('calculates correct subnet information for /30 network', () => {
      const result = calculateSubnet('172.16.10.0', 30);

      expect(result.network.octets).toEqual([172, 16, 10, 0]);
      expect(result.broadcast.octets).toEqual([172, 16, 10, 3]);
      expect(result.subnet.octets).toEqual([255, 255, 255, 252]);
      expect(result.wildcardMask.octets).toEqual([0, 0, 0, 3]);
      expect(result.cidr).toBe(30);
      expect(result.hostCount).toBe(4);
      expect(result.usableHosts).toBe(2);
    });

    it('handles /32 host route correctly', () => {
      const result = calculateSubnet('192.168.1.10', 32);

      expect(result.network.octets).toEqual([192, 168, 1, 10]);
      expect(result.broadcast.octets).toEqual([192, 168, 1, 10]);
      expect(result.subnet.octets).toEqual([255, 255, 255, 255]);
      expect(result.wildcardMask.octets).toEqual([0, 0, 0, 0]);
      expect(result.cidr).toBe(32);
      expect(result.hostCount).toBe(1);
      expect(result.usableHosts).toBe(1); // Single host route
    });

    it('handles /31 point-to-point link correctly (RFC 3021)', () => {
      const result = calculateSubnet('192.168.1.0', 31);

      expect(result.network.octets).toEqual([192, 168, 1, 0]);
      expect(result.broadcast.octets).toEqual([192, 168, 1, 1]);
      expect(result.subnet.octets).toEqual([255, 255, 255, 254]);
      expect(result.wildcardMask.octets).toEqual([0, 0, 0, 1]);
      expect(result.cidr).toBe(31);
      expect(result.hostCount).toBe(2);
      expect(result.usableHosts).toBe(2); // RFC 3021: both IPs usable for point-to-point
    });

    it('handles /28 network correctly', () => {
      const result = calculateSubnet('10.1.1.0', 28);

      expect(result.network.octets).toEqual([10, 1, 1, 0]);
      expect(result.broadcast.octets).toEqual([10, 1, 1, 15]);
      expect(result.subnet.octets).toEqual([255, 255, 255, 240]);
      expect(result.wildcardMask.octets).toEqual([0, 0, 0, 15]);
      expect(result.cidr).toBe(28);
      expect(result.hostCount).toBe(16);
      expect(result.usableHosts).toBe(14);
    });

    it('handles /25 network correctly', () => {
      const result = calculateSubnet('192.168.100.0', 25);

      expect(result.network.octets).toEqual([192, 168, 100, 0]);
      expect(result.broadcast.octets).toEqual([192, 168, 100, 127]);
      expect(result.subnet.octets).toEqual([255, 255, 255, 128]);
      expect(result.wildcardMask.octets).toEqual([0, 0, 0, 127]);
      expect(result.cidr).toBe(25);
      expect(result.hostCount).toBe(128);
      expect(result.usableHosts).toBe(126);
    });

    it('handles /8 network correctly', () => {
      const result = calculateSubnet('10.0.0.0', 8);

      expect(result.network.octets).toEqual([10, 0, 0, 0]);
      expect(result.broadcast.octets).toEqual([10, 255, 255, 255]);
      expect(result.subnet.octets).toEqual([255, 0, 0, 0]);
      expect(result.wildcardMask.octets).toEqual([0, 255, 255, 255]);
      expect(result.cidr).toBe(8);
      expect(result.hostCount).toBe(16777216);
      expect(result.usableHosts).toBe(16777214);
    });

    it('correctly calculates network addresses for various inputs', () => {
      // Test with IP not aligned to network boundary
      const network1 = getNetworkAddress('192.168.1.100', 24);
      expect(network1.octets).toEqual([192, 168, 1, 0]);

      const network2 = getNetworkAddress('10.5.7.200', 16);
      expect(network2.octets).toEqual([10, 5, 0, 0]);

      const network3 = getNetworkAddress('172.16.10.50', 28);
      expect(network3.octets).toEqual([172, 16, 10, 48]);
    });

    it('correctly calculates broadcast addresses', () => {
      const broadcast1 = getBroadcastAddress('192.168.1.0', 24);
      expect(broadcast1.octets).toEqual([192, 168, 1, 255]);

      const broadcast2 = getBroadcastAddress('10.0.0.0', 16);
      expect(broadcast2.octets).toEqual([10, 0, 255, 255]);

      const broadcast3 = getBroadcastAddress('172.16.10.48', 28);
      expect(broadcast3.octets).toEqual([172, 16, 10, 63]);
    });

    it('correctly calculates wildcard masks', () => {
      const wildcard1 = getWildcardMask(24);
      expect(wildcard1.octets).toEqual([0, 0, 0, 255]);

      const wildcard2 = getWildcardMask(16);
      expect(wildcard2.octets).toEqual([0, 0, 255, 255]);

      const wildcard3 = getWildcardMask(30);
      expect(wildcard3.octets).toEqual([0, 0, 0, 3]);

      const wildcard4 = getWildcardMask(32);
      expect(wildcard4.octets).toEqual([0, 0, 0, 0]);
    });
  });

  describe('Input validation for subnet calculator', () => {
    it('validates correct CIDR notation', () => {
      const valid1 = validateCIDR('192.168.1.0/24');
      expect(valid1.valid).toBe(true);
      expect(valid1.error).toBeUndefined();

      const valid2 = validateCIDR('10.0.0.0/8');
      expect(valid2.valid).toBe(true);
      expect(valid2.error).toBeUndefined();

      const valid3 = validateCIDR('172.16.0.0/16');
      expect(valid3.valid).toBe(true);
      expect(valid3.error).toBeUndefined();

      const valid4 = validateCIDR('192.168.1.1/32');
      expect(valid4.valid).toBe(true);
      expect(valid4.error).toBeUndefined();
    });

    it('rejects invalid CIDR notation', () => {
      // Invalid IP addresses
      const invalid1 = validateCIDR('256.1.1.1/24');
      expect(invalid1.valid).toBe(false);

      const invalid2 = validateCIDR('192.168.1.1/33');
      expect(invalid2.valid).toBe(false);

      const invalid3 = validateCIDR('192.168.1.1');
      expect(invalid3.valid).toBe(false);

      const invalid4 = validateCIDR('not-an-ip/24');
      expect(invalid4.valid).toBe(false);

      const invalid5 = validateCIDR('192.168.1.1/-1');
      expect(invalid5.valid).toBe(false);
    });

    it('handles edge cases in validation', () => {
      // Empty string
      const empty = validateCIDR('');
      expect(empty.valid).toBe(false);

      // Whitespace around valid input is trimmed and accepted
      const whitespace = validateCIDR(' 192.168.1.0/24 ');
      expect(whitespace.valid).toBe(true);

      // Multiple slashes
      const multiSlash = validateCIDR('192.168.1.0/24/extra');
      expect(multiSlash.valid).toBe(false);

      // Just whitespace
      const justWhitespace = validateCIDR('   ');
      expect(justWhitespace.valid).toBe(false);
    });
  });

  describe('Integration scenarios for subnet calculator', () => {
    it('handles common enterprise subnets', () => {
      const enterpriseScenarios = [
        { cidr: '172.20.0.0/12', expectedHosts: 1048576, expectedUsable: 1048574 },
        { cidr: '192.168.0.0/16', expectedHosts: 65536, expectedUsable: 65534 },
        { cidr: '10.0.0.0/8', expectedHosts: 16777216, expectedUsable: 16777214 }
      ];

      enterpriseScenarios.forEach(scenario => {
        const [ip, cidrStr] = scenario.cidr.split('/');
        const result = calculateSubnet(ip, parseInt(cidrStr, 10));

        expect(result.hostCount).toBe(scenario.expectedHosts);
        expect(result.usableHosts).toBe(scenario.expectedUsable);
        expect(result.cidr).toBe(parseInt(cidrStr, 10));
      });
    });

    it('handles small subnet scenarios', () => {
      const smallSubnets = [
        { cidr: '192.168.1.0/29', expectedHosts: 8, expectedUsable: 6 },
        { cidr: '192.168.1.8/29', expectedHosts: 8, expectedUsable: 6 },
        { cidr: '192.168.1.16/28', expectedHosts: 16, expectedUsable: 14 }
      ];

      smallSubnets.forEach(scenario => {
        const [ip, cidrStr] = scenario.cidr.split('/');
        const result = calculateSubnet(ip, parseInt(cidrStr, 10));

        expect(result.hostCount).toBe(scenario.expectedHosts);
        expect(result.usableHosts).toBe(scenario.expectedUsable);
      });
    });

    it('ensures consistency between network and broadcast calculations', () => {
      const testCases = [
        '192.168.1.100/24',
        '10.5.7.200/16',
        '172.16.10.50/28',
        '203.0.113.45/25'
      ];

      testCases.forEach(cidrInput => {
        const [ip, cidrStr] = cidrInput.split('/');
        const cidr = parseInt(cidrStr, 10);
        const result = calculateSubnet(ip, cidr);

        // Network should always be aligned to subnet boundary
        const networkCalc = getNetworkAddress(ip, cidr);
        expect(result.network.octets).toEqual(networkCalc.octets);

        // Broadcast should be consistent with network + host bits
        const broadcastCalc = getBroadcastAddress(result.network.octets.join('.'), cidr);
        expect(result.broadcast.octets).toEqual(broadcastCalc.octets);

        // First and last host should be network+1 and broadcast-1 (except for /31 and /32)
        if (cidr < 31) {
          expect(result.firstHost.octets[3]).toBe(result.network.octets[3] + 1);
          expect(result.lastHost.octets[3]).toBe(result.broadcast.octets[3] - 1);
        }
      });
    });
  });

  describe('Number formatting for display', () => {
    it('formats large numbers with commas', () => {
      // Test the number formatting logic used in the component
      const formatNumber = (num: number): string => num.toLocaleString();

      expect(formatNumber(256)).toBe('256');
      expect(formatNumber(65536)).toBe('65,536');
      expect(formatNumber(16777216)).toBe('16,777,216');
      expect(formatNumber(4294967296)).toBe('4,294,967,296');
    });

    it('handles formatting edge cases', () => {
      const formatNumber = (num: number): string => num.toLocaleString();

      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1)).toBe('1');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });
  });
});