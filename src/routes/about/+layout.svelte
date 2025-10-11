<script>
  import { page } from '$app/stores';
  import '../../styles/page-specific/about-page.scss';

  let { children } = $props();

  const isLicensePage = $derived($page.url.pathname.includes('/license'));
</script>

<main class="card about-content" class:license-page={isLicensePage}>
  {@render children()}
</main>

<style lang="scss">
  .about-content {
    max-width: 1200px;
    margin: 0 auto;

    &.license-page {
      width: fit-content;
    }
  }
</style>
