<script lang="ts">
  import { onMount } from 'svelte';
  import SettingsPanel from '$lib/components/furniture/SettingsPanel.svelte';
  import { accessibility } from '$lib/stores/accessibility';
  import { theme } from '$lib/stores/theme';
  import { navbarDisplay } from '$lib/stores/navbarDisplay';
  import { homepageLayout } from '$lib/stores/homepageLayout';

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

  <SettingsPanel standalone={true} />
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
</style>
