import { describe, it, expect } from 'vitest';
import {
  buildOption121,
  parseOption121,
  getDefaultOption121Config,
  CLASSLESS_ROUTES_EXAMPLES,
  type ClasslessRoutesConfig,
} from '../../../src/lib/utils/dhcp-option121';

describe('dhcp-option121.ts', () => {
  describe('buildOption121', () => {
    describe('basic encoding', () => {
      it('encodes default route (0.0.0.0/0)', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        // 0 (prefix len) + 192.168.1.1 (4 octets)
        expect(result.hexEncoded).toBe('00c0a80101');
        expect(result.routes).toEqual(config.routes);
        expect(result.totalLength).toBe(5);
      });

      it('encodes /8 route with 1 significant octet', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        // 8 (prefix len) + 10 (1 octet) + 192.168.1.1 (4 octets)
        expect(result.hexEncoded).toBe('080ac0a80101');
        expect(result.totalLength).toBe(6);
      });

      it('encodes /12 route with 2 significant octets', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '172.16.0.0/12', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        // 12 (prefix len) + 172.16 (2 octets) + 192.168.1.1 (4 octets)
        expect(result.hexEncoded).toBe('0cac10c0a80101');
        expect(result.totalLength).toBe(7);
      });

      it('encodes /24 route with 3 significant octets', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '192.168.10.0/24', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        // 24 (prefix len) + 192.168.10 (3 octets) + 192.168.1.1 (4 octets)
        expect(result.hexEncoded).toBe('18c0a80ac0a80101');
        expect(result.totalLength).toBe(8);
      });

      it('encodes /32 host route with 4 significant octets', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '8.8.8.8/32', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        // 32 (prefix len) + 8.8.8.8 (4 octets) + 192.168.1.1 (4 octets)
        expect(result.hexEncoded).toBe('2008080808c0a80101');
        expect(result.totalLength).toBe(9);
      });

      it('encodes multiple routes', () => {
        const config: ClasslessRoutesConfig = {
          routes: [
            { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
            { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
          ],
        };

        const result = buildOption121(config);

        // Route 1: 08 0a c0a80101
        // Route 2: 0c ac10 c0a80101
        expect(result.hexEncoded).toBe('080ac0a801010cac10c0a80101');
        expect(result.routes.length).toBe(2);
      });

      it('provides wire format with spaces', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        expect(result.wireFormat).toBe('00 c0 a8 01 01');
      });
    });

    describe('validation', () => {
      it('rejects empty destination', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '', gateway: '192.168.1.1' }],
        };

        expect(() => buildOption121(config)).toThrow('required');
      });

      it('rejects empty gateway', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '' }],
        };

        expect(() => buildOption121(config)).toThrow('required');
      });

      it('rejects invalid CIDR notation', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0', gateway: '192.168.1.1' }],
        };

        expect(() => buildOption121(config)).toThrow('Invalid CIDR notation');
      });

      it('rejects invalid prefix length', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/33', gateway: '192.168.1.1' }],
        };

        expect(() => buildOption121(config)).toThrow('Invalid prefix length');
      });

      it('rejects negative prefix length', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/-1', gateway: '192.168.1.1' }],
        };

        expect(() => buildOption121(config)).toThrow('Invalid prefix length');
      });

      it('rejects invalid IPv4 address in destination', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '256.0.0.0/8', gateway: '192.168.1.1' }],
        };

        expect(() => buildOption121(config)).toThrow('Invalid IPv4 address');
      });

      it('rejects invalid gateway address', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.256' }],
        };

        expect(() => buildOption121(config)).toThrow('Invalid gateway address');
      });

      it('accepts valid prefix lengths (0-32)', () => {
        const prefixLengths = [0, 8, 16, 24, 32];

        for (const prefixLen of prefixLengths) {
          const config: ClasslessRoutesConfig = {
            routes: [{ destination: `10.0.0.0/${prefixLen}`, gateway: '192.168.1.1' }],
          };

          expect(() => buildOption121(config)).not.toThrow();
        }
      });
    });

    describe('configuration examples', () => {
      it('generates ISC dhcpd configuration', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        expect(result.examples.iscDhcpd).toBeDefined();
        expect(result.examples.iscDhcpd).toContain('rfc3442-classless-static-routes');
        expect(result.examples.iscDhcpd).toContain('8');
        expect(result.examples.iscDhcpd).toContain('10');
      });

      it('generates Kea DHCPv4 configuration', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        expect(result.examples.keaDhcp4).toBeDefined();
        expect(result.examples.keaDhcp4).toContain('"name": "classless-static-route"');
        expect(result.examples.keaDhcp4).toContain('"code": 121');
        expect(result.examples.keaDhcp4).toContain(result.hexEncoded);
      });

      it('generates Microsoft Option 249 configuration', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        expect(result.examples.msftOption249).toBeDefined();
        expect(result.examples.msftOption249).toContain('ms-classless-static-routes');
        expect(result.examples.msftOption249).toContain('Option 249');
      });

      it('uses default network settings when not provided', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);

        expect(result.examples.iscDhcpd).toContain('192.168.1.0');
        expect(result.examples.iscDhcpd).toContain('255.255.255.0');
        expect(result.examples.iscDhcpd).toContain('192.168.1.100');
        expect(result.examples.iscDhcpd).toContain('192.168.1.200');
      });

      it('uses custom network settings when provided', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }],
          network: {
            subnet: '10.0.0.0',
            netmask: '255.255.255.0',
            rangeStart: '10.0.0.50',
            rangeEnd: '10.0.0.150',
          },
        };

        const result = buildOption121(config);

        expect(result.examples.iscDhcpd).toContain('10.0.0.0');
        expect(result.examples.iscDhcpd).toContain('255.255.255.0');
        expect(result.examples.iscDhcpd).toContain('10.0.0.50');
        expect(result.examples.iscDhcpd).toContain('10.0.0.150');
      });

      it('calculates correct CIDR notation in Kea config', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }],
          network: {
            subnet: '10.0.0.0',
            netmask: '255.255.255.0',
          },
        };

        const result = buildOption121(config);

        expect(result.examples.keaDhcp4).toContain('"subnet": "10.0.0.0/24"');
      });
    });

    describe('significant octets calculation', () => {
      it('uses 0 octets for /0', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }],
        };

        const result = buildOption121(config);
        // 1 byte (prefix len) + 0 bytes (network) + 4 bytes (gateway)
        expect(result.totalLength).toBe(5);
      });

      it('uses 1 octet for /1 to /8', () => {
        for (let prefixLen = 1; prefixLen <= 8; prefixLen++) {
          const config: ClasslessRoutesConfig = {
            routes: [{ destination: `10.0.0.0/${prefixLen}`, gateway: '192.168.1.1' }],
          };

          const result = buildOption121(config);
          // 1 byte (prefix len) + 1 byte (network) + 4 bytes (gateway)
          expect(result.totalLength).toBe(6);
        }
      });

      it('uses 2 octets for /9 to /16', () => {
        for (let prefixLen = 9; prefixLen <= 16; prefixLen++) {
          const config: ClasslessRoutesConfig = {
            routes: [{ destination: `172.16.0.0/${prefixLen}`, gateway: '192.168.1.1' }],
          };

          const result = buildOption121(config);
          // 1 byte (prefix len) + 2 bytes (network) + 4 bytes (gateway)
          expect(result.totalLength).toBe(7);
        }
      });

      it('uses 3 octets for /17 to /24', () => {
        for (let prefixLen = 17; prefixLen <= 24; prefixLen++) {
          const config: ClasslessRoutesConfig = {
            routes: [{ destination: `192.168.1.0/${prefixLen}`, gateway: '192.168.1.1' }],
          };

          const result = buildOption121(config);
          // 1 byte (prefix len) + 3 bytes (network) + 4 bytes (gateway)
          expect(result.totalLength).toBe(8);
        }
      });

      it('uses 4 octets for /25 to /32', () => {
        for (let prefixLen = 25; prefixLen <= 32; prefixLen++) {
          const config: ClasslessRoutesConfig = {
            routes: [{ destination: `192.168.1.100/${prefixLen}`, gateway: '192.168.1.1' }],
          };

          const result = buildOption121(config);
          // 1 byte (prefix len) + 4 bytes (network) + 4 bytes (gateway)
          expect(result.totalLength).toBe(9);
        }
      });
    });
  });

  describe('parseOption121', () => {
    describe('basic decoding', () => {
      it('decodes default route', () => {
        const hexInput = '00c0a80101';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }]);
        expect(result.totalLength).toBe(5);
      });

      it('decodes /8 route', () => {
        const hexInput = '080ac0a80101';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }]);
      });

      it('decodes /24 route', () => {
        const hexInput = '18c0a80ac0a80101';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([{ destination: '192.168.10.0/24', gateway: '192.168.1.1' }]);
      });

      it('decodes multiple routes', () => {
        const hexInput = '080ac0a801010cac10c0a80101';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([
          { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
          { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
        ]);
      });

      it('handles hex input with spaces', () => {
        const hexInput = '00 c0 a8 01 01';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }]);
      });

      it('handles hex input with colons', () => {
        const hexInput = '00:c0:a8:01:01';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }]);
      });

      it('handles mixed case hex input', () => {
        const hexInput = '00C0A80101';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }]);
      });

      it('pads network bytes with zeros', () => {
        // /8 network should be padded to full IPv4 address
        const hexInput = '080ac0a80101';

        const result = parseOption121(hexInput);

        expect(result.routes[0].destination).toBe('10.0.0.0/8');
      });
    });

    describe('error handling', () => {
      it('rejects empty hex string', () => {
        expect(() => parseOption121('')).toThrow('Empty hex string');
      });

      it('rejects hex string with odd number of characters', () => {
        expect(() => parseOption121('00c0a8010')).toThrow('odd number of characters');
      });

      it('rejects invalid prefix length', () => {
        // Prefix length 33 is invalid
        const hexInput = '21c0a80101';

        expect(() => parseOption121(hexInput)).toThrow('Invalid prefix length');
      });

      it('rejects insufficient data for route', () => {
        // Says prefix /8 but doesn't have enough bytes
        const hexInput = '08';

        expect(() => parseOption121(hexInput)).toThrow('Insufficient data');
      });

      it('rejects insufficient data for gateway', () => {
        // Has prefix and network but missing gateway bytes
        const hexInput = '080ac0a8';

        expect(() => parseOption121(hexInput)).toThrow('Insufficient data');
      });
    });

    describe('round-trip encoding/decoding', () => {
      it('maintains data integrity for single route', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '10.0.0.0/8', gateway: '192.168.1.1' }],
        };

        const encoded = buildOption121(config);
        const decoded = parseOption121(encoded.hexEncoded);

        expect(decoded.routes).toEqual(config.routes);
      });

      it('maintains data integrity for multiple routes', () => {
        const config: ClasslessRoutesConfig = {
          routes: [
            { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
            { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
            { destination: '192.168.10.0/24', gateway: '192.168.1.254' },
          ],
        };

        const encoded = buildOption121(config);
        const decoded = parseOption121(encoded.hexEncoded);

        expect(decoded.routes).toEqual(config.routes);
      });

      it('maintains data integrity for default route', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }],
        };

        const encoded = buildOption121(config);
        const decoded = parseOption121(encoded.hexEncoded);

        expect(decoded.routes).toEqual(config.routes);
      });

      it('maintains data integrity for host route', () => {
        const config: ClasslessRoutesConfig = {
          routes: [{ destination: '8.8.8.8/32', gateway: '192.168.1.1' }],
        };

        const encoded = buildOption121(config);
        const decoded = parseOption121(encoded.hexEncoded);

        expect(decoded.routes).toEqual(config.routes);
      });
    });
  });

  describe('getDefaultOption121Config', () => {
    it('returns default configuration with sample routes', () => {
      const config = getDefaultOption121Config();

      expect(config.routes).toBeDefined();
      expect(config.routes.length).toBeGreaterThan(0);
    });

    it('returns valid configuration that can be encoded', () => {
      const config = getDefaultOption121Config();

      expect(() => buildOption121(config)).not.toThrow();
    });

    it('all default routes have valid format', () => {
      const config = getDefaultOption121Config();

      for (const route of config.routes) {
        expect(route.destination).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/);
        expect(route.gateway).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      }
    });
  });

  describe('CLASSLESS_ROUTES_EXAMPLES', () => {
    it('provides multiple example configurations', () => {
      expect(CLASSLESS_ROUTES_EXAMPLES.length).toBeGreaterThan(0);
    });

    it('each example has required properties', () => {
      for (const example of CLASSLESS_ROUTES_EXAMPLES) {
        expect(example.label).toBeDefined();
        expect(example.routes).toBeDefined();
        expect(example.routes.length).toBeGreaterThan(0);
      }
    });

    it('all examples can be successfully encoded', () => {
      for (const example of CLASSLESS_ROUTES_EXAMPLES) {
        const config: ClasslessRoutesConfig = {
          routes: example.routes,
        };

        expect(() => buildOption121(config)).not.toThrow();
      }
    });

    it('all examples maintain round-trip integrity', () => {
      for (const example of CLASSLESS_ROUTES_EXAMPLES) {
        const config: ClasslessRoutesConfig = {
          routes: example.routes,
        };

        const encoded = buildOption121(config);
        const decoded = parseOption121(encoded.hexEncoded);

        expect(decoded.routes).toEqual(example.routes);
      }
    });
  });

  describe('edge cases', () => {
    it('handles different gateways for different routes', () => {
      const config: ClasslessRoutesConfig = {
        routes: [
          { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
          { destination: '172.16.0.0/12', gateway: '192.168.1.254' },
        ],
      };

      const result = buildOption121(config);
      const decoded = parseOption121(result.hexEncoded);

      expect(decoded.routes).toEqual(config.routes);
    });

    it('handles routes with different prefix lengths', () => {
      const config: ClasslessRoutesConfig = {
        routes: [
          { destination: '0.0.0.0/0', gateway: '192.168.1.1' },
          { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
          { destination: '192.168.1.0/24', gateway: '192.168.1.1' },
          { destination: '8.8.8.8/32', gateway: '192.168.1.1' },
        ],
      };

      const result = buildOption121(config);
      const decoded = parseOption121(result.hexEncoded);

      expect(decoded.routes).toEqual(config.routes);
    });

    it('correctly pads network octets', () => {
      // /12 should result in 172.16.0.0 not 172.16
      const config: ClasslessRoutesConfig = {
        routes: [{ destination: '172.16.0.0/12', gateway: '192.168.1.1' }],
      };

      const encoded = buildOption121(config);
      const decoded = parseOption121(encoded.hexEncoded);

      expect(decoded.routes[0].destination).toBe('172.16.0.0/12');
    });

    it('handles maximum size routes', () => {
      const config: ClasslessRoutesConfig = {
        routes: Array.from({ length: 10 }, (_, i) => ({
          destination: `10.${i}.0.0/16`,
          gateway: '192.168.1.1',
        })),
      };

      const result = buildOption121(config);
      const decoded = parseOption121(result.hexEncoded);

      expect(decoded.routes).toEqual(config.routes);
      expect(decoded.routes.length).toBe(10);
    });
  });

  describe('UI component examples validation', () => {
    describe('encode examples', () => {
      it('Private Networks example produces valid output', () => {
        const config: ClasslessRoutesConfig = {
          routes: [
            { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
            { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
          ],
        };

        const result = buildOption121(config);
        expect(result.hexEncoded).toBe('080ac0a801010cac10c0a80101');

        // Verify round-trip
        const decoded = parseOption121(result.hexEncoded);
        expect(decoded.routes).toEqual(config.routes);
      });

      it('Default + Specific example produces valid output', () => {
        const config: ClasslessRoutesConfig = {
          routes: [
            { destination: '0.0.0.0/0', gateway: '192.168.1.1' },
            { destination: '10.10.0.0/16', gateway: '192.168.1.254' },
          ],
        };

        const result = buildOption121(config);

        // Verify round-trip
        const decoded = parseOption121(result.hexEncoded);
        expect(decoded.routes).toEqual(config.routes);
      });

      it('Multi-site VPN example produces valid output', () => {
        const config: ClasslessRoutesConfig = {
          routes: [
            { destination: '10.1.0.0/16', gateway: '192.168.1.10' },
            { destination: '10.2.0.0/16', gateway: '192.168.1.20' },
            { destination: '10.3.0.0/16', gateway: '192.168.1.30' },
          ],
        };

        const result = buildOption121(config);

        // Verify round-trip
        const decoded = parseOption121(result.hexEncoded);
        expect(decoded.routes).toEqual(config.routes);
      });
    });

    describe('decode examples', () => {
      it('Private Networks decode example is valid', () => {
        const hexInput = '080ac0a801010cac10c0a80101';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([
          { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
          { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
        ]);
      });

      it('Default Route decode example is valid', () => {
        const hexInput = '00c0a80101';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }]);
      });

      it('Specific /24 decode example is valid', () => {
        const hexInput = '18c0a80ac0a80101';

        const result = parseOption121(hexInput);

        expect(result.routes).toEqual([{ destination: '192.168.10.0/24', gateway: '192.168.1.1' }]);
      });

      it('all decode examples match their descriptions', () => {
        // Private Networks: 10.0.0.0/8 and 172.16.0.0/12 via 192.168.1.1
        const privateNetworks = parseOption121('080ac0a801010cac10c0a80101');
        expect(privateNetworks.routes.length).toBe(2);
        expect(privateNetworks.routes[0]).toEqual({ destination: '10.0.0.0/8', gateway: '192.168.1.1' });
        expect(privateNetworks.routes[1]).toEqual({ destination: '172.16.0.0/12', gateway: '192.168.1.1' });

        // Default Route: 0.0.0.0/0 via 192.168.1.1
        const defaultRoute = parseOption121('00c0a80101');
        expect(defaultRoute.routes.length).toBe(1);
        expect(defaultRoute.routes[0]).toEqual({ destination: '0.0.0.0/0', gateway: '192.168.1.1' });

        // Specific /24: 192.168.10.0/24 via 192.168.1.1
        const specific24 = parseOption121('18c0a80ac0a80101');
        expect(specific24.routes.length).toBe(1);
        expect(specific24.routes[0]).toEqual({ destination: '192.168.10.0/24', gateway: '192.168.1.1' });
      });
    });
  });
});
