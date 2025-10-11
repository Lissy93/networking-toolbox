<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Icon from './Icon.svelte';
  import { ALL_PAGES } from '$lib/constants/nav';
  import type { NavItem } from '$lib/constants/nav';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { frequentlyUsedTools, toolUsage } from '$lib/stores/toolUsage';
  import { tooltip } from '$lib/actions/tooltip';

  interface Props {
    embedded?: boolean; // Whether this is embedded in a page vs popup modal
  }

  let { embedded = false }: Props = $props();

  // Create reactive state using individual variables
  let isOpen = $state(false);
  let query = $state('');
  let results = $state<NavItem[]>([]);
  let selectedIndex = $state(0);
  let searchInput: HTMLInputElement | undefined = $state();

  const isMac = browser && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘' : 'Ctrl';

  function search(q: string): NavItem[] {
    if (!q.trim()) return [];

    const normalizedQuery = q.toLowerCase().trim();
    const tokens = normalizedQuery.split(/\s+/);

    return ALL_PAGES.map((page) => {
      let score = 0;
      const searchText = `${page.label} ${page.description || ''} ${page.keywords?.join(' ') || ''}`.toLowerCase();

      // Exact label match (highest priority)
      if (page.label.toLowerCase() === normalizedQuery) score += 1000;

      // Label starts with query
      if (page.label.toLowerCase().startsWith(normalizedQuery)) score += 500;

      // Label contains query
      if (page.label.toLowerCase().includes(normalizedQuery)) score += 200;

      // All tokens found
      const allTokensFound = tokens.every((token) => searchText.includes(token));
      if (allTokensFound) score += 100;

      // Keywords match
      if (page.keywords) {
        tokens.forEach((token) => {
          if (page.keywords!.some((keyword) => keyword.toLowerCase().includes(token))) {
            score += 50;
          }
        });
      }

      // Description match
      if (page.description && tokens.some((token) => page.description!.toLowerCase().includes(token))) {
        score += 25;
      }

      return { ...page, score };
    })
      .filter((page) => page.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
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
    use:tooltip={`Search (${shortcutKey}+K)`}
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
      <span>No results found for "{query}"</span>
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
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
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
    max-height: 60vh;
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
    padding: var(--spacing-2xl);
    color: var(--text-secondary);
    text-align: center;

    @media (max-width: 768px) {
      padding: var(--spacing-xl) var(--spacing-md);
      min-height: 50vh;
      justify-content: center;
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

  // Shared styles for quick access sections (bookmarks & frequently used)
  .bookmarks-section,
  .frequently-used-section {
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--border-secondary);

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }
  }

  .bookmarks-header,
  .frequently-used-header {
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
  .frequently-used-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .bookmark-item,
  .frequently-used-item {
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
  .frequently-used-icon {
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
  .frequently-used-label {
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

  .bookmark-icon {
    background: var(--color-primary);
  }

  .frequently-used-icon {
    background: var(--color-info);
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
    .frequently-used-section {
      background: var(--bg-secondary);
    }
  }
</style>
