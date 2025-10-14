import { writable } from 'svelte/store';
import { storage } from '$lib/utils/localStorage';

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
      const stored = storage.getItem(STORAGE_KEY, { defaultValue: defaults });
      const loadedData = { ...defaults, ...stored };
      set(loadedData);
    },
    set: (data: SiteCustomization) => {
      storage.setItem(STORAGE_KEY, data);
      set(data);
    },
    clear: () => {
      storage.removeItem(STORAGE_KEY);
      set(defaults);
    },
    validate: validateSiteCustomization,
  };
}

export const siteCustomization = createSiteCustomizationStore();
