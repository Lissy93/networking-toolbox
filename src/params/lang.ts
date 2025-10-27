/**
 * Route Parameter Matcher for Language Codes
 * Validates language codes in routes like /[lang=lang]/settings
 */

import { LANGUAGE_CODES, DEFAULT_LANGUAGE } from '$lib/i18n/supported-languages';

/**
 * Match function for SvelteKit parameter matching
 * Only matches non-English language codes (English has no prefix)
 */
export function match(param: string): boolean {
  // English doesn't use URL prefix
  if (param === DEFAULT_LANGUAGE) {
    return false;
  }

  // Check if it's a supported language
  return LANGUAGE_CODES.includes(param);
}
