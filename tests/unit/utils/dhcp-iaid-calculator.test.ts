import { describe, it, expect } from 'vitest';
import {
  validateIAIDConfig,
  calculateIAID,
  type IAIDConfig,
} from '$lib/utils/dhcp-iaid-calculator';

describe('dhcp-iaid-calculator', () => {
  describe('validateIAIDConfig', () => {
    it('should require interface index for interface-index method', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
      };
      const errors = validateIAIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Interface index is required');
    });

    it('should validate interface index range', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
        interfaceIndex: -1,
      };
      const errors = validateIAIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('positive integer');
    });

    it('should accept valid interface index', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
        interfaceIndex: 2,
      };
      const errors = validateIAIDConfig(config);
      expect(errors).toEqual([]);
    });

    it('should require interface name for interface-name method', () => {
      const config: IAIDConfig = {
        method: 'interface-name',
        interfaceName: '',
      };
      const errors = validateIAIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Interface name is required');
    });

    it('should accept valid interface name', () => {
      const config: IAIDConfig = {
        method: 'interface-name',
        interfaceName: 'eth0',
      };
      const errors = validateIAIDConfig(config);
      expect(errors).toEqual([]);
    });

    it('should require MAC address for mac-address method', () => {
      const config: IAIDConfig = {
        method: 'mac-address',
        macAddress: '',
      };
      const errors = validateIAIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('MAC address is required');
    });

    it('should validate MAC address format', () => {
      const config: IAIDConfig = {
        method: 'mac-address',
        macAddress: 'invalid-mac',
      };
      const errors = validateIAIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid MAC address');
    });

    it('should accept valid MAC address', () => {
      const config: IAIDConfig = {
        method: 'mac-address',
        macAddress: '00:0c:29:4f:a3:d2',
      };
      const errors = validateIAIDConfig(config);
      expect(errors).toEqual([]);
    });

    it('should require custom value for custom method', () => {
      const config: IAIDConfig = {
        method: 'custom',
      };
      const errors = validateIAIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Custom IAID value is required');
    });

    it('should validate custom value range', () => {
      const config: IAIDConfig = {
        method: 'custom',
        customValue: -1,
      };
      const errors = validateIAIDConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid custom value', () => {
      const config: IAIDConfig = {
        method: 'custom',
        customValue: 1000,
      };
      const errors = validateIAIDConfig(config);
      expect(errors).toEqual([]);
    });
  });

  describe('calculateIAID', () => {
    it('should calculate IAID from interface index', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
        interfaceIndex: 2,
      };
      const result = calculateIAID(config);
      expect(result.iaid).toBe(2);
      expect(result.hex).toBe('0x00000002');
      expect(result.decimal).toBe('2');
    });

    it('should calculate IAID from interface name (hash)', () => {
      const config: IAIDConfig = {
        method: 'interface-name',
        interfaceName: 'eth0',
      };
      const result = calculateIAID(config);
      expect(result.iaid).toBeGreaterThan(0);
      expect(result.hex).toMatch(/^0x[0-9A-F]{8}$/);
      expect(result.method).toContain('eth0');
    });

    it('should calculate same IAID for same interface name', () => {
      const config1: IAIDConfig = {
        method: 'interface-name',
        interfaceName: 'eth0',
      };
      const config2: IAIDConfig = {
        method: 'interface-name',
        interfaceName: 'eth0',
      };
      const result1 = calculateIAID(config1);
      const result2 = calculateIAID(config2);
      expect(result1.iaid).toBe(result2.iaid);
    });

    it('should calculate different IAID for different interface names', () => {
      const config1: IAIDConfig = {
        method: 'interface-name',
        interfaceName: 'eth0',
      };
      const config2: IAIDConfig = {
        method: 'interface-name',
        interfaceName: 'wlan0',
      };
      const result1 = calculateIAID(config1);
      const result2 = calculateIAID(config2);
      expect(result1.iaid).not.toBe(result2.iaid);
    });

    it('should calculate IAID from MAC address', () => {
      const config: IAIDConfig = {
        method: 'mac-address',
        macAddress: '00:0c:29:4f:a3:d2',
      };
      const result = calculateIAID(config);
      // Last 8 hex chars of MAC: 294fa3d2
      expect(result.iaid).toBe(0x294fa3d2);
    });

    it('should calculate IAID from custom value', () => {
      const config: IAIDConfig = {
        method: 'custom',
        customValue: 1000,
      };
      const result = calculateIAID(config);
      expect(result.iaid).toBe(1000);
      expect(result.hex).toBe('0x000003E8');
      expect(result.decimal).toBe('1000');
    });

    it('should format binary correctly', () => {
      const config: IAIDConfig = {
        method: 'custom',
        customValue: 255,
      };
      const result = calculateIAID(config);
      expect(result.binary).toBe('0b' + '0'.repeat(24) + '11111111');
    });

    it('should include OS conventions', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
        interfaceIndex: 2,
      };
      const result = calculateIAID(config);
      expect(result.osConventions.linux).toBeDefined();
      expect(result.osConventions.windows).toBeDefined();
      expect(result.osConventions.macos).toBeDefined();
      expect(result.osConventions.freebsd).toBeDefined();
    });

    it('should warn about IAID 0', () => {
      const config: IAIDConfig = {
        method: 'custom',
        customValue: 0,
      };
      const result = calculateIAID(config);
      expect(result.collisionWarning).toBeDefined();
      expect(result.collisionWarning).toContain('IAID 0');
    });

    it('should warn about IAID 0xFFFFFFFF', () => {
      const config: IAIDConfig = {
        method: 'custom',
        customValue: 0xFFFFFFFF,
      };
      const result = calculateIAID(config);
      expect(result.collisionWarning).toBeDefined();
      expect(result.collisionWarning).toContain('maximum value');
    });

    it('should warn about small IAIDs that might collide with interface indices', () => {
      const config: IAIDConfig = {
        method: 'custom',
        customValue: 5,
      };
      const result = calculateIAID(config);
      expect(result.collisionWarning).toBeDefined();
      expect(result.collisionWarning).toContain('collide with interface index');
    });

    it('should not warn about interface index method with small values', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
        interfaceIndex: 5,
      };
      const result = calculateIAID(config);
      expect(result.collisionWarning).toBeUndefined();
    });

    it('should handle maximum interface index', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
        interfaceIndex: 0xFFFFFFFF,
      };
      const result = calculateIAID(config);
      expect(result.iaid).toBe(0xFFFFFFFF);
      expect(result.hex).toBe('0xFFFFFFFF');
    });

    it('should throw error for invalid configuration', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
      };
      expect(() => calculateIAID(config)).toThrow();
    });

    it('should handle MAC addresses without separators', () => {
      const config: IAIDConfig = {
        method: 'mac-address',
        macAddress: '000c294fa3d2',
      };
      const result = calculateIAID(config);
      expect(result.iaid).toBeGreaterThan(0);
    });

    it('should handle Cisco-format MAC addresses', () => {
      const config: IAIDConfig = {
        method: 'mac-address',
        macAddress: '000c.294f.a3d2',
      };
      const result = calculateIAID(config);
      expect(result.iaid).toBeGreaterThan(0);
    });

    it('should include DHCPv6 configuration examples', () => {
      const config: IAIDConfig = {
        method: 'interface-index',
        interfaceIndex: 2,
      };
      const result = calculateIAID(config);
      expect(result.configExamples).toBeDefined();
      expect(result.configExamples?.keaDhcp6).toBeDefined();
      expect(result.configExamples?.iscDhcpd).toBeDefined();
    });

    it('should include IAID in ISC config comments', () => {
      const config: IAIDConfig = {
        method: 'custom',
        customValue: 1000,
      };
      const result = calculateIAID(config);
      expect(result.configExamples?.iscDhcpd).toContain('1000');
      expect(result.configExamples?.iscDhcpd).toContain('3E8'); // Hex value
    });

    it('should include interface name in Kea config', () => {
      const config: IAIDConfig = {
        method: 'interface-name',
        interfaceName: 'eth0',
      };
      const result = calculateIAID(config);
      expect(result.configExamples?.keaDhcp6).toContain('eth0');
    });
  });
});
