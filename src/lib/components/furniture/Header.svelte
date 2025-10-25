<script lang="ts">
  import { site } from '$lib/constants/site';
  import { SITE_ICON, SITE_DESCRIPTION, DISABLE_SETTINGS } from '$lib/config/customizable-settings';
  import Icon from '$lib/components/global/Icon.svelte';
  import GlobalSearch from '$lib/components/global/GlobalSearch.svelte';
  import BurgerMenu from '$lib/components/furniture/BurgerMenu.svelte';
  import TopNav from '$lib/components/furniture/TopNav.svelte';
  import SettingsMenu from '$lib/components/furniture/SettingsMenu.svelte';
  import ShortcutsDialog from '$lib/components/furniture/ShortcutsDialog.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { formatShortcut } from '$lib/utils/keyboard';

  let globalSearchRef: GlobalSearch;
  let shortcutsDialogRef: ShortcutsDialog;

  const hasCustomLogo = SITE_ICON && SITE_ICON.trim() !== '';
</script>

<header class="header">
  <div class="container">
    <div class="header-content">
      <div class="logo">
        <div class="logo-icon">
          <a href="/" aria-label="Home">
            {#if hasCustomLogo}
              <img src={SITE_ICON} alt={site.name} class="logo-image" />
            {:else}
              <Icon name="networking" size="lg" />
            {/if}
          </a>
        </div>
        <div>
          <h1><a href="/">{site.title}</a></h1>
          <p class="subtitle">{SITE_DESCRIPTION || "The sysadmin's Swiss Army knife"}</p>
        </div>
      </div>

      <div class="header-actions">
        <TopNav />

        <div class="header-buttons">
          <GlobalSearch bind:this={globalSearchRef} />

          <button
            class="action-button shortcuts-trigger"
            onclick={() => shortcutsDialogRef?.showDialog()}
            aria-label="Keyboard shortcuts"
            use:tooltip={`Shortcuts (${formatShortcut('^/')})`}
          >
            <Icon name="cli" size="sm" />
          </button>

          {#if !DISABLE_SETTINGS}
            <SettingsMenu />
          {/if}

          <BurgerMenu />
        </div>
      </div>
    </div>
  </div>
</header>

<ShortcutsDialog bind:this={shortcutsDialogRef} />

<style lang="scss">
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0; // Allow flex children to shrink

    @media (max-width: 480px) {
      flex-direction: column;
      gap: var(--spacing-md);
    }
  }

  .logo {
    min-width: 15rem;
    flex-shrink: 0; // Prevent logo from shrinking
    background: var(--bg-secondary);
    z-index: 1;

    .logo-image {
      width: 2.5rem;
      height: 2.5rem;
      object-fit: contain;
      display: block;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    min-width: 0;
    flex: 1;
    justify-content: end;
  }

  .header-buttons {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-shrink: 0; // Always keep buttons visible
  }
</style>
