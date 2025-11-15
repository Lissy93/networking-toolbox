<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import '../styles/base.scss';
  import '../styles/variables.scss';
  import '../styles/themes.scss';
  import '../styles/components.scss';
  import '../styles/ref-pages.scss';
  import '../styles/diagnostics-pages.scss';
  import '../styles/pages.scss';
  import '../styles/a11y.scss';

  import favicon from '$lib/assets/favicon.svg';
  import { getPageDetails, getPageDetailsWithIcon } from '$lib/utils/nav-helpers';
  import { generateFaviconDataUri } from '$lib/utils/favicon';
  import { site, author } from '$lib/constants/site';
  import { toolUsage } from '$lib/stores/toolUsage';
  import { accessibility } from '$lib/stores/accessibility';
  import { theme } from '$lib/stores/theme';
  import { customCss } from '$lib/stores/customCss';
  import { siteCustomization } from '$lib/stores/siteCustomization';
  import { primaryColor } from '$lib/stores/primaryColor';
  import { fontScale } from '$lib/stores/fontScale';
  import { ALL_PAGES } from '$lib/constants/nav';
  import { initializeOfflineSupport } from '$lib/stores/offline';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { ANALYTICS_ENABLED, ANALYTICS_DOMAIN, ANALYTICS_DSN } from '$lib/config/customizable-settings';

  import Header from '$lib/components/furniture/Header.svelte';
  import SubHeader from '$lib/components/furniture/SubHeader.svelte';
  import Footer from '$lib/components/furniture/Footer.svelte';
  import OfflineIndicator from '$lib/components/common/OfflineIndicator.svelte';

  let { data, children } = $props(); // Gets data from the server load function
  let faviconTrigger = $state(0); // Trigger to force favicon updates
  let accessibilitySettings = $state(accessibility); // Accessibility settings store
  let currentTheme = $state(theme); // Theme store
  let currentBookmarks = $state(bookmarks); // Bookmarks store
  let currentCustomCss = $state(customCss); // Custom CSS store

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

  // Calculate prev/next pages for sequential navigation
  const sequentialNav = $derived.by(() => {
    const currentPath = $page.url?.pathname ?? '/';
    const currentIndex = ALL_PAGES.findIndex((page) => page.href === currentPath);

    // Not a tool page or not found in ALL_PAGES
    if (currentIndex === -1) {
      return { prev: null, next: null };
    }

    const prevPage = currentIndex > 0 ? ALL_PAGES[currentIndex - 1] : null;
    const nextPage = currentIndex < ALL_PAGES.length - 1 ? ALL_PAGES[currentIndex + 1] : null;

    return {
      prev: prevPage ? `${site.url}${prevPage.href}` : null,
      next: nextPage ? `${site.url}${nextPage.href}` : null,
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
    customCss.init();
    siteCustomization.init();
    primaryColor.init();
    fontScale.init();
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

  // Apply custom CSS to page
  $effect(() => {
    if (typeof document === 'undefined') return;

    const customCssValue = $currentCustomCss;
    let styleEl = document.getElementById('user-custom-css') as HTMLStyleElement | null;

    if (customCssValue && customCssValue.trim()) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'user-custom-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = customCssValue;
    } else {
      if (styleEl) {
        styleEl.remove();
      }
    }
  });

  // Apply custom primary color
  $effect(() => {
    if (typeof document === 'undefined') return;
    const color = $primaryColor;
    if (color && color.trim()) {
      document.documentElement.style.setProperty('--color-primary', color);
    } else {
      document.documentElement.style.removeProperty('--color-primary');
    }
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

  <!-- Sequential Navigation (for tool pages) -->
  {#if sequentialNav.prev}
    <link rel="prev" href={sequentialNav.prev} />
  {/if}
  {#if sequentialNav.next}
    <link rel="next" href={sequentialNav.next} />
  {/if}

  <!-- Open Graph Tags -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={seoData.title} />
  <meta property="og:description" content={seoData.description} />
  <meta property="og:url" content={seoData.url} />
  <meta property="og:image" content={seoData.image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="675" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="Networking Toolbox - Comprehensive IP and network tools" />
  <meta property="og:site_name" content={site.name} />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@lissy_sykes" />
  <meta name="twitter:creator" content="@lissy_sykes" />
  <meta name="twitter:title" content={seoData.title} />
  <meta name="twitter:description" content={seoData.description} />
  <meta name="twitter:image" content={seoData.image} />
  <meta name="twitter:image:alt" content="Networking Toolbox - Comprehensive IP and network tools" />

  <!-- Additional Meta Tags -->
  <meta name="robots" content="index, follow" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta name="generator" content="SvelteKit" />

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content={site.name} />
  <meta name="application-name" content={site.name} />
  <meta name="msapplication-TileColor" content="#2563eb" />
  <meta name="theme-color" content="#2563eb" />

  <!-- Structured Data -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html jsonLdTag(data.breadcrumbJsonLd)}

  <!-- WebSite Schema (Homepage only) -->
  {#if $page.url.pathname === '/'}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html jsonLdTag({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      description: site.description,
      url: site.url,
      inLanguage: 'en-US',
      copyrightYear: '2025',
      copyrightHolder: {
        '@type': 'Person',
        name: author.name,
        url: author.url,
      },
      creator: {
        '@type': 'Person',
        name: author.name,
        url: author.url,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${site.url}/?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    })}

    <!-- SoftwareApplication Schema (Homepage only) -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html jsonLdTag({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: site.name,
      description: site.longDescription,
      url: site.url,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Person',
        name: author.name,
        url: author.url,
      },
      softwareVersion: '3.0',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5',
        ratingCount: '1',
      },
      featureList: [
        'IPv4 and IPv6 subnet calculator',
        'CIDR notation converter',
        'IP address format conversion',
        'Network diagnostics tools',
        'DNS record generators',
        'DHCP configuration builder',
        'Offline-first PWA',
      ],
    })}

    <!-- Organization Schema (Homepage only) -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html jsonLdTag({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.name,
      url: site.url,
      logo: {
        '@type': 'ImageObject',
        url: `${site.url}/icon.png`,
        width: '1024',
        height: '1024',
      },
      description: site.longDescription,
      founder: {
        '@type': 'Person',
        name: author.name,
        url: author.url,
      },
      sameAs: [site.repo, site.mirror, site.docker, author.githubUrl, author.portfolio],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Developer',
        url: site.repo,
      },
    })}
  {/if}

  <!-- Analytics (Plausible or custom) -->
  {#if ANALYTICS_ENABLED}
    <script defer data-domain={ANALYTICS_DOMAIN} src={ANALYTICS_DSN}></script>
  {/if}

  <!-- Custom Styles for Self-Hosted Instances -->
  <!-- This loads last to ensure custom styles can override defaults -->
  <link rel="stylesheet" href="/custom-styles.css" />
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
