/**
 * DHCP Option 119 - Domain Search List (RFC 3397 / RFC 6731)
 * Utilities for encoding/decoding domain names to/from RFC 1035 wire format
 */

export interface DomainSearchConfig {
  domains: string[];
  network?: {
    subnet?: string;
    netmask?: string;
    rangeStart?: string;
    rangeEnd?: string;
  };
}

export interface DomainSearchResult {
  hexEncoded: string;
  wireFormat: string;
  domainList: string[];
  totalLength: number;
  examples: {
    iscDhcpd?: string;
    keaDhcp4?: string;
  };
}

export interface ParsedDomainSearch {
  domains: string[];
  totalLength: number;
  rawHex: string;
}

/**
 * Encode domain name to RFC 1035 wire format (without compression)
 * Example: "example.com" -> 07 65 78 61 6d 70 6c 65 03 63 6f 6d 00
 * Note: This function is kept for reference but not currently used.
 * The encodeDomainsWithCompression function is used instead for better efficiency.
 */
function _encodeDomainName(domain: string): number[] {
  const labels = domain.split('.');
  const bytes: number[] = [];

  for (const label of labels) {
    if (label.length === 0) continue;
    if (label.length > 63) {
      throw new Error(`Label "${label}" exceeds maximum length of 63 characters`);
    }

    // Length byte
    bytes.push(label.length);

    // Label characters
    for (let i = 0; i < label.length; i++) {
      bytes.push(label.charCodeAt(i));
    }
  }

  // Terminating null byte
  bytes.push(0);

  return bytes;
}

/**
 * Encode multiple domains with compression for common suffixes
 */
function encodeDomainsWithCompression(domains: string[]): number[] {
  const bytes: number[] = [];
  const domainOffsets: Map<string, number> = new Map();

  for (const domain of domains) {
    const labels = domain.split('.');
    let currentOffset = bytes.length;

    for (let i = 0; i < labels.length; i++) {
      const suffix = labels.slice(i).join('.');
      const existingOffset = domainOffsets.get(suffix);

      if (existingOffset !== undefined && existingOffset < 16384) {
        // Use compression pointer (0xC0 | high bits, low bits)
        const pointer = 0xc000 | existingOffset;
        bytes.push((pointer >> 8) & 0xff);
        bytes.push(pointer & 0xff);
        break;
      } else {
        // Store this suffix offset for future compression
        domainOffsets.set(suffix, currentOffset);

        const label = labels[i];
        if (label.length > 63) {
          throw new Error(`Label "${label}" exceeds maximum length of 63 characters`);
        }

        // Length byte
        bytes.push(label.length);
        currentOffset++;

        // Label characters
        for (let j = 0; j < label.length; j++) {
          bytes.push(label.charCodeAt(j));
          currentOffset++;
        }

        // If this was the last label, add terminating null
        if (i === labels.length - 1) {
          bytes.push(0);
        }
      }
    }
  }

  return bytes;
}

/**
 * Parse RFC 1035 wire format to domain names
 */
function parseWireFormat(bytes: number[]): string[] {
  const domains: string[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const domain = parseDomainAtOffset(bytes, offset);
    if (domain.name === '') break;

    domains.push(domain.name);
    offset = domain.nextOffset;
  }

  return domains;
}

interface ParsedDomain {
  name: string;
  nextOffset: number;
}

function parseDomainAtOffset(bytes: number[], startOffset: number): ParsedDomain {
  const labels: string[] = [];
  let offset = startOffset;
  const visited = new Set<number>();

  while (offset < bytes.length) {
    if (visited.has(offset)) {
      throw new Error('Compression pointer loop detected');
    }
    visited.add(offset);

    const length = bytes[offset];

    // Check for compression pointer (top 2 bits set: 11xxxxxx)
    if ((length & 0xc0) === 0xc0) {
      if (offset + 1 >= bytes.length) {
        throw new Error('Invalid compression pointer');
      }
      const pointer = ((length & 0x3f) << 8) | bytes[offset + 1];
      const compressed = parseDomainAtOffset(bytes, pointer);
      labels.push(compressed.name);
      return {
        name: labels.join('.'),
        nextOffset: offset + 2,
      };
    }

    // Terminating null byte
    if (length === 0) {
      return {
        name: labels.join('.'),
        nextOffset: offset + 1,
      };
    }

    // Regular label
    if (offset + 1 + length > bytes.length) {
      throw new Error('Label extends beyond data');
    }

    let label = '';
    for (let i = 1; i <= length; i++) {
      label += String.fromCharCode(bytes[offset + i]);
    }
    labels.push(label);
    offset += length + 1;
  }

  return {
    name: labels.join('.'),
    nextOffset: offset,
  };
}

/**
 * Build Option 119 hex string from domain list
 */
export function buildOption119(config: DomainSearchConfig): DomainSearchResult {
  // Validate domains
  for (const domain of config.domains) {
    if (!domain.trim()) {
      throw new Error('Empty domain name not allowed');
    }
    if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
      throw new Error(`Invalid domain name: ${domain}`);
    }
    // Check for leading/trailing dots or consecutive dots
    if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
      throw new Error(`Invalid domain name format: ${domain}`);
    }
  }

  const bytes = encodeDomainsWithCompression(config.domains);
  const hexEncoded = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  const wireFormat = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

  const examples = generateExamples(config, hexEncoded);

  return {
    hexEncoded,
    wireFormat,
    domainList: config.domains,
    totalLength: bytes.length,
    examples,
  };
}

/**
 * Parse Option 119 hex string
 */
export function parseOption119(hexString: string): ParsedDomainSearch {
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');

  if (cleanHex.length === 0) {
    throw new Error('Empty hex string');
  }

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd number of characters');
  }

  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }

  try {
    const domains = parseWireFormat(bytes);

    return {
      domains,
      totalLength: bytes.length,
      rawHex: cleanHex,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid wire format: ${error.message}`);
    }
    throw new Error('Invalid wire format data');
  }
}

/**
 * Generate configuration examples for different DHCP servers
 */
function generateExamples(config: DomainSearchConfig, hexEncoded: string): DomainSearchResult['examples'] {
  const examples: DomainSearchResult['examples'] = {};

  // Use network settings or defaults
  const subnet = config.network?.subnet?.trim() || '192.168.1.0';
  const netmask = config.network?.netmask?.trim() || '255.255.255.0';
  const rangeStart = config.network?.rangeStart?.trim() || '192.168.1.100';
  const rangeEnd = config.network?.rangeEnd?.trim() || '192.168.1.200';

  // Calculate CIDR notation from netmask
  const cidrBits =
    netmask
      .split('.')
      .map((octet) => parseInt(octet, 10).toString(2).padStart(8, '0'))
      .join('')
      .split('1').length - 1;
  const cidr = `${subnet}/${cidrBits}`;

  // ISC dhcpd example
  const iscLines: string[] = [];
  iscLines.push('# Domain Search List (Option 119)');
  iscLines.push('# RFC 3397 - domain search list for DHCP clients');
  iscLines.push('');
  iscLines.push(`subnet ${subnet} netmask ${netmask} {`);
  iscLines.push(`  range ${rangeStart} ${rangeEnd};`);
  iscLines.push('  ');
  iscLines.push('  # Specify domain search list');
  iscLines.push(`  option domain-search "${config.domains.join('", "')}";`);
  iscLines.push('  ');
  iscLines.push('  # Alternative: Hex format');
  iscLines.push(`  # option domain-search ${hexEncoded.match(/.{1,2}/g)?.join(':')};`);
  iscLines.push('}');

  examples.iscDhcpd = iscLines.join('\n');

  // Kea DHCPv4 example
  const keaLines: string[] = [];
  keaLines.push('// Domain Search List (Option 119)');
  keaLines.push('// RFC 3397 - domain search list configuration');
  keaLines.push('{');
  keaLines.push('  "Dhcp4": {');
  keaLines.push('    "subnet4": [');
  keaLines.push('      {');
  keaLines.push(`        "subnet": "${cidr}",`);
  keaLines.push('        "pools": [');
  keaLines.push('          {');
  keaLines.push(`            "pool": "${rangeStart} - ${rangeEnd}"`);
  keaLines.push('          }');
  keaLines.push('        ],');
  keaLines.push('        "option-data": [');
  keaLines.push('          {');
  keaLines.push('            "name": "domain-search",');
  keaLines.push('            "code": 119,');
  keaLines.push(`            "data": "${config.domains.join(', ')}"`);
  keaLines.push('          }');
  keaLines.push('        ]');
  keaLines.push('      }');
  keaLines.push('    ]');
  keaLines.push('  }');
  keaLines.push('}');

  examples.keaDhcp4 = keaLines.join('\n');

  return examples;
}

/**
 * Get default config
 */
export function getDefaultOption119Config(): DomainSearchConfig {
  return {
    domains: ['example.com', 'corp.example.com'],
  };
}

/**
 * Common domain search examples
 */
export const DOMAIN_SEARCH_EXAMPLES = [
  { label: 'Corporate', domains: ['corp.example.com', 'example.com'] },
  { label: 'Multi-site', domains: ['site1.example.com', 'site2.example.com', 'example.com'] },
  { label: 'Development', domains: ['dev.example.com', 'staging.example.com', 'example.com'] },
];
