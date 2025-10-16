<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatDNSError } from '$lib/utils/dns-validation.js';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://www.google.com');
  let method = $state('GET');

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'];

  const examplesList = [
    { url: 'https://www.google.com', description: 'Google homepage performance' },
    { url: 'https://httpbin.org/delay/2', description: 'Delayed response (2s)' },
    { url: 'https://api.github.com', description: 'GitHub API response time' },
    { url: 'https://www.cloudflare.com', description: 'Cloudflare CDN performance' },
  ];

  const examples = useExamples(examplesList);

  // Reactive validation
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

  async function measurePerformance() {
    // Validation
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      diagnosticState.setError('URL is required');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      diagnosticState.setError('Invalid URL format');
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'perf',
          url: trimmedUrl,
          method,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Performance test failed (${response.status})`;

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) errorMessage = errorData.message;
        } catch {
          // Intentionally empty
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError(formatDNSError(err));
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    url = example.url;
    examples.select(index);
    measurePerformance();
  }

  async function copyResults() {
    if (!diagnosticState.results?.timings) return;

    let text = `HTTP Performance Analysis\nURL: ${diagnosticState.results.url}\nMethod: ${method}\nStatus: ${diagnosticState.results.status}\n\n`;

    text += `Performance Timing:\n`;
    text += `DNS Resolution: ${diagnosticState.results.timings.dns.toFixed(1)}ms ${diagnosticState.results.timings.dns_note ? `(${diagnosticState.results.timings.dns_note})` : ''}\n`;
    text += `TCP Connect: ${diagnosticState.results.timings.tcp.toFixed(1)}ms ${diagnosticState.results.timings.tcp_note ? `(${diagnosticState.results.timings.tcp_note})` : ''}\n`;

    if (diagnosticState.results.timings.tls > 0) {
      text += `TLS Handshake: ${diagnosticState.results.timings.tls.toFixed(1)}ms ${diagnosticState.results.timings.tls_note ? `(${diagnosticState.results.timings.tls_note})` : ''}\n`;
    }

    text += `Time to First Byte: ${diagnosticState.results.timings.ttfb.toFixed(1)}ms\n`;
    text += `Total Time: ${diagnosticState.results.timings.total.toFixed(1)}ms\n\n`;

    if (diagnosticState.results.size) {
      text += `Response Size: ${formatBytes(diagnosticState.results.size)}\n`;
    }

    text += `HTTPS: ${diagnosticState.results.performance.isHTTPS ? 'Yes' : 'No'}\n`;
    text += `Compression: ${diagnosticState.results.performance.hasCompression ? 'Yes' : 'No'}\n`;

    await clipboard.copy(text);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function getPerformanceClass(timing: number, thresholds: { good: number; fair: number }): string {
    if (timing <= thresholds.good) return 'success';
    if (timing <= thresholds.fair) return 'warning';
    return 'error';
  }

  function getPerformanceGrade(totalTime: number): { grade: string; class: string } {
    if (totalTime <= 200) return { grade: 'A', class: 'success' };
    if (totalTime <= 500) return { grade: 'B', class: 'success' };
    if (totalTime <= 1000) return { grade: 'C', class: 'warning' };
    if (totalTime <= 2000) return { grade: 'D', class: 'warning' };
    return { grade: 'F', class: 'error' };
  }

  function calculateThroughput(size: number, time: number): string {
    if (!size || !time) return 'Unknown';
    const bitsPerSecond = (size * 8) / (time / 1000);
    const mbps = bitsPerSecond / (1024 * 1024);
    return `${mbps.toFixed(2)} Mbps`;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>HTTP Performance Analyzer</h1>
    <p>
      Measure HTTP request performance including DNS resolution, TCP connection, TLS handshake, and response times. Get
      detailed timing breakdowns and performance insights.
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Performance Examples"
    getLabel={(ex) => ex.url}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Measure performance for ${ex.url}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Performance Test Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="url" use:tooltip={'Enter the URL to measure performance for'}>
            URL
            <input
              id="url"
              type="url"
              bind:value={url}
              placeholder="https://example.com"
              class:invalid={url && !isInputValid()}
              onchange={() => {
                if (isInputValid()) measurePerformance();
              }}
            />
            {#if url && !isInputValid()}
              <span class="error-text">Invalid URL format</span>
            {/if}
          </label>
        </div>

        <div class="form-group">
          <label for="method" use:tooltip={'HTTP method to use for the request'}>
            Method
            <select
              id="method"
              bind:value={method}
              onchange={() => {
                if (isInputValid()) measurePerformance();
              }}
            >
              {#each methods as methodOption, methodIndex (methodIndex)}
                <option value={methodOption}>{methodOption}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={measurePerformance} disabled={diagnosticState.loading || !isInputValid}>
          {#if diagnosticState.loading}
            <Icon name="loader" size="sm" animate="spin" />
            Measuring Performance...
          {:else}
            <Icon name="activity" size="sm" />
            Measure Performance
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    {@const grade = getPerformanceGrade(diagnosticState.results.timings.total)}
    <div class="card results-card">
      <div class="card-header">
        <h3>Performance Analysis</h3>
        <button class="copy-btn" onclick={copyResults} disabled={clipboard.isCopied()}>
          <span class={clipboard.isCopied() ? 'text-green-500' : ''}
            ><Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" /></span
          >
          {clipboard.isCopied() ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- Performance Overview -->
        <div class="status-overview">
          <div class="status-item {grade.class}">
            <Icon name="zap" size="sm" />
            <div>
              <strong>Grade {grade.grade}</strong>
              <div class="status-text">{diagnosticState.results.timings.total.toFixed(0)}ms Total</div>
            </div>
          </div>

          <div class="status-item">
            <Icon name="activity" size="sm" />
            <div>
              <strong>{diagnosticState.results.status}</strong>
              <div class="status-text">HTTP Status</div>
            </div>
          </div>

          {#if diagnosticState.results.size}
            <div class="status-item">
              <Icon name="file" size="sm" />
              <div>
                <strong>{formatBytes(diagnosticState.results.size)}</strong>
                <div class="status-text">Response Size</div>
              </div>
            </div>
          {/if}

          {#if diagnosticState.results.size && diagnosticState.results.timings.total}
            <div class="status-item">
              <Icon name="wifi" size="sm" />
              <div>
                <strong
                  >{calculateThroughput(diagnosticState.results.size, diagnosticState.results.timings.total)}</strong
                >
                <div class="status-text">Throughput</div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Timing Breakdown -->
        <div class="record-section">
          <h4>Performance Timing Breakdown</h4>
          <div class="timing-chart">
            <div
              class="timing-item {getPerformanceClass(diagnosticState.results.timings.dns, { good: 20, fair: 100 })}"
            >
              <div class="timing-label">
                <Icon name="globe" size="xs" />
                <span>DNS Resolution</span>
                {#if diagnosticState.results.timings.dns_note}
                  <span class="timing-note">({diagnosticState.results.timings.dns_note})</span>
                {/if}
              </div>
              <div class="timing-bar">
                <div
                  class="timing-fill"
                  style="width: {(diagnosticState.results.timings.dns / diagnosticState.results.timings.total) * 100}%"
                ></div>
              </div>
              <div class="timing-value">{diagnosticState.results.timings.dns.toFixed(1)}ms</div>
            </div>

            <div
              class="timing-item {getPerformanceClass(diagnosticState.results.timings.tcp, { good: 50, fair: 200 })}"
            >
              <div class="timing-label">
                <Icon name="link" size="xs" />
                <span>TCP Connect</span>
                {#if diagnosticState.results.timings.tcp_note}
                  <span class="timing-note">({diagnosticState.results.timings.tcp_note})</span>
                {/if}
              </div>
              <div class="timing-bar">
                <div
                  class="timing-fill"
                  style="width: {(diagnosticState.results.timings.tcp / diagnosticState.results.timings.total) * 100}%"
                ></div>
              </div>
              <div class="timing-value">{diagnosticState.results.timings.tcp.toFixed(1)}ms</div>
            </div>

            {#if diagnosticState.results.timings.tls > 0}
              <div
                class="timing-item {getPerformanceClass(diagnosticState.results.timings.tls, { good: 100, fair: 300 })}"
              >
                <div class="timing-label">
                  <Icon name="lock" size="xs" />
                  <span>TLS Handshake</span>
                  {#if diagnosticState.results.timings.tls_note}
                    <span class="timing-note">({diagnosticState.results.timings.tls_note})</span>
                  {/if}
                </div>
                <div class="timing-bar">
                  <div
                    class="timing-fill"
                    style="width: {(diagnosticState.results.timings.tls / diagnosticState.results.timings.total) *
                      100}%"
                  ></div>
                </div>
                <div class="timing-value">{diagnosticState.results.timings.tls.toFixed(1)}ms</div>
              </div>
            {/if}

            <div
              class="timing-item {getPerformanceClass(diagnosticState.results.timings.ttfb, { good: 200, fair: 500 })}"
            >
              <div class="timing-label">
                <Icon name="clock" size="xs" />
                <span>Time to First Byte</span>
              </div>
              <div class="timing-bar">
                <div
                  class="timing-fill"
                  style="width: {(diagnosticState.results.timings.ttfb / diagnosticState.results.timings.total) * 100}%"
                ></div>
              </div>
              <div class="timing-value">{diagnosticState.results.timings.ttfb.toFixed(1)}ms</div>
            </div>

            <div class="timing-item total">
              <div class="timing-label">
                <Icon name="zap" size="xs" />
                <span>Total Time</span>
              </div>
              <div class="timing-bar">
                <div class="timing-fill" style="width: 100%"></div>
              </div>
              <div class="timing-value">{diagnosticState.results.timings.total.toFixed(1)}ms</div>
            </div>
          </div>
        </div>

        <!-- Performance Features -->
        <div class="record-section">
          <h4>Connection Features</h4>
          <div class="feature-list">
            <div class="feature-item {diagnosticState.results.performance.isHTTPS ? 'success' : 'warning'}">
              <Icon name={diagnosticState.results.performance.isHTTPS ? 'shield' : 'shield-off'} size="sm" />
              <div>
                <strong>HTTPS</strong>
                <p>{diagnosticState.results.performance.isHTTPS ? 'Secure connection' : 'Unencrypted connection'}</p>
              </div>
            </div>

            <div class="feature-item {diagnosticState.results.performance.hasCompression ? 'success' : 'warning'}">
              <Icon name={diagnosticState.results.performance.hasCompression ? 'archive' : 'file'} size="sm" />
              <div>
                <strong>Compression</strong>
                <p>
                  {diagnosticState.results.performance.hasCompression
                    ? 'Response is compressed'
                    : 'No compression detected'}
                </p>
              </div>
            </div>

            <div class="feature-item">
              <Icon name="server" size="sm" />
              <div>
                <strong>HTTP Version</strong>
                <p>{diagnosticState.results.performance.httpVersion}</p>
              </div>
            </div>

            <div class="feature-item">
              <Icon name="repeat" size="sm" />
              <div>
                <strong>Connection Reuse</strong>
                <p>{diagnosticState.results.performance.connectionReused}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard title="Performance Test Failed" error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About HTTP Performance</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>Timing Components</h4>
          <ul>
            <li><strong>DNS:</strong> Domain name resolution time</li>
            <li><strong>TCP:</strong> TCP connection establishment</li>
            <li><strong>TLS:</strong> SSL/TLS handshake (HTTPS only)</li>
            <li><strong>TTFB:</strong> Server processing and response start</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Performance Grades</h4>
          <ul>
            <li><strong>A (≤200ms):</strong> Excellent performance</li>
            <li><strong>B (≤500ms):</strong> Good performance</li>
            <li><strong>C (≤1000ms):</strong> Acceptable performance</li>
            <li><strong>D/F (>1000ms):</strong> Poor performance</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Optimization Tips</h4>
          <p>
            Use CDN for faster response times, enable compression, implement HTTP/2, optimize DNS resolution, and
            consider connection keep-alive for multiple requests.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .timing-chart {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .timing-item {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);

    &.success {
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 95%);
    }

    &.warning {
      border-color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
    }

    &.error {
      border-color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 95%);
    }

    &.total {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary), transparent 90%);
      font-weight: 600;
    }
  }

  .timing-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    font-weight: 500;

    .timing-note {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-weight: normal;
      font-style: italic;
    }
  }

  .timing-bar {
    position: relative;
    height: 20px;
    background: color-mix(in srgb, var(--text-secondary), transparent 80%);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .timing-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: var(--radius-sm);
    transition: width 0.3s ease;
  }

  .timing-value {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: var(--font-size-sm);
    min-width: 60px;
    text-align: right;
  }

  .feature-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);

    &.success {
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 95%);
    }

    &.warning {
      border-color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
    }

    strong {
      color: var(--text-primary);
      margin-bottom: var(--spacing-xs);
      display: block;
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  // Page-specific styles only (common utilities moved to diagnostics-pages.scss)
</style>
