import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectLanguage,
  setStoredLanguage,
  getStoredLanguage,
  buildLocalizedPath,
  getBasePath,
  detectLanguageFromURL,
} from '../../../../src/lib/i18n/lang-detector';
import * as supportedLanguages from '../../../../src/lib/i18n/supported-languages';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true,
}));

// Mock supported languages
vi.mock('$lib/i18n/supported-languages', () => ({
  DEFAULT_LANGUAGE: 'en',
  isSupported: (code: string) => ['en', 'de', 'es', 'fr'].includes(code),
  getBrowserLanguage: vi.fn(() => 'en'),
}));

describe('Language Detector', () => {
  let mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage = {};

    global.localStorage = {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        mockLocalStorage = {};
      },
      length: Object.keys(mockLocalStorage).length,
      key: (index: number) => Object.keys(mockLocalStorage)[index] || null,
    } as Storage;

    // Reset getBrowserLanguage mock
    vi.mocked(supportedLanguages.getBrowserLanguage).mockReturnValue('en');
  });

  describe('detectLanguageFromURL', () => {
    it('extracts language from URL path', () => {
      expect(detectLanguageFromURL('/de/tools/ip-converter')).toBe('de');
      expect(detectLanguageFromURL('/fr/')).toBe('fr');
      expect(detectLanguageFromURL('/es')).toBe('es');
    });

    it('returns null if no language in path', () => {
      expect(detectLanguageFromURL('/tools')).toBeNull();
      expect(detectLanguageFromURL('/diagnostics/dns')).toBeNull();
      expect(detectLanguageFromURL('/')).toBeNull();
    });

    it('returns null for invalid language codes', () => {
      expect(detectLanguageFromURL('/invalid/tools')).toBeNull();
      expect(detectLanguageFromURL('/xx')).toBeNull();
    });

    it('handles URLs with trailing slashes', () => {
      expect(detectLanguageFromURL('/de/')).toBe('de');
      expect(detectLanguageFromURL('/de/tools/')).toBe('de');
    });
  });

  describe('getStoredLanguage', () => {
    it('retrieves stored language', () => {
      mockLocalStorage['ntb-language'] = 'de';
      expect(getStoredLanguage()).toBe('de');
    });

    it('returns null if no language stored', () => {
      expect(getStoredLanguage()).toBeNull();
    });

    it('returns null for invalid stored language', () => {
      mockLocalStorage['ntb-language'] = 'invalid';
      expect(getStoredLanguage()).toBeNull();
    });

    it('validates stored language is supported', () => {
      mockLocalStorage['ntb-language'] = 'fr';
      expect(getStoredLanguage()).toBe('fr');
    });
  });

  describe('setStoredLanguage', () => {
    it('stores valid language in localStorage', () => {
      setStoredLanguage('de');
      expect(mockLocalStorage['ntb-language']).toBe('de');
    });

    it('does not store invalid language', () => {
      setStoredLanguage('invalid');
      expect(mockLocalStorage['ntb-language']).toBeUndefined();
    });

    it('overwrites existing stored language', () => {
      mockLocalStorage['ntb-language'] = 'en';
      setStoredLanguage('fr');
      expect(mockLocalStorage['ntb-language']).toBe('fr');
    });
  });

  describe('detectLanguage - priority order', () => {
    it('prioritizes localStorage over URL', () => {
      mockLocalStorage['ntb-language'] = 'fr';
      const result = detectLanguage('/de/tools');
      expect(result).toBe('fr'); // localStorage wins
    });

    it('prioritizes localStorage over browser', () => {
      mockLocalStorage['ntb-language'] = 'de';
      vi.mocked(supportedLanguages.getBrowserLanguage).mockReturnValue('es');

      const result = detectLanguage();
      expect(result).toBe('de'); // localStorage wins
    });

    it('uses URL language if no localStorage', () => {
      const result = detectLanguage('/de/tools');
      expect(result).toBe('de');
    });

    it('uses browser language if no localStorage or URL', () => {
      vi.mocked(supportedLanguages.getBrowserLanguage).mockReturnValue('es');

      const result = detectLanguage('/tools');
      expect(result).toBe('es');
    });

    it('defaults to English if all detection fails', () => {
      vi.mocked(supportedLanguages.getBrowserLanguage).mockReturnValue('en');

      const result = detectLanguage('/tools');
      expect(result).toBe('en');
    });
  });

  describe('detectLanguage - edge cases', () => {
    it('handles undefined pathname', () => {
      mockLocalStorage['ntb-language'] = 'de';
      expect(detectLanguage()).toBe('de');
    });

    it('handles empty string pathname', () => {
      mockLocalStorage['ntb-language'] = 'es';
      expect(detectLanguage('')).toBe('es');
    });

    it('ignores invalid URL language and falls back', () => {
      vi.mocked(supportedLanguages.getBrowserLanguage).mockReturnValue('fr');

      const result = detectLanguage('/invalid/tools');
      expect(result).toBe('fr');
    });
  });

  describe('getBasePath', () => {
    it('removes language prefix from path', () => {
      expect(getBasePath('/de/settings')).toBe('/settings');
      expect(getBasePath('/fr/tools/ip-converter')).toBe('/tools/ip-converter');
    });

    it('returns unchanged path if no language prefix', () => {
      expect(getBasePath('/settings')).toBe('/settings');
      expect(getBasePath('/tools')).toBe('/tools');
    });

    it('handles root paths', () => {
      expect(getBasePath('/de')).toBe('/');
      expect(getBasePath('/de/')).toBe('/');
    });

    it('handles nested paths', () => {
      expect(getBasePath('/de/diagnostics/dns/lookup')).toBe('/diagnostics/dns/lookup');
    });
  });

  describe('buildLocalizedPath', () => {
    it('adds language prefix for non-English languages', () => {
      expect(buildLocalizedPath('de', '/tools/ip-converter')).toBe('/de/tools/ip-converter');
      expect(buildLocalizedPath('fr', '/settings')).toBe('/fr/settings');
    });

    it('returns unmodified path for English', () => {
      expect(buildLocalizedPath('en', '/tools/ip-converter')).toBe('/tools/ip-converter');
      expect(buildLocalizedPath('en', '/settings')).toBe('/settings');
    });

    it('handles root path', () => {
      expect(buildLocalizedPath('de', '/')).toBe('/de/');
      expect(buildLocalizedPath('en', '/')).toBe('/');
    });

    it('removes existing language prefix before adding new one', () => {
      expect(buildLocalizedPath('fr', '/de/tools')).toBe('/fr/tools');
      expect(buildLocalizedPath('es', '/fr/settings')).toBe('/es/settings');
    });

    it('handles path with query string', () => {
      expect(buildLocalizedPath('de', '/tools?param=value')).toBe('/de/tools?param=value');
    });

    it('handles path with hash', () => {
      expect(buildLocalizedPath('fr', '/tools#section')).toBe('/fr/tools#section');
    });

    it('handles nested paths', () => {
      expect(buildLocalizedPath('de', '/diagnostics/dns/lookup')).toBe(
        '/de/diagnostics/dns/lookup'
      );
    });
  });

  describe('URL extraction patterns', () => {
    it('extracts language from various valid URL patterns', () => {
      const testCases = [
        { path: '/de', expected: 'de' },
        { path: '/de/', expected: 'de' },
        { path: '/de/tools', expected: 'de' },
        { path: '/de/diagnostics/dns/lookup', expected: 'de' },
        { path: '/fr/settings', expected: 'fr' },
      ];

      testCases.forEach(({ path, expected }) => {
        const result = detectLanguageFromURL(path);
        expect(result).toBe(expected);
      });
    });

    it('returns null for paths without language', () => {
      const testCases = ['/tools', '/diagnostics', '/settings', '/', ''];

      testCases.forEach((path) => {
        const result = detectLanguageFromURL(path);
        expect(result).toBeNull();
      });
    });
  });

  describe('real-world scenarios', () => {
    it('handles initial page load with no stored preference', () => {
      vi.mocked(supportedLanguages.getBrowserLanguage).mockReturnValue('de');

      const result = detectLanguage('/');
      expect(result).toBe('de');
    });

    it('handles user navigating to different language URL', () => {
      mockLocalStorage['ntb-language'] = 'en';

      // User clicks on /de/tools link
      const result = detectLanguage('/de/tools');

      // localStorage takes precedence, but app would call setStoredLanguage
      expect(result).toBe('en');

      // After setting new language
      setStoredLanguage('de');
      expect(detectLanguage('/de/tools')).toBe('de');
    });

    it('handles direct navigation to localized URL', () => {
      const result = detectLanguage('/fr/diagnostics/dns/lookup');
      expect(result).toBe('fr');
    });

    it('preserves user language preference across sessions', () => {
      // First session
      setStoredLanguage('de');

      // Simulate new session (localStorage persists)
      const result = detectLanguage('/tools');
      expect(result).toBe('de');
    });

    it('handles user changing language in settings', () => {
      mockLocalStorage['ntb-language'] = 'en';
      setStoredLanguage('fr');

      expect(mockLocalStorage['ntb-language']).toBe('fr');
      expect(detectLanguage()).toBe('fr');
    });
  });

  describe('browser vs SSR behavior', () => {
    it('handles SSR environment gracefully', async () => {
      // Mock browser as false
      vi.resetModules();
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const langDetector = await import('../../../../src/lib/i18n/lang-detector');

      expect(langDetector.getStoredLanguage()).toBeNull();

      // Should not throw
      langDetector.setStoredLanguage('de');
    });
  });

  describe('storage error handling', () => {
    it('handles localStorage getItem errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.localStorage = {
        ...global.localStorage,
        getItem: () => {
          throw new Error('Storage error');
        },
      } as Storage;

      const result = getStoredLanguage();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read language'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('handles localStorage setItem errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.localStorage = {
        ...global.localStorage,
        setItem: () => {
          throw new Error('Storage error');
        },
      } as Storage;

      // Should not throw
      setStoredLanguage('de');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save language'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });
});
