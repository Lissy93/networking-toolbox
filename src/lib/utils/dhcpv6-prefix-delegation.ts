/**
 * DHCPv6 Prefix Delegation (RFC 8415)
 *
 * Option 25: Identity Association for Prefix Delegation (IA_PD)
 * Option 26: IA Prefix Option
 *
 * Used for delegating IPv6 prefixes to requesting routers/clients.
 */

export interface PrefixDelegationConfig {
  iaid: number; // IA_PD IAID (4 bytes)
  t1?: number; // T1 renewal time (seconds)
  t2?: number; // T2 rebinding time (seconds)
  prefixes: PrefixConfig[];
}

export interface PrefixConfig {
  prefix: string; // IPv6 prefix (e.g., "2001:db8::/48")
  preferredLifetime?: number; // Preferred lifetime (seconds, 0xFFFFFFFF = infinite)
  validLifetime?: number; // Valid lifetime (seconds, 0xFFFFFFFF = infinite)
}

export interface PrefixDelegationResult {
  iaid: number;
  iaidHex: string;
  t1: number;
  t1Hex: string;
  t1Formatted: string;
  t2: number;
  t2Hex: string;
  t2Formatted: string;
  prefixes: Array<{
    prefix: string;
    prefixLength: number;
    preferredLifetime: number;
    preferredLifetimeHex: string;
    preferredLifetimeFormatted: string;
    validLifetime: number;
    validLifetimeHex: string;
    validLifetimeFormatted: string;
    prefixHex: string;
    wireFormat: string;
    optionLength: number;
  }>;
  fullHex: string;
  fullWireFormat: string;
  totalLength: number;
  examples: {
    keaDhcp6?: string;
  };
}

/**
 * Validates an IPv6 prefix
 */
function validateIPv6Prefix(prefix: string): boolean {
  const parts = prefix.split('/');
  if (parts.length !== 2) return false;

  const [addr, len] = parts;
  const prefixLen = parseInt(len, 10);

  if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 128) return false;

  // Basic IPv6 address validation
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  const ipv6CompressedRegex = /^::([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4}$/;
  const ipv6FullCompressedRegex = /^::$/;

  return ipv6Regex.test(addr) || ipv6CompressedRegex.test(addr) || ipv6FullCompressedRegex.test(addr);
}

/**
 * Expands IPv6 address to full form
 */
function expandIPv6(ip: string): string {
  let expanded = ip;

  // Handle :: compression
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const leftParts = parts[0] ? parts[0].split(':') : [];
    const rightParts = parts[1] ? parts[1].split(':') : [];
    const missingParts = 8 - leftParts.length - rightParts.length;
    const middleParts = Array(missingParts).fill('0000');
    expanded = [...leftParts, ...middleParts, ...rightParts].join(':');
  }

  // Pad each segment to 4 hex digits
  const segments = expanded.split(':').map((seg) => seg.padStart(4, '0'));

  return segments.join(':');
}

/**
 * Converts IPv6 address to hex bytes (16 bytes)
 */
function ipv6ToHex(ip: string): string {
  const expanded = expandIPv6(ip);
  return expanded.split(':').join('');
}

/**
 * Converts 32-bit number to hex (4 bytes)
 */
function uint32ToHex(value: number): string {
  return value.toString(16).padStart(8, '0');
}

/**
 * Formats time value to human-readable string
 */
export function formatTime(seconds: number): string {
  if (seconds === 0xffffffff) return 'Infinite';
  if (seconds === 0) return '0 seconds';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

/**
 * Formats hex string with spaces every 2 characters
 */
function formatWireFormat(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

/**
 * Validates prefix delegation configuration
 */
export function validatePrefixDelegationConfig(config: PrefixDelegationConfig): string[] {
  const errors: string[] = [];

  // Validate IAID
  if (config.iaid < 0 || config.iaid > 0xffffffff) {
    errors.push('IAID must be between 0 and 4294967295');
  }

  // Validate T1/T2
  if (config.t1 !== undefined && (config.t1 < 0 || config.t1 > 0xffffffff)) {
    errors.push('T1 must be between 0 and 4294967295');
  }

  if (config.t2 !== undefined && (config.t2 < 0 || config.t2 > 0xffffffff)) {
    errors.push('T2 must be between 0 and 4294967295');
  }

  if (
    config.t1 !== undefined &&
    config.t2 !== undefined &&
    config.t1 !== 0 &&
    config.t2 !== 0 &&
    config.t1 > config.t2
  ) {
    errors.push('T1 must be less than or equal to T2');
  }

  // Validate prefixes
  if (!config.prefixes || config.prefixes.length === 0) {
    errors.push('At least one prefix must be configured');
  } else {
    config.prefixes.forEach((prefix, i) => {
      if (!validateIPv6Prefix(prefix.prefix)) {
        errors.push(`Prefix ${i + 1}: Invalid IPv6 prefix format`);
      }

      if (
        prefix.preferredLifetime !== undefined &&
        (prefix.preferredLifetime < 0 || prefix.preferredLifetime > 0xffffffff)
      ) {
        errors.push(`Prefix ${i + 1}: Preferred lifetime must be between 0 and 4294967295`);
      }

      if (prefix.validLifetime !== undefined && (prefix.validLifetime < 0 || prefix.validLifetime > 0xffffffff)) {
        errors.push(`Prefix ${i + 1}: Valid lifetime must be between 0 and 4294967295`);
      }

      if (
        prefix.preferredLifetime !== undefined &&
        prefix.validLifetime !== undefined &&
        prefix.preferredLifetime !== 0xffffffff &&
        prefix.validLifetime !== 0xffffffff &&
        prefix.preferredLifetime > prefix.validLifetime
      ) {
        errors.push(`Prefix ${i + 1}: Preferred lifetime must be <= valid lifetime`);
      }
    });
  }

  return errors;
}

/**
 * Builds DHCPv6 IA_PD option
 */
export function buildPrefixDelegation(config: PrefixDelegationConfig): PrefixDelegationResult {
  const errors = validatePrefixDelegationConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const t1 = config.t1 ?? 0;
  const t2 = config.t2 ?? 0;

  const iaidHex = uint32ToHex(config.iaid);
  const t1Hex = uint32ToHex(t1);
  const t2Hex = uint32ToHex(t2);

  const prefixes: PrefixDelegationResult['prefixes'] = [];
  let prefixesHex = '';

  for (const prefix of config.prefixes) {
    const [addr, len] = prefix.prefix.split('/');
    const prefixLength = parseInt(len, 10);
    const preferredLifetime = prefix.preferredLifetime ?? 604800; // 7 days default
    const validLifetime = prefix.validLifetime ?? 2592000; // 30 days default

    const preferredLifetimeHex = uint32ToHex(preferredLifetime);
    const validLifetimeHex = uint32ToHex(validLifetime);
    const prefixHex = ipv6ToHex(addr);

    // Option 26 format: option-code (2) + option-len (2) + preferred-lifetime (4) + valid-lifetime (4) + prefix-length (1) + prefix (16)
    const optionData = preferredLifetimeHex + validLifetimeHex + prefixLength.toString(16).padStart(2, '0') + prefixHex;
    const optionLen = (optionData.length / 2).toString(16).padStart(4, '0');
    const optionCode = '001a'; // 0x001a = 26
    const fullOptionHex = optionCode + optionLen + optionData;

    prefixesHex += fullOptionHex;

    prefixes.push({
      prefix: prefix.prefix,
      prefixLength,
      preferredLifetime,
      preferredLifetimeHex,
      preferredLifetimeFormatted: formatTime(preferredLifetime),
      validLifetime,
      validLifetimeHex,
      validLifetimeFormatted: formatTime(validLifetime),
      prefixHex,
      wireFormat: formatWireFormat(fullOptionHex),
      optionLength: fullOptionHex.length / 2,
    });
  }

  // Full IA_PD option: option-code (2) + option-len (2) + IAID (4) + T1 (4) + T2 (4) + IA_PD-options
  const iaPdData = iaidHex + t1Hex + t2Hex + prefixesHex;
  const iaPdLen = (iaPdData.length / 2).toString(16).padStart(4, '0');
  const iaPdCode = '0019'; // 0x0019 = 25
  const fullHex = iaPdCode + iaPdLen + iaPdData;

  return {
    iaid: config.iaid,
    iaidHex,
    t1,
    t1Hex,
    t1Formatted: formatTime(t1),
    t2,
    t2Hex,
    t2Formatted: formatTime(t2),
    prefixes,
    fullHex,
    fullWireFormat: formatWireFormat(fullHex),
    totalLength: fullHex.length / 2,
    examples: generateConfigExamples(config, prefixes),
  };
}

/**
 * Generates Kea DHCPv6 configuration examples
 */
function generateConfigExamples(
  config: PrefixDelegationConfig,
  prefixes: PrefixDelegationResult['prefixes'],
): { keaDhcp6?: string } {
  const _prefixConfigs = prefixes
    .map(
      (p) => `          {
            "prefix": "${p.prefix.split('/')[0]}",
            "prefix-len": ${p.prefixLength},
            "delegated-len": ${p.prefixLength},
            "preferred-lifetime": ${p.preferredLifetime === 0xffffffff ? 4294967295 : p.preferredLifetime},
            "valid-lifetime": ${p.validLifetime === 0xffffffff ? 4294967295 : p.validLifetime}
          }`,
    )
    .join(',\n');

  const keaDhcp6 = `{
  "Dhcp6": {
    "subnet6": [
      {
        "subnet": "2001:db8::/32",
        "pd-pools": [
          {
            "prefix": "${prefixes[0].prefix.split('/')[0]}",
            "prefix-len": ${prefixes[0].prefixLength},
            "delegated-len": ${prefixes[0].prefixLength}
          }
        ]${
          config.t1 !== undefined || config.t2 !== undefined
            ? `,
        "renew-timer": ${config.t1 ?? 0},
        "rebind-timer": ${config.t2 ?? 0}`
            : ''
        }
      }
    ]
  }
}`;

  return { keaDhcp6 };
}

/**
 * Example configurations
 */
export const PREFIX_DELEGATION_EXAMPLES: Array<{
  label: string;
  description: string;
  config: PrefixDelegationConfig;
}> = [
  {
    label: 'Home Router /56',
    description: 'Typical home router prefix delegation',
    config: {
      iaid: 1,
      t1: 302400, // 3.5 days
      t2: 483840, // 5.6 days
      prefixes: [
        {
          prefix: '2001:db8:1000::/56',
          preferredLifetime: 604800, // 7 days
          validLifetime: 2592000, // 30 days
        },
      ],
    },
  },
  {
    label: 'Small Business /48',
    description: 'Small business with larger prefix',
    config: {
      iaid: 100,
      t1: 1209600, // 14 days
      t2: 1814400, // 21 days
      prefixes: [
        {
          prefix: '2001:db8::/48',
          preferredLifetime: 2592000, // 30 days
          validLifetime: 7776000, // 90 days
        },
      ],
    },
  },
  {
    label: 'ISP Customer /60',
    description: 'ISP delegating /60 to customer',
    config: {
      iaid: 42,
      t1: 86400, // 1 day
      t2: 138240, // 1.6 days
      prefixes: [
        {
          prefix: '2001:db8:abcd::/60',
          preferredLifetime: 172800, // 2 days
          validLifetime: 604800, // 7 days
        },
      ],
    },
  },
  {
    label: 'Multiple Prefixes',
    description: 'Router with multiple delegated prefixes',
    config: {
      iaid: 1,
      prefixes: [
        {
          prefix: '2001:db8:1::/56',
          preferredLifetime: 604800,
          validLifetime: 2592000,
        },
        {
          prefix: '2001:db8:2::/56',
          preferredLifetime: 604800,
          validLifetime: 2592000,
        },
      ],
    },
  },
];

/**
 * Returns default configuration
 */
export function getDefaultPrefixDelegationConfig(): PrefixDelegationConfig {
  return {
    iaid: 1,
    t1: 302400, // 3.5 days
    t2: 483840, // 5.6 days
    prefixes: [
      {
        prefix: '2001:db8::/56',
        preferredLifetime: 604800, // 7 days
        validLifetime: 2592000, // 30 days
      },
    ],
  };
}
