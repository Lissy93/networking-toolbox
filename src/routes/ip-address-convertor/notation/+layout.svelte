<script lang="ts">
  import '../../../styles/pages.scss';
  import '../../../styles/converters.scss';
  import '../../../styles/components.scss';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/i18n';
  import { ensurePageTranslations } from '$lib/i18n/page-translations';

  // Load translations immediately for SSR
  ensurePageTranslations('en');
</script>

<div class="container">
  <slot />

  <!-- IPv6 Notation Information Section -->
  <div class="info-cards-section">
    <div class="explainer-card no-hover">
      <h3>
        <Icon name="info" size="md" />
        {t('ipv6Notation.title')}
      </h3>
      <div class="explainer-content">
        <div class="format-explanations">
          <!-- Expanded Form -->
          <div class="format-explanation">
            <h4><span class="format-badge expanded">{t('ipv6Notation.formats.expanded.title')}</span></h4>
            <p><strong>{t('ipv6Notation.terms.structure')}</strong> {t('ipv6Notation.formats.expanded.structure')}</p>
            <p>
              <strong>{t('ipv6Notation.terms.example')}</strong> <code>2001:0db8:85a3:0000:0000:8a2e:0370:7334</code>
            </p>
            <p><strong>{t('ipv6Notation.terms.usage')}</strong> {t('ipv6Notation.formats.expanded.usage')}</p>
            <p><strong>{t('ipv6Notation.terms.benefits')}</strong> {t('ipv6Notation.formats.expanded.benefits')}</p>
          </div>

          <!-- Compressed Form -->
          <div class="format-explanation">
            <h4><span class="format-badge compressed">{t('ipv6Notation.formats.compressed.title')}</span></h4>
            <p><strong>{t('ipv6Notation.terms.structure')}</strong> {t('ipv6Notation.formats.compressed.structure')}</p>
            <p><strong>{t('ipv6Notation.terms.example')}</strong> <code>2001:db8:85a3::8a2e:370:7334</code></p>
            <p><strong>{t('ipv6Notation.terms.usage')}</strong> {t('ipv6Notation.formats.compressed.usage')}</p>
            <p><strong>{t('ipv6Notation.terms.benefits')}</strong> {t('ipv6Notation.formats.compressed.benefits')}</p>
          </div>

          <!-- Compression Rules -->
          <div class="format-explanation">
            <h4><span class="format-badge rules">{t('ipv6Notation.formats.rules.title')}</span></h4>
            <p>
              <strong>{t('ipv6Notation.terms.doubleColonLabel')}</strong>
              {t('ipv6Notation.formats.rules.doubleColon')}
            </p>
            <p><strong>{t('ipv6Notation.terms.singleUseLabel')}</strong> {t('ipv6Notation.formats.rules.singleUse')}</p>
            <p>
              <strong>{t('ipv6Notation.terms.leadingZerosLabel')}</strong>
              {t('ipv6Notation.formats.rules.leadingZeros')}
            </p>
            <p>
              <strong>{t('ipv6Notation.terms.preferenceLabel')}</strong>
              {t('ipv6Notation.formats.rules.preference')}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="explainer-card no-hover">
      <h3>
        <Icon name="lightbulb" size="md" />
        {t('ipv6Notation.conversions.title')}
      </h3>
      <div class="explainer-content">
        <div class="usage-scenarios">
          <div class="usage-scenario">
            <h4>{t('ipv6Notation.useCases.expand.title')}</h4>
            <ul>
              <li>
                <strong>{t('ipv6Notation.terms.networkAnalysisLabel')}</strong>
                {t('ipv6Notation.useCases.expand.networkAnalysis')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.databaseStorageLabel')}</strong>
                {t('ipv6Notation.useCases.expand.databaseStorage')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.debuggingLabel')}</strong>
                {t('ipv6Notation.useCases.expand.debugging')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.programmingLabel')}</strong>
                {t('ipv6Notation.useCases.expand.programming')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.securityLabel')}</strong>
                {t('ipv6Notation.useCases.expand.security')}
              </li>
            </ul>
          </div>

          <div class="usage-scenario">
            <h4>{t('ipv6Notation.useCases.compress.title')}</h4>
            <ul>
              <li>
                <strong>{t('ipv6Notation.terms.userInterfaceLabel')}</strong>
                {t('ipv6Notation.useCases.compress.userInterface')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.configurationLabel')}</strong>
                {t('ipv6Notation.useCases.compress.configuration')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.documentationLabel')}</strong>
                {t('ipv6Notation.useCases.compress.documentation')}
              </li>
              <li><strong>{t('ipv6Notation.terms.urlsLabel')}</strong> {t('ipv6Notation.useCases.compress.urls')}</li>
              <li>
                <strong>{t('ipv6Notation.terms.networkEquipmentLabel')}</strong>
                {t('ipv6Notation.useCases.compress.networkEquipment')}
              </li>
            </ul>
          </div>

          <div class="usage-scenario">
            <h4>{t('ipv6Notation.useCases.scenarios.title')}</h4>
            <ul>
              <li>
                <strong>{t('ipv6Notation.terms.networkMonitoringLabel')}</strong>
                {t('ipv6Notation.useCases.scenarios.networkMonitoring')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.apiIntegrationLabel')}</strong>
                {t('ipv6Notation.useCases.scenarios.apiIntegration')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.dataMigrationLabel')}</strong>
                {t('ipv6Notation.useCases.scenarios.dataMigration')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.educationalToolsLabel')}</strong>
                {t('ipv6Notation.useCases.scenarios.educationalTools')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.qualityAssuranceLabel')}</strong>
                {t('ipv6Notation.useCases.scenarios.qualityAssurance')}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="explainer-card no-hover">
      <h3>
        <Icon name="code" size="md" />
        {t('ipv6Notation.conversions.examples.title')}
      </h3>
      <div class="explainer-content">
        <div class="examples-grid">
          <div class="example-item">
            <h4>{t('ipv6Notation.examples.commonTypes')}</h4>
            <div class="code-examples">
              <div class="code-pair">
                <div class="code-label">{t('ipv6Notation.examples.loopback')}</div>
                <div class="code-block">
                  <code class="expanded">::1</code>
                  <span class="arrow">↔</span>
                  <code class="compressed">0000:0000:0000:0000:0000:0000:0000:0001</code>
                </div>
              </div>
              <div class="code-pair">
                <div class="code-label">{t('ipv6Notation.examples.linkLocal')}</div>
                <div class="code-block">
                  <code class="expanded">fe80::1</code>
                  <span class="arrow">↔</span>
                  <code class="compressed">fe80:0000:0000:0000:0000:0000:0000:0001</code>
                </div>
              </div>
              <div class="code-pair">
                <div class="code-label">{t('ipv6Notation.examples.documentation')}</div>
                <div class="code-block">
                  <code class="expanded">2001:db8::</code>
                  <span class="arrow">↔</span>
                  <code class="compressed">2001:0db8:0000:0000:0000:0000:0000:0000</code>
                </div>
              </div>
            </div>
          </div>

          <div class="example-item">
            <h4>{t('ipv6Notation.examples.bestPractices.title')}</h4>
            <ul>
              <li>
                <strong>{t('ipv6Notation.terms.rfc5952Label')}</strong>
                {t('ipv6Notation.examples.bestPractices.rfc5952')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.consistencyLabel')}</strong>
                {t('ipv6Notation.examples.bestPractices.consistency')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.validationLabel')}</strong>
                {t('ipv6Notation.examples.bestPractices.validation')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.caseSensitivityLabel')}</strong>
                {t('ipv6Notation.examples.bestPractices.caseSensitivity')}
              </li>
              <li>
                <strong>{t('ipv6Notation.terms.leadingZerosRuleLabel')}</strong>
                {t('ipv6Notation.examples.bestPractices.leadingZeros')}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  h3 :global(.icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-primary);
  }

  .usage-scenarios,
  .format-explanations,
  .explainer-card {
    display: grid;
    gap: var(--spacing-md);

    h3 {
      margin-bottom: 0;
      color: var(--color-primary);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .usage-scenario,
    .format-explanation,
    .example-item {
      padding: var(--spacing-md);
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-md);
      border-left: 4px solid var(--border-primary);

      h4 {
        color: var(--text-primary);
        margin-bottom: var(--spacing-sm);
      }

      ul {
        margin: var(--spacing-sm) 0 0 var(--spacing-md);

        li {
          margin-bottom: var(--spacing-xs);
          color: var(--text-primary);
        }
      }
    }
  }

  .info-cards-section {
    margin-top: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .format-badge {
    color: var(--bg-primary);
    border-radius: var(--radius-xs);
    padding: 0.1rem 0.25rem;
    font-weight: 600;

    &.expanded {
      background-color: var(--color-info);
    }
    &.compressed {
      background-color: var(--color-success);
    }
    &.rules {
      background-color: var(--color-warning);
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .code-examples {
    margin-top: var(--spacing-sm);
  }

  .code-pair {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-secondary);
  }

  .code-label {
    font-weight: 600;
    color: var(--color-primary);
    font-size: var(--font-size-sm);
  }

  .code-block {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;

    code {
      font-family: var(--font-mono);
      background-color: var(--bg-primary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-xs);
      border: 1px solid var(--border-primary);
      font-size: var(--font-size-xs);

      &.expanded {
        color: var(--color-info);
      }

      &.compressed {
        color: var(--color-success);
      }
    }

    .arrow {
      color: var(--text-secondary);
      font-weight: bold;
      opacity: 0.7;
    }
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .code-block {
      flex-direction: column;
      align-items: stretch;

      .arrow {
        text-align: center;
      }
    }
  }
</style>
