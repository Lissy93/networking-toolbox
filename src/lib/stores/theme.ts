import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { storage } from '$lib/utils/localStorage';
import { logger } from '$lib/utils/logger';
import { DEFAULT_THEME } from '$lib/config/customizable-settings';
import { themes } from '$lib/constants/theme-list';

export type ThemeOption = string;

export interface Theme {
  id: ThemeOption;
  name: string;
  available: boolean;
  preview?: string;
  font?: {
    name: string;
    url: string;
    fallback?: string;
  };
}

export { themes };

const STORAGE_KEY = 'theme';

// Track loaded fonts to avoid duplicates
const loadedFonts = new Set<string>();

// Helper function to load custom fonts with Font Loading API tracking
function loadCustomFont(fontConfig: { name: string; url: string; fallback?: string }) {
  if (!browser || loadedFonts.has(fontConfig.url)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontConfig.url;
  link.crossOrigin = 'anonymous';

  // Add loading state class
  document.documentElement.classList.add('fonts-loading');

  // Error handling
  link.onerror = () => {
    logger.warn(`Failed to load font from ${fontConfig.url}`, {
      url: fontConfig.url,
      font: fontConfig.name,
      component: 'ThemeStore',
    });
    document.documentElement.classList.remove('fonts-loading');
  };

  // Success handling with Font Loading API
  link.onload = () => {
    // Wait for fonts to be ready using Font Loading API
    if (document.fonts) {
      document.fonts.ready
        .then(() => {
          // Extract font family names from the config
          const fontFamily = fontConfig.name;

          // Check if font is loaded (try both regular and bold weights)
          const fontLoaded =
            document.fonts.check(`1em "${fontFamily}"`) || document.fonts.check(`700 1em "${fontFamily}"`);

          if (fontLoaded) {
            document.documentElement.classList.remove('fonts-loading');
            document.documentElement.classList.add('fonts-loaded');
          } else {
            // Set a timeout fallback (3 seconds)
            setTimeout(() => {
              document.documentElement.classList.remove('fonts-loading');
            }, 3000);
          }
        })
        .catch((err) => {
          logger.warn('Font loading check failed', {
            error: err,
            font: fontConfig.name,
            component: 'ThemeStore',
          });
          document.documentElement.classList.remove('fonts-loading');
        });
    } else {
      // Fallback for browsers without Font Loading API
      document.documentElement.classList.remove('fonts-loading');
      document.documentElement.classList.add('fonts-loaded');
    }
  };

  document.head.appendChild(link);
  loadedFonts.add(fontConfig.url);
}

// Helper function to apply theme classes and load fonts
function applyThemeClasses(theme: ThemeOption) {
  if (!browser) return;

  const targetClass = theme !== 'dark' ? `theme-${theme}` : null;

  // Check if the theme is already applied (prevents flash from re-applying)
  const currentThemeClass = Array.from(document.documentElement.classList).find((cls) => cls.startsWith('theme-'));

  if (currentThemeClass === targetClass) {
    // Theme already applied, just ensure font is loaded
    const themeConfig = themes.find((t) => t.id === theme);
    if (themeConfig?.font) {
      loadCustomFont(themeConfig.font);
    }
    return;
  }

  // Remove all existing theme classes
  const allThemeClasses = themes.map((t) => `theme-${t.id}`);
  document.documentElement.classList.remove(...allThemeClasses);

  // Add the current theme class (except for default 'dark' theme)
  if (targetClass) {
    document.documentElement.classList.add(targetClass);
  }

  // Load custom font if the theme has one
  const themeConfig = themes.find((t) => t.id === theme);
  if (themeConfig?.font) {
    loadCustomFont(themeConfig.font);
  }
}

function isValidTheme(theme: unknown): theme is string {
  if (typeof theme !== 'string' || !theme) return false;
  return themes.some((t) => t.id === theme && t.available);
}

function getSystemPreferredTheme(): ThemeOption {
  if (!browser) return 'ocean';

  // Check if user has a color scheme preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  if (prefersLight) return 'light';
  if (prefersDark) return 'dark';

  // No preference or preference not supported
  return 'ocean';
}

function createThemeStore() {
  const defaultTheme = isValidTheme(DEFAULT_THEME) ? DEFAULT_THEME : 'ocean';
  const { subscribe, set, update } = writable<ThemeOption>(defaultTheme);

  return {
    subscribe,

    // Initialize theme from localStorage or default
    init: () => {
      if (browser) {
        const savedTheme = localStorage.getItem(STORAGE_KEY);

        let initialTheme: ThemeOption;

        // If no saved theme, use system preference
        if (!savedTheme) {
          initialTheme = getSystemPreferredTheme();
        } else {
          // Use saved theme if valid
          initialTheme = isValidTheme(savedTheme) ? savedTheme : getSystemPreferredTheme();
        }

        set(initialTheme);

        // Apply theme to document
        applyThemeClasses(initialTheme);

        return initialTheme;
      }
      return defaultTheme;
    },

    // Set theme and persist to localStorage
    setTheme: (theme: ThemeOption) => {
      // Only set if theme is available
      const themeConfig = themes.find((t) => t.id === theme);
      if (!themeConfig?.available) {
        logger.warn(`Theme "${theme}" is not available`, { theme, component: 'ThemeStore' });
        return;
      }

      set(theme);

      if (browser) {
        storage.setItem(STORAGE_KEY, theme, { serialize: false });

        // Apply theme classes to document
        applyThemeClasses(theme);
      }
    },

    // Toggle between light and dark themes (legacy support)
    toggle: () => {
      update((currentTheme) => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        if (browser) {
          storage.setItem(STORAGE_KEY, newTheme, { serialize: false });

          applyThemeClasses(newTheme);
        }

        return newTheme;
      });
    },

    // Check if current theme is dark
    isDark: (theme: ThemeOption): boolean => {
      return theme === 'dark';
    },

    // Check if current theme is light
    isLight: (theme: ThemeOption): boolean => {
      return theme === 'light';
    },

    // Get theme configuration
    getThemeConfig: (theme: ThemeOption): Theme | undefined => {
      return themes.find((t) => t.id === theme);
    },

    // Get all available themes
    getAvailableThemes: (): Theme[] => {
      return themes.filter((t) => t.available);
    },
  };
}

export const theme = createThemeStore();
