/**
 * Supported Languages Configuration
 * Lists all languages available in the application
 */

export interface Language {
  code: string; // ISO 639-1 code
  name: string; // Native language name
  englishName: string; // English name for reference
  flag: string; // Unicode flag emoji
  rtl?: boolean; // Right-to-left script
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    englishName: 'English',
    flag: '🇬🇧',
  },
  {
    code: 'de',
    name: 'Deutsch',
    englishName: 'German',
    flag: '🇩🇪',
  },
  {
    code: 'es',
    name: 'Español',
    englishName: 'Spanish',
    flag: '🇪🇸',
  },
  {
    code: 'fr',
    name: 'Français',
    englishName: 'French',
    flag: '🇫🇷',
  },
];

export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((lang) => lang.code);

/**
 * Check if a language code is supported
 */
export function isSupported(code: string): boolean {
  return LANGUAGE_CODES.includes(code);
}

/**
 * Get language config by code
 */
export function getLanguage(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Get browser's preferred language from supported list
 */
export function getBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

  // Check exact match first
  const browserLang = navigator.language.toLowerCase();
  const exactMatch = LANGUAGE_CODES.find((code) => browserLang.startsWith(code));
  if (exactMatch) return exactMatch;

  // Check language codes from browser languages
  const browserLanguages = navigator.languages || [navigator.language];
  for (const lang of browserLanguages) {
    const code = lang.split('-')[0]?.toLowerCase();
    if (code && isSupported(code)) {
      return code;
    }
  }

  return DEFAULT_LANGUAGE;
}
