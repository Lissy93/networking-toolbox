/**
 * IPv4/IPv6 Conversion Utilities
 */

export interface ConversionResult {
  success: boolean;
  result?: string;
  error?: string;
  type?: string;
  details?: Record<string, any>;
}

/**
 * Validates IPv4 address format
 */
export function validateIPv4(ip: string): { valid: boolean; error?: string } {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  if (!ipv4Regex.test(ip)) {
    return { valid: false, error: 'Invalid IPv4 format' };
  }

  return { valid: true };
}

/**
 * Validates IPv6 address format
 */
export function validateIPv6(ip: string): { valid: boolean; error?: string } {
  // Remove brackets if present
  const cleanIp = ip.replace(/^\[|\]$/g, '');

  // Check for invalid patterns first
  if (
    cleanIp.includes(':::') ||
    (cleanIp.startsWith(':') && !cleanIp.startsWith('::')) ||
    (cleanIp.endsWith(':') && !cleanIp.endsWith('::'))
  ) {
    return { valid: false, error: 'Invalid IPv6 format' };
  }

  // Check for IPv4-mapped IPv6 (::ffff:192.0.2.1)
  const ipv4MappedRegex =
    /^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i;
  if (ipv4MappedRegex.test(cleanIp)) {
    return { valid: true };
  }

  // More flexible IPv6 validation
  try {
    // Simple but effective validation approach
    if (cleanIp === '::' || cleanIp === '::1') {
      return { valid: true };
    }

    // Split on :: to handle compression
    const parts = cleanIp.split('::');
    if (parts.length > 2) {
      return { valid: false, error: 'Invalid IPv6 format' };
    }

    if (parts.length === 2) {
      // Has compression
      const leftParts = parts[0] ? parts[0].split(':') : [];
      const rightParts = parts[1] ? parts[1].split(':') : [];

      // Check total parts don't exceed 8
      if (leftParts.length + rightParts.length >= 8) {
        return { valid: false, error: 'Invalid IPv6 format' };
      }

      // Validate each part
      const allParts = [...leftParts, ...rightParts];
      for (const part of allParts) {
        if (part && !/^[0-9a-fA-F]{1,4}$/.test(part)) {
          return { valid: false, error: 'Invalid IPv6 format' };
        }
      }
    } else {
      // No compression, must have exactly 8 parts
      const ipParts = cleanIp.split(':');
      if (ipParts.length !== 8) {
        return { valid: false, error: 'Invalid IPv6 format' };
      }

      // Validate each part
      for (const part of ipParts) {
        if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
          return { valid: false, error: 'Invalid IPv6 format' };
        }
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid IPv6 format' };
  }
}

/**
 * Convert IPv4 to IPv6 (IPv4-mapped IPv6)
 */
export function ipv4ToIPv6(ipv4: string): ConversionResult {
  const validation = validateIPv4(ipv4);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const octets = ipv4.split('.').map(Number);
  const hex1 = ((octets[0] << 8) + octets[1]).toString(16).padStart(4, '0');
  const hex2 = ((octets[2] << 8) + octets[3]).toString(16).padStart(4, '0');

  const mappedIPv6 = `::ffff:${hex1}:${hex2}`;
  const expandedIPv6 = `0000:0000:0000:0000:0000:ffff:${hex1}:${hex2}`;

  return {
    success: true,
    result: mappedIPv6,
    type: 'IPv4-mapped IPv6',
    details: {
      compressed: mappedIPv6,
      expanded: expandedIPv6,
      dotted: `::ffff:${ipv4}`,
      original: ipv4,
      description: 'IPv4-mapped IPv6 address allowing IPv4 addresses to be represented in IPv6 format',
    },
  };
}

/**
 * Convert IPv6 to IPv4 (extract from IPv4-mapped IPv6)
 */
export function ipv6ToIPv4(ipv6: string): ConversionResult {
  const validation = validateIPv6(ipv6);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const cleanIp = ipv6.replace(/^\[|\]$/g, '').toLowerCase();

  // Check if it's IPv4-mapped IPv6
  const ipv4MappedMatch = cleanIp.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  const ipv4DottedMatch = cleanIp.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i);

  if (ipv4MappedMatch) {
    // Format: ::ffff:c000:0201
    const hex1 = parseInt(ipv4MappedMatch[1], 16);
    const hex2 = parseInt(ipv4MappedMatch[2], 16);

    const octet1 = (hex1 >> 8) & 0xff;
    const octet2 = hex1 & 0xff;
    const octet3 = (hex2 >> 8) & 0xff;
    const octet4 = hex2 & 0xff;

    const ipv4 = `${octet1}.${octet2}.${octet3}.${octet4}`;

    return {
      success: true,
      result: ipv4,
      type: 'Extracted from IPv4-mapped IPv6',
      details: {
        ipv4: ipv4,
        original: ipv6,
        hex1: ipv4MappedMatch[1],
        hex2: ipv4MappedMatch[2],
        description: 'IPv4 address extracted from IPv4-mapped IPv6 format',
      },
    };
  } else if (ipv4DottedMatch) {
    // Format: ::ffff:192.0.2.1
    const ipv4 = `${ipv4DottedMatch[1]}.${ipv4DottedMatch[2]}.${ipv4DottedMatch[3]}.${ipv4DottedMatch[4]}`;

    return {
      success: true,
      result: ipv4,
      type: 'Extracted from IPv4-mapped IPv6',
      details: {
        ipv4: ipv4,
        original: ipv6,
        description: 'IPv4 address extracted from dotted IPv4-mapped IPv6 format',
      },
    };
  }

  return {
    success: false,
    error:
      'This IPv6 address is not IPv4-mapped. Only IPv4-mapped IPv6 addresses (::ffff:x.x.x.x) can be converted to IPv4.',
    details: {
      original: ipv6,
      suggestion: 'Use an IPv4-mapped IPv6 address like ::ffff:192.0.2.1 or ::ffff:c000:0201',
    },
  };
}

interface IPv6Info {
  original: string;
  cleaned: string;
  types: string[];
  description?: string;
  [key: string]: unknown;
}

/**
 * Get IPv6 address information and types
 */
export function getIPv6Info(ipv6: string): IPv6Info {
  const cleanIp = ipv6.replace(/^\[|\]$/g, '').toLowerCase();

  const info: IPv6Info = {
    original: ipv6,
    cleaned: cleanIp,
    types: [],
  };

  if (cleanIp === '::1') {
    info.types.push('Loopback');
    info.description = 'IPv6 loopback address (equivalent to 127.0.0.1 in IPv4)';
  } else if (cleanIp === '::') {
    info.types.push('Unspecified');
    info.description = 'IPv6 unspecified address (equivalent to 0.0.0.0 in IPv4)';
  } else if (cleanIp.startsWith('::ffff:')) {
    info.types.push('IPv4-mapped');
    info.description = 'IPv4-mapped IPv6 address for representing IPv4 addresses in IPv6 format';
  } else if (cleanIp.startsWith('fe80:')) {
    info.types.push('Link-local');
    info.description = 'Link-local IPv6 address for communication within a single network segment';
  } else if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) {
    info.types.push('Unique Local');
    info.description = 'Unique local IPv6 address (equivalent to private IPv4 addresses)';
  } else if (cleanIp.startsWith('ff')) {
    info.types.push('Multicast');
    info.description = 'IPv6 multicast address for one-to-many communication';
  } else {
    info.types.push('Global Unicast');
    info.description = 'Global unicast IPv6 address for internet communication';
  }

  return info;
}

/**
 * Expand compressed IPv6 address to full format
 */
export function expandIPv6(ipv6: string): string {
  const cleanIp = ipv6.replace(/^\[|\]$/g, '');

  // Handle :: expansion
  if (cleanIp.includes('::')) {
    const parts = cleanIp.split('::');
    const leftParts = parts[0] ? parts[0].split(':') : [];
    const rightParts = parts[1] ? parts[1].split(':') : [];
    const missingParts = 8 - leftParts.length - rightParts.length;

    const fullParts = [
      ...leftParts.map((p) => p.padStart(4, '0')),
      ...Array(missingParts).fill('0000'),
      ...rightParts.map((p) => p.padStart(4, '0')),
    ];

    return fullParts.join(':');
  }

  // Already expanded, just pad each part
  return cleanIp
    .split(':')
    .map((part) => part.padStart(4, '0'))
    .join(':');
}

/**
 * Compress IPv6 address to shortest format
 */
export function compressIPv6(ipv6: string): string {
  const expanded = expandIPv6(ipv6);
  const parts = expanded.split(':');

  // Remove leading zeros
  const trimmed = parts.map((part) => part.replace(/^0+/, '') || '0');

  // Find longest sequence of consecutive zeros
  let longestZeroStart = -1;
  let longestZeroLength = 0;
  let currentZeroStart = -1;
  let currentZeroLength = 0;

  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '0') {
      if (currentZeroStart === -1) {
        currentZeroStart = i;
        currentZeroLength = 1;
      } else {
        currentZeroLength++;
      }
    } else {
      if (currentZeroLength > longestZeroLength) {
        longestZeroStart = currentZeroStart;
        longestZeroLength = currentZeroLength;
      }
      currentZeroStart = -1;
      currentZeroLength = 0;
    }
  }

  // Check final sequence
  if (currentZeroLength > longestZeroLength) {
    longestZeroStart = currentZeroStart;
    longestZeroLength = currentZeroLength;
  }

  // Replace longest zero sequence with ::
  if (longestZeroLength > 1) {
    const before = trimmed.slice(0, longestZeroStart).join(':');
    const after = trimmed.slice(longestZeroStart + longestZeroLength).join(':');

    if (before && after) {
      return `${before}::${after}`;
    } else if (before) {
      return `${before}::`;
    } else if (after) {
      return `::${after}`;
    } else {
      return '::';
    }
  }

  return trimmed.join(':');
}
