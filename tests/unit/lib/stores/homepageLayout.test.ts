import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { HomepageLayoutMode } from '../../../../src/lib/stores/homepageLayout';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true,
}));

// Mock customizable settings
vi.mock('$lib/config/customizable-settings', () => ({
  DEFAULT_HOMEPAGE_LAYOUT: 'categories',
}));

describe('homepageLayout store', () => {
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
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');
    const value = get(homepageLayout);
    expect(value).toBe('categories');
  });

  it('initializes with localStorage value if valid', async () => {
    mockLocalStorage['homepage-layout'] = 'list';
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');
    const value = get(homepageLayout);
    expect(value).toBe('list');
  });

  it('falls back to default if localStorage value is invalid', async () => {
    mockLocalStorage['homepage-layout'] = 'invalid-mode';
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');
    const value = get(homepageLayout);
    expect(value).toBe('categories');
  });

  it('exports correct layout options', async () => {
    const { homepageLayoutOptions } = await import('../../../../src/lib/stores/homepageLayout');
    expect(homepageLayoutOptions).toBeInstanceOf(Array);
    expect(homepageLayoutOptions.length).toBeGreaterThan(5);

    homepageLayoutOptions.forEach(option => {
      expect(option).toHaveProperty('id');
      expect(option).toHaveProperty('name');
      expect(option).toHaveProperty('description');
      expect(typeof option.id).toBe('string');
      expect(typeof option.name).toBe('string');
      expect(typeof option.description).toBe('string');
    });
  });

  it('setMode updates store and localStorage', async () => {
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');

    homepageLayout.setMode('list');

    expect(get(homepageLayout)).toBe('list');
    expect(mockLocalStorage['homepage-layout']).toBe('list');
  });

  it('setMode ignores invalid layout modes', async () => {
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const initialValue = get(homepageLayout);
    homepageLayout.setMode('invalid-layout' as HomepageLayoutMode);

    expect(get(homepageLayout)).toBe(initialValue);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Homepage layout mode "invalid-layout" is not valid',
      expect.objectContaining({
        mode: 'invalid-layout',
        component: 'HomepageLayoutStore'
      })
    );

    consoleSpy.mockRestore();
  });

  it('getOption returns correct option for valid mode', async () => {
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');

    const option = homepageLayout.getOption('list');
    expect(option).toBeDefined();
    expect(option?.id).toBe('list');
    expect(option?.name).toBe('List');
    expect(option?.description).toContain('Hierarchical tree view');
  });

  it('getOption returns undefined for invalid mode', async () => {
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');

    const option = homepageLayout.getOption('invalid' as HomepageLayoutMode);
    expect(option).toBeUndefined();
  });

  it('getAllOptions returns all available options', async () => {
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');

    const options = homepageLayout.getAllOptions();
    expect(options).toBeInstanceOf(Array);
    expect(options.length).toBeGreaterThan(5);

    const ids = options.map(o => o.id);
    expect(ids).toContain('categories');
    expect(ids).toContain('default');
    expect(ids).toContain('list');
    expect(ids).toContain('search');
  });

  it('init returns correct initial layout', async () => {
    mockLocalStorage['homepage-layout'] = 'search';
    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');

    const layout = homepageLayout.init();
    expect(layout).toBe('search');
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

    const { homepageLayout } = await import('../../../../src/lib/stores/homepageLayout');
    const value = get(homepageLayout);
    expect(value).toBe('categories');
  });

  it('validates all layout options have required properties', async () => {
    const { homepageLayoutOptions } = await import('../../../../src/lib/stores/homepageLayout');

    homepageLayoutOptions.forEach(option => {
      expect(option.id).toBeTruthy();
      expect(option.name).toBeTruthy();
      expect(option.description).toBeTruthy();
      expect(option.id.length).toBeGreaterThan(0);
      expect(option.name.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    });
  });

  it('does not duplicate layout option ids', async () => {
    const { homepageLayoutOptions } = await import('../../../../src/lib/stores/homepageLayout');

    const ids = homepageLayoutOptions.map(o => o.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});
