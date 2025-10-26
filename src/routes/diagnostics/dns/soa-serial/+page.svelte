<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';
  import '../../../../styles/diagnostics-pages.scss';

  let domain = $state('example.com');
  let resolver = $state('cloudflare');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const resolvers = $derived([
    { value: 'cloudflare', label: $t('diagnostics/dns-soa-serial.resolvers.cloudflare') },
    { value: 'google', label: $t('diagnostics/dns-soa-serial.resolvers.google') },
    { value: 'quad9', label: $t('diagnostics/dns-soa-serial.resolvers.quad9') },
    { value: 'opendns', label: $t('diagnostics/dns-soa-serial.resolvers.opendns') },
  ]);

  const examples = $derived([
    {
      domain: $t('diagnostics/dns-soa-serial.examples.items.google.domain'),
      description: $t('diagnostics/dns-soa-serial.examples.items.google.description'),
    },
    {
      domain: $t('diagnostics/dns-soa-serial.examples.items.github.domain'),
      description: $t('diagnostics/dns-soa-serial.examples.items.github.description'),
    },
    {
      domain: $t('diagnostics/dns-soa-serial.examples.items.cloudflare.domain'),
      description: $t('diagnostics/dns-soa-serial.examples.items.cloudflare.description'),
    },
    {
      domain: $t('diagnostics/dns-soa-serial.examples.items.iana.domain'),
      description: $t('diagnostics/dns-soa-serial.examples.items.iana.description'),
    },
    {
      domain: $t('diagnostics/dns-soa-serial.examples.items.rfcEditor.domain'),
      description: $t('diagnostics/dns-soa-serial.examples.items.rfcEditor.description'),
    },
    {
      domain: $t('diagnostics/dns-soa-serial.examples.items.example.domain'),
      description: $t('diagnostics/dns-soa-serial.examples.items.example.description'),
    },
  ]);

  async function analyzeSOA() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'soa-serial',
          name: domain.trim(),
          resolverOpts: { doh: resolver },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `SOA analysis failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: { domain: string }, index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    analyzeSOA();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  async function copyResults() {
    const res = results as { raw?: unknown };
    if (!res?.raw) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(res.raw, null, 2));
      copiedState = true;
      setTimeout(() => (copiedState = false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  }

  function formatDate(timestamp: number): string {
    try {
      return new Date(timestamp * 1000).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return 'Invalid date';
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics/dns-soa-serial.title')}</h1>
    <p>
      {$t('diagnostics/dns-soa-serial.subtitle')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics/dns-soa-serial.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`${$t('diagnostics/dns-soa-serial.examples.items.google.tooltip')}`
              .replace('google.com', example.domain)
              .replace('High-traffic domain with frequent updates', example.description)}
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
      <h3>{$t('diagnostics/dns-soa-serial.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="domain" use:tooltip={$t('diagnostics/dns-soa-serial.form.domainTooltip')}>
            {$t('diagnostics/dns-soa-serial.form.domainLabel')}
            <input
              id="domain"
              type="text"
              bind:value={domain}
              placeholder={$t('diagnostics/dns-soa-serial.form.domainPlaceholder')}
              onchange={() => {
                clearExampleSelection();
                if (domain.trim()) analyzeSOA();
              }}
            />
          </label>
        </div>

        <div class="form-group">
          <label for="resolver" use:tooltip={$t('diagnostics/dns-soa-serial.form.resolverTooltip')}>
            {$t('diagnostics/dns-soa-serial.form.resolverLabel')}
            <select
              id="resolver"
              bind:value={resolver}
              onchange={() => {
                if (domain.trim()) analyzeSOA();
              }}
            >
              {#each resolvers as res, resIndex (resIndex)}
                <option value={res.value}>{res.label}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={analyzeSOA} disabled={loading || !domain.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('diagnostics/dns-soa-serial.form.analyzing')}
          {:else}
            <Icon name="search" size="sm" />
            {$t('diagnostics/dns-soa-serial.form.analyzeButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    {@const res = results as { soa?: { serial?: number }; serialAnalysis?: { format?: string } }}
    {@const serialInfo = (results as { serialAnalysis?: { formatDescription?: string; explanation?: string } })
      .serialAnalysis}
    {@const serialAnalysis = (
      results as {
        serialAnalysis?: {
          parsed?: { year?: number; month?: number; day?: number; revision?: number; timestamp?: number };
          format?: string;
          valid?: boolean;
        };
      }
    ).serialAnalysis}
    {@const soaData = (results as { soa?: { mname?: string; rname?: string; ttl?: number } }).soa}
    {@const timingData = (results as { soa?: { refresh?: number; retry?: number; expire?: number; minimum?: number } })
      .soa}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics/dns-soa-serial.results.title', { name: results.name })}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState
            ? $t('diagnostics/dns-soa-serial.results.copied')
            : $t('diagnostics/dns-soa-serial.results.copyButton')}
        </button>
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={$t('diagnostics/dns-soa-serial.results.domainTooltip')}
              >{$t('diagnostics/dns-soa-serial.results.domainLabel')}</span
            >
            <span class="info-value mono">{results.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={$t('diagnostics/dns-soa-serial.results.resolverTooltip')}
              >{$t('diagnostics/dns-soa-serial.results.resolverLabel')}</span
            >
            <span class="info-value">{results.resolver}</span>
          </div>
        </div>

        <div class="results-grid">
          <!-- Serial Number Analysis -->
          <div class="result-section">
            <h4>{$t('diagnostics/dns-soa-serial.results.serialAnalysis.title')}</h4>
            <div class="serial-analysis">
              <div class="serial-display">
                <span class="serial-number"
                  >{res.soa?.serial || $t('diagnostics/dns-soa-serial.results.serialAnalysis.notAvailable')}</span
                >
                <span class="serial-format {res.serialAnalysis?.format}"
                  >{res.serialAnalysis?.format || $t('diagnostics/dns-soa-serial.results.serialAnalysis.unknown')}</span
                >
              </div>

              <dl class="definition-list">
                <dt>{$t('diagnostics/dns-soa-serial.results.serialAnalysis.formatLabel')}</dt>
                <dd>
                  <strong
                    >{serialInfo?.formatDescription ||
                      $t('diagnostics/dns-soa-serial.results.serialAnalysis.formatUnknown')}</strong
                  >
                  <p class="format-explanation">
                    {serialInfo?.explanation ||
                      $t('diagnostics/dns-soa-serial.results.serialAnalysis.formatExplanation')}
                  </p>
                </dd>
                {#if serialAnalysis?.parsed}
                  <dt>{$t('diagnostics/dns-soa-serial.results.serialAnalysis.parsedDateLabel')}</dt>
                  <dd>
                    {#if serialAnalysis.format === 'YYYYMMDDNN'}
                      <div class="parsed-date">
                        <span class="date-part"
                          >{$t('diagnostics/dns-soa-serial.results.serialAnalysis.parsedYear', {
                            year: serialAnalysis.parsed.year ?? 0,
                          })}</span
                        >
                        <span class="date-part"
                          >{$t('diagnostics/dns-soa-serial.results.serialAnalysis.parsedMonth', {
                            month: serialAnalysis.parsed.month ?? 0,
                          })}</span
                        >
                        <span class="date-part"
                          >{$t('diagnostics/dns-soa-serial.results.serialAnalysis.parsedDay', {
                            day: serialAnalysis.parsed.day ?? 0,
                          })}</span
                        >
                        <span class="date-part"
                          >{$t('diagnostics/dns-soa-serial.results.serialAnalysis.parsedRevision', {
                            revision: serialAnalysis.parsed.revision ?? 0,
                          })}</span
                        >
                      </div>
                    {:else if serialAnalysis.format === 'Unix Timestamp'}
                      <span class="unix-date">{formatDate(serialAnalysis.parsed.timestamp!)}</span>
                    {/if}
                  </dd>
                {/if}

                <dt>{$t('diagnostics/dns-soa-serial.results.serialAnalysis.validityLabel')}</dt>
                <dd class="validity {serialAnalysis?.valid ? 'valid' : 'invalid'}">
                  <Icon name={serialAnalysis?.valid ? 'check-circle' : 'x-circle'} size="sm" />
                  {serialAnalysis?.valid
                    ? $t('diagnostics/dns-soa-serial.results.serialAnalysis.valid')
                    : $t('diagnostics/dns-soa-serial.results.serialAnalysis.invalid')}
                </dd>
              </dl>
            </div>
          </div>

          <!-- SOA Record Details -->
          <div class="result-section">
            <h4>{$t('diagnostics/dns-soa-serial.results.soaDetails.title')}</h4>
            <dl class="definition-list">
              <dt>{$t('diagnostics/dns-soa-serial.results.soaDetails.primaryServer')}</dt>
              <dd class="mono">{soaData?.mname || $t('diagnostics/dns-soa-serial.results.soaDetails.notAvailable')}</dd>

              <dt>{$t('diagnostics/dns-soa-serial.results.soaDetails.contactEmail')}</dt>
              <dd class="mono">{soaData?.rname || $t('diagnostics/dns-soa-serial.results.soaDetails.notAvailable')}</dd>

              <dt>{$t('diagnostics/dns-soa-serial.results.soaDetails.ttl')}</dt>
              <dd>
                {#if soaData?.ttl}
                  <span class="ttl-value">{soaData.ttl}s</span>
                  <small>({formatDuration(soaData.ttl)})</small>
                {:else}
                  {$t('diagnostics/dns-soa-serial.results.soaDetails.notAvailable')}
                {/if}
              </dd>
            </dl>
          </div>

          <!-- Timing Parameters -->
          <div class="result-section full-width">
            <h4>{$t('diagnostics/dns-soa-serial.results.timing.title')}</h4>
            <div class="timing-grid">
              <div class="timing-param">
                <h5>{$t('diagnostics/dns-soa-serial.results.timing.refresh.title')}</h5>
                <div class="param-value">{timingData?.refresh || 0}s</div>
                <div class="param-description">
                  <small>{formatDuration(timingData?.refresh || 0)}</small>
                  <p>{$t('diagnostics/dns-soa-serial.results.timing.refresh.description')}</p>
                </div>
              </div>

              <div class="timing-param">
                <h5>{$t('diagnostics/dns-soa-serial.results.timing.retry.title')}</h5>
                <div class="param-value">{timingData?.retry || 0}s</div>
                <div class="param-description">
                  <small>{formatDuration(timingData?.retry || 0)}</small>
                  <p>{$t('diagnostics/dns-soa-serial.results.timing.retry.description')}</p>
                </div>
              </div>

              <div class="timing-param">
                <h5>{$t('diagnostics/dns-soa-serial.results.timing.expire.title')}</h5>
                <div class="param-value">{timingData?.expire || 0}s</div>
                <div class="param-description">
                  <small>{formatDuration(timingData?.expire || 0)}</small>
                  <p>{$t('diagnostics/dns-soa-serial.results.timing.expire.description')}</p>
                </div>
              </div>

              <div class="timing-param">
                <h5>{$t('diagnostics/dns-soa-serial.results.timing.minimum.title')}</h5>
                <div class="param-value">{timingData?.minimum || 0}s</div>
                <div class="param-description">
                  <small>{formatDuration(timingData?.minimum || 0)}</small>
                  <p>{$t('diagnostics/dns-soa-serial.results.timing.minimum.description')}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuration Assessment -->
          {#if results.assessment?.length}
            {@const assessmentData = (
              results as {
                assessment?: Array<{ severity: string; aspect: string; message: string; recommendation?: string }>;
              }
            ).assessment}
            <div class="result-section full-width">
              <h4>{$t('diagnostics/dns-soa-serial.results.assessment.title')}</h4>
              <div class="assessment-grid">
                {#each assessmentData || [] as item, itemIndex (itemIndex)}
                  <div class="assessment-item {item.severity}">
                    <Icon
                      name={item.severity === 'good'
                        ? 'check-circle'
                        : item.severity === 'warning'
                          ? 'alert-triangle'
                          : 'info'}
                      size="md"
                    />
                    <div>
                      <strong>{item.aspect}</strong>
                      <p>{item.message}</p>
                      {#if item.recommendation}
                        <small class="recommendation">{item.recommendation}</small>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>{$t('diagnostics/dns-soa-serial.error.title')}</strong>
            <p>{error}</p>
            <div class="troubleshooting">
              <p><strong>{$t('diagnostics/dns-soa-serial.error.troubleshooting')}</strong></p>
              <ul>
                <li>{$t('diagnostics/dns-soa-serial.error.tips.validDomain')}</li>
                <li>{$t('diagnostics/dns-soa-serial.error.tips.tryDifferent')}</li>
                <li>{$t('diagnostics/dns-soa-serial.error.tips.someResolvers')}</li>
                <li>{$t('diagnostics/dns-soa-serial.error.tips.checkDomain')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/dns-soa-serial.education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/dns-soa-serial.education.whatIsSOA.title')}</h4>
          <p>
            {$t('diagnostics/dns-soa-serial.education.whatIsSOA.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-soa-serial.education.serialFormats.title')}</h4>
          <ul>
            <li>
              <strong>YYYYMMDDNN:</strong>
              {$t('diagnostics/dns-soa-serial.education.serialFormats.yyyymmddnn').replace('YYYYMMDDNN: ', '')}
            </li>
            <li>
              <strong>Unix Timestamp:</strong>
              {$t('diagnostics/dns-soa-serial.education.serialFormats.unixTimestamp').replace('Unix Timestamp: ', '')}
            </li>
            <li>
              <strong>Sequential:</strong>
              {$t('diagnostics/dns-soa-serial.education.serialFormats.sequential').replace('Sequential: ', '')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-soa-serial.education.timingParams.title')}</h4>
          <ul>
            <li>
              <strong>Refresh:</strong>
              {$t('diagnostics/dns-soa-serial.education.timingParams.refresh').replace('Refresh: ', '')}
            </li>
            <li>
              <strong>Retry:</strong>
              {$t('diagnostics/dns-soa-serial.education.timingParams.retry').replace('Retry: ', '')}
            </li>
            <li>
              <strong>Expire:</strong>
              {$t('diagnostics/dns-soa-serial.education.timingParams.expire').replace('Expire: ', '')}
            </li>
            <li>
              <strong>Minimum:</strong>
              {$t('diagnostics/dns-soa-serial.education.timingParams.minimum').replace('Minimum: ', '')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-soa-serial.education.bestPractices.title')}</h4>
          <ul>
            <li>{$t('diagnostics/dns-soa-serial.education.bestPractices.useYYYYMMDDNN')}</li>
            <li>{$t('diagnostics/dns-soa-serial.education.bestPractices.setRefresh')}</li>
            <li>{$t('diagnostics/dns-soa-serial.education.bestPractices.retryShorter')}</li>
            <li>{$t('diagnostics/dns-soa-serial.education.bestPractices.expireLonger')}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .form-group label {
    flex-direction: column;
  }

  .serial-analysis {
    margin-bottom: var(--spacing-lg);
  }

  .serial-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
  }

  .serial-number {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .serial-format {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    text-transform: uppercase;

    &.YYYYMMDDNN {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
    }

    &.unix {
      background: color-mix(in srgb, var(--color-info), transparent 90%);
      color: var(--color-info);
    }

    &.sequential {
      background: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
    }
  }

  .format-explanation {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: var(--spacing-xs) 0 0 0;
  }

  .parsed-date {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .date-part {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
  }

  .unix-date {
    font-family: var(--font-mono);
    color: var(--text-primary);
  }

  .validity {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    &.valid {
      color: var(--color-success);
    }

    &.invalid {
      color: var(--color-error);
    }
  }

  .ttl-value {
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .timing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-lg);
  }

  .timing-param {
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h5 {
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--color-primary);
      font-size: var(--font-size-sm);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }

  .param-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .param-description {
    small {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
    }

    p {
      margin: var(--spacing-xs) 0 0 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.4;
    }
  }

  .assessment-grid {
    display: grid;
    gap: var(--spacing-md);
  }

  .assessment-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid;

    &.good {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
      border-color: var(--color-success);
    }

    &.warning {
      background: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
      border-color: var(--color-warning);
    }

    &.info {
      background: color-mix(in srgb, var(--color-info), transparent 90%);
      color: var(--color-info);
      border-color: var(--color-info);
    }

    strong {
      color: var(--text-primary);
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    p {
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-xs) 0;
      font-size: var(--font-size-sm);
    }

    .recommendation {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      font-style: italic;
    }
  }
</style>
