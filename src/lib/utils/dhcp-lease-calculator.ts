/**
 * DHCP Lease Time Calculator
 *
 * Calculates optimal lease times based on network characteristics:
 * - Pool size and expected client count
 * - Client turnover/churn rate
 * - Network type (guest, corporate, IoT, etc.)
 *
 * Also provides T1 (renewal) and T2 (rebinding) times
 */

export interface LeaseTimeConfig {
  poolSize: number;
  expectedClients: number;
  churnRate: 'low' | 'medium' | 'high' | 'custom';
  customChurnHours?: number;
  networkType?: 'corporate' | 'guest' | 'iot' | 'residential' | 'custom';
}

export interface LeaseTimeResult {
  recommendedLeaseSeconds: number;
  recommendedLeaseFormatted: string;
  t1RenewalSeconds: number;
  t1RenewalFormatted: string;
  t2RebindingSeconds: number;
  t2RebindingFormatted: string;
  utilizationPercent: number;
  exhaustionTime: string | null;
  recommendations: string[];
  configExamples: {
    iscDhcpd: string;
    keaDhcp4: string;
  };
}

interface NetworkTypeDefaults {
  name: string;
  leaseSeconds: number;
  description: string;
}

export const NETWORK_TYPE_DEFAULTS: Record<string, NetworkTypeDefaults> = {
  corporate: {
    name: 'Corporate LAN',
    leaseSeconds: 86400, // 24 hours
    description: 'Stable network with known devices, daily renewal',
  },
  guest: {
    name: 'Guest WiFi',
    leaseSeconds: 3600, // 1 hour
    description: 'High turnover, short stays, frequent address recycling',
  },
  iot: {
    name: 'IoT Devices',
    leaseSeconds: 604800, // 7 days
    description: 'Stable devices, infrequent reboots, long leases preferred',
  },
  residential: {
    name: 'Residential/Home',
    leaseSeconds: 86400, // 24 hours
    description: 'Mix of stable and mobile devices, moderate turnover',
  },
};

export const CHURN_RATE_HOURS: Record<string, number> = {
  low: 168, // 7 days - devices stay connected for weeks
  medium: 24, // 1 day - typical office environment
  high: 4, // 4 hours - guest networks, conferences
};

/**
 * Format seconds into human-readable time
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (hours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
}

/**
 * Validate lease time configuration
 */
export function validateLeaseTimeConfig(config: LeaseTimeConfig): string[] {
  const errors: string[] = [];

  if (config.poolSize <= 0) {
    errors.push('Pool size must be greater than 0');
  }

  if (config.expectedClients < 0) {
    errors.push('Expected clients cannot be negative');
  }

  if (config.expectedClients > config.poolSize) {
    errors.push('Expected clients exceeds pool size - addresses will be exhausted');
  }

  if (config.churnRate === 'custom') {
    if (config.customChurnHours === undefined || config.customChurnHours <= 0) {
      errors.push('Custom churn rate must be greater than 0 hours');
    }
  }

  return errors;
}

/**
 * Calculate optimal lease time
 */
export function calculateLeaseTime(config: LeaseTimeConfig): LeaseTimeResult {
  const errors = validateLeaseTimeConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  // Determine churn hours
  const churnHours = config.churnRate === 'custom' ? config.customChurnHours! : CHURN_RATE_HOURS[config.churnRate];

  // Calculate base lease time
  let leaseSeconds: number;

  if (config.networkType && config.networkType !== 'custom') {
    // Use network type default as baseline
    leaseSeconds = NETWORK_TYPE_DEFAULTS[config.networkType].leaseSeconds;
  } else {
    // Calculate based on churn and utilization
    const utilizationRatio = config.expectedClients / config.poolSize;

    if (utilizationRatio < 0.5) {
      // Low utilization - can use longer leases
      leaseSeconds = Math.min(churnHours * 3600 * 2, 604800); // Up to 7 days
    } else if (utilizationRatio < 0.8) {
      // Moderate utilization
      leaseSeconds = churnHours * 3600;
    } else {
      // High utilization - shorter leases for faster recycling
      leaseSeconds = Math.max(Math.floor(churnHours * 3600 * 0.5), 600); // At least 10 minutes
    }
  }

  // Calculate T1 (renewal time) - typically 50% of lease
  const t1Seconds = Math.floor(leaseSeconds * 0.5);

  // Calculate T2 (rebinding time) - typically 87.5% of lease
  const t2Seconds = Math.floor(leaseSeconds * 0.875);

  // Calculate utilization
  const utilizationPercent = Math.round((config.expectedClients / config.poolSize) * 100);

  // Estimate time to exhaustion
  let exhaustionTime: string | null = null;
  if (config.expectedClients > config.poolSize) {
    exhaustionTime = 'Immediate - not enough addresses';
  } else if (utilizationPercent > 90) {
    const timeToExhaustion = ((config.poolSize - config.expectedClients) / config.expectedClients) * leaseSeconds;
    exhaustionTime = `~${formatTime(Math.floor(timeToExhaustion))} under current load`;
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (utilizationPercent > 90) {
    recommendations.push('⚠️ High utilization - consider expanding pool or shortening lease times');
  }

  if (utilizationPercent < 30) {
    recommendations.push('✓ Low utilization - safe to use longer lease times for stability');
  }

  if (leaseSeconds < 3600) {
    recommendations.push('Short lease times increase DHCP server load - ensure server can handle traffic');
  }

  if (leaseSeconds > 604800) {
    recommendations.push('Very long leases may delay address reclamation - ensure adequate pool size');
  }

  if (config.networkType === 'guest') {
    recommendations.push('Guest networks benefit from short leases (1-4 hours) for rapid address recycling');
  }

  if (config.networkType === 'iot') {
    recommendations.push('IoT devices prefer long leases (7-30 days) to minimize network chatter');
  }

  // Generate config examples
  const configExamples = generateConfigExamples(leaseSeconds, t1Seconds, t2Seconds);

  return {
    recommendedLeaseSeconds: leaseSeconds,
    recommendedLeaseFormatted: formatTime(leaseSeconds),
    t1RenewalSeconds: t1Seconds,
    t1RenewalFormatted: formatTime(t1Seconds),
    t2RebindingSeconds: t2Seconds,
    t2RebindingFormatted: formatTime(t2Seconds),
    utilizationPercent,
    exhaustionTime,
    recommendations,
    configExamples,
  };
}

/**
 * Generate configuration examples
 */
function generateConfigExamples(
  leaseSeconds: number,
  t1Seconds: number,
  t2Seconds: number,
): {
  iscDhcpd: string;
  keaDhcp4: string;
} {
  const maxLeaseSeconds = leaseSeconds * 2; // Typical max is 2x default

  const iscDhcpd = `# ISC DHCPd Lease Configuration
default-lease-time ${leaseSeconds};
max-lease-time ${maxLeaseSeconds};

# Subnet configuration example
subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.100 192.168.1.200;
  option routers 192.168.1.1;
  option domain-name-servers 192.168.1.1;
  default-lease-time ${leaseSeconds};
  max-lease-time ${maxLeaseSeconds};
}`;

  const keaDhcp4 = `{
  "Dhcp4": {
    "valid-lifetime": ${leaseSeconds},
    "renew-timer": ${t1Seconds},
    "rebind-timer": ${t2Seconds},
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
            "data": "192.168.1.1"
          },
          {
            "name": "domain-name-servers",
            "data": "192.168.1.1"
          }
        ],
        "valid-lifetime": ${leaseSeconds}
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
 * Example scenarios
 */
export const LEASE_TIME_EXAMPLES: Array<LeaseTimeConfig & { name: string; description: string }> = [
  {
    name: 'Small Office',
    description: '50 devices, stable network',
    poolSize: 100,
    expectedClients: 50,
    churnRate: 'low',
    networkType: 'corporate',
  },
  {
    name: 'Guest WiFi',
    description: 'High turnover, 200 capacity',
    poolSize: 200,
    expectedClients: 150,
    churnRate: 'high',
    networkType: 'guest',
  },
  {
    name: 'IoT Network',
    description: '500 sensors, very stable',
    poolSize: 600,
    expectedClients: 500,
    churnRate: 'low',
    networkType: 'iot',
  },
  {
    name: 'Home Network',
    description: '10-20 devices, mixed types',
    poolSize: 50,
    expectedClients: 15,
    churnRate: 'medium',
    networkType: 'residential',
  },
  {
    name: 'Near Capacity',
    description: 'Running close to limit',
    poolSize: 100,
    expectedClients: 95,
    churnRate: 'medium',
    networkType: 'corporate',
  },
  {
    name: 'Conference WiFi',
    description: 'Very high churn, 500 attendees',
    poolSize: 600,
    expectedClients: 450,
    churnRate: 'high',
    networkType: 'guest',
  },
];
