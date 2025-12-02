<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import type { NavItem, NavGroup } from '$lib/constants/nav';
  import '../../../styles/pages.scss';

  // Extract tools for diagnostics section
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

  const diagnosticsTools = extractNavItems(SUB_NAV['/diagnostics'] || []);
</script>

<div class="page-container">
  <header class="page-header">
    <h1>Network Diagnostics Tools</h1>
    <p class="page-description">
      Advanced network diagnostic tools for troubleshooting and analysis. Check DNS propagation, analyze email security
      policies, verify nameserver consistency, and diagnose network infrastructure issues.
    </p>
  </header>

  <ToolsGrid tools={diagnosticsTools} />
</div>

<style>
</style>
