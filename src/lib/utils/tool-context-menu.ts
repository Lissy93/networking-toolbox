import { activeContextMenu } from '$lib/stores/contextMenu';
import { bookmarks } from '$lib/stores/bookmarks';
import { recentlyUsedTools, toolUsage } from '$lib/stores/toolUsage';
import { site } from '$lib/constants/site';
import { get } from 'svelte/store';

export interface ToolContextMenuOptions {
  tool: {
    href: string;
    label?: string;
    icon?: string;
    description?: string;
  };
  bookmarkedTools?: Array<{ href: string }>;
  recentTools?: Array<{ href: string }>;
}

export function handleToolContextMenu(e: MouseEvent, tool: { href: string }) {
  e.preventDefault();
  e.stopPropagation();
  const menuId = `context-menu-${tool.href}`;
  activeContextMenu.open(menuId, e.clientX, e.clientY);
}

export function getToolContextMenuId(tool: { href: string }): string {
  return `context-menu-${tool.href}`;
}

export function getToolContextMenuItems(options: ToolContextMenuOptions) {
  const { tool, bookmarkedTools, recentTools } = options;

  const currentBookmarks = bookmarkedTools ?? get(bookmarks);
  const currentRecents = recentTools ?? get(recentlyUsedTools);

  const isBookmarked = currentBookmarks.some((b) => b.href === tool.href);
  const isInRecents = currentRecents.some((t) => t.href === tool.href);

  const toggleBookmark = () => {
    if (isBookmarked) {
      bookmarks.remove(tool.href);
    } else {
      bookmarks.add({
        href: tool.href,
        label: tool.label || '',
        icon: tool.icon || 'default',
        description: tool.description || '',
      });
    }
  };

  const removeFromRecents = () => {
    toolUsage.remove(tool.href);
  };

  const copyUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : site.url;
    const url = `${origin}${tool.href}`;
    navigator.clipboard.writeText(url);
  };

  const openTool = () => {
    window.open(tool.href, '_self');
  };

  return [
    {
      label: isBookmarked ? 'Remove Bookmark' : 'Bookmark',
      icon: isBookmarked ? 'bookmark-remove' : 'bookmark-add',
      action: toggleBookmark,
    },
    {
      label: 'Open',
      icon: 'external-link',
      action: openTool,
    },
    {
      label: 'Copy URL',
      icon: 'link',
      action: copyUrl,
    },
    {
      label: 'Remove from Recents',
      icon: 'trash',
      action: removeFromRecents,
      condition: isInRecents,
    },
  ];
}
