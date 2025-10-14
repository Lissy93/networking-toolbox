/**
 * Server-side hooks for error handling and request processing
 */

import type { HandleServerError } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { errorManager } from '$lib/utils/error-manager';

/**
 * Handle server-side errors
 * Called when an error is thrown during server-side rendering or in API routes
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
  // Extract request context
  const context = {
    url: event.url.pathname,
    method: event.request.method,
    userAgent: event.request.headers.get('user-agent') || undefined,
    status,
  };

  // Capture error with context
  const errorId = errorManager.captureException(error, 'error', context);

  // Return safe error message to client
  // In dev: return actual message, in prod: return generic message
  return {
    message: dev ? message : 'An unexpected error occurred 😵',
    errorId: errorId || undefined,
  };
};
