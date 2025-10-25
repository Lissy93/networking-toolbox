<script lang="ts">
  import '../../styles/pages.scss';
  import { author, site } from '$lib/constants/site';

  // Import section components
  import ApiSection from '$lib/components/page-specific/about/ApiSection.svelte';
  import SelfHostingSection from '$lib/components/page-specific/about/SelfHostingSection.svelte';
  import TipsSection from '$lib/components/page-specific/about/TipsSection.svelte';
  import BuildingSection from '$lib/components/page-specific/about/BuildingSection.svelte';
  import AuthorSection from '$lib/components/page-specific/about/AuthorSection.svelte';
  import AttributionsSection from '$lib/components/page-specific/about/AttributionsSection.svelte';
  import LicenseSection from '$lib/components/page-specific/about/LicenseSection.svelte';
</script>

<!-- Section 0: Hero -->
<div class="hero">
  <h2>About {site.title}</h2>
  <p class="lead">
    Networking Toolbox is a collection of free, open-source networking utilities designed to simplify common
    network-related tasks for system administrators and network engineers.
  </p>
</div>
<!-- Links #1: GitHub -->
<!-- Links #1: Live Demo, DockerHub, CodeBerg Mirror, Sponsor, More Apps -->
<section class="contents">
  <div>
    <h3>About</h3>
    <ul>
      <li><a href="/about/api">API</a></li>
      <li><a href="/about/deploying">Self-Hosting</a></li>
      <li><a href="/about/building">Developing</a></li>
      <li><a href="/about/support">Get Support</a></li>
      <li><a href="/about/attributions">Attributions</a></li>
      <li><a href="/about/author">About Author</a></li>
      <li><a href="/about/legal/license">License</a></li>
    </ul>
  </div>
  <div>
    <h3>External links</h3>
    <ul>
      <li><a href={site.repo}>Source on GitHub</a></li>
      <li><a href={site.mirror}>CodeBerg mirror</a></li>
      <li><a href={site.docker}>DockerHub</a></li>
      <li><a href={author.portfolio}>More apps...</a></li>
    </ul>
  </div>
</section>

<TipsSection />
<ApiSection />
<SelfHostingSection />
<BuildingSection />
<AttributionsSection />
<AuthorSection />
<LicenseSection />

<style lang="scss">
  .hero {
    margin-bottom: var(--spacing-xl);
    h2 {
      font-size: var(--font-size-2xl);
      margin-bottom: var(--spacing-lg);
    }
    .lead {
      font-size: var(--font-size-md);
      color: var(--text-secondary);
    }
  }

  .contents {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-2xl);
    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }
  }
</style>
