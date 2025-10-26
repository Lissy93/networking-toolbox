<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import type { NavItem, NavGroup } from '$lib/constants/nav';
  import '../../../../styles/pages.scss';

  // Extract DNS diagnostics tools
  function extractNavItems(items: (NavItem | NavGroup)[]): NavItem[] {
    const navItems: NavItem[] = [];
    for (const item of items) {
      if ('href' in item) {
        navItems.push(item);
      } else if ('title' in item && 'items' in item) {
        // Filter for DNS diagnostics only
        if (item.title === 'DNS Diagnostics') {
          navItems.push(...item.items);
        }
      }
    }
    return navItems;
  }

  const dnsTools = extractNavItems(SUB_NAV['/diagnostics'] || []);
</script>

<div class="page-container">
  <header class="page-header">
    <h1>DNS Diagnostics Tools</h1>
    <p class="page-description">
      Comprehensive DNS diagnostic and troubleshooting tools for network administrators. Verify DNS propagation, analyze
      email security policies, check certificate authority authorization, and diagnose nameserver consistency issues.
    </p>
  </header>

  <ToolsGrid tools={dnsTools} />
</div>

<style>
</style>
