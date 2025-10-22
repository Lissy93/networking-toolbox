/**
 * DHCP Options 6 & 15 - DNS Servers and Domain Name (RFC 2132)
 *
 * Option 6: Domain Name Server - List of DNS servers available to client
 * Option 15: Domain Name - Domain name for client resolution
 *
 * These options work together to provide complete DNS configuration.
 */

export interface DNSConfig {
  dnsServers: string[];
  domainName?: string;
}

export interface DNSResult {
  option6?: {
    servers: string[];
    hexEncoded: string;
    wireFormat: string;
    totalLength: number;
  };
  option15?: {
    domain: string;
    hexEncoded: string;
    wireFormat: string;
    totalLength: number;
  };
  configExamples: {
    iscDhcpd: string;
    keaDhcp4: string;
    dnsmasq: string;
  };
}

/**
 * Validates an IPv4 address
 */
function validateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255 || part !== num.toString()) {
      return false;
    }
  }
  return true;
}

/**
 * Validates a domain name (FQDN or hostname)
 */
function validateDomainName(domain: string): boolean {
  // Basic domain validation - RFC 1035
  if (domain.length === 0 || domain.length > 253) return false;

  // Allow FQDN with or without trailing dot
  const normalized = domain.endsWith('.') ? domain.slice(0, -1) : domain;

  // Check each label
  const labels = normalized.split('.');
  if (labels.length === 0) return false;

  for (const label of labels) {
    // Label must be 1-63 characters
    if (label.length === 0 || label.length > 63) return false;

    // Must start and end with alphanumeric
    if (!/^[a-zA-Z0-9]/.test(label) || !/[a-zA-Z0-9]$/.test(label)) return false;

    // Can contain alphanumeric and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(label)) return false;
  }

  return true;
}

/**
 * Converts IPv4 address to hex bytes
 */
function ipv4ToHex(ip: string): string {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  return parts.map((p) => p.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts hex bytes to IPv4 address
 */
function hexToIpv4(hex: string): string {
  const bytes = hex.match(/.{1,2}/g) || [];
  return bytes.map((b) => parseInt(b, 16).toString()).join('.');
}

/**
 * Converts domain name to ASCII hex bytes
 */
function domainToHex(domain: string): string {
  // Remove trailing dot if present
  const normalized = domain.endsWith('.') ? domain.slice(0, -1) : domain;

  // Convert to ASCII hex
  return normalized
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hex bytes to domain name
 */
function hexToDomain(hex: string): string {
  const bytes = hex.match(/.{1,2}/g) || [];
  return bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join('');
}

/**
 * Formats hex string as wire format (with spaces)
 */
function formatWireFormat(hex: string): string {
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

/**
 * Validates DNS configuration
 */
export function validateDNSConfig(config: DNSConfig): string[] {
  const errors: string[] = [];

  // Check that at least one option is configured
  const hasDNSServers = config.dnsServers && config.dnsServers.some((s) => s.trim());
  const hasDomainName = config.domainName && config.domainName.trim();

  if (!hasDNSServers && !hasDomainName) {
    errors.push('At least one DNS server or domain name must be configured');
  }

  // Validate DNS servers (Option 6)
  if (config.dnsServers) {
    for (let i = 0; i < config.dnsServers.length; i++) {
      const server = config.dnsServers[i];
      if (!server.trim()) continue;

      if (!validateIPv4(server)) {
        errors.push(`DNS Server ${i + 1}: Invalid IPv4 address`);
      }
    }

    // Check for duplicates
    const validServers = config.dnsServers.filter((s) => s.trim());
    const seen = new Set<string>();
    for (const server of validServers) {
      if (seen.has(server)) {
        errors.push(`Duplicate DNS server: ${server}`);
      }
      seen.add(server);
    }
  }

  // Validate domain name (Option 15)
  if (config.domainName && config.domainName.trim()) {
    if (!validateDomainName(config.domainName.trim())) {
      errors.push('Domain Name: Invalid domain name format');
    }
  }

  return errors;
}

/**
 * Builds DHCP Options 6 and/or 15
 */
export function buildDNSOptions(config: DNSConfig): DNSResult {
  const errors = validateDNSConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const result: Partial<DNSResult> = {};

  // Build Option 6: DNS Servers
  if (config.dnsServers && config.dnsServers.length > 0) {
    const validServers = config.dnsServers.filter((s) => s.trim());

    if (validServers.length > 0) {
      let serversHex = '';
      for (const server of validServers) {
        serversHex += ipv4ToHex(server);
      }

      result.option6 = {
        servers: validServers,
        hexEncoded: serversHex,
        wireFormat: formatWireFormat(serversHex),
        totalLength: serversHex.length / 2,
      };
    }
  }

  // Build Option 15: Domain Name
  if (config.domainName && config.domainName.trim()) {
    const domainInput = config.domainName.trim();
    // Remove trailing dot for consistency
    const domain = domainInput.endsWith('.') ? domainInput.slice(0, -1) : domainInput;
    const domainHex = domainToHex(domain);

    result.option15 = {
      domain,
      hexEncoded: domainHex,
      wireFormat: formatWireFormat(domainHex),
      totalLength: domainHex.length / 2,
    };
  }

  result.configExamples = generateConfigExamples(result.option6?.servers || [], result.option15?.domain);

  return result as DNSResult;
}

/**
 * Decodes DHCP Option 6 (DNS Servers) from hex
 */
export function decodeDNSServersOption(hex: string): DNSResult['option6'] {
  // Remove spaces and validate hex
  const cleanHex = hex.replace(/\s+/g, '');

  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hex string');
  }

  if (cleanHex.length === 0) {
    throw new Error('Hex string cannot be empty');
  }

  if (cleanHex.length % 8 !== 0) {
    throw new Error('Hex string must be multiple of 8 characters (4 bytes per IP)');
  }

  const servers: string[] = [];
  for (let i = 0; i < cleanHex.length; i += 8) {
    const ipHex = cleanHex.substring(i, i + 8);
    servers.push(hexToIpv4(ipHex));
  }

  return {
    servers,
    hexEncoded: cleanHex,
    wireFormat: formatWireFormat(cleanHex),
    totalLength: cleanHex.length / 2,
  };
}

/**
 * Decodes DHCP Option 15 (Domain Name) from hex
 */
export function decodeDomainNameOption(hex: string): DNSResult['option15'] {
  // Remove spaces and validate hex
  const cleanHex = hex.replace(/\s+/g, '');

  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hex string');
  }

  if (cleanHex.length === 0) {
    throw new Error('Hex string cannot be empty');
  }

  const domain = hexToDomain(cleanHex);

  // Validate decoded domain
  if (!validateDomainName(domain)) {
    throw new Error('Decoded domain name is invalid');
  }

  return {
    domain,
    hexEncoded: cleanHex,
    wireFormat: formatWireFormat(cleanHex),
    totalLength: cleanHex.length / 2,
  };
}

/**
 * Generates configuration examples
 */
function generateConfigExamples(
  servers: string[],
  domain?: string,
): {
  iscDhcpd: string;
  keaDhcp4: string;
  dnsmasq: string;
} {
  const hasServers = servers.length > 0;
  const hasDomain = domain && domain.trim();

  let iscDhcpd = 'subnet 192.168.1.0 netmask 255.255.255.0 {\n  range 192.168.1.100 192.168.1.200;\n';
  if (hasServers) {
    iscDhcpd += `  option domain-name-servers ${servers.join(', ')};\n`;
  }
  if (hasDomain) {
    iscDhcpd += `  option domain-name "${domain}";\n`;
  }
  iscDhcpd += '}';

  const optionData: string[] = [];
  if (hasServers) {
    optionData.push(`          {
            "name": "domain-name-servers",
            "code": 6,
            "data": "${servers.join(', ')}"
          }`);
  }
  if (hasDomain) {
    optionData.push(`          {
            "name": "domain-name",
            "code": 15,
            "data": "${domain}"
          }`);
  }

  const keaDhcp4 = `{
  "Dhcp4": {
    "subnet4": [
      {
        "subnet": "192.168.1.0/24",
        "pools": [
          {
            "pool": "192.168.1.100 - 192.168.1.200"
          }
        ],
        "option-data": [
${optionData.join(',\n')}
        ]
      }
    ]
  }
}`;

  let dnsmasq = '';
  if (hasServers) {
    dnsmasq += `dhcp-option=6,${servers.join(',')}\n`;
  }
  if (hasDomain) {
    dnsmasq += `dhcp-option=15,${domain}`;
  }

  return {
    iscDhcpd,
    keaDhcp4,
    dnsmasq: dnsmasq.trim(),
  };
}

/**
 * Example DNS configurations
 */
export const DNS_EXAMPLES = [
  {
    label: 'Google DNS',
    description: 'Public DNS servers from Google',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    domainName: 'example.com',
  },
  {
    label: 'Cloudflare DNS',
    description: 'Fast public DNS from Cloudflare',
    dnsServers: ['1.1.1.1', '1.0.0.1'],
    domainName: 'example.org',
  },
  {
    label: 'Quad9 DNS',
    description: 'Security-focused public DNS',
    dnsServers: ['9.9.9.9', '149.112.112.112'],
    domainName: 'example.net',
  },
  {
    label: 'Corporate Network',
    description: 'Internal DNS servers with company domain',
    dnsServers: ['10.0.1.10', '10.0.1.11'],
    domainName: 'corp.example.com',
  },
  {
    label: 'Single DNS Server',
    description: 'Simple configuration with one DNS server',
    dnsServers: ['192.168.1.1'],
    domainName: 'home.local',
  },
];
