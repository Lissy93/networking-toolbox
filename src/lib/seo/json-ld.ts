/**
 * JSON-LD utility functions for safely rendering structured data
 */

/**
 * Safely convert schema object to JSON-LD script tag
 * Escapes special characters to prevent XSS
 */
export function schemaToJsonLd(schema: unknown, nonce?: string): string {
  if (!schema) return '';

  try {
    const json = JSON.stringify(schema)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/-->/g, '--\\u003e')
      .replace(/\//g, '\\/');

    const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
    return `<script type="application/ld+json"${nonceAttr}>${json}</script>`;
  } catch (error) {
    console.error('Error generating JSON-LD tag:', error);
    return '';
  }
}
