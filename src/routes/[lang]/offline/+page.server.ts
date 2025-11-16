// Server-side code for offline page
// This ensures the page can be statically generated and cached without server dependencies

import type { PageServerLoad } from './$types';

export const prerender = true;
export const ssr = false;

// Override layout load to prevent dependencies and provide fallback data
export const load: PageServerLoad = async () => {
  return {
    breadcrumbJsonLd: null, // No breadcrumbs needed for offline page
    version: '0.2.5', // Hardcoded fallback version for offline page
    isOfflinePage: true, // Flag to indicate this is the special offline page
  };
};
