<script lang="ts">
  import SupernetCalculator from '$lib/components/tools/SupernetCalculator.svelte';
  import { t } from '$lib/i18n';

  import '$lib/../styles/pages.scss';
  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <SupernetCalculator />

  <section class="explainer-section">
    <h3>{t('tools/supernet-calculator.page.aboutTitle')}</h3>
    <p>
      {t('tools/supernet-calculator.page.aboutDescription')}
    </p>

    <div class="benefits-grid">
      <div class="benefit-item">
        <h4>{t('tools/supernet-calculator.page.benefits.reducedRoutingTables.title')}</h4>
        <p>{t('tools/supernet-calculator.page.benefits.reducedRoutingTables.description')}</p>
      </div>
      <div class="benefit-item">
        <h4>{t('tools/supernet-calculator.page.benefits.improvedScalability.title')}</h4>
        <p>{t('tools/supernet-calculator.page.benefits.improvedScalability.description')}</p>
      </div>
      <div class="benefit-item">
        <h4>{t('tools/supernet-calculator.page.benefits.betterPerformance.title')}</h4>
        <p>{t('tools/supernet-calculator.page.benefits.betterPerformance.description')}</p>
      </div>
      <div class="benefit-item">
        <h4>{t('tools/supernet-calculator.page.benefits.easierManagement.title')}</h4>
        <p>{t('tools/supernet-calculator.page.benefits.easierManagement.description')}</p>
      </div>
    </div>

    <div class="use-cases-section">
      <h4>{t('tools/supernet-calculator.page.useCases.title')}</h4>
      <div class="use-cases-grid">
        <div class="use-case-item">
          <h5>{t('tools/supernet-calculator.page.useCases.ispRouteAggregation.title')}</h5>
          <p>{t('tools/supernet-calculator.page.useCases.ispRouteAggregation.description')}</p>
        </div>
        <div class="use-case-item">
          <h5>{t('tools/supernet-calculator.page.useCases.enterpriseNetworks.title')}</h5>
          <p>{t('tools/supernet-calculator.page.useCases.enterpriseNetworks.description')}</p>
        </div>
        <div class="use-case-item">
          <h5>{t('tools/supernet-calculator.page.useCases.dataCenters.title')}</h5>
          <p>{t('tools/supernet-calculator.page.useCases.dataCenters.description')}</p>
        </div>
        <div class="use-case-item">
          <h5>{t('tools/supernet-calculator.page.useCases.networkRedesign.title')}</h5>
          <p>{t('tools/supernet-calculator.page.useCases.networkRedesign.description')}</p>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h4>
        <Icon name="lightbulb" size="sm" />
        {t('tools/supernet-calculator.page.proTip.title')}
      </h4>
      <p>
        {t('tools/supernet-calculator.page.proTip.description')}
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

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin: var(--spacing-lg) 0;
  }

  .benefit-item {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h4 {
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

  .use-cases-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
  }

  .use-cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .use-case-item {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h5 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.5;
      margin: 0;
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
      gap: var(--spacing-xs);
      :global(.icon) {
        width: 1.25em;
        height: 1.25em;
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
    .use-cases-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
