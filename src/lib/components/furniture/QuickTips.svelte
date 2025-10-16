<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { SHOW_TIPS_ON_HOMEPAGE } from '$lib/config/customizable-settings';

  interface Tip {
    icon: string;
    title: string;
    description: string;
    shortcut?: string;
  }

  const tips: Tip[] = [
    {
      icon: 'settings',
      title: 'Customize the app in the settings',
      description: 'Choose your homepage layout, nav links, theme and more',
      shortcut: 'Ctrl + ,',
    },
    {
      icon: 'bookmarks',
      title: 'Bookmark tools for easy access and offline use',
      description: 'Just right-click on any tool to bookmark or edit it',
    },
    {
      icon: 'search',
      title: 'Use Ctrl + K to quickly search all tools',
      description: 'Or, try Ctrl + / to view all shortcuts',
      shortcut: 'Ctrl + K',
    },
  ];

  let visible = $state(false);
  let currentTipIndex = $state(0);
  let mounted = $state(false);

  const STORAGE_KEY = 'networking-toolbox-tips-dismissed';
  const TOOL_USAGE_KEY = 'networking-toolbox-tool-usage';

  function shouldShowTips(): boolean {
    const defaultShow = SHOW_TIPS_ON_HOMEPAGE;
    if (!browser) return false;

    try {
      // Check if tips were dismissed
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === 'true') return false;

      // Check tool usage count
      const toolUsageStr = localStorage.getItem(TOOL_USAGE_KEY);
      if (toolUsageStr) {
        const toolUsage = JSON.parse(toolUsageStr);
        const visitCount = Object.keys(toolUsage).length;
        if (visitCount >= 3) return false;
      }
      return defaultShow;
    } catch {
      return defaultShow;
    }
  }

  function dismissTips() {
    if (!browser) return;
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
    visible = false;
  }

  function nextTip() {
    currentTipIndex = (currentTipIndex + 1) % tips.length;
  }

  function previousTip() {
    currentTipIndex = (currentTipIndex - 1 + tips.length) % tips.length;
  }

  onMount(() => {
    mounted = true;
    if (shouldShowTips()) {
      // Load last viewed tip index
      try {
        const lastIndex = localStorage.getItem('networking-toolbox-tip-index');
        if (lastIndex) {
          currentTipIndex = parseInt(lastIndex, 10) % tips.length;
        }
      } catch {
        // Ignore
      }

      // Show tips after a brief delay for smooth entrance
      setTimeout(() => {
        visible = true;
      }, 800);
    }
  });

  // Save current tip index when it changes
  $effect(() => {
    if (browser && mounted) {
      try {
        localStorage.setItem('networking-toolbox-tip-index', currentTipIndex.toString());
      } catch {
        // Ignore
      }
    }
  });

  const currentTip = $derived(tips[currentTipIndex]);
</script>

{#if visible}
  <div class="quick-tips" role="complementary" aria-label="Quick tips">
    <button
      class="close-btn"
      onclick={dismissTips}
      aria-label="Dismiss tips"
      use:tooltip={"Hide, and don't show tips again"}
    >
      <Icon name="x" size="sm" />
    </button>

    <div class="tip-main">
      <div class="tip-content">
        <div class="tip-icon">
          <Icon name={currentTip.icon} size="md" />
        </div>

        <div class="tip-text">
          <h3>Tip: {currentTip.title}</h3>
          <p>{currentTip.description}</p>
          <!-- {#if currentTip.shortcut}
            <div class="tip-shortcut">
              <kbd>{currentTip.shortcut}</kbd>
            </div>
          {/if} -->
        </div>
      </div>

      <div class="tip-controls">
        <button class="nav-btn" onclick={previousTip} aria-label="Previous tip">
          <Icon name="arrow-left" size="sm" />
        </button>
        <button class="nav-btn" onclick={nextTip} aria-label="Next tip">
          <Icon name="arrow-right" size="sm" />
        </button>
      </div>
    </div>

    <div class="tip-dots">
      {#each tips as _, index (index)}
        <button
          class="dot"
          class:active={index === currentTipIndex}
          onclick={() => (currentTipIndex = index)}
          aria-label="Go to tip {index + 1}"
        ></button>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .quick-tips {
    position: relative;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-primary), transparent 92%),
      color-mix(in srgb, var(--color-primary), transparent 96%)
    );
    border: 1px solid color-mix(in srgb, var(--color-primary), transparent 70%);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md) var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
    box-shadow: var(--shadow-md);
    animation: slideInDown 0.5s ease-out;

    @media (max-width: 768px) {
      padding: var(--spacing-sm) var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    @media (max-width: 480px) {
      display: none;
    }
  }

  .close-btn {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
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

    &:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
  }

  .tip-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xs);

    @media (max-width: 640px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .tip-content {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
    flex: 1;
    padding-right: var(--spacing-lg);
    margin-top: var(--spacing-sm);

    @media (max-width: 640px) {
      gap: var(--spacing-sm);
      padding-right: 0;
    }
  }

  .tip-icon {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--color-primary), transparent 85%);
    border-radius: var(--radius-md);

    :global(svg) {
      color: var(--color-primary);
    }

    @media (max-width: 640px) {
      width: 2rem;
      height: 2rem;
    }
  }

  .tip-text {
    flex: 1;

    h3 {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-xs) 0;
      line-height: 1.3;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.4;
    }
  }

  .tip-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-shrink: 0;
    align-self: flex-end;

    @media (max-width: 640px) {
      align-self: flex-end;
    }

    .nav-btn {
      background: transparent;
      border: 1px solid var(--border-primary);
      color: var(--text-secondary);
      cursor: pointer;
      padding: var(--spacing-xs);
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: var(--bg-tertiary);
        border-color: var(--border-secondary);
        color: var(--text-primary);
      }
    }
  }

  .tip-dots {
    display: flex;
    justify-content: center;
    gap: var(--spacing-xs);
    padding-top: var(--spacing-xs);

    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: var(--radius-full);
      background: var(--border-primary);
      border: none;
      cursor: pointer;
      padding: 0;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--text-secondary);
      }

      &.active {
        background: var(--color-primary);
      }
    }
  }

  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-1rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
