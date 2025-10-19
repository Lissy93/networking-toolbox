/**
 * DHCP Freeform TLV (Type-Length-Value) Composer
 *
 * Allows creation of custom DHCP options with various data types.
 * Supports IPv4, IPv6, FQDN, hex, string, uint8, uint16, uint32, and boolean values.
 */

export type TLVDataType = 'ipv4' | 'ipv6' | 'fqdn' | 'hex' | 'string' | 'uint8' | 'uint16' | 'uint32' | 'boolean';

export interface TLVItem {
  id: string;
  dataType: TLVDataType;
  value: string;
}

export interface TLVOption {
  optionCode: number;
  optionName: string;
  items: TLVItem[];
}

export interface TLVResult {
  option: TLVOption;
  hexEncoded: string;
  wireFormat: string;
  totalLength: number;
  dataLength: number;
  breakdown: Array<{
    label: string;
    hex: string;
    description: string;
  }>;
  examples: {
    iscDhcpd?: string;
    keaDhcp4?: string;
  };
}

/**
 * Validates an IPv4 address
 */
function validateIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!ipv4Regex.test(ip)) return false;

  const octets = ip.split('.').map((o) => parseInt(o, 10));
  return octets.every((o) => o >= 0 && o <= 255);
}

/**
 * Validates an IPv6 address (simplified validation)
 */
function validateIPv6(ip: string): boolean {
  // Simplified IPv6 validation - accepts standard and compressed formats
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  const ipv6CompressedRegex = /^::([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4}$/;
  const ipv6MixedRegex = /^([0-9a-fA-F]{0,4}:){6}\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

  return ipv6Regex.test(ip) || ipv6CompressedRegex.test(ip) || ipv6MixedRegex.test(ip);
}

/**
 * Converts IPv4 address to hex bytes
 */
function ipv4ToHex(ip: string): string {
  const octets = ip.split('.').map((o) => parseInt(o, 10));
  return octets.map((o) => o.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts IPv6 address to hex bytes
 */
function ipv6ToHex(ip: string): string {
  // Expand compressed IPv6 addresses
  let expanded = ip;

  // Handle :: compression
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const leftParts = parts[0] ? parts[0].split(':') : [];
    const rightParts = parts[1] ? parts[1].split(':') : [];
    const missingParts = 8 - leftParts.length - rightParts.length;
    const middleParts = Array(missingParts).fill('0000');
    expanded = [...leftParts, ...middleParts, ...rightParts].join(':');
  }

  // Pad each segment to 4 hex digits
  const segments = expanded.split(':').map((seg) => seg.padStart(4, '0'));

  // Convert to hex bytes
  return segments.join('');
}

/**
 * Converts a string to hex bytes (UTF-8 encoding)
 */
function stringToHex(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
 * Validates FQDN (Fully Qualified Domain Name)
 */
function validateFQDN(fqdn: string): boolean {
  // Basic FQDN validation
  const fqdnRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return fqdnRegex.test(fqdn) && fqdn.length <= 253;
}

/**
 * Converts FQDN to DNS wire format (length-prefixed labels)
 */
function fqdnToHex(fqdn: string): string {
  const labels = fqdn.split('.');
  let hex = '';

  for (const label of labels) {
    const labelLength = label.length;
    hex += labelLength.toString(16).padStart(2, '0');
    hex += stringToHex(label);
  }

  // Add null terminator
  hex += '00';

  return hex;
}

/**
 * Validates a TLV item based on its data type
 */
export function validateTLVItem(item: TLVItem): string | null {
  if (!item.value.trim()) {
    return `${item.dataType.toUpperCase()}: Value is required`;
  }

  switch (item.dataType) {
    case 'ipv4':
      if (!validateIPv4(item.value)) {
        return `IPv4: Invalid address format`;
      }
      break;

    case 'ipv6':
      if (!validateIPv6(item.value)) {
        return `IPv6: Invalid address format`;
      }
      break;

    case 'fqdn':
      if (!validateFQDN(item.value)) {
        return `FQDN: Invalid domain name format`;
      }
      break;

    case 'hex':
      if (!validateHex(item.value)) {
        return `Hex: Only hexadecimal characters allowed`;
      }
      if (normalizeHex(item.value).length % 2 !== 0) {
        return `Hex: Must have an even number of hex digits`;
      }
      break;

    case 'string':
      if (item.value.length > 255) {
        return `String: Maximum length is 255 characters`;
      }
      break;

    case 'uint8': {
      const val = parseInt(item.value, 10);
      if (isNaN(val) || val < 0 || val > 255) {
        return `UInt8: Must be a number between 0 and 255`;
      }
      break;
    }

    case 'uint16': {
      const val = parseInt(item.value, 10);
      if (isNaN(val) || val < 0 || val > 65535) {
        return `UInt16: Must be a number between 0 and 65535`;
      }
      break;
    }

    case 'uint32': {
      const val = parseInt(item.value, 10);
      if (isNaN(val) || val < 0 || val > 4294967295) {
        return `UInt32: Must be a number between 0 and 4294967295`;
      }
      break;
    }

    case 'boolean':
      if (item.value !== '0' && item.value !== '1' && item.value !== 'true' && item.value !== 'false') {
        return `Boolean: Must be 0, 1, true, or false`;
      }
      break;
  }

  return null;
}

/**
 * Validates a TLV option
 */
export function validateTLVOption(option: TLVOption): string[] {
  const errors: string[] = [];

  // Validate option code
  if (option.optionCode < 0 || option.optionCode > 255) {
    errors.push('Option code must be between 0 and 255');
  }

  // Validate option name
  if (!option.optionName.trim()) {
    errors.push('Option name is required');
  }

  // Validate items
  if (option.items.length === 0) {
    errors.push('At least one data item is required');
  }

  // Validate each item
  for (let i = 0; i < option.items.length; i++) {
    const itemError = validateTLVItem(option.items[i]);
    if (itemError) {
      errors.push(`Item ${i + 1}: ${itemError}`);
    }
  }

  return errors;
}

/**
 * Encodes a TLV item to hex bytes
 */
function encodeTLVItem(item: TLVItem): string {
  switch (item.dataType) {
    case 'ipv4':
      return ipv4ToHex(item.value);

    case 'ipv6':
      return ipv6ToHex(item.value);

    case 'fqdn':
      return fqdnToHex(item.value);

    case 'hex':
      return normalizeHex(item.value);

    case 'string':
      return stringToHex(item.value);

    case 'uint8': {
      const val = parseInt(item.value, 10);
      return val.toString(16).padStart(2, '0');
    }

    case 'uint16': {
      const val = parseInt(item.value, 10);
      return val.toString(16).padStart(4, '0');
    }

    case 'uint32': {
      const val = parseInt(item.value, 10);
      return val.toString(16).padStart(8, '0');
    }

    case 'boolean': {
      const val = item.value === '1' || item.value === 'true' ? 1 : 0;
      return val.toString(16).padStart(2, '0');
    }

    default:
      return '';
  }
}

/**
 * Formats hex string as wire format (with spaces)
 */
function formatWireFormat(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

/**
 * Generates DHCP configuration examples
 */
function generateConfigExamples(result: TLVResult): {
  iscDhcpd?: string;
  keaDhcp4?: string;
} {
  const { option, hexEncoded } = result;
  const wireFormat = formatWireFormat(hexEncoded);

  // ISC dhcpd configuration
  const iscDhcpd = `# ${option.optionName} (Option ${option.optionCode})
option space custom-options;
option custom-options.${option.optionName.toLowerCase().replace(/\s+/g, '-')} code ${option.optionCode} = string;

subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.100 192.168.1.200;
  option custom-options.${option.optionName.toLowerCase().replace(/\s+/g, '-')} ${wireFormat};
}`;

  // Kea DHCPv4 configuration
  const keaDhcp4 = `{
  "Dhcp4": {
    "subnet4": [
      {
        "subnet": "192.168.1.0/24",
        "pools": [
          {
            "pool": "192.168.1.100 - 192.168.1.200"
          }
        ],
        "option-data": [
          {
            "name": "${option.optionName}",
            "code": ${option.optionCode},
            "data": "${hexEncoded}",
            "csv-format": false
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
 * Builds a DHCP TLV option
 */
export function buildTLVOption(option: TLVOption): TLVResult {
  const errors = validateTLVOption(option);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  // Encode all items
  let dataHex = '';
  const breakdown: Array<{ label: string; hex: string; description: string }> = [];

  for (let i = 0; i < option.items.length; i++) {
    const item = option.items[i];
    const itemHex = encodeTLVItem(item);
    dataHex += itemHex;

    breakdown.push({
      label: `Item ${i + 1} (${item.dataType})`,
      hex: formatWireFormat(itemHex),
      description: `${item.value} encoded as ${item.dataType.toUpperCase()}`,
    });
  }

  const dataLength = dataHex.length / 2; // Convert hex chars to bytes
  const totalLength = dataLength; // For DHCP options, total length = data length

  const result: TLVResult = {
    option,
    hexEncoded: dataHex,
    wireFormat: formatWireFormat(dataHex),
    totalLength,
    dataLength,
    breakdown,
    examples: {},
  };

  result.examples = generateConfigExamples(result);

  return result;
}

/**
 * Returns a default TLV option
 */
export function getDefaultTLVOption(): TLVOption {
  return {
    optionCode: 224, // Start of site-specific options range
    optionName: 'Custom Option',
    items: [],
  };
}

/**
 * Creates a new TLV item with a unique ID
 */
export function createTLVItem(dataType: TLVDataType = 'string'): TLVItem {
  return {
    id: crypto.randomUUID(),
    dataType,
    value: '',
  };
}

/**
 * Example TLV options for quick start
 */
export const TLV_EXAMPLES: TLVOption[] = [
  {
    optionCode: 224,
    optionName: 'Custom Server List',
    items: [
      { id: '1', dataType: 'ipv4', value: '192.168.1.10' },
      { id: '2', dataType: 'ipv4', value: '192.168.1.11' },
    ],
  },
  {
    optionCode: 225,
    optionName: 'Custom Config Server',
    items: [{ id: '1', dataType: 'fqdn', value: 'config.example.com' }],
  },
  {
    optionCode: 226,
    optionName: 'Custom Flags',
    items: [
      { id: '1', dataType: 'boolean', value: 'true' },
      { id: '2', dataType: 'uint8', value: '5' },
      { id: '3', dataType: 'uint16', value: '8080' },
    ],
  },
  {
    optionCode: 227,
    optionName: 'Custom Hex Data',
    items: [{ id: '1', dataType: 'hex', value: 'deadbeef' }],
  },
  {
    optionCode: 228,
    optionName: 'VoIP Configuration',
    items: [
      { id: '1', dataType: 'ipv4', value: '10.0.0.50' },
      { id: '2', dataType: 'uint16', value: '5060' },
      { id: '3', dataType: 'fqdn', value: 'sip.voip.local' },
      { id: '4', dataType: 'string', value: 'domain=internal' },
    ],
  },
  {
    optionCode: 229,
    optionName: 'IoT Device Profile',
    items: [
      { id: '1', dataType: 'uint32', value: '3600' },
      { id: '2', dataType: 'ipv6', value: '2001:db8::1' },
      { id: '3', dataType: 'uint8', value: '10' },
      { id: '4', dataType: 'boolean', value: 'false' },
    ],
  },
];
