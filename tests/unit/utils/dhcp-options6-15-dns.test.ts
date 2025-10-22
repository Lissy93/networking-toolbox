import { describe, it, expect } from 'vitest';
import {
	validateDNSConfig,
	buildDNSOptions,
	decodeDNSServersOption,
	decodeDomainNameOption,
	type DNSConfig,
} from '$lib/utils/dhcp-options6-15-dns';

describe('dhcp-options6-15-dns', () => {
	describe('validateDNSConfig', () => {
		it('should require at least one DNS server or domain', () => {
			const config: DNSConfig = {
				dnsServers: [],
			};
			const errors = validateDNSConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('At least one DNS server or domain name');
		});

		it('should validate IPv4 DNS servers', () => {
			const config: DNSConfig = {
				dnsServers: ['invalid-ip'],
			};
			const errors = validateDNSConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Invalid IPv4 address');
		});

		it('should accept valid DNS servers', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8', '8.8.4.4'],
			};
			const errors = validateDNSConfig(config);
			expect(errors).toEqual([]);
		});

		it('should validate domain name format', () => {
			const config: DNSConfig = {
				dnsServers: [],
				domainName: '-invalid-.com',
			};
			const errors = validateDNSConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Invalid domain name');
		});

		it('should accept valid domain names', () => {
			const config: DNSConfig = {
				dnsServers: [],
				domainName: 'example.com',
			};
			const errors = validateDNSConfig(config);
			expect(errors).toEqual([]);
		});

		it('should accept domain with trailing dot', () => {
			const config: DNSConfig = {
				dnsServers: [],
				domainName: 'example.com.',
			};
			const errors = validateDNSConfig(config);
			expect(errors).toEqual([]);
		});

		it('should detect duplicate DNS servers', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8', '8.8.8.8'],
			};
			const errors = validateDNSConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Duplicate');
		});

		it('should skip empty entries', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8', ''],
				domainName: 'example.com',
			};
			const errors = validateDNSConfig(config);
			expect(errors).toEqual([]);
		});
	});

	describe('buildDNSOptions', () => {
		it('should build Option 6 for DNS servers', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8'],
			};
			const result = buildDNSOptions(config);
			expect(result.option6).toBeDefined();
			expect(result.option6!.servers).toEqual(['8.8.8.8']);
			expect(result.option6!.hexEncoded).toBe('08080808');
			expect(result.option6!.totalLength).toBe(4);
		});

		it('should build Option 6 for multiple DNS servers', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8', '8.8.4.4'],
			};
			const result = buildDNSOptions(config);
			expect(result.option6!.servers).toEqual(['8.8.8.8', '8.8.4.4']);
			expect(result.option6!.hexEncoded).toBe('0808080808080404');
			expect(result.option6!.totalLength).toBe(8);
		});

		it('should build Option 15 for domain name', () => {
			const config: DNSConfig = {
				dnsServers: [],
				domainName: 'example.com',
			};
			const result = buildDNSOptions(config);
			expect(result.option15).toBeDefined();
			expect(result.option15!.domain).toBe('example.com');
			expect(result.option15!.hexEncoded).toBe('6578616d706c652e636f6d');
		});

		it('should build both options when provided', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8'],
				domainName: 'example.com',
			};
			const result = buildDNSOptions(config);
			expect(result.option6).toBeDefined();
			expect(result.option15).toBeDefined();
		});

		it('should format wire format with spaces', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8'],
			};
			const result = buildDNSOptions(config);
			expect(result.option6!.wireFormat).toBe('08 08 08 08');
		});

		it('should skip empty DNS servers', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8', '', '8.8.4.4'],
			};
			const result = buildDNSOptions(config);
			expect(result.option6!.servers).toEqual(['8.8.8.8', '8.8.4.4']);
		});

		it('should handle domain with trailing dot', () => {
			const config: DNSConfig = {
				dnsServers: [],
				domainName: 'example.com.',
			};
			const result = buildDNSOptions(config);
			expect(result.option15!.domain).toBe('example.com');
		});

		it('should generate config examples', () => {
			const config: DNSConfig = {
				dnsServers: ['8.8.8.8'],
				domainName: 'example.com',
			};
			const result = buildDNSOptions(config);
			expect(result.configExamples.iscDhcpd).toContain('domain-name-servers');
			expect(result.configExamples.iscDhcpd).toContain('domain-name');
			expect(result.configExamples.keaDhcp4).toContain('"code": 6');
			expect(result.configExamples.keaDhcp4).toContain('"code": 15');
			expect(result.configExamples.dnsmasq).toContain('dhcp-option=6');
			expect(result.configExamples.dnsmasq).toContain('dhcp-option=15');
		});

		it('should throw error for invalid config', () => {
			const config: DNSConfig = {
				dnsServers: ['invalid-ip'],
			};
			expect(() => buildDNSOptions(config)).toThrow();
		});
	});

	describe('decodeDNSServersOption', () => {
		it('should decode single DNS server', () => {
			const result = decodeDNSServersOption('08080808');
			expect(result!.servers).toEqual(['8.8.8.8']);
			expect(result!.totalLength).toBe(4);
		});

		it('should decode multiple DNS servers', () => {
			const result = decodeDNSServersOption('0808080808080404');
			expect(result!.servers).toEqual(['8.8.8.8', '8.8.4.4']);
			expect(result!.totalLength).toBe(8);
		});

		it('should handle hex with spaces', () => {
			const result = decodeDNSServersOption('08 08 08 08');
			expect(result!.servers).toEqual(['8.8.8.8']);
		});

		it('should handle uppercase hex', () => {
			const result = decodeDNSServersOption('08080808');
			expect(result!.servers).toEqual(['8.8.8.8']);
		});

		it('should throw error for empty hex', () => {
			expect(() => decodeDNSServersOption('')).toThrow('empty');
		});

		it('should throw error for invalid hex', () => {
			expect(() => decodeDNSServersOption('zzzz')).toThrow('Invalid hex');
		});

		it('should throw error for incorrect length', () => {
			expect(() => decodeDNSServersOption('080808')).toThrow('multiple of 8');
		});
	});

	describe('decodeDomainNameOption', () => {
		it('should decode domain name', () => {
			const result = decodeDomainNameOption('6578616d706c652e636f6d');
			expect(result!.domain).toBe('example.com');
		});

		it('should handle hex with spaces', () => {
			const result = decodeDomainNameOption('65 78 61 6d 70 6c 65 2e 63 6f 6d');
			expect(result!.domain).toBe('example.com');
		});

		it('should handle uppercase hex', () => {
			const result = decodeDomainNameOption('6578616D706C652E636F6D');
			expect(result!.domain).toBe('example.com');
		});

		it('should throw error for empty hex', () => {
			expect(() => decodeDomainNameOption('')).toThrow('empty');
		});

		it('should throw error for invalid hex', () => {
			expect(() => decodeDomainNameOption('zzzz')).toThrow('Invalid hex');
		});

		it('should throw error for invalid domain', () => {
			// Invalid domain characters
			expect(() => decodeDomainNameOption('2d2d2d')).toThrow('invalid');
		});
	});
});
