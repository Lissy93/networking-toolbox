/**
 * Language Store
 * Reactive store for managing current language and translations
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { i18n, type TranslationObject, type InterpolationParams } from '$lib/i18n';
import { detectLanguage, setStoredLanguage, buildLocalizedPath } from '$lib/i18n/lang-detector';
import { DEFAULT_LANGUAGE, type Language, SUPPORTED_LANGUAGES, LANGUAGE_CODES } from '$lib/i18n/supported-languages';

// Import all English translations eagerly (synchronously at build time)
// This prevents flash of keys while maintaining code simplicity
const enTranslations = import.meta.glob<Record<string, any>>('../i18n/translations/en/**/*.json', {
  eager: true,
  import: 'default',
});

/* Current locale store */
export const locale = writable<string>(DEFAULT_LANGUAGE);

/* Loaded translations store */
export const translations = writable<Record<string, TranslationObject>>({});

/* Available languages */
export const languages = writable<Language[]>(SUPPORTED_LANGUAGES);

/* Track loaded namespaces to avoid re-loading */
const loadedNamespaces = new Set<string>();

/**
 * Convert file path to namespace key
 * e.g., '../i18n/translations/en/tools/ip-converter.json' -> 'tools/ip-converter'
 */
function pathToNamespace(path: string): string {
  return path.replace('../i18n/translations/en/', '').replace('.json', '');
}

/**
 * Initialize English translations immediately / synchronously
 */
function initializeEnglishTranslations() {
  const enTranslationsObject: TranslationObject = {};

  // Process all eagerly-loaded English translations
  for (const [path, module] of Object.entries(enTranslations)) {
    const namespace = pathToNamespace(path);
    const translationData = module as Record<string, any>;

    // Add to i18n manager
    i18n.addNamespace(DEFAULT_LANGUAGE, namespace, translationData);

    // Track as loaded
    loadedNamespaces.add(`${DEFAULT_LANGUAGE}:${namespace}`);

    // Add to translations object
    enTranslationsObject[namespace] = translationData;
  }

  // Update store once with all translations
  translations.set({
    [DEFAULT_LANGUAGE]: enTranslationsObject,
  });
}

// Initialize English immediately on module load
initializeEnglishTranslations();

/**
 * Initialize language from detection
 */
export function initLanguage(pathname?: string): void {
  const detected = detectLanguage(pathname);

  // Validate and fallback to English if invalid
  const validLang = LANGUAGE_CODES.includes(detected) ? detected : DEFAULT_LANGUAGE;

  locale.set(validLang);
  i18n.setLocale(validLang);

  // Load namespaces for non-English languages
  if (validLang !== DEFAULT_LANGUAGE) {
    loadNamespaces(validLang, ['common', 'nav', 'settings', 'tools']);
  }
}

/**
 * Change language
 */
export function setLanguage(lang: string): void {
  // Validate language code
  if (!LANGUAGE_CODES.includes(lang)) {
    console.warn(`[i18n] Invalid language code: ${lang}, falling back to ${DEFAULT_LANGUAGE}`);
    lang = DEFAULT_LANGUAGE;
  }

  locale.set(lang);
  i18n.setLocale(lang);
  setStoredLanguage(lang);

  // Pre-load common namespaces for the new language
  if (lang !== DEFAULT_LANGUAGE) {
    loadNamespaces(lang, ['common', 'nav', 'settings', 'tools']);
  }
}

/**
 * Load translations for a namespace
 */
export async function loadTranslations(lang: string, namespace: string): Promise<void> {
  const key = `${lang}:${namespace}`;

  // Skip if already loaded
  if (loadedNamespaces.has(key)) {
    return;
  }

  // English is pre-loaded, just mark as loaded
  if (lang === DEFAULT_LANGUAGE) {
    loadedNamespaces.add(key);
    return;
  }

  try {
    // Dynamic import for non-English languages only
    // Using switch to avoid bundler warnings about en/* being both static and dynamic
    let module;
    switch (lang) {
      case 'de':
        module = await import(`../i18n/translations/de/${namespace}.json`);
        break;
      case 'es':
        module = await import(`../i18n/translations/es/${namespace}.json`);
        break;
      case 'fr':
        module = await import(`../i18n/translations/fr/${namespace}.json`);
        break;
      default:
        throw new Error(`Unsupported language: ${lang}`);
    }

    i18n.addNamespace(lang, namespace, module.default || module);

    // Mark as loaded
    loadedNamespaces.add(key);

    // Update translations store for reactivity
    translations.update((current) => ({
      ...current,
      [lang]: {
        ...current[lang],
        [namespace]: module.default || module,
      },
    }));
  } catch (error) {
    console.warn(`[i18n] Failed to load ${lang}/${namespace}, English fallback will be used`, error);

    // Mark English namespace as fallback
    const enKey = `${DEFAULT_LANGUAGE}:${namespace}`;
    if (!loadedNamespaces.has(enKey)) {
      loadedNamespaces.add(enKey);
    }
  }
}

/**
 * Load multiple namespaces at once
 */
export async function loadNamespaces(lang: string, namespaces: string[]): Promise<void> {
  await Promise.all(namespaces.map((ns) => loadTranslations(lang, ns)));
}

/**
 * Reactive translation function
 * Usage in components: $t('key.path', { param: value })
 *
 * ALWAYS falls back to English if translation is missing
 * NEVER shows translation keys to users
 */
export const t = derived([locale, translations], ([_$locale, _$translations]) => {
  return (key: string, params?: InterpolationParams): string => {
    return i18n.t(key, params);
  };
});

/**
 * Get localized path for current language
 */
export function localizedPath(path: string): string {
  const currentLocale = get(locale);
  return buildLocalizedPath(currentLocale, path);
}

/**
 * Navigate to localized path
 * Helper for goto(localizedNavigate('/settings'))
 */
export function localizedNavigate(path: string): string {
  return localizedPath(path);
}

/**
 * Subscribe to locale changes
 */
export function onLocaleChange(callback: (lang: string) => void): () => void {
  return locale.subscribe(callback);
}

// Auto-initialize on client
if (browser) {
  initLanguage(window.location.pathname);
}
