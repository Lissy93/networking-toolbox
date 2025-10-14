/**
 * Example selection management for diagnostic/tool pages
 * Handles example loading and selection tracking
 */

export function useExamples<T extends { [key: string]: any }>(examples: T[]) {
  let selectedIndex = $state<number | null>(null);

  function select(index: number) {
    selectedIndex = index;
  }

  function clear() {
    selectedIndex = null;
  }

  function isSelected(index: number): boolean {
    return selectedIndex === index;
  }

  function getSelected(): T | null {
    if (selectedIndex === null) return null;
    return examples[selectedIndex] ?? null;
  }

  return {
    get selectedIndex() {
      return selectedIndex;
    },
    select,
    clear,
    isSelected,
    getSelected,
  };
}
