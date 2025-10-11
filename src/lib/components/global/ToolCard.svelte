<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ContextMenu from '$lib/components/global/ContextMenu.svelte';
  import type { NavItem } from '$lib/constants/nav';
  import { bookmarks, type BookmarkedTool } from '$lib/stores/bookmarks';
  import { toolUsage, recentlyUsedTools } from '$lib/stores/toolUsage';
  import { activeContextMenu } from '$lib/stores/contextMenu';
  import { handleToolContextMenu, getToolContextMenuId, getToolContextMenuItems } from '$lib/utils/tool-context-menu';

  export let tool: NavItem;
  export let size: 'default' | 'small' | 'compact' = 'default';

  let isHovered = false;
  let isBookmarked = false;

  const menuId = getToolContextMenuId(tool);

  onMount(() => {
    bookmarks.init();
    toolUsage.init();
  });

  $: isBookmarked = bookmarks.isBookmarked(tool.href, $bookmarks);
  $: showContextMenu = $activeContextMenu.id === menuId;

  function toggleBookmark(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const bookmarkedTool: BookmarkedTool = {
      href: tool.href,
      label: tool.label,
      description: tool.description || '',
      icon: tool.icon || 'default',
    };

    bookmarks.toggle(bookmarkedTool);
  }

  $: contextMenuItems = getToolContextMenuItems({
    tool,
    bookmarkedTools: $bookmarks,
    recentTools: $recentlyUsedTools,
  });
</script>

{#if size === 'small'}
  <a
    href={tool.href}
    class="tool-card small"
    aria-label={tool.label}
    use:tooltip={{ text: tool.description || '' }}
    on:contextmenu={(e) => handleToolContextMenu(e, tool)}
  >
    <div class="left">
      <h3>{tool.label}</h3>
      <div class="tool-icon">
        <Icon name={tool.icon || 'default'} />
      </div>
    </div>
    <div class="tool-arrow">
      <svg fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
  </a>
{:else if size === 'compact'}
  <a
    href={tool.href}
    class="tool-card compact"
    aria-label={tool.label}
    use:tooltip={{ text: tool.description || '' }}
    on:contextmenu={(e) => handleToolContextMenu(e, tool)}
  >
    <div class="compact-content">
      <div class="tool-icon">
        <Icon name={tool.icon || 'default'} />
      </div>
      <h3>{tool.label}</h3>
    </div>
  </a>
{:else}
  <a
    href={tool.href}
    class="tool-card"
    aria-label={tool.label}
    on:mouseenter={() => (isHovered = true)}
    on:mouseleave={() => (isHovered = false)}
    on:contextmenu={(e) => handleToolContextMenu(e, tool)}
  >
    <div class="card-header">
      <h3>{tool.label}</h3>
      {#if isHovered || isBookmarked}
        <button
          class="bookmark-btn"
          class:bookmarked={isBookmarked}
          on:click={toggleBookmark}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <div class="bookmark-icon">
            {#if isBookmarked}
              {#if isHovered}
                <Icon name="bookmark-remove" size="sm" />
              {:else}
                <Icon name="bookmarks" size="sm" />
              {/if}
            {:else}
              <Icon name="bookmark-add" size="md" />
            {/if}
            <!-- <Icon name={isBookmarked ? 'bookmark-remove' : 'bookmark-add'} size="sm" /> -->
          </div>
        </button>
      {/if}
    </div>
    <div class="right">
      <div class="tool-icon">
        <Icon name={tool.icon || 'default'} />
      </div>
      <div class="tool-content">
        <p>{tool.description}</p>
      </div>
      <div class="tool-arrow">
        <svg fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </div>
  </a>
{/if}

{#if showContextMenu}
  <ContextMenu
    x={$activeContextMenu.x}
    y={$activeContextMenu.y}
    items={contextMenuItems}
    onClose={() => activeContextMenu.close()}
  />
{/if}

<style lang="scss">
  .tool-card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg);
    background: linear-gradient(
      225deg,
      var(--bg-secondary),
      color-mix(in srgb, var(--bg-secondary), var(--bg-tertiary) 70%)
    );
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: inherit;
    transition: all var(--transition-fast);
    position: relative;
    height: 100%;
    min-width: 0;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        180deg,
        var(--bg-secondary),
        color-mix(in srgb, var(--bg-secondary), var(--bg-tertiary) 85%)
      );
      opacity: 0;
      transition: opacity var(--transition-slow);
      border-radius: inherit;
      z-index: 0;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--spacing-sm);
      margin: 0 0 var(--spacing-xs) 0;
      z-index: 1;

      h3 {
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        line-height: 1.3;
        text-overflow: ellipsis;
        display: block;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        max-width: 100%;
      }
    }

    .bookmark-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--spacing-xs);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      animation: slideInFromTop 0.3s ease forwards;
      overflow: hidden;
      position: absolute;
      right: var(--spacing-sm);
      top: var(--spacing-sm);

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: color-mix(in srgb, var(--color-primary), transparent 90%);
        border-radius: 50%;
        transition: all 0.3s ease;
        transform: translate(-50%, -50%);
        z-index: -1;
      }

      &:hover {
        background: var(--surface-hover);
        color: var(--color-success);
        transform: scale(1.15);
        border-radius: 100%;

        &::before {
          width: 100%;
          height: 100%;
        }
      }

      &:active {
        transform: scale(0.95);
      }

      & .bookmark-icon {
        display: flex;
        width: fit-content;
        height: fit-content;
      }

      &.bookmarked {
        color: var(--text-secondary);
        opacity: 1;
        animation: bookmarkPulse 0.6s ease;

        &:hover {
          color: var(--color-error);
          transform: scale(1.1) rotate(-5deg);
        }
      }

      :global(svg) {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    }

    .right {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      min-width: 0;
      position: relative;
      z-index: 1;
    }

    .tool-content {
      min-width: 0;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);

      &::before {
        opacity: 1;
      }

      .tool-arrow {
        transform: translateX(4px);
        color: var(--color-primary);
      }
    }

    &:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
      box-shadow:
        var(--shadow-lg),
        0 0 0 4px color-mix(in srgb, var(--color-primary), transparent 85%);
      border-color: var(--color-primary);

      &::before {
        opacity: 0.5;
      }
    }

    @media (max-width: 768px) {
      text-align: left;
      padding: var(--spacing-md);
    }

    .tool-icon {
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-primary);
      border-radius: var(--radius-lg);
      color: var(--bg-secondary);
      flex-shrink: 0;
      transition: all 0.5s ease;
    }

    .tool-content {
      flex: 1;
      p {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin: 0;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .tool-arrow {
      width: 1.5rem;
      height: 1.5rem;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
      flex-shrink: 0;

      svg {
        width: 100%;
        height: 100%;
      }

      @media (max-width: 768px) {
        display: none;
      }
    }
  }

  .tool-card.small {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
    background: linear-gradient(
      135deg,
      var(--bg-secondary),
      color-mix(in srgb, var(--bg-secondary), var(--bg-tertiary) 50%)
    );
    .left {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      gap: var(--spacing-md);
      min-width: 0;
      position: relative;
      z-index: 1;
    }

    h3 {
      font-size: var(--font-size-md);
      font-weight: 500;
      margin: 0;
      line-height: 1.2;
      text-overflow: ellipsis;
      display: block;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
    }

    .tool-icon {
      width: 2rem;
      height: 2rem;
      transition: all 0.25s;
      filter: saturate(0.9);
    }

    .tool-arrow {
      width: 1.25rem;
      height: 1.25rem;
      position: relative;
      z-index: 1;

      @media (max-width: 768px) {
        display: none;
      }
    }
    &:hover {
      .tool-icon {
        transform: scale(1.1);
        filter: saturate(1);
      }
    }

    &:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary), transparent 85%);
      border-color: var(--color-primary);
      background-color: var(--surface-hover);
    }
  }

  .tool-card.compact {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    gap: var(--spacing-xs);
    text-align: center;
    min-height: 5rem;
    // max-width: 10rem;
    background: linear-gradient(
      135deg,
      var(--bg-secondary),
      color-mix(in srgb, var(--bg-secondary), var(--bg-tertiary) 50%)
    );

    .compact-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
      width: 100%;
      position: relative;
      z-index: 1;
    }

    h3 {
      font-size: var(--font-size-sm);
      font-weight: normal;
      margin: 0;
      line-height: 1.2;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      width: 100%;
    }

    .tool-icon {
      width: 1.75rem;
      height: 1.75rem;
      transition: all 0.25s;
      filter: saturate(0.9);
      padding: var(--spacing-md);
    }

    &:hover {
      .tool-icon {
        transform: scale(1.15);
        filter: saturate(1);
      }
    }

    &:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary), transparent 85%);
      border-color: var(--color-primary);
      background-color: var(--surface-hover);
    }
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }

  @keyframes slideInFromTop {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes bookmarkPulse {
    0% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.2);
    }
    50% {
      transform: scale(1.1);
    }
    75% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
