<script lang="ts">
  import { onMount } from 'svelte';
  import { bookmarks } from '$lib/stores/bookmarks';
  import BookmarksGrid from '$lib/components/global/BookmarksGrid.svelte';
  import Icon from '$lib/components/global/Icon.svelte';

  let isOnline = true;

  onMount(() => {
    isOnline = navigator.onLine;

    const handleOnline = () => {
      isOnline = true;
      setTimeout(() => (window.location.href = '/'), 1000);
    };

    const handleOffline = () => {
      isOnline = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
</script>

<svelte:head>
  <title>Offline - Networking Toolbox</title>
  <meta name="description" content="Offline mode - your bookmarked tools are still available" />
</svelte:head>

<div class="offline-page card">
  <div class="status-section">
    <Icon name={isOnline ? 'online' : 'offline'} size="lg" />

    <h1>
      {isOnline ? 'Back Online' : "You're Offline"}
    </h1>

    <p class="status" class:online={isOnline} class:offline={!isOnline}>
      {isOnline ? 'Connection restored! Redirecting...' : 'Your bookmarked tools work offline'}
    </p>
  </div>

  {#if $bookmarks.length > 0}
    <div class="bookmarks-section">
      <BookmarksGrid />
    </div>
  {:else}
    <div class="empty-state">
      <p>No bookmarked tools yet</p>
      <a href="/">Browse Tools</a>
    </div>
  {/if}
</div>

<style lang="scss">
  .offline-page {
    width: 100%;
    max-width: none;
    padding: 2rem;
  }

  .status-section {
    text-align: center;
    margin-bottom: 3rem;

    h1 {
      margin: 1rem 0 0.5rem;
    }

    .status {
      font-weight: 500;
      padding: 0.75rem;
      border-radius: var(--radius);

      &.online {
        color: var(--color-success);
        background: color-mix(in srgb, var(--color-success), transparent 90%);
      }

      &.offline {
        color: var(--color-warning);
        background: color-mix(in srgb, var(--color-warning), transparent 90%);
      }
    }
  }

  .empty-state {
    text-align: center;
    color: var(--color-text-muted);

    a {
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
</style>
