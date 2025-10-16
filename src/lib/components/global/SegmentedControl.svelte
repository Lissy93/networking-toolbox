<script lang="ts" generics="T extends string">
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip.js';

  interface Option {
    value: T;
    label: string;
    icon?: string;
    href?: string;
  }

  interface Props {
    options: Option[];
    value: T;
    onchange?: (value: T) => void;
    class?: string;
    hideLabel?: boolean;
  }

  let { options, value = $bindable(), onchange, class: className = '', hideLabel = false }: Props = $props();

  let buttonsContainer: HTMLDivElement;

  // Track the active indicator position and width
  let indicatorStyle = $state('');

  // Check if all options have icons
  const allHaveIcons = $derived(options.every((opt) => opt.icon));
  const shouldHideLabel = $derived(hideLabel && allHaveIcons);

  // Update indicator position when value or hideLabel changes
  $effect(() => {
    if (buttonsContainer && value) {
      // Use requestAnimationFrame to ensure DOM has updated after hideLabel changes
      requestAnimationFrame(() => {
        const buttons = Array.from(buttonsContainer.querySelectorAll('button'));
        const activeIndex = options.findIndex((opt) => opt.value === value);
        const button = buttons[activeIndex] as HTMLButtonElement | undefined;

        if (button) {
          updateIndicator(button);
        }
      });
    }
  });

  function updateIndicator(button: HTMLButtonElement) {
    if (!buttonsContainer) return;

    const containerRect = buttonsContainer.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    const left = buttonRect.left - containerRect.left;
    const width = buttonRect.width;

    indicatorStyle = `transform: translateX(${left}px); width: ${width}px;`;
  }

  function handleClick(option: Option) {
    value = option.value;

    if (option.href) {
      goto(option.href);
    } else if (onchange) {
      onchange(option.value);
    }
  }
</script>

<div class="segmented-control {className}">
  <div class="buttons-container" bind:this={buttonsContainer}>
    <div class="active-indicator" style={indicatorStyle}></div>
    {#each options as option (option.value)}
      <button
        class="segment-btn"
        class:active={value === option.value}
        class:icon-only={shouldHideLabel && option.icon}
        onclick={() => handleClick(option)}
        aria-pressed={value === option.value}
        use:tooltip={shouldHideLabel ? option.label : undefined}
      >
        {#if option.icon}
          <Icon name={option.icon} size="sm" />
        {/if}
        {#if !shouldHideLabel}
          <span class="segment-label">{option.label}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .segmented-control {
    display: inline-flex;
  }

  .buttons-container {
    position: relative;
    display: flex;
    gap: var(--spacing-xs);
    background: var(--bg-secondary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
  }

  .active-indicator {
    position: absolute;
    top: var(--spacing-xs);
    left: var(--spacing-xs);
    height: calc(100% - calc(var(--spacing-xs) * 2));
    background: var(--color-primary);
    border-radius: var(--radius-sm);
    transition:
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    z-index: 0;
  }

  .segment-btn {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color var(--transition-fast);
    white-space: nowrap;

    :global(svg) {
      color: var(--text-secondary);
      transition: color var(--transition-fast);
    }

    &:hover {
      color: var(--text-primary);

      :global(svg) {
        color: var(--text-primary);
      }
    }

    &.active {
      color: var(--bg-primary);
      background: var(--color-primary);

      :global(svg) {
        color: var(--bg-primary);
      }
    }

    &.icon-only {
      padding: var(--spacing-xs);
      min-width: 2rem;
      justify-content: center;
    }
  }
</style>
