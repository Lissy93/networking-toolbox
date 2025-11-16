<script lang="ts">
  import { page } from '$app/stores';
  import { SUB_NAV } from '$lib/constants/nav';
  import Icon from '$lib/components/global/Icon.svelte';

  let { children } = $props();

  const pages = SUB_NAV['/reference']?.flatMap((s) => ('items' in s ? s.items : [s])) ?? [];
  const idx = $derived(pages.findIndex((p) => p.href === ($page.url?.pathname ?? '/')));
  const isRef = $derived(idx > -1);
  const prev = $derived(pages[idx - 1]);
  const next = $derived(pages[idx + 1]);
  const progress = $derived(isRef ? ((idx + 1) / pages.length) * 100 : 0);
  const nav = $derived([
    { item: prev, side: 'Previous', icon: 'previous' },
    { item: next, side: 'Next', icon: 'next' },
  ]);
</script>

{@render children?.()}

{#if isRef}
  <nav class="ref-nav card">
    <div class="nav-buttons">
      {#each nav as { item, side, icon }, index (index)}
        {#if item}
          <a href={item.href} class="nav-btn" class:next={side === 'Next'}>
            <Icon name={icon} />
            <div>
              <div class="label">{side}</div>
              <div class="title">{item.label}</div>
            </div>
          </a>
        {/if}
      {/each}
    </div>

    <div class="progress">
      {idx + 1} of {pages.length}
      <div class="progress-bar">
        <div class="progress-fill" style:width={`${progress}%`}></div>
      </div>
    </div>
  </nav>
{/if}

<style lang="scss">
  .ref-nav {
    margin: var(--spacing-xl) auto 0;
    padding: var(--spacing-lg);
    max-width: 1000px;
    border-top: 1px solid var(--border-secondary);
    background: var(--bg-secondary);
    .nav-buttons {
      display: flex;
      justify-content: space-between;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .nav-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      text-decoration: none;
      color: inherit;
      transition: all var(--transition-fast);
      min-width: 16rem;
      &:hover {
        background: var(--surface-hover);
        border-color: var(--color-primary);
        transform: translateY(-1px);
        :global(.icon) {
          transition: all var(--transition-slow);
          transform: translateX(-4px) scale(1.1);
        }
      }
      &.next {
        flex-direction: row-reverse;
        text-align: right;
        &:hover :global(.icon) {
          transform: translateX(4px) scale(1.1);
        }
      }
    }

    .label {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      text-transform: uppercase;
    }
    .title {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .progress {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--border-secondary);
      .progress-bar {
        flex: 1;
        height: 4px;
        background: var(--border-secondary);
        border-radius: 2px;
        overflow: hidden;
        transition: all var(--transition-medium);
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
          transition: all var(--transition-medium) ease-out;
        }
      }
    }
  }
</style>
