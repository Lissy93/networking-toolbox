<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics/email-spf-check');
  });

  let domain = $state('gmail.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { domain: 'gmail.com', description: $t('diagnostics/email-spf-check.examples.gmail') },
    { domain: 'outlook.com', description: $t('diagnostics/email-spf-check.examples.outlook') },
    { domain: 'salesforce.com', description: $t('diagnostics/email-spf-check.examples.salesforce') },
    { domain: 'mailchimp.com', description: $t('diagnostics/email-spf-check.examples.mailchimp') },
    { domain: 'github.com', description: $t('diagnostics/email-spf-check.examples.github') },
    { domain: 'sendgrid.com', description: $t('diagnostics/email-spf-check.examples.sendgrid') },
  ];

  async function checkSPF() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'spf-check',
          domain: domain.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`SPF check failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    checkSPF();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function getDeliverabilityColor(risk: string): string {
    switch (risk) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'secondary';
    }
  }

  function getDeliverabilityIcon(risk: string): string {
    switch (risk) {
      case 'low':
        return 'shield-check';
      case 'medium':
        return 'shield-alert';
      case 'high':
        return 'shield-x';
      default:
        return 'shield';
    }
  }

  async function copyResults() {
    if (!results) return;

    let text = `SPF Check for ${domain}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    if (results.record) {
      text += `SPF Record:\n${results.record}\n\n`;
    }

    if (results.emailAnalysis) {
      text += `Email Deliverability Analysis:\n`;
      text += `  Risk Level: ${results.emailAnalysis.deliverabilityRisk}\n`;
      text += `  Hard Fail (-all): ${results.emailAnalysis.hasHardFail ? 'Yes' : 'No'}\n`;
      text += `  Soft Fail (~all): ${results.emailAnalysis.hasSoftFail ? 'Yes' : 'No'}\n`;
      text += `  Allows All (+all): ${results.emailAnalysis.allowsAll ? 'Yes' : 'No'}\n\n`;
    }

    const expandedResults = results as {
      expanded?: { mechanisms: string[]; includes: Array<{ domain: string }> };
      lookupCount?: number;
    };
    if (expandedResults.expanded) {
      text += `Expanded SPF Analysis:\n`;
      text += `  Total DNS lookups: ${expandedResults.lookupCount || 0}\n`;
      text += `  Mechanisms: ${expandedResults.expanded.mechanisms.join(', ')}\n`;
      if (expandedResults.expanded.includes.length > 0) {
        text += `  Includes: ${expandedResults.expanded.includes.map((inc) => inc.domain).join(', ')}\n`;
      }
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics/email-spf-check.title')}</h1>
    <p>
      {$t('diagnostics/email-spf-check.description')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics/email-spf-check.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Check SPF policy for ${example.domain}`}
          >
            <h5>{example.domain}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics/email-spf-check.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={$t('diagnostics/email-spf-check.form.domain.tooltip')}>
          {$t('diagnostics/email-spf-check.form.domain.label')}
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder={$t('diagnostics/email-spf-check.form.domain.placeholder')}
            onchange={() => {
              clearExampleSelection();
              if (domain) checkSPF();
            }}
          />
        </label>
      </div>

      <div class="action-section">
        <button class="check-btn lookup-btn" onclick={checkSPF} disabled={loading || !domain.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('diagnostics/email-spf-check.form.checking')}
          {:else}
            <Icon name="mail-check" size="sm" />
            {$t('diagnostics/email-spf-check.form.check')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics/email-spf-check.results.title')}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <Icon name={copiedState ? 'check' : 'copy'} size="xs" />
          {copiedState
            ? $t('diagnostics/email-spf-check.results.copied')
            : $t('diagnostics/email-spf-check.results.copy')}
        </button>
      </div>
      <div class="card-content">
        {#if results.record}
          <!-- Email Deliverability Overview -->
          {#if results.emailAnalysis}
            <div class="deliverability-section">
              <div class="deliverability-overview {getDeliverabilityColor(results.emailAnalysis.deliverabilityRisk)}">
                <Icon name={getDeliverabilityIcon(results.emailAnalysis.deliverabilityRisk)} size="md" />
                <div>
                  <h4>
                    {$t('diagnostics/email-spf-check.results.deliverability.title')}: {results.emailAnalysis.deliverabilityRisk.toUpperCase()}
                  </h4>
                  <p>
                    {#if results.emailAnalysis.deliverabilityRisk === 'low'}
                      {$t('diagnostics/email-spf-check.results.deliverability.low')}
                    {:else if results.emailAnalysis.deliverabilityRisk === 'medium'}
                      {$t('diagnostics/email-spf-check.results.deliverability.medium')}
                    {:else}
                      {$t('diagnostics/email-spf-check.results.deliverability.high')}
                    {/if}
                  </p>
                </div>
              </div>

              <div class="deliverability-details">
                <div class="detail-item {results.emailAnalysis.hasHardFail ? 'success' : 'warning'}">
                  <Icon name={results.emailAnalysis.hasHardFail ? 'check-circle' : 'alert-circle'} size="sm" />
                  <div>
                    <span class="detail-label">{$t('diagnostics/email-spf-check.results.details.hardFail.label')}</span>
                    <span class="detail-value"
                      >{results.emailAnalysis.hasHardFail
                        ? $t('diagnostics/email-spf-check.results.details.hardFail.enabled')
                        : $t('diagnostics/email-spf-check.results.details.hardFail.disabled')}</span
                    >
                    <span class="detail-description">
                      {results.emailAnalysis.hasHardFail
                        ? $t('diagnostics/email-spf-check.results.details.hardFail.enabledDesc')
                        : $t('diagnostics/email-spf-check.results.details.hardFail.disabledDesc')}
                    </span>
                  </div>
                </div>

                <div
                  class="detail-item {results.emailAnalysis.hasSoftFail
                    ? 'warning'
                    : results.emailAnalysis.hasHardFail
                      ? 'success'
                      : 'error'}"
                >
                  <Icon
                    name={results.emailAnalysis.hasSoftFail
                      ? 'alert-triangle'
                      : results.emailAnalysis.hasHardFail
                        ? 'check-circle'
                        : 'x-circle'}
                    size="sm"
                  />
                  <div>
                    <span class="detail-label">{$t('diagnostics/email-spf-check.results.details.softFail.label')}</span>
                    <span class="detail-value"
                      >{results.emailAnalysis.hasSoftFail
                        ? $t('diagnostics/email-spf-check.results.details.softFail.enabled')
                        : $t('diagnostics/email-spf-check.results.details.softFail.disabled')}</span
                    >
                    <span class="detail-description">
                      {results.emailAnalysis.hasSoftFail
                        ? $t('diagnostics/email-spf-check.results.details.softFail.enabledDesc')
                        : results.emailAnalysis.hasHardFail
                          ? $t('diagnostics/email-spf-check.results.details.softFail.hardFailInstead')
                          : $t('diagnostics/email-spf-check.results.details.softFail.noEnforcement')}
                    </span>
                  </div>
                </div>

                {#if results.emailAnalysis.allowsAll}
                  <div class="detail-item error">
                    <Icon name="alert-triangle" size="sm" />
                    <div>
                      <span class="detail-label"
                        >{$t('diagnostics/email-spf-check.results.details.allowsAll.label')}</span
                      >
                      <span class="detail-value"
                        >{$t('diagnostics/email-spf-check.results.details.allowsAll.enabled')}</span
                      >
                      <span class="detail-description"
                        >{$t('diagnostics/email-spf-check.results.details.allowsAll.warning')}</span
                      >
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- SPF Record Display -->
          <div class="record-section">
            <h4>{$t('diagnostics/email-spf-check.results.record.title')}</h4>
            <div class="record-display">
              <div class="record-location">{$t('diagnostics/email-spf-check.results.record.location', { domain })}</div>
              <code>{results.record}</code>
            </div>
          </div>

          <!-- Expanded Analysis -->
          {#if results.expanded}
            <div class="analysis-section">
              <h4>{$t('diagnostics/email-spf-check.results.breakdown.title')}</h4>

              <!-- Lookup Count Warning -->
              {#if results.lookupCount > 8}
                <div class="warning-box">
                  <Icon name="alert-triangle" size="sm" />
                  <div>
                    <strong>{$t('diagnostics/email-spf-check.results.breakdown.lookupLimitExceeded.title')}</strong>
                    <p>
                      {$t('diagnostics/email-spf-check.results.breakdown.lookupLimitExceeded.message', {
                        count: results.lookupCount,
                      })}
                    </p>
                  </div>
                </div>
              {:else if results.lookupCount > 6}
                <div class="info-box">
                  <Icon name="info" size="sm" />
                  <div>
                    <strong>{$t('diagnostics/email-spf-check.results.breakdown.highLookupCount.title')}</strong>
                    <p>
                      {$t('diagnostics/email-spf-check.results.breakdown.highLookupCount.message', {
                        count: results.lookupCount,
                      })}
                    </p>
                  </div>
                </div>
              {/if}

              <!-- Mechanisms -->
              {#if results.expanded.mechanisms.length > 0}
                {@const spfExpanded = (results as { expanded: { mechanisms: string[] } }).expanded}
                <div class="mechanisms-section">
                  <h5>{$t('diagnostics/email-spf-check.results.breakdown.directMechanisms')}</h5>
                  <div class="mechanism-list">
                    {#each spfExpanded.mechanisms as mechanism, mechanismIndex (mechanismIndex)}
                      <div class="mechanism-item">
                        <code>{mechanism}</code>
                        <span class="mechanism-description">
                          {#if mechanism.startsWith('v=spf1')}
                            {$t('diagnostics/email-spf-check.results.mechanisms.spfVersion')}
                          {:else if mechanism.startsWith('ip4:')}
                            {$t('diagnostics/email-spf-check.results.mechanisms.ipv4Address', {
                              address: mechanism.substring(4),
                            })}
                          {:else if mechanism.startsWith('ip6:')}
                            {$t('diagnostics/email-spf-check.results.mechanisms.ipv6Address', {
                              address: mechanism.substring(4),
                            })}
                          {:else if mechanism.startsWith('a:')}
                            {$t('diagnostics/email-spf-check.results.mechanisms.aRecordSpecific', {
                              domain: mechanism.substring(2),
                            })}
                          {:else if mechanism === 'a'}
                            {$t('diagnostics/email-spf-check.results.mechanisms.aRecordDomain')}
                          {:else if mechanism.startsWith('mx:')}
                            {$t('diagnostics/email-spf-check.results.mechanisms.mxRecordSpecific', {
                              domain: mechanism.substring(3),
                            })}
                          {:else if mechanism === 'mx'}
                            {$t('diagnostics/email-spf-check.results.mechanisms.mxRecordDomain')}
                          {:else if mechanism.startsWith('exists:')}
                            {$t('diagnostics/email-spf-check.results.mechanisms.existsLookup', {
                              domain: mechanism.substring(7),
                            })}
                          {:else if mechanism === '-all'}
                            {$t('diagnostics/email-spf-check.results.mechanisms.hardFail')}
                          {:else if mechanism === '~all'}
                            {$t('diagnostics/email-spf-check.results.mechanisms.softFail')}
                          {:else if mechanism === '+all'}
                            {$t('diagnostics/email-spf-check.results.mechanisms.passAll')}
                          {:else if mechanism === '?all'}
                            {$t('diagnostics/email-spf-check.results.mechanisms.neutral')}
                          {:else}
                            {mechanism}
                          {/if}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Includes -->
              {#if results.expanded.includes.length > 0}
                {@const spfIncludes = (
                  results as {
                    expanded: { includes: Array<{ domain: string; result: { record?: string; error?: string } }> };
                  }
                ).expanded}
                <div class="includes-section">
                  <h5>{$t('diagnostics/email-spf-check.results.breakdown.includedPolicies')}</h5>
                  <div class="include-list">
                    {#each spfIncludes.includes as include, includeIndex (includeIndex)}
                      <div class="include-item">
                        <div class="include-header">
                          <Icon name="external-link" size="xs" />
                          <span class="include-domain">{include.domain}</span>
                        </div>
                        {#if include.result.record}
                          <div class="include-record">
                            <code>{include.result.record}</code>
                          </div>
                        {/if}
                        {#if include.result.error}
                          <div class="include-error">
                            <Icon name="alert-triangle" size="xs" />
                            <span>{include.result.error}</span>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        {:else}
          <div class="no-record-section">
            <div class="no-record-content">
              <Icon name="alert-triangle" size="md" />
              <div>
                <h4>{$t('diagnostics/email-spf-check.results.noRecord.title')}</h4>
                <p>{$t('diagnostics/email-spf-check.results.noRecord.message', { domain })}</p>
                <p class="risk-warning">
                  {$t('diagnostics/email-spf-check.results.noRecord.warning')}
                </p>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>{$t('diagnostics/email-spf-check.results.error.title')}</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/email-spf-check.education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/email-spf-check.education.mechanisms.title')}</h4>
          <div class="mechanism-explanations">
            <div class="mechanism-explanation">
              <strong>ip4/ip6:</strong>
              {$t('diagnostics/email-spf-check.education.mechanisms.ip')}
            </div>
            <div class="mechanism-explanation">
              <strong>a/mx:</strong>
              {$t('diagnostics/email-spf-check.education.mechanisms.amx')}
            </div>
            <div class="mechanism-explanation">
              <strong>include:</strong>
              {$t('diagnostics/email-spf-check.education.mechanisms.include')}
            </div>
            <div class="mechanism-explanation">
              <strong>all:</strong>
              {$t('diagnostics/email-spf-check.education.mechanisms.all')}
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/email-spf-check.education.deliverability.title')}</h4>
          <ul>
            <li>
              <strong>Hard Fail (-all):</strong>
              {$t('diagnostics/email-spf-check.education.deliverability.hardFail')}
            </li>
            <li>
              <strong>Soft Fail (~all):</strong>
              {$t('diagnostics/email-spf-check.education.deliverability.softFail')}
            </li>
            <li><strong>No SPF:</strong> {$t('diagnostics/email-spf-check.education.deliverability.noSpf')}</li>
            <li>
              <strong>Too many lookups:</strong>
              {$t('diagnostics/email-spf-check.education.deliverability.tooManyLookups')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/email-spf-check.education.bestPractices.title')}</h4>
          <ul>
            <li>{$t('diagnostics/email-spf-check.education.bestPractices.useHardFail')}</li>
            <li>{$t('diagnostics/email-spf-check.education.bestPractices.limitLookups')}</li>
            <li>{$t('diagnostics/email-spf-check.education.bestPractices.testChanges')}</li>
            <li>{$t('diagnostics/email-spf-check.education.bestPractices.monitorDelivery')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/email-spf-check.education.examples.title')}</h4>
          <div class="spf-examples">
            <div class="spf-example">
              <code>v=spf1 include:_spf.google.com ~all</code>
              <span>{$t('diagnostics/email-spf-check.education.examples.googleWorkspace')}</span>
            </div>
            <div class="spf-example">
              <code>v=spf1 ip4:192.168.1.1 -all</code>
              <span>{$t('diagnostics/email-spf-check.education.examples.specificIp')}</span>
            </div>
            <div class="spf-example">
              <code>v=spf1 a mx -all</code>
              <span>{$t('diagnostics/email-spf-check.education.examples.aMxRecords')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  .deliverability-section {
    margin-bottom: var(--spacing-lg);
  }

  .deliverability-overview {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    border: 2px solid;
    margin-bottom: var(--spacing-md);

    &.success {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      border-color: var(--color-success);
    }

    &.warning {
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      border-color: var(--color-warning);
    }

    &.error {
      background: color-mix(in srgb, var(--color-error), transparent 95%);
      border-color: var(--color-error);
    }

    h4 {
      margin: 0;
      color: var(--text-primary);
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .deliverability-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .detail-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border-left: 4px solid;

    &.success {
      border-left-color: var(--color-success);
      :global(svg) {
        color: var(--color-success);
      }
    }

    &.warning {
      border-left-color: var(--color-warning);
      :global(svg) {
        color: var(--color-warning);
      }
    }

    &.error {
      border-left-color: var(--color-error);
      :global(svg) {
        color: var(--color-error);
      }
    }

    div {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .detail-label {
        font-weight: 600;
        color: var(--text-primary);
        font-size: var(--font-size-sm);
      }

      .detail-value {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        font-weight: 500;
      }

      .detail-description {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        line-height: 1.4;
      }
    }
  }

  .record-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .record-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);

    @media (max-width: 600px) {
      flex-wrap: wrap;
    }

    .record-location {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      white-space: nowrap;
    }

    code {
      flex: 1;
      word-break: break-all;
      font-family: var(--font-mono);
    }
  }

  .warning-box,
  .info-box {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-md);

    strong {
      color: var(--text-primary);
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .warning-box {
    background: color-mix(in srgb, var(--color-warning), transparent 95%);
    border: 1px solid var(--color-warning);
    :global(svg) {
      color: var(--color-warning);
    }
  }

  .info-box {
    background: color-mix(in srgb, var(--color-primary), transparent 95%);
    border: 1px solid var(--color-primary);
    :global(svg) {
      color: var(--color-primary);
    }
  }

  .analysis-section {
    h4,
    h5 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }

    h5 {
      font-size: var(--font-size-md);
      margin-bottom: var(--spacing-sm);
    }
  }

  .mechanisms-section,
  .includes-section {
    margin-bottom: var(--spacing-lg);
  }

  .mechanism-list,
  .include-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .mechanism-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);

    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-weight: 600;
    }

    .mechanism-description {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }
  }

  .include-item {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);

    .include-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);

      .include-domain {
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .include-record {
      margin-bottom: var(--spacing-sm);

      code {
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        word-break: break-all;
      }
    }

    .include-error {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--color-error);
      font-size: var(--font-size-xs);
    }
  }

  .no-record-section {
    .no-record-content {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      border: 2px solid var(--color-warning);
      border-radius: var(--radius-md);

      h4 {
        margin: 0 0 var(--spacing-sm) 0;
        color: var(--text-primary);
      }

      p {
        margin: 0 0 var(--spacing-xs) 0;
        color: var(--text-secondary);
      }

      .risk-warning {
        color: var(--color-warning) !important;
        font-weight: 500;
      }
    }
  }

  .mechanism-explanations {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .mechanism-explanation {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);

      strong {
        color: var(--text-primary);
        font-family: var(--font-mono);
      }
    }
  }

  .spf-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .spf-example {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);

      code {
        background: var(--bg-secondary);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--font-mono);
        color: var(--text-primary);
        margin-right: var(--spacing-xs);
        display: block;
        margin-bottom: var(--spacing-xs);
      }
    }
  }
</style>
