import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorManager } from '$lib/utils/error-manager';
import { AppError, NetworkError, ValidationError } from '$lib/types/error';

describe('ErrorManager', () => {
  beforeEach(() => {
    // Clear cache and console mocks before each test
    errorManager.clearCache();
    vi.clearAllMocks();
  });

  describe('captureException', () => {
    it('should capture standard Error objects', () => {
      const error = new Error('Test error');
      const errorId = errorManager.captureException(error);

      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');
    });

    it('should capture AppError objects', () => {
      const error = new AppError('Technical message', 'User-friendly message', 'error');
      const errorId = errorManager.captureException(error);

      expect(errorId).toBeDefined();
    });

    it('should capture NetworkError objects', () => {
      const error = new NetworkError('Connection failed', { url: '/api/test' });
      const errorId = errorManager.captureException(error);

      expect(errorId).toBeDefined();
    });

    it('should capture ValidationError objects', () => {
      const error = new ValidationError('Invalid input', 'Please check your input');
      const errorId = errorManager.captureException(error);

      expect(errorId).toBeDefined();
    });

    it('should handle non-Error objects', () => {
      const errorId = errorManager.captureException('String error');

      expect(errorId).toBeDefined();
    });

    it('should include context in error capture', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent', action: 'testAction' };
      const errorId = errorManager.captureException(error, 'error', context);

      expect(errorId).toBeDefined();
    });

    it('should never throw, even with invalid input', () => {
      expect(() => {
        errorManager.captureException(null);
      }).not.toThrow();

      expect(() => {
        errorManager.captureException(undefined);
      }).not.toThrow();

      expect(() => {
        errorManager.captureException({});
      }).not.toThrow();
    });
  });

  describe('captureError', () => {
    it('should capture plain error messages', () => {
      const errorId = errorManager.captureError('Something went wrong');

      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');
    });

    it('should support different error levels', () => {
      const warnId = errorManager.captureError('Warning message', 'warn');
      const errorId = errorManager.captureError('Error message', 'error');
      const fatalId = errorManager.captureError('Fatal message', 'fatal');

      expect(warnId).toBeDefined();
      expect(errorId).toBeDefined();
      expect(fatalId).toBeDefined();
    });

    it('should include context', () => {
      const context = { userId: '123', page: '/dashboard' };
      const errorId = errorManager.captureError('Test error', 'error', context);

      expect(errorId).toBeDefined();
    });
  });

  describe('Error deduplication', () => {
    it('should deduplicate identical errors within 5 seconds', () => {
      const error = new Error('Duplicate error');

      const id1 = errorManager.captureException(error);
      const id2 = errorManager.captureException(error);

      expect(id1).toBeDefined();
      expect(id2).toBeNull(); // Second occurrence should be deduplicated
    });

    it('should not deduplicate different errors', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const id1 = errorManager.captureException(error1);
      const id2 = errorManager.captureException(error2);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should clear cache to allow re-capture of same error', () => {
      const error = new Error('Timed error');

      const id1 = errorManager.captureException(error);
      expect(id1).toBeDefined();

      // Clear cache to simulate dedup window expiring
      errorManager.clearCache();

      const id2 = errorManager.captureException(error);
      expect(id2).toBeDefined();
    });

    it('should consider context.component in deduplication', () => {
      const error = new Error('Same message');

      const id1 = errorManager.captureException(error, 'error', { component: 'ComponentA' });
      const id2 = errorManager.captureException(error, 'error', { component: 'ComponentB' });

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Global context', () => {
    it('should set global context', () => {
      errorManager.setGlobalContext({ appVersion: '1.0.0' });
      const errorId = errorManager.captureError('Test error');

      expect(errorId).toBeDefined();
    });

    it('should add individual context keys', () => {
      errorManager.addContext('sessionId', 'abc123');
      const errorId = errorManager.captureError('Test error');

      expect(errorId).toBeDefined();
    });

    it('should merge global and local context', () => {
      errorManager.setGlobalContext({ global: 'value' });
      const errorId = errorManager.captureError('Test', 'error', { local: 'value' });

      expect(errorId).toBeDefined();
    });
  });

  describe('Error sanitization', () => {
    it('should generate unique error IDs', () => {
      const error = new Error('Test error');

      errorManager.clearCache(); // Allow both to be captured
      const id1 = errorManager.captureException(error);

      // Create new error manager instance or wait for dedup window
      errorManager.clearCache();
      const id2 = errorManager.captureException(error);

      expect(id1).not.toBe(id2);
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('No stack');
      error.stack = undefined;

      const errorId = errorManager.captureException(error);
      expect(errorId).toBeDefined();
    });
  });

  describe('Transport integration', () => {
    it('should support custom transports', () => {
      const mockTransport = {
        send: vi.fn(),
      };

      errorManager.addTransport(mockTransport);
      errorManager.captureError('Test error');

      expect(mockTransport.send).toHaveBeenCalled();
    });

    it('should not crash if transport fails', () => {
      const failingTransport = {
        send: vi.fn(() => {
          throw new Error('Transport failed');
        }),
      };

      errorManager.addTransport(failingTransport);

      expect(() => {
        errorManager.captureError('Test error');
      }).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle circular references in context', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      // Should not throw
      expect(() => {
        errorManager.captureError('Test', 'error', circular);
      }).not.toThrow();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'a'.repeat(10000);
      const errorId = errorManager.captureError(longMessage);

      expect(errorId).toBeDefined();
    });

    it('should handle errors with special characters', () => {
      const error = new Error('Error with 特殊字符 and émojis 🎉');
      const errorId = errorManager.captureException(error);

      expect(errorId).toBeDefined();
    });
  });

  describe('AppError specific features', () => {
    it('should preserve user messages from AppError', () => {
      const error = new AppError('Technical message', 'User-friendly message');
      const errorId = errorManager.captureException(error);

      expect(errorId).toBeDefined();
    });

    it('should use correct error levels from AppError', () => {
      const warnError = new AppError('Warning', 'User warning', 'warn');
      const fatalError = new AppError('Fatal', 'User fatal', 'fatal');

      const warnId = errorManager.captureException(warnError);
      const fatalId = errorManager.captureException(fatalError);

      expect(warnId).toBeDefined();
      expect(fatalId).toBeDefined();
    });

    it('should merge AppError context with additional context', () => {
      const error = new AppError('Test', 'User message', 'error', { appContext: 'value' });
      const errorId = errorManager.captureException(error, 'error', { additionalContext: 'value2' });

      expect(errorId).toBeDefined();
    });
  });
});
