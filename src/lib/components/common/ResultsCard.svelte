<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';

  interface Props {
    title: string;
    onCopy?: () => void;
    copied?: boolean;
    copyText?: string;
    copiedText?: string;
    showCopyButton?: boolean;
    children: any;
  }

  let {
    title,
    onCopy,
    copied = false,
    copyText = 'Copy Results',
    copiedText = 'Copied!',
    showCopyButton = true,
    children,
  }: Props = $props();
</script>

<div class="card results-card">
  <div class="card-header row">
    <h3>{title}</h3>
    {#if showCopyButton && onCopy}
      <button class="copy-btn" onclick={onCopy} disabled={copied}>
        <span class={copied ? 'text-green-500' : ''}>
          <Icon name={copied ? 'check' : 'copy'} size="xs" />
        </span>
        {copied ? copiedText : copyText}
      </button>
    {/if}
  </div>
  <div class="card-content">
    {@render children()}
  </div>
</div>

<style>
  /* Styles are already in diagnostics-pages.scss */
  /* .results-card, .copy-btn are defined globally */
</style>
