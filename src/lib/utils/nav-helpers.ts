import { ALL_PAGES, SUB_NAV, TOP_NAV, type NavItem, type NavGroup } from '$lib/constants/nav';

/**
 * Find a tool/page by its href path
 */
export function findToolByHref(href: string): NavItem | null {
  return ALL_PAGES.find((item) => item.href === href) || null;
}

/**
 * Check if a nav item is active for a given pathname
 */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Check if a nav group has an active item
 */
export function isGroupWithActiveItem(pathname: string, groupItem: NavGroup): boolean {
  if (groupItem.items.length === 0) return false;
  return groupItem.items.some((item) => isActive(pathname, item.href));
}

/**
 * Check if a nav group has an active sub-dropdown
 */
export function isGroupWithActiveSubDropdown(activeSubDropdown: string | null, groupItem: NavGroup): boolean {
  if (groupItem.items.length === 0) return false;
  return 'title' in groupItem && activeSubDropdown === groupItem.title;
}

/**
 * Extract all nav items from a mixed structure of NavItem and NavGroup
 * Recursively flattens nav groups into individual nav items
 */
export function extractAllNavItems(navStructure: (NavItem | NavGroup)[]): NavItem[] {
  const items: NavItem[] = [];

  for (const item of navStructure) {
    if ('items' in item) {
      // It's a NavGroup - recursively extract items from its children
      items.push(...extractAllNavItems(item.items));
    } else if ('href' in item && 'label' in item) {
      // It's a NavItem (has href and label, but no items)
      items.push(item as NavItem);
    }
  }

  return items;
}

/**
 * Find the section key (e.g. '/reference') that matches a pathname
 */
export function findSectionKey(pathname: string): string | null {
  const keys = Object.keys(SUB_NAV);
  return keys.find((k) => isActive(pathname, k)) ?? null;
}

/**
 * Get page details for SEO from navigation
 */
export function getPageDetails(href: string): { title: string; description: string; keywords: string[] } | null {
  // First check ALL_PAGES (sub-pages)
  for (const item of ALL_PAGES) {
    if (item.href === href) {
      return {
        title: item.label,
        description: item.description || '',
        keywords: item.keywords || [],
      };
    }
  }

  // Then check TOP_NAV (top-level pages)
  for (const item of TOP_NAV) {
    if (item.href === href) {
      return {
        title: item.label,
        description: item.description || '',
        keywords: item.keywords || [],
      };
    }
  }

  // Check SUB_NAV for section-level metadata (e.g. /cidr)
  const sectionData = SUB_NAV[href];
  if (sectionData && sectionData.length > 0) {
    const firstItem = sectionData[0];
    // Check if it's a NavGroup with title/description
    if ('title' in firstItem && 'description' in firstItem) {
      return {
        title: firstItem.title,
        description: firstItem.description || '',
        keywords: [],
      };
    }
  }

  // Fallback: check for parent section if current path is a sub-path
  // e.g. /cidr/mask-converter should use /cidr section metadata
  const pathSegments = href.split('/').filter(Boolean);
  if (pathSegments.length > 1) {
    const parentPath = '/' + pathSegments[0];
    const parentSectionData = SUB_NAV[parentPath];
    if (parentSectionData && parentSectionData.length > 0) {
      const firstItem = parentSectionData[0];
      if ('title' in firstItem && 'description' in firstItem) {
        return {
          title: firstItem.title,
          description: firstItem.description || '',
          keywords: [],
        };
      }
    }
  }

  return null;
}

/**
 * Get page details including icon for dynamic favicon
 */
export function getPageDetailsWithIcon(
  href: string,
): { title: string; description: string; keywords: string[]; icon?: string } | null {
  // First check ALL_PAGES (sub-pages)
  for (const item of ALL_PAGES) {
    if (item.href === href) {
      return {
        title: item.label,
        description: item.description || '',
        keywords: item.keywords || [],
        icon: item.icon,
      };
    }
  }

  // Then check TOP_NAV (top-level pages)
  for (const item of TOP_NAV) {
    if (item.href === href) {
      return {
        title: item.label,
        description: item.description || '',
        keywords: item.keywords || [],
        icon: item.icon,
      };
    }
  }

  // Fallback: check for parent section if current path is a sub-path
  const pathSegments = href.split('/').filter(Boolean);
  if (pathSegments.length > 1) {
    const parentPath = '/' + pathSegments[0];
    const parentSectionData = SUB_NAV[parentPath];
    if (parentSectionData && parentSectionData.length > 0) {
      const firstItem = parentSectionData[0];
      if ('title' in firstItem && 'description' in firstItem) {
        return {
          title: firstItem.title,
          description: firstItem.description || '',
          keywords: [],
          icon: undefined,
        };
      }
    }
  }

  return null;
}
