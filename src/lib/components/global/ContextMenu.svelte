<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  export let x: number = 0;
  export let y: number = 0;
  export let items: Array<{
    label: string;
    icon: string;
    action: () => void;
    condition?: boolean;
  }> = [];
  export let onClose: () => void;

  let menuElement: HTMLDivElement;

  onMount(() => {
    // Position the menu, ensuring it stays within viewport
    if (menuElement) {
      const rect = menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position if menu would overflow
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position if menu would overflow
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }
    }

    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (menuElement && !menuElement.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  function handleItemClick(action: () => void) {
    action();
    onClose();
  }

  // Filter items based on condition
  $: visibleItems = items.filter((item) => item.condition !== false);
</script>

<div class="context-menu" bind:this={menuElement} style="left: {x}px; top: {y}px;">
  {#each visibleItems as item (item.label)}
    <button class="menu-item" onclick={() => handleItemClick(item.action)}>
      <Icon name={item.icon} size="sm" />
      <span>{item.label}</span>
    </button>
  {/each}
</div>

<style lang="scss">
  .context-menu {
    position: fixed;
    z-index: 1000;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: var(--spacing-xs);
    min-width: 12rem;
    animation: menuFadeIn 0.15s ease-out;
  }

  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    text-align: left;
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
      color: var(--color-primary);
    }

    &:active {
      transform: scale(0.98);
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--text-secondary);
      transition: color var(--transition-fast);
    }

    &:hover :global(svg) {
      color: var(--color-primary);
    }

    span {
      flex: 1;
    }
  }

  @keyframes menuFadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
