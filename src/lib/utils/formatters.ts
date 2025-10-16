/**
 * Shared formatting utilities for consistent display across the application
 */

/**
 * Format bytes into human-readable format (B, KB, MB, GB)
 * @param bytes - Number of bytes to format
 * @returns Formatted string with appropriate unit
 * @example formatBytes(1536) // "1.5 KB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format numbers with locale-specific thousand separators
 * @param num - Number to format
 * @returns Formatted number string
 * @example formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Get CSS class name based on HTTP status code
 * @param status - HTTP status code
 * @returns CSS class name ('success', 'warning', 'error', or empty string)
 * @example getStatusClass(200) // "success"
 */
export function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'warning';
  if (status >= 400) return 'error';
  return '';
}

/**
 * Format milliseconds into human-readable format
 * @param ms - Milliseconds to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted time string
 * @example formatMilliseconds(1234) // "1234ms"
 * @example formatMilliseconds(1234, 1) // "1234.0ms"
 */
export function formatMilliseconds(ms: number, decimals: number = 0): string {
  return `${ms.toFixed(decimals)}ms`;
}

/**
 * Format percentage with specified decimal places
 * @param value - Value to format as percentage
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 * @example formatPercentage(0.75) // "75%"
 * @example formatPercentage(0.7567, 2) // "75.67%"
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
