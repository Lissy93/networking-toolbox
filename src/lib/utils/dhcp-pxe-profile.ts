/**
 * DHCP PXE Profile Generator
 * Generates PXE boot profiles with UEFI/BIOS detection using Options 93/94
 * - Option 93: Client System Architecture Type
 * - Option 94: Client Network Interface Identifier
 * - Option 66: TFTP Server Name
 * - Option 67: Bootfile Name
 * Utilities for generating conditional PXE configurations
 */

export type ArchitectureType = 'bios' | 'uefi-x64' | 'uefi-x86' | 'uefi-arm64' | 'uefi-arm32' | 'auto';

export interface PXEProfile {
  name: string;
  tftpServer?: string; // Option 66
  architecture: ArchitectureType;
  biosBootfile?: string; // Bootfile for BIOS (Option 67)
  uefiX64Bootfile?: string; // Bootfile for UEFI x64
  uefiX86Bootfile?: string; // Bootfile for UEFI x86
  uefiArm64Bootfile?: string; // Bootfile for UEFI ARM64
  uefiArm32Bootfile?: string; // Bootfile for UEFI ARM32
  network?: {
    subnet?: string;
    netmask?: string;
    rangeStart?: string;
    rangeEnd?: string;
    gateway?: string;
    dns?: string;
  };
}

export interface PXEResult {
  profile: PXEProfile;
  examples: {
    iscDhcpd?: string;
    keaDhcp4?: string;
  };
}

/**
 * Architecture type codes from RFC 4578
 */
export const ARCH_CODES = {
  BIOS: 0x0000, // Intel x86PC
  UEFI_X64: 0x0007, // EFI BC (x86-64)
  UEFI_X86: 0x0006, // EFI IA32
  UEFI_ARM64: 0x000b, // EFI ARM 64-bit
  UEFI_ARM32: 0x000a, // EFI ARM 32-bit
} as const;

/**
 * Preset PXE profiles
 */
export const PXE_PRESETS: PXEProfile[] = [
  {
    name: 'Standard PXE (BIOS only)',
    architecture: 'bios',
    tftpServer: 'pxe.example.com',
    biosBootfile: 'pxelinux.0',
  },
  {
    name: 'UEFI x64 only',
    architecture: 'uefi-x64',
    tftpServer: 'pxe.example.com',
    uefiX64Bootfile: 'bootx64.efi',
  },
  {
    name: 'Auto-detect (BIOS + UEFI x64)',
    architecture: 'auto',
    tftpServer: 'pxe.example.com',
    biosBootfile: 'pxelinux.0',
    uefiX64Bootfile: 'bootx64.efi',
  },
  {
    name: 'Full Multi-Architecture',
    architecture: 'auto',
    tftpServer: 'pxe.example.com',
    biosBootfile: 'pxelinux.0',
    uefiX64Bootfile: 'bootx64.efi',
    uefiX86Bootfile: 'bootia32.efi',
    uefiArm64Bootfile: 'bootaa64.efi',
    uefiArm32Bootfile: 'bootarm.efi',
  },
  {
    name: 'iPXE Chain Loading',
    architecture: 'auto',
    tftpServer: '192.168.1.10',
    biosBootfile: 'undionly.kpxe',
    uefiX64Bootfile: 'ipxe-x64.efi',
  },
  {
    name: 'Windows Deployment (WDS)',
    architecture: 'auto',
    tftpServer: 'wds.example.com',
    biosBootfile: 'boot\\x86\\wdsnbp.com',
    uefiX64Bootfile: 'boot\\x64\\wdsmgfw.efi',
  },
];

/**
 * Validate PXE profile
 */
export function validatePXEProfile(profile: PXEProfile): string[] {
  const errors: string[] = [];

  if (!profile.name?.trim()) {
    errors.push('Profile name is required');
  }

  if (!profile.tftpServer?.trim()) {
    errors.push('TFTP server is required');
  }

  // Check that at least one bootfile is configured
  const hasBootfile =
    profile.biosBootfile?.trim() ||
    profile.uefiX64Bootfile?.trim() ||
    profile.uefiX86Bootfile?.trim() ||
    profile.uefiArm64Bootfile?.trim() ||
    profile.uefiArm32Bootfile?.trim();

  if (!hasBootfile) {
    errors.push('At least one bootfile must be configured');
  }

  // Validate architecture-specific requirements
  if (profile.architecture === 'bios' && !profile.biosBootfile?.trim()) {
    errors.push('BIOS bootfile is required for BIOS architecture');
  }

  if (profile.architecture === 'uefi-x64' && !profile.uefiX64Bootfile?.trim()) {
    errors.push('UEFI x64 bootfile is required for UEFI x64 architecture');
  }

  if (profile.architecture === 'uefi-x86' && !profile.uefiX86Bootfile?.trim()) {
    errors.push('UEFI x86 bootfile is required for UEFI x86 architecture');
  }

  if (profile.architecture === 'uefi-arm64' && !profile.uefiArm64Bootfile?.trim()) {
    errors.push('UEFI ARM64 bootfile is required for UEFI ARM64 architecture');
  }

  if (profile.architecture === 'uefi-arm32' && !profile.uefiArm32Bootfile?.trim()) {
    errors.push('UEFI ARM32 bootfile is required for UEFI ARM32 architecture');
  }

  return errors;
}

/**
 * Validate network settings
 */
export function validateNetworkSettings(network?: PXEProfile['network']): string[] {
  if (!network) return [];

  const errors: string[] = [];

  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

  if (network.subnet && !ipv4Regex.test(network.subnet)) {
    errors.push('Invalid subnet format');
  }

  if (network.netmask && !ipv4Regex.test(network.netmask)) {
    errors.push('Invalid netmask format');
  }

  if (network.rangeStart && !ipv4Regex.test(network.rangeStart)) {
    errors.push('Invalid range start format');
  }

  if (network.rangeEnd && !ipv4Regex.test(network.rangeEnd)) {
    errors.push('Invalid range end format');
  }

  if (network.gateway && !ipv4Regex.test(network.gateway)) {
    errors.push('Invalid gateway format');
  }

  if (network.dns && !ipv4Regex.test(network.dns)) {
    errors.push('Invalid DNS server format');
  }

  return errors;
}

/**
 * Generate ISC dhcpd configuration
 */
function generateIscDhcpdConfig(profile: PXEProfile): string {
  const lines: string[] = [];

  // Use network settings or defaults
  const subnet = profile.network?.subnet?.trim() || '192.168.1.0';
  const netmask = profile.network?.netmask?.trim() || '255.255.255.0';
  const rangeStart = profile.network?.rangeStart?.trim() || '192.168.1.100';
  const rangeEnd = profile.network?.rangeEnd?.trim() || '192.168.1.200';
  const gateway = profile.network?.gateway?.trim() || '192.168.1.1';
  const dns = profile.network?.dns?.trim() || '8.8.8.8';

  lines.push(`# PXE Profile: ${profile.name}`);
  lines.push('# ISC dhcpd configuration for PXE boot with architecture detection');
  lines.push('');
  lines.push('# Define option space for PXE');
  lines.push('option space PXE;');
  lines.push('option PXE.mtftp-ip code 1 = ip-address;');
  lines.push('option PXE.mtftp-cport code 2 = unsigned integer 16;');
  lines.push('option PXE.mtftp-sport code 3 = unsigned integer 16;');
  lines.push('option PXE.mtftp-tmout code 4 = unsigned integer 8;');
  lines.push('option PXE.mtftp-delay code 5 = unsigned integer 8;');
  lines.push('option arch code 93 = unsigned integer 16;');
  lines.push('');
  lines.push(`subnet ${subnet} netmask ${netmask} {`);
  lines.push(`  range ${rangeStart} ${rangeEnd};`);
  lines.push(`  option routers ${gateway};`);
  lines.push(`  option domain-name-servers ${dns};`);
  lines.push('  ');

  if (profile.architecture === 'auto') {
    lines.push('  # Auto-detect architecture and set bootfile accordingly');
    lines.push('  class "pxeclients" {');
    lines.push('    match if substring (option vendor-class-identifier, 0, 9) = "PXEClient";');
    lines.push(`    next-server ${profile.tftpServer};`);
    lines.push('    ');

    const bootfiles: { arch: string; code: number; file?: string }[] = [];
    if (profile.biosBootfile) {
      bootfiles.push({ arch: 'BIOS (x86)', code: ARCH_CODES.BIOS, file: profile.biosBootfile });
    }
    if (profile.uefiX64Bootfile) {
      bootfiles.push({
        arch: 'UEFI x64',
        code: ARCH_CODES.UEFI_X64,
        file: profile.uefiX64Bootfile,
      });
    }
    if (profile.uefiX86Bootfile) {
      bootfiles.push({
        arch: 'UEFI x86',
        code: ARCH_CODES.UEFI_X86,
        file: profile.uefiX86Bootfile,
      });
    }
    if (profile.uefiArm64Bootfile) {
      bootfiles.push({
        arch: 'UEFI ARM64',
        code: ARCH_CODES.UEFI_ARM64,
        file: profile.uefiArm64Bootfile,
      });
    }
    if (profile.uefiArm32Bootfile) {
      bootfiles.push({
        arch: 'UEFI ARM32',
        code: ARCH_CODES.UEFI_ARM32,
        file: profile.uefiArm32Bootfile,
      });
    }

    bootfiles.forEach((bf, idx) => {
      if (idx === 0) {
        lines.push(`    if option arch = ${bf.code.toString(16).padStart(2, '0')} {`);
      } else {
        lines.push(`    } elsif option arch = ${bf.code.toString(16).padStart(2, '0')} {`);
      }
      lines.push(`      # ${bf.arch}`);
      lines.push(`      filename "${bf.file}";`);
    });

    if (bootfiles.length > 0) {
      lines.push('    } else {');
      lines.push('      # Default to BIOS if architecture not recognized');
      lines.push(`      filename "${profile.biosBootfile || 'pxelinux.0'}";`);
      lines.push('    }');
    }

    lines.push('  }');
  } else {
    // Single architecture mode
    lines.push('  class "pxeclients" {');
    lines.push('    match if substring (option vendor-class-identifier, 0, 9) = "PXEClient";');
    lines.push(`    next-server ${profile.tftpServer};`);

    let bootfile = '';
    if (profile.architecture === 'bios') bootfile = profile.biosBootfile || '';
    else if (profile.architecture === 'uefi-x64') bootfile = profile.uefiX64Bootfile || '';
    else if (profile.architecture === 'uefi-x86') bootfile = profile.uefiX86Bootfile || '';
    else if (profile.architecture === 'uefi-arm64') bootfile = profile.uefiArm64Bootfile || '';
    else if (profile.architecture === 'uefi-arm32') bootfile = profile.uefiArm32Bootfile || '';

    lines.push(`    filename "${bootfile}";`);
    lines.push('  }');
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate Kea DHCPv4 configuration
 */
function generateKeaDhcp4Config(profile: PXEProfile): string {
  const lines: string[] = [];

  // Use network settings or defaults
  const subnet = profile.network?.subnet?.trim() || '192.168.1.0';
  const netmask = profile.network?.netmask?.trim() || '255.255.255.0';
  const rangeStart = profile.network?.rangeStart?.trim() || '192.168.1.100';
  const rangeEnd = profile.network?.rangeEnd?.trim() || '192.168.1.200';
  const gateway = profile.network?.gateway?.trim() || '192.168.1.1';
  const dns = profile.network?.dns?.trim() || '8.8.8.8';

  // Calculate CIDR notation from netmask
  const cidrBits =
    netmask
      .split('.')
      .map((octet) => parseInt(octet, 10).toString(2).padStart(8, '0'))
      .join('')
      .split('1').length - 1;
  const cidr = `${subnet}/${cidrBits}`;

  lines.push(`// PXE Profile: ${profile.name}`);
  lines.push('// Kea DHCPv4 configuration for PXE boot with architecture detection');
  lines.push('{');
  lines.push('  "Dhcp4": {');
  lines.push('    "client-classes": [');

  if (profile.architecture === 'auto') {
    const classes: { name: string; test: string; bootfile?: string }[] = [];

    if (profile.biosBootfile) {
      classes.push({
        name: 'BIOS',
        test: 'option[93].hex == 0x0000',
        bootfile: profile.biosBootfile,
      });
    }
    if (profile.uefiX64Bootfile) {
      classes.push({
        name: 'UEFI_X64',
        test: 'option[93].hex == 0x0007',
        bootfile: profile.uefiX64Bootfile,
      });
    }
    if (profile.uefiX86Bootfile) {
      classes.push({
        name: 'UEFI_X86',
        test: 'option[93].hex == 0x0006',
        bootfile: profile.uefiX86Bootfile,
      });
    }
    if (profile.uefiArm64Bootfile) {
      classes.push({
        name: 'UEFI_ARM64',
        test: 'option[93].hex == 0x000b',
        bootfile: profile.uefiArm64Bootfile,
      });
    }
    if (profile.uefiArm32Bootfile) {
      classes.push({
        name: 'UEFI_ARM32',
        test: 'option[93].hex == 0x000a',
        bootfile: profile.uefiArm32Bootfile,
      });
    }

    classes.forEach((cls, idx) => {
      lines.push('      {');
      lines.push(`        "name": "${cls.name}",`);
      lines.push(`        "test": "${cls.test}",`);
      lines.push(`        "boot-file-name": "${cls.bootfile}"`);
      lines.push(idx < classes.length - 1 ? '      },' : '      }');
    });
  }

  lines.push('    ],');
  lines.push('    "subnet4": [');
  lines.push('      {');
  lines.push(`        "subnet": "${cidr}",`);
  lines.push('        "pools": [');
  lines.push('          {');
  lines.push(`            "pool": "${rangeStart} - ${rangeEnd}"`);
  lines.push('          }');
  lines.push('        ],');
  lines.push(`        "next-server": "${profile.tftpServer}",`);

  if (profile.architecture !== 'auto') {
    let bootfile = '';
    if (profile.architecture === 'bios') bootfile = profile.biosBootfile || '';
    else if (profile.architecture === 'uefi-x64') bootfile = profile.uefiX64Bootfile || '';
    else if (profile.architecture === 'uefi-x86') bootfile = profile.uefiX86Bootfile || '';
    else if (profile.architecture === 'uefi-arm64') bootfile = profile.uefiArm64Bootfile || '';
    else if (profile.architecture === 'uefi-arm32') bootfile = profile.uefiArm32Bootfile || '';

    lines.push(`        "boot-file-name": "${bootfile}",`);
  }

  lines.push('        "option-data": [');
  lines.push('          {');
  lines.push('            "name": "routers",');
  lines.push(`            "data": "${gateway}"`);
  lines.push('          },');
  lines.push('          {');
  lines.push('            "name": "domain-name-servers",');
  lines.push(`            "data": "${dns}"`);
  lines.push('          }');
  lines.push('        ]');
  lines.push('      }');
  lines.push('    ]');
  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate PXE profile configuration
 */
export function generatePXEProfile(profile: PXEProfile): PXEResult {
  const profileErrors = validatePXEProfile(profile);
  if (profileErrors.length > 0) {
    throw new Error(profileErrors.join('; '));
  }

  const networkErrors = validateNetworkSettings(profile.network);
  if (networkErrors.length > 0) {
    throw new Error(networkErrors.join('; '));
  }

  return {
    profile,
    examples: {
      iscDhcpd: generateIscDhcpdConfig(profile),
      keaDhcp4: generateKeaDhcp4Config(profile),
    },
  };
}

/**
 * Get default PXE profile
 */
export function getDefaultPXEProfile(): PXEProfile {
  return {
    name: 'Standard PXE Profile',
    architecture: 'auto',
    tftpServer: 'pxe.example.com',
    biosBootfile: 'pxelinux.0',
    uefiX64Bootfile: 'bootx64.efi',
  };
}
