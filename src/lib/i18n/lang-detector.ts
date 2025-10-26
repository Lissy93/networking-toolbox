/**
 * Language Detection
 * Determines user's preferred language with fallback chain:
 * 1. localStorage preference
 * 2. URL path (/de/...)
 * 3. Browser navigator.language
 * 4. Default (en)
 */

import { browser } from '$app/environment';
import { DEFAULT_LANGUAGE, isSupported, getBrowserLanguage } from './supported-languages';

const STORAGE_KEY = 'ntb-language';

/**
 * Detect language from URL path
 * /de/settings → 'de'
 * /settings → null
 */
export function detectLanguageFromURL(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const firstSegment = segments[0];
    if (firstSegment && isSupported(firstSegment)) {
      return firstSegment;
    }
  }
  return null;
}

/**
 * Get language from localStorage
 */
export function getStoredLanguage(): string | null {
  if (!browser) return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isSupported(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error);
  }
  return null;
}

/**
 * Save language to localStorage
 */
export function setStoredLanguage(lang: string): void {
  if (!browser) return;
  try {
    if (isSupported(lang)) {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error);
  }
}

/**
 * Detect user's preferred language
 * Priority: localStorage > URL > navigator > default
 */
export function detectLanguage(pathname?: string): string {
  // 1. Check localStorage
  const stored = getStoredLanguage();
  if (stored) {
    return stored;
  }

  // 2. Check URL path
  if (pathname) {
    const urlLang = detectLanguageFromURL(pathname);
    if (urlLang) {
      return urlLang;
    }
  }

  // 3. Check browser language
  const browserLang = getBrowserLanguage();
  if (browserLang !== DEFAULT_LANGUAGE) {
    return browserLang;
  }

  // 4. Default fallback
  return DEFAULT_LANGUAGE;
}

/**
 * Get the base path (without language prefix)
 * /de/settings → /settings
 * /settings → /settings
 */
export function getBasePath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && segments[0] && isSupported(segments[0])) {
    return '/' + segments.slice(1).join('/');
  }
  return pathname;
}

/**
 * Build path with language prefix
 * ('de', '/settings') → '/de/settings'
 * ('en', '/settings') → '/settings' (English has no prefix)
 */
export function buildLocalizedPath(lang: string, path: string): string {
  // English doesn't use prefix
  if (lang === DEFAULT_LANGUAGE) {
    return getBasePath(path);
  }

  // Remove existing language prefix if present
  const basePath = getBasePath(path);

  // Add language prefix
  return `/${lang}${basePath}`;
}
