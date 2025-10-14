<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let domain = $state('example.com');
  let resolver = $state('cloudflare');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const resolvers = [
    { value: 'cloudflare', label: 'Cloudflare (1.1.1.1)' },
    { value: 'google', label: 'Google (8.8.8.8)' },
    { value: 'quad9', label: 'Quad9 (9.9.9.9)' },
    { value: 'opendns', label: 'OpenDNS (208.67.222.222)' },
  ];

  const examples = [
    { domain: 'google.com', description: 'High-traffic domain with frequent updates' },
    { domain: 'github.com', description: 'Tech company with modern DNS management' },
    { domain: 'cloudflare.com', description: 'DNS provider with optimal configurations' },
    { domain: 'iana.org', description: 'Internet standards organization' },
    { domain: 'rfc-editor.org', description: 'Official RFC publication site' },
    { domain: 'example.com', description: 'Reserved example domain (RFC 2606)' },
  ];

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
    <h1>SOA Serial Analyzer</h1>
    <p>
      Analyze Start of Authority (SOA) records to interpret serial number formats and examine DNS zone timing
      parameters. SOA records contain critical zone metadata including serial numbers for change tracking and timing
      values for zone transfers.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Domain Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Analyze SOA record for ${example.domain} (${example.description})`}
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
      <h3>SOA Analysis Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="domain" use:tooltip={'Enter a domain name to analyze its SOA record'}>
            Domain Name
            <input
              id="domain"
              type="text"
              bind:value={domain}
              placeholder="example.com"
              onchange={() => {
                clearExampleSelection();
                if (domain.trim()) analyzeSOA();
              }}
            />
          </label>
        </div>

        <div class="form-group">
          <label for="resolver" use:tooltip={'Choose a DNS-over-HTTPS resolver for the query'}>
            DoH Resolver
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
            Analyzing SOA Record...
          {:else}
            <Icon name="search" size="sm" />
            Analyze SOA
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
        <h3>SOA Analysis for {results.name}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? 'Copied!' : 'Copy Raw JSON'}
        </button>
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={'The domain that was queried'}>Domain:</span>
            <span class="info-value mono">{results.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={'DNS-over-HTTPS resolver used for the query'}>DoH Resolver:</span>
            <span class="info-value">{results.resolver}</span>
          </div>
        </div>

        <div class="results-grid">
          <!-- Serial Number Analysis -->
          <div class="result-section">
            <h4>Serial Number Analysis</h4>
            <div class="serial-analysis">
              <div class="serial-display">
                <span class="serial-number">{res.soa?.serial || 'Not available'}</span>
                <span class="serial-format {res.serialAnalysis?.format}">{res.serialAnalysis?.format || 'Unknown'}</span
                >
              </div>

              <dl class="definition-list">
                <dt>Format:</dt>
                <dd>
                  <strong>{serialInfo?.formatDescription || 'Unknown'}</strong>
                  <p class="format-explanation">{serialInfo?.explanation || 'No analysis available'}</p>
                </dd>
                {#if serialAnalysis?.parsed}
                  <dt>Parsed Date:</dt>
                  <dd>
                    {#if serialAnalysis.format === 'YYYYMMDDNN'}
                      <div class="parsed-date">
                        <span class="date-part">Year: {serialAnalysis.parsed.year}</span>
                        <span class="date-part">Month: {serialAnalysis.parsed.month}</span>
                        <span class="date-part">Day: {serialAnalysis.parsed.day}</span>
                        <span class="date-part">Revision: {serialAnalysis.parsed.revision}</span>
                      </div>
                    {:else if serialAnalysis.format === 'Unix Timestamp'}
                      <span class="unix-date">{formatDate(serialAnalysis.parsed.timestamp!)}</span>
                    {/if}
                  </dd>
                {/if}

                <dt>Validity:</dt>
                <dd class="validity {serialAnalysis?.valid ? 'valid' : 'invalid'}">
                  <Icon name={serialAnalysis?.valid ? 'check-circle' : 'x-circle'} size="sm" />
                  {serialAnalysis?.valid ? 'Valid format' : 'Invalid or unusual format'}
                </dd>
              </dl>
            </div>
          </div>

          <!-- SOA Record Details -->
          <div class="result-section">
            <h4>SOA Record Details</h4>
            <dl class="definition-list">
              <dt>Primary Server:</dt>
              <dd class="mono">{soaData?.mname || 'Not available'}</dd>

              <dt>Contact Email:</dt>
              <dd class="mono">{soaData?.rname || 'Not available'}</dd>

              <dt>TTL:</dt>
              <dd>
                {#if soaData?.ttl}
                  <span class="ttl-value">{soaData.ttl}s</span>
                  <small>({formatDuration(soaData.ttl)})</small>
                {:else}
                  Not available
                {/if}
              </dd>
            </dl>
          </div>

          <!-- Timing Parameters -->
          <div class="result-section full-width">
            <h4>Zone Timing Parameters</h4>
            <div class="timing-grid">
              <div class="timing-param">
                <h5>Refresh</h5>
                <div class="param-value">{timingData?.refresh || 0}s</div>
                <div class="param-description">
                  <small>{formatDuration(timingData?.refresh || 0)}</small>
                  <p>How often secondary servers check for updates</p>
                </div>
              </div>

              <div class="timing-param">
                <h5>Retry</h5>
                <div class="param-value">{timingData?.retry || 0}s</div>
                <div class="param-description">
                  <small>{formatDuration(timingData?.retry || 0)}</small>
                  <p>Retry interval after failed refresh attempts</p>
                </div>
              </div>

              <div class="timing-param">
                <h5>Expire</h5>
                <div class="param-value">{timingData?.expire || 0}s</div>
                <div class="param-description">
                  <small>{formatDuration(timingData?.expire || 0)}</small>
                  <p>When secondary servers stop serving the zone</p>
                </div>
              </div>

              <div class="timing-param">
                <h5>Minimum</h5>
                <div class="param-value">{timingData?.minimum || 0}s</div>
                <div class="param-description">
                  <small>{formatDuration(timingData?.minimum || 0)}</small>
                  <p>Minimum TTL for negative responses</p>
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
              <h4>Configuration Assessment</h4>
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
            <strong>SOA Analysis Failed</strong>
            <p>{error}</p>
            <div class="troubleshooting">
              <p><strong>Troubleshooting Tips:</strong></p>
              <ul>
                <li>Ensure the domain name is valid and has a SOA record</li>
                <li>Try a different DoH resolver if the current one fails</li>
                <li>Some domains may not respond to certain resolvers</li>
                <li>Check if the domain exists and is properly configured</li>
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
      <h3>About SOA Records and Serial Numbers</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>What is a SOA Record?</h4>
          <p>
            Start of Authority records contain administrative information about a DNS zone, including the primary
            server, contact email, and timing parameters that control zone transfers and caching behavior.
          </p>
        </div>

        <div class="info-section">
          <h4>Serial Number Formats</h4>
          <ul>
            <li><strong>YYYYMMDDNN:</strong> Date-based format (e.g., 2024031501 = March 15, 2024, revision 01)</li>
            <li><strong>Unix Timestamp:</strong> Seconds since epoch (e.g., 1710518400)</li>
            <li><strong>Sequential:</strong> Simple incrementing numbers (e.g., 1, 2, 3...)</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Timing Parameters</h4>
          <ul>
            <li><strong>Refresh:</strong> How often secondaries check for updates</li>
            <li><strong>Retry:</strong> Retry interval after failed transfers</li>
            <li><strong>Expire:</strong> When to stop serving if updates fail</li>
            <li><strong>Minimum:</strong> TTL for negative (NXDOMAIN) responses</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Best Practices</h4>
          <ul>
            <li>Use YYYYMMDDNN format for predictable versioning</li>
            <li>Set refresh to 3600-7200s for most zones</li>
            <li>Retry should be shorter than refresh (1800-3600s)</li>
            <li>Expire should be much longer (604800-1209600s)</li>
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
