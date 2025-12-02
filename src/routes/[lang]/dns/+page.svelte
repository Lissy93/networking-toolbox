<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import type { NavItem, NavGroup } from '$lib/constants/nav';
  import '../../../styles/pages.scss';

  // Extract tools for DNS section (excluding category headers with title)
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

  const dnsTools = extractNavItems(SUB_NAV['/dns'] || []);
</script>

<div class="page-container">
  <header class="page-header">
    <h1>DNS Tools & Record Generators</h1>
    <p class="page-description">
      Professional DNS management tools for network administrators. Generate PTR records, create zone files, and manage
      reverse DNS lookups for both IPv4 and IPv6 networks.
    </p>
  </header>

  <ToolsGrid tools={dnsTools} />
</div>

<style>
</style>
