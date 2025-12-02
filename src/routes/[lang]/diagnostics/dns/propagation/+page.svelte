<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ActionButton from '$lib/components/common/ActionButton.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics/dns-propagation');
  });

  let domainName = $state('example.com');
  let recordType = $state('A');
  let lastQuery = $state<{ domain: string; type: string } | null>(null);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const recordTypes = [
    { value: 'A', label: 'A', description: $t('diagnostics/dns-propagation.recordTypes.A.description') },
    { value: 'AAAA', label: 'AAAA', description: $t('diagnostics/dns-propagation.recordTypes.AAAA.description') },
    { value: 'CNAME', label: 'CNAME', description: $t('diagnostics/dns-propagation.recordTypes.CNAME.description') },
    { value: 'MX', label: 'MX', description: $t('diagnostics/dns-propagation.recordTypes.MX.description') },
    { value: 'TXT', label: 'TXT', description: $t('diagnostics/dns-propagation.recordTypes.TXT.description') },
    { value: 'NS', label: 'NS', description: $t('diagnostics/dns-propagation.recordTypes.NS.description') },
  ];

  const resolverInfo = {
    cloudflare: { name: 'Cloudflare', ip: '1.1.1.1', location: 'Global' },
    google: { name: 'Google', ip: '8.8.8.8', location: 'Global' },
    quad9: { name: 'Quad9', ip: '9.9.9.9', location: 'Global' },
    opendns: { name: 'OpenDNS', ip: '208.67.222.222', location: 'Global' },
  };

  const examplesList = [
    { domain: 'google.com', type: 'A', description: 'googleA' },
    { domain: 'github.com', type: 'AAAA', description: 'githubAAAA' },
    { domain: 'gmail.com', type: 'MX', description: 'gmailMX' },
    { domain: '_dmarc.google.com', type: 'TXT', description: 'dmarcTXT' },
  ];

  const examples = useExamples(() => examplesList);

  async function checkPropagation() {
    diagnosticState.startOperation();
    lastQuery = { domain: domainName.trim(), type: recordType };

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'propagation',
          name: domainName.trim(),
          type: recordType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Propagation check failed: ${response.status}`);
      }

      const data = await response.json();
      diagnosticState.setResults(data.results);
    } catch (err: unknown) {
      diagnosticState.setError(
        err instanceof Error ? err.message : $t('diagnostics/dns-propagation.error.unknownError'),
      );
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    domainName = example.domain;
    recordType = example.type;
    examples.select(index);
    checkPropagation();
  }

  function getStatusColor(result: unknown): string {
    const res = result as { error?: string; result?: { Answer?: unknown[] } };
    if (res.error) return 'error';
    if (!res.result?.Answer?.length) return 'warning';
    return 'success';
  }

  function getStatusIcon(result: unknown): string {
    const res = result as { error?: string; result?: { Answer?: unknown[] } };
    if (res.error) return 'x-circle';
    if (!res.result?.Answer?.length) return 'alert-triangle';
    return 'check-circle';
  }

  function areResultsConsistent(): boolean {
    const resultsArray = diagnosticState.results as unknown[];
    if (!diagnosticState.results || resultsArray.length === 0) return false;

    type DnsResult = { error?: string; result?: { Answer?: Array<{ data: string }> } };
    const successfulResults = resultsArray.filter((r: unknown) => {
      const res = r as DnsResult;
      return !res.error && (res.result?.Answer?.length || 0) > 0;
    }) as DnsResult[];
    if (successfulResults.length === 0) return false;

    const firstAnswer = successfulResults[0].result!.Answer!.map((a) => a.data).sort();
    return successfulResults.every((r) => {
      const answers = r.result!.Answer!.map((a) => a.data).sort();
      return JSON.stringify(answers) === JSON.stringify(firstAnswer);
    });
  }

  async function copyAllResults() {
    const resultsArray = diagnosticState.results as unknown[];
    if (!resultsArray?.length) return;

    const query = lastQuery as { domain?: string; type?: string };
    let text = `DNS Propagation Check for ${query?.domain} (${query?.type})\n`;
    text += `Checked at: ${new Date().toISOString()}\n\n`;

    type PropagationResult = {
      resolver: string;
      error?: string;
      result?: { Answer?: Array<{ data: string; TTL?: number }> };
    };

    resultsArray.forEach((result: unknown) => {
      const res = result as PropagationResult;
      const info = resolverInfo[res.resolver as keyof typeof resolverInfo];
      text += `${info?.name || res.resolver} (${info?.ip || 'N/A'}):\n`;

      if (res.error) {
        text += `  Error: ${res.error}\n`;
      } else if (res.result?.Answer?.length) {
        res.result.Answer.forEach((answer) => {
          text += `  ${answer.data}${answer.TTL ? ` (TTL: ${answer.TTL}s)` : ''}\n`;
        });
      } else {
        text += `  No records found\n`;
      }
      text += '\n';
    });

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics/dns-propagation.title')}</h1>
    <p>
      {$t('diagnostics/dns-propagation.subtitle')}
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('diagnostics/dns-propagation.examples.title')}
    getLabel={(ex) => `${ex.domain} (${ex.type})`}
    getDescription={(ex) => $t(`diagnostics/dns-propagation.examples.items.${ex.description}.description`)}
    getTooltip={(ex) => $t(`diagnostics/dns-propagation.examples.items.${ex.description}.tooltip`)}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics/dns-propagation.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-row two-columns">
        <div class="form-group">
          <label for="domain" use:tooltip={$t('diagnostics/dns-propagation.form.domainTooltip')}>
            {$t('diagnostics/dns-propagation.form.domainLabel')}
            <input
              id="domain"
              type="text"
              bind:value={domainName}
              placeholder="example.com"
              onchange={() => {
                examples.clear();
                if (domainName) checkPropagation();
              }}
            />
          </label>
        </div>

        <div class="form-group">
          <label for="type" use:tooltip={$t('diagnostics/dns-propagation.form.recordTypeTooltip')}>
            {$t('diagnostics/dns-propagation.form.recordTypeLabel')}
            <select
              id="type"
              bind:value={recordType}
              onchange={() => {
                examples.clear();
                if (domainName) checkPropagation();
              }}
            >
              {#each recordTypes as type (type.value)}
                <option value={type.value} title={type.description}>{type.label}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>

      <div class="action-section">
        <ActionButton
          loading={diagnosticState.loading}
          disabled={!domainName.trim()}
          icon="globe"
          loadingText={$t('diagnostics/dns-propagation.form.checking')}
          onclick={checkPropagation}
          class="check-btn"
        >
          {$t('diagnostics/dns-propagation.form.checkButton')}
        </ActionButton>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <div>
          <h3>{$t('diagnostics/dns-propagation.results.title')}</h3>
          <div class="consistency-status">
            {#if areResultsConsistent()}
              <div class="status-success">
                <Icon name="check-circle" size="xs" />
                <span class="status-text">{$t('diagnostics/dns-propagation.results.fullyPropagated')}</span>
              </div>
            {:else}
              <div class="status-warning">
                <Icon name="alert-circle" size="xs" />
                <span class="status-text">{$t('diagnostics/dns-propagation.results.inconsistentResults')}</span>
              </div>
            {/if}
          </div>
        </div>
        <button class="copy-btn" onclick={copyAllResults} disabled={clipboard.isCopied()}>
          <div class={clipboard.isCopied() ? 'status-success' : ''}>
            <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          </div>
          {clipboard.isCopied()
            ? $t('diagnostics/dns-propagation.results.copied')
            : $t('diagnostics/dns-propagation.results.copyAll')}
        </button>
      </div>
      <div class="card-content">
        <div class="resolvers-grid">
          {#each diagnosticState.results as result, resultIndex (resultIndex)}
            {@const res = result as { resolver: string }}
            {@const info = resolverInfo[res.resolver as keyof typeof resolverInfo]}
            {@const status = getStatusColor(result)}
            {@const icon = getStatusIcon(result)}
            {@const resultData = result as {
              error?: string;
              result?: { Answer?: Array<{ data: string; TTL?: number }> };
            }}

            <div class="resolver-card card {status}">
              <div class="resolver-header">
                <div class="resolver-info">
                  <Icon name={icon} size="sm" />
                  <div>
                    <h4>{info?.name || res.resolver}</h4>
                    <p>{info?.ip || 'Custom'} • {info?.location || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              <div class="resolver-content">
                {#if resultData.error}
                  <div class="error-message">
                    <Icon name="alert-triangle" size="xs" />
                    <span>Error: {resultData.error}</span>
                  </div>
                {:else if resultData.result?.Answer?.length}
                  <div class="records">
                    {#each resultData.result.Answer as record, recordIndex (recordIndex)}
                      <div class="record">
                        <span class="record-data mono">{record.data}</span>
                        {#if record.TTL}
                          <span class="record-ttl" use:tooltip={$t('diagnostics/dns-propagation.results.ttlTooltip')}
                            >TTL: {record.TTL}s</span
                          >
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="no-records">
                    <Icon name="minus-circle" size="xs" />
                    <span>{$t('diagnostics/dns-propagation.results.noRecordsFound')}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        {#if lastQuery}
          {@const queryInfo = lastQuery as { domain: string; type: string }}
          <div class="query-info">
            <span>Last checked: {queryInfo.domain} ({queryInfo.type}) at {new Date().toLocaleString()}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <ErrorCard title={$t('diagnostics/dns-propagation.error.title')} error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/dns-propagation.education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/dns-propagation.education.whatIsPropagation.title')}</h4>
          <p>
            {$t('diagnostics/dns-propagation.education.whatIsPropagation.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-propagation.education.factors.title')}</h4>
          <ul>
            <li>{$t('diagnostics/dns-propagation.education.factors.ttl')}</li>
            <li>{$t('diagnostics/dns-propagation.education.factors.caching')}</li>
            <li>{$t('diagnostics/dns-propagation.education.factors.geography')}</li>
            <li>{$t('diagnostics/dns-propagation.education.factors.infrastructure')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-propagation.education.interpreting.title')}</h4>
          <div class="status-legend">
            <div class="legend-item">
              <div class="status-success">
                <Icon name="check-circle" size="xs" />
              </div>
              <span>{$t('diagnostics/dns-propagation.education.interpreting.fullyPropagated')}</span>
            </div>
            <div class="legend-item">
              <div class="status-warning">
                <Icon name="alert-circle" size="xs" />
              </div>
              <span>{$t('diagnostics/dns-propagation.education.interpreting.inconsistent')}</span>
            </div>
            <div class="legend-item">
              <div class="status-error">
                <Icon name="x-circle" size="xs" />
              </div>
              <span>{$t('diagnostics/dns-propagation.education.interpreting.error')}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-propagation.education.resolversTested.title')}</h4>
          <div class="resolvers-info">
            {#each Object.entries(resolverInfo) as [_key, info] (_key)}
              <div class="resolver-info-item">
                <strong>{info.name}</strong> ({info.ip})
                <span>{info.location}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  // Page-specific styles not covered by shared diagnostics-pages.scss

  .resolvers-grid {
    gap: var(--spacing-md);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    .resolver-card {
      width: 100%;
      padding: var(--spacing-sm);
    }
  }

  .form-group {
    label {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  .check-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      background: var(--color-primary-dark);
    }
  }

  .consistency-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  // Status color classes
  .status-success {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-success);
  }

  .status-warning {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-warning);
  }

  .status-error {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-error);
  }

  .status-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-primary);
  }

  .resolver-header {
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
  }

  .resolver-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      font-family: var(--font-mono);
    }
  }

  .resolver-content {
    padding: var(--spacing-sm) var(--spacing-md);
    .no-records {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      width: 100%;
      justify-content: center;
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
      color: var(--color-info);
    }
  }

  .records {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .record {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-sm);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .query-info {
    text-align: center;
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-color);
  }

  .legend-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .resolvers-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .resolver-info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
      font-family: var(--font-mono);
    }
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>
