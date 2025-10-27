<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import Icon from '$lib/components/global/Icon.svelte';
  import { dnsPerformanceContent } from '$lib/content/dns-performance';
  import '$lib/../styles/diagnostics-pages.scss';

  type ResolverResult = {
    resolver: string;
    resolverName: string;
    success: boolean;
    responseTime: number;
    records?: string[];
    error?: string;
  };

  type PerfStats = {
    fastest: { resolver: string; time: number };
    slowest: { resolver: string; time: number };
    average: number;
    median: number;
    successRate: number;
  };

  type PerfResponse = {
    domain: string;
    recordType: string;
    timestamp: string;
    results: ResolverResult[];
    statistics: PerfStats;
  };

  const API_ENDPOINT = '/api/internal/diagnostics/dns-performance';
  const RECORD_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'] as const;
  const EXAMPLES = [
    { domain: 'example.com', type: 'NS', description: 'Example nameservers' },
    { domain: 'adobe.com', type: 'TXT', description: 'Adobe TXT' },
    { domain: 'bbc.co.uk', type: 'A', description: 'BBC UK' },
    { domain: 'slack.com', type: 'MX', description: 'Slack mail servers' },
    { domain: 'facebook.com', type: 'AAAA', description: 'Facebook IPv6' },
    { domain: 'ibm.com', type: 'SOA', description: 'IBM SOA' },
  ] as const;

  const PERF_RANGES = [
    { max: 20, class: 'excellent', label: 'Excellent' },
    { max: 50, class: 'good', label: 'Good' },
    { max: 100, class: 'acceptable', label: 'Acceptable' },
    { max: 200, class: 'slow', label: 'Slow' },
    { max: Infinity, class: 'very-slow', label: 'Very Slow' },
  ] as const;

  let domain = $state('');
  let recordType = $state('A');
  let loading = $state(false);
  let results = $state<PerfResponse | null>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);
  let abortController = $state<AbortController | null>(null);
  let requestId = $state(0);
  let showAdvanced = $state(false);
  let customResolvers = $state('');
  let includeDefaultResolvers = $state(true);
  let timeoutMs = $state(5000);

  const isInputValid = $derived.by(() => {
    const trimmed = domain.trim();
    if (!trimmed) return false;
    // Support underscores for _acme-challenge and similar
    const domainPattern = /^([a-zA-Z0-9_]([a-zA-Z0-9_-]{0,61}[a-zA-Z0-9_])?\.)+[a-zA-Z]{2,}$/;
    return domainPattern.test(trimmed);
  });

  const customResolversValid = $derived.by(() => {
    if (!customResolvers.trim()) return true;
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    const resolvers = customResolvers
      .split(/[\n,;]/)
      .map((r) => r.trim())
      .filter((r) => r);
    return resolvers.every((ip) => ipv4Pattern.test(ip) || ipv6Pattern.test(ip));
  });

  const sortedResults = $derived.by(() => {
    if (!results?.results) return [];
    return [...results.results].sort((a, b) =>
      a.success && b.success ? a.responseTime - b.responseTime : a.success ? -1 : 1,
    );
  });

  const successCount = $derived(results?.results.filter((r) => r.success).length ?? 0);
  const totalCount = $derived(results?.results.length ?? 0);
  const formattedTimestamp = $derived(results?.timestamp ? new Date(results.timestamp).toLocaleString() : '');
  const totalRecords = $derived(sortedResults.reduce((sum, r) => sum + (r.records?.length ?? 0), 0));
  const fastestResolver = $derived(results?.statistics.fastest.resolver ?? '');
  const performanceSpread = $derived(
    results ? Math.round((results.statistics.slowest.time - results.statistics.fastest.time) * 100) / 100 : 0,
  );

  function getPerformance(time: number) {
    const range = PERF_RANGES.find((r) => time < r.max)!;
    return { class: range.class, label: range.label };
  }

  async function testPerformance() {
    if (!isInputValid) return;

    // Cancel previous request
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    const currentRequestId = ++requestId;
    loading = true;
    error = null;
    results = null;

    try {
      const body: any = {
        domain: domain.trim(),
        recordType,
      };

      // Add custom resolvers if provided
      if (customResolvers.trim()) {
        const resolvers = customResolvers
          .split(/[\n,;]/)
          .map((r) => r.trim())
          .filter((r) => r);
        body.customResolvers = resolvers;
        body.includeDefaultResolvers = includeDefaultResolvers;
      }

      // Add custom timeout if different from default
      if (timeoutMs !== 5000) {
        body.timeoutMs = timeoutMs;
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // Ignore stale responses
      if (currentRequestId !== requestId) return;

      if (!response.ok) {
        let errorMsg = 'Failed to test DNS performance';
        try {
          const data = await response.json();
          errorMsg = data.message || errorMsg;
        } catch {
          errorMsg = await response.text();
        }
        throw new Error(errorMsg);
      }

      results = await response.json();
    } catch (err) {
      if (currentRequestId !== requestId) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      error = err instanceof Error ? err.message : 'An unexpected error occurred';
    } finally {
      if (currentRequestId === requestId) {
        loading = false;
      }
    }
  }

  function loadExample(index: number) {
    const example = EXAMPLES[index];
    domain = example.domain;
    recordType = example.type;
    selectedExampleIndex = index;
    testPerformance();
  }
</script>

<svelte:head>
  <title>DNS Query Performance Comparison | IP Calc</title>
  <meta
    name="description"
    content="Compare DNS resolver speeds across Google, Cloudflare, Quad9, and more. Find the fastest DNS server for your location to improve browsing speed."
  />
  <meta
    name="keywords"
    content="DNS performance, DNS speed test, DNS resolver comparison, fastest DNS, DNS latency, Cloudflare DNS, Google DNS, Quad9"
  />
</svelte:head>

<div class="card">
  <header class="card-header">
    <h1>DNS Query Performance Comparison</h1>
    <p>Compare response times across multiple DNS resolvers to find the fastest for your location</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each EXAMPLES as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(i)}
            use:tooltip={`Test ${example.domain} ${example.type} records`}
          >
            <h5>{example.description}</h5>
            <p>{example.domain} ({example.type})</p>
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
        testPerformance();
      }}
      aria-busy={loading}
    >
      <div class="form-group flex-grow">
        <label for="domain">Domain Name</label>
        <input
          id="domain"
          type="text"
          bind:value={domain}
          oninput={() => {
            selectedExampleIndex = null;
          }}
          placeholder="e.g., google.com"
          disabled={loading}
          autocomplete="off"
          inputmode="url"
          aria-invalid={!!(domain && !isInputValid)}
        />
      </div>
      <div class="form-group">
        <label for="recordType">Record Type</label>
        <select id="recordType" bind:value={recordType} disabled={loading}>
          {#each RECORD_TYPES as type (type)}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </div>
      <button type="submit" disabled={loading || !isInputValid} class="primary submit-btn" aria-busy={loading}>
        {#if loading}
          <Icon name="loader" size="sm" animate="spin" />
          Testing...
        {:else}
          <Icon name="zap" size="sm" />
          Test Performance
        {/if}
      </button>
    </form>

    <!-- Advanced Options -->
    <details class="advanced-options" bind:open={showAdvanced}>
      <summary>
        <Icon name="chevron-right" size="xs" />
        Advanced Options
      </summary>
      <div class="advanced-content">
        <div class="form-group">
          <label for="customResolvers">
            Custom DNS Servers
            <span class="help-text">One per line, or comma/semicolon separated</span>
          </label>
          <textarea
            id="customResolvers"
            bind:value={customResolvers}
            placeholder="1.0.0.1&#10;8.26.56.26&#10;or 1.0.0.1, 8.26.56.26"
            rows="3"
            disabled={loading}
            aria-invalid={!customResolversValid}
            aria-describedby={!customResolversValid ? 'customResolvers-error' : undefined}
          ></textarea>
          {#if !customResolversValid}
            <span id="customResolvers-error" class="error-text" role="alert">
              Invalid IP address format. Enter valid IPv4 or IPv6 addresses.
            </span>
          {/if}

          <div class="checkbox-group">
            <label for="includeDefaults">
              <input
                id="includeDefaults"
                type="checkbox"
                bind:checked={includeDefaultResolvers}
                disabled={loading || !customResolvers.trim()}
              />
              <span>Include default resolvers with custom servers</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="timeout">
            Query Timeout (ms)
            <span class="help-text">Max time to wait per resolver (1000-30000ms)</span>
          </label>
          <input
            id="timeout"
            type="number"
            bind:value={timeoutMs}
            min="1000"
            max="30000"
            step="500"
            disabled={loading}
            aria-describedby="timeout-help"
          />
          <span id="timeout-help" class="help-text">Default: 5000ms</span>
        </div>

        <div class="advanced-info">
          <Icon name="info" size="xs" />
          <p>Custom DNS servers must be valid IPv4 or IPv6 addresses. Duplicates will be removed automatically.</p>
        </div>
      </div>
    </details>
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
    <div class="card" role="status" aria-live="polite">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Testing DNS Resolvers</h3>
            <p>Querying {recordType} records for {domain}...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h2>Performance Results</h2>
      </div>

      <!-- Statistics Summary -->
      <div class="stats-summary">
        <div class="stat-card fastest">
          <Icon name="zap" size="md" />
          <div class="stat-content">
            <span class="stat-label">Fastest</span>
            <span class="stat-value">{results.statistics.fastest.resolver}</span>
            <span class="stat-detail">{results.statistics.fastest.time}ms</span>
          </div>
        </div>
        <div class="stat-card average">
          <Icon name="activity" size="md" />
          <div class="stat-content">
            <span class="stat-label">Average</span>
            <span class="stat-value">{results.statistics.average}ms</span>
            <span class="stat-detail">Median: {results.statistics.median}ms</span>
          </div>
        </div>
        <div class="stat-card slowest">
          <Icon name="clock" size="md" />
          <div class="stat-content">
            <span class="stat-label">Slowest</span>
            <span class="stat-value">{results.statistics.slowest.resolver}</span>
            <span class="stat-detail">{results.statistics.slowest.time}ms</span>
          </div>
        </div>
        <div class="stat-card success">
          <Icon name="check-circle" size="md" />
          <div class="stat-content">
            <span class="stat-label">Success Rate</span>
            <span class="stat-value">{results.statistics.successRate}%</span>
            <span class="stat-detail">{successCount}/{totalCount}</span>
          </div>
        </div>
      </div>

      <!-- Resolver Results -->
      <div class="resolvers-section">
        <h3>Resolver Comparison</h3>
        <div class="resolvers-list">
          {#each sortedResults as result (result.resolver)}
            {@const perf = result.success ? getPerformance(result.responseTime) : null}
            <div class="resolver-card" class:failed={!result.success}>
              <div class="resolver-header">
                <div class="resolver-info">
                  <strong>{result.resolverName}</strong>
                  <span class="resolver-ip">{result.resolver}</span>
                </div>
                {#if perf}
                  <div class="performance-badge {perf.class}">
                    <span class="time">{result.responseTime}ms</span>
                    <span class="label">{perf.label}</span>
                  </div>
                {:else}
                  <div class="error-badge">
                    <Icon name="x-circle" size="xs" />
                    Failed
                  </div>
                {/if}
              </div>

              {#if result.records?.length}
                <details class="records-details">
                  <summary>
                    <Icon name="chevron-right" size="xs" />
                    View {result.records.length} record{result.records.length === 1 ? '' : 's'}
                  </summary>
                  <div class="records-list">
                    {#each result.records as record (record)}
                      <code class="record-item">{record}</code>
                    {/each}
                  </div>
                </details>
              {/if}

              {#if result.error}
                <div class="error-message">
                  <Icon name="alert-circle" size="xs" />
                  <span>{result.error}</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Query Info -->
      <div class="query-info">
        <div class="info-item">
          <span class="label">Domain</span>
          <span class="value">{results.domain}</span>
        </div>
        <div class="info-item">
          <span class="label">Record Type</span>
          <span class="value">{results.recordType}</span>
        </div>
        <div class="info-item">
          <span class="label">Total Records</span>
          <span class="value">{totalRecords}</span>
        </div>
        <div class="info-item">
          <span class="label">Resolvers Tested</span>
          <span class="value">{successCount} of {totalCount} successful</span>
        </div>
        <div class="info-item">
          <span class="label">Performance Spread</span>
          <span class="value">{performanceSpread}ms</span>
        </div>
        <div class="info-item">
          <span class="label">Fastest</span>
          <span class="value">{fastestResolver}</span>
        </div>
        <div class="info-item">
          <span class="label">Tested</span>
          <span class="value">{formattedTimestamp}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Educational Content -->
<div class="info-sections">
  <div class="card">
    <div class="card-header">
      <h2>{dnsPerformanceContent.sections.whatIsDnsPerformance.title}</h2>
    </div>
    <div class="card-content">
      <p>{dnsPerformanceContent.sections.whatIsDnsPerformance.content}</p>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>{dnsPerformanceContent.sections.interpretingResults.title}</h2>
    </div>
    <div class="card-content">
      <p>{dnsPerformanceContent.sections.interpretingResults.content}</p>
      <div class="performance-ranges">
        {#each dnsPerformanceContent.sections.interpretingResults.ranges as range (range.range)}
          <div class="range-item {range.color}">
            <div class="range-header">
              <span class="range-time">{range.range}</span>
              <span class="range-perf">{range.performance}</span>
            </div>
            <p>{range.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>{dnsPerformanceContent.sections.publicResolvers.title}</h2>
    </div>
    <div class="card-content">
      <div class="resolvers-grid">
        {#each dnsPerformanceContent.sections.publicResolvers.resolvers as resolver (resolver.name)}
          <div class="resolver-info-card">
            <div class="resolver-info-header">
              <h4>
                {resolver.name} (<a href={`https://${resolver.ip}`} target="_blank" rel="nofollow">{resolver.ip}</a>)
              </h4>
            </div>
            <p class="resolver-desc">{resolver.description}</p>
            <div class="pros-cons">
              <div class="pros">
                <h5>
                  <Icon name="check-circle" size="xs" />
                  Pros
                </h5>
                <ul>
                  {#each resolver.pros as pro (pro)}
                    <li>{pro}</li>
                  {/each}
                </ul>
              </div>
              <div class="cons">
                <h5>
                  <Icon name="x-circle" size="xs" />
                  Cons
                </h5>
                <ul>
                  {#each resolver.cons as con (con)}
                    <li>{con}</li>
                  {/each}
                </ul>
              </div>
              <div class="best-for">
                <h5>
                  <Icon name="info-circle" size="xs" />
                  Best for
                </h5>
                <p>{resolver.bestFor}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>{dnsPerformanceContent.sections.optimization.title}</h2>
    </div>
    <div class="card-content">
      <div class="tips-list">
        {#each dnsPerformanceContent.sections.optimization.tips as tip (tip.tip)}
          <div class="tip-item">
            <h4>{tip.tip}</h4>
            <p>{tip.description}</p>
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

      select {
        padding: var(--spacing-sm);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-primary);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: var(--font-size-md);
        min-width: 120px;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .submit-btn {
      white-space: nowrap;
    }
  }

  .advanced-options {
    margin-top: var(--spacing-md);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);

    summary {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      cursor: pointer;
      user-select: none;
      font-weight: 600;
      color: var(--text-primary);
      transition: background var(--transition-fast);

      &:hover {
        background: var(--bg-tertiary);
      }

      :global(.icon) {
        transition: transform var(--transition-fast);
      }
    }

    &[open] summary :global(.icon) {
      transform: rotate(90deg);
    }

    .advanced-content {
      padding: 0 var(--spacing-md) var(--spacing-md) var(--spacing-md);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      label {
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2xs);

        .help-text {
          font-weight: 400;
          font-size: var(--font-size-xs);
          color: var(--text-tertiary);
        }
      }

      textarea,
      input[type='number'] {
        padding: var(--spacing-sm);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-primary);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: var(--font-size-sm);
        font-family: monospace;
        resize: vertical;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &::placeholder {
          color: var(--text-tertiary);
        }
      }

      textarea[aria-invalid='true'] {
        border-color: var(--color-error);
      }

      .error-text {
        font-size: var(--font-size-xs);
        color: var(--color-error);
        margin-top: calc(var(--spacing-xs) * -0.5);
      }

      .checkbox-group {
        margin-top: var(--spacing-xs);

        label {
          flex-direction: row;
          align-items: center;
          gap: var(--spacing-sm);
          cursor: pointer;
          font-weight: 400;

          input[type='checkbox'] {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: var(--color-primary);

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }

          span {
            color: var(--text-secondary);
          }
        }
      }
    }

    .advanced-info {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      background: color-mix(in srgb, var(--color-info) 6%, transparent);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--color-info);

      :global(.icon) {
        color: var(--color-info);
        margin-top: 2px;
      }

      p {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        line-height: 1.5;
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
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    :global(.icon) {
      color: var(--color-primary);
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
        font-size: var(--font-size-lg);
        font-weight: 700;
        color: var(--text-primary);
      }

      .stat-detail {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }
    }
  }

  .query-info {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    justify-content: space-evenly;

    .info-item {
      display: flex;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      background: var(--bg-tertiary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      text-align: center;

      .label {
        color: var(--text-tertiary);
        font-weight: 600;
      }

      .value {
        color: var(--text-primary);
        font-family: monospace;
      }
    }
  }

  .resolvers-section {
    margin-top: var(--spacing-lg);

    h3 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
    }
  }

  .resolvers-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .resolver-card {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    &.failed {
      opacity: 0.7;
    }

    .resolver-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);

      .resolver-info {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2xs);

        strong {
          font-size: var(--font-size-md);
          color: var(--text-primary);
        }

        .resolver-ip {
          font-size: var(--font-size-sm);
          color: var(--text-tertiary);
          font-family: monospace;
        }
      }
    }

    .performance-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      min-width: 90px;

      .time {
        font-size: var(--font-size-lg);
        font-weight: 700;
        font-family: monospace;
      }

      .label {
        font-size: var(--font-size-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      &.excellent {
        background: var(--color-success);
        color: var(--bg-primary);
      }

      &.good {
        background: color-mix(in srgb, var(--color-success), var(--color-info) 30%);
        color: var(--bg-primary);
      }

      &.acceptable {
        background: var(--color-warning);
        color: var(--bg-primary);
      }

      &.slow {
        background: color-mix(in srgb, var(--color-warning), var(--color-error) 30%);
        color: var(--bg-primary);
      }

      &.very-slow {
        background: var(--color-error);
        color: var(--bg-primary);
      }
    }

    .error-badge {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--color-error);
      color: var(--bg-primary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    .records-details {
      margin-top: var(--spacing-xs);

      summary {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        cursor: pointer;
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        user-select: none;
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
        transition: background var(--transition-fast);

        &:hover {
          background: var(--bg-tertiary);
        }

        :global(.icon) {
          transition: transform var(--transition-fast);
        }
      }

      &[open] summary :global(.icon) {
        transform: rotate(90deg);
      }

      .records-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        margin-top: var(--spacing-sm);
        padding-left: var(--spacing-md);

        .record-item {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-primary);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          color: var(--text-primary);
          word-break: break-all;
        }
      }
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: var(--spacing-sm);
      padding: var(--spacing-sm);
      background: color-mix(in srgb, var(--color-error), transparent 95%);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

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
      }
    }
  }

  .performance-ranges {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .range-item {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--border-primary);

    &.success {
      border-left-color: var(--color-success);
      .range-perf {
        color: var(--color-success);
      }
    }

    &.warning {
      border-left-color: var(--color-warning);
      .range-perf {
        color: var(--color-warning);
      }
    }

    &.error {
      border-left-color: var(--color-error);
      .range-perf {
        color: var(--color-error);
      }
    }

    .range-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-xs);

      .range-time {
        font-family: monospace;
        font-weight: 700;
        color: var(--text-primary);
      }

      .range-perf {
        font-size: var(--font-size-sm);
        font-weight: 600;
      }
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  .resolvers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .resolver-info-card {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    .resolver-info-header {
      margin-bottom: var(--spacing-sm);

      h4 {
        font-size: var(--font-size-md);
        color: var(--text-primary);
        a {
          color: var(--text-primary);
          text-decoration: underline;
        }
      }
    }

    .resolver-desc {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-md) 0;
    }

    .pros-cons {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);

      h5 {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        margin: 0 0 var(--spacing-xs) 0;
        font-size: var(--font-size-sm);
        color: var(--text-primary);
      }

      .pros :global(.icon) {
        color: var(--color-success);
      }

      .cons :global(.icon) {
        color: var(--color-error);
      }
      .best-for :global(.icon) {
        color: var(--color-info);
      }

      ul {
        margin: 0;
        padding-left: var(--spacing-lg);
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        line-height: 1.6;

        li {
          margin-bottom: var(--spacing-2xs);
        }
      }
    }

    .best-for {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  .tips-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .tip-item {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border-radius: var(--radius-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--color-primary);
      font-size: var(--font-size-md);
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.6;
    }
  }

  @media (max-width: 768px) {
    .inline-form {
      .submit-btn {
        width: 100%;
      }
    }

    .stats-summary {
      grid-template-columns: 1fr;
    }

    .query-info {
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .resolver-card .resolver-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .resolvers-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
