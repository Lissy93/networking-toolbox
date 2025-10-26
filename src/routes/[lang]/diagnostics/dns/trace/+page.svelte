<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../../styles/diagnostics-pages.scss';

  let domainName = $state('example.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { domain: 'www.cloudflare.com', description: 'Cloudflare edge network' },
    { domain: 'www.google.com', description: 'Popular service with CDN' },
    { domain: 'github.com', description: 'GitHub platform trace' },
    { domain: 'bbc.co.uk', description: 'Multi-level TLD (.co.uk)' },
    { domain: 'aws.amazon.com', description: 'AWS subdomain delegation' },
    { domain: 'aliciasykes.com', description: 'Homepage hosted on Vercel' },
  ];

  async function performTrace() {
    if (!domainName?.trim()) {
      error = 'Please enter a domain name';
      return;
    }

    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trace',
          domain: domainName.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to trace domain');
      }

      results = data;
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domainName = example.domain;
    selectedExampleIndex = index;
    performTrace();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function formatTiming(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DNS Trace Tool</h1>
    <p>Iterative trace from root to authoritative nameservers via DNS over HTTPS</p>
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
            use:tooltip={`Trace DNS resolution path for ${example.domain}`}
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
      <h3>Trace Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain">Domain Name</label>
        <div class="input-flex-container">
          <input
            id="domain"
            type="text"
            bind:value={domainName}
            placeholder="example.com"
            disabled={loading}
            onchange={() => clearExampleSelection()}
            onkeydown={(e) => e.key === 'Enter' && performTrace()}
          />
          <button onclick={performTrace} disabled={loading} class="primary">
            {#if loading}
              <Icon name="loader" size="sm" animate="spin" />
              Tracing...
            {:else}
              <Icon name="search" size="sm" />
              Trace
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>Trace Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Performing DNS Trace</h3>
            <p>Following the DNS resolution path from root servers to authoritative nameservers...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h3>Trace Path</h3>
      </div>
      <div class="card-content">
        <div class="trace-timeline">
          {#each results.path as step, i (i)}
            <div class="trace-step">
              <div class="step-marker">
                <span class="step-number">{i + 1}</span>
              </div>

              <div class="step-content">
                <div class="step-header">
                  <span class="step-type" use:tooltip={'Type of DNS query operation'}>{step.type}</span>
                  <span class="step-timing" use:tooltip={'Time taken for this query'}>{formatTiming(step.timing)}</span>
                </div>

                <div class="step-query">
                  <strong use:tooltip={'Domain name being queried'}>Query:</strong>
                  {step.query}
                  {#if step.qtype}
                    <span class="record-type" use:tooltip={'DNS record type requested'}>{step.qtype}</span>
                  {/if}
                </div>

                <div class="step-server">
                  <strong use:tooltip={'DNS server that responded to this query'}>Server:</strong>
                  {step.server}
                  {#if step.serverName}
                    <span class="server-name">({step.serverName})</span>
                  {/if}
                </div>

                {#if step.response}
                  <div class="step-response">
                    <strong use:tooltip={'Response received from the DNS server'}>Response:</strong>
                    {#if step.response.type === 'referral'}
                      <span class="referral">
                        Referral to {step.response.nameservers.join(', ')}
                      </span>
                    {:else if step.response.type === 'answer'}
                      <span class="answer">
                        {#if Array.isArray(step.response.data)}
                          {step.response.data.join(', ')}
                        {:else}
                          {step.response.data}
                        {/if}
                      </span>
                    {:else if step.response.type === 'nodata'}
                      <span class="nodata">No data for this record type</span>
                    {:else if step.response.type === 'nxdomain'}
                      <span class="nxdomain">Domain does not exist</span>
                    {/if}
                  </div>
                {/if}

                {#if step.flags}
                  <div class="step-flags">
                    {#if step.flags.aa}
                      <span class="flag authoritative" use:tooltip={'Authoritative Answer'}>AA</span>
                    {/if}
                    {#if step.flags.ad}
                      <span class="flag dnssec" use:tooltip={'Authenticated Data (DNSSEC)'}>AD</span>
                    {/if}
                    {#if step.flags.rd}
                      <span class="flag" use:tooltip={'Recursion Desired'}>RD</span>
                    {/if}
                    {#if step.flags.ra}
                      <span class="flag" use:tooltip={'Recursion Available'}>RA</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    {#if results.summary}
      <div class="card">
        <div class="card-header">
          <h3>Trace Summary</h3>
        </div>
        <div class="card-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label" use:tooltip={'Total time for the complete DNS trace'}>Total Time</div>
              <div class="stat-value">
                <Icon name="timer" size="sm" />
                {formatTiming(results.summary.totalTime)}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label" use:tooltip={'Number of DNS queries performed during trace'}>DNS Queries</div>
              <div class="stat-value">{results.summary.queryCount}</div>
            </div>
            {#if results.summary.finalServer}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={'Final authoritative server that provided the answer'}>
                  Final Server
                </div>
                <div class="stat-value mono">{results.summary.finalServer}</div>
              </div>
            {/if}
            {#if results.summary.recordType}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={'Type of DNS record that was traced'}>Record Type</div>
                <div class="stat-value">{results.summary.recordType}</div>
              </div>
            {/if}
            {#if results.summary.totalHops}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={'Number of DNS resolution hops from root to authoritative'}>
                  Total Hops
                </div>
                <div class="stat-value">{results.summary.totalHops}</div>
              </div>
            {/if}
            {#if results.summary.averageLatency}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={'Average response time per DNS query'}>Avg Latency</div>
                <div class="stat-value">{results.summary.averageLatency}ms</div>
              </div>
            {/if}
            {#if results.summary.dnssecValid !== undefined}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={'DNSSEC validation status for the final response'}>
                  DNSSEC Status
                </div>
                <div
                  class="stat-value"
                  class:valid={results.summary.dnssecValid}
                  class:invalid={!results.summary.dnssecValid}
                >
                  <Icon name={results.summary.dnssecValid ? 'shield-check' : 'shield-x'} size="sm" />
                  {results.summary.dnssecValid ? 'Valid' : 'Not Validated'}
                </div>
              </div>
            {/if}
            {#if results.summary.authoritativeAnswer !== undefined}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={'Whether the final answer came from an authoritative server'}>
                  Authoritative
                </div>
                <div
                  class="stat-value"
                  class:valid={results.summary.authoritativeAnswer}
                  class:invalid={!results.summary.authoritativeAnswer}
                >
                  <Icon name={results.summary.authoritativeAnswer ? 'check-circle' : 'x-circle'} size="sm" />
                  {results.summary.authoritativeAnswer ? 'Yes' : 'No'}
                </div>
              </div>
            {/if}
            {#if results.summary.resolverPath}
              <div class="stat-card double-width">
                <div class="stat-label" use:tooltip={'The path taken through different DNS servers'}>
                  Resolution Path
                </div>
                <div class="stat-value mono resolver-path">{results.summary.resolverPath}</div>
              </div>
            {/if}
            {#if results.summary.finalAnswer}
              <div class="stat-card double-width">
                <div class="stat-label" use:tooltip={'The final answer received from the authoritative server'}>
                  Final Answer
                </div>
                <div class="stat-value mono">
                  {Array.isArray(results.summary.finalAnswer)
                    ? results.summary.finalAnswer.join(', ')
                    : results.summary.finalAnswer}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .trace-timeline {
    position: relative;
    padding-left: 2rem;

    &::before {
      content: '';
      position: absolute;
      left: 1rem;
      top: 1.5rem;
      bottom: 1rem;
      width: 2px;
      background: linear-gradient(
        180deg,
        var(--color-primary),
        color-mix(in srgb, var(--color-primary), transparent 70%)
      );
    }
  }

  .trace-step {
    position: relative;
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .step-marker {
    position: absolute;
    left: -2rem;
    width: 2rem;
    height: 2rem;
    background: var(--bg-secondary);
    border: 2px solid var(--color-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    .step-number {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-primary);
    }
  }

  .step-content {
    flex: 1;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem;
    transition: border-color 0.2s ease;
  }

  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;

    .step-type {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      color: var(--color-primary);
    }

    .step-timing {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
  }

  .step-query,
  .step-server,
  .step-response {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;

    strong {
      color: var(--color-text-secondary);
      margin-right: 0.5rem;
    }
  }

  .record-type {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    background: var(--color-primary-bg);
    color: var(--color-primary);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  .server-name {
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .referral {
    color: var(--color-info);
  }

  .answer {
    color: var(--color-success);
    font-family: var(--font-mono);
  }

  .nodata {
    color: var(--color-warning);
  }

  .nxdomain {
    color: var(--color-error);
  }

  .step-flags {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;

    .flag {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      background: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;

      &.authoritative {
        background: color-mix(in srgb, var(--color-success), transparent 90%);
        border-color: var(--color-success);
        color: var(--color-success);
      }

      &.dnssec {
        background: color-mix(in srgb, var(--color-info), transparent 90%);
        border-color: var(--color-info);
        color: var(--color-info);
      }
    }
  }

  .loading-state {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-xl);
    text-align: left;

    .loading-text {
      h3 {
        margin: 0 0 var(--spacing-xs) 0;
        color: var(--color-primary);
      }

      p {
        margin: 0;
        color: var(--color-text-secondary);
      }
    }
  }

  .stat-card {
    .stat-value {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);

      &.valid {
        color: var(--color-success);
      }

      &.invalid {
        color: var(--color-warning);
      }

      &.mono {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        word-break: break-all;
      }

      &.resolver-path {
        font-size: var(--font-size-xs);
        line-height: 1.4;
        overflow-wrap: break-word;
      }
    }
  }
</style>
