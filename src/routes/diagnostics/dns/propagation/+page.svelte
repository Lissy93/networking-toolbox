<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ActionButton from '$lib/components/common/ActionButton.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let domainName = $state('example.com');
  let recordType = $state('A');
  let lastQuery = $state<{ domain: string; type: string } | null>(null);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const recordTypes = [
    { value: 'A', label: 'A', description: 'IPv4 address records' },
    { value: 'AAAA', label: 'AAAA', description: 'IPv6 address records' },
    { value: 'CNAME', label: 'CNAME', description: 'Canonical name records' },
    { value: 'MX', label: 'MX', description: 'Mail exchange records' },
    { value: 'TXT', label: 'TXT', description: 'Text records' },
    { value: 'NS', label: 'NS', description: 'Name server records' },
  ];

  const resolverInfo = {
    cloudflare: { name: 'Cloudflare', ip: '1.1.1.1', location: 'Global' },
    google: { name: 'Google', ip: '8.8.8.8', location: 'Global' },
    quad9: { name: 'Quad9', ip: '9.9.9.9', location: 'Global' },
    opendns: { name: 'OpenDNS', ip: '208.67.222.222', location: 'Global' },
  };

  const examplesList = [
    { domain: 'google.com', type: 'A', description: 'Check A record propagation' },
    { domain: 'github.com', type: 'AAAA', description: 'IPv6 propagation check' },
    { domain: 'gmail.com', type: 'MX', description: 'Mail server propagation' },
    { domain: '_dmarc.google.com', type: 'TXT', description: 'DMARC policy propagation' },
  ];

  const examples = useExamples(examplesList);

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
      diagnosticState.setError(err instanceof Error ? err.message : 'Unknown error occurred');
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
    <h1>DNS Propagation Checker</h1>
    <p>
      Check DNS record propagation across multiple public DNS resolvers. Compare responses from Cloudflare, Google,
      Quad9, and OpenDNS to verify consistent DNS propagation worldwide.
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Propagation Examples"
    getLabel={(ex) => `${ex.domain} (${ex.type})`}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Check ${ex.type} record propagation for ${ex.domain}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Propagation Check Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-row two-columns">
        <div class="form-group">
          <label for="domain" use:tooltip={'Enter the domain name to check propagation for'}>
            Domain Name
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
          <label for="type" use:tooltip={'Select the DNS record type to check'}>
            Record Type
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
          loadingText="Checking Propagation..."
          onclick={checkPropagation}
          class="check-btn"
        >
          Check DNS Propagation
        </ActionButton>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <div>
          <h3>Propagation Results</h3>
          <div class="consistency-status">
            {#if areResultsConsistent()}
              <div class="status-success">
                <Icon name="check-circle" size="xs" />
                <span class="status-text">Fully Propagated</span>
              </div>
            {:else}
              <div class="status-warning">
                <Icon name="alert-circle" size="xs" />
                <span class="status-text">Inconsistent Results</span>
              </div>
            {/if}
          </div>
        </div>
        <button class="copy-btn" onclick={copyAllResults} disabled={clipboard.isCopied()}>
          <div class={clipboard.isCopied() ? 'status-success' : ''}>
            <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          </div>
          {clipboard.isCopied() ? 'Copied!' : 'Copy All Results'}
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
                          <span class="record-ttl" use:tooltip={'Time To Live'}>TTL: {record.TTL}s</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="no-records">
                    <Icon name="minus-circle" size="xs" />
                    <span>No records found</span>
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

  <ErrorCard title="Propagation Check Failed" error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding DNS Propagation</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>What is DNS Propagation?</h4>
          <p>
            DNS propagation refers to the time it takes for DNS changes to spread across the internet. Different
            resolvers may cache records for different periods, leading to temporary inconsistencies.
          </p>
        </div>

        <div class="info-section">
          <h4>Factors Affecting Propagation</h4>
          <ul>
            <li><strong>TTL Values:</strong> Lower TTL means faster propagation</li>
            <li><strong>Resolver Caching:</strong> Each resolver has its own cache policies</li>
            <li><strong>Geographic Location:</strong> Physical distance affects update speed</li>
            <li><strong>DNS Infrastructure:</strong> Authoritative server response time</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Interpreting Results</h4>
          <div class="status-legend">
            <div class="legend-item">
              <div class="status-success">
                <Icon name="check-circle" size="xs" />
              </div>
              <span><strong>Fully Propagated:</strong> All resolvers return identical results</span>
            </div>
            <div class="legend-item">
              <div class="status-warning">
                <Icon name="alert-circle" size="xs" />
              </div>
              <span><strong>Inconsistent:</strong> Different resolvers return different results</span>
            </div>
            <div class="legend-item">
              <div class="status-error">
                <Icon name="x-circle" size="xs" />
              </div>
              <span><strong>Error:</strong> Resolver failed to respond or returned an error</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>DNS Resolvers Tested</h4>
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

    strong {
      color: var(--text-primary);
    }
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
