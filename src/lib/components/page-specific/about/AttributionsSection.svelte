<script lang="ts">
  import { onMount } from 'svelte';

  // Configuration
  const user = 'lissy93';
  const repo = 'networking-toolbox';
  const apiBase = 'https://readme-contribs.as93.net';
  const optionsLarge = '?avatarSize=72&perRow=10&limit=96';
  const optionsSmall = '?perRow=16&limit=96';

  const githubApi = `https://api.github.com/repos/${user}/${repo}`;

  // Fallback iframe URLs
  const sponsorsUrl = `${apiBase}/sponsors/${user}${optionsLarge}`;
  const contributorsUrl = `${apiBase}/contributors/${user}/${repo}${optionsLarge}`;
  const stargazersUrl = `${apiBase}/stargazers/${user}/${repo}${optionsSmall}`;

  // State
  let sponsors: Array<{ login: string; name?: string; avatarUrl: string }> = [];
  let contributors: Array<{ login: string; avatar_url: string }> = [];
  let stargazers: Array<{ login: string; avatar_url: string }> = [];
  let loadingSponsors = true;
  let loadingContributors = true;
  let loadingStargazers = true;

  onMount(async () => {
    // Fetch sponsors
    try {
      const sponsorsRes = await fetch('https://github-sponsors-api.as93.net/lissy93');
      sponsors = sponsorsRes.ok ? await sponsorsRes.json() : [];
    } finally {
      loadingSponsors = false;
    }

    // Fetch contributors
    try {
      const contributorsRes = await fetch(`${githubApi}/contributors?per_page=100`);
      contributors = contributorsRes.ok ? await contributorsRes.json() : [];
    } finally {
      loadingContributors = false;
    }

    // Fetch stargazers
    try {
      const stargazersRes = await fetch(`${githubApi}/stargazers?per_page=100`);
      stargazers = stargazersRes.ok ? await stargazersRes.json() : [];
    } finally {
      loadingStargazers = false;
    }
  });
</script>

<section id="attributions">
  <h2>Attributions</h2>

  <h3>Sponsors</h3>
  {#if !loadingSponsors && sponsors.length > 0}
    <div class="avatars-grid">
      {#each sponsors.filter((s) => s.login) as sponsor, index (sponsor.login || `sponsor-${index}`)}
        <a href="https://github.com/{sponsor.login}" target="_blank" rel="noopener" class="avatar-link">
          <img width="72" src={sponsor.avatarUrl} alt={sponsor.name || sponsor.login} class="avatar large" />
          <span>{sponsor.name || sponsor.login}</span>
        </a>
      {/each}
    </div>
  {:else}
    <iframe class="readme-contribs sponsors" src={sponsorsUrl} title="sponsors"></iframe>
  {/if}

  <h3>Contributors</h3>
  {#if !loadingContributors && contributors.length > 0}
    <div class="avatars-grid">
      {#each contributors.filter((c) => c.login) as contributor, index (contributor.login || `contributor-${index}`)}
        <a href="https://github.com/{contributor.login}" target="_blank" rel="noopener" class="avatar-link">
          <img width="72" src={contributor.avatar_url} alt={contributor.login} class="avatar large" />
          <span>{contributor.login}</span>
        </a>
      {/each}
    </div>
  {:else}
    <iframe class="readme-contribs contributors" src={contributorsUrl} title="contributors"></iframe>
  {/if}

  <h3>Stargazers</h3>
  {#if !loadingStargazers && stargazers.length > 0}
    <div class="avatars-grid small">
      {#each stargazers.filter((s) => s.login) as stargazer, index (stargazer.login || `stargazer-${index}`)}
        <a href="https://github.com/{stargazer.login}" target="_blank" rel="noopener" class="avatar-link small-link">
          <img width="72" src={stargazer.avatar_url} alt={stargazer.login} class="avatar small" />
          <span>{stargazer.login}</span>
        </a>
      {/each}
    </div>
  {:else}
    <iframe class="readme-contribs stargazers" src={stargazersUrl} title="stargazers"></iframe>
  {/if}
</section>

<style>
  .readme-contribs {
    border: none;
    width: 100%;
    max-height: 512px;
    &.sponsors,
    &.contributors {
      min-height: 240px;
    }
    &.stargazers {
      min-height: 360px;
    }
  }

  .avatars-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin: var(--spacing-md) 0;
    &.small {
      gap: var(--spacing-2xs);
    }
  }
  .avatar-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-decoration: none;
    color: var(--text-primary);
    transition: transform 0.2s;
    &:hover img {
      transform: scale(1.1);
      border-color: var(--color-primary);
    }
    span {
      margin-top: var(--spacing-xs);
      font-size: var(--font-size-2xs);
      text-align: center;
      word-break: break-word;
      overflow: hidden;
      white-space: nowrap;
      max-width: 60px;
      text-overflow: ellipsis;
      opacity: 0.8;
    }
    &.small-link span {
      max-width: 40px;
      opacity: 0.5;
    }
    .avatar {
      border-radius: 50%;
      border: 2px solid var(--border-primary);
      transition: all 0.15s ease-in-out;
      &.large {
        width: 72px;
        height: 72px;
      }
      &.small {
        width: 48px;
        height: 48px;
      }
    }
  }
</style>
