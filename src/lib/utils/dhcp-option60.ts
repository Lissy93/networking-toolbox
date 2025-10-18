/**
 * DHCP Option 60 - Vendor Class Identifier
 *
 * Utilities for generating DHCP Option 60 vendor class identifiers and
 * corresponding server configuration for class-based scope/policy routing.
 */

export type VendorPreset =
  | 'cisco-phone'
  | 'cisco-ap'
  | 'aruba-ap'
  | 'ruckus-ap'
  | 'unifi-ap'
  | 'meraki-ap'
  | 'pxe-client'
  | 'docsis'
  | 'custom';

export interface NetworkConfig {
  subnet: string; // CIDR notation, e.g., "192.168.10.0/24"
  poolStart: string; // e.g., "192.168.10.100"
  poolEnd: string; // e.g., "192.168.10.200"
  nonMatchingPoolStart?: string; // For deny pool
  nonMatchingPoolEnd?: string; // For deny pool
  serverIp?: string; // TFTP/Boot server IP
  bootFilename?: string; // Boot file name
  mikrotikServerName?: string; // MikroTik DHCP server name
  leaseTime?: string; // Lease time for dnsmasq (e.g., "24h", "1h")
}

export interface Option60Result {
  vendorClass: string;
  description: string;
  iscDhcpConfig: string;
  keaConfig: string;
  windowsConfig: string;
  dnsmasqConfig: string;
  mikrotikConfig: string;
  useCase: string;
}

/**
 * Extract network address and netmask from CIDR notation
 */
function cidrToNetmask(cidr: string): { network: string; netmask: string } {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  // Convert prefix length to netmask
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const netmask = [(mask >>> 24) & 0xff, (mask >>> 16) & 0xff, (mask >>> 8) & 0xff, mask & 0xff].join('.');

  return { network, netmask };
}

/**
 * Get default network configuration for a preset
 */
export function getDefaultNetworkConfig(preset: VendorPreset): NetworkConfig {
  switch (preset) {
    case 'cisco-phone':
      return {
        subnet: '192.168.10.0/24',
        poolStart: '192.168.10.100',
        poolEnd: '192.168.10.200',
        nonMatchingPoolStart: '192.168.10.50',
        nonMatchingPoolEnd: '192.168.10.99',
        serverIp: '192.168.10.5',
        bootFilename: 'SEPDefault.cnf.xml',
        mikrotikServerName: 'dhcp1',
        leaseTime: '24h',
      };
    case 'cisco-ap':
    case 'aruba-ap':
    case 'ruckus-ap':
    case 'unifi-ap':
    case 'meraki-ap':
      return {
        subnet: '192.168.20.0/24',
        poolStart: '192.168.20.100',
        poolEnd: '192.168.20.200',
        nonMatchingPoolStart: '192.168.20.50',
        nonMatchingPoolEnd: '192.168.20.99',
        mikrotikServerName: 'dhcp1',
        leaseTime: '24h',
      };
    case 'pxe-client':
      return {
        subnet: '192.168.30.0/24',
        poolStart: '192.168.30.100',
        poolEnd: '192.168.30.200',
        nonMatchingPoolStart: '192.168.30.50',
        nonMatchingPoolEnd: '192.168.30.99',
        serverIp: '192.168.30.5',
        bootFilename: 'pxelinux.0',
        mikrotikServerName: 'dhcp1',
        leaseTime: '1h',
      };
    case 'docsis':
      return {
        subnet: '10.0.0.0/24',
        poolStart: '10.0.0.100',
        poolEnd: '10.0.0.200',
        serverIp: '10.0.0.5',
        bootFilename: 'modem.cfg',
        mikrotikServerName: 'dhcp1',
        leaseTime: '24h',
      };
    case 'custom':
    default:
      return {
        subnet: '192.168.0.0/24',
        poolStart: '192.168.0.100',
        poolEnd: '192.168.0.200',
        nonMatchingPoolStart: '192.168.0.50',
        nonMatchingPoolEnd: '192.168.0.99',
        mikrotikServerName: 'dhcp1',
        leaseTime: '24h',
      };
  }
}

/**
 * Vendor preset information with common VCI strings
 */
export const VENDOR_PRESETS: Record<
  VendorPreset,
  { name: string; description: string; defaultValue: string; useCase: string }
> = {
  'cisco-phone': {
    name: 'Cisco IP Phones',
    description: 'Cisco Unified IP Phones (79xx, 88xx series)',
    defaultValue: 'Cisco Systems, Inc. IP Phone',
    useCase: 'Route phones to voice VLAN with TFTP server options',
  },
  'cisco-ap': {
    name: 'Cisco Aironet AP',
    description: 'Cisco Aironet wireless access points',
    defaultValue: 'Cisco AP',
    useCase: 'Provide controller discovery via Option 43',
  },
  'aruba-ap': {
    name: 'Aruba Access Points',
    description: 'Aruba wireless access points',
    defaultValue: 'ArubaAP',
    useCase: 'Provide controller IP via Option 43',
  },
  'ruckus-ap': {
    name: 'Ruckus Access Points',
    description: 'Ruckus wireless access points',
    defaultValue: 'Ruckus CPE',
    useCase: 'Provide controller discovery information',
  },
  'unifi-ap': {
    name: 'Ubiquiti UniFi AP',
    description: 'Ubiquiti UniFi access points',
    defaultValue: 'ubnt',
    useCase: 'Provide UniFi controller address via Option 43',
  },
  'meraki-ap': {
    name: 'Cisco Meraki AP',
    description: 'Cisco Meraki cloud-managed access points',
    defaultValue: 'Meraki AP',
    useCase: 'Cloud controller discovery configuration',
  },
  'pxe-client': {
    name: 'PXE Boot Client',
    description: 'Pre-boot execution environment clients',
    defaultValue: 'PXEClient',
    useCase: 'Network boot with TFTP server and boot filename',
  },
  docsis: {
    name: 'DOCSIS Cable Modem',
    description: 'Cable modem DOCSIS devices',
    defaultValue: 'docsis3.0',
    useCase: 'Cable modem provisioning with config file server',
  },
  custom: {
    name: 'Custom String',
    description: 'Custom vendor class identifier',
    defaultValue: '',
    useCase: 'Custom class-based DHCP policy',
  },
};

/**
 * Generate ISC DHCP Server configuration for vendor class matching
 */
export function generateIscDhcpConfig(vendorClass: string, preset: VendorPreset, networkConfig: NetworkConfig): string {
  const className = vendorClass.replace(/[^a-zA-Z0-9]/g, '_');
  const { network, netmask } = cidrToNetmask(networkConfig.subnet);

  let config = `# ISC DHCP Server Configuration
# Match clients with vendor class: "${vendorClass}"

class "${className}" {
  match if option vendor-class-identifier = "${vendorClass}";
}

`;

  // Add preset-specific configuration examples
  switch (preset) {
    case 'cisco-phone':
      config += `# Subnet with class-specific options for Cisco phones
subnet ${network} netmask ${netmask} {
  pool {
    allow members of "${className}";
    range ${networkConfig.poolStart} ${networkConfig.poolEnd};

    # Voice VLAN TFTP server
    option tftp-server-name "${networkConfig.serverIp}";
    option bootfile-name "${networkConfig.bootFilename}";
  }`;
      if (networkConfig.nonMatchingPoolStart && networkConfig.nonMatchingPoolEnd) {
        config += `

  # Regular data pool
  pool {
    deny members of "${className}";
    range ${networkConfig.nonMatchingPoolStart} ${networkConfig.nonMatchingPoolEnd};
  }`;
      }
      config += '\n}';
      break;

    case 'cisco-ap':
    case 'aruba-ap':
    case 'ruckus-ap':
    case 'unifi-ap':
    case 'meraki-ap':
      config += `# Subnet with class-specific options for wireless APs
subnet ${network} netmask ${netmask} {
  pool {
    allow members of "${className}";
    range ${networkConfig.poolStart} ${networkConfig.poolEnd};

    # Provide controller via Option 43
    option vendor-encapsulated-options <OPTION_43_HEX>;
  }`;
      if (networkConfig.nonMatchingPoolStart && networkConfig.nonMatchingPoolEnd) {
        config += `

  pool {
    deny members of "${className}";
    range ${networkConfig.nonMatchingPoolStart} ${networkConfig.nonMatchingPoolEnd};
  }`;
      }
      config += '\n}';
      break;

    case 'pxe-client':
      config += `# Subnet with PXE boot configuration
subnet ${network} netmask ${netmask} {
  pool {
    allow members of "${className}";
    range ${networkConfig.poolStart} ${networkConfig.poolEnd};

    # PXE boot options
    next-server ${networkConfig.serverIp};
    filename "${networkConfig.bootFilename}";
  }`;
      if (networkConfig.nonMatchingPoolStart && networkConfig.nonMatchingPoolEnd) {
        config += `

  pool {
    deny members of "${className}";
    range ${networkConfig.nonMatchingPoolStart} ${networkConfig.nonMatchingPoolEnd};
  }`;
      }
      config += '\n}';
      break;

    case 'docsis':
      config += `# Subnet with DOCSIS cable modem configuration
subnet ${network} netmask ${netmask} {
  pool {
    allow members of "${className}";
    range ${networkConfig.poolStart} ${networkConfig.poolEnd};

    # DOCSIS config file server
    option tftp-server-name "${networkConfig.serverIp}";
    option bootfile-name "${networkConfig.bootFilename}";
  }
}`;
      break;

    default:
      config += `# Subnet with class-specific pool
subnet ${network} netmask ${netmask} {
  pool {
    allow members of "${className}";
    range ${networkConfig.poolStart} ${networkConfig.poolEnd};

    # Add class-specific options here
  }`;
      if (networkConfig.nonMatchingPoolStart && networkConfig.nonMatchingPoolEnd) {
        config += `

  pool {
    deny members of "${className}";
    range ${networkConfig.nonMatchingPoolStart} ${networkConfig.nonMatchingPoolEnd};
  }`;
      }
      config += '\n}';
  }

  return config;
}

/**
 * Generate Kea DHCP Server configuration for vendor class matching
 */
export function generateKeaConfig(vendorClass: string, preset: VendorPreset, networkConfig: NetworkConfig): string {
  const className = vendorClass.replace(/[^a-zA-Z0-9]/g, '_');

  let optionData = '';

  switch (preset) {
    case 'cisco-phone':
      optionData = `,
        "option-data": [
          {
            "name": "tftp-server-name",
            "data": "${networkConfig.serverIp}"
          },
          {
            "name": "boot-file-name",
            "data": "${networkConfig.bootFilename}"
          }
        ]`;
      break;

    case 'cisco-ap':
    case 'aruba-ap':
    case 'ruckus-ap':
    case 'unifi-ap':
    case 'meraki-ap':
      optionData = `,
        "option-data": [
          {
            "name": "vendor-encapsulated-options",
            "data": "<OPTION_43_HEX>"
          }
        ]`;
      break;

    case 'pxe-client':
      optionData = `,
        "next-server": "${networkConfig.serverIp}",
        "boot-file-name": "${networkConfig.bootFilename}"`;
      break;

    case 'docsis':
      optionData = `,
        "option-data": [
          {
            "name": "tftp-server-name",
            "data": "${networkConfig.serverIp}"
          },
          {
            "name": "boot-file-name",
            "data": "${networkConfig.bootFilename}"
          }
        ]`;
      break;
  }

  let pools = `          {
            "pool": "${networkConfig.poolStart} - ${networkConfig.poolEnd}",
            "client-class": "${className}"${optionData}
          }`;

  if (networkConfig.nonMatchingPoolStart && networkConfig.nonMatchingPoolEnd) {
    pools += `,
          {
            "pool": "${networkConfig.nonMatchingPoolStart} - ${networkConfig.nonMatchingPoolEnd}",
            "require-client-classes": [ "!${className}" ]
          }`;
  }

  return `{
  "Dhcp4": {
    "client-classes": [
      {
        "name": "${className}",
        "test": "option[60].text == '${vendorClass}'",
        "only-if-required": true
      }
    ],
    "subnet4": [
      {
        "subnet": "${networkConfig.subnet}",
        "pools": [
${pools}
        ]
      }
    ]
  }
}`;
}

/**
 * Generate Windows DHCP Server configuration for vendor class matching
 */
export function generateWindowsConfig(vendorClass: string, preset: VendorPreset, networkConfig: NetworkConfig): string {
  let config = `# Windows DHCP Server Configuration
# PowerShell commands for vendor class-based policies

# 1. Add vendor class definition
Add-DhcpServerv4Class -Name "${vendorClass}" \\
  -Type Vendor \\
  -Data "${vendorClass}" \\
  -Description "Vendor class for ${vendorClass}"

# 2. Create a policy to match the vendor class
Add-DhcpServerv4Policy -Name "${vendorClass}_Policy" \\
  -Condition Or \\
  -VendorClass EQ,"${vendorClass}"

`;

  switch (preset) {
    case 'cisco-phone':
      config += `# 3. Set policy-specific options for Cisco phones
Set-DhcpServerv4OptionValue -PolicyName "${vendorClass}_Policy" \\
  -OptionId 66 -Value "${networkConfig.serverIp}"  # TFTP Server

Set-DhcpServerv4OptionValue -PolicyName "${vendorClass}_Policy" \\
  -OptionId 67 -Value "${networkConfig.bootFilename}"  # Boot filename

# 4. Create separate scope range for phones (optional)
# Use GUI or Add-DhcpServerv4ExclusionRange to segment IP ranges`;
      break;

    case 'cisco-ap':
    case 'aruba-ap':
    case 'ruckus-ap':
    case 'unifi-ap':
    case 'meraki-ap':
      config += `# 3. Set Option 43 for wireless controller discovery
Set-DhcpServerv4OptionValue -PolicyName "${vendorClass}_Policy" \\
  -OptionId 43 -Value <OPTION_43_BINARY>  # Vendor-specific info

# Note: Use space-separated hex bytes for Option 43
# Example: f1 08 c0 a8 01 0a c0 a8 01 0b`;
      break;

    case 'pxe-client':
      config += `# 3. Set PXE boot options
Set-DhcpServerv4OptionValue -PolicyName "${vendorClass}_Policy" \\
  -OptionId 66 -Value "${networkConfig.serverIp}"  # TFTP Server

Set-DhcpServerv4OptionValue -PolicyName "${vendorClass}_Policy" \\
  -OptionId 67 -Value "${networkConfig.bootFilename}"  # Boot filename`;
      break;

    case 'docsis':
      config += `# 3. Set DOCSIS provisioning options
Set-DhcpServerv4OptionValue -PolicyName "${vendorClass}_Policy" \\
  -OptionId 66 -Value "${networkConfig.serverIp}"  # Config file server

Set-DhcpServerv4OptionValue -PolicyName "${vendorClass}_Policy" \\
  -OptionId 67 -Value "${networkConfig.bootFilename}"  # Config filename`;
      break;

    default:
      config += `# 3. Set class-specific options
Set-DhcpServerv4OptionValue -PolicyName "${vendorClass}_Policy" \\
  -OptionId <OPTION_ID> -Value "<VALUE>"`;
  }

  return config;
}

/**
 * Generate dnsmasq configuration for vendor class matching
 */
export function generateDnsmasqConfig(vendorClass: string, preset: VendorPreset, networkConfig: NetworkConfig): string {
  let config = `# dnsmasq Configuration
# Match vendor class identifier: ${vendorClass}

`;

  switch (preset) {
    case 'cisco-phone':
      config += `# Tag clients with this vendor class
dhcp-vendorclass=set:cisco_phone,${vendorClass}

# Provide TFTP server and boot file for tagged clients
dhcp-option=tag:cisco_phone,66,${networkConfig.serverIp}
dhcp-option=tag:cisco_phone,67,${networkConfig.bootFilename}

# Separate IP range for phones (optional)
dhcp-range=tag:cisco_phone,${networkConfig.poolStart},${networkConfig.poolEnd},${networkConfig.leaseTime || '24h'}`;
      break;

    case 'cisco-ap':
    case 'aruba-ap':
    case 'ruckus-ap':
    case 'unifi-ap':
    case 'meraki-ap':
      config += `# Tag clients with this vendor class
dhcp-vendorclass=set:wireless_ap,${vendorClass}

# Provide Option 43 for controller discovery
dhcp-option=tag:wireless_ap,43,<OPTION_43_HEX>

# Separate IP range for APs (optional)
dhcp-range=tag:wireless_ap,${networkConfig.poolStart},${networkConfig.poolEnd},${networkConfig.leaseTime || '24h'}`;
      break;

    case 'pxe-client':
      config += `# Tag PXE clients
dhcp-vendorclass=set:pxe_client,${vendorClass}

# PXE boot configuration
dhcp-boot=tag:pxe_client,${networkConfig.bootFilename},tftp-server,${networkConfig.serverIp}

# IP range for PXE clients
dhcp-range=tag:pxe_client,${networkConfig.poolStart},${networkConfig.poolEnd},${networkConfig.leaseTime || '1h'}`;
      break;

    case 'docsis':
      config += `# Tag DOCSIS modems
dhcp-vendorclass=set:docsis,${vendorClass}

# DOCSIS provisioning
dhcp-option=tag:docsis,66,${networkConfig.serverIp}
dhcp-option=tag:docsis,67,${networkConfig.bootFilename}

# IP range for modems
dhcp-range=tag:docsis,${networkConfig.poolStart},${networkConfig.poolEnd},${networkConfig.leaseTime || '24h'}`;
      break;

    default:
      config += `# Tag clients with this vendor class
dhcp-vendorclass=set:custom_class,${vendorClass}

# Add class-specific options
dhcp-option=tag:custom_class,<OPTION_ID>,<VALUE>

# Separate IP range (optional)
dhcp-range=tag:custom_class,${networkConfig.poolStart},${networkConfig.poolEnd},${networkConfig.leaseTime || '24h'}`;
  }

  return config;
}

/**
 * Generate MikroTik RouterOS configuration for vendor class matching
 */
export function generateMikrotikConfig(
  vendorClass: string,
  preset: VendorPreset,
  networkConfig: NetworkConfig,
): string {
  let config = `# MikroTik RouterOS Configuration
# DHCP server with vendor class matching

`;

  switch (preset) {
    case 'cisco-phone':
      config += `# Create DHCP option sets for Cisco phones
/ip dhcp-server option
add name=tftp-server code=66 value="'${networkConfig.serverIp}'"
add name=boot-file code=67 value="'${networkConfig.bootFilename}'"
add name=cisco-phone-options option=tftp-server,boot-file

# Add matcher for vendor class
/ip dhcp-server matcher
add name=cisco-phone-matcher \\
  code=60 \\
  value="${vendorClass}" \\
  server=${networkConfig.mikrotikServerName || 'dhcp1'}

# Apply options to matched clients
/ip dhcp-server network
set [find address=${networkConfig.subnet}] \\
  dhcp-option-set=cisco-phone-options \\
  dhcp-option-set-when-matched=cisco-phone-matcher`;
      break;

    case 'cisco-ap':
    case 'aruba-ap':
    case 'ruckus-ap':
    case 'unifi-ap':
    case 'meraki-ap':
      config += `# Create Option 43 for controller discovery
/ip dhcp-server option
add name=controller-option code=43 value=<OPTION_43_HEX>

# Add matcher for vendor class
/ip dhcp-server matcher
add name=ap-matcher \\
  code=60 \\
  value="${vendorClass}" \\
  server=${networkConfig.mikrotikServerName || 'dhcp1'}

# Apply options to matched APs
/ip dhcp-server network
set [find address=${networkConfig.subnet}] \\
  dhcp-option-set=controller-option \\
  dhcp-option-set-when-matched=ap-matcher`;
      break;

    case 'pxe-client':
      config += `# Create PXE boot options
/ip dhcp-server option
add name=tftp-server code=66 value="'${networkConfig.serverIp}'"
add name=boot-file code=67 value="'${networkConfig.bootFilename}'"
add name=pxe-options option=tftp-server,boot-file

# Add matcher for PXE clients
/ip dhcp-server matcher
add name=pxe-matcher \\
  code=60 \\
  value="${vendorClass}" \\
  server=${networkConfig.mikrotikServerName || 'dhcp1'}

# Apply PXE options
/ip dhcp-server network
set [find address=${networkConfig.subnet}] \\
  dhcp-option-set=pxe-options \\
  dhcp-option-set-when-matched=pxe-matcher`;
      break;

    case 'docsis':
      config += `# Create DOCSIS provisioning options
/ip dhcp-server option
add name=config-server code=66 value="'${networkConfig.serverIp}'"
add name=config-file code=67 value="'${networkConfig.bootFilename}'"
add name=docsis-options option=config-server,config-file

# Add matcher for DOCSIS modems
/ip dhcp-server matcher
add name=docsis-matcher \\
  code=60 \\
  value="${vendorClass}" \\
  server=${networkConfig.mikrotikServerName || 'dhcp1'}

# Apply options to modems
/ip dhcp-server network
set [find address=${networkConfig.subnet}] \\
  dhcp-option-set=docsis-options \\
  dhcp-option-set-when-matched=docsis-matcher`;
      break;

    default:
      config += `# Add matcher for vendor class
/ip dhcp-server matcher
add name=custom-matcher \\
  code=60 \\
  value="${vendorClass}" \\
  server=${networkConfig.mikrotikServerName || 'dhcp1'}

# Apply options to matched clients
/ip dhcp-server network
set [find address=${networkConfig.subnet}] \\
  dhcp-option-set=<YOUR_OPTION_SET> \\
  dhcp-option-set-when-matched=custom-matcher`;
  }

  return config;
}

/**
 * Generate Option 60 configuration for all server types
 */
export function generateOption60(
  preset: VendorPreset,
  customValue?: string,
  networkConfig?: NetworkConfig,
): Option60Result {
  const vendorInfo = VENDOR_PRESETS[preset];
  const vendorClass = preset === 'custom' && customValue ? customValue : vendorInfo.defaultValue;

  if (!vendorClass) {
    throw new Error('Vendor class identifier cannot be empty');
  }

  // Use provided network config or get defaults for the preset
  const config = networkConfig || getDefaultNetworkConfig(preset);

  return {
    vendorClass,
    description: vendorInfo.description,
    iscDhcpConfig: generateIscDhcpConfig(vendorClass, preset, config),
    keaConfig: generateKeaConfig(vendorClass, preset, config),
    windowsConfig: generateWindowsConfig(vendorClass, preset, config),
    dnsmasqConfig: generateDnsmasqConfig(vendorClass, preset, config),
    mikrotikConfig: generateMikrotikConfig(vendorClass, preset, config),
    useCase: vendorInfo.useCase,
  };
}

/**
 * Validate vendor class identifier string
 * RFC 2132: ASCII string, typically 1-255 characters
 */
export function isValidVendorClass(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length === 0) return false;
  if (trimmed.length > 255) return false;

  // Check for printable ASCII characters (32-126)
  return /^[\x20-\x7E]+$/.test(trimmed);
}
