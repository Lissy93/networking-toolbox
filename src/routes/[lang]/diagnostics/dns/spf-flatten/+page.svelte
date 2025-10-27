<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../../styles/diagnostics-pages.scss';

  let domainName = $state('example.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);
  let copySuccess = $state(false);

  const examples = [
    { domain: 'github.com', description: 'GitHub SPF' },
    { domain: 'google.com', description: 'Google SPF' },
    { domain: 'microsoft.com', description: 'Microsoft SPF' },
  ];

  async function flattenSPF() {
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
          action: 'spf-flatten',
          domain: domainName.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to flatten SPF');
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
    flattenSPF();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  async function copyFlattened() {
    if (results?.flattened) {
      await navigator.clipboard.writeText(results.flattened);
      copySuccess = true;
      setTimeout(() => {
        copySuccess = false;
      }, 500);
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>SPF Flatten</h1>
    <p>Resolve include:/redirect= and output a flattened SPF with lookup counts</p>
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
            use:tooltip={`Flatten SPF record for ${example.domain}`}
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
      <h3>SPF Flatten Configuration</h3>
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
            onkeydown={(e) => e.key === 'Enter' && flattenSPF()}
          />
          <button onclick={flattenSPF} disabled={loading} class="primary">
            {#if loading}
              <Icon name="loader" size="sm" animate="spin" />
              Flattening...
            {:else}
              <Icon name="search" size="sm" />
              Flatten SPF
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
            <strong>SPF Flatten Failed</strong>
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
            <h3>Flattening SPF Record</h3>
            <p>Resolving SPF includes and redirects to create a flattened record...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h3>SPF Flatten Results</h3>
      </div>
      <div class="card-content">
        <div class="results-section">
          <!-- Original SPF Record Section -->
          <div class="card original-section">
            <div class="card-header">
              <h3>Original SPF Record</h3>
            </div>
            <div class="card-content">
              <div class="spf-record original">
                <code>{results.original}</code>
              </div>
            </div>
          </div>

          <!-- Flattened SPF Record Section -->
          <div class="card flattened-section">
            <div class="card-header">
              <div class="section-header">
                <h3>Flattened SPF Record</h3>
                <button
                  class="copy-button"
                  class:success={copySuccess}
                  onclick={copyFlattened}
                  use:tooltip={'Copy flattened SPF record to clipboard'}
                >
                  <Icon name={copySuccess ? 'check' : 'copy'} size="sm" />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div class="card-content">
              <div class="spf-record flattened">
                <code>{results.flattened}</code>
              </div>
            </div>
          </div>

          <!-- Expansion Tree Section -->
          {#if results.expansions && results.expansions.length > 0}
            <div class="card expansion-section">
              <div class="card-header">
                <h3>Expansion Tree</h3>
              </div>
              <div class="card-content">
                <div class="tree-container">
                  {#each results.expansions as expansion, _i (expansion.value)}
                    <div class="expansion-item" style="margin-left: {expansion.depth * 1.5}rem">
                      <div class="expansion-header">
                        <span class="expansion-type">{expansion.type}</span>
                        <span class="expansion-value">{expansion.value}</span>
                        <span
                          class="lookup-count"
                          use:tooltip={`${expansion.lookups} DNS lookup${expansion.lookups !== 1 ? 's' : ''}`}
                        >
                          {expansion.lookups}
                        </span>
                      </div>

                      {#if expansion.resolved}
                        <div class="resolved-items">
                          {#each expansion.resolved as item (item)}
                            <span class="resolved-item">{item}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}

          <!-- Statistics Section -->
          <div class="card stats-section">
            <div class="card-header">
              <h3>Statistics</h3>
            </div>
            <div class="card-content">
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-label" use:tooltip={'Number of DNS lookups required. RFC 7208 limits this to 10.'}>
                    DNS Lookups
                  </div>
                  <div
                    class="stat-value"
                    class:warning={results.stats.dnsLookups > 7}
                    class:error={results.stats.dnsLookups > 10}
                  >
                    <Icon
                      name={results.stats.dnsLookups > 10
                        ? 'alert-circle'
                        : results.stats.dnsLookups > 7
                          ? 'alert-triangle'
                          : 'check-circle'}
                      size="sm"
                    />
                    {results.stats.dnsLookups}/10
                  </div>
                  {#if results.stats.dnsLookups > 10}
                    <div class="stat-warning">Exceeds RFC limit!</div>
                  {:else if results.stats.dnsLookups > 7}
                    <div class="stat-warning">Close to limit</div>
                  {/if}
                </div>

                <div class="stat-card">
                  <div class="stat-label" use:tooltip={'Number of IPv4 addresses in the flattened SPF record'}>
                    IPv4 Addresses
                  </div>
                  <div class="stat-value">{results.stats.ipv4Count}</div>
                </div>

                <div class="stat-card">
                  <div class="stat-label" use:tooltip={'Number of IPv6 addresses in the flattened SPF record'}>
                    IPv6 Addresses
                  </div>
                  <div class="stat-value">{results.stats.ipv6Count}</div>
                </div>

                <div class="stat-card">
                  <div class="stat-label" use:tooltip={'Maximum depth of nested include statements'}>
                    Max Include Depth
                  </div>
                  <div class="stat-value">{results.stats.includeDepth}</div>
                </div>

                <div class="stat-card">
                  <div class="stat-label" use:tooltip={'Total character length of the flattened SPF record'}>
                    Record Length
                  </div>
                  <div class="stat-value" class:warning={results.stats.recordLength > 400}>
                    <Icon name={results.stats.recordLength > 450 ? 'alert-triangle' : 'check-circle'} size="sm" />
                    {results.stats.recordLength}
                  </div>
                  {#if results.stats.recordLength > 450}
                    <div class="stat-warning">May need splitting</div>
                  {/if}
                </div>

                <div class="stat-card">
                  <div class="stat-label" use:tooltip={'Total number of SPF mechanisms in the flattened record'}>
                    Total Mechanisms
                  </div>
                  <div class="stat-value">{results.stats.mechanisms}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Warnings Section -->
          {#if results.warnings && results.warnings.length > 0}
            <div class="card warnings-section">
              <div class="card-header">
                <h3>Warnings</h3>
              </div>
              <div class="card-content">
                <div class="warnings-list">
                  {#each results.warnings as warning (warning)}
                    <div class="warning-item">
                      <Icon name="alert-triangle" size="sm" />
                      <span>{warning}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .results-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .original-section,
  .expansion-section,
  .flattened-section,
  .stats-section,
  .warnings-section {
    background: var(--bg-secondary);
    width: 100%;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    h3 {
      margin: 0;
    }

    .copy-button {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--color-primary);
      color: var(--bg-primary);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-normal);
      font-size: var(--font-size-sm);
      font-weight: 500;

      &:hover {
        background: var(--color-primary-hover);
        transform: translateY(-1px);
      }

      &.success {
        background: var(--color-success);
        color: var(--bg-primary);
        transform: scale(1.05);

        &:hover {
          background: var(--color-success);
        }
      }

      :global(svg) {
        width: var(--font-size-sm);
        height: var(--font-size-sm);
      }
    }
  }

  .spf-record {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow-x: auto;

    code {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      word-break: break-all;
      line-height: 1.5;
    }

    &.original {
      background: var(--color-surface-elevated);
    }

    &.flattened {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      border-color: color-mix(in srgb, var(--color-success), transparent 70%);
    }
  }

  .tree-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .expansion-item {
    background: var(--bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .expansion-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);

    .expansion-type {
      display: inline-flex;
      padding: var(--spacing-2xs) var(--spacing-xs);
      background: color-mix(in srgb, var(--color-primary), transparent 90%);
      color: var(--color-primary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      min-width: fit-content;
    }

    .expansion-value {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      flex: 1;
      word-break: break-all;
    }

    .lookup-count {
      display: inline-flex;
      padding: var(--spacing-2xs) var(--spacing-xs);
      background: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-secondary);
      min-width: fit-content;
    }
  }

  .resolved-items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }

  .resolved-item {
    display: inline-flex;
    padding: var(--spacing-2xs) var(--spacing-xs);
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .warnings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .warning-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-warning), transparent 95%);
    border: 1px solid color-mix(in srgb, var(--color-warning), transparent 80%);
    border-radius: var(--radius-md);
    color: var(--color-warning);

    :global(svg) {
      color: var(--color-warning);
      flex-shrink: 0;
      margin-top: var(--spacing-2xs);
    }

    span {
      flex: 1;
      font-size: var(--font-size-sm);
      line-height: 1.4;
    }
  }

  .stat-value {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    &.warning {
      color: var(--color-warning);
    }

    &.error {
      color: var(--color-error);
    }

    :global(svg) {
      flex-shrink: 0;
    }
  }

  .stat-warning {
    font-size: var(--font-size-xs);
    color: var(--color-warning);
    margin-top: var(--spacing-2xs);
    font-weight: 500;
  }
</style>
