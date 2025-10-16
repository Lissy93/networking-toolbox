<script lang="ts" generics="T extends Record<string, any>">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip.js';

  interface Props {
    examples: T[];
    selectedIndex?: number | null;
    onSelect: (example: T, index: number) => void;
    title?: string;
    getLabel: (example: T) => string;
    getDescription: (example: T) => string;
    getTooltip?: (example: T) => string;
  }

  let {
    examples,
    selectedIndex = null,
    onSelect,
    title = 'Quick Examples',
    getLabel,
    getDescription,
    getTooltip,
  }: Props = $props();
</script>

<div class="card examples-card">
  <details class="examples-details">
    <summary class="examples-summary">
      <Icon name="chevron-right" size="xs" />
      <h4>{title}</h4>
    </summary>
    <div class="examples-grid">
      {#each examples as example, i (i)}
        <button
          class="example-card"
          class:selected={selectedIndex === i}
          onclick={() => onSelect(example, i)}
          use:tooltip={getTooltip ? getTooltip(example) : getDescription(example)}
        >
          <h5>{getLabel(example)}</h5>
          <p>{getDescription(example)}</p>
        </button>
      {/each}
    </div>
  </details>
</div>

<style>
  /* Styles are already in diagnostics-pages.scss */
  /* This component uses existing shared styles */
</style>
