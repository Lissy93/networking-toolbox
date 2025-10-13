import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'user-site-customization';

interface SiteCustomization {
  title: string;
  description: string;
  iconUrl: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const defaults: SiteCustomization = {
  title: '',
  description: '',
  iconUrl: '',
};

function validateSiteCustomization(data: SiteCustomization): ValidationResult {
  const errors: string[] = [];

  // Validate lengths
  if (data.title.length > 100) errors.push('Site title too long (max 100 characters)');
  if (data.description.length > 300) errors.push('Description too long (max 300 characters)');

  // Validate icon URL if provided
  if (data.iconUrl.trim()) {
    try {
      const url = new URL(data.iconUrl, window.location.origin);
      // Only allow http, https, data URLs
      if (!['http:', 'https:', 'data:'].includes(url.protocol)) {
        errors.push('Icon URL must use http, https, or data protocol');
      }
    } catch {
      // If it's not a full URL, check if it's a valid relative path
      if (!data.iconUrl.startsWith('/') && !data.iconUrl.startsWith('./')) {
        errors.push('Invalid icon URL format');
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

function createSiteCustomizationStore() {
  const { subscribe, set } = writable<SiteCustomization>(defaults);

  return {
    subscribe,
    init: () => {
      if (!browser) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const loadedData = { ...defaults, ...parsed };
          set(loadedData);
        } catch (e) {
          console.error('Failed to parse site customization:', e);
        }
      }
    },
    set: (data: SiteCustomization) => {
      if (!browser) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      set(data);
    },
    clear: () => {
      if (!browser) return;
      localStorage.removeItem(STORAGE_KEY);
      set(defaults);
    },
    validate: validateSiteCustomization,
  };
}

export const siteCustomization = createSiteCustomizationStore();
