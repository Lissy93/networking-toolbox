import type { IPAddress, SubnetInfo } from '../types/ip.js';

/**
 * Converts IP string to IPAddress object
 */
export function parseIP(ip: string): IPAddress {
  const octets = ip.split('.').map(Number);
  const binary = octets.map((n) => n.toString(2).padStart(8, '0')).join('.');
  const decimal = octets.reduce((acc, octet, i) => acc + octet * Math.pow(256, 3 - i), 0);
  const hex = octets.map((n) => n.toString(16).padStart(2, '0').toUpperCase()).join('.');

  return {
    octets,
    binary,
    decimal,
    hex,
    valid: true,
  };
}

/**
 * Converts CIDR prefix to subnet mask
 */
export function cidrToMask(cidr: number): IPAddress {
  if (cidr === 0) {
    return parseIP('0.0.0.0');
  }
  const mask = (0xffffffff << (32 - cidr)) >>> 0;
  const octets = [(mask >>> 24) & 0xff, (mask >>> 16) & 0xff, (mask >>> 8) & 0xff, mask & 0xff];

  return parseIP(octets.join('.'));
}

/**
 * Converts subnet mask to CIDR prefix
 */
export function maskToCidr(mask: string): number {
  const octets = mask.split('.').map(Number);
  const binary = octets.map((n) => n.toString(2).padStart(8, '0')).join('');
  return binary.split('1').length - 1;
}

/**
 * Calculates network address
 */
export function getNetworkAddress(ip: string, cidr: number): IPAddress {
  const ipNum = ipToNumber(ip);
  const mask = (0xffffffff << (32 - cidr)) >>> 0;
  const networkNum = (ipNum & mask) >>> 0;

  return numberToIP(networkNum);
}

/**
 * Calculates broadcast address
 */
export function getBroadcastAddress(ip: string, cidr: number): IPAddress {
  const networkNum = ipToNumber(getNetworkAddress(ip, cidr).octets.join('.'));
  const hostBits = 32 - cidr;
  const broadcastNum = networkNum + Math.pow(2, hostBits) - 1;

  return numberToIP(broadcastNum);
}

/**
 * Calculates complete subnet information
 */
export function calculateSubnet(ip: string, cidr: number): SubnetInfo {
  const network = getNetworkAddress(ip, cidr);
  const broadcast = getBroadcastAddress(ip, cidr);
  const subnet = cidrToMask(cidr);
  const wildcardMask = getWildcardMask(cidr);

  const hostBits = 32 - cidr;
  const hostCount = Math.pow(2, hostBits);

  // RFC 3021: /31 point-to-point has both IPs usable, /32 is single host
  const usableHosts = cidr === 32 ? 1 : cidr === 31 ? 2 : hostCount - 2;

  // For /31 and /32, all IPs are usable (no reserved network/broadcast)
  let firstHost: IPAddress;
  let lastHost: IPAddress;

  if (cidr >= 31) {
    firstHost = network;
    lastHost = cidr === 32 ? network : broadcast;
  } else {
    firstHost = numberToIP(ipToNumber(network.octets.join('.')) + 1);
    lastHost = numberToIP(ipToNumber(broadcast.octets.join('.')) - 1);
  }

  return {
    network,
    broadcast,
    subnet,
    cidr,
    hostCount,
    usableHosts,
    firstHost,
    lastHost,
    wildcardMask,
  };
}

/**
 * Calculates wildcard mask
 */
export function getWildcardMask(cidr: number): IPAddress {
  const mask = cidrToMask(cidr);
  const wildcardOctets = mask.octets.map((octet) => 255 - octet);

  return parseIP(wildcardOctets.join('.'));
}

/**
 * Converts IP address to 32-bit number
 */
export function ipToNumber(ip: string): number {
  const octets = ip.split('.').map(Number);
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

/**
 * Converts 32-bit number to IP address
 */
export function numberToIP(num: number): IPAddress {
  const octets = [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff];

  return parseIP(octets.join('.'));
}

/**
 * Gets host range for a subnet
 */
export function getHostRange(ip: string, cidr: number): { first: IPAddress; last: IPAddress } {
  const network = getNetworkAddress(ip, cidr);
  const broadcast = getBroadcastAddress(ip, cidr);

  // Handle special cases for /31 and /32
  if (cidr === 32) {
    // Host route - first and last are the same
    return { first: network, last: network };
  } else if (cidr === 31) {
    // Point-to-point - use network and broadcast as hosts
    return { first: network, last: broadcast };
  } else {
    // Normal subnet - exclude network and broadcast
    const firstHostNum = ipToNumber(network.octets.join('.')) + 1;
    const lastHostNum = ipToNumber(broadcast.octets.join('.')) - 1;
    return {
      first: numberToIP(firstHostNum),
      last: numberToIP(lastHostNum),
    };
  }
}

/**
 * Calculates complete subnet information (alias for calculateSubnet)
 */
export function calculateSubnetInfo(
  ip: string,
  cidr: number,
): SubnetInfo & {
  ip: IPAddress;
  firstHost: IPAddress;
  lastHost: IPAddress;
  totalAddresses: number;
} {
  const subnet = calculateSubnet(ip, cidr);
  const hostRange = getHostRange(ip, cidr);
  const totalAddresses = Math.pow(2, 32 - cidr);

  // Calculate proper host count for different CIDR sizes
  let hostCount: number;
  if (cidr === 32) {
    hostCount = 1; // Single host
  } else if (cidr === 31) {
    hostCount = 2; // Point-to-point
  } else if (cidr === 0) {
    hostCount = 4294967294; // Entire Internet minus network/broadcast
  } else {
    hostCount = totalAddresses - 2; // Exclude network and broadcast
  }

  return {
    ...subnet,
    ip: parseIP(ip),
    network: subnet.network,
    broadcast: subnet.broadcast,
    firstHost: hostRange.first,
    lastHost: hostRange.last,
    hostCount,
    totalAddresses,
  };
}

/**
 * Checks if IP is in subnet range
 */
export function isIPInSubnet(ip: string, subnet: string, cidr: number): boolean {
  const ipNum = ipToNumber(ip);
  const subnetNum = ipToNumber(subnet);
  const mask = (0xffffffff << (32 - cidr)) >>> 0;

  return (ipNum & mask) >>> 0 === (subnetNum & mask) >>> 0;
}
