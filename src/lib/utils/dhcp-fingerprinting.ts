/**
 * DHCP Fingerprinting Database
 *
 * Identifies devices based on DHCP fingerprints, primarily using:
 * - Option 55 (Parameter Request List)
 * - Option 60 (Vendor Class Identifier)
 * - Option 61 (Client Identifier format)
 *
 * References:
 * - fingerbank.org
 * - dhcpcd project
 * - ISC DHCP fingerprints
 */

export interface DHCPFingerprint {
  id: string;
  device: string;
  os: string;
  category: 'desktop' | 'mobile' | 'iot' | 'server' | 'network' | 'gaming' | 'other';
  parameterRequestList: number[]; // Option 55
  vendorClassPattern?: string; // Option 60 pattern
  description?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface FingerprintMatch {
  fingerprint: DHCPFingerprint;
  matchScore: number;
  matchedOn: string[];
}

export interface OptionAnalysis {
  unusual: number[];
  security: number[];
  missing: number[];
  warnings: string[];
}

// Security-relevant DHCP options
const SECURITY_OPTIONS = [252, 249, 82, 43, 125];

// Rare/unusual options that might indicate specific vendors
const UNUSUAL_OPTIONS = [
  77, 93, 94, 97, 120, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146,
  150, 208, 209, 210, 211, 212, 213, 220,
];

/**
 * Database of known DHCP fingerprints
 */
export const FINGERPRINT_DATABASE: DHCPFingerprint[] = [
  // Windows
  {
    id: 'win10',
    device: 'Windows 10/11',
    os: 'Windows',
    category: 'desktop',
    parameterRequestList: [1, 3, 6, 15, 31, 33, 43, 44, 46, 47, 119, 121, 249, 252],
    confidence: 'high',
    description: 'Windows 10/11 desktop or laptop',
  },
  {
    id: 'win7',
    device: 'Windows 7',
    os: 'Windows',
    category: 'desktop',
    parameterRequestList: [1, 3, 6, 15, 31, 33, 43, 44, 46, 47, 121, 249, 252],
    confidence: 'high',
    description: 'Windows 7 desktop or laptop',
  },
  {
    id: 'winserver',
    device: 'Windows Server',
    os: 'Windows Server',
    category: 'server',
    parameterRequestList: [1, 3, 6, 15, 31, 33, 43, 44, 46, 47, 119, 121, 249, 252],
    vendorClassPattern: 'MSFT',
    confidence: 'medium',
    description: 'Windows Server 2016/2019/2022',
  },

  // macOS / iOS
  {
    id: 'macos',
    device: 'macOS',
    os: 'macOS',
    category: 'desktop',
    parameterRequestList: [1, 3, 6, 15, 119, 252],
    confidence: 'high',
    description: 'Apple macOS device',
  },
  {
    id: 'ios',
    device: 'iPhone/iPad',
    os: 'iOS',
    category: 'mobile',
    parameterRequestList: [1, 3, 6, 15, 119, 252],
    confidence: 'medium',
    description: 'Apple iOS device (iPhone/iPad)',
  },

  // Android
  {
    id: 'android',
    device: 'Android Device',
    os: 'Android',
    category: 'mobile',
    parameterRequestList: [1, 3, 6, 15, 26, 28, 51, 58, 59, 43],
    vendorClassPattern: 'dhcpcd',
    confidence: 'high',
    description: 'Android smartphone or tablet',
  },
  {
    id: 'android-alt',
    device: 'Android Device',
    os: 'Android',
    category: 'mobile',
    parameterRequestList: [1, 3, 6, 15, 26, 28],
    confidence: 'medium',
    description: 'Android device (alternative fingerprint)',
  },

  // Linux
  {
    id: 'linux-dhclient',
    device: 'Linux (dhclient)',
    os: 'Linux',
    category: 'desktop',
    parameterRequestList: [1, 3, 6, 15, 26, 28, 42],
    confidence: 'high',
    description: 'Linux system using ISC dhclient',
  },
  {
    id: 'linux-dhcpcd',
    device: 'Linux (dhcpcd)',
    os: 'Linux',
    category: 'desktop',
    parameterRequestList: [1, 3, 6, 15, 26, 28, 51, 58, 59],
    vendorClassPattern: 'dhcpcd',
    confidence: 'high',
    description: 'Linux system using dhcpcd',
  },
  {
    id: 'ubuntu',
    device: 'Ubuntu Linux',
    os: 'Linux',
    category: 'desktop',
    parameterRequestList: [1, 28, 2, 3, 15, 6, 119, 12, 44, 47, 26, 121, 42],
    confidence: 'medium',
    description: 'Ubuntu desktop or server',
  },

  // IoT Devices
  {
    id: 'raspberry-pi',
    device: 'Raspberry Pi',
    os: 'Linux',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 26, 28, 51, 58, 59, 43],
    vendorClassPattern: 'dhcpcd',
    confidence: 'medium',
    description: 'Raspberry Pi (Raspbian/Raspberry Pi OS)',
  },
  {
    id: 'esp32',
    device: 'ESP32',
    os: 'ESP-IDF/Arduino',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15],
    confidence: 'low',
    description: 'ESP32 microcontroller',
  },
  {
    id: 'arduino',
    device: 'Arduino',
    os: 'Arduino',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 28, 51, 58, 59],
    confidence: 'low',
    description: 'Arduino with Ethernet shield',
  },

  // Network Equipment
  {
    id: 'cisco-phone',
    device: 'Cisco IP Phone',
    os: 'Cisco',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42, 66, 67, 120, 150],
    vendorClassPattern: 'Cisco',
    confidence: 'high',
    description: 'Cisco IP Phone',
  },
  {
    id: 'hp-printer',
    device: 'HP Printer',
    os: 'Printer OS',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 40, 41, 42],
    vendorClassPattern: 'HP',
    confidence: 'high',
    description: 'HP Network Printer',
  },

  // Gaming Consoles
  {
    id: 'ps5',
    device: 'PlayStation 5',
    os: 'PlayStation OS',
    category: 'gaming',
    parameterRequestList: [1, 3, 6, 15, 12],
    confidence: 'medium',
    description: 'Sony PlayStation 5',
  },
  {
    id: 'ps4',
    device: 'PlayStation 4',
    os: 'PlayStation OS',
    category: 'gaming',
    parameterRequestList: [1, 3, 6, 15, 12, 28],
    confidence: 'medium',
    description: 'Sony PlayStation 4',
  },
  {
    id: 'xbox',
    device: 'Xbox Series X/S',
    os: 'Xbox OS',
    category: 'gaming',
    parameterRequestList: [1, 3, 6, 15, 44, 46, 47],
    vendorClassPattern: 'MSFT',
    confidence: 'medium',
    description: 'Microsoft Xbox Series X/S',
  },
  {
    id: 'nintendo-switch',
    device: 'Nintendo Switch',
    os: 'Nintendo OS',
    category: 'gaming',
    parameterRequestList: [1, 3, 6, 15, 26, 28, 51, 58, 59],
    confidence: 'low',
    description: 'Nintendo Switch',
  },

  // Chrome OS
  {
    id: 'chromeos',
    device: 'Chrome OS / Chromebook',
    os: 'Chrome OS',
    category: 'desktop',
    parameterRequestList: [1, 3, 6, 15, 26, 28, 42],
    confidence: 'medium',
    description: 'Google Chrome OS device',
  },

  // Smart TVs
  {
    id: 'samsung-tv',
    device: 'Samsung Smart TV',
    os: 'Tizen',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 40, 41, 42, 119],
    vendorClassPattern: 'SAMSUNG',
    confidence: 'high',
    description: 'Samsung Smart TV',
  },
  {
    id: 'lg-tv',
    device: 'LG Smart TV',
    os: 'webOS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42],
    vendorClassPattern: 'LGE',
    confidence: 'high',
    description: 'LG Smart TV',
  },
  {
    id: 'roku',
    device: 'Roku Device',
    os: 'Roku OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 28, 42],
    vendorClassPattern: 'Roku',
    confidence: 'high',
    description: 'Roku streaming device',
  },
  {
    id: 'firetv',
    device: 'Amazon Fire TV',
    os: 'Fire OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 26, 28, 51, 58, 59],
    confidence: 'medium',
    description: 'Amazon Fire TV Stick/Cube',
  },
  {
    id: 'appletv',
    device: 'Apple TV',
    os: 'tvOS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 119, 252],
    confidence: 'medium',
    description: 'Apple TV streaming device',
  },

  // More Printers
  {
    id: 'canon-printer',
    device: 'Canon Printer',
    os: 'Printer OS',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42],
    vendorClassPattern: 'Canon',
    confidence: 'high',
    description: 'Canon Network Printer',
  },
  {
    id: 'epson-printer',
    device: 'Epson Printer',
    os: 'Printer OS',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42, 54],
    vendorClassPattern: 'EPSON',
    confidence: 'high',
    description: 'Epson Network Printer',
  },
  {
    id: 'brother-printer',
    device: 'Brother Printer',
    os: 'Printer OS',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42],
    vendorClassPattern: 'Brother',
    confidence: 'high',
    description: 'Brother Network Printer',
  },

  // More Network Equipment
  {
    id: 'ubiquiti-ap',
    device: 'Ubiquiti Access Point',
    os: 'UniFi',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42, 43, 66, 67],
    vendorClassPattern: 'ubnt',
    confidence: 'high',
    description: 'Ubiquiti UniFi Access Point',
  },
  {
    id: 'aruba-ap',
    device: 'Aruba Access Point',
    os: 'ArubaOS',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42, 43, 60],
    vendorClassPattern: 'ArubaAP',
    confidence: 'high',
    description: 'Aruba Wireless Access Point',
  },
  {
    id: 'mikrotik',
    device: 'MikroTik Router',
    os: 'RouterOS',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42],
    vendorClassPattern: 'MikroTik',
    confidence: 'high',
    description: 'MikroTik Router/Switch',
  },

  // More VoIP Phones
  {
    id: 'yealink-phone',
    device: 'Yealink IP Phone',
    os: 'VoIP',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42, 43, 66, 120],
    vendorClassPattern: 'yealink',
    confidence: 'high',
    description: 'Yealink VoIP Phone',
  },
  {
    id: 'polycom-phone',
    device: 'Polycom IP Phone',
    os: 'VoIP',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42, 43, 66, 67, 120, 160],
    vendorClassPattern: 'PolycomSoundPointIP',
    confidence: 'high',
    description: 'Polycom VoIP Phone',
  },
  {
    id: 'grandstream-phone',
    device: 'Grandstream IP Phone',
    os: 'VoIP',
    category: 'network',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42, 66, 120],
    vendorClassPattern: 'Grandstream',
    confidence: 'high',
    description: 'Grandstream VoIP Phone',
  },

  // More IoT Devices
  {
    id: 'nest-thermostat',
    device: 'Google Nest Thermostat',
    os: 'Nest OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 28, 42],
    vendorClassPattern: 'Nest',
    confidence: 'medium',
    description: 'Google Nest Smart Thermostat',
  },
  {
    id: 'ring-doorbell',
    device: 'Ring Doorbell',
    os: 'Ring OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 28, 42],
    confidence: 'low',
    description: 'Ring Video Doorbell',
  },
  {
    id: 'philips-hue',
    device: 'Philips Hue Bridge',
    os: 'IoT',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 12, 15, 28],
    vendorClassPattern: 'Philips',
    confidence: 'medium',
    description: 'Philips Hue Smart Light Bridge',
  },
  {
    id: 'alexa-echo',
    device: 'Amazon Echo',
    os: 'Fire OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 26, 28, 51, 58, 59],
    confidence: 'low',
    description: 'Amazon Alexa Echo Device',
  },
  {
    id: 'google-home',
    device: 'Google Home',
    os: 'Cast OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 28, 42],
    confidence: 'low',
    description: 'Google Home/Nest Speaker',
  },
  {
    id: 'sonos',
    device: 'Sonos Speaker',
    os: 'Sonos OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42],
    vendorClassPattern: 'Sonos',
    confidence: 'medium',
    description: 'Sonos Wireless Speaker',
  },
  {
    id: 'hikvision-camera',
    device: 'Hikvision IP Camera',
    os: 'Camera OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42],
    vendorClassPattern: 'HIKVISION',
    confidence: 'high',
    description: 'Hikvision Security Camera',
  },
  {
    id: 'axis-camera',
    device: 'Axis IP Camera',
    os: 'AXIS OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 12, 15, 28, 42, 43],
    vendorClassPattern: 'AXIS',
    confidence: 'high',
    description: 'Axis Communications Camera',
  },
  {
    id: 'tesla',
    device: 'Tesla Vehicle',
    os: 'Tesla OS',
    category: 'iot',
    parameterRequestList: [1, 3, 6, 15, 28, 42],
    confidence: 'low',
    description: 'Tesla Electric Vehicle',
  },
];

/**
 * Parse parameter request list from various formats
 */
export function parseParameterList(input: string): number[] {
  // Handle comma-separated (e.g., "1,3,6,15")
  if (input.includes(',')) {
    return input.split(',').map((s) => parseInt(s.trim(), 10));
  }

  // Handle space-separated
  if (input.includes(' ')) {
    const tokens = input.split(/\s+/);

    // Check if all tokens are exactly 2 hex chars (hex with spaces like "01 03 06 0f")
    const allHexTokens = tokens.every((t) => /^[0-9a-fA-F]{2}$/.test(t));

    if (allHexTokens) {
      // Parse as hex
      return tokens.map((t) => parseInt(t, 16));
    }

    // Otherwise parse as decimal space-separated (e.g., "1 3 6 15")
    return tokens.map((s) => parseInt(s.trim(), 10));
  }

  // Handle hex format without spaces (e.g., "0103060f")
  if (/^[0-9a-fA-F]+$/.test(input) && input.length % 2 === 0) {
    const params: number[] = [];
    for (let i = 0; i < input.length; i += 2) {
      params.push(parseInt(input.substring(i, i + 2), 16));
    }
    return params;
  }

  // Single number
  return [parseInt(input, 10)];
}

/**
 * Calculate match score between two parameter lists with order weighting
 */
function calculateMatchScore(requested: number[], fingerprint: number[]): number {
  if (fingerprint.length === 0) return 0;

  let score = 0;
  const matches = requested.filter((param) => fingerprint.includes(param)).length;
  const baseScore = (matches / fingerprint.length) * 100;

  // Bonus for matching order of first 5 critical options
  let orderBonus = 0;
  const criticalCount = Math.min(5, Math.min(requested.length, fingerprint.length));
  for (let i = 0; i < criticalCount; i++) {
    if (requested[i] === fingerprint[i]) orderBonus += 2;
  }

  score = Math.min(100, baseScore + orderBonus);
  return score;
}

/**
 * Check if arrays match exactly
 */
function exactMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

/**
 * Analyze DHCP options for unusual patterns and security concerns
 */
export function analyzeOptions(parameterList: number[], matches: FingerprintMatch[]): OptionAnalysis {
  const unusual = parameterList.filter((opt) => UNUSUAL_OPTIONS.includes(opt));
  const security = parameterList.filter((opt) => SECURITY_OPTIONS.includes(opt));
  const warnings: string[] = [];

  // Security warnings
  if (security.includes(252)) {
    warnings.push('Option 252 (WPAD) detected - potential security risk if misconfigured');
  }
  if (security.includes(82)) {
    warnings.push('Option 82 (Relay Agent) - typically inserted by network equipment');
  }

  // Find missing options from best match
  let missing: number[] = [];
  if (matches.length > 0) {
    const bestMatch = matches[0].fingerprint;
    missing = bestMatch.parameterRequestList.filter((opt) => !parameterList.includes(opt));
  }

  return { unusual, security, missing, warnings };
}

/**
 * Search for matching fingerprints with improved algorithm
 */
export function searchFingerprints(parameterList: number[], vendorClass?: string): FingerprintMatch[] {
  const matches: FingerprintMatch[] = [];

  for (const fingerprint of FINGERPRINT_DATABASE) {
    const matchedOn: string[] = [];
    let matchScore = 0;
    let vendorBonus = 0;

    // Check parameter list
    const paramScore = calculateMatchScore(parameterList, fingerprint.parameterRequestList);

    if (paramScore > 0) {
      matchScore = paramScore;
      if (exactMatch(parameterList, fingerprint.parameterRequestList)) {
        matchedOn.push('Parameter List (Exact)');
        matchScore = 100;
      } else {
        matchedOn.push(`Parameter List (${paramScore.toFixed(0)}%)`);
      }
    }

    // Check vendor class if provided
    if (vendorClass && fingerprint.vendorClassPattern) {
      const vendorLower = vendorClass.toLowerCase();
      const patternLower = fingerprint.vendorClassPattern.toLowerCase();

      if (vendorLower.includes(patternLower) || patternLower.includes(vendorLower)) {
        matchedOn.push('Vendor Class');
        vendorBonus = 30; // Vendor match gives significant boost
        matchScore = Math.max(matchScore, 60); // Minimum score with vendor match
      }
    }

    // Apply vendor bonus
    matchScore = Math.min(100, matchScore + vendorBonus);

    // Only include matches with score > 45% or vendor class match
    if (matchScore >= 45 || matchedOn.some((m) => m.includes('Vendor'))) {
      matches.push({
        fingerprint,
        matchScore,
        matchedOn,
      });
    }
  }

  // Sort by match score (descending), then by confidence
  return matches.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const confWeight = { high: 3, medium: 2, low: 1 };
    return confWeight[b.fingerprint.confidence] - confWeight[a.fingerprint.confidence];
  });
}

/**
 * Reverse lookup: find fingerprints by device/OS name
 */
export function searchByDevice(query: string): DHCPFingerprint[] {
  const lowerQuery = query.toLowerCase();
  return FINGERPRINT_DATABASE.filter(
    (fp) =>
      fp.device.toLowerCase().includes(lowerQuery) ||
      fp.os.toLowerCase().includes(lowerQuery) ||
      fp.description?.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Get DHCP option names (comprehensive list)
 */
export const DHCP_OPTION_NAMES: Record<number, string> = {
  1: 'Subnet Mask',
  2: 'Time Offset',
  3: 'Router',
  4: 'Time Server',
  5: 'Name Server',
  6: 'Domain Name Server',
  7: 'Log Server',
  8: 'Cookie Server',
  9: 'LPR Server',
  10: 'Impress Server',
  11: 'Resource Location Server',
  12: 'Host Name',
  13: 'Boot File Size',
  14: 'Merit Dump File',
  15: 'Domain Name',
  16: 'Swap Server',
  17: 'Root Path',
  18: 'Extensions Path',
  19: 'IP Forwarding',
  20: 'Non-Local Source Routing',
  21: 'Policy Filter',
  22: 'Maximum Datagram Reassembly Size',
  23: 'Default IP TTL',
  24: 'Path MTU Aging Timeout',
  25: 'Path MTU Plateau Table',
  26: 'Interface MTU',
  27: 'All Subnets Local',
  28: 'Broadcast Address',
  29: 'Perform Mask Discovery',
  30: 'Mask Supplier',
  31: 'Router Discovery',
  32: 'Router Solicitation Address',
  33: 'Static Route',
  34: 'Trailer Encapsulation',
  35: 'ARP Cache Timeout',
  36: 'Ethernet Encapsulation',
  37: 'TCP Default TTL',
  38: 'TCP Keepalive Interval',
  39: 'TCP Keepalive Garbage',
  40: 'NIS Domain',
  41: 'NIS Servers',
  42: 'NTP Servers',
  43: 'Vendor Specific',
  44: 'NetBIOS Name Server',
  45: 'NetBIOS Datagram Distribution Server',
  46: 'NetBIOS Node Type',
  47: 'NetBIOS Scope',
  48: 'X Window Font Server',
  49: 'X Window Display Manager',
  50: 'Requested IP Address',
  51: 'IP Address Lease Time',
  52: 'Option Overload',
  53: 'DHCP Message Type',
  54: 'Server Identifier',
  55: 'Parameter Request List',
  56: 'Message',
  57: 'Maximum DHCP Message Size',
  58: 'Renewal Time (T1)',
  59: 'Rebinding Time (T2)',
  60: 'Vendor Class Identifier',
  61: 'Client Identifier',
  64: 'NIS+ Domain Name',
  65: 'NIS+ Servers',
  66: 'TFTP Server Name',
  67: 'Bootfile Name',
  68: 'Mobile IP Home Agent',
  69: 'SMTP Server',
  70: 'POP3 Server',
  71: 'NNTP Server',
  72: 'WWW Server',
  73: 'Finger Server',
  74: 'IRC Server',
  75: 'StreetTalk Server',
  76: 'STDA Server',
  77: 'User Class',
  78: 'Directory Agent',
  79: 'Service Scope',
  80: 'Rapid Commit',
  81: 'Client FQDN',
  82: 'Relay Agent Information',
  83: 'iSNS',
  85: 'NDS Servers',
  86: 'NDS Tree Name',
  87: 'NDS Context',
  93: 'Client System Architecture',
  94: 'Client Network Interface',
  97: 'Client Machine Identifier',
  100: 'IEEE 1003.1 TZ String',
  101: 'Reference to TZ Database',
  108: 'IPv6-Only Preferred',
  114: 'Captive Portal',
  116: 'Auto-Config',
  117: 'Name Service Search',
  118: 'Subnet Selection',
  119: 'Domain Search',
  120: 'SIP Servers',
  121: 'Classless Static Route',
  122: 'CableLabs Client Configuration',
  123: 'GeoConf',
  124: 'Vendor Class',
  125: 'Vendor-Specific Information',
  128: 'TFTP Server IP',
  129: 'Call Server IP',
  130: 'Discrimination String',
  131: 'Remote Statistics Server',
  132: 'VLAN ID',
  133: 'Layer 2 Priority',
  134: 'Diffserv Code Point',
  135: 'HTTP Proxy for Phone',
  136: 'PANA Authentication Agent',
  137: 'LoST Server',
  138: 'CAPWAP Access Controller',
  139: 'IPv4 Address-MoS',
  140: 'IPv4 FQDN-MoS',
  141: 'SIP UA Configuration Service',
  142: 'IPv4 Address ANDSF',
  143: 'IPv6 Address ANDSF',
  144: 'GeoLoc',
  145: 'FORCERENEW_NONCE_CAPABLE',
  146: 'RDNSS Selection',
  150: 'TFTP Server Address',
  151: 'Status Code',
  152: 'Base Time',
  153: 'Start Time of State',
  154: 'Query Start Time',
  155: 'Query End Time',
  156: 'DHCP State',
  157: 'Data Source',
  158: 'PCP Server',
  159: 'Port Params',
  160: 'Captive Portal (DHCP)',
  161: 'MUD URL',
  208: 'PXELINUX Magic',
  209: 'Configuration File',
  210: 'Path Prefix',
  211: 'Reboot Time',
  212: '6RD',
  213: 'V4 Access Domain',
  220: 'Subnet Allocation',
  249: 'Private/Classless Static Route (MS)',
  252: 'Private/WPAD',
};

/**
 * Format parameter list to hex
 */
export function formatParameterListToHex(params: number[]): string {
  return params.map((p) => p.toString(16).padStart(2, '0')).join('');
}

/**
 * Format parameter list for display
 */
export function formatParameterListDisplay(params: number[]): string {
  return params.join(', ');
}

/**
 * Export fingerprint results as JSON
 */
export function exportAsJSON(
  parameterList: number[],
  matches: FingerprintMatch[],
  analysis: OptionAnalysis,
  vendorClass?: string,
): string {
  const exportData = {
    timestamp: new Date().toISOString(),
    input: {
      parameterList,
      vendorClass: vendorClass || null,
      hexEncoded: formatParameterListToHex(parameterList),
    },
    analysis,
    matches: matches.map((m) => ({
      device: m.fingerprint.device,
      os: m.fingerprint.os,
      category: m.fingerprint.category,
      confidence: m.fingerprint.confidence,
      matchScore: m.matchScore,
      matchedOn: m.matchedOn,
    })),
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Export fingerprint results as CSV
 */
export function exportAsCSV(matches: FingerprintMatch[]): string {
  const headers = ['Device', 'OS', 'Category', 'Confidence', 'Match Score', 'Matched On'];
  const rows = matches.map((m) => [
    m.fingerprint.device,
    m.fingerprint.os,
    m.fingerprint.category,
    m.fingerprint.confidence,
    m.matchScore.toFixed(1),
    m.matchedOn.join('; '),
  ]);

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
}
