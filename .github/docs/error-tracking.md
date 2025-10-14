# Error Tracking and Handling

This app has a global error handling system that automatically catches and logs errors across both server and client side.

## How It Works

All errors are automatically captured by SvelteKit hooks and global listeners. You don't need to wrap everything in try-catch blocks.

**Key Files:**

- [`src/lib/types/error.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/src/lib/types/error.ts) - Error types and custom error classes
- [`src/lib/utils/logger.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/src/lib/utils/logger.ts) - Environment-aware logger with styled console output
- [`src/lib/utils/error-manager.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/src/lib/utils/error-manager.ts) - Central error management with deduplication
- [`src/hooks.server.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/src/hooks.server.ts) - Server-side error hook
- [`src/hooks.client.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/src/hooks.client.ts) - Client-side error hook with global listeners
- [`src/routes/+error.svelte`](https://github.com/Lissy93/networking-toolbox/blob/main/src/routes/+error.svelte) - Error page UI

**What Gets Caught Automatically:**

- Server errors (API routes, server load functions)
- Client errors (component errors, runtime errors)
- Unhandled promise rejections
- Window errors (global `window.onerror`)

## For Developers

### Most of the time: Do nothing

The hooks catch everything. Just write your code normally.

### When you want custom context

Use the error manager to add specific context for debugging:

```typescript
import { errorManager } from '$lib/utils/error-manager';

try {
  await saveUserData(data);
} catch (error) {
  errorManager.captureException(error, 'error', {
    component: 'UserSettings',
    action: 'saveData',
    dataSize: data.length
  });
  throw error; // Re-throw so user sees it
}
```

### Custom error types

Use `AppError` for domain-specific errors with user-friendly messages:

```typescript
import { AppError, NetworkError, ValidationError } from '$lib/types/error';

// Generic app error
throw new AppError('Database query failed', 'Unable to save your changes');

// Specific error types
throw new NetworkError('Connection timeout');
throw new ValidationError('Invalid email format', 'Please enter a valid email');
```

### Logging

Use the logger instead of `console.log`:

```typescript
import { logger } from '$lib/utils/logger';

logger.debug('Cache hit', { key, size });
logger.info('User action completed', { action: 'export', format: 'csv' });
logger.warn('Rate limit approaching', { requests: 95, limit: 100 });
logger.error('Operation failed', error, { component: 'DataExporter' });
```

The logger automatically adjusts based on environment (more verbose in dev, quieter in prod) and provides styled, collapsible output in the browser.

## Configuration

Set the log level via environment variable:

```bash
VITE_LOG_LEVEL=debug  # Options: debug, info, warn, error
```

Defaults to `debug` in development, `warn` in production.

## Expanding with External Services

The error manager uses a transport pattern, making it easy to add services like Sentry or GlitchTip.

### Adding Sentry

1. Install Sentry:
```bash
npm install @sentry/sveltekit
```

2. Create a Sentry transport in [`src/lib/utils/error-manager.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/src/lib/utils/error-manager.ts):

```typescript
import * as Sentry from '@sentry/sveltekit';

class SentryTransport implements ErrorTransport {
  send(error: SerializedError): void {
    Sentry.captureException(new Error(error.message), {
      level: error.level,
      tags: { component: error.context.component },
      extra: error.context,
    });
  }
}

// Add to error manager
if (import.meta.env.VITE_SENTRY_DSN) {
  errorManager.addTransport(new SentryTransport());
}
```

3. Initialize Sentry in your hooks:

```typescript
// src/hooks.client.ts
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

### Adding GlitchTip

GlitchTip is Sentry-compatible, so use the same approach with a different DSN.

### Custom Transport

Create any transport that implements the `ErrorTransport` interface:

```typescript
class CustomTransport implements ErrorTransport {
  async send(error: SerializedError): Promise<void> {
    await fetch('/api/log-error', {
      method: 'POST',
      body: JSON.stringify(error),
    });
  }
}

errorManager.addTransport(new CustomTransport());
```

## Error Deduplication

The error manager automatically deduplicates identical errors within a 5-second window. This prevents log spam when an error repeats rapidly.

## Testing

See [`tests/unit/utils/error-manager.test.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/tests/unit/utils/error-manager.test.ts) for examples of testing error handling in your code.
