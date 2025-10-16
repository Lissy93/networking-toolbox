import { writable } from 'svelte/store';
import { storage } from '$lib/utils/localStorage';
import { logger } from '$lib/utils/logger';
import { DEFAULT_HOMEPAGE_LAYOUT } from '$lib/config/customizable-settings';

export type HomepageLayoutMode =
  | 'default'
  | 'minimal'
  | 'carousel'
  | 'categories'
  | 'bookmarks'
  | 'small-icons'
  | 'list'
  | 'search'
  | 'empty';

export interface HomepageLayoutOption {
  id: HomepageLayoutMode;
  name: string;
  description: string;
}

const STORAGE_KEY = 'homepage-layout';

// Available homepage layout options
export const homepageLayoutOptions: HomepageLayoutOption[] = [
  {
    id: 'categories',
    name: 'Categories',
    description: 'Organized by tool categories with flexible grid layout',
  },
  {
    id: 'default',
    name: 'Tiles',
    description: 'Full homepage with all sections and features',
  },
  {
    id: 'list',
    name: 'List',
    description: 'Hierarchical tree view of all tools and pages',
  },
  {
    id: 'empty',
    name: 'Noting',
    description: 'Show nothing',
  },
  {
    id: 'bookmarks',
    name: 'Bookmarks',
    description: 'Show only your bookmarked tools',
  },
  {
    id: 'search',
    name: 'Search',
    description: 'Search-focused layout with instant tool discovery',
  },
  // {
  //   id: 'minimal',
  //   name: 'Tiles',
  //   description: 'Clean, simplified homepage layout',
  // },
  {
    id: 'carousel',
    name: 'Carousel',
    description: 'Full homepage with all sections and features',
  },
  {
    id: 'small-icons',
    name: 'Small Icons',
    description: 'Compact grid of tool icons only',
  },
];

// Validate that a layout mode is valid
function isValidLayout(layout: string | null): boolean {
  if (!layout) return false;
  return homepageLayoutOptions.some((option) => option.id === layout);
}

// Get initial value from localStorage (runs immediately on import)
function getInitialLayout(): HomepageLayoutMode {
  // Validate DEFAULT_HOMEPAGE_LAYOUT, fallback to 'categories' if invalid
  const validDefault = isValidLayout(DEFAULT_HOMEPAGE_LAYOUT) ? DEFAULT_HOMEPAGE_LAYOUT : 'categories';

  return storage.getItem(STORAGE_KEY, {
    defaultValue: validDefault,
    validate: (val): val is HomepageLayoutMode => isValidLayout(val as string),
    serialize: false,
  });
}

function createHomepageLayoutStore() {
  const { subscribe, set } = writable<HomepageLayoutMode>(getInitialLayout());

  return {
    subscribe,

    // Initialize from localStorage or default
    // Note: Store is already initialized with correct value on creation,
    // this is kept for backwards compatibility and does nothing
    init: () => {
      return getInitialLayout();
    },

    // Set homepage layout mode and persist to localStorage
    setMode: (mode: HomepageLayoutMode) => {
      const option = homepageLayoutOptions.find((opt) => opt.id === mode);
      if (!option) {
        logger.warn(`Homepage layout mode "${mode}" is not valid`, { mode, component: 'HomepageLayoutStore' });
        return;
      }

      set(mode);
      storage.setItem(STORAGE_KEY, mode, { serialize: false });
    },

    // Get option configuration
    getOption: (mode: HomepageLayoutMode): HomepageLayoutOption | undefined => {
      return homepageLayoutOptions.find((opt) => opt.id === mode);
    },

    // Get all available options
    getAllOptions: (): HomepageLayoutOption[] => {
      return homepageLayoutOptions;
    },
  };
}

export const homepageLayout = createHomepageLayoutStore();
