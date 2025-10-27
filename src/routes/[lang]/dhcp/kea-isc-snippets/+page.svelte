<script lang="ts">
  import DHCPSnippetsGenerator from '$lib/components/tools/DHCPSnippetsGenerator.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
</script>

<ToolContentContainer
  title="DHCP Kea/ISC Snippets Generator"
  description="Generate complete subnet configurations for ISC dhcpd and Kea DHCP servers with vendor discovery options (Option 43/60), client classes, and static reservations."
>
  <DHCPSnippetsGenerator />
</ToolContentContainer>
