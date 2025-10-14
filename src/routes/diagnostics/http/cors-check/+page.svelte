<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatDNSError } from '$lib/utils/dns-validation.js';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ActionButton from '$lib/components/common/ActionButton.svelte';
  import ResultsCard from '$lib/components/common/ResultsCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://api.github.com');
  let origin = $state('https://example.com');
  let method = $state('GET');

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const examplesList = [
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

  const examples = useExamples(examplesList);

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
    diagnosticState.startOperation();

    // Validation
    const trimmedUrl = url.trim();
    const trimmedOrigin = origin.trim();

    if (!trimmedUrl) {
      diagnosticState.setError('URL is required');
      return;
    }

    if (!trimmedOrigin) {
      diagnosticState.setError('Origin is required');
      return;
    }

    try {
      new URL(trimmedUrl);
      new URL(trimmedOrigin);
    } catch {
      diagnosticState.setError('Invalid URL or Origin format');
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

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError(formatDNSError(err));
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    url = example.url;
    origin = example.origin;
    examples.select(index);
    checkCORS();
  }

  async function copyResults() {
    if (!diagnosticState.results) return;

    let text = `CORS Policy Analysis\nURL: ${url}\nOrigin: ${origin}\nMethod: ${method}\n\n`;

    text += `Preflight Status: ${diagnosticState.results.preflight.status}\n`;
    text += `Origin Allowed: ${diagnosticState.results.preflight.allowed ? 'Yes' : 'No'}\n`;
    text += `CORS Enabled: ${diagnosticState.results.analysis.corsEnabled ? 'Yes' : 'No'}\n\n`;

    if (diagnosticState.results.analysis.allowedMethods.length > 0) {
      text += `Allowed Methods: ${diagnosticState.results.analysis.allowedMethods.join(', ')}\n`;
    }

    if (diagnosticState.results.analysis.allowedHeaders.length > 0) {
      text += `Allowed Headers: ${diagnosticState.results.analysis.allowedHeaders.join(', ')}\n`;
    }

    text += `Credentials Allowed: ${diagnosticState.results.analysis.allowsCredentials ? 'Yes' : 'No'}\n`;

    if (diagnosticState.results.analysis.maxAge) {
      text += `Max Age: ${diagnosticState.results.analysis.maxAge} seconds\n`;
    }

    if (Object.keys(diagnosticState.results.preflight.headers || {}).length > 0) {
      text += '\nCORS Headers:\n';
      Object.entries(diagnosticState.results.preflight.headers).forEach(([key, value]) => {
        text += `${key}: ${value}\n`;
      });
    }

    await clipboard.copy(text);
  }

  function getAccessClass(allowed: boolean): string {
    return allowed ? 'success' : 'error';
  }

  function getAccessIcon(allowed: boolean): string {
    return allowed ? 'check-circle' : 'x-circle';
  }

  function getCORSStatusText(): string {
    if (!diagnosticState.results?.analysis) return 'Unknown';

    if (!diagnosticState.results.analysis.corsEnabled) return 'No CORS Policy';
    if (diagnosticState.results.analysis.allowsOrigin) return 'Access Allowed';
    return 'Access Denied';
  }

  function getCORSStatusClass(): string {
    if (!diagnosticState.results?.analysis) return '';

    if (!diagnosticState.results.analysis.corsEnabled) return 'warning';
    if (diagnosticState.results.analysis.allowsOrigin) return 'success';
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
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="CORS Examples"
    getLabel={(ex) => ex.url}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Test CORS policy for ${ex.url}`}
  />

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
                examples.clear();
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
                examples.clear();
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
                examples.clear();
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
        <ActionButton
          loading={diagnosticState.loading}
          disabled={!isInputValid}
          icon="globe"
          loadingText="Checking CORS..."
          onclick={checkCORS}
        >
          Check CORS Policy
        </ActionButton>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <ResultsCard title="CORS Policy Analysis" onCopy={copyResults} copied={clipboard.isCopied()}>
      <div class="card-content">
        <!-- CORS Overview -->
        <div class="status-overview">
          <div class="status-item {getCORSStatusClass()}">
            <Icon
              name={getAccessIcon(
                diagnosticState.results.analysis.corsEnabled && diagnosticState.results.analysis.allowsOrigin,
              )}
              size="sm"
            />
            <div>
              <strong>{getCORSStatusText()}</strong>
              <div class="status-text">CORS Status</div>
            </div>
          </div>

          <div class="status-item">
            <Icon name="shield" size="sm" />
            <div>
              <strong>{diagnosticState.results.preflight.status || 'Failed'}</strong>
              <div class="status-text">Preflight Status</div>
            </div>
          </div>

          {#if diagnosticState.results.analysis.maxAge}
            <div class="status-item">
              <Icon name="clock" size="sm" />
              <div>
                <strong>{diagnosticState.results.analysis.maxAge}s</strong>
                <div class="status-text">Cache Max Age</div>
              </div>
            </div>
          {/if}
        </div>

        <!-- CORS Analysis Details -->
        <div class="record-section">
          <h4>CORS Policy Details</h4>
          <div class="cors-analysis">
            <div class="cors-item {getAccessClass(diagnosticState.results.analysis.corsEnabled)}">
              <Icon name={diagnosticState.results.analysis.corsEnabled ? 'check' : 'x'} size="sm" />
              <div>
                <strong>CORS Enabled</strong>
                <p>
                  {diagnosticState.results.analysis.corsEnabled
                    ? 'Server has CORS headers configured'
                    : 'No CORS headers found - requests will be blocked by browsers'}
                </p>
              </div>
            </div>

            <div class="cors-item {getAccessClass(diagnosticState.results.analysis.allowsOrigin)}">
              <Icon name={getAccessIcon(diagnosticState.results.analysis.allowsOrigin)} size="sm" />
              <div>
                <strong>Origin Access</strong>
                <p>
                  {#if diagnosticState.results.analysis.allowsOrigin}
                    Origin '{origin}' is allowed to access this resource
                  {:else}
                    Origin '{origin}' is not allowed to access this resource
                  {/if}
                </p>
              </div>
            </div>

            <div class="cors-item {getAccessClass(diagnosticState.results.analysis.allowsCredentials)}">
              <Icon name={diagnosticState.results.analysis.allowsCredentials ? 'check' : 'x'} size="sm" />
              <div>
                <strong>Credentials Support</strong>
                <p>
                  {diagnosticState.results.analysis.allowsCredentials
                    ? 'Cookies and credentials can be sent'
                    : 'Cookies and credentials cannot be sent'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Allowed Methods -->
        {#if diagnosticState.results.analysis.allowedMethods?.length > 0}
          <div class="record-section">
            <h4>Allowed Methods</h4>
            <div class="method-list">
              {#each diagnosticState.results.analysis.allowedMethods as allowedMethod, index (index)}
                <span class="method-badge {method === allowedMethod ? 'active' : ''}">{allowedMethod}</span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Allowed Headers -->
        {#if diagnosticState.results.analysis.allowedHeaders?.length > 0}
          <div class="record-section">
            <h4>Allowed Headers</h4>
            <div class="header-list">
              {#each diagnosticState.results.analysis.allowedHeaders as header, index (index)}
                <span class="header-badge">{header}</span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Raw CORS Headers -->
        {#if Object.keys(diagnosticState.results.preflight.headers || {}).length > 0}
          <div class="record-section">
            <h4>CORS Headers</h4>
            <div class="records-list">
              {#each Object.entries(diagnosticState.results.preflight.headers) as [name, value] (name)}
                <div class="record-item">
                  <div class="record-data">
                    <strong>{name}:</strong>
                    {value}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if diagnosticState.results.analysis.corsEnabled}
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
    </ResultsCard>
  {/if}

  <ErrorCard title="CORS Check Failed" error={diagnosticState.error} />

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
