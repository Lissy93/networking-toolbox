<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import Icon from '$lib/components/global/Icon.svelte';
  import { isStaticDeployment } from '$lib/utils/deployment';
  import { onMount } from 'svelte';

  let isOffline = false;

  onMount(() => {
    if (browser) {
      // Check if browser is offline
      isOffline = !navigator.onLine;

      // Listen for online/offline events
      const handleOnline = () => (isOffline = false);
      const handleOffline = () => (isOffline = true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  });

  $: showWarning = isOffline || isStaticDeployment;
  $: currentPath = $page.url.pathname;
  $: publicUrl = `https://www.networkingtoolbox.net${currentPath}`;
</script>

{#if showWarning}
  <div class="warning-banner" role="alert" aria-live="polite">
    <div class="warning-content">
      <Icon name="warning" size="sm" />
      <div class="warning-text">
        <strong>Warning:</strong>
        {#if isOffline && isStaticDeployment}
          Diagnostic tools are unavailable while offline and on static deployments. Try using <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer">the public instance</a
          > instead.
        {:else if isOffline}
          Diagnostic tools are unavailable while offline. Try using <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer">the public instance</a
          > instead.
        {:else}
          Looks like you might have deployed your app to a static host. Since API endpoints are not available in your
          environment, this tool won't work as expected. You can use it <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer">here</a
          > instead.
        {/if}
      </div>
    </div>
  </div>
{/if}

<slot />

<style lang="scss">
  .warning-banner {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-warning), transparent 90%),
      color-mix(in srgb, var(--color-warning), transparent 95%)
    );
    border: 1px solid color-mix(in srgb, var(--color-warning), transparent 70%);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    animation: slideIn 0.3s ease-out;

    .warning-content {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
      max-width: 100%;
    }

    :global(.icon) {
      color: var(--color-warning);
    }

    .warning-text {
      color: var(--text-primary);
      font-size: 0.875rem;
      line-height: 1.5;
      flex: 1;
      min-width: 0;

      strong {
        font-weight: 600;
        color: var(--color-warning);
      }

      a {
        color: var(--color-primary);
        text-decoration: underline;
        font-weight: 500;

        &:hover {
          opacity: 0.8;
        }
      }
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
