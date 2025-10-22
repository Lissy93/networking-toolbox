/**
 * DHCPv6 Client FQDN Option (RFC 4704)
 *
 * Option 39: Client FQDN
 *
 * Allows DHCPv6 clients to exchange FQDN information with servers,
 * enabling dynamic DNS updates.
 */

export interface FQDNConfig {
  fqdn: string;
  serverShouldUpdate: boolean;
  serverOverride: boolean;
  clientShouldUpdate: boolean;
}

export interface FQDNResult {
  flags: {
    S: boolean; // Server should update DNS
    O: boolean; // Server override
    N: boolean; // Client should not update
    flagsByte: string;
    description: string[];
  };
  fqdn: string;
  hexEncoded: string;
  wireFormat: string;
  totalLength: number;
  breakdown: {
    flags: string;
    fqdn: string;
  };
  examples: {
    keaDhcp6?: string;
  };
}

/**
 * Validates FQDN format
 */
function validateFQDN(fqdn: string): boolean {
  // Basic FQDN validation - must be valid domain name
  // Allow labels with alphanumeric chars and hyphens (not at start/end)
  const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  const fqdnRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

  // Check overall format and length
  if (!fqdnRegex.test(fqdn) || fqdn.length > 253) {
    return false;
  }

  // Check each label individually
  const labels = fqdn.split('.');
  for (const label of labels) {
    if (!labelRegex.test(label) || label.length > 63) {
      return false;
    }
  }

  return true;
}

/**
 * Validates FQDN configuration
 */
export function validateFQDNConfig(config: FQDNConfig): string[] {
  const errors: string[] = [];

  // Validate FQDN
  if (!config.fqdn || !config.fqdn.trim()) {
    errors.push('FQDN is required');
  } else if (!validateFQDN(config.fqdn)) {
    errors.push('Invalid FQDN format');
  }

  // Validate flags logic
  if (config.clientShouldUpdate && config.serverShouldUpdate) {
    errors.push('Both client and server cannot be set to update DNS simultaneously');
  }

  return errors;
}

/**
 * Converts a string to hex bytes (UTF-8 encoding)
 */
function stringToHex(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts FQDN to DNS wire format (length-prefixed labels)
 */
function fqdnToHex(fqdn: string): string {
  const labels = fqdn.split('.');
  let hex = '';

  for (const label of labels) {
    const labelLength = label.length;
    hex += labelLength.toString(16).padStart(2, '0');
    hex += stringToHex(label);
  }

  // Add null terminator
  hex += '00';

  return hex;
}

/**
 * Formats hex string as wire format (with spaces)
 */
function formatWireFormat(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

/**
 * Builds DHCPv6 FQDN option
 */
export function buildFQDNOption(config: FQDNConfig): FQDNResult {
  const errors = validateFQDNConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  // Build flags byte
  // Bit 0: S (Server should update)
  // Bit 1: O (Server override)
  // Bit 2: N (Client should NOT update)
  let flagsByte = 0;

  if (config.serverShouldUpdate) {
    flagsByte |= 0b00000001; // Set S bit
  }

  if (config.serverOverride) {
    flagsByte |= 0b00000010; // Set O bit
  }

  if (!config.clientShouldUpdate) {
    flagsByte |= 0b00000100; // Set N bit
  }

  const flagsHex = flagsByte.toString(16).padStart(2, '0');

  // Build FQDN in wire format
  const fqdnHex = fqdnToHex(config.fqdn);

  // Combine flags + FQDN
  const fullHex = flagsHex + fqdnHex;

  const flagDescriptions: string[] = [];
  if (config.serverShouldUpdate) {
    flagDescriptions.push('S=1: Server should perform DNS updates');
  } else {
    flagDescriptions.push('S=0: Server should not perform DNS updates');
  }

  if (config.serverOverride) {
    flagDescriptions.push('O=1: Server can override client preferences');
  } else {
    flagDescriptions.push('O=0: Server should honor client preferences');
  }

  if (!config.clientShouldUpdate) {
    flagDescriptions.push('N=1: Client requests server to perform updates');
  } else {
    flagDescriptions.push('N=0: Client will perform its own updates');
  }

  const result: FQDNResult = {
    flags: {
      S: config.serverShouldUpdate,
      O: config.serverOverride,
      N: !config.clientShouldUpdate,
      flagsByte: flagsHex,
      description: flagDescriptions,
    },
    fqdn: config.fqdn,
    hexEncoded: fullHex,
    wireFormat: formatWireFormat(fullHex),
    totalLength: fullHex.length / 2,
    breakdown: {
      flags: formatWireFormat(flagsHex),
      fqdn: formatWireFormat(fqdnHex),
    },
    examples: generateConfigExamples(config),
  };

  return result;
}

/**
 * Generates Kea DHCPv6 configuration examples
 */
function generateConfigExamples(config: FQDNConfig): {
  keaDhcp6?: string;
} {
  const keaDhcp6 = `{
  "Dhcp6": {
    "ddns-send-updates": ${config.serverShouldUpdate},
    "ddns-override-no-update": ${config.serverOverride},
    "ddns-override-client-update": ${config.serverOverride},
    "ddns-replace-client-name": "${config.serverShouldUpdate ? 'always' : 'never'}",
    "ddns-qualifying-suffix": "${config.fqdn.split('.').slice(1).join('.')}",
    "subnet6": [
      {
        "subnet": "2001:db8::/64",
        "pools": [
          {
            "pool": "2001:db8::100 - 2001:db8::200"
          }
        ]
      }
    ]
  }
}`;

  return {
    keaDhcp6,
  };
}

/**
 * Returns a default FQDN configuration
 */
export function getDefaultFQDNConfig(): FQDNConfig {
  return {
    fqdn: '',
    serverShouldUpdate: true,
    serverOverride: false,
    clientShouldUpdate: false,
  };
}

/**
 * Example FQDN configurations
 */
export const FQDN_EXAMPLES: Array<FQDNConfig & { label: string; description: string }> = [
  {
    label: 'Server Updates DNS',
    description: 'Server performs all DNS updates',
    fqdn: 'client.example.com',
    serverShouldUpdate: true,
    serverOverride: true,
    clientShouldUpdate: false,
  },
  {
    label: 'Client Updates DNS',
    description: 'Client performs its own DNS updates',
    fqdn: 'workstation.corp.example.com',
    serverShouldUpdate: false,
    serverOverride: false,
    clientShouldUpdate: true,
  },
  {
    label: 'Server with Override',
    description: 'Server updates and can override client',
    fqdn: 'managed-device.internal.example.com',
    serverShouldUpdate: true,
    serverOverride: true,
    clientShouldUpdate: false,
  },
  {
    label: 'No Updates',
    description: 'Neither client nor server updates DNS',
    fqdn: 'static.example.org',
    serverShouldUpdate: false,
    serverOverride: false,
    clientShouldUpdate: false,
  },
];
