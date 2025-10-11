import { writable } from 'svelte/store';
import { browser } from '$app/environment';

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

// Get initial value from data attribute or localStorage (runs immediately on import)
function getInitialLayout(): HomepageLayoutMode {
  if (typeof window !== 'undefined') {
    try {
      const dataAttr = document.documentElement.getAttribute('data-initial-layout');
      const stored = dataAttr || localStorage.getItem('homepage-layout');
      const isValidMode = homepageLayoutOptions.some((option) => option.id === stored);
      return isValidMode ? (stored as HomepageLayoutMode) : 'categories';
    } catch {
      return 'categories';
    }
  }
  return 'categories';
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
        console.warn(`Homepage layout mode "${mode}" is not valid`);
        return;
      }

      set(mode);

      if (browser) {
        localStorage.setItem(STORAGE_KEY, mode);
      }
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
