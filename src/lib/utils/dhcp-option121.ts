/**
 * DHCP Option 121 - Classless Static Routes (RFC 3442)
 * DHCP Option 249 - Microsoft Classless Static Routes (MSFT proprietary)
 * Utilities for encoding/decoding static routes with bit-packed network prefixes
 */

export interface StaticRoute {
  destination: string; // CIDR notation (e.g., "192.168.1.0/24" or "10.0.0.0/8")
  gateway: string; // IPv4 address (e.g., "192.168.1.1")
}

export interface ClasslessRoutesConfig {
  routes: StaticRoute[];
  network?: {
    subnet?: string;
    netmask?: string;
    rangeStart?: string;
    rangeEnd?: string;
  };
}

export interface ClasslessRoutesResult {
  hexEncoded: string;
  wireFormat: string;
  routes: StaticRoute[];
  totalLength: number;
  examples: {
    iscDhcpd?: string;
    keaDhcp4?: string;
    msftOption249?: string;
  };
}

export interface ParsedClasslessRoutes {
  routes: StaticRoute[];
  totalLength: number;
  rawHex: string;
}

/**
 * Parse CIDR notation to get prefix length and network address
 */
function parseCIDR(cidr: string): { prefix: string; prefixLength: number } {
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid CIDR notation: ${cidr}`);
  }

  const prefix = parts[0].trim();
  const prefixLength = parseInt(parts[1].trim(), 10);

  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    throw new Error(`Invalid prefix length: ${parts[1]}`);
  }

  // Validate IPv4 address format
  if (!isValidIPv4(prefix)) {
    throw new Error(`Invalid IPv4 address: ${prefix}`);
  }

  return { prefix, prefixLength };
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
 * Calculate how many significant octets are needed for a given prefix length
 * According to RFC 3442, only significant octets of the network are included
 */
function getSignificantOctets(prefixLength: number): number {
  return Math.ceil(prefixLength / 8);
}

/**
 * Encode a single route to bytes
 * Format: prefix-length + significant-octets-of-network + gateway-ip
 */
function encodeRoute(route: StaticRoute): number[] {
  const { prefix, prefixLength } = parseCIDR(route.destination);
  const gatewayBytes = ipToBytes(route.gateway);

  if (gatewayBytes.length !== 4) {
    throw new Error(`Invalid gateway address: ${route.gateway}`);
  }

  const bytes: number[] = [];

  // Add prefix length
  bytes.push(prefixLength);

  // Add significant octets of network address
  const significantOctets = getSignificantOctets(prefixLength);
  const networkBytes = ipToBytes(prefix);

  for (let i = 0; i < significantOctets; i++) {
    bytes.push(networkBytes[i]);
  }

  // Add gateway address (all 4 octets)
  bytes.push(...gatewayBytes);

  return bytes;
}

/**
 * Decode routes from byte array
 */
function decodeRoutes(bytes: number[]): StaticRoute[] {
  const routes: StaticRoute[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    // Read prefix length
    const prefixLength = bytes[offset];
    offset++;

    if (prefixLength > 32) {
      throw new Error(`Invalid prefix length: ${prefixLength}`);
    }

    // Read significant octets
    const significantOctets = getSignificantOctets(prefixLength);
    if (offset + significantOctets + 4 > bytes.length) {
      throw new Error('Insufficient data for route entry');
    }

    const networkBytes: number[] = [];
    for (let i = 0; i < significantOctets; i++) {
      networkBytes.push(bytes[offset]);
      offset++;
    }

    // Pad with zeros to make full IP address
    while (networkBytes.length < 4) {
      networkBytes.push(0);
    }

    // Read gateway (4 octets)
    const gatewayBytes: number[] = [];
    for (let i = 0; i < 4; i++) {
      gatewayBytes.push(bytes[offset]);
      offset++;
    }

    const destination = `${bytesToIp(networkBytes)}/${prefixLength}`;
    const gateway = bytesToIp(gatewayBytes);

    routes.push({ destination, gateway });
  }

  return routes;
}

/**
 * Build Option 121/249 hex string from routes
 */
export function buildOption121(config: ClasslessRoutesConfig): ClasslessRoutesResult {
  // Validate routes
  for (const route of config.routes) {
    if (!route.destination.trim() || !route.gateway.trim()) {
      throw new Error('Route destination and gateway are required');
    }

    // Validate CIDR
    parseCIDR(route.destination);

    // Validate gateway
    if (!isValidIPv4(route.gateway)) {
      throw new Error(`Invalid gateway address: ${route.gateway}`);
    }
  }

  // Encode all routes
  const bytes: number[] = [];
  for (const route of config.routes) {
    bytes.push(...encodeRoute(route));
  }

  const hexEncoded = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  const wireFormat = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

  const examples = generateExamples(config, hexEncoded);

  return {
    hexEncoded,
    wireFormat,
    routes: config.routes,
    totalLength: bytes.length,
    examples,
  };
}

/**
 * Parse Option 121/249 hex string
 */
export function parseOption121(hexString: string): ParsedClasslessRoutes {
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

  try {
    const routes = decodeRoutes(bytes);

    return {
      routes,
      totalLength: bytes.length,
      rawHex: cleanHex,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid wire format: ${error.message}`);
    }
    throw new Error('Invalid wire format data');
  }
}

/**
 * Generate configuration examples for different DHCP servers
 */
function generateExamples(config: ClasslessRoutesConfig, hexEncoded: string): ClasslessRoutesResult['examples'] {
  const examples: ClasslessRoutesResult['examples'] = {};

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
  iscLines.push('# Classless Static Routes (Option 121)');
  iscLines.push('# RFC 3442 - routes for DHCP clients');
  iscLines.push('');
  iscLines.push(`subnet ${subnet} netmask ${netmask} {`);
  iscLines.push(`  range ${rangeStart} ${rangeEnd};`);
  iscLines.push('  ');
  iscLines.push('  # Define classless static routes');
  iscLines.push('  option rfc3442-classless-static-routes');

  // Format routes for ISC dhcpd (decimal format)
  const routeParts: string[] = [];
  for (const route of config.routes) {
    const { prefix, prefixLength } = parseCIDR(route.destination);
    const significantOctets = getSignificantOctets(prefixLength);
    const networkBytes = ipToBytes(prefix).slice(0, significantOctets);
    const gatewayBytes = ipToBytes(route.gateway);

    routeParts.push(prefixLength.toString());
    routeParts.push(...networkBytes.map((b) => b.toString()));
    routeParts.push(...gatewayBytes.map((b) => b.toString()));
  }
  iscLines.push(`    ${routeParts.join(', ')};`);
  iscLines.push('  ');
  iscLines.push('  # Alternative: Hex format');
  iscLines.push(`  # option rfc3442-classless-static-routes ${hexEncoded.match(/.{1,2}/g)?.join(':')};`);
  iscLines.push('}');

  examples.iscDhcpd = iscLines.join('\n');

  // Kea DHCPv4 example
  const keaLines: string[] = [];
  keaLines.push('// Classless Static Routes (Option 121)');
  keaLines.push('// RFC 3442 - static routes configuration');
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
  keaLines.push('        "option-data": [');
  keaLines.push('          {');
  keaLines.push('            "name": "classless-static-route",');
  keaLines.push('            "code": 121,');
  keaLines.push(`            "data": "${hexEncoded}"`);
  keaLines.push('          }');
  keaLines.push('        ]');
  keaLines.push('      }');
  keaLines.push('    ]');
  keaLines.push('  }');
  keaLines.push('}');

  examples.keaDhcp4 = keaLines.join('\n');

  // Microsoft Option 249 example
  const msftLines: string[] = [];
  msftLines.push('# Microsoft Classless Static Routes (Option 249)');
  msftLines.push('# Same format as Option 121, but uses code 249');
  msftLines.push('');
  msftLines.push(`subnet ${subnet} netmask ${netmask} {`);
  msftLines.push(`  range ${rangeStart} ${rangeEnd};`);
  msftLines.push('  ');
  msftLines.push('  # Microsoft format (Option 249)');
  msftLines.push('  option ms-classless-static-routes');
  msftLines.push(`    ${routeParts.join(', ')};`);
  msftLines.push('}');

  examples.msftOption249 = msftLines.join('\n');

  return examples;
}

/**
 * Get default config
 */
export function getDefaultOption121Config(): ClasslessRoutesConfig {
  return {
    routes: [
      { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
      { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
    ],
  };
}

/**
 * Common route examples
 */
export const CLASSLESS_ROUTES_EXAMPLES = [
  {
    label: 'Private Networks',
    routes: [
      { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
      { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
    ],
  },
  {
    label: 'Default + Specific',
    routes: [
      { destination: '0.0.0.0/0', gateway: '192.168.1.1' },
      { destination: '10.10.0.0/16', gateway: '192.168.1.254' },
    ],
  },
  {
    label: 'Multi-site VPN',
    routes: [
      { destination: '10.1.0.0/16', gateway: '192.168.1.10' },
      { destination: '10.2.0.0/16', gateway: '192.168.1.20' },
      { destination: '10.3.0.0/16', gateway: '192.168.1.30' },
    ],
  },
];
