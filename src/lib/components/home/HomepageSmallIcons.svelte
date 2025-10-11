<script lang="ts">
  import { onMount } from 'svelte';
  import { ALL_PAGES } from '$lib/constants/nav';
  import Icon from '$lib/components/global/Icon.svelte';
  import ContextMenu from '$lib/components/global/ContextMenu.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { activeContextMenu } from '$lib/stores/contextMenu';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { recentlyUsedTools } from '$lib/stores/toolUsage';
  import { handleToolContextMenu, getToolContextMenuId, getToolContextMenuItems } from '$lib/utils/tool-context-menu';

  // Rainbow gradient configuration
  const HUE_STEP = 10; // How quickly colors change along diagonal
  const SATURATION = 60; // Color saturation (0-100)
  const LIGHTNESS = 60; // Color lightness (0-100)

  // Filter out non-tool pages
  const toolPages = ALL_PAGES.filter((page) => page.icon);

  let gridElement: HTMLDivElement;
  let iconHues: number[] = $state([]);
  let gridCols: number = $state(1);

  // Memoized function to get grid column count
  function updateGridCols() {
    if (!gridElement) return;
    const gridStyle = window.getComputedStyle(gridElement);
    gridCols = gridStyle.gridTemplateColumns.split(' ').length;
  }

  function updateIconColors() {
    if (!gridElement) return;

    updateGridCols();

    iconHues = toolPages.map((_, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;
      const diagonalIndex = row + col;
      return (diagonalIndex * HUE_STEP) % 360;
    });
  }

  function getAnimDelay(index: number): number {
    if (!gridElement || gridCols === 0) return 0;
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    return (row + col) * 0.03; // 30ms per diagonal step
  }

  onMount(() => {
    bookmarks.init();
    updateIconColors();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateIconColors, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
</script>

<div class="small-icons-layout">
  <div class="search-hint">
    <kbd>⌘</kbd>
    <kbd>K</kbd>
    <span>to search</span>
  </div>
  <div class="icons-grid" bind:this={gridElement}>
    {#each toolPages as tool, index (tool.href)}
      {@const menuId = getToolContextMenuId(tool)}
      {@const menuItems = getToolContextMenuItems({
        tool,
        bookmarkedTools: $bookmarks,
        recentTools: $recentlyUsedTools,
      })}
      {@const hue = iconHues[index] ?? 0}
      {@const animDelay = getAnimDelay(index)}
      <a
        href={tool.href}
        class="icon-link"
        style="--icon-hue: {hue}; --icon-color: hsl({hue}, {SATURATION}%, {LIGHTNESS}%); --anim-delay: {animDelay}s;"
        use:tooltip={tool.label}
        oncontextmenu={(e) => handleToolContextMenu(e, tool)}
      >
        <Icon name={tool.icon || ''} size="xl" />
      </a>
      {#if $activeContextMenu.id === menuId}
        <ContextMenu
          x={$activeContextMenu.x}
          y={$activeContextMenu.y}
          items={menuItems}
          onClose={() => activeContextMenu.close()}
        />
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  :global(body:has(.small-icons-layout) main) {
    max-width: none;
    margin: 0 auto;
    padding: 0;
  }

  .small-icons-layout {
    width: 100%;
    padding: var(--spacing-md);
  }

  .search-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-lg);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      height: 1.5rem;
      padding: 0 var(--spacing-xs);
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--text-primary);
      box-shadow: 0 1px 0 0 var(--border-secondary);
    }

    span {
      font-weight: 400;
    }
  }

  .icons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(4rem, 1fr));
    gap: var(--spacing-md);
    margin: 0 auto;

    @media (max-width: 768px) {
      grid-template-columns: repeat(auto-fit, minmax(3.5rem, 1fr));
      gap: var(--spacing-sm);
    }
  }

  .icon-link {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    text-decoration: none;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    opacity: 0;
    animation: iconFadeIn 0.5s ease-out var(--anim-delay, 0s) forwards;
    transition:
      transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.3s ease,
      background 0.3s ease,
      border-color 0.3s ease,
      filter 0.3s ease;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(
        circle at center,
        color-mix(in srgb, var(--icon-color), transparent 85%),
        transparent 70%
      );
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    :global(.icon) {
      color: var(--icon-color);
      filter: drop-shadow(0 0 0px color-mix(in srgb, var(--icon-color), transparent 100%));
      transition:
        color 0.3s ease,
        filter 0.6s ease-in-out,
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    &:hover {
      transform: scale(1.1) translateY(-3px) rotate(1.5deg);
      background: color-mix(in srgb, var(--bg-tertiary), var(--icon-color) 5%);
      border-color: var(--icon-color);
      filter: brightness(1.1);
      box-shadow:
        0 0 20px color-mix(in srgb, var(--icon-color), transparent 70%),
        0 6px 16px color-mix(in srgb, var(--icon-color), transparent 80%),
        0 2px 6px color-mix(in srgb, var(--icon-color), transparent 90%),
        inset 0 1px 0 color-mix(in srgb, var(--icon-color), transparent 90%);

      &::before {
        opacity: 1;
      }

      :global(.icon) {
        filter: drop-shadow(0 0 4px color-mix(in srgb, var(--icon-color), transparent 50%));
        transform: scale(1.1);
      }
    }

    &:active {
      transform: scale(1.08) translateY(-1px) rotate(1deg);
    }
  }

  @keyframes iconFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
