/**
 * DHCP TFTP Server Options
 * - Option 150: Cisco TFTP Server List (multiple IPv4 addresses)
 * - Option 66: TFTP Server Name (single hostname/IP as string)
 * - Option 67: Bootfile Name (filename as string)
 * Utilities for encoding/decoding TFTP server configurations for PXE boot
 */

export interface TFTPConfig {
  option150Servers?: string[]; // Array of IPv4 addresses for Option 150
  option66Server?: string; // Single hostname/IP for Option 66
  option67Bootfile?: string; // Bootfile name for Option 67
  network?: {
    subnet?: string;
    netmask?: string;
    rangeStart?: string;
    rangeEnd?: string;
  };
}

export interface TFTPResult {
  option150?: {
    hexEncoded: string;
    wireFormat: string;
    servers: string[];
    totalLength: number;
  };
  option66?: {
    value: string;
    hexEncoded: string;
    wireFormat: string;
    totalLength: number;
  };
  option67?: {
    value: string;
    hexEncoded: string;
    wireFormat: string;
    totalLength: number;
  };
  examples: {
    iscDhcpd?: string;
    keaDhcp4?: string;
    ciscoIos?: string;
  };
}

export interface ParsedOption150 {
  servers: string[];
  totalLength: number;
  rawHex: string;
}

export interface ParsedStringOption {
  value: string;
  totalLength: number;
  rawHex: string;
}

/**
 * Validate IPv4 address format
 */
function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return false;
    if (part !== num.toString()) return false; // No leading zeros
  }

  return true;
}

/**
 * Convert IPv4 address to byte array
 */
function ipToBytes(ip: string): number[] {
  return ip.split('.').map((octet) => parseInt(octet, 10));
}

/**
 * Convert byte array to IPv4 address
 */
function bytesToIp(bytes: number[]): string {
  return bytes.join('.');
}

/**
 * Convert string to byte array (ASCII encoding)
 */
function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

/**
 * Convert byte array to string (ASCII decoding)
 */
function bytesToString(bytes: number[]): string {
  return String.fromCharCode(...bytes);
}

/**
 * Build Option 150 (TFTP Server List) from IPv4 addresses
 */
function buildOption150(servers: string[]): TFTPResult['option150'] {
  if (servers.length === 0) {
    throw new Error('At least one TFTP server is required for Option 150');
  }

  // Validate all servers
  for (const server of servers) {
    if (!server.trim()) {
      throw new Error('Server address cannot be empty');
    }
    if (!isValidIPv4(server)) {
      throw new Error(`Invalid IPv4 address: ${server}`);
    }
  }

  // Encode all servers (each is 4 bytes)
  const bytes: number[] = [];
  for (const server of servers) {
    bytes.push(...ipToBytes(server));
  }

  const hexEncoded = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  const wireFormat = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

  return {
    hexEncoded,
    wireFormat,
    servers,
    totalLength: bytes.length,
  };
}

/**
 * Parse Option 150 hex string
 */
export function parseOption150(hexString: string): ParsedOption150 {
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');

  if (cleanHex.length === 0) {
    throw new Error('Empty hex string');
  }

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd number of characters');
  }

  // Option 150 should contain multiples of 4 bytes (IPv4 addresses)
  if (cleanHex.length % 8 !== 0) {
    throw new Error('Invalid Option 150 data: length must be multiple of 4 bytes (8 hex chars)');
  }

  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }

  const servers: string[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    const ipBytes = bytes.slice(i, i + 4);
    servers.push(bytesToIp(ipBytes));
  }

  return {
    servers,
    totalLength: bytes.length,
    rawHex: cleanHex,
  };
}

/**
 * Build Option 66 (TFTP Server Name) from hostname/IP string
 */
function buildOption66(server: string): TFTPResult['option66'] {
  if (!server.trim()) {
    throw new Error('TFTP server name cannot be empty');
  }

  const bytes = stringToBytes(server);
  const hexEncoded = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  const wireFormat = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

  return {
    value: server,
    hexEncoded,
    wireFormat,
    totalLength: bytes.length,
  };
}

/**
 * Parse Option 66 hex string
 */
export function parseOption66(hexString: string): ParsedStringOption {
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');

  if (cleanHex.length === 0) {
    throw new Error('Empty hex string');
  }

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd number of characters');
  }

  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }

  const value = bytesToString(bytes);

  return {
    value,
    totalLength: bytes.length,
    rawHex: cleanHex,
  };
}

/**
 * Build Option 67 (Bootfile Name) from filename string
 */
function buildOption67(filename: string): TFTPResult['option67'] {
  if (!filename.trim()) {
    throw new Error('Bootfile name cannot be empty');
  }

  const bytes = stringToBytes(filename);
  const hexEncoded = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  const wireFormat = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

  return {
    value: filename,
    hexEncoded,
    wireFormat,
    totalLength: bytes.length,
  };
}

/**
 * Parse Option 67 hex string
 */
export function parseOption67(hexString: string): ParsedStringOption {
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');

  if (cleanHex.length === 0) {
    throw new Error('Empty hex string');
  }

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd number of characters');
  }

  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }

  const value = bytesToString(bytes);

  return {
    value,
    totalLength: bytes.length,
    rawHex: cleanHex,
  };
}

/**
 * Build TFTP options from config
 */
export function buildTFTPOptions(config: TFTPConfig): TFTPResult {
  const result: TFTPResult = {
    examples: {},
  };

  // Build Option 150 if servers provided
  if (config.option150Servers && config.option150Servers.length > 0) {
    result.option150 = buildOption150(config.option150Servers);
  }

  // Build Option 66 if server provided
  if (config.option66Server && config.option66Server.trim()) {
    result.option66 = buildOption66(config.option66Server);
  }

  // Build Option 67 if bootfile provided
  if (config.option67Bootfile && config.option67Bootfile.trim()) {
    result.option67 = buildOption67(config.option67Bootfile);
  }

  // Require at least one option
  if (!result.option150 && !result.option66 && !result.option67) {
    throw new Error('At least one TFTP option must be configured');
  }

  // Generate examples
  result.examples = generateExamples(config, result);

  return result;
}

/**
 * Generate configuration examples for different systems
 */
function generateExamples(config: TFTPConfig, result: TFTPResult): TFTPResult['examples'] {
  const examples: TFTPResult['examples'] = {};

  // Use network settings or defaults
  const subnet = config.network?.subnet?.trim() || '192.168.1.0';
  const netmask = config.network?.netmask?.trim() || '255.255.255.0';
  const rangeStart = config.network?.rangeStart?.trim() || '192.168.1.100';
  const rangeEnd = config.network?.rangeEnd?.trim() || '192.168.1.200';

  // Calculate CIDR notation from netmask
  const cidrBits =
    netmask
      .split('.')
      .map((octet) => parseInt(octet, 10).toString(2).padStart(8, '0'))
      .join('')
      .split('1').length - 1;
  const cidr = `${subnet}/${cidrBits}`;

  // ISC dhcpd example
  const iscLines: string[] = [];
  iscLines.push('# TFTP Server Options for PXE Boot');
  iscLines.push('# Configure TFTP servers and boot files for network boot');
  iscLines.push('');
  iscLines.push(`subnet ${subnet} netmask ${netmask} {`);
  iscLines.push(`  range ${rangeStart} ${rangeEnd};`);
  iscLines.push('  ');

  if (result.option150) {
    iscLines.push('  # Option 150: Cisco TFTP Server List (multiple servers)');
    const serverList = result.option150.servers.map((s) => ipToBytes(s).join(', ')).join(', ');
    iscLines.push(`  option tftp-server-address ${serverList};`);
    iscLines.push('  ');
  }

  if (result.option66) {
    iscLines.push('  # Option 66: TFTP Server Name (standard)');
    iscLines.push(`  next-server ${result.option66.value};`);
    iscLines.push('  ');
  }

  if (result.option67) {
    iscLines.push('  # Option 67: Bootfile Name');
    iscLines.push(`  filename "${result.option67.value}";`);
    iscLines.push('  ');
  }

  iscLines.push('  # PXE-specific options');
  iscLines.push('  # Vendor class identifier for PXE clients');
  iscLines.push('  # option vendor-class-identifier "PXEClient";');
  iscLines.push('}');

  examples.iscDhcpd = iscLines.join('\n');

  // Kea DHCPv4 example
  const keaLines: string[] = [];
  keaLines.push('// TFTP Server Options for PXE Boot');
  keaLines.push('// Kea DHCPv4 configuration for network boot');
  keaLines.push('{');
  keaLines.push('  "Dhcp4": {');
  keaLines.push('    "subnet4": [');
  keaLines.push('      {');
  keaLines.push(`        "subnet": "${cidr}",`);
  keaLines.push('        "pools": [');
  keaLines.push('          {');
  keaLines.push(`            "pool": "${rangeStart} - ${rangeEnd}"`);
  keaLines.push('          }');
  keaLines.push('        ],');

  if (result.option66) {
    keaLines.push(`        "next-server": "${result.option66.value}",`);
  }

  if (result.option67) {
    keaLines.push(`        "boot-file-name": "${result.option67.value}",`);
  }

  keaLines.push('        "option-data": [');

  const optionDataItems: string[] = [];

  if (result.option150) {
    const option150Block = [
      '          {',
      '            "name": "tftp-servers",',
      '            "code": 150,',
      `            "data": "${result.option150.hexEncoded}"`,
      '          }',
    ];
    optionDataItems.push(option150Block.join('\n'));
  }

  if (result.option66) {
    const option66Block = [
      '          {',
      '            "name": "tftp-server-name",',
      '            "code": 66,',
      `            "data": "${result.option66.value}"`,
      '          }',
    ];
    optionDataItems.push(option66Block.join('\n'));
  }

  if (result.option67) {
    const option67Block = [
      '          {',
      '            "name": "boot-file-name",',
      '            "code": 67,',
      `            "data": "${result.option67.value}"`,
      '          }',
    ];
    optionDataItems.push(option67Block.join('\n'));
  }

  if (optionDataItems.length > 0) {
    keaLines.push(optionDataItems.join(',\n'));
  }

  keaLines.push('        ]');
  keaLines.push('      }');
  keaLines.push('    ]');
  keaLines.push('  }');
  keaLines.push('}');

  examples.keaDhcp4 = keaLines.join('\n');

  // Cisco IOS example
  if (result.option150) {
    const ciscoLines: string[] = [];
    ciscoLines.push('! Cisco IOS DHCP Configuration');
    ciscoLines.push('! Option 150 TFTP Server configuration');
    ciscoLines.push('!');
    ciscoLines.push(`ip dhcp pool PXE_POOL`);
    ciscoLines.push(`  network ${subnet} ${netmask}`);
    ciscoLines.push(`  default-router ${rangeStart.split('.').slice(0, 3).join('.')}.1`);
    ciscoLines.push('  ');

    for (const server of result.option150.servers) {
      ciscoLines.push(`  option 150 ip ${server}`);
    }

    if (result.option67) {
      ciscoLines.push(`  bootfile ${result.option67.value}`);
    }

    ciscoLines.push('!');
    ciscoLines.push('! Note: Cisco IOS uses "option 150 ip" for TFTP servers');
    ciscoLines.push('! Multiple servers provide redundancy for IP phones/PXE');

    examples.ciscoIos = ciscoLines.join('\n');
  }

  return examples;
}

/**
 * Get default TFTP config
 */
export function getDefaultTFTPConfig(): TFTPConfig {
  return {
    option150Servers: ['192.168.1.10', '192.168.1.11'],
    option66Server: 'tftp.example.com',
    option67Bootfile: 'pxelinux.0',
  };
}

/**
 * Common TFTP examples
 */
export const TFTP_EXAMPLES = [
  {
    label: 'Cisco IP Phones',
    option150Servers: ['192.168.1.10', '192.168.1.11'],
    description: 'Redundant TFTP servers for Cisco IP phone configuration',
  },
  {
    label: 'PXE Boot (Standard)',
    option66Server: 'pxe.example.com',
    option67Bootfile: 'pxelinux.0',
    description: 'Standard PXE boot with single TFTP server',
  },
  {
    label: 'PXE Boot (UEFI)',
    option66Server: '192.168.1.10',
    option67Bootfile: 'bootx64.efi',
    description: 'UEFI PXE boot configuration',
  },
  {
    label: 'Combined (Option 150 + 67)',
    option150Servers: ['192.168.1.10', '192.168.1.11'],
    option67Bootfile: 'SEP{MAC}.cnf.xml',
    description: 'Cisco phones with redundant TFTP and config template',
  },
];
