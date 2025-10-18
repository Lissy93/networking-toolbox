import { describe, it, expect } from 'vitest';
import {
	generateSnippets,
	validateConfig,
	getDefaultSnippetConfig,
	type SnippetConfig,
	type ValidationError,
} from '$lib/utils/dhcp-snippets.js';

describe('DHCP Snippets Generator', () => {
	describe('getDefaultSnippetConfig', () => {
		it('should return valid default configuration', () => {
			const config = getDefaultSnippetConfig();

			expect(config.targets).toEqual(['isc-dhcpd', 'kea-dhcp4']);
			expect(config.mode).toBe('dhcp4');
			expect(config.subnet).toBe('192.168.1.0/24');
			expect(config.pools).toHaveLength(1);
			expect(config.pools[0].start).toBe('192.168.1.100');
			expect(config.pools[0].end).toBe('192.168.1.200');
			expect(config.gateway).toBe('192.168.1.1');
			expect(config.dnsServers).toEqual(['8.8.8.8', '8.8.4.4']);
			expect(config.defaultLeaseTime).toBe(86400);
			expect(config.maxLeaseTime).toBe(604800);
		});
	});

	describe('validateConfig', () => {
		it('should validate correct IPv4 configuration', () => {
			const config = getDefaultSnippetConfig();
			const errors = validateConfig(config);

			expect(errors).toHaveLength(0);
		});

		it('should detect invalid CIDR notation', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = 'invalid';

			const errors = validateConfig(config);

			expect(errors).toHaveLength(1);
			expect(errors[0].field).toBe('subnet');
			expect(errors[0].message).toContain('Invalid CIDR notation');
		});

		it('should detect mode mismatch for IPv4', () => {
			const config = getDefaultSnippetConfig();
			config.mode = 'dhcp6'; // IPv6 mode with IPv4 subnet

			const errors = validateConfig(config);

			expect(errors.some((e) => e.field === 'mode')).toBe(true);
		});

		it('should detect mode mismatch for IPv6', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = '2001:db8::/64';
			config.mode = 'dhcp4'; // IPv4 mode with IPv6 subnet

			const errors = validateConfig(config);

			expect(errors.some((e) => e.field === 'mode')).toBe(true);
		});

		it('should detect pool start IP outside subnet', () => {
			const config = getDefaultSnippetConfig();
			config.pools[0].start = '10.0.0.1'; // Outside 192.168.1.0/24

			const errors = validateConfig(config);

			expect(errors.some((e) => e.field === 'pools[0].start')).toBe(true);
		});

		it('should detect pool end IP outside subnet', () => {
			const config = getDefaultSnippetConfig();
			config.pools[0].end = '10.0.0.254'; // Outside 192.168.1.0/24

			const errors = validateConfig(config);

			expect(errors.some((e) => e.field === 'pools[0].end')).toBe(true);
		});

		it('should detect gateway outside subnet', () => {
			const config = getDefaultSnippetConfig();
			config.gateway = '10.0.0.1'; // Outside 192.168.1.0/24

			const errors = validateConfig(config);

			expect(errors.some((e) => e.field === 'gateway')).toBe(true);
		});

		it('should validate IPv6 configuration', () => {
			const config = getDefaultSnippetConfig();
			config.mode = 'dhcp6';
			config.subnet = '2001:db8::/64';
			config.pools = [{ start: '2001:db8::100', end: '2001:db8::200' }];
			config.gateway = '2001:db8::1';

			const errors = validateConfig(config);

			expect(errors).toHaveLength(0);
		});

		it('should validate multiple pools', () => {
			const config = getDefaultSnippetConfig();
			config.pools = [
				{ start: '192.168.1.10', end: '192.168.1.50' },
				{ start: '192.168.1.100', end: '192.168.1.200' },
			];

			const errors = validateConfig(config);

			expect(errors).toHaveLength(0);
		});

		it('should detect multiple validation errors', () => {
			const config = getDefaultSnippetConfig();
			config.pools[0].start = '10.0.0.1';
			config.pools[0].end = '10.0.0.254';
			config.gateway = '172.16.0.1';

			const errors = validateConfig(config);

			expect(errors.length).toBeGreaterThan(1);
		});
	});

	describe('generateSnippets', () => {
		it('should generate ISC dhcpd snippet', () => {
			const config = getDefaultSnippetConfig();
			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toBeDefined();
			expect(result.iscDhcpdSnippet).toContain('subnet 192.168.1.0 netmask 255.255.255.0');
			expect(result.iscDhcpdSnippet).toContain('option routers 192.168.1.1');
			expect(result.iscDhcpdSnippet).toContain('option domain-name-servers 8.8.8.8, 8.8.4.4');
			expect(result.iscDhcpdSnippet).toContain('range 192.168.1.100 192.168.1.200');
			expect(result.iscDhcpdSnippet).toContain('default-lease-time 86400');
			expect(result.iscDhcpdSnippet).toContain('max-lease-time 604800');
		});

		it('should generate Kea DHCPv4 snippet', () => {
			const config = getDefaultSnippetConfig();
			const result = generateSnippets(config);

			expect(result.keaDhcp4Snippet).toBeDefined();

			const keaConfig = JSON.parse(result.keaDhcp4Snippet!);
			expect(keaConfig.subnet).toBe('192.168.1.0/24');
			expect(keaConfig.pools).toHaveLength(1);
			expect(keaConfig.pools[0].pool).toBe('192.168.1.100 - 192.168.1.200');
			expect(keaConfig['option-data']).toBeDefined();
			expect(keaConfig['valid-lifetime']).toBe(86400);
		});

		it('should generate Kea DHCPv6 snippet', () => {
			const config = getDefaultSnippetConfig();
			config.mode = 'dhcp6';
			config.subnet = '2001:db8::/64';
			config.pools = [{ start: '2001:db8::100', end: '2001:db8::200' }];
			config.gateway = '2001:db8::1';
			config.targets = ['kea-dhcp6'];
			config.preferredLifetime = 3600;
			config.validLifetime = 7200;

			const result = generateSnippets(config);

			expect(result.keaDhcp6Snippet).toBeDefined();

			const keaConfig = JSON.parse(result.keaDhcp6Snippet!);
			expect(keaConfig.subnet).toBe('2001:db8::/64');
			expect(keaConfig['preferred-lifetime']).toBe(3600);
			expect(keaConfig['valid-lifetime']).toBe(7200);
		});

		it('should generate summary', () => {
			const config = getDefaultSnippetConfig();
			const result = generateSnippets(config);

			expect(result.summary).toContain('Subnet: 192.168.1.0/24');
			expect(result.summary).toContain('Pools: 1 range(s)');
			expect(result.summary).toContain('Gateway: 192.168.1.1');
			expect(result.summary).toContain('DNS: 8.8.8.8, 8.8.4.4');
		});

		it('should not generate snippets when validation fails', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = 'invalid';

			const result = generateSnippets(config);

			expect(result.validations).toHaveLength(1);
			expect(result.iscDhcpdSnippet).toBeUndefined();
			expect(result.keaDhcp4Snippet).toBeUndefined();
		});

		it('should handle multiple pools in ISC snippet', () => {
			const config = getDefaultSnippetConfig();
			config.pools = [
				{ start: '192.168.1.10', end: '192.168.1.50' },
				{ start: '192.168.1.100', end: '192.168.1.200' },
			];

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toContain('# Pool 1');
			expect(result.iscDhcpdSnippet).toContain('# Pool 2');
			expect(result.iscDhcpdSnippet).toContain('range 192.168.1.10 192.168.1.50');
			expect(result.iscDhcpdSnippet).toContain('range 192.168.1.100 192.168.1.200');
		});

		it('should include domain name when provided', () => {
			const config = getDefaultSnippetConfig();
			config.domainName = 'example.com';

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toContain('option domain-name "example.com"');
		});

		it('should generate only selected target snippets', () => {
			const config = getDefaultSnippetConfig();
			config.targets = ['isc-dhcpd'];

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toBeDefined();
			expect(result.keaDhcp4Snippet).toBeUndefined();
		});

		it('should handle pretty JSON formatting', () => {
			const config = getDefaultSnippetConfig();
			config.prettyJson = true;

			const result = generateSnippets(config);

			expect(result.keaDhcp4Snippet).toContain('\n');
			expect(result.keaDhcp4Snippet).toContain('  ');
		});

		it('should handle compact JSON formatting', () => {
			const config = getDefaultSnippetConfig();
			config.prettyJson = false;

			const result = generateSnippets(config);

			expect(result.keaDhcp4Snippet).not.toContain('\n  ');
		});
	});

	describe('ISC DHCP specific features', () => {
		it('should correctly convert /24 to netmask', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = '192.168.1.0/24';

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toContain('netmask 255.255.255.0');
		});

		it('should correctly convert /16 to netmask', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = '172.16.0.0/16';
			config.pools = [{ start: '172.16.1.1', end: '172.16.1.254' }];
			config.gateway = '172.16.0.1';

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toContain('netmask 255.255.0.0');
		});

		it('should correctly convert /8 to netmask', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = '10.0.0.0/8';
			config.pools = [{ start: '10.0.1.1', end: '10.0.1.254' }];
			config.gateway = '10.0.0.1';

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toContain('netmask 255.0.0.0');
		});

		it('should handle non-standard subnet masks', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = '192.168.1.0/25';
			config.pools = [{ start: '192.168.1.1', end: '192.168.1.126' }];
			config.gateway = '192.168.1.127';

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toContain('netmask 255.255.255.128');
		});
	});

	describe('Kea DHCP specific features', () => {
		it('should use correct option names for IPv4', () => {
			const config = getDefaultSnippetConfig();
			const result = generateSnippets(config);

			const keaConfig = JSON.parse(result.keaDhcp4Snippet!);
			const routerOption = keaConfig['option-data'].find((opt: any) => opt.name === 'routers');

			expect(routerOption).toBeDefined();
			expect(routerOption.data).toBe('192.168.1.1');
		});

		it('should include DNS servers in option-data', () => {
			const config = getDefaultSnippetConfig();
			const result = generateSnippets(config);

			const keaConfig = JSON.parse(result.keaDhcp4Snippet!);
			const dnsOption = keaConfig['option-data'].find((opt: any) => opt.name === 'dns-servers');

			expect(dnsOption).toBeDefined();
			expect(dnsOption.data).toBe('8.8.8.8, 8.8.4.4');
		});

		it('should not generate IPv4 snippet when mode is IPv6', () => {
			const config = getDefaultSnippetConfig();
			config.mode = 'dhcp6';
			config.subnet = '2001:db8::/64';
			config.pools = [{ start: '2001:db8::100', end: '2001:db8::200' }];

			const result = generateSnippets(config);

			expect(result.keaDhcp4Snippet).toBeUndefined();
		});

		it('should not generate IPv6 snippet when mode is IPv4', () => {
			const config = getDefaultSnippetConfig();
			config.targets = ['kea-dhcp6'];

			const result = generateSnippets(config);

			expect(result.keaDhcp6Snippet).toBeUndefined();
		});
	});

	describe('Edge cases', () => {
		it('should handle empty DNS servers', () => {
			const config = getDefaultSnippetConfig();
			config.dnsServers = [];

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).not.toContain('option domain-name-servers');
		});

		it('should handle missing gateway', () => {
			const config = getDefaultSnippetConfig();
			config.gateway = undefined;

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).not.toContain('option routers');
		});

		it('should handle missing domain name', () => {
			const config = getDefaultSnippetConfig();
			config.domainName = undefined;

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).not.toContain('option domain-name "');
		});

		it('should handle /32 subnet', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = '192.168.1.1/32';
			config.pools = [{ start: '192.168.1.1', end: '192.168.1.1' }];
			config.gateway = '192.168.1.1';

			const result = generateSnippets(config);

			expect(result.iscDhcpdSnippet).toContain('netmask 255.255.255.255');
		});

		it('should handle large subnet (/8)', () => {
			const config = getDefaultSnippetConfig();
			config.subnet = '10.0.0.0/8';
			config.pools = [{ start: '10.1.1.1', end: '10.1.1.254' }];
			config.gateway = '10.0.0.1';

			const errors = validateConfig(config);

			expect(errors).toHaveLength(0);
		});
	});

	describe('Summary generation', () => {
		it('should include all configured options in summary', () => {
			const config = getDefaultSnippetConfig();
			config.domainName = 'test.local';

			const result = generateSnippets(config);

			expect(result.summary).toContain('Subnet');
			expect(result.summary).toContain('Pools');
			expect(result.summary).toContain('Gateway');
			expect(result.summary).toContain('DNS');
		});

		it('should handle summary with multiple pools', () => {
			const config = getDefaultSnippetConfig();
			config.pools = [
				{ start: '192.168.1.10', end: '192.168.1.50' },
				{ start: '192.168.1.100', end: '192.168.1.200' },
				{ start: '192.168.1.210', end: '192.168.1.250' },
			];

			const result = generateSnippets(config);

			expect(result.summary).toContain('Pools: 3 range(s)');
		});
	});

	describe('Validation error messages', () => {
		it('should provide clear error for pool outside subnet', () => {
			const config = getDefaultSnippetConfig();
			config.pools[0].start = '10.0.0.1';

			const errors = validateConfig(config);
			const poolError = errors.find((e) => e.field === 'pools[0].start');

			expect(poolError).toBeDefined();
			expect(poolError?.message).toBe('Pool start IP outside subnet');
		});

		it('should provide clear error for gateway outside subnet', () => {
			const config = getDefaultSnippetConfig();
			config.gateway = '10.0.0.1';

			const errors = validateConfig(config);
			const gatewayError = errors.find((e) => e.field === 'gateway');

			expect(gatewayError).toBeDefined();
			expect(gatewayError?.message).toBe('Gateway IP outside subnet');
		});

		it('should provide clear error for mode mismatch', () => {
			const config = getDefaultSnippetConfig();
			config.mode = 'dhcp6';

			const errors = validateConfig(config);
			const modeError = errors.find((e) => e.field === 'mode');

			expect(modeError).toBeDefined();
			expect(modeError?.message).toContain('Mode mismatch');
		});
	});
});
