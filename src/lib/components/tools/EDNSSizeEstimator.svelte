<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { estimateEDNSSize, type DNSRecord, type EDNSEstimate } from '$lib/utils/dns-validation.js';
  import { useClipboard } from '$lib/composables';

  let queryName = $state('example.com');
  let queryType = $state('A');
  let includeQuery = $state(true);

  let records = $state<DNSRecord[]>([{ name: 'example.com', type: 'A', value: '192.0.2.1', ttl: 3600 }]);

  let results = $state<EDNSEstimate | null>(null);
  const clipboard = useClipboard();
  let activeExampleIndex = $state<number | null>(null);

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'SOA', 'CAA', 'DNSKEY', 'RRSIG'];

  const examples = [
    {
      name: 'Simple A Record',
      records: [{ name: 'example.com', type: 'A', value: '192.0.2.1', ttl: 3600 }],
      description: 'Basic single A record response',
    },
    {
      name: 'Multiple A Records',
      records: [
        { name: 'example.com', type: 'A', value: '192.0.2.1', ttl: 3600 },
        { name: 'example.com', type: 'A', value: '192.0.2.2', ttl: 3600 },
        { name: 'example.com', type: 'A', value: '192.0.2.3', ttl: 3600 },
        { name: 'example.com', type: 'A', value: '192.0.2.4', ttl: 3600 },
      ],
      description: 'Load-balanced web servers',
    },
    {
      name: 'Long TXT Records',
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
      description: 'SPF and DMARC policies',
    },
    {
      name: 'MX Records',
      records: [
        { name: 'example.com', type: 'MX', value: 'mail1.example.com.', priority: 10, ttl: 3600 },
        { name: 'example.com', type: 'MX', value: 'mail2.example.com.', priority: 20, ttl: 3600 },
        { name: 'example.com', type: 'MX', value: 'mail3.example.com.', priority: 30, ttl: 3600 },
      ],
      description: 'Mail server configuration',
    },
    {
      name: 'Large Response',
      records: Array.from({ length: 20 }, (_, i) => ({
        name: `server${i + 1}.example.com`,
        type: 'A' as const,
        value: `192.0.2.${i + 1}`,
        ttl: 3600,
      })),
      description: 'Many A records causing fragmentation risk',
    },
  ];

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
    <h1>EDNS Size Estimator</h1>
    <p>Estimate DNS message size and UDP fragmentation risk with EDNS buffer recommendations</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="ruler" size="sm" />
        <div>
          <strong>Size Estimation:</strong> Calculate total DNS message size including headers and record data.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="alert-triangle" size="sm" />
        <div>
          <strong>Fragmentation Risk:</strong> Assess likelihood of UDP packet fragmentation and delivery issues.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="settings" size="sm" />
        <div>
          <strong>EDNS Recommendations:</strong> Get buffer size recommendations for optimal DNS performance.
        </div>
      </div>
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Response Examples</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (index)}
          <button
            class="example-card {activeExampleIndex === index ? 'active' : ''}"
            onclick={() => loadExample(example, index)}
          >
            <div class="example-name">{example.name}</div>
            <div class="example-count">{example.records.length} record{example.records.length !== 1 ? 's' : ''}</div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Configuration -->
  <section class="config-section">
    <h3>Query Configuration</h3>
    <div class="config-inner">
      <div class="query-toggle">
        <label
          class="checkbox-label"
          use:tooltip={'Include the DNS query section in size calculations. Queries add ~20-50 bytes depending on name length.'}
        >
          <input type="checkbox" class="primary-checkbox" bind:checked={includeQuery} onchange={handleInputChange} />
          <span class="checkbox-text">Include query section in estimate</span>
        </label>
      </div>

      {#if includeQuery}
        <div class="query-inputs">
          <div class="field-group">
            <label
              for="query-name"
              use:tooltip={'The domain name being queried. Longer names result in larger message sizes.'}
            >
              <Icon name="globe" size="xs" />
              Query Name
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
            <label for="query-type" use:tooltip={'The type of DNS record being requested (A, AAAA, MX, etc.).'}>
              <Icon name="list" size="xs" />
              Query Type
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
      <h3>Response Records</h3>
      <button class="add-record-btn" onclick={addRecord}>
        <Icon name="plus" size="sm" />
        Add Record
      </button>
    </div>

    <div class="records-list">
      {#each records as record, index (index)}
        <div class="record-item">
          <div class="record-fields">
            <div class="field-group">
              <label for="name-{index}">Name</label>
              <input
                id="name-{index}"
                type="text"
                bind:value={record.name}
                oninput={() => updateRecord(index, 'name', record.name)}
                placeholder="example.com"
              />
            </div>
            <div class="field-group">
              <label for="type-{index}">Type</label>
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
              <label for="value-{index}">Value</label>
              <input
                id="value-{index}"
                type="text"
                bind:value={record.value}
                oninput={() => updateRecord(index, 'value', record.value)}
                placeholder="Record value"
              />
            </div>
            {#if record.type === 'MX'}
              <div class="field-group">
                <label for="priority-{index}">Priority</label>
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
              <label for="ttl-{index}">TTL</label>
              <input
                id="ttl-{index}"
                type="number"
                bind:value={record.ttl}
                oninput={() => updateRecord(index, 'ttl', record.ttl || 0)}
                min="0"
              />
            </div>
          </div>
          <button class="remove-record-btn" onclick={() => removeRecord(index)} use:tooltip={'Remove this record'}>
            <Icon name="trash" size="sm" />
          </button>
        </div>
      {/each}

      {#if records.length === 0}
        <div class="empty-records">
          <p>No records added. Click "Add Record" to start building your DNS response.</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <section class="results-section">
      <h3>Size Analysis</h3>
      <div class="results-inner">
        <!-- Size Breakdown -->
        <div class="analysis-card">
          <div class="card-header-with-actions">
            <h4>
              <Icon name="ruler" size="sm" />
              Size Breakdown
            </h4>
            <button
              class="copy-button {clipboard.isCopied() ? 'copied' : ''}"
              onclick={() =>
                clipboard.copy(`DNS Message Size Estimate:
Total Size: ${results?.totalSize || 0} bytes
UDP Safe: ${results?.udpSafe ? 'Yes' : 'No'}
Fragmentation Risk: ${results?.fragmentationRisk || 'unknown'}`)}
            >
              <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
              Copy Summary
            </button>
          </div>

          <div class="size-breakdown">
            <div class="size-item">
              <div class="size-label">DNS Header</div>
              <div class="size-value">{results.baseSize} bytes</div>
            </div>
            <div class="size-item">
              <div class="size-label">Records Data</div>
              <div class="size-value">{results.recordsSize} bytes</div>
            </div>
            <div class="size-item total">
              <div class="size-label">Total Size</div>
              <div class="size-value" style="color: {getSizeColor(results.totalSize)}">{results.totalSize} bytes</div>
            </div>
          </div>

          <!-- UDP Safety -->
          <div class="udp-safety">
            <div class="safety-status {results.udpSafe ? 'safe' : 'unsafe'}">
              <Icon name={results.udpSafe ? 'check-circle' : 'alert-triangle'} size="sm" />
              <span>
                {results.udpSafe ? 'UDP Safe' : 'Requires EDNS0'}
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
            Fragmentation Analysis
          </h4>
          <div class="fragmentation-risk">
            <div class="risk-indicator" style="color: {getRiskColor(results.fragmentationRisk)}">
              <span class="risk-level">{results.fragmentationRisk.toUpperCase()} RISK</span>
            </div>
            <div class="risk-details">
              <div class="size-thresholds">
                <div class="threshold-item {results.totalSize <= 512 ? 'passed' : 'failed'}">
                  <Icon name={results.totalSize <= 512 ? 'check' : 'x'} size="sm" />
                  ≤ 512 bytes (Classic DNS)
                </div>
                <div class="threshold-item {results.totalSize <= 1232 ? 'passed' : 'failed'}">
                  <Icon name={results.totalSize <= 1232 ? 'check' : 'x'} size="sm" />
                  ≤ 1232 bytes (Safe for most networks)
                </div>
                <div class="threshold-item {results.totalSize <= 4096 ? 'passed' : 'failed'}">
                  <Icon name={results.totalSize <= 4096 ? 'check' : 'x'} size="sm" />
                  ≤ 4096 bytes (Common EDNS buffer)
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
              Recommendations
            </h4>
            <ul class="recommendations-list">
              {#each results.recommendations as recommendation (recommendation)}
                <li class="recommendation-item">{recommendation}</li>
              {/each}

              {#if results.totalSize > 4096}
                <li class="recommendation-item">Consider using TCP for queries expecting large responses</li>
              {/if}
              {#if results.totalSize > 1232}
                <li class="recommendation-item">Some networks may fragment packets - monitor delivery success</li>
              {/if}
              {#if !results.udpSafe}
                <li class="recommendation-item">EDNS0 support required - advertise appropriate buffer size</li>
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
        <h4>UDP Limitations</h4>
        <p>
          Classic DNS over UDP is limited to 512 bytes. Larger responses require EDNS0 extension to advertise bigger
          buffer sizes. Without EDNS0, servers must truncate responses.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Fragmentation Issues</h4>
        <p>
          UDP packets larger than ~1232 bytes may be fragmented by network devices. Fragmented packets are more likely
          to be dropped, causing DNS resolution failures.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>EDNS Buffer Sizes</h4>
        <p>
          Common EDNS buffer sizes are 1232, 4096, and 8192 bytes. Larger buffers allow bigger responses but increase
          fragmentation risk. Choose based on your network environment.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Optimization Strategies</h4>
        <p>
          Minimize record sizes with shorter names and values. Use separate queries for large responses. Consider TCP
          for consistently large responses like DNSSEC-signed zones.
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
