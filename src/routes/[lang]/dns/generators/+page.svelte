<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import type { NavItem, NavGroup } from '$lib/constants/nav';
  import '../../../../styles/pages.scss';

  function extractNavItems(items: (NavItem | NavGroup)[]): NavItem[] {
    const navItems: NavItem[] = [];
    for (const item of items) {
      if ('href' in item) {
        navItems.push(item);
      } else if ('title' in item && 'items' in item) {
        navItems.push(...item.items);
      }
    }
    return navItems;
  }

  const dnsGenerators = extractNavItems(
    ((
      SUB_NAV['/dns']?.find((section) => 'title' in section && section.title === 'Record Generators') as {
        items?: unknown[];
      }
    )?.items as (NavItem | NavGroup)[]) || [],
  );
</script>

<div class="page-container">
  <header class="page-header">
    <h1>DNS Record Generators</h1>
    <p class="page-description">
      Professional DNS record generation tools with built-in validation and best practices. Create bulk A/AAAA records,
      build validated CNAME chains, and plan MX configurations with proper fallback strategies.
    </p>
  </header>

  <ToolsGrid tools={dnsGenerators} />
</div>
