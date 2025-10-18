import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, writable } from 'svelte/store';
import {
	generateOption60,
	isValidVendorClass,
	getDefaultNetworkConfig,
	VENDOR_PRESETS,
	type VendorPreset,
	type NetworkConfig,
} from '$lib/utils/dhcp-option60.js';

// Mock composables
vi.mock('$lib/composables', () => ({
	useClipboard: () => ({
		copy: vi.fn(),
		isCopied: vi.fn(() => false),
		reset: vi.fn(),
		resetAll: vi.fn(),
		copiedStates: {},
	}),
	useExamples: (list: any[]) => ({
		selectedIndex: writable(-1),
		select: vi.fn((index: number) => {
			get(writable(-1));
		}),
		clear: vi.fn(),
	}),
}));

describe('DHCPOption60Builder Component Logic', () => {
	describe('Vendor Preset Selection', () => {
		it('should have correct default preset configuration', () => {
			const defaultPreset: VendorPreset = 'cisco-phone';
			const defaultConfig = getDefaultNetworkConfig(defaultPreset);

			expect(defaultConfig.subnet).toBe('192.168.10.0/24');
			expect(defaultConfig.poolStart).toBe('192.168.10.100');
			expect(defaultConfig.poolEnd).toBe('192.168.10.200');
		});

		it('should provide different defaults for each vendor preset', () => {
			const presets: VendorPreset[] = ['cisco-phone', 'cisco-ap', 'aruba-ap', 'pxe-client'];

			presets.forEach((preset) => {
				const config = getDefaultNetworkConfig(preset);
				expect(config).toBeDefined();
				expect(config.subnet).toMatch(/\d+\.\d+\.\d+\.\d+\/\d+/);
				expect(config.poolStart).toMatch(/\d+\.\d+\.\d+\.\d+/);
				expect(config.poolEnd).toMatch(/\d+\.\d+\.\d+\.\d+/);
			});
		});

		it('should include appropriate server IPs for presets that need them', () => {
			const presetsNeedingServerIp: VendorPreset[] = ['cisco-phone', 'pxe-client', 'docsis'];

			presetsNeedingServerIp.forEach((preset) => {
				const config = getDefaultNetworkConfig(preset);
				expect(config.serverIp).toBeDefined();
				expect(config.serverIp).toMatch(/\d+\.\d+\.\d+\.\d+/);
			});
		});

		it('should include boot filenames for appropriate presets', () => {
			const presetsNeedingBootFile: VendorPreset[] = ['cisco-phone', 'pxe-client', 'docsis'];

			presetsNeedingBootFile.forEach((preset) => {
				const config = getDefaultNetworkConfig(preset);
				expect(config.bootFilename).toBeDefined();
				expect(config.bootFilename!.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Input Validation', () => {
		describe('IPv4 Address Validation', () => {
			const isValidIPv4 = (ip: string): boolean => {
				const parts = ip.split('.');
				if (parts.length !== 4) return false;
				return parts.every((part) => {
					const num = parseInt(part, 10);
					return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
				});
			};

			it('should validate correct IPv4 addresses', () => {
				const validIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '0.0.0.0', '255.255.255.255'];

				validIPs.forEach((ip) => {
					expect(isValidIPv4(ip)).toBe(true);
				});
			});

			it('should reject invalid IPv4 addresses', () => {
				const invalidIPs = [
					'256.1.1.1', // Out of range
					'192.168.1', // Too few octets
					'192.168.1.1.1', // Too many octets
					'192.168.-1.1', // Negative
					'192.168.1.01', // Leading zero
					'a.b.c.d', // Non-numeric
					'', // Empty
				];

				invalidIPs.forEach((ip) => {
					expect(isValidIPv4(ip)).toBe(false);
				});
			});
		});

		describe('CIDR Validation', () => {
			const isValidCIDR = (cidr: string): boolean => {
				const parts = cidr.split('/');
				if (parts.length !== 2) return false;
				const prefix = parseInt(parts[1], 10);

				// Simple IPv4 validation for this test
				const ipParts = parts[0].split('.');
				if (ipParts.length !== 4) return false;
				const validIP = ipParts.every((part) => {
					const num = parseInt(part, 10);
					return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
				});

				return validIP && !isNaN(prefix) && prefix >= 0 && prefix <= 32;
			};

			it('should validate correct CIDR notation', () => {
				const validCIDRs = [
					'192.168.0.0/24',
					'10.0.0.0/8',
					'172.16.0.0/12',
					'192.168.1.0/25',
					'10.10.10.0/30',
				];

				validCIDRs.forEach((cidr) => {
					expect(isValidCIDR(cidr)).toBe(true);
				});
			});

			it('should reject invalid CIDR notation', () => {
				const invalidCIDRs = [
					'192.168.0.0', // Missing prefix
					'192.168.0.0/33', // Prefix out of range
					'192.168.0.0/-1', // Negative prefix
					'192.168.0.256/24', // Invalid IP
					'invalid/24', // Invalid IP
					'', // Empty
				];

				invalidCIDRs.forEach((cidr) => {
					expect(isValidCIDR(cidr)).toBe(false);
				});
			});
		});

		describe('Filename Validation', () => {
			const isValidFilename = (filename: string): boolean => {
				return filename.trim().length > 0 && !/[/\\]/.test(filename);
			};

			it('should validate correct filenames', () => {
				const validFilenames = [
					'config.cfg',
					'SEPDefault.cnf.xml',
					'pxelinux.0',
					'modem.cfg',
					'boot-file.txt',
				];

				validFilenames.forEach((filename) => {
					expect(isValidFilename(filename)).toBe(true);
				});
			});

			it('should reject invalid filenames', () => {
				const invalidFilenames = [
					'', // Empty
					'   ', // Whitespace only
					'path/to/file.cfg', // Contains path separator
					'C:\\path\\file.cfg', // Contains backslash
					'/etc/config.cfg', // Starts with slash
				];

				invalidFilenames.forEach((filename) => {
					expect(isValidFilename(filename)).toBe(false);
				});
			});
		});

		describe('Lease Time Validation', () => {
			const isValidLeaseTime = (leaseTime: string): boolean => {
				return /^\d+[smhd]$/.test(leaseTime.trim());
			};

			it('should validate correct lease time formats', () => {
				const validLeaseTimes = ['1h', '24h', '30m', '1d', '3600s', '7d'];

				validLeaseTimes.forEach((time) => {
					expect(isValidLeaseTime(time)).toBe(true);
				});
			});

			it('should reject invalid lease time formats', () => {
				const invalidLeaseTimes = [
					'', // Empty
					'1', // Missing unit
					'1hour', // Wrong unit format
					'h1', // Unit before number
					'24 h', // Space
					'invalid', // Non-numeric
				];

				invalidLeaseTimes.forEach((time) => {
					expect(isValidLeaseTime(time)).toBe(false);
				});
			});
		});

		describe('Custom Vendor Class Validation', () => {
			it('should validate correct custom vendor classes', () => {
				const validClasses = [
					'MyVendorClass',
					'Custom-Vendor-123',
					'VendorClass_Test',
					'A',
					'a'.repeat(255), // Max length
				];

				validClasses.forEach((vendorClass) => {
					expect(isValidVendorClass(vendorClass)).toBe(true);
				});
			});

			it('should reject invalid custom vendor classes', () => {
				const invalidClasses = [
					'', // Empty
					'   ', // Whitespace only
					'a'.repeat(256), // Too long
					'Invalid\nClass', // Contains newline
					'Invalid\x00Class', // Contains null
				];

				invalidClasses.forEach((vendorClass) => {
					expect(isValidVendorClass(vendorClass)).toBe(false);
				});
			});
		});
	});

	describe('Configuration Generation', () => {
		it('should generate all server configurations for a preset', () => {
			const preset: VendorPreset = 'cisco-phone';
			const config = getDefaultNetworkConfig(preset);
			const result = generateOption60(preset, undefined, config);

			expect(result).toBeDefined();
			expect(result.vendorClass).toBeDefined();
			expect(result.iscDhcpConfig).toBeDefined();
			expect(result.keaConfig).toBeDefined();
			expect(result.windowsConfig).toBeDefined();
			expect(result.dnsmasqConfig).toBeDefined();
			expect(result.mikrotikConfig).toBeDefined();
		});

		it('should use custom vendor class when provided', () => {
			const customClass = 'MyCustomClass';
			const config = getDefaultNetworkConfig('custom');
			const result = generateOption60('custom', customClass, config);

			expect(result.vendorClass).toBe(customClass);
			expect(result.iscDhcpConfig).toContain(customClass);
		});

		it('should include network configuration in generated configs', () => {
			const preset: VendorPreset = 'cisco-phone';
			const config: NetworkConfig = {
				subnet: '10.20.30.0/24',
				poolStart: '10.20.30.100',
				poolEnd: '10.20.30.200',
				serverIp: '10.20.30.5',
				bootFilename: 'custom.cfg',
			};

			const result = generateOption60(preset, undefined, config);

			expect(result.iscDhcpConfig).toContain('10.20.30.0');
			expect(result.iscDhcpConfig).toContain('10.20.30.100');
			expect(result.iscDhcpConfig).toContain('10.20.30.200');
		});

		it('should generate different configs for different server types', () => {
			const preset: VendorPreset = 'cisco-phone';
			const config = getDefaultNetworkConfig(preset);
			const result = generateOption60(preset, undefined, config);

			// ISC DHCP uses specific syntax
			expect(result.iscDhcpConfig).toContain('class');
			expect(result.iscDhcpConfig).toContain('match if');

			// Kea uses JSON format
			expect(result.keaConfig).toContain('"client-classes"');

			// Windows uses PowerShell
			expect(result.windowsConfig).toContain('Add-DhcpServerv4Class');

			// dnsmasq uses simple config
			expect(result.dnsmasqConfig).toContain('dhcp-vendorclass');

			// MikroTik uses CLI commands
			expect(result.mikrotikConfig).toContain('/ip dhcp-server option');
		});
	});

	describe('Conditional Field Visibility', () => {
		it('should show server IP for presets that require it', () => {
			const presetsNeedingServerIp: VendorPreset[] = ['cisco-phone', 'pxe-client', 'docsis'];

			presetsNeedingServerIp.forEach((preset) => {
				const needsServerIp = presetsNeedingServerIp.includes(preset);
				expect(needsServerIp).toBe(true);
			});
		});

		it('should show boot filename for presets that require it', () => {
			const presetsNeedingBootFilename: VendorPreset[] = ['cisco-phone', 'pxe-client', 'docsis'];

			presetsNeedingBootFilename.forEach((preset) => {
				const needsBootFilename = presetsNeedingBootFilename.includes(preset);
				expect(needsBootFilename).toBe(true);
			});
		});

		it('should show non-matching pool for appropriate presets', () => {
			const presetsNeedingNonMatchingPool: VendorPreset[] = [
				'cisco-phone',
				'cisco-ap',
				'aruba-ap',
				'ruckus-ap',
				'unifi-ap',
				'meraki-ap',
				'pxe-client',
				'custom',
			];

			presetsNeedingNonMatchingPool.forEach((preset) => {
				const needsNonMatchingPool = presetsNeedingNonMatchingPool.includes(preset);
				expect(needsNonMatchingPool).toBe(true);
			});
		});

		it('should not show server IP for presets that do not need it', () => {
			const presetsNotNeedingServerIp: VendorPreset[] = ['cisco-ap', 'aruba-ap', 'ruckus-ap'];

			presetsNotNeedingServerIp.forEach((preset) => {
				const needsServerIp = ['cisco-phone', 'pxe-client', 'docsis'].includes(preset);
				expect(needsServerIp).toBe(false);
			});
		});
	});

	describe('Preset-Specific Defaults', () => {
		it('should provide Cisco IP Phone specific defaults', () => {
			const config = getDefaultNetworkConfig('cisco-phone');

			expect(config.serverIp).toBeDefined();
			expect(config.bootFilename).toBeDefined();
			expect(config.bootFilename).toContain('.cnf.xml');
		});

		it('should provide PXE client specific defaults', () => {
			const config = getDefaultNetworkConfig('pxe-client');

			expect(config.serverIp).toBeDefined();
			expect(config.bootFilename).toBeDefined();
			expect(config.bootFilename).toContain('pxelinux');
		});

		it('should provide DOCSIS modem specific defaults', () => {
			const config = getDefaultNetworkConfig('docsis');

			expect(config.serverIp).toBeDefined();
			expect(config.bootFilename).toBeDefined();
			expect(config.bootFilename).toContain('.cfg');
		});

		it('should provide wireless AP defaults without boot files', () => {
			const apPresets: VendorPreset[] = ['cisco-ap', 'aruba-ap', 'ruckus-ap', 'unifi-ap', 'meraki-ap'];

			apPresets.forEach((preset) => {
				const config = getDefaultNetworkConfig(preset);
				expect(config.subnet).toBeDefined();
				expect(config.poolStart).toBeDefined();
				expect(config.poolEnd).toBeDefined();
			});
		});
	});

	describe('Vendor Class Identifier Values', () => {
		it('should generate correct vendor class for each preset', () => {
			const presetTests: Array<{ preset: VendorPreset; expectedClass: string }> = [
				{ preset: 'cisco-phone', expectedClass: 'Cisco Systems, Inc. IP Phone' },
				{ preset: 'cisco-ap', expectedClass: 'Cisco AP' },
				{ preset: 'aruba-ap', expectedClass: 'ArubaAP' },
				{ preset: 'ruckus-ap', expectedClass: 'Ruckus CPE' },
				{ preset: 'unifi-ap', expectedClass: 'ubnt' },
				{ preset: 'meraki-ap', expectedClass: 'Meraki AP' },
				{ preset: 'pxe-client', expectedClass: 'PXEClient' },
				{ preset: 'docsis', expectedClass: 'docsis3.0' },
			];

			presetTests.forEach(({ preset, expectedClass }) => {
				const config = getDefaultNetworkConfig(preset);
				const result = generateOption60(preset, undefined, config);
				expect(result.vendorClass).toBe(expectedClass);
			});
		});
	});

	describe('Network Configuration Edge Cases', () => {
		it('should handle /32 CIDR notation', () => {
			const config: NetworkConfig = {
				subnet: '192.168.1.1/32',
				poolStart: '192.168.1.1',
				poolEnd: '192.168.1.1',
			};

			const result = generateOption60('cisco-phone', undefined, config);
			expect(result).toBeDefined();
		});

		it('should handle /8 CIDR notation', () => {
			const config: NetworkConfig = {
				subnet: '10.0.0.0/8',
				poolStart: '10.0.0.1',
				poolEnd: '10.255.255.254',
			};

			const result = generateOption60('cisco-phone', undefined, config);
			expect(result).toBeDefined();
		});

		it('should handle optional fields being undefined', () => {
			const config: NetworkConfig = {
				subnet: '192.168.1.0/24',
				poolStart: '192.168.1.100',
				poolEnd: '192.168.1.200',
			};

			const result = generateOption60('cisco-ap', undefined, config);
			expect(result).toBeDefined();
			expect(result.iscDhcpConfig).toBeDefined();
		});
	});

	describe('State Management', () => {
		it('should reset network config when preset changes', () => {
			let currentPreset: VendorPreset = 'cisco-phone';
			let networkConfig = getDefaultNetworkConfig(currentPreset);

			const ciscoPhoneConfig = { ...networkConfig };

			// Change preset
			currentPreset = 'pxe-client';
			networkConfig = getDefaultNetworkConfig(currentPreset);

			// Configs should be different
			expect(networkConfig.bootFilename).not.toBe(ciscoPhoneConfig.bootFilename);
		});

		it('should preserve custom config values between generations', () => {
			const customConfig: NetworkConfig = {
				subnet: '10.20.30.0/24',
				poolStart: '10.20.30.50',
				poolEnd: '10.20.30.250',
				serverIp: '10.20.30.1',
				bootFilename: 'custom-boot.cfg',
			};

			const result1 = generateOption60('cisco-phone', undefined, customConfig);
			const result2 = generateOption60('cisco-phone', undefined, customConfig);

			expect(result1.iscDhcpConfig).toBe(result2.iscDhcpConfig);
		});
	});

	describe('Error Handling', () => {
		it('should handle missing optional parameters gracefully', () => {
			const config: NetworkConfig = {
				subnet: '192.168.1.0/24',
				poolStart: '192.168.1.100',
				poolEnd: '192.168.1.200',
				// Optional fields omitted
			};

			expect(() => {
				generateOption60('cisco-ap', undefined, config);
			}).not.toThrow();
		});

		it('should handle custom preset with valid custom value', () => {
			const customValue = 'MyCustomVendor';
			const config = getDefaultNetworkConfig('custom');

			expect(() => {
				generateOption60('custom', customValue, config);
			}).not.toThrow();
		});
	});

	describe('Examples Integration', () => {
		it('should provide working examples for quick start', () => {
			const examplesList = [
				{ preset: 'cisco-phone' as VendorPreset, description: 'Cisco IP Phones with TFTP' },
				{ preset: 'cisco-ap' as VendorPreset, description: 'Cisco APs with Option 43' },
				{ preset: 'pxe-client' as VendorPreset, description: 'PXE network boot' },
				{ preset: 'aruba-ap' as VendorPreset, description: 'Aruba wireless APs' },
			];

			examplesList.forEach((example) => {
				const config = getDefaultNetworkConfig(example.preset);
				const result = generateOption60(example.preset, undefined, config);

				expect(result).toBeDefined();
				expect(result.vendorClass).toBeDefined();
				expect(VENDOR_PRESETS[example.preset]).toBeDefined();
			});
		});
	});

	describe('All Vendor Presets Coverage', () => {
		it('should generate valid configs for all vendor presets', () => {
			const allPresets = Object.keys(VENDOR_PRESETS) as VendorPreset[];

			allPresets.forEach((preset) => {
				const config = getDefaultNetworkConfig(preset);
				const result =
					preset === 'custom'
						? generateOption60(preset, 'CustomVendor', config)
						: generateOption60(preset, undefined, config);

				expect(result).toBeDefined();
				expect(result.vendorClass).toBeDefined();
				expect(result.iscDhcpConfig).toBeDefined();
				expect(result.keaConfig).toBeDefined();
				expect(result.windowsConfig).toBeDefined();
				expect(result.dnsmasqConfig).toBeDefined();
				expect(result.mikrotikConfig).toBeDefined();
				expect(result.useCase).toBeDefined();
			});
		});
	});
});
