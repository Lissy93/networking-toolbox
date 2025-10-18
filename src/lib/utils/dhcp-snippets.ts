/**
 * DHCP Kea/ISC Snippets Generator
 * Generates complete subnet configurations for ISC dhcpd and Kea DHCP servers
 */

export type DhcpTarget = 'isc-dhcpd' | 'kea-dhcp4' | 'kea-dhcp6';
export type DhcpMode = 'dhcp4' | 'dhcp6';
export type Option43Container = 'tlv' | 'ascii' | 'rawhex';
export type VendorPreset43 = 'cisco-capwap' | 'aruba' | 'ruckus' | 'generic-tlv' | 'custom';
export type RenderLocation = 'global' | 'class-match' | 'pool-only';

export interface PoolRange {
  start: string;
  end: string;
}

export interface ClientClass {
  name: string;
  matchRule: string; // ISC expression
  keaTest?: string; // Kea client-class test expression
  options?: {
    option43?: string;
    dns?: string[];
    leaseTime?: number;
  };
  pools?: PoolRange[];
}

export interface StaticReservation {
  identifier: string; // MAC/DUID/client-id
  ipAddress: string;
  hostname?: string;
  clientClasses?: string[];
}

export interface VendorDiscovery {
  preset: VendorPreset43;
  option60?: string;
  option43Container: Option43Container;
  suboption?: number;
  controllerAddresses: string[];
  renderLocation: RenderLocation;
}

export interface SnippetConfig {
  targets: DhcpTarget[];
  mode: DhcpMode;
  subnet: string; // CIDR
  pools: PoolRange[];
  gateway?: string;
  dnsServers?: string[];
  domainName?: string;
  defaultLeaseTime?: number;
  maxLeaseTime?: number;
  preferredLifetime?: number; // v6
  validLifetime?: number; // v6
  vendorDiscovery?: VendorDiscovery;
  classes?: ClientClass[];
  reservations?: StaticReservation[];
  emitOptionNames?: boolean;
  prettyJson?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface SnippetResult {
  iscDhcpdSnippet?: string;
  keaDhcp4Snippet?: string;
  keaDhcp6Snippet?: string;
  summary: string;
  validations: ValidationError[];
}

const VENDOR_PRESETS_43: Record<VendorPreset43, { name: string; defaultSuboption: number; defaultOption60: string }> = {
  'cisco-capwap': { name: 'Cisco CAPWAP', defaultSuboption: 241, defaultOption60: 'Cisco AP' },
  aruba: { name: 'Aruba APs', defaultSuboption: 1, defaultOption60: 'ArubaAP' },
  ruckus: { name: 'Ruckus APs', defaultSuboption: 3, defaultOption60: 'Ruckus CPE' },
  'generic-tlv': { name: 'Generic TLV', defaultSuboption: 1, defaultOption60: '' },
  custom: { name: 'Custom', defaultSuboption: 1, defaultOption60: '' },
};

/**
 * Parse CIDR into network and netmask
 */
function parseCIDR(cidr: string): { network: string; netmask: string; prefix: number } {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  if (cidr.includes(':')) {
    // IPv6 - return prefix as-is
    return { network, netmask: '', prefix };
  }

  // IPv4 - convert to dotted netmask
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const netmask = [(mask >>> 24) & 0xff, (mask >>> 16) & 0xff, (mask >>> 8) & 0xff, mask & 0xff].join('.');

  return { network, netmask, prefix };
}

/**
 * Check if IP is within subnet
 */
function isIPInSubnet(ip: string, subnet: string): boolean {
  const { network, prefix } = parseCIDR(subnet);

  if (ip.includes(':') || network.includes(':')) {
    // IPv6 - simplified check
    return ip.startsWith(network.split('::')[0]);
  }

  // IPv4
  const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  const netNum = network.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  const maskNum = (0xffffffff << (32 - prefix)) >>> 0;

  return (ipNum & maskNum) === (netNum & maskNum);
}

/**
 * Validate configuration
 */
export function validateConfig(config: SnippetConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate CIDR
  if (!config.subnet.match(/^[\da-f:.]+\/\d+$/i)) {
    errors.push({ field: 'subnet', message: 'Invalid CIDR notation' });
    return errors;
  }

  const isV6 = config.subnet.includes(':');
  const expectedMode = isV6 ? 'dhcp6' : 'dhcp4';

  if (config.mode !== expectedMode) {
    errors.push({
      field: 'mode',
      message: `Mode mismatch: ${isV6 ? 'IPv6' : 'IPv4'} subnet requires ${expectedMode}`,
    });
  }

  // Validate pools are within subnet
  config.pools.forEach((pool, i) => {
    if (!isIPInSubnet(pool.start, config.subnet)) {
      errors.push({ field: `pools[${i}].start`, message: 'Pool start IP outside subnet' });
    }
    if (!isIPInSubnet(pool.end, config.subnet)) {
      errors.push({ field: `pools[${i}].end`, message: 'Pool end IP outside subnet' });
    }
  });

  // Validate gateway is within subnet
  if (config.gateway && !isIPInSubnet(config.gateway, config.subnet)) {
    errors.push({ field: 'gateway', message: 'Gateway IP outside subnet' });
  }

  // Validate reservations
  config.reservations?.forEach((res, i) => {
    if (!isIPInSubnet(res.ipAddress, config.subnet)) {
      errors.push({
        field: `reservations[${i}].ipAddress`,
        message: 'Reservation IP outside subnet',
      });
    }
  });

  return errors;
}

/**
 * Encode Option 43 data
 */
function encodeOption43(addresses: string[], container: Option43Container, suboption: number): string {
  if (container === 'ascii') {
    // ASCII: comma-separated list
    return addresses.join(',');
  }

  if (container === 'rawhex') {
    // Raw hex - user provides it
    return addresses[0] || '';
  }

  // TLV encoding: suboption code (1 byte) + length (1 byte) + data
  const parts: string[] = [];
  addresses.forEach((addr) => {
    const octets = addr.split('.').map((o) => parseInt(o, 10));
    const dataHex = octets.map((o) => o.toString(16).padStart(2, '0')).join(':');
    const length = octets.length;
    const suboptHex = suboption.toString(16).padStart(2, '0');
    const lengthHex = length.toString(16).padStart(2, '0');
    parts.push(`${suboptHex}:${lengthHex}:${dataHex}`);
  });

  return parts.join(':');
}

/**
 * Generate ISC dhcpd.conf snippet
 */
function generateISCSnippet(config: SnippetConfig): string {
  const { network, netmask } = parseCIDR(config.subnet);
  const lines: string[] = [];

  lines.push(`# Subnet: ${config.subnet}`);
  lines.push(`subnet ${network} netmask ${netmask} {`);

  // Options
  if (config.gateway) {
    lines.push(`  option routers ${config.gateway};`);
  }
  if (config.dnsServers && config.dnsServers.length > 0) {
    lines.push(`  option domain-name-servers ${config.dnsServers.join(', ')};`);
  }
  if (config.domainName) {
    lines.push(`  option domain-name "${config.domainName}";`);
  }

  // Lease times
  if (config.defaultLeaseTime) {
    lines.push(`  default-lease-time ${config.defaultLeaseTime};`);
  }
  if (config.maxLeaseTime) {
    lines.push(`  max-lease-time ${config.maxLeaseTime};`);
  }

  lines.push('');

  // Vendor discovery (global)
  if (
    config.vendorDiscovery &&
    config.vendorDiscovery.renderLocation === 'global' &&
    config.vendorDiscovery.controllerAddresses.length > 0
  ) {
    const vd = config.vendorDiscovery;
    const option43 = encodeOption43(vd.controllerAddresses, vd.option43Container, vd.suboption || 1);

    lines.push(`  # Vendor discovery - ${VENDOR_PRESETS_43[vd.preset].name}`);
    if (vd.option60) {
      lines.push(`  option vendor-class-identifier "${vd.option60}";`);
    }
    if (vd.option43Container === 'ascii') {
      lines.push(`  option vendor-encapsulated-options "${option43}";`);
    } else {
      lines.push(`  option vendor-encapsulated-options ${option43};`);
    }
    lines.push(`  # Controllers: ${vd.controllerAddresses.join(', ')}`);
    lines.push('');
  }

  // Pools
  config.pools.forEach((pool, i) => {
    lines.push(`  # Pool ${i + 1}`);
    lines.push(`  pool {`);
    lines.push(`    range ${pool.start} ${pool.end};`);
    lines.push(`  }`);
    lines.push('');
  });

  lines.push(`}`);
  lines.push('');

  // Client classes
  if (config.classes && config.classes.length > 0) {
    lines.push(`# Client classes`);
    config.classes.forEach((cls) => {
      lines.push(`class "${cls.name}" {`);
      lines.push(`  match if ${cls.matchRule};`);
      if (cls.options?.option43) {
        lines.push(`  option vendor-encapsulated-options ${cls.options.option43};`);
      }
      if (cls.options?.dns) {
        lines.push(`  option domain-name-servers ${cls.options.dns.join(', ')};`);
      }
      lines.push(`}`);
      lines.push('');
    });
  }

  // Host reservations
  if (config.reservations && config.reservations.length > 0) {
    lines.push(`# Static reservations`);
    config.reservations.forEach((res) => {
      const hostname = res.hostname || `host-${res.ipAddress.replace(/[.:]/g, '-')}`;
      lines.push(`host ${hostname} {`);
      lines.push(`  hardware ethernet ${res.identifier};`);
      lines.push(`  fixed-address ${res.ipAddress};`);
      if (res.hostname) {
        lines.push(`  option host-name "${res.hostname}";`);
      }
      lines.push(`}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Generate Kea DHCP snippet (JSON)
 */
function generateKeaSnippet(config: SnippetConfig, isV6: boolean): string {
  const obj: any = {
    subnet: config.subnet,
    pools: config.pools.map((p) => ({ pool: `${p.start} - ${p.end}` })),
  };

  // Options
  const optionData: any[] = [];

  if (config.gateway) {
    optionData.push({
      name: isV6 ? 'unicast' : 'routers',
      data: config.gateway,
    });
  }

  if (config.dnsServers && config.dnsServers.length > 0) {
    optionData.push({
      name: 'dns-servers',
      data: config.dnsServers.join(', '),
    });
  }

  if (config.domainName) {
    optionData.push({
      name: 'domain-name',
      data: config.domainName,
    });
  }

  if (optionData.length > 0) {
    obj['option-data'] = optionData;
  }

  // Lease times
  if (!isV6) {
    if (config.defaultLeaseTime) obj['valid-lifetime'] = config.defaultLeaseTime;
    if (config.maxLeaseTime) obj['max-valid-lifetime'] = config.maxLeaseTime;
  } else {
    if (config.preferredLifetime) obj['preferred-lifetime'] = config.preferredLifetime;
    if (config.validLifetime) obj['valid-lifetime'] = config.validLifetime;
  }

  // Client classes
  if (config.classes && config.classes.length > 0) {
    obj['client-classes'] = config.classes.map((cls) => ({
      name: cls.name,
      test: cls.keaTest || cls.matchRule,
    }));
  }

  // Reservations
  if (config.reservations && config.reservations.length > 0) {
    obj.reservations = config.reservations.map((res) => ({
      [isV6 ? 'duid' : 'hw-address']: res.identifier,
      'ip-address': res.ipAddress,
      hostname: res.hostname,
    }));
  }

  return JSON.stringify(obj, null, config.prettyJson ? 2 : 0);
}

/**
 * Generate summary text
 */
function generateSummary(config: SnippetConfig): string {
  const parts: string[] = [];

  parts.push(`Subnet: ${config.subnet}`);
  parts.push(`Pools: ${config.pools.length} range(s)`);

  if (config.gateway) parts.push(`Gateway: ${config.gateway}`);
  if (config.dnsServers && config.dnsServers.length > 0) {
    parts.push(`DNS: ${config.dnsServers.join(', ')}`);
  }

  if (config.vendorDiscovery && config.vendorDiscovery.controllerAddresses.length > 0) {
    const vd = config.vendorDiscovery;
    parts.push(
      `Vendor discovery: ${VENDOR_PRESETS_43[vd.preset].name} (${vd.controllerAddresses.length} controller(s))`,
    );
  }

  if (config.classes && config.classes.length > 0) {
    parts.push(`Client classes: ${config.classes.length}`);
  }

  if (config.reservations && config.reservations.length > 0) {
    parts.push(`Static reservations: ${config.reservations.length}`);
  }

  return parts.join(' • ');
}

/**
 * Main generator function
 */
export function generateSnippets(config: SnippetConfig): SnippetResult {
  const validations = validateConfig(config);
  const result: SnippetResult = {
    validations,
    summary: generateSummary(config),
  };

  if (validations.length > 0) {
    return result;
  }

  const isV6 = config.mode === 'dhcp6';

  if (config.targets.includes('isc-dhcpd')) {
    result.iscDhcpdSnippet = generateISCSnippet(config);
  }

  if (config.targets.includes('kea-dhcp4') && !isV6) {
    result.keaDhcp4Snippet = generateKeaSnippet(config, false);
  }

  if (config.targets.includes('kea-dhcp6') && isV6) {
    result.keaDhcp6Snippet = generateKeaSnippet(config, true);
  }

  return result;
}

/**
 * Get default configuration
 */
export function getDefaultSnippetConfig(): SnippetConfig {
  return {
    targets: ['isc-dhcpd', 'kea-dhcp4'],
    mode: 'dhcp4',
    subnet: '192.168.1.0/24',
    pools: [{ start: '192.168.1.100', end: '192.168.1.200' }],
    gateway: '192.168.1.1',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    defaultLeaseTime: 86400,
    maxLeaseTime: 604800,
    emitOptionNames: true,
    prettyJson: true,
  };
}

export { VENDOR_PRESETS_43 };
