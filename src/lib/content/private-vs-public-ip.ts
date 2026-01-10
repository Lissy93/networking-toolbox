export const privateVsPublicContent = {
  title: 'Private vs Public IP Addresses',
  description:
    'Understanding the difference between private and public IP addresses, NAT implications, and quick identification methods.',

  sections: {
    overview: {
      title: "What's the Difference?",
      content: `Private IP addresses are used within local networks and are not routed on the public internet. Public IP addresses are globally unique and can be reached from anywhere on the internet.

The key difference is reachability: private IPs are only reachable within their local network, while public IPs are reachable from anywhere on the internet.`,
    },
  },

  privateRanges: [
    {
      range: '10.0.0.0/8',
      fullRange: '10.0.0.0 to 10.255.255.255',
      addresses: '16,777,216 addresses',
      class: 'RFC 1918 private range',
      commonUse: 'Large enterprises, ISP internal networks',
      examples: ['10.0.0.1', '10.1.1.1', '10.200.50.100'],
    },
    {
      range: '172.16.0.0/12',
      fullRange: '172.16.0.0 to 172.31.255.255',
      addresses: '1,048,576 addresses',
      class: 'RFC 1918 private range',
      commonUse: 'Medium businesses, cloud providers',
      examples: ['172.16.0.1', '172.20.1.1', '172.31.255.254'],
    },
    {
      range: '192.168.0.0/16',
      fullRange: '192.168.0.0 to 192.168.255.255',
      addresses: '65,536 addresses',
      class: 'RFC 1918 private range',
      commonUse: 'Home networks, small offices',
      examples: ['192.168.1.1', '192.168.0.100', '192.168.100.50'],
    },
  ],

  publicRanges: {
    description: 'All IP addresses not in private, reserved, or special-use ranges',
    characteristics: [
      'Globally unique and routable on the internet',
      'Assigned by Regional Internet Registries (RIRs)',
      'Can be reached from anywhere on the internet',
      'Cost money to obtain and maintain',
      'Limited supply (IPv4 exhaustion)',
    ],
    examples: [
      { ip: '8.8.8.8', owner: 'Google Public DNS' },
      { ip: '1.1.1.1', owner: 'Cloudflare DNS' },
      { ip: '13.107.42.14', owner: 'Microsoft services' },
      { ip: '151.101.193.140', owner: 'Reddit' },
    ],
  },

  natImplications: {
    title: 'NAT (Network Address Translation) Implications',

    privateToPublic: {
      title: 'Private Networks Accessing Internet',
      description: 'Private addresses must be translated to public addresses to reach the internet',
      process: [
        'Device with private IP (192.168.1.100) wants to access internet',
        'Router/NAT device translates to public IP (203.0.113.50)',
        'Internet sees traffic from public IP, not private IP',
        'Return traffic is translated back to private IP',
      ],
      benefits: [
        'Allows many devices to share one public IP',
        'Provides security through address hiding',
        'Conserves public IP addresses',
        'Enables local network management',
      ],
    },

    publicToPrivate: {
      title: 'Internet Accessing Private Networks',
      description: 'Direct access from internet to private IPs requires special configuration',
      challenges: [
        'Private IPs are not routed on internet',
        'NAT blocks unsolicited inbound connections',
        'Port forwarding needed for specific services',
        'VPN required for general access',
      ],
      solutions: [
        'Port forwarding for specific services',
        'VPN for secure remote access',
        'DMZ for less secure but simple access',
        'Reverse proxy for web services',
      ],
    },
  },

  identification: {
    quickCheck: [
      {
        method: 'IP Range Check',
        description: 'Look at first octets of IP address',
        private: '10.x.x.x, 172.16-31.x.x, 192.168.x.x',
        public: 'Any other address not in reserved ranges',
      },
      {
        method: 'Reachability Test',
        description: 'Try to reach from external network',
        private: 'Cannot be reached from internet',
        public: 'Can be reached from internet (if not firewalled)',
      },
      {
        method: 'Router Configuration',
        description: 'Check WAN vs LAN interface addresses',
        private: 'LAN interfaces use private addresses',
        public: 'WAN interface uses public address (unless CGNAT)',
      },
    ],

    tools: [
      { tool: 'whatismyipaddress.com', purpose: 'Shows your public IP as seen by internet' },
      { tool: 'ipconfig / ifconfig', purpose: 'Shows local IP addresses on your device' },
      { tool: 'Router admin page', purpose: 'Shows WAN (public) and LAN (private) IPs' },
      { tool: 'traceroute', purpose: 'Shows path including public/private hops' },
    ],
  },

  commonScenarios: [
    {
      scenario: 'Home Network',
      setup: 'Router gets public IP from ISP, creates private network inside',
      privateIPs: 'Devices use 192.168.1.x addresses',
      publicIP: 'Router WAN interface gets ISP-assigned public IP',
      natBehavior: 'All devices share the one public IP through NAT',
    },
    {
      scenario: 'Office Network',
      setup: 'Firewall/router creates private network for employee devices',
      privateIPs: 'Computers use 10.x.x.x or 172.16.x.x addresses',
      publicIP: 'Multiple public IPs for different services',
      natBehavior: 'Outbound NAT for internet access, port forwarding for servers',
    },
    {
      scenario: 'Cloud Infrastructure',
      setup: 'Virtual machines in private subnets with NAT gateway',
      privateIPs: 'VMs use 10.x.x.x addresses within VPC',
      publicIP: 'Elastic/floating IPs assigned as needed',
      natBehavior: 'NAT gateway for outbound, load balancers for inbound',
    },
    {
      scenario: 'CGNAT Environment',
      setup: 'ISP uses CGNAT, customers get private IPs',
      privateIPs: 'Home router gets 100.64.x.x address (CGNAT range)',
      publicIP: 'Shared among multiple customers',
      natBehavior: 'Double NAT - home NAT + ISP CGNAT',
    },
  ],

  troubleshooting: [
    {
      issue: "Can't Access Server from Internet",
      possibleCauses: ['Server has private IP', 'No port forwarding', 'Firewall blocking'],
      diagnosis: 'Check if server IP is private, test port forwarding',
      solution: 'Configure port forwarding or use public IP',
    },
    {
      issue: "Two Networks Can't Communicate",
      possibleCauses: ['Both using same private range', 'No routing configured'],
      diagnosis: 'Check for IP address conflicts, routing tables',
      solution: 'Use different private ranges or configure routing',
    },
    {
      issue: 'VPN Not Working',
      possibleCauses: ['Private IP conflicts', 'NAT traversal issues'],
      diagnosis: 'Check for address space overlap',
      solution: 'Reconfigure IP ranges or use different VPN protocol',
    },
  ],

  bestPractices: [
    'Use private IPs for internal networks',
    'Reserve public IPs for internet-facing services only',
    'Plan private IP ranges to avoid conflicts',
    'Document your IP addressing scheme',
    'Use DHCP for dynamic private IP assignment',
    'Implement proper firewall rules for public IPs',
    'Monitor public IP usage and costs',
  ],

  securityConsiderations: [
    {
      aspect: 'Private Network Security',
      considerations: [
        'Private IPs provide security through obscurity',
        'Still need internal security measures',
        'Lateral movement possible within private networks',
        'Monitor internal network traffic',
      ],
    },
    {
      aspect: 'Public IP Security',
      considerations: [
        'Public IPs are constantly scanned and attacked',
        'Require robust firewall and security measures',
        'DDoS protection may be necessary',
        'Regular security updates and monitoring essential',
      ],
    },
  ],

  quickReference: {
    privateRanges: [
      '10.0.0.0/8 (10.0.0.0 - 10.255.255.255)',
      '172.16.0.0/12 (172.16.0.0 - 172.31.255.255)',
      '192.168.0.0/16 (192.168.0.0 - 192.168.255.255)',
    ],
    identificationTips: [
      'If it starts with 10, 172.16-31, or 192.168 = private',
      'If reachable from internet without NAT = public',
      'Check your router - WAN IP is public, LAN IPs are private',
      'Use online tools to see your public IP',
    ],
  },
};
