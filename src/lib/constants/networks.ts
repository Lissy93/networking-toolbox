// Standard network classes and reserved ranges
export const NETWORK_CLASSES = {
  A: {
    range: '1.0.0.0 - 126.255.255.255',
    defaultMask: '255.0.0.0',
    cidr: 8,
    description: 'Large networks (16.7M hosts per network)',
    usage: 'Large corporations, ISPs',
  },
  B: {
    range: '128.0.0.0 - 191.255.255.255',
    defaultMask: '255.255.0.0',
    cidr: 16,
    description: 'Medium networks (65K hosts per network)',
    usage: 'Universities, large organizations',
  },
  C: {
    range: '192.0.0.0 - 223.255.255.255',
    defaultMask: '255.255.255.0',
    cidr: 24,
    description: 'Small networks (254 hosts per network)',
    usage: 'Small businesses, home networks',
  },
} as const;

export const RESERVED_RANGES = {
  LOCALHOST: {
    range: '127.0.0.0/8',
    description: 'Loopback addresses',
    rfc: 'RFC 1122',
  },
  PRIVATE_A: {
    range: '10.0.0.0/8',
    description: 'Private network',
    rfc: 'RFC 1918',
  },
  PRIVATE_B: {
    range: '172.16.0.0/12',
    description: 'Private network',
    rfc: 'RFC 1918',
  },
  PRIVATE_C: {
    range: '192.168.0.0/16',
    description: 'Private network',
    rfc: 'RFC 1918',
  },
  LINK_LOCAL: {
    range: '169.254.0.0/16',
    description: 'Link-local addresses',
    rfc: 'RFC 3927',
  },
  MULTICAST: {
    range: '224.0.0.0/4',
    description: 'Multicast addresses',
    rfc: 'RFC 1112',
  },
  BROADCAST: {
    range: '255.255.255.255/32',
    description: 'Limited broadcast',
    rfc: 'RFC 919',
  },
} as const;

export const COMMON_SUBNETS = [
  { cidr: 8, mask: '255.0.0.0', hosts: 16777214 },
  { cidr: 16, mask: '255.255.0.0', hosts: 65534 },
  { cidr: 24, mask: '255.255.255.0', hosts: 254 },
  { cidr: 25, mask: '255.255.255.128', hosts: 126 },
  { cidr: 26, mask: '255.255.255.192', hosts: 62 },
  { cidr: 27, mask: '255.255.255.224', hosts: 30 },
  { cidr: 28, mask: '255.255.255.240', hosts: 14 },
  { cidr: 29, mask: '255.255.255.248', hosts: 6 },
  { cidr: 30, mask: '255.255.255.252', hosts: 2 },
] as const;
