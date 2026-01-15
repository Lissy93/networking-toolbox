import { describe, it, expect } from 'vitest';
import { specialIPv4Content } from '../../../src/lib/content/special-use-ipv4';

describe('Special-use IPv4 content', () => {
  it('has valid structure', () => {
    expect(specialIPv4Content).toBeDefined();
    expect(specialIPv4Content.title).toBe('Special-Use IPv4 Blocks (RFC 6890)');
    expect(specialIPv4Content.description).toContain('reserved IPv4 address blocks');
    expect(specialIPv4Content.ranges).toBeInstanceOf(Array);
    expect(specialIPv4Content.categories).toBeDefined();
    expect(specialIPv4Content.quickTips).toBeInstanceOf(Array);
  });

  it('includes all major special-use ranges', () => {
    expect(specialIPv4Content.ranges).toHaveLength(16);

    const networks = specialIPv4Content.ranges.map((r) => r.network);
    expect(networks).toContain('10.0.0.0/8');
    expect(networks).toContain('127.0.0.0/8');
    expect(networks).toContain('169.254.0.0/16');
    expect(networks).toContain('192.168.0.0/16');
    expect(networks).toContain('100.64.0.0/10');
    expect(networks).toContain('224.0.0.0/4');
    expect(networks).toContain('240.0.0.0/4');
  });

  it('correctly identifies RFC 1918 private ranges', () => {
    const privateRanges = specialIPv4Content.ranges.filter((r) => r.rfc === 'RFC 1918');
    expect(privateRanges).toHaveLength(3);

    const range10 = privateRanges.find((r) => r.network === '10.0.0.0/8');
    expect(range10?.purpose).toBe('Private-Use Networks');
    expect(range10?.routable).toBe(false);
    expect(range10?.description).toBe('Private addresses for internal networks (Class A)');

    const range172 = privateRanges.find((r) => r.network === '172.16.0.0/12');
    expect(range172?.purpose).toBe('Private-Use Networks');
    expect(range172?.description).toBe('Private addresses for internal networks (Class B)');

    const range192 = privateRanges.find((r) => r.network === '192.168.0.0/16');
    expect(range192?.purpose).toBe('Private-Use Networks');
    expect(range192?.description).toBe('Private addresses for internal networks (Class C)');
  });

  it('includes CGNAT range (RFC 6598)', () => {
    const cgnatRange = specialIPv4Content.ranges.find((r) => r.network === '100.64.0.0/10');
    expect(cgnatRange).toBeDefined();
    expect(cgnatRange?.purpose).toBe('Shared Address Space (CGNAT)');
    expect(cgnatRange?.rfc).toBe('RFC 6598');
    expect(cgnatRange?.routable).toBe(false);
    expect(cgnatRange?.description).toContain('Carrier-Grade NAT');
  });

  it('defines loopback range correctly', () => {
    const loopback = specialIPv4Content.ranges.find((r) => r.network === '127.0.0.0/8');
    expect(loopback).toBeDefined();
    expect(loopback?.purpose).toBe('Loopback');
    expect(loopback?.rfc).toBe('RFC 1122');
    expect(loopback?.routable).toBe(false);
    expect(loopback?.description).toContain('127.0.0.1');
  });

  it('includes link-local/APIPA range', () => {
    const linkLocal = specialIPv4Content.ranges.find((r) => r.network === '169.254.0.0/16');
    expect(linkLocal).toBeDefined();
    expect(linkLocal?.purpose).toBe('Link Local (APIPA)');
    expect(linkLocal?.rfc).toBe('RFC 3927');
    expect(linkLocal?.routable).toBe(false);
    expect(linkLocal?.description).toContain('DHCP fails');
  });

  it('defines TEST-NET ranges for documentation', () => {
    const testNets = specialIPv4Content.ranges.filter((r) => r.purpose.includes('TEST-NET'));
    expect(testNets).toHaveLength(3);

    const testNet1 = testNets.find((r) => r.network === '192.0.2.0/24');
    expect(testNet1?.purpose).toBe('TEST-NET-1');
    expect(testNet1?.rfc).toBe('RFC 5737');

    const testNet2 = testNets.find((r) => r.network === '198.51.100.0/24');
    expect(testNet2?.purpose).toBe('TEST-NET-2');

    const testNet3 = testNets.find((r) => r.network === '203.0.113.0/24');
    expect(testNet3?.purpose).toBe('TEST-NET-3');

    testNets.forEach((testNet) => {
      expect(testNet.routable).toBe(false);
      expect(testNet.description).toContain('Documentation');
    });
  });

  it('includes multicast range', () => {
    const multicast = specialIPv4Content.ranges.find((r) => r.network === '224.0.0.0/4');
    expect(multicast).toBeDefined();
    expect(multicast?.purpose).toBe('Multicast');
    expect(multicast?.rfc).toBe('RFC 1112');
    expect(multicast?.routable).toBe(true);
    expect(multicast?.description).toContain('multicast addresses');
  });

  it('includes reserved range', () => {
    const reserved = specialIPv4Content.ranges.find((r) => r.network === '240.0.0.0/4');
    expect(reserved).toBeDefined();
    expect(reserved?.purpose).toBe('Reserved for Future Use');
    expect(reserved?.routable).toBe(false);
    expect(reserved?.description).toContain('not usable');
  });

  it('includes broadcast address', () => {
    const broadcast = specialIPv4Content.ranges.find((r) => r.network === '255.255.255.255/32');
    expect(broadcast).toBeDefined();
    expect(broadcast?.purpose).toBe('Limited Broadcast');
    expect(broadcast?.rfc).toBe('RFC 919');
    expect(broadcast?.routable).toBe(false);
    expect(broadcast?.description).toContain('Broadcast to all hosts');
  });

  it('categorizes ranges appropriately', () => {
    const categories = specialIPv4Content.categories;

    expect(categories.private).toEqual(['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);
    expect(categories.testing).toEqual(['192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24']);
    expect(categories.special).toEqual(['127.0.0.0/8', '169.254.0.0/16', '224.0.0.0/4']);
    expect(categories.cgnat).toEqual(['100.64.0.0/10']);
  });

  it('provides practical quick tips', () => {
    expect(specialIPv4Content.quickTips).toHaveLength(6);
    expect(specialIPv4Content.quickTips[0]).toContain('Private addresses');
    expect(specialIPv4Content.quickTips[1]).toContain('100.64.x.x means your ISP is using Carrier-Grade NAT');
    expect(specialIPv4Content.quickTips[2]).toContain('169.254.x.x means DHCP failed');
    expect(specialIPv4Content.quickTips[3]).toContain('TEST-NET addresses are safe');
    expect(specialIPv4Content.quickTips[4]).toContain('224.x.x.x and above are multicast');
    expect(specialIPv4Content.quickTips[5]).toContain('Never use 240.x.x.x');
  });

  it('validates range data structure', () => {
    specialIPv4Content.ranges.forEach((range) => {
      expect(range).toHaveProperty('network');
      expect(range).toHaveProperty('purpose');
      expect(range).toHaveProperty('rfc');
      expect(range).toHaveProperty('routable');
      expect(range).toHaveProperty('description');

      expect(typeof range.network).toBe('string');
      expect(typeof range.purpose).toBe('string');
      expect(typeof range.rfc).toBe('string');
      expect(typeof range.routable).toBe('boolean');
      expect(typeof range.description).toBe('string');

      expect(range.network).toMatch(/^\d+\.\d+\.\d+\.\d+\/\d+$/);
      expect(range.rfc).toMatch(/^RFC \d+$/);
    });
  });

  it('correctly marks routable vs non-routable ranges', () => {
    const routableRanges = specialIPv4Content.ranges.filter((r) => r.routable);
    const nonRoutableRanges = specialIPv4Content.ranges.filter((r) => !r.routable);

    expect(routableRanges.length).toBe(3);
    expect(nonRoutableRanges.length).toBe(13);

    // Routable ranges should include
    expect(routableRanges.some((r) => r.network === '192.0.0.0/24')).toBe(true);
    expect(routableRanges.some((r) => r.network === '192.88.99.0/24')).toBe(true);
    expect(routableRanges.some((r) => r.network === '224.0.0.0/4')).toBe(true);

    // Non-routable ranges should include private addresses
    expect(nonRoutableRanges.some((r) => r.network === '10.0.0.0/8')).toBe(true);
    expect(nonRoutableRanges.some((r) => r.network === '172.16.0.0/12')).toBe(true);
    expect(nonRoutableRanges.some((r) => r.network === '192.168.0.0/16')).toBe(true);
    expect(nonRoutableRanges.some((r) => r.network === '127.0.0.0/8')).toBe(true);
  });

  it('includes proper RFC references', () => {
    const rfcReferences = [...new Set(specialIPv4Content.ranges.map((r) => r.rfc))];

    expect(rfcReferences).toContain('RFC 1918'); // Private addresses
    expect(rfcReferences).toContain('RFC 1122'); // Loopback and this network
    expect(rfcReferences).toContain('RFC 3927'); // Link-local
    expect(rfcReferences).toContain('RFC 5737'); // TEST-NET ranges
    expect(rfcReferences).toContain('RFC 6598'); // CGNAT
    expect(rfcReferences).toContain('RFC 6890'); // Special-use IPv4 addresses
    expect(rfcReferences).toContain('RFC 1112'); // Multicast and reserved
  });
});
