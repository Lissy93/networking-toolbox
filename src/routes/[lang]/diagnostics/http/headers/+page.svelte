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
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics/http-headers');
  });

  let url = $state('https://example.com');
  let method = $state('GET');
  let customHeadersText = $state('');

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

  const examplesList = [
    { url: 'https://httpbin.org/get', method: 'GET', description: 'get' },
    { url: 'https://api.github.com', method: 'HEAD', description: 'github' },
    { url: 'https://www.cloudflare.com', method: 'GET', description: 'cloudflare' },
    { url: 'https://httpbin.org/status/404', method: 'GET', description: 'status_404' },
    { url: 'https://httpbin.org/redirect/3', method: 'GET', description: 'redirect' },
    { url: 'https://httpbin.org/gzip', method: 'GET', description: 'gzip' },
  ];

  const examples = useExamples(() => examplesList);

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
      diagnosticState.setError($t('diagnostics/http-headers.form.url.required'));
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      diagnosticState.setError($t('diagnostics/http-headers.form.url.error'));
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
    <h1>{$t('diagnostics/http-headers.title')}</h1>
    <p>
      {$t('diagnostics/http-headers.description')}
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('diagnostics/http-headers.examples.title')}
    getLabel={(ex) => `${ex.method} ${ex.url}`}
    getDescription={(ex) => $t(`diagnostics/http-headers.examples.${ex.description}`)}
    getTooltip={(ex) => `Analyze headers for ${ex.url}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics/http-headers.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="url" use:tooltip={$t('diagnostics/http-headers.form.url.tooltip')}>
            {$t('diagnostics/http-headers.form.url.label')}
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
              <span class="error-text">{$t('diagnostics/http-headers.form.url.error')}</span>
            {/if}
          </label>
        </div>

        <div class="form-group">
          <label for="method" use:tooltip={$t('diagnostics/http-headers.form.method.tooltip')}>
            {$t('diagnostics/http-headers.form.method.label')}
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
        <label for="headers" use:tooltip={$t('diagnostics/http-headers.form.custom_headers.tooltip')}>
          {$t('diagnostics/http-headers.form.custom_headers.label')}
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
          loadingText={$t('diagnostics/http-headers.form.analyzing')}
          onclick={checkHeaders}
        >
          {$t('diagnostics/http-headers.form.analyze')}
        </ActionButton>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <ResultsCard
      title={$t('diagnostics/http-headers.results.title')}
      onCopy={copyResults}
      copied={clipboard.isCopied()}
    >
      <!-- Status Overview -->
      <div class="status-overview">
        <div class="status-item {getStatusClass(diagnosticState.results.status)}">
          <Icon name="activity" size="sm" />
          <div>
            <strong>{diagnosticState.results.status} {diagnosticState.results.statusText}</strong>
            <div class="status-text">{$t('diagnostics/http-headers.results.status.label')}</div>
          </div>
        </div>

        {#if diagnosticState.results.size}
          <div class="status-item">
            <Icon name="file" size="sm" />
            <div>
              <strong>{formatBytes(diagnosticState.results.size)}</strong>
              <div class="status-text">{$t('diagnostics/http-headers.results.status.response_size')}</div>
            </div>
          </div>
        {/if}

        {#if diagnosticState.results.timings}
          <div class="status-item">
            <Icon name="clock" size="sm" />
            <div>
              <strong>{diagnosticState.results.timings.total.toFixed(0)}ms</strong>
              <div class="status-text">{$t('diagnostics/http-headers.results.status.total_time')}</div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Response Headers -->
      <div class="record-section card">
        <h4>{$t('diagnostics/http-headers.results.headers.title')}</h4>
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
          <h4>{$t('diagnostics/http-headers.results.timing.title')}</h4>
          <div class="records-list">
            <div class="record-item">
              <div class="record-data">
                <strong>{$t('diagnostics/http-headers.results.timing.dns')}</strong>
                ~{diagnosticState.results.timings.dns.toFixed(1)}ms
              </div>
            </div>
            <div class="record-item">
              <div class="record-data">
                <strong>{$t('diagnostics/http-headers.results.timing.tcp')}</strong>
                ~{diagnosticState.results.timings.tcp.toFixed(1)}ms
              </div>
            </div>
            {#if diagnosticState.results.timings.tls > 0}
              <div class="record-item">
                <div class="record-data">
                  <strong>{$t('diagnostics/http-headers.results.timing.tls')}</strong>
                  ~{diagnosticState.results.timings.tls.toFixed(1)}ms
                </div>
              </div>
            {/if}
            <div class="record-item">
              <div class="record-data">
                <strong>{$t('diagnostics/http-headers.results.timing.ttfb')}</strong>
                ~{diagnosticState.results.timings.ttfb.toFixed(1)}ms
              </div>
            </div>
          </div>
          <p class="help-text">{$t('diagnostics/http-headers.results.timing.help')}</p>
        </div>
      {/if}
    </ResultsCard>
  {/if}

  <ErrorCard title={$t('diagnostics/http-headers.error.title')} error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/http-headers.info.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/http-headers.info.response.heading')}</h4>
          <p>
            {$t('diagnostics/http-headers.info.response.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/http-headers.info.status_codes.heading')}</h4>
          <ul>
            <li>
              <strong>{$t('diagnostics/http-headers.info.status_codes.2xx.name')}</strong>
              {$t('diagnostics/http-headers.info.status_codes.2xx.description')}
            </li>
            <li>
              <strong>{$t('diagnostics/http-headers.info.status_codes.3xx.name')}</strong>
              {$t('diagnostics/http-headers.info.status_codes.3xx.description')}
            </li>
            <li>
              <strong>{$t('diagnostics/http-headers.info.status_codes.4xx.name')}</strong>
              {$t('diagnostics/http-headers.info.status_codes.4xx.description')}
            </li>
            <li>
              <strong>{$t('diagnostics/http-headers.info.status_codes.5xx.name')}</strong>
              {$t('diagnostics/http-headers.info.status_codes.5xx.description')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/http-headers.info.common.heading')}</h4>
          <ul>
            <li>
              <strong>{$t('diagnostics/http-headers.info.common.content_type.name')}</strong>
              {$t('diagnostics/http-headers.info.common.content_type.description')}
            </li>
            <li>
              <strong>{$t('diagnostics/http-headers.info.common.cache_control.name')}</strong>
              {$t('diagnostics/http-headers.info.common.cache_control.description')}
            </li>
            <li>
              <strong>{$t('diagnostics/http-headers.info.common.set_cookie.name')}</strong>
              {$t('diagnostics/http-headers.info.common.set_cookie.description')}
            </li>
            <li>
              <strong>{$t('diagnostics/http-headers.info.common.location.name')}</strong>
              {$t('diagnostics/http-headers.info.common.location.description')}
            </li>
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
