<script lang="ts" generics="T extends string">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import SegmentedControl from '$lib/components/global/SegmentedControl.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { bookmarks, type BookmarkedTool } from '$lib/stores/bookmarks';
  import { findToolByHref } from '$lib/utils/nav-helpers';
  import { tooltip } from '$lib/actions/tooltip';
  import type { Snippet } from 'svelte';

  interface NavOption {
    value: T;
    label: string;
    icon?: string;
    href?: string;
  }

  interface Props {
    title: string;
    description: string;
    navOptions?: NavOption[];
    selectedNav?: T;
    onNavChange?: (value: T) => void;
    contentClass?: string;
    children: Snippet;
    hideLabels?: boolean;
  }

  let {
    title,
    description,
    navOptions,
    selectedNav = $bindable(),
    onNavChange,
    contentClass,
    children,
    hideLabels: propHideLabels = false,
  }: Props = $props();

  let hideLabels = $state(false);

  function updateHideLabels() {
    hideLabels = propHideLabels || window.innerWidth < 768;
  }

  const currentPath = $derived($page.url.pathname);
  const currentTool = $derived(findToolByHref(currentPath));
  const isBookmarked = $derived(currentTool ? bookmarks.isBookmarked(currentTool.href, $bookmarks) : false);
  const tooltipText = $derived(
    currentTool
      ? isBookmarked
        ? `Remove ${currentTool.label} from bookmarks`
        : `Bookmark ${currentTool.label} for quick access and offline use`
      : '',
  );

  onMount(() => {
    updateHideLabels();
    window.addEventListener('resize', updateHideLabels);
    bookmarks.init();
    return () => window.removeEventListener('resize', updateHideLabels);
  });

  function toggleBookmark(e: Event) {
    e.preventDefault();
    e.stopPropagation();

    if (!currentTool) return;

    const bookmarkedTool: BookmarkedTool = {
      href: currentTool.href,
      label: currentTool.label,
      description: currentTool.description || '',
      icon: currentTool.icon || 'default',
    };

    bookmarks.toggle(bookmarkedTool);
  }
</script>

<div class="card" role="region">
  <header class="card-header">
    <div class="header-content">
      <div class="title-row">
        <h1>{title}</h1>
        {#if currentTool}
          <button
            class="bookmark-btn"
            class:bookmarked={isBookmarked}
            onclick={toggleBookmark}
            use:tooltip={{ text: tooltipText }}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <div class="bookmark-icon">
              {#if isBookmarked}
                <Icon name="bookmarks" size="sm" />
              {:else}
                <Icon name="bookmark-add" size="md" />
              {/if}
            </div>
            {#if isBookmarked}
              <div class="bookmark-icon bookmark-icon-hover">
                <Icon name="bookmark-remove" size="sm" />
              </div>
            {/if}
          </button>
        {/if}
      </div>
      <p>{description}</p>
    </div>
    {#if navOptions && selectedNav !== undefined}
      <div class="header-controls">
        <SegmentedControl options={navOptions} bind:value={selectedNav} onchange={onNavChange} hideLabel={hideLabels} />
      </div>
    {/if}
  </header>

  {#if contentClass}
    <div class={contentClass}>
      {@render children()}
    </div>
  {:else}
    {@render children()}
  {/if}
</div>

<style lang="scss">
  .card-header {
    flex-direction: row;
    gap: var(--spacing-md);
    @media (max-width: 600px) {
      flex-direction: column;
    }
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    position: relative;

    h1 {
      margin: 0;
      flex: 1;
      font-size: var(--font-size-2xl);
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
    overflow: hidden;
    position: relative;

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

    .bookmark-icon {
      display: flex;
      width: fit-content;
      height: fit-content;
      transition: opacity 0.2s ease;
    }

    .bookmark-icon-hover {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      pointer-events: none;
    }

    &.bookmarked {
      color: var(--color-primary);

      &:hover {
        color: var(--color-error);
        transform: scale(1.1) rotate(-5deg);

        .bookmark-icon:not(.bookmark-icon-hover) {
          opacity: 0;
        }

        .bookmark-icon-hover {
          opacity: 1;
        }
      }
    }

    :global(svg) {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
