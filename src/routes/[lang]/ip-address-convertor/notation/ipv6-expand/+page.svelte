<script lang="ts">
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import IPv6NotationConverter from '$lib/components/tools/IPv6NotationConverter.svelte';

  type NotationType = 'expand' | 'compress';

  let selectedTool = $state<NotationType>('expand');

  const navOptions = [
    {
      value: 'expand' as const,
      label: 'Expand',
      icon: 'ipv6-expand',
      href: '/ip-address-convertor/notation/ipv6-expand',
    },
    {
      value: 'compress' as const,
      label: 'Compress',
      icon: 'ipv6-compress',
      href: '/ip-address-convertor/notation/ipv6-compress',
    },
  ];

  const toolDescriptions: Record<NotationType, { title: string; description: string }> = {
    expand: {
      title: 'IPv6 Address Expander',
      description:
        'Convert compressed IPv6 addresses to their full 128-bit hexadecimal representation. This tool expands short IPv6 notation by adding leading zeros and replacing :: with the appropriate number of zero groups.',
    },
    compress: {
      title: 'IPv6 Address Compressor',
      description:
        'Convert expanded IPv6 addresses to their compressed, shortened format. This tool uses :: notation to represent consecutive zero groups and removes leading zeros for a cleaner, more readable IPv6 address.',
    },
  };
</script>

<ToolContentContainer
  title={toolDescriptions[selectedTool].title}
  description={toolDescriptions[selectedTool].description}
  {navOptions}
  bind:selectedNav={selectedTool}
>
  <IPv6NotationConverter mode="expand" />
</ToolContentContainer>
