import { describe, it, expect } from 'vitest';
import {
	type PXEProfile,
	generatePXEProfile,
	validatePXEProfile,
	validateNetworkSettings,
	PXE_PRESETS,
	getDefaultPXEProfile,
	ARCH_CODES,
} from '$lib/utils/dhcp-pxe-profile';

describe('PXE Profile Generator', () => {
	describe('validatePXEProfile', () => {
		it('should validate a correct profile', () => {
			const profile: PXEProfile = {
				name: 'Test Profile',
				tftpServer: '192.168.1.10',
				architecture: 'auto',
				biosBootfile: 'pxelinux.0',
				uefiX64Bootfile: 'bootx64.efi',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toEqual([]);
		});

		it('should require profile name', () => {
			const profile: PXEProfile = {
				name: '',
				tftpServer: '192.168.1.10',
				architecture: 'bios',
				biosBootfile: 'pxelinux.0',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toContain('Profile name is required');
		});

		it('should require TFTP server', () => {
			const profile: PXEProfile = {
				name: 'Test',
				tftpServer: '',
				architecture: 'bios',
				biosBootfile: 'pxelinux.0',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toContain('TFTP server is required');
		});

		it('should require at least one bootfile', () => {
			const profile: PXEProfile = {
				name: 'Test',
				tftpServer: '192.168.1.10',
				architecture: 'auto',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toContain('At least one bootfile must be configured');
		});

		it('should validate BIOS architecture requires BIOS bootfile', () => {
			const profile: PXEProfile = {
				name: 'Test',
				tftpServer: '192.168.1.10',
				architecture: 'bios',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toContain('BIOS bootfile is required for BIOS architecture');
		});

		it('should validate UEFI x64 architecture requires UEFI x64 bootfile', () => {
			const profile: PXEProfile = {
				name: 'Test',
				tftpServer: '192.168.1.10',
				architecture: 'uefi-x64',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toContain('UEFI x64 bootfile is required for UEFI x64 architecture');
		});

		it('should validate UEFI x86 architecture requires UEFI x86 bootfile', () => {
			const profile: PXEProfile = {
				name: 'Test',
				tftpServer: '192.168.1.10',
				architecture: 'uefi-x86',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toContain('UEFI x86 bootfile is required for UEFI x86 architecture');
		});

		it('should validate UEFI ARM64 architecture requires UEFI ARM64 bootfile', () => {
			const profile: PXEProfile = {
				name: 'Test',
				tftpServer: '192.168.1.10',
				architecture: 'uefi-arm64',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toContain('UEFI ARM64 bootfile is required for UEFI ARM64 architecture');
		});

		it('should validate UEFI ARM32 architecture requires UEFI ARM32 bootfile', () => {
			const profile: PXEProfile = {
				name: 'Test',
				tftpServer: '192.168.1.10',
				architecture: 'uefi-arm32',
			};

			const errors = validatePXEProfile(profile);
			expect(errors).toContain('UEFI ARM32 bootfile is required for UEFI ARM32 architecture');
		});
	});

	describe('validateNetworkSettings', () => {
		it('should accept undefined network settings', () => {
			const errors = validateNetworkSettings(undefined);
			expect(errors).toEqual([]);
		});

		it('should accept valid network settings', () => {
			const network = {
				subnet: '192.168.1.0',
				netmask: '255.255.255.0',
				rangeStart: '192.168.1.100',
				rangeEnd: '192.168.1.200',
				gateway: '192.168.1.1',
				dns: '8.8.8.8',
			};

			const errors = validateNetworkSettings(network);
			expect(errors).toEqual([]);
		});

		it('should validate subnet format', () => {
			const network = {
				subnet: 'invalid',
			};

			const errors = validateNetworkSettings(network);
			expect(errors).toContain('Invalid subnet format');
		});

		it('should validate netmask format', () => {
			const network = {
				netmask: 'invalid',
			};

			const errors = validateNetworkSettings(network);
			expect(errors).toContain('Invalid netmask format');
		});

		it('should validate range start format', () => {
			const network = {
				rangeStart: 'invalid',
			};

			const errors = validateNetworkSettings(network);
			expect(errors).toContain('Invalid range start format');
		});

		it('should validate range end format', () => {
			const network = {
				rangeEnd: 'invalid',
			};

			const errors = validateNetworkSettings(network);
			expect(errors).toContain('Invalid range end format');
		});

		it('should validate gateway format', () => {
			const network = {
				gateway: 'invalid',
			};

			const errors = validateNetworkSettings(network);
			expect(errors).toContain('Invalid gateway format');
		});

		it('should validate DNS server format', () => {
			const network = {
				dns: 'invalid',
			};

			const errors = validateNetworkSettings(network);
			expect(errors).toContain('Invalid DNS server format');
		});
	});

	describe('generatePXEProfile', () => {
		it('should generate ISC dhcpd configuration for BIOS only', () => {
			const profile: PXEProfile = {
				name: 'BIOS Only',
				tftpServer: 'pxe.example.com',
				architecture: 'bios',
				biosBootfile: 'pxelinux.0',
			};

			const result = generatePXEProfile(profile);

			expect(result.profile).toEqual(profile);
			expect(result.examples.iscDhcpd).toBeDefined();
			expect(result.examples.iscDhcpd).toContain('next-server pxe.example.com');
			expect(result.examples.iscDhcpd).toContain('filename "pxelinux.0"');
		});

		it('should generate ISC dhcpd configuration for UEFI only', () => {
			const profile: PXEProfile = {
				name: 'UEFI Only',
				tftpServer: 'pxe.example.com',
				architecture: 'uefi-x64',
				uefiX64Bootfile: 'bootx64.efi',
			};

			const result = generatePXEProfile(profile);

			expect(result.profile).toEqual(profile);
			expect(result.examples.iscDhcpd).toBeDefined();
			expect(result.examples.iscDhcpd).toContain('next-server pxe.example.com');
			expect(result.examples.iscDhcpd).toContain('filename "bootx64.efi"');
		});

		it('should generate ISC dhcpd configuration with auto-detection', () => {
			const profile: PXEProfile = {
				name: 'Auto-detect',
				tftpServer: 'pxe.example.com',
				architecture: 'auto',
				biosBootfile: 'pxelinux.0',
				uefiX64Bootfile: 'bootx64.efi',
			};

			const result = generatePXEProfile(profile);

			expect(result.profile).toEqual(profile);
			expect(result.examples.iscDhcpd).toBeDefined();
			expect(result.examples.iscDhcpd).toContain('option arch code 93');
			expect(result.examples.iscDhcpd).toContain('if option arch = 00 {');
			expect(result.examples.iscDhcpd).toContain('filename "pxelinux.0"');
			expect(result.examples.iscDhcpd).toContain('} elsif option arch = 07 {');
			expect(result.examples.iscDhcpd).toContain('filename "bootx64.efi"');
		});

		it('should generate Kea DHCPv4 configuration for BIOS only', () => {
			const profile: PXEProfile = {
				name: 'BIOS Only',
				tftpServer: 'pxe.example.com',
				architecture: 'bios',
				biosBootfile: 'pxelinux.0',
			};

			const result = generatePXEProfile(profile);

			expect(result.examples.keaDhcp4).toBeDefined();
			expect(result.examples.keaDhcp4).toContain('"next-server": "pxe.example.com"');
			expect(result.examples.keaDhcp4).toContain('"boot-file-name": "pxelinux.0"');
		});

		it('should generate Kea DHCPv4 configuration with auto-detection', () => {
			const profile: PXEProfile = {
				name: 'Auto-detect',
				tftpServer: 'pxe.example.com',
				architecture: 'auto',
				biosBootfile: 'pxelinux.0',
				uefiX64Bootfile: 'bootx64.efi',
			};

			const result = generatePXEProfile(profile);

			expect(result.examples.keaDhcp4).toBeDefined();
			expect(result.examples.keaDhcp4).toContain('"client-classes"');
			expect(result.examples.keaDhcp4).toContain('"name": "BIOS"');
			expect(result.examples.keaDhcp4).toContain('"test": "option[93].hex == 0x0000"');
			expect(result.examples.keaDhcp4).toContain('"boot-file-name": "pxelinux.0"');
			expect(result.examples.keaDhcp4).toContain('"name": "UEFI_X64"');
			expect(result.examples.keaDhcp4).toContain('"test": "option[93].hex == 0x0007"');
			expect(result.examples.keaDhcp4).toContain('"boot-file-name": "bootx64.efi"');
		});

		it('should use custom network settings', () => {
			const profile: PXEProfile = {
				name: 'Custom Network',
				tftpServer: 'pxe.example.com',
				architecture: 'bios',
				biosBootfile: 'pxelinux.0',
				network: {
					subnet: '10.0.0.0',
					netmask: '255.255.255.0',
					rangeStart: '10.0.0.50',
					rangeEnd: '10.0.0.100',
					gateway: '10.0.0.1',
					dns: '1.1.1.1',
				},
			};

			const result = generatePXEProfile(profile);

			expect(result.examples.iscDhcpd).toContain('subnet 10.0.0.0 netmask 255.255.255.0');
			expect(result.examples.iscDhcpd).toContain('range 10.0.0.50 10.0.0.100');
			expect(result.examples.iscDhcpd).toContain('option routers 10.0.0.1');
			expect(result.examples.iscDhcpd).toContain('option domain-name-servers 1.1.1.1');

			expect(result.examples.keaDhcp4).toContain('"subnet": "10.0.0.0/24"');
			expect(result.examples.keaDhcp4).toContain('"pool": "10.0.0.50 - 10.0.0.100"');
			expect(result.examples.keaDhcp4).toContain('"data": "10.0.0.1"');
			expect(result.examples.keaDhcp4).toContain('"data": "1.1.1.1"');
		});

		it('should support all architecture types in auto mode', () => {
			const profile: PXEProfile = {
				name: 'Full Multi-Architecture',
				tftpServer: 'pxe.example.com',
				architecture: 'auto',
				biosBootfile: 'pxelinux.0',
				uefiX64Bootfile: 'bootx64.efi',
				uefiX86Bootfile: 'bootia32.efi',
				uefiArm64Bootfile: 'bootaa64.efi',
				uefiArm32Bootfile: 'bootarm.efi',
			};

			const result = generatePXEProfile(profile);

			// ISC dhcpd should have all architectures
			expect(result.examples.iscDhcpd).toContain('filename "pxelinux.0"');
			expect(result.examples.iscDhcpd).toContain('filename "bootx64.efi"');
			expect(result.examples.iscDhcpd).toContain('filename "bootia32.efi"');
			expect(result.examples.iscDhcpd).toContain('filename "bootaa64.efi"');
			expect(result.examples.iscDhcpd).toContain('filename "bootarm.efi"');

			// Kea should have all client classes
			expect(result.examples.keaDhcp4).toContain('"name": "BIOS"');
			expect(result.examples.keaDhcp4).toContain('"name": "UEFI_X64"');
			expect(result.examples.keaDhcp4).toContain('"name": "UEFI_X86"');
			expect(result.examples.keaDhcp4).toContain('"name": "UEFI_ARM64"');
			expect(result.examples.keaDhcp4).toContain('"name": "UEFI_ARM32"');
		});

		it('should throw error for invalid profile', () => {
			const profile: PXEProfile = {
				name: '',
				tftpServer: '192.168.1.10',
				architecture: 'bios',
			};

			expect(() => generatePXEProfile(profile)).toThrow();
		});

		it('should throw error for invalid network settings', () => {
			const profile: PXEProfile = {
				name: 'Test',
				tftpServer: '192.168.1.10',
				architecture: 'bios',
				biosBootfile: 'pxelinux.0',
				network: {
					subnet: 'invalid',
				},
			};

			expect(() => generatePXEProfile(profile)).toThrow();
		});
	});

	describe('getDefaultPXEProfile', () => {
		it('should return a valid default profile', () => {
			const profile = getDefaultPXEProfile();

			expect(profile.name).toBe('Standard PXE Profile');
			expect(profile.architecture).toBe('auto');
			expect(profile.tftpServer).toBe('pxe.example.com');
			expect(profile.biosBootfile).toBe('pxelinux.0');
			expect(profile.uefiX64Bootfile).toBe('bootx64.efi');

			const errors = validatePXEProfile(profile);
			expect(errors).toEqual([]);
		});
	});

	describe('PXE_PRESETS', () => {
		it('should have valid presets', () => {
			expect(PXE_PRESETS.length).toBeGreaterThan(0);

			for (const preset of PXE_PRESETS) {
				expect(preset.name).toBeTruthy();
				expect(preset.tftpServer).toBeTruthy();
				expect(preset.architecture).toBeTruthy();

				const errors = validatePXEProfile(preset);
				expect(errors).toEqual([]);
			}
		});

		it('should include Standard PXE (BIOS only)', () => {
			const preset = PXE_PRESETS.find((p) => p.name === 'Standard PXE (BIOS only)');
			expect(preset).toBeDefined();
			expect(preset?.architecture).toBe('bios');
			expect(preset?.biosBootfile).toBe('pxelinux.0');
		});

		it('should include UEFI x64 only', () => {
			const preset = PXE_PRESETS.find((p) => p.name === 'UEFI x64 only');
			expect(preset).toBeDefined();
			expect(preset?.architecture).toBe('uefi-x64');
			expect(preset?.uefiX64Bootfile).toBe('bootx64.efi');
		});

		it('should include Auto-detect preset', () => {
			const preset = PXE_PRESETS.find((p) => p.name === 'Auto-detect (BIOS + UEFI x64)');
			expect(preset).toBeDefined();
			expect(preset?.architecture).toBe('auto');
			expect(preset?.biosBootfile).toBe('pxelinux.0');
			expect(preset?.uefiX64Bootfile).toBe('bootx64.efi');
		});

		it('should include Full Multi-Architecture preset', () => {
			const preset = PXE_PRESETS.find((p) => p.name === 'Full Multi-Architecture');
			expect(preset).toBeDefined();
			expect(preset?.architecture).toBe('auto');
			expect(preset?.biosBootfile).toBe('pxelinux.0');
			expect(preset?.uefiX64Bootfile).toBe('bootx64.efi');
			expect(preset?.uefiX86Bootfile).toBe('bootia32.efi');
			expect(preset?.uefiArm64Bootfile).toBe('bootaa64.efi');
			expect(preset?.uefiArm32Bootfile).toBe('bootarm.efi');
		});

		it('should include iPXE Chain Loading preset', () => {
			const preset = PXE_PRESETS.find((p) => p.name === 'iPXE Chain Loading');
			expect(preset).toBeDefined();
			expect(preset?.biosBootfile).toBe('undionly.kpxe');
			expect(preset?.uefiX64Bootfile).toBe('ipxe-x64.efi');
		});

		it('should include Windows Deployment preset', () => {
			const preset = PXE_PRESETS.find((p) => p.name === 'Windows Deployment (WDS)');
			expect(preset).toBeDefined();
			expect(preset?.biosBootfile).toContain('wdsnbp.com');
			expect(preset?.uefiX64Bootfile).toContain('wdsmgfw.efi');
		});
	});

	describe('ARCH_CODES', () => {
		it('should have correct architecture codes', () => {
			expect(ARCH_CODES.BIOS).toBe(0x0000);
			expect(ARCH_CODES.UEFI_X64).toBe(0x0007);
			expect(ARCH_CODES.UEFI_X86).toBe(0x0006);
			expect(ARCH_CODES.UEFI_ARM64).toBe(0x000b);
			expect(ARCH_CODES.UEFI_ARM32).toBe(0x000a);
		});
	});
});
