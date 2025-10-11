<script lang="ts">
  import { ALL_PAGES, type NavItem } from '$lib/constants/nav';
  import Icon from '$lib/components/global/Icon.svelte';
  import { debounce } from '$lib/utils/debounce';

  let {
    filteredTools = $bindable(),
    searchQuery = $bindable(),
  }: {
    filteredTools: NavItem[];
    searchQuery: string;
  } = $props();

  let searchInput: HTMLInputElement | undefined = $state();
  let isSearchOpen: boolean = $state(false);

  // Weight different match types for relevance scoring
  const MATCH_WEIGHTS = {
    EXACT_TITLE: 100,
    TITLE_START: 80,
    TITLE_CONTAINS: 60,
    KEYWORD_EXACT: 50,
    KEYWORD_PARTIAL: 40,
    DESC_CONTAINS: 20,
    DESC_PARTIAL: 10,
  };

  // Calculate relevance score for search matching
  function calculateRelevance(item: NavItem, query: string): number {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return 0;

    const title = item.label.toLowerCase();
    const description = item.description?.toLowerCase() || '';
    const keywords = item.keywords?.map((k) => k.toLowerCase()) || [];

    let score = 0;

    // Title matches (highest priority)
    if (title === normalizedQuery) {
      score += MATCH_WEIGHTS.EXACT_TITLE;
    } else if (title.startsWith(normalizedQuery)) {
      score += MATCH_WEIGHTS.TITLE_START;
    } else if (title.includes(normalizedQuery)) {
      score += MATCH_WEIGHTS.TITLE_CONTAINS;
    }

    // Keyword matches
    for (const keyword of keywords) {
      if (keyword === normalizedQuery) {
        score += MATCH_WEIGHTS.KEYWORD_EXACT;
      } else if (keyword.includes(normalizedQuery)) {
        score += MATCH_WEIGHTS.KEYWORD_PARTIAL;
      }
    }

    // Description matches (lower priority)
    if (description.includes(normalizedQuery)) {
      score += MATCH_WEIGHTS.DESC_CONTAINS;
      // Bonus for partial word matches in description
      const words = normalizedQuery.split(' ');
      for (const word of words) {
        if (word.length > 2 && description.includes(word)) {
          score += MATCH_WEIGHTS.DESC_PARTIAL;
        }
      }
    }

    return score;
  }

  // Category priority for sorting (tools > reference)
  function getCategoryPriority(item: NavItem): number {
    if (item.href.startsWith('/reference/')) return 1; // Lower priority
    return 2; // Higher priority for tools
  }

  // Perform search with fuzzy matching and relevance scoring
  function performSearch(query: string): NavItem[] {
    if (!query.trim()) {
      return ALL_PAGES;
    }

    const results = ALL_PAGES.map((item) => ({
      item,
      relevance: calculateRelevance(item, query),
      categoryPriority: getCategoryPriority(item),
    }))
      .filter(({ relevance }) => relevance > 0)
      .sort((a, b) => {
        // First sort by category (tools before reference)
        if (a.categoryPriority !== b.categoryPriority) {
          return b.categoryPriority - a.categoryPriority;
        }
        // Then by relevance score
        return b.relevance - a.relevance;
      })
      .map(({ item }) => item);

    return results;
  }

  // Debounced search function (only debounce the filtering, not the input value)
  const debouncedSearch = debounce((...args: unknown[]) => {
    const query = (args[0] as string) ?? '';
    filteredTools = performSearch(query);
  }, 220);

  // Handle search input changes
  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    searchQuery = target.value;
    debouncedSearch(searchQuery);
  }

  // Open search input
  function openSearch() {
    isSearchOpen = true;
    // Focus input after it's rendered
    setTimeout(() => {
      if (searchInput) {
        searchInput.focus();
      }
    }, 0);
  }

  // Clear search and close input
  function clearSearch() {
    searchQuery = '';
    filteredTools = ALL_PAGES;
    isSearchOpen = false;
    if (searchInput) {
      searchInput.value = '';
    }
  }
</script>

<div class="search-container">
  <!-- Always reserve space for search input to prevent jumping -->
  <div class="search-wrapper">
    {#if !isSearchOpen}
      <!-- Search Chip -->
      <button class="search-chip" onclick={openSearch} aria-label="Open search">
        <span class="search-text">Filter</span>
        <span class="search-shortcut">⌘K</span>
      </button>
    {:else}
      <!-- Expanded Search Input -->
      <div class="search-input-wrapper" class:expanding={isSearchOpen}>
        <Icon name="search" />
        <input
          bind:this={searchInput}
          type="text"
          placeholder="Search tools and reference..."
          class="search-input"
          value={searchQuery}
          oninput={handleSearch}
        />
        <button class="close-search-button" onclick={clearSearch} aria-label="Close search">
          <Icon name="x" size="sm" />
        </button>
      </div>
    {/if}
  </div>

  <!-- Search results info with smooth height transition -->
  <div class="search-results-container" class:visible={isSearchOpen}>
    <div class="search-results-info">
      {#if searchQuery.length === 0}
        <span class="results-count">
          Start typing to search {ALL_PAGES.length} tools
        </span>
      {:else if filteredTools.length === 0}
        <span class="no-results">No results found</span>
      {:else}
        <span class="results-count">
          Showing {filteredTools.length} of {ALL_PAGES.length} tools
        </span>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .search-container {
    margin-bottom: var(--spacing-lg);
    text-align: center;
  }

  .search-wrapper {
    // Reserve consistent height to prevent content jumping
    min-height: 2.5rem; // Height of search chip
    display: flex;
    align-items: center;
    justify-content: center;
    transition: min-height var(--transition-normal) ease-out;

    // When search is open, increase height smoothly
    &:has(.search-input-wrapper) {
      min-height: 3rem; // Height of search input
    }
  }

  // Search Chip Styles
  .search-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-size: var(--font-size-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
    opacity: 1;
    transform: scale(1) translateY(0);

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
      transform: translateY(-1px) scale(1.02);
      box-shadow: var(--shadow-md);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &:active {
      transform: scale(0.98) translateY(1px);
      box-shadow: var(--shadow-sm);
    }

    // Subtle pulse animation on load
    animation: chipAppear 0.4s ease-out;

    .search-text {
      color: var(--text-primary);
      font-weight: 500;
    }

    .search-shortcut {
      background-color: var(--bg-tertiary);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-sm);
      padding: 2px var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
  }

  // Expanded Search Input Styles
  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
    transition: all var(--transition-normal) ease-out;

    // Animation when expanding
    &.expanding {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    :global(.icon) {
      position: absolute;
      left: var(--spacing-md);
      color: var(--text-secondary);
      pointer-events: none;
      z-index: 1;
      transition: color var(--transition-fast);
    }
  }

  .search-input {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-2xl);
    font-size: var(--font-size-md);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);
    font-family: var(--font-mono);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(227, 237, 112, 0.1);
    }

    &::placeholder {
      color: var(--text-secondary);
    }
  }

  .close-search-button {
    position: absolute;
    right: var(--spacing-md);
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md);

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  // Search results container with smooth height animation
  .search-results-container {
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: all var(--transition-normal) ease-out;

    &.visible {
      max-height: 3rem; // Enough for results info
      opacity: 1;
    }
  }

  .search-results-info {
    text-align: center;
    padding: var(--spacing-sm) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    transform: translateY(-8px);
    transition: transform var(--transition-normal) ease-out;

    .search-results-container.visible & {
      transform: translateY(0);
    }
  }

  .no-results {
    color: var(--color-warning);
    font-weight: 500;
  }

  .results-count {
    color: var(--text-secondary);
  }

  // Keyframe animations
  @keyframes chipAppear {
    0% {
      opacity: 0;
      transform: scale(0.9) translateY(4px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes inputExpand {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(-8px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (max-width: 768px) {
    .search-input-wrapper {
      max-width: none;
      margin: 0 var(--spacing-md);
    }

    .search-input {
      font-size: var(--font-size-sm);
    }

    .search-chip {
      font-size: var(--font-size-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
    }

    .search-wrapper {
      min-height: 2rem;

      &:has(.search-input-wrapper) {
        min-height: 2.5rem;
      }
    }
  }
</style>
