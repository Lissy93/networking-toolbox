<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatDNSError } from '$lib/utils/dns-validation.js';
  import { formatBytes, getStatusClass } from '$lib/utils/formatters.js';
  import { useDiagnosticState, useClipboard, useExamples, useSimpleValidation } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ActionButton from '$lib/components/common/ActionButton.svelte';
  import ResultsCard from '$lib/components/common/ResultsCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://example.com');
  let method = $state('GET');
  let customHeadersText = $state('');

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

  const examplesList = [
    { url: 'https://httpbin.org/get', method: 'GET', description: 'Basic GET request headers' },
    { url: 'https://api.github.com', method: 'HEAD', description: 'GitHub API headers (HEAD)' },
    { url: 'https://www.cloudflare.com', method: 'GET', description: 'Cloudflare response headers' },
    { url: 'https://httpbin.org/status/404', method: 'GET', description: '404 status response' },
    { url: 'https://httpbin.org/redirect/3', method: 'GET', description: 'Redirect chain headers' },
    { url: 'https://httpbin.org/gzip', method: 'GET', description: 'Compressed response headers' },
  ];

  const examples = useExamples(examplesList);

  // Reactive validation
  const validation = useSimpleValidation(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return false;
    try {
      const parsed = new URL(trimmedUrl);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  });

  function parseCustomHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!customHeadersText.trim()) return headers;

    const lines = customHeadersText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        if (key && value) {
          headers[key] = value;
        }
      }
    }
    return headers;
  }

  async function checkHeaders() {
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
      const customHeaders = parseCustomHeaders();

      const response = await fetch('/api/internal/diagnostics/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'headers',
          url: trimmedUrl,
          method,
          headers: customHeaders,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed (${response.status})`;

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) errorMessage = errorData.message;
        } catch {
          // Ignore JSON parse errors, use default message
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
    method = example.method;
    customHeadersText = '';
    examples.select(index);
    checkHeaders();
  }

  async function copyResults() {
    if (!diagnosticState.results?.headers) return;

    let text = `${method} ${diagnosticState.results.url}\nStatus: ${diagnosticState.results.status} ${diagnosticState.results.statusText}\n\nResponse Headers:\n`;
    Object.entries(diagnosticState.results.headers).forEach(([key, value]) => {
      text += `${key}: ${value}\n`;
    });

    if (diagnosticState.results.size) {
      text += `\nContent-Length: ${diagnosticState.results.size} bytes`;
    }

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>HTTP Headers Analyzer</h1>
    <p>
      Analyze HTTP response headers, status codes, and response metadata. Supports custom request methods and headers
      for comprehensive HTTP testing.
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Header Examples"
    getLabel={(ex) => `${ex.method} ${ex.url}`}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Analyze headers for ${ex.url}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Request Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="url" use:tooltip={'Enter the URL to analyze'}>
            URL
            <input
              id="url"
              type="url"
              bind:value={url}
              placeholder="https://example.com"
              class:invalid={url && !validation.isValid}
              onchange={() => {
                examples.clear();
                if (validation.isValid) checkHeaders();
              }}
            />
            {#if url && !validation.isValid}
              <span class="error-text">Invalid URL format</span>
            {/if}
          </label>
        </div>

        <div class="form-group">
          <label for="method" use:tooltip={'HTTP method to use'}>
            Method
            <select
              id="method"
              bind:value={method}
              onchange={() => {
                examples.clear();
                if (validation.isValid) checkHeaders();
              }}
            >
              {#each methods as methodOption (methodOption)}
                <option value={methodOption}>{methodOption}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="headers" use:tooltip={"Custom headers (one per line: 'Name: Value')"}>
          Custom Headers (Optional)
          <textarea
            id="headers"
            bind:value={customHeadersText}
            placeholder="User-Agent: My Custom Agent&#10;Authorization: Bearer token123"
            rows="3"
            onchange={() => {
              examples.clear();
              if (validation.isValid) checkHeaders();
            }}
          ></textarea>
        </label>
      </div>

      <div class="action-section">
        <ActionButton
          loading={diagnosticState.loading}
          disabled={!validation.isValid}
          icon="globe"
          loadingText="Analyzing Headers..."
          onclick={checkHeaders}
        >
          Analyze Headers
        </ActionButton>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <ResultsCard title="HTTP Response Analysis" onCopy={copyResults} copied={clipboard.isCopied()}>
      <!-- Status Overview -->
      <div class="status-overview">
        <div class="status-item {getStatusClass(diagnosticState.results.status)}">
          <Icon name="activity" size="sm" />
          <div>
            <strong>{diagnosticState.results.status} {diagnosticState.results.statusText}</strong>
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

        {#if diagnosticState.results.timings}
          <div class="status-item">
            <Icon name="clock" size="sm" />
            <div>
              <strong>{diagnosticState.results.timings.total.toFixed(0)}ms</strong>
              <div class="status-text">Total Time</div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Response Headers -->
      <div class="record-section card">
        <h4>Response Headers</h4>
        <div class="records-list">
          {#each Object.entries(diagnosticState.results.headers) as [name, value] (name)}
            <div class="record-item">
              <div class="record-data">
                <strong>{name}:</strong>
                {value}
              </div>
            </div>
          {/each}
        </div>
      </div>

      {#if diagnosticState.results.timings}
        <div class="record-section card">
          <h4>Performance Timing</h4>
          <div class="records-list">
            <div class="record-item">
              <div class="record-data">
                <strong>DNS Resolution:</strong> ~{diagnosticState.results.timings.dns.toFixed(1)}ms
              </div>
            </div>
            <div class="record-item">
              <div class="record-data">
                <strong>TCP Connect:</strong> ~{diagnosticState.results.timings.tcp.toFixed(1)}ms
              </div>
            </div>
            {#if diagnosticState.results.timings.tls > 0}
              <div class="record-item">
                <div class="record-data">
                  <strong>TLS Handshake:</strong> ~{diagnosticState.results.timings.tls.toFixed(1)}ms
                </div>
              </div>
            {/if}
            <div class="record-item">
              <div class="record-data">
                <strong>Time to First Byte:</strong> ~{diagnosticState.results.timings.ttfb.toFixed(1)}ms
              </div>
            </div>
          </div>
          <p class="help-text">* Timing values are approximations when not isolated</p>
        </div>
      {/if}
    </ResultsCard>
  {/if}

  <ErrorCard title="Request Failed" error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About HTTP Headers</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>Response Headers</h4>
          <p>
            HTTP headers provide metadata about the response, including content type, caching instructions, security
            policies, and server information.
          </p>
        </div>

        <div class="info-section">
          <h4>Status Codes</h4>
          <ul>
            <li><strong>2xx:</strong> Success responses</li>
            <li><strong>3xx:</strong> Redirection responses</li>
            <li><strong>4xx:</strong> Client error responses</li>
            <li><strong>5xx:</strong> Server error responses</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Common Headers</h4>
          <ul>
            <li><strong>Content-Type:</strong> MIME type of content</li>
            <li><strong>Cache-Control:</strong> Caching directives</li>
            <li><strong>Set-Cookie:</strong> Cookie instructions</li>
            <li><strong>Location:</strong> Redirect target URL</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .help-text {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-sm);
    font-style: italic;
  }

  textarea {
    resize: vertical;
    min-height: 80px;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .error-text {
    color: var(--text-error);
    font-size: var(--font-size-xs);
    margin-top: var(--spacing-xs);
  }

  // Page-specific styles only (common utilities moved to diagnostics-pages.scss)
</style>
