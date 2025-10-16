/**
 * Clipboard composable for copying text with auto-reset feedback
 * Replaces the repeated copiedState pattern across 81+ files
 */

import { errorManager } from '$lib/utils/error-manager';

export function useClipboard(autoResetMs: number = 1500) {
  let copiedStates = $state<Record<string, boolean>>({});

  /**
   * Copy text to clipboard with feedback
   * @param text - Text to copy
   * @param id - Unique identifier for this copy action (optional)
   */
  async function copy(text: string, id: string = 'default') {
    try {
      await navigator.clipboard.writeText(text);
      copiedStates[id] = true;
      setTimeout(() => {
        copiedStates[id] = false;
      }, autoResetMs);
      return true;
    } catch (error) {
      errorManager.captureException(error, 'warn', { component: 'Clipboard', action: 'copy', id });
      return false;
    }
  }

  /**
   * Check if a specific copy action is in "copied" state
   */
  function isCopied(id: string = 'default'): boolean {
    return copiedStates[id] ?? false;
  }

  /**
   * Reset a specific copy state
   */
  function reset(id: string = 'default') {
    copiedStates[id] = false;
  }

  /**
   * Reset all copy states
   */
  function resetAll() {
    copiedStates = {};
  }

  return {
    get copiedStates() {
      return copiedStates;
    },
    copy,
    isCopied,
    reset,
    resetAll,
  };
}
