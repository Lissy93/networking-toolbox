import type { NavItem, NavGroup } from '$lib/constants/nav';

/**
 * Extract NavItems from a mixed array of NavItems and NavGroups
 * @param items Array of NavItems and/or NavGroups
 * @returns Flattened array of NavItems
 */
export function extractNavItems(items: (NavItem | NavGroup)[]): NavItem[] {
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
