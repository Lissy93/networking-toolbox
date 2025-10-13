import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'user-primary-color';
const HEX_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function createPrimaryColorStore() {
  const { subscribe, set } = writable<string>('');

  return {
    subscribe,
    init: () => {
      if (!browser) return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        // Only load if it's a valid hex color
        if (stored && HEX_PATTERN.test(stored)) {
          set(stored);
        }
      } catch (e) {
        console.error('Failed to load primary color:', e);
      }
    },
    set: (color: string) => {
      if (!browser) return;
      try {
        if (color && color.trim()) {
          const trimmed = color.trim();
          // Only save valid hex colors
          if (HEX_PATTERN.test(trimmed)) {
            localStorage.setItem(STORAGE_KEY, trimmed);
            set(trimmed);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
          set('');
        }
      } catch (e) {
        console.error('Failed to save primary color:', e);
      }
    },
    clear: () => {
      if (!browser) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
        set('');
      } catch (e) {
        console.error('Failed to clear primary color:', e);
      }
    },
  };
}

export const primaryColor = createPrimaryColorStore();
