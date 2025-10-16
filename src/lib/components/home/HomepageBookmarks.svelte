<script lang="ts">
  import { onMount } from 'svelte';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import SegmentedControl from '$lib/components/global/SegmentedControl.svelte';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { frequentlyUsedTools, recentlyUsedTools } from '$lib/stores/toolUsage';

  onMount(() => {
    bookmarks.init();
  });

  type ViewMode = 'bookmarks' | 'most-used' | 'recent';
  let activeView = $state<ViewMode>('bookmarks');

  const viewOptions = [
    { value: 'bookmarks' as const, label: 'Bookmarks', icon: 'bookmarks' },
    { value: 'most-used' as const, label: 'Most Used', icon: 'frequently-used' },
    { value: 'recent' as const, label: 'Recent', icon: 'clock' },
  ];

  const bookmarkCount = $derived($bookmarks.length);
  const mostUsedCount = $derived($frequentlyUsedTools.length);
  const recentCount = $derived($recentlyUsedTools.length);

  let showAll = $state(false);

  // Reset showAll when switching views
  $effect(() => {
    // Track activeView to reset showAll when it changes
    void activeView;
    showAll = false;
  });

  // Determine if current view has items
  const hasItems = $derived(() => {
    if (activeView === 'bookmarks') return bookmarkCount > 0;
    if (activeView === 'most-used') return mostUsedCount > 0;
    if (activeView === 'recent') return recentCount > 0;
    return false;
  });

  // Convert tool usage to NavItem format
  const mostUsedItems = $derived(
    $frequentlyUsedTools.map((tool) => ({
      href: tool.href,
      label: tool.label || 'Tool',
      icon: tool.icon,
      description: tool.description,
      keywords: [],
    })),
  );

  const recentItems = $derived(
    $recentlyUsedTools.map((tool) => ({
      href: tool.href,
      label: tool.label || 'Tool',
      icon: tool.icon,
      description: tool.description,
      keywords: [],
    })),
  );

  const bookmarkItems = $derived(
    $bookmarks.map((bookmark) => ({
      href: bookmark.href,
      label: bookmark.label,
      icon: bookmark.icon,
      description: bookmark.description,
      keywords: [],
    })),
  );
</script>

<div class="bookmarks-page">
  <div class="bookmarks-container" aria-live="polite">
    <div class="bookmarks-header">
      <div class="tools-grid-sub-header">
        {#if activeView === 'bookmarks'}
          <Icon name="bookmarks" size="sm" />
          <h2>Bookmarked Tools</h2>
          <span class="count">{bookmarkCount}</span>
        {:else if activeView === 'most-used'}
          <Icon name="frequently-used" size="sm" />
          <h2>Most Used</h2>
          <span class="count">{mostUsedCount}</span>
        {:else if activeView === 'recent'}
          <Icon name="clock" size="sm" />
          <h2>Recent</h2>
          <span class="count">{recentCount}</span>
        {/if}
      </div>

      <SegmentedControl options={viewOptions} bind:value={activeView} onchange={(value) => (activeView = value)} />
    </div>

    <div class="bookmarks-grid">
      {#if activeView === 'bookmarks'}
        {#if bookmarkCount > 0}
          <ToolsGrid tools={bookmarkItems} idPrefix="bookmarks" />
        {:else}
          <div class="empty-state">
            <div class="empty-icon">
              <Icon name="bookmarks" size="lg" />
            </div>
            <h3>No bookmarks yet</h3>
            <p>Hover over any tool card and click the bookmark icon to save your favorites</p>
          </div>
        {/if}
      {:else if activeView === 'most-used'}
        {#if mostUsedCount > 0}
          <ToolsGrid tools={mostUsedItems} idPrefix="most-used" />
        {:else}
          <div class="empty-state">
            <div class="empty-icon">
              <Icon name="frequently-used" size="lg" />
            </div>
            <h3>No usage data yet</h3>
            <p>Start using tools to see your most frequently used ones here</p>
          </div>
        {/if}
      {:else if activeView === 'recent'}
        {#if recentCount > 0}
          <ToolsGrid tools={recentItems} idPrefix="recent" />
        {:else}
          <div class="empty-state">
            <div class="empty-icon">
              <Icon name="clock" size="lg" />
            </div>
            <h3>No recent tools</h3>
            <p>Recently visited tools will appear here</p>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Button for showing all tools when current view has items -->
  {#if hasItems()}
    <div class="toggle-container">
      <button onclick={() => (showAll = !showAll)} class="toggle-button">
        {showAll ? 'Hide All Tools' : 'Show All Tools'}
      </button>
    </div>
  {/if}

  <!-- Show all tools when view is empty OR when Show All is toggled -->
  {#if !hasItems() || showAll}
    <div class="all-tools-section">
      <ToolsGrid />
    </div>
  {/if}
</div>

<style lang="scss">
  .bookmarks-page {
    animation: fadeIn 0.3s ease-out;
  }

  .bookmarks-container {
    animation: slideIn 0.3s ease-out;
  }

  .bookmarks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .bookmarks-grid {
    animation: subtleFadeIn 0.2s ease-out;
  }

  .empty-state {
    background: var(--bg-secondary);
    margin: var(--spacing-xl) auto;
    padding: var(--spacing-xl) var(--spacing-lg);
    border-radius: var(--radius-lg);
    text-align: center;
    opacity: 0.85;
    animation: fadeIn 0.2s ease;

    .empty-icon {
      :global(svg) {
        color: var(--text-secondary);
        opacity: 0.5;
      }
    }

    h3 {
      font-size: var(--font-size-lg);
      color: var(--text-primary);
      margin: var(--spacing-md) 0 var(--spacing-sm) 0;
    }

    p {
      color: var(--text-secondary);
      max-width: 24rem;
      margin: 0 auto;
      line-height: 1.5;
    }
  }

  .toggle-container {
    display: flex;
    justify-content: center;
    margin: var(--spacing-xl) 0 var(--spacing-lg) 0;

    .toggle-button {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-primary);
      color: var(--bg-primary);
      font-size: var(--font-size-md);
      border-radius: var(--radius-sm);
      cursor: pointer;
      border: none;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-primary-hover);
      }
    }
  }

  .all-tools-section {
    margin-top: var(--spacing-xl);
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes subtleFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
