/**
 * Lightweight i18n System
 * Handles translation loading, interpolation, and fallback
 */

import { DEFAULT_LANGUAGE } from './supported-languages';

type TranslationObject = Record<string, any>;
type InterpolationParams = Record<string, string | number>;

/**
 * Simple string interpolation
 * "Hello {name}" + { name: "World" } → "Hello World"
 */
function interpolate(template: string, params: InterpolationParams): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Deep get value from nested object by dot-notation key
 * get({ foo: { bar: 'baz' } }, 'foo.bar') → 'baz'
 * Protected against prototype pollution
 */
function getNestedValue(obj: TranslationObject, key: string): any {
  const keys = key.split('.');
  let result: any = obj;

  for (const k of keys) {
    // Prevent prototype pollution
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      return undefined;
    }

    if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, k)) {
      // Safe property access - already validated against prototype pollution above
      // and using hasOwnProperty to ensure property exists on object itself
      result = Object.getOwnPropertyDescriptor(result, k)?.value;
    } else {
      return undefined;
    }
  }

  return result;
}

/**
 * Handle pluralization
 * Expects translation object like:
 * { "zero": "no items", "one": "1 item", "other": "{count} items" }
 */
function pluralize(translation: any, count: number): string {
  if (typeof translation !== 'object') {
    return String(translation);
  }

  if (count === 0 && translation.zero) {
    return translation.zero;
  }
  if (count === 1 && translation.one) {
    return translation.one;
  }
  if (translation.other) {
    return translation.other;
  }

  // Fallback to 'other' or first available
  return translation.other || Object.values(translation)[0] || '';
}

/**
 * Core translation class
 */
export class I18n {
  private locale: string;
  private fallbackLocale: string;
  private translations: Record<string, TranslationObject> = {};

  constructor(locale: string = DEFAULT_LANGUAGE, fallbackLocale: string = DEFAULT_LANGUAGE) {
    this.locale = locale;
    this.fallbackLocale = fallbackLocale;
  }

  /**
   * Set current locale
   */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * Get current locale
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Add translations for a locale
   */
  addTranslations(locale: string, translations: TranslationObject): void {
    if (!this.translations[locale]) {
      this.translations[locale] = {};
    }
    this.translations[locale] = { ...this.translations[locale], ...translations };
  }

  /**
   * Add translations for a specific namespace
   */
  addNamespace(locale: string, namespace: string, translations: TranslationObject): void {
    if (!this.translations[locale]) {
      this.translations[locale] = {};
    }
    this.translations[locale][namespace] = translations;
  }

  /**
   * Check if a translation key exists
   */
  has(key: string, locale?: string): boolean {
    const lang = locale || this.locale;
    const translations = this.translations[lang];
    if (!translations) return false;

    const value = getNestedValue(translations, key);
    return value !== undefined;
  }

  /**
   * Get translation by key with fallback and interpolation
   */
  t(key: string, params?: InterpolationParams): string {
    // Try current locale
    let translation = this.getTranslation(this.locale, key);

    // Fallback to default locale
    if (translation === undefined && this.locale !== this.fallbackLocale) {
      translation = this.getTranslation(this.fallbackLocale, key);
    }

    // Fallback to key itself
    if (translation === undefined) {
      console.warn(`[i18n] Missing translation for key: ${key}`);
      return key;
    }

    // Handle pluralization if count param provided
    if (params && 'count' in params && typeof translation === 'object') {
      translation = pluralize(translation, Number(params.count));
    }

    // Convert to string and interpolate
    const stringValue = String(translation);
    return params ? interpolate(stringValue, params) : stringValue;
  }

  /**
   * Get raw translation value from locale
   */
  private getTranslation(locale: string, key: string): any {
    const translations = this.translations[locale];
    if (!translations) return undefined;

    return getNestedValue(translations, key);
  }

  /**
   * Get all translations for current locale (for debugging)
   */
  getAll(): TranslationObject {
    return this.translations[this.locale] || {};
  }
}

/**
 * Create singleton instance
 */
export const i18n = new I18n();

/**
 * Convenience function for translation
 */
export function t(key: string, params?: InterpolationParams): string {
  return i18n.t(key, params);
}

/**
 * Export types
 */
export type { TranslationObject, InterpolationParams };
