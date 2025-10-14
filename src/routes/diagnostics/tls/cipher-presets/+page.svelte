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
    { host: 'github.com', port: '443', description: 'GitHub cipher support' },
    { host: 'cloudflare.com', port: '443', description: 'Cloudflare cipher support' },
    { host: 'google.com', port: '443', description: 'Google cipher support' },
  ];
  const examples = useExamples(examplesList);

  async function testCiphers() {
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
          action: 'cipher-presets',
          hostname: hostname.trim().toLowerCase(),
          port: parseInt(port) || 443,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to test cipher presets');
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
    testCiphers();
  }

  function getPresetScore(preset: any): number {
    if (!preset.supported) return 0;
    const total = preset.ciphers.length;
    const supported = preset.supportedCiphers.length;
    return Math.round((supported / total) * 100);
  }

  function getPresetGrade(preset: any): string {
    const score = getPresetScore(preset);
    if (!preset.supported) return 'F';
    if (preset.level === 'modern' && score >= 80) return 'A+';
    if (preset.level === 'modern' && score >= 60) return 'A';
    if (preset.level === 'intermediate' && score >= 80) return 'B';
    if (preset.level === 'intermediate' && score >= 60) return 'C';
    if (preset.level === 'legacy') return 'D';
    return 'F';
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>TLS Cipher Presets</h1>
    <p>Probe connectivity with preset cipher lists (modern/intermediate/legacy)</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    getLabel={(ex) => `${ex.host}:${ex.port}`}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Test cipher presets for ${ex.host}:${ex.port}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Cipher Presets Configuration</h3>
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
            onkeydown={(e) => e.key === 'Enter' && testCiphers()}
            class="flex-grow"
          />
          <input
            id="port"
            type="text"
            bind:value={port}
            placeholder="443"
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && testCiphers()}
            class="port-input"
          />
          <button onclick={testCiphers} disabled={diagnosticState.loading} class="primary">
            {#if diagnosticState.loading}
              <Icon name="loader" size="sm" animate="spin" />
              Testing...
            {:else}
              <Icon name="search" size="sm" />
              Test
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <ErrorCard title="Cipher Test Failed" error={diagnosticState.error} />

  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Testing Cipher Presets</h3>
            <p>Testing modern, intermediate, and legacy cipher suites...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>Cipher Presets Results</h3>
      </div>
      <div class="card-content">
        <div class="results-section">
          <div class="presets-grid">
            {#each diagnosticState.results.presets as preset (preset.name)}
              <div class="preset-card {preset.level}" class:supported={preset.supported}>
                <div class="preset-header">
                  <div class="preset-title">
                    <h3>{preset.name}</h3>
                    <span class="preset-level">{preset.level}</span>
                  </div>
                  <div class="preset-grade grade-{getPresetGrade(preset).toLowerCase()}">
                    {getPresetGrade(preset)}
                  </div>
                </div>

                <div class="preset-description">
                  {preset.description}
                </div>

                <div class="preset-stats">
                  <div class="stat">
                    <span class="stat-label">Supported:</span>
                    <span class="stat-value">{preset.supportedCiphers.length}/{preset.ciphers.length}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Coverage:</span>
                    <span class="stat-value">{getPresetScore(preset)}%</span>
                  </div>
                </div>

                <div class="preset-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: {getPresetScore(preset)}%"></div>
                  </div>
                </div>

                {#if preset.protocols}
                  <div class="protocols-section">
                    <span class="protocols-label">Protocols:</span>
                    <div class="protocols-list">
                      {#each preset.protocols as protocol (protocol.name)}
                        <span class="protocol-badge" class:supported={protocol.supported}>
                          {protocol.name}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if preset.supportedCiphers.length > 0}
                  <details class="ciphers-details">
                    <summary>Supported Ciphers ({preset.supportedCiphers.length})</summary>
                    <div class="cipher-list">
                      {#each preset.supportedCiphers as cipher (cipher)}
                        <div class="cipher-item supported">
                          <Icon name="check-circle" />
                          <span class="cipher-name">{cipher}</span>
                        </div>
                      {/each}
                    </div>
                  </details>
                {/if}

                {#if preset.unsupportedCiphers && preset.unsupportedCiphers.length > 0}
                  <details class="ciphers-details">
                    <summary>Unsupported Ciphers ({preset.unsupportedCiphers.length})</summary>
                    <div class="cipher-list">
                      {#each preset.unsupportedCiphers as cipher (cipher)}
                        <div class="cipher-item unsupported">
                          <Icon name="x-circle" />
                          <span class="cipher-name">{cipher}</span>
                        </div>
                      {/each}
                    </div>
                  </details>
                {/if}

                {#if preset.recommendation}
                  <div class="recommendation" class:warning={preset.level === 'legacy'}>
                    <Icon name={preset.level === 'legacy' ? 'alert-triangle' : 'info'} />
                    {preset.recommendation}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          {#if diagnosticState.results.summary}
            <div class="summary-section">
              <h3>Overall Assessment</h3>
              <div class="summary-content">
                <div class="summary-score">
                  <div class="score-circle grade-{diagnosticState.results.summary.overallGrade.toLowerCase()}">
                    {diagnosticState.results.summary.overallGrade}
                  </div>
                  <div class="score-details">
                    <h4>{diagnosticState.results.summary.rating}</h4>
                    <p>{diagnosticState.results.summary.description}</p>
                  </div>
                </div>

                {#if diagnosticState.results.summary.recommendations && diagnosticState.results.summary.recommendations.length > 0}
                  <div class="recommendations">
                    <h4>Recommendations</h4>
                    <ul>
                      {#each diagnosticState.results.summary.recommendations as rec (rec)}
                        <li>{rec}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .presets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
  }

  .preset-card {
    background: var(--bg-secondary);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .preset-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-md);

    .preset-title {
      h3 {
        margin: 0 0 var(--spacing-xs) 0;
      }

      .preset-level {
        display: inline-block;
        padding: var(--spacing-2xs) var(--spacing-sm);
        background: var(--bg-tertiary);
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        text-transform: uppercase;
        font-weight: 600;
      }
    }

    .preset-grade {
      font-size: 2rem;
      font-weight: 700;
      padding: var(--spacing-sm);
      border-radius: var(--radius-md);
      min-width: 3rem;
      text-align: center;

      &.grade-a,
      &.grade-a\+ {
        color: var(--color-success);
        background: color-mix(in srgb, var(--color-success), transparent 90%);
      }

      &.grade-b {
        color: var(--color-success);
        background: color-mix(in srgb, var(--color-success), transparent 90%);
      }

      &.grade-c {
        color: var(--color-warning);
        background: color-mix(in srgb, var(--color-warning), transparent 90%);
      }

      &.grade-d,
      &.grade-f {
        color: var(--color-error);
        background: color-mix(in srgb, var(--color-error), transparent 90%);
      }
    }
  }

  .preset-description {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-bottom: var(--spacing-md);
  }

  .preset-stats {
    display: flex;
    gap: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);

    .stat {
      .stat-label {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin-right: var(--spacing-sm);
      }

      .stat-value {
        font-weight: 600;
      }
    }
  }

  .preset-progress {
    margin-bottom: var(--spacing-md);

    .progress-bar {
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 2rem;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
        transition: width 0.3s ease;
      }
    }
  }

  .protocols-section {
    margin-bottom: var(--spacing-md);

    .protocols-label {
      display: block;
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: var(--spacing-sm);
    }

    .protocols-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);

      .protocol-badge {
        display: inline-block;
        padding: var(--spacing-xs) var(--spacing-lg);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: 2rem;
        font-size: 0.75rem;
        font-weight: 600;

        &.supported {
          background: color-mix(in srgb, var(--color-success), transparent 90%);
          border-color: var(--color-success);
          color: var(--color-success);
        }
      }
    }
  }

  .ciphers-details {
    margin-bottom: var(--spacing-lg);

    summary {
      cursor: pointer;
      padding: var(--spacing-sm);
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      transition: background-color 0.2s ease;

      &:hover {
        background: var(--surface-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
    }

    .cipher-list {
      margin-top: var(--spacing-lg);
      max-height: 200px;
      overflow-y: auto;
    }

    .cipher-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      font-family: var(--font-mono);
      font-size: 0.75rem;

      :global(svg) {
        width: 0.875rem;
        height: 0.875rem;
        flex-shrink: 0;
      }

      &.supported {
        color: var(--color-success);
      }

      &.unsupported {
        color: var(--color-warning);
      }

      .cipher-name {
        word-break: break-all;
      }
    }
  }

  .recommendation {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg);
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border-radius: var(--radius-md);
    font-size: 0.875rem;

    &.warning {
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      color: var(--color-warning);
    }

    :global(svg) {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }
  }

  .summary-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);

    h3 {
      margin-bottom: var(--spacing-lg);
    }

    .summary-content {
      display: grid;
      gap: var(--spacing-xl);
    }

    .summary-score {
      display: flex;
      align-items: center;
      gap: var(--spacing-xl);

      .score-circle {
        width: 5rem;
        height: 5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        font-weight: 700;
        border-radius: 50%;
        border: 3px solid;

        &.grade-a,
        &.grade-a\+ {
          color: var(--color-success);
          border-color: var(--color-success);
          background: color-mix(in srgb, var(--color-success), transparent 95%);
        }

        &.grade-b {
          color: var(--color-success);
          border-color: var(--color-success);
          background: color-mix(in srgb, var(--color-success), transparent 95%);
        }

        &.grade-c {
          color: var(--color-warning);
          border-color: var(--color-warning);
          background: color-mix(in srgb, var(--color-warning), transparent 95%);
        }

        &.grade-d,
        &.grade-f {
          color: var(--color-error);
          border-color: var(--color-error);
          background: color-mix(in srgb, var(--color-error), transparent 95%);
        }
      }

      .score-details {
        h4 {
          margin: 0 0 var(--spacing-sm) 0;
        }

        p {
          margin: 0;
          color: var(--text-secondary);
        }
      }
    }

    .recommendations {
      h4 {
        margin-bottom: var(--spacing-md);
      }

      ul {
        margin: 0;
        padding-left: var(--spacing-lg);

        li {
          margin-bottom: var(--spacing-sm);
          color: var(--text-secondary);
        }
      }
    }
  }
</style>
