/**
 * DHCPv4 Client Identifier (Option 61) - RFC 2132
 *
 * The Client Identifier option is used by DHCP clients to specify their unique identifier.
 * It can be either:
 * - Hardware type (1 byte) + Hardware address (e.g., MAC address)
 * - Arbitrary opaque data (string, hex, etc.)
 *
 * Format: Type (1 byte) + Data (variable length)
 */

export interface ClientIDConfig {
  mode: 'hardware' | 'opaque';
  // Hardware mode
  hardwareType?: number;
  macAddress?: string;
  // Opaque mode
  opaqueData?: string;
  opaqueFormat?: 'hex' | 'text';
}

export interface ClientIDResult {
  mode: 'hardware' | 'opaque';
  hex: string;
  wireFormat: string;
  length: number;
  breakdown?: Array<{
    field: string;
    hex: string;
    description?: string;
  }>;
  decoded?: {
    hardwareType?: number;
    hardwareTypeName?: string;
    macAddress?: string;
    opaqueData?: string;
  };
  configExamples?: {
    iscDhcpd?: string;
    keaDhcp4?: string;
  };
}

export interface DecodeClientIDConfig {
  hexData: string;
}

/**
 * Hardware types (from IANA ARP Hardware Types)
 */
export const HARDWARE_TYPES = {
  ETHERNET: 1,
  EXPERIMENTAL_ETHERNET: 2,
  IEEE_802: 6,
  ARCNET: 7,
  FRAME_RELAY: 15,
  ATM: 16,
  HDLC: 17,
  FIBRE_CHANNEL: 18,
  IEEE_1394: 24,
  INFINIBAND: 32,
} as const;

export const HARDWARE_TYPE_NAMES: Record<number, string> = {
  1: 'Ethernet',
  2: 'Experimental Ethernet',
  6: 'IEEE 802',
  7: 'ARCNET',
  15: 'Frame Relay',
  16: 'ATM',
  17: 'HDLC',
  18: 'Fibre Channel',
  24: 'IEEE 1394',
  32: 'InfiniBand',
};

/**
 * Validates MAC address
 */
function validateMAC(mac: string): boolean {
  const macRegex = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/;
  const macNoSepRegex = /^[0-9a-fA-F]{12}$/;
  const macCiscoRegex = /^([0-9a-fA-F]{4}\.){2}[0-9a-fA-F]{4}$/;
  const varLengthRegex = /^([0-9a-fA-F]{2}:)+[0-9a-fA-F]{2}$/;

  const normalized = mac.replace(/[:\-.]/g, '');
  const isEvenHex = /^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0;

  return (
    macRegex.test(mac) || macNoSepRegex.test(mac) || macCiscoRegex.test(mac) || varLengthRegex.test(mac) || isEvenHex
  );
}

/**
 * Normalizes MAC address to hex string
 */
function normalizeMAC(mac: string): string {
  return mac.replace(/[:\-.]/g, '').toLowerCase();
}

/**
 * Validates hex string
 */
function validateHex(hex: string): boolean {
  const normalized = hex.replace(/[\s:]/g, '');
  return /^[0-9a-fA-F]*$/.test(normalized) && normalized.length % 2 === 0;
}

/**
 * Normalizes hex string
 */
function normalizeHex(hex: string): string {
  return hex.replace(/[\s:]/g, '').toLowerCase();
}

/**
 * Converts number to hex with specified byte length
 */
function numberToHex(num: number, bytes: number): string {
  return num.toString(16).padStart(bytes * 2, '0');
}

/**
 * Formats hex string as wire format (with spaces)
 */
function formatWireFormat(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

/**
 * Validates Client ID configuration
 */
export function validateClientIDConfig(config: ClientIDConfig): string[] {
  const errors: string[] = [];

  if (config.mode === 'hardware') {
    if (config.hardwareType === undefined || config.hardwareType === null) {
      errors.push('Hardware type is required for hardware mode');
    } else if (config.hardwareType < 0 || config.hardwareType > 255) {
      errors.push('Hardware type must be between 0 and 255');
    }

    if (!config.macAddress?.trim()) {
      errors.push('MAC address is required for hardware mode');
    } else if (!validateMAC(config.macAddress)) {
      errors.push('Invalid MAC address format');
    }
  } else if (config.mode === 'opaque') {
    if (!config.opaqueData?.trim()) {
      errors.push('Opaque data is required for opaque mode');
    } else if (config.opaqueFormat === 'hex' && !validateHex(config.opaqueData)) {
      errors.push('Invalid hex format for opaque data');
    }
  }

  return errors;
}

/**
 * Generate configuration examples
 */
function generateConfigExamples(
  hex: string,
  config: ClientIDConfig,
): {
  iscDhcpd?: string;
  keaDhcp4?: string;
} {
  const wireFormat = formatWireFormat(hex);

  // ISC DHCPd configuration
  const iscDhcpd = `# DHCPv4 Client Identifier (Option 61)
# Client configuration

# Method 1: Using send statement
send dhcp-client-identifier ${wireFormat};

# Method 2: In host declaration
host client-device {
  hardware ethernet ${config.mode === 'hardware' && config.macAddress ? config.macAddress : '00:00:00:00:00:00'};
  option dhcp-client-identifier ${wireFormat};
  fixed-address 192.168.1.100;
}`;

  // Kea DHCPv4 configuration
  const keaDhcp4 = `{
  "Dhcp4": {
    "client-classes": [
      {
        "name": "client-id-class",
        "test": "option[61].hex == '${hex}'"
      }
    ],
    "subnet4": [
      {
        "subnet": "192.168.1.0/24",
        "pools": [
          {
            "pool": "192.168.1.100 - 192.168.1.200"
          }
        ],
        "reservations": [
          {
            "hw-address": "${config.mode === 'hardware' && config.macAddress ? config.macAddress : '00:00:00:00:00:00'}",
            "client-id": "${hex}",
            "ip-address": "192.168.1.100"
          }
        ]
      }
    ]
  }
}`;

  return {
    iscDhcpd,
    keaDhcp4,
  };
}

/**
 * Build Client ID from configuration
 */
export function buildClientID(config: ClientIDConfig): ClientIDResult {
  const errors = validateClientIDConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  let hex = '';
  const breakdown: Array<{ field: string; hex: string; description?: string }> = [];

  if (config.mode === 'hardware') {
    // Hardware Type (1 byte)
    const hwTypeHex = numberToHex(config.hardwareType!, 1);
    hex += hwTypeHex;
    breakdown.push({
      field: 'Hardware Type',
      hex: formatWireFormat(hwTypeHex),
      description: `${config.hardwareType} (${HARDWARE_TYPE_NAMES[config.hardwareType!] || 'Unknown'})`,
    });

    // MAC Address
    const macHex = normalizeMAC(config.macAddress!);
    hex += macHex;
    breakdown.push({
      field: 'Hardware Address',
      hex: formatWireFormat(macHex),
      description: config.macAddress!,
    });
  } else {
    // Opaque data
    if (config.opaqueFormat === 'hex') {
      hex = normalizeHex(config.opaqueData!);
    } else {
      // Text to hex
      const encoder = new TextEncoder();
      const bytes = encoder.encode(config.opaqueData!);
      hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    breakdown.push({
      field: 'Opaque Data',
      hex: formatWireFormat(hex),
      description: `${hex.length / 2} bytes`,
    });
  }

  const result: ClientIDResult = {
    mode: config.mode,
    hex,
    wireFormat: formatWireFormat(hex),
    length: hex.length / 2,
    breakdown,
    configExamples: generateConfigExamples(hex, config),
  };

  return result;
}

/**
 * Decode Client ID from hex data
 */
export function decodeClientID(config: DecodeClientIDConfig): ClientIDResult {
  const hex = normalizeHex(config.hexData);

  if (!validateHex(hex)) {
    throw new Error('Invalid hex data format');
  }

  if (hex.length < 2) {
    throw new Error('Client ID must be at least 1 byte');
  }

  const breakdown: Array<{ field: string; hex: string; description?: string }> = [];
  let mode: 'hardware' | 'opaque' = 'opaque';
  const decoded: {
    hardwareType?: number;
    hardwareTypeName?: string;
    macAddress?: string;
    opaqueData?: string;
  } = {};

  // Try to detect if it's hardware mode
  const firstByte = parseInt(hex.substring(0, 2), 16);

  // If first byte is a known hardware type and length is exactly 1 + 6 bytes (Ethernet standard)
  // or matches other common lengths (we use exact match for Ethernet, otherwise allow variable)
  const isLikelyHardwareMode =
    HARDWARE_TYPE_NAMES[firstByte] &&
    (hex.length === 14 || // Ethernet: 1 byte type + 6 bytes MAC
      hex.length === 16 || // 8-byte MAC
      hex.length === 18); // InfiniBand or other: 1 byte type + variable length

  if (isLikelyHardwareMode) {
    mode = 'hardware';
    decoded.hardwareType = firstByte;
    decoded.hardwareTypeName = HARDWARE_TYPE_NAMES[firstByte];

    breakdown.push({
      field: 'Hardware Type',
      hex: formatWireFormat(hex.substring(0, 2)),
      description: `${firstByte} (${decoded.hardwareTypeName})`,
    });

    // Extract MAC address
    const macHex = hex.substring(2);
    const macBytes = macHex.match(/.{2}/g) || [];
    decoded.macAddress = macBytes.join(':').toUpperCase();

    breakdown.push({
      field: 'Hardware Address',
      hex: formatWireFormat(macHex),
      description: decoded.macAddress,
    });
  } else {
    // Opaque mode
    mode = 'opaque';

    // Try to decode as text
    try {
      const bytes = hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || [];
      const decoder = new TextDecoder();
      const text = decoder.decode(new Uint8Array(bytes));

      // Check if it's printable ASCII
      if (/^[\x20-\x7E]+$/.test(text)) {
        decoded.opaqueData = text;
      } else {
        decoded.opaqueData = hex;
      }
    } catch {
      decoded.opaqueData = hex;
    }

    breakdown.push({
      field: 'Opaque Data',
      hex: formatWireFormat(hex),
      description: `${hex.length / 2} bytes`,
    });
  }

  return {
    mode,
    hex,
    wireFormat: formatWireFormat(hex),
    length: hex.length / 2,
    breakdown,
    decoded,
  };
}

/**
 * Build mode examples
 */
export const CLIENTID_BUILD_EXAMPLES: Array<ClientIDConfig & { name: string; description: string }> = [
  {
    name: 'Ethernet MAC',
    description: 'Standard Ethernet client ID',
    mode: 'hardware',
    hardwareType: HARDWARE_TYPES.ETHERNET,
    macAddress: '00:0c:29:4f:a3:d2',
  },
  {
    name: 'IEEE 802 Network',
    description: 'IEEE 802 hardware type',
    mode: 'hardware',
    hardwareType: HARDWARE_TYPES.IEEE_802,
    macAddress: 'aa:bb:cc:dd:ee:ff',
  },
  {
    name: 'Text-based ID',
    description: 'Custom text identifier',
    mode: 'opaque',
    opaqueData: 'client-device-001',
    opaqueFormat: 'text',
  },
  {
    name: 'Hex-based ID',
    description: 'Custom hex identifier',
    mode: 'opaque',
    opaqueData: 'aabbccddee',
    opaqueFormat: 'hex',
  },
  {
    name: 'UUID-based ID',
    description: 'UUID as client identifier',
    mode: 'opaque',
    opaqueData: '550e8400e29b41d4a716446655440000',
    opaqueFormat: 'hex',
  },
  {
    name: 'Serial Number',
    description: 'Device serial number',
    mode: 'opaque',
    opaqueData: 'SN-2024-12345',
    opaqueFormat: 'text',
  },
];

/**
 * Decode mode examples
 */
export const CLIENTID_DECODE_EXAMPLES: Array<{ name: string; description: string; hexData: string }> = [
  {
    name: 'Ethernet Hardware',
    description: 'Decode Ethernet + MAC',
    hexData: '01000c294fa3d2',
  },
  {
    name: 'Text Identifier',
    description: 'Decode text-based ID',
    hexData: '636c69656e742d303031',
  },
  {
    name: 'UUID Identifier',
    description: 'Decode UUID-based ID',
    hexData: '550e8400e29b41d4a716446655440000',
  },
];
