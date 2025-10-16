<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import Icon from '$lib/components/global/Icon.svelte';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { formatShortcut } from '$lib/utils/keyboard';
  import SegmentedControl from '$lib/components/global/SegmentedControl.svelte';

  interface Shortcut {
    keys: string;
    description: string;
    category?: string;
  }

  let isOpen = $state(false);

  const shortcuts: Shortcut[] = [
    { keys: '^K', description: 'Open search', category: 'Navigation' },
    { keys: '^,', description: 'Open settings', category: 'Navigation' },
    { keys: '^M', description: 'Toggle menu', category: 'Navigation' },
    { keys: '^H', description: 'Go to homepage', category: 'Navigation' },
    // { keys: '^B', description: 'Open bookmarks', category: 'Navigation' },
    { keys: '^/', description: 'Show shortcuts', category: 'Navigation' },
    { keys: '^1-9', description: 'Jump to bookmarked tool', category: 'Bookmarks' },
    { keys: 'Esc', description: 'Close dialogs/clear', category: 'General' },
  ];

  function openDialog() {
    isOpen = true;
    // Push a new history state when opening dialog on mobile
    if (browser && window.innerWidth <= 768) {
      window.history.pushState({ shortcutsOpen: true }, '', window.location.href);
    }
  }

  export function showDialog() {
    openDialog();
  }

  function handleKeydown(e: KeyboardEvent) {
    // Ctrl + / to toggle
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      if (isOpen) {
        close();
      } else {
        openDialog();
      }
    }
    // Escape to close
    else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  }

  function close() {
    isOpen = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  onMount(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeydown);

      // Handle browser back button on mobile
      const handlePopState = (e: PopStateEvent) => {
        if (isOpen && window.innerWidth <= 768) {
          e.preventDefault();
          close();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('keydown', handleKeydown);
    }
  });

  // Group shortcuts by category
  const groupedShortcuts = $derived(() => {
    const groups: Record<string, Shortcut[]> = {};
    shortcuts.forEach((shortcut) => {
      const category = shortcut.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(shortcut);
    });
    return groups;
  });

  const viewOptions = [
    { label: 'Keyboard Shortcuts', value: 'keyboard-shortcuts', icon: 'keyboard' },
    { label: 'About', value: 'about', icon: 'info' },
  ];

  let activeView = $state('keyboard-shortcuts');

  // Compute dialog title based on active view
  const dialogTitle = $derived(activeView === 'keyboard-shortcuts' ? 'Command Palette' : 'Networking Toolbox');

  // Close dialog when clicking links in About tab
  function handleLinkClick() {
    if (activeView === 'about') {
      close();
    }
  }
</script>

{#if isOpen}
  <div class="shortcuts-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="shortcuts-dialog" role="dialog" aria-labelledby="shortcuts-title" aria-modal="true">
      <div class="dialog-header">
        <div class="dialog-header-main">
          <h2 id="shortcuts-title">{dialogTitle}</h2>
          <div>
            <SegmentedControl
              hideLabel={true}
              options={viewOptions}
              bind:value={activeView}
              onchange={(value) => (activeView = value)}
            />
          </div>
        </div>
        <button class="close-btn" onclick={close} aria-label="Close shortcuts">
          <Icon name="x" size="sm" />
        </button>
      </div>

      {#if activeView === 'keyboard-shortcuts'}
        <div class="shortcuts-content">
          {#each Object.entries(groupedShortcuts()) as [category, items] (category)}
            <div class="shortcuts-category">
              <h3>{category}</h3>
              <ul>
                {#each items as shortcut (shortcut.keys)}
                  <li>
                    <kbd>{formatShortcut(shortcut.keys)}</kbd>
                    <span>{shortcut.description}</span>
                  </li>
                {/each}
              </ul>

              <!-- Show bookmarked tools if in Bookmarks category -->
              {#if category === 'Bookmarks' && $bookmarks.length > 0}
                <details class="bookmarks-details">
                  <summary>Your bookmarked tools ({Math.min($bookmarks.length, 9)})</summary>
                  <ul class="bookmarks-list">
                    {#each $bookmarks.slice(0, 10) as bookmark, index (bookmark.href)}
                      <li>
                        <kbd>{formatShortcut(`^${index + 1 === 10 ? 0 : index + 1}`)}</kbd>
                        <span>{bookmark.label}</span>
                      </li>
                    {/each}
                    {#if $bookmarks.length <= 9}
                      <li>
                        <kbd>{formatShortcut('^0')}</kbd>
                        <span>Homepage</span>
                      </li>
                    {/if}
                    <li>
                      <kbd>{formatShortcut('^B')}</kbd>
                      <span>View all Bookmarks</span>
                    </li>
                  </ul>
                </details>
              {/if}

              {#if category === 'Bookmarks' && $bookmarks.length === 0}
                <p class="no-bookmarks-tip">
                  <i>You don't have any bookmarks yet.</i>
                  <span>Right-click on a tool to bookmark it for quick access and offline use.</span>
                </p>
              {/if}
            </div>
          {/each}
        </div>
      {:else if activeView === 'about'}
        <div class="about-content">
          <p>
            Networking Toolbox is an open-source collection of web-based networking tools designed to make
            network-related tasks quicker and easier.
          </p>
          <p>
            With 100+ tools, it's privacy-focused and self-hostable, fully customizable, and includes a free REST API
            for automation.
          </p>
          <ul>
            <li><a href="https://github.com/lissy93/networking-toolbox" onclick={handleLinkClick}>GitHub</a></li>
            <li><a href="/sitemap" onclick={handleLinkClick}>Page Listing</a></li>
            <li><a href="/settings" onclick={handleLinkClick}>App Settings</a></li>
            <li><a href="/about" onclick={handleLinkClick}>Documentation</a></li>
            <li><a href="/about/support" onclick={handleLinkClick}>Support</a></li>
            <li><a href="/about/legal" onclick={handleLinkClick}>Legal</a></li>
          </ul>
          <p class="sponsor">
            <Icon name="heart" size="md" />
            <span>
              <b>Finding Networking Toolbox useful?</b>
              Consider <a href="https://github.com/sponsors/Lissy93">sponsoring us on GitHub</a> to support ongoing development!
            </span>
          </p>

          <div class="about-license-section">
            <a
              href="https://github.com/lissy93/networking-toolbox"
              target="_blank"
              rel="noopener"
              onclick={handleLinkClick}>Networking Toolbox</a
            >
            v{import.meta.env.VITE_APP_VERSION}, licensed under
            <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener" onclick={handleLinkClick}
              >MIT</a
            >
            &copy; {new Date().getFullYear()} Alicia Sykes
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .shortcuts-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md);
    animation: fadeIn 0.15s ease-out;

    @media (max-width: 768px) {
      padding: 0;
      align-items: stretch;
      background: var(--bg-primary);
    }
  }

  .shortcuts-dialog {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    max-width: 32rem;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideInScale 0.2s ease-out;
    min-height: 548px;

    @media (max-width: 768px) {
      max-width: 100%;
      height: 100vh;
      height: 100dvh;
      max-height: none;
      border-radius: 0;
      border: none;
      box-shadow: none;
      animation: slideInFromBottom var(--transition-normal);
      min-height: auto;
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--border-primary);
    .dialog-header-main {
      display: flex;
      width: 100%;
      padding-right: var(--spacing-sm);
      align-items: center;
      justify-content: space-between;
    }

    @media (max-width: 768px) {
      padding: var(--spacing-md);
      position: sticky;
      top: 0;
      background: var(--bg-primary);
      z-index: 10;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    h2 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;

    @media (max-width: 768px) {
      padding: var(--spacing-sm);
    }

    &:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
  }

  .shortcuts-content {
    padding: var(--spacing-md) var(--spacing-lg);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      padding: var(--spacing-md);
      flex: 1;
      -webkit-overflow-scrolling: touch;
    }
  }

  .shortcuts-category {
    h3 {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-sm) 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-md);
      padding: var(--spacing-xs) 0;

      kbd {
        display: inline-block;
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-family: var(--font-mono);
        color: var(--color-primary);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        min-width: 5rem;
        text-align: center;
        white-space: nowrap;
      }

      span {
        flex: 1;
        font-size: var(--font-size-sm);
        color: var(--text-primary);
      }
    }
  }

  .no-bookmarks-tip {
    display: flex;
    flex-direction: column;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    padding: var(--spacing-sm) var(--spacing-md);
    i {
      opacity: 0.8;
    }
  }

  .bookmarks-details {
    margin-top: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);

    summary {
      padding: var(--spacing-sm) var(--spacing-md);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-primary);
      user-select: none;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--bg-tertiary);
      }

      &::marker {
        color: var(--color-primary);
      }
    }

    .bookmarks-list {
      list-style: none;
      padding: 0 var(--spacing-md) var(--spacing-sm);
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        padding: var(--spacing-xs) 0;

        kbd {
          display: inline-block;
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-family: var(--font-mono);
          color: var(--color-primary);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          min-width: 4rem;
          text-align: center;
          white-space: nowrap;
        }

        span {
          flex: 1;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }
      }
    }
  }

  .about-content {
    padding: var(--spacing-md) var(--spacing-lg);

    p {
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
    .sponsor {
      font-size: var(--font-size-xs);
      color: var(--color-pink);
      background: color-mix(in srgb, var(--color-pink), transparent 90%);
      padding: var(--spacing-sm);
      border-radius: var(--radius-sm);
      border: 2px solid var(--color-pink);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin: var(--spacing-md) auto;
      a {
        color: var(--color-pink);
        text-decoration: underline;
      }
      opacity: 0;
      animation: fadeIn 1s ease-out 10s forwards;
    }
    .about-license-section {
      font-size: var(--font-size-xs);
      text-align: center;
      color: var(--text-secondary);
      a {
        color: var(--text-secondary);
        text-decoration: underline;
      }
    }
    ul {
      padding-left: var(--spacing-lg);
      margin: var(--spacing-lg) 0;
      li {
        a {
          color: var(--color-primary);
          text-decoration: underline;
        }
      }
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideInScale {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-1rem);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes slideInFromBottom {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
