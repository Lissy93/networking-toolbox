import { describe, it, expect } from 'vitest';
import {
	validateFQDNConfig,
	buildFQDNOption,
	getDefaultFQDNConfig,
	type FQDNConfig,
} from '$lib/utils/dhcpv6-fqdn-rfc4704';

describe('dhcpv6-fqdn-rfc4704', () => {
	describe('validateFQDNConfig', () => {
		it('should require FQDN', () => {
			const emptyConfig: FQDNConfig = {
				fqdn: '',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const errors = validateFQDNConfig(emptyConfig);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('FQDN is required');
		});

		it('should validate FQDN format', () => {
			const invalidConfig: FQDNConfig = {
				fqdn: '-invalid-.com',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const errors = validateFQDNConfig(invalidConfig);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Invalid FQDN format');
		});

		it('should accept valid FQDNs', () => {
			const validConfig: FQDNConfig = {
				fqdn: 'client.example.com',
				serverShouldUpdate: true,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const errors = validateFQDNConfig(validConfig);
			expect(errors).toEqual([]);
		});

		it('should reject when both client and server should update', () => {
			const invalidConfig: FQDNConfig = {
				fqdn: 'client.example.com',
				serverShouldUpdate: true,
				serverOverride: false,
				clientShouldUpdate: true,
			};
			const errors = validateFQDNConfig(invalidConfig);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Both client and server cannot be set to update');
		});

		it('should accept single-label domains', () => {
			const validConfig: FQDNConfig = {
				fqdn: 'localhost',
				serverShouldUpdate: true,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const errors = validateFQDNConfig(validConfig);
			expect(errors).toEqual([]);
		});

		it('should accept multi-level subdomains', () => {
			const validConfig: FQDNConfig = {
				fqdn: 'workstation.corp.internal.example.com',
				serverShouldUpdate: true,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const errors = validateFQDNConfig(validConfig);
			expect(errors).toEqual([]);
		});
	});

	describe('buildFQDNOption', () => {
		it('should build FQDN option with server update flag', () => {
			const config: FQDNConfig = {
				fqdn: 'client.example.com',
				serverShouldUpdate: true,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.fqdn).toBe('client.example.com');
			expect(result.flags.S).toBe(true);
			expect(result.flags.O).toBe(false);
			expect(result.flags.N).toBe(true); // N=1 means client should NOT update
		});

		it('should encode FQDN in DNS wire format', () => {
			const config: FQDNConfig = {
				fqdn: 'example.com',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			// Should be: flags(1 byte) + 07(example length) + example + 03(com length) + com + 00(null)
			expect(result.hexEncoded).toContain('076578616d706c6503636f6d00');
		});

		it('should set S flag correctly', () => {
			const config: FQDNConfig = {
				fqdn: 'test.com',
				serverShouldUpdate: true,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.flags.S).toBe(true);
			expect(result.flags.flagsByte).toBe('05'); // S=1, N=1 (0b00000101)
		});

		it('should set O flag correctly', () => {
			const config: FQDNConfig = {
				fqdn: 'test.com',
				serverShouldUpdate: true,
				serverOverride: true,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.flags.O).toBe(true);
			expect(result.flags.flagsByte).toBe('07'); // S=1, O=1, N=1 (0b00000111)
		});

		it('should set N flag correctly when client should update', () => {
			const config: FQDNConfig = {
				fqdn: 'test.com',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: true,
			};
			const result = buildFQDNOption(config);
			expect(result.flags.N).toBe(false); // N=0 means client WILL update
			expect(result.flags.flagsByte).toBe('00'); // All flags = 0
		});

		it('should generate wire format with spaces', () => {
			const config: FQDNConfig = {
				fqdn: 'test.com',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.wireFormat).toContain(' ');
			expect(result.wireFormat.split(' ').length).toBeGreaterThan(1);
		});

		it('should calculate total length correctly', () => {
			const config: FQDNConfig = {
				fqdn: 'example.com',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			// 1 byte (flags) + 1 byte (len) + 7 bytes (example) + 1 byte (len) + 3 bytes (com) + 1 byte (null) = 14
			expect(result.totalLength).toBe(14);
		});

		it('should generate Kea configuration example', () => {
			const config: FQDNConfig = {
				fqdn: 'client.example.com',
				serverShouldUpdate: true,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.examples.keaDhcp6).toBeDefined();
			expect(result.examples.keaDhcp6).toContain('ddns-send-updates');
			expect(result.examples.keaDhcp6).toContain('true');
		});

		it('should generate Kea config with client updates', () => {
			const config: FQDNConfig = {
				fqdn: 'client.example.com',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: true,
			};
			const result = buildFQDNOption(config);
			expect(result.examples.keaDhcp6).toBeDefined();
			expect(result.examples.keaDhcp6).toContain('ddns-send-updates');
			expect(result.examples.keaDhcp6).toContain('false');
		});

		it('should provide flag descriptions', () => {
			const config: FQDNConfig = {
				fqdn: 'test.com',
				serverShouldUpdate: true,
				serverOverride: true,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.flags.description.length).toBe(3);
			expect(result.flags.description[0]).toContain('S=1');
			expect(result.flags.description[1]).toContain('O=1');
			expect(result.flags.description[2]).toContain('N=1');
		});

		it('should provide encoding breakdown', () => {
			const config: FQDNConfig = {
				fqdn: 'test.com',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.breakdown.flags).toBeDefined();
			expect(result.breakdown.fqdn).toBeDefined();
		});

		it('should throw error for invalid configuration', () => {
			const invalidConfig: FQDNConfig = {
				fqdn: '',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			expect(() => buildFQDNOption(invalidConfig)).toThrow();
		});

		it('should handle subdomain FQDN correctly', () => {
			const config: FQDNConfig = {
				fqdn: 'workstation.corp.example.com',
				serverShouldUpdate: true,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.fqdn).toBe('workstation.corp.example.com');
			expect(result.totalLength).toBeGreaterThan(0);
		});

		it('should handle single-label domain', () => {
			const config: FQDNConfig = {
				fqdn: 'localhost',
				serverShouldUpdate: false,
				serverOverride: false,
				clientShouldUpdate: false,
			};
			const result = buildFQDNOption(config);
			expect(result.fqdn).toBe('localhost');
			// 1 byte (flags) + 1 byte (len) + 9 bytes (localhost) + 1 byte (null) = 12
			expect(result.totalLength).toBe(12);
		});
	});

	describe('getDefaultFQDNConfig', () => {
		it('should return default configuration', () => {
			const defaultConfig = getDefaultFQDNConfig();
			expect(defaultConfig.fqdn).toBe('');
			expect(defaultConfig.serverShouldUpdate).toBe(true);
			expect(defaultConfig.serverOverride).toBe(false);
			expect(defaultConfig.clientShouldUpdate).toBe(false);
		});
	});
});
