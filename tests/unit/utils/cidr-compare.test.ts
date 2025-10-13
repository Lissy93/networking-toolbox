import { describe, it, expect } from 'vitest';
import { cidrCompare, type CompareInput } from '../../../src/lib/utils/cidr-compare';

describe('CIDR Compare Utility', () => {
  describe('Basic Comparison', () => {
    it('should identify identical lists', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24\n10.0.0.0/16',
        listB: '192.168.1.0/24\n10.0.0.0/16'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.unchanged).toHaveLength(2);
      expect(result.summary.totalA).toBe(2);
      expect(result.summary.totalB).toBe(2);
    });

    it('should identify added entries', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24',
        listB: '192.168.1.0/24\n10.0.0.0/16'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.added).toContain('10.0.0.0/16');
      expect(result.removed).toHaveLength(0);
      expect(result.unchanged).toContain('192.168.1.0/24');
      expect(result.summary.addedCount).toBe(1);
    });

    it('should identify removed entries', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24\n10.0.0.0/16',
        listB: '192.168.1.0/24'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toContain('10.0.0.0/16');
      expect(result.unchanged).toContain('192.168.1.0/24');
      expect(result.summary.removedCount).toBe(1);
    });

    it('should handle completely different lists', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24\n10.0.0.0/16',
        listB: '172.16.0.0/12\n203.0.113.0/24'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.added).toHaveLength(2);
      expect(result.removed).toHaveLength(2);
      expect(result.unchanged).toHaveLength(0);
      expect(result.summary.unchangedCount).toBe(0);
    });
  });

  describe('Normalization', () => {
    it('should normalize single IPs to /32', () => {
      const input: CompareInput = {
        listA: '192.168.1.1',
        listB: '192.168.1.1/32'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.unchanged).toHaveLength(1);
      expect(result.normalizedA).toContain('192.168.1.1/32');
      expect(result.normalizedB).toContain('192.168.1.1/32');
    });

    it('should normalize CIDR to network address', () => {
      const input: CompareInput = {
        listA: '192.168.1.100/24',
        listB: '192.168.1.0/24'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.unchanged).toHaveLength(1);
      expect(result.normalizedA).toContain('192.168.1.0/24');
      expect(result.normalizedB).toContain('192.168.1.0/24');
    });

    it('should handle empty inputs', () => {
      const input: CompareInput = {
        listA: '',
        listB: '192.168.1.0/24'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.added).toContain('192.168.1.0/24');
      expect(result.removed).toHaveLength(0);
      expect(result.summary.totalA).toBe(0);
      expect(result.summary.totalB).toBe(1);
    });

    it('should ignore empty lines and whitespace', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24\n\n  \n10.0.0.0/16',
        listB: '192.168.1.0/24\n10.0.0.0/16'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.unchanged).toHaveLength(2);
      expect(result.summary.totalA).toBe(2);
      expect(result.summary.totalB).toBe(2);
    });
  });

  describe('IP Range Handling', () => {
    it('should convert IP ranges to CIDR blocks', () => {
      const input: CompareInput = {
        listA: '192.168.1.0-192.168.1.3',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.removed.length).toBeGreaterThan(0);
      expect(result.normalizedA.length).toBeGreaterThan(0);
    });

    it('should handle single IP ranges', () => {
      const input: CompareInput = {
        listA: '192.168.1.1-192.168.1.1',
        listB: '192.168.1.1/32'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.unchanged).toHaveLength(1);
    });

    it('should reject invalid ranges', () => {
      const input: CompareInput = {
        listA: '192.168.1.10-192.168.1.5',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('start IP is greater than end IP');
    });
  });

  describe('Sorting', () => {
    it('should sort results by network address', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24\n10.0.0.0/16\n172.16.0.0/12',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.normalizedA[0]).toBe('10.0.0.0/16');
      expect(result.normalizedA[1]).toBe('172.16.0.0/12');
      expect(result.normalizedA[2]).toBe('192.168.1.0/24');
    });

    it('should sort by prefix length for same network', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24\n192.168.1.0/25',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.normalizedA[0]).toBe('192.168.1.0/25'); // More specific first
      expect(result.normalizedA[1]).toBe('192.168.1.0/24');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid CIDR format', () => {
      const input: CompareInput = {
        listA: 'not.an.ip.address',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error processing');
    });

    it('should handle invalid prefix length', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/33',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid prefix length');
    });

    it('should handle malformed IP addresses', () => {
      const input: CompareInput = {
        listA: 'abc.def.ghi.jkl/24',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle malformed ranges', () => {
      const input: CompareInput = {
        listA: '192.168.1.1-invalid',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identical entries', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24\n192.168.1.0/24\n192.168.1.100/24',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.normalizedA).toHaveLength(1);
      expect(result.normalizedA[0]).toBe('192.168.1.0/24');
    });

    it('should handle complex deduplication', () => {
      const input: CompareInput = {
        listA: '192.168.1.1\n192.168.1.1/32\n192.168.1.100/24',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.normalizedA).toContain('192.168.1.1/32');
      expect(result.normalizedA).toContain('192.168.1.0/24');
    });
  });

  describe('Summary Statistics', () => {
    it('should provide accurate summary counts', () => {
      const input: CompareInput = {
        listA: '192.168.1.0/24\n10.0.0.0/16\n172.16.0.0/12',
        listB: '192.168.1.0/24\n203.0.113.0/24'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.summary.totalA).toBe(3);
      expect(result.summary.totalB).toBe(2);
      expect(result.summary.addedCount).toBe(1);
      expect(result.summary.removedCount).toBe(2);
      expect(result.summary.unchangedCount).toBe(1);

      // Verify totals add up
      expect(result.summary.addedCount + result.summary.unchangedCount).toBe(result.summary.totalB);
      expect(result.summary.removedCount + result.summary.unchangedCount).toBe(result.summary.totalA);
    });
  });

  describe('Edge Cases', () => {
    it('should handle both lists empty', () => {
      const input: CompareInput = {
        listA: '',
        listB: ''
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.summary.totalA).toBe(0);
      expect(result.summary.totalB).toBe(0);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.unchanged).toHaveLength(0);
    });

    it('should handle whitespace-only inputs', () => {
      const input: CompareInput = {
        listA: '   \n  \n  ',
        listB: '\t\n  '
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.summary.totalA).toBe(0);
      expect(result.summary.totalB).toBe(0);
    });

    it('should handle /0 prefix', () => {
      const input: CompareInput = {
        listA: '0.0.0.0/0',
        listB: '0.0.0.0/0'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.unchanged).toContain('0.0.0.0/0');
    });

    it('should handle /32 prefix', () => {
      const input: CompareInput = {
        listA: '192.168.1.1/32',
        listB: '192.168.1.1/32'
      };

      const result = cidrCompare(input);

      expect(result.success).toBe(true);
      expect(result.unchanged).toContain('192.168.1.1/32');
    });
  });
});