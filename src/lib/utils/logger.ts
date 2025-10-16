/**
 * Environment-aware logging utility for error tracks while debugging
 * Used when in dev mode, to outputs error logs + context to the terminal
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Safely get environment variables without breaking tests
 */
function getEnv(): { browser: boolean; dev: boolean } {
  // Check if we're in a test environment (vitest sets NODE_ENV or VITEST)
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST)) {
    return { browser: false, dev: true };
  }

  // In normal app execution, these imports work fine
  try {
    // Dynamic import to avoid breaking tests that don't mock $app/environment
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const env = require('$app/environment');
    return { browser: env.browser, dev: env.dev };
  } catch {
    // Fallback for edge cases
    return { browser: false, dev: true };
  }
}

/**
 * Get the configured log level from environment variables
 * Defaults to 'debug' in dev, 'warn' in production
 */
function getLogLevel(): LogLevel {
  const { browser, dev } = getEnv();

  if (!browser) {
    // Server-side: check Node env vars
    const level = (typeof process !== 'undefined' ? process.env.VITE_LOG_LEVEL : undefined) as LogLevel;
    return level && level in LOG_LEVELS ? level : dev ? 'debug' : 'warn';
  }
  // Client-side: check Vite-exposed env vars
  const level = (typeof import.meta !== 'undefined' ? import.meta.env.VITE_LOG_LEVEL : undefined) as LogLevel;
  return level && level in LOG_LEVELS ? level : dev ? 'debug' : 'warn';
}

let currentLevel: LogLevel | null = null;

/* Check if a log level should be output */
function shouldLog(level: LogLevel): boolean {
  if (!currentLevel) {
    currentLevel = getLogLevel();
  }
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/* Color schemes for different log levels (i like pretty colorz) */
const LOG_STYLES = {
  debug: {
    badge: 'background:#6366f1;color:#fff;padding:0.1rem 0.25rem;border-radius:4px;font-weight:600',
    text: 'font-size:11px;color:#818cf8',
  },
  info: {
    badge: 'background:#3b82f6;color:#fff;padding:0.1rem 0.25rem;border-radius:4px;font-weight:600',
    text: 'font-size:11px;color:#60a5fa',
  },
  warn: {
    badge: 'background:#f59e0b;color:#fff;padding:0.1rem 0.25rem;border-radius:4px;font-weight:600',
    text: 'font-size:11px;color:#fbbf24',
  },
  error: {
    badge: 'background:#ef4444;color:#fff;padding:0.1rem 0.25rem;border-radius:4px;font-weight:600',
    text: 'font-size:11px;color:#f87171',
  },
};

/* Format timestamp for display */
function formatTimestamp(): string {
  const d = new Date();
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `at ${time} on ${date}`;
}

/* Print styled log to console with grouping */
function printStyled(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error | unknown,
): void {
  const styles = LOG_STYLES[level];
  const timestamp = formatTimestamp();
  const location = context?.component || context?.url || 'application';

  // Create grouped, collapsible console output
  console.groupCollapsed(`%c${level.toUpperCase()}`, styles.badge, `${message}`);

  // Show error details if available
  if (error) {
    if (error instanceof Error) {
      console.error(error);
    } else {
      console.log(error);
    }
  }

  // Show context if available
  if (context && Object.keys(context).length > 0) {
    console.log('%cContext:', 'font-weight:600;color:#888', context);
  }

  // Show timestamp and location
  console.log(`%cLogged ${timestamp} in ${location}`, styles.text);

  console.groupEnd();
}

/* Generic log handler - handles browser vs server logic */
function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error | unknown): void {
  if (!shouldLog(level)) return;

  const { browser } = getEnv();

  if (browser) {
    printStyled(level, message, context, error);
  } else {
    const consoleMethod = console[level];
    const errorContext =
      error instanceof Error ? { ...context, errorName: error.name, errorMessage: error.message } : context;

    consoleMethod(message, errorContext || '');

    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

/* Logger utility with environment-aware log levels */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) =>
    log('error', message, context, error),
  getLevel: () => currentLevel || getLogLevel(),
};
