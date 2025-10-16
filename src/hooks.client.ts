/**
 * Client-side hooks for error handling
 */

import type { HandleClientError } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { errorManager } from '$lib/utils/error-manager';

/**
 * Handle client-side errors from SvelteKit
 */
export const handleError: HandleClientError = ({ error, event, status, message }) => {
  // Extract context
  const context = {
    url: event.url.pathname,
    status,
    component: 'SvelteKit',
  };

  // Capture error
  const errorId = errorManager.captureException(error, 'error', context);

  // Return safe message
  return {
    message: dev ? message : 'An unexpected error occurred',
    errorId: errorId || undefined,
  };
};

/**
 * Set up global error listeners for unhandled errors
 */
if (typeof window !== 'undefined') {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const context = {
      url: window.location.pathname,
      component: 'GlobalErrorHandler',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    };

    errorManager.captureException(event.error || new Error(event.message), 'error', context);

    // Prevent default browser error handling in dev for better DX
    if (dev) {
      event.preventDefault();
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const context = {
      url: window.location.pathname,
      component: 'GlobalErrorHandler',
      promise: true,
    };

    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(typeof event.reason === 'string' ? event.reason : 'Unhandled promise rejection');

    errorManager.captureException(error, 'error', context);

    // Prevent default browser handling in dev
    if (dev) {
      event.preventDefault();
    }
  });
}
