<script lang="ts" generics="T extends string">
  import { onMount } from 'svelte';
  import SegmentedControl from '$lib/components/global/SegmentedControl.svelte';
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

  onMount(() => {
    updateHideLabels();
    window.addEventListener('resize', updateHideLabels);
    return () => window.removeEventListener('resize', updateHideLabels);
  });
</script>

<div class="card">
  <header class="card-header">
    <div class="header-content">
      <h2>{title}</h2>
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

<style>
  .card-header {
    flex-direction: row;
    gap: var(--spacing-md);
    @media (max-width: 600px) {
      flex-direction: column;
    }
  }
</style>
