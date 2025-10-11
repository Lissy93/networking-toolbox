import { writable } from 'svelte/store';
import { browser } from '$app/environment';

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

const STORAGE_KEY = 'theme';

// Track loaded fonts to avoid duplicates
const loadedFonts = new Set<string>();

// Helper function to load custom fonts
function loadCustomFont(fontConfig: { name: string; url: string; fallback?: string }) {
  if (!browser || loadedFonts.has(fontConfig.url)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontConfig.url;
  link.crossOrigin = 'anonymous';

  // Add fallback handling
  link.onerror = () => {
    console.warn(`Failed to load font from ${fontConfig.url}`);
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

// Available themes configuration
export const themes: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    available: true,
  },
  {
    id: 'light',
    name: 'Light',
    available: true,
    font: {
      name: 'Inter',
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap',
      fallback: 'sans-serif',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    available: true,
    font: {
      name: 'Montserrat',
      url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap',
      fallback: 'sans-serif',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    available: true,
    font: {
      name: 'Raleway',
      url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800&family=Source+Code+Pro:wght@400;500;600;700&display=swap',
      fallback: 'sans-serif',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    available: true,
    font: {
      name: 'Inter',
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      fallback: 'sans-serif',
    },
  },
  {
    id: 'purple',
    name: 'Purple',
    available: true,
    font: {
      name: 'Poppins',
      url: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
      fallback: 'sans',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    available: true,
    font: {
      name: 'Orbitron',
      url: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap',
      fallback: 'monospace',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    available: true,
    font: {
      name: 'JetBrains Mono',
      url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700;800&display=swap',
      fallback: 'monospace',
    },
  },
  {
    id: 'lightpurple',
    name: 'Light Purple',
    available: true,
  },
  {
    id: 'muteddark',
    name: 'Muted Dark',
    available: true,
    font: {
      name: 'Source Code Pro',
      url: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap',
      fallback: 'monospace',
    },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    available: true,
    font: {
      name: 'Inconsolata',
      url: 'https://fonts.googleapis.com/css2?family=Inconsolata:wght@300;400;500;600;700&family=Lato:wght@300;400;700&display=swap',
      fallback: 'monospace',
    },
  },
];

function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeOption>('dark');

  return {
    subscribe,

    // Initialize theme from localStorage or default
    init: () => {
      if (browser) {
        const saved = localStorage.getItem(STORAGE_KEY);
        const isValidTheme = themes.some((t) => t.id === saved && t.available);
        const initialTheme = isValidTheme ? (saved as ThemeOption) : 'dark';

        set(initialTheme);

        // Apply theme to document
        applyThemeClasses(initialTheme);

        return initialTheme;
      }
      return 'dark';
    },

    // Set theme and persist to localStorage
    setTheme: (theme: ThemeOption) => {
      // Only set if theme is available
      const themeConfig = themes.find((t) => t.id === theme);
      if (!themeConfig?.available) {
        console.warn(`Theme "${theme}" is not available`);
        return;
      }

      set(theme);

      if (browser) {
        localStorage.setItem(STORAGE_KEY, theme);

        // Apply theme classes to document
        applyThemeClasses(theme);
      }
    },

    // Toggle between light and dark themes (legacy support)
    toggle: () => {
      update((currentTheme) => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        if (browser) {
          localStorage.setItem(STORAGE_KEY, newTheme);

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
