<script lang="ts">
  import DHCPFingerprinting from '$lib/components/tools/DHCPFingerprinting.svelte';
</script>

<svelte:head>
  <title>DHCP Fingerprinting Database | IP Calc</title>
  <meta
    name="description"
    content="Identify devices based on their DHCP fingerprints using Parameter Request List (Option 55) and Vendor Class Identifier (Option 60). Search through a comprehensive database of known device signatures."
  />
  <meta
    name="keywords"
    content="dhcp, fingerprinting, device identification, parameter request list, option 55, option 60, vendor class, network discovery, device detection"
  />
</svelte:head>

<DHCPFingerprinting />
