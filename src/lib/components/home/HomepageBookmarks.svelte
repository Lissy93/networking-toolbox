<script lang="ts">
  import { onMount } from 'svelte';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import BookmarksGrid from '$lib/components/global/BookmarksGrid.svelte';
  import { bookmarks } from '$lib/stores/bookmarks';

  onMount(() => {
    bookmarks.init();
  });

  const bookmarkCount = $derived($bookmarks.length);
  let showAll = $state(false);
</script>

<BookmarksGrid />

<!-- Button for showing all tools, so user can find some to bookmark -->
{#if bookmarkCount > 0}
  <div class="toggle-container">
    <button onclick={() => (showAll = !showAll)} class="toggle-button">
      {showAll ? 'Hide All' : 'Show All'}
    </button>
  </div>
{/if}

<!-- Show all tools -->
{#if bookmarkCount === 0 || showAll}
  <ToolsGrid />
{/if}

<style lang="scss">
  .toggle-container {
    display: flex;
    justify-content: center;
    margin: var(--spacing-lg) 0;

    .toggle-button {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-primary);
      color: var(--bg-primary);
      font-size: var(--font-size-md);
      border-radius: var(--radius-sm);
      cursor: pointer;
      border: none;
      transition: background 0.3s ease;

      &:hover {
        background: var(--color-primary-hover);
      }
    }
  }
</style>
