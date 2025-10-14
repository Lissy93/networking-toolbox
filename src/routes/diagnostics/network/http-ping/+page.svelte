<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://google.com');
  let method = $state('HEAD');
  let count = $state(5);
  let timeout = $state(10000);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const examplesList = [
    { url: 'https://google.com', method: 'HEAD', description: 'Google homepage' },
    { url: 'https://github.com', method: 'HEAD', description: 'GitHub homepage' },
    { url: 'https://api.github.com', method: 'GET', description: 'GitHub API' },
    { url: 'https://httpbin.org/delay/1', method: 'GET', description: 'Simulated 1s delay' },
    { url: 'https://www.cloudflare.com', method: 'HEAD', description: 'Cloudflare CDN' },
    { url: 'https://stackoverflow.com', method: 'HEAD', description: 'Stack Overflow' },
  ];

  const examples = useExamples(examplesList);

  const httpMethods = [
    { value: 'HEAD', label: 'HEAD', description: 'Headers only, fastest' },
    { value: 'GET', label: 'GET', description: 'Full response, more realistic' },
    { value: 'OPTIONS', label: 'OPTIONS', description: 'Preflight requests' },
  ];

  // Reactive validation
  const isUrlValid = $derived(() => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });

  const isInputValid = $derived(() => {
    return isUrlValid() && count >= 1 && count <= 20;
  });

  async function httpPing() {
    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'http-ping',
          url: url.trim(),
          method,
          count,
          timeout,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `HTTP ping failed (${response.status})`);
        } catch {
          throw new Error(`HTTP ping failed (${response.status})`);
        }
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError((err as Error).message);
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    url = example.url;
    method = example.method;
    count = 5;
    timeout = 10000;
    examples.select(index);
    httpPing();
  }

  function setMethod(newMethod: string) {
    method = newMethod;
    examples.clear();
    if (isInputValid()) httpPing();
  }

  function getLatencyClass(latency: number): string {
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 1000) return 'fair';
    return 'poor';
  }

  function getLatencyDescription(latency: number): string {
    if (latency < 100) return 'Excellent';
    if (latency < 300) return 'Good';
    if (latency < 1000) return 'Fair';
    return 'Poor';
  }

  async function copyResults() {
    if (!diagnosticState.results) return;

    let text = `HTTP Ping Results for ${diagnosticState.results.url}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;
    text += `Configuration:\n`;
    text += `  Method: ${diagnosticState.results.method}\n`;
    text += `  Count: ${diagnosticState.results.count}\n`;
    text += `  Timeout: ${timeout}ms\n\n`;
    text += `Summary:\n`;
    text += `  Successful: ${diagnosticState.results.successful}\n`;
    text += `  Failed: ${diagnosticState.results.failed}\n`;
    text += `  Success Rate: ${((diagnosticState.results.successful / diagnosticState.results.count) * 100).toFixed(1)}%\n\n`;

    if (diagnosticState.results.statistics && diagnosticState.results.successful > 0) {
      text += `Latency Statistics:\n`;
      text += `  Min: ${diagnosticState.results.statistics.min}ms\n`;
      text += `  Max: ${diagnosticState.results.statistics.max}ms\n`;
      text += `  Average: ${diagnosticState.results.statistics.avg}ms\n`;
      text += `  Median: ${diagnosticState.results.statistics.median}ms\n`;
      text += `  95th Percentile: ${diagnosticState.results.statistics.p95}ms\n\n`;
    }

    if (diagnosticState.results.latencies?.length > 0) {
      text += `Individual Results:\n`;
      diagnosticState.results.latencies.forEach((latency: number, i: number) => {
        text += `  Request ${i + 1}: ${latency}ms\n`;
      });
    }

    if (diagnosticState.results.errors?.length > 0) {
      text += `\nErrors:\n`;
      diagnosticState.results.errors.forEach((err: string, i: number) => {
        text += `  ${i + 1}: ${err}\n`;
      });
    }

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>HTTP Ping</h1>
    <p>
      Measure HTTP/HTTPS response latency by sending repeated requests and analyzing timing statistics. Alternative to
      ICMP ping for web services and APIs.
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="HTTP Ping Examples"
    getLabel={(ex) => ex.description}
    getDescription={(ex) => `${ex.url} (${ex.method})`}
    getTooltip={(ex) => `Ping ${ex.url} using ${ex.method} method`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>HTTP Ping Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group">
          <label for="url" use:tooltip={'Enter a complete HTTP or HTTPS URL'}>
            Target URL
            <input
              id="url"
              type="url"
              bind:value={url}
              placeholder="https://example.com"
              class:invalid={url && !isUrlValid()}
              onchange={() => {
                examples.clear();
                if (isInputValid()) httpPing();
              }}
            />
            {#if url && !isUrlValid()}
              <span class="error-text">Must be a valid HTTP or HTTPS URL</span>
            {/if}
          </label>
        </div>
      </div>

      <!-- HTTP Method Selection -->
      <div class="form-row">
        <div class="form-group">
          <h3>HTTP Method</h3>
          <div class="method-options">
            {#each httpMethods as methodOption, index (index)}
              <button
                type="button"
                class="method-btn"
                class:active={method === methodOption.value}
                onclick={() => setMethod(methodOption.value)}
                use:tooltip={methodOption.description}
              >
                {methodOption.label}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="form-row two-columns">
        <div class="form-group">
          <label for="count" use:tooltip={'Number of requests to send (1-20)'}>
            Request Count
            <input
              id="count"
              type="number"
              bind:value={count}
              min="1"
              max="20"
              onchange={() => {
                examples.clear();
                if (isInputValid()) httpPing();
              }}
            />
          </label>
        </div>
        <div class="form-group">
          <label for="timeout" use:tooltip={'Timeout per request in milliseconds'}>
            Timeout (ms)
            <input
              id="timeout"
              type="number"
              bind:value={timeout}
              min="1000"
              max="30000"
              step="1000"
              onchange={() => {
                examples.clear();
                if (isInputValid()) httpPing();
              }}
            />
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={httpPing} disabled={diagnosticState.loading || !isInputValid()}>
          {#if diagnosticState.loading}
            <Icon name="loader-2" size="sm" animate="spin" />
            Pinging...
          {:else}
            <Icon name="activity" size="sm" />
            Start HTTP Ping
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>HTTP Ping Results</h3>
        <button class="copy-btn" onclick={copyResults} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- Summary -->
        <div class="status-overview">
          <div class="status-item success">
            <Icon name="check-circle" size="sm" />
            <div>
              <span class="status-title">{diagnosticState.results.successful}/{diagnosticState.results.count}</span>
              <p class="status-desc">Successful requests</p>
            </div>
          </div>
          {#if diagnosticState.results.statistics?.avg}
            <div class="status-item {getLatencyClass(diagnosticState.results.statistics.avg)}">
              <Icon name="zap" size="sm" />
              <div>
                <span class="status-title">{diagnosticState.results.statistics.avg}ms</span>
                <p class="status-desc">
                  Average latency ({getLatencyDescription(diagnosticState.results.statistics.avg)})
                </p>
              </div>
            </div>
          {/if}
          {#if diagnosticState.results.failed > 0}
            <div class="status-item error">
              <Icon name="x-circle" size="sm" />
              <div>
                <span class="status-title">{diagnosticState.results.failed}</span>
                <p class="status-desc">Failed requests</p>
              </div>
            </div>
          {/if}
        </div>

        {#if diagnosticState.results.statistics && diagnosticState.results.successful > 0}
          <!-- Statistics -->
          <div class="stats-section">
            <h4>Latency Statistics</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Minimum:</span>
                <span class="stat-value">{diagnosticState.results.statistics.min}ms</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Maximum:</span>
                <span class="stat-value">{diagnosticState.results.statistics.max}ms</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Average:</span>
                <span class="stat-value">{diagnosticState.results.statistics.avg}ms</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Median:</span>
                <span class="stat-value">{diagnosticState.results.statistics.median}ms</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">95th Percentile:</span>
                <span class="stat-value">{diagnosticState.results.statistics.p95}ms</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Range:</span>
                <span class="stat-value"
                  >{diagnosticState.results.statistics.max - diagnosticState.results.statistics.min}ms</span
                >
              </div>
            </div>
          </div>

          <!-- Individual Results -->
          {#if diagnosticState.results.latencies?.length > 0}
            <div class="results-section">
              <h4>Individual Request Results</h4>
              <div class="requests-list">
                {#each diagnosticState.results.latencies as latency, i (i)}
                  <div class="request-item {getLatencyClass(latency)}">
                    <span class="request-number">#{i + 1}</span>
                    <span class="request-latency">{latency}ms</span>
                    <span class="request-status">{getLatencyDescription(latency)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}

        <!-- Errors -->
        {#if diagnosticState.results.errors?.length > 0}
          <div class="errors-section">
            <h4>Request Errors ({diagnosticState.results.errors.length})</h4>
            <div class="errors-list">
              {#each diagnosticState.results.errors as error, i (i)}
                <div class="error-item">
                  <span class="error-number">#{i + diagnosticState.results.successful + 1}</span>
                  <span class="error-message">{error}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Connection Info -->
        <div class="info-section">
          <h4>Request Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">URL:</span>
              <span class="detail-value mono">{diagnosticState.results.url}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Method:</span>
              <span class="detail-value">{diagnosticState.results.method}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Success Rate:</span>
              <span class="detail-value"
                >{((diagnosticState.results.successful / diagnosticState.results.count) * 100).toFixed(1)}%</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard title="HTTP Ping Failed" error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding HTTP Ping</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>HTTP vs ICMP Ping</h4>
          <ul>
            <li><strong>HTTP:</strong> Tests application layer connectivity</li>
            <li><strong>ICMP:</strong> Tests network layer connectivity</li>
            <li>HTTP ping better reflects real user experience</li>
            <li>Works through firewalls that block ICMP</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Request Methods</h4>
          <ul>
            <li><strong>HEAD:</strong> Headers only, fastest and most efficient</li>
            <li><strong>GET:</strong> Full response, more realistic timing</li>
            <li><strong>OPTIONS:</strong> Check allowed methods and CORS</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Latency Guidelines</h4>
          <ul>
            <li><strong>&lt; 100ms:</strong> Excellent response time</li>
            <li><strong>100-300ms:</strong> Good for most applications</li>
            <li><strong>300-1000ms:</strong> Acceptable but noticeable</li>
            <li><strong>&gt; 1000ms:</strong> Poor, may impact user experience</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .example-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }

  .example-url {
    background: var(--bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    word-break: break-all;
  }

  .example-method {
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    background: var(--color-primary);
    color: var(--bg-primary);
    border-radius: var(--radius-xs);
    align-self: flex-start;
    font-weight: 500;
  }

  .method-options {
    display: flex;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }

  .method-btn {
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover,
    &.active {
      background: var(--color-primary);
      color: var(--bg-primary);
      border-color: var(--color-primary);
    }
  }

  .status-title {
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-desc {
    font-size: var(--font-size-xs);
    margin: 2px 0 0 0;
    opacity: 0.8;
  }

  .stats-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--spacing-md);
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .results-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .requests-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--spacing-sm);
  }

  .request-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
    text-align: center;

    &.excellent {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      border-color: var(--color-success);
    }

    &.good {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      border-color: var(--color-success);
    }

    &.fair {
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      border-color: var(--color-warning);
    }

    &.poor {
      background: color-mix(in srgb, var(--color-error), transparent 95%);
      border-color: var(--color-error);
    }
  }

  .request-number {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .request-latency {
    font-weight: 600;
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .request-status {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .errors-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .errors-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .error-item {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
  }

  .error-number {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    font-weight: 500;
    flex-shrink: 0;
  }

  .error-message {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .info-section {
    margin-top: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .detail-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detail-value {
    color: var(--text-primary);
    font-weight: 500;
    word-break: break-all;
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>
