import { describe, it, expect } from 'vitest';
import { privateVsPublicContent } from '../../../src/lib/content/private-vs-public-ip';

describe('Private vs Public IP content', () => {
  it('has valid structure', () => {
    expect(privateVsPublicContent).toBeDefined();
    expect(privateVsPublicContent.title).toBe("Private vs Public IP Addresses");
    expect(privateVsPublicContent.description).toContain("private and public IP addresses");
    expect(privateVsPublicContent.sections).toBeDefined();
    expect(privateVsPublicContent.privateRanges).toBeInstanceOf(Array);
    expect(privateVsPublicContent.publicRanges).toBeDefined();
    expect(privateVsPublicContent.natImplications).toBeDefined();
    expect(privateVsPublicContent.identification).toBeDefined();
  });

  it('defines RFC 1918 private ranges correctly', () => {
    expect(privateVsPublicContent.privateRanges).toHaveLength(3);
    
    const range10 = privateVsPublicContent.privateRanges[0];
    expect(range10.range).toBe("10.0.0.0/8");
    expect(range10.fullRange).toBe("10.0.0.0 to 10.255.255.255");
    expect(range10.class).toBe("RFC 1918 private range");
    expect(range10.examples).toContain("10.0.0.1");

    const range172 = privateVsPublicContent.privateRanges[1];
    expect(range172.range).toBe("172.16.0.0/12");
    expect(range172.fullRange).toBe("172.16.0.0 to 172.31.255.255");
    expect(range172.class).toBe("RFC 1918 private range");
    expect(range172.examples).toContain("172.16.0.1");

    const range192 = privateVsPublicContent.privateRanges[2];
    expect(range192.range).toBe("192.168.0.0/16");
    expect(range192.fullRange).toBe("192.168.0.0 to 192.168.255.255");
    expect(range192.class).toBe("RFC 1918 private range");
    expect(range192.examples).toContain("192.168.1.1");
  });

  it('has accurate address counts', () => {
    const ranges = privateVsPublicContent.privateRanges;
    expect(ranges[0].addresses).toBe("16,777,216 addresses"); // /8 = 2^24 addresses
    expect(ranges[1].addresses).toBe("1,048,576 addresses");  // /12 = 2^20 addresses  
    expect(ranges[2].addresses).toBe("65,536 addresses");     // /16 = 2^16 addresses
  });

  it('contains public IP characteristics', () => {
    const publicInfo = privateVsPublicContent.publicRanges;
    expect(publicInfo.characteristics).toContain("Globally unique and routable on the internet");
    expect(publicInfo.characteristics).toContain("Limited supply (IPv4 exhaustion)");
    expect(publicInfo.examples).toBeInstanceOf(Array);
    
    const googleDNS = publicInfo.examples.find(e => e.ip === "8.8.8.8");
    expect(googleDNS?.owner).toBe("Google Public DNS");
    
    const cloudflareDNS = publicInfo.examples.find(e => e.ip === "1.1.1.1");
    expect(cloudflareDNS?.owner).toBe("Cloudflare DNS");
  });

  it('explains NAT implications correctly', () => {
    const nat = privateVsPublicContent.natImplications;
    expect(nat.privateToPublic).toBeDefined();
    expect(nat.publicToPrivate).toBeDefined();
    
    expect(nat.privateToPublic.benefits).toContain("Allows many devices to share one public IP");
    expect(nat.privateToPublic.benefits).toContain("Conserves public IP addresses");
    
    expect(nat.publicToPrivate.challenges).toContain("Private IPs are not routed on internet");
    expect(nat.publicToPrivate.solutions).toContain("Port forwarding for specific services");
    expect(nat.publicToPrivate.solutions).toContain("VPN for secure remote access");
  });

  it('provides identification methods', () => {
    const identification = privateVsPublicContent.identification;
    expect(identification.quickCheck).toHaveLength(3);
    expect(identification.tools).toHaveLength(4);
    
    const rangeCheck = identification.quickCheck.find(q => q.method === "IP Range Check");
    expect(rangeCheck?.private).toContain("10.x.x.x");
    expect(rangeCheck?.private).toContain("172.16-31.x.x");
    expect(rangeCheck?.private).toContain("192.168.x.x");
    
    const reachabilityTest = identification.quickCheck.find(q => q.method === "Reachability Test");
    expect(reachabilityTest?.private).toBe("Cannot be reached from internet");
    expect(reachabilityTest?.public).toContain("Can be reached from internet");
  });

  it('covers common scenarios', () => {
    const scenarios = privateVsPublicContent.commonScenarios;
    expect(scenarios).toHaveLength(4);
    
    const homeNetwork = scenarios.find(s => s.scenario === "Home Network");
    expect(homeNetwork?.privateIPs).toContain("192.168.1.x");
    expect(homeNetwork?.natBehavior).toContain("share the one public IP");
    
    const cgnatScenario = scenarios.find(s => s.scenario === "CGNAT Environment");
    expect(cgnatScenario?.privateIPs).toContain("100.64.x.x");
    expect(cgnatScenario?.natBehavior).toContain("Double NAT");
  });

  it('includes troubleshooting guidance', () => {
    const troubleshooting = privateVsPublicContent.troubleshooting;
    expect(troubleshooting).toHaveLength(3);
    
    const serverAccess = troubleshooting.find(t => t.issue === "Can't Access Server from Internet");
    expect(serverAccess?.possibleCauses).toContain("Server has private IP");
    expect(serverAccess?.solution).toContain("Configure port forwarding");
    
    const vpnIssue = troubleshooting.find(t => t.issue === "VPN Not Working");
    expect(vpnIssue?.possibleCauses).toContain("Private IP conflicts");
  });

  it('has security considerations', () => {
    const security = privateVsPublicContent.securityConsiderations;
    expect(security).toHaveLength(2);
    
    const privateAspect = security.find(s => s.aspect === "Private Network Security");
    expect(privateAspect?.considerations).toContain("Private IPs provide security through obscurity");
    expect(privateAspect?.considerations).toContain("Still need internal security measures");
    
    const publicAspect = security.find(s => s.aspect === "Public IP Security");
    expect(publicAspect?.considerations).toContain("Public IPs are constantly scanned and attacked");
    expect(publicAspect?.considerations).toContain("DDoS protection may be necessary");
  });

  it('provides quick reference', () => {
    const quickRef = privateVsPublicContent.quickReference;
    expect(quickRef.privateRanges).toHaveLength(3);
    expect(quickRef.identificationTips).toHaveLength(4);
    
    expect(quickRef.privateRanges[0]).toBe("10.0.0.0/8 (10.0.0.0 - 10.255.255.255)");
    expect(quickRef.identificationTips[0]).toContain("If it starts with 10, 172.16-31, or 192.168 = private");
  });

  it('has consistent data structure', () => {
    privateVsPublicContent.privateRanges.forEach(range => {
      expect(range).toHaveProperty('range');
      expect(range).toHaveProperty('fullRange');
      expect(range).toHaveProperty('addresses');
      expect(range).toHaveProperty('class');
      expect(range).toHaveProperty('commonUse');
      expect(range).toHaveProperty('examples');
      expect(range.examples).toBeInstanceOf(Array);
      expect(range.examples.length).toBeGreaterThan(0);
    });

    privateVsPublicContent.commonScenarios.forEach(scenario => {
      expect(scenario).toHaveProperty('scenario');
      expect(scenario).toHaveProperty('setup');
      expect(scenario).toHaveProperty('privateIPs');
      expect(scenario).toHaveProperty('publicIP');
      expect(scenario).toHaveProperty('natBehavior');
    });
  });

  it('includes best practices', () => {
    expect(privateVsPublicContent.bestPractices).toBeInstanceOf(Array);
    expect(privateVsPublicContent.bestPractices.length).toBeGreaterThan(5);
    expect(privateVsPublicContent.bestPractices).toContain("Use private IPs for internal networks");
    expect(privateVsPublicContent.bestPractices).toContain("Reserve public IPs for internet-facing services only");
    expect(privateVsPublicContent.bestPractices).toContain("Plan private IP ranges to avoid conflicts");
  });
});