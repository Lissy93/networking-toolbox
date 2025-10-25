<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { site } from '$lib/constants/site';
  import Icon from '$lib/components/global/Icon.svelte';
  import { errorManager } from '$lib/utils/error-manager';
  import { ALL_PAGES, type NavItem } from '$lib/constants/nav';

  // Defensive helper to safely read values
  const safely = <T,>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch (err) {
      console.error('Error page read failed:', err);
      return fallback;
    }
  };

  let status = $derived(safely(() => $page.status ?? 500, 500));
  let message = $derived(
    safely(() => $page.error?.message ?? 'An unexpected error occurred', 'An unexpected error occurred'),
  );
  let errorId = $derived(safely(() => ($page.error as any)?.errorId, undefined));

  let suggestions = $state<NavItem[]>([]);

  // Find smart suggestions based on the 404 URL (defensive - never crash)
  function findSuggestions(path: string): NavItem[] {
    try {
      if (!path || path === '/') return [];

      const query = path
        .toLowerCase()
        .replace(/^\/|\/$/g, '')
        .replace(/[_-]/g, ' ');
      const tokens = query.split(/[/\s]+/).filter((t) => t.length > 1);
      if (tokens.length === 0) return [];

      return ALL_PAGES.map((p) => {
        let score = 0;
        const label = p.label.toLowerCase();
        const hrefLower = p.href.toLowerCase();
        const searchText = `${label} ${p.description || ''} ${p.keywords?.join(' ') || ''} ${p.href}`.toLowerCase();

        // Direct path match
        if (hrefLower === path.toLowerCase()) score += 1000;
        else if (hrefLower.includes(query.replace(/\s/g, '-'))) score += 500;

        // Token matching
        tokens.forEach((token) => {
          if (label.includes(token)) score += 100;
          if (searchText.includes(token)) score += 50;
          if (p.keywords?.some((k) => k.toLowerCase().includes(token))) score += 75;
        });

        // Acronym match
        if (tokens.length === 1) {
          const acronym = label
            .split(/\s+/)
            .map((w) => w[0])
            .join('');
          if (acronym === tokens[0]) score += 200;
        }

        return { ...p, score };
      })
        .filter((p) => p.score > 40)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      return [];
    }
  }

  $effect(() => {
    try {
      if (status === 404) {
        suggestions = findSuggestions($page.url?.pathname ?? '');
      }
    } catch {
      suggestions = [];
    }
  });

  const errorTypes = {
    404: {
      title: 'Page Not Found',
      description: "The page you're looking for doesn't exist or has been moved.",
      icon: 'alert-circle',
      suggestions: [
        'Check the URL for typos',
        'Use the navigation menu to find what you need',
        'Return to the homepage and browse from there',
      ],
    },
    500: {
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again later.',
      icon: 'alert-triangle',
      suggestions: ['Refresh the page to try again', 'Check your internet connection', 'Try again in a few minutes'],
    },
    default: {
      title: 'Something Went Wrong',
      description: 'We encountered an unexpected error.',
      icon: 'alert-triangle',
      suggestions: ['Refresh the page to try again', 'Go back to the previous page', 'Return to the homepage'],
    },
  };

  let errorInfo = $derived(errorTypes[status as keyof typeof errorTypes] || errorTypes.default);

  const goHome = () => {
    try {
      goto('/');
    } catch {
      window.location.href = '/';
    }
  };
  const refresh = () => {
    try {
      location.reload();
    } catch {
      /* Silently fail */
    }
  };

  // Report error to error manager on mount (client-side only)
  onMount(() => {
    try {
      if ($page.error && status >= 500) {
        errorManager.captureException($page.error, 'error', {
          url: $page.url?.pathname,
          status,
          component: 'ErrorPage',
        });
      }
    } catch (err) {
      // Never let error reporting crash the error page
      console.error('Failed to report error:', err);
    }
  });
</script>

<svelte:head>
  <title>{status} - {errorInfo.title} | {site.title}</title>
  <meta name="description" content={errorInfo.description} />
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="error-container">
  <div class="card error-content">
    <div class="error-details">
      <h1 class="error-status">{status}</h1>
      <h2 class="error-title">{errorInfo.title}</h2>
      <p class="error-description">{errorInfo.description}</p>

      {#if (message && !errorInfo.title.includes(message)) || errorId || dev}
        <details class="error-technical">
          <summary>Technical Details</summary>
          <div class="error-message">
            {#if message && !errorInfo.title.includes(message)}
              <div><strong>Message:</strong> {message}</div>
            {/if}
            {#if errorId}
              <div><strong>Error ID:</strong> <code>{errorId}</code></div>
            {/if}
            {#if dev}
              <div class="dev-note">Development mode: Full error details are logged to console</div>
            {/if}
          </div>
        </details>
      {/if}
    </div>

    {#if suggestions.length > 0 && status === 404}
      <div class="suggested-tools">
        <h3>Did you mean?</h3>
        <div class="tools-grid">
          {#each suggestions as tool (tool.href)}
            <a href={tool.href} class="tool-card">
              {#if tool.icon}
                <Icon name={tool.icon} size="md" />
              {/if}
              <div class="tool-info">
                <h4>{tool.label}</h4>
                {#if tool.description}
                  <p>{tool.description}</p>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      </div>
    {:else}
      <div class="error-suggestions">
        <h3>What can you do?</h3>
        <ul>
          {#each errorInfo.suggestions as suggestion, index (index)}
            <li>{suggestion}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="error-actions">
      <button class="btn btn-primary" onclick={goHome}>
        <Icon name="arrow-left" size="sm" />
        Go Home
      </button>
      <button class="btn btn-secondary" onclick={refresh}>
        <Icon name="rotate" size="sm" />
        Refresh
      </button>
    </div>
  </div>
</div>

<style lang="scss">
  .error-container {
    min-height: 75vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .error-content {
    max-width: 600px;
    width: 100%;
    text-align: center;
    padding: var(--spacing-2xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .error-details {
    .error-status {
      font-size: 4rem;
      font-weight: 700;
      color: var(--color-primary);
      margin: 0 0 var(--spacing-sm) 0;
      line-height: 1;
    }

    .error-title {
      font-size: var(--font-size-2xl);
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      font-weight: 600;
    }

    .error-description {
      font-size: var(--font-size-lg);
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-lg) 0;
      line-height: 1.5;
    }
  }

  .error-technical {
    text-align: left;
    margin-top: var(--spacing-md);

    summary {
      cursor: pointer;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-sm);

      &:hover {
        color: var(--text-primary);
      }
    }
    .error-message {
      display: block;
      background: var(--bg-tertiary);
      padding: var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      word-break: break-word;
      text-align: left;

      div {
        padding: var(--spacing-2xs) 0;
        color: var(--text-secondary);

        code {
          font-family: 'Courier New', monospace;
          background: var(--bg-secondary);
          padding: 2px 6px;
          border-radius: var(--radius-xs);
          color: var(--color-error);
        }
      }

      .dev-note {
        margin-top: var(--spacing-xs);
        color: var(--text-tertiary);
        font-style: italic;
        font-size: var(--font-size-xs);
      }
    }
  }

  .error-suggestions {
    text-align: left;

    h3 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-md);
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: var(--spacing-2xs) 0;
        color: var(--text-secondary);
        position: relative;
        padding-left: var(--spacing-md);
        &::before {
          content: '•';
          color: var(--color-primary);
          position: absolute;
          left: 0;
        }
      }
    }
  }

  .suggested-tools {
    text-align: left;

    h3 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      font-size: var(--font-size-md);
    }

    .tools-grid {
      display: grid;
      gap: var(--spacing-sm);
      grid-template-columns: repeat(auto-fill, minmax(333px, 1fr));

      .tool-card {
        display: flex;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        text-decoration: none;
        transition: all var(--transition-fast);
        color: var(--color-primary);
        background: var(--bg-tertiary);

        &:hover {
          background: var(--surface-hover);
          border-color: var(--color-primary);
          transform: scale(1.02);
        }

        .tool-info {
          flex: 1;

          h4 {
            margin: 0 0 var(--spacing-2xs) 0;
            font-size: var(--font-size-sm);
            font-weight: 500;
            color: var(--text-primary);
          }

          p {
            margin: 0;
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            line-height: 1.4;
          }
        }
      }
    }
  }

  .error-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    flex-wrap: wrap;

    .btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      text-decoration: none;

      &.btn-primary {
        background: var(--color-primary);
        color: var(--bg-primary);

        &:hover {
          background: var(--color-primary-dark);
          transform: translateY(-1px);
        }
      }

      &.btn-secondary {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-primary);

        &:hover {
          background: var(--surface-hover);
          border-color: var(--color-primary);
        }
      }
    }
  }

  @media (max-width: 640px) {
    .error-container {
      min-height: auto;
    }
    .error-content {
      padding: var(--spacing-xl) var(--spacing-lg);
    }
    .error-details .error-status {
      font-size: 3rem;
    }
    .error-actions {
      flex-direction: column;
      align-items: center;
      .btn {
        width: 100%;
        justify-content: center;
        max-width: 200px;
      }
    }
  }
</style>
