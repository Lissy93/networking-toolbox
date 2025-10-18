<script lang="ts">
  import DHCPOption43Generator from '$lib/components/tools/DHCPOption43Generator.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
</script>

<ToolContentContainer
  title="DHCP Option 43 Generator"
  description="Generate vendor-specific DHCP Option 43 values for wireless controller auto-discovery. Supports Cisco, Aruba, Ruckus, UniFi, and more with multiple output formats."
>
  <DHCPOption43Generator />
</ToolContentContainer>
