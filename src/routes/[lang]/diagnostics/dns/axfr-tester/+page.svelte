<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import Icon from '$lib/components/global/Icon.svelte';
  import { isValidDomainName, formatDNSError } from '$lib/utils/dns-validation.js';
  import { axfrContent } from '$lib/content/axfr.js';
  import '../../../../../styles/diagnostics-pages.scss';

  type NameserverResult = {
    nameserver: string;
    ip: string;
    vulnerable: boolean;
    recordCount?: number;
    records?: string[];
    error?: string;
    responseTime: number;
  };

  type AXFRResponse = {
    domain: string;
    nameservers: NameserverResult[];
    summary: {
      total: number;
      vulnerable: number;
      secure: number;
      errors: number;
    };
    timestamp: string;
    limitedMode?: boolean;
    limitedModeReason?: string;
  };

  let domain = $state('example.com');
  let loading = $state(false);
  let results = $state<AXFRResponse | null>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);
  let expandedRecords = new SvelteSet<string>();

  const isInputValid = $derived(() => {
    const trimmed = domain.trim();
    return trimmed.length > 0 && isValidDomainName(trimmed);
  });

  const examples = [
    { domain: 'bbc.co.uk', description: '' },
    { domain: 'zonetransfer.me', description: '' },
    { domain: 'networkingtoolbox.net', description: '' },
    { domain: 'amazon.com', description: '' },
    { domain: 'wikipedia.org', description: '' },
    { domain: 'github.com', description: '' },
    { domain: 'gov.uk', description: '' },
    { domain: 'proton.me', description: '' },
    { domain: 'loveholidays.com', description: '' },
  ];

  async function testAXFR() {
    loading = true;
    error = null;
    results = null;

    const trimmed = domain.trim();
    if (!trimmed) {
      error = 'Domain name is required';
      loading = false;
      return;
    }

    if (!isValidDomainName(trimmed)) {
      error = 'Invalid domain name format';
      loading = false;
      return;
    }

    try {
      const response = await fetch('/api/internal/diagnostics/axfr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: trimmed }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `AXFR test failed (${response.status})`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = formatDNSError(err);
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    testAXFR();
  }

  function toggleRecords(nameserver: string) {
    if (expandedRecords.has(nameserver)) {
      expandedRecords.delete(nameserver);
    } else {
      expandedRecords.add(nameserver);
    }
  }

  function getStatusColor(ns: NameserverResult): string {
    if (ns.vulnerable) return 'error';
    if (ns.error) return 'warning';
    return 'success';
  }

  function getStatusIcon(ns: NameserverResult): string {
    if (ns.vulnerable) return 'alert-circle';
    if (ns.error) return 'alert-triangle';
    return 'shield-check';
  }

  function getStatusText(ns: NameserverResult): string {
    if (ns.vulnerable) return 'Vulnerable';
    if (ns.error) return 'Error';
    return 'Secure';
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DNS Zone Transfer (AXFR) Security Tester</h1>
    <p>Test if zone transfers are improperly exposed - a critical DNS security vulnerability</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            disabled={loading}
          >
            <span class="example-domain">{example.domain}</span>
            <span class="example-description">{example.description}</span>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <form
    class="inline-form"
    onsubmit={(e) => {
      e.preventDefault();
      testAXFR();
    }}
  >
    <div class="form-group flex-grow">
      <label for="domain">Domain Name</label>
      <input
        id="domain"
        type="text"
        bind:value={domain}
        placeholder="example.com"
        disabled={loading}
        oninput={() => {
          selectedExampleIndex = null;
        }}
        aria-invalid={!isInputValid}
      />
    </div>

    <button type="submit" class="submit-btn" disabled={loading || !isInputValid}>
      {#if loading}
        <Icon name="loader" size="sm" />
        Testing...
      {:else}
        <Icon name="search" size="sm" />
        Test AXFR
      {/if}
    </button>
  </form>

  <!-- Error Display -->
  {#if error}
    <div class="alert alert-error" role="alert">
      <Icon name="alert-circle" size="sm" />
      <div>
        <strong>Error</strong>
        <p>{error}</p>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if results}
    <!-- Limited Mode Warning -->
    {#if results.limitedMode}
      <div class="alert alert-warning" role="alert">
        <Icon name="alert-triangle" size="md" />
        <div>
          <strong>Limited Testing Mode</strong>
          <p>{results.limitedModeReason}</p>
        </div>
      </div>
    {/if}

    <!-- Security Warning if Vulnerable -->
    {#if results.summary.vulnerable > 0}
      <div class="alert alert-error" role="alert">
        <Icon name="alert-circle" size="md" />
        <div>
          <strong>Critical Security Vulnerability Detected!</strong>
          <p>
            {results.summary.vulnerable} nameserver{results.summary.vulnerable > 1 ? 's' : ''} allowed unrestricted zone
            transfer. Your entire DNS zone is exposed to anyone.
            <strong>Immediate action required!</strong>
          </p>
        </div>
      </div>
    {:else if results.summary.secure > 0}
      <div class="alert alert-success">
        <Icon name="shield-check" size="md" />
        <div>
          <strong>All Nameservers Secure</strong>
          <p>Zone transfers are properly restricted. No AXFR vulnerabilities detected.</p>
        </div>
      </div>
    {/if}

    <!-- Summary Stats -->
    <div class="stats-summary">
      <div class="stat-card">
        <Icon name="server" size="md" />
        <div class="stat-content">
          <span class="stat-label">Total Nameservers</span>
          <span class="stat-value">{results.summary.total}</span>
        </div>
      </div>

      <div class="stat-card stat-error">
        <Icon name="alert-circle" size="md" />
        <div class="stat-content">
          <span class="stat-label">Vulnerable</span>
          <span class="stat-value">{results.summary.vulnerable}</span>
        </div>
      </div>

      <div class="stat-card stat-success">
        <Icon name="shield-check" size="md" />
        <div class="stat-content">
          <span class="stat-label">Secure</span>
          <span class="stat-value">{results.summary.secure}</span>
        </div>
      </div>

      <div class="stat-card stat-warning">
        <Icon name="alert-triangle" size="md" />
        <div class="stat-content">
          <span class="stat-label">Errors</span>
          <span class="stat-value">{results.summary.errors}</span>
        </div>
      </div>
    </div>

    <!-- Nameserver Results -->
    <div class="results-section">
      <h3>Nameserver Test Results</h3>

      <div class="nameserver-results">
        {#each results.nameservers as ns (ns.nameserver)}
          <div class="nameserver-card status-{getStatusColor(ns)}">
            <div class="nameserver-header">
              <div class="nameserver-info">
                <Icon name={getStatusIcon(ns)} size="md" />
                <div>
                  <h4>{ns.nameserver}</h4>
                  <span class="nameserver-ip">{ns.ip}</span>
                </div>
              </div>
              <div class="nameserver-status">
                <span class="response-time">{ns.responseTime}ms</span>
                <span class="status-badge status-{getStatusColor(ns)}">
                  {getStatusText(ns)}
                </span>
              </div>
            </div>

            {#if ns.vulnerable && ns.recordCount}
              <div class="vulnerability-details">
                <div class="vulnerability-warning">
                  <Icon name="alert-circle" size="sm" />
                  <strong>Zone transfer succeeded!</strong> Exposed {ns.recordCount} DNS records
                </div>

                {#if ns.records && ns.records.length > 0}
                  <button
                    class="toggle-records-btn"
                    class:expanded={expandedRecords.has(ns.nameserver)}
                    onclick={() => toggleRecords(ns.nameserver)}
                  >
                    <Icon name="chevron-right" size="xs" />
                    {expandedRecords.has(ns.nameserver) ? 'Hide' : 'Show'} exposed records ({ns.records.length} of {ns.recordCount})
                  </button>

                  {#if expandedRecords.has(ns.nameserver)}
                    <div class="exposed-records">
                      <pre>{ns.records.join('\n')}</pre>
                      {#if ns.recordCount > ns.records.length}
                        <p class="truncated-note">
                          Showing first {ns.records.length} of {ns.recordCount} total records
                        </p>
                      {/if}
                    </div>
                  {/if}
                {/if}
              </div>
            {:else if ns.error}
              <div class="error-details">
                <Icon name="info-circle" size="xs" />
                <span>{ns.error}</span>
              </div>
            {:else}
              <div class="secure-details">
                <Icon name="check-circle" size="xs" />
                <span>Zone transfer properly refused</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Test Metadata -->
    <div class="test-metadata">
      <p>
        <strong>Domain:</strong>
        {results.domain} •
        <strong>Tested:</strong>
        {new Date(results.timestamp).toLocaleString()}
      </p>
    </div>
  {/if}
</div>

<!-- Educational Content -->
<section class="card educational-part">
  <div class="card info-card">
    <h2>{axfrContent.sections.whatIsAXFR.title}</h2>
    <p>{axfrContent.sections.whatIsAXFR.content}</p>
  </div>

  <div class="card info-card">
    <h2>{axfrContent.sections.security.title}</h2>
    <div class="risks-grid">
      {#each axfrContent.sections.security.risks as risk (risk.risk)}
        <div class="risk-card severity-{risk.severity.toLowerCase()}">
          <div class="risk-header">
            <h4>{risk.risk}</h4>
            <span class="severity-badge severity-{risk.severity.toLowerCase()}">{risk.severity}</span>
          </div>
          <p class="risk-description">{risk.description}</p>
          <div class="risk-impact">
            <Icon name="info-circle" size="xs" />
            <em>{risk.impact}</em>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="card info-card">
    <h2>{axfrContent.sections.interpretation.title}</h2>
    <div class="statuses-list">
      {#each axfrContent.sections.interpretation.statuses as status (status.status)}
        <div class="status-explanation status-{status.color}">
          <div class="status-header">
            <Icon
              name={status.status === 'Vulnerable'
                ? 'alert-circle'
                : status.status === 'Secure'
                  ? 'shield-check'
                  : 'alert-triangle'}
              size="sm"
            />
            <h4>{status.status}: {status.meaning}</h4>
          </div>
          <p>{status.description}</p>
          <div class="status-action">
            <Icon name="arrow-right" size="xs" />
            <strong>Action:</strong>
            {status.action}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="card info-card">
    <h2>{axfrContent.sections.properConfiguration.title}</h2>
    {#each axfrContent.sections.properConfiguration.configurations as config (config.server)}
      <div class="config-section">
        <h4>{config.server}</h4>
        <p>{config.description}</p>
        <pre><code>{config.syntax}</code></pre>
      </div>
    {/each}
  </div>

  <div class="card info-card">
    <h2>{axfrContent.sections.remediation.title}</h2>
    <div class="remediation-steps">
      {#each axfrContent.sections.remediation.steps as step, i (step.step)}
        <div class="remediation-step">
          <div class="step-number">{i + 1}</div>
          <div class="step-content">
            <h4>{step.step}</h4>
            <p>{step.details}</p>
            {#if step.command}
              <pre><code>{step.command}</code></pre>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="card info-card">
    <h2>{axfrContent.sections.bestPractices.title}</h2>
    <div class="practices-list">
      {#each axfrContent.sections.bestPractices.practices as practice (practice.practice)}
        <div class="practice-item priority-{practice.priority.toLowerCase()}">
          <div class="practice-header">
            <Icon name="check-circle" size="sm" />
            <h4>{practice.practice}</h4>
            <span class="priority-badge priority-{practice.priority.toLowerCase()}">{practice.priority}</span>
          </div>
          <p>{practice.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<style lang="scss">
  .inline-form {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-end;
    flex-wrap: wrap;

    .form-group.flex-grow {
      flex: 1;
      min-width: 250px;
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      margin: 0;

      label {
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--text-secondary);
      }

      input {
        padding: var(--spacing-sm);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-primary);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: var(--font-size-md);

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &[aria-invalid='true'] {
          border-color: var(--color-error);
        }
      }
    }

    .submit-btn {
      white-space: nowrap;
      display: flex;
      gap: var(--spacing-sm);
    }
  }

  .alert {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border-left: 4px solid;
    margin: var(--spacing-lg) 0;

    :global(.icon) {
      flex-shrink: 0;
      margin-top: 2px;
    }

    div {
      flex: 1;
      min-width: 0;
    }

    strong {
      display: block;
      font-size: var(--font-size-md);
      margin-bottom: var(--spacing-xs);
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      line-height: 1.5;
    }

    &.alert-error {
      background: color-mix(in srgb, var(--color-error) 10%, var(--bg-primary));
      border-left-color: var(--color-error);
      color: var(--color-error);

      :global(.icon) {
        color: var(--color-error);
      }

      strong {
        color: var(--color-error);
      }

      p {
        color: var(--text-primary);
      }
    }

    &.alert-success {
      background: color-mix(in srgb, var(--color-success) 10%, var(--bg-primary));
      border-left-color: var(--color-success);
      color: var(--color-success);

      :global(.icon) {
        color: var(--color-success);
      }

      strong {
        color: var(--color-success);
      }

      p {
        color: var(--text-primary);
      }
    }

    &.alert-warning {
      background: color-mix(in srgb, var(--color-warning) 10%, var(--bg-primary));
      border-left-color: var(--color-warning);
      color: var(--color-warning);

      :global(.icon) {
        color: var(--color-warning);
      }

      strong {
        color: var(--color-warning);
      }

      p {
        color: var(--text-primary);
      }
    }
  }

  .stats-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
    margin: var(--spacing-lg) 0;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);

    :global(.icon) {
      color: var(--color-primary);
    }

    &.stat-error :global(.icon) {
      color: var(--color-error);
    }

    &.stat-success :global(.icon) {
      color: var(--color-success);
    }

    &.stat-warning :global(.icon) {
      color: var(--color-warning);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2xs);

      .stat-label {
        font-size: var(--font-size-xs);
        color: var(--text-tertiary);
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .stat-value {
        font-size: var(--font-size-xl);
        font-weight: 700;
        color: var(--text-primary);
      }
    }
  }

  .nameserver-results {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .nameserver-card {
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    &.status-error {
      .nameserver-info :global(.icon) {
        color: var(--color-error);
      }
      // background: color-mix(in srgb, var(--color-error) 6%, var(--bg-secondary));
    }

    &.status-success {
      .nameserver-info :global(.icon) {
        color: var(--color-success);
      }
      // background: color-mix(in srgb, var(--color-success) 6%, var(--bg-secondary));
    }

    &.status-warning {
      .nameserver-info :global(.icon) {
        color: var(--color-warning);
      }
      // background: color-mix(in srgb, var(--color-warning) 6%, var(--bg-secondary));
    }

    .nameserver-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);
      flex-wrap: wrap;

      .nameserver-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);

        :global(.icon) {
          flex-shrink: 0;
        }

        h4 {
          margin: 0;
          font-size: var(--font-size-md);
          color: var(--text-primary);
          font-family: monospace;
        }

        .nameserver-ip {
          font-size: var(--font-size-sm);
          color: var(--text-tertiary);
          font-family: monospace;
        }
      }

      .nameserver-status {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);

        .status-badge {
          padding: var(--spacing-2xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;

          &.status-error {
            background: var(--color-error);
            color: var(--bg-primary);
          }

          &.status-success {
            background: var(--color-success);
            color: var(--bg-primary);
          }

          &.status-warning {
            background: var(--color-warning);
            color: var(--bg-primary);
          }
        }

        .response-time {
          font-size: var(--font-size-xs);
          color: var(--text-tertiary);
          font-family: monospace;
        }
      }
    }

    .vulnerability-details {
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--border-primary);

      .vulnerability-warning {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm);
        background: color-mix(in srgb, var(--color-error) 10%, transparent);
        border-radius: var(--radius-sm);
        color: var(--color-error);
        font-size: var(--font-size-sm);

        :global(.icon) {
          color: var(--color-error);
        }
      }

      .toggle-records-btn {
        margin-top: var(--spacing-sm);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--bg-primary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        cursor: pointer;
        transition: all 0.2s;

        &.expanded :global(.icon) {
          transform: rotate(90deg);
        }

        &:hover {
          background: var(--bg-secondary);
          border-color: var(--color-primary);
        }
      }

      .exposed-records {
        margin-top: var(--spacing-sm);
        background: var(--bg-primary);
        border-radius: var(--radius-sm);
        overflow: hidden;

        pre {
          margin: 0;
          padding: var(--spacing-sm);
          overflow-x: auto;
          font-size: var(--font-size-xs);
          line-height: 1.4;
          font-family: monospace;
          color: var(--text-secondary);
        }

        .truncated-note {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-secondary);
          font-size: var(--font-size-xs);
          color: var(--text-tertiary);
          margin: 0;
          border-top: 1px solid var(--border-primary);
        }
      }
    }

    .error-details,
    .secure-details {
      margin-top: var(--spacing-sm);
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  .test-metadata {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-primary);
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);

    p {
      margin: 0;
    }

    strong {
      color: var(--text-secondary);
    }
  }

  .risks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: var(--spacing-md);
  }

  .risk-card {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--border-primary);

    &.severity-high {
      border-left-color: var(--color-error);
    }

    &.severity-medium {
      border-left-color: var(--color-warning);
    }

    .risk-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);

      h4 {
        margin: 0;
        font-size: var(--font-size-md);
        color: var(--text-primary);
      }

      .severity-badge {
        padding: var(--spacing-2xs) var(--spacing-xs);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: 600;
        text-transform: uppercase;

        &.severity-high {
          background: var(--color-error);
          color: var(--bg-primary);
        }

        &.severity-medium {
          background: var(--color-warning);
          color: var(--bg-primary);
        }
      }
    }

    .risk-description {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0 0 var(--spacing-sm) 0;
    }

    .risk-impact {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--text-tertiary);

      :global(.icon) {
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }

  .statuses-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .status-explanation {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--border-primary);

    &.status-error {
      border-left-color: var(--color-error);
    }

    &.status-success {
      border-left-color: var(--color-success);
    }

    &.status-warning {
      border-left-color: var(--color-warning);
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);

      h4 {
        margin: 0;
        font-size: var(--font-size-md);
        color: var(--text-primary);
      }
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0 0 var(--spacing-sm) 0;
    }

    .status-action {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);

      :global(.icon) {
        flex-shrink: 0;
      }

      strong {
        color: var(--text-secondary);
      }
    }
  }

  .config-section {
    margin-bottom: var(--spacing-lg);

    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: var(--font-size-md);
      color: var(--text-primary);
    }

    p {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    pre {
      margin: 0;
      padding: var(--spacing-md);
      background: var(--bg-primary);
      border-radius: var(--radius-sm);
      overflow-x: auto;
      border: 1px solid var(--border-primary);

      code {
        font-family: monospace;
        font-size: var(--font-size-sm);
        line-height: 1.6;
        color: var(--text-secondary);
        background: none;
      }
    }
  }

  .remediation-steps {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .remediation-step {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);

    .step-number {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary);
      color: var(--bg-primary);
      border-radius: 50%;
      font-weight: 700;
      font-size: var(--font-size-md);
    }

    .step-content {
      flex: 1;

      h4 {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: var(--font-size-md);
        color: var(--text-primary);
      }

      p {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        line-height: 1.6;
      }

      pre {
        margin: 0;
        padding: var(--spacing-sm);
        background: var(--bg-primary);
        border-radius: var(--radius-sm);
        overflow-x: auto;
        border: 1px solid var(--border-primary);

        code {
          font-family: monospace;
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
        }
      }
    }
  }

  .practices-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .practice-item {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--border-primary);

    &.priority-critical {
      border-left-color: var(--color-error);
    }

    &.priority-high {
      border-left-color: var(--color-warning);
    }

    &.priority-medium {
      border-left-color: var(--color-info);
    }

    .practice-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);

      :global(.icon) {
        color: var(--color-success);
        flex-shrink: 0;
      }

      h4 {
        margin: 0;
        font-size: var(--font-size-md);
        color: var(--text-primary);
        flex: 1;
      }

      .priority-badge {
        padding: var(--spacing-2xs) var(--spacing-xs);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: 600;
        text-transform: uppercase;

        &.priority-critical {
          background: var(--color-error);
          color: var(--bg-primary);
        }

        &.priority-high {
          background: var(--color-warning);
          color: var(--bg-primary);
        }

        &.priority-medium {
          background: var(--color-info);
          color: var(--bg-primary);
        }
      }
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.6;
    }
  }
  .educational-part {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-lg);
    .info-card {
      width: 100%;
    }
  }
</style>
