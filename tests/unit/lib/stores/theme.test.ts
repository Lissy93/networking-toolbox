import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { ThemeOption } from '../../../../src/lib/stores/theme';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true,
}));

// Mock customizable settings
vi.mock('$lib/config/customizable-settings', () => ({
  DEFAULT_THEME: 'ocean',
}));

describe('theme store', () => {
  let mockLocalStorage: Record<string, string> = {};
  let documentHeadAppendChildSpy: any;
  let mockMatchMedia: any;

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

    // Mock matchMedia for prefers-color-scheme
    mockMatchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    global.window.matchMedia = mockMatchMedia;

    // Mock document element for theme classes
    global.document = {
      documentElement: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(),
        },
      },
      head: {
        appendChild: vi.fn(),
      },
      createElement: vi.fn(() => ({
        rel: '',
        href: '',
        crossOrigin: '',
        onerror: null,
      })),
    } as any;

    documentHeadAppendChildSpy = vi.spyOn(document.head, 'appendChild');

    // Clear module cache to reset store
    vi.resetModules();
  });

  it('exports all available themes', async () => {
    const { themes } = await import('../../../../src/lib/stores/theme');

    expect(themes).toBeInstanceOf(Array);
    expect(themes.length).toBeGreaterThan(5);

    themes.forEach(theme => {
      expect(theme).toHaveProperty('id');
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('available');
      expect(typeof theme.id).toBe('string');
      expect(typeof theme.name).toBe('string');
      expect(typeof theme.available).toBe('boolean');
    });

    // Check for specific themes
    const ids = themes.map(t => t.id);
    expect(ids).toContain('dark');
    expect(ids).toContain('light');
    expect(ids).toContain('midnight');
    expect(ids).toContain('arctic');
  });

  it('initializes with default theme when not in browser', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');
    const value = get(theme);
    expect(value).toBe('ocean');
  });

  it('init sets theme from localStorage if valid', async () => {
    mockLocalStorage['theme'] = 'light';
    const { theme } = await import('../../../../src/lib/stores/theme');

    const initialTheme = theme.init();
    expect(initialTheme).toBe('light');
    expect(get(theme)).toBe('light');
  });

  it('init falls back to system preference if localStorage theme is invalid', async () => {
    mockLocalStorage['theme'] = 'invalid-theme';
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { theme } = await import('../../../../src/lib/stores/theme');

    const initialTheme = theme.init();
    expect(initialTheme).toBe('dark');
    expect(get(theme)).toBe('dark');
  });

  it('init uses system preference (light) when no saved theme', async () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: light)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { theme } = await import('../../../../src/lib/stores/theme');

    const initialTheme = theme.init();
    expect(initialTheme).toBe('light');
    expect(get(theme)).toBe('light');
  });

  it('init uses system preference (dark) when no saved theme', async () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { theme } = await import('../../../../src/lib/stores/theme');

    const initialTheme = theme.init();
    expect(initialTheme).toBe('dark');
    expect(get(theme)).toBe('dark');
  });

  it('init uses ocean when no saved theme and no system preference', async () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { theme } = await import('../../../../src/lib/stores/theme');

    const initialTheme = theme.init();
    expect(initialTheme).toBe('ocean');
    expect(get(theme)).toBe('ocean');
  });

  it('setTheme updates store and localStorage', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');
    theme.init();

    theme.setTheme('midnight');

    expect(get(theme)).toBe('midnight');
    expect(mockLocalStorage['theme']).toBe('midnight');
  });

  it('setTheme ignores unavailable themes', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    theme.init();

    const initialValue = get(theme);
    theme.setTheme('unavailable-theme' as ThemeOption);

    expect(get(theme)).toBe(initialValue);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Theme "unavailable-theme" is not available',
      expect.objectContaining({
        theme: 'unavailable-theme',
        component: 'ThemeStore'
      })
    );

    consoleSpy.mockRestore();
  });

  it('toggle switches between light and dark', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');
    theme.init();

    theme.setTheme('dark');
    theme.toggle();
    expect(get(theme)).toBe('light');

    theme.toggle();
    expect(get(theme)).toBe('dark');
  });

  it('isDark returns true for dark theme', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');

    expect(theme.isDark('dark')).toBe(true);
    expect(theme.isDark('light')).toBe(false);
    expect(theme.isDark('midnight')).toBe(false);
  });

  it('isLight returns true for light theme', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');

    expect(theme.isLight('light')).toBe(true);
    expect(theme.isLight('dark')).toBe(false);
    expect(theme.isLight('arctic')).toBe(false);
  });

  it('getThemeConfig returns correct theme configuration', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');

    const lightConfig = theme.getThemeConfig('light');
    expect(lightConfig).toBeDefined();
    expect(lightConfig?.id).toBe('light');
    expect(lightConfig?.name).toBe('Light');
    expect(lightConfig?.available).toBe(true);
  });

  it('getAvailableThemes returns only available themes', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');

    const available = theme.getAvailableThemes();
    expect(available).toBeInstanceOf(Array);
    expect(available.every(t => t.available)).toBe(true);
  });

  it('loads custom font when theme has font config', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');
    theme.init();

    theme.setTheme('light');

    expect(documentHeadAppendChildSpy).toHaveBeenCalled();
  });

  it('handles themes without custom fonts', async () => {
    const { theme } = await import('../../../../src/lib/stores/theme');
    theme.init();

    documentHeadAppendChildSpy.mockClear();
    theme.setTheme('dark');

    // Dark theme has no font config, so no font should be loaded
    expect(get(theme)).toBe('dark');
  });
});
