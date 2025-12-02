<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import '../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics');
  });

  let domain = $state('gmail.com');
  let checkPorts = $state(false);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const examplesList = $derived([
    { domain: 'gmail.com', description: $t('diagnostics.mx-health.examples.gmail') },
    { domain: 'outlook.com', description: $t('diagnostics.mx-health.examples.outlook') },
    { domain: 'yahoo.com', description: $t('diagnostics.mx-health.examples.yahoo') },
    { domain: 'protonmail.com', description: $t('diagnostics.mx-health.examples.protonmail') },
    { domain: 'fastmail.com', description: $t('diagnostics.mx-health.examples.fastmail') },
    { domain: 'github.com', description: $t('diagnostics.mx-health.examples.github') },
  ]);

  const examples = useExamples(() => examplesList);

  async function checkMXHealth() {
    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mx-health',
          domain: domain.trim(),
          checkPorts,
        }),
      });

      if (!response.ok) {
        throw new Error(`MX health check failed: ${response.status}`);
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : $t('common.errors.unknownError'));
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    domain = example.domain;
    examples.select(index);
    checkMXHealth();
  }

  function getHealthColor(isHealthy: boolean): string {
    return isHealthy ? 'success' : 'error';
  }

  function getPortStatus(portCheck: unknown): string {
    const check = portCheck as { open?: boolean };
    return check.open ? 'success' : 'error';
  }

  function getPortDescription(port: number): string {
    switch (port) {
      case 25:
        return $t('diagnostics.mx-health.ports.25');
      case 587:
        return $t('diagnostics.mx-health.ports.587');
      case 465:
        return $t('diagnostics.mx-health.ports.465');
      default:
        return $t('diagnostics.mx-health.ports.generic', { port });
    }
  }

  async function copyResults() {
    if (!diagnosticState.results) return;

    let text = `${$t('diagnostics.mx-health.copy.title', { domain })}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    text += `${$t('diagnostics.mx-health.copy.summary')}\n`;
    text += `  ${$t('diagnostics.mx-health.copy.totalMx', { count: diagnosticState.results.summary.totalMX })}\n`;
    text += `  ${$t('diagnostics.mx-health.copy.healthyMx', { count: diagnosticState.results.summary.healthyMX })}\n`;
    if (diagnosticState.results.summary.reachableMX !== null) {
      text += `  ${$t('diagnostics.mx-health.copy.reachableMx', { count: diagnosticState.results.summary.reachableMX })}\n`;
    }
    text += `  ${$t('diagnostics.mx-health.copy.overallHealth', { status: diagnosticState.results.summary.healthy ? $t('diagnostics.mx-health.copy.healthy') : $t('diagnostics.mx-health.copy.issuesDetected') })}\n`;
    text += `  ${$t('diagnostics.mx-health.copy.redundancy', { status: diagnosticState.results.summary.hasRedundancy ? $t('diagnostics.mx-health.copy.yes') : $t('diagnostics.mx-health.copy.no') })}\n\n`;

    text += `${$t('diagnostics.mx-health.copy.mxRecordsByPriority')}\n`;
    type MxRecord = {
      exchange: string;
      priority: number;
      error?: string;
      addresses?: { ipv4: string[]; ipv6: string[] };
      portChecks?: Array<{ port: number; open: boolean; latency?: number }>;
    };
    const mxRecords = (diagnosticState.results as { mxRecords: MxRecord[] }).mxRecords;
    mxRecords.forEach((mx, _index) => {
      text += `${_index + 1}. ${mx.exchange} ${$t('diagnostics.mx-health.copy.priority', { priority: mx.priority })}\n`;
      if (mx.error) {
        text += `   ${$t('diagnostics.mx-health.copy.error', { error: mx.error })}\n`;
      } else if (mx.addresses) {
        text += `   ${$t('diagnostics.mx-health.copy.ipv4', { addresses: mx.addresses.ipv4.join(', ') || $t('diagnostics.mx-health.copy.none') })}\n`;
        text += `   ${$t('diagnostics.mx-health.copy.ipv6', { addresses: mx.addresses.ipv6.join(', ') || $t('diagnostics.mx-health.copy.none') })}\n`;
        if (mx.portChecks) {
          text += `   ${$t('diagnostics.mx-health.copy.portChecks')}\n`;
          mx.portChecks.forEach((port) => {
            text += `     ${port.port}: ${port.open ? $t('diagnostics.mx-health.copy.open') : $t('diagnostics.mx-health.copy.closed')}`;
            if (port.latency) text += ` (${port.latency}ms)`;
            text += `\n`;
          });
        }
      }
      text += `\n`;
    });

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics.mx-health.title')}</h1>
    <p>
      {$t('diagnostics.mx-health.description')}
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('diagnostics.mx-health.examples.title')}
    getLabel={(ex) => ex.domain}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Check MX health for ${ex.domain}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics.mx-health.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain">
          {$t('diagnostics.mx-health.form.domain.label')}
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder={$t('diagnostics.mx-health.form.domain.placeholder')}
            onchange={() => {
              examples.clear();
              if (domain) checkMXHealth();
            }}
          />
        </label>
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={checkPorts} />
          <span class="checkbox-text">{$t('diagnostics.mx-health.form.checkPorts.label')}</span>
        </label>
      </div>

      <div class="action-section">
        <button
          class="check-btn lookup-btn"
          onclick={checkMXHealth}
          disabled={diagnosticState.loading || !domain.trim()}
        >
          {#if diagnosticState.loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('diagnostics.mx-health.form.checking')}
          {:else}
            <Icon name="mail-check" size="sm" />
            {$t('diagnostics.mx-health.form.check')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics.mx-health.results.title')}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? $t('common.actions.copied') : $t('common.actions.copyResults')}
        </button>
      </div>
      <div class="card-content">
        <!-- Health Summary -->
        <div class="summary-section">
          <div class="health-overview {getHealthColor(diagnosticState.results.summary.healthy)}">
            <Icon name={diagnosticState.results.summary.healthy ? 'check-circle' : 'alert-circle'} size="md" />
            <div>
              <h4>
                {#if diagnosticState.results.summary.healthy}
                  {$t('diagnostics.mx-health.results.summary.healthy')}
                {:else}
                  {$t('diagnostics.mx-health.results.summary.issues')}
                {/if}
              </h4>
              <p>
                {$t('diagnostics.mx-health.results.summary.resolvedSuccessfully', {
                  healthy: diagnosticState.results.summary.healthyMX,
                  total: diagnosticState.results.summary.totalMX,
                })}
                {#if checkPorts && diagnosticState.results.summary.reachableMX !== null}
                  {$t('diagnostics.mx-health.results.summary.reachableViaSmtp', {
                    reachable: diagnosticState.results.summary.reachableMX,
                  })}
                {/if}
              </p>
            </div>
          </div>

          <div class="summary-stats">
            <div class="stat-item">
              <Icon name="server" size="sm" />
              <div>
                <span class="stat-label">{$t('diagnostics.mx-health.results.stats.mxRecords')}</span>
                <span class="stat-value">{diagnosticState.results.summary.totalMX}</span>
              </div>
            </div>

            <div class="stat-item">
              <Icon name="shield-check" size="sm" />
              <div>
                <span class="stat-label">{$t('diagnostics.mx-health.results.stats.healthy')}</span>
                <span class="stat-value {getHealthColor(diagnosticState.results.summary.healthy)}"
                  >{diagnosticState.results.summary.healthyMX}</span
                >
              </div>
            </div>

            {#if checkPorts && diagnosticState.results.summary.reachableMX !== null}
              <div class="stat-item">
                <Icon name="wifi" size="sm" />
                <div>
                  <span class="stat-label">{$t('diagnostics.mx-health.results.stats.reachable')}</span>
                  <span class="stat-value {getHealthColor(diagnosticState.results.summary.reachableMX > 0)}"
                    >{diagnosticState.results.summary.reachableMX}</span
                  >
                </div>
              </div>
            {/if}

            <div class="stat-item">
              <Icon name="copy" size="sm" />
              <div>
                <span class="stat-label">Redundancy</span>
                <span class="stat-value {getHealthColor(diagnosticState.results.summary.hasRedundancy)}"
                  >{diagnosticState.results.summary.hasRedundancy ? 'Yes' : 'No'}</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- MX Records -->
        <div class="mx-section">
          <h4>MX Records (by priority)</h4>
          <div class="mx-list">
            {#each (diagnosticState.results as { mxRecords: Array<{ error?: string; exchange: string; priority: number; addresses?: { ipv4: string[]; ipv6: string[] }; portChecks?: Array<{ port: number; open: boolean; latency?: number }> }> }).mxRecords as mx, _index (_index)}
              <div class="mx-record {mx.error ? 'error' : 'success'}">
                <div class="mx-header">
                  <div class="mx-info">
                    <div class="mx-exchange">
                      <Icon name="server" size="sm" />
                      <span class="exchange-name">{mx.exchange}</span>
                      <span class="priority-badge">Priority {mx.priority}</span>
                    </div>
                    {#if mx.error}
                      <div class="mx-error">
                        <Icon name="alert-triangle" size="xs" />
                        <span>{mx.error}</span>
                      </div>
                    {/if}
                  </div>

                  <div class="mx-status">
                    <span class={mx.error ? 'text-error' : 'text-success'}
                      ><Icon name={mx.error ? 'x-circle' : 'check-circle'} size="sm" /></span
                    >
                  </div>
                </div>

                {#if mx.addresses && !mx.error}
                  <div class="mx-details">
                    <!-- IP Addresses -->
                    <div class="addresses-section">
                      <div class="address-group">
                        <div class="address-header">
                          <Icon name="globe" size="xs" />
                          <span>IPv4 Addresses</span>
                        </div>
                        <div class="address-list">
                          {#if mx.addresses.ipv4.length > 0}
                            {#each mx.addresses.ipv4 as ip, ipIndex (ipIndex)}
                              <code class="ip-address">{ip}</code>
                            {/each}
                          {:else}
                            <span class="no-addresses">None</span>
                          {/if}
                        </div>
                      </div>

                      <div class="address-group">
                        <div class="address-header">
                          <Icon name="globe" size="xs" />
                          <span>IPv6 Addresses</span>
                        </div>
                        <div class="address-list">
                          {#if mx.addresses.ipv6.length > 0}
                            {#each mx.addresses.ipv6 as ip, ipIndex (ipIndex)}
                              <code class="ip-address">{ip}</code>
                            {/each}
                          {:else}
                            <span class="no-addresses">None</span>
                          {/if}
                        </div>
                      </div>
                    </div>

                    <!-- Port Checks -->
                    {#if mx.portChecks && checkPorts}
                      <div class="ports-section">
                        <div class="ports-header">
                          <Icon name="wifi" size="xs" />
                          <span>SMTP Port Connectivity</span>
                        </div>
                        <div class="port-checks">
                          {#each mx.portChecks || [] as portCheck, portIndex (portIndex)}
                            <div class="port-check {getPortStatus(portCheck)}">
                              <div class="port-info">
                                <span class="port-number">{portCheck.port}</span>
                                <span class="port-description">{getPortDescription(portCheck.port)}</span>
                              </div>
                              <div class="port-result">
                                <Icon name={portCheck.open ? 'check' : 'x'} size="xs" />
                                <span class="port-status">{portCheck.open ? 'Open' : 'Closed'}</span>
                                {#if portCheck.latency}
                                  <span class="port-latency">({portCheck.latency}ms)</span>
                                {/if}
                              </div>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard title="MX Health Check Failed" error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding MX Records</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>MX Record Basics</h4>
          <ul>
            <li><strong>Priority:</strong> Lower numbers have higher priority</li>
            <li><strong>Exchange:</strong> The mail server hostname</li>
            <li><strong>Redundancy:</strong> Multiple MX records provide failover</li>
            <li><strong>Load balancing:</strong> Equal priorities distribute load</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>SMTP Ports</h4>
          <div class="port-explanations">
            <div class="port-explanation">
              <strong>Port 25:</strong> Standard SMTP (server-to-server)
            </div>
            <div class="port-explanation">
              <strong>Port 587:</strong> Mail submission (client-to-server, TLS)
            </div>
            <div class="port-explanation">
              <strong>Port 465:</strong> SMTPS (deprecated but still used)
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>Health Indicators</h4>
          <ul>
            <li>All MX records should resolve to IP addresses</li>
            <li>At least one SMTP port should be reachable</li>
            <li>Multiple MX records provide redundancy</li>
            <li>Lower priority servers should be reachable</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Common Issues</h4>
          <ul>
            <li>MX pointing to non-existent hosts</li>
            <li>All SMTP ports blocked by firewall</li>
            <li>Single point of failure (one MX record)</li>
            <li>Incorrect priority configuration</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .checkbox-group {
    margin: var(--spacing-md) 0;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;

    input[type='checkbox'] {
      margin: 0;
    }

    .checkbox-text {
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }
  }

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  .summary-section {
    margin-bottom: var(--spacing-lg);
  }

  .health-overview {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    border: 2px solid;
    margin-bottom: var(--spacing-md);

    &.success {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      border-color: var(--color-success);
    }

    &.error {
      background: color-mix(in srgb, var(--color-error), transparent 95%);
      border-color: var(--color-error);
    }

    h4 {
      margin: 0;
      color: var(--text-primary);
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      display: block;
    }

    .stat-value {
      font-weight: 600;
      color: var(--text-primary);

      &.success {
        color: var(--color-success);
      }
      &.error {
        color: var(--color-error);
      }
    }
  }

  .mx-section {
    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .mx-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .mx-record {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    border-left: 4px solid;

    &.success {
      border-left-color: var(--color-success);
    }

    &.error {
      border-left-color: var(--color-error);
    }
  }

  .mx-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--spacing-md);
  }

  .mx-info {
    flex: 1;
  }

  .mx-exchange {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);

    .exchange-name {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-primary);
    }

    .priority-badge {
      background: var(--bg-primary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }
  }

  .mx-error {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-error);
    font-size: var(--font-size-xs);
  }

  .mx-details {
    padding: 0 var(--spacing-md) var(--spacing-md);
    border-top: 1px solid var(--border-color);
    padding-top: var(--spacing-md);
  }

  .addresses-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .address-group {
    .address-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-weight: 500;
    }

    .address-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);

      .ip-address {
        font-family: var(--font-mono);
        background: var(--bg-primary);
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
      }

      .no-addresses {
        color: var(--text-secondary);
        font-style: italic;
        font-size: var(--font-size-xs);
      }
    }
  }

  .ports-section {
    .ports-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-weight: 500;
    }

    .port-checks {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-sm);
    }
  }

  .port-check {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-sm);
    border: 1px solid;

    &.success {
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 95%);
    }

    &.error {
      border-color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 95%);
    }

    .port-info {
      .port-number {
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--text-primary);
      }

      .port-description {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        display: block;
      }
    }

    .port-result {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-xs);

      .port-status {
        font-weight: 500;
      }

      .port-latency {
        color: var(--text-secondary);
      }
    }
  }

  .port-explanations {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .port-explanation {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);

      strong {
        color: var(--text-primary);
        font-family: var(--font-mono);
      }
    }
  }

  .text-success {
    color: var(--color-success);
  }
  .text-error {
    color: var(--color-error);
  }
</style>
