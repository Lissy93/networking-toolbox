import { describe, it, expect } from 'vitest';
import {
  validateDUIDConfig,
  buildDUID,
  calculateDUIDTimestamp,
  HARDWARE_TYPES,
  type DUIDConfig,
} from '$lib/utils/dhcp-duid-generator';

describe('dhcp-duid-generator', () => {
  describe('calculateDUIDTimestamp', () => {
    it('should calculate timestamp from Unix epoch', () => {
      const year2000Unix = 946684800; // January 1, 2000 00:00 UTC
      const timestamp = calculateDUIDTimestamp(year2000Unix);
      expect(timestamp).toBe(0);
    });

    it('should handle timestamps after year 2000', () => {
      const year2024Unix = 1704067200; // January 1, 2024 00:00 UTC
      const timestamp = calculateDUIDTimestamp(year2024Unix);
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should use current time if no timestamp provided', () => {
      const timestamp = calculateDUIDTimestamp();
      expect(timestamp).toBeGreaterThan(0);
    });
  });

  describe('validateDUIDConfig - DUID-LLT', () => {
    it('should require MAC address for DUID-LLT', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
      };
      const errors = validateDUIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('MAC address is required');
    });

    it('should accept valid MAC address for DUID-LLT', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
      };
      const errors = validateDUIDConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate MAC address format', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: 'invalid-mac',
      };
      const errors = validateDUIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid MAC address');
    });

    it('should accept various MAC address formats', () => {
      const formats = [
        '00:1A:2B:3C:4D:5E',
        '00-1A-2B-3C-4D-5E',
        '001A.2B3C.4D5E',
        '001A2B3C4D5E',
      ];

      for (const mac of formats) {
        const config: DUIDConfig = {
          type: 'DUID-LLT',
          macAddress: mac,
        };
        const errors = validateDUIDConfig(config);
        expect(errors).toEqual([]);
      }
    });
  });

  describe('validateDUIDConfig - DUID-EN', () => {
    it('should require enterprise number for DUID-EN', () => {
      const config: DUIDConfig = {
        type: 'DUID-EN',
        enterpriseIdentifier: 'abcd1234',
      };
      const errors = validateDUIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Enterprise number is required');
    });

    it('should require enterprise identifier for DUID-EN', () => {
      const config: DUIDConfig = {
        type: 'DUID-EN',
        enterpriseNumber: 9,
      };
      const errors = validateDUIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Enterprise identifier is required');
    });

    it('should accept valid DUID-EN config', () => {
      const config: DUIDConfig = {
        type: 'DUID-EN',
        enterpriseNumber: 9,
        enterpriseIdentifier: 'abcd1234',
      };
      const errors = validateDUIDConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate hex format for enterprise identifier', () => {
      const config: DUIDConfig = {
        type: 'DUID-EN',
        enterpriseNumber: 9,
        enterpriseIdentifier: 'not-hex',
      };
      const errors = validateDUIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid enterprise identifier');
    });
  });

  describe('validateDUIDConfig - DUID-LL', () => {
    it('should require MAC address for DUID-LL', () => {
      const config: DUIDConfig = {
        type: 'DUID-LL',
      };
      const errors = validateDUIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('MAC address is required');
    });

    it('should accept valid MAC address for DUID-LL', () => {
      const config: DUIDConfig = {
        type: 'DUID-LL',
        macAddress: '00:1A:2B:3C:4D:5E',
      };
      const errors = validateDUIDConfig(config);
      expect(errors).toEqual([]);
    });
  });

  describe('validateDUIDConfig - DUID-UUID', () => {
    it('should require UUID for DUID-UUID', () => {
      const config: DUIDConfig = {
        type: 'DUID-UUID',
      };
      const errors = validateDUIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('UUID is required');
    });

    it('should accept valid UUID', () => {
      const config: DUIDConfig = {
        type: 'DUID-UUID',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
      };
      const errors = validateDUIDConfig(config);
      expect(errors).toEqual([]);
    });

    it('should accept UUID without hyphens', () => {
      const config: DUIDConfig = {
        type: 'DUID-UUID',
        uuid: '550e8400e29b41d4a716446655440000',
      };
      const errors = validateDUIDConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate UUID format', () => {
      const config: DUIDConfig = {
        type: 'DUID-UUID',
        uuid: 'invalid-uuid',
      };
      const errors = validateDUIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid UUID');
    });
  });

  describe('buildDUID - DUID-LLT', () => {
    it('should build DUID-LLT with type code 1', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
        timestamp: 0,
      };
      const result = buildDUID(config);
      expect(result.type).toBe('DUID-LLT');
      expect(result.typeCode).toBe(1);
      expect(result.hexEncoded).toMatch(/^0001/); // Starts with type 1
    });

    it('should encode hardware type correctly', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
        hardwareType: HARDWARE_TYPES.ETHERNET,
        timestamp: 0,
      };
      const result = buildDUID(config);
      // Type (0001) + Hardware Type (0001) + Time (00000000) + MAC (001a2b3c4d5e)
      expect(result.hexEncoded).toMatch(/^00010001/);
    });

    it('should encode MAC address correctly', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
        timestamp: 0,
      };
      const result = buildDUID(config);
      expect(result.hexEncoded).toContain('001a2b3c4d5e');
    });

    it('should use current timestamp when not provided', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
      };
      const result = buildDUID(config);
      expect(result.hexEncoded.length).toBe(28); // 2+2+8+12 hex chars
    });

    it('should have correct total length', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
        timestamp: 0,
      };
      const result = buildDUID(config);
      expect(result.totalLength).toBe(14); // 2+2+4+6 bytes
    });
  });

  describe('buildDUID - DUID-EN', () => {
    it('should build DUID-EN with type code 2', () => {
      const config: DUIDConfig = {
        type: 'DUID-EN',
        enterpriseNumber: 9,
        enterpriseIdentifier: 'abcd1234',
      };
      const result = buildDUID(config);
      expect(result.type).toBe('DUID-EN');
      expect(result.typeCode).toBe(2);
      expect(result.hexEncoded).toMatch(/^0002/); // Starts with type 2
    });

    it('should encode enterprise number correctly', () => {
      const config: DUIDConfig = {
        type: 'DUID-EN',
        enterpriseNumber: 9,
        enterpriseIdentifier: 'abcd',
      };
      const result = buildDUID(config);
      // Type (0002) + Enterprise Number (00000009) + Identifier (abcd)
      expect(result.hexEncoded).toBe('000200000009abcd');
    });

    it('should handle large enterprise numbers', () => {
      const config: DUIDConfig = {
        type: 'DUID-EN',
        enterpriseNumber: 65535,
        enterpriseIdentifier: '1234',
      };
      const result = buildDUID(config);
      expect(result.hexEncoded).toContain('0000ffff');
    });
  });

  describe('buildDUID - DUID-LL', () => {
    it('should build DUID-LL with type code 3', () => {
      const config: DUIDConfig = {
        type: 'DUID-LL',
        macAddress: '00:1A:2B:3C:4D:5E',
      };
      const result = buildDUID(config);
      expect(result.type).toBe('DUID-LL');
      expect(result.typeCode).toBe(3);
      expect(result.hexEncoded).toMatch(/^0003/); // Starts with type 3
    });

    it('should encode MAC address correctly', () => {
      const config: DUIDConfig = {
        type: 'DUID-LL',
        macAddress: '00:1A:2B:3C:4D:5E',
      };
      const result = buildDUID(config);
      // Type (0003) + Hardware Type (0001) + MAC (001a2b3c4d5e)
      expect(result.hexEncoded).toBe('00030001001a2b3c4d5e');
    });

    it('should have correct total length', () => {
      const config: DUIDConfig = {
        type: 'DUID-LL',
        macAddress: '00:1A:2B:3C:4D:5E',
      };
      const result = buildDUID(config);
      expect(result.totalLength).toBe(10); // 2+2+6 bytes
    });
  });

  describe('buildDUID - DUID-UUID', () => {
    it('should build DUID-UUID with type code 4', () => {
      const config: DUIDConfig = {
        type: 'DUID-UUID',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = buildDUID(config);
      expect(result.type).toBe('DUID-UUID');
      expect(result.typeCode).toBe(4);
      expect(result.hexEncoded).toMatch(/^0004/); // Starts with type 4
    });

    it('should encode UUID correctly', () => {
      const config: DUIDConfig = {
        type: 'DUID-UUID',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = buildDUID(config);
      // Type (0004) + UUID (without hyphens)
      expect(result.hexEncoded).toBe('0004550e8400e29b41d4a716446655440000');
    });

    it('should handle UUID without hyphens', () => {
      const config: DUIDConfig = {
        type: 'DUID-UUID',
        uuid: '550e8400e29b41d4a716446655440000',
      };
      const result = buildDUID(config);
      expect(result.hexEncoded).toBe('0004550e8400e29b41d4a716446655440000');
    });

    it('should have correct total length', () => {
      const config: DUIDConfig = {
        type: 'DUID-UUID',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = buildDUID(config);
      expect(result.totalLength).toBe(18); // 2+16 bytes
    });
  });

  describe('buildDUID - configuration generation', () => {
    it('should generate Kea DHCPv6 configuration', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
        timestamp: 0,
      };
      const result = buildDUID(config);
      expect(result.examples.keaDhcp6).toBeDefined();
      expect(result.examples.keaDhcp6).toContain('"Dhcp6"');
      expect(result.examples.keaDhcp6).toContain('host-reservation-identifiers');
      expect(result.examples.keaDhcp6).toContain('duid');
    });

    it('should generate ISC DHCPd configuration', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
        timestamp: 0,
      };
      const result = buildDUID(config);
      expect(result.examples.iscDhcpd).toBeDefined();
      expect(result.examples.iscDhcpd).toContain('host');
      expect(result.examples.iscDhcpd).toContain('host-identifier option dhcp6.client-id');
    });
  });

  describe('buildDUID - breakdown', () => {
    it('should provide breakdown for DUID-LLT', () => {
      const config: DUIDConfig = {
        type: 'DUID-LLT',
        macAddress: '00:1A:2B:3C:4D:5E',
        timestamp: 0,
      };
      const result = buildDUID(config);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown!.length).toBe(4);
      expect(result.breakdown!.map((b) => b.field)).toEqual([
        'Type',
        'Hardware Type',
        'Time',
        'Link-layer Address',
      ]);
    });

    it('should provide breakdown for DUID-EN', () => {
      const config: DUIDConfig = {
        type: 'DUID-EN',
        enterpriseNumber: 9,
        enterpriseIdentifier: 'abcd1234',
      };
      const result = buildDUID(config);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown!.length).toBe(3);
      expect(result.breakdown!.map((b) => b.field)).toEqual([
        'Type',
        'Enterprise Number',
        'Identifier',
      ]);
    });
  });

  describe('buildDUID - wire format', () => {
    it('should format wire format with spaces', () => {
      const config: DUIDConfig = {
        type: 'DUID-LL',
        macAddress: '00:1A:2B:3C:4D:5E',
      };
      const result = buildDUID(config);
      expect(result.wireFormat).toContain(' ');
      expect(result.wireFormat.split(' ').length).toBe(10); // 10 bytes
    });
  });

  describe('buildDUID - error handling', () => {
    it('should throw error for invalid configuration', () => {
      const invalidConfig: DUIDConfig = {
        type: 'DUID-LLT',
      };
      expect(() => buildDUID(invalidConfig)).toThrow();
    });
  });
});
