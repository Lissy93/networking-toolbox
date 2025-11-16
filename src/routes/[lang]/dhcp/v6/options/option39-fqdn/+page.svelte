<script lang="ts">
  import DHCPv6FQDN from '$lib/components/tools/DHCPv6FQDN.svelte';
</script>

<svelte:head>
  <title>DHCPv6 Client FQDN Option (Option 39) - RFC 4704 | IP Calc</title>
  <meta
    name="description"
    content="Configure DHCPv6 Client FQDN Option (Option 39) for dynamic DNS updates. Build fully qualified domain name options with S, O, and N flags per RFC 4704."
  />
  <meta
    name="keywords"
    content="dhcpv6, fqdn, option 39, client fqdn, dynamic dns, ddns, ipv6, rfc 4704, dns updates, hostname, wire format, kea, isc, flags"
  />
</svelte:head>

<DHCPv6FQDN />
