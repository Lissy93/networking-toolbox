<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import '../styles/base.scss';
  import '../styles/variables.scss';
  import '../styles/components.scss';
  import '../styles/ref-pages.scss';
  import '../styles/diagnostics-pages.scss';
  import '../styles/pages.scss';
  import '../styles/a11y.scss';

  import favicon from '$lib/assets/favicon.svg';
  import { getPageDetails, getPageDetailsWithIcon } from '$lib/constants/nav';
  import { generateFaviconDataUri } from '$lib/utils/favicon';
  import { site, author } from '$lib/constants/site';
  import { toolUsage } from '$lib/stores/toolUsage';
  import { accessibility } from '$lib/stores/accessibility';
  import { theme } from '$lib/stores/theme';
  import { ALL_PAGES } from '$lib/constants/nav';
  import { initializeOfflineSupport } from '$lib/stores/offline';
  import { bookmarks } from '$lib/stores/bookmarks';

  import Header from '$lib/components/furniture/Header.svelte';
  import SubHeader from '$lib/components/furniture/SubHeader.svelte';
  import Footer from '$lib/components/furniture/Footer.svelte';
  import OfflineIndicator from '$lib/components/common/OfflineIndicator.svelte';

  let { data, children } = $props(); // Gets data from the server load function
  let faviconTrigger = $state(0); // Trigger to force favicon updates
  let accessibilitySettings = $state(accessibility); // Accessibility settings store
  let currentTheme = $state(theme); // Theme store
  let currentBookmarks = $state(bookmarks); // Bookmarks store

  // Get page-specific metadata or fallback to site defaults
  const seoData = $derived.by(() => {
    const currentPath = $page.url?.pathname ?? '/';
    const pageDetails = getPageDetails(currentPath);

    return {
      title: pageDetails?.title ? `${pageDetails.title} | ${site.title}` : site.title,
      description: pageDetails?.description || site.description,
      keywords: pageDetails?.keywords?.length ? pageDetails.keywords.join(', ') : site.keywords,
      url: `${site.url}${currentPath}`,
      image: site.image,
    };
  });

  // Dynamic favicon based on page icon
  const dynamicFavicon = $derived.by(() => {
    void faviconTrigger; // Include in order to force updates when theme changes

    // Check if we're on an error page
    const isErrorPage = ($page.status ?? 200) >= 400;
    if (isErrorPage) {
      const errorFaviconDataUri = generateFaviconDataUri('lost');
      if (errorFaviconDataUri) {
        return errorFaviconDataUri;
      }
    }

    const currentPath = $page.url?.pathname ?? '/';
    const pageDetailsWithIcon = getPageDetailsWithIcon(currentPath);

    if (pageDetailsWithIcon?.icon) {
      const faviconDataUri = generateFaviconDataUri(pageDetailsWithIcon.icon);
      if (faviconDataUri) {
        return faviconDataUri;
      }
    }
    const coloredFaviconDataUri = generateFaviconDataUri('z-globe');
    if (coloredFaviconDataUri) {
      return coloredFaviconDataUri;
    }
    return favicon;
  });

  function handleGlobalKeydown(e: KeyboardEvent) {
    // Ctrl + H to go to homepage
    if (e.ctrlKey && e.key === 'h') {
      e.preventDefault();
      window.location.href = '/';
    }
    // Ctrl + B to go to bookmarks page
    else if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      window.location.href = '/bookmarks';
    }
    // Ctrl + 0 - smart navigation (10th bookmark or homepage)
    else if (e.ctrlKey && e.key === '0') {
      e.preventDefault();
      if ($currentBookmarks[9]) {
        window.location.href = $currentBookmarks[9].href;
      } else {
        window.location.href = '/';
      }
    }
    // Ctrl + [1-9] to jump to bookmarked tool
    else if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const index = parseInt(e.key, 10) - 1;

      if ($currentBookmarks[index]) {
        window.location.href = $currentBookmarks[index].href;
      }
    }
  }

  onMount(() => {
    theme.init();
    toolUsage.init();
    accessibility.init();
    bookmarks.init();
    initializeOfflineSupport();

    // Add global keyboard shortcuts
    window.addEventListener('keydown', handleGlobalKeydown);

    // Console message
    console.log(
      `\n%c🧰 Networking Toolbox` +
        '%c\nLicensed under MIT, © Alicia Sykes 2025.\nhttps://github.com/lissy93/networking-toolbox\n',
      'color:#e3ed70; background:#21262d; font-size:1.6rem; padding:0.15rem 0.25rem; ' +
        'margin: 1rem auto 0.5rem auto; font-family: Helvetica; border: 2px solid #e3ed70; ' +
        'border-radius: 4px;font-weight: bold; text-shadow: 1px 1px 4px #000;',
      'color: #e3ed70; font-size:0.8rem; font-family: Helvetica; margin: 0;',
    );

    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown);
    };
  });

  // Track tool visits when page changes
  $effect(() => {
    const currentPath = $page.url?.pathname ?? '/';

    // Check if current path is a tool page
    const toolPage = ALL_PAGES.find((tool) => tool.href === currentPath);
    if (toolPage) {
      toolUsage.trackVisit(toolPage.href, toolPage.label, toolPage.icon, toolPage.description);
    }
  });

  // Apply accessibility settings to HTML element
  $effect(() => {
    if (typeof document === 'undefined') return;

    const cssClasses = accessibility.getCSSClasses($accessibilitySettings);

    if (cssClasses.trim()) {
      document.documentElement.setAttribute('data-a11y', cssClasses);
    } else {
      document.documentElement.removeAttribute('data-a11y');
    }
  });

  // Theme change effect - trigger favicon update when theme changes
  $effect(() => {
    // Subscribe to theme changes
    void $currentTheme;
    // Trigger favicon update 50ms after theme change
    setTimeout(() => {
      faviconTrigger++;
    }, 50);
  });

  /* Uses the server-generated breadcrumb data, to build a JSON-LD breadcrumb object */
  function jsonLdTag(data: unknown, type = 'application/ld+json', nonce?: string) {
    if (!data) return '';
    try {
      const json = JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/-->/g, '--\\u003e')
        .replace(/\//g, '\\/');
      const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
      return `<script type="${type}"${nonceAttr}>${json}</${'script'}>`;
    } catch (error) {
      console.error('Error generating JSON-LD tag:', error);
      return '';
    }
  }
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={dynamicFavicon} />
  <link rel="shortcut icon" type="image/svg+xml" href={dynamicFavicon} />

  <!-- SEO Meta Tags -->
  <title>{seoData.title}</title>
  <meta name="description" content={seoData.description} />
  <meta name="keywords" content={seoData.keywords} />
  <meta name="author" content={author.name} />
  <link rel="canonical" href={seoData.url} />

  <!-- Open Graph Tags -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={seoData.title} />
  <meta property="og:description" content={seoData.description} />
  <meta property="og:url" content={seoData.url} />
  <meta property="og:image" content={seoData.image} />
  <meta property="og:site_name" content={site.name} />

  <!-- Twitter Card Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={seoData.title} />
  <meta name="twitter:description" content={seoData.description} />
  <meta name="twitter:image" content={seoData.image} />

  <!-- Additional Meta Tags -->
  <meta name="robots" content="index, follow" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="IP Calculator" />
  <meta name="application-name" content="IP Calculator" />
  <meta name="msapplication-TileColor" content="#2563eb" />
  <meta name="theme-color" content="#2563eb" />

  <!-- Structured Data -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html jsonLdTag(data.breadcrumbJsonLd)}

  <!-- Plausible Analytics -->
  <script defer data-domain="networking-toolbox.as93.net" src="https://no-track.as93.net/js/script.js"></script>
</svelte:head>

<!-- Skip Links for Accessibility -->
<a href="#main-content" class="skip-link">Skip to main content</a>
<a href="#navigation" class="skip-link">Skip to navigation</a>

<Header />
<SubHeader />
<OfflineIndicator />
<main id="main-content" class="main-content">
  {@render children?.()}
</main>
<Footer />

<style>
  main {
    max-width: 1200px;
    min-height: 76vh;
    margin: 1.5rem auto 1rem;
    padding: 0 var(--spacing-md);
    margin: 1rem auto;
    background: var(--bg-primary);
    padding: var(--spacing-lg) var(--spacing-md);
  }
</style>
