import { describe, it, expect } from 'vitest';
import { cidrDeaggregate, getSubnetSize } from '../../../src/lib/utils/cidr-deaggregate';

describe('cidr-deaggregate', () => {
  describe('CIDR Deaggregation', () => {
    it('should deaggregate a /24 into /26 subnets', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.0/24',
        targetPrefix: 26
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(4);
      expect(result.subnets).toContain('192.168.1.0/26');
      expect(result.subnets).toContain('192.168.1.64/26');
      expect(result.subnets).toContain('192.168.1.128/26');
      expect(result.subnets).toContain('192.168.1.192/26');
    });

    it('should deaggregate a /22 into /24 subnets', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/22',
        targetPrefix: 24
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(4);
      expect(result.subnets[0]).toBe('10.0.0.0/24');
      expect(result.subnets[3]).toBe('10.0.3.0/24');
    });

    it('should handle a /30 into /32 subnets', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.0/30',
        targetPrefix: 32
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(4);
    });

    it('should return the same block if target prefix is larger', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/24',
        targetPrefix: 22
      });
      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.subnets[0]).toBe('10.0.0.0/24');
    });
  });

  describe('IP Range Deaggregation', () => {
    it('should deaggregate an IP range', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.0-192.168.1.255',
        targetPrefix: 26
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(4);
    });

    it('should handle a small range', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0-10.0.0.7',
        targetPrefix: 30
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(2);
    });

    it('should reject reversed range', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.255-192.168.1.0',
        targetPrefix: 24
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid range');
    });
  });

  describe('Single IP Deaggregation', () => {
    it('should handle a single IP address', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.100',
        targetPrefix: 32
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(1);
      expect(result.subnets[0]).toBe('192.168.1.100/32');
    });

    it('should handle single IP with target prefix larger than /32', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.1',
        targetPrefix: 24
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Inputs', () => {
    it('should handle multiple CIDR blocks', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.0/24\n192.168.2.0/24',
        targetPrefix: 25
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(4);
      expect(result.inputSummary.totalInputs).toBe(2);
    });

    it('should handle mixed input types', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.0/24\n192.168.2.0-192.168.2.255\n192.168.3.100',
        targetPrefix: 25
      });
      expect(result.success).toBe(true);
      expect(result.inputSummary.totalInputs).toBe(3);
    });

    it('should deduplicate overlapping subnets', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/25\n10.0.0.0/25',
        targetPrefix: 26
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(2);
    });

    it('should sort subnets by network address', () => {
      const result = cidrDeaggregate({
        input: '192.168.2.0/24\n192.168.1.0/24',
        targetPrefix: 24
      });
      expect(result.success).toBe(true);
      expect(result.subnets[0]).toBe('192.168.1.0/24');
      expect(result.subnets[1]).toBe('192.168.2.0/24');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should reject empty input', () => {
      const result = cidrDeaggregate({
        input: '',
        targetPrefix: 24
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('No input provided');
    });

    it('should reject whitespace-only input', () => {
      const result = cidrDeaggregate({
        input: '   \n   \n   ',
        targetPrefix: 24
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('No input provided');
    });

    it('should reject target prefix less than 1', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/24',
        targetPrefix: 0
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Target prefix must be between 1 and 32');
    });

    it('should reject target prefix greater than 32', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/24',
        targetPrefix: 33
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Target prefix must be between 1 and 32');
    });

    it('should reject invalid CIDR format', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.0/99',
        targetPrefix: 24
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject invalid IP format', () => {
      const result = cidrDeaggregate({
        input: 'not.an.ip.address',
        targetPrefix: 24
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject malformed range', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.0-not.an.ip',
        targetPrefix: 24
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Safety Limits', () => {
    it('should enforce per-block subnet limit', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/8',
        targetPrefix: 32
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('safety limit');
      expect(result.error).toContain('10,000');
    });

    it('should enforce total subnet limit', () => {
      // Create input that would exceed 25,000 subnets
      const lines = [];
      for (let i = 0; i < 30; i++) {
        lines.push(`10.${i}.0.0/16`);
      }
      const result = cidrDeaggregate({
        input: lines.join('\n'),
        targetPrefix: 28
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('25,000');
    });

    it('should allow just under the limit', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/22',
        targetPrefix: 32
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBeLessThanOrEqual(10000);
    });
  });

  describe('Statistics and Metadata', () => {
    it('should calculate correct total addresses', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/24',
        targetPrefix: 26
      });
      expect(result.success).toBe(true);
      expect(result.totalAddresses).toBe(256);
    });

    it('should track input summary', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/24\n192.168.1.0/24',
        targetPrefix: 26
      });
      expect(result.success).toBe(true);
      expect(result.inputSummary.totalInputs).toBe(2);
      expect(result.inputSummary.totalInputAddresses).toBe(512);
    });

    it('should include all required properties on success', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/24',
        targetPrefix: 26
      });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('subnets');
      expect(result).toHaveProperty('totalSubnets');
      expect(result).toHaveProperty('totalAddresses');
      expect(result).toHaveProperty('inputSummary');
      expect(result.inputSummary).toHaveProperty('totalInputs');
      expect(result.inputSummary).toHaveProperty('totalInputAddresses');
    });

    it('should include all required properties on error', () => {
      const result = cidrDeaggregate({
        input: 'invalid',
        targetPrefix: 24
      });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('subnets');
      expect(result).toHaveProperty('totalSubnets');
      expect(result).toHaveProperty('totalAddresses');
      expect(result).toHaveProperty('inputSummary');
    });
  });

  describe('Edge Cases', () => {
    it('should handle /32 CIDR with /32 target', () => {
      const result = cidrDeaggregate({
        input: '192.168.1.1/32',
        targetPrefix: 32
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(1);
    });

    it('should handle /0 with appropriate target', () => {
      const result = cidrDeaggregate({
        input: '0.0.0.0/0',
        targetPrefix: 8
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(256);
    });

    it('should filter empty lines', () => {
      const result = cidrDeaggregate({
        input: '10.0.0.0/24\n\n\n192.168.1.0/24',
        targetPrefix: 25
      });
      expect(result.success).toBe(true);
      expect(result.inputSummary.totalInputs).toBe(2);
    });

    it('should trim whitespace from lines', () => {
      const result = cidrDeaggregate({
        input: '  10.0.0.0/24  \n  192.168.1.0/24  ',
        targetPrefix: 25
      });
      expect(result.success).toBe(true);
      expect(result.totalSubnets).toBe(4);
    });
  });

  describe('getSubnetSize', () => {
    it('should calculate correct subnet sizes', () => {
      expect(getSubnetSize(32)).toBe(1);
      expect(getSubnetSize(31)).toBe(2);
      expect(getSubnetSize(30)).toBe(4);
      expect(getSubnetSize(24)).toBe(256);
      expect(getSubnetSize(16)).toBe(65536);
      expect(getSubnetSize(8)).toBe(16777216);
      expect(getSubnetSize(0)).toBe(4294967296);
    });
  });
});
