import { describe, it, expect } from 'vitest';
import {
	validatePrefixDelegationConfig,
	buildPrefixDelegation,
	formatTime,
	type PrefixDelegationConfig,
} from '$lib/utils/dhcpv6-prefix-delegation';

describe('dhcpv6-prefix-delegation', () => {
	describe('validatePrefixDelegationConfig', () => {
		it('should validate IAID range', () => {
			const config: PrefixDelegationConfig = {
				iaid: -1,
				prefixes: [{ prefix: '2001:db8::/56' }],
			};
			const errors = validatePrefixDelegationConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('IAID must be between');
		});

		it('should validate T1/T2 relationship', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				t1: 1000,
				t2: 500,
				prefixes: [{ prefix: '2001:db8::/56' }],
			};
			const errors = validatePrefixDelegationConfig(config);
			expect(errors.some((e) => e.includes('T1 must be less than'))).toBe(true);
		});

		it('should require at least one prefix', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [],
			};
			const errors = validatePrefixDelegationConfig(config);
			expect(errors.some((e) => e.includes('At least one prefix'))).toBe(true);
		});

		it('should validate IPv6 prefix format', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [{ prefix: 'invalid' }],
			};
			const errors = validatePrefixDelegationConfig(config);
			expect(errors.some((e) => e.includes('Invalid IPv6 prefix'))).toBe(true);
		});

		it('should validate lifetime relationship', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [
					{
						prefix: '2001:db8::/56',
						preferredLifetime: 1000,
						validLifetime: 500,
					},
				],
			};
			const errors = validatePrefixDelegationConfig(config);
			expect(errors.some((e) => e.includes('Preferred lifetime must be'))).toBe(true);
		});

		it('should accept valid configuration', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				t1: 300,
				t2: 500,
				prefixes: [
					{
						prefix: '2001:db8::/56',
						preferredLifetime: 600,
						validLifetime: 1000,
					},
				],
			};
			const errors = validatePrefixDelegationConfig(config);
			expect(errors).toEqual([]);
		});
	});

	describe('buildPrefixDelegation', () => {
		it('should build basic IA_PD option', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [{ prefix: '2001:db8::/56' }],
			};
			const result = buildPrefixDelegation(config);
			expect(result).toBeDefined();
			expect(result.iaid).toBe(1);
			expect(result.iaidHex).toBe('00000001');
		});

		it('should handle multiple prefixes', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [{ prefix: '2001:db8:1::/56' }, { prefix: '2001:db8:2::/56' }],
			};
			const result = buildPrefixDelegation(config);
			expect(result.prefixes.length).toBe(2);
		});

		it('should encode prefix correctly', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [
					{
						prefix: '2001:db8::/56',
						preferredLifetime: 604800,
						validLifetime: 2592000,
					},
				],
			};
			const result = buildPrefixDelegation(config);
			expect(result.prefixes[0].prefixLength).toBe(56);
			expect(result.prefixes[0].preferredLifetimeHex).toBe('00093a80');
			expect(result.prefixes[0].validLifetimeHex).toBe('00278d00');
		});

		it('should format T1/T2 correctly', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				t1: 86400,
				t2: 138240,
				prefixes: [{ prefix: '2001:db8::/56' }],
			};
			const result = buildPrefixDelegation(config);
			expect(result.t1).toBe(86400);
			expect(result.t2).toBe(138240);
			expect(result.t1Hex).toBe('00015180');
			expect(result.t2Hex).toBe('00021c00');
		});

		it('should generate wire format', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [{ prefix: '2001:db8::/56' }],
			};
			const result = buildPrefixDelegation(config);
			expect(result.fullWireFormat).toContain(' ');
			expect(result.totalLength).toBeGreaterThan(0);
		});

		it('should generate Kea config example', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [{ prefix: '2001:db8::/56' }],
			};
			const result = buildPrefixDelegation(config);
			expect(result.examples.keaDhcp6).toBeDefined();
			expect(result.examples.keaDhcp6).toContain('pd-pools');
		});

		it('should handle compressed IPv6 addresses', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				prefixes: [{ prefix: '2001:db8::1/64' }],
			};
			const result = buildPrefixDelegation(config);
			expect(result.prefixes[0].prefixLength).toBe(64);
		});

		it('should handle zero T1/T2', () => {
			const config: PrefixDelegationConfig = {
				iaid: 1,
				t1: 0,
				t2: 0,
				prefixes: [{ prefix: '2001:db8::/56' }],
			};
			const result = buildPrefixDelegation(config);
			expect(result.t1).toBe(0);
			expect(result.t2).toBe(0);
		});

		it('should throw on invalid config', () => {
			const config: PrefixDelegationConfig = {
				iaid: -1,
				prefixes: [{ prefix: 'invalid' }],
			};
			expect(() => buildPrefixDelegation(config)).toThrow();
		});
	});

	describe('formatTime', () => {
		it('should format infinite time', () => {
			expect(formatTime(0xffffffff)).toBe('Infinite');
		});

		it('should format zero', () => {
			expect(formatTime(0)).toBe('0 seconds');
		});

		it('should format days', () => {
			expect(formatTime(86400)).toBe('1d');
		});

		it('should format complex durations', () => {
			const result = formatTime(90061); // 1d 1h 1m 1s
			expect(result).toContain('1d');
			expect(result).toContain('1h');
			expect(result).toContain('1m');
			expect(result).toContain('1s');
		});

		it('should format hours and minutes', () => {
			expect(formatTime(3661)).toBe('1h 1m 1s');
		});

		it('should format only seconds', () => {
			expect(formatTime(42)).toBe('42s');
		});
	});
});
