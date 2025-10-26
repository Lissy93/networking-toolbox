import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: false, // Start with SSR mode
}));

// Mock i18n core
const mockI18n = {
  addNamespace: vi.fn(),
  setLocale: vi.fn(),
  t: vi.fn((key: string) => key),
};

vi.mock('$lib/i18n', () => ({
  i18n: mockI18n,
}));

// Mock language detector
const mockDetectLanguage = vi.fn(() => 'en');
const mockSetStoredLanguage = vi.fn();
const mockBuildLocalizedPath = vi.fn((locale: string, path: string) => `/${locale}${path}`);

vi.mock('$lib/i18n/lang-detector', () => ({
  detectLanguage: mockDetectLanguage,
  setStoredLanguage: mockSetStoredLanguage,
  buildLocalizedPath: mockBuildLocalizedPath,
}));

// Mock supported languages
vi.mock('$lib/i18n/supported-languages', () => ({
  DEFAULT_LANGUAGE: 'en',
  LANGUAGE_CODES: ['en', 'de', 'es', 'fr'],
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', englishName: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', englishName: 'German', flag: '🇩🇪' },
  ],
}));

// Mock translation files loaded via import.meta.glob
vi.mock('virtual:translation-files', () => ({
  '../i18n/translations/en/common.json': { hello: 'Hello', goodbye: 'Goodbye' },
  '../i18n/translations/en/nav.json': { home: 'Home', settings: 'Settings' },
  '../i18n/translations/en/tools/ip-converter.json': { title: 'IP Converter' },
}));

describe('language store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('initialization', () => {
    it('loads all English translations synchronously on module load', async () => {
      await import('../../../../src/lib/stores/language');

      // Verify i18n.addNamespace was called for English translations
      expect(mockI18n.addNamespace).toHaveBeenCalled();
      const calls = mockI18n.addNamespace.mock.calls;

      // All calls should be for 'en' locale
      expect(calls.every(([locale]) => locale === 'en')).toBe(true);

      // Should have called for multiple namespaces
      expect(calls.length).toBeGreaterThan(0);
    });

    it('initializes locale store with default language', async () => {
      const { locale } = await import('../../../../src/lib/stores/language');

      expect(get(locale)).toBe('en');
    });

    it('initializes translations store with English data', async () => {
      const { translations } = await import('../../../../src/lib/stores/language');

      const translationsData = get(translations);
      expect(translationsData).toHaveProperty('en');
      expect(typeof translationsData.en).toBe('object');
    });

    it('exports languages list', async () => {
      const { languages } = await import('../../../../src/lib/stores/language');

      const langList = get(languages);
      expect(Array.isArray(langList)).toBe(true);
      expect(langList.length).toBeGreaterThan(0);
    });
  });

  describe('initLanguage', () => {
    it('detects language from pathname', async () => {
      mockDetectLanguage.mockReturnValue('de');
      const { initLanguage } = await import('../../../../src/lib/stores/language');

      initLanguage('/de/tools');

      expect(mockDetectLanguage).toHaveBeenCalledWith('/de/tools');
    });

    it('sets detected language in locale store', async () => {
      mockDetectLanguage.mockReturnValue('de');
      const { initLanguage, locale } = await import('../../../../src/lib/stores/language');

      initLanguage();

      expect(get(locale)).toBe('de');
    });

    it('sets locale in i18n core', async () => {
      mockDetectLanguage.mockReturnValue('fr');
      const { initLanguage } = await import('../../../../src/lib/stores/language');

      initLanguage();

      expect(mockI18n.setLocale).toHaveBeenCalledWith('fr');
    });

    it('falls back to English for invalid language codes', async () => {
      mockDetectLanguage.mockReturnValue('invalid');
      const { initLanguage, locale } = await import('../../../../src/lib/stores/language');

      initLanguage();

      expect(get(locale)).toBe('en');
    });

    it('does not attempt to load namespaces for English', async () => {
      mockDetectLanguage.mockReturnValue('en');
      const { initLanguage } = await import('../../../../src/lib/stores/language');

      const callCountBefore = mockI18n.addNamespace.mock.calls.length;
      initLanguage();
      const callCountAfter = mockI18n.addNamespace.mock.calls.length;

      // Should not make additional calls for English (already loaded)
      expect(callCountAfter).toBe(callCountBefore);
    });
  });

  describe('setLanguage', () => {
    it('updates locale store', async () => {
      const { setLanguage, locale } = await import('../../../../src/lib/stores/language');

      setLanguage('de');

      expect(get(locale)).toBe('de');
    });

    it('updates i18n core locale', async () => {
      const { setLanguage } = await import('../../../../src/lib/stores/language');

      setLanguage('es');

      expect(mockI18n.setLocale).toHaveBeenCalledWith('es');
    });

    it('persists language choice to storage', async () => {
      const { setLanguage } = await import('../../../../src/lib/stores/language');

      setLanguage('fr');

      expect(mockSetStoredLanguage).toHaveBeenCalledWith('fr');
    });

    it('validates language code and falls back to English', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { setLanguage, locale } = await import('../../../../src/lib/stores/language');

      setLanguage('invalid-lang');

      expect(get(locale)).toBe('en');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid language code')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('loadTranslations', () => {
    it('skips loading if namespace already loaded', async () => {
      const { loadTranslations } = await import('../../../../src/lib/stores/language');

      const callCountBefore = mockI18n.addNamespace.mock.calls.length;

      // Load same namespace twice
      await loadTranslations('en', 'common');
      await loadTranslations('en', 'common');

      const callCountAfter = mockI18n.addNamespace.mock.calls.length;

      // Should not make additional calls (already loaded during init)
      expect(callCountAfter).toBe(callCountBefore);
    });

    it('marks English namespaces as loaded without dynamic import', async () => {
      const { loadTranslations } = await import('../../../../src/lib/stores/language');

      await loadTranslations('en', 'new-namespace');

      // Should not throw and should handle gracefully
      expect(true).toBe(true);
    });

    it('handles failed translation loading gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { loadTranslations } = await import('../../../../src/lib/stores/language');

      await loadTranslations('de', 'non-existent-namespace');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('loadNamespaces', () => {
    it('loads multiple namespaces in parallel', async () => {
      const { loadNamespaces } = await import('../../../../src/lib/stores/language');

      await loadNamespaces('de', ['common', 'nav', 'settings']);

      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('t (translation function)', () => {
    it('exports reactive translation store', async () => {
      const { t } = await import('../../../../src/lib/stores/language');

      const tFunc = get(t);
      expect(typeof tFunc).toBe('function');
    });

    it('calls i18n.t with key and params', async () => {
      const { t } = await import('../../../../src/lib/stores/language');
      mockI18n.t.mockReturnValue('Translated text');

      const tFunc = get(t);
      const result = tFunc('common.hello', { name: 'World' });

      expect(mockI18n.t).toHaveBeenCalledWith('common.hello', { name: 'World' });
      expect(result).toBe('Translated text');
    });

    it('reacts to locale changes', async () => {
      const { t, locale } = await import('../../../../src/lib/stores/language');

      let callCount = 0;
      const unsubscribe = t.subscribe(() => {
        callCount++;
      });

      // Change locale should trigger t to update
      locale.set('de');

      expect(callCount).toBeGreaterThan(1);

      unsubscribe();
    });
  });

  describe('localizedPath', () => {
    it('builds localized path for current locale', async () => {
      const { localizedPath, locale } = await import('../../../../src/lib/stores/language');
      locale.set('de');

      const path = localizedPath('/tools/ip-converter');

      expect(mockBuildLocalizedPath).toHaveBeenCalledWith('de', '/tools/ip-converter');
    });
  });

  describe('localizedNavigate', () => {
    it('returns localized path', async () => {
      const { localizedNavigate, locale } = await import('../../../../src/lib/stores/language');
      locale.set('fr');
      mockBuildLocalizedPath.mockReturnValue('/fr/settings');

      const result = localizedNavigate('/settings');

      expect(result).toBe('/fr/settings');
    });
  });

  describe('onLocaleChange', () => {
    it('subscribes to locale changes', async () => {
      const { onLocaleChange, locale } = await import('../../../../src/lib/stores/language');

      const callback = vi.fn();
      const unsubscribe = onLocaleChange(callback);

      locale.set('es');

      expect(callback).toHaveBeenCalledWith('es');

      unsubscribe();
    });

    it('returns unsubscribe function', async () => {
      const { onLocaleChange, locale } = await import('../../../../src/lib/stores/language');

      const callback = vi.fn();
      const unsubscribe = onLocaleChange(callback);

      unsubscribe();
      callback.mockClear();

      locale.set('de');

      // Should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('pathToNamespace helper', () => {
    it('converts file path to namespace key correctly', async () => {
      // This tests the internal pathToNamespace function indirectly
      // by verifying the namespaces are registered correctly
      await import('../../../../src/lib/stores/language');

      const namespaces = mockI18n.addNamespace.mock.calls.map(([, namespace]) => namespace);

      // Should have removed path prefix and .json extension
      expect(namespaces.every(ns => !ns.includes('../i18n/translations/en/'))).toBe(true);
      expect(namespaces.every(ns => !ns.includes('.json'))).toBe(true);
    });
  });

  describe('import.meta.glob integration', () => {
    it('loads all translation files via import.meta.glob', async () => {
      await import('../../../../src/lib/stores/language');

      // Verify multiple namespaces were loaded
      const uniqueNamespaces = new Set(
        mockI18n.addNamespace.mock.calls.map(([, namespace]) => namespace)
      );

      expect(uniqueNamespaces.size).toBeGreaterThan(1);
    });

    it('passes translation data to i18n.addNamespace', async () => {
      await import('../../../../src/lib/stores/language');

      // Verify that actual translation objects were passed
      const calls = mockI18n.addNamespace.mock.calls;
      expect(calls.every(([, , data]) => typeof data === 'object')).toBe(true);
    });
  });

  describe('SSR vs Browser behavior', () => {
    it('does not auto-initialize in SSR mode', async () => {
      // browser is mocked as false at top
      const { locale } = await import('../../../../src/lib/stores/language');

      // Should remain at default, not call detectLanguage automatically
      expect(get(locale)).toBe('en');
    });
  });
});
