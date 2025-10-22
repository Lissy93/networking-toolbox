<script lang="ts">
  import { getPageDetails } from '$lib/utils/nav-helpers';
  import DNSSPFBuilder from '$lib/components/tools/DNSSPFBuilder.svelte';
  import '../../../../styles/pages.scss';

  const _pageDetails = getPageDetails('/dns/generators/spf-builder');
</script>

<DNSSPFBuilder />
