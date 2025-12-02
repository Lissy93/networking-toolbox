<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatDNSError } from '$lib/utils/dns-validation.js';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ActionButton from '$lib/components/common/ActionButton.svelte';
  import ResultsCard from '$lib/components/common/ResultsCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { t } from '$lib/stores/language';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://api.github.com');
  let origin = $state('https://example.com');
  let method = $state('GET');

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const examplesList = $derived([
    {
      url: 'https://api.github.com',
      origin: 'https://example.com',
      description: $t('diagnostics/http-cors-check.examples.github'),
    },
    {
      url: 'https://httpbin.org/get',
      origin: 'https://test.com',
      description: $t('diagnostics/http-cors-check.examples.httpbin'),
    },
    {
      url: 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m',
      origin: 'https://weather-app.com',
      description: $t('diagnostics/http-cors-check.examples.weather'),
    },
    {
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      origin: 'https://example.org',
      description: $t('diagnostics/http-cors-check.examples.placeholder'),
    },
  ]);

  const examples = useExamples(() => examplesList);

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
      diagnosticState.setError($t('diagnostics/http-cors-check.form.url.required'));
      return;
    }

    if (!trimmedOrigin) {
      diagnosticState.setError($t('diagnostics/http-cors-check.form.origin.required'));
      return;
    }

    try {
      new URL(trimmedUrl);
      new URL(trimmedOrigin);
    } catch {
      diagnosticState.setError($t('diagnostics/http-cors-check.form.origin.invalid'));
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

    if (!diagnosticState.results.analysis.corsEnabled) return $t('diagnostics/http-cors-check.results.status.noCors');
    if (diagnosticState.results.analysis.allowsOrigin) return $t('diagnostics/http-cors-check.results.status.allowed');
    return $t('diagnostics/http-cors-check.results.status.denied');
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
    <h1>{$t('diagnostics/http-cors-check.title')}</h1>
    <p>
      {$t('diagnostics/http-cors-check.description')}
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('diagnostics/http-cors-check.examples.title')}
    getLabel={(ex) => ex.url}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => $t('diagnostics/http-cors-check.examples.tooltip', { url: ex.url })}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics/http-cors-check.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="url" use:tooltip={$t('diagnostics/http-cors-check.form.url.tooltip')}>
            {$t('diagnostics/http-cors-check.form.url.label')}
            <input
              id="url"
              type="url"
              bind:value={url}
              placeholder={$t('diagnostics/http-cors-check.form.url.placeholder')}
              class:invalid={url && !isInputValid()}
              onchange={() => {
                examples.clear();
                if (isInputValid()) checkCORS();
              }}
            />
            {#if url && !isInputValid()}
              <span class="error-text">{$t('diagnostics/http-cors-check.form.url.error')}</span>
            {/if}
          </label>
        </div>

        <div class="form-group">
          <label for="origin" use:tooltip={$t('diagnostics/http-cors-check.form.origin.tooltip')}>
            {$t('diagnostics/http-cors-check.form.origin.label')}
            <input
              id="origin"
              type="url"
              bind:value={origin}
              placeholder={$t('diagnostics/http-cors-check.form.origin.placeholder')}
              class:invalid={origin && !isInputValid}
              onchange={() => {
                examples.clear();
                if (isInputValid()) checkCORS();
              }}
            />
            {#if origin && !isInputValid}
              <span class="error-text">{$t('diagnostics/http-cors-check.form.origin.error')}</span>
            {/if}
          </label>
        </div>

        <div class="form-group">
          <label for="method" use:tooltip={$t('diagnostics/http-cors-check.form.method.tooltip')}>
            {$t('diagnostics/http-cors-check.form.method.label')}
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
          loadingText={$t('diagnostics/http-cors-check.form.checking')}
          onclick={checkCORS}
        >
          {$t('diagnostics/http-cors-check.form.checkButton')}
        </ActionButton>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <ResultsCard
      title={$t('diagnostics/http-cors-check.results.title')}
      onCopy={copyResults}
      copied={clipboard.isCopied()}
    >
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
              <div class="status-text">{$t('diagnostics/http-cors-check.results.corsStatus')}</div>
            </div>
          </div>

          <div class="status-item">
            <Icon name="shield" size="sm" />
            <div>
              <strong>{diagnosticState.results.preflight.status || 'Failed'}</strong>
              <div class="status-text">{$t('diagnostics/http-cors-check.results.preflightStatus')}</div>
            </div>
          </div>

          {#if diagnosticState.results.analysis.maxAge}
            <div class="status-item">
              <Icon name="clock" size="sm" />
              <div>
                <strong>{diagnosticState.results.analysis.maxAge}s</strong>
                <div class="status-text">{$t('diagnostics/http-cors-check.results.cacheMaxAge')}</div>
              </div>
            </div>
          {/if}
        </div>

        <!-- CORS Analysis Details -->
        <div class="record-section">
          <h4>{$t('diagnostics/http-cors-check.results.policyDetails')}</h4>
          <div class="cors-analysis">
            <div class="cors-item {getAccessClass(diagnosticState.results.analysis.corsEnabled)}">
              <Icon name={diagnosticState.results.analysis.corsEnabled ? 'check' : 'x'} size="sm" />
              <div>
                <strong>{$t('diagnostics/http-cors-check.results.corsEnabled')}</strong>
                <p>
                  {diagnosticState.results.analysis.corsEnabled
                    ? $t('diagnostics/http-cors-check.results.corsEnabledText')
                    : $t('diagnostics/http-cors-check.results.corsDisabledText')}
                </p>
              </div>
            </div>

            <div class="cors-item {getAccessClass(diagnosticState.results.analysis.allowsOrigin)}">
              <Icon name={getAccessIcon(diagnosticState.results.analysis.allowsOrigin)} size="sm" />
              <div>
                <strong>{$t('diagnostics/http-cors-check.results.originAccess')}</strong>
                <p>
                  {#if diagnosticState.results.analysis.allowsOrigin}
                    {$t('diagnostics/http-cors-check.results.originAllowed', { origin })}
                  {:else}
                    {$t('diagnostics/http-cors-check.results.originDenied', { origin })}
                  {/if}
                </p>
              </div>
            </div>

            <div class="cors-item {getAccessClass(diagnosticState.results.analysis.allowsCredentials)}">
              <Icon name={diagnosticState.results.analysis.allowsCredentials ? 'check' : 'x'} size="sm" />
              <div>
                <strong>{$t('diagnostics/http-cors-check.results.credentialsSupport')}</strong>
                <p>
                  {diagnosticState.results.analysis.allowsCredentials
                    ? $t('diagnostics/http-cors-check.results.credentialsAllowed')
                    : $t('diagnostics/http-cors-check.results.credentialsNotAllowed')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Allowed Methods -->
        {#if diagnosticState.results.analysis.allowedMethods?.length > 0}
          <div class="record-section">
            <h4>{$t('diagnostics/http-cors-check.results.allowedMethods')}</h4>
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
            <h4>{$t('diagnostics/http-cors-check.results.allowedHeaders')}</h4>
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
            <h4>{$t('diagnostics/http-cors-check.results.corsHeaders')}</h4>
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
            <p>{$t('diagnostics/http-cors-check.results.corsEnabledNoDetails')}</p>
          </div>
        {:else}
          <div class="no-records">
            <Icon name="x-circle" size="md" />
            <p>{$t('diagnostics/http-cors-check.results.noCorsHeaders')}</p>
            <p class="help-text">
              {$t('diagnostics/http-cors-check.results.noCorsHeadersHelp')}
            </p>
          </div>
        {/if}
      </div>
    </ResultsCard>
  {/if}

  <ErrorCard title={$t('diagnostics/http-cors-check.errors.title')} error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/http-cors-check.about.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/http-cors-check.about.whatIs.title')}</h4>
          <p>
            {$t('diagnostics/http-cors-check.about.whatIs.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/http-cors-check.about.preflight.title')}</h4>
          <p>
            {$t('diagnostics/http-cors-check.about.preflight.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/http-cors-check.about.headers.title')}</h4>
          <ul>
            <li>
              <strong>Access-Control-Allow-Origin:</strong>
              {$t('diagnostics/http-cors-check.about.headers.allowOrigin')}
            </li>
            <li>
              <strong>Access-Control-Allow-Methods:</strong>
              {$t('diagnostics/http-cors-check.about.headers.allowMethods')}
            </li>
            <li>
              <strong>Access-Control-Allow-Headers:</strong>
              {$t('diagnostics/http-cors-check.about.headers.allowHeaders')}
            </li>
            <li>
              <strong>Access-Control-Allow-Credentials:</strong>
              {$t('diagnostics/http-cors-check.about.headers.allowCredentials')}
            </li>
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
