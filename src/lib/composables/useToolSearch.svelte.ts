import type { NavItem } from '$lib/constants/nav';

/**
 * Composable for searching and filtering tools
 * @param getTools Function that returns the array of tools to search through
 * @returns Object with query and filtered state that can be bound
 */
export function useToolSearch(getTools: () => NavItem[]) {
  const state = $state({
    query: '',
    filtered: getTools(),
  });

  // Update filtered whenever query or tools change
  $effect(() => {
    const tools = getTools();
    if (!state.query.trim()) {
      state.filtered = tools;
    } else {
      const normalizedQuery = state.query.toLowerCase().trim();
      state.filtered = tools.filter(
        (tool) =>
          tool.label.toLowerCase().includes(normalizedQuery) ||
          tool.description?.toLowerCase().includes(normalizedQuery) ||
          tool.keywords?.some((keyword) => keyword.toLowerCase().includes(normalizedQuery)),
      );
    }
  });

  return state;
}
