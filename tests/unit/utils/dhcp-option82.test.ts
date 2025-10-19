import { describe, it, expect } from 'vitest';
import {
  buildOption82,
  parseOption82,
  getDefaultOption82Config,
  type Option82Config,
  type EncodingFormat,
} from '$lib/utils/dhcp-option82';

describe('DHCP Option 82', () => {
  describe('getDefaultOption82Config', () => {
    it('should return default configuration', () => {
      const config = getDefaultOption82Config();
      expect(config).toBeDefined();
      expect(config.suboptions).toHaveLength(1);
      expect(config.suboptions[0].type).toBe('circuit-id');
      expect(config.suboptions[0].format).toBe('vlan-id');
      expect(config.suboptions[0].value).toBe('100');
    });
  });

  describe('buildOption82', () => {
    it('should build option 82 with ASCII circuit-id', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Gi0/1',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.hexEncoded).toBeTruthy();
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].type).toBe('circuit-id');
      expect(result.breakdown[0].typeCode).toBe(1);
      expect(result.breakdown[0].value).toBe('Gi0/1');
    });

    it('should build option 82 with VLAN ID', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'vlan-id',
            value: '100',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.hexEncoded).toBeTruthy();
      expect(result.breakdown[0].hexValue).toBe('0064');
      expect(result.breakdown[0].length).toBe(2);
    });

    it('should build option 82 with multiple suboptions', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Gi0/1',
          },
          {
            type: 'remote-id',
            format: 'ascii',
            value: 'sw1.example',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].typeCode).toBe(1);
      expect(result.breakdown[1].typeCode).toBe(2);
    });

    it('should handle hex format', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'remote-id',
            format: 'hex',
            value: '001122334455',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].hexValue).toBe('001122334455');
    });

    it('should generate ISC dhcpd examples', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Gi0/1',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.examples.iscDhcpd).toBeDefined();
      expect(result.examples.iscDhcpd).toContain('match if');
      expect(result.examples.iscDhcpd).toContain('agent.circuit-id');
    });

    it('should generate Kea DHCPv4 examples', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Gi0/1',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.examples.keaDhcp4).toBeDefined();
      expect(result.examples.keaDhcp4).toContain('relay4');
      expect(result.examples.keaDhcp4).toContain('client-classes');
    });

    it('should generate Cisco relay examples', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'vlan-id',
            value: '100',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.examples.ciscoRelay).toBeDefined();
      expect(result.examples.ciscoRelay).toContain('ip helper-address');
    });

    it('should handle hostname:port format', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'hostname-port',
            value: 'sw1:Gi0/1',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].value).toBe('sw1:Gi0/1');
      expect(result.breakdown[0].hexValue.length).toBeGreaterThan(0);
    });

    it('should handle invalid VLAN ID gracefully', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'vlan-id',
            value: '9999', // Out of range
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].hexValue).toBe('0000');
    });

    it('should clean hex input', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'remote-id',
            format: 'hex',
            value: '00:11:22:33:44:55', // With colons
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].hexValue).toBe('001122334455');
    });
  });

  describe('parseOption82', () => {
    it('should parse circuit-id suboption', () => {
      // TLV: Type=01, Length=05, Value="Gi0/1" (4769302f31 in hex)
      const hex = '01054769302f31';
      const result = parseOption82(hex);

      expect(result.suboptions).toHaveLength(1);
      expect(result.suboptions[0].type).toBe('circuit-id');
      expect(result.suboptions[0].typeCode).toBe(1);
      expect(result.suboptions[0].length).toBe(5);
      expect(result.suboptions[0].value).toBe('Gi0/1');
    });

    it('should parse remote-id suboption', () => {
      // TLV: Type=02, Length=0b, Value="sw1.example" (7377312e6578616d706c65 in hex, 11 bytes)
      const hex = '020b7377312e6578616d706c65';
      const result = parseOption82(hex);

      expect(result.suboptions).toHaveLength(1);
      expect(result.suboptions[0].type).toBe('remote-id');
      expect(result.suboptions[0].typeCode).toBe(2);
      expect(result.suboptions[0].value).toBe('sw1.example');
    });

    it('should parse multiple suboptions', () => {
      // Circuit-ID + Remote-ID
      const hex = '01054769302f31' + '020b7377312e6578616d706c65';
      const result = parseOption82(hex);

      expect(result.suboptions).toHaveLength(2);
      expect(result.suboptions[0].type).toBe('circuit-id');
      expect(result.suboptions[1].type).toBe('remote-id');
    });

    it('should handle hex with spaces', () => {
      const hex = '01 05 47 69 30 2f 31';
      const result = parseOption82(hex);

      expect(result.suboptions).toHaveLength(1);
      expect(result.suboptions[0].value).toBe('Gi0/1');
    });

    it('should calculate total length correctly', () => {
      const hex = '01054769302f31020b7377312e6578616d706c65';
      const result = parseOption82(hex);

      expect(result.totalLength).toBe(20); // 1+1+5 + 1+1+11
    });

    it('should handle truncated data', () => {
      // Type and length present, but value missing
      const hex = '0105';
      const result = parseOption82(hex);

      expect(result.suboptions).toHaveLength(0);
    });

    it('should skip unknown suboption types', () => {
      // Type=99 (unknown), Length=04, Value=00000000, then Type=01 (known)
      const hex = '990400000000' + '01054769302f31';
      const result = parseOption82(hex);

      // Only circuit-id should be parsed (type 01)
      expect(result.suboptions.length).toBeGreaterThan(0);
    });

    it('should handle empty input', () => {
      const hex = '';
      const result = parseOption82(hex);

      expect(result.suboptions).toHaveLength(0);
      expect(result.totalLength).toBe(0);
    });

    it('should handle VLAN ID suboption', () => {
      // Type=01, Length=02, Value=0064 (100 decimal)
      const hex = '0102006 4';
      const result = parseOption82(hex);

      expect(result.suboptions).toHaveLength(1);
      expect(result.suboptions[0].hexValue).toBe('0064');
    });
  });

  describe('Round-trip encoding/decoding', () => {
    it('should preserve ASCII data through round-trip', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Gi0/1',
          },
        ],
      };

      const built = buildOption82(config);
      const parsed = parseOption82(built.hexEncoded);

      expect(parsed.suboptions[0].value).toBe('Gi0/1');
    });

    it('should preserve multiple suboptions through round-trip', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Gi0/1',
          },
          {
            type: 'remote-id',
            format: 'ascii',
            value: 'switch-1',
          },
        ],
      };

      const built = buildOption82(config);
      const parsed = parseOption82(built.hexEncoded);

      expect(parsed.suboptions).toHaveLength(2);
      expect(parsed.suboptions[0].value).toBe('Gi0/1');
      expect(parsed.suboptions[1].value).toBe('switch-1');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty suboption value', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: '',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].length).toBe(0);
    });

    it('should handle special characters in ASCII', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Port-1/2.3',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].value).toBe('Port-1/2.3');
    });

    it('should handle maximum VLAN ID', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'vlan-id',
            value: '4095',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].hexValue).toBe('0fff');
    });

    it('should handle minimum VLAN ID', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'vlan-id',
            value: '0',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].hexValue).toBe('0000');
    });

    it('should handle long ASCII values', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'remote-id',
            format: 'ascii',
            value: 'very-long-switch-hostname.example.com',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].value).toBe('very-long-switch-hostname.example.com');
      expect(result.breakdown[0].length).toBeGreaterThan(10);
    });
  });

  describe('Description and metadata', () => {
    it('should include descriptions for circuit-id', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Gi0/1',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].description).toBeDefined();
      expect(result.breakdown[0].description).toContain('circuit');
    });

    it('should include descriptions for remote-id', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'remote-id',
            format: 'ascii',
            value: 'switch-1',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.breakdown[0].description).toBeDefined();
      expect(result.breakdown[0].description).toContain('relay');
    });

    it('should generate ascii decoded summary', () => {
      const config: Option82Config = {
        suboptions: [
          {
            type: 'circuit-id',
            format: 'ascii',
            value: 'Gi0/1',
          },
          {
            type: 'remote-id',
            format: 'ascii',
            value: 'sw1',
          },
        ],
      };

      const result = buildOption82(config);
      expect(result.asciiDecoded).toContain('circuit-id: Gi0/1');
      expect(result.asciiDecoded).toContain('remote-id: sw1');
    });
  });
});
