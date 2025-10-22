import { describe, it, expect } from 'vitest';
import {
	validateLeaseTimeConfig,
	buildLeaseTimeOption,
	decodeLeaseTimeOption,
	formatTime,
	type LeaseTimeConfig,
} from '$lib/utils/dhcp-option51-lease-time';

describe('dhcp-option51-lease-time', () => {
	describe('formatTime', () => {
		it('should format infinite lease', () => {
			expect(formatTime(0xffffffff)).toBe('Infinite');
		});

		it('should format seconds', () => {
			expect(formatTime(30)).toBe('30 seconds');
			expect(formatTime(1)).toBe('1 second');
		});

		it('should format minutes', () => {
			expect(formatTime(60)).toBe('1 minute');
			expect(formatTime(120)).toBe('2 minutes');
		});

		it('should format hours', () => {
			expect(formatTime(3600)).toBe('1 hour');
			expect(formatTime(7200)).toBe('2 hours');
		});

		it('should format days', () => {
			expect(formatTime(86400)).toBe('1 day');
			expect(formatTime(172800)).toBe('2 days');
		});

		it('should format combined time', () => {
			expect(formatTime(90061)).toBe('1 day, 1 hour, 1 minute, 1 second');
		});
	});

	describe('validateLeaseTimeConfig', () => {
		it('should accept infinite lease', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 0,
				infinite: true,
			};
			const errors = validateLeaseTimeConfig(config);
			expect(errors).toEqual([]);
		});

		it('should accept valid lease time', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 86400,
			};
			const errors = validateLeaseTimeConfig(config);
			expect(errors).toEqual([]);
		});

		it('should reject negative lease time', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: -100,
			};
			const errors = validateLeaseTimeConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('cannot be negative');
		});

		it('should reject lease time exceeding max', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 0xffffffff,
			};
			const errors = validateLeaseTimeConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('exceeds maximum');
		});

		it('should warn about very short lease', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 30,
			};
			const errors = validateLeaseTimeConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Warning:');
		});

		it('should warn about very long lease', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 40000000,
			};
			const errors = validateLeaseTimeConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Warning:');
		});
	});

	describe('buildLeaseTimeOption', () => {
		it('should build infinite lease', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 0,
				infinite: true,
			};
			const result = buildLeaseTimeOption(config);
			expect(result.leaseSeconds).toBe(0xffffffff);
			expect(result.hexEncoded).toBe('ffffffff');
			expect(result.isInfinite).toBe(true);
			expect(result.humanReadable).toBe('Infinite');
		});

		it('should build 24 hour lease', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 86400,
			};
			const result = buildLeaseTimeOption(config);
			expect(result.leaseSeconds).toBe(86400);
			expect(result.hexEncoded).toBe('00015180');
			expect(result.isInfinite).toBe(false);
			expect(result.totalLength).toBe(4);
		});

		it('should calculate T1 renewal time', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 86400,
			};
			const result = buildLeaseTimeOption(config);
			expect(result.t1RenewalSeconds).toBe(43200); // 50%
		});

		it('should calculate T2 rebinding time', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 86400,
			};
			const result = buildLeaseTimeOption(config);
			expect(result.t2RebindingSeconds).toBe(75600); // 87.5%
		});

		it('should not calculate T1/T2 for infinite lease', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 0,
				infinite: true,
			};
			const result = buildLeaseTimeOption(config);
			expect(result.t1RenewalSeconds).toBeUndefined();
			expect(result.t2RebindingSeconds).toBeUndefined();
		});

		it('should format wire format with spaces', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 3600,
			};
			const result = buildLeaseTimeOption(config);
			expect(result.wireFormat).toBe('00 00 0e 10');
		});

		it('should generate config examples', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 86400,
			};
			const result = buildLeaseTimeOption(config);
			expect(result.configExamples.iscDhcpd).toContain('default-lease-time');
			expect(result.configExamples.keaDhcp4).toContain('valid-lifetime');
			expect(result.configExamples.dnsmasq).toContain('dhcp-range');
		});

		it('should build with warnings but not throw', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: 30,
			};
			expect(() => buildLeaseTimeOption(config)).not.toThrow();
		});

		it('should throw for invalid config', () => {
			const config: LeaseTimeConfig = {
				leaseSeconds: -100,
			};
			expect(() => buildLeaseTimeOption(config)).toThrow();
		});
	});

	describe('decodeLeaseTimeOption', () => {
		it('should decode infinite lease', () => {
			const result = decodeLeaseTimeOption('ffffffff');
			expect(result.leaseSeconds).toBe(0xffffffff);
			expect(result.isInfinite).toBe(true);
			expect(result.humanReadable).toBe('Infinite');
		});

		it('should decode 24 hour lease', () => {
			const result = decodeLeaseTimeOption('00015180');
			expect(result.leaseSeconds).toBe(86400);
			expect(result.isInfinite).toBe(false);
		});

		it('should decode 1 hour lease', () => {
			const result = decodeLeaseTimeOption('00000e10');
			expect(result.leaseSeconds).toBe(3600);
		});

		it('should handle hex with spaces', () => {
			const result = decodeLeaseTimeOption('00 01 51 80');
			expect(result.leaseSeconds).toBe(86400);
		});

		it('should handle uppercase hex', () => {
			const result = decodeLeaseTimeOption('00015180');
			expect(result.leaseSeconds).toBe(86400);
		});

		it('should calculate T1 and T2 for decoded lease', () => {
			const result = decodeLeaseTimeOption('00015180');
			expect(result.t1RenewalSeconds).toBe(43200);
			expect(result.t2RebindingSeconds).toBe(75600);
		});

		it('should not calculate T1/T2 for infinite lease', () => {
			const result = decodeLeaseTimeOption('ffffffff');
			expect(result.t1RenewalSeconds).toBeUndefined();
			expect(result.t2RebindingSeconds).toBeUndefined();
		});

		it('should throw error for empty hex', () => {
			expect(() => decodeLeaseTimeOption('')).toThrow('empty');
		});

		it('should throw error for invalid hex', () => {
			expect(() => decodeLeaseTimeOption('zzzz')).toThrow('Invalid hex');
		});

		it('should throw error for incorrect length', () => {
			expect(() => decodeLeaseTimeOption('0001')).toThrow('exactly 8 characters');
		});

		it('should generate config examples for decoded value', () => {
			const result = decodeLeaseTimeOption('00015180');
			expect(result.configExamples.iscDhcpd).toBeDefined();
			expect(result.configExamples.keaDhcp4).toBeDefined();
			expect(result.configExamples.dnsmasq).toBeDefined();
		});
	});
});
