<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';

  interface Props {
    title?: string;
    error: string | null;
  }

  let { title = 'Error', error }: Props = $props();
</script>

{#if error}
  <div class="card error-card">
    <div class="card-content">
      <div class="error-content">
        <Icon name="alert-triangle" size="md" />
        <div>
          <strong>{title}</strong>
          <p>{error}</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Styles are already in diagnostics-pages.scss */
  /* .error-card, .error-content are defined globally */
</style>
