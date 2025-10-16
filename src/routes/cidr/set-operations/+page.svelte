<script lang="ts">
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import CIDRDiff from '$lib/components/tools/CIDRDiff.svelte';
  import CIDROverlap from '$lib/components/tools/CIDROverlap.svelte';
  import CIDRContains from '$lib/components/tools/CIDRContains.svelte';

  type ToolType = 'diff' | 'overlap' | 'contains';

  let selectedTool = $state<ToolType>('diff');

  const navOptions = [
    { value: 'diff' as const, label: 'Difference', icon: 'minus' },
    { value: 'overlap' as const, label: 'Overlap', icon: 'intersection' },
    { value: 'contains' as const, label: 'Contains', icon: 'containment' },
  ];

  const toolDescriptions: Record<ToolType, { title: string; description: string }> = {
    diff: {
      title: 'CIDR Difference (A - B)',
      description:
        'Compute A - B where A and B are sets of IP addresses, CIDR blocks, or ranges. Shows minimal non-overlapping results.',
    },
    overlap: {
      title: 'CIDR Overlap Checker (A ∩ B)',
      description:
        'Determine if two sets of IP addresses, CIDR blocks, or ranges intersect and show the overlapping regions.',
    },
    contains: {
      title: 'CIDR Containment Checker (A ⊇ B)',
      description:
        'Check if set A fully contains each item in set B. Supports many-to-many containment analysis with detailed classification.',
    },
  };

  function handleNavChange(value: ToolType) {
    selectedTool = value;
  }
</script>

<ToolContentContainer
  title={toolDescriptions[selectedTool].title}
  description={toolDescriptions[selectedTool].description}
  {navOptions}
  bind:selectedNav={selectedTool}
  onNavChange={handleNavChange}
>
  {#if selectedTool === 'diff'}
    <CIDRDiff />
  {:else if selectedTool === 'overlap'}
    <CIDROverlap />
  {:else if selectedTool === 'contains'}
    <CIDRContains />
  {/if}
</ToolContentContainer>
