<script lang="ts">
  import '../styles/pages.scss';
  import { onMount } from 'svelte';
  import { ALL_PAGES, SUB_NAV, type NavItem, type NavGroup } from '$lib/constants/nav';
  import { homepageLayout } from '$lib/stores/homepageLayout';
  import HomepageDefault from '$lib/components/home/HomepageDefault.svelte';
  import HomepageMinimal from '$lib/components/home/HomepageMinimal.svelte';
  import HomepageCategories from '$lib/components/home/HomepageCategories.svelte';
  import HomepageCarousel from '$lib/components/home/HomepageCarousel.svelte';
  import HomepageBookmarks from '$lib/components/home/HomepageBookmarks.svelte';
  import HomepageSmallIcons from '$lib/components/home/HomepageSmallIcons.svelte';
  import SiteMapList from '$lib/components/home/SiteMapList.svelte';
  import HomepageSearch from '$lib/components/home/HomepageSearch.svelte';
  import HomepageEmpty from '$lib/components/home/HomepageEmpty.svelte';

  // Helper function to extract nav items from mixed structure
  function extractNavItems(items: (NavItem | NavGroup)[]): NavItem[] {
    const navItems: NavItem[] = [];
    for (const item of items) {
      if ('href' in item) {
        navItems.push(item);
      } else if ('title' in item && 'items' in item) {
        navItems.push(...item.items);
      }
    }
    return navItems;
  }

  // Separate tools from reference pages and standalone pages
  const referencePages = extractNavItems(SUB_NAV['/reference'] || []);
  const toolPages = ALL_PAGES.filter(
    (page) =>
      !page.href.startsWith('/reference') && !page.href.startsWith('/bookmarks') && !page.href.startsWith('/offline'),
  );

  let currentLayout = $state(homepageLayout);

  onMount(() => {
    homepageLayout.init();
  });
</script>

{#if $currentLayout === 'minimal'}
  <HomepageMinimal {toolPages} {referencePages} />
{:else if $currentLayout === 'categories'}
  <HomepageCategories {toolPages} {referencePages} />
{:else if $currentLayout === 'carousel'}
  <HomepageCarousel />
{:else if $currentLayout === 'bookmarks'}
  <HomepageBookmarks />
{:else if $currentLayout === 'small-icons'}
  <HomepageSmallIcons />
{:else if $currentLayout === 'list'}
  <SiteMapList homeMode={true} />
{:else if $currentLayout === 'search'}
  <HomepageSearch />
{:else if $currentLayout === 'empty'}
  <HomepageEmpty />
{:else}
  <HomepageDefault {toolPages} {referencePages} />
{/if}
