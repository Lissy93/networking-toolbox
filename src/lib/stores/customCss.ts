import { writable } from 'svelte/store';
import { storage } from '$lib/utils/localStorage';

const STORAGE_KEY = 'user-custom-css';

// Dangerous patterns to block
const SECURITY_PATTERNS = [
  /javascript:/gi,
  /<script/gi,
  /<\/script>/gi,
  /eval\(/gi,
  /expression\(/gi,
  /behavior:/gi,
  /-moz-binding:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
];

// Check for external imports (potential tracking)
const EXTERNAL_IMPORT = /@import\s+url\(['"]?https?:\/\//gi;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateCustomCss(css: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for security issues
  for (const pattern of SECURITY_PATTERNS) {
    if (pattern.test(css)) {
      errors.push(`Security risk detected: ${pattern.source}`);
    }
  }

  // Check for external imports
  if (EXTERNAL_IMPORT.test(css)) {
    warnings.push('External @import detected - may affect privacy and performance');
  }

  // Basic CSS syntax check - just check for balanced braces
  const openBraces = (css.match(/\{/g) || []).length;
  const closeBraces = (css.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Unbalanced braces - check your CSS syntax');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function createCustomCssStore() {
  const { subscribe, set } = writable<string>('');

  return {
    subscribe,
    init: () => {
      const stored = storage.getItem(STORAGE_KEY, {
        defaultValue: '',
        serialize: false,
      });
      if (stored) set(stored);
    },
    set: (css: string) => {
      storage.setItem(STORAGE_KEY, css, { serialize: false });
      set(css);
    },
    clear: () => {
      storage.removeItem(STORAGE_KEY);
      set('');
    },
    validate: validateCustomCss,
  };
}

export const customCss = createCustomCssStore();
