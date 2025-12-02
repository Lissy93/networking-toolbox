import { describe, it, expect } from 'vitest';
import { getIpv6PrivacyContent } from '../../../src/lib/content/ipv6-privacy-addresses';

describe('IPv6 Privacy Addresses content', () => {
  const ipv6PrivacyContent = getIpv6PrivacyContent();

  it('has valid structure', () => {
    expect(ipv6PrivacyContent).toBeDefined();
    expect(ipv6PrivacyContent.title).toBe("IPv6 Privacy Addresses (RFC 4941/8981)");
    expect(ipv6PrivacyContent.description).toContain("SLAAC privacy extensions");
    expect(ipv6PrivacyContent.sections).toBeDefined();
    expect(ipv6PrivacyContent.addressTypes).toBeDefined();
    expect(ipv6PrivacyContent.howItWorks).toBeDefined();
  });

  it('explains privacy problem clearly', () => {
    const overview = ipv6PrivacyContent.sections.overview;
    expect(overview.title).toBe("What are IPv6 Privacy Addresses?");
    expect(overview.content).toContain("prevent tracking");
    expect(overview.content).toContain("temporary addresses");
    expect(overview.content).toContain("interface identifiers");
    
    const problem = ipv6PrivacyContent.sections.problem;
    expect(problem.content).toContain("predictable interface identifiers");
    expect(problem.content).toContain("device fingerprint");
  });

  it('covers all address types comprehensively', () => {
    const types = ipv6PrivacyContent.addressTypes.types;
    expect(types).toBeInstanceOf(Array);
    expect(types.length).toBeGreaterThanOrEqual(3);

    const typeNames = types.map((t: any) => t.type);
    expect(typeNames).toContain("Stable Address (Standard SLAAC)");
    expect(typeNames).toContain("Temporary Address (Privacy Extension)");
    expect(typeNames).toContain("Stable Private Address (RFC 7217)");
  });

  it('explains stable address characteristics', () => {
    const stable = ipv6PrivacyContent.addressTypes.types.find((t: any) => t.type === "Stable Address (Standard SLAAC)");
    expect(stable).toBeDefined();
    expect(stable?.formation).toContain("EUI-64");
    expect(stable?.privacy).toBe("Poor - enables tracking across networks");
    expect(stable?.characteristics).toContain("Interface identifier stays the same across networks");
  });

  it('details temporary address behavior', () => {
    const temporary = ipv6PrivacyContent.addressTypes.types.find((t: any) => t.type === "Temporary Address (Privacy Extension)");
    expect(temporary).toBeDefined();
    expect(temporary?.formation).toContain("cryptographically generated");
    expect(temporary?.privacy).toBe("Good - prevents cross-network tracking");
    expect(temporary?.characteristics).toContain("Changes periodically (daily by default)");
  });

  it('covers RFC 7217 stable privacy addresses', () => {
    const stablePrivacy = ipv6PrivacyContent.addressTypes.types.find((t: any) => t.type === "Stable Private Address (RFC 7217)");
    expect(stablePrivacy).toBeDefined();
    expect(stablePrivacy?.formation).toContain("hash of secret key");
    expect(stablePrivacy?.privacy).toBe("Better - network-specific but stable");
  });

  it('explains how privacy extensions work', () => {
    const howItWorks = ipv6PrivacyContent.howItWorks;
    expect(howItWorks.addressGeneration).toBeInstanceOf(Array);
    expect(howItWorks.temporaryLifecycle).toBeInstanceOf(Array);
    expect(howItWorks.defaultBehavior).toBeInstanceOf(Array);
    
    expect(howItWorks.addressGeneration.some((step: any) => step.includes("Router Advertisement"))).toBe(true);
    expect(howItWorks.defaultBehavior.some((step: any) => step.includes("Outbound connections use temporary"))).toBe(true);
  });

  it('details address lifetimes', () => {
    const lifetimes = ipv6PrivacyContent.lifetimes;
    expect(lifetimes.preferredLifetime).toBeDefined();
    expect(lifetimes.validLifetime).toBeDefined();
    expect(lifetimes.regenerationInterval).toBeDefined();
    
    expect(lifetimes.preferredLifetime.typical).toBe("1 day (86400 seconds)");
    expect(lifetimes.validLifetime.typical).toBe("7 days (604800 seconds)");
  });

  it('covers OS implementations thoroughly', () => {
    const osImpl = ipv6PrivacyContent.osImplementations;
    expect(osImpl.windows).toBeDefined();
    expect(osImpl.linux).toBeDefined();
    expect(osImpl.macos).toBeDefined();
    expect(osImpl.android).toBeDefined();

    // Check Windows implementation
    if (osImpl.windows) {
      expect(osImpl.windows.defaultBehavior).toContain("enabled by default");
      expect(osImpl.windows.configuration).toContain("netsh interface ipv6 set privacy state=enabled");
    }

    // Check Linux implementation
    if (osImpl.linux) {
      expect(osImpl.linux.configuration).toContain("sysctl net.ipv6.conf.all.use_tempaddr=2");
      expect(osImpl.linux.values).toContain("2 = Enabled and prefer temporary");
    }
  });

  it('provides address identification methods', () => {
    expect(ipv6PrivacyContent.identifyingAddresses.methods).toBeInstanceOf(Array);
    expect(ipv6PrivacyContent.identifyingAddresses.methods.length).toBeGreaterThan(2);

    const patterns = ipv6PrivacyContent.identifyingAddresses.methods;
    const interfacePattern = patterns.find((p: any) => p.method === "Interface Identifier Pattern");
    expect(interfacePattern).toBeDefined();
    expect(interfacePattern?.stable).toContain("fffe");
    expect(interfacePattern?.temporary).toContain("Random-looking");
  });

  it('includes comprehensive troubleshooting', () => {
    expect(ipv6PrivacyContent.troubleshooting.issues).toBeInstanceOf(Array);
    expect(ipv6PrivacyContent.troubleshooting.issues.length).toBeGreaterThan(3);

    ipv6PrivacyContent.troubleshooting.issues.forEach((issue: any) => {
      expect(issue).toHaveProperty('issue');
      expect(issue).toHaveProperty('symptoms');
      expect(issue).toHaveProperty('diagnosis');
      expect(issue).toHaveProperty('solutions');
      expect(issue.symptoms).toBeInstanceOf(Array);
      expect(issue.solutions).toBeInstanceOf(Array);
    });
  });

  it('addresses security considerations', () => {
    expect(ipv6PrivacyContent.securityConsiderations.aspects).toBeInstanceOf(Array);
    expect(ipv6PrivacyContent.securityConsiderations.aspects.length).toBeGreaterThan(1);

    const privacy = ipv6PrivacyContent.securityConsiderations.aspects.find((s: any) => s.aspect === "Privacy Protection");
    expect(privacy).toBeDefined();
    expect(privacy?.benefits).toContain("Prevents device tracking across networks");
    expect(privacy?.limitations).toContain("Application-layer tracking still possible");
  });

  it('provides usage scenarios and recommendations', () => {
    expect(ipv6PrivacyContent.whenToUse.scenarios).toBeInstanceOf(Array);
    expect(ipv6PrivacyContent.whenToUse.scenarios.length).toBeGreaterThan(3);

    const clientDevices = ipv6PrivacyContent.whenToUse.scenarios.find((w: any) => w.scenario === "Client Devices");
    expect(clientDevices).toBeDefined();
    expect(clientDevices?.recommendation).toBe("Enable privacy extensions");

    const servers = ipv6PrivacyContent.whenToUse.scenarios.find((w: any) => w.scenario === "Servers");
    expect(servers).toBeDefined();
    expect(servers?.recommendation).toBe("Use stable addresses");
  });

  it('includes quick reference guide', () => {
    const quickRef = ipv6PrivacyContent.quickReference;
    expect(quickRef.addressTypes).toBeInstanceOf(Array);
    expect(quickRef.identification).toBeInstanceOf(Array);
    expect(quickRef.configuration).toBeInstanceOf(Array);
    expect(quickRef.troubleshooting).toBeInstanceOf(Array);
    
    expect(quickRef.addressTypes.some((t: any) => t.includes("Temporary: Random interface ID"))).toBe(true);
  });

  it('provides useful tools and commands', () => {
    expect(ipv6PrivacyContent.tools.tools).toBeInstanceOf(Array);
    expect(ipv6PrivacyContent.tools.tools.length).toBeGreaterThan(4);

    ipv6PrivacyContent.tools.tools.forEach((tool: any) => {
      expect(tool).toHaveProperty('tool');
      expect(tool).toHaveProperty('purpose');
    });

    const ipTool = ipv6PrivacyContent.tools.tools.find((t: any) => t.tool === "ip -6 addr show");
    expect(ipTool).toBeDefined();
    expect(ipTool?.purpose).toContain("Linux");
  });

  it('validates data structure consistency', () => {
    // Check address types structure
    ipv6PrivacyContent.addressTypes.types.forEach((type: any) => {
      expect(type).toHaveProperty('type');
      expect(type).toHaveProperty('formation');
      expect(type).toHaveProperty('example');
      expect(type).toHaveProperty('characteristics');
      expect(type).toHaveProperty('privacy');
      expect(type.characteristics).toBeInstanceOf(Array);
      expect(type.example).toMatch(/^2001:db8:/);
    });

    // Check OS implementations structure
    ['windows', 'linux', 'macos', 'android'].forEach(os => {
      const osConfig = ipv6PrivacyContent.osImplementations[os as keyof typeof ipv6PrivacyContent.osImplementations];
      expect(osConfig).toHaveProperty('os');
      expect(osConfig).toHaveProperty('defaultBehavior');
    });
  });

  it('emphasizes practical privacy and security concepts', () => {
    const content = JSON.stringify(ipv6PrivacyContent);
    expect(content).toContain("privacy");
    expect(content).toContain("tracking");
    expect(content).toContain("temporary");
    expect(content).toContain("stable");
    expect(content).toContain("SLAAC");
    expect(content).toContain("EUI-64");
    expect(content).toContain("interface identifier");
    expect(content).not.toContain("password");
    expect(content).toContain("privacy");
  });

  it('covers common mistakes and best practices', () => {
    expect(ipv6PrivacyContent.commonMistakes.mistakes).toBeInstanceOf(Array);
    expect(ipv6PrivacyContent.bestPractices.practices).toBeInstanceOf(Array);

    const mistakes = ipv6PrivacyContent.commonMistakes.mistakes.join(' ');
    expect(mistakes).toContain("permanent");
    expect(mistakes).toContain("temporary addresses for server services");

    const practices = ipv6PrivacyContent.bestPractices.practices.join(' ');
    expect(practices).toContain("Enable privacy extensions on client devices");
    expect(practices).toContain("stable addresses only for servers");
  });
});