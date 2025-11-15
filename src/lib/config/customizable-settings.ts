/**
 * Customizable Settings
 *
 * This file provides default settings that can be overridden via environment variables.
 * All environment variables must be prefixed with NTB_ to be accessible.
 *
 * For self-hosted instances, these can be customized by setting the corresponding
 * environment variables. The managed instance will use the defaults.
 */

import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';
import type { HomepageLayoutMode } from '$lib/stores/homepageLayout';
import type { NavbarDisplayMode } from '$lib/stores/navbarDisplay';
import type { ThemeOption } from '$lib/stores/theme';
import { DEFAULT_TRUSTED_DNS_SERVERS } from '$lib/utils/ip-security';

// Get user customization from localStorage (browser only)
function getUserCustomization() {
  if (!browser) return null;
  try {
    const stored = localStorage.getItem('user-site-customization');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

const userCustom = getUserCustomization();

// Site Branding - prioritize user customization, then env vars
export const SITE_TITLE = userCustom?.title || env.NTB_SITE_TITLE;
export const SITE_DESCRIPTION = userCustom?.description || env.NTB_SITE_DESCRIPTION;

/**
 * Logo/icon to display in the navbar, specified as a path to an image
 */
export const SITE_ICON = userCustom?.iconUrl || env.NTB_SITE_ICON || '';

/**
 * Default homepage layout
 * Options: 'categories', 'default', 'minimal', 'carousel', 'bookmarks', 'small-icons', 'list', 'search', 'empty'
 */
export const DEFAULT_HOMEPAGE_LAYOUT: HomepageLayoutMode =
  (env.NTB_HOMEPAGE_LAYOUT as HomepageLayoutMode) ?? 'categories';

/**
 * Default navbar display mode
 * Options: 'default', 'bookmarked', 'frequent', 'none'
 */
export const DEFAULT_NAVBAR_DISPLAY: NavbarDisplayMode = (env.NTB_NAVBAR_DISPLAY as NavbarDisplayMode) ?? 'default';

/**
 * Default theme
 * Options: 'dark', 'light', 'midnight', 'arctic', 'ocean', 'purple', 'cyberpunk', 'terminal', 'lightpurple', 'muteddark', 'solarized', 'nord', 'gruvbox', 'tokyonight', 'catppuccin', 'everforest', 'sunset', 'dracula'
 */
export const DEFAULT_THEME: ThemeOption = (env.NTB_DEFAULT_THEME as ThemeOption) ?? 'ocean';

/**
 * Default language
 * Options: 'en', 'es', 'fr', 'de', etc.
 */
export const DEFAULT_LANGUAGE = env.NTB_DEFAULT_LANGUAGE ?? 'en';

/**
 * Primary color (for default theme). Specified as a hex code.
 */
export const PRIMARY_COLOR = env.NTB_PRIMARY_COLOR ?? '';

/**
 * Default font scale level
 * Options: 0 (Very Small), 1 (Small), 2 (Normal), 3 (Large), 4 (Very Large)
 */
export const DEFAULT_FONT_SCALE = parseInt(env.NTB_FONT_SCALE ?? '2', 10);

export const SHOW_TIPS_ON_HOMEPAGE = !!env.NTB_SHOW_TIPS_ON_HOMEPAGE;

/**
 * Disable settings page and settings menu
 * When true, hides the settings button and locks the settings page
 * Default: false
 */
export const DISABLE_SETTINGS = env.NTB_DISABLE_SETTINGS === 'true';

/**
 * DNS Security Settings
 * These settings protect against SSRF attacks by validating custom DNS server IPs
 */

/**
 * Allow custom DNS servers
 * When false, only servers from ALLOWED_DNS_SERVERS can be used
 * Default: false (for security)
 */
export const ALLOW_CUSTOM_DNS_SERVERS = env.NTB_ALLOW_CUSTOM_DNS === 'true';

/**
 * Block private IP addresses for DNS servers
 * When true, prevents using private/internal IPs as DNS resolvers
 * Default: true (for security - prevents SSRF attacks)
 */
export const BLOCK_PRIVATE_DNS_IPS = env.NTB_BLOCK_PRIVATE_DNS_IPS !== 'false'; // Default true

/**
 * Allowed DNS servers (comma-separated list of IPs)
 * When ALLOW_CUSTOM_DNS_SERVERS is false, only these IPs can be used
 * Default: Comprehensive list of trusted public DNS providers
 */
export const ALLOWED_DNS_SERVERS = env.NTB_ALLOWED_DNS_SERVERS
  ? env.NTB_ALLOWED_DNS_SERVERS.split(',').map((ip) => ip.trim())
  : DEFAULT_TRUSTED_DNS_SERVERS;

/**
 * Analytics Settings
 * Configure analytics tracking for self-hosted instances
 */

/**
 * Analytics domain (for Plausible or similar analytics)
 * Set to 'false' to disable analytics entirely
 * Default: 'networking-toolbox.as93.net'
 */
export const ANALYTICS_DOMAIN = env.NTB_ANALYTICS_DOMAIN ?? 'networking-toolbox.as93.net';

/**
 * Analytics script URL (for Plausible or similar analytics)
 * Set to 'false' to disable analytics entirely
 * Default: 'https://no-track.as93.net/js/script.js'
 */
export const ANALYTICS_DSN = env.NTB_ANALYTICS_DSN ?? 'https://no-track.as93.net/js/script.js';

/**
 * Check if analytics is enabled
 * Analytics is disabled if either ANALYTICS_DOMAIN or ANALYTICS_DSN is set to 'false'
 */
export const ANALYTICS_ENABLED = ANALYTICS_DOMAIN !== 'false' && ANALYTICS_DSN !== 'false';

/**
 * Get user settings list with values prioritized as:
 * 1. User-set value from localStorage
 * 2. Environment variable value
 * 3. Empty string
 */
export function getUserSettingsList(): Array<{ name: string; value: string }> {
  if (!browser) return [];

  const getLocalStorageValue = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const getUserCustomValue = (key: keyof typeof userCustom): string => {
    return userCustom?.[key] || '';
  };

  // Read actual user preferences from localStorage
  const userTheme = getLocalStorageValue('theme');
  const userFontScale = getLocalStorageValue('font-scale');
  const userHomepageLayout = getLocalStorageValue('homepage-layout');
  const userNavbarDisplay = getLocalStorageValue('navbar-display');
  const userPrimaryColor = getLocalStorageValue('user-primary-color');

  return [
    { name: 'NTB_SITE_TITLE', value: getUserCustomValue('title') || env.NTB_SITE_TITLE || '' },
    { name: 'NTB_SITE_DESCRIPTION', value: getUserCustomValue('description') || env.NTB_SITE_DESCRIPTION || '' },
    { name: 'NTB_SITE_ICON', value: getUserCustomValue('iconUrl') || env.NTB_SITE_ICON || '' },
    { name: 'NTB_HOMEPAGE_LAYOUT', value: userHomepageLayout || env.NTB_HOMEPAGE_LAYOUT || '' },
    { name: 'NTB_NAVBAR_DISPLAY', value: userNavbarDisplay || env.NTB_NAVBAR_DISPLAY || '' },
    { name: 'NTB_DEFAULT_THEME', value: userTheme || env.NTB_DEFAULT_THEME || '' },
    { name: 'NTB_DEFAULT_LANGUAGE', value: env.NTB_DEFAULT_LANGUAGE || '' },
    { name: 'NTB_PRIMARY_COLOR', value: userPrimaryColor || env.NTB_PRIMARY_COLOR || '' },
    { name: 'NTB_FONT_SCALE', value: userFontScale || env.NTB_FONT_SCALE || '' },
    { name: 'NTB_SHOW_TIPS_ON_HOMEPAGE', value: env.NTB_SHOW_TIPS_ON_HOMEPAGE || '' },
    { name: 'NTB_DISABLE_SETTINGS', value: env.NTB_DISABLE_SETTINGS || '' },
    { name: 'NTB_ALLOW_CUSTOM_DNS', value: env.NTB_ALLOW_CUSTOM_DNS || '' },
    { name: 'NTB_BLOCK_PRIVATE_DNS_IPS', value: env.NTB_BLOCK_PRIVATE_DNS_IPS || '' },
    { name: 'NTB_ALLOWED_DNS_SERVERS', value: env.NTB_ALLOWED_DNS_SERVERS || '' },
    { name: 'NTB_ANALYTICS_DOMAIN', value: env.NTB_ANALYTICS_DOMAIN || '' },
    { name: 'NTB_ANALYTICS_DSN', value: env.NTB_ANALYTICS_DSN || '' },
  ];
}
