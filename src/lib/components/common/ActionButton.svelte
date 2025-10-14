<script lang="ts">
  import Icon, { type IconName } from '$lib/components/global/Icon.svelte';

  interface Props {
    loading?: boolean;
    disabled?: boolean;
    icon?: IconName;
    loadingIcon?: IconName;
    loadingText?: string;
    children: any;
    onclick?: () => void;
    class?: string;
  }

  let {
    loading = false,
    disabled = false,
    icon,
    loadingIcon = 'loader',
    loadingText,
    children,
    onclick,
    class: className = '',
  }: Props = $props();

  const isDisabled = $derived(loading || disabled);
</script>

<button class="lookup-btn {className}" {onclick} disabled={isDisabled}>
  {#if loading}
    <Icon name={loadingIcon} size="sm" animate="spin" />
    {loadingText || children}
  {:else}
    {#if icon}
      <Icon name={icon} size="sm" />
    {/if}
    {@render children()}
  {/if}
</button>

<style>
  /* Styles are already in diagnostics-pages.scss */
  /* .lookup-btn is defined globally */
</style>
