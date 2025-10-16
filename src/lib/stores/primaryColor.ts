import { writable } from 'svelte/store';
import { storage } from '$lib/utils/localStorage';

const STORAGE_KEY = 'user-primary-color';
const HEX_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const isValidHexColor = (value: unknown): value is string => {
  return typeof value === 'string' && HEX_PATTERN.test(value);
};

function createPrimaryColorStore() {
  const { subscribe, set } = writable<string>('');

  return {
    subscribe,
    init: () => {
      const stored = storage.getItem(STORAGE_KEY, {
        defaultValue: '',
        validate: isValidHexColor,
        serialize: false,
      });
      if (stored) set(stored);
    },
    set: (color: string) => {
      const trimmed = color?.trim() || '';
      if (trimmed && isValidHexColor(trimmed)) {
        storage.setItem(STORAGE_KEY, trimmed, { serialize: false });
        set(trimmed);
      } else if (!trimmed) {
        storage.removeItem(STORAGE_KEY);
        set('');
      }
    },
    clear: () => {
      storage.removeItem(STORAGE_KEY);
      set('');
    },
  };
}

export const primaryColor = createPrimaryColorStore();
