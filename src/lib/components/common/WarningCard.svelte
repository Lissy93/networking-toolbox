<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';

  interface Props {
    title?: string;
    warnings: string[];
  }

  let { title = 'Warning', warnings }: Props = $props();
</script>

{#if warnings.length > 0}
  <div class="card warning-card">
    <div class="card-content">
      <div class="warning-content">
        <Icon name="alert-triangle" size="sm" />
        <div class="warning-messages">
          {#if title}
            <strong>{title}</strong>
          {/if}
          {#each warnings as warning (warning)}
            <p>{warning}</p>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Styles are already in diagnostics-pages.scss */
  /* .warning-card, .warning-content are defined globally */
  .warning-messages {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
</style>
