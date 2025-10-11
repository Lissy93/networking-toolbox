<script lang="ts">
  import { site, about } from '$lib/constants/site';
  import type { NavItem } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import SearchFilter from '$lib/components/furniture/SearchFilter.svelte';
  import BookmarksGrid from '$lib/components/global/BookmarksGrid.svelte';
  import FrequentlyUsedGrid from '$lib/components/global/FrequentlyUsedGrid.svelte';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { frequentlyUsedTools } from '$lib/stores/toolUsage';
  import Icon from '$lib/components/global/Icon.svelte';

  interface Props {
    toolPages: NavItem[];
    referencePages: NavItem[];
  }

  let { toolPages, referencePages }: Props = $props();

  let filteredTools: NavItem[] = $state(toolPages);
  let filteredReference: NavItem[] = $state(referencePages);
  let searchQuery: string = $state('');

  // Combined filtered list
  let allFiltered = $derived([...filteredTools, ...filteredReference]);

  // Update filtered items when search changes
  $effect(() => {
    if (searchQuery.trim() === '') {
      filteredTools = toolPages;
      filteredReference = referencePages;
    } else {
      const query = searchQuery.toLowerCase().trim();
      filteredTools = toolPages.filter(
        (tool) =>
          tool.label.toLowerCase().includes(query) ||
          tool.description?.toLowerCase().includes(query) ||
          tool.keywords?.some((keyword) => keyword.toLowerCase().includes(query)),
      );
      filteredReference = referencePages.filter(
        (page) =>
          page.label.toLowerCase().includes(query) ||
          page.description?.toLowerCase().includes(query) ||
          page.keywords?.some((keyword) => keyword.toLowerCase().includes(query)),
      );
    }
  });
</script>

<!-- Hero Section -->
<section class="hero">
  <div class="hero-content">
    <h2>{site.title}</h2>
    <p class="hero-description">{about.line1}</p>
    <a href="/sitemap" class="sitemap-link">Sitemap</a>
  </div>
</section>

<!-- Search Filter -->
<SearchFilter bind:filteredTools={allFiltered} bind:searchQuery />

{#if searchQuery.trim() === ''}
  <!-- Bookmarks Section -->
  <BookmarksGrid hideOther={true} />

  <!-- Frequently Used Tools Section -->
  <FrequentlyUsedGrid hideOther={true} />

  <!-- Show "All Tools" heading if there are bookmarks or frequently used tools -->
  {#if $bookmarks.length > 0 || $frequentlyUsedTools.length > 0}
    <section class="tools-grid-sub-header">
      <Icon name="network-port" size="md" />
      <h2>All Tools</h2>
      <span class="count">{toolPages.length + referencePages.length}</span>
    </section>
  {/if}

  <!-- Tools Grid -->
  <ToolsGrid idPrefix="tools" tools={filteredTools} {searchQuery} />

  <!-- Reference Pages Section -->
  {#if filteredReference.length > 0}
    <section class="reference-section">
      <div class="section-header">
        <h2>Reference & Documentation</h2>
        <p class="section-description">
          Comprehensive reference materials and documentation for network professionals.
        </p>
      </div>
      <ToolsGrid idPrefix="reference" tools={filteredReference} {searchQuery} />
    </section>
  {/if}
{:else}
  <!-- Combined Search Results -->
  <ToolsGrid idPrefix="search" tools={allFiltered} {searchQuery} />
{/if}

<style lang="scss">
  .sitemap-link {
    display: none;
  }
  /* Homepage specific styles */
  .hero {
    text-align: center;
    padding: var(--spacing-xl) 0 var(--spacing-sm);
    .hero-content {
      max-width: 900px;
      margin: 0 auto;
      h2 {
        font-size: var(--font-size-3xl);
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: var(--spacing-md);
        line-height: 1.2;
        @media (max-width: 768px) {
          font-size: var(--font-size-xl);
        }
      }

      .hero-description {
        font-size: var(--font-size-lg);
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0;
        @media (max-width: 768px) {
          font-size: var(--font-size-md);
        }
      }
    }
  }

  .reference-section {
    margin-top: var(--spacing-xl);

    .section-header {
      text-align: center;
      margin-bottom: var(--spacing-lg);

      h2 {
        font-size: var(--font-size-xl);
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: var(--spacing-sm);
      }

      .section-description {
        font-size: var(--font-size-md);
        color: var(--text-secondary);
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.6;
      }
    }
  }
</style>
