<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initLanguage, loadNamespaces } from '$lib/stores/language';

  let { children } = $props();

  onMount(async () => {
    // Initialize language from URL parameter
    const langParam = $page.params.lang;
    if (langParam) {
      initLanguage(`/${langParam}${$page.url.pathname.replace(`/${langParam}`, '')}`);

      // Load base translations for the language
      await loadNamespaces(langParam, ['common', 'nav', 'settings']);
    }
  });
</script>

<!-- Render children (the actual page content) -->
{@render children?.()}
