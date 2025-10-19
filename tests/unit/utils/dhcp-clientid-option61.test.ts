import { describe, it, expect } from 'vitest';
import {
  validateClientIDConfig,
  buildClientID,
  decodeClientID,
  HARDWARE_TYPES,
  HARDWARE_TYPE_NAMES,
  type ClientIDConfig,
  type DecodeClientIDConfig,
} from '$lib/utils/dhcp-clientid-option61';

describe('dhcp-clientid-option61', () => {
  describe('validateClientIDConfig', () => {
    describe('hardware mode', () => {
      it('should require hardware type', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const errors = validateClientIDConfig(config);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('Hardware type is required');
      });

      it('should require MAC address', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
        };
        const errors = validateClientIDConfig(config);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('MAC address is required');
      });

      it('should validate hardware type range', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: 256,
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const errors = validateClientIDConfig(config);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('Hardware type must be between 0 and 255');
      });

      it('should validate MAC address format', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: 'invalid-mac',
        };
        const errors = validateClientIDConfig(config);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('Invalid MAC address format');
      });

      it('should accept valid hardware config with colon-separated MAC', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const errors = validateClientIDConfig(config);
        expect(errors).toEqual([]);
      });

      it('should accept valid hardware config with hyphen-separated MAC', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: '00-0c-29-4f-a3-d2',
        };
        const errors = validateClientIDConfig(config);
        expect(errors).toEqual([]);
      });

      it('should accept valid hardware config with Cisco format MAC', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: '000c.294f.a3d2',
        };
        const errors = validateClientIDConfig(config);
        expect(errors).toEqual([]);
      });

      it('should accept valid hardware config with no separator MAC', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: '000c294fa3d2',
        };
        const errors = validateClientIDConfig(config);
        expect(errors).toEqual([]);
      });

      it('should accept different hardware types', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.IEEE_802,
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const errors = validateClientIDConfig(config);
        expect(errors).toEqual([]);
      });
    });

    describe('opaque mode', () => {
      it('should require opaque data', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueFormat: 'text',
        };
        const errors = validateClientIDConfig(config);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('Opaque data is required');
      });

      it('should validate hex format for opaque data', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: 'xyz',
          opaqueFormat: 'hex',
        };
        const errors = validateClientIDConfig(config);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('Invalid hex format');
      });

      it('should accept valid text opaque data', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: 'client-device-001',
          opaqueFormat: 'text',
        };
        const errors = validateClientIDConfig(config);
        expect(errors).toEqual([]);
      });

      it('should accept valid hex opaque data', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: '0123456789abcdef',
          opaqueFormat: 'hex',
        };
        const errors = validateClientIDConfig(config);
        expect(errors).toEqual([]);
      });

      it('should accept hex with spaces', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: '01 23 45 67',
          opaqueFormat: 'hex',
        };
        const errors = validateClientIDConfig(config);
        expect(errors).toEqual([]);
      });
    });
  });

  describe('buildClientID', () => {
    describe('hardware mode', () => {
      it('should build Client ID for Ethernet', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const result = buildClientID(config);
        expect(result.mode).toBe('hardware');
        expect(result.hex).toBe('01000c294fa3d2');
        expect(result.length).toBe(7); // 1 byte type + 6 bytes MAC
        expect(result.breakdown).toHaveLength(2);
        expect(result.breakdown![0].field).toBe('Hardware Type');
        expect(result.breakdown![1].field).toBe('Hardware Address');
      });

      it('should handle different hardware types', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.IEEE_802,
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const result = buildClientID(config);
        expect(result.hex).toBe('06000c294fa3d2');
        expect(result.breakdown![0].description).toContain('IEEE 802');
      });

      it('should normalize MAC addresses', () => {
        const configs = [
          { macAddress: '00:0c:29:4f:a3:d2' },
          { macAddress: '00-0c-29-4f-a3-d2' },
          { macAddress: '000c.294f.a3d2' },
          { macAddress: '000c294fa3d2' },
        ];

        for (const partial of configs) {
          const config: ClientIDConfig = {
            mode: 'hardware',
            hardwareType: HARDWARE_TYPES.ETHERNET,
            ...partial,
          };
          const result = buildClientID(config);
          expect(result.hex).toBe('01000c294fa3d2');
        }
      });

      it('should include breakdown with descriptions', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const result = buildClientID(config);
        expect(result.breakdown![0].description).toContain('1');
        expect(result.breakdown![0].description).toContain('Ethernet');
        expect(result.breakdown![1].description).toBe('00:0c:29:4f:a3:d2');
      });

      it('should format wire format with spaces', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const result = buildClientID(config);
        expect(result.wireFormat).toBe('01 00 0c 29 4f a3 d2');
      });

      it('should include configuration examples', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: HARDWARE_TYPES.ETHERNET,
          macAddress: '00:0c:29:4f:a3:d2',
        };
        const result = buildClientID(config);
        expect(result.configExamples?.iscDhcpd).toBeDefined();
        expect(result.configExamples?.iscDhcpd).toContain('dhcp-client-identifier');
        expect(result.configExamples?.iscDhcpd).toContain('01 00 0c 29 4f a3 d2');
        expect(result.configExamples?.keaDhcp4).toBeDefined();
        expect(result.configExamples?.keaDhcp4).toContain('client-id');
        expect(result.configExamples?.keaDhcp4).toContain('01000c294fa3d2');
      });
    });

    describe('opaque mode', () => {
      it('should build Client ID from text data', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: 'client-001',
          opaqueFormat: 'text',
        };
        const result = buildClientID(config);
        expect(result.mode).toBe('opaque');
        expect(result.hex).toBe('636c69656e742d303031');
        expect(result.length).toBe(10); // 10 ASCII characters
        expect(result.breakdown).toHaveLength(1);
        expect(result.breakdown![0].field).toBe('Opaque Data');
      });

      it('should build Client ID from hex data', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: '0123456789abcdef',
          opaqueFormat: 'hex',
        };
        const result = buildClientID(config);
        expect(result.mode).toBe('opaque');
        expect(result.hex).toBe('0123456789abcdef');
        expect(result.length).toBe(8);
      });

      it('should normalize hex with spaces and colons', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: '01 23 45:67',
          opaqueFormat: 'hex',
        };
        const result = buildClientID(config);
        expect(result.hex).toBe('01234567');
      });

      it('should include breakdown with byte count', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: 'test',
          opaqueFormat: 'text',
        };
        const result = buildClientID(config);
        expect(result.breakdown![0].description).toContain('4 bytes');
      });

      it('should handle UTF-8 text encoding', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: 'test',
          opaqueFormat: 'text',
        };
        const result = buildClientID(config);
        expect(result.hex).toBe('74657374'); // 't' 'e' 's' 't'
      });

      it('should include configuration examples', () => {
        const config: ClientIDConfig = {
          mode: 'opaque',
          opaqueData: 'test',
          opaqueFormat: 'text',
        };
        const result = buildClientID(config);
        expect(result.configExamples?.iscDhcpd).toBeDefined();
        expect(result.configExamples?.keaDhcp4).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid configuration', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
          hardwareType: 256,
          macAddress: 'invalid',
        };
        expect(() => buildClientID(config)).toThrow();
      });

      it('should throw error for missing required fields', () => {
        const config: ClientIDConfig = {
          mode: 'hardware',
        };
        expect(() => buildClientID(config)).toThrow();
      });
    });
  });

  describe('decodeClientID', () => {
    describe('hardware mode', () => {
      it('should decode Ethernet Client ID', () => {
        const config: DecodeClientIDConfig = {
          hexData: '01000c294fa3d2',
        };
        const result = decodeClientID(config);
        expect(result.mode).toBe('hardware');
        expect(result.hex).toBe('01000c294fa3d2');
        expect(result.length).toBe(7);
        expect(result.decoded?.hardwareType).toBe(1);
        expect(result.decoded?.hardwareTypeName).toBe('Ethernet');
        expect(result.decoded?.macAddress).toBe('00:0C:29:4F:A3:D2');
      });

      it('should decode different hardware types', () => {
        const config: DecodeClientIDConfig = {
          hexData: '06000c294fa3d2',
        };
        const result = decodeClientID(config);
        expect(result.decoded?.hardwareType).toBe(6);
        expect(result.decoded?.hardwareTypeName).toBe('IEEE 802');
      });

      it('should handle hex with spaces', () => {
        const config: DecodeClientIDConfig = {
          hexData: '01 00 0c 29 4f a3 d2',
        };
        const result = decodeClientID(config);
        expect(result.hex).toBe('01000c294fa3d2');
        expect(result.decoded?.macAddress).toBe('00:0C:29:4F:A3:D2');
      });

      it('should include breakdown', () => {
        const config: DecodeClientIDConfig = {
          hexData: '01000c294fa3d2',
        };
        const result = decodeClientID(config);
        expect(result.breakdown).toHaveLength(2);
        expect(result.breakdown![0].field).toBe('Hardware Type');
        expect(result.breakdown![1].field).toBe('Hardware Address');
      });

      it('should handle variable-length MAC addresses', () => {
        const config: DecodeClientIDConfig = {
          hexData: '01000c294fa3d2ff',
        };
        const result = decodeClientID(config);
        expect(result.decoded?.macAddress).toBe('00:0C:29:4F:A3:D2:FF');
      });
    });

    describe('opaque mode', () => {
      it('should decode opaque hex data', () => {
        const config: DecodeClientIDConfig = {
          hexData: 'aabbccdd',
        };
        const result = decodeClientID(config);
        expect(result.mode).toBe('opaque');
        expect(result.hex).toBe('aabbccdd');
        expect(result.length).toBe(4);
      });

      it('should decode printable ASCII text', () => {
        const config: DecodeClientIDConfig = {
          hexData: '636c69656e742d303031',
        };
        const result = decodeClientID(config);
        expect(result.mode).toBe('opaque');
        expect(result.decoded?.opaqueData).toBe('client-001');
      });

      it('should return hex for non-printable data', () => {
        const config: DecodeClientIDConfig = {
          hexData: '00ff01fe',
        };
        const result = decodeClientID(config);
        expect(result.decoded?.opaqueData).toBe('00ff01fe');
      });

      it('should detect opaque mode for unknown hardware types', () => {
        const config: DecodeClientIDConfig = {
          hexData: 'ff0123456789',
        };
        const result = decodeClientID(config);
        expect(result.mode).toBe('opaque');
      });

      it('should include breakdown', () => {
        const config: DecodeClientIDConfig = {
          hexData: '74657374',
        };
        const result = decodeClientID(config);
        expect(result.breakdown).toHaveLength(1);
        expect(result.breakdown![0].field).toBe('Opaque Data');
        expect(result.breakdown![0].description).toContain('4 bytes');
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid hex', () => {
        const config: DecodeClientIDConfig = {
          hexData: 'xyz',
        };
        expect(() => decodeClientID(config)).toThrow('Invalid hex data format');
      });

      it('should throw error for too short data', () => {
        const config: DecodeClientIDConfig = {
          hexData: '',
        };
        expect(() => decodeClientID(config)).toThrow('Client ID must be at least 1 byte');
      });

      it('should handle odd-length hex gracefully', () => {
        const config: DecodeClientIDConfig = {
          hexData: '0',
        };
        expect(() => decodeClientID(config)).toThrow();
      });
    });

    describe('wire format', () => {
      it('should format wire format correctly', () => {
        const config: DecodeClientIDConfig = {
          hexData: '01000c294fa3d2',
        };
        const result = decodeClientID(config);
        expect(result.wireFormat).toBe('01 00 0c 29 4f a3 d2');
      });
    });
  });

  describe('round-trip encoding', () => {
    it('should encode and decode hardware mode correctly', () => {
      const config: ClientIDConfig = {
        mode: 'hardware',
        hardwareType: HARDWARE_TYPES.ETHERNET,
        macAddress: '00:0c:29:4f:a3:d2',
      };
      const encoded = buildClientID(config);
      const decoded = decodeClientID({ hexData: encoded.hex });

      expect(decoded.mode).toBe('hardware');
      expect(decoded.decoded?.hardwareType).toBe(config.hardwareType);
      expect(decoded.decoded?.macAddress).toBe('00:0C:29:4F:A3:D2');
    });

    it('should encode and decode opaque text correctly', () => {
      const config: ClientIDConfig = {
        mode: 'opaque',
        opaqueData: 'client-device-001',
        opaqueFormat: 'text',
      };
      const encoded = buildClientID(config);
      const decoded = decodeClientID({ hexData: encoded.hex });

      expect(decoded.mode).toBe('opaque');
      expect(decoded.decoded?.opaqueData).toBe('client-device-001');
    });

    it('should encode and decode opaque hex correctly', () => {
      const config: ClientIDConfig = {
        mode: 'opaque',
        opaqueData: 'aabbccddee',
        opaqueFormat: 'hex',
      };
      const encoded = buildClientID(config);
      const decoded = decodeClientID({ hexData: encoded.hex });

      expect(decoded.mode).toBe('opaque');
      expect(decoded.hex).toBe('aabbccddee');
    });
  });

  describe('HARDWARE_TYPE_NAMES', () => {
    it('should contain standard hardware types', () => {
      expect(HARDWARE_TYPE_NAMES[1]).toBe('Ethernet');
      expect(HARDWARE_TYPE_NAMES[6]).toBe('IEEE 802');
      expect(HARDWARE_TYPE_NAMES[7]).toBe('ARCNET');
      expect(HARDWARE_TYPE_NAMES[32]).toBe('InfiniBand');
    });
  });
});
