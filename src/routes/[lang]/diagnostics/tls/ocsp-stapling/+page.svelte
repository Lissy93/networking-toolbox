<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics');
  });

  let hostname = $state('example.com');
  let port = $state('443');
  const diagnosticState = useDiagnosticState<any>();
  const examplesList = $derived([
    { host: 'cloudflare.com', port: '443', description: $t('diagnostics.ocsp-stapling.examples.cloudflare') },
    { host: 'www.digicert.com', port: '443', description: $t('diagnostics.ocsp-stapling.examples.digicert') },
    { host: 'github.com', port: '443', description: $t('diagnostics.ocsp-stapling.examples.github') },
  ]);
  const examples = useExamples(() => examplesList);

  async function checkOCSP() {
    if (!hostname?.trim()) {
      diagnosticState.setError($t('diagnostics.ocsp-stapling.form.hostname.error'));
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/tls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ocsp-stapling',
          hostname: hostname.trim().toLowerCase(),
          port: parseInt(port) || 443,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || $t('diagnostics.ocsp-stapling.errors.failedToCheck'));
      }

      diagnosticState.setResults(data);
    } catch (err) {
      diagnosticState.setError(err instanceof Error ? err.message : $t('common.errors.unknownError'));
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    hostname = example.host;
    port = example.port;
    examples.select(index);
    checkOCSP();
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString();
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics.ocsp-stapling.title')}</h1>
    <p>{$t('diagnostics.ocsp-stapling.description')}</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    getLabel={(ex) => `${ex.host}:${ex.port}`}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Check OCSP stapling for ${ex.host}:${ex.port}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics.ocsp-stapling.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="hostname">{$t('diagnostics.ocsp-stapling.form.hostname.label')}</label>
        <div class="input-flex-container">
          <input
            id="hostname"
            type="text"
            bind:value={hostname}
            placeholder={$t('diagnostics.ocsp-stapling.form.hostname.placeholder')}
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && checkOCSP()}
            class="flex-grow"
          />
          <input
            id="port"
            type="text"
            bind:value={port}
            placeholder={$t('diagnostics.ocsp-stapling.form.port.placeholder')}
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && checkOCSP()}
            class="port-input"
          />
          <button onclick={checkOCSP} disabled={diagnosticState.loading} class="primary">
            {#if diagnosticState.loading}
              <Icon name="loader" size="sm" animate="spin" />
              {$t('diagnostics.ocsp-stapling.form.checking')}
            {:else}
              <Icon name="search" size="sm" />
              {$t('diagnostics.ocsp-stapling.form.check')}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <ErrorCard title={$t('diagnostics.ocsp-stapling.errors.checkFailed')} error={diagnosticState.error} />

  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>{$t('diagnostics.ocsp-stapling.loading.title')}</h3>
            <p>{$t('diagnostics.ocsp-stapling.loading.description')}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>{$t('diagnostics.ocsp-stapling.results.title')}</h3>
      </div>
      <div class="card-content">
        <div class="results-section">
          <!-- OCSP Stapling Status Section -->
          <div class="card status-section">
            <div class="card-header">
              <h3>{$t('diagnostics.ocsp-stapling.results.status.title')}</h3>
            </div>
            <div class="card-content">
              {#if diagnosticState.results.staplingEnabled}
                <div class="status-card enabled">
                  <Icon name="check-circle" size="lg" />
                  <div class="status-content">
                    <h4>{$t('diagnostics.ocsp-stapling.results.status.enabled.title')}</h4>
                    <p>{$t('diagnostics.ocsp-stapling.results.status.enabled.description')}</p>
                  </div>
                </div>
              {:else}
                <div class="status-card disabled">
                  <Icon name="x-circle" size="lg" />
                  <div class="status-content">
                    <h4>{$t('diagnostics.ocsp-stapling.results.status.disabled.title')}</h4>
                    <p>{$t('diagnostics.ocsp-stapling.results.status.disabled.description')}</p>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- OCSP Response Details Section -->
          {#if diagnosticState.results.staplingEnabled && diagnosticState.results.ocspResponse}
            <div class="card response-section">
              <div class="card-header">
                <h3>{$t('diagnostics.ocsp-stapling.results.details.title')}</h3>
              </div>
              <div class="card-content">
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-label">{$t('diagnostics.ocsp-stapling.results.details.certificateStatus')}</div>
                    <div class="stat-value status-{diagnosticState.results.ocspResponse.certStatus.toLowerCase()}">
                      <Icon
                        name={diagnosticState.results.ocspResponse.certStatus.toLowerCase() === 'good'
                          ? 'check-circle'
                          : 'alert-circle'}
                        size="sm"
                      />
                      {diagnosticState.results.ocspResponse.certStatus}
                    </div>
                  </div>

                  <div class="stat-card">
                    <div class="stat-label">{$t('diagnostics.ocsp-stapling.results.details.responseStatus')}</div>
                    <div class="stat-value">
                      <Icon name="check-circle" size="sm" />
                      {diagnosticState.results.ocspResponse.responseStatus}
                    </div>
                  </div>

                  {#if diagnosticState.results.ocspResponse.thisUpdate}
                    <div class="stat-card">
                      <div class="stat-label">{$t('diagnostics.ocsp-stapling.results.details.thisUpdate')}</div>
                      <div class="stat-value mono">{formatDate(diagnosticState.results.ocspResponse.thisUpdate)}</div>
                    </div>
                  {/if}

                  {#if diagnosticState.results.ocspResponse.nextUpdate}
                    <div class="stat-card">
                      <div class="stat-label">{$t('diagnostics.ocsp-stapling.results.details.nextUpdate')}</div>
                      <div class="stat-value mono">{formatDate(diagnosticState.results.ocspResponse.nextUpdate)}</div>
                    </div>
                  {/if}

                  {#if diagnosticState.results.ocspResponse.producedAt}
                    <div class="stat-card">
                      <div class="stat-label">{$t('diagnostics.ocsp-stapling.results.details.producedAt')}</div>
                      <div class="stat-value mono">{formatDate(diagnosticState.results.ocspResponse.producedAt)}</div>
                    </div>
                  {/if}

                  {#if diagnosticState.results.ocspResponse.responderUrl}
                    <div class="stat-card full-width">
                      <div class="stat-label">{$t('diagnostics.ocsp-stapling.results.details.responderUrl')}</div>
                      <div class="stat-value mono">{diagnosticState.results.ocspResponse.responderUrl}</div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Response Validity Section -->
            {#if diagnosticState.results.ocspResponse.validity}
              <div class="card validity-section">
                <div class="card-header">
                  <h3>{$t('diagnostics.ocsp-stapling.results.validity.title')}</h3>
                </div>
                <div class="card-content">
                  <div class="validity-info">
                    <div class="validity-stats">
                      <div class="stat-card">
                        <div class="stat-label">{$t('diagnostics.ocsp-stapling.results.validity.validFor')}</div>
                        <div class="stat-value">{diagnosticState.results.ocspResponse.validity.validFor}</div>
                      </div>

                      {#if diagnosticState.results.ocspResponse.validity.expiresIn}
                        <div class="stat-card">
                          <div class="stat-label">{$t('diagnostics.ocsp-stapling.results.validity.expiresIn')}</div>
                          <div
                            class="stat-value"
                            class:expiring={diagnosticState.results.ocspResponse.validity.expiringSoon}
                          >
                            <Icon
                              name={diagnosticState.results.ocspResponse.validity.expiringSoon
                                ? 'alert-triangle'
                                : 'check-circle'}
                              size="sm"
                            />
                            {diagnosticState.results.ocspResponse.validity.expiresIn}
                          </div>
                        </div>
                      {/if}
                    </div>

                    {#if diagnosticState.results.ocspResponse.validity.percentage !== undefined}
                      <div class="validity-progress">
                        <div class="progress-header">
                          <span class="progress-label"
                            >{$t('diagnostics.ocsp-stapling.results.validity.progressLabel')}</span
                          >
                          <span class="progress-percentage"
                            >{diagnosticState.results.ocspResponse.validity.percentage}%</span
                          >
                        </div>
                        <div class="progress-bar">
                          <div
                            class="progress-fill"
                            style="width: {diagnosticState.results.ocspResponse.validity.percentage}%"
                          ></div>
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          {/if}

          <!-- Certificate Information Section -->
          {#if diagnosticState.results.certificate}
            <div class="card certificate-section">
              <div class="card-header">
                <h3>{$t('diagnostics.ocsp-stapling.results.certificate.title')}</h3>
              </div>
              <div class="card-content">
                <div class="cert-details">
                  <div class="cert-item">
                    <div class="cert-label">{$t('diagnostics.ocsp-stapling.results.certificate.subject')}</div>
                    <div class="cert-value mono">{diagnosticState.results.certificate.subject}</div>
                  </div>

                  <div class="cert-item">
                    <div class="cert-label">{$t('diagnostics.ocsp-stapling.results.certificate.issuer')}</div>
                    <div class="cert-value mono">{diagnosticState.results.certificate.issuer}</div>
                  </div>

                  {#if diagnosticState.results.certificate.ocspUrls && diagnosticState.results.certificate.ocspUrls.length > 0}
                    <div class="cert-item">
                      <div class="cert-label">{$t('diagnostics.ocsp-stapling.results.certificate.ocspUrls')}</div>
                      <div class="cert-urls">
                        {#each diagnosticState.results.certificate.ocspUrls as url (url)}
                          <div class="cert-url mono">{url}</div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          <!-- Recommendations Section -->
          {#if diagnosticState.results.recommendations && diagnosticState.results.recommendations.length > 0}
            <div class="card recommendations-section">
              <div class="card-header">
                <h3>{$t('diagnostics.ocsp-stapling.results.recommendations.title')}</h3>
              </div>
              <div class="card-content">
                <div class="recommendations-list">
                  {#each diagnosticState.results.recommendations as rec (rec)}
                    <div class="recommendation-item">
                      <Icon name="alert-triangle" size="sm" />
                      <span>{rec}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics.ocsp-stapling.educational.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics.ocsp-stapling.educational.whatIs.title')}</h4>
          <p>
            {$t('diagnostics.ocsp-stapling.educational.whatIs.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.ocsp-stapling.educational.whyImportant.title')}</h4>
          <ul>
            <li><strong>{$t('diagnostics.ocsp-stapling.educational.whyImportant.privacy')}</strong></li>
            <li><strong>{$t('diagnostics.ocsp-stapling.educational.whyImportant.performance')}</strong></li>
            <li><strong>{$t('diagnostics.ocsp-stapling.educational.whyImportant.reliability')}</strong></li>
            <li><strong>{$t('diagnostics.ocsp-stapling.educational.whyImportant.security')}</strong></li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.ocsp-stapling.educational.howItWorks.title')}</h4>
          <p>
            {$t('diagnostics.ocsp-stapling.educational.howItWorks.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.ocsp-stapling.educational.checkingStatus.title')}</h4>
          <p>
            {$t('diagnostics.ocsp-stapling.educational.checkingStatus.description')}
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .results-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .status-section,
  .response-section,
  .validity-section,
  .certificate-section,
  .recommendations-section {
    background: var(--bg-secondary);
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: (auto-fit, minmax(160px, 1fr));
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    border: 1px solid;

    &.enabled {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      border-color: var(--color-success);
      color: var(--color-success);

      :global(svg) {
        color: var(--color-success);
      }
    }

    &.disabled {
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      border-color: var(--color-warning);
      color: var(--color-warning);

      :global(svg) {
        color: var(--color-warning);
      }
    }

    .status-content {
      h4 {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: var(--font-size-lg);
        font-weight: 600;
      }

      p {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }
    }
  }

  .stat-value {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    &.status-good {
      color: var(--color-success);
    }

    &.status-revoked {
      color: var(--color-error);
    }

    &.status-unknown {
      color: var(--color-warning);
    }

    &.expiring {
      color: var(--color-warning);
    }

    &.mono {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
    }

    :global(svg) {
      flex-shrink: 0;
    }
  }

  .validity-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .validity-progress {
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);

      .progress-label {
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .progress-percentage {
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--color-primary);
      }
    }

    .progress-bar {
      height: var(--spacing-sm);
      border-radius: var(--radius-full);
      overflow: hidden;
      background: var(--bg-tertiary);

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
        transition: width var(--transition-normal);
      }
    }
  }

  .cert-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .cert-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    .cert-label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .cert-value {
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      word-break: break-all;

      &.mono {
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
      }
    }

    .cert-urls {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .cert-url {
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
        word-break: break-all;
      }
    }
  }

  .recommendations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .recommendation-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-warning), transparent 95%);
    border: 1px solid color-mix(in srgb, var(--color-warning), transparent 80%);
    border-radius: var(--radius-md);
    color: var(--color-warning);

    :global(svg) {
      color: var(--color-warning);
      flex-shrink: 0;
      margin-top: var(--spacing-2xs);
    }

    span {
      flex: 1;
      font-size: var(--font-size-sm);
      line-height: 1.4;
    }
  }

  .stat-card {
    &.full-width {
      grid-column: 1 / -1;
    }
  }
</style>
