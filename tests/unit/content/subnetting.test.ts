import { describe, it, expect } from 'vitest';
import {
  commonSubnetMasks,
  keyConcepts,
  subnettingTechniques,
  practicalTips,
  commonMistakes,
  type SubnetMask,
  type SubnettingConcept,
  type SubnettingTechnique
} from '../../../src/lib/content/subnetting';

describe('Subnetting Content', () => {
  describe('Common Subnet Masks', () => {
    it('should contain expected subnet masks', () => {
      expect(commonSubnetMasks).toHaveLength(9);

      const cidrValues = commonSubnetMasks.map(mask => mask.cidr);
      expect(cidrValues).toContain(8);
      expect(cidrValues).toContain(16);
      expect(cidrValues).toContain(24);
      expect(cidrValues).toContain(25);
      expect(cidrValues).toContain(26);
      expect(cidrValues).toContain(27);
      expect(cidrValues).toContain(28);
      expect(cidrValues).toContain(29);
      expect(cidrValues).toContain(30);
    });

    it('should have valid structure for each mask', () => {
      commonSubnetMasks.forEach((mask: SubnetMask) => {
        expect(mask).toHaveProperty('cidr');
        expect(mask).toHaveProperty('decimal');
        expect(mask).toHaveProperty('binary');
        expect(mask).toHaveProperty('hosts');
        expect(mask).toHaveProperty('networks');

        expect(typeof mask.cidr).toBe('number');
        expect(typeof mask.decimal).toBe('string');
        expect(typeof mask.binary).toBe('string');
        expect(typeof mask.hosts).toBe('number');
        expect(typeof mask.networks).toBe('number');
      });
    });

    it('should have CIDR values in ascending order', () => {
      for (let i = 0; i < commonSubnetMasks.length - 1; i++) {
        expect(commonSubnetMasks[i].cidr).toBeLessThan(commonSubnetMasks[i + 1].cidr);
      }
    });

    it('should have valid IPv4 decimal formats', () => {
      commonSubnetMasks.forEach(mask => {
        expect(mask.decimal).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);

        const octets = mask.decimal.split('.').map(Number);
        octets.forEach(octet => {
          expect(octet).toBeGreaterThanOrEqual(0);
          expect(octet).toBeLessThanOrEqual(255);
        });
      });
    });

    it('should have valid binary formats', () => {
      commonSubnetMasks.forEach(mask => {
        expect(mask.binary).toMatch(/^[01]{8}\.[01]{8}\.[01]{8}\.[01]{8}$/);

        // Count network bits (1s) should match CIDR
        const networkBits = mask.binary.replace(/\./g, '').split('1').length - 1;
        expect(networkBits).toBe(mask.cidr);
      });
    });

    it('should have decreasing host counts as CIDR increases', () => {
      for (let i = 0; i < commonSubnetMasks.length - 1; i++) {
        expect(commonSubnetMasks[i].hosts).toBeGreaterThan(commonSubnetMasks[i + 1].hosts);
      }
    });

    it('should have increasing network counts as CIDR increases', () => {
      for (let i = 0; i < commonSubnetMasks.length - 1; i++) {
        expect(commonSubnetMasks[i].networks).toBeLessThan(commonSubnetMasks[i + 1].networks);
      }
    });

    it('should calculate correct host counts for common masks', () => {
      const mask24 = commonSubnetMasks.find(m => m.cidr === 24);
      const mask25 = commonSubnetMasks.find(m => m.cidr === 25);
      const mask30 = commonSubnetMasks.find(m => m.cidr === 30);

      expect(mask24?.hosts).toBe(254); // 2^8 - 2
      expect(mask25?.hosts).toBe(126); // 2^7 - 2
      expect(mask30?.hosts).toBe(2);   // 2^2 - 2
    });
  });

  describe('Key Concepts', () => {
    it('should contain essential subnetting concepts', () => {
      expect(keyConcepts).toHaveLength(4);

      const titles = keyConcepts.map(concept => concept.title);
      expect(titles).toContain('Network & Host Bits');
      expect(titles).toContain('CIDR Notation');
      expect(titles).toContain('Broadcast Domain');
      expect(titles).toContain('Subnet Zero & All-Ones');
    });

    it('should have valid structure for each concept', () => {
      keyConcepts.forEach((concept: SubnettingConcept) => {
        expect(concept).toHaveProperty('title');
        expect(concept).toHaveProperty('description');
        expect(concept).toHaveProperty('icon');

        expect(typeof concept.title).toBe('string');
        expect(typeof concept.description).toBe('string');
        expect(typeof concept.icon).toBe('string');

        expect(concept.title.length).toBeGreaterThan(0);
        expect(concept.description.length).toBeGreaterThan(0);
        expect(concept.icon.length).toBeGreaterThan(0);
      });
    });

    it('should include examples where provided', () => {
      const conceptsWithExamples = keyConcepts.filter(c => c.example);
      expect(conceptsWithExamples.length).toBeGreaterThan(0);

      conceptsWithExamples.forEach(concept => {
        expect(typeof concept.example).toBe('string');
        expect(concept.example!.length).toBeGreaterThan(0);
      });
    });

    it('should contain technical details', () => {
      const allDescriptions = keyConcepts.map(c => c.description).join(' ');
      expect(allDescriptions).toContain('subnet mask');
      expect(allDescriptions).toContain('network');
      expect(allDescriptions).toContain('bits');
    });
  });

  describe('Subnetting Techniques', () => {
    it('should contain main subnetting approaches', () => {
      expect(subnettingTechniques).toHaveLength(3);

      const names = subnettingTechniques.map(tech => tech.name);
      expect(names).toContain('Fixed-Length Subnetting');
      expect(names).toContain('VLSM');
      expect(names).toContain('Supernetting');
    });

    it('should have valid structure for each technique', () => {
      subnettingTechniques.forEach((technique: SubnettingTechnique) => {
        expect(technique).toHaveProperty('name');
        expect(technique).toHaveProperty('description');
        expect(technique).toHaveProperty('useCase');
        expect(technique).toHaveProperty('icon');
        expect(technique).toHaveProperty('color');

        expect(typeof technique.name).toBe('string');
        expect(typeof technique.description).toBe('string');
        expect(typeof technique.useCase).toBe('string');
        expect(typeof technique.icon).toBe('string');
        expect(typeof technique.color).toBe('string');

        expect(technique.name.length).toBeGreaterThan(0);
        expect(technique.description.length).toBeGreaterThan(0);
        expect(technique.useCase.length).toBeGreaterThan(0);
        expect(technique.icon.length).toBeGreaterThan(0);
      });
    });

    it('should use CSS color variables', () => {
      subnettingTechniques.forEach(technique => {
        expect(technique.color).toMatch(/^var\(--color-/);
      });
    });

    it('should describe different approaches', () => {
      const descriptions = subnettingTechniques.map(t => t.description);
      expect(descriptions.some(d => d.includes('same mask'))).toBe(true);
      expect(descriptions.some(d => d.includes('Variable-length'))).toBe(true);
      expect(descriptions.some(d => d.includes('Combine'))).toBe(true);
    });
  });

  describe('Practical Tips', () => {
    it('should contain helpful guidance', () => {
      expect(practicalTips).toHaveLength(5);
      expect(Array.isArray(practicalTips)).toBe(true);
    });

    it('should have meaningful content', () => {
      practicalTips.forEach(tip => {
        expect(typeof tip).toBe('string');
        expect(tip.length).toBeGreaterThan(10);
      });
    });

    it('should cover important topics', () => {
      const allTips = practicalTips.join(' ');
      expect(allTips).toContain('growth');
      expect(allTips).toContain('addresses');
      expect(allTips).toContain('subnet');
    });

    it('should mention RFC 1918', () => {
      const allTips = practicalTips.join(' ');
      expect(allTips).toContain('RFC 1918');
    });
  });

  describe('Common Mistakes', () => {
    it('should contain typical errors', () => {
      expect(commonMistakes).toHaveLength(4);
      expect(Array.isArray(commonMistakes)).toBe(true);
    });

    it('should have meaningful content', () => {
      commonMistakes.forEach(mistake => {
        expect(typeof mistake).toBe('string');
        expect(mistake.length).toBeGreaterThan(10);
      });
    });

    it('should cover important pitfalls', () => {
      const allMistakes = commonMistakes.join(' ');
      expect(allMistakes).toContain('network');
      expect(allMistakes).toContain('broadcast');
      expect(allMistakes).toContain('overlapping');
    });

    it('should mention growth planning', () => {
      const allMistakes = commonMistakes.join(' ');
      expect(allMistakes).toContain('growth');
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent CIDR ranges', () => {
      commonSubnetMasks.forEach(mask => {
        expect(mask.cidr).toBeGreaterThanOrEqual(8);
        expect(mask.cidr).toBeLessThanOrEqual(30);
      });
    });

    it('should have positive host and network counts', () => {
      commonSubnetMasks.forEach(mask => {
        expect(mask.hosts).toBeGreaterThan(0);
        expect(mask.networks).toBeGreaterThan(0);
      });
    });

    it('should have proper mathematical relationships', () => {
      commonSubnetMasks.forEach(mask => {
        const hostBits = 32 - mask.cidr;
        const expectedHosts = Math.pow(2, hostBits) - 2; // -2 for network and broadcast
        expect(mask.hosts).toBe(expectedHosts);
      });
    });
  });
});