import { describe, it, expect } from 'vitest';
import {
  validateTLVItem,
  validateTLVOption,
  buildTLVOption,
  createTLVItem,
  getDefaultTLVOption,
  type TLVItem,
  type TLVOption,
} from '$lib/utils/dhcp-freeform-tlv';

describe('dhcp-freeform-tlv', () => {
  describe('validateTLVItem', () => {
    it('should validate IPv4 addresses correctly', () => {
      const validItem: TLVItem = { id: '1', dataType: 'ipv4', value: '192.168.1.1' };
      expect(validateTLVItem(validItem)).toBeNull();

      const invalidItem: TLVItem = { id: '1', dataType: 'ipv4', value: '256.1.1.1' };
      expect(validateTLVItem(invalidItem)).toContain('Invalid address format');
    });

    it('should validate IPv6 addresses correctly', () => {
      const validItem: TLVItem = { id: '1', dataType: 'ipv6', value: '2001:db8::1' };
      expect(validateTLVItem(validItem)).toBeNull();

      const invalidItem: TLVItem = { id: '1', dataType: 'ipv6', value: 'invalid' };
      expect(validateTLVItem(invalidItem)).toContain('Invalid address format');
    });

    it('should validate FQDN correctly', () => {
      const validItem: TLVItem = { id: '1', dataType: 'fqdn', value: 'example.com' };
      expect(validateTLVItem(validItem)).toBeNull();

      const invalidItem: TLVItem = { id: '1', dataType: 'fqdn', value: '-invalid-.com' };
      expect(validateTLVItem(invalidItem)).toContain('Invalid domain name format');
    });

    it('should validate hex strings correctly', () => {
      const validItem: TLVItem = { id: '1', dataType: 'hex', value: 'deadbeef' };
      expect(validateTLVItem(validItem)).toBeNull();

      const invalidOddLength: TLVItem = { id: '1', dataType: 'hex', value: 'abc' };
      expect(validateTLVItem(invalidOddLength)).toContain('even number of hex digits');

      const invalidChars: TLVItem = { id: '1', dataType: 'hex', value: 'xyz' };
      expect(validateTLVItem(invalidChars)).toContain('hexadecimal characters');
    });

    it('should validate uint8 correctly', () => {
      const validItem: TLVItem = { id: '1', dataType: 'uint8', value: '255' };
      expect(validateTLVItem(validItem)).toBeNull();

      const outOfRange: TLVItem = { id: '1', dataType: 'uint8', value: '256' };
      expect(validateTLVItem(outOfRange)).toContain('0 and 255');
    });

    it('should validate uint16 correctly', () => {
      const validItem: TLVItem = { id: '1', dataType: 'uint16', value: '65535' };
      expect(validateTLVItem(validItem)).toBeNull();

      const outOfRange: TLVItem = { id: '1', dataType: 'uint16', value: '65536' };
      expect(validateTLVItem(outOfRange)).toContain('0 and 65535');
    });

    it('should validate uint32 correctly', () => {
      const validItem: TLVItem = { id: '1', dataType: 'uint32', value: '4294967295' };
      expect(validateTLVItem(validItem)).toBeNull();

      const outOfRange: TLVItem = { id: '1', dataType: 'uint32', value: '4294967296' };
      expect(validateTLVItem(outOfRange)).toContain('0 and 4294967295');
    });

    it('should validate boolean correctly', () => {
      const validTrue: TLVItem = { id: '1', dataType: 'boolean', value: 'true' };
      expect(validateTLVItem(validTrue)).toBeNull();

      const validOne: TLVItem = { id: '1', dataType: 'boolean', value: '1' };
      expect(validateTLVItem(validOne)).toBeNull();

      const invalid: TLVItem = { id: '1', dataType: 'boolean', value: 'yes' };
      expect(validateTLVItem(invalid)).toContain('0, 1, true, or false');
    });

    it('should validate string length correctly', () => {
      const validItem: TLVItem = { id: '1', dataType: 'string', value: 'Hello World' };
      expect(validateTLVItem(validItem)).toBeNull();

      const tooLong: TLVItem = { id: '1', dataType: 'string', value: 'a'.repeat(256) };
      expect(validateTLVItem(tooLong)).toContain('Maximum length is 255');
    });

    it('should reject empty values', () => {
      const emptyItem: TLVItem = { id: '1', dataType: 'string', value: '' };
      expect(validateTLVItem(emptyItem)).toContain('Value is required');
    });
  });

  describe('validateTLVOption', () => {
    it('should validate option code range', () => {
      const invalidLow: TLVOption = {
        optionCode: -1,
        optionName: 'Test',
        items: [{ id: '1', dataType: 'string', value: 'test' }],
      };
      expect(validateTLVOption(invalidLow)).toContain('Option code must be between 0 and 255');

      const invalidHigh: TLVOption = {
        optionCode: 256,
        optionName: 'Test',
        items: [{ id: '1', dataType: 'string', value: 'test' }],
      };
      expect(validateTLVOption(invalidHigh)).toContain('Option code must be between 0 and 255');
    });

    it('should require option name', () => {
      const noName: TLVOption = {
        optionCode: 224,
        optionName: '',
        items: [{ id: '1', dataType: 'string', value: 'test' }],
      };
      expect(validateTLVOption(noName)).toContain('Option name is required');
    });

    it('should require at least one item', () => {
      const noItems: TLVOption = {
        optionCode: 224,
        optionName: 'Test',
        items: [],
      };
      expect(validateTLVOption(noItems)).toContain('At least one data item is required');
    });

    it('should validate all items and return all errors', () => {
      const multipleErrors: TLVOption = {
        optionCode: 224,
        optionName: 'Test',
        items: [
          { id: '1', dataType: 'ipv4', value: '999.999.999.999' },
          { id: '2', dataType: 'uint8', value: '300' },
        ],
      };
      const errors = validateTLVOption(multipleErrors);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('buildTLVOption', () => {
    it('should encode IPv4 addresses correctly', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Test IPv4',
        items: [{ id: '1', dataType: 'ipv4', value: '192.168.1.1' }],
      };
      const result = buildTLVOption(option);
      expect(result.hexEncoded).toBe('c0a80101');
      expect(result.wireFormat).toBe('c0 a8 01 01');
      expect(result.dataLength).toBe(4);
    });

    it('should encode hex data correctly', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Test Hex',
        items: [{ id: '1', dataType: 'hex', value: 'DE AD BE EF' }],
      };
      const result = buildTLVOption(option);
      expect(result.hexEncoded).toBe('deadbeef');
      expect(result.dataLength).toBe(4);
    });

    it('should encode strings correctly', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Test String',
        items: [{ id: '1', dataType: 'string', value: 'hello' }],
      };
      const result = buildTLVOption(option);
      expect(result.hexEncoded).toBe('68656c6c6f');
      expect(result.dataLength).toBe(5);
    });

    it('should encode uint8 correctly', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Test UInt8',
        items: [{ id: '1', dataType: 'uint8', value: '255' }],
      };
      const result = buildTLVOption(option);
      expect(result.hexEncoded).toBe('ff');
      expect(result.dataLength).toBe(1);
    });

    it('should encode uint16 correctly', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Test UInt16',
        items: [{ id: '1', dataType: 'uint16', value: '8080' }],
      };
      const result = buildTLVOption(option);
      expect(result.hexEncoded).toBe('1f90');
      expect(result.dataLength).toBe(2);
    });

    it('should encode uint32 correctly', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Test UInt32',
        items: [{ id: '1', dataType: 'uint32', value: '3600' }],
      };
      const result = buildTLVOption(option);
      expect(result.hexEncoded).toBe('00000e10');
      expect(result.dataLength).toBe(4);
    });

    it('should encode boolean correctly', () => {
      const optionTrue: TLVOption = {
        optionCode: 224,
        optionName: 'Test Boolean',
        items: [{ id: '1', dataType: 'boolean', value: 'true' }],
      };
      const resultTrue = buildTLVOption(optionTrue);
      expect(resultTrue.hexEncoded).toBe('01');

      const optionFalse: TLVOption = {
        optionCode: 224,
        optionName: 'Test Boolean',
        items: [{ id: '1', dataType: 'boolean', value: '0' }],
      };
      const resultFalse = buildTLVOption(optionFalse);
      expect(resultFalse.hexEncoded).toBe('00');
    });

    it('should encode FQDN with DNS wire format', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Test FQDN',
        items: [{ id: '1', dataType: 'fqdn', value: 'example.com' }],
      };
      const result = buildTLVOption(option);
      // 07 (length) + example + 03 (length) + com + 00 (null terminator)
      expect(result.hexEncoded).toBe('076578616d706c6503636f6d00');
    });

    it('should encode multiple items correctly', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Test Multiple',
        items: [
          { id: '1', dataType: 'uint8', value: '5' },
          { id: '2', dataType: 'uint16', value: '8080' },
        ],
      };
      const result = buildTLVOption(option);
      expect(result.hexEncoded).toBe('051f90');
      expect(result.dataLength).toBe(3);
      expect(result.breakdown.length).toBe(2);
    });

    it('should generate configuration examples', () => {
      const option: TLVOption = {
        optionCode: 224,
        optionName: 'Custom Option',
        items: [{ id: '1', dataType: 'string', value: 'test' }],
      };
      const result = buildTLVOption(option);
      expect(result.examples.iscDhcpd).toBeDefined();
      expect(result.examples.keaDhcp4).toBeDefined();
      expect(result.examples.iscDhcpd).toContain('option space custom-options');
      expect(result.examples.keaDhcp4).toContain('"code": 224');
    });

    it('should throw error for invalid option', () => {
      const invalidOption: TLVOption = {
        optionCode: 300,
        optionName: '',
        items: [],
      };
      expect(() => buildTLVOption(invalidOption)).toThrow();
    });
  });

  describe('createTLVItem', () => {
    it('should create item with default dataType', () => {
      const item = createTLVItem();
      expect(item.dataType).toBe('string');
      expect(item.value).toBe('');
      expect(item.id).toBeDefined();
    });

    it('should create item with specified dataType', () => {
      const item = createTLVItem('ipv4');
      expect(item.dataType).toBe('ipv4');
      expect(item.value).toBe('');
    });

    it('should generate unique IDs', () => {
      const item1 = createTLVItem();
      const item2 = createTLVItem();
      expect(item1.id).not.toBe(item2.id);
    });
  });

  describe('getDefaultTLVOption', () => {
    it('should return default option with option code 224', () => {
      const defaultOption = getDefaultTLVOption();
      expect(defaultOption.optionCode).toBe(224);
      expect(defaultOption.optionName).toBe('Custom Option');
      expect(defaultOption.items).toEqual([]);
    });
  });
});
