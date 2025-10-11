<script lang="ts">
  import { site } from '$lib/constants/site';
  import type { NavItem } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import SearchFilter from '$lib/components/furniture/SearchFilter.svelte';
  import { useToolSearch } from '$lib/composables/useToolSearch.svelte';

  interface Props {
    toolPages: NavItem[];
    referencePages: NavItem[];
  }

  let { toolPages, referencePages }: Props = $props();

  const search = useToolSearch(() => [...toolPages, ...referencePages]);
</script>

<!-- Minimal Hero Section -->
<section class="hero-minimal">
  <h1>{site.title}</h1>
</section>

<!-- Search Filter -->
<SearchFilter bind:filteredTools={search.filtered} bind:searchQuery={search.query} />

<!-- Compact Tools Grid -->
<ToolsGrid idPrefix="minimal" tools={search.filtered} searchQuery={search.query} />

<style lang="scss">
  .hero-minimal {
    text-align: center;
    padding: var(--spacing-lg) 0 var(--spacing-md);

    h1 {
      font-size: var(--font-size-2xl);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.3;

      @media (max-width: 768px) {
        font-size: var(--font-size-xl);
      }
    }
  }
</style>
