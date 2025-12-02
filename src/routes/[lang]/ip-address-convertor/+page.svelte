<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import type { NavItem, NavGroup } from '$lib/constants/nav';
  import '../../../styles/pages.scss';

  // Extract tools for IP address converter section
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

  const ipTools = extractNavItems(SUB_NAV['/ip-address-convertor'] || []);
</script>

<div class="page-container">
  <header class="page-header">
    <h1>IP Address Tools & Converters</h1>
    <p class="page-description">
      Comprehensive IP address manipulation tools for IPv4 and IPv6. Convert between formats, calculate distances,
      generate addresses, and work with advanced IPv6 features.
    </p>
  </header>

  <ToolsGrid tools={ipTools} />
</div>

<style>
</style>
