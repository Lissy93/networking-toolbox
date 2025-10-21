/* Supernet (Route Aggregation) Calculation Utilities */

export interface NetworkInput {
  id: string;
  network: string;
  cidr: number;
  description?: string;
}

export interface SupernetResult {
  success: boolean;
  supernet?: {
    network: string;
    cidr: number;
    subnetMask: string;
    wildcardMask: string;
    binaryMask: string;
    totalHosts: number;
    addressRange: {
      first: string;
      last: string;
    };
  };
  inputNetworks: NetworkInput[];
  aggregatedNetworks?: string[];
  savingsAnalysis?: {
    originalRoutes: number;
    aggregatedRoutes: number;
    routeReduction: number;
    reductionPercentage: number;
  };
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/* Convert IP address to 32-bit integer */
function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/* Convert 32-bit integer to IP address */
function intToIp(int: number): string {
  return [(int >>> 24) & 0xff, (int >>> 16) & 0xff, (int >>> 8) & 0xff, int & 0xff].join('.');
}

/* Calculate subnet mask from CIDR */
function cidrToSubnetMask(cidr: number): string {
  const mask = 0xffffffff << (32 - cidr);
  return intToIp(mask >>> 0);
}

/* Calculate wildcard mask from CIDR */
function cidrToWildcardMask(cidr: number): string {
  const wildcardInt = (1 << (32 - cidr)) - 1;
  return intToIp(wildcardInt);
}

/* Convert subnet mask to binary representation */
function subnetMaskToBinary(mask: string): string {
  return mask
    .split('.')
    .map((octet) => {
      return parseInt(octet).toString(2).padStart(8, '0');
    })
    .join('.');
}

/* Calculate the number of hosts in a network */
function calculateHosts(cidr: number): number {
  return Math.pow(2, 32 - cidr) - 2; // Subtract network and broadcast
}

/* Validate IP address format */
function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

/* Validate CIDR notation */
function isValidCIDR(cidr: number): boolean {
  return cidr >= 1 && cidr <= 30;
}

/* Calculate network address from IP and CIDR */
function getNetworkAddress(ip: string, cidr: number): string {
  const ipInt = ipToInt(ip);
  const mask = 0xffffffff << (32 - cidr);
  const networkInt = ipInt & (mask >>> 0);
  return intToIp(networkInt);
}

/* Check if networks are contiguous and can be aggregated */
function _areNetworksContiguous(networks: NetworkInput[]): boolean {
  if (networks.length < 2) return true;

  // Sort networks by their network address
  const sortedNetworks = [...networks].sort((a, b) => {
    const networkA = getNetworkAddress(a.network, a.cidr);
    const networkB = getNetworkAddress(b.network, b.cidr);
    return ipToInt(networkA) - ipToInt(networkB);
  });

  // Check if networks are adjacent and same size
  for (let i = 0; i < sortedNetworks.length - 1; i++) {
    const currentNet = sortedNetworks[i];
    const nextNet = sortedNetworks[i + 1];

    // Networks must have same CIDR for simple aggregation
    if (currentNet.cidr !== nextNet.cidr) continue;

    const currentNetworkInt = ipToInt(getNetworkAddress(currentNet.network, currentNet.cidr));
    const nextNetworkInt = ipToInt(getNetworkAddress(nextNet.network, nextNet.cidr));
    const networkSize = Math.pow(2, 32 - currentNet.cidr);

    // Check if networks are adjacent
    if (nextNetworkInt !== currentNetworkInt + networkSize) {
      return false;
    }
  }

  return true;
}

/* Find the supernet that encompasses all input networks */
function findSupernet(networks: NetworkInput[]): { network: string; cidr: number } | null {
  if (networks.length === 0) return null;

  // Get all network addresses
  const networkAddresses = networks.map((net) => {
    const networkAddr = getNetworkAddress(net.network, net.cidr);
    return ipToInt(networkAddr);
  });

  const minAddress = Math.min(...networkAddresses);
  const maxAddress = Math.max(
    ...networkAddresses.map((addr, idx) => {
      const cidr = networks[idx].cidr;
      const networkSize = Math.pow(2, 32 - cidr);
      return addr + networkSize - 1;
    }),
  );

  // Find the smallest CIDR that can contain all networks
  let supernetCidr = 32;
  for (let cidr = 30; cidr >= 1; cidr--) {
    const mask = 0xffffffff << (32 - cidr);
    const supernetStart = minAddress & (mask >>> 0);
    const supernetEnd = supernetStart + Math.pow(2, 32 - cidr) - 1;

    if (supernetStart <= minAddress && supernetEnd >= maxAddress) {
      supernetCidr = cidr;
      break;
    }
  }

  if (supernetCidr === 32) return null;

  const supernetNetwork = intToIp(minAddress & ((0xffffffff << (32 - supernetCidr)) >>> 0));
  return { network: supernetNetwork, cidr: supernetCidr };
}

/* Validate network input */
export function validateNetworkInput(input: NetworkInput): ValidationResult {
  if (!input.network.trim()) {
    return { valid: false, error: 'Network address is required' };
  }

  if (!isValidIP(input.network)) {
    return { valid: false, error: 'Invalid IP address format' };
  }

  if (!isValidCIDR(input.cidr)) {
    return { valid: false, error: 'CIDR must be between /1 and /30' };
  }

  // Verify the IP is actually a network address
  const networkAddr = getNetworkAddress(input.network, input.cidr);
  if (networkAddr !== input.network) {
    return {
      valid: false,
      error: `IP address should be ${networkAddr}/${input.cidr} (network address)`,
    };
  }

  return { valid: true };
}

/* Calculate supernet from multiple networks */
export function calculateSupernet(networks: NetworkInput[]): SupernetResult {
  try {
    // Input validation
    if (networks.length === 0) {
      return {
        success: false,
        inputNetworks: networks,
        error: 'At least one network is required',
      };
    }

    // Validate all networks
    for (const network of networks) {
      const validation = validateNetworkInput(network);
      if (!validation.valid) {
        return {
          success: false,
          inputNetworks: networks,
          error: `${network.network}/${network.cidr}: ${validation.error}`,
        };
      }
    }

    // Check for duplicate networks
    const networkStrings = networks.map((n) => `${n.network}/${n.cidr}`);
    const uniqueNetworks = new Set(networkStrings);
    if (networkStrings.length !== uniqueNetworks.size) {
      return {
        success: false,
        inputNetworks: networks,
        error: 'Duplicate networks are not allowed',
      };
    }

    // Find the supernet
    const supernet = findSupernet(networks);
    if (!supernet) {
      return {
        success: false,
        inputNetworks: networks,
        error: 'Unable to calculate supernet for the given networks',
      };
    }

    // Calculate supernet details
    const subnetMask = cidrToSubnetMask(supernet.cidr);
    const wildcardMask = cidrToWildcardMask(supernet.cidr);
    const binaryMask = subnetMaskToBinary(subnetMask);
    const totalHosts = calculateHosts(supernet.cidr);

    const supernetInt = ipToInt(supernet.network);
    const supernetSize = Math.pow(2, 32 - supernet.cidr);
    const firstAddress = intToIp(supernetInt + 1);
    const lastAddress = intToIp(supernetInt + supernetSize - 2);

    // Create aggregated network list
    const aggregatedNetworks = [`${supernet.network}/${supernet.cidr}`];

    // Calculate savings analysis
    const originalRoutes = networks.length;
    const aggregatedRoutes = aggregatedNetworks.length;
    const routeReduction = originalRoutes - aggregatedRoutes;
    const reductionPercentage = (routeReduction / originalRoutes) * 100;

    return {
      success: true,
      supernet: {
        network: supernet.network,
        cidr: supernet.cidr,
        subnetMask,
        wildcardMask,
        binaryMask,
        totalHosts,
        addressRange: {
          first: firstAddress,
          last: lastAddress,
        },
      },
      inputNetworks: networks,
      aggregatedNetworks,
      savingsAnalysis: {
        originalRoutes,
        aggregatedRoutes,
        routeReduction,
        reductionPercentage,
      },
    };
  } catch (error) {
    return {
      success: false,
      inputNetworks: networks,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/* Generate unique ID for network inputs */
export function generateNetworkId(): string {
  return 'network_' + Math.random().toString(36).substr(2, 9);
}

/* Check if networks can be optimally aggregated */
export function analyzeAggregation(networks: NetworkInput[]): {
  canAggregate: boolean;
  efficiency: number;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  if (networks.length < 2) {
    return {
      canAggregate: false,
      efficiency: 0,
      recommendations: ['Add more networks to perform aggregation'],
    };
  }

  // Check for same-sized contiguous networks
  const byCidr = networks.reduce(
    (acc, net) => {
      if (!acc[net.cidr]) acc[net.cidr] = [];
      acc[net.cidr].push(net);
      return acc;
    },
    {} as Record<number, NetworkInput[]>,
  );

  let canAggregate = false;
  let totalEfficiency = 0;

  Object.entries(byCidr).forEach(([cidr, nets]) => {
    if (nets.length >= 2) {
      const sorted = nets.sort(
        (a, b) => ipToInt(getNetworkAddress(a.network, a.cidr)) - ipToInt(getNetworkAddress(b.network, b.cidr)),
      );

      let contiguousGroups = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = ipToInt(getNetworkAddress(sorted[i].network, sorted[i].cidr));
        const next = ipToInt(getNetworkAddress(sorted[i + 1].network, sorted[i + 1].cidr));
        const networkSize = Math.pow(2, 32 - parseInt(cidr));

        if (next === current + networkSize) {
          contiguousGroups++;
          canAggregate = true;
        }
      }

      if (contiguousGroups > 0) {
        totalEfficiency += (contiguousGroups / nets.length) * 100;
        recommendations.push(`${contiguousGroups} pairs of /${cidr} networks can be aggregated`);
      }
    }
  });

  if (!canAggregate) {
    recommendations.push('Networks are not contiguous - consider reordering IP allocations');
    recommendations.push('Different sized networks may still benefit from supernetting');
  }

  return {
    canAggregate,
    efficiency: Math.min(totalEfficiency / Object.keys(byCidr).length, 100),
    recommendations,
  };
}
