<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatDNSError } from '$lib/utils/dns-validation.js';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://api.github.com');
  let origin = $state('https://example.com');
  let method = $state('GET');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const examples = [
    { url: 'https://api.github.com', origin: 'https://example.com', description: 'GitHub API CORS policy' },
    { url: 'https://httpbin.org/get', origin: 'https://test.com', description: 'HTTPBin CORS test' },
    {
      url: 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m',
      origin: 'https://weather-app.com',
      description: 'Open weather API',
    },
    {
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      origin: 'https://example.org',
      description: 'JSON Placeholder API',
    },
  ];

  // Reactive validation
  const isInputValid = $derived(() => {
    const trimmedUrl = url.trim();
    const trimmedOrigin = origin.trim();

    if (!trimmedUrl || !trimmedOrigin) return false;

    try {
      const parsedUrl = new URL(trimmedUrl);
      const parsedOrigin = new URL(trimmedOrigin);
      return ['http:', 'https:'].includes(parsedUrl.protocol) && ['http:', 'https:'].includes(parsedOrigin.protocol);
    } catch {
      return false;
    }
  });

  async function checkCORS() {
    loading = true;
    error = null;
    results = null;

    // Validation
    const trimmedUrl = url.trim();
    const trimmedOrigin = origin.trim();

    if (!trimmedUrl) {
      error = 'URL is required';
      loading = false;
      return;
    }

    if (!trimmedOrigin) {
      error = 'Origin is required';
      loading = false;
      return;
    }

    try {
      new URL(trimmedUrl);
      new URL(trimmedOrigin);
    } catch {
      error = 'Invalid URL or Origin format';
      loading = false;
      return;
    }

    try {
      const response = await fetch('/api/internal/diagnostics/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cors-check',
          url: trimmedUrl,
          method,
          headers: {
            origin: trimmedOrigin,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `CORS check failed (${response.status})`;

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) errorMessage = errorData.message;
        } catch {
          // Intentionally empty
        }

        throw new Error(errorMessage);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = formatDNSError(err);
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0]) {
    url = example.url;
    origin = example.origin;
    checkCORS();
  }

  async function copyResults() {
    if (!results) return;

    let text = `CORS Policy Analysis\nURL: ${url}\nOrigin: ${origin}\nMethod: ${method}\n\n`;

    text += `Preflight Status: ${results.preflight.status}\n`;
    text += `Origin Allowed: ${results.preflight.allowed ? 'Yes' : 'No'}\n`;
    text += `CORS Enabled: ${results.analysis.corsEnabled ? 'Yes' : 'No'}\n\n`;

    if (results.analysis.allowedMethods.length > 0) {
      text += `Allowed Methods: ${results.analysis.allowedMethods.join(', ')}\n`;
    }

    if (results.analysis.allowedHeaders.length > 0) {
      text += `Allowed Headers: ${results.analysis.allowedHeaders.join(', ')}\n`;
    }

    text += `Credentials Allowed: ${results.analysis.allowsCredentials ? 'Yes' : 'No'}\n`;

    if (results.analysis.maxAge) {
      text += `Max Age: ${results.analysis.maxAge} seconds\n`;
    }

    if (Object.keys(results.preflight.headers || {}).length > 0) {
      text += '\nCORS Headers:\n';
      Object.entries(results.preflight.headers).forEach(([key, value]) => {
        text += `${key}: ${value}\n`;
      });
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }

  function getAccessClass(allowed: boolean): string {
    return allowed ? 'success' : 'error';
  }

  function getAccessIcon(allowed: boolean): string {
    return allowed ? 'check-circle' : 'x-circle';
  }

  function getCORSStatusText(): string {
    if (!results?.analysis) return 'Unknown';

    if (!results.analysis.corsEnabled) return 'No CORS Policy';
    if (results.analysis.allowsOrigin) return 'Access Allowed';
    return 'Access Denied';
  }

  function getCORSStatusClass(): string {
    if (!results?.analysis) return '';

    if (!results.analysis.corsEnabled) return 'warning';
    if (results.analysis.allowsOrigin) return 'success';
    return 'error';
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>CORS Policy Checker</h1>
    <p>
      Test Cross-Origin Resource Sharing (CORS) policies by sending preflight requests and analyzing the server's CORS
      configuration. Check if your origin is allowed to access the target resource.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>CORS Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (index)}
          <button class="example-card" onclick={() => loadExample(example)}>
            <h5>{example.url}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>CORS Test Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="url" use:tooltip={'Target API/resource URL to test CORS against'}>
            Target URL
            <input
              id="url"
              type="url"
              bind:value={url}
              placeholder="https://api.example.com"
              class:invalid={url && !isInputValid()}
              onchange={() => {
                if (isInputValid()) checkCORS();
              }}
            />
            {#if url && !isInputValid()}
              <span class="error-text">Invalid URL format</span>
            {/if}
          </label>
        </div>

        <div class="form-group">
          <label for="origin" use:tooltip={"Your website's origin (where the request would come from)"}>
            Origin
            <input
              id="origin"
              type="url"
              bind:value={origin}
              placeholder="https://yoursite.com"
              class:invalid={origin && !isInputValid}
              onchange={() => {
                if (isInputValid()) checkCORS();
              }}
            />
            {#if origin && !isInputValid}
              <span class="error-text">Invalid origin format</span>
            {/if}
          </label>
        </div>

        <div class="form-group">
          <label for="method" use:tooltip={'HTTP method to test in preflight request'}>
            Method
            <select
              id="method"
              bind:value={method}
              onchange={() => {
                if (isInputValid()) checkCORS();
              }}
            >
              {#each methods as methodOption (methodOption)}
                <option value={methodOption}>{methodOption}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={checkCORS} disabled={loading || !isInputValid}>
          {#if loading}
            <Icon name="loader-2" size="sm" animate="spin" />
            Checking CORS...
          {:else}
            <Icon name="globe" size="sm" />
            Check CORS Policy
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h3>CORS Policy Analysis</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- CORS Overview -->
        <div class="status-overview">
          <div class="status-item {getCORSStatusClass()}">
            <Icon name={getAccessIcon(results.analysis.corsEnabled && results.analysis.allowsOrigin)} size="sm" />
            <div>
              <strong>{getCORSStatusText()}</strong>
              <div class="status-text">CORS Status</div>
            </div>
          </div>

          <div class="status-item">
            <Icon name="shield" size="sm" />
            <div>
              <strong>{results.preflight.status || 'Failed'}</strong>
              <div class="status-text">Preflight Status</div>
            </div>
          </div>

          {#if results.analysis.maxAge}
            <div class="status-item">
              <Icon name="clock" size="sm" />
              <div>
                <strong>{results.analysis.maxAge}s</strong>
                <div class="status-text">Cache Max Age</div>
              </div>
            </div>
          {/if}
        </div>

        <!-- CORS Analysis Details -->
        <div class="record-section">
          <h4>CORS Policy Details</h4>
          <div class="cors-analysis">
            <div class="cors-item {getAccessClass(results.analysis.corsEnabled)}">
              <Icon name={results.analysis.corsEnabled ? 'check' : 'x'} size="sm" />
              <div>
                <strong>CORS Enabled</strong>
                <p>
                  {results.analysis.corsEnabled
                    ? 'Server has CORS headers configured'
                    : 'No CORS headers found - requests will be blocked by browsers'}
                </p>
              </div>
            </div>

            <div class="cors-item {getAccessClass(results.analysis.allowsOrigin)}">
              <Icon name={getAccessIcon(results.analysis.allowsOrigin)} size="sm" />
              <div>
                <strong>Origin Access</strong>
                <p>
                  {#if results.analysis.allowsOrigin}
                    Origin '{origin}' is allowed to access this resource
                  {:else}
                    Origin '{origin}' is not allowed to access this resource
                  {/if}
                </p>
              </div>
            </div>

            <div class="cors-item {getAccessClass(results.analysis.allowsCredentials)}">
              <Icon name={results.analysis.allowsCredentials ? 'check' : 'x'} size="sm" />
              <div>
                <strong>Credentials Support</strong>
                <p>
                  {results.analysis.allowsCredentials
                    ? 'Cookies and credentials can be sent'
                    : 'Cookies and credentials cannot be sent'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Allowed Methods -->
        {#if results.analysis.allowedMethods?.length > 0}
          <div class="record-section">
            <h4>Allowed Methods</h4>
            <div class="method-list">
              {#each results.analysis.allowedMethods as allowedMethod, index (index)}
                <span class="method-badge {method === allowedMethod ? 'active' : ''}">{allowedMethod}</span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Allowed Headers -->
        {#if results.analysis.allowedHeaders?.length > 0}
          <div class="record-section">
            <h4>Allowed Headers</h4>
            <div class="header-list">
              {#each results.analysis.allowedHeaders as header, index (index)}
                <span class="header-badge">{header}</span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Raw CORS Headers -->
        {#if Object.keys(results.preflight.headers || {}).length > 0}
          <div class="record-section">
            <h4>CORS Headers</h4>
            <div class="records-list">
              {#each Object.entries(results.preflight.headers) as [name, value] (name)}
                <div class="record-item">
                  <div class="record-data">
                    <strong>{name}:</strong>
                    {value}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if results.analysis.corsEnabled}
          <div class="no-records">
            <Icon name="info" size="md" />
            <p>CORS enabled but no detailed headers available</p>
          </div>
        {:else}
          <div class="no-records">
            <Icon name="x-circle" size="md" />
            <p>No CORS headers found</p>
            <p class="help-text">
              The server does not provide CORS headers - cross-origin requests will be blocked by browsers
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>CORS Check Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About CORS</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>What is CORS?</h4>
          <p>
            Cross-Origin Resource Sharing (CORS) is a security mechanism that allows or restricts web pages from making
            requests to a different domain, protocol, or port than the one serving the web page.
          </p>
        </div>

        <div class="info-section">
          <h4>Preflight Requests</h4>
          <p>
            For certain requests, browsers send a preflight OPTIONS request to check if the actual request is allowed.
            The server responds with CORS headers indicating permissions.
          </p>
        </div>

        <div class="info-section">
          <h4>Common CORS Headers</h4>
          <ul>
            <li><strong>Access-Control-Allow-Origin:</strong> Allowed origins</li>
            <li><strong>Access-Control-Allow-Methods:</strong> Allowed HTTP methods</li>
            <li><strong>Access-Control-Allow-Headers:</strong> Allowed request headers</li>
            <li><strong>Access-Control-Allow-Credentials:</strong> Cookie support</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .cors-analysis {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .cors-item {
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

    &.error {
      border-color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 95%);
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
      line-height: 1.4;
    }
  }

  .method-list,
  .header-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .method-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    font-family: var(--font-mono);

    &.active {
      background: var(--color-primary);
      color: var(--bg-secondary);
      border-color: var(--color-primary);
    }
  }

  .header-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-family: var(--font-mono);
    color: var(--text-primary);
  }

  // Page-specific styles only (common utilities moved to diagnostics-pages.scss)
</style>
