import { describe, it, expect } from 'vitest';
import {
  buildOption119,
  parseOption119,
  getDefaultOption119Config,
  DOMAIN_SEARCH_EXAMPLES,
  type DomainSearchConfig,
} from '../../../src/lib/utils/dhcp-option119';

describe('dhcp-option119.ts', () => {
  describe('buildOption119', () => {
    describe('basic encoding', () => {
      it('encodes a single domain without compression', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com'],
        };

        const result = buildOption119(config);

        // "example.com" -> 07 65 78 61 6d 70 6c 65 03 63 6f 6d 00
        expect(result.hexEncoded).toBe('076578616d706c6503636f6d00');
        expect(result.domainList).toEqual(['example.com']);
        expect(result.totalLength).toBe(13);
      });

      it('encodes multiple domains with compression', () => {
        const config: DomainSearchConfig = {
          domains: ['corp.example.com', 'example.com'],
        };

        const result = buildOption119(config);

        // First domain: "corp.example.com" fully encoded
        // Second domain: uses compression pointer to "example.com"
        expect(result.hexEncoded).toBe('04636f7270076578616d706c6503636f6d00c005');
        expect(result.domainList).toEqual(['corp.example.com', 'example.com']);
      });

      it('encodes complex multi-site domains', () => {
        const config: DomainSearchConfig = {
          domains: ['site1.example.com', 'site2.example.com', 'example.com'],
        };

        const result = buildOption119(config);

        // All three domains with appropriate compression
        expect(result.hexEncoded).toBe('057369746531076578616d706c6503636f6d00057369746532c006c006');
        expect(result.domainList).toEqual(['site1.example.com', 'site2.example.com', 'example.com']);
      });

      it('provides wire format with spaces', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com'],
        };

        const result = buildOption119(config);

        expect(result.wireFormat).toBe('07 65 78 61 6d 70 6c 65 03 63 6f 6d 00');
      });
    });

    describe('validation', () => {
      it('rejects empty domain names', () => {
        const config: DomainSearchConfig = {
          domains: [''],
        };

        expect(() => buildOption119(config)).toThrow('Empty domain name not allowed');
      });

      it('rejects domains with invalid characters', () => {
        const config: DomainSearchConfig = {
          domains: ['example@test.com'],
        };

        expect(() => buildOption119(config)).toThrow('Invalid domain name');
      });

      it('rejects domains with leading dots', () => {
        const config: DomainSearchConfig = {
          domains: ['.example.com'],
        };

        expect(() => buildOption119(config)).toThrow('Invalid domain name format');
      });

      it('rejects domains with trailing dots', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com.'],
        };

        expect(() => buildOption119(config)).toThrow('Invalid domain name format');
      });

      it('rejects domains with consecutive dots', () => {
        const config: DomainSearchConfig = {
          domains: ['example..com'],
        };

        expect(() => buildOption119(config)).toThrow('Invalid domain name format');
      });

      it('rejects labels longer than 63 characters', () => {
        const longLabel = 'a'.repeat(64);
        const config: DomainSearchConfig = {
          domains: [`${longLabel}.example.com`],
        };

        expect(() => buildOption119(config)).toThrow('exceeds maximum length of 63 characters');
      });

      it('accepts labels with exactly 63 characters', () => {
        const maxLabel = 'a'.repeat(63);
        const config: DomainSearchConfig = {
          domains: [`${maxLabel}.com`],
        };

        const result = buildOption119(config);
        expect(result.domainList).toEqual([`${maxLabel}.com`]);
      });

      it('accepts valid domain names with hyphens', () => {
        const config: DomainSearchConfig = {
          domains: ['my-domain.example-site.com'],
        };

        const result = buildOption119(config);
        expect(result.domainList).toEqual(['my-domain.example-site.com']);
      });

      it('accepts valid domain names with numbers', () => {
        const config: DomainSearchConfig = {
          domains: ['site123.example.com'],
        };

        const result = buildOption119(config);
        expect(result.domainList).toEqual(['site123.example.com']);
      });
    });

    describe('configuration examples', () => {
      it('generates ISC dhcpd configuration', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com', 'corp.example.com'],
        };

        const result = buildOption119(config);

        expect(result.examples.iscDhcpd).toBeDefined();
        expect(result.examples.iscDhcpd).toContain('option domain-search');
        expect(result.examples.iscDhcpd).toContain('example.com');
        expect(result.examples.iscDhcpd).toContain('corp.example.com');
      });

      it('generates Kea DHCP configuration', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com', 'corp.example.com'],
        };

        const result = buildOption119(config);

        expect(result.examples.keaDhcp4).toBeDefined();
        expect(result.examples.keaDhcp4).toContain('"name": "domain-search"');
        expect(result.examples.keaDhcp4).toContain('"code": 119');
        expect(result.examples.keaDhcp4).toContain('example.com');
      });

      it('uses default network settings when not provided', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com'],
        };

        const result = buildOption119(config);

        expect(result.examples.iscDhcpd).toContain('192.168.1.0');
        expect(result.examples.iscDhcpd).toContain('255.255.255.0');
        expect(result.examples.iscDhcpd).toContain('192.168.1.100');
        expect(result.examples.iscDhcpd).toContain('192.168.1.200');
      });

      it('uses custom network settings when provided', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com'],
          network: {
            subnet: '10.0.0.0',
            netmask: '255.255.255.0',
            rangeStart: '10.0.0.50',
            rangeEnd: '10.0.0.150',
          },
        };

        const result = buildOption119(config);

        expect(result.examples.iscDhcpd).toContain('10.0.0.0');
        expect(result.examples.iscDhcpd).toContain('255.255.255.0');
        expect(result.examples.iscDhcpd).toContain('10.0.0.50');
        expect(result.examples.iscDhcpd).toContain('10.0.0.150');
      });

      it('calculates correct CIDR notation in Kea config', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com'],
          network: {
            subnet: '10.0.0.0',
            netmask: '255.255.255.0',
          },
        };

        const result = buildOption119(config);

        expect(result.examples.keaDhcp4).toContain('"subnet": "10.0.0.0/24"');
      });
    });

    describe('compression pointer generation', () => {
      it('generates correct compression pointers for shared suffixes', () => {
        const config: DomainSearchConfig = {
          domains: ['corp.example.com', 'example.com'],
        };

        const result = buildOption119(config);

        // The hex should end with c005 (compression pointer to offset 5)
        expect(result.hexEncoded).toContain('c005');
      });

      it('reuses compression pointers for multiple matches', () => {
        const config: DomainSearchConfig = {
          domains: ['site1.example.com', 'site2.example.com', 'example.com'],
        };

        const result = buildOption119(config);

        // Should have multiple compression pointers
        expect(result.hexEncoded).toContain('c006');
      });

      it('handles no compression for unrelated domains', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com', 'another.org'],
        };

        const result = buildOption119(config);

        // Both domains encoded fully, no compression pointers
        expect(result.hexEncoded).toBe('076578616d706c6503636f6d0007616e6f74686572036f726700');
      });
    });
  });

  describe('parseOption119', () => {
    describe('basic decoding', () => {
      it('decodes a single domain without compression', () => {
        const hexInput = '076578616d706c6503636f6d00';

        const result = parseOption119(hexInput);

        expect(result.domains).toEqual(['example.com']);
        expect(result.totalLength).toBe(13);
        expect(result.rawHex).toBe(hexInput);
      });

      it('decodes multiple domains with compression', () => {
        const hexInput = '04636f7270076578616d706c6503636f6d00c005';

        const result = parseOption119(hexInput);

        expect(result.domains).toEqual(['corp.example.com', 'example.com']);
      });

      it('decodes complex multi-site domains', () => {
        const hexInput = '057369746531076578616d706c6503636f6d00057369746532c006c006';

        const result = parseOption119(hexInput);

        expect(result.domains).toEqual(['site1.example.com', 'site2.example.com', 'example.com']);
      });

      it('handles hex input with spaces', () => {
        const hexInput = '07 65 78 61 6d 70 6c 65 03 63 6f 6d 00';

        const result = parseOption119(hexInput);

        expect(result.domains).toEqual(['example.com']);
      });

      it('handles hex input with colons', () => {
        const hexInput = '07:65:78:61:6d:70:6c:65:03:63:6f:6d:00';

        const result = parseOption119(hexInput);

        expect(result.domains).toEqual(['example.com']);
      });

      it('handles mixed case hex input', () => {
        const hexInput = '076578616D706C6503636F6D00';

        const result = parseOption119(hexInput);

        expect(result.domains).toEqual(['example.com']);
      });
    });

    describe('error handling', () => {
      it('rejects empty hex string', () => {
        expect(() => parseOption119('')).toThrow('Empty hex string');
      });

      it('rejects hex string with odd number of characters', () => {
        expect(() => parseOption119('076578616d706c6503636f6d0')).toThrow('odd number of characters');
      });

      it('rejects invalid compression pointer', () => {
        // Compression pointer at the end without second byte
        const hexInput = '076578616d706c6503636f6d00c0';

        expect(() => parseOption119(hexInput)).toThrow('Invalid wire format');
      });

      it('detects compression pointer loops', () => {
        // Create a loop: pointer points back to itself or creates a cycle
        // This is a malformed case
        const hexInput = 'c000'; // Points to offset 0 (itself)

        expect(() => parseOption119(hexInput)).toThrow('Invalid wire format');
      });

      it('detects label extending beyond data', () => {
        // Label length says 10 bytes but only 5 remain
        const hexInput = '0a6578616d706c'; // Length 10, but only 7 bytes follow

        expect(() => parseOption119(hexInput)).toThrow('Invalid wire format');
      });
    });

    describe('round-trip encoding/decoding', () => {
      it('maintains data integrity for single domain', () => {
        const config: DomainSearchConfig = {
          domains: ['example.com'],
        };

        const encoded = buildOption119(config);
        const decoded = parseOption119(encoded.hexEncoded);

        expect(decoded.domains).toEqual(config.domains);
      });

      it('maintains data integrity for multiple domains', () => {
        const config: DomainSearchConfig = {
          domains: ['corp.example.com', 'example.com', 'dev.example.com'],
        };

        const encoded = buildOption119(config);
        const decoded = parseOption119(encoded.hexEncoded);

        expect(decoded.domains).toEqual(config.domains);
      });

      it('maintains data integrity for complex scenarios', () => {
        const config: DomainSearchConfig = {
          domains: ['site1.example.com', 'site2.example.com', 'example.com', 'another.org'],
        };

        const encoded = buildOption119(config);
        const decoded = parseOption119(encoded.hexEncoded);

        expect(decoded.domains).toEqual(config.domains);
      });

      it('handles domains with hyphens and numbers', () => {
        const config: DomainSearchConfig = {
          domains: ['my-domain-123.test-site.com', 'test-site.com'],
        };

        const encoded = buildOption119(config);
        const decoded = parseOption119(encoded.hexEncoded);

        expect(decoded.domains).toEqual(config.domains);
      });
    });
  });

  describe('getDefaultOption119Config', () => {
    it('returns default configuration with sample domains', () => {
      const config = getDefaultOption119Config();

      expect(config.domains).toBeDefined();
      expect(config.domains.length).toBeGreaterThan(0);
      expect(config.domains).toContain('example.com');
    });

    it('returns valid configuration that can be encoded', () => {
      const config = getDefaultOption119Config();

      expect(() => buildOption119(config)).not.toThrow();
    });
  });

  describe('DOMAIN_SEARCH_EXAMPLES', () => {
    it('provides multiple example configurations', () => {
      expect(DOMAIN_SEARCH_EXAMPLES.length).toBeGreaterThan(0);
    });

    it('each example has required properties', () => {
      for (const example of DOMAIN_SEARCH_EXAMPLES) {
        expect(example.label).toBeDefined();
        expect(example.domains).toBeDefined();
        expect(example.domains.length).toBeGreaterThan(0);
      }
    });

    it('all examples can be successfully encoded', () => {
      for (const example of DOMAIN_SEARCH_EXAMPLES) {
        const config: DomainSearchConfig = {
          domains: example.domains,
        };

        expect(() => buildOption119(config)).not.toThrow();
      }
    });

    it('all examples maintain round-trip integrity', () => {
      for (const example of DOMAIN_SEARCH_EXAMPLES) {
        const config: DomainSearchConfig = {
          domains: example.domains,
        };

        const encoded = buildOption119(config);
        const decoded = parseOption119(encoded.hexEncoded);

        expect(decoded.domains).toEqual(example.domains);
      }
    });
  });

  describe('edge cases', () => {
    it('handles single-character labels', () => {
      const config: DomainSearchConfig = {
        domains: ['a.b.c'],
      };

      const result = buildOption119(config);
      const decoded = parseOption119(result.hexEncoded);

      expect(decoded.domains).toEqual(['a.b.c']);
    });

    it('handles domains with many labels', () => {
      const config: DomainSearchConfig = {
        domains: ['sub1.sub2.sub3.sub4.example.com'],
      };

      const result = buildOption119(config);
      const decoded = parseOption119(result.hexEncoded);

      expect(decoded.domains).toEqual(['sub1.sub2.sub3.sub4.example.com']);
    });

    it('handles mixed alphanumeric domains', () => {
      const config: DomainSearchConfig = {
        domains: ['srv01.dc02.region3.example.com'],
      };

      const result = buildOption119(config);
      const decoded = parseOption119(result.hexEncoded);

      expect(decoded.domains).toEqual(['srv01.dc02.region3.example.com']);
    });

    it('handles compression with partial suffix matches', () => {
      const config: DomainSearchConfig = {
        domains: ['www.example.com', 'mail.example.com', 'ftp.example.com', 'example.com'],
      };

      const result = buildOption119(config);
      const decoded = parseOption119(result.hexEncoded);

      expect(decoded.domains).toEqual(config.domains);
      // Verify compression is actually happening (should be shorter than uncompressed)
      expect(result.totalLength).toBeLessThan(60); // Would be ~60 bytes uncompressed
    });
  });
});
