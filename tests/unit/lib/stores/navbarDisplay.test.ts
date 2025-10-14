import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { NavbarDisplayMode } from '../../../../src/lib/stores/navbarDisplay';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true,
}));

// Mock customizable settings
vi.mock('$lib/config/customizable-settings', () => ({
  DEFAULT_NAVBAR_DISPLAY: 'default',
}));

describe('navbarDisplay store', () => {
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

    // Clear module cache to reset store
    vi.resetModules();
  });

  it('initializes with default value when no localStorage value exists', async () => {
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');
    const value = get(navbarDisplay);
    expect(value).toBe('default');
  });

  it('initializes with localStorage value if valid', async () => {
    mockLocalStorage['navbar-display'] = 'bookmarked';
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');
    const value = get(navbarDisplay);
    expect(value).toBe('bookmarked');
  });

  it('falls back to default if localStorage value is invalid', async () => {
    mockLocalStorage['navbar-display'] = 'invalid-mode';
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');
    const value = get(navbarDisplay);
    expect(value).toBe('default');
  });

  it('exports correct display options', async () => {
    const { navbarDisplayOptions } = await import('../../../../src/lib/stores/navbarDisplay');
    expect(navbarDisplayOptions).toBeInstanceOf(Array);
    expect(navbarDisplayOptions.length).toBe(4);

    const ids = navbarDisplayOptions.map(o => o.id);
    expect(ids).toEqual(['default', 'bookmarked', 'frequent', 'none']);

    navbarDisplayOptions.forEach(option => {
      expect(option).toHaveProperty('id');
      expect(option).toHaveProperty('name');
      expect(option).toHaveProperty('description');
      expect(typeof option.id).toBe('string');
      expect(typeof option.name).toBe('string');
      expect(typeof option.description).toBe('string');
    });
  });

  it('setMode updates store and localStorage', async () => {
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');

    navbarDisplay.setMode('frequent');

    expect(get(navbarDisplay)).toBe('frequent');
    expect(mockLocalStorage['navbar-display']).toBe('frequent');
  });

  it('setMode ignores invalid display modes', async () => {
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const initialValue = get(navbarDisplay);
    navbarDisplay.setMode('invalid-mode' as NavbarDisplayMode);

    expect(get(navbarDisplay)).toBe(initialValue);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Navbar display mode "invalid-mode" is not valid',
      expect.objectContaining({
        mode: 'invalid-mode',
        component: 'NavbarDisplayStore'
      })
    );

    consoleSpy.mockRestore();
  });

  it('getOption returns correct option for valid mode', async () => {
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');

    const option = navbarDisplay.getOption('bookmarked');
    expect(option).toBeDefined();
    expect(option?.id).toBe('bookmarked');
    expect(option?.name).toBe('Bookmarked');
    expect(option?.description).toContain('bookmarked links');
  });

  it('getOption returns undefined for invalid mode', async () => {
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');

    const option = navbarDisplay.getOption('invalid' as NavbarDisplayMode);
    expect(option).toBeUndefined();
  });

  it('getAllOptions returns all available options', async () => {
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');

    const options = navbarDisplay.getAllOptions();
    expect(options).toBeInstanceOf(Array);
    expect(options.length).toBe(4);

    const ids = options.map(o => o.id);
    expect(ids).toContain('default');
    expect(ids).toContain('bookmarked');
    expect(ids).toContain('frequent');
    expect(ids).toContain('none');
  });

  it('init returns correct initial display mode', async () => {
    mockLocalStorage['navbar-display'] = 'none';
    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');

    const mode = navbarDisplay.init();
    expect(mode).toBe('none');
  });

  it('handles localStorage errors gracefully', async () => {
    global.localStorage = {
      getItem: () => { throw new Error('Storage error'); },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    } as Storage;

    const { navbarDisplay } = await import('../../../../src/lib/stores/navbarDisplay');
    const value = get(navbarDisplay);
    expect(value).toBe('default');
  });

  it('validates all display options have required properties', async () => {
    const { navbarDisplayOptions } = await import('../../../../src/lib/stores/navbarDisplay');

    navbarDisplayOptions.forEach(option => {
      expect(option.id).toBeTruthy();
      expect(option.name).toBeTruthy();
      expect(option.description).toBeTruthy();
      expect(option.id.length).toBeGreaterThan(0);
      expect(option.name.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    });
  });

  it('does not duplicate display option ids', async () => {
    const { navbarDisplayOptions } = await import('../../../../src/lib/stores/navbarDisplay');

    const ids = navbarDisplayOptions.map(o => o.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});
