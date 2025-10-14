<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://example.com');

  const diagnosticState = useDiagnosticState<any>();

  const examplesList = [
    { url: 'https://httpbin.org/gzip', description: 'HTTPBin gzip test' },
    { url: 'https://www.google.com', description: 'Google (likely compressed)' },
    { url: 'https://github.com', description: 'GitHub (modern compression)' },
    { url: 'https://www.cloudflare.com', description: 'Cloudflare (brotli support)' },
  ];

  const examples = useExamples(examplesList);

  const isInputValid = $derived(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return false;
    try {
      const parsed = new URL(trimmedUrl);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  });

  async function checkCompression() {
    if (!isInputValid) {
      diagnosticState.setError('Please enter a valid HTTP/HTTPS URL');
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compression',
          url: url.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check compression');
      }

      diagnosticState.setResults(data);
    } catch (err) {
      diagnosticState.setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    url = example.url;
    examples.select(index);
    checkCompression();
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  function getCompressionIcon(encoding: string): string {
    switch (encoding.toLowerCase()) {
      case 'gzip':
        return 'archive';
      case 'br':
      case 'brotli':
        return 'zap';
      case 'deflate':
        return 'compress';
      default:
        return 'file';
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>HTTP Compression Check</h1>
    <p>Test gzip, brotli, and deflate compression support and measure size differences</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Compression Examples"
    getLabel={(ex) => ex.url}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Test compression for ${ex.url}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>URL to Test</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="url">URL</label>
        <div class="input-flex-container">
          <input
            id="url"
            type="url"
            bind:value={url}
            placeholder="https://example.com"
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && checkCompression()}
          />
          <button onclick={checkCompression} disabled={diagnosticState.loading || !isInputValid} class="primary">
            {#if diagnosticState.loading}
              <Icon name="loader" size="sm" animate="spin" />
              Testing...
            {:else}
              <Icon name="search" size="sm" />
              Test Compression
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <ErrorCard title="Compression Test Failed" error={diagnosticState.error} />

  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Testing Compression</h3>
            <p>Checking support for gzip, brotli, and deflate compression...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>Compression Results</h3>
      </div>
      <div class="card-content">
        <!-- Overview -->
        <div class="card overview-section">
          <div class="card-header">
            <h3>Overview</h3>
          </div>
          <div class="card-content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Server Compression</div>
                <div class="stat-value" class:success={diagnosticState.results.serverCompression.enabled}>
                  <Icon
                    name={diagnosticState.results.serverCompression.enabled ? 'check-circle' : 'x-circle'}
                    size="sm"
                  />
                  {diagnosticState.results.serverCompression.enabled ? 'Enabled' : 'Disabled'}
                </div>
                {#if diagnosticState.results.serverCompression.encoding}
                  <div class="stat-detail">{diagnosticState.results.serverCompression.encoding}</div>
                {/if}
              </div>

              <div class="stat-card">
                <div class="stat-label">Best Compression</div>
                <div class="stat-value">
                  <Icon name={getCompressionIcon(diagnosticState.results.bestCompression.encoding)} size="sm" />
                  {diagnosticState.results.bestCompression.encoding}
                </div>
                <div class="stat-detail">{diagnosticState.results.bestCompression.ratio.toFixed(1)}% reduction</div>
              </div>

              <div class="stat-card">
                <div class="stat-label">Uncompressed Size</div>
                <div class="stat-value">{formatBytes(diagnosticState.results.uncompressed.size)}</div>
              </div>

              <div class="stat-card">
                <div class="stat-label">Time Taken</div>
                <div class="stat-value">{diagnosticState.results.timings.total}ms</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Compression Methods -->
        <div class="card methods-section">
          <div class="card-header">
            <h3>Compression Methods</h3>
          </div>
          <div class="card-content">
            <div class="compression-grid">
              {#each diagnosticState.results.compressionResults as result (result.encoding)}
                <div
                  class="compression-card"
                  class:best={result.encoding === diagnosticState.results.bestCompression.encoding}
                >
                  <div class="compression-header">
                    <div class="compression-type">
                      <Icon name={getCompressionIcon(result.encoding)} size="sm" />
                      <span class="encoding-name">{result.encoding}</span>
                    </div>
                    <div class="compression-status" class:success={result.supported} class:error={!result.supported}>
                      <Icon name={result.supported ? 'check' : 'x'} size="xs" />
                      {result.supported ? 'Supported' : 'Not Supported'}
                    </div>
                  </div>

                  {#if result.supported}
                    <div class="compression-stats">
                      <div class="size-comparison">
                        <div class="size-bar">
                          <div class="original-bar"></div>
                          <div
                            class="compressed-bar"
                            style="width: {(result.compressedSize / diagnosticState.results.uncompressed.size) * 100}%"
                          ></div>
                        </div>
                        <div class="size-labels">
                          <span class="original-size">{formatBytes(diagnosticState.results.uncompressed.size)}</span>
                          <span class="compressed-size">{formatBytes(result.compressedSize)}</span>
                        </div>
                      </div>

                      <div class="compression-metrics">
                        <div class="metric">
                          <span class="metric-label">Reduction:</span>
                          <span class="metric-value">{result.ratio.toFixed(1)}%</span>
                        </div>
                        <div class="metric">
                          <span class="metric-label">Time:</span>
                          <span class="metric-value">{result.responseTime}ms</span>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Headers -->
        <div class="card headers-section">
          <div class="card-header">
            <h3>Response Headers</h3>
          </div>
          <div class="card-content">
            <div class="headers-grid">
              {#each Object.entries(diagnosticState.results.headers) as [key, value] (key)}
                <div class="header-item">
                  <span class="header-key">{key}</span>
                  <span class="header-value">{value}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .overview-section,
  .methods-section,
  .headers-section {
    background: var(--bg-secondary);
  }

  .compression-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .compression-card {
    background: var(--color-surface-elevated);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    transition: all var(--transition-normal);

    &.best {
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 95%);
    }
  }

  .compression-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .compression-type {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 600;
  }

  .encoding-name {
    text-transform: uppercase;
    font-size: var(--font-size-sm);
    letter-spacing: 0.5px;
  }

  .compression-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-2xs);
    font-size: var(--font-size-xs);
    padding: var(--spacing-2xs) var(--spacing-xs);
    border-radius: var(--radius-sm);

    &.success {
      color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 90%);
    }

    &.error {
      color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 90%);
    }
  }

  .compression-stats {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .size-comparison {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .size-bar {
    position: relative;
    height: 8px;
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .original-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--color-warning);
    opacity: 0.3;
  }

  .compressed-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: var(--color-success);
    transition: width var(--transition-normal);
  }

  .size-labels {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .compression-metrics {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }

  .metric-label {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .metric-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .headers-grid {
    display: grid;
    gap: var(--spacing-xs);
  }

  .header-item {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs);
    background: var(--color-surface-elevated);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .header-key {
    font-weight: 600;
    color: var(--text-secondary);
    word-break: break-word;
  }

  .header-value {
    background: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-family: var(--font-mono);
    border-radius: var(--radius-sm);
    word-break: break-all;
  }

  @media (max-width: 768px) {
    .compression-grid {
      grid-template-columns: 1fr;
    }

    .header-item {
      grid-template-columns: 1fr;
      gap: var(--spacing-2xs);
    }
  }

  .results-card {
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      .card {
        width: 100%;
      }
    }
  }
</style>
