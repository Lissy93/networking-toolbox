<script lang="ts">
  import '../../../../styles/pages.scss';
  import '../../../../styles/converters.scss';
  import '../../../../styles/components.scss';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'pages');
  });
</script>

<div class="container">
  <slot />

  <!-- IPv4/IPv6 Information Section -->
  <div class="info-cards-section">
    <div class="explainer-card no-hover">
      <h3>
        <Icon name="info" size="md" />
        {$t('pages.ipConverter.families.understanding.title')}
      </h3>
      <div class="explainer-content">
        <div class="format-explanations">
          <!-- IPv4 Overview -->
          <div class="format-explanation">
            <h4><span class="format-badge ipv4">{$t('pages.ipConverter.families.understanding.ipv4.title')}</span></h4>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv4.addressLength')}</strong></p>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv4.format')}</strong></p>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv4.totalAddresses')}</strong></p>
            <p>
              <strong>{$t('pages.ipConverter.families.understanding.ipv4.example')}</strong> <code>203.0.113.45</code>
            </p>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv4.status')}</strong></p>
          </div>

          <!-- IPv6 Overview -->
          <div class="format-explanation">
            <h4><span class="format-badge ipv6">{$t('pages.ipConverter.families.understanding.ipv6.title')}</span></h4>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv6.addressLength')}</strong></p>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv6.format')}</strong></p>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv6.totalAddresses')}</strong></p>
            <p>
              <strong>{$t('pages.ipConverter.families.understanding.ipv6.example')}</strong>
              <code>2001:0db8:85a3:0000:0000:8a2e:0370:7334</code>
            </p>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv6.status')}</strong></p>
          </div>

          <!-- IPv4-mapped IPv6 -->
          <div class="format-explanation">
            <h4>
              <span class="format-badge mapped">{$t('pages.ipConverter.families.understanding.ipv4Mapped.title')}</span>
            </h4>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv4Mapped.purpose')}</strong></p>
            <p>
              <strong>{$t('pages.ipConverter.families.understanding.ipv4Mapped.format')}</strong>
              <code>::ffff:192.0.2.1</code>
              or <code>::ffff:c000:0201</code>
            </p>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv4Mapped.usage')}</strong></p>
            <p><strong>{$t('pages.ipConverter.families.understanding.ipv4Mapped.structure')}</strong></p>
          </div>
        </div>
      </div>
    </div>

    <div class="explainer-card no-hover">
      <h3>
        <Icon name="lightbulb" size="md" />
        {$t('pages.ipConverter.families.conversionMethods.title')}
      </h3>
      <div class="explainer-content">
        <div class="usage-scenarios">
          <div class="usage-scenario">
            <h4>{$t('pages.ipConverter.families.conversionMethods.ipv4ToIpv6.title')}</h4>
            <ul>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.ipv4ToIpv6.mapped')}</strong></li>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.ipv4ToIpv6.dualStack')}</strong></li>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.ipv4ToIpv6.tunneling')}</strong></li>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.ipv4ToIpv6.migration')}</strong></li>
            </ul>
          </div>

          <div class="usage-scenario">
            <h4>{$t('pages.ipConverter.families.conversionMethods.ipv6ToIpv4.title')}</h4>
            <ul>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.ipv6ToIpv4.legacySupport')}</strong></li>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.ipv6ToIpv4.compatibility')}</strong></li>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.ipv6ToIpv4.debugging')}</strong></li>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.ipv6ToIpv4.analysis')}</strong></li>
            </ul>
          </div>

          <div class="usage-scenario">
            <h4>{$t('pages.ipConverter.families.conversionMethods.realWorldApps.title')}</h4>
            <ul>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.realWorldApps.webServers')}</strong></li>
              <li><strong>{$t('pages.ipConverter.families.conversionMethods.realWorldApps.loadBalancers')}</strong></li>
              <li>
                <strong>{$t('pages.ipConverter.families.conversionMethods.realWorldApps.networkMonitoring')}</strong>
              </li>
              <li>
                <strong>{$t('pages.ipConverter.families.conversionMethods.realWorldApps.apiIntegration')}</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="explainer-card no-hover">
      <h3>
        <Icon name="warning" size="md" />
        {$t('pages.ipConverter.families.considerations.title')}
      </h3>
      <div class="explainer-content">
        <div class="class-notes">
          <h4>{$t('pages.ipConverter.families.considerations.limitations.title')}</h4>
          <ul>
            <li>
              <strong>{$t('pages.ipConverter.families.considerations.limitations.ipv4MappedLimit')}</strong>
            </li>
            <li><strong>{$t('pages.ipConverter.families.considerations.limitations.security')}</strong></li>
            <li><strong>{$t('pages.ipConverter.families.considerations.limitations.performance')}</strong></li>
            <li><strong>{$t('pages.ipConverter.families.considerations.limitations.compatibility')}</strong></li>
            <li><strong>{$t('pages.ipConverter.families.considerations.limitations.bestPractice')}</strong></li>
            <li><strong>{$t('pages.ipConverter.families.considerations.limitations.futureProofing')}</strong></li>
          </ul>
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
    }
    .usage-scenario,
    .format-explanation,
    .class-notes {
      padding: var(--spacing-md);
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-md);

      background-color: var(--bg-tertiary);
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
    .class-notes {
      background-color: var(--bg-primary);
      border: 1px solid var(--color-warning);
      h4 {
        color: var(--color-warning);
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
    &.ipv4 {
      background-color: var(--color-info);
    }
    &.ipv6 {
      background-color: var(--color-success);
    }
    &.mapped {
      background-color: var(--color-warning);
    }
  }
</style>
