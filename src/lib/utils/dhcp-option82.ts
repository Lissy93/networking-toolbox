/**
 * DHCP Option 82 - Relay Agent Information (RFC 3046)
 * Utilities for constructing and parsing Option 82 suboptions
 */

export type SuboptionType = 'circuit-id' | 'remote-id';
export type EncodingFormat = 'hex' | 'ascii' | 'vlan-id' | 'hostname-port';

export interface Suboption {
  type: SuboptionType;
  format: EncodingFormat;
  value: string;
}

export interface Option82Config {
  suboptions: Suboption[];
}

export interface Option82Result {
  hexEncoded: string;
  asciiDecoded: string;
  breakdown: SuboptionBreakdown[];
  examples: {
    iscDhcpd?: string;
    keaDhcp4?: string;
    ciscoRelay?: string;
  };
}

export interface SuboptionBreakdown {
  type: SuboptionType;
  typeCode: number;
  length: number;
  value: string;
  hexValue: string;
  description: string;
}

export interface ParsedOption82 {
  suboptions: SuboptionBreakdown[];
  totalLength: number;
  rawHex: string;
}

const SUBOPTION_CODES: Record<SuboptionType, number> = {
  'circuit-id': 1,
  'remote-id': 2,
};

const SUBOPTION_NAMES: Record<number, SuboptionType> = {
  1: 'circuit-id',
  2: 'remote-id',
};

/**
 * Convert string to hex based on format
 */
function encodeValue(value: string, format: EncodingFormat): string {
  switch (format) {
    case 'hex':
      // Already hex, validate and clean
      return value.replace(/[^0-9a-fA-F]/g, '');

    case 'ascii':
      // Convert ASCII to hex
      return Array.from(value)
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');

    case 'vlan-id': {
      // VLAN ID format: 2 bytes for VLAN (0-4095)
      const vlanId = parseInt(value, 10);
      if (isNaN(vlanId) || vlanId < 0 || vlanId > 4095) {
        return '0000';
      }
      return vlanId.toString(16).padStart(4, '0');
    }

    case 'hostname-port': {
      // Format: hostname:port as ASCII
      return Array.from(value)
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
    }

    default:
      return '';
  }
}

/**
 * Decode hex value to readable string based on format
 */
function decodeValue(hex: string, format: EncodingFormat): string {
  switch (format) {
    case 'hex':
      return hex;

    case 'ascii':
    case 'hostname-port': {
      let result = '';
      for (let i = 0; i < hex.length; i += 2) {
        const byte = hex.substring(i, i + 2);
        result += String.fromCharCode(parseInt(byte, 16));
      }
      return result;
    }

    case 'vlan-id': {
      const vlanId = parseInt(hex, 16);
      return vlanId.toString();
    }

    default:
      return hex;
  }
}

/**
 * Build Option 82 hex string from suboptions
 */
export function buildOption82(config: Option82Config): Option82Result {
  const breakdown: SuboptionBreakdown[] = [];
  const hexParts: string[] = [];

  for (const suboption of config.suboptions) {
    const typeCode = SUBOPTION_CODES[suboption.type];
    const hexValue = encodeValue(suboption.value, suboption.format);
    const length = hexValue.length / 2; // Length in bytes

    // TLV format: Type (1 byte) + Length (1 byte) + Value (n bytes)
    const typeHex = typeCode.toString(16).padStart(2, '0');
    const lengthHex = length.toString(16).padStart(2, '0');

    hexParts.push(typeHex + lengthHex + hexValue);

    breakdown.push({
      type: suboption.type,
      typeCode,
      length,
      value: suboption.value,
      hexValue,
      description: getSuboptionDescription(suboption.type, suboption.format),
    });
  }

  const hexEncoded = hexParts.join('');
  const asciiDecoded = breakdown.map((b) => `${b.type}: ${b.value}`).join(', ');

  const examples = generateExamples(config, hexEncoded);

  return {
    hexEncoded,
    asciiDecoded,
    breakdown,
    examples,
  };
}

/**
 * Parse Option 82 hex string
 */
export function parseOption82(hexString: string): ParsedOption82 {
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');
  const suboptions: SuboptionBreakdown[] = [];
  let offset = 0;

  while (offset < cleanHex.length) {
    // Read Type (1 byte)
    const typeHex = cleanHex.substring(offset, offset + 2);
    const typeCode = parseInt(typeHex, 16);
    offset += 2;

    if (offset >= cleanHex.length) break;

    // Read Length (1 byte)
    const lengthHex = cleanHex.substring(offset, offset + 2);
    const length = parseInt(lengthHex, 16);
    offset += 2;

    if (offset + length * 2 > cleanHex.length) break;

    // Read Value (length bytes)
    const hexValue = cleanHex.substring(offset, offset + length * 2);
    offset += length * 2;

    const type = SUBOPTION_NAMES[typeCode];
    if (!type) continue;

    // Try to decode as ASCII
    const asciiValue = decodeValue(hexValue, 'ascii');

    suboptions.push({
      type,
      typeCode,
      length,
      value: asciiValue,
      hexValue,
      description: getSuboptionDescription(type, 'ascii'),
    });
  }

  return {
    suboptions,
    totalLength: offset / 2,
    rawHex: cleanHex,
  };
}

/**
 * Get description for suboption type
 */
function getSuboptionDescription(type: SuboptionType, _format: EncodingFormat): string {
  const descriptions: Record<SuboptionType, string> = {
    'circuit-id': 'Identifies the circuit (interface/VLAN) that received the DHCP packet',
    'remote-id': 'Identifies the relay agent itself (hostname, MAC, or ID)',
  };

  return descriptions[type];
}

/**
 * Generate configuration examples for different DHCP servers
 */
function generateExamples(config: Option82Config, _hexEncoded: string): Option82Result['examples'] {
  const examples: Option82Result['examples'] = {};

  // ISC dhcpd example
  const iscLines: string[] = [];
  iscLines.push('# Match clients based on Option 82 relay agent information');
  iscLines.push('class "option82-matched" {');

  for (const suboption of config.suboptions) {
    if (suboption.type === 'circuit-id') {
      iscLines.push(`  match if binary-to-ascii(16, 8, ":", option agent.circuit-id) = "${suboption.value}";`);
    } else if (suboption.type === 'remote-id') {
      iscLines.push(`  match if binary-to-ascii(16, 8, ":", option agent.remote-id) = "${suboption.value}";`);
    }
  }

  iscLines.push('}');
  iscLines.push('');
  iscLines.push('# Pool restricted to matched clients');
  iscLines.push('subnet 192.168.1.0 netmask 255.255.255.0 {');
  iscLines.push('  pool {');
  iscLines.push('    range 192.168.1.100 192.168.1.200;');
  iscLines.push('    allow members of "option82-matched";');
  iscLines.push('  }');
  iscLines.push('}');

  examples.iscDhcpd = iscLines.join('\n');

  // Kea DHCPv4 example
  const keaLines: string[] = [];
  keaLines.push('// Client class based on Option 82');
  keaLines.push('{');
  keaLines.push('  "client-classes": [');
  keaLines.push('    {');
  keaLines.push('      "name": "option82-matched",');

  for (const suboption of config.suboptions) {
    const subCode = SUBOPTION_CODES[suboption.type];
    keaLines.push(`      "test": "relay4[${subCode}].hex == 0x${encodeValue(suboption.value, suboption.format)}",`);
  }

  keaLines.push('      "only-if-required": true');
  keaLines.push('    }');
  keaLines.push('  ],');
  keaLines.push('  "subnet4": [');
  keaLines.push('    {');
  keaLines.push('      "subnet": "192.168.1.0/24",');
  keaLines.push('      "pools": [');
  keaLines.push('        {');
  keaLines.push('          "pool": "192.168.1.100 - 192.168.1.200",');
  keaLines.push('          "client-class": "option82-matched"');
  keaLines.push('        }');
  keaLines.push('      ]');
  keaLines.push('    }');
  keaLines.push('  ]');
  keaLines.push('}');

  examples.keaDhcp4 = keaLines.join('\n');

  // Cisco relay agent example
  const ciscoLines: string[] = [];
  ciscoLines.push('! Enable DHCP relay agent information option');
  ciscoLines.push('interface GigabitEthernet0/1');
  ciscoLines.push('  ip address 192.168.1.1 255.255.255.0');
  ciscoLines.push('  ip helper-address 192.168.100.10');
  ciscoLines.push('  !');

  for (const suboption of config.suboptions) {
    if (suboption.type === 'circuit-id' && suboption.format === 'vlan-id') {
      ciscoLines.push(`  ! Circuit-ID will be automatically set based on VLAN ${suboption.value}`);
    } else if (suboption.type === 'remote-id') {
      ciscoLines.push(`  ip dhcp relay information option-insert`);
    }
  }

  ciscoLines.push('!');
  ciscoLines.push('! Trust Option 82 from downstream relays');
  ciscoLines.push('ip dhcp relay information trust-all');
  ciscoLines.push('!');
  ciscoLines.push('! Policy to customize Option 82');
  ciscoLines.push('ip dhcp relay information policy-action replace');

  examples.ciscoRelay = ciscoLines.join('\n');

  return examples;
}

/**
 * Get default config
 */
export function getDefaultOption82Config(): Option82Config {
  return {
    suboptions: [
      {
        type: 'circuit-id',
        format: 'vlan-id',
        value: '100',
      },
    ],
  };
}

/**
 * Common VLAN formats
 */
export const VLAN_EXAMPLES = [
  { label: 'VLAN 10 (Guests)', value: '10' },
  { label: 'VLAN 20 (Corporate)', value: '20' },
  { label: 'VLAN 100 (Servers)', value: '100' },
  { label: 'VLAN 200 (VoIP)', value: '200' },
];

/**
 * Common Circuit-ID examples
 */
export const CIRCUIT_ID_EXAMPLES = [
  { label: 'Hostname:Port', value: 'sw1:Gi0/1', format: 'hostname-port' as EncodingFormat },
  { label: 'VLAN ID', value: '100', format: 'vlan-id' as EncodingFormat },
  { label: 'Custom ASCII', value: 'building-a-floor-3', format: 'ascii' as EncodingFormat },
];

/**
 * Common Remote-ID examples
 */
export const REMOTE_ID_EXAMPLES = [
  { label: 'Hostname', value: 'relay-sw1.example.com', format: 'ascii' as EncodingFormat },
  { label: 'MAC Address', value: '001122334455', format: 'hex' as EncodingFormat },
  { label: 'Agent ID', value: 'agent-001', format: 'ascii' as EncodingFormat },
];
