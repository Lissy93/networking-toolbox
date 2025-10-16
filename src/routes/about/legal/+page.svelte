<script lang="ts">
  import '../../../styles/pages.scss';
  import { site } from '$lib/constants/site';
  import { legalPages } from '$lib/constants/nav';
  import Icon from '$lib/components/global/Icon.svelte';
</script>

<svelte:head>
  <title>Legal | Networking Toolbox</title>
  <meta name="description" content="Legal information for Networking Toolbox - privacy policy and license" />
  <meta property="og:title" content="Legal | {site.title}" />
  <meta property="og:description" content="Privacy policy and MIT license information for Networking Toolbox" />
  <meta property="og:url" content="{site.url}/about/legal" />
</svelte:head>

<div class="hero">
  <h2>Legal Information</h2>
  <p class="lead">Boring (but important) stuff</p>
</div>

<section class="legal-links">
  {#each legalPages as page (page.href)}
    <a href={page.href} class="legal-card">
      <div class="card-icon">
        <Icon name={page.icon || 'info'} size="lg" />
      </div>
      <div class="card-content">
        <h3>{page.label}</h3>
        <p>{page.description}</p>
      </div>
      <div class="card-arrow">
        <Icon name="arrow-right" size="sm" />
      </div>
    </a>
  {/each}
</section>

<section class="summary">
  <h3>Summary</h3>
  <p>
    Networking Toolbox is open source software licensed under the MIT License. We respect your privacy and process most
    data locally in your browser. For more details, please review the individual documents above.
  </p>
</section>

<style lang="scss">
  .hero {
    text-align: center;
    margin-bottom: var(--spacing-xl);

    h2 {
      font-size: var(--font-size-2xl);
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }

    .lead {
      font-size: var(--font-size-md);
      color: var(--text-secondary);
      max-width: 600px;
      margin: 0 auto;
    }
  }

  .legal-links {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
  }

  .legal-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: color-mix(in srgb, var(--bg-primary), transparent 70%);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      transform: translateX(4px);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .card-icon {
      flex-shrink: 0;
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: color-mix(in srgb, var(--color-primary), transparent 90%);
      border-radius: var(--radius-sm);
    }

    .card-content {
      flex: 1;

      h3 {
        font-size: var(--font-size-lg);
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
      }

      p {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin: 0;
      }
    }

    .card-arrow {
      flex-shrink: 0;
      color: var(--text-muted);
      transition: transform var(--transition-fast);
    }

    &:hover .card-arrow {
      transform: translateX(4px);
      color: var(--color-primary);
    }
  }

  .summary {
    max-width: 700px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent), transparent 95%),
      color-mix(in srgb, var(--accent), transparent 98%)
    );
    border-radius: var(--radius-md);
    border-left: 4px solid var(--accent);

    h3 {
      font-size: var(--font-size-lg);
      margin-bottom: var(--spacing-sm);
      color: var(--text-primary);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  }

  @media (max-width: 768px) {
    .legal-card {
      padding: var(--spacing-md);

      .card-icon {
        width: 40px;
        height: 40px;
      }

      .card-content h3 {
        font-size: var(--font-size-md);
      }
    }
  }
</style>
