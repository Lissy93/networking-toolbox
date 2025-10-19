/**
 * IAID (Identity Association Identifier) Calculator for DHCPv6
 *
 * IAID is a 32-bit identifier used in DHCPv6 to identify network interfaces.
 * Different operating systems use different conventions for generating IAIDs.
 *
 * RFC 8415 Section 12: IAID should be unique per interface on a client.
 */

export interface IAIDConfig {
  method: 'interface-index' | 'interface-name' | 'mac-address' | 'custom';
  interfaceIndex?: number;
  interfaceName?: string;
  macAddress?: string;
  customValue?: number;
}

export interface IAIDResult {
  iaid: number;
  hex: string;
  decimal: string;
  binary: string;
  method: string;
  osConventions: {
    linux?: string;
    windows?: string;
    macos?: string;
    freebsd?: string;
  };
  collisionWarning?: string;
  configExamples?: {
    keaDhcp6?: string;
    iscDhcpd?: string;
  };
}

/**
 * Common network interface naming conventions per OS
 */
export const INTERFACE_NAMING_GUIDE = {
  linux: {
    title: 'Linux',
    conventions: [
      { pattern: 'eth0, eth1, ...', description: 'Traditional Ethernet naming (older systems)' },
      { pattern: 'ens3, enp3s0, ...', description: 'Predictable naming (systemd): en=ethernet, s=slot, p=port' },
      { pattern: 'wlan0, wlp2s0, ...', description: 'Wireless interfaces: wl=wireless' },
      { pattern: 'lo', description: 'Loopback interface (127.0.0.1)' },
    ],
  },
  windows: {
    title: 'Windows',
    conventions: [
      { pattern: 'Ethernet', description: 'Default wired connection name' },
      { pattern: 'Wi-Fi', description: 'Default wireless connection name' },
      { pattern: 'Local Area Connection', description: 'Legacy naming' },
      { pattern: '{GUID}', description: 'Interface GUID (used internally)' },
    ],
  },
  macos: {
    title: 'macOS',
    conventions: [
      { pattern: 'en0', description: 'Primary Ethernet or built-in Wi-Fi' },
      { pattern: 'en1, en2, ...', description: 'Additional network interfaces' },
      { pattern: 'bridge0', description: 'Network bridge interface' },
      { pattern: 'lo0', description: 'Loopback interface' },
    ],
  },
  freebsd: {
    title: 'FreeBSD',
    conventions: [
      { pattern: 'em0, igb0', description: 'Intel Ethernet (em=1G, igb=multi-G)' },
      { pattern: 're0, rl0', description: 'Realtek Ethernet' },
      { pattern: 'wlan0', description: 'Wireless interfaces' },
      { pattern: 'lo0', description: 'Loopback interface' },
    ],
  },
};

/**
 * Simple hash function for strings (djb2 algorithm)
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Hash MAC address to IAID
 */
function hashMACAddress(mac: string): number {
  // Remove separators and convert to lowercase
  const normalized = mac.replace(/[:\-.]/g, '').toLowerCase();

  // Take last 4 bytes (8 hex chars) and convert to number
  const last8 = normalized.slice(-8);
  return parseInt(last8, 16) >>> 0;
}

/**
 * Validates interface index (must be positive integer)
 */
function validateInterfaceIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= 0xffffffff;
}

/**
 * Validates interface name
 */
function validateInterfaceName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 255;
}

/**
 * Validates MAC address
 */
function validateMACAddress(mac: string): boolean {
  const macRegex = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/;
  const macNoSepRegex = /^[0-9a-fA-F]{12}$/;
  const macCiscoRegex = /^([0-9a-fA-F]{4}\.){2}[0-9a-fA-F]{4}$/;
  return macRegex.test(mac) || macNoSepRegex.test(mac) || macCiscoRegex.test(mac);
}

/**
 * Validates IAID configuration
 */
export function validateIAIDConfig(config: IAIDConfig): string[] {
  const errors: string[] = [];

  switch (config.method) {
    case 'interface-index':
      if (config.interfaceIndex === undefined || config.interfaceIndex === null) {
        errors.push('Interface index is required');
      } else if (!validateInterfaceIndex(config.interfaceIndex)) {
        errors.push('Interface index must be a positive integer between 0 and 4294967295');
      }
      break;

    case 'interface-name':
      if (!config.interfaceName?.trim()) {
        errors.push('Interface name is required');
      } else if (!validateInterfaceName(config.interfaceName)) {
        errors.push('Interface name must be between 1 and 255 characters');
      }
      break;

    case 'mac-address':
      if (!config.macAddress?.trim()) {
        errors.push('MAC address is required');
      } else if (!validateMACAddress(config.macAddress)) {
        errors.push('Invalid MAC address format');
      }
      break;

    case 'custom':
      if (config.customValue === undefined || config.customValue === null) {
        errors.push('Custom IAID value is required');
      } else if (!validateInterfaceIndex(config.customValue)) {
        errors.push('IAID must be a positive integer between 0 and 4294967295');
      }
      break;
  }

  return errors;
}

/**
 * Generate OS-specific conventions
 */
function generateOSConventions(
  method: string,
  iaid: number,
  config: IAIDConfig,
): {
  linux?: string;
  windows?: string;
  macos?: string;
  freebsd?: string;
} {
  const conventions: { linux?: string; windows?: string; macos?: string; freebsd?: string } = {};

  switch (method) {
    case 'interface-index':
      conventions.linux = `Linux typically uses interface index directly. For interface ${config.interfaceIndex}, IAID = ${config.interfaceIndex}`;
      conventions.windows = `Windows may use a hash of interface GUID. This is a simplified calculation.`;
      conventions.macos = `macOS typically uses interface index. IAID = ${config.interfaceIndex}`;
      conventions.freebsd = `FreeBSD uses interface index. IAID = ${config.interfaceIndex}`;
      break;

    case 'interface-name':
      conventions.linux = `Linux dhclient may hash interface name. Hash of "${config.interfaceName}" = 0x${iaid.toString(16)}`;
      conventions.windows = `Windows uses adapter GUID, not interface name.`;
      conventions.macos = `macOS may derive IAID from interface name in some configurations.`;
      conventions.freebsd = `FreeBSD may use interface name hash in some DHCP clients.`;
      break;

    case 'mac-address':
      conventions.linux = `Some Linux DHCP clients derive IAID from MAC address last 4 bytes.`;
      conventions.windows = `Windows typically doesn't use MAC-based IAID.`;
      conventions.macos = `Some macOS configurations may derive IAID from hardware address.`;
      conventions.freebsd = `FreeBSD may use MAC-based IAID in certain configurations.`;
      break;

    case 'custom':
      conventions.linux = `Custom IAID value: 0x${iaid.toString(16)}`;
      conventions.windows = `Custom IAID value: 0x${iaid.toString(16)}`;
      conventions.macos = `Custom IAID value: 0x${iaid.toString(16)}`;
      conventions.freebsd = `Custom IAID value: 0x${iaid.toString(16)}`;
      break;
  }

  return conventions;
}

/**
 * Check for potential IAID collisions
 */
function checkCollisions(iaid: number, method: string): string | undefined {
  // Common collision scenarios
  if (iaid === 0) {
    return 'Warning: IAID 0 may cause issues with some DHCP servers or clients. Consider using a non-zero value.';
  }

  if (iaid === 0xffffffff) {
    return 'Warning: IAID 0xFFFFFFFF (maximum value) may be reserved. Consider using a different value.';
  }

  // Check if IAID is very small (might collide with interface indices)
  if (method !== 'interface-index' && iaid < 256) {
    return 'Warning: This IAID is very small and might collide with interface index-based IAIDs on the same system.';
  }

  return undefined;
}

/**
 * Generate DHCPv6 configuration examples
 */
function generateConfigExamples(
  iaid: number,
  config: IAIDConfig,
): {
  keaDhcp6?: string;
  iscDhcpd?: string;
} {
  const interfaceDesc = config.interfaceName || config.interfaceIndex?.toString() || 'interface';

  // Kea DHCPv6 configuration
  const keaDhcp6 = `{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": ["${interfaceDesc}"]
    },
    "subnet6": [
      {
        "subnet": "2001:db8::/64",
        "pools": [
          {
            "pool": "2001:db8::100 - 2001:db8::200"
          }
        ]
      }
    ],
    "option-data": [
      {
        "name": "dns-servers",
        "data": "2001:4860:4860::8888, 2001:4860:4860::8844"
      }
    ]
  }
}`;

  // ISC DHCPd configuration
  const iscDhcpd = `# DHCPv6 Configuration
# IAID: ${iaid} (${iaid.toString(16).toUpperCase()})

# Configure subnet with IAID for ${interfaceDesc}
subnet6 2001:db8::/64 {
  range6 2001:db8::100 2001:db8::200;

  # Client reservation using IAID
  host client-device {
    # IAID is part of the IA_NA/IA_TA
    # Configure based on client DUID and IAID
    host-identifier option dhcp6.client-id 00:01:00:01:...;
    fixed-address6 2001:db8::50;
  }
}

# Note: IAID ${iaid} is used by the client when requesting addresses`;

  return {
    keaDhcp6,
    iscDhcpd,
  };
}

/**
 * Calculate IAID based on configuration
 */
export function calculateIAID(config: IAIDConfig): IAIDResult {
  const errors = validateIAIDConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  let iaid: number;
  let methodDescription: string;

  switch (config.method) {
    case 'interface-index':
      iaid = config.interfaceIndex!;
      methodDescription = `Interface Index (${config.interfaceIndex})`;
      break;

    case 'interface-name':
      iaid = hashString(config.interfaceName!);
      methodDescription = `Hash of Interface Name "${config.interfaceName}"`;
      break;

    case 'mac-address':
      iaid = hashMACAddress(config.macAddress!);
      methodDescription = `Hash of MAC Address "${config.macAddress}"`;
      break;

    case 'custom':
      iaid = config.customValue!;
      methodDescription = 'Custom Value';
      break;
  }

  const result: IAIDResult = {
    iaid,
    hex: '0x' + iaid.toString(16).padStart(8, '0').toUpperCase(),
    decimal: iaid.toString(),
    binary: '0b' + iaid.toString(2).padStart(32, '0'),
    method: methodDescription,
    osConventions: generateOSConventions(config.method, iaid, config),
    configExamples: generateConfigExamples(iaid, config),
  };

  // Check for collisions
  const collisionWarning = checkCollisions(iaid, config.method);
  if (collisionWarning) {
    result.collisionWarning = collisionWarning;
  }

  return result;
}

/**
 * Example IAID configurations
 */
export const IAID_EXAMPLES: Array<IAIDConfig & { name: string; description: string }> = [
  {
    name: 'Interface Index',
    description: 'Common Linux/Unix approach',
    method: 'interface-index',
    interfaceIndex: 2,
  },
  {
    name: 'Interface Name (eth0)',
    description: 'Hash of interface name',
    method: 'interface-name',
    interfaceName: 'eth0',
  },
  {
    name: 'Interface Name (wlan0)',
    description: 'Hash of wireless interface name',
    method: 'interface-name',
    interfaceName: 'wlan0',
  },
  {
    name: 'MAC Address',
    description: 'Derived from hardware address',
    method: 'mac-address',
    macAddress: '00:0c:29:4f:a3:d2',
  },
  {
    name: 'Custom Value',
    description: 'User-defined IAID',
    method: 'custom',
    customValue: 1000,
  },
];
