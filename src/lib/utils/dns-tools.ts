/* DNS Tools Utilities */

export interface PTRResult {
  ptr?: string;
  ip?: string;
  error?: string;
}

export interface PTRRecordsResult {
  records: string[];
  template: string;
  totalRecords: number;
  error?: string;
}

export interface ReverseZoneResult {
  zones: string[];
  cidr: string;
  ipVersion: 4 | 6;
  totalZones: number;
  error?: string;
}

/**
 * Generate PTR record name for a single IP address
 */
export function generatePTRName(ip: string): PTRResult {
  try {
    // Validate and determine IP version
    const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
    const isIPv6 = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/.test(ip) || ip.includes('::');

    if (!isIPv4 && !isIPv6) {
      return { error: 'Invalid IP address format' };
    }

    if (isIPv4) {
      // IPv4 PTR: reverse octets and add .in-addr.arpa
      const octets = ip.split('.');

      // Validate octets
      for (const octet of octets) {
        const num = parseInt(octet, 10);
        if (isNaN(num) || num < 0 || num > 255) {
          return { error: 'Invalid IPv4 address' };
        }
      }

      const reversed = octets.reverse().join('.');
      return { ptr: `${reversed}.in-addr.arpa`, ip };
    } else {
      // IPv6 PTR: expand, reverse nibbles, add .ip6.arpa
      const expanded = expandIPv6(ip);
      const nibbles = expanded.replace(/:/g, '');
      const reversed = nibbles.split('').reverse().join('.');
      return { ptr: `${reversed}.ip6.arpa`, ip };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip,
    };
  }
}

/**
 * Generate PTR records for a CIDR block
 */
export function generateCIDRPTRs(cidr: string, template?: string): PTRRecordsResult {
  try {
    const parts = cidr.split('/');
    if (parts.length !== 2) {
      return {
        records: [],
        template: template || '',
        totalRecords: 0,
        error: 'Invalid CIDR format',
      };
    }

    const ip = parts[0];
    const prefix = parseInt(parts[1], 10);
    const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);

    if (isIPv4) {
      return generateIPv4PTRRecords(ip, prefix, template);
    } else {
      return generateIPv6PTRRecords(ip, prefix, template);
    }
  } catch (error) {
    return {
      records: [],
      template: template || '',
      totalRecords: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate IPv4 PTR records for a subnet
 */
function generateIPv4PTRRecords(ip: string, prefix: number, template?: string): PTRRecordsResult {
  const records: string[] = [];
  const octets = ip.split('.').map(Number);

  // Validate prefix
  if (prefix < 8 || prefix > 32) {
    return {
      records: [],
      template: template || '',
      totalRecords: 0,
      error: 'IPv4 prefix must be between /8 and /32 for PTR generation',
    };
  }

  // Calculate network address
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const ipNum = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
  const networkNum = (ipNum & mask) >>> 0;

  // Calculate how many addresses to generate
  const hostBits = 32 - prefix;
  const maxAddresses = Math.min(Math.pow(2, hostBits), 256); // Limit for performance

  for (let i = 0; i < maxAddresses; i++) {
    const addressNum = networkNum + i;
    const currentOctets = [
      (addressNum >>> 24) & 0xff,
      (addressNum >>> 16) & 0xff,
      (addressNum >>> 8) & 0xff,
      addressNum & 0xff,
    ];

    const currentIP = currentOctets.join('.');
    const ptrResult = generatePTRName(currentIP);

    if (ptrResult.ptr) {
      const hostname = template
        ? template.replace('{ip}', currentIP).replace('{octets}', currentOctets.join('-'))
        : `host-${currentOctets.join('-')}`;

      records.push(`${ptrResult.ptr} IN PTR ${hostname}.`);
    }
  }

  return {
    records,
    template: template || 'host-{octets}',
    totalRecords: records.length,
  };
}

/**
 * Generate IPv6 PTR records for a subnet (limited scope)
 */
function generateIPv6PTRRecords(ip: string, prefix: number, template?: string): PTRRecordsResult {
  // IPv6 PTR generation for large subnets is impractical
  // Only generate for /120 and higher (256 addresses or fewer)

  if (prefix < 120) {
    return {
      records: [],
      template: template || '',
      totalRecords: 0,
      error: 'IPv6 PTR generation only supported for /120 and higher prefixes',
    };
  }

  const records: string[] = [];
  const expanded = expandIPv6(ip);
  const groups = expanded.split(':').map((g) => parseInt(g, 16));

  // For /120 and higher, only vary the last 8 bits
  const hostBits = 128 - prefix;
  const maxAddresses = Math.min(Math.pow(2, hostBits), 256);

  for (let i = 0; i < maxAddresses; i++) {
    // Modify the last group
    const newGroups = [...groups];
    newGroups[7] = (newGroups[7] & (0xffff << hostBits)) | i;

    const currentIP = newGroups.map((g) => g.toString(16).padStart(4, '0')).join(':');
    const compressed = compressIPv6(currentIP);
    const ptrResult = generatePTRName(compressed);

    if (ptrResult.ptr) {
      const hostname = template
        ? template.replace('{ip}', compressed).replace('{index}', i.toString())
        : `host-${i.toString().padStart(3, '0')}`;

      records.push(`${ptrResult.ptr} IN PTR ${hostname}.`);
    }
  }

  return {
    records,
    template: template || 'host-{index}',
    totalRecords: records.length,
  };
}

/**
 * Calculate required reverse DNS zones for a CIDR block
 */
export function calculateReverseZones(cidr: string): ReverseZoneResult {
  try {
    const parts = cidr.split('/');
    if (parts.length !== 2) {
      return {
        zones: [],
        cidr,
        ipVersion: 4,
        totalZones: 0,
        error: 'Invalid CIDR format',
      };
    }

    const ip = parts[0];
    const prefix = parseInt(parts[1], 10);
    const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);

    if (isIPv4) {
      return calculateIPv4ReverseZones(ip, prefix, cidr);
    } else {
      return calculateIPv6ReverseZones(ip, prefix, cidr);
    }
  } catch (error) {
    return {
      zones: [],
      cidr,
      ipVersion: 4,
      totalZones: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate IPv4 reverse zones
 */
function calculateIPv4ReverseZones(ip: string, prefix: number, cidr: string): ReverseZoneResult {
  const zones: string[] = [];
  const octets = ip.split('.').map(Number);

  // Calculate network address
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const ipNum = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
  const networkNum = (ipNum & mask) >>> 0;

  const networkOctets = [
    (networkNum >>> 24) & 0xff,
    (networkNum >>> 16) & 0xff,
    (networkNum >>> 8) & 0xff,
    networkNum & 0xff,
  ];

  if (prefix >= 24) {
    // Single /24 zone or smaller
    const zoneOctets = networkOctets.slice(0, 3).reverse();
    zones.push(`${zoneOctets.join('.')}.in-addr.arpa`);
  } else if (prefix >= 16) {
    // Multiple /24 zones within a /16
    const numZones = Math.pow(2, 24 - prefix);
    const baseOctets = networkOctets.slice(0, 2).reverse();

    for (let i = 0; i < numZones; i++) {
      const thirdOctet = networkOctets[2] + i;
      zones.push(`${thirdOctet}.${baseOctets.join('.')}.in-addr.arpa`);
    }
  } else if (prefix >= 8) {
    // Multiple /16 zones within a /8
    const numZones = Math.pow(2, 16 - prefix);
    const firstOctet = networkOctets[0];

    for (let i = 0; i < numZones; i++) {
      const secondOctet = networkOctets[1] + Math.floor(i / 256);
      const thirdOctet = (networkOctets[2] + i) % 256;
      zones.push(`${thirdOctet}.${secondOctet}.${firstOctet}.in-addr.arpa`);
    }
  } else {
    // Very large networks - show /8 zone
    zones.push(`${networkOctets[0]}.in-addr.arpa (/8 network)`);
  }

  return {
    zones,
    cidr,
    ipVersion: 4,
    totalZones: zones.length,
  };
}

/**
 * Calculate IPv6 reverse zones
 */
function calculateIPv6ReverseZones(ip: string, prefix: number, cidr: string): ReverseZoneResult {
  const zones: string[] = [];
  const expanded = expandIPv6(ip);
  const nibbles = expanded.replace(/:/g, '');

  // IPv6 reverse zones are typically on 4-bit boundaries
  const nibblePrefix = Math.floor(prefix / 4);

  if (nibblePrefix * 4 !== prefix) {
    return {
      zones: [],
      cidr,
      ipVersion: 6,
      totalZones: 0,
      error: `IPv6 reverse zones work best on 4-bit boundaries. /${prefix} is not aligned.`,
    };
  }

  const networkNibbles = nibbles.substring(0, nibblePrefix);
  const reversedNibbles = networkNibbles.split('').reverse().join('.');

  if (reversedNibbles) {
    zones.push(`${reversedNibbles}.ip6.arpa`);
  } else {
    zones.push('ip6.arpa');
  }

  return {
    zones,
    cidr,
    ipVersion: 6,
    totalZones: zones.length,
  };
}

/**
 * Helper function to expand IPv6 addresses
 */
function expandIPv6(address: string): string {
  // Remove prefix if present
  const cleanAddress = address.split('/')[0];

  // Handle :: compression
  if (cleanAddress.includes('::')) {
    const parts = cleanAddress.split('::');
    const leftParts = parts[0] ? parts[0].split(':') : [];
    const rightParts = parts[1] ? parts[1].split(':') : [];

    // Calculate missing groups
    const missingGroups = 8 - leftParts.length - rightParts.length;
    const middleParts = Array(missingGroups).fill('0000');

    const allParts = [...leftParts, ...middleParts, ...rightParts];
    return allParts.map((part) => part.padStart(4, '0')).join(':');
  }

  // Already expanded or no compression
  return cleanAddress
    .split(':')
    .map((part) => part.padStart(4, '0'))
    .join(':');
}

/**
 * Helper function to compress IPv6 addresses
 */
function compressIPv6(address: string): string {
  const expanded = expandIPv6(address);
  const groups = expanded.split(':');

  // Remove leading zeros from each group
  const trimmedGroups = groups.map((group) => group.replace(/^0+/, '') || '0');

  // Find longest sequence of consecutive zeros
  let longestStart = -1;
  let longestLength = 0;
  let currentStart = -1;
  let currentLength = 0;

  for (let i = 0; i < trimmedGroups.length; i++) {
    if (trimmedGroups[i] === '0') {
      if (currentStart === -1) {
        currentStart = i;
        currentLength = 1;
      } else {
        currentLength++;
      }
    } else {
      if (currentLength > longestLength) {
        longestStart = currentStart;
        longestLength = currentLength;
      }
      currentStart = -1;
      currentLength = 0;
    }
  }

  // Check final sequence
  if (currentLength > longestLength) {
    longestStart = currentStart;
    longestLength = currentLength;
  }

  // Only compress if we have 2 or more consecutive zeros
  if (longestLength >= 2) {
    const beforeZeros = trimmedGroups.slice(0, longestStart);
    const afterZeros = trimmedGroups.slice(longestStart + longestLength);

    if (beforeZeros.length === 0 && afterZeros.length === 0) {
      return '::';
    } else if (beforeZeros.length === 0) {
      return '::' + afterZeros.join(':');
    } else if (afterZeros.length === 0) {
      return beforeZeros.join(':') + '::';
    } else {
      return beforeZeros.join(':') + '::' + afterZeros.join(':');
    }
  }

  return trimmedGroups.join(':');
}
