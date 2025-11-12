/**
 * Static translations loader for page-specific content
 * This ensures translations are available at build time for SSR
 */

import { i18n } from './index';

// Import page translations statically
import ipv6NotationEn from './translations/en/pages/ipv6-notation.json';

/**
 * Load page translations for a given locale
 * This function is designed to be called during SSR/SSG
 */
export function loadPageTranslations(locale: string = 'en') {
  // For now, we only support English, but this can be extended
  if (locale === 'en' || !locale) {
    i18n.addNamespace('en', 'ipv6Notation', ipv6NotationEn);
  }

  // Set the locale
  i18n.setLocale(locale);
}

/**
 * Ensure translations are loaded
 */
export function ensurePageTranslations(locale: string = 'en') {
  // Check if translations are already loaded
  if (!i18n.has('ipv6Notation.title', locale)) {
    loadPageTranslations(locale);
  }
}
