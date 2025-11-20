<script lang="ts" context="module">
  // Helper functions for section titles and icons
  function getSectionTitle(sectionKey: string): string {
    const titleMap: Record<string, string> = {
      '/subnetting': 'Subnetting',
      '/cidr': 'CIDR Tools',
      '/ip-address-convertor': 'IP Tools',
      '/reference': 'Reference',
      '/dns': 'DNS',
      '/diagnostics': 'Diagnostics',
    };
    return titleMap[sectionKey] || sectionKey.replace('/', '').replace('-', ' ');
  }

  function _getSectionIcon(sectionKey: string): string {
    const iconMap: Record<string, string> = {
      '/subnetting': 'network',
      '/cidr': 'hash',
      '/ip-address-convertor': 'tool',
      '/reference': 'book-open',
    };
    return iconMap[sectionKey] || 'folder';
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { SUB_NAV } from '$lib/constants/nav';
  import Icon from '$lib/components/global/Icon.svelte';
  import { type NavItem, type NavGroup, footerLinks } from '$lib/constants/nav';
  import { site, author, license } from '$lib/constants/site';
  import { tooltip } from '$lib/actions/tooltip';
  import { browser } from '$app/environment';
  import { t } from '$lib/stores/language';

  export let isOpen = false;

  let menuElement: HTMLElement;
  let menuContentElement: HTMLElement;
  let focusableElements: HTMLElement[] = [];

  // Shortcut key detection
  const isMac = browser && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘' : 'Ctrl';

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (isOpen && menuElement && !menuElement.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  // Close menu on escape key and handle tab trapping
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      isOpen = false;
      return;
    }

    // Tab trapping when menu is open
    if (event.key === 'Tab' && isOpen) {
      trapFocus(event);
    }
  }

  // Handle global keyboard shortcuts
  function handleGlobalKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'm') {
      event.preventDefault();
      isOpen = !isOpen;
    }
  }

  // Focus trapping for accessibility
  function trapFocus(event: KeyboardEvent) {
    if (!menuContentElement) return;

    const focusableSelector = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
    focusableElements = Array.from(menuContentElement.querySelectorAll(focusableSelector));

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  // Update focusable elements tabindex based on menu state
  function updateTabIndexes() {
    if (!menuContentElement) return;

    const focusableSelector = 'a[href], button, input, textarea, select';
    const elements = menuContentElement.querySelectorAll(focusableSelector);

    elements.forEach((element) => {
      if (isOpen) {
        element.removeAttribute('tabindex');
      } else {
        element.setAttribute('tabindex', '-1');
      }
    });
  }

  // Toggle menu
  function toggleMenu() {
    isOpen = !isOpen;
  }

  // Close menu when clicking a link
  function handleLinkClick() {
    isOpen = false;
  }

  // Check if a link is currently active
  function isActiveLink(href: string): boolean {
    const pathname = $page.url?.pathname ?? '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  // Get nav groups for organized display
  function getNavGroups(items: (NavItem | NavGroup)[]): { title: string; items: NavItem[] }[] {
    const groups: { title: string; items: NavItem[] }[] = [];
    let standaloneItems: NavItem[] = [];

    for (const item of items) {
      // Check if it's a NavGroup (has 'title' and 'items')
      if ('title' in item && 'items' in item) {
        // It's a NavGroup - add its items to a group (ignore the NavGroup's href if it has one)
        groups.push({ title: item.title, items: item.items });
      } else if ('href' in item && !('items' in item)) {
        // Only add as standalone if it's purely a NavItem (not a NavGroup with href)
        standaloneItems.push(item);
      }
    }

    if (standaloneItems.length > 0) {
      groups.push({ title: 'More', items: standaloneItems });
    }

    return groups;
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleGlobalKeydown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  });

  // Handle menu state changes - body scroll and focus management
  $: if (typeof document !== 'undefined') {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      updateTabIndexes();
      // Focus the first focusable element when menu opens
      setTimeout(() => {
        if (menuContentElement) {
          const firstFocusable = menuContentElement.querySelector('a[href], button') as HTMLElement;
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }, 100); // Small delay to allow animation to start
    } else {
      document.body.style.overflow = '';
      updateTabIndexes();
    }
  }
</script>

<div class="burger-menu" bind:this={menuElement}>
  <!-- Burger Button -->
  <button
    class="action-button burger-button"
    class:active={isOpen}
    on:click={toggleMenu}
    aria-label={isOpen ? $t('furniture.menu.close') : $t('furniture.menu.open')}
    aria-expanded={isOpen}
    aria-controls="mobile-menu"
    use:tooltip={`Menu (${shortcutKey}+M)`}
  >
    <span class="burger-line"></span>
    <span class="burger-line"></span>
    <span class="burger-line"></span>
  </button>

  <!-- Menu Overlay -->
  {#if isOpen}
    <div class="menu-overlay" aria-hidden="true" on:click={() => (isOpen = false)}></div>
  {/if}

  <!-- Menu Content -->
  <nav
    class="menu-content"
    class:open={isOpen}
    id="mobile-menu"
    aria-label={$t('furniture.navigation.mobile')}
    bind:this={menuContentElement}
  >
    <div class="menu-header">
      <a href="/" class="home-link" on:click={handleLinkClick} aria-label="Home">
        <Icon name="networking" size="lg" />
        <h2>{site.title}</h2>
      </a>
      <button class="close-button" on:click={() => (isOpen = false)} aria-label={$t('furniture.menu.close')}>
        <Icon name="x" size="md" />
      </button>
    </div>

    <div class="menu-sections">
      {#each Object.entries(SUB_NAV) as [sectionKey, sectionItems] (sectionKey)}
        {@const groups = getNavGroups(sectionItems)}

        <div class="menu-section">
          <a href={sectionKey} class="section-title" on:click={handleLinkClick}>
            <h3>
              <!-- <Icon name={getSectionIcon(sectionKey)} size="sm" /> -->
              {getSectionTitle(sectionKey)}
            </h3>
          </a>
          {#each groups as group (group.title)}
            {#if groups.length > 1}
              <div class="menu-group">
                <h4 class="group-title">{group.title}</h4>
                <ul class="group-items">
                  {#each group.items as item (item.href)}
                    <li>
                      <a
                        href={item.href}
                        class="menu-item"
                        class:active={isActiveLink(item.href)}
                        on:click={handleLinkClick}
                        title={item.description}
                        aria-label={`${item.label}: ${item.description}`}
                      >
                        <Icon name={item.icon || 'default'} size="sm" />
                        <span class="item-label">{item.label}</span>
                      </a>
                    </li>
                  {/each}
                </ul>
              </div>
            {:else}
              <ul class="section-items">
                {#each group.items as item (item.href)}
                  <li>
                    <a
                      href={item.href}
                      class="menu-item"
                      class:active={isActiveLink(item.href)}
                      on:click={handleLinkClick}
                      title={item.description}
                      aria-label={`${item.label}: ${item.description}`}
                    >
                      <Icon name={item.icon || 'default'} size="sm" />
                      <span class="item-label">{item.label}</span>
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
    <div class="external-links">
      <div class="about-links">
        {#each footerLinks as link, index (link.href)}
          <a href={link.href} target="_blank" rel="noopener noreferrer" on:click={handleLinkClick}>
            {link.label}
          </a>{index < footerLinks.length - 1 ? ' • ' : ''}
        {/each}
      </div>
      <p class="license">
        <a href={site.url} target="_blank" rel="noopener noreferrer">{site.title}</a>
        is licensed under
        <a href={license.url} target="_blank" rel="noopener noreferrer">{license.name}</a>
        ©
        <a href={author.githubUrl} target="_blank" rel="noopener noreferrer">{author.name}</a>
        {license.date}
      </p>
    </div>
  </nav>
</div>

<style lang="scss">
  .burger-menu {
    position: relative;
    display: block;

    // @media (min-width: 768px) {
    //   display: none;
    // }
  }

  .burger-button {
    flex-direction: column;
    padding: 0.25rem;
  }

  .burger-line {
    width: 1rem;
    height: 2px;
    background-color: var(--text-secondary);
    border-radius: 1px;
    transition: all var(--transition-fast);
    transform-origin: center;

    &:nth-child(1) {
      margin-bottom: 3px;
    }

    &:nth-child(2) {
      margin-bottom: 3px;
    }
  }

  .burger-button.active {
    .burger-line:nth-child(1) {
      transform: translateY(5px) rotate(45deg);
    }

    .burger-line:nth-child(2) {
      opacity: 0;
    }

    .burger-line:nth-child(3) {
      transform: translateY(-5px) rotate(-45deg);
    }
  }

  .menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 998;
    opacity: 0;
    animation: fadeIn var(--transition-medium) cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .menu-content {
    position: fixed;
    top: 0;
    right: -100%;
    width: min(90vw, 400px);
    height: 100vh;
    background-color: var(--bg-primary);
    border-left: 1px solid var(--border-primary);
    box-shadow: var(--shadow-xl);
    z-index: 999;
    overflow-y: auto;
    transition: right var(--transition-medium) cubic-bezier(0.4, 0, 0.2, 1);

    @media (max-width: 480px) {
      &.open {
        width: 100%;
      }
    }

    &.open {
      right: 0;
      .menu-item {
        animation: slideInFromRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .menu-section:nth-child(1) .menu-item {
        animation-delay: 0.1s;
      }
      .menu-section:nth-child(2) .menu-item {
        animation-delay: 0.15s;
      }
      .menu-section:nth-child(3) .menu-item {
        animation-delay: 0.2s;
      }
      .menu-section:nth-child(4) .menu-item {
        animation-delay: 0.25s;
      }
      .menu-section:nth-child(5) .menu-item {
        animation-delay: 0.3s;
      }
    }
  }

  .menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-primary);
    .home-link {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      text-decoration: none;
      :global(.icon) {
        color: var(--text-primary);
      }
      h2 {
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }
    }
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    padding: 0;

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  .menu-sections {
    padding: var(--spacing-md);
  }

  .menu-section {
    margin-bottom: var(--spacing-xl);

    &:last-child {
      margin-bottom: var(--spacing-lg);
    }
  }

  .section-title {
    text-decoration: none;
    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-primary);
      margin: 0 0 var(--spacing-md) 0;
      padding-bottom: var(--spacing-xs);
      border-bottom: 1px solid var(--border-secondary);
    }
  }

  .menu-group {
    margin-bottom: var(--spacing-lg);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .group-title {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-sm) 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .group-items,
  .section-items {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    text-decoration: none;
    color: var(--text-primary);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    margin-bottom: var(--spacing-xs);
    opacity: 0;
    transform: translateX(20px);

    &:hover {
      background-color: var(--surface-hover);
      color: var(--color-primary);
      transform: translateX(4px);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &.active {
      background-color: var(--color-primary);
      color: var(--bg-primary);
      font-weight: 600;
      transform: translateX(4px);

      :global(.icon) {
        color: var(--bg-primary);
      }

      &:hover {
        background-color: var(--color-primary);
        color: var(--bg-primary);
        transform: translateX(6px);
      }
    }
  }

  .item-label {
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Smooth scroll behavior for menu */
  .menu-content {
    scroll-behavior: smooth;
  }

  /* Hide scrollbar but keep functionality */
  .menu-content {
    scrollbar-width: thin;
    scrollbar-color: var(--border-secondary) transparent;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--border-secondary);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: var(--border-primary);
    }
  }
  .external-links {
    padding: var(--spacing-md);
    border-top: 1px solid var(--border-primary);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-align: center;
    background: var(--bg-secondary);

    .license {
      font-size: 0.6rem;
      opacity: 0.5;
      margin-top: 0.5rem;
      a {
        color: var(--color-primary);
        text-decoration: none;
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .about-links {
      font-size: var(--font-size-sm);
      a {
        color: var(--color-primary);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
</style>
