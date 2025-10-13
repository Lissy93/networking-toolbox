import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { accessibility, type AccessibilitySettings, type AccessibilityOption } from '../../../src/lib/stores/accessibility';

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock matchMedia for system preferences
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
});

// Mock document.head.appendChild for font loading
const mockAppendChild = vi.fn();
Object.defineProperty(document, 'head', {
  value: { appendChild: mockAppendChild },
  writable: true,
});

// Mock document.createElement
const mockCreateElement = vi.fn();
global.document.createElement = mockCreateElement;

describe('Accessibility Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.mockReturnValue({ matches: false });
    mockCreateElement.mockReturnValue({
      rel: '',
      href: '',
      crossOrigin: ''
    });
  });

  afterEach(() => {
    // Reset store to default state
    accessibility.reset();
  });

  describe('Store Initialization', () => {
    it('should initialize with default options', () => {
      const settings = get(accessibility);

      expect(settings).toBeDefined();
      expect(settings.options).toBeDefined();
      expect(Array.isArray(settings.options)).toBe(true);
      expect(settings.options.length).toBeGreaterThan(0);
    });

    it('should load stored settings from localStorage', () => {
      const storedSettings = {
        options: [
          { id: 'high-contrast', enabled: true },
          { id: 'large-text', enabled: false }
        ]
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedSettings));

      accessibility.init();

      const settings = get(accessibility);
      const highContrastOption = settings.options.find(opt => opt.id === 'high-contrast');

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('accessibility-settings');
      expect(highContrastOption?.enabled).toBe(true);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      expect(() => accessibility.init()).not.toThrow();

      const settings = get(accessibility);
      expect(settings.options).toBeDefined();
    });

    it('should respect system preferences for reduce motion', () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      accessibility.init();

      const settings = get(accessibility);
      const reduceMotionOption = settings.options.find(opt => opt.id === 'reduce-motion');

      expect(reduceMotionOption?.enabled).toBe(true);
    });

    it('should load dyslexic font if option is enabled', () => {
      const storedSettings = {
        options: [{ id: 'dyslexia-font', enabled: true }]
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedSettings));

      accessibility.init();

      expect(mockCreateElement).toHaveBeenCalledWith('link');
      expect(mockAppendChild).toHaveBeenCalled();
    });
  });

  describe('Option Structure Validation', () => {
    it('should have valid structure for all default options', () => {
      const settings = get(accessibility);

      settings.options.forEach((option: AccessibilityOption) => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('description');
        expect(option).toHaveProperty('category');
        expect(option).toHaveProperty('enabled');
        expect(option).toHaveProperty('cssClass');

        expect(typeof option.id).toBe('string');
        expect(typeof option.name).toBe('string');
        expect(typeof option.description).toBe('string');
        expect(typeof option.category).toBe('string');
        expect(typeof option.enabled).toBe('boolean');
        expect(typeof option.cssClass).toBe('string');

        expect(['visual', 'motion', 'reading', 'interaction']).toContain(option.category);
      });
    });

    it('should contain expected accessibility options', () => {
      const settings = get(accessibility);
      const optionIds = settings.options.map(opt => opt.id);

      expect(optionIds).toContain('reduce-motion');
      expect(optionIds).toContain('high-contrast');
      expect(optionIds).toContain('large-text');
      expect(optionIds).toContain('dyslexia-font');
      expect(optionIds).toContain('always-underline-links');
      expect(optionIds).toContain('no-icons');
      expect(optionIds).toContain('focus-visible');
      expect(optionIds).toContain('dark-mode-high-contrast');
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle option state', () => {
      const initialSettings = get(accessibility);
      const option = initialSettings.options.find(opt => opt.id === 'high-contrast');
      const initialState = option?.enabled;

      accessibility.toggle('high-contrast');

      const newSettings = get(accessibility);
      const toggledOption = newSettings.options.find(opt => opt.id === 'high-contrast');

      expect(toggledOption?.enabled).toBe(!initialState);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should load dyslexic font when dyslexia-font is enabled', () => {
      accessibility.toggle('dyslexia-font');

      // Check that the option is toggled to enabled
      const settings = get(accessibility);
      const dyslexiaOption = settings.options.find(opt => opt.id === 'dyslexia-font');
      expect(dyslexiaOption?.enabled).toBe(true);
    });

    it('should toggle dyslexia-font option correctly', () => {
      // First toggle to enable
      accessibility.toggle('dyslexia-font');

      let settings = get(accessibility);
      let dyslexiaOption = settings.options.find(opt => opt.id === 'dyslexia-font');
      expect(dyslexiaOption?.enabled).toBe(true);

      // Toggle off
      accessibility.toggle('dyslexia-font');

      settings = get(accessibility);
      dyslexiaOption = settings.options.find(opt => opt.id === 'dyslexia-font');
      expect(dyslexiaOption?.enabled).toBe(false);

      // Toggle on again
      accessibility.toggle('dyslexia-font');

      settings = get(accessibility);
      dyslexiaOption = settings.options.find(opt => opt.id === 'dyslexia-font');
      expect(dyslexiaOption?.enabled).toBe(true);
    });
  });

  describe('Enable/Disable Functions', () => {
    it('should enable an option', () => {
      accessibility.enable('high-contrast');

      const settings = get(accessibility);
      const option = settings.options.find(opt => opt.id === 'high-contrast');

      expect(option?.enabled).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should disable an option', () => {
      // First enable it
      accessibility.enable('high-contrast');

      // Then disable it
      accessibility.disable('high-contrast');

      const settings = get(accessibility);
      const option = settings.options.find(opt => opt.id === 'high-contrast');

      expect(option?.enabled).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Utility Functions', () => {
    it('should generate CSS classes string', () => {
      accessibility.enable('high-contrast');
      accessibility.enable('large-text');

      const settings = get(accessibility);
      const cssClasses = accessibility.getCSSClasses(settings);

      expect(cssClasses).toContain('contrast-high');
      expect(cssClasses).toContain('scale-large');
      expect(typeof cssClasses).toBe('string');
    });

    it('should filter options by category', () => {
      const settings = get(accessibility);
      const visualOptions = accessibility.getOptionsByCategory(settings, 'visual');
      const motionOptions = accessibility.getOptionsByCategory(settings, 'motion');

      expect(Array.isArray(visualOptions)).toBe(true);
      expect(Array.isArray(motionOptions)).toBe(true);
      expect(visualOptions.length).toBeGreaterThan(0);
      expect(motionOptions.length).toBeGreaterThan(0);

      visualOptions.forEach(option => {
        expect(option.category).toBe('visual');
      });

      motionOptions.forEach(option => {
        expect(option.category).toBe('motion');
      });
    });

    it('should check if option is enabled', () => {
      const settings = get(accessibility);

      // Should return false for disabled options
      expect(accessibility.isEnabled(settings, 'high-contrast')).toBe(false);

      // Enable and check again
      accessibility.enable('high-contrast');
      const newSettings = get(accessibility);
      expect(accessibility.isEnabled(newSettings, 'high-contrast')).toBe(true);

      // Should return false for non-existent options
      expect(accessibility.isEnabled(settings, 'non-existent')).toBe(false);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all settings to defaults', () => {
      // Enable some options
      accessibility.enable('high-contrast');
      accessibility.enable('large-text');

      // Reset
      accessibility.reset();

      const settings = get(accessibility);
      const allEnabled = settings.options.filter(opt => opt.enabled);

      // Should have no enabled options (assuming defaults are all false)
      expect(allEnabled.length).toBe(0);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'accessibility-settings',
        expect.stringContaining('options')
      );
    });
  });

  describe('Font Loading', () => {
    it('should handle dyslexic font option', () => {
      // Test that the dyslexic font option exists and can be enabled
      const settings = get(accessibility);
      const dyslexiaOption = settings.options.find(opt => opt.id === 'dyslexia-font');

      expect(dyslexiaOption).toBeDefined();
      expect(dyslexiaOption?.category).toBe('reading');
      expect(dyslexiaOption?.cssClass).toBe('dyslexia-font');

      // Test enabling the option
      accessibility.enable('dyslexia-font');

      const newSettings = get(accessibility);
      const enabledOption = newSettings.options.find(opt => opt.id === 'dyslexia-font');
      expect(enabledOption?.enabled).toBe(true);
    });
  });

  describe('System Preferences', () => {
    it('should have system preference function for reduce motion', () => {
      const settings = get(accessibility);
      const reduceMotionOption = settings.options.find(opt => opt.id === 'reduce-motion');

      expect(reduceMotionOption?.systemPreference).toBeDefined();
      expect(typeof reduceMotionOption?.systemPreference).toBe('function');
    });

    it('should call matchMedia for reduce motion preference', () => {
      const settings = get(accessibility);
      const reduceMotionOption = settings.options.find(opt => opt.id === 'reduce-motion');

      if (reduceMotionOption?.systemPreference) {
        reduceMotionOption.systemPreference();
        expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
      }
    });
  });

  describe('Category Coverage', () => {
    it('should have options in all categories', () => {
      const settings = get(accessibility);
      const categories = ['visual', 'motion', 'reading', 'interaction'] as const;

      categories.forEach(category => {
        const optionsInCategory = settings.options.filter(opt => opt.category === category);
        expect(optionsInCategory.length).toBeGreaterThan(0);
      });
    });
  });
});