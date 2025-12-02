<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatDNSError } from '$lib/utils/dns-validation.js';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics/http-redirect-trace');
  });

  let url = $state('https://bit.ly/3example');
  let maxRedirects = $state(10);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const examplesList = [
    { url: 'https://httpbin.org/redirect/3', description: '3-hop redirect chain' },
    { url: 'https://bit.ly/3example', description: $t('examples.types.urlShortener') },
    { url: 'https://httpbin.org/absolute-redirect/2', description: $t('examples.types.absolute') },
    { url: 'https://httpbin.org/redirect-to?url=https://example.com', description: $t('examples.types.external') },
    { url: 'https://httpbin.org/redirect/5', description: '5-hop redirect chain' },
    { url: 'https://httpbin.org/relative-redirect/2', description: $t('examples.types.relative') },
  ];

  const examples = useExamples(() => examplesList);

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

  async function traceRedirects() {
    // Validation
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      diagnosticState.setError($t('form.url.required'));
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      diagnosticState.setError($t('form.url.invalidFormat'));
      return;
    }

    if (maxRedirects < 1 || maxRedirects > 50) {
      diagnosticState.setError('Max redirects must be between 1 and 50');
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redirect-trace',
          url: trimmedUrl,
          maxRedirects,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Redirect trace failed (${response.status})`;

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
    examples.select(index);
    traceRedirects();
  }

  async function copyResults() {
    if (!diagnosticState.results?.redirectChain) return;

    let text = `Redirect Chain Analysis\nOriginal URL: ${url}\nTotal Redirects: ${diagnosticState.results.totalRedirects}\n\n`;

    (
      diagnosticState.results as {
        redirectChain: Array<{ url: string; status: number; location?: string; duration: number }>;
      }
    ).redirectChain.forEach((step, i: number) => {
      text += `${i + 1}. ${step.url}\n`;
      text += `   Status: ${step.status}\n`;
      if (step.location) {
        text += `   Location: ${step.location}\n`;
      }
      text += '\n';
    });

    text += `Final URL: ${diagnosticState.results.finalUrl}\nFinal Status: ${diagnosticState.results.finalStatus}`;

    await clipboard.copy(text);
  }

  function getStatusClass(status: number): string {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'warning';
    if (status >= 400) return 'error';
    return '';
  }

  function getStatusIcon(status: number): string {
    if (status >= 200 && status < 300) return 'check-circle';
    if (status >= 300 && status < 400) return 'arrow-right';
    if (status >= 400) return 'alert-triangle';
    return 'circle';
  }

  function hasHSTS(headers: Record<string, string>): boolean {
    return !!headers['strict-transport-security'];
  }

  function isSecureRedirect(fromUrl: string, toUrl: string): boolean {
    try {
      const from = new URL(fromUrl);
      const to = new URL(toUrl);
      return from.protocol === 'http:' && to.protocol === 'https:';
    } catch {
      return false;
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('title')}</h1>
    <p>
      Follow and analyze HTTP redirect chains to understand the complete journey from initial URL to final destination.
      Track status codes, locations, and security implications.
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('examples.title')}
    getLabel={(ex) => ex.url}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Trace redirects for ${ex.url}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="url" use:tooltip={$t('form.url.tooltip')}>
            {$t('form.url.label')}
            <input
              id="url"
              type="url"
              bind:value={url}
              placeholder="https://bit.ly/example"
              class:invalid={url && !isInputValid()}
              onchange={() => {
                if (isInputValid()) traceRedirects();
              }}
            />
            {#if url && !isInputValid()}
              <span class="error-text">{$t('form.url.invalidFormat')}</span>
            {/if}
          </label>
        </div>

        <div class="form-group">
          <label for="maxRedirects" use:tooltip={$t('form.maxRedirects.tooltip')}>
            {$t('form.maxRedirects.label')}
            <input
              id="maxRedirects"
              type="number"
              bind:value={maxRedirects}
              min="1"
              max="50"
              onchange={() => {
                if (isInputValid()) traceRedirects();
              }}
            />
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={traceRedirects} disabled={diagnosticState.loading || !isInputValid}>
          {#if diagnosticState.loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('form.tracing')}
          {:else}
            <Icon name="link" size="sm" />
            {$t('form.trace')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>{$t('results.title')}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={clipboard.isCopied()}>
          <span class={clipboard.isCopied() ? 'text-green-500' : ''}
            ><Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" /></span
          >
          {clipboard.isCopied() ? $t('results.copied') : $t('results.copyChain')}
        </button>
      </div>
      <div class="card-content">
        <!-- Summary -->
        <div class="status-overview">
          <div class="status-item">
            <Icon name="link" size="sm" />
            <div>
              <strong>{diagnosticState.results.totalRedirects}</strong>
              <div class="status-text">{$t('results.stats.totalRedirects')}</div>
            </div>
          </div>

          <div class="status-item {getStatusClass(diagnosticState.results.finalStatus)}">
            <Icon name={getStatusIcon(diagnosticState.results.finalStatus)} size="sm" />
            <div>
              <strong>{diagnosticState.results.finalStatus}</strong>
              <div class="status-text">{$t('results.stats.finalStatus')}</div>
            </div>
          </div>

          {#if diagnosticState.results.timings}
            <div class="status-item">
              <Icon name="clock" size="sm" />
              <div>
                <strong>{diagnosticState.results.timings.total.toFixed(0)}ms</strong>
                <div class="status-text">{$t('results.stats.totalTime')}</div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Redirect Chain -->
        {#if diagnosticState.results.redirectChain?.length > 0}
          <div class="record-section">
            <h4>{$t('results.chain.title')}</h4>
            <div class="redirect-chain">
              {#each diagnosticState.results.redirectChain as step, i (i)}
                <div class="redirect-step">
                  <div class="step-number">{i + 1}</div>
                  <div class="step-content">
                    <div class="step-header">
                      <div class="step-status {getStatusClass(step.status)}">
                        <Icon name={getStatusIcon(step.status)} size="xs" />
                        {step.status}
                      </div>
                      {#if hasHSTS(step.headers)}
                        <div class="security-badge" use:tooltip={$t('results.security.hstsPresent')}>
                          <Icon name="shield" size="xs" />
                          HSTS
                        </div>
                      {/if}
                      {#if i < diagnosticState.results.redirectChain.length - 1 && isSecureRedirect(step.url, step.location)}
                        <div class="security-badge success" use:tooltip={$t('results.security.httpsUpgrade')}>
                          <Icon name="shield-check" size="xs" />
                          Secure Upgrade
                        </div>
                      {/if}
                    </div>
                    <div class="step-url mono">{step.url}</div>
                    {#if step.location}
                      <div class="step-location">
                        <Icon name="arrow-right" size="xs" />
                        <span class="mono">{step.location}</span>
                      </div>
                    {/if}
                  </div>
                </div>

                {#if i < diagnosticState.results.redirectChain.length - 1}
                  <div class="redirect-arrow">
                    <Icon name="chevron-down" size="sm" />
                  </div>
                {/if}
              {/each}
            </div>
          </div>

          <div class="record-section">
            <h4>{$t('results.chain.finalDestination')}</h4>
            <div class="final-destination">
              <div class="final-status {getStatusClass(diagnosticState.results.finalStatus)}">
                <Icon name={getStatusIcon(diagnosticState.results.finalStatus)} size="sm" />
                {diagnosticState.results.finalStatus}
              </div>
              <div class="final-url mono">{diagnosticState.results.finalUrl}</div>
            </div>
          </div>
        {:else}
          <div class="no-records">
            <Icon name="info" size="md" />
            <p>{$t('results.chain.noRedirects')}</p>
            <p class="help-text">Final URL: {diagnosticState.results.finalUrl}</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <ErrorCard title={$t('results.chain.failed')} error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('education.redirectTypes.title')}</h4>
          <ul>
            <li><strong>301:</strong> Permanent redirect</li>
            <li><strong>302:</strong> Temporary redirect</li>
            <li><strong>303:</strong> See other (POST → GET)</li>
            <li><strong>307:</strong> Temporary (preserve method)</li>
            <li><strong>308:</strong> Permanent (preserve method)</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('education.security.title')}</h4>
          <ul>
            <li><strong>{$t('education.security.hsts')}</strong> {$t('education.security.hstsDescription')}</li>
            <li>
              <strong>{$t('education.security.httpsUpgrade')}</strong>
              {$t('education.security.httpsDescription')}
            </li>
            <li>
              <strong>{$t('education.security.openRedirects')}</strong>
              {$t('education.security.openDescription')}
            </li>
            <li><strong>{$t('education.security.loops')}</strong> {$t('education.security.loopsDescription')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('education.performance.title')}</h4>
          <p>
            Each redirect adds latency. Minimize redirect chains for better performance. Use 301/308 for permanent moves
            and 302/307 for temporary ones.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .redirect-chain {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .redirect-step {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .step-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;

    &.success {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
    }

    &.warning {
      background: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
    }

    &.error {
      background: color-mix(in srgb, var(--color-error), transparent 90%);
      color: var(--color-error);
    }
  }

  .security-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: color-mix(in srgb, var(--color-info), transparent 90%);
    color: var(--color-info);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);

    &.success {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
    }
  }

  .step-url {
    font-size: var(--font-size-sm);
    word-break: break-all;
    margin-bottom: var(--spacing-xs);
  }

  .step-location {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    span {
      word-break: break-all;
    }
  }

  .redirect-arrow {
    display: flex;
    justify-content: center;
    color: var(--text-secondary);
    margin: var(--spacing-xs) 0;
  }

  .final-destination {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }

  .final-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-weight: 500;

    &.success {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
    }

    &.warning {
      background: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
    }

    &.error {
      background: color-mix(in srgb, var(--color-error), transparent 90%);
      color: var(--color-error);
    }
  }

  .final-url {
    flex: 1;
    word-break: break-all;
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--color-primary);
    color: var(--bg-primary);
    border-radius: 50%;
    font-size: var(--font-size-xs);
    font-weight: 500;
    margin-right: var(--spacing-sm);
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
  }

  // Page-specific styles only (common utilities moved to diagnostics-pages.scss)
</style>
