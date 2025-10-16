import { describe, it, expect } from 'vitest';
import { convertRangeToCIDR } from '../../../src/lib/utils/range-to-cidr';

describe('range-to-cidr', () => {
  describe('IPv4 Range to CIDR Conversion', () => {
    it('should convert a simple aligned range', () => {
      const result = convertRangeToCIDR('192.168.1.0', '192.168.1.255');
      expect(result.isValid).toBe(true);
      expect(result.ipVersion).toBe(4);
      expect(result.cidrs).toHaveLength(1);
      expect(result.cidrs[0].cidr).toBe('192.168.1.0/24');
      expect(result.totalAddresses).toBe('256');
    });

    it('should convert a single IP address', () => {
      const result = convertRangeToCIDR('192.168.1.100', '192.168.1.100');
      expect(result.isValid).toBe(true);
      expect(result.cidrs).toHaveLength(1);
      expect(result.cidrs[0].cidr).toBe('192.168.1.100/32');
      expect(result.totalAddresses).toBe('1');
    });

    it('should convert an unaligned range to multiple CIDRs', () => {
      const result = convertRangeToCIDR('192.168.1.10', '192.168.1.20');
      expect(result.isValid).toBe(true);
      expect(result.cidrs.length).toBeGreaterThan(1);
      expect(result.totalAddresses).toBe('11');
    });

    it('should handle a large range', () => {
      const result = convertRangeToCIDR('10.0.0.0', '10.255.255.255');
      expect(result.isValid).toBe(true);
      expect(result.cidrs[0].cidr).toBe('10.0.0.0/8');
      expect(result.totalBlocks).toBe(1);
    });

    it('should convert adjacent /24 blocks', () => {
      const result = convertRangeToCIDR('192.168.0.0', '192.168.1.255');
      expect(result.isValid).toBe(true);
      expect(result.totalAddresses).toBe('512');
    });
  });

  describe('IPv6 Range to CIDR Conversion', () => {
    it('should convert a simple aligned IPv6 range', () => {
      const result = convertRangeToCIDR('2001:db8::', '2001:db8::ff');
      expect(result.isValid).toBe(true);
      expect(result.ipVersion).toBe(6);
      expect(result.cidrs.length).toBeGreaterThanOrEqual(1);
    });

    it('should convert a single IPv6 address', () => {
      const result = convertRangeToCIDR('2001:db8::1', '2001:db8::1');
      expect(result.isValid).toBe(true);
      expect(result.cidrs).toHaveLength(1);
      expect(result.cidrs[0].prefix).toBe(128);
      expect(result.totalAddresses).toBe('1');
    });

    it('should handle full form IPv6 addresses', () => {
      const result = convertRangeToCIDR(
        '2001:0db8:0000:0000:0000:0000:0000:0000',
        '2001:0db8:0000:0000:0000:0000:0000:00ff'
      );
      expect(result.isValid).toBe(true);
      expect(result.ipVersion).toBe(6);
    });

    it('should compress IPv6 addresses in output', () => {
      const result = convertRangeToCIDR('2001:db8:0:0:0:0:0:0', '2001:db8:0:0:0:0:0:1');
      expect(result.isValid).toBe(true);
      expect(result.startIP).toContain('::');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should reject invalid start IP', () => {
      const result = convertRangeToCIDR('invalid', '192.168.1.100');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid start IP');
    });

    it('should reject invalid end IP', () => {
      const result = convertRangeToCIDR('192.168.1.1', 'invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid end IP');
    });

    it('should reject mixed IPv4 and IPv6', () => {
      const result = convertRangeToCIDR('192.168.1.1', '2001:db8::1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('same version');
    });

    it('should reject reversed range (start > end)', () => {
      const result = convertRangeToCIDR('192.168.1.100', '192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Start IP must be less than or equal to end IP');
    });

    it('should trim whitespace from inputs', () => {
      const result = convertRangeToCIDR('  192.168.1.0  ', '  192.168.1.255  ');
      expect(result.isValid).toBe(true);
      expect(result.cidrs[0].cidr).toBe('192.168.1.0/24');
    });
  });

  describe('CIDR Block Properties', () => {
    it('should include all required properties in CIDR blocks', () => {
      const result = convertRangeToCIDR('10.0.0.0', '10.0.0.255');
      expect(result.isValid).toBe(true);
      const block = result.cidrs[0];
      expect(block).toHaveProperty('cidr');
      expect(block).toHaveProperty('network');
      expect(block).toHaveProperty('prefix');
      expect(block).toHaveProperty('firstIP');
      expect(block).toHaveProperty('lastIP');
      expect(block).toHaveProperty('totalIPs');
    });

    it('should calculate correct total IPs for blocks', () => {
      const result = convertRangeToCIDR('192.168.0.0', '192.168.0.15');
      expect(result.isValid).toBe(true);
      expect(result.totalAddresses).toBe('16');

      let totalFromBlocks = 0n;
      for (const block of result.cidrs) {
        totalFromBlocks += BigInt(block.totalIPs);
      }
      expect(totalFromBlocks.toString()).toBe('16');
    });
  });

  describe('Edge Cases', () => {
    it('should handle the smallest possible range', () => {
      const result = convertRangeToCIDR('0.0.0.0', '0.0.0.0');
      expect(result.isValid).toBe(true);
      expect(result.cidrs).toHaveLength(1);
    });

    it('should handle maximum IPv4 address', () => {
      const result = convertRangeToCIDR('255.255.255.255', '255.255.255.255');
      expect(result.isValid).toBe(true);
      expect(result.cidrs[0].cidr).toBe('255.255.255.255/32');
    });

    it('should handle power-of-2 aligned ranges', () => {
      const result = convertRangeToCIDR('192.168.0.0', '192.168.3.255');
      expect(result.isValid).toBe(true);
      expect(result.totalAddresses).toBe('1024');
    });

    it('should handle range with trailing zeros in binary', () => {
      const result = convertRangeToCIDR('10.0.0.0', '10.0.0.127');
      expect(result.isValid).toBe(true);
      expect(result.cidrs[0].cidr).toBe('10.0.0.0/25');
    });

    it('should handle IPv6 loopback', () => {
      const result = convertRangeToCIDR('::1', '::1');
      expect(result.isValid).toBe(true);
      expect(result.cidrs[0].prefix).toBe(128);
    });

    it('should handle IPv6 with embedded IPv4 notation', () => {
      const result = convertRangeToCIDR('::ffff:192.0.2.1', '::ffff:192.0.2.1');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Result Structure', () => {
    it('should return consistent structure for valid results', () => {
      const result = convertRangeToCIDR('10.0.0.0', '10.0.0.10');
      expect(result).toHaveProperty('startIP');
      expect(result).toHaveProperty('endIP');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('ipVersion');
      expect(result).toHaveProperty('cidrs');
      expect(result).toHaveProperty('totalBlocks');
      expect(result).toHaveProperty('totalAddresses');
      expect(result).not.toHaveProperty('error');
    });

    it('should return consistent structure for invalid results', () => {
      const result = convertRangeToCIDR('invalid', 'also-invalid');
      expect(result).toHaveProperty('startIP');
      expect(result).toHaveProperty('endIP');
      expect(result).toHaveProperty('isValid');
      expect(result.isValid).toBe(false);
      expect(result).toHaveProperty('ipVersion');
      expect(result.ipVersion).toBe(null);
      expect(result).toHaveProperty('cidrs');
      expect(result.cidrs).toHaveLength(0);
      expect(result).toHaveProperty('totalBlocks');
      expect(result).toHaveProperty('totalAddresses');
      expect(result).toHaveProperty('error');
    });

    it('should have correct totalBlocks count', () => {
      const result = convertRangeToCIDR('192.168.1.10', '192.168.1.20');
      expect(result.isValid).toBe(true);
      expect(result.totalBlocks).toBe(result.cidrs.length);
    });
  });
});
