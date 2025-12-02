<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';
  import '../../../../styles/diagnostics-pages.scss';

  let domainName = $state('example.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = $derived([
    {
      domain: $t('diagnostics/dns-trace.examples.items.cloudflare.domain'),
      description: $t('diagnostics/dns-trace.examples.items.cloudflare.description'),
      tooltip: $t('diagnostics/dns-trace.examples.items.cloudflare.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-trace.examples.items.google.domain'),
      description: $t('diagnostics/dns-trace.examples.items.google.description'),
      tooltip: $t('diagnostics/dns-trace.examples.items.google.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-trace.examples.items.github.domain'),
      description: $t('diagnostics/dns-trace.examples.items.github.description'),
      tooltip: $t('diagnostics/dns-trace.examples.items.github.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-trace.examples.items.bbc.domain'),
      description: $t('diagnostics/dns-trace.examples.items.bbc.description'),
      tooltip: $t('diagnostics/dns-trace.examples.items.bbc.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-trace.examples.items.aws.domain'),
      description: $t('diagnostics/dns-trace.examples.items.aws.description'),
      tooltip: $t('diagnostics/dns-trace.examples.items.aws.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-trace.examples.items.alicia.domain'),
      description: $t('diagnostics/dns-trace.examples.items.alicia.description'),
      tooltip: $t('diagnostics/dns-trace.examples.items.alicia.tooltip'),
    },
  ]);

  async function performTrace() {
    if (!domainName?.trim()) {
      error = $t('diagnostics/dns-trace.error.emptyDomain');
      return;
    }

    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trace',
          domain: domainName.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || $t('diagnostics/dns-trace.error.failed'));
      }

      results = data;
    } catch (err) {
      error = err instanceof Error ? err.message : $t('diagnostics/dns-trace.error.general');
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domainName = example.domain;
    selectedExampleIndex = index;
    performTrace();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function formatTiming(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics/dns-trace.title')}</h1>
    <p>{$t('diagnostics/dns-trace.subtitle')}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics/dns-trace.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={example.tooltip}
          >
            <h5>{example.domain}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics/dns-trace.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain">{$t('diagnostics/dns-trace.form.domainLabel')}</label>
        <div class="input-flex-container">
          <input
            id="domain"
            type="text"
            bind:value={domainName}
            placeholder={$t('diagnostics/dns-trace.form.domainPlaceholder')}
            disabled={loading}
            onchange={() => clearExampleSelection()}
            onkeydown={(e) => e.key === 'Enter' && performTrace()}
          />
          <button onclick={performTrace} disabled={loading} class="primary">
            {#if loading}
              <Icon name="loader" size="sm" animate="spin" />
              {$t('diagnostics/dns-trace.form.tracing')}
            {:else}
              <Icon name="search" size="sm" />
              {$t('diagnostics/dns-trace.form.traceButton')}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>{$t('diagnostics/dns-trace.error.title')}</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>{$t('diagnostics/dns-trace.loading.title')}</h3>
            <p>{$t('diagnostics/dns-trace.loading.message')}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h3>{$t('diagnostics/dns-trace.results.pathTitle')}</h3>
      </div>
      <div class="card-content">
        <div class="trace-timeline">
          {#each results.path as step, i (i)}
            <div class="trace-step">
              <div class="step-marker">
                <span class="step-number">{i + 1}</span>
              </div>

              <div class="step-content">
                <div class="step-header">
                  <span class="step-type" use:tooltip={$t('diagnostics/dns-trace.results.step.typeTooltip')}
                    >{step.type}</span
                  >
                  <span class="step-timing" use:tooltip={$t('diagnostics/dns-trace.results.step.timingTooltip')}
                    >{formatTiming(step.timing)}</span
                  >
                </div>

                <div class="step-query">
                  <strong use:tooltip={$t('diagnostics/dns-trace.results.step.queryTooltip')}
                    >{$t('diagnostics/dns-trace.results.step.query')}</strong
                  >
                  {step.query}
                  {#if step.qtype}
                    <span class="record-type" use:tooltip={$t('diagnostics/dns-trace.results.step.qtypeTooltip')}
                      >{step.qtype}</span
                    >
                  {/if}
                </div>

                <div class="step-server">
                  <strong use:tooltip={$t('diagnostics/dns-trace.results.step.serverTooltip')}
                    >{$t('diagnostics/dns-trace.results.step.server')}</strong
                  >
                  {step.server}
                  {#if step.serverName}
                    <span class="server-name">({step.serverName})</span>
                  {/if}
                </div>

                {#if step.response}
                  <div class="step-response">
                    <strong use:tooltip={$t('diagnostics/dns-trace.results.step.responseTooltip')}
                      >{$t('diagnostics/dns-trace.results.step.response')}</strong
                    >
                    {#if step.response.type === 'referral'}
                      <span class="referral">
                        {$t('diagnostics/dns-trace.results.step.referral', {
                          nameservers: step.response.nameservers.join(', '),
                        })}
                      </span>
                    {:else if step.response.type === 'answer'}
                      <span class="answer">
                        {#if Array.isArray(step.response.data)}
                          {step.response.data.join(', ')}
                        {:else}
                          {step.response.data}
                        {/if}
                      </span>
                    {:else if step.response.type === 'nodata'}
                      <span class="nodata">{$t('diagnostics/dns-trace.results.step.nodata')}</span>
                    {:else if step.response.type === 'nxdomain'}
                      <span class="nxdomain">{$t('diagnostics/dns-trace.results.step.nxdomain')}</span>
                    {/if}
                  </div>
                {/if}

                {#if step.flags}
                  <div class="step-flags">
                    {#if step.flags.aa}
                      <span class="flag authoritative" use:tooltip={$t('diagnostics/dns-trace.results.flags.aa')}
                        >AA</span
                      >
                    {/if}
                    {#if step.flags.ad}
                      <span class="flag dnssec" use:tooltip={$t('diagnostics/dns-trace.results.flags.ad')}>AD</span>
                    {/if}
                    {#if step.flags.rd}
                      <span class="flag" use:tooltip={$t('diagnostics/dns-trace.results.flags.rd')}>RD</span>
                    {/if}
                    {#if step.flags.ra}
                      <span class="flag" use:tooltip={$t('diagnostics/dns-trace.results.flags.ra')}>RA</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    {#if results.summary}
      <div class="card">
        <div class="card-header">
          <h3>{$t('diagnostics/dns-trace.results.summary.title')}</h3>
        </div>
        <div class="card-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.totalTime.tooltip')}>
                {$t('diagnostics/dns-trace.results.summary.totalTime.label')}
              </div>
              <div class="stat-value">
                <Icon name="timer" size="sm" />
                {formatTiming(results.summary.totalTime)}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.dnsQueries.tooltip')}>
                {$t('diagnostics/dns-trace.results.summary.dnsQueries.label')}
              </div>
              <div class="stat-value">{results.summary.queryCount}</div>
            </div>
            {#if results.summary.finalServer}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.finalServer.tooltip')}>
                  {$t('diagnostics/dns-trace.results.summary.finalServer.label')}
                </div>
                <div class="stat-value mono">{results.summary.finalServer}</div>
              </div>
            {/if}
            {#if results.summary.recordType}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.recordType.tooltip')}>
                  {$t('diagnostics/dns-trace.results.summary.recordType.label')}
                </div>
                <div class="stat-value">{results.summary.recordType}</div>
              </div>
            {/if}
            {#if results.summary.totalHops}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.totalHops.tooltip')}>
                  {$t('diagnostics/dns-trace.results.summary.totalHops.label')}
                </div>
                <div class="stat-value">{results.summary.totalHops}</div>
              </div>
            {/if}
            {#if results.summary.averageLatency}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.avgLatency.tooltip')}>
                  {$t('diagnostics/dns-trace.results.summary.avgLatency.label')}
                </div>
                <div class="stat-value">{results.summary.averageLatency}ms</div>
              </div>
            {/if}
            {#if results.summary.dnssecValid !== undefined}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.dnssecStatus.tooltip')}>
                  {$t('diagnostics/dns-trace.results.summary.dnssecStatus.label')}
                </div>
                <div
                  class="stat-value"
                  class:valid={results.summary.dnssecValid}
                  class:invalid={!results.summary.dnssecValid}
                >
                  <Icon name={results.summary.dnssecValid ? 'shield-check' : 'shield-x'} size="sm" />
                  {results.summary.dnssecValid
                    ? $t('diagnostics/dns-trace.results.summary.dnssecStatus.valid')
                    : $t('diagnostics/dns-trace.results.summary.dnssecStatus.notValidated')}
                </div>
              </div>
            {/if}
            {#if results.summary.authoritativeAnswer !== undefined}
              <div class="stat-card">
                <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.authoritative.tooltip')}>
                  {$t('diagnostics/dns-trace.results.summary.authoritative.label')}
                </div>
                <div
                  class="stat-value"
                  class:valid={results.summary.authoritativeAnswer}
                  class:invalid={!results.summary.authoritativeAnswer}
                >
                  <Icon name={results.summary.authoritativeAnswer ? 'check-circle' : 'x-circle'} size="sm" />
                  {results.summary.authoritativeAnswer
                    ? $t('diagnostics/dns-trace.results.summary.authoritative.yes')
                    : $t('diagnostics/dns-trace.results.summary.authoritative.no')}
                </div>
              </div>
            {/if}
            {#if results.summary.resolverPath}
              <div class="stat-card double-width">
                <div
                  class="stat-label"
                  use:tooltip={$t('diagnostics/dns-trace.results.summary.resolutionPath.tooltip')}
                >
                  {$t('diagnostics/dns-trace.results.summary.resolutionPath.label')}
                </div>
                <div class="stat-value mono resolver-path">{results.summary.resolverPath}</div>
              </div>
            {/if}
            {#if results.summary.finalAnswer}
              <div class="stat-card double-width">
                <div class="stat-label" use:tooltip={$t('diagnostics/dns-trace.results.summary.finalAnswer.tooltip')}>
                  {$t('diagnostics/dns-trace.results.summary.finalAnswer.label')}
                </div>
                <div class="stat-value mono">
                  {Array.isArray(results.summary.finalAnswer)
                    ? results.summary.finalAnswer.join(', ')
                    : results.summary.finalAnswer}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .trace-timeline {
    position: relative;
    padding-left: 2rem;

    &::before {
      content: '';
      position: absolute;
      left: 1rem;
      top: 1.5rem;
      bottom: 1rem;
      width: 2px;
      background: linear-gradient(
        180deg,
        var(--color-primary),
        color-mix(in srgb, var(--color-primary), transparent 70%)
      );
    }
  }

  .trace-step {
    position: relative;
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .step-marker {
    position: absolute;
    left: -2rem;
    width: 2rem;
    height: 2rem;
    background: var(--bg-secondary);
    border: 2px solid var(--color-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    .step-number {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-primary);
    }
  }

  .step-content {
    flex: 1;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem;
    transition: border-color 0.2s ease;
  }

  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;

    .step-type {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      color: var(--color-primary);
    }

    .step-timing {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
  }

  .step-query,
  .step-server,
  .step-response {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;

    strong {
      color: var(--color-text-secondary);
      margin-right: 0.5rem;
    }
  }

  .record-type {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    background: var(--color-primary-bg);
    color: var(--color-primary);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  .server-name {
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .referral {
    color: var(--color-info);
  }

  .answer {
    color: var(--color-success);
    font-family: var(--font-mono);
  }

  .nodata {
    color: var(--color-warning);
  }

  .nxdomain {
    color: var(--color-error);
  }

  .step-flags {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;

    .flag {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      background: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;

      &.authoritative {
        background: color-mix(in srgb, var(--color-success), transparent 90%);
        border-color: var(--color-success);
        color: var(--color-success);
      }

      &.dnssec {
        background: color-mix(in srgb, var(--color-info), transparent 90%);
        border-color: var(--color-info);
        color: var(--color-info);
      }
    }
  }

  .loading-state {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-xl);
    text-align: left;

    .loading-text {
      h3 {
        margin: 0 0 var(--spacing-xs) 0;
        color: var(--color-primary);
      }

      p {
        margin: 0;
        color: var(--color-text-secondary);
      }
    }
  }

  .stat-card {
    .stat-value {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);

      &.valid {
        color: var(--color-success);
      }

      &.invalid {
        color: var(--color-warning);
      }

      &.mono {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        word-break: break-all;
      }

      &.resolver-path {
        font-size: var(--font-size-xs);
        line-height: 1.4;
        overflow-wrap: break-word;
      }
    }
  }
</style>
