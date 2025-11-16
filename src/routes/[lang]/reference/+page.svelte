<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import type { NavItem, NavGroup } from '$lib/constants/nav';

  // Extract reference pages from SUB_NAV
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

  const referencePages = extractNavItems(SUB_NAV['/reference'] || []);
</script>

<div class="ref-header">
  <h1>Networking Pocket Reference</h1>
  <p>
    Offline quick guides, cheat sheets and reference info, for networking concepts, IP addressing, and common protocols
  </p>
</div>

<ToolsGrid tools={referencePages} />

<style>
</style>
