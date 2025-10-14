import { browser } from '$app/environment';
import { logger } from './logger';

/**
 * Safe, robust localStorage helper
 * Handles SSR, errors, validation, and serialization automatically
 */

interface StorageOptions<T> {
  /** Default value if storage is empty or fails */
  defaultValue: T;
  /** Optional validation function */
  validate?: (value: unknown) => value is T;
  /** Whether to serialize/deserialize as JSON (default: true for objects, false for strings) */
  serialize?: boolean;
}

class LocalStorageHelper {
  /**
   * Get item from localStorage with error handling
   */
  getItem<T>(key: string, options: StorageOptions<T>): T {
    const { defaultValue, validate, serialize = typeof defaultValue !== 'string' } = options;

    if (!browser) return defaultValue;

    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;

      const parsed = serialize ? JSON.parse(raw) : raw;

      // Validate if validation function provided
      if (validate && !validate(parsed)) {
        logger.warn(`Invalid data in localStorage key "${key}", using default`, { key });
        return defaultValue;
      }

      return parsed as T;
    } catch (error) {
      logger.error(`Failed to get localStorage key "${key}"`, error, { key });
      return defaultValue;
    }
  }

  /**
   * Set item in localStorage with error handling
   */
  setItem<T>(key: string, value: T, options?: { serialize?: boolean }): boolean {
    const serialize = options?.serialize ?? typeof value !== 'string';

    if (!browser) return false;

    try {
      const data = serialize ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, data);
      return true;
    } catch (error) {
      logger.error(`Failed to set localStorage key "${key}"`, error, { key });
      return false;
    }
  }

  /**
   * Remove item from localStorage with error handling
   */
  removeItem(key: string): boolean {
    if (!browser) return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error(`Failed to remove localStorage key "${key}"`, error, { key });
      return false;
    }
  }

  /**
   * Check if localStorage is available and working
   */
  isAvailable(): boolean {
    if (!browser) return false;

    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all items from localStorage (use with caution!)
   */
  clear(): boolean {
    if (!browser) return false;

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logger.error('Failed to clear localStorage', error);
      return false;
    }
  }

  /**
   * Get all keys from localStorage
   */
  getAllKeys(): string[] {
    if (!browser) return [];

    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      logger.error('Failed to get localStorage keys', error);
      return [];
    }
  }
}

// Export singleton instance
export const storage = new LocalStorageHelper();
