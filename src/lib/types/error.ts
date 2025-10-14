/**
 * Custom error types and interfaces for the application
 */

export type ErrorLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ErrorContext {
  url?: string;
  userAgent?: string;
  timestamp?: number;
  userId?: string;
  action?: string;
  component?: string;
  [key: string]: unknown;
}

export interface ErrorTransport {
  send(error: SerializedError): void | Promise<void>;
}

export interface SerializedError {
  id: string;
  name: string;
  message: string;
  userMessage?: string;
  stack?: string;
  level: ErrorLevel;
  context: ErrorContext;
  timestamp: number;
}

/**
 * Application-specific error class with user-safe messages
 */
export class AppError extends Error {
  public readonly userMessage: string;
  public readonly level: ErrorLevel;
  public readonly context: ErrorContext;
  public readonly timestamp: number;

  constructor(message: string, userMessage?: string, level: ErrorLevel = 'error', context: ErrorContext = {}) {
    super(message);
    this.name = 'AppError';
    this.userMessage = userMessage || 'An unexpected error occurred';
    this.level = level;
    this.context = context;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Serialize error for transport
   */
  toJSON(): SerializedError {
    return {
      id: this.generateId(),
      name: this.name,
      message: this.message,
      userMessage: this.userMessage,
      stack: this.stack,
      level: this.level,
      context: this.context,
      timestamp: this.timestamp,
    };
  }

  /**
   * Generate a unique ID for this error instance
   */
  private generateId(): string {
    return `${this.name}-${this.timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Domain-specific error classes
 */
export class NetworkError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'Network request failed. Please check your connection and try again.', 'error', context);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, userMessage?: string, context: ErrorContext = {}) {
    super(message, userMessage || 'Invalid input provided', 'warn', context);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'Configuration error occurred', 'error', context);
    this.name = 'ConfigurationError';
  }
}
