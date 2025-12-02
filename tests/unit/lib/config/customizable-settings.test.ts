import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('customizable-settings - Analytics Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('ANALYTICS_DOMAIN', () => {
    it('should use default domain when env var is not set', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {},
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_DOMAIN } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_DOMAIN).toBe('networking-toolbox.as93.net');
    });

    it('should use custom domain when env var is set', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DOMAIN: 'custom-domain.example.com',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_DOMAIN } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_DOMAIN).toBe('custom-domain.example.com');
    });

    it('should accept "false" as a value to disable analytics', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DOMAIN: 'false',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_DOMAIN } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_DOMAIN).toBe('false');
    });
  });

  describe('ANALYTICS_DSN', () => {
    it('should use default DSN when env var is not set', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {},
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_DSN } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_DSN).toBe('https://no-track.as93.net/js/script.js');
    });

    it('should use custom DSN when env var is set', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DSN: 'https://plausible.io/js/script.js',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_DSN } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_DSN).toBe('https://plausible.io/js/script.js');
    });

    it('should accept "false" as a value to disable analytics', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DSN: 'false',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_DSN } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_DSN).toBe('false');
    });
  });

  describe('ANALYTICS_ENABLED', () => {
    it('should be true when both domain and DSN use defaults', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {},
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_ENABLED } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_ENABLED).toBe(true);
    });

    it('should be true when both domain and DSN are custom values', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DOMAIN: 'custom.example.com',
          NTB_ANALYTICS_DSN: 'https://analytics.example.com/script.js',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_ENABLED } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_ENABLED).toBe(true);
    });

    it('should be false when domain is set to "false"', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DOMAIN: 'false',
          NTB_ANALYTICS_DSN: 'https://no-track.as93.net/js/script.js',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_ENABLED } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_ENABLED).toBe(false);
    });

    it('should be false when DSN is set to "false"', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DOMAIN: 'networking-toolbox.as93.net',
          NTB_ANALYTICS_DSN: 'false',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_ENABLED } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_ENABLED).toBe(false);
    });

    it('should be false when both domain and DSN are set to "false"', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DOMAIN: 'false',
          NTB_ANALYTICS_DSN: 'false',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ANALYTICS_ENABLED } = await import('$lib/config/customizable-settings');
      expect(ANALYTICS_ENABLED).toBe(false);
    });
  });

  describe('getUserSettingsList - Analytics', () => {
    it('should include analytics settings in the list', async () => {
      const mockLocalStorage: Record<string, string> = {};

      global.localStorage = {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
        },
        length: Object.keys(mockLocalStorage).length,
        key: (index: number) => Object.keys(mockLocalStorage)[index] || null,
      } as Storage;

      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ANALYTICS_DOMAIN: 'test.example.com',
          NTB_ANALYTICS_DSN: 'https://test.example.com/script.js',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: true,
      }));

      const { getUserSettingsList } = await import('$lib/config/customizable-settings');
      const settings = getUserSettingsList();

      const analyticsDomain = settings.find((s) => s.name === 'NTB_ANALYTICS_DOMAIN');
      const analyticsDsn = settings.find((s) => s.name === 'NTB_ANALYTICS_DSN');

      expect(analyticsDomain).toBeDefined();
      expect(analyticsDomain?.value).toBe('test.example.com');
      expect(analyticsDsn).toBeDefined();
      expect(analyticsDsn?.value).toBe('https://test.example.com/script.js');
    });

    it('should return empty string when analytics env vars are not set', async () => {
      const mockLocalStorage: Record<string, string> = {};

      global.localStorage = {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
        },
        length: Object.keys(mockLocalStorage).length,
        key: (index: number) => Object.keys(mockLocalStorage)[index] || null,
      } as Storage;

      vi.doMock('$env/dynamic/public', () => ({
        env: {},
      }));
      vi.doMock('$app/environment', () => ({
        browser: true,
      }));

      const { getUserSettingsList } = await import('$lib/config/customizable-settings');
      const settings = getUserSettingsList();

      const analyticsDomain = settings.find((s) => s.name === 'NTB_ANALYTICS_DOMAIN');
      const analyticsDsn = settings.find((s) => s.name === 'NTB_ANALYTICS_DSN');

      expect(analyticsDomain?.value).toBe('');
      expect(analyticsDsn?.value).toBe('');
    });
  });

  describe('getUserCustomization - Error Handling', () => {
    it('should return null when localStorage throws an error', async () => {
      global.localStorage = {
        getItem: () => {
          throw new Error('localStorage error');
        },
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      } as Storage;

      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_SITE_TITLE: 'Test Site',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: true,
      }));

      // Re-import to trigger getUserCustomization with error
      const { SITE_TITLE } = await import('$lib/config/customizable-settings');
      // Should fall back to env var when localStorage fails
      expect(SITE_TITLE).toBe('Test Site');
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      global.localStorage = {
        getItem: () => 'invalid-json{',
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      } as Storage;

      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_SITE_TITLE: 'Fallback Site',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: true,
      }));

      const { SITE_TITLE } = await import('$lib/config/customizable-settings');
      // Should fall back to env var when JSON parsing fails
      expect(SITE_TITLE).toBe('Fallback Site');
    });
  });

  describe('ALLOWED_DNS_SERVERS', () => {
    it('should split and trim custom DNS servers from env var', async () => {
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          NTB_ALLOWED_DNS_SERVERS: '8.8.8.8, 1.1.1.1 ,  9.9.9.9',
        },
      }));
      vi.doMock('$app/environment', () => ({
        browser: false,
      }));

      const { ALLOWED_DNS_SERVERS } = await import('$lib/config/customizable-settings');
      expect(ALLOWED_DNS_SERVERS).toEqual(['8.8.8.8', '1.1.1.1', '9.9.9.9']);
    });
  });

  describe('getUserSettingsList - Error Handling', () => {
    it('should handle localStorage errors when getting individual values', async () => {
      let callCount = 0;
      global.localStorage = {
        getItem: () => {
          callCount++;
          if (callCount > 2) {
            throw new Error('localStorage error');
          }
          return null;
        },
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      } as Storage;

      vi.doMock('$env/dynamic/public', () => ({
        env: {},
      }));
      vi.doMock('$app/environment', () => ({
        browser: true,
      }));

      const { getUserSettingsList } = await import('$lib/config/customizable-settings');
      const settings = getUserSettingsList();

      // Should still return the settings list even if some localStorage calls fail
      expect(settings).toBeDefined();
      expect(Array.isArray(settings)).toBe(true);
    });
  });
});
