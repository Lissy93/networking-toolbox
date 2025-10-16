<script lang="ts">
  import '../../../styles/pages.scss';
</script>

<div class="legal-page">
  <slot />
</div>

<!-- svelte-ignore css-unused-selector -->
<style lang="scss">
  .legal-page {
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

    section {
      margin-bottom: var(--spacing-2xl);

      h3 {
        font-size: var(--font-size-xl);
        margin-bottom: var(--spacing-md);
        color: var(--text-primary);
      }

      h4 {
        font-size: var(--font-size-lg);
        margin-top: var(--spacing-lg);
        margin-bottom: var(--spacing-sm);
        color: var(--text-primary);
      }

      p {
        line-height: 1.7;
        color: var(--text-secondary);
        margin-bottom: var(--spacing-md);
      }

      ul {
        margin: var(--spacing-md) 0;
        padding-left: var(--spacing-xl);

        li {
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-sm);

          strong {
            color: var(--text-primary);
          }
        }
      }

      a {
        color: var(--accent);
        text-decoration: none;
        transition: opacity 0.2s ease;

        &:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
      }
    }

    .updated {
      font-size: var(--font-size-sm);
      font-style: italic;
      color: var(--text-muted);
      margin-top: var(--spacing-lg);
    }

    .contact {
      padding: var(--spacing-lg);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--accent), transparent 95%),
        color-mix(in srgb, var(--accent), transparent 98%)
      );
      border-radius: var(--border-radius);
      border-left: 4px solid var(--accent);
    }
  }
</style>
