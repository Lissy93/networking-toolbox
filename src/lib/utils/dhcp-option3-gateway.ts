/**
 * DHCP Option 3 - Router/Default Gateway (RFC 2132)
 *
 * Specifies a list of IP addresses for routers on the client's subnet.
 * Routers are listed in order of preference.
 *
 * Multiple gateways are used for:
 * - Redundancy (failover)
 * - Load balancing (some clients)
 * - Metric-based routing (Windows)
 */

export interface GatewayConfig {
  gateways: string[];
  subnet?: string; // Optional for validation
}

export interface GatewayResult {
  gateways: string[];
  hexEncoded: string;
  wireFormat: string;
  totalLength: number;
  configExamples: {
    iscDhcpd: string;
    keaDhcp4: string;
    dnsmasq: string;
  };
}

/**
 * Validates an IPv4 address
 */
function validateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255 || part !== num.toString()) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if IP is within subnet
 */
function isInSubnet(ip: string, subnet: string): boolean {
  const [network, prefixStr] = subnet.split('/');
  const prefix = parseInt(prefixStr, 10);

  if (!validateIPv4(network) || isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);
  const mask = (0xffffffff << (32 - prefix)) >>> 0;

  return (ipNum & mask) === (networkNum & mask);
}

/**
 * Converts IP address to number
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Converts IPv4 address to hex bytes
 */
function ipv4ToHex(ip: string): string {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  return parts.map((p) => p.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts hex bytes to IPv4 address
 */
function hexToIpv4(hex: string): string {
  const bytes = hex.match(/.{1,2}/g) || [];
  return bytes.map((b) => parseInt(b, 16).toString()).join('.');
}

/**
 * Formats hex string as wire format (with spaces)
 */
function formatWireFormat(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

/**
 * Validates gateway configuration
 */
export function validateGatewayConfig(config: GatewayConfig): string[] {
  const errors: string[] = [];

  if (!config.gateways || config.gateways.length === 0) {
    errors.push('At least one gateway must be specified');
    return errors;
  }

  // Filter out empty entries
  const validGateways = config.gateways.filter((g) => g.trim());

  if (validGateways.length === 0) {
    errors.push('At least one gateway must be specified');
    return errors;
  }

  // Validate each gateway
  for (let i = 0; i < config.gateways.length; i++) {
    const gateway = config.gateways[i];
    if (!gateway.trim()) continue;

    if (!validateIPv4(gateway)) {
      errors.push(`Gateway ${i + 1}: Invalid IPv4 address`);
      continue;
    }

    // Check if gateway is in subnet (if subnet provided)
    if (config.subnet && config.subnet.trim()) {
      if (!isInSubnet(gateway, config.subnet)) {
        errors.push(`Gateway ${i + 1}: Not within subnet ${config.subnet}`);
      }
    }
  }

  // Check for duplicates
  const seen = new Set<string>();
  for (const gateway of validGateways) {
    if (seen.has(gateway)) {
      errors.push(`Duplicate gateway: ${gateway}`);
    }
    seen.add(gateway);
  }

  return errors;
}

/**
 * Builds DHCP Option 3 (Router)
 */
export function buildGatewayOption(config: GatewayConfig): GatewayResult {
  const errors = validateGatewayConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const validGateways = config.gateways.filter((g) => g.trim());
  let hexEncoded = '';

  for (const gateway of validGateways) {
    hexEncoded += ipv4ToHex(gateway);
  }

  return {
    gateways: validGateways,
    hexEncoded,
    wireFormat: formatWireFormat(hexEncoded),
    totalLength: hexEncoded.length / 2,
    configExamples: generateConfigExamples(validGateways),
  };
}

/**
 * Decodes DHCP Option 3 from hex
 */
export function decodeGatewayOption(hex: string): GatewayResult {
  // Remove spaces and validate hex
  const cleanHex = hex.replace(/\s+/g, '');

  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hex string');
  }

  if (cleanHex.length === 0) {
    throw new Error('Hex string cannot be empty');
  }

  if (cleanHex.length % 8 !== 0) {
    throw new Error('Hex string must be multiple of 8 characters (4 bytes per IP)');
  }

  const gateways: string[] = [];
  for (let i = 0; i < cleanHex.length; i += 8) {
    const ipHex = cleanHex.substring(i, i + 8);
    gateways.push(hexToIpv4(ipHex));
  }

  return {
    gateways,
    hexEncoded: cleanHex,
    wireFormat: formatWireFormat(cleanHex),
    totalLength: cleanHex.length / 2,
    configExamples: generateConfigExamples(gateways),
  };
}

/**
 * Generates configuration examples for various DHCP servers
 */
function generateConfigExamples(gateways: string[]): {
  iscDhcpd: string;
  keaDhcp4: string;
  dnsmasq: string;
} {
  const gatewayList = gateways.join(', ');

  const iscDhcpd = `subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.100 192.168.1.200;
  option routers ${gatewayList};
}`;

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
            "name": "routers",
            "code": 3,
            "data": "${gatewayList}"
          }
        ]
      }
    ]
  }
}`;

  const dnsmasq =
    gateways.length === 1
      ? `dhcp-option=3,${gateways[0]}`
      : `# Multiple gateways (order matters)\n${gateways.map((g) => `dhcp-option=3,${g}`).join('\n')}`;

  return {
    iscDhcpd,
    keaDhcp4,
    dnsmasq,
  };
}

/**
 * Example gateway configurations
 */
export const GATEWAY_EXAMPLES = [
  {
    label: 'Single Gateway',
    description: 'Most common setup with one default gateway',
    gateways: ['192.168.1.1'],
  },
  {
    label: 'Dual Gateway (Redundancy)',
    description: 'Primary and backup gateway for failover',
    gateways: ['192.168.1.1', '192.168.1.2'],
  },
  {
    label: 'Multiple Gateways',
    description: 'Multiple gateways for load balancing or complex routing',
    gateways: ['10.0.1.1', '10.0.1.2', '10.0.1.3'],
  },
  {
    label: 'Enterprise Network',
    description: 'Corporate network with redundant gateways',
    gateways: ['172.16.0.1', '172.16.0.2'],
    subnet: '172.16.0.0/16',
  },
];
