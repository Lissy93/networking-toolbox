import { describe, it, expect } from 'vitest';
import { ipAddressValidationContent } from '../../../src/lib/content/ip-address-validation';

describe('IP Address Validation Content', () => {
  it('should have valid structure', () => {
    expect(ipAddressValidationContent).toBeDefined();
    expect(ipAddressValidationContent.title).toBe('IP Address Format & RegEx Validation');
    expect(typeof ipAddressValidationContent.description).toBe('string');
    expect(ipAddressValidationContent.description.length).toBeGreaterThan(0);
  });

  it('should contain all required sections', () => {
    expect(ipAddressValidationContent.sections).toBeDefined();
    expect(ipAddressValidationContent.sections).toHaveProperty('overview');
    expect(ipAddressValidationContent.sections).toHaveProperty('ipv4');
    expect(ipAddressValidationContent.sections).toHaveProperty('ipv6');
    expect(ipAddressValidationContent.sections).toHaveProperty('regexValidation');
    expect(ipAddressValidationContent.sections).toHaveProperty('practicalTips');
  });

  it('should have valid section structure', () => {
    Object.values(ipAddressValidationContent.sections).forEach(section => {
      expect(section).toHaveProperty('title');
      expect(section).toHaveProperty('content');
      expect(typeof section.title).toBe('string');
      expect(typeof section.content).toBe('string');
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.content.length).toBeGreaterThan(0);
    });
  });

  it('should contain practical examples', () => {
    expect(ipAddressValidationContent.examples).toBeDefined();
    expect(ipAddressValidationContent.examples).toHaveProperty('ipv4Basic');
    expect(ipAddressValidationContent.examples).toHaveProperty('ipv4Proper');
    expect(ipAddressValidationContent.examples).toHaveProperty('ipv6Basic');
  });

  it('should have valid example structure', () => {
    Object.values(ipAddressValidationContent.examples).forEach(example => {
      expect(example).toHaveProperty('title');
      expect(example).toHaveProperty('pattern');
      expect(example).toHaveProperty('description');
      expect(example).toHaveProperty('matches');
      expect(example).toHaveProperty('fails');
      expect(example).toHaveProperty('limitation');

      expect(typeof example.title).toBe('string');
      expect(typeof example.pattern).toBe('string');
      expect(typeof example.description).toBe('string');
      expect(Array.isArray(example.matches)).toBe(true);
      expect(Array.isArray(example.fails)).toBe(true);
      expect(typeof example.limitation).toBe('string');
    });
  });

  it('should have working regex patterns', () => {
    const { ipv4Basic, ipv4Proper, ipv6Basic } = ipAddressValidationContent.examples;

    // Test IPv4 basic pattern
    const ipv4BasicRegex = new RegExp(ipv4Basic.pattern);
    ipv4Basic.matches.forEach(ip => {
      expect(ipv4BasicRegex.test(ip)).toBe(true);
    });
    ipv4Basic.fails.forEach(ip => {
      expect(ipv4BasicRegex.test(ip)).toBe(false);
    });

    // Test IPv4 proper pattern
    const ipv4ProperRegex = new RegExp(ipv4Proper.pattern);
    ipv4Proper.matches.forEach(ip => {
      expect(ipv4ProperRegex.test(ip)).toBe(true);
    });
    ipv4Proper.fails.forEach(ip => {
      expect(ipv4ProperRegex.test(ip)).toBe(false);
    });

    // Test IPv6 basic pattern
    const ipv6BasicRegex = new RegExp(ipv6Basic.pattern);
    ipv6Basic.matches.forEach(ip => {
      expect(ipv6BasicRegex.test(ip)).toBe(true);
    });
    ipv6Basic.fails.forEach(ip => {
      expect(ipv6BasicRegex.test(ip)).toBe(false);
    });
  });

  it('should contain practical recommendations', () => {
    expect(ipAddressValidationContent.recommendations).toBeDefined();
    expect(Array.isArray(ipAddressValidationContent.recommendations)).toBe(true);
    expect(ipAddressValidationContent.recommendations.length).toBeGreaterThan(0);
  });

  it('should have valid recommendation structure', () => {
    ipAddressValidationContent.recommendations.forEach(recommendation => {
      expect(recommendation).toHaveProperty('icon');
      expect(recommendation).toHaveProperty('title');
      expect(recommendation).toHaveProperty('description');
      expect(recommendation).toHaveProperty('color');

      expect(typeof recommendation.icon).toBe('string');
      expect(typeof recommendation.title).toBe('string');
      expect(typeof recommendation.description).toBe('string');
      expect(typeof recommendation.color).toBe('string');

      // Check for CSS color variables
      expect(recommendation.color).toMatch(/^var\(--color-/);
    });
  });

  it('should contain IPv4 technical details', () => {
    const ipv4Section = ipAddressValidationContent.sections.ipv4;
    expect(ipv4Section.content).toContain('192.168.1.1');
    expect(ipv4Section.content).toContain('0-255');
    expect(ipv4Section.content).toContain('four decimal numbers');
  });

  it('should contain IPv6 technical details', () => {
    const ipv6Section = ipAddressValidationContent.sections.ipv6;
    expect(ipv6Section.content).toContain('128-bit');
    expect(ipv6Section.content).toContain('hexadecimal');
    expect(ipv6Section.content).toContain('::');
    expect(ipv6Section.content).toContain('2001:');
  });

  it('should explain regex challenges', () => {
    const regexSection = ipAddressValidationContent.sections.regexValidation;
    expect(regexSection.content).toContain('RegEx');
    expect(regexSection.content).toContain('range validation');
    expect(regexSection.content).toContain('edge cases');
  });

  it('should provide practical tips', () => {
    const tipsSection = ipAddressValidationContent.sections.practicalTips;
    expect(tipsSection.content).toContain('built-ins');
    expect(tipsSection.content).toContain('edge cases');
    expect(tipsSection.content).toContain('leading zeros');
  });

  it('should have realistic example IPs', () => {
    const allMatches = Object.values(ipAddressValidationContent.examples)
      .flatMap(ex => ex.matches);

    // Should contain common IP patterns
    expect(allMatches.some(ip => ip.includes('192.168'))).toBe(true);
    expect(allMatches.some(ip => ip.includes('::'))).toBe(true);
  });

  it('should have realistic failure cases', () => {
    const allFails = Object.values(ipAddressValidationContent.examples)
      .flatMap(ex => ex.fails);

    // Should contain common mistakes
    expect(allFails.length).toBeGreaterThan(0);
    expect(allFails.some(ip => !ip.includes('.'))).toBe(true);
  });
});