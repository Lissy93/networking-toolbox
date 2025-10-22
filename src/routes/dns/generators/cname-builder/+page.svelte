<script lang="ts">
  import { getPageDetails } from '$lib/utils/nav-helpers';
  import DNSCNAMEBuilder from '$lib/components/tools/DNSCNAMEBuilder.svelte';
  import '../../../../styles/pages.scss';

  const _pageDetails = getPageDetails('/dns/generators/cname-builder');
</script>

<DNSCNAMEBuilder />
