/**
 * Centralized error management with deduplication and transport support
 */

import { browser, dev } from '$app/environment';
import { logger } from './logger';
import type { ErrorContext, ErrorLevel, ErrorTransport, SerializedError } from '$lib/types/error';
import { AppError } from '$lib/types/error';

interface ErrorHash {
  hash: string;
  timestamp: number;
}

/**
 * Console transport for error reporting
 */
class ConsoleTransport implements ErrorTransport {
  send(error: SerializedError): void {
    const logLevel = error.level === 'fatal' || error.level === 'error' ? 'error' : error.level;
    logger[logLevel](`[${error.name}] ${error.message}`, error.context);
  }
}

/**
 * ErrorManager class for centralized error handling
 */
class ErrorManager {
  private transports: ErrorTransport[] = [];
  private errorCache: Map<string, ErrorHash> = new Map();
  private dedupWindow = 5000; // 5 seconds
  private globalContext: ErrorContext = {};

  constructor() {
    // Add console transport by default
    this.addTransport(new ConsoleTransport());
  }

  /**
   * Add a transport for error reporting
   */
  addTransport(transport: ErrorTransport): void {
    this.transports.push(transport);
  }

  /**
   * Set global context that will be included with all errors
   */
  setGlobalContext(context: ErrorContext): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * Add context that will be included with all errors
   */
  addContext(key: string, value: unknown): void {
    this.globalContext[key] = value;
  }

  /**
   * Capture an Error object or AppError
   */
  captureException(
    error: Error | AppError | unknown,
    level: ErrorLevel = 'error',
    context: ErrorContext = {},
  ): string | null {
    try {
      const serialized = this.serializeError(error, level, context);
      return this.processError(serialized);
    } catch (err) {
      // Failsafe: never let error handler crash
      console.error('Error in error handler:', err);
      return null;
    }
  }

  /**
   * Capture a plain error message
   */
  captureError(message: string, level: ErrorLevel = 'error', context: ErrorContext = {}): string | null {
    try {
      const error = new AppError(message, undefined, level, context);
      const serialized = this.serializeError(error, level, context);
      return this.processError(serialized);
    } catch (err) {
      console.error('Error in error handler:', err);
      return null;
    }
  }

  /**
   * Serialize an error for transport
   */
  private serializeError(error: Error | AppError | unknown, level: ErrorLevel, context: ErrorContext): SerializedError {
    const timestamp = Date.now();
    const mergedContext = { ...this.globalContext, ...context, timestamp };

    if (error instanceof AppError) {
      return {
        ...error.toJSON(),
        context: { ...error.context, ...mergedContext },
      };
    }

    if (error instanceof Error) {
      return {
        id: this.generateErrorId(error.name, timestamp),
        name: error.name,
        message: error.message,
        userMessage: 'An unexpected error occurred',
        stack: this.sanitizeStack(error.stack),
        level,
        context: mergedContext,
        timestamp,
      };
    }

    // Handle non-Error objects
    const message = typeof error === 'string' ? error : 'Unknown error';
    return {
      id: this.generateErrorId('UnknownError', timestamp),
      name: 'UnknownError',
      message,
      userMessage: 'An unexpected error occurred',
      level,
      context: mergedContext,
      timestamp,
    };
  }

  /**
   * Process error with deduplication and transport
   */
  private processError(error: SerializedError): string | null {
    const hash = this.hashError(error);

    // Check for duplicates. And only log in non-test environments
    if (this.isDuplicate(hash)) {
      const isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST);
      if (!isTest) {
        logger.debug(`Duplicate error suppressed: ${error.name}`);
      }
      return null;
    }

    // Store error hash for deduplication
    this.errorCache.set(hash, { hash, timestamp: Date.now() });

    // Clean up old cache entries
    this.cleanupCache();

    // Send to all transports
    this.transports.forEach((transport) => {
      try {
        transport.send(error);
      } catch (err) {
        console.error('Transport failed:', err);
      }
    });

    return error.id;
  }

  /**
   * Generate a hash for error deduplication
   */
  private hashError(error: SerializedError): string {
    const key = `${error.name}:${error.message}:${error.context.component || ''}`;
    return this.simpleHash(key);
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if error is a duplicate within the dedup window
   */
  private isDuplicate(hash: string): boolean {
    const cached = this.errorCache.get(hash);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < this.dedupWindow;
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [hash, entry] of this.errorCache.entries()) {
      if (now - entry.timestamp > this.dedupWindow) {
        this.errorCache.delete(hash);
      }
    }
  }

  /**
   * Sanitize stack trace (limit in production)
   */
  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    if (dev) return stack;

    // In production, limit stack trace to first 3 lines
    const lines = stack.split('\n').slice(0, 3);
    return lines.join('\n');
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(name: string, timestamp: number): string {
    return `${name}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all error cache (useful for testing)
   */
  clearCache(): void {
    this.errorCache.clear();
  }
}

// Singleton instance
export const errorManager = new ErrorManager();

// Set initial global context
if (browser) {
  errorManager.setGlobalContext({
    userAgent: navigator.userAgent,
    url: window.location.href,
  });
}
