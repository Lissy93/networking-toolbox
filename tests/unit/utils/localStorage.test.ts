import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock browser environment and logger BEFORE importing storage
let mockBrowser = true;
vi.mock('$app/environment', () => ({
  get browser() {
    return mockBrowser;
  },
  dev: true,
}));

vi.mock('$lib/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    getLevel: () => 'debug',
  },
}));

import { storage } from '../../../src/lib/utils/localStorage';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => {
      return key in store ? store[key] : null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] || null;
    },
    // Helper to reset internal store
    _reset() {
      store = {};
    },
    // Helper to get internal store
    _getStore() {
      return store;
    },
  };
})();

// Use Object.defineProperty to properly expose localStorage with all properties
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe('LocalStorage Helper', () => {
  beforeEach(() => {
    mockBrowser = true;
    vi.clearAllMocks();
    mockLocalStorage._reset();
  });

  describe('getItem()', () => {
    it('should return default value when key does not exist', () => {
      const result = storage.getItem('non-existent', { defaultValue: 'default' });

      expect(result).toBe('default');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('non-existent');
    });

    it('should retrieve and deserialize JSON objects', () => {
      const testData = { foo: 'bar', nested: { value: 123 } };
      mockLocalStorage._getStore()['test-key'] = JSON.stringify(testData);

      const result = storage.getItem('test-key', { defaultValue: {} });

      expect(result).toEqual(testData);
    });

    it('should retrieve strings without deserialization when serialize is false', () => {
      mockLocalStorage._getStore()['test-key'] = 'plain-string';

      const result = storage.getItem('test-key', {
        defaultValue: '',
        serialize: false
      });

      expect(result).toBe('plain-string');
    });

    it('should use validation function to reject invalid data', () => {
      mockLocalStorage._getStore()['test-key'] = JSON.stringify({ invalid: true });

      const validate = (val: unknown): val is { valid: boolean } => {
        return typeof val === 'object' && val !== null && 'valid' in val;
      };

      const result = storage.getItem('test-key', {
        defaultValue: { valid: false },
        validate
      });

      expect(result).toEqual({ valid: false });
    });

    it('should use validation function to accept valid data', () => {
      const validData = { valid: true };
      mockLocalStorage._getStore()['test-key'] = JSON.stringify(validData);

      const validate = (val: unknown): val is { valid: boolean } => {
        return typeof val === 'object' && val !== null && 'valid' in val;
      };

      const result = storage.getItem('test-key', {
        defaultValue: { valid: false },
        validate
      });

      expect(result).toEqual(validData);
    });

    it('should handle corrupted JSON gracefully', () => {
      mockLocalStorage._getStore()['test-key'] = '{invalid-json}';

      const result = storage.getItem('test-key', { defaultValue: { fallback: true } });

      expect(result).toEqual({ fallback: true });
    });

    it('should return default value in SSR context (browser = false)', () => {
      mockBrowser = false;
      mockLocalStorage._getStore()['test-key'] = 'should-not-be-read';

      const result = storage.getItem('test-key', { defaultValue: 'ssr-default' });

      expect(result).toBe('ssr-default');
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
    });

    it('should auto-detect serialization for objects', () => {
      const testData = [1, 2, 3];
      mockLocalStorage._getStore()['test-key'] = JSON.stringify(testData);

      const result = storage.getItem('test-key', { defaultValue: [] });

      expect(result).toEqual(testData);
    });

    it('should handle empty strings correctly', () => {
      mockLocalStorage._getStore()['test-key'] = '';

      const result = storage.getItem('test-key', {
        defaultValue: 'default',
        serialize: false
      });

      expect(result).toBe('');
    });

    it('should handle arrays correctly', () => {
      const testArray = ['a', 'b', 'c'];
      mockLocalStorage._getStore()['test-key'] = JSON.stringify(testArray);

      const result = storage.getItem('test-key', { defaultValue: [] });

      expect(result).toEqual(testArray);
    });

    it('should handle nested objects correctly', () => {
      const testData = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };
      mockLocalStorage._getStore()['test-key'] = JSON.stringify(testData);

      const result = storage.getItem('test-key', { defaultValue: {} });

      expect(result).toEqual(testData);
    });

    it('should handle null values in stored data', () => {
      mockLocalStorage._getStore()['test-key'] = JSON.stringify({ value: null });

      const result = storage.getItem('test-key', { defaultValue: {} });

      expect(result).toEqual({ value: null });
    });

    it('should handle boolean values', () => {
      mockLocalStorage._getStore()['test-key'] = JSON.stringify(true);

      const result = storage.getItem('test-key', { defaultValue: false });

      expect(result).toBe(true);
    });

    it('should handle number values', () => {
      mockLocalStorage._getStore()['test-key'] = JSON.stringify(42);

      const result = storage.getItem('test-key', { defaultValue: 0 });

      expect(result).toBe(42);
    });
  });

  describe('setItem()', () => {
    it('should store objects with JSON serialization', () => {
      const testData = { foo: 'bar', num: 123 };

      const result = storage.setItem('test-key', testData);

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData)
      );
    });

    it('should store strings without serialization when serialize is false', () => {
      const result = storage.setItem('test-key', 'plain-string', { serialize: false });

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', 'plain-string');
    });

    it('should auto-detect serialization for objects', () => {
      const testData = { auto: 'detected' };

      storage.setItem('test-key', testData);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData)
      );
    });

    it('should handle quota exceeded errors', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError');
      });

      const result = storage.setItem('test-key', 'value');

      expect(result).toBe(false);
    });

    it('should return false in SSR context (browser = false)', () => {
      mockBrowser = false;

      const result = storage.setItem('test-key', 'value');

      expect(result).toBe(false);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle arrays correctly', () => {
      const testArray = [1, 2, 3];

      storage.setItem('test-key', testArray);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testArray)
      );
    });

    it('should handle nested objects', () => {
      const testData = {
        outer: {
          inner: {
            deep: 'value'
          }
        }
      };

      storage.setItem('test-key', testData);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData)
      );
    });

    it('should handle special characters in strings', () => {
      const specialString = 'Test\n\t"quotes"\\backslash';

      storage.setItem('test-key', specialString, { serialize: false });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', specialString);
    });

    it('should handle empty strings', () => {
      storage.setItem('test-key', '', { serialize: false });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', '');
    });

    it('should handle boolean values', () => {
      storage.setItem('test-key', true);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(true)
      );
    });

    it('should handle number values', () => {
      storage.setItem('test-key', 42);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(42)
      );
    });

    it('should handle null values', () => {
      storage.setItem('test-key', null);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(null)
      );
    });
  });

  describe('removeItem()', () => {
    it('should successfully remove items', () => {
      mockLocalStorage._getStore()['test-key'] = 'value';

      const result = storage.removeItem('test-key');

      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
      expect(mockLocalStorage._getStore()['test-key']).toBeUndefined();
    });

    it('should handle errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Remove error');
      });

      const result = storage.removeItem('test-key');

      expect(result).toBe(false);
    });

    it('should return false in SSR context (browser = false)', () => {
      mockBrowser = false;

      const result = storage.removeItem('test-key');

      expect(result).toBe(false);
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should handle removing non-existent keys', () => {
      const result = storage.removeItem('non-existent');

      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('clear()', () => {
    it('should successfully clear all items', () => {
      mockLocalStorage._getStore()['key1'] = 'value1';
      mockLocalStorage._getStore()['key2'] = 'value2';

      const result = storage.clear();

      expect(result).toBe(true);
      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(Object.keys(mockLocalStorage._getStore()).length).toBe(0);
    });

    it('should handle errors gracefully', () => {
      mockLocalStorage.clear.mockImplementationOnce(() => {
        throw new Error('Clear error');
      });

      const result = storage.clear();

      expect(result).toBe(false);
    });

    it('should return false in SSR context (browser = false)', () => {
      mockBrowser = false;

      const result = storage.clear();

      expect(result).toBe(false);
      expect(mockLocalStorage.clear).not.toHaveBeenCalled();
    });
  });

  describe('getAllKeys()', () => {
    it('should return all keys in localStorage', () => {
      mockLocalStorage._getStore()['key1'] = 'value1';
      mockLocalStorage._getStore()['key2'] = 'value2';
      mockLocalStorage._getStore()['key3'] = 'value3';

      const keys = storage.getAllKeys();

      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('should return empty array when no keys exist', () => {
      const keys = storage.getAllKeys();

      expect(keys).toEqual([]);
    });

    it('should handle errors gracefully', () => {
      // Add a key so length > 0
      mockLocalStorage._getStore()['test-key'] = 'value';

      // Mock localStorage.key to throw
      const originalKey = mockLocalStorage.key;
      mockLocalStorage.key = vi.fn(() => {
        throw new Error('Keys error');
      });

      const keys = storage.getAllKeys();

      expect(keys).toEqual([]);

      mockLocalStorage.key = originalKey;
    });

    it('should return empty array in SSR context (browser = false)', () => {
      mockBrowser = false;
      mockLocalStorage._getStore()['key1'] = 'value1';

      const keys = storage.getAllKeys();

      expect(keys).toEqual([]);
    });
  });

  describe('isAvailable()', () => {
    it('should return true when localStorage is available', () => {
      const result = storage.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false in SSR context (browser = false)', () => {
      mockBrowser = false;

      const result = storage.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false when localStorage throws errors', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Not available');
      });

      const result = storage.isAvailable();

      expect(result).toBe(false);
    });

    it('should clean up test key after checking availability', () => {
      storage.isAvailable();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('__localStorage_test__', 'test');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__localStorage_test__');
    });
  });

  describe('Integration Tests', () => {
    it('should handle full lifecycle: set, get, remove', () => {
      const testData = { lifecycle: 'test', value: 123 };

      // Set
      const setResult = storage.setItem('lifecycle-key', testData);
      expect(setResult).toBe(true);

      // Get
      const getData = storage.getItem('lifecycle-key', { defaultValue: {} });
      expect(getData).toEqual(testData);

      // Remove
      const removeResult = storage.removeItem('lifecycle-key');
      expect(removeResult).toBe(true);

      // Verify removed
      const afterRemove = storage.getItem('lifecycle-key', { defaultValue: null });
      expect(afterRemove).toBe(null);
    });

    it('should handle multiple keys independently', () => {
      storage.setItem('key1', { value: 1 });
      storage.setItem('key2', { value: 2 });
      storage.setItem('key3', { value: 3 });

      expect(storage.getItem('key1', { defaultValue: {} })).toEqual({ value: 1 });
      expect(storage.getItem('key2', { defaultValue: {} })).toEqual({ value: 2 });
      expect(storage.getItem('key3', { defaultValue: {} })).toEqual({ value: 3 });

      const keys = storage.getAllKeys();
      expect(keys.length).toBe(3);
    });

    it('should handle overwriting existing keys', () => {
      storage.setItem('overwrite', 'original');
      expect(storage.getItem('overwrite', { defaultValue: '', serialize: false })).toBe('original');

      storage.setItem('overwrite', 'updated');
      expect(storage.getItem('overwrite', { defaultValue: '', serialize: false })).toBe('updated');
    });

    it('should maintain type safety with validation', () => {
      type UserData = { name: string; age: number };

      const validate = (val: unknown): val is UserData => {
        return (
          typeof val === 'object' &&
          val !== null &&
          'name' in val &&
          'age' in val &&
          typeof (val as UserData).name === 'string' &&
          typeof (val as UserData).age === 'number'
        );
      };

      const validUser: UserData = { name: 'Alice', age: 30 };
      storage.setItem('user', validUser);

      const retrieved = storage.getItem('user', {
        defaultValue: { name: '', age: 0 },
        validate
      });

      expect(retrieved).toEqual(validUser);

      // Test invalid data
      mockLocalStorage._getStore()['user'] = JSON.stringify({ name: 'Bob' }); // Missing age

      const invalidRetrieve = storage.getItem('user', {
        defaultValue: { name: 'Default', age: 0 },
        validate
      });

      expect(invalidRetrieve).toEqual({ name: 'Default', age: 0 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large objects', () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `value-${i}`,
          nested: { deep: { deeper: i } }
        }))
      };

      const setResult = storage.setItem('large-object', largeObject);
      expect(setResult).toBe(true);

      const retrieved = storage.getItem('large-object', { defaultValue: {} });
      expect(retrieved).toEqual(largeObject);
    });

    it('should handle Unicode characters', () => {
      const unicodeData = {
        emoji: '🚀🎉💻',
        chinese: '你好世界',
        arabic: 'مرحبا بالعالم',
        special: '§±!@#$%^&*()'
      };

      storage.setItem('unicode', unicodeData);
      const retrieved = storage.getItem('unicode', { defaultValue: {} });

      expect(retrieved).toEqual(unicodeData);
    });

    it('should handle keys with special characters', () => {
      const specialKey = 'key-with-special_chars.123:test';

      storage.setItem(specialKey, 'value');
      const retrieved = storage.getItem(specialKey, { defaultValue: '', serialize: false });

      expect(retrieved).toBe('value');
    });

    it('should handle empty objects', () => {
      storage.setItem('empty-object', {});
      const retrieved = storage.getItem('empty-object', { defaultValue: null });

      expect(retrieved).toEqual({});
    });

    it('should handle empty arrays', () => {
      storage.setItem('empty-array', []);
      const retrieved = storage.getItem('empty-array', { defaultValue: null });

      expect(retrieved).toEqual([]);
    });

    it('should handle date objects (which get stringified)', () => {
      const date = new Date('2024-01-01');
      storage.setItem('date', date);

      const retrieved = storage.getItem('date', { defaultValue: null });
      // Date gets converted to string in JSON
      expect(retrieved).toBe(date.toJSON());
    });
  });

  describe('Error Recovery', () => {
    it('should recover from one-time localStorage failures', () => {
      // First call fails
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Temporary failure');
      });

      const firstResult = storage.setItem('test', 'value');
      expect(firstResult).toBe(false);

      // Second call succeeds
      const secondResult = storage.setItem('test', 'value');
      expect(secondResult).toBe(true);
    });

    it('should maintain state after errors', () => {
      storage.setItem('key1', 'value1');

      // Cause error on key2
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Error');
      });
      storage.setItem('key2', 'value2');

      // key1 should still be retrievable
      const retrieved = storage.getItem('key1', { defaultValue: '', serialize: false });
      expect(retrieved).toBe('value1');
    });
  });
});
