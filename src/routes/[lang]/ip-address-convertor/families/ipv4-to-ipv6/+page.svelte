<script lang="ts">
  import IPFamilyConverter from '$lib/components/tools/IPFamilyConverter.svelte';
</script>

<IPFamilyConverter
  direction="ipv4-to-ipv6"
  title="IPv4 to IPv6 Converter"
  description="Convert IPv4 addresses to IPv6 format using IPv4-mapped IPv6 addressing. This creates IPv6 addresses that embed IPv4 addresses for compatibility purposes."
/>
