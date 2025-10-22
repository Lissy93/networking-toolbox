/**
 * DUID (DHCP Unique Identifier) Generator (RFC 8415)
 *
 * Supports four DUID types:
 * - DUID-LLT (Type 1): Link-layer Address Plus Time
 * - DUID-EN (Type 2): Enterprise Number
 * - DUID-LL (Type 3): Link-layer Address
 * - DUID-UUID (Type 4): UUID-Based
 */

export type DUIDType = 'DUID-LLT' | 'DUID-EN' | 'DUID-LL' | 'DUID-UUID';

export interface DUIDConfig {
  type: DUIDType;
  // For DUID-LLT and DUID-LL
  macAddress?: string;
  hardwareType?: number;
  // For DUID-LLT only
  timestamp?: number; // Unix timestamp or custom
  // For DUID-EN
  enterpriseNumber?: number;
  enterpriseIdentifier?: string; // Hex identifier
  // For DUID-UUID
  uuid?: string;
}

export interface DUIDResult {
  type: DUIDType;
  typeCode: number;
  hexEncoded: string;
  wireFormat: string;
  totalLength: number;
  breakdown?: Array<{
    field: string;
    hex: string;
    description?: string;
  }>;
  examples: {
    keaDhcp6?: string;
    iscDhcpd?: string;
  };
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

/**
 * Validates a hardware address (MAC or other link-layer address)
 * Supports various formats and lengths for different hardware types
 */
function validateMAC(mac: string): boolean {
  // Standard 6-byte Ethernet MAC with separators (colon or hyphen)
  const macRegex = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/;
  // 6-byte MAC without separators
  const macNoSepRegex = /^[0-9a-fA-F]{12}$/;
  // Cisco format (3 groups of 4 hex digits)
  const macCiscoRegex = /^([0-9a-fA-F]{4}\.){2}[0-9a-fA-F]{4}$/;
  // Variable-length hardware addresses with colon separators (e.g., InfiniBand)
  const varLengthRegex = /^([0-9a-fA-F]{2}:)+[0-9a-fA-F]{2}$/;
  // Variable-length without separators (must be even number of hex chars)
  const varLengthNoSepRegex = /^[0-9a-fA-F]+$/;

  const normalized = mac.replace(/[:\-.]/g, '');
  const isEvenHex = /^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0;

  return (
    macRegex.test(mac) ||
    macNoSepRegex.test(mac) ||
    macCiscoRegex.test(mac) ||
    varLengthRegex.test(mac) ||
    (varLengthNoSepRegex.test(mac) && isEvenHex)
  );
}

/**
 * Normalizes MAC address to hex string (removes separators)
 */
function normalizeMAC(mac: string): string {
  return mac.replace(/[:\-.]/g, '').toLowerCase();
}

/**
 * Validates hex string
 */
function validateHex(hex: string): boolean {
  return /^[0-9a-fA-F]*$/.test(hex.replace(/[\s:]/g, ''));
}

/**
 * Normalizes hex string (removes spaces and colons)
 */
function normalizeHex(hex: string): string {
  return hex.replace(/[\s:]/g, '').toLowerCase();
}

/**
 * Validates UUID format
 */
function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const uuidNoSepRegex = /^[0-9a-fA-F]{32}$/;
  return uuidRegex.test(uuid) || uuidNoSepRegex.test(uuid);
}

/**
 * Normalizes UUID to hex string
 */
function normalizeUUID(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
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
 * Calculate DUID-LLT timestamp (seconds since January 1, 2000 00:00 UTC)
 */
export function calculateDUIDTimestamp(unixTimestamp?: number): number {
  const timestamp = unixTimestamp || Math.floor(Date.now() / 1000);
  const year2000 = 946684800; // Unix timestamp for January 1, 2000 00:00 UTC
  return timestamp - year2000;
}

/**
 * Validates DUID configuration
 */
export function validateDUIDConfig(config: DUIDConfig): string[] {
  const errors: string[] = [];

  switch (config.type) {
    case 'DUID-LLT':
      if (!config.macAddress?.trim()) {
        errors.push('MAC address is required for DUID-LLT');
      } else if (!validateMAC(config.macAddress)) {
        errors.push('Invalid MAC address format');
      }
      if (config.hardwareType !== undefined && (config.hardwareType < 0 || config.hardwareType > 65535)) {
        errors.push('Hardware type must be between 0 and 65535');
      }
      if (config.timestamp !== undefined && config.timestamp < 0) {
        errors.push('Timestamp must be non-negative');
      }
      break;

    case 'DUID-EN':
      if (config.enterpriseNumber === undefined || config.enterpriseNumber === null) {
        errors.push('Enterprise number is required for DUID-EN');
      } else if (config.enterpriseNumber < 0 || config.enterpriseNumber > 4294967295) {
        errors.push('Enterprise number must be between 0 and 4294967295');
      }
      if (!config.enterpriseIdentifier?.trim()) {
        errors.push('Enterprise identifier is required for DUID-EN');
      } else if (!validateHex(config.enterpriseIdentifier)) {
        errors.push('Invalid enterprise identifier format');
      }
      break;

    case 'DUID-LL':
      if (!config.macAddress?.trim()) {
        errors.push('MAC address is required for DUID-LL');
      } else if (!validateMAC(config.macAddress)) {
        errors.push('Invalid MAC address format');
      }
      if (config.hardwareType !== undefined && (config.hardwareType < 0 || config.hardwareType > 65535)) {
        errors.push('Hardware type must be between 0 and 65535');
      }
      break;

    case 'DUID-UUID':
      if (!config.uuid?.trim()) {
        errors.push('UUID is required for DUID-UUID');
      } else if (!validateUUID(config.uuid)) {
        errors.push('Invalid UUID format');
      }
      break;
  }

  return errors;
}

/**
 * Builds a DUID
 */
export function buildDUID(config: DUIDConfig): DUIDResult {
  const errors = validateDUIDConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  let hexEncoded = '';
  let typeCode = 0;
  const breakdown: Array<{ field: string; hex: string; description?: string }> = [];

  switch (config.type) {
    case 'DUID-LLT': {
      // Type (2 bytes) = 0x0001
      typeCode = 1;
      const typeHex = '0001';
      hexEncoded += typeHex;
      breakdown.push({
        field: 'Type',
        hex: formatWireFormat(typeHex),
        description: 'Type 1 (DUID-LLT)',
      });

      // Hardware Type (2 bytes)
      const hwType = config.hardwareType ?? HARDWARE_TYPES.ETHERNET;
      const hwTypeHex = numberToHex(hwType, 2);
      hexEncoded += hwTypeHex;
      breakdown.push({
        field: 'Hardware Type',
        hex: formatWireFormat(hwTypeHex),
        description: `${hwType} (${hwType === 1 ? 'Ethernet' : 'Hardware Type ' + hwType})`,
      });

      // Time (4 bytes) - seconds since January 1, 2000 00:00 UTC
      const time = config.timestamp ?? calculateDUIDTimestamp();
      const timeHex = numberToHex(time, 4);
      hexEncoded += timeHex;
      breakdown.push({
        field: 'Time',
        hex: formatWireFormat(timeHex),
        description: `${time} seconds since Jan 1, 2000 UTC`,
      });

      // Link-layer Address
      const macHex = normalizeMAC(config.macAddress!);
      hexEncoded += macHex;
      breakdown.push({
        field: 'Link-layer Address',
        hex: formatWireFormat(macHex),
        description: config.macAddress!,
      });
      break;
    }

    case 'DUID-EN': {
      // Type (2 bytes) = 0x0002
      typeCode = 2;
      const typeHex = '0002';
      hexEncoded += typeHex;
      breakdown.push({
        field: 'Type',
        hex: formatWireFormat(typeHex),
        description: 'Type 2 (DUID-EN)',
      });

      // Enterprise Number (4 bytes)
      const enHex = numberToHex(config.enterpriseNumber!, 4);
      hexEncoded += enHex;
      breakdown.push({
        field: 'Enterprise Number',
        hex: formatWireFormat(enHex),
        description: `${config.enterpriseNumber}`,
      });

      // Identifier (variable length)
      const idHex = normalizeHex(config.enterpriseIdentifier!);
      hexEncoded += idHex;
      breakdown.push({
        field: 'Identifier',
        hex: formatWireFormat(idHex),
        description: `${idHex.length / 2} bytes`,
      });
      break;
    }

    case 'DUID-LL': {
      // Type (2 bytes) = 0x0003
      typeCode = 3;
      const typeHex = '0003';
      hexEncoded += typeHex;
      breakdown.push({
        field: 'Type',
        hex: formatWireFormat(typeHex),
        description: 'Type 3 (DUID-LL)',
      });

      // Hardware Type (2 bytes)
      const hwType = config.hardwareType ?? HARDWARE_TYPES.ETHERNET;
      const hwTypeHex = numberToHex(hwType, 2);
      hexEncoded += hwTypeHex;
      breakdown.push({
        field: 'Hardware Type',
        hex: formatWireFormat(hwTypeHex),
        description: `${hwType} (${hwType === 1 ? 'Ethernet' : 'Hardware Type ' + hwType})`,
      });

      // Link-layer Address
      const macHex = normalizeMAC(config.macAddress!);
      hexEncoded += macHex;
      breakdown.push({
        field: 'Link-layer Address',
        hex: formatWireFormat(macHex),
        description: config.macAddress!,
      });
      break;
    }

    case 'DUID-UUID': {
      // Type (2 bytes) = 0x0004
      typeCode = 4;
      const typeHex = '0004';
      hexEncoded += typeHex;
      breakdown.push({
        field: 'Type',
        hex: formatWireFormat(typeHex),
        description: 'Type 4 (DUID-UUID)',
      });

      // UUID (16 bytes)
      const uuidHex = normalizeUUID(config.uuid!);
      hexEncoded += uuidHex;
      breakdown.push({
        field: 'UUID',
        hex: formatWireFormat(uuidHex),
        description: config.uuid!,
      });
      break;
    }
  }

  const result: DUIDResult = {
    type: config.type,
    typeCode,
    hexEncoded,
    wireFormat: formatWireFormat(hexEncoded),
    totalLength: hexEncoded.length / 2,
    breakdown,
    examples: {},
  };

  result.examples = generateConfigExamples(result);

  return result;
}

/**
 * Generates DHCPv6 configuration examples
 */
function generateConfigExamples(result: DUIDResult): {
  keaDhcp6?: string;
  iscDhcpd?: string;
} {
  const { hexEncoded, wireFormat } = result;

  // Kea DHCPv6 configuration
  const keaDhcp6 = `{
  "Dhcp6": {
    "host-reservation-identifiers": ["duid"],
    "reservations": [
      {
        "duid": "${hexEncoded}",
        "ip-addresses": ["2001:db8::100"]
      }
    ]
  }
}`;

  // ISC DHCPd configuration
  const iscDhcpd = `# DUID Configuration
# Add to dhcpd6.conf

# Server DUID (${result.type})
server-duid ${wireFormat};

# Or as client reservation:
host client-name {
  host-identifier option dhcp6.client-id ${wireFormat};
  fixed-address6 2001:db8::100;
}`;

  return {
    keaDhcp6,
    iscDhcpd,
  };
}

/**
 * Returns a default DUID configuration
 */
export function getDefaultDUIDConfig(type: DUIDType = 'DUID-LLT'): DUIDConfig {
  return {
    type,
    macAddress: '',
    hardwareType: HARDWARE_TYPES.ETHERNET,
    timestamp: calculateDUIDTimestamp(),
    enterpriseNumber: 0,
    enterpriseIdentifier: '',
    uuid: '',
  };
}

/**
 * Example DUID configurations
 */
export const DUID_EXAMPLES: Array<DUIDConfig & { name: string }> = [
  {
    name: 'DUID-LLT Example',
    type: 'DUID-LLT',
    macAddress: '00:0c:29:4f:a3:d2',
    hardwareType: HARDWARE_TYPES.ETHERNET,
    timestamp: calculateDUIDTimestamp(1640000000),
  },
  {
    name: 'DUID-EN (Cisco)',
    type: 'DUID-EN',
    enterpriseNumber: 9,
    enterpriseIdentifier: '0123456789abcdef',
  },
  {
    name: 'DUID-LL Example',
    type: 'DUID-LL',
    macAddress: '00:0c:29:4f:a3:d2',
    hardwareType: HARDWARE_TYPES.ETHERNET,
  },
  {
    name: 'DUID-UUID Example',
    type: 'DUID-UUID',
    uuid: '550e8400-e29b-41d4-a716-446655440000',
  },
  {
    name: 'DUID-EN (Microsoft)',
    type: 'DUID-EN',
    enterpriseNumber: 311,
    enterpriseIdentifier: 'a1b2c3d4e5f6',
  },
  {
    name: 'DUID-LLT (InfiniBand)',
    type: 'DUID-LLT',
    macAddress: '80:00:02:08:fe:80:00:00:00:00:00:00:f4:52:14:03:00:7b:cb:a3',
    hardwareType: HARDWARE_TYPES.INFINIBAND,
    timestamp: calculateDUIDTimestamp(1700000000),
  },
];
