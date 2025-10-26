<script lang="ts">
  import IPRegexGenerator from '$lib/components/tools/IPRegexGenerator.svelte';
  import { ipAddressValidationContent } from '$lib/content/ip-address-validation.js';
  import Icon from '$lib/components/global/Icon.svelte';
</script>

<IPRegexGenerator />

<div class="card content-section">
  <div class="container">
    <div class="card-header ref-header">
      <h2>{ipAddressValidationContent.title}</h2>
      <p class="subtitle">{ipAddressValidationContent.description}</p>
    </div>

    <div class="ref-section">
      <h3>{ipAddressValidationContent.sections.overview.title}</h3>
      <p>{ipAddressValidationContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h3>{ipAddressValidationContent.sections.ipv4.title}</h3>
      <p>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html ipAddressValidationContent.sections.ipv4.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/•/g, '&bull;')}
      </p>
    </div>

    <div class="ref-section">
      <h3>{ipAddressValidationContent.sections.ipv6.title}</h3>
      <p>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html ipAddressValidationContent.sections.ipv6.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/•/g, '&bull;')}
      </p>
    </div>

    <div class="ref-section">
      <h3>{ipAddressValidationContent.sections.regexValidation.title}</h3>
      <p>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html ipAddressValidationContent.sections.regexValidation.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/•/g, '&bull;')}
      </p>
    </div>

    <div class="ref-section">
      <h3>Example Patterns</h3>
      <div class="examples-grid">
        {#each Object.values(ipAddressValidationContent.examples) as example (example.pattern)}
          <div class="example-card">
            <h4>{example.title}</h4>
            <div class="pattern-code">
              <code>{example.pattern}</code>
            </div>
            <p class="example-description">{example.description}</p>
            <div class="example-details">
              <div class="matches">
                <strong>Matches:</strong>
                {example.matches.join(', ')}
              </div>
              <div class="fails">
                <strong>Fails:</strong>
                {example.fails.join(', ')}
              </div>
              <div class="limitation">
                <strong>Limitation:</strong>
                {example.limitation}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="ref-section">
      <h3>{ipAddressValidationContent.sections.practicalTips.title}</h3>
      <p>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html ipAddressValidationContent.sections.practicalTips.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/•/g, '&bull;')}
      </p>
    </div>

    <div class="ref-section">
      <h3>Key Recommendations</h3>
      <div class="recommendations-grid">
        {#each ipAddressValidationContent.recommendations as rec (rec.title)}
          <div class="recommendation-card">
            <div class="rec-icon" style="color: {rec.color}">
              <Icon name={rec.icon} size="md" />
            </div>
            <div class="rec-content">
              <h4>{rec.title}</h4>
              <p>{rec.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .content-section {
    margin-top: var(--spacing-xl);
  }

  .ref-header {
    text-align: center;
    margin-bottom: var(--spacing-xl);

    h2 {
      // color: var(--color-primary);
      font-size: var(--font-size-xl);
      margin-bottom: var(--spacing-sm);
    }
  }

  .ref-section {
    margin-bottom: var(--spacing-xl);

    h3 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-xs);
      font-size: var(--font-size-lg);
    }

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-sm);
    }

    p {
      line-height: 1.7;
      margin-bottom: var(--spacing-md);
    }
  }

  .examples-grid {
    display: grid;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-md);
  }

  .example-card {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .pattern-code {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);
    margin: var(--spacing-sm) 0;
    overflow-x: auto;
    code {
      color: var(--color-primary);
      background-color: var(--bg-primary);
    }
  }

  .example-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
  }

  .example-details {
    font-size: var(--font-size-xs);
    line-height: 1.6;

    > div {
      margin-bottom: var(--spacing-xs);
    }

    strong {
      color: var(--text-primary);
    }

    .matches {
      color: var(--color-success);
    }
    .fails {
      color: var(--color-error);
    }
    .limitation {
      color: var(--color-warning);
    }
  }

  .recommendations-grid {
    display: grid;
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);

    @media (min-width: 769px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .recommendation-card {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    align-items: flex-start;

    @media (max-width: 768px) {
      flex-direction: column;
      text-align: center;
    }
  }

  .rec-icon {
    flex-shrink: 0;
  }

  .rec-content {
    h4 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }
</style>
