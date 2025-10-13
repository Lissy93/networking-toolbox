import type { ValidationResult } from '../types/ip.js';

// Extended interfaces for comprehensive IP validation
export interface IPValidationResult {
  isValid: boolean;
  type: 'ipv4' | 'ipv6' | null;
  errors: string[];
  warnings: string[];
  details: {
    normalizedForm?: string;
    addressType?: string;
    scope?: string;
    isPrivate?: boolean;
    isReserved?: boolean;
    info?: string[];
    compressedForm?: string;
    embeddedIPv4?: string;
    zoneId?: string;
    hasEmbeddedIPv4?: boolean;
  };
}

export interface IPTestCase {
  label: string;
  value: string;
  valid: boolean;
}

interface DetailedValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    info: string[];
    normalizedForm?: string;
    addressType?: string;
    scope?: string;
    isPrivate?: boolean;
    isReserved?: boolean;
    compressedForm?: string;
    embeddedIPv4?: string;
    zoneId?: string;
    hasEmbeddedIPv4?: boolean;
  };
}

export const DEFAULT_TEST_CASES: IPTestCase[] = [
  { label: 'Valid IPv4', value: '192.168.1.1', valid: true },
  { label: 'Valid IPv6', value: '2001:db8::1', valid: true },
  { label: 'IPv4 with leading zeros', value: '192.168.001.001', valid: false },
  { label: 'IPv4 octet too large', value: '192.168.1.256', valid: false },
  { label: 'IPv6 with multiple ::', value: '2001::db8::1', valid: false },
  { label: 'IPv6 too many groups', value: '2001:db8:85a3:0000:0000:8a2e:0370:7334:extra', valid: false },
];

/**
 * Simple IPv4 validation (backward compatibility)
 */
export function validateIPv4(ip: string): ValidationResult {
  if (!ip || typeof ip !== 'string') {
    return { valid: false, error: 'IP address is required' };
  }

  const octets = ip.trim().split('.');

  if (octets.length !== 4) {
    return { valid: false, error: 'IPv4 address must have 4 octets' };
  }

  for (let i = 0; i < octets.length; i++) {
    const octet = octets[i];

    if (!/^\d+$/.test(octet)) {
      return { valid: false, error: `Octet ${i + 1} contains non-numeric characters` };
    }

    const num = parseInt(octet, 10);

    if (num < 0 || num > 255) {
      return { valid: false, error: `Octet ${i + 1} must be between 0-255` };
    }

    if (octet.length > 1 && octet[0] === '0') {
      return { valid: false, error: `Octet ${i + 1} has leading zeros` };
    }
  }

  return { valid: true };
}

/**
 * Comprehensive IPv4 validation with detailed analysis
 */
export function validateIPv4Detailed(ip: string): DetailedValidationResponse {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: DetailedValidationResponse['details'] = { info: [] };

  // Check basic format
  if (!ip.includes('.')) {
    errors.push('IPv4 addresses must contain dots (.) to separate octets');
    return { isValid: false, errors, warnings, details };
  }

  const parts = ip.split('.');

  // Check number of octets
  if (parts.length !== 4) {
    errors.push(`IPv4 addresses must have exactly 4 octets, found ${parts.length}`);
    return { isValid: false, errors, warnings, details };
  }

  const octets: number[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const octetNum = i + 1;

    // Check if empty
    if (part === '') {
      errors.push(`Octet ${octetNum} is empty`);
      continue;
    }

    // Check for non-numeric characters
    if (!/^\d+$/.test(part)) {
      errors.push(`Octet ${octetNum} contains non-numeric characters: "${part}"`);
      continue;
    }

    // Check for leading zeros (except for single zero)
    if (part.length > 1 && part[0] === '0') {
      errors.push(`Octet ${octetNum} has leading zeros: "${part}" (should be "${parseInt(part)})")`);
      continue;
    }

    // Parse and validate range
    const value = parseInt(part, 10);
    if (isNaN(value)) {
      errors.push(`Octet ${octetNum} is not a valid number: "${part}"`);
      continue;
    }

    if (value < 0 || value > 255) {
      errors.push(`Octet ${octetNum} out of range: ${value} (must be 0-255)`);
      continue;
    }

    octets.push(value);
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings, details };
  }

  // Additional analysis for valid IPs
  const [a, b, c, d] = octets;
  details.normalizedForm = `${a}.${b}.${c}.${d}`;

  // Determine address type and scope
  if (a === 127) {
    details.addressType = 'Loopback';
    details.scope = 'Host';
    details.info.push('Loopback address (localhost)');
  } else if (a === 10) {
    details.addressType = 'Private (Class A)';
    details.scope = 'Private Network';
    details.isPrivate = true;
    details.info.push('RFC 1918 private address space');
  } else if (a === 172 && b >= 16 && b <= 31) {
    details.addressType = 'Private (Class B)';
    details.scope = 'Private Network';
    details.isPrivate = true;
    details.info.push('RFC 1918 private address space');
  } else if (a === 192 && b === 168) {
    details.addressType = 'Private (Class C)';
    details.scope = 'Private Network';
    details.isPrivate = true;
    details.info.push('RFC 1918 private address space');
  } else if (a === 169 && b === 254) {
    details.addressType = 'Link-Local (APIPA)';
    details.scope = 'Link-Local';
    details.isReserved = true;
    details.info.push('Link-local address (APIPA)');
  } else if (a >= 224 && a <= 239) {
    details.addressType = 'Multicast (Class D)';
    details.scope = 'Multicast';
    details.isReserved = true;
    details.info.push('Multicast address');
  } else if (a >= 240) {
    details.addressType = 'Reserved (Class E)';
    details.scope = 'Reserved';
    details.isReserved = true;
    details.info.push('Reserved for future use');
  } else if (a === 0) {
    details.addressType = 'Network Address';
    details.scope = 'Special Use';
    details.isReserved = true;
    details.info.push('"This network" address');
  } else if (d === 0) {
    details.addressType = 'Network Address';
    details.scope = 'Network';
    warnings.push('This appears to be a network address (host portion is 0)');
  } else if (d === 255) {
    details.addressType = 'Broadcast Address';
    details.scope = 'Network';
    warnings.push('This appears to be a broadcast address (host portion is all 1s)');
  } else {
    details.addressType = 'Public';
    details.scope = 'Internet';
    details.isPrivate = false;
    details.info.push('Publicly routable address');
  }

  return { isValid: true, errors: [], warnings, details };
}

/**
 * Comprehensive IPv6 validation with detailed analysis
 */
export function validateIPv6Detailed(ip: string): DetailedValidationResponse {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: DetailedValidationResponse['details'] = { info: [] };

  // Check for zone ID (remove it for validation but note it)
  let cleanIP = ip;
  let zoneId = '';
  if (ip.includes('%')) {
    const parts = ip.split('%');
    if (parts.length > 2) {
      errors.push('Multiple % symbols found - invalid zone ID format');
      return { isValid: false, errors, warnings, details };
    }
    cleanIP = parts[0];
    zoneId = parts[1];
    details.zoneId = zoneId;
    details.info.push(`Zone ID specified: %${zoneId}`);
  }

  // Check for :: (compression)
  const doubleColonCount = (cleanIP.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    errors.push('Multiple :: sequences found - only one :: allowed per address');
    return { isValid: false, errors, warnings, details };
  }

  // Check for embedded IPv4 first
  const ipv4Pattern = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
  const ipv4Match = cleanIP.match(ipv4Pattern);

  if (ipv4Match) {
    // Validate the IPv4 part
    const ipv4Part = ipv4Match[0];
    const ipv4Result = validateIPv4Detailed(ipv4Part);

    if (!ipv4Result.isValid) {
      errors.push(`Invalid embedded IPv4 address: ${ipv4Result.errors.join(', ')}`);
      return { isValid: false, errors, warnings, details };
    }

    details.hasEmbeddedIPv4 = true;
    details.embeddedIPv4 = ipv4Part;
    details.info.push(`Contains embedded IPv4 address: ${ipv4Part}`);

    // Convert IPv4 to two IPv6 groups for validation
    const [, a, b, c, d] = ipv4Match;
    const group1 = ((parseInt(a) << 8) + parseInt(b)).toString(16).padStart(4, '0');
    const group2 = ((parseInt(c) << 8) + parseInt(d)).toString(16).padStart(4, '0');

    // Replace IPv4 with IPv6 groups for further processing
    cleanIP = cleanIP.replace(ipv4Pattern, `${group1}:${group2}`);
  }

  // Handle :: expansion
  let expandedIP = cleanIP;
  if (cleanIP.includes('::')) {
    const parts = cleanIP.split('::');
    if (parts.length > 2) {
      errors.push('Invalid :: usage - malformed compression');
      return { isValid: false, errors, warnings, details };
    }

    const leftParts = parts[0] ? parts[0].split(':') : [];
    const rightParts = parts[1] ? parts[1].split(':') : [];

    // Calculate how many groups to insert
    const totalParts = leftParts.length + rightParts.length;
    const missingGroups = 8 - totalParts;

    if (missingGroups < 0) {
      errors.push('Too many groups in compressed IPv6 address');
      return { isValid: false, errors, warnings, details };
    }

    const middleParts = Array(missingGroups).fill('0000');
    const allParts = [...leftParts, ...middleParts, ...rightParts];
    expandedIP = allParts.join(':');
  }

  // Split into groups and validate
  const groups = expandedIP.split(':');

  if (groups.length !== 8) {
    if (!cleanIP.includes('::')) {
      errors.push(`IPv6 addresses must have 8 groups, found ${groups.length} (use :: for compression)`);
    } else {
      errors.push(`Invalid IPv6 compression - results in ${groups.length} groups instead of 8`);
    }
    return { isValid: false, errors, warnings, details };
  }

  // Validate each group
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupNum = i + 1;

    if (group === '') {
      errors.push(`Group ${groupNum} is empty`);
      continue;
    }

    if (group.length > 4) {
      errors.push(`Group ${groupNum} too long: "${group}" (max 4 hex digits)`);
      continue;
    }

    if (!/^[0-9a-fA-F]+$/.test(group)) {
      errors.push(`Group ${groupNum} contains invalid characters: "${group}" (only 0-9, a-f, A-F allowed)`);
      continue;
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings, details };
  }

  // Normalize the address
  const normalizedGroups = groups.map((group) => group.toLowerCase().padStart(4, '0'));
  const fullForm = normalizedGroups.join(':');
  details.normalizedForm = zoneId ? `${fullForm}%${zoneId}` : fullForm;

  // Analyze address type
  const firstGroup = normalizedGroups[0];
  const firstTwoGroups = normalizedGroups.slice(0, 2).join(':');

  if (fullForm === '0000:0000:0000:0000:0000:0000:0000:0001') {
    details.addressType = 'Loopback';
    details.scope = 'Host';
    details.isReserved = true;
    details.info.push('IPv6 loopback address (::1)');
  } else if (fullForm === '0000:0000:0000:0000:0000:0000:0000:0000') {
    details.addressType = 'Unspecified';
    details.scope = 'Special Use';
    details.isReserved = true;
    details.info.push('IPv6 unspecified address (::)');
  } else if (firstGroup === 'fe80') {
    details.addressType = 'Link-Local';
    details.scope = 'Link-Local';
    details.info.push('IPv6 link-local address');
  } else if (firstGroup === 'fec0') {
    details.addressType = 'Site-Local (Deprecated)';
    details.scope = 'Site-Local';
    details.info.push('Deprecated site-local address');
    warnings.push('Site-local addresses are deprecated (RFC 3879)');
  } else if (firstGroup.startsWith('fc') || firstGroup.startsWith('fd')) {
    details.addressType = 'Unique Local';
    details.scope = 'Private Network';
    details.isPrivate = true;
    details.info.push('RFC 4193 Unique Local Address');
  } else if (firstGroup.startsWith('ff')) {
    details.addressType = 'Multicast';
    details.scope = 'Multicast';
    details.info.push('IPv6 multicast address');
  } else if (firstTwoGroups === '2001' && normalizedGroups[1] === '0db8') {
    details.addressType = 'Documentation';
    details.scope = 'Documentation';
    details.isReserved = true;
    details.info.push('RFC 3849 documentation address');
    warnings.push('This is a documentation address (not for production use)');
  } else if (firstGroup >= '2000' && firstGroup <= '3fff') {
    details.addressType = 'Global Unicast';
    details.scope = 'Internet';
    details.isPrivate = false;
    details.info.push('Globally routable IPv6 address');
  } else {
    details.addressType = 'Reserved';
    details.scope = 'Reserved';
    details.isReserved = true;
    details.info.push('Reserved address space');
  }

  // Check for compressed form
  if (cleanIP.includes('::')) {
    const compressedForm = compressIPv6(fullForm);
    details.compressedForm = compressedForm;
    if (cleanIP !== compressedForm) {
      details.info.push(`Standard compressed form: ${compressedForm}`);
    }
  }

  return { isValid: true, errors: [], warnings, details };
}

/**
 * Compresses an IPv6 address to its shortest form
 */
export function compressIPv6(fullForm: string): string {
  // If already compressed, return as-is
  if (fullForm.includes('::')) {
    // Just remove leading zeros from groups and return
    return fullForm
      .split(':')
      .map((group) => {
        if (group === '') return '';
        return group.replace(/^0+/, '') || '0';
      })
      .join(':');
  }

  // Find the longest sequence of consecutive zero groups
  const groups = fullForm.split(':');
  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;
  let currentLength = 0;

  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === '0000' || groups[i] === '0') {
      if (currentStart === -1) {
        currentStart = i;
        currentLength = 1;
      } else {
        currentLength++;
      }
    } else {
      if (currentLength > bestLength && currentLength > 1) {
        bestStart = currentStart;
        bestLength = currentLength;
      }
      currentStart = -1;
      currentLength = 0;
    }
  }

  // Check final sequence
  if (currentLength > bestLength && currentLength > 1) {
    bestStart = currentStart;
    bestLength = currentLength;
  }

  // Apply compression
  let result = groups.map((group) => group.replace(/^0+/, '') || '0').join(':');

  if (bestStart !== -1) {
    const beforeZeros = groups.slice(0, bestStart).map((group) => group.replace(/^0+/, '') || '0');
    const afterZeros = groups.slice(bestStart + bestLength).map((group) => group.replace(/^0+/, '') || '0');

    if (beforeZeros.length === 0) {
      result = '::' + afterZeros.join(':');
    } else if (afterZeros.length === 0) {
      result = beforeZeros.join(':') + '::';
    } else {
      result = beforeZeros.join(':') + '::' + afterZeros.join(':');
    }
  }

  return result;
}

/**
 * Comprehensive IP validation that auto-detects IPv4 vs IPv6
 */
export function validateIP(input: string): IPValidationResult | null {
  if (!input.trim()) {
    return null;
  }

  const trimmed = input.trim();

  // Determine if this looks like IPv4 or IPv6
  const hasColons = trimmed.includes(':');
  const hasDots = trimmed.includes('.');

  if (hasColons && hasDots) {
    // Could be IPv6 with embedded IPv4
    const ipv6Result = validateIPv6Detailed(trimmed);
    return {
      isValid: ipv6Result.isValid,
      type: 'ipv6',
      errors: ipv6Result.errors,
      warnings: ipv6Result.warnings,
      details: ipv6Result.details,
    };
  } else if (hasColons) {
    // IPv6
    const ipv6Result = validateIPv6Detailed(trimmed);
    return {
      isValid: ipv6Result.isValid,
      type: 'ipv6',
      errors: ipv6Result.errors,
      warnings: ipv6Result.warnings,
      details: ipv6Result.details,
    };
  } else if (hasDots) {
    // IPv4
    const ipv4Result = validateIPv4Detailed(trimmed);
    return {
      isValid: ipv4Result.isValid,
      type: 'ipv4',
      errors: ipv4Result.errors,
      warnings: ipv4Result.warnings,
      details: ipv4Result.details,
    };
  } else {
    // Neither format detected
    return {
      isValid: false,
      type: null,
      errors: ['Input does not appear to be an IP address (no dots or colons found)'],
      warnings: [],
      details: {},
    };
  }
}

/**
 * Utility function to check if an IP address is private
 */
export function isPrivateIP(ip: string): boolean {
  const result = validateIP(ip);
  return result?.details.isPrivate === true;
}

/**
 * Utility function to check if an IP address is reserved
 */
export function isReservedIP(ip: string): boolean {
  const result = validateIP(ip);
  return result?.details.isReserved === true;
}

/**
 * Utility function to get the normalized form of an IP address
 */
export function normalizeIP(ip: string): string | null {
  const result = validateIP(ip);
  return result?.details.normalizedForm || null;
}

/**
 * Utility function to get the compressed form of an IPv6 address
 */
export function compressIPv6Address(ip: string): string | null {
  const result = validateIP(ip);
  if (result?.type === 'ipv6' && result.details.normalizedForm) {
    const normalizedForm = result.details.normalizedForm;

    // Handle zone IDs
    const zoneIdIndex = normalizedForm.indexOf('%');
    if (zoneIdIndex !== -1) {
      const addressPart = normalizedForm.substring(0, zoneIdIndex);
      const zoneIdPart = normalizedForm.substring(zoneIdIndex);
      return compressIPv6(addressPart) + zoneIdPart;
    }

    return compressIPv6(normalizedForm);
  }
  return null;
}

/**
 * Validates CIDR notation
 */
export function validateCIDR(cidr: string): ValidationResult {
  if (!cidr) {
    return { valid: false, error: 'CIDR notation is required' };
  }

  const parts = cidr.split('/');

  if (parts.length !== 2) {
    return { valid: false, error: 'CIDR must be in format IP/prefix' };
  }

  const ipValidation = validateIPv4(parts[0]);
  if (!ipValidation.valid) {
    return ipValidation;
  }

  const prefix = parseInt(parts[1], 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return { valid: false, error: 'CIDR prefix must be between 0-32' };
  }

  return { valid: true };
}

/**
 * Validates subnet mask
 */
export function validateSubnetMask(mask: string): ValidationResult {
  const validation = validateIPv4(mask);
  if (!validation.valid) {
    return validation;
  }

  const octets = mask.split('.').map(Number);
  const binary = octets.map((n) => n.toString(2).padStart(8, '0')).join('');

  // Check if mask is contiguous (all 1s followed by all 0s)
  if (!/^1*0*$/.test(binary)) {
    return { valid: false, error: 'Subnet mask must be contiguous' };
  }

  return { valid: true };
}
