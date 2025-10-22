/**
 * DHCP Option 51 - IP Address Lease Time (RFC 2132)
 *
 * Specifies the lease time in seconds for the IP address.
 * The value is a 32-bit unsigned integer.
 *
 * Special values:
 * - 0xFFFFFFFF: Infinite lease (permanent assignment)
 * - Common values: 3600 (1h), 86400 (24h), 604800 (7d)
 */

export interface LeaseTimeConfig {
  leaseSeconds: number;
  infinite?: boolean;
}

export interface LeaseTimeResult {
  leaseSeconds: number;
  hexEncoded: string;
  wireFormat: string;
  totalLength: number;
  humanReadable: string;
  isInfinite: boolean;
  t1RenewalSeconds?: number;
  t1RenewalFormatted?: string;
  t2RebindingSeconds?: number;
  t2RebindingFormatted?: string;
  configExamples: {
    iscDhcpd: string;
    keaDhcp4: string;
    dnsmasq: string;
  };
}

/**
 * Formats time in human-readable format
 */
export function formatTime(seconds: number): string {
  if (seconds === 0xffffffff) return 'Infinite';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

  return parts.join(', ');
}

/**
 * Validates lease time configuration
 */
export function validateLeaseTimeConfig(config: LeaseTimeConfig): string[] {
  const errors: string[] = [];

  if (config.infinite) {
    return errors; // Infinite lease is always valid
  }

  if (config.leaseSeconds < 0) {
    errors.push('Lease time cannot be negative');
  }

  if (config.leaseSeconds > 0xfffffffe) {
    errors.push('Lease time exceeds maximum value (use infinite lease instead)');
  }

  if (config.leaseSeconds > 0 && config.leaseSeconds < 60) {
    errors.push('Warning: Lease time less than 60 seconds is unusually short');
  }

  if (config.leaseSeconds > 31536000) {
    // 1 year
    errors.push('Warning: Lease time greater than 1 year is unusually long');
  }

  return errors;
}

/**
 * Converts seconds to 32-bit hex (big-endian)
 */
function secondsToHex(seconds: number): string {
  const value = seconds >>> 0; // Ensure unsigned 32-bit
  return value.toString(16).padStart(8, '0');
}

/**
 * Converts hex to seconds (32-bit big-endian)
 */
function hexToSeconds(hex: string): number {
  return parseInt(hex, 16) >>> 0; // Ensure unsigned 32-bit
}

/**
 * Formats hex string as wire format (with spaces)
 */
function formatWireFormat(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

/**
 * Builds DHCP Option 51 (Lease Time)
 */
export function buildLeaseTimeOption(config: LeaseTimeConfig): LeaseTimeResult {
  const errors = validateLeaseTimeConfig(config);
  // Only throw on actual errors, not warnings
  const actualErrors = errors.filter((e) => !e.startsWith('Warning:'));
  if (actualErrors.length > 0) {
    throw new Error(actualErrors.join('; '));
  }

  const leaseSeconds = config.infinite ? 0xffffffff : config.leaseSeconds;
  const hexEncoded = secondsToHex(leaseSeconds);
  const isInfinite = leaseSeconds === 0xffffffff;

  const result: LeaseTimeResult = {
    leaseSeconds,
    hexEncoded,
    wireFormat: formatWireFormat(hexEncoded),
    totalLength: 4,
    humanReadable: formatTime(leaseSeconds),
    isInfinite,
    configExamples: generateConfigExamples(leaseSeconds, isInfinite),
  };

  // Calculate T1 and T2 if not infinite
  if (!isInfinite) {
    result.t1RenewalSeconds = Math.floor(leaseSeconds * 0.5);
    result.t1RenewalFormatted = formatTime(result.t1RenewalSeconds);
    result.t2RebindingSeconds = Math.floor(leaseSeconds * 0.875);
    result.t2RebindingFormatted = formatTime(result.t2RebindingSeconds);
  }

  return result;
}

/**
 * Decodes DHCP Option 51 from hex
 */
export function decodeLeaseTimeOption(hex: string): LeaseTimeResult {
  // Remove spaces and validate hex
  const cleanHex = hex.replace(/\s+/g, '');

  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hex string');
  }

  if (cleanHex.length === 0) {
    throw new Error('Hex string cannot be empty');
  }

  if (cleanHex.length !== 8) {
    throw new Error('Hex string must be exactly 8 characters (4 bytes)');
  }

  const leaseSeconds = hexToSeconds(cleanHex);
  const isInfinite = leaseSeconds === 0xffffffff;

  const result: LeaseTimeResult = {
    leaseSeconds,
    hexEncoded: cleanHex.toLowerCase(),
    wireFormat: formatWireFormat(cleanHex.toLowerCase()),
    totalLength: 4,
    humanReadable: formatTime(leaseSeconds),
    isInfinite,
    configExamples: generateConfigExamples(leaseSeconds, isInfinite),
  };

  // Calculate T1 and T2 if not infinite
  if (!isInfinite) {
    result.t1RenewalSeconds = Math.floor(leaseSeconds * 0.5);
    result.t1RenewalFormatted = formatTime(result.t1RenewalSeconds);
    result.t2RebindingSeconds = Math.floor(leaseSeconds * 0.875);
    result.t2RebindingFormatted = formatTime(result.t2RebindingSeconds);
  }

  return result;
}

/**
 * Generates configuration examples
 */
function generateConfigExamples(
  leaseSeconds: number,
  isInfinite: boolean,
): {
  iscDhcpd: string;
  keaDhcp4: string;
  dnsmasq: string;
} {
  const iscDhcpd = isInfinite
    ? `subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.100 192.168.1.200;
  default-lease-time ${leaseSeconds};
  max-lease-time ${leaseSeconds};
  # Note: Some DHCP servers may not support infinite leases
}`
    : `subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.100 192.168.1.200;
  default-lease-time ${leaseSeconds};
  max-lease-time ${Math.floor(leaseSeconds * 1.5)};
}`;

  const keaDhcp4 = isInfinite
    ? `{
  "Dhcp4": {
    "subnet4": [
      {
        "subnet": "192.168.1.0/24",
        "pools": [
          {
            "pool": "192.168.1.100 - 192.168.1.200"
          }
        ],
        "valid-lifetime": ${leaseSeconds},
        "comment": "Infinite lease - may not be supported"
      }
    ]
  }
}`
    : `{
  "Dhcp4": {
    "subnet4": [
      {
        "subnet": "192.168.1.0/24",
        "pools": [
          {
            "pool": "192.168.1.100 - 192.168.1.200"
          }
        ],
        "valid-lifetime": ${leaseSeconds},
        "renew-timer": ${Math.floor(leaseSeconds * 0.5)},
        "rebind-timer": ${Math.floor(leaseSeconds * 0.875)}
      }
    ]
  }
}`;

  const dnsmasq = isInfinite
    ? `# Infinite lease
dhcp-range=192.168.1.100,192.168.1.200,infinite`
    : `# Lease time in seconds or with suffix (m/h/d)
dhcp-range=192.168.1.100,192.168.1.200,${leaseSeconds}s`;

  return {
    iscDhcpd,
    keaDhcp4,
    dnsmasq,
  };
}

/**
 * Common lease time presets
 */
export const LEASE_TIME_PRESETS = [
  { label: '1 Hour', seconds: 3600, description: 'Guest networks, high churn' },
  { label: '4 Hours', seconds: 14400, description: 'Coffee shops, public WiFi' },
  { label: '8 Hours', seconds: 28800, description: 'Office workday' },
  { label: '12 Hours', seconds: 43200, description: 'Half day' },
  { label: '24 Hours', seconds: 86400, description: 'Corporate networks (default)' },
  { label: '3 Days', seconds: 259200, description: 'Small offices' },
  { label: '7 Days', seconds: 604800, description: 'IoT devices, stable networks' },
  { label: '30 Days', seconds: 2592000, description: 'Very stable environments' },
  { label: 'Infinite', seconds: 0xffffffff, description: 'Permanent assignment', infinite: true },
];
