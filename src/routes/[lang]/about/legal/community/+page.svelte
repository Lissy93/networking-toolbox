<script lang="ts">
  import { site } from '$lib/constants/site';
</script>

<svelte:head>
  <title>Community Guidelines | Networking Toolbox</title>
  <meta name="description" content="Community guidelines and code of conduct for Networking Toolbox contributors" />
  <meta property="og:title" content="Community Guidelines | {site.title}" />
  <meta property="og:description" content="Learn about our community standards and code of conduct" />
  <meta property="og:url" content="{site.url}/about/legal/community" />
</svelte:head>

<div class="hero">
  <h2>Community Guidelines</h2>
  <p class="lead">Building a welcoming and inclusive community.</p>
</div>

<section>
  <h3>Code of Conduct</h3>
  <p>
    Networking Toolbox follows the
    <a href="{site.repo}/blob/main/.github/CODE_OF_CONDUCT.md" rel="noopener noreferrer" target="_blank"
      >Contributor Covenant Code of Conduct</a
    >.
  </p>
  <p>
    We are committed to providing a welcoming and inclusive environment for everyone. This applies to all project spaces
    including GitHub issues, pull requests, discussions, and any other community interactions.
  </p>
</section>

<section>
  <h3>Expected Behavior</h3>
  <ul>
    <li>Be respectful and considerate in your communication</li>
    <li>Welcome newcomers and help them get started</li>
    <li>Focus on constructive feedback and collaboration</li>
    <li>Respect differing viewpoints and experiences</li>
    <li>Accept responsibility and apologize when mistakes are made</li>
  </ul>
</section>

<section>
  <h3>Reporting Issues</h3>
  <p>
    If you experience or witness unacceptable behavior, please report it by opening an issue on
    <a href="{site.repo}/issues" rel="noopener noreferrer" target="_blank">GitHub</a>
    or contacting the project maintainer directly.
  </p>
  <p>All reports will be handled with discretion and confidentiality.</p>
</section>
