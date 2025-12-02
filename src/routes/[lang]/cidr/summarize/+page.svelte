<script lang="ts">
  import CIDRSummarizer from '$lib/components/tools/CIDRSummarizer.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'pages/cidr-summarize');
  });
</script>

<div class="page-container">
  <CIDRSummarizer />

  <section class="explainer-section">
    <h3>{$t('pages/cidr-summarize.cidrSummarize.about.title')}</h3>
    <p>
      {$t('pages/cidr-summarize.cidrSummarize.about.description')}
    </p>

    <div class="benefits-grid">
      <div class="benefit-item">
        <h4>{$t('pages/cidr-summarize.cidrSummarize.benefits.routeTable.title')}</h4>
        <p>{$t('pages/cidr-summarize.cidrSummarize.benefits.routeTable.description')}</p>
      </div>
      <div class="benefit-item">
        <h4>{$t('pages/cidr-summarize.cidrSummarize.benefits.networkEfficiency.title')}</h4>
        <p>{$t('pages/cidr-summarize.cidrSummarize.benefits.networkEfficiency.description')}</p>
      </div>
      <div class="benefit-item">
        <h4>{$t('pages/cidr-summarize.cidrSummarize.benefits.dualProtocol.title')}</h4>
        <p>{$t('pages/cidr-summarize.cidrSummarize.benefits.dualProtocol.description')}</p>
      </div>
      <div class="benefit-item">
        <h4>{$t('pages/cidr-summarize.cidrSummarize.benefits.flexibleInput.title')}</h4>
        <p>{$t('pages/cidr-summarize.cidrSummarize.benefits.flexibleInput.description')}</p>
      </div>
    </div>

    <div class="modes-section">
      <h4>{$t('pages/cidr-summarize.cidrSummarize.modes.title')}</h4>
      <div class="modes-grid">
        <div class="mode-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.modes.exactMerge.title')}</h5>
          <p>
            {$t('pages/cidr-summarize.cidrSummarize.modes.exactMerge.description')}
          </p>
          <div class="mode-example">
            <span class="example-label">{$t('pages/cidr-summarize.cidrSummarize.modes.example.label')}</span>
            <code class="example-input">192.168.1.0/24 + 192.168.2.0/24</code>
            <span class="arrow">→</span>
            <code class="example-output">192.168.1.0/24, 192.168.2.0/24</code>
          </div>
        </div>
        <div class="mode-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.modes.minimalCover.title')}</h5>
          <p>{$t('pages/cidr-summarize.cidrSummarize.modes.minimalCover.description')}</p>
          <div class="mode-example">
            <span class="example-label">{$t('pages/cidr-summarize.cidrSummarize.modes.example.label')}</span>
            <code class="example-input">192.168.1.0/24 + 192.168.2.0/24</code>
            <span class="arrow">→</span>
            <code class="example-output">192.168.0.0/23</code>
          </div>
        </div>
      </div>
    </div>

    <div class="use-cases-section">
      <h4>{$t('pages/cidr-summarize.cidrSummarize.useCases.title')}</h4>
      <div class="use-cases-grid">
        <div class="use-case-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.useCases.bgp.title')}</h5>
          <p>{$t('pages/cidr-summarize.cidrSummarize.useCases.bgp.description')}</p>
        </div>
        <div class="use-case-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.useCases.firewall.title')}</h5>
          <p>{$t('pages/cidr-summarize.cidrSummarize.useCases.firewall.description')}</p>
        </div>
        <div class="use-case-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.useCases.planning.title')}</h5>
          <p>{$t('pages/cidr-summarize.cidrSummarize.useCases.planning.description')}</p>
        </div>
        <div class="use-case-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.useCases.migration.title')}</h5>
          <p>{$t('pages/cidr-summarize.cidrSummarize.useCases.migration.description')}</p>
        </div>
      </div>
    </div>

    <div class="input-formats-section">
      <h4>{$t('pages/cidr-summarize.cidrSummarize.inputFormats.title')}</h4>
      <div class="formats-grid">
        <div class="format-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.inputFormats.singleIP.title')}</h5>
          <div class="format-examples">
            <code>192.168.1.100</code>
            <code>2001:db8::1</code>
          </div>
        </div>
        <div class="format-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.inputFormats.cidrBlocks.title')}</h5>
          <div class="format-examples">
            <code>10.0.0.0/8</code>
            <code>2001:db8::/32</code>
          </div>
        </div>
        <div class="format-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.inputFormats.ipRanges.title')}</h5>
          <div class="format-examples">
            <code>172.16.1.1-172.16.1.100</code>
            <code>2001:db8::1-2001:db8::ffff</code>
          </div>
        </div>
        <div class="format-item">
          <h5>{$t('pages/cidr-summarize.cidrSummarize.inputFormats.mixedLists.title')}</h5>
          <div class="format-examples">
            <code>{$t('pages/cidr-summarize.cidrSummarize.inputFormats.mixedLists.example1')}</code>
            <code>{$t('pages/cidr-summarize.cidrSummarize.inputFormats.mixedLists.example2')}</code>
          </div>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h4>
        <Icon name="lightbulb" size="sm" />
        {$t('pages/cidr-summarize.cidrSummarize.optimizationTips.title')}
      </h4>
      <p>
        {$t('pages/cidr-summarize.cidrSummarize.optimizationTips.description')}
      </p>
    </div>
  </section>
</div>

<style>
  .explainer-section {
    margin-top: var(--spacing-xl);
    padding: var(--spacing-lg);
    background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-secondary);

    h3 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }
  }

  .benefits-grid,
  .modes-grid,
  .use-cases-grid,
  .formats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin: var(--spacing-lg) 0;
  }

  .benefit-item,
  .use-case-item,
  .format-item {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h4,
    h5 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.5;
      margin: 0;
    }
  }

  .modes-section,
  .use-cases-section,
  .input-formats-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
  }

  .mode-item {
    border: 1px solid var(--border-primary);
    border-left: 4px solid var(--color-info);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
  }

  .mode-example {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background-color: var(--bg-primary);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);

    .example-label {
      font-weight: 600;
      color: var(--color-primary);
    }

    code {
      font-family: var(--font-mono);
      background-color: var(--bg-tertiary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-xs);

      &.example-input {
        color: var(--color-info);
      }

      &.example-output {
        color: var(--color-success);
      }
    }

    .arrow {
      color: var(--text-secondary);
      text-align: center;
      font-weight: bold;
    }
  }

  .format-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);

    code {
      font-family: var(--font-mono);
      background-color: var(--bg-tertiary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-xs);
      font-size: var(--font-size-xs);
      color: var(--color-primary);
    }
  }

  .info-box {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: linear-gradient(135deg, rgba(9, 105, 218, 0.1), rgba(31, 111, 235, 0.05));
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);

    h4 {
      color: var(--color-info);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      :global(.icon) {
        width: 1.2rem;
        height: 1.2rem;
      }
    }

    p {
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      line-height: 1.6;
      margin: 0;
    }
  }

  @media (max-width: 768px) {
    .benefits-grid,
    .modes-grid,
    .use-cases-grid,
    .formats-grid {
      grid-template-columns: 1fr;
    }

    .mode-example {
      .arrow {
        transform: rotate(90deg);
      }
    }
  }
</style>
