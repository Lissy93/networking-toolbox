<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import type { NavItem, NavGroup } from '$lib/constants/nav';
  import '../../styles/pages.scss';

  // Extract tools for DHCP section (excluding category headers with title)
  function extractNavItems(items: (NavItem | NavGroup)[]): NavItem[] {
    const navItems: NavItem[] = [];
    for (const item of items) {
      if ('items' in item) {
        // It's a category - extract its children recursively
        navItems.push(...extractNavItems(item.items));
      } else if ('href' in item && 'label' in item && !('title' in item)) {
        // It's a tool (has href and label but no title)
        navItems.push(item as NavItem);
      }
    }
    return navItems;
  }

  const dhcpTools = extractNavItems(SUB_NAV['/dhcp'] || []);
</script>

<div class="page-container">
  <header class="page-header">
    <h1>DHCP Tools & Option Generators</h1>
    <p class="page-description">
      DHCP configuration tools for network administrators. Generate vendor-specific options, build relay agent
      information, create class-based policies, and configure DHCP servers with complete subnet snippets.
    </p>
  </header>

  <ToolsGrid tools={dhcpTools} />
</div>
