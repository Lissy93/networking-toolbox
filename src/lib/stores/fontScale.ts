import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { storage } from '$lib/utils/localStorage';
import { DEFAULT_FONT_SCALE } from '$lib/config/customizable-settings';

export type FontScaleLevel = 0 | 1 | 2 | 3 | 4;

export interface FontScaleOption {
  level: FontScaleLevel;
  label: string;
  scale: number;
}

export const fontScaleOptions: FontScaleOption[] = [
  { level: 0, label: 'Extra Small', scale: 0.85 },
  { level: 1, label: 'Small', scale: 0.925 },
  { level: 2, label: 'Normal', scale: 1.0 },
  { level: 3, label: 'Large', scale: 1.075 },
  { level: 4, label: 'Extra Large', scale: 1.15 },
];

const STORAGE_KEY = 'font-scale';

function isValidLevel(level: unknown): level is FontScaleLevel {
  return typeof level === 'number' && level >= 0 && level <= 4;
}

function applyFontScale(level: FontScaleLevel) {
  if (!browser) return;

  const option = fontScaleOptions.find((opt) => opt.level === level);
  if (!option) return;

  document.documentElement.style.setProperty('--font-scale', option.scale.toString());
}

function createFontScaleStore() {
  const defaultLevel = isValidLevel(DEFAULT_FONT_SCALE) ? DEFAULT_FONT_SCALE : 2;
  const { subscribe, set } = writable<FontScaleLevel>(defaultLevel);

  return {
    subscribe,

    // Initialize from localStorage or default
    init: () => {
      if (browser) {
        const saved = localStorage.getItem(STORAGE_KEY);
        const savedLevel = saved ? parseInt(saved, 10) : null;
        const initialLevel = savedLevel !== null && isValidLevel(savedLevel) ? savedLevel : defaultLevel;

        set(initialLevel);
        applyFontScale(initialLevel);

        return initialLevel;
      }
      return defaultLevel;
    },

    // Set font scale level
    setLevel: (level: FontScaleLevel) => {
      if (!isValidLevel(level)) return;

      set(level);

      if (browser) {
        storage.setItem(STORAGE_KEY, level.toString(), { serialize: false });
        applyFontScale(level);
      }
    },

    // Get scale value for a level
    getScale: (level: FontScaleLevel): number => {
      const option = fontScaleOptions.find((opt) => opt.level === level);
      return option?.scale ?? 1.0;
    },
  };
}

export const fontScale = createFontScaleStore();
