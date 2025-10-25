<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { browser } from '$app/environment';
  import { accessibility } from '$lib/stores/accessibility';
  import { theme } from '$lib/stores/theme';
  import { navbarDisplay } from '$lib/stores/navbarDisplay';
  import { homepageLayout } from '$lib/stores/homepageLayout';
  import SettingsPanel from '$lib/components/furniture/SettingsPanel.svelte';

  let isOpen = $state(false);
  let menuRef = $state<HTMLDivElement>();
  let triggerRef = $state<HTMLButtonElement>();

  // Shortcut key detection
  const isMac = browser && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘' : 'Ctrl';

  // Handle clicks outside menu
  function handleClickOutside(event: MouseEvent) {
    if (isOpen && menuRef && !menuRef.contains(event.target as Node) && !triggerRef?.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      isOpen = false;
      triggerRef?.focus();
    }
  }

  // Handle global keyboard shortcuts
  function handleGlobalKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === ',') {
      event.preventDefault();
      isOpen = !isOpen;
    }
  }

  // Handle close from panel
  function handleClose() {
    isOpen = false;
  }

  // Handle double-click to navigate to settings page
  function handleDoubleClick() {
    goto('/settings');
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleGlobalKeydown);

    // Initialize stores
    accessibility.init();
    theme.init();
    navbarDisplay.init();
    homepageLayout.init();

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  });
</script>

<div class="settings-menu" bind:this={menuRef}>
  <button
    bind:this={triggerRef}
    class="action-button settings-trigger"
    onclick={() => (isOpen = !isOpen)}
    ondblclick={handleDoubleClick}
    aria-label="Open Settings"
    aria-expanded={isOpen}
    aria-haspopup="menu"
    use:tooltip={`Settings (${shortcutKey}+,)`}
  >
    <Icon name="settings2" size="sm" />
  </button>

  {#if isOpen}
    <SettingsPanel onClose={handleClose} />
  {/if}
</div>

<style lang="scss">
  .settings-menu {
    position: relative;
  }

  .settings-trigger {
    :global(svg) {
      transition: transform var(--transition-normal);
    }

    &:hover {
      :global(svg) {
        transform: rotate(45deg);
      }
    }

    &[aria-expanded='true'] {
      background: var(--surface-active);
      color: var(--color-primary);
      border-color: var(--color-primary);

      :global(svg) {
        transform: rotate(45deg);
      }
    }
  }
</style>
