import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface ToolUsage {
  [toolHref: string]: {
    count: number;
    lastVisited: number;
    label?: string;
    icon?: string;
    description?: string;
  };
}

const STORAGE_KEY = 'networking-toolbox-tool-usage';

const thresholdVisits = 4;
const maxItems = 6;

function createToolUsageStore() {
  const { subscribe, set, update } = writable<ToolUsage>({});

  return {
    subscribe,

    /**
     * Initialize the store from localStorage
     */
    init() {
      if (!browser) return;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          set(parsed);
        }
      } catch (error) {
        console.error('Failed to load tool usage data:', error);
        set({});
      }
    },

    /**
     * Track a tool visit
     */
    trackVisit(href: string, label?: string, icon?: string, description?: string) {
      if (!browser) return;

      update((usage) => {
        const newUsage = { ...usage };

        if (!newUsage[href]) {
          newUsage[href] = {
            count: 0,
            lastVisited: Date.now(),
            label,
            icon,
            description,
          };
        }

        newUsage[href].count++;
        newUsage[href].lastVisited = Date.now();

        // Update metadata if provided
        if (label) newUsage[href].label = label;
        if (icon) newUsage[href].icon = icon;
        if (description) newUsage[href].description = description;

        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
        } catch (error) {
          console.error('Failed to save tool usage data:', error);
        }

        return newUsage;
      });
    },

    /**
     * Clear all usage data
     */
    clear() {
      if (!browser) return;

      set({});
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear tool usage data:', error);
      }
    },

    /**
     * Remove specific tool from usage tracking
     */
    remove(href: string) {
      if (!browser) return;

      update((usage) => {
        const newUsage = { ...usage };
        delete newUsage[href];

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
        } catch (error) {
          console.error('Failed to save tool usage data:', error);
        }

        return newUsage;
      });
    },
  };
}

export const toolUsage = createToolUsageStore();

/**
 * Derived store for frequently used tools
 */
export const frequentlyUsedTools = derived(toolUsage, ($toolUsage) => {
  const sorted = Object.entries($toolUsage)
    .filter(([_, data]) => data.count >= thresholdVisits)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxItems);

  return sorted.map(([href, data]) => ({
    href,
    ...data,
  }));
});

/**
 * Derived store for recently used tools
 */
export const recentlyUsedTools = derived(toolUsage, ($toolUsage) => {
  const sorted = Object.entries($toolUsage)
    .sort((a, b) => b[1].lastVisited - a[1].lastVisited)
    .slice(0, maxItems);

  return sorted.map(([href, data]) => ({
    href,
    ...data,
  }));
});
