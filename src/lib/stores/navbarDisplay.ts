import { writable } from 'svelte/store';
import { DEFAULT_NAVBAR_DISPLAY } from '$lib/config/customizable-settings';
import { storage } from '$lib/utils/localStorage';
import { logger } from '$lib/utils/logger';
export type NavbarDisplayMode = 'default' | 'bookmarked' | 'frequent' | 'none';

export interface NavbarDisplayOption {
  id: NavbarDisplayMode;
  name: string;
  description: string;
}

const STORAGE_KEY = 'navbar-display';

// Available navbar display options
export const navbarDisplayOptions: NavbarDisplayOption[] = [
  {
    id: 'default',
    name: 'Default/All',
    description: 'Show dropdown links for each page/sub-page',
  },
  {
    id: 'bookmarked',
    name: 'Bookmarked',
    description: 'Show bookmarked links in the top nav',
  },
  {
    id: 'frequent',
    name: 'Frequent',
    description: 'Show most frequently used tools',
  },
  {
    id: 'none',
    name: 'None',
    description: "Don't show any links in the top nav",
  },
];

// Validate that a navbar display mode is valid
function isValidNavbarDisplay(mode: string | null): boolean {
  if (!mode) return false;
  return navbarDisplayOptions.some((option) => option.id === mode);
}

// Get initial value from localStorage (runs immediately on import)
function getInitialNavbarDisplay(): NavbarDisplayMode {
  const validDefault = isValidNavbarDisplay(DEFAULT_NAVBAR_DISPLAY) ? DEFAULT_NAVBAR_DISPLAY : 'default';

  return storage.getItem(STORAGE_KEY, {
    defaultValue: validDefault,
    validate: (val): val is NavbarDisplayMode => isValidNavbarDisplay(val as string),
    serialize: false,
  });
}

function createNavbarDisplayStore() {
  const { subscribe, set } = writable<NavbarDisplayMode>(getInitialNavbarDisplay());

  return {
    subscribe,

    // Initialize from localStorage or default
    // Note: Store is already initialized with correct value on creation,
    // this is kept for backwards compatibility and does nothing
    init: () => {
      return getInitialNavbarDisplay();
    },

    // Set navbar display mode and persist to localStorage
    setMode: (mode: NavbarDisplayMode) => {
      const option = navbarDisplayOptions.find((opt) => opt.id === mode);
      if (!option) {
        logger.warn(`Navbar display mode "${mode}" is not valid`, { mode, component: 'NavbarDisplayStore' });
        return;
      }

      set(mode);
      storage.setItem(STORAGE_KEY, mode, { serialize: false });
    },

    // Get option configuration
    getOption: (mode: NavbarDisplayMode): NavbarDisplayOption | undefined => {
      return navbarDisplayOptions.find((opt) => opt.id === mode);
    },

    // Get all available options
    getAllOptions: (): NavbarDisplayOption[] => {
      return navbarDisplayOptions;
    },
  };
}

export const navbarDisplay = createNavbarDisplayStore();
