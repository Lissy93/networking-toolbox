/**
 * Validation composable for reactive validation logic
 * Provides a consistent pattern for form validation across components
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Create a reactive validation state
 * @param validator - Function that returns validation result
 * @returns Object with reactive isValid property and error message
 * @example
 * const validation = useValidation(() => {
 *   if (!input.trim()) return { isValid: false, error: 'Required' };
 *   return { isValid: true };
 * });
 */
export function useValidation(validator: () => ValidationResult) {
  const result = $derived(validator());

  return {
    get isValid() {
      return result.isValid;
    },
    get error() {
      return result.error;
    },
  };
}

/**
 * Create a simple boolean validation
 * @param validator - Function that returns boolean
 * @returns Object with reactive isValid property
 * @example
 * const validation = useSimpleValidation(() => input.length > 0);
 */
export function useSimpleValidation(validator: () => boolean) {
  const isValid = $derived(validator());

  return {
    get isValid() {
      return isValid;
    },
  };
}
