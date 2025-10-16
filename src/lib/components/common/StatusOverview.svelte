<script lang="ts">
  import Icon, { type IconName } from '$lib/components/global/Icon.svelte';

  interface StatusItem {
    icon: IconName;
    value: string;
    label: string;
    status?: 'success' | 'warning' | 'error' | 'info';
    tooltip?: string;
  }

  interface Props {
    items: StatusItem[];
  }

  let { items }: Props = $props();
</script>

<div class="status-overview">
  {#each items as item (item.label)}
    <div class="status-item {item.status || ''}">
      <Icon name={item.icon} size="sm" />
      <div>
        <strong>{item.value}</strong>
        <div class="status-text">{item.label}</div>
      </div>
    </div>
  {/each}
</div>

<style>
  /* Styles are already in diagnostics-pages.scss */
  /* .status-overview, .status-item are defined globally */
  .status-text {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: 2px;
  }
</style>
