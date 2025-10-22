<script lang="ts">
  import { getPageDetails } from '$lib/utils/nav-helpers';
  import DNSMXPlanner from '$lib/components/tools/DNSMXPlanner.svelte';
  import '../../../../styles/pages.scss';

  const _pageDetails = getPageDetails('/dns/generators/mx-planner');
</script>

<DNSMXPlanner />
