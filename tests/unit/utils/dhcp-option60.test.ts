import { describe, it, expect } from 'vitest';
import {
	generateOption60,
	isValidVendorClass,
	VENDOR_PRESETS,
	type VendorPreset,
} from '$lib/utils/dhcp-option60.js';

describe('DHCP Option 60 Builder', () => {
	describe('isValidVendorClass', () => {
		it('should accept valid ASCII strings', () => {
			expect(isValidVendorClass('Cisco Systems, Inc. IP Phone')).toBe(true);
			expect(isValidVendorClass('ArubaAP')).toBe(true);
			expect(isValidVendorClass('PXEClient')).toBe(true);
			expect(isValidVendorClass('docsis3.0')).toBe(true);
			expect(isValidVendorClass('MyCustomClass123')).toBe(true);
		});

		it('should accept strings with special characters', () => {
			expect(isValidVendorClass('Vendor-Class_v1.0')).toBe(true);
			expect(isValidVendorClass('Test (with) [brackets]')).toBe(true);
			expect(isValidVendorClass('Class!@#$%')).toBe(true);
		});

		it('should reject empty strings', () => {
			expect(isValidVendorClass('')).toBe(false);
			expect(isValidVendorClass('   ')).toBe(false);
		});

		it('should reject strings over 255 characters', () => {
			const longString = 'a'.repeat(256);
			expect(isValidVendorClass(longString)).toBe(false);
		});

		it('should reject non-printable characters', () => {
			expect(isValidVendorClass('Test\x00String')).toBe(false);
			expect(isValidVendorClass('Test\nString')).toBe(false);
			expect(isValidVendorClass('Test\tString')).toBe(false);
		});

		it('should accept exactly 255 characters', () => {
			const maxString = 'a'.repeat(255);
			expect(isValidVendorClass(maxString)).toBe(true);
		});

		it('should accept single character', () => {
			expect(isValidVendorClass('a')).toBe(true);
		});
	});

	describe('VENDOR_PRESETS', () => {
		it('should have all required presets', () => {
			expect(VENDOR_PRESETS['cisco-phone']).toBeDefined();
			expect(VENDOR_PRESETS['cisco-ap']).toBeDefined();
			expect(VENDOR_PRESETS['aruba-ap']).toBeDefined();
			expect(VENDOR_PRESETS['ruckus-ap']).toBeDefined();
			expect(VENDOR_PRESETS['unifi-ap']).toBeDefined();
			expect(VENDOR_PRESETS['meraki-ap']).toBeDefined();
			expect(VENDOR_PRESETS['pxe-client']).toBeDefined();
			expect(VENDOR_PRESETS['docsis']).toBeDefined();
			expect(VENDOR_PRESETS['custom']).toBeDefined();
		});

		it('should have correct structure for each preset', () => {
			Object.entries(VENDOR_PRESETS).forEach(([key, value]) => {
				expect(value).toHaveProperty('name');
				expect(value).toHaveProperty('description');
				expect(value).toHaveProperty('defaultValue');
				expect(value).toHaveProperty('useCase');

				expect(typeof value.name).toBe('string');
				expect(typeof value.description).toBe('string');
				expect(typeof value.defaultValue).toBe('string');
				expect(typeof value.useCase).toBe('string');
			});
		});

		it('should have non-empty default values except for custom', () => {
			Object.entries(VENDOR_PRESETS).forEach(([key, value]) => {
				if (key !== 'custom') {
					expect(value.defaultValue.length).toBeGreaterThan(0);
				}
			});
		});
	});

	describe('generateOption60', () => {
		describe('Cisco IP Phones', () => {
			it('should generate correct configuration', () => {
				const result = generateOption60('cisco-phone');

				expect(result.vendorClass).toBe('Cisco Systems, Inc. IP Phone');
				expect(result.description).toContain('Cisco Unified IP Phones');
				expect(result.useCase).toContain('TFTP');

				// ISC DHCP should have class definition and TFTP options
				expect(result.iscDhcpConfig).toContain('class "Cisco_Systems__Inc__IP_Phone"');
				expect(result.iscDhcpConfig).toContain('match if option vendor-class-identifier');
				expect(result.iscDhcpConfig).toContain('tftp-server-name');
				expect(result.iscDhcpConfig).toContain('bootfile-name');

				// Kea should have client class test
				expect(result.keaConfig).toContain('"test":');
				expect(result.keaConfig).toContain('option[60].text');
				expect(result.keaConfig).toContain('tftp-server-name');

				// Windows should have PowerShell commands
				expect(result.windowsConfig).toContain('Add-DhcpServerv4Class');
				expect(result.windowsConfig).toContain('Add-DhcpServerv4Policy');
				expect(result.windowsConfig).toContain('Set-DhcpServerv4OptionValue');

				// dnsmasq should have vendor class tagging
				expect(result.dnsmasqConfig).toContain('dhcp-vendorclass=');
				expect(result.dnsmasqConfig).toContain('dhcp-option=');

				// MikroTik should have matcher configuration
				expect(result.mikrotikConfig).toContain('/ip dhcp-server option');
				expect(result.mikrotikConfig).toContain('/ip dhcp-server matcher');
			});
		});

		describe('Cisco Access Points', () => {
			it('should generate correct configuration', () => {
				const result = generateOption60('cisco-ap');

				expect(result.vendorClass).toBe('Cisco AP');
				expect(result.description).toContain('Aironet');

				// Should reference Option 43
				expect(result.iscDhcpConfig).toContain('option vendor-encapsulated-options');
				expect(result.keaConfig).toContain('vendor-encapsulated-options');
				expect(result.windowsConfig).toContain('OptionId 43');
			});
		});

		describe('Aruba Access Points', () => {
			it('should generate correct configuration', () => {
				const result = generateOption60('aruba-ap');

				expect(result.vendorClass).toBe('ArubaAP');
				expect(result.description).toContain('Aruba wireless');

				expect(result.iscDhcpConfig).toContain('ArubaAP');
				expect(result.keaConfig).toContain('ArubaAP');
			});
		});

		describe('Ruckus Access Points', () => {
			it('should generate correct configuration', () => {
				const result = generateOption60('ruckus-ap');

				expect(result.vendorClass).toBe('Ruckus CPE');
				expect(result.description).toContain('Ruckus wireless');

				expect(result.iscDhcpConfig).toContain('Ruckus CPE');
			});
		});

		describe('UniFi Access Points', () => {
			it('should generate correct configuration', () => {
				const result = generateOption60('unifi-ap');

				expect(result.vendorClass).toBe('ubnt');
				expect(result.description).toContain('Ubiquiti UniFi');

				expect(result.iscDhcpConfig).toContain('ubnt');
			});
		});

		describe('Meraki Access Points', () => {
			it('should generate correct configuration', () => {
				const result = generateOption60('meraki-ap');

				expect(result.vendorClass).toBe('Meraki AP');
				expect(result.description).toContain('Meraki');
			});
		});

		describe('PXE Client', () => {
			it('should generate correct configuration', () => {
				const result = generateOption60('pxe-client');

				expect(result.vendorClass).toBe('PXEClient');
				expect(result.description).toContain('Pre-boot');

				// Should have PXE-specific options
				expect(result.iscDhcpConfig).toContain('next-server');
				expect(result.iscDhcpConfig).toContain('filename');
				expect(result.keaConfig).toContain('next-server');
				expect(result.keaConfig).toContain('boot-file-name');
				expect(result.dnsmasqConfig).toContain('dhcp-boot=');
			});
		});

		describe('DOCSIS', () => {
			it('should generate correct configuration', () => {
				const result = generateOption60('docsis');

				expect(result.vendorClass).toBe('docsis3.0');
				expect(result.description).toContain('Cable modem');

				// Should have DOCSIS provisioning options
				expect(result.iscDhcpConfig).toContain('tftp-server-name');
				expect(result.iscDhcpConfig).toContain('bootfile-name');
			});
		});

		describe('Custom Vendor Class', () => {
			it('should use custom value when provided', () => {
				const customValue = 'MyCustomVendorClass';
				const result = generateOption60('custom', customValue);

				expect(result.vendorClass).toBe(customValue);
			});

			it('should generate generic configuration for custom class', () => {
				const result = generateOption60('custom', 'TestClass');

				expect(result.iscDhcpConfig).toContain('TestClass');
				expect(result.keaConfig).toContain('TestClass');
				expect(result.windowsConfig).toContain('TestClass');
				expect(result.dnsmasqConfig).toContain('TestClass');
				expect(result.mikrotikConfig).toContain('TestClass');
			});

			it('should throw error if custom value is empty', () => {
				expect(() => generateOption60('custom', '')).toThrow();
				expect(() => generateOption60('custom')).toThrow();
			});
		});
	});

	describe('Configuration format validation', () => {
		const presets: VendorPreset[] = [
			'cisco-phone',
			'cisco-ap',
			'aruba-ap',
			'ruckus-ap',
			'unifi-ap',
			'meraki-ap',
			'pxe-client',
			'docsis',
		];

		presets.forEach((preset) => {
			describe(`${preset} configuration`, () => {
				const result = generateOption60(preset);

				it('should have all required fields', () => {
					expect(result.vendorClass).toBeTruthy();
					expect(result.description).toBeTruthy();
					expect(result.iscDhcpConfig).toBeTruthy();
					expect(result.keaConfig).toBeTruthy();
					expect(result.windowsConfig).toBeTruthy();
					expect(result.dnsmasqConfig).toBeTruthy();
					expect(result.mikrotikConfig).toBeTruthy();
					expect(result.useCase).toBeTruthy();
				});

				it('should have valid ISC DHCP syntax', () => {
					// Should have class definition
					expect(result.iscDhcpConfig).toMatch(/class\s+"[^"]+"/);
					// Should have match condition
					expect(result.iscDhcpConfig).toContain('match if option vendor-class-identifier');
					// Should have subnet configuration
					expect(result.iscDhcpConfig).toContain('subnet');
					expect(result.iscDhcpConfig).toContain('netmask');
					// Should have pool
					expect(result.iscDhcpConfig).toContain('pool');
					expect(result.iscDhcpConfig).toContain('range');
				});

				it('should have valid Kea JSON syntax', () => {
					// Should be valid JSON
					expect(() => JSON.parse(result.keaConfig)).not.toThrow();

					const kea = JSON.parse(result.keaConfig);
					expect(kea.Dhcp4).toBeDefined();
					expect(kea.Dhcp4['client-classes']).toBeInstanceOf(Array);
					expect(kea.Dhcp4['client-classes'][0].test).toBeTruthy();
					expect(kea.Dhcp4.subnet4).toBeInstanceOf(Array);
					expect(kea.Dhcp4.subnet4[0].pools).toBeInstanceOf(Array);
				});

				it('should have valid Windows PowerShell commands', () => {
					expect(result.windowsConfig).toContain('Add-DhcpServerv4Class');
					expect(result.windowsConfig).toContain('Add-DhcpServerv4Policy');
					expect(result.windowsConfig).toContain('-Name');
					expect(result.windowsConfig).toContain('-VendorClass');
				});

				it('should have valid dnsmasq syntax', () => {
					expect(result.dnsmasqConfig).toContain('dhcp-vendorclass=');
					// Should have set: tag syntax
					expect(result.dnsmasqConfig).toMatch(/set:[a-zA-Z_]+/);
				});

				it('should have valid MikroTik syntax', () => {
					expect(result.mikrotikConfig).toContain('/ip dhcp-server');
					expect(result.mikrotikConfig).toContain('matcher');
					expect(result.mikrotikConfig).toContain('code=60');
				});
			});
		});
	});

	describe('Special characters in vendor class', () => {
		it('should sanitize class names for ISC DHCP', () => {
			const result = generateOption60('custom', 'Test.Class-v1.0');

			// Class name should have special chars replaced with underscores
			expect(result.iscDhcpConfig).toContain('class "Test_Class_v1_0"');
			// But original value should be preserved in match condition
			expect(result.iscDhcpConfig).toContain('= "Test.Class-v1.0"');
		});

		it('should handle spaces in vendor class', () => {
			const result = generateOption60('custom', 'My Custom Class');

			expect(result.iscDhcpConfig).toContain('class "My_Custom_Class"');
			expect(result.iscDhcpConfig).toContain('= "My Custom Class"');
		});
	});

	describe('Integration tests', () => {
		it('should handle real-world Cisco phone scenario', () => {
			const result = generateOption60('cisco-phone');

			// Should provide complete working configuration
			expect(result.vendorClass).toBe('Cisco Systems, Inc. IP Phone');

			// ISC DHCP should have both pools (phones and non-phones)
			expect(result.iscDhcpConfig).toContain('allow members of');
			expect(result.iscDhcpConfig).toContain('deny members of');

			// Should have TFTP options
			expect(result.iscDhcpConfig).toMatch(/tftp-server-name.*192\.168\.10\.5/);
			expect(result.iscDhcpConfig).toContain('SEPDefault.cnf.xml');
		});

		it('should handle real-world PXE boot scenario', () => {
			const result = generateOption60('pxe-client');

			expect(result.vendorClass).toBe('PXEClient');

			// Should have PXE boot configuration
			expect(result.iscDhcpConfig).toContain('next-server');
			expect(result.iscDhcpConfig).toContain('pxelinux.0');

			// Kea should use boot-file-name
			const kea = JSON.parse(result.keaConfig);
			expect(kea.Dhcp4.subnet4[0].pools[0]['boot-file-name']).toBe('pxelinux.0');
		});

		it('should handle real-world wireless AP scenario', () => {
			const result = generateOption60('cisco-ap');

			// Should reference Option 43 for controller discovery
			expect(result.iscDhcpConfig).toContain('<OPTION_43_HEX>');
			expect(result.keaConfig).toContain('<OPTION_43_HEX>');
			expect(result.windowsConfig).toContain('<OPTION_43_BINARY>');
		});
	});
});
