/**
 * DHCPv6 DNS Options (RFC 3646)
 *
 * Option 23: DNS Recursive Name Server
 * Option 24: Domain Search List
 *
 * Allows configuration of DNS servers and search domains for DHCPv6 clients.
 */

export interface DNSv6Config {
  dnsServers: string[];
  searchDomains: string[];
}

export interface DNSv6Result {
  option23?: {
    servers: string[];
    hexEncoded: string;
    wireFormat: string;
    totalLength: number;
  };
  option24?: {
    domains: string[];
    hexEncoded: string;
    wireFormat: string;
    totalLength: number;
    breakdown: Array<{
      domain: string;
      hex: string;
      wireFormat: string;
    }>;
  };
  examples: {
    keaDhcp6?: string;
  };
}

/**
 * Validates an IPv6 address
 */
function validateIPv6(ip: string): boolean {
  // Comprehensive IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  const ipv6CompressedRegex = /^::([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4}$/;
  const ipv6FullCompressedRegex = /^::$/;
  const ipv6MixedRegex = /^([0-9a-fA-F]{0,4}:){6}\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

  return (
    ipv6Regex.test(ip) || ipv6CompressedRegex.test(ip) || ipv6FullCompressedRegex.test(ip) || ipv6MixedRegex.test(ip)
  );
}

/**
 * Validates FQDN (Fully Qualified Domain Name)
 */
function validateFQDN(fqdn: string): boolean {
  // Basic FQDN validation
  const fqdnRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return fqdnRegex.test(fqdn) && fqdn.length <= 253;
}

/**
 * Converts IPv6 address to hex bytes (16 bytes)
 */
function ipv6ToHex(ip: string): string {
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

  // Convert to hex bytes
  return segments.join('');
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
 * Validates DNS configuration
 */
export function validateDNSv6Config(config: DNSv6Config): string[] {
  const errors: string[] = [];

  // Check that at least one option is configured
  const hasDNSServers = config.dnsServers && config.dnsServers.some((s) => s.trim());
  const hasSearchDomains = config.searchDomains && config.searchDomains.some((d) => d.trim());

  if (!hasDNSServers && !hasSearchDomains) {
    errors.push('At least one DNS server or search domain must be configured');
  }

  // Validate DNS servers (Option 23)
  if (config.dnsServers) {
    for (let i = 0; i < config.dnsServers.length; i++) {
      const server = config.dnsServers[i];
      if (!server.trim()) continue;

      if (!validateIPv6(server)) {
        errors.push(`DNS Server ${i + 1}: Invalid IPv6 address`);
      }
    }
  }

  // Validate search domains (Option 24)
  if (config.searchDomains) {
    for (let i = 0; i < config.searchDomains.length; i++) {
      const domain = config.searchDomains[i];
      if (!domain.trim()) continue;

      if (!validateFQDN(domain)) {
        errors.push(`Search Domain ${i + 1}: Invalid domain name format`);
      }
    }
  }

  return errors;
}

/**
 * Builds DHCPv6 DNS options
 */
export function buildDNSv6Options(config: DNSv6Config): DNSv6Result {
  const errors = validateDNSv6Config(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const result: DNSv6Result = {
    examples: {},
  };

  // Build Option 23: DNS Recursive Name Server
  if (config.dnsServers && config.dnsServers.length > 0) {
    const validServers = config.dnsServers.filter((s) => s.trim());

    if (validServers.length > 0) {
      let serversHex = '';

      for (const server of validServers) {
        serversHex += ipv6ToHex(server);
      }

      result.option23 = {
        servers: validServers,
        hexEncoded: serversHex,
        wireFormat: formatWireFormat(serversHex),
        totalLength: serversHex.length / 2,
      };
    }
  }

  // Build Option 24: Domain Search List
  if (config.searchDomains && config.searchDomains.length > 0) {
    const validDomains = config.searchDomains.filter((d) => d.trim());

    if (validDomains.length > 0) {
      let domainsHex = '';
      const breakdown: Array<{ domain: string; hex: string; wireFormat: string }> = [];

      for (const domain of validDomains) {
        const domainHex = fqdnToHex(domain);
        domainsHex += domainHex;

        breakdown.push({
          domain,
          hex: domainHex,
          wireFormat: formatWireFormat(domainHex),
        });
      }

      result.option24 = {
        domains: validDomains,
        hexEncoded: domainsHex,
        wireFormat: formatWireFormat(domainsHex),
        totalLength: domainsHex.length / 2,
        breakdown,
      };
    }
  }

  // Generate configuration examples
  result.examples = generateConfigExamples(result);

  return result;
}

/**
 * Generates Kea DHCPv6 configuration examples
 */
function generateConfigExamples(result: DNSv6Result): {
  keaDhcp6?: string;
} {
  const optionData: string[] = [];

  // Add Option 23 if present
  if (result.option23) {
    optionData.push(`          {
            "name": "dns-servers",
            "code": 23,
            "data": "${result.option23.servers.join(', ')}"
          }`);
  }

  // Add Option 24 if present
  if (result.option24) {
    optionData.push(`          {
            "name": "domain-search",
            "code": 24,
            "data": "${result.option24.domains.join(', ')}"
          }`);
  }

  if (optionData.length === 0) {
    return {};
  }

  const keaDhcp6 = `{
  "Dhcp6": {
    "subnet6": [
      {
        "subnet": "2001:db8::/64",
        "pools": [
          {
            "pool": "2001:db8::100 - 2001:db8::200"
          }
        ],
        "option-data": [
${optionData.join(',\n')}
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
 * Returns a default DNS configuration
 */
export function getDefaultDNSv6Config(): DNSv6Config {
  return {
    dnsServers: [],
    searchDomains: [],
  };
}

/**
 * Example DNS configurations
 */
export const DNSv6_EXAMPLES: DNSv6Config[] = [
  {
    dnsServers: ['2001:4860:4860::8888', '2001:4860:4860::8844'],
    searchDomains: ['example.com', 'example.org'],
  },
  {
    dnsServers: ['2606:4700:4700::1111', '2606:4700:4700::1001'],
    searchDomains: ['local.example.com'],
  },
  {
    dnsServers: ['2620:fe::fe', '2620:fe::9'],
    searchDomains: ['corp.example.com', 'internal.example.com', 'vpn.example.com'],
  },
  {
    dnsServers: ['fd00::1'],
    searchDomains: ['home.arpa'],
  },
];
