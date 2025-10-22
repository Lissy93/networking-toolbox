<script lang="ts">
  import { page } from '$app/stores';
  import { TOP_NAV, SUB_NAV, type NavItem, type NavGroup } from '$lib/constants/nav';
  import { isActive, isGroupWithActiveItem, isGroupWithActiveSubDropdown } from '$lib/utils/nav-helpers';
  import Icon from '$lib/components/global/Icon.svelte';
  import { navbarDisplay } from '$lib/stores/navbarDisplay';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { frequentlyUsedTools, toolUsage } from '$lib/stores/toolUsage';
  import { onMount } from 'svelte';

  const currentPath = $derived($page.url?.pathname ?? '/');

  let activeDropdown = $state<string | null>(null);
  let activeSubDropdown = $state<string | null>(null);
  let timeoutId: number | null = null;
  let subTimeoutId: number | null = null;
  let secondaryDropdownPositions = $state<Record<string, 'left' | 'right'>>({});

  function showDropdown(href: string) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      activeDropdown = href;

      // Calculate secondary dropdown positions when primary opens
      if (hasSubPages(href)) {
        requestAnimationFrame(() => {
          document.querySelectorAll('.nav-group.has-secondary').forEach((group) => {
            const title = group.querySelector('.group-title-text')?.textContent?.trim();
            if (!title) return;

            const rect = group.getBoundingClientRect();
            const spaceOnRight = window.innerWidth - rect.right - 20;

            secondaryDropdownPositions = {
              ...secondaryDropdownPositions,
              [title]: spaceOnRight < 330 ? 'left' : 'right',
            };
          });
        });
      }
    }, 800);
  }

  function hideDropdown() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      activeDropdown = null;
      activeSubDropdown = null;
    }, 200);
  }

  function keepDropdown() {
    if (timeoutId) clearTimeout(timeoutId);
  }

  function showSubDropdown(groupTitle: string) {
    if (subTimeoutId) clearTimeout(subTimeoutId);
    subTimeoutId = window.setTimeout(() => {
      activeSubDropdown = groupTitle;
    }, 300);
  }

  function hideSubDropdown() {
    if (subTimeoutId) clearTimeout(subTimeoutId);
    subTimeoutId = window.setTimeout(() => {
      activeSubDropdown = null;
    }, 200);
  }

  function keepSubDropdown() {
    if (subTimeoutId) clearTimeout(subTimeoutId);
  }

  function hasSubPages(href: string): boolean {
    // Only show dropdowns for default mode
    return $navbarDisplay === 'default' && href in SUB_NAV;
  }

  function getSubPages(href: string): (NavItem | NavGroup)[] {
    const pages = SUB_NAV[href] || [];
    // Sort so that NavGroups (sub-sections) come before NavItems (top-level pages)
    return pages.sort((a, b) => {
      const aIsGroup = isNavGroup(a);
      const bIsGroup = isNavGroup(b);
      if (aIsGroup && !bIsGroup) return -1; // Groups first
      if (!aIsGroup && bIsGroup) return 1; // Items second
      return 0; // Keep original order within same type
    });
  }

  function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
    return 'title' in item && 'items' in item;
  }

  // Check if current mode has dropdowns (only default mode has dropdowns)
  const hasDropdowns = $derived($navbarDisplay === 'default');

  // Reactive navigation items based on current display mode and store changes
  const navigationItems = $derived.by(() => {
    let items: NavItem[];

    switch ($navbarDisplay) {
      case 'bookmarked':
        items = $bookmarks
          .filter((bookmark) => bookmark.label)
          .map((bookmark) => ({
            href: bookmark.href,
            label: bookmark.label,
            icon: bookmark.icon,
            description: bookmark.description,
          }));
        // Show most recent bookmarks first
        return items.reverse();

      case 'frequent':
        items = $frequentlyUsedTools
          .filter((tool) => tool.label)
          .slice(0, 8)
          .map((tool) => ({
            href: tool.href,
            label: tool.label || 'Untitled Tool',
            icon: tool.icon,
            description: tool.description,
          }));
        // Already sorted by frequency, no need to reverse
        return items;

      case 'none':
        return [];

      case 'default':
      default:
        // Keep default navigation items in their original order
        return TOP_NAV.filter((item) => item.label);
    }
  });

  onMount(() => {
    navbarDisplay.init();
    bookmarks.init();
    toolUsage.init();
  });
</script>

<nav id="navigation" class="top-nav" class:has-dropdowns={hasDropdowns} aria-label="Primary navigation">
  {#each navigationItems as item (item.href)}
    <div
      class="nav-item"
      class:has-dropdown={hasSubPages(item.href)}
      role="presentation"
      onmouseenter={() => showDropdown(item.href)}
      onmouseleave={hideDropdown}
    >
      <a
        href={item.href}
        class="nav-link"
        class:active={isActive(currentPath, item.href)}
        class:dropdown-open={hasSubPages(item.href) && activeDropdown === item.href}
        aria-current={isActive(currentPath, item.href) ? 'page' : undefined}
        aria-expanded={activeDropdown === item.href}
        aria-haspopup={hasSubPages(item.href)}
      >
        <span class="nav-text">{item.label}</span>
        {#if hasSubPages(item.href)}
          <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}
      </a>

      {#if hasSubPages(item.href) && activeDropdown === item.href}
        <div
          class="dropdown-container"
          role="menu"
          tabindex="-1"
          onmouseenter={keepDropdown}
          onmouseleave={hideDropdown}
        >
          <div class="primary-dropdown">
            <div class="primary-content">
              {#each getSubPages(item.href) as subItem ('href' in subItem ? subItem.href : subItem.title)}
                {#if 'href' in subItem && subItem.label}
                  <!-- Direct nav item with label -->
                  <a
                    href={subItem.href}
                    class="dropdown-link {isActive(currentPath, subItem.href) ? 'active' : ''}"
                    aria-current={isActive(currentPath, subItem.href) ? 'page' : undefined}
                  >
                    <div class="link-content">
                      {#if subItem.icon}<Icon name={subItem.icon} size="sm" />{/if}
                      <span class="link-title">{subItem.label}</span>
                    </div>
                    {#if subItem.description}
                      <span class="link-description">{subItem.description}</span>
                    {/if}
                  </a>
                {:else if 'title' in subItem}
                  <!-- Nav group with secondary dropdown -->
                  <div
                    class="nav-group"
                    class:active={isGroupWithActiveItem(currentPath, subItem)}
                    class:dropdown-open={isGroupWithActiveSubDropdown(activeSubDropdown, subItem)}
                    class:has-secondary={subItem.items.length > 0}
                    role="menuitem"
                    tabindex="0"
                    onmouseenter={() => showSubDropdown(subItem.title)}
                    onmouseleave={hideSubDropdown}
                  >
                    <div class="group-title">
                      {#if subItem.items.length > 0 && secondaryDropdownPositions[subItem.title] === 'left'}
                        <svg class="secondary-icon left" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M7.5 3L4.5 6L7.5 9"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      {/if}
                      <span class="group-title-text">{subItem.title}</span>
                      {#if subItem.items.length > 0 && secondaryDropdownPositions[subItem.title] !== 'left'}
                        <svg class="secondary-icon right" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M4.5 3L7.5 6L4.5 9"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      {/if}
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>

          <!-- Secondary dropdowns positioned outside primary container -->
          {#each getSubPages(item.href) as subItem ('href' in subItem ? subItem.href : subItem.title)}
            {#if 'title' in subItem && activeSubDropdown === subItem.title && subItem.items.length > 0}
              <div
                class="secondary-dropdown"
                class:align-left={secondaryDropdownPositions[subItem.title] === 'left'}
                role="menu"
                tabindex="-1"
                onmouseenter={keepSubDropdown}
                onmouseleave={hideSubDropdown}
              >
                <div class="secondary-content">
                  {#each subItem.items.filter((i) => i.label) as groupItem (groupItem.href)}
                    <a
                      href={groupItem.href}
                      class="dropdown-link"
                      class:active={isActive(currentPath, groupItem.href)}
                      aria-current={isActive(currentPath, groupItem.href) ? 'page' : undefined}
                    >
                      <div class="link-content">
                        {#if groupItem.icon}<Icon name={groupItem.icon} size="sm" />{/if}
                        <span class="link-title">{groupItem.label}</span>
                      </div>
                      {#if groupItem.description}
                        <span class="link-description">{groupItem.description}</span>
                      {/if}
                    </a>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</nav>

<style lang="scss">
  .top-nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 1;
    min-width: 0;
    justify-content: flex-end;

    // Default: Hide horizontal overflow (for bookmarked/frequent modes)
    overflow-x: hidden;
    overflow-y: visible;

    // When has dropdowns (default mode): Allow overflow for dropdowns
    &.has-dropdowns {
      overflow: visible;
    }
  }

  .nav-item {
    position: relative;
    max-width: 12rem;
    min-width: 0;
    flex-shrink: 0;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    width: 100%;
    min-width: 0;

    .nav-text {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .dropdown-icon {
      opacity: 0.4;
      flex-shrink: 0;
    }

    &:hover,
    &.dropdown-open {
      color: var(--text-primary);
      background: var(--surface-hover);
      .dropdown-icon {
        opacity: 1;
      }
    }

    &.active {
      color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary), transparent 90%);
    }
  }

  .dropdown-icon {
    transition: transform 0.2s ease;
  }

  .has-dropdown .nav-link[aria-expanded='true'] .dropdown-icon {
    transform: rotate(180deg);
    opacity: 1;
  }

  .dropdown-container {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 5;
    overflow: visible;
    margin-top: var(--spacing-sm);
  }

  .primary-dropdown {
    min-width: 20rem;
    max-width: 24rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    animation: dropdown-enter 0.15s ease-out;
    transform-origin: top left;
    overflow: visible;
  }

  @keyframes dropdown-enter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .primary-content {
    padding: 0.5rem;
    max-height: 80vh;
    overflow-y: auto;
    overflow-x: visible;

    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--color-primary), transparent 10%) transparent;
  }

  .dropdown-link {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    color: var(--text-primary);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: background-color 0.15s ease;

    :global(svg) {
      flex-shrink: 0;
      opacity: 0.7;
      transition: all 0.2s ease;
    }

    &:hover {
      background: var(--surface-hover);

      :global(svg) {
        opacity: 1;
        transform: scale(1.05);
        color: var(--color-primary);
      }
    }

    &.active {
      background: color-mix(in srgb, var(--color-primary), transparent 90%);

      .link-title {
        color: var(--color-primary);
      }

      :global(svg) {
        opacity: 1;
        color: var(--color-primary);
      }
    }
  }

  .link-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .link-title {
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.25;
  }

  .link-description {
    font-size: 0.75rem;
    line-height: 1.25;
    color: var(--text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .nav-group {
    overflow: visible;

    & + .nav-group {
      margin-top: var(--spacing-xs);
      padding-top: var(--spacing-xs);
      border-top: 1px solid var(--border-secondary);
    }

    &:has(+ .dropdown-link) {
      margin-bottom: var(--spacing-xs);
      padding-bottom: var(--spacing-xs);
      border-bottom: 1px solid var(--border-secondary);
    }

    &.has-secondary,
    &.active {
      .group-title {
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-md);
      }
    }

    &.has-secondary {
      cursor: pointer;

      .group-title {
        transition: background-color 0.15s ease;

        &:hover {
          background: var(--surface-hover);
        }
      }
    }

    &.dropdown-open {
      .group-title {
        transition: background-color none;
        background: var(--surface-hover);
      }
    }

    &.active {
      .group-title {
        color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary), transparent 95%);
      }
    }
  }

  .group-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    padding: 0.25rem 0.5rem 0.5rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .group-title-text {
    flex: 1;
    text-align: left;
  }

  .secondary-icon {
    transition: transform 0.2s ease;
    opacity: 0.7;
    flex-shrink: 0;

    &.left {
      order: -1; // Place before the title
    }
  }

  .has-secondary:hover .secondary-icon {
    opacity: 1;

    &.right {
      transform: translateX(0.125rem);
    }

    &.left {
      transform: translateX(-0.125rem);
    }
  }

  .secondary-dropdown {
    position: absolute;
    top: 0;
    min-width: 18rem;
    max-width: 28rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 6;
    animation: secondary-enter 0.15s ease-out;
    pointer-events: auto;
    white-space: normal;

    max-height: 80vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--color-primary), transparent 10%) transparent;

    // Default: open to the right
    left: calc(100% + 0.5rem);
    transform-origin: left center;

    // When not enough space, open to the left
    &.align-left {
      right: calc(100% + 0.5rem);
      left: auto;
      transform-origin: right center;
      animation: secondary-enter-left 0.15s ease-out;
    }

    // Auto-position to left when overflowing viewport (fallback for older behavior)
    @media (max-width: 1200px) {
      &:not(.align-left) {
        right: calc(100% + 0.5rem);
        left: auto;
        transform-origin: right center;
        animation: secondary-enter-left 0.15s ease-out;
      }
    }
  }

  @keyframes secondary-enter {
    from {
      opacity: 0;
      transform: scale(0.95) translateX(-0.5rem);
    }
    to {
      opacity: 1;
      transform: scale(1) translateX(0);
    }
  }

  @keyframes secondary-enter-left {
    from {
      opacity: 0;
      transform: scale(0.95) translateX(0.5rem);
    }
    to {
      opacity: 1;
      transform: scale(1) translateX(0);
    }
  }

  .secondary-content {
    padding: 0.5rem;
  }

  /* Mobile adjustments */
  @media (max-width: 768px) {
    .top-nav {
      display: none;
    }
  }
</style>
