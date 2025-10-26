<script lang="ts">
  import { ALL_PAGES, type NavItem } from '$lib/constants/nav';
  import Icon from '$lib/components/global/Icon.svelte';
  import { debounce } from '$lib/utils/debounce';
  import { t } from '$lib/stores/language';

  let {
    filteredTools = $bindable(),
    searchQuery = $bindable(),
    isSearchOpen = $bindable(false),
  }: {
    filteredTools: NavItem[];
    searchQuery: string;
    isSearchOpen?: boolean;
  } = $props();

  let searchInput: HTMLInputElement | undefined = $state();

  // Expose openSearch method for parent components
  export function openSearch() {
    isSearchOpen = true;
    // Focus input after it's rendered
    setTimeout(() => {
      if (searchInput) {
        searchInput.focus();
      }
    }, 0);
  }

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

{#if isSearchOpen}
  <div class="search-container">
    <div class="search-input-wrapper">
      <Icon name="search" />
      <input
        bind:this={searchInput}
        type="text"
        placeholder={$t('furniture.search.placeholder')}
        class="search-input"
        value={searchQuery}
        oninput={handleSearch}
      />
      <button class="close-search-button" onclick={clearSearch} aria-label={$t('furniture.search.close')}>
        <Icon name="x" size="sm" />
      </button>
    </div>

    <!-- Search results info -->
    <div class="search-results-info">
      {#if searchQuery.length === 0}
        <span class="results-count">
          Start typing to search {ALL_PAGES.length} tools
        </span>
      {:else if filteredTools.length === 0}
        <span class="no-results">{$t('furniture.search.no_results')}</span>
      {:else}
        <span class="results-count">
          Showing {filteredTools.length} of {ALL_PAGES.length} tools
        </span>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .search-container {
    margin-bottom: var(--spacing-lg);
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    animation: slideIn 0.2s ease-out;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;

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

  .search-results-info {
    text-align: center;
    padding: var(--spacing-sm) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .no-results {
    color: var(--color-warning);
    font-weight: 500;
  }

  .results-count {
    color: var(--text-secondary);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .search-container {
      margin-left: var(--spacing-md);
      margin-right: var(--spacing-md);
    }

    .search-input {
      font-size: var(--font-size-sm);
    }
  }
</style>
