<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { estimateEDNSSize, type DNSRecord, type EDNSEstimate } from '$lib/utils/dns-validation.js';
  import { useClipboard } from '$lib/composables';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'tools');
  });

  let queryName = $state('example.com');
  let queryType = $state('A');
  let includeQuery = $state(true);

  let records = $state<DNSRecord[]>([{ name: 'example.com', type: 'A', value: '192.0.2.1', ttl: 3600 }]);

  let results = $state<EDNSEstimate | null>(null);
  const clipboard = useClipboard();
  let activeExampleIndex = $state<number | null>(null);

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'SOA', 'CAA', 'DNSKEY', 'RRSIG'];

  const examples = $derived([
    {
      name: $t('tools.edns_size_estimator.examples.simple.name'),
      records: [{ name: 'example.com', type: 'A', value: '192.0.2.1', ttl: 3600 }],
      description: $t('tools.edns_size_estimator.examples.simple.description'),
    },
    {
      name: $t('tools.edns_size_estimator.examples.multiple.name'),
      records: [
        { name: 'example.com', type: 'A', value: '192.0.2.1', ttl: 3600 },
        { name: 'example.com', type: 'A', value: '192.0.2.2', ttl: 3600 },
        { name: 'example.com', type: 'A', value: '192.0.2.3', ttl: 3600 },
        { name: 'example.com', type: 'A', value: '192.0.2.4', ttl: 3600 },
      ],
      description: $t('tools.edns_size_estimator.examples.multiple.description'),
    },
    {
      name: $t('tools.edns_size_estimator.examples.txt.name'),
      records: [
        {
          name: 'example.com',
          type: 'TXT',
          value: 'v=spf1 include:_spf.google.com include:mailgun.org include:_spf.salesforce.com ~all',
          ttl: 3600,
        },
        {
          name: '_dmarc.example.com',
          type: 'TXT',
          value: 'v=DMARC1; p=reject; rua=mailto:dmarc@example.com; ruf=mailto:dmarc@example.com; pct=100',
          ttl: 3600,
        },
      ],
      description: $t('tools.edns_size_estimator.examples.txt.description'),
    },
    {
      name: $t('tools.edns_size_estimator.examples.mx.name'),
      records: [
        { name: 'example.com', type: 'MX', value: 'mail1.example.com.', priority: 10, ttl: 3600 },
        { name: 'example.com', type: 'MX', value: 'mail2.example.com.', priority: 20, ttl: 3600 },
        { name: 'example.com', type: 'MX', value: 'mail3.example.com.', priority: 30, ttl: 3600 },
      ],
      description: $t('tools.edns_size_estimator.examples.mx.description'),
    },
    {
      name: $t('tools.edns_size_estimator.examples.large.name'),
      records: Array.from({ length: 20 }, (_, i) => ({
        name: `server${i + 1}.example.com`,
        type: 'A' as const,
        value: `192.0.2.${i + 1}`,
        ttl: 3600,
      })),
      description: $t('tools.edns_size_estimator.examples.large.description'),
    },
  ]);

  function loadExample(example: (typeof examples)[0], index: number) {
    records = [...example.records];
    activeExampleIndex = index;
    estimateSize();
  }

  // Clear active example if records are manually modified
  function clearActiveIfChanged() {
    if (activeExampleIndex !== null) {
      const activeExample = examples[activeExampleIndex];
      if (!activeExample || !recordsMatch(records, activeExample.records)) {
        activeExampleIndex = null;
      }
    }
  }

  function recordsMatch(a: DNSRecord[], b: DNSRecord[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((record, index) => {
      const other = b[index];
      return (
        record.name === other.name &&
        record.type === other.type &&
        record.value === other.value &&
        record.ttl === other.ttl
      );
    });
  }

  function addRecord() {
    records.push({
      name: 'example.com',
      type: 'A',
      value: '192.0.2.1',
      ttl: 3600,
    });
    clearActiveIfChanged();
    estimateSize();
  }

  function removeRecord(index: number) {
    records.splice(index, 1);
    clearActiveIfChanged();
    estimateSize();
  }

  function updateRecord(index: number, field: keyof DNSRecord, value: string | number) {
    if (field === 'ttl' || field === 'priority' || field === 'weight' || field === 'port') {
      records[index][field] = Number(value);
    } else {
      records[index][field] = String(value);
    }
    clearActiveIfChanged();
    estimateSize();
  }

  function estimateSize() {
    if (records.length === 0 && !includeQuery) {
      results = null;
      return;
    }

    let recordsToEstimate = [...records];

    // Add query section if enabled
    if (includeQuery) {
      recordsToEstimate.unshift({
        name: queryName,
        type: queryType,
        value: '', // Query has no value
        ttl: 0,
      });
    }

    results = estimateEDNSSize(queryName, queryType, recordsToEstimate);
  }

  function _formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getRiskColor(risk: string): string {
    switch (risk) {
      case 'low':
        return 'var(--color-success)';
      case 'medium':
        return 'var(--color-warning)';
      case 'high':
        return 'var(--color-error)';
      default:
        return 'var(--text-secondary)';
    }
  }

  function getSizeColor(size: number): string {
    if (size <= 512) return 'var(--color-success)';
    if (size <= 1232) return 'var(--color-warning)';
    return 'var(--color-error)';
  }

  function hasRecommendations(): boolean {
    return !!(results && results.recommendations && results.recommendations.length > 0);
  }

  function handleInputChange() {
    estimateSize();
  }

  // Estimate on component load
  estimateSize();
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('tools.edns_size_estimator.title')}</h1>
    <p>{$t('tools.edns_size_estimator.subtitle')}</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="ruler" size="sm" />
        <div>
          <strong>{$t('tools.edns_size_estimator.overview.sizeEstimation.title')}</strong>
          {$t('tools.edns_size_estimator.overview.sizeEstimation.description')}
        </div>
      </div>
      <div class="overview-item">
        <Icon name="alert-triangle" size="sm" />
        <div>
          <strong>{$t('tools.edns_size_estimator.overview.fragmentationRisk.title')}</strong>
          {$t('tools.edns_size_estimator.overview.fragmentationRisk.description')}
        </div>
      </div>
      <div class="overview-item">
        <Icon name="settings" size="sm" />
        <div>
          <strong>{$t('tools.edns_size_estimator.overview.ednsRecommendations.title')}</strong>
          {$t('tools.edns_size_estimator.overview.ednsRecommendations.description')}
        </div>
      </div>
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>{$t('tools.edns_size_estimator.examples.title')}</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (index)}
          <button
            class="example-card {activeExampleIndex === index ? 'active' : ''}"
            onclick={() => loadExample(example, index)}
          >
            <div class="example-name">{example.name}</div>
            <div class="example-count">
              {$t('tools.edns_size_estimator.examples.recordCount', { count: example.records.length })}
            </div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Configuration -->
  <section class="config-section">
    <h3>{$t('tools.edns_size_estimator.config.title')}</h3>
    <div class="config-inner">
      <div class="query-toggle">
        <label class="checkbox-label" use:tooltip={$t('tools.edns_size_estimator.config.includeQuery.tooltip')}>
          <input type="checkbox" class="primary-checkbox" bind:checked={includeQuery} onchange={handleInputChange} />
          <span class="checkbox-text">{$t('tools.edns_size_estimator.config.includeQuery.label')}</span>
        </label>
      </div>

      {#if includeQuery}
        <div class="query-inputs">
          <div class="field-group">
            <label for="query-name" use:tooltip={$t('tools.edns_size_estimator.config.queryName.tooltip')}>
              <Icon name="globe" size="xs" />
              {$t('tools.edns_size_estimator.config.queryName.label')}
            </label>
            <input
              id="query-name"
              type="text"
              bind:value={queryName}
              oninput={handleInputChange}
              placeholder="example.com"
              class="query-input"
            />
          </div>
          <div class="field-group">
            <label for="query-type" use:tooltip={$t('tools.edns_size_estimator.config.queryType.tooltip')}>
              <Icon name="list" size="xs" />
              {$t('tools.edns_size_estimator.config.queryType.label')}
            </label>
            <select id="query-type" bind:value={queryType} onchange={handleInputChange} class="query-select">
              {#each recordTypes as type (type)}
                <option value={type}>{type}</option>
              {/each}
            </select>
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- Records Editor -->
  <div class="card records-card">
    <div class="records-header">
      <h3>{$t('tools.edns_size_estimator.records.title')}</h3>
      <button class="add-record-btn" onclick={addRecord}>
        <Icon name="plus" size="sm" />
        {$t('tools.edns_size_estimator.records.addRecord')}
      </button>
    </div>

    <div class="records-list">
      {#each records as record, index (index)}
        <div class="record-item">
          <div class="record-fields">
            <div class="field-group">
              <label for="name-{index}">{$t('tools.edns_size_estimator.records.fields.name')}</label>
              <input
                id="name-{index}"
                type="text"
                bind:value={record.name}
                oninput={() => updateRecord(index, 'name', record.name)}
                placeholder="example.com"
              />
            </div>
            <div class="field-group">
              <label for="type-{index}">{$t('tools.edns_size_estimator.records.fields.type')}</label>
              <select
                id="type-{index}"
                bind:value={record.type}
                onchange={() => updateRecord(index, 'type', record.type)}
              >
                {#each recordTypes as type (type)}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </div>
            <div class="field-group">
              <label for="value-{index}">{$t('tools.edns_size_estimator.records.fields.value')}</label>
              <input
                id="value-{index}"
                type="text"
                bind:value={record.value}
                oninput={() => updateRecord(index, 'value', record.value)}
                placeholder={$t('tools.edns_size_estimator.records.fields.valuePlaceholder')}
              />
            </div>
            {#if record.type === 'MX'}
              <div class="field-group">
                <label for="priority-{index}">{$t('tools.edns_size_estimator.records.fields.priority')}</label>
                <input
                  id="priority-{index}"
                  type="number"
                  bind:value={record.priority}
                  oninput={() => updateRecord(index, 'priority', record.priority || 0)}
                  min="0"
                  max="65535"
                />
              </div>
            {/if}
            <div class="field-group">
              <label for="ttl-{index}">{$t('tools.edns_size_estimator.records.fields.ttl')}</label>
              <input
                id="ttl-{index}"
                type="number"
                bind:value={record.ttl}
                oninput={() => updateRecord(index, 'ttl', record.ttl || 0)}
                min="0"
              />
            </div>
          </div>
          <button
            class="remove-record-btn"
            onclick={() => removeRecord(index)}
            use:tooltip={$t('tools.edns_size_estimator.records.removeTooltip')}
          >
            <Icon name="trash" size="sm" />
          </button>
        </div>
      {/each}

      {#if records.length === 0}
        <div class="empty-records">
          <p>{$t('tools.edns_size_estimator.records.empty')}</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <section class="results-section">
      <h3>{$t('tools.edns_size_estimator.results.title')}</h3>
      <div class="results-inner">
        <!-- Size Breakdown -->
        <div class="analysis-card">
          <div class="card-header-with-actions">
            <h4>
              <Icon name="ruler" size="sm" />
              {$t('tools.edns_size_estimator.results.sizeBreakdown.title')}
            </h4>
            <button
              class="copy-button {clipboard.isCopied() ? 'copied' : ''}"
              onclick={() =>
                clipboard.copy(
                  $t('tools.edns_size_estimator.results.copyText', {
                    totalSize: results?.totalSize || 0,
                    udpSafe: results?.udpSafe
                      ? $t('tools.edns_size_estimator.results.yes')
                      : $t('tools.edns_size_estimator.results.no'),
                    fragmentationRisk: results?.fragmentationRisk || $t('tools.edns_size_estimator.results.unknown'),
                  }),
                )}
            >
              <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
              {$t('tools.edns_size_estimator.results.copySummary')}
            </button>
          </div>

          <div class="size-breakdown">
            <div class="size-item">
              <div class="size-label">{$t('tools.edns_size_estimator.results.sizeBreakdown.dnsHeader')}</div>
              <div class="size-value">{results.baseSize} bytes</div>
            </div>
            <div class="size-item">
              <div class="size-label">{$t('tools.edns_size_estimator.results.sizeBreakdown.recordsData')}</div>
              <div class="size-value">{results.recordsSize} bytes</div>
            </div>
            <div class="size-item total">
              <div class="size-label">{$t('tools.edns_size_estimator.results.sizeBreakdown.totalSize')}</div>
              <div class="size-value" style="color: {getSizeColor(results.totalSize)}">{results.totalSize} bytes</div>
            </div>
          </div>

          <!-- UDP Safety -->
          <div class="udp-safety">
            <div class="safety-status {results.udpSafe ? 'safe' : 'unsafe'}">
              <Icon name={results.udpSafe ? 'check-circle' : 'alert-triangle'} size="sm" />
              <span>
                {results.udpSafe
                  ? $t('tools.edns_size_estimator.results.udpSafe')
                  : $t('tools.edns_size_estimator.results.requiresEdns')}
                ({results.totalSize} / 512 bytes)
              </span>
            </div>
          </div>
        </div>

        <!-- Fragmentation Analysis -->
        <div
          class="fragmentation-card"
          style="background-color: color-mix(in srgb, {getRiskColor(
            results.fragmentationRisk,
          )}, transparent 90%); border: 1px solid {getRiskColor(results.fragmentationRisk)};"
        >
          <h4 style="color: {getRiskColor(results.fragmentationRisk)};">
            <Icon name="alert-triangle" size="sm" />
            {$t('tools.edns_size_estimator.results.fragmentation.title')}
          </h4>
          <div class="fragmentation-risk">
            <div class="risk-indicator" style="color: {getRiskColor(results.fragmentationRisk)}">
              <span class="risk-level"
                >{$t(`tools.edns_size_estimator.results.fragmentation.riskLevels.${results.fragmentationRisk}`)}
                {$t('tools.edns_size_estimator.results.fragmentation.risk')}</span
              >
            </div>
            <div class="risk-details">
              <div class="size-thresholds">
                <div class="threshold-item {results.totalSize <= 512 ? 'passed' : 'failed'}">
                  <Icon name={results.totalSize <= 512 ? 'check' : 'x'} size="sm" />
                  {$t('tools.edns_size_estimator.results.fragmentation.thresholds.classic')}
                </div>
                <div class="threshold-item {results.totalSize <= 1232 ? 'passed' : 'failed'}">
                  <Icon name={results.totalSize <= 1232 ? 'check' : 'x'} size="sm" />
                  {$t('tools.edns_size_estimator.results.fragmentation.thresholds.safe')}
                </div>
                <div class="threshold-item {results.totalSize <= 4096 ? 'passed' : 'failed'}">
                  <Icon name={results.totalSize <= 4096 ? 'check' : 'x'} size="sm" />
                  {$t('tools.edns_size_estimator.results.fragmentation.thresholds.edns')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        {#if hasRecommendations() || results.totalSize > 1232 || !results.udpSafe}
          <div class="recommendations-card">
            <h4>
              <Icon name="lightbulb" size="sm" />
              {$t('tools.edns_size_estimator.results.recommendations.title')}
            </h4>
            <ul class="recommendations-list">
              {#each results.recommendations as recommendation (recommendation)}
                <li class="recommendation-item">{recommendation}</li>
              {/each}

              {#if results.totalSize > 4096}
                <li class="recommendation-item">{$t('tools.edns_size_estimator.results.recommendations.tcp')}</li>
              {/if}
              {#if results.totalSize > 1232}
                <li class="recommendation-item">{$t('tools.edns_size_estimator.results.recommendations.fragment')}</li>
              {/if}
              {#if !results.udpSafe}
                <li class="recommendation-item">{$t('tools.edns_size_estimator.results.recommendations.edns0')}</li>
              {/if}
            </ul>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>{$t('tools.edns_size_estimator.education.udpLimitations.title')}</h4>
        <p>
          {$t('tools.edns_size_estimator.education.udpLimitations.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools.edns_size_estimator.education.fragmentationIssues.title')}</h4>
        <p>
          {$t('tools.edns_size_estimator.education.fragmentationIssues.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools.edns_size_estimator.education.ednsBufferSizes.title')}</h4>
        <p>
          {$t('tools.edns_size_estimator.education.ednsBufferSizes.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools.edns_size_estimator.education.optimizationStrategies.title')}</h4>
        <p>
          {$t('tools.edns_size_estimator.education.optimizationStrategies.description')}
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .info-card {
    margin-bottom: var(--spacing-xl);
  }

  .overview-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .overview-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
    }
  }

  .examples-card {
    margin-bottom: var(--spacing-xl);
    padding: 0;
  }

  .examples-details {
    border: none;
    background: none;

    &[open] {
      .examples-summary :global(.icon) {
        transform: rotate(90deg);
      }
    }
  }

  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);
    border-radius: var(--radius-md);

    &:hover {
      background-color: var(--surface-hover);
    }

    &::-webkit-details-marker {
      display: none;
    }

    :global(.icon) {
      transition: transform var(--transition-fast);
    }

    h3 {
      margin: 0;
      font-size: var(--font-size-md);
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .example-card {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    &:hover {
      background-color: var(--surface-hover);
      transform: translateY(-1px);
    }
  }

  .example-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-count {
    font-family: var(--font-mono);
    color: var(--color-primary);
    font-size: var(--font-size-sm);
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .records-card {
    margin-bottom: var(--spacing-xl);
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    font-weight: 600;
    color: var(--text-primary);

    input[type='checkbox'] {
      margin: 0;
    }
  }

  .query-inputs {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    label {
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    input,
    select {
      padding: var(--spacing-sm);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-mono);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }
  }

  .records-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    h3 {
      margin: 0;
    }
  }

  .add-record-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background-color: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-weight: 600;

    &:hover {
      background-color: var(--color-primary-dark);
    }
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .record-item {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .record-fields {
    display: grid;
    grid-template-columns: 2fr 1fr 2fr auto 1fr;
    gap: var(--spacing-md);
    flex: 1;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .remove-record-btn {
    background: none;
    border: 1px solid var(--color-error);
    color: var(--color-error);
    cursor: pointer;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);

    &:hover {
      background-color: rgba(var(--color-error-rgb), 0.1);
    }
  }

  .empty-records {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 2px dashed var(--border-secondary);
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);

    &:hover {
      background-color: var(--surface-hover);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .size-breakdown {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-lg);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
  }

  .size-item {
    text-align: center;

    &.total {
      border-top: 2px solid var(--border-primary);
      padding-top: var(--spacing-md);

      .size-value {
        font-size: var(--font-size-xl);
        font-weight: 700;
        color: var(--color-primary);
      }
    }
  }

  .size-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .size-value {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .safety-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    font-weight: 600;

    &.safe {
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
      border: 1px solid color-mix(in srgb, var(--color-success), transparent 50%);
    }

    &.unsafe {
      background-color: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
      border: 1px solid color-mix(in srgb, var(--color-warning), transparent 50%);
    }
  }

  .fragmentation-risk {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    .risk-indicator {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-weight: 600;
    }
    .risk-level {
      font-size: var(--font-size-xs);
    }
    .size-thresholds {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .threshold-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      font-family: var(--font-mono);
      &.passed {
        background-color: rgba(var(--color-success-rgb), 0.1);
        color: var(--color-success);
      }
      &.failed {
        background-color: rgba(var(--color-error-rgb), 0.1);
        color: var(--color-error);
      }
    }
  }

  .recommendations-card {
    background-color: color-mix(in srgb, var(--color-info), transparent 90%) !important;
    border: 1px solid var(--color-info) !important;
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      color: var(--color-info) !important;
      font-size: var(--font-size-md);
    }

    .recommendations-list {
      list-style: none;
      padding: 0;
      margin: 0;

      .recommendation-item {
        margin-bottom: var(--spacing-xs);
        padding-left: var(--spacing-md);
        position: relative;

        &::before {
          content: '•';
          color: var(--color-info);
          position: absolute;
          left: 0;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .education-item {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);

    h4 {
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
      color: var(--color-primary);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  }

  // Configuration Section - tertiary background
  .config-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);

    h3 {
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .config-inner {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .query-toggle {
    margin-bottom: var(--spacing-md);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    user-select: none;
  }

  .primary-checkbox {
    appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-sm);
    background-color: var(--bg-primary);
    cursor: pointer;
    position: relative;
    transition: all var(--transition-fast);

    &:checked {
      background-color: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--bg-primary);
        font-size: 12px;
        font-weight: bold;
      }
    }

    &:hover {
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
    }
  }

  .checkbox-text {
    font-size: var(--font-size-md);
    color: var(--text-primary);
    font-weight: 500;
  }

  .query-inputs {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }

    .field-group {
      label {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-sm);
        font-weight: 600;
        color: var(--text-primary);
        font-size: var(--font-size-xs);
        text-transform: uppercase;
        cursor: help;
        opacity: 0.6;
      }
    }
  }

  .query-input,
  .query-select {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
    }
  }

  // Active example styling
  .example-card {
    &.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
    }
  }

  // Results Section - tertiary background
  .results-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);

    h3 {
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .results-inner {
    display: grid;
    gap: var(--spacing-md);
  }

  .analysis-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }

    .safety-status {
      &.safe {
        color: var(--color-success);
      }
      &.unsafe {
        color: var(--color-warning);
      }
    }
  }

  .card-header-with-actions {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0;
    }
  }

  .fragmentation-card {
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
    }

    .risk-indicator {
      .risk-level {
        font-weight: 600;
      }
    }

    .threshold-item {
      &.passed {
        color: var(--color-success);
        font-weight: 500;
      }
      &.failed {
        color: var(--color-error);
        font-weight: 500;
      }
    }
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .size-breakdown {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }

    .query-inputs {
      grid-template-columns: 1fr;
    }
  }
</style>
