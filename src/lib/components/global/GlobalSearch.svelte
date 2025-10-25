<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Icon from './Icon.svelte';
  import { ALL_PAGES, STANDALONE_PAGES } from '$lib/constants/nav';
  import type { NavItem } from '$lib/constants/nav';
  import { site } from '$lib/constants/site';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { frequentlyUsedTools, toolUsage } from '$lib/stores/toolUsage';
  import { tooltip } from '$lib/actions/tooltip';
  import { formatShortcut } from '$lib/utils/keyboard';

  interface Props {
    embedded?: boolean; // Whether this is embedded in a page vs popup modal
  }

  let { embedded = false }: Props = $props();

  // Site Links for quick access
  const SITE_LINKS: NavItem[] = [
    STANDALONE_PAGES.find((p) => p.href === '/settings') || {
      href: '/settings',
      label: 'Settings',
      icon: 'settings2',
    },
    { href: '/about', label: 'About', icon: 'info' },
    { href: '/sitemap', label: 'Sitemap', icon: 'map' },
    { href: '/about/legal', label: 'Legal', icon: 'certificate' },
    { href: site.repo, label: 'GitHub', icon: 'github' },
  ];

  // Create reactive state using individual variables
  let isOpen = $state(false);
  let query = $state('');
  let results = $state<NavItem[]>([]);
  let selectedIndex = $state(0);
  let searchInput: HTMLInputElement | undefined = $state();

  // Levenshtein distance for fuzzy matching

  /**
   * Calculate the Levenshtein distance between two strings (aka similarity score)
   * Ok, chill before you scream "import a library"...
   * It's not as bad as it looks....  Basically, we're just creating a 2D array
   * and filling it in based on character comparisons. The array size is small
   * (query length x label length) so performance is not a big deal here.
   * It's just a rudimentary fuzzy search to catch typos and close matches.
   * @param a (string 1)
   * @param b (string 2)
   */
  function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0]![j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(matrix[i - 1]![j - 1]! + 1, matrix[i]![j - 1]! + 1, matrix[i - 1]![j]! + 1);
        }
      }
    }
    return matrix[b.length]![a.length]!;
  }

  // Get smart suggestions when no results
  function getSuggested(): NavItem[] {
    const fromStores = [...$frequentlyUsedTools, ...$bookmarks]
      .map((item) => ALL_PAGES.find((p) => p.href === item.href))
      .filter((item): item is NavItem => item !== undefined);

    const combined = [...fromStores, ...ALL_PAGES]
      .filter((item, idx, arr) => arr.findIndex((i) => i.href === item.href) === idx)
      .sort(() => Math.random() - 0.5);
    return combined.slice(0, 12);
  }

  function search(q: string): NavItem[] {
    if (!q.trim()) return [];

    const normalizedQuery = q.toLowerCase().trim();
    const tokens = normalizedQuery.split(/\s+/);
    const bookmarkedHrefs = new Set($bookmarks.map((b) => b.href));
    const frequentHrefs = new Set($frequentlyUsedTools.map((t) => t.href));

    const results = ALL_PAGES.map((page) => {
      let score = 0;
      const label = page.label.toLowerCase();
      const searchText = `${label} ${page.description || ''} ${page.keywords?.join(' ') || ''}`.toLowerCase();

      // Exact label match (highest priority)
      if (label === normalizedQuery) score += 1000;

      // Label starts with query
      if (label.startsWith(normalizedQuery)) score += 500;

      // Label contains query
      if (label.includes(normalizedQuery)) score += 200;

      // All tokens found
      if (tokens.every((token) => searchText.includes(token))) score += 100;

      // Keywords match
      if (page.keywords) {
        tokens.forEach((token) => {
          if (page.keywords!.some((kw) => kw.toLowerCase().includes(token))) score += 50;
        });
      }

      // Description match
      if (page.description && tokens.some((token) => page.description!.toLowerCase().includes(token))) {
        score += 25;
      }

      // Boost for bookmarked/frequent
      if (bookmarkedHrefs.has(page.href)) score += 15;
      if (frequentHrefs.has(page.href)) score += 10;

      return { ...page, score };
    })
      .filter((page) => page.score > 10)
      .sort((a, b) => b.score - a.score);

    // If few/no results and query is reasonable length, do fuzzy search
    if (results.length < 3 && normalizedQuery.length >= 2 && normalizedQuery.length <= 20) {
      const fuzzyResults = ALL_PAGES.map((page) => {
        let score = results.find((r) => r.href === page.href)?.score || 0;
        const label = page.label.toLowerCase();
        const words = label.split(/\s+/);
        let hasMeaningfulMatch = false;

        // Acronym match (e.g., "dc" matches "DNS Check")
        const acronym = words.map((w) => w[0]).join('');
        if (acronym === normalizedQuery) {
          score += 300;
          hasMeaningfulMatch = true;
        }
        if (acronym.startsWith(normalizedQuery)) {
          score += 150;
          hasMeaningfulMatch = true;
        }

        // Fuzzy string match with Levenshtein distance
        tokens.forEach((token) => {
          if (token.length < 2) return; // Skip single chars

          const distance = levenshtein(token, label);
          const similarity = 1 - distance / Math.max(token.length, label.length);
          if (similarity > 0.65) {
            score += Math.floor(similarity * 100);
            hasMeaningfulMatch = true;
          }

          // Check against individual words
          words.forEach((word) => {
            if (word.length < 2) return;
            const wordDist = levenshtein(token, word);
            const wordSim = 1 - wordDist / Math.max(token.length, word.length);
            if (wordSim > 0.7) {
              score += Math.floor(wordSim * 80);
              hasMeaningfulMatch = true;
            }
          });

          // Check keywords with fuzzy match
          page.keywords?.forEach((keyword) => {
            const kwDist = levenshtein(token, keyword.toLowerCase());
            const kwSim = 1 - kwDist / Math.max(token.length, keyword.length);
            if (kwSim > 0.75) {
              score += Math.floor(kwSim * 60);
              hasMeaningfulMatch = true;
            }
          });
        });

        // Partial word boundary match (only if token is significant portion of word)
        tokens.forEach((token) => {
          if (token.length >= 3) {
            words.forEach((word) => {
              if (word.includes(token) && token.length / word.length > 0.6) {
                score += 40;
                hasMeaningfulMatch = true;
              }
            });
          }
        });

        // Boost for bookmarked/frequent (but don't count as meaningful match)
        if (bookmarkedHrefs.has(page.href)) score += 15;
        if (frequentHrefs.has(page.href)) score += 10;

        return { ...page, score, hasMeaningfulMatch };
      })
        .filter((page) => page.score > 100 && page.hasMeaningfulMatch) // Must have meaningful match
        .sort((a, b) => b.score - a.score);

      return fuzzyResults.slice(0, 8);
    }

    return results.slice(0, 8);
  }

  // Using a separate internal function to avoid reactivity warnings
  function openSearch() {
    isOpen = true;
    // Push a new history state when opening search on mobile
    if (browser && window.innerWidth <= 768) {
      window.history.pushState({ searchOpen: true }, '', window.location.href);
    }
    setTimeout(() => searchInput?.focus(), 0);
  }

  export function showSearch() {
    openSearch();
  }

  function close() {
    isOpen = false;
    query = '';
    results = [];
    selectedIndex = 0;
  }

  function selectResult(index: number) {
    const result = results[index];
    if (result) {
      goto(result.href);
      if (!embedded) {
        close();
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        if (embedded) {
          // In embedded mode, just clear the input
          query = '';
          results = [];
          selectedIndex = 0;
        } else {
          // In modal mode, close the search
          close();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        selectResult(selectedIndex);
        break;
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  }

  $effect(() => {
    results = search(query);
    selectedIndex = 0;
  });

  onMount(() => {
    bookmarks.init();
    toolUsage.init();

    // Only register global keyboard shortcut for modal mode
    if (!embedded) {
      document.addEventListener('keydown', handleGlobalKeydown);

      // Handle browser back button on mobile
      const handlePopState = (e: PopStateEvent) => {
        if (isOpen && window.innerWidth <= 768) {
          e.preventDefault();
          close();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        document.removeEventListener('keydown', handleGlobalKeydown);
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      // In embedded mode, always show search and focus on mount
      isOpen = true;
      setTimeout(() => searchInput?.focus(), 100);
    }
  });

  export { showSearch };
</script>

<!-- Trigger Button (only in modal mode) -->
{#if !embedded}
  <button
    class="action-button search-trigger"
    onclick={openSearch}
    aria-label="Open search"
    use:tooltip={`Search (${formatShortcut('^K')})`}
  >
    <Icon name="search" size="sm" />
  </button>
{/if}

<!-- Search Content Snippet -->
{#snippet searchContent()}
  <div class="search-header">
    <Icon name="search" size="sm" />
    <input
      bind:this={searchInput}
      bind:value={query}
      onkeydown={handleKeydown}
      placeholder="Search tools and pages..."
      class="search-input"
      autocomplete="off"
      spellcheck="false"
    />
    {#if !embedded}
      <button class="close-btn" onclick={close} aria-label="Close search">
        <Icon name="x" size="sm" />
      </button>
    {/if}
  </div>

  {#if query.trim() && results.length > 0}
    <div class="search-results">
      {#each results as result, index (result.href)}
        <button
          class="result-item"
          class:selected={index === selectedIndex}
          onclick={() => selectResult(index)}
          onmouseenter={() => (selectedIndex = index)}
        >
          <div class="result-content">
            <div class="result-title">
              <Icon name={result.icon || 'search'} size="xs" />
              {result.label}
            </div>
            {#if result.description}
              <div class="result-description">{result.description}</div>
            {/if}
          </div>
          <div class="result-meta">
            {#if index === selectedIndex}
              <Icon name="link" size="xs" />
            {/if}
            <span class="result-path">{result.href}</span>
          </div>
        </button>
      {/each}
    </div>
  {:else if query.trim()}
    <div class="no-results">
      <Icon name="search" size="md" />
      <span>No results found for "{query}" (yet!)</span>
    </div>
    <div class="suggested-section">
      <div class="suggested-header">
        <Icon name="star" size="xs" />
        <span>Suggested</span>
      </div>
      <div class="suggested-list">
        {#each getSuggested() as item (item.href)}
          <button
            class="suggested-item"
            onclick={() => {
              goto(item.href);
              if (!embedded) close();
            }}
          >
            <Icon name={item.icon || 'search'} size="xs" />
            <span>{item.label}</span>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="search-help">
      <div class="help-item">
        <Icon name="search" size="xs" />
        <span>Search for tools, calculators, and diagnostics</span>
      </div>
      <div class="help-item">
        <Icon name="navigation" size="xs" />
        <span>Use ↑↓ to navigate, Enter to select</span>
      </div>
    </div>

    {#if $bookmarks.length > 0}
      <div class="bookmarks-section">
        <div class="bookmarks-header">
          <Icon name="bookmarks" size="xs" />
          <span>Bookmarked Tools</span>
        </div>
        <div class="bookmarks-list">
          {#each $bookmarks.slice(0, 6) as bookmark, _index (bookmark.href)}
            <button
              class="bookmark-item"
              onclick={() => {
                goto(bookmark.href);
                if (!embedded) close();
              }}
              tabindex="0"
            >
              <div class="bookmark-icon">
                <Icon name={bookmark.icon} size="xs" />
              </div>
              <span class="bookmark-label">{bookmark.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if $frequentlyUsedTools.length > 0}
      <div class="frequently-used-section">
        <div class="frequently-used-header">
          <Icon name="clock" size="xs" />
          <span>Most Used Tools</span>
        </div>
        <div class="frequently-used-list">
          {#each $frequentlyUsedTools.slice(0, 12) as tool, _index (tool.href)}
            <button
              class="frequently-used-item"
              onclick={() => {
                goto(tool.href);
                if (!embedded) close();
              }}
              tabindex="0"
            >
              <div class="frequently-used-icon">
                <Icon name={tool.icon || ''} size="xs" />
              </div>
              <span class="frequently-used-label">{tool.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="site-links-section">
      <div class="site-links-header">
        <Icon name="link" size="xs" />
        <span>Site Links</span>
      </div>
      <div class="site-links-list">
        {#each SITE_LINKS as link (link.href)}
          <button
            class="site-link-item"
            onclick={() => {
              goto(link.href);
              if (!embedded) close();
            }}
            tabindex="0"
          >
            <div class="site-link-icon">
              <Icon name={link.icon || 'link'} size="xs" />
            </div>
            <span class="site-link-label">{link.label}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/snippet}

<!-- Search Modal/Embedded -->
{#if isOpen}
  {#if embedded}
    <!-- Embedded mode: no overlay, direct content -->
    <div class="search-embedded" role="search">
      {@render searchContent()}
    </div>
  {:else}
    <!-- Modal mode: with overlay -->
    <div
      class="search-overlay"
      onclick={close}
      onkeydown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') close();
      }}
      role="button"
      tabindex="-1"
      aria-label="Close search"
    >
      <div
        class="search-modal"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => {
          if (e.key === 'Escape') close();
          e.stopPropagation();
        }}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        {@render searchContent()}
      </div>
    </div>
  {/if}
{/if}

<style lang="scss">
  .search-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 5;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    animation: fadeIn var(--transition-fast);

    @media (max-width: 768px) {
      padding: 0;
      align-items: stretch;
      background: var(--bg-primary);
    }
  }

  .search-modal {
    width: 100%;
    max-width: 600px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    animation: slideDown var(--transition-normal);

    @media (max-width: 768px) {
      max-width: 100%;
      height: 100vh;
      height: 100dvh;
      border-radius: 0;
      border: none;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      animation: slideInFromBottom var(--transition-normal);
    }
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-primary);

    @media (max-width: 768px) {
      padding: var(--spacing-md);
      position: sticky;
      top: 0;
      background: var(--bg-primary);
      z-index: 10;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: var(--font-size-lg);

      @media (max-width: 768px) {
        font-size: var(--font-size-md);
      }

      &::placeholder {
        color: var(--text-tertiary);
      }
    }

    .close-btn {
      padding: var(--spacing-xs);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);

      @media (max-width: 768px) {
        padding: var(--spacing-sm);
      }

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
    }
  }

  .search-results {
    max-height: 70vh;
    overflow-y: auto;

    @media (max-width: 768px) {
      max-height: none;
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
  }

  .result-item {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-secondary);
    cursor: pointer;
    text-align: left;
    transition: background var(--transition-fast);

    @media (max-width: 768px) {
      padding: var(--spacing-md);
      min-height: 60px;
    }

    &:hover,
    &.selected {
      background: var(--surface-hover);
      border-bottom: none;
    }

    &:last-child {
      border-bottom: none;
    }

    .result-content {
      flex: 1;
      min-width: 0;

      .result-title {
        color: var(--text-primary);
        font-weight: 500;
        margin-bottom: var(--spacing-xs);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        :global(svg) {
          color: var(--text-tertiary);
        }
      }

      .result-description {
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }

    .result-meta {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      justify-content: end;
      .result-path {
        color: var(--text-tertiary);
        font-size: var(--font-size-xs);
        font-family: var(--font-mono);
      }
      :global(svg) {
        color: var(--text-tertiary);
      }
    }
  }

  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-2xl) var(--spacing-2xl) var(--spacing-md);
    color: var(--text-secondary);
    text-align: center;

    @media (max-width: 768px) {
      padding: var(--spacing-xl) var(--spacing-md) var(--spacing-md);
    }
  }

  .suggested-section {
    padding: var(--spacing-md) var(--spacing-lg) var(--spacing-lg);
    border-top: 1px solid var(--border-secondary);

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }
  }

  .suggested-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-sm);

    :global(svg) {
      color: var(--color-warning);
    }
  }

  .suggested-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .suggested-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
    max-width: 180px;

    &:hover,
    &:focus {
      background: var(--surface-hover);
      border-color: var(--color-warning);
      transform: translateY(-1px);
      outline: none;
    }

    &:active {
      transform: translateY(0);
    }

    span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--text-tertiary);
    }
  }

  .search-help {
    padding: var(--spacing-lg);
    border-top: 1px solid var(--border-secondary);

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }

    .help-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) 0;
      color: var(--text-tertiary);
      font-size: var(--font-size-sm);
    }
  }

  // Shared styles for quick access sections (bookmarks & frequently used & site links)
  .bookmarks-section,
  .frequently-used-section,
  .site-links-section {
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--border-secondary);

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }
  }

  .bookmarks-header,
  .frequently-used-header,
  .site-links-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-sm);
  }

  .bookmarks-list,
  .frequently-used-list,
  .site-links-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .bookmark-item,
  .frequently-used-item,
  .site-link-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
    max-width: 140px;

    &:hover,
    &:focus {
      background: var(--surface-hover);
      transform: translateY(-1px);
      outline: none;
    }

    &:active {
      transform: translateY(0);
    }
  }

  .bookmark-icon,
  .frequently-used-icon,
  .site-link-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    :global(svg) {
      color: var(--bg-primary);
    }
  }

  .bookmark-label,
  .frequently-used-label,
  .site-link-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  // Specific color variations
  .bookmarks-header :global(svg) {
    color: var(--color-primary);
  }

  .frequently-used-header :global(svg) {
    color: var(--color-info);
  }

  .site-links-header :global(svg) {
    color: var(--color-success);
  }

  .bookmark-item {
    &:hover,
    &:focus {
      border-color: var(--color-primary);
    }
  }

  .frequently-used-item {
    &:hover,
    &:focus {
      border-color: var(--color-info);
    }
  }

  .site-link-item {
    &:hover,
    &:focus {
      border-color: var(--color-success);
    }
  }

  .bookmark-icon {
    background: var(--color-primary);
  }

  .frequently-used-icon {
    background: var(--color-info);
  }

  .site-link-icon {
    background: var(--color-success);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes slideInFromBottom {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  // Embedded mode styles
  .search-embedded {
    width: 100%;
    margin: 0 auto;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    animation: fadeIn var(--transition-normal);

    .search-header {
      border-bottom: 1px solid var(--border-primary);
      background: var(--bg-secondary);
    }

    .search-help,
    .bookmarks-section,
    .frequently-used-section,
    .site-links-section {
      background: var(--bg-secondary);
    }
  }
</style>
