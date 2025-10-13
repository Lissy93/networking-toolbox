import { describe, it, expect } from 'vitest';
import { serializeBigInt } from '../../../src/lib/utils/json-serialization';

describe('JSON Serialization Utilities', () => {
  describe('serializeBigInt', () => {
    it('should convert BigInt to string', () => {
      const bigIntValue = BigInt('12345678901234567890');
      const result = serializeBigInt(bigIntValue);

      expect(result).toBe('12345678901234567890');
      expect(typeof result).toBe('string');
    });

    it('should handle arrays with BigInt values', () => {
      const input = [BigInt('123'), BigInt('456'), 'normal string', 42];
      const result = serializeBigInt(input);

      expect(result).toEqual(['123', '456', 'normal string', 42]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle nested arrays', () => {
      const input = [BigInt('123'), [BigInt('456'), BigInt('789')]];
      const result = serializeBigInt(input);

      expect(result).toEqual(['123', ['456', '789']]);
    });

    it('should handle objects with BigInt values', () => {
      const input = {
        count: BigInt('12345'),
        name: 'test',
        value: 42
      };
      const result = serializeBigInt(input);

      expect(result).toEqual({
        count: '12345',
        name: 'test',
        value: 42
      });
    });

    it('should handle nested objects', () => {
      const input = {
        outer: {
          inner: BigInt('999'),
          other: 'string'
        },
        number: 123
      };
      const result = serializeBigInt(input);

      expect(result).toEqual({
        outer: {
          inner: '999',
          other: 'string'
        },
        number: 123
      });
    });

    it('should handle complex nested structures', () => {
      const input = {
        array: [BigInt('111'), { nested: BigInt('222') }],
        object: {
          value: BigInt('333'),
          subArray: [BigInt('444'), 'text']
        }
      };
      const result = serializeBigInt(input);

      expect(result).toEqual({
        array: ['111', { nested: '222' }],
        object: {
          value: '333',
          subArray: ['444', 'text']
        }
      });
    });

    it('should handle primitive values', () => {
      expect(serializeBigInt('string')).toBe('string');
      expect(serializeBigInt(42)).toBe(42);
      expect(serializeBigInt(true)).toBe(true);
      expect(serializeBigInt(false)).toBe(false);
      expect(serializeBigInt(null)).toBe(null);
      expect(serializeBigInt(undefined)).toBe(undefined);
    });

    it('should handle empty arrays and objects', () => {
      expect(serializeBigInt([])).toEqual([]);
      expect(serializeBigInt({})).toEqual({});
    });

    it('should handle arrays with mixed types', () => {
      const input = [
        BigInt('123'),
        'string',
        42,
        true,
        null,
        undefined,
        { key: BigInt('456') },
        [BigInt('789')]
      ];
      const result = serializeBigInt(input);

      expect(result).toEqual([
        '123',
        'string',
        42,
        true,
        null,
        undefined,
        { key: '456' },
        ['789']
      ]);
    });

    it('should preserve object property ownership', () => {
      const parent = { inherited: BigInt('999') };
      const child = Object.create(parent);
      child.own = BigInt('123');

      const result = serializeBigInt(child);

      expect(result).toEqual({ own: '123' });
      expect(result.hasOwnProperty('inherited')).toBe(false);
    });

    it('should handle very large BigInt values', () => {
      const largeValue = BigInt('12345678901234567890123456789012345678901234567890');
      const result = serializeBigInt(largeValue);

      expect(result).toBe('12345678901234567890123456789012345678901234567890');
    });

    it('should handle zero BigInt', () => {
      const result = serializeBigInt(BigInt(0));
      expect(result).toBe('0');
    });

    it('should handle negative BigInt values', () => {
      const result = serializeBigInt(BigInt(-123));
      expect(result).toBe('-123');
    });

    it('should handle Date objects (converts to empty object)', () => {
      const date = new Date('2023-01-01');
      const result = serializeBigInt(date);

      expect(result).toEqual({});
      expect(typeof result).toBe('object');
    });

    it('should handle RegExp objects (converts to empty object)', () => {
      const regex = /test/g;
      const result = serializeBigInt(regex);

      expect(result).toEqual({});
      expect(typeof result).toBe('object');
    });

    it('should handle functions (pass through)', () => {
      const fn = () => 'test';
      const result = serializeBigInt(fn);

      expect(result).toBe(fn);
      expect(typeof result).toBe('function');
    });

    it('should handle symbols (pass through)', () => {
      const sym = Symbol('test');
      const result = serializeBigInt(sym);

      expect(result).toBe(sym);
      expect(typeof result).toBe('symbol');
    });
  });
});