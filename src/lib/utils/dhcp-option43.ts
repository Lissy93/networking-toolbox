/**
 * DHCP Option 43 - Vendor-Specific Information
 *
 * Utilities for generating DHCP Option 43 values for wireless controller discovery.
 * Different vendors encode controller IP addresses in different formats.
 */

export type VendorType =
  | 'cisco-catalyst'
  | 'cisco-meraki'
  | 'ruckus-smartzone'
  | 'ruckus-zonedirector'
  | 'aruba'
  | 'unifi'
  | 'extreme'
  | 'generic';

export interface Option43Result {
  hex: string;
  colonHex: string;
  windowsBinary: string;
  iscDhcp: string;
  infoblox: string;
  mikrotik: string;
  explanation: string;
  subOption?: number;
  iosCommand?: string;
  commandLabel?: string;
  workings?: string[];
}

/**
 * Convert IPv4 address to hexadecimal format
 * Example: "192.168.10.5" -> "c0a80a05"
 */
export function ipToHex(ip: string): string {
  return ip
    .split('.')
    .map((octet) => {
      const num = parseInt(octet, 10);
      return num.toString(16).padStart(2, '0');
    })
    .join('');
}

/**
 * Convert IPv4 address to ASCII hexadecimal format (for Ruckus)
 * Example: "192.168.10.5" -> "3139322e3136382e31302e35"
 * Each character (including dots) is converted to its ASCII hex value
 */
export function ipToAsciiHex(ip: string): string {
  return ip
    .split('')
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to colon-separated format
 * Example: "f108c0a80a05" -> "f1:08:c0:a8:0a:05"
 */
export function hexToColonSeparated(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(':') || '';
}

/**
 * Convert hex string to space-separated pairs for Windows DHCP
 * Example: "f108c0a80a05" -> "f1 08 c0 a8 0a 05"
 */
export function hexToWindowsBinary(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

/**
 * Generate Cisco Option 43 (for Catalyst and legacy WLC)
 * Format: Type (0xF1) + Length (num of IPs * 4) + IP addresses in hex
 */
export function generateCiscoOption43(ips: string[]): Option43Result {
  const type = 'f1'; // Sub-option 241
  const length = (ips.length * 4).toString(16).padStart(2, '0');
  const ipHexValues = ips.map((ip) => ipToHex(ip)).join('');
  const hex = type + length + ipHexValues;

  const explanation = `Cisco uses sub-option 0xF1 (241). Length is ${ips.length} × 4 = ${ips.length * 4} bytes. IP addresses are encoded as hexadecimal octets.`;

  const workings = [
    `Option 43 static prefix for Cisco Wireless LAN Controllers: f1 (hex)`,
    `IP count: ${ips.length}`,
    `IP count × 4 bytes (hex): ${length}`,
    ...ips.map((ip) => `IP ${ip} => ${ipToHex(ip)} (hex)`),
  ];

  return {
    hex,
    colonHex: hexToColonSeparated(hex),
    windowsBinary: hexToWindowsBinary(hex),
    iscDhcp: `option space Cisco_LWAPP_AP;\noption Cisco_LWAPP_AP.server-address code 241 = array of ip-address;\noption local-encapsulation code 43 = encapsulate Cisco_LWAPP_AP;\noption Cisco_LWAPP_AP.server-address ${ips.join(', ')};`,
    infoblox: hexToColonSeparated(hex),
    mikrotik: `option code=43 name=cisco-capwap value='${hex}'`,
    explanation,
    subOption: 241,
    iosCommand: `ip dhcp pool <POOL_NAME>\n option 43 hex ${hex}`,
    commandLabel: 'Cisco IOS/IOS-XE DHCP Server',
    workings,
  };
}

/**
 * Generate Cisco Meraki Option 43
 * Meraki uses a simple ASCII string format
 */
export function generateMerakiOption43(ips: string[]): Option43Result {
  // Meraki uses comma-separated IP addresses in ASCII
  const asciiString = ips.join(',');
  const hex = asciiString
    .split('')
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  const explanation = `Cisco Meraki uses ASCII-encoded comma-separated IP addresses. Each character is converted to hexadecimal.`;

  const workings = [
    `Cisco Meraki uses ASCII-encoded IP addresses`,
    `IP count: ${ips.length}`,
    `Concatenated IP string: ${asciiString} (length: ${asciiString.length} chars)`,
    `Which translates to: ${hex} (hex)`,
  ];

  return {
    hex,
    colonHex: hexToColonSeparated(hex),
    windowsBinary: hexToWindowsBinary(hex),
    iscDhcp: `option vendor-encapsulated-options "${asciiString}";`,
    infoblox: hexToColonSeparated(hex),
    mikrotik: `option code=43 name=meraki value='"${asciiString}"'`,
    explanation,
    iosCommand: `ip dhcp pool <POOL_NAME>\n option 43 hex ${hex}`,
    commandLabel: 'Cisco IOS/IOS-XE DHCP Server',
    workings,
  };
}

/**
 * Generate Ruckus Option 43
 * Format: Vendor code (03 or 06) + Length in hex + IP in ASCII hex
 */
export function generateRuckusOption43(ips: string[], type: 'smartzone' | 'zonedirector'): Option43Result {
  const vendorCode = type === 'smartzone' ? '06' : '03';
  const ip = ips[0]; // Ruckus typically uses single controller
  const asciiHex = ipToAsciiHex(ip);
  const length = (asciiHex.length / 2).toString(16).padStart(2, '0');
  const hex = vendorCode + length + asciiHex;

  const explanation = `Ruckus uses vendor code ${vendorCode} (${type === 'smartzone' ? 'SmartZone' : 'ZoneDirector'}). Length is ${asciiHex.length / 2} bytes. IP address is encoded as ASCII characters converted to hexadecimal.`;

  const vendorName = type === 'smartzone' ? 'Ruckus Wireless (SmartZone)' : 'Ruckus Wireless (ZoneDirector)';
  const workings = [
    `Option 43 static prefix for ${vendorName}: ${vendorCode} (hex)`,
    `IP count: 1`,
    `Concatenated IP string: ${ip} (length: ${ip.length}/0x${ip.length.toString(16).padStart(2, '0')} chars)`,
    `Which translates to: ${asciiHex} (hex)`,
  ];

  // Ruckus controllers can act as DHCP servers
  const ruckusCommand =
    type === 'smartzone'
      ? `config\n dhcp-profile <PROFILE_NAME>\n  option43 sub-option ${parseInt(vendorCode, 16)} type string ${ip}\n  end`
      : `config\n dhcp-profile <PROFILE_NAME>\n  option43 sub-option ${parseInt(vendorCode, 16)} type string ${ip}\n  end`;

  return {
    hex,
    colonHex: hexToColonSeparated(hex),
    windowsBinary: hexToWindowsBinary(hex),
    iscDhcp: `option vendor-class-identifier "Ruckus CPE";\noption vendor-encapsulated-options ${hex};`,
    infoblox: hexToColonSeparated(hex),
    mikrotik: `option code=43 name=ruckus value='${hex}'`,
    explanation,
    subOption: parseInt(vendorCode, 16),
    iosCommand: ruckusCommand,
    commandLabel: type === 'smartzone' ? 'Ruckus SmartZone CLI' : 'Ruckus ZoneDirector CLI',
    workings,
  };
}

/**
 * Generate Aruba Option 43
 * Aruba uses simple ASCII IP address format
 */
export function generateArubaOption43(ips: string[]): Option43Result {
  const ip = ips[0]; // Aruba typically uses single controller
  const hex = ipToAsciiHex(ip);

  const explanation = `Aruba uses ASCII-encoded IP address. The IP ${ip} is converted directly to hexadecimal representation of ASCII characters.`;

  const workings = [
    `Aruba uses ASCII-encoded IP address`,
    `IP count: 1`,
    `IP string: ${ip} (length: ${ip.length} chars)`,
    `Which translates to: ${hex} (hex)`,
  ];

  return {
    hex,
    colonHex: hexToColonSeparated(hex),
    windowsBinary: hexToWindowsBinary(hex),
    iscDhcp: `option vendor-class-identifier "ArubaAP";\noption vendor-encapsulated-options "${ip}";`,
    infoblox: hexToColonSeparated(hex),
    mikrotik: `option code=43 name=aruba value='"${ip}"'`,
    explanation,
    iosCommand: `ip dhcp <PROFILE_NAME>\n option 43 hex ${hex}`,
    commandLabel: 'Aruba OS Switch/Controller',
    workings,
  };
}

/**
 * Generate Ubiquiti UniFi Option 43
 * Format: 01:04 + IP address in hex (single controller only)
 */
export function generateUniFiOption43(ip: string): Option43Result {
  const prefix = '0104'; // Type 01, Length 04
  const ipHex = ipToHex(ip);
  const hex = prefix + ipHex;

  const explanation = `UniFi uses sub-option 01 (type) with length 04 (4 bytes). IP address is encoded as hexadecimal octets. Note: Hex must use UPPERCASE in some configurations.`;

  const workings = [
    `UniFi uses sub-option 01 with length 04`,
    `IP count: 1`,
    `Sub-option prefix: 01 (type) + 04 (length in bytes)`,
    `IP ${ip} => ${ipHex} (hex)`,
  ];

  return {
    hex,
    colonHex: hexToColonSeparated(hex),
    windowsBinary: hexToWindowsBinary(hex),
    iscDhcp: `option space ubnt;\noption ubnt.unifi-address code 1 = ip-address;\noption local-encapsulation code 43 = encapsulate ubnt;\noption ubnt.unifi-address ${ip};`,
    infoblox: hexToColonSeparated(hex),
    mikrotik: `option code=43 name=unifi value='${hex}'`,
    explanation,
    subOption: 1,
    iosCommand: `set service dhcp-server shared-network-name <NETWORK> subnet <SUBNET> static-mapping <MAPPING> static-mapping-parameters "option ubnt-unifi-address ${ip};"`,
    commandLabel: 'UniFi EdgeRouter/USG',
    workings,
  };
}

/**
 * Generate Extreme Networks (Aerohive) Option 43
 * Uses vendor class identifier and option 43
 */
export function generateExtremeOption43(ips: string[]): Option43Result {
  const ip = ips[0];
  const hex = ipToAsciiHex(ip);

  const explanation = `Extreme Networks (formerly Aerohive) uses vendor class identifier with the AP model. Option 43 contains ASCII-encoded controller IP.`;

  const workings = [
    `Extreme Networks uses ASCII-encoded IP address`,
    `IP count: 1`,
    `IP string: ${ip} (length: ${ip.length} chars)`,
    `Which translates to: ${hex} (hex)`,
  ];

  return {
    hex,
    colonHex: hexToColonSeparated(hex),
    windowsBinary: hexToWindowsBinary(hex),
    iscDhcp: `option vendor-class-identifier "HiPath AP";\noption vendor-encapsulated-options "${ip}";`,
    infoblox: hexToColonSeparated(hex),
    mikrotik: `option code=43 name=extreme value='"${ip}"'`,
    explanation,
    iosCommand: `configure dhcp-server <SERVER_NAME> dhcp-option 43 hex ${hex}`,
    commandLabel: 'Extreme Networks Switch',
    workings,
  };
}

/**
 * Generate Option 43 for specified vendor
 */
export function generateOption43(vendor: VendorType, ips: string[]): Option43Result {
  if (ips.length === 0) {
    throw new Error('At least one IP address is required');
  }

  switch (vendor) {
    case 'cisco-catalyst':
      return generateCiscoOption43(ips);
    case 'cisco-meraki':
      return generateMerakiOption43(ips);
    case 'ruckus-smartzone':
      return generateRuckusOption43(ips, 'smartzone');
    case 'ruckus-zonedirector':
      return generateRuckusOption43(ips, 'zonedirector');
    case 'aruba':
      return generateArubaOption43(ips);
    case 'unifi':
      return generateUniFiOption43(ips[0]);
    case 'extreme':
      return generateExtremeOption43(ips);
    case 'generic':
      // Generic TLV format with custom sub-option
      return generateCiscoOption43(ips);
    default:
      throw new Error(`Unsupported vendor: ${vendor}`);
  }
}

/**
 * Validate IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
  const octets = ip.split('.');
  if (octets.length !== 4) return false;

  return octets.every((octet) => {
    const num = parseInt(octet, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && octet === num.toString();
  });
}

/**
 * Parse and validate IP address list (comma or newline separated)
 */
export function parseIPList(input: string): string[] {
  return input
    .split(/[,\n]+/)
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
}

/**
 * Vendor display names and descriptions
 */
export const VENDOR_INFO: Record<VendorType, { name: string; description: string; maxIPs: number }> = {
  'cisco-catalyst': {
    name: 'Cisco Catalyst / WLC',
    description: 'Cisco Wireless LAN Controllers and Catalyst with embedded wireless',
    maxIPs: 10,
  },
  'cisco-meraki': {
    name: 'Cisco Meraki',
    description: 'Cisco Meraki cloud-managed wireless access points',
    maxIPs: 5,
  },
  'ruckus-smartzone': {
    name: 'Ruckus SmartZone',
    description: 'Ruckus SmartZone wireless controllers (vendor code 06)',
    maxIPs: 1,
  },
  'ruckus-zonedirector': {
    name: 'Ruckus ZoneDirector',
    description: 'Ruckus ZoneDirector wireless controllers (vendor code 03)',
    maxIPs: 1,
  },
  aruba: {
    name: 'Aruba / HP Aruba',
    description: 'Aruba Networks wireless controllers',
    maxIPs: 1,
  },
  unifi: {
    name: 'Ubiquiti UniFi',
    description: 'Ubiquiti UniFi Network Controller for access points',
    maxIPs: 1,
  },
  extreme: {
    name: 'Extreme Networks',
    description: 'Extreme Networks (formerly Aerohive) wireless controllers',
    maxIPs: 1,
  },
  generic: {
    name: 'Generic / Custom',
    description: 'Generic TLV format with custom sub-option code',
    maxIPs: 10,
  },
};
