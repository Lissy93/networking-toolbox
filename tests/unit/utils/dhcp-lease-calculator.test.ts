import { describe, it, expect } from 'vitest';
import {
  validateLeaseTimeConfig,
  calculateLeaseTime,
  formatTime,
  type LeaseTimeConfig,
} from '$lib/utils/dhcp-lease-calculator';

describe('dhcp-lease-calculator', () => {
  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(30)).toBe('30 seconds');
      expect(formatTime(1)).toBe('1 second');
    });

    it('should format minutes correctly', () => {
      expect(formatTime(60)).toBe('1 minute');
      expect(formatTime(120)).toBe('2 minutes');
      expect(formatTime(90)).toBe('1 minute');
    });

    it('should format hours correctly', () => {
      expect(formatTime(3600)).toBe('1 hour');
      expect(formatTime(7200)).toBe('2 hours');
      expect(formatTime(3660)).toBe('1 hour, 1 minute');
    });

    it('should format days correctly', () => {
      expect(formatTime(86400)).toBe('1 day');
      expect(formatTime(172800)).toBe('2 days');
      expect(formatTime(90000)).toBe('1 day, 1 hour');
    });
  });

  describe('validateLeaseTimeConfig', () => {
    it('should accept valid configuration', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 50,
        churnRate: 'medium',
        networkType: 'corporate',
      };
      expect(validateLeaseTimeConfig(config)).toEqual([]);
    });

    it('should reject pool size <= 0', () => {
      const config: LeaseTimeConfig = {
        poolSize: 0,
        expectedClients: 50,
        churnRate: 'medium',
      };
      const errors = validateLeaseTimeConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Pool size must be greater than 0');
    });

    it('should reject negative expected clients', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: -10,
        churnRate: 'medium',
      };
      const errors = validateLeaseTimeConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Expected clients cannot be negative');
    });

    it('should warn when expected clients exceeds pool size', () => {
      const config: LeaseTimeConfig = {
        poolSize: 50,
        expectedClients: 100,
        churnRate: 'medium',
      };
      const errors = validateLeaseTimeConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('exceeds pool size');
    });

    it('should require custom churn hours when churn rate is custom', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 50,
        churnRate: 'custom',
      };
      const errors = validateLeaseTimeConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Custom churn rate');
    });

    it('should accept custom churn hours', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 50,
        churnRate: 'custom',
        customChurnHours: 12,
      };
      expect(validateLeaseTimeConfig(config)).toEqual([]);
    });
  });

  describe('calculateLeaseTime', () => {
    it('should calculate lease time for corporate network', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 50,
        churnRate: 'medium',
        networkType: 'corporate',
      };
      const result = calculateLeaseTime(config);

      expect(result.recommendedLeaseSeconds).toBe(86400); // 24 hours
      expect(result.utilizationPercent).toBe(50);
      expect(result.t1RenewalSeconds).toBe(43200); // 50% of lease
      expect(result.t2RebindingSeconds).toBe(75600); // 87.5% of lease
    });

    it('should calculate lease time for guest network', () => {
      const config: LeaseTimeConfig = {
        poolSize: 200,
        expectedClients: 150,
        churnRate: 'high',
        networkType: 'guest',
      };
      const result = calculateLeaseTime(config);

      expect(result.recommendedLeaseSeconds).toBe(3600); // 1 hour
      expect(result.utilizationPercent).toBe(75);
      expect(result.t1RenewalSeconds).toBe(1800); // 50% of lease
      expect(result.t2RebindingSeconds).toBe(3150); // 87.5% of lease
    });

    it('should calculate lease time for IoT network', () => {
      const config: LeaseTimeConfig = {
        poolSize: 600,
        expectedClients: 500,
        churnRate: 'low',
        networkType: 'iot',
      };
      const result = calculateLeaseTime(config);

      expect(result.recommendedLeaseSeconds).toBe(604800); // 7 days
      expect(result.utilizationPercent).toBe(83);
    });

    it('should use custom churn rate when specified', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 50,
        churnRate: 'custom',
        customChurnHours: 6,
        networkType: 'custom',
      };
      const result = calculateLeaseTime(config);

      // Low utilization (50%), should be 2x churn time but capped
      expect(result.recommendedLeaseSeconds).toBeGreaterThan(0);
      expect(result.utilizationPercent).toBe(50);
    });

    it('should provide exhaustion warning for high utilization', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 95,
        churnRate: 'medium',
        networkType: 'corporate',
      };
      const result = calculateLeaseTime(config);

      expect(result.utilizationPercent).toBe(95);
      expect(result.exhaustionTime).not.toBeNull();
      expect(result.exhaustionTime).toContain('under current load');
    });

    it('should provide recommendations for high utilization', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 92,
        churnRate: 'medium',
        networkType: 'corporate',
      };
      const result = calculateLeaseTime(config);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes('High utilization'))).toBe(true);
    });

    it('should provide recommendations for low utilization', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 20,
        churnRate: 'medium',
        networkType: 'corporate',
      };
      const result = calculateLeaseTime(config);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes('Low utilization'))).toBe(true);
    });

    it('should include config examples', () => {
      const config: LeaseTimeConfig = {
        poolSize: 100,
        expectedClients: 50,
        churnRate: 'medium',
        networkType: 'corporate',
      };
      const result = calculateLeaseTime(config);

      expect(result.configExamples).toBeDefined();
      expect(result.configExamples.iscDhcpd).toContain('default-lease-time');
      expect(result.configExamples.keaDhcp4).toContain('valid-lifetime');
    });

    it('should throw error for invalid configuration', () => {
      const config: LeaseTimeConfig = {
        poolSize: 0,
        expectedClients: 50,
        churnRate: 'medium',
      };
      expect(() => calculateLeaseTime(config)).toThrow();
    });
  });
});
