<script lang="ts">
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import CIDRDiff from '$lib/components/tools/CIDRDiff.svelte';
  import { SUB_NAV } from '$lib/constants/nav';

  type ToolType = 'diff' | 'overlap' | 'contains';

  let selectedTool = $state<ToolType>('diff');

  // Extract set operations nav items from nav.ts
  const setOperationsGroup = SUB_NAV['/cidr'].find((item) => 'title' in item && item.title === 'Set Operations');

  const navItems = setOperationsGroup && 'items' in setOperationsGroup ? setOperationsGroup.items : [];

  // Map icon names from nav.ts to match what the component expects
  const iconMap: Record<string, string> = {
    diff: 'minus',
    intersection: 'intersection',
    containment: 'containment',
  };

  // Map nav items to SegmentedControl format with hrefs
  const navOptions = navItems.map((item) => ({
    value: item.href.split('/').pop() as ToolType,
    label: item.label.split(' ')[0], // Extract first word (Difference, Overlap, Contains)
    icon: iconMap[item.icon || ''] || item.icon,
    href: item.href,
  }));

  // Map nav items to tool descriptions
  const toolDescriptions: Record<ToolType, { title: string; description: string }> = navItems.reduce(
    (acc, item) => {
      const key = item.href.split('/').pop() as ToolType;
      acc[key] = {
        title: item.label,
        description: item.description || '',
      };
      return acc;
    },
    {} as Record<ToolType, { title: string; description: string }>,
  );
</script>

<ToolContentContainer
  title={toolDescriptions[selectedTool].title}
  description={toolDescriptions[selectedTool].description}
  {navOptions}
  hideLabels={true}
  bind:selectedNav={selectedTool}
>
  <CIDRDiff />
</ToolContentContainer>
