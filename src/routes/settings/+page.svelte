<script lang="ts">
  import { onMount } from 'svelte';
  import SettingsPanel from '$lib/components/furniture/SettingsPanel.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { accessibility } from '$lib/stores/accessibility';
  import { theme } from '$lib/stores/theme';
  import { navbarDisplay } from '$lib/stores/navbarDisplay';
  import { homepageLayout } from '$lib/stores/homepageLayout';
  import { DISABLE_SETTINGS } from '$lib/config/customizable-settings';

  onMount(() => {
    // Initialize stores
    accessibility.init();
    theme.init();
    navbarDisplay.init();
    homepageLayout.init();
  });
</script>

<div class="settings-page">
  <div class="hero">
    <h1>Settings</h1>
    <p>Customize your experience with themes, layouts, and accessibility options.</p>
  </div>

  {#if DISABLE_SETTINGS}
    <div class="settings-disabled">
      <div class="disabled-icon">
        <Icon name="lock" size="xl" />
      </div>
      <h2>Settings Disabled</h2>
      <p>Settings for this instance have been disabled by your administrator.</p>
    </div>
  {:else}
    <SettingsPanel standalone={true} />
  {/if}
</div>

<style lang="scss">
  .settings-page {
    margin: 0 auto;
  }

  .hero {
    text-align: center;
    margin-bottom: var(--spacing-2xl);

    h1 {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--text-primary);
    }

    p {
      font-size: var(--font-size-md);
      color: var(--text-secondary);
      margin: 0;
    }
  }

  .settings-disabled {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--spacing-2xl);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    margin: var(--spacing-2xl) auto;
    max-width: 600px;

    .disabled-icon {
      margin-bottom: var(--spacing-lg);
      color: var(--text-tertiary);
      opacity: 0.5;

      :global(svg) {
        width: 4rem;
        height: 4rem;
      }
    }

    h2 {
      font-size: var(--font-size-xl);
      font-weight: 600;
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
    }

    p {
      font-size: var(--font-size-md);
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.6;
    }
  }
</style>
