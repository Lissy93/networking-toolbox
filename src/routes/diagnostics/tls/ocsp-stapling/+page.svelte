<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let hostname = $state('example.com');
  let port = $state('443');
  const diagnosticState = useDiagnosticState<any>();
  const examplesList = [
    { host: 'cloudflare.com', port: '443', description: 'Cloudflare - OCSP stapling enabled' },
    { host: 'www.digicert.com', port: '443', description: 'DigiCert - OCSP stapling enabled' },
    { host: 'github.com', port: '443', description: 'GitHub - OCSP stapling disabled' },
  ];
  const examples = useExamples(examplesList);

  async function checkOCSP() {
    if (!hostname?.trim()) {
      diagnosticState.setError('Please enter a hostname');
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
        throw new Error(data.message || 'Failed to check OCSP stapling');
      }

      diagnosticState.setResults(data);
    } catch (err) {
      diagnosticState.setError(err instanceof Error ? err.message : 'An error occurred');
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
    <h1>OCSP Stapling Check</h1>
    <p>Report if server staples OCSP and basic status info</p>
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
      <h3>OCSP Stapling Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="hostname">Hostname and Port</label>
        <div class="input-flex-container">
          <input
            id="hostname"
            type="text"
            bind:value={hostname}
            placeholder="example.com"
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && checkOCSP()}
            class="flex-grow"
          />
          <input
            id="port"
            type="text"
            bind:value={port}
            placeholder="443"
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && checkOCSP()}
            class="port-input"
          />
          <button onclick={checkOCSP} disabled={diagnosticState.loading} class="primary">
            {#if diagnosticState.loading}
              <Icon name="loader" size="sm" animate="spin" />
              Checking...
            {:else}
              <Icon name="search" size="sm" />
              Check
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <ErrorCard title="OCSP Check Failed" error={diagnosticState.error} />

  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Checking OCSP Stapling</h3>
            <p>Connecting to server and analyzing OCSP response stapling...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>OCSP Stapling Results</h3>
      </div>
      <div class="card-content">
        <div class="results-section">
          <!-- OCSP Stapling Status Section -->
          <div class="card status-section">
            <div class="card-header">
              <h3>OCSP Stapling Status</h3>
            </div>
            <div class="card-content">
              {#if diagnosticState.results.staplingEnabled}
                <div class="status-card enabled">
                  <Icon name="check-circle" size="lg" />
                  <div class="status-content">
                    <h4>OCSP Stapling Enabled</h4>
                    <p>This server provides OCSP responses with the TLS handshake</p>
                  </div>
                </div>
              {:else}
                <div class="status-card disabled">
                  <Icon name="x-circle" size="lg" />
                  <div class="status-content">
                    <h4>OCSP Stapling Not Enabled</h4>
                    <p>This server does not staple OCSP responses</p>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- OCSP Response Details Section -->
          {#if diagnosticState.results.staplingEnabled && diagnosticState.results.ocspResponse}
            <div class="card response-section">
              <div class="card-header">
                <h3>OCSP Response Details</h3>
              </div>
              <div class="card-content">
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-label">Certificate Status</div>
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
                    <div class="stat-label">Response Status</div>
                    <div class="stat-value">
                      <Icon name="check-circle" size="sm" />
                      {diagnosticState.results.ocspResponse.responseStatus}
                    </div>
                  </div>

                  {#if diagnosticState.results.ocspResponse.thisUpdate}
                    <div class="stat-card">
                      <div class="stat-label">This Update</div>
                      <div class="stat-value mono">{formatDate(diagnosticState.results.ocspResponse.thisUpdate)}</div>
                    </div>
                  {/if}

                  {#if diagnosticState.results.ocspResponse.nextUpdate}
                    <div class="stat-card">
                      <div class="stat-label">Next Update</div>
                      <div class="stat-value mono">{formatDate(diagnosticState.results.ocspResponse.nextUpdate)}</div>
                    </div>
                  {/if}

                  {#if diagnosticState.results.ocspResponse.producedAt}
                    <div class="stat-card">
                      <div class="stat-label">Produced At</div>
                      <div class="stat-value mono">{formatDate(diagnosticState.results.ocspResponse.producedAt)}</div>
                    </div>
                  {/if}

                  {#if diagnosticState.results.ocspResponse.responderUrl}
                    <div class="stat-card full-width">
                      <div class="stat-label">Responder URL</div>
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
                  <h3>Response Validity</h3>
                </div>
                <div class="card-content">
                  <div class="validity-info">
                    <div class="validity-stats">
                      <div class="stat-card">
                        <div class="stat-label">Valid For</div>
                        <div class="stat-value">{diagnosticState.results.ocspResponse.validity.validFor}</div>
                      </div>

                      {#if diagnosticState.results.ocspResponse.validity.expiresIn}
                        <div class="stat-card">
                          <div class="stat-label">Expires In</div>
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
                          <span class="progress-label">Validity Period Progress</span>
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
                <h3>Certificate Information</h3>
              </div>
              <div class="card-content">
                <div class="cert-details">
                  <div class="cert-item">
                    <div class="cert-label">Subject</div>
                    <div class="cert-value mono">{diagnosticState.results.certificate.subject}</div>
                  </div>

                  <div class="cert-item">
                    <div class="cert-label">Issuer</div>
                    <div class="cert-value mono">{diagnosticState.results.certificate.issuer}</div>
                  </div>

                  {#if diagnosticState.results.certificate.ocspUrls && diagnosticState.results.certificate.ocspUrls.length > 0}
                    <div class="cert-item">
                      <div class="cert-label">OCSP URLs</div>
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
                <h3>Recommendations</h3>
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
      <h3>Understanding OCSP Stapling</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>What is OCSP Stapling?</h4>
          <p>
            OCSP Stapling is a security feature where the server includes a certificate status response during the TLS
            handshake. This eliminates the need for clients to contact the Certificate Authority directly to check if a
            certificate has been revoked.
          </p>
        </div>

        <div class="info-section">
          <h4>Why is it Important?</h4>
          <ul>
            <li><strong>Privacy:</strong> Prevents CA from tracking user browsing</li>
            <li><strong>Performance:</strong> Faster connections, no extra DNS lookups</li>
            <li><strong>Reliability:</strong> Works even if OCSP responder is down</li>
            <li><strong>Security:</strong> Real-time certificate validation</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>How It Works</h4>
          <p>
            The server periodically queries the OCSP responder and caches the response. During TLS handshake, the server
            "staples" this cached response to the certificate, proving its validity without requiring the client to make
            additional network requests.
          </p>
        </div>

        <div class="info-section">
          <h4>Checking Status</h4>
          <p>
            This tool connects to servers with OCSP stapling enabled and analyzes the stapled response. It checks
            certificate status, response validity, timing information, and provides recommendations for servers without
            stapling enabled.
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
