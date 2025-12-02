<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import Icon from '$lib/components/global/Icon.svelte';
  import { dnsblContent } from '$lib/content/dnsbl';
  import '../../../../../styles/diagnostics-pages.scss';

  let target = $state('');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);
  let expandedItems = $state<Record<string, boolean>>({});

  function toggleExpand(rblName: string) {
    expandedItems = {
      ...expandedItems,
      [rblName]: !expandedItems[rblName],
    };
  }

  const examples = [
    { target: 'example.com', description: 'Example.com (many IPs, all clean)' },
    { target: '127.0.0.2', description: 'RBL Test IP (Flagged as span)' },
    { target: '1.1.1.1', description: 'Cloudflare DNS (Clean IP)' },
    { target: '::FFFF:7F00:2', description: 'Local IPv6' },
    { target: 'networkingtoolbox.net', description: 'networkingtoolbox.net' },
  ];

  const isInputValid = $derived(() => {
    const trimmed = target.trim();
    if (!trimmed) return false;
    // Basic IP or domain validation
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return ipv4Pattern.test(trimmed) || ipv6Pattern.test(trimmed) || domainPattern.test(trimmed);
  });

  async function checkBlacklist() {
    if (!isInputValid) return;

    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dnsbl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to check blacklist');
      }

      results = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unexpected error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    target = example.target;
    selectedExampleIndex = index;
    checkBlacklist();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }
</script>

<svelte:head>
  <title>DNS Blacklist Checker | IP Calc</title>
  <meta
    name="description"
    content="Check if your IP address or domain is listed on major spam blacklists (RBLs). Multi-RBL checking for email deliverability troubleshooting."
  />
  <meta
    name="keywords"
    content="DNSBL, RBL, blacklist checker, spam blacklist, Spamhaus, SORBS, email deliverability, IP reputation"
  />
</svelte:head>

<div class="card">
  <header class="card-header">
    <h1>DNS Blacklist Checker</h1>
    <p>Check if your IP or domain is listed on major spam blacklists (RBLs)</p>
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
            use:tooltip={`Check ${example.target} on blacklists`}
          >
            <h5>{example.description}</h5>
            <p>{example.target}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <form
      class="inline-form"
      onsubmit={(e) => {
        e.preventDefault();
        checkBlacklist();
      }}
    >
      <div class="form-group flex-grow">
        <label for="target">IP Address or Domain</label>
        <input
          id="target"
          type="text"
          bind:value={target}
          oninput={clearExampleSelection}
          placeholder="e.g., 8.8.8.8 or example.com"
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading || !isInputValid} class="primary submit-btn">
        {#if loading}
          <Icon name="loader" size="sm" animate="spin" />
          Checking...
        {:else}
          <Icon name="search" size="sm" />
          Check Blacklist
        {/if}
      </button>
    </form>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="card error-card">
      <Icon name="alert-triangle" size="md" />
      <div>
        <h4>Error</h4>
        <p>{error}</p>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Checking Blacklists</h3>
            <p>Querying DNS blacklist records for {target}...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h2>Blacklist Check Results</h2>
      </div>

      <!-- Summary -->
      <div
        class="summary-section"
        class:clean={results.summary.listedCount === 0}
        class:listed={results.summary.listedCount > 0}
      >
        <div class="summary-header">
          <Icon name={results.summary.listedCount === 0 ? 'check-circle' : 'alert-triangle'} size="lg" />
          <div>
            <h3>{results.summary.listedCount === 0 ? 'Clean' : 'Listed on Blacklists'}</h3>
            <p>Target: <strong>{results.target}</strong> ({results.targetType})</p>
            {#if results.resolvedIPs && results.resolvedIPs.length > 0}
              <p class="resolved-ips">Resolved IPs: {results.resolvedIPs.join(', ')}</p>
            {/if}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="label">Total Checked</span>
            <span class="value">{results.summary.totalChecked}</span>
          </div>
          <div class="info-item success">
            <span class="label">Clean</span>
            <span class="value">{results.summary.cleanCount}</span>
          </div>
          <div class="info-item error">
            <span class="label">Listed</span>
            <span class="value">{results.summary.listedCount}</span>
          </div>
          <div class="info-item warning">
            <span class="label">Errors</span>
            <span class="value">{results.summary.errorCount}</span>
          </div>
        </div>
      </div>

      <!-- Listed Results -->
      {#if results.results.filter((r: any) => r.listed).length > 0}
        <div class="card blacklist-section error">
          <div class="card-header">
            <h3>
              <Icon name="alert-triangle" size="sm" />
              Listed on Blacklists ({results.results.filter((r: any) => r.listed).length})
            </h3>
          </div>
          <div class="results-list">
            {#each results.results.filter((r: any) => r.listed) as result (result.rbl)}
              <div class="result-item listed expandable" class:expanded={expandedItems[result.rbl]}>
                <button class="result-header clickable" onclick={() => toggleExpand(result.rbl)}>
                  <span class:expanded={expandedItems[result.rbl]}>
                    <Icon name="chevron-right" size="xs" />
                  </span>
                  <strong>{result.rbl}</strong>
                  <span class="response-time">{result.responseTime}ms</span>
                  <span class="status-chip error">
                    <Icon name="x-circle" size="xs" />
                    Listed
                  </span>
                </button>
                {#if expandedItems[result.rbl]}
                  <div class="details-content">
                    {#if result.description}
                      <div class="record-details">
                        <span class="label">Type:</span>
                        <span class="value">{result.description}</span>
                      </div>
                    {/if}
                    {#if result.response}
                      <div class="record-details">
                        <span class="label">Response:</span>
                        <code>{result.response}</code>
                      </div>
                    {/if}
                    {#if result.reason}
                      <div class="record-details reason">
                        <span class="label">Reason:</span>
                        <span class="value">{result.reason}</span>
                      </div>
                    {/if}
                    {#if result.url}
                      <div class="record-details">
                        <span class="label">Delisting:</span>
                        <a href={result.url} target="_blank" rel="noopener noreferrer" class="delist-link">
                          <Icon name="external-link" size="xs" />
                          Check status and request removal
                        </a>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Clean Results -->
      {#if results.results.filter((r: any) => !r.listed && !r.error).length > 0}
        <div class="card blacklist-section success">
          <details>
            <summary class="card-header clickable">
              <span class="chevron">
                <Icon name="chevron-right" size="xs" />
              </span>
              <h3>
                <Icon name="check-circle" size="sm" />
                Clean Results ({results.results.filter((r: any) => !r.listed && !r.error).length})
              </h3>
            </summary>
            <div class="results-list">
              {#each results.results.filter((r: any) => !r.listed && !r.error) as result (result.rbl)}
                <div class="result-item clean">
                  <div class="result-header">
                    <strong>{result.rbl}</strong>
                    <span class="response-time">{result.responseTime}ms</span>
                    <span class="status-chip success">
                      <Icon name="check-circle" size="xs" />
                      Clean
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </details>
        </div>
      {/if}

      <!-- Warnings/Query Errors -->
      {#if results.results.filter((r: any) => r.error).length > 0}
        <div class="card blacklist-section warning">
          <details>
            <summary class="card-header clickable">
              <span class="chevron">
                <Icon name="chevron-right" size="xs" />
              </span>
              <h3>
                <Icon name="alert-circle" size="sm" />
                Query Warnings ({results.results.filter((r: any) => r.error).length})
              </h3>
            </summary>
            <div class="results-list">
              {#each results.results.filter((r: any) => r.error) as result (result.rbl)}
                <div class="result-item warning-item">
                  <div class="result-header">
                    <strong>{result.rbl}</strong>
                    <span class="status-chip warning">
                      <Icon name="alert-circle" size="xs" />
                      Warning
                    </span>
                  </div>
                  <div class="record-details">
                    <span class="label">Note:</span>
                    <span class="value">{result.error}</span>
                  </div>
                </div>
              {/each}
            </div>
            <div class="warning-info">
              <p>
                <Icon name="info" size="xs" />
                These RBLs could not be queried, possibly due to rate limiting, public resolver restrictions, or API access
                requirements. This does not indicate a listing.
              </p>
            </div>
          </details>
        </div>
      {/if}

      <!-- Query Warnings (collapsible) -->
      {#if results}
        <div class="card info-card">
          <details>
            <summary class="card-header clickable">
              <span class="chevron">
                <Icon name="chevron-right" size="xs" />
              </span>
              <h4>{dnsblContent.sections.queryWarnings.title}</h4>
            </summary>
            <div class="card-content">
              <div class="info-section">
                <p>{dnsblContent.sections.queryWarnings.content}</p>
                <div class="warnings-list">
                  {#each dnsblContent.sections.queryWarnings.warnings as warning (warning.type)}
                    <div class="warning-item">
                      <strong>{warning.type}</strong>
                      <p class="warning-meaning">{warning.meaning}</p>
                      <p class="warning-action">{warning.action}</p>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </details>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Always visible informational content -->
<div class="info-sections">
  <div class="card">
    <div class="card-header">
      <h2>{dnsblContent.sections.whatAreBlacklists.title}</h2>
    </div>
    <div class="card-content">
      <p>{dnsblContent.sections.whatAreBlacklists.content}</p>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>{dnsblContent.sections.consequences.title}</h2>
    </div>
    <div class="card-content">
      <p>{dnsblContent.sections.consequences.content}</p>
      <div class="compact-impacts">
        {#each dnsblContent.sections.consequences.impacts.slice(0, 3) as impact (impact.impact)}
          <div class="compact-impact">
            <span class="severity-badge {impact.severity.toLowerCase()}">{impact.severity}</span>
            <strong>{impact.impact}</strong>
            <span class="impact-desc">{impact.description}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>{dnsblContent.sections.howToFix.title}</h2>
    </div>
    <div class="card-content">
      <p>{dnsblContent.sections.howToFix.content}</p>
      <div class="fix-steps-compact">
        {#each dnsblContent.sections.howToFix.steps as stepGroup (stepGroup.step)}
          <div class="step-compact">
            <h4>{stepGroup.step}</h4>
            <ul>
              {#each stepGroup.actions.slice(0, 3) as action, idx (`${stepGroup.step}-${idx}`)}
                <li>{action}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>{dnsblContent.sections.majorBlacklists.title}</h2>
    </div>
    <div class="card-content">
      <div class="blacklists-grid">
        {#each dnsblContent.sections.majorBlacklists.lists as list (list.name)}
          <div class="blacklist-card">
            <div class="blacklist-header">
              <strong>{list.name}</strong>
              <span class="type-badge">{list.type}</span>
            </div>
            <p>{list.description}</p>
            <div class="blacklist-details">
              <div class="detail-row">
                <span class="label">Usage:</span>
                <span>{list.usage}</span>
              </div>
              <div class="detail-row">
                <span class="label">Auto-removal:</span>
                <span>{list.autoRemoval}</span>
              </div>
              {#if list.url}
                <div class="detail-row">
                  <span class="label">Website:</span>
                  <a href={list.url} target="_blank" rel="noopener noreferrer" class="blacklist-link">
                    <Icon name="external-link" size="xs" />
                    Check listing status
                  </a>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

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

    .submit-btn {
      white-space: nowrap;
    }
  }

  .summary-section {
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--color-primary);

    &.clean {
      border-left-color: var(--color-success);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-success), transparent 95%),
        color-mix(in srgb, var(--color-success), transparent 98%)
      );
    }

    &.listed {
      border-left-color: var(--color-error);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-error), transparent 95%),
        color-mix(in srgb, var(--color-error), transparent 98%)
      );
    }

    .summary-header {
      display: flex;
      gap: var(--spacing-md);
      align-items: flex-start;
      margin-bottom: var(--spacing-md);

      h3 {
        margin: 0 0 var(--spacing-2xs) 0;
        color: var(--text-primary);
        font-size: var(--font-size-xl);
      }

      p {
        margin: 0;
        color: var(--text-secondary);
        font-size: var(--font-size-sm);

        &.resolved-ips {
          margin-top: var(--spacing-2xs);
          font-family: monospace;
        }
      }
    }
  }

  .blacklist-section {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);

    .card-header {
      h3 {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }
    }
    &.success {
      .card-header h3 :global(.icon) {
        color: var(--color-success);
      }
    }
    &.warning {
      .card-header h3 :global(.icon) {
        color: var(--color-warning);
      }
    }
    &.error {
      .card-header h3 :global(.icon) {
        color: var(--color-error);
      }
    }

    details {
      .card-header.clickable {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: var(--spacing-sm);
        margin: 0;
        cursor: pointer;
        user-select: none;
        border-radius: var(--radius-md);
        padding: var(--spacing-sm);
        transition: background var(--transition-fast);

        &:hover {
          background: var(--bg-tertiary);
        }

        .chevron {
          display: inline-flex;
          transition: transform var(--transition-fast);
        }

        h3 {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          margin: 0;
        }
      }

      &[open] .card-header.clickable .chevron {
        transform: rotate(90deg);
      }

      .results-list,
      .warning-info {
        animation: slideDown 0.2s ease-out;
      }
    }
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin: var(--spacing-md) 0;
  }

  .result-item {
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
    transition: all var(--transition-fast);

    &.listed {
      background: color-mix(in srgb, var(--color-error), transparent 97%);
      border-color: color-mix(in srgb, var(--color-error), transparent 70%);
      .label {
        min-width: 5rem;
      }
    }

    &.clean {
      background: color-mix(in srgb, var(--color-success), transparent 97%);
      border-color: color-mix(in srgb, var(--color-success), transparent 80%);
    }

    &.warning-item {
      background: color-mix(in srgb, var(--color-warning), transparent 97%);
      border-color: color-mix(in srgb, var(--color-warning), transparent 80%);
    }

    &.expandable {
      padding: 0;
      overflow: hidden;
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      strong {
        flex: 1;
        color: var(--text-primary);
        font-size: var(--font-size-md);
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2xs);
        padding: var(--spacing-2xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: 600;
        white-space: nowrap;

        &.error {
          background: var(--color-error);
          color: var(--bg-primary);
        }

        &.success {
          background: var(--color-success);
          color: var(--bg-primary);
        }

        &.warning {
          background: var(--color-warning);
          color: var(--bg-primary);
        }
      }

      .response-time {
        font-size: var(--font-size-xs);
        color: var(--text-tertiary);
        font-family: monospace;
      }

      &.clickable {
        width: 100%;
        padding: var(--spacing-sm);
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background var(--transition-fast);

        &:hover {
          background: color-mix(in srgb, var(--color-error), transparent 90%);
        }

        span.expanded {
          transform: rotate(90deg);
          transition: transform var(--transition-fast);
        }
      }
    }

    .details-content {
      padding: 0 var(--spacing-sm) var(--spacing-sm) var(--spacing-sm);
      animation: slideDown 0.2s ease-out;
    }

    .record-details {
      display: flex;
      gap: var(--spacing-sm);
      align-items: flex-start;
      margin-top: var(--spacing-sm);
      font-size: var(--font-size-sm);
      padding-left: var(--spacing-md);

      .label {
        color: var(--text-secondary);
        font-weight: 600;
        flex-shrink: 0;
      }

      code,
      .value {
        color: var(--text-primary);
        word-break: break-word;
        flex: 1;
      }

      code {
        font-family: monospace;
        background: var(--bg-primary);
      }

      &.reason .value {
        font-family: inherit;
      }

      .delist-link {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2xs);
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 500;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-primary-dark);
          text-decoration: underline;
        }
      }
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .info-card {
    margin-top: var(--spacing-md);
    background: var(--bg-secondary);
    .card-content {
      padding-top: var(--spacing-md);
    }

    details {
      .card-header.clickable {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: var(--spacing-sm);
        margin: 0;
        cursor: pointer;
        user-select: none;
        transition: background var(--transition-fast);

        &:hover {
          background: var(--surface-hover);
        }

        .chevron {
          display: inline-flex;
          transition: transform var(--transition-fast);
        }

        h4 {
          margin: 0;
        }
      }

      &[open] .card-header.clickable .chevron {
        transform: rotate(90deg);
      }

      .card-content {
        animation: slideDown 0.2s ease-out;
      }
    }

    .info-section {
      margin-bottom: var(--spacing-md);

      &:last-child {
        margin-bottom: 0;
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0;
      }
    }
  }

  .warning-info {
    padding: var(--spacing-md);
    margin-top: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-info);

    p {
      margin: 0;
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.6;
    }
  }

  .info-grid {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    .info-item {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      justify-content: center;
      align-items: center;
      background: var(--bg-secondary);
      padding: var(--spacing-sm);
      border-radius: var(--radius-sm);
    }
  }

  .error-card {
    display: flex;
    align-items: center;
    padding: var(--spacing-md);
    gap: var(--spacing-md);
    p {
      margin: 0;
    }
  }

  // Info sections (always visible)
  .info-sections {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-xl);
    border-top: 1px solid var(--border-primary);
    padding-top: var(--spacing-lg);

    .card {
      width: 100%;
      background: var(--bg-secondary);
    }

    .card-header {
      h2 {
        font-size: var(--font-size-lg);
        margin: 0;
        color: var(--text-primary);
      }
    }

    .card-content {
      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: var(--spacing-md);
      }
    }
  }

  .compact-impacts {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .compact-impact {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--border-primary);

    .severity-badge {
      font-size: var(--font-size-xs);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      color: var(--bg-primary);
      min-width: 5rem;
      text-align: center;

      &.critical {
        background: var(--color-error);
      }

      &.high {
        background: var(--color-warning);
      }

      &.medium {
        background: var(--color-info);
      }

      &.low {
        background: var(--text-tertiary);
      }
    }

    strong {
      min-width: 140px;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    .impact-desc {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      flex: 1;
    }
  }

  .fix-steps-compact {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .step-compact {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--color-primary);

    h4 {
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--color-primary);
      font-size: var(--font-size-md);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);

      li {
        margin-bottom: var(--spacing-2xs);
        line-height: 1.5;
      }
    }
  }

  // New content section styles
  .impact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  .warnings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  .warning-item {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--color-info);

    strong {
      color: var(--text-primary);
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    .warning-meaning {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin: var(--spacing-xs) 0;
    }

    .warning-action {
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
      margin: var(--spacing-xs) 0 0 0;
      font-style: italic;
    }
  }

  .blacklists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  .blacklist-card {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    transition: border-color var(--transition-fast);
    .blacklist-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);

      strong {
        color: var(--text-primary);
        font-size: var(--font-size-md);
      }
    }

    .type-badge {
      font-size: var(--font-size-xs);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      font-weight: 500;
    }

    p {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin: var(--spacing-sm) 0;
      line-height: 1.5;
    }

    .blacklist-details {
      margin-top: var(--spacing-sm);
      padding-top: var(--spacing-sm);
      border-top: 1px solid var(--border-primary);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .detail-row {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-2xs);
        font-size: var(--font-size-sm);

        .label {
          color: var(--text-tertiary);
          font-weight: 600;
          min-width: 100px;
        }

        span:not(.label) {
          color: var(--text-secondary);
        }
      }

      .blacklist-link {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2xs);
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 500;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-primary-dark);
          text-decoration: underline;
        }
      }
    }
  }

  @media (max-width: 768px) {
    .inline-form {
      .submit-btn {
        width: 100%;
      }
    }

    .info-grid {
      grid-template-columns: 1fr 1fr;
    }

    .result-item .record-details {
      flex-direction: column;
      align-items: flex-start;

      .label {
        min-width: auto;
        font-weight: 600;
      }
    }

    .impact-grid,
    .blacklists-grid {
      grid-template-columns: 1fr;
    }

    .blacklist-card .blacklist-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }

    .fix-steps-compact {
      grid-template-columns: 1fr;
    }

    .compact-impact {
      flex-direction: column;
      align-items: flex-start;

      strong {
        min-width: auto;
      }
    }
  }

  @media (max-width: 480px) {
    .info-grid {
      grid-template-columns: 1fr;
    }

    .result-item .result-header {
      flex-wrap: wrap;

      .response-time {
        width: 100%;
        text-align: left;
      }
    }
  }
</style>
