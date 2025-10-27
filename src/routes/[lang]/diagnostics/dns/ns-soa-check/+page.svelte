<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';
  import '../../../../../styles/diagnostics-pages.scss';

  let domain = $state('google.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = $derived([
    {
      domain: $t('diagnostics/dns-ns-soa-check.examples.items.google.domain'),
      description: $t('diagnostics/dns-ns-soa-check.examples.items.google.description'),
    },
    {
      domain: $t('diagnostics/dns-ns-soa-check.examples.items.github.domain'),
      description: $t('diagnostics/dns-ns-soa-check.examples.items.github.description'),
    },
    {
      domain: $t('diagnostics/dns-ns-soa-check.examples.items.cloudflare.domain'),
      description: $t('diagnostics/dns-ns-soa-check.examples.items.cloudflare.description'),
    },
    {
      domain: $t('diagnostics/dns-ns-soa-check.examples.items.stackoverflow.domain'),
      description: $t('diagnostics/dns-ns-soa-check.examples.items.stackoverflow.description'),
    },
    {
      domain: $t('diagnostics/dns-ns-soa-check.examples.items.microsoft.domain'),
      description: $t('diagnostics/dns-ns-soa-check.examples.items.microsoft.description'),
    },
    {
      domain: $t('diagnostics/dns-ns-soa-check.examples.items.aws.domain'),
      description: $t('diagnostics/dns-ns-soa-check.examples.items.aws.description'),
    },
  ]);

  async function checkNSSOA() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ns-soa-check',
          domain: domain.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`NS/SOA check failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : $t('common.errors.unknownError');
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    checkNSSOA();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function parseSOA(soaString: string): any {
    // SOA format: primary-ns admin serial refresh retry expire minimum
    const parts = soaString.trim().split(/\s+/);
    if (parts.length >= 7) {
      return {
        primaryNS: parts[0],
        admin: parts[1],
        serial: parseInt(parts[2]),
        refresh: parseInt(parts[3]),
        retry: parseInt(parts[4]),
        expire: parseInt(parts[5]),
        minimum: parseInt(parts[6]),
      };
    }
    return null;
  }

  function formatTime(seconds: number): string {
    if (seconds >= 86400) {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    } else if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function getConsistencyStatus(): { status: string; color: string; message: string } {
    if (!results) return { status: 'unknown', color: 'secondary', message: 'No check performed' };
    if ((results as { error?: string }).error)
      return { status: 'error', color: 'error', message: (results as { error: string }).error };

    const resultsObj = results as { nameserverChecks?: Array<{ resolved?: boolean }> };
    const resolvedCount = resultsObj.nameserverChecks?.filter((ns) => ns.resolved)?.length || 0;
    const totalCount = resultsObj.nameserverChecks?.length || 0;

    if (resolvedCount === totalCount && totalCount > 0) {
      return { status: 'good', color: 'success', message: `All ${totalCount} nameservers resolve correctly` };
    } else if (resolvedCount > 0) {
      return {
        status: 'partial',
        color: 'warning',
        message: `${resolvedCount}/${totalCount} nameservers resolve correctly`,
      };
    } else {
      return { status: 'bad', color: 'error', message: 'No nameservers resolve correctly' };
    }
  }

  async function copyResults() {
    if (!results) return;

    let text = `NS/SOA Check for ${domain}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    if (results.nameservers?.length > 0) {
      text += `Nameservers (${results.nameservers.length}):\n`;
      results.nameservers.forEach((ns: string) => {
        text += `  ${ns}\n`;
      });
      text += '\n';
    }

    if (results.soa) {
      text += `SOA Record:\n${results.soa}\n\n`;
    }

    const nsChecks = (
      results as { nameserverChecks?: Array<{ nameserver: string; resolved: boolean; addresses?: string[] }> }
    ).nameserverChecks;
    if (nsChecks && nsChecks.length > 0) {
      text += `Nameserver Resolution Check:\n`;
      nsChecks!.forEach((check) => {
        text += `  ${check.nameserver}: `;
        if (check.resolved) {
          text += `✓ (${check.addresses?.join(', ') || 'No addresses'})\n`;
        } else {
          text += `✗ Failed to resolve\n`;
        }
      });
      text += '\n';
    }

    const status = getConsistencyStatus();
    text += `Status: ${status.message}`;

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics/dns-ns-soa-check.title')}</h1>
    <p>{$t('diagnostics/dns-ns-soa-check.subtitle')}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics/dns-ns-soa-check.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={$t(
              `diagnostics/dns-ns-soa-check.examples.items.${['google', 'github', 'cloudflare', 'stackoverflow', 'microsoft', 'aws'][i]}.tooltip`,
            )}
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
      <h3>{$t('diagnostics/dns-ns-soa-check.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={$t('diagnostics/dns-ns-soa-check.form.domainTooltip')}>
          {$t('diagnostics/dns-ns-soa-check.form.domainLabel')}
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder={$t('diagnostics/dns-ns-soa-check.form.domainPlaceholder')}
            onchange={() => {
              clearExampleSelection();
              if (domain) checkNSSOA();
            }}
          />
        </label>
      </div>

      <div class="action-section">
        <button class="check-btn lookup-btn" onclick={checkNSSOA} disabled={loading || !domain.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('diagnostics/dns-ns-soa-check.form.checking')}
          {:else}
            <Icon name="server" size="sm" />
            {$t('diagnostics/dns-ns-soa-check.form.checkButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results && !results.error}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics/dns-ns-soa-check.results.title')}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState
            ? $t('diagnostics/dns-ns-soa-check.results.copied')
            : $t('diagnostics/dns-ns-soa-check.results.copyButton')}
        </button>
      </div>
      <div class="card-content">
        <!-- Status Overview -->
        <div class="status-overview">
          {#if results}
            {@const status = getConsistencyStatus()}
            <div class="status-item {status.color}">
              <Icon
                name={status.status === 'good'
                  ? 'check-circle'
                  : status.status === 'partial'
                    ? 'alert-circle'
                    : 'x-circle'}
                size="md"
              />
              <div>
                <h4>
                  {#if status.status === 'good'}
                    {$t('diagnostics/dns-ns-soa-check.results.status.healthy')}
                  {:else if status.status === 'partial'}
                    {$t('diagnostics/dns-ns-soa-check.results.status.issues')}
                  {:else}
                    {$t('diagnostics/dns-ns-soa-check.results.status.problems')}
                  {/if}
                </h4>
                <p>{status.message}</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Nameservers -->
        {#if results.nameservers?.length > 0}
          <div class="nameservers-section">
            <h4>
              {$t('diagnostics/dns-ns-soa-check.results.nameservers.title', { count: results.nameservers.length })}
            </h4>
            <div class="nameserver-grid">
              {#each results.nameserverChecks as check, _index (_index)}
                <div class="nameserver-item {check.resolved ? 'success' : 'error'}">
                  <div class="nameserver-header">
                    <Icon name={check.resolved ? 'check-circle' : 'x-circle'} size="sm" />
                    <span class="nameserver-name">{check.nameserver}</span>
                  </div>

                  {#if check.resolved && (check as { addresses?: string[] }).addresses && (check as { addresses?: string[] }).addresses!.length > 0}
                    <div class="nameserver-addresses">
                      {#each (check as { addresses: string[] }).addresses! as address, addressIndex (addressIndex)}
                        <span class="address-badge">{address}</span>
                      {/each}
                    </div>
                  {:else if !check.resolved}
                    <div class="nameserver-error">
                      <Icon name="alert-triangle" size="xs" />
                      <span>{$t('diagnostics/dns-ns-soa-check.results.nameservers.failedToResolve')}</span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- SOA Record -->
        {#if results.soa}
          {@const parsed = parseSOA(results.soa)}
          <div class="soa-section">
            <h4>{$t('diagnostics/dns-ns-soa-check.results.soa.title')}</h4>

            <!-- Raw SOA -->
            <div class="soa-raw">
              <h5>{$t('diagnostics/dns-ns-soa-check.results.soa.rawTitle')}</h5>
              <div class="soa-display">
                <code>{results.soa}</code>
              </div>
            </div>

            <!-- Parsed SOA -->
            {#if parsed}
              <div class="soa-parsed">
                <h5>{$t('diagnostics/dns-ns-soa-check.results.soa.parsedTitle')}</h5>
                <div class="soa-grid">
                  <div class="soa-item">
                    <div
                      class="soa-label"
                      use:tooltip={$t('diagnostics/dns-ns-soa-check.results.soa.primaryNSTooltip')}
                    >
                      {$t('diagnostics/dns-ns-soa-check.results.soa.primaryNS')}
                    </div>
                    <div class="soa-value">{parsed.primaryNS}</div>
                  </div>

                  <div class="soa-item">
                    <div
                      class="soa-label"
                      use:tooltip={$t('diagnostics/dns-ns-soa-check.results.soa.administratorTooltip')}
                    >
                      {$t('diagnostics/dns-ns-soa-check.results.soa.administrator')}
                    </div>
                    <div class="soa-value">{parsed.admin}</div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={$t('diagnostics/dns-ns-soa-check.results.soa.serialTooltip')}>
                      {$t('diagnostics/dns-ns-soa-check.results.soa.serial')}
                    </div>
                    <div class="soa-value mono">{parsed.serial}</div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={$t('diagnostics/dns-ns-soa-check.results.soa.refreshTooltip')}>
                      {$t('diagnostics/dns-ns-soa-check.results.soa.refresh')}
                    </div>
                    <div class="soa-value">
                      <span class="mono">{parsed.refresh}s</span>
                      <span class="time-readable">({formatTime(parsed.refresh)})</span>
                    </div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={$t('diagnostics/dns-ns-soa-check.results.soa.retryTooltip')}>
                      {$t('diagnostics/dns-ns-soa-check.results.soa.retry')}
                    </div>
                    <div class="soa-value">
                      <span class="mono">{parsed.retry}s</span>
                      <span class="time-readable">({formatTime(parsed.retry)})</span>
                    </div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={$t('diagnostics/dns-ns-soa-check.results.soa.expireTooltip')}>
                      {$t('diagnostics/dns-ns-soa-check.results.soa.expire')}
                    </div>
                    <div class="soa-value">
                      <span class="mono">{parsed.expire}s</span>
                      <span class="time-readable">({formatTime(parsed.expire)})</span>
                    </div>
                  </div>

                  <div class="soa-item">
                    <div
                      class="soa-label"
                      use:tooltip={$t('diagnostics/dns-ns-soa-check.results.soa.minimumTTLTooltip')}
                    >
                      {$t('diagnostics/dns-ns-soa-check.results.soa.minimumTTL')}
                    </div>
                    <div class="soa-value">
                      <span class="mono">{parsed.minimum}s</span>
                      <span class="time-readable">({formatTime(parsed.minimum)})</span>
                    </div>
                  </div>
                </div>

                <!-- Configuration Analysis -->
                <div class="recommendations-section">
                  <h5>{$t('diagnostics/dns-ns-soa-check.results.analysis.title')}</h5>
                  <div class="recommendation-list">
                    <!-- Serial number check -->
                    {#if parsed.serial.toString().length === 10 && parsed.serial.toString().startsWith('202')}
                      <div class="recommendation-item success">
                        <Icon name="check-circle" size="sm" />
                        <span>{$t('diagnostics/dns-ns-soa-check.results.analysis.serialYYYYMMDDNN')}</span>
                      </div>
                    {:else}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span>{$t('diagnostics/dns-ns-soa-check.results.analysis.serialSuggestion')}</span>
                      </div>
                    {/if}

                    <!-- Refresh interval check -->
                    {#if parsed.refresh >= 3600 && parsed.refresh <= 86400}
                      <div class="recommendation-item success">
                        <Icon name="check-circle" size="sm" />
                        <span
                          >{$t('diagnostics/dns-ns-soa-check.results.analysis.refreshGood', {
                            time: formatTime(parsed.refresh),
                          })}</span
                        >
                      </div>
                    {:else if parsed.refresh < 3600}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span
                          >{$t('diagnostics/dns-ns-soa-check.results.analysis.refreshTooFrequent', {
                            time: formatTime(parsed.refresh),
                          })}</span
                        >
                      </div>
                    {:else}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span
                          >{$t('diagnostics/dns-ns-soa-check.results.analysis.refreshTooLong', {
                            time: formatTime(parsed.refresh),
                          })}</span
                        >
                      </div>
                    {/if}

                    <!-- Retry interval check -->
                    {#if parsed.retry >= 600 && parsed.retry < parsed.refresh}
                      <div class="recommendation-item success">
                        <Icon name="check-circle" size="sm" />
                        <span>{$t('diagnostics/dns-ns-soa-check.results.analysis.retryGood')}</span>
                      </div>
                    {:else if parsed.retry >= parsed.refresh}
                      <div class="recommendation-item error">
                        <Icon name="x-circle" size="sm" />
                        <span>{$t('diagnostics/dns-ns-soa-check.results.analysis.retryTooLong')}</span>
                      </div>
                    {:else}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span
                          >{$t('diagnostics/dns-ns-soa-check.results.analysis.retryTooShort', {
                            time: formatTime(parsed.retry),
                          })}</span
                        >
                      </div>
                    {/if}

                    <!-- Expire check -->
                    {#if parsed.expire >= 604800}
                      <div class="recommendation-item success">
                        <Icon name="check-circle" size="sm" />
                        <span
                          >{$t('diagnostics/dns-ns-soa-check.results.analysis.expireGood', {
                            time: formatTime(parsed.expire),
                          })}</span
                        >
                      </div>
                    {:else}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span
                          >{$t('diagnostics/dns-ns-soa-check.results.analysis.expireShort', {
                            time: formatTime(parsed.expire),
                          })}</span
                        >
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if error || results?.error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>{$t('diagnostics/dns-ns-soa-check.error.title')}</strong>
            <p>{error || results.error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/dns-ns-soa-check.education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/dns-ns-soa-check.education.nsRecords.title')}</h4>
          <p>{$t('diagnostics/dns-ns-soa-check.education.nsRecords.description')}</p>
          <ul>
            <li>{$t('diagnostics/dns-ns-soa-check.education.nsRecords.resolveToValidIP')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.nsRecords.beReachable')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.nsRecords.serveConsistent')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.nsRecords.beDistributed')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-ns-soa-check.education.soaRecord.title')}</h4>
          <p>{$t('diagnostics/dns-ns-soa-check.education.soaRecord.description')}</p>
          <ul>
            <li>{$t('diagnostics/dns-ns-soa-check.education.soaRecord.serial')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.soaRecord.refresh')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.soaRecord.retry')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.soaRecord.expire')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.soaRecord.minimum')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-ns-soa-check.education.recommended.title')}</h4>
          <div class="recommendations-table">
            <div class="rec-item">{$t('diagnostics/dns-ns-soa-check.education.recommended.refresh')}</div>
            <div class="rec-item">{$t('diagnostics/dns-ns-soa-check.education.recommended.retry')}</div>
            <div class="rec-item">{$t('diagnostics/dns-ns-soa-check.education.recommended.expire')}</div>
            <div class="rec-item">{$t('diagnostics/dns-ns-soa-check.education.recommended.minimum')}</div>
          </div>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-ns-soa-check.education.commonIssues.title')}</h4>
          <ul>
            <li>{$t('diagnostics/dns-ns-soa-check.education.commonIssues.unreachable')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.commonIssues.inconsistent')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.commonIssues.wrongValues')}</li>
            <li>{$t('diagnostics/dns-ns-soa-check.education.commonIssues.serialIssues')}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  // Page-specific styles - shared styles removed
  // Use shared .lookup-btn instead of .check-btn

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  // Custom status item styling for NS/SOA (extends shared styles)
  .status-item {
    border: 2px solid;
    gap: var(--spacing-md);

    &.success {
      border-color: var(--color-success);
    }

    &.warning {
      border-color: var(--color-warning);
    }

    &.error {
      border-color: var(--color-error);
    }

    h4 {
      margin: 0;
      font-size: var(--font-size-md);
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      opacity: 0.8;
    }
  }

  .nameservers-section,
  .soa-section,
  .recommendations-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .soa-section,
  .recommendations-section {
    h5 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .nameserver-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .nameserver-item {
    background: var(--bg-secondary);
    border: 2px solid;
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    &.success {
      border-color: var(--border-primary);
    }

    &.error {
      border-color: var(--color-error);
    }
  }

  .nameserver-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .nameserver-name {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-weight: 600;
  }

  .nameserver-addresses {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .address-badge {
    background: var(--color-primary);
    color: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .nameserver-error {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-error);
    font-size: var(--font-size-sm);
  }

  .soa-raw {
    margin-bottom: var(--spacing-lg);
  }

  // SOA display uses shared record-display styles
  .soa-display {
    code {
      display: block;
      padding: var(--spacing-sm);
      background: var(--bg-secondary);
    }
  }

  .soa-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .soa-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .soa-label {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
  }

  .soa-value {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .mono {
      font-family: var(--font-mono);
      font-weight: 600;
    }

    .time-readable {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
    }
  }

  .recommendation-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  // Educational content specific to NS/SOA
  .info-card {
    background: var(--bg-tertiary);
  }

  .recommendations-table {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .rec-item {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
    }
  }

  .mono {
    font-family: var(--font-mono);
  }

  // Page-specific styles only (common utilities moved to diagnostics-pages.scss)
</style>
