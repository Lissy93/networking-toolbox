<script lang="ts">
  import { site } from '$lib/constants/site';
  import { TOP_NAV, SUB_NAV, type NavItem } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import SearchFilter from '$lib/components/furniture/SearchFilter.svelte';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { frequentlyUsedTools, recentlyUsedTools } from '$lib/stores/toolUsage';
  import Icon from '$lib/components/global/Icon.svelte';
  import { extractNavItems } from '$lib/utils/nav';
  import QuickTips from '$lib/components/furniture/QuickTips.svelte';
  import KeyboardShortcutChip from '$lib/components/common/KeyboardShortcutChip.svelte';
  import { isStaticDeployment } from '$lib/utils/deployment';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    toolPages: NavItem[];
    referencePages: NavItem[];
  }

  let { toolPages, referencePages }: Props = $props();

  // Category configuration - easily extensible for future customization
  interface CategorySection {
    id: string;
    title: string;
    icon: string;
    basePath: string;
    items: NavItem[];
  }

  // Get appropriate icon for each category
  function getIconForCategory(path: string): string {
    const iconMap: Record<string, string> = {
      '/subnetting': 'network',
      '/cidr': 'layers',
      '/ip-address-convertor': 'hash',
      '/dns': 'server',
      '/diagnostics': 'activity',
      '/dhcp': 'wifi',
      '/reference': 'book-open',
    };
    return iconMap[path] || 'folder';
  }

  // Define desired category order using paths (more maintainable than indexes)
  const categoryOrder = ['/diagnostics', '/subnetting', '/dns', '/cidr', '/dhcp', '/reference'];

  // Memoized categories - computed once at module scope (static data)
  const categories: CategorySection[] = categoryOrder
    .map((path) => TOP_NAV.find((nav) => nav.href === path))
    .filter((nav): nav is NavItem => {
      if (!nav) return false;
      // Hide diagnostics in static deployments
      if (isStaticDeployment && nav.href === '/diagnostics') return false;
      return true;
    })
    .map((nav) => {
      const subItems = SUB_NAV[nav.href] || [];
      return {
        id: nav.href.slice(1), // Remove leading slash
        title: nav.label,
        icon: getIconForCategory(nav.href),
        basePath: nav.href,
        items: extractNavItems(subItems),
      };
    });

  // Get featured tools (up to 6)
  const featuredTools = $derived(
    toolPages
      .filter((tool) => tool.featured === true)
      // .sort(() => Math.random() - 0.5)
      .slice(0, 6),
  );

  // Convert tool usage to NavItem format
  const mostUsedItems = $derived(
    $frequentlyUsedTools.slice(0, 8).map((tool) => ({
      href: tool.href,
      label: tool.label || 'Tool',
      icon: tool.icon,
      description: tool.description,
    })),
  );

  const recentItems = $derived(
    $recentlyUsedTools.slice(0, 4).map((tool) => ({
      href: tool.href,
      label: tool.label || 'Tool',
      icon: tool.icon,
      description: tool.description,
    })),
  );

  let filteredTools: NavItem[] = $state([...toolPages, ...referencePages]);
  let searchQuery: string = $state('');
  let isSearchOpen: boolean = $state(false);
  let searchFilterRef: any = $state();

  // Update filtered items when search changes
  $effect(() => {
    const allPages = [...toolPages, ...referencePages];
    if (searchQuery.trim() === '') {
      filteredTools = allPages;
    } else {
      const query = searchQuery.toLowerCase().trim();
      filteredTools = allPages.filter(
        (tool) =>
          tool.label.toLowerCase().includes(query) ||
          tool.description?.toLowerCase().includes(query) ||
          tool.keywords?.some((keyword) => keyword.toLowerCase().includes(query)),
      );
    }
  });

  // Open shortcuts dialog by dispatching Ctrl+/
  function openShortcutsDialog() {
    const event = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  }

  // Open global search by dispatching Ctrl+K
  function openGlobalSearch() {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  // Handle keyboard typing to trigger local filter
  function handleKeyDown(e: KeyboardEvent) {
    // Ignore if modifier keys are pressed
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Ignore if special keys (except Escape)
    if (e.key.length > 1) {
      // Handle Escape to close filter
      if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        searchQuery = '';
        isSearchOpen = false;
      }
      return;
    }

    // Only alphanumeric characters and common punctuation
    if (/^[a-zA-Z0-9\s]$/.test(e.key)) {
      // Don't interfere if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Open local search if not already open and set the initial character
      if (searchFilterRef && !isSearchOpen) {
        e.preventDefault(); // Prevent default to capture the character
        searchQuery = e.key; // Set the initial character
        searchFilterRef.openSearch();
      }
    }
  }

  onMount(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeyDown);
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('keydown', handleKeyDown);
    }
  });
</script>

<!-- Hero -->
<section class="hero-categories">
  <div class="hero-bg"></div>
  <div class="hero-content">
    <h1>{site.title}</h1>
    <p class="hero-text">{site.heroDescription}</p>
  </div>
</section>

<!-- Search and Shortcuts Chips -->
{#if !isSearchOpen}
  <div class="shortcuts-wrapper">
    <KeyboardShortcutChip label="Search" shortcut="^K" onclick={openGlobalSearch} />
    <KeyboardShortcutChip label="Commands" shortcut="^/" onclick={openShortcutsDialog} />
  </div>
{/if}

<!-- Local Search Filter -->
<SearchFilter bind:this={searchFilterRef} bind:filteredTools bind:searchQuery bind:isSearchOpen />

<QuickTips />

{#if searchQuery.trim() === ''}
  <div class="categories-layout">
    <!-- Bookmarks or Featured Section -->
    {#if $bookmarks.length > 0}
      <section class="category-section bookmarks-section">
        <div class="section-header">
          <Icon name="bookmarks" size="md" />
          <h2>Bookmarked</h2>
          <span class="count">{$bookmarks.length}</span>
        </div>
        <ToolsGrid
          idPrefix="bookmarked"
          tools={$bookmarks.map((b) => ({
            href: b.href,
            label: b.label,
            icon: b.icon,
            description: b.description,
          }))}
          searchQuery=""
        />
      </section>
    {:else if featuredTools.length > 0}
      <section class="category-section bookmarks-section">
        <div class="section-header">
          <Icon name="star" size="md" />
          <h2>Featured</h2>
          <span class="count">{featuredTools.length}</span>
        </div>
        <ToolsGrid idPrefix="featured" tools={featuredTools} searchQuery="" />
      </section>
    {/if}

    <!-- Usage Row: Most Used (2/3) and Recently Used (1/3) -->
    {#if mostUsedItems.length > 0 || recentItems.length > 0}
      {@const hasBoth = mostUsedItems.length > 0 && recentItems.length > 0}
      <div class="usage-row" class:both={hasBoth}>
        {#if mostUsedItems.length > 0}
          <section class="category-section most-used">
            <div class="section-header">
              <Icon name="frequently-used" size="md" />
              <h2>Most Used</h2>
              <span class="count">{mostUsedItems.length}</span>
            </div>
            <ToolsGrid size="compact" idPrefix="most-used" tools={mostUsedItems} searchQuery="" />
          </section>
        {/if}

        {#if recentItems.length > 0}
          <section class="category-section recently-used">
            <div class="section-header">
              <Icon name="clock" size="md" />
              <h2>Recent</h2>
              <span class="count">{recentItems.length}</span>
            </div>
            <ToolsGrid size="compact" idPrefix="recent" tools={recentItems} searchQuery="" />
          </section>
        {/if}
      </div>
    {/if}

    <!-- Category Sections -->
    <div class="categories-grid">
      {#each categories as category (category.id)}
        {#if category.items.length > 0}
          <section class="category-section category-{category.id}">
            <div class="section-header">
              <Icon name={category.icon} size="md" />
              <h2>{category.title}</h2>
              <span class="count">{category.items.length}</span>
            </div>
            <ToolsGrid size="compact" idPrefix={category.id} tools={category.items} searchQuery="" />
          </section>
        {/if}
      {/each}
    </div>
  </div>
{:else}
  <!-- Search Results -->
  <ToolsGrid idPrefix="search" tools={filteredTools} {searchQuery} />
{/if}

<style lang="scss">
  .hero-categories {
    position: relative;
    text-align: center;
    padding: var(--spacing-2xl) var(--spacing-md) var(--spacing-xl);
    margin-bottom: var(--spacing-sm);
    overflow: hidden;
    border-radius: var(--radius-lg);

    .hero-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse at center,
        color-mix(in srgb, var(--color-primary), transparent 94%),
        transparent 60%
      );
      animation:
        bgFadeIn 1s ease-out,
        bgPulse 8s ease-in-out 1s infinite;
      z-index: 0;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      animation: heroFadeIn 0.8s ease-out;
    }

    h1 {
      font-size: var(--font-size-3xl);
      font-weight: 700;
      margin: 0 0 var(--spacing-sm);
      line-height: 1.2;
      animation: heroFadeIn 0.8s ease-out 0.1s both;

      @media (max-width: 768px) {
        font-size: var(--font-size-2xl);
      }
    }

    .hero-text {
      font-size: var(--font-size-lg);
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
      animation: heroFadeIn 0.8s ease-out 0.2s both;

      @media (max-width: 768px) {
        font-size: var(--font-size-md);
      }
    }
  }

  @keyframes bgFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes bgPulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  @keyframes heroFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .shortcuts-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    @media (max-width: 400px) {
      display: none;
    }
  }

  .categories-layout {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .category-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    background: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    box-shadow: var(--shadow-md);
    break-inside: avoid;
    page-break-inside: avoid;
    height: 100%;
    overflow-y: auto;
    animation: slideInFade 0.3s ease-out;

    // Custom scrollbar styling
    scrollbar-width: thin;
    scrollbar-color: var(--border-primary) transparent;

    &::-webkit-scrollbar {
      width: 0.5rem;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: var(--radius-md);
    }

    &::-webkit-scrollbar-thumb {
      background: var(--border-primary);
      border-radius: var(--radius-full);
      transition: background var(--transition-fast);

      &:hover {
        background: var(--border-secondary);
      }
    }

    @media (max-width: 768px) {
      max-height: none;
      overflow-y: visible;
    }
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    // padding-bottom: var(--spacing-sm);
    // border-bottom: 1px solid var(--border-secondary);

    h2 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      flex: 1;
    }

    .count {
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
      background: var(--bg-tertiary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-weight: 500;
    }

    :global(svg) {
      color: var(--color-primary);
      flex-shrink: 0;
    }
  }

  .category-diagnostics {
    grid-row: span 2;
  }

  .category-reference {
    grid-column: 1 / -1;
  }

  // Full width sections
  .full-width {
    grid-column: 1 / -1;
  }

  .bookmarks-section {
    background: none;
    border: none;
    box-shadow: none;
    grid-column: 1 / -1;
    max-height: none;
  }

  // Usage row: 2/3 and 1/3 split
  .usage-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);

    &.both {
      grid-template-columns: 2fr 1fr;
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr !important;
    }
  }

  // Categories grid - flexible masonry-like layout
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
    gap: var(--spacing-xl);
    align-items: start;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  @keyframes slideInFade {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
