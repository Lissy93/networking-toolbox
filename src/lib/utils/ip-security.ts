/**
 * IP Security Utilities
 * Provides validation for user-supplied IP addresses to prevent SSRF attacks
 */

import { validateIP } from './ip-validation';

/**
 * Check if a string is a valid IPv4 address
 */
function isIPv4(ip: string): boolean {
  const result = validateIP(ip);
  return result !== null && result.isValid && result.type === 'ipv4';
}

/**
 * Check if a string is a valid IPv6 address
 */
function isIPv6(ip: string): boolean {
  const result = validateIP(ip);
  return result !== null && result.isValid && result.type === 'ipv6';
}

/**
 * Check if an IPv4 address is in a private range
 * Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 * Loopback: 127.0.0.0/8
 * Link-local: 169.254.0.0/16
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  const [a, b] = parts;

  // Loopback: 127.0.0.0/8
  if (a === 127) return true;

  // Private: 10.0.0.0/8
  if (a === 10) return true;

  // Private: 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;

  // Private: 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // Link-local: 169.254.0.0/16 (AWS metadata, APIPA)
  if (a === 169 && b === 254) return true;

  // Broadcast: 255.255.255.255
  if (a === 255 && b === 255) return true;

  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

/**
 * Check if an IPv6 address is in a private/reserved range
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // Loopback: ::1
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

  // Link-local: fe80::/10
  if (lower.startsWith('fe80:')) return true;

  // Unique local: fc00::/7
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  // Multicast: ff00::/8
  if (lower.startsWith('ff')) return true;

  // Unspecified: ::
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;

  return false;
}

/**
 * Check if an IP address is in a private or reserved range
 */
export function isPrivateIP(ip: string): boolean {
  if (isIPv4(ip)) {
    return isPrivateIPv4(ip);
  }
  if (isIPv6(ip)) {
    return isPrivateIPv6(ip);
  }
  return true; // If not a valid IP, treat as private for safety
}

/**
 * Validate a DNS server IP address for security
 * @param ip - The IP address to validate
 * @param allowedServers - List of explicitly allowed server IPs
 * @param blockPrivate - Whether to block private IP ranges
 * @returns Object with valid boolean and optional error message
 */
export function validateDNSServer(
  ip: string,
  allowedServers: string[],
  blockPrivate: boolean = true,
): { valid: boolean; error?: string } {
  // Trim whitespace
  const cleanIP = ip.trim();

  // Check if it's a valid IP address
  if (!isIPv4(cleanIP) && !isIPv6(cleanIP)) {
    return {
      valid: false,
      error: 'Invalid IP address format. Must be a valid IPv4 or IPv6 address.',
    };
  }

  // Check allowlist first (allowlist takes precedence)
  if (allowedServers.length > 0 && allowedServers.includes(cleanIP)) {
    return { valid: true };
  }

  // Check for private IPs if blocking is enabled
  if (blockPrivate && isPrivateIP(cleanIP)) {
    return {
      valid: false,
      error: 'Private IP addresses are not allowed for security reasons. Use a public DNS server.',
    };
  }

  // If we have an allowlist and IP is not in it
  if (allowedServers.length > 0) {
    return {
      valid: false,
      error: 'DNS server not in allowed list. Please use one of the permitted DNS servers.',
    };
  }

  // If no allowlist and not private (or private IPs are allowed), accept it
  return { valid: true };
}

/**
 * Default list of trusted public DNS servers
 * These are safe, well-known, public DNS resolvers
 */
export const DEFAULT_TRUSTED_DNS_SERVERS = [
  // Cloudflare
  '1.1.1.1',
  '1.0.0.1',
  '2606:4700:4700::1111',
  '2606:4700:4700::1001',

  // Google
  '8.8.8.8',
  '8.8.4.4',
  '2001:4860:4860::8888',
  '2001:4860:4860::8844',

  // Quad9
  '9.9.9.9',
  '149.112.112.112',
  '2620:fe::fe',
  '2620:fe::9',

  // OpenDNS
  '208.67.222.222',
  '208.67.220.220',
  '2620:119:35::35',
  '2620:119:53::53',

  // Comodo Secure DNS
  '8.26.56.26',
  '8.20.247.20',

  // DNS.WATCH
  '84.200.69.80',
  '84.200.70.40',
  '2001:1608:10:25::1c04:b12f',
  '2001:1608:10:25::9249:d69b',

  // Verisign
  '64.6.64.6',
  '64.6.65.6',
  '2620:74:1b::1:1',
  '2620:74:1c::2:2',

  // Level3
  '209.244.0.3',
  '209.244.0.4',

  // AdGuard DNS
  '94.140.14.14',
  '94.140.15.15',
  '2a10:50c0::ad1:ff',
  '2a10:50c0::ad2:ff',
];
