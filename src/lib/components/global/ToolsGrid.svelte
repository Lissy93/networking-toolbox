<script lang="ts">
  import { ALL_PAGES } from '$lib/constants/nav';
  import ToolCard from './ToolCard.svelte';
  import NoResults from './NoResults.svelte';
  import type { NavItem } from '$lib/constants/nav';

  export let tools: NavItem[] = ALL_PAGES;
  export let searchQuery: string = '';
  export let idPrefix: string = 'main-';
  export let size: 'default' | 'small' | 'compact' = 'default';

  // Remove duplicates based on href, keeping the first occurrence
  // Also filter out items without a label
  $: uniqueTools = tools
    .filter((tool) => tool.label)
    .filter((tool, index, array) => array.findIndex((t) => t.href === tool.href) === index);

  // Dynamic minimum column width based on size
  $: minColWidth = size === 'compact' ? '140px' : size === 'small' ? '200px' : '280px';
</script>

{#if uniqueTools.length === 0 && searchQuery}
  <NoResults {searchQuery} />
{:else}
  <section class="tools-grid" class:compact={size === 'compact'} style="--min-col-width: {minColWidth};">
    {#each uniqueTools as tool (`${idPrefix}-${tool.href.replaceAll('/', '-')}`)}
      <ToolCard {tool} {size} />
    {/each}
  </section>
{/if}

<style lang="scss">
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--min-col-width, 280px)), 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    &.compact {
      gap: calc(var(--spacing-md) - 0.25rem);
    }
  }
</style>
