<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics');
  });

  let domain = $state('gmail.com');
  let checkPorts = $state(false);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const examplesList = [
    { domain: 'gmail.com', description: $t('diagnostics.mx-health.examples.gmail') },
    { domain: 'outlook.com', description: $t('diagnostics.mx-health.examples.outlook') },
    { domain: 'yahoo.com', description: $t('diagnostics.mx-health.examples.yahoo') },
    { domain: 'protonmail.com', description: $t('diagnostics.mx-health.examples.protonmail') },
    { domain: 'fastmail.com', description: $t('diagnostics.mx-health.examples.fastmail') },
    { domain: 'github.com', description: $t('diagnostics.mx-health.examples.github') },
  ];

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
      diagnosticState.setError(err instanceof Error ? err.message : $t('diagnostics.mx-health.error.unknown'));
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
        return $t('diagnostics.mx-health.ports.smtp');
      case 587:
        return $t('diagnostics.mx-health.ports.submission');
      case 465:
        return $t('diagnostics.mx-health.ports.smtps');
      default:
        return $t('diagnostics.mx-health.ports.custom', { port });
    }
  }

  async function copyResults() {
    if (!diagnosticState.results) return;

    let text = `MX Health Check for ${domain}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    text += `Summary:\n`;
    text += `  Total MX records: ${diagnosticState.results.summary.totalMX}\n`;
    text += `  Healthy MX records: ${diagnosticState.results.summary.healthyMX}\n`;
    if (diagnosticState.results.summary.reachableMX !== null) {
      text += `  Reachable MX records: ${diagnosticState.results.summary.reachableMX}\n`;
    }
    text += `  Overall health: ${diagnosticState.results.summary.healthy ? $t('diagnostics.mx-health.results.healthy') : $t('diagnostics.mx-health.results.issuesDetected')}\n`;
    text += `  Redundancy: ${diagnosticState.results.summary.hasRedundancy ? 'Yes' : 'No'}\n\n`;

    text += `MX Records (by priority):\n`;
    type MxRecord = {
      exchange: string;
      priority: number;
      error?: string;
      addresses?: { ipv4: string[]; ipv6: string[] };
      portChecks?: Array<{ port: number; open: boolean; latency?: number }>;
    };
    const mxRecords = (diagnosticState.results as { mxRecords: MxRecord[] }).mxRecords;
    mxRecords.forEach((mx, _index) => {
      text += `${_index + 1}. ${mx.exchange} (Priority: ${mx.priority})\n`;
      if (mx.error) {
        text += `   Error: ${mx.error}\n`;
      } else if (mx.addresses) {
        text += `   IPv4: ${mx.addresses.ipv4.join(', ') || 'None'}\n`;
        text += `   IPv6: ${mx.addresses.ipv6.join(', ') || 'None'}\n`;
        if (mx.portChecks) {
          text += `   Port checks:\n`;
          mx.portChecks.forEach((port) => {
            text += `     ${port.port}: ${port.open ? 'Open' : 'Closed'}`;
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
    getTooltip={(ex) => $t('diagnostics.mx-health.examples.tooltip', { domain: ex.domain })}
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
            placeholder="example.com"
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
            {$t('diagnostics.mx-health.form.button.checking')}
          {:else}
            <Icon name="mail-check" size="sm" />
            {$t('diagnostics.mx-health.form.button.check')}
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
          {clipboard.isCopied() ? $t('common.copied') : $t('diagnostics.mx-health.results.copy')}
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
                {diagnosticState.results.summary.healthyMX} of {diagnosticState.results.summary.totalMX} MX records resolved
                successfully
                {#if checkPorts && diagnosticState.results.summary.reachableMX !== null}
                  • {diagnosticState.results.summary.reachableMX} reachable via SMTP
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
                <span class="stat-label">{$t('diagnostics.mx-health.results.stats.redundancy')}</span>
                <span class="stat-value {getHealthColor(diagnosticState.results.summary.hasRedundancy)}"
                  >{diagnosticState.results.summary.hasRedundancy ? $t('common.yes') : $t('common.no')}</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- MX Records -->
        <div class="mx-section">
          <h4>{$t('diagnostics.mx-health.results.mxRecords.title')}</h4>
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
                          <span>{$t('diagnostics.mx-health.results.mxRecords.ipv4')}</span>
                        </div>
                        <div class="address-list">
                          {#if mx.addresses.ipv4.length > 0}
                            {#each mx.addresses.ipv4 as ip, ipIndex (ipIndex)}
                              <code class="ip-address">{ip}</code>
                            {/each}
                          {:else}
                            <span class="no-addresses">{$t('common.none')}</span>
                          {/if}
                        </div>
                      </div>

                      <div class="address-group">
                        <div class="address-header">
                          <Icon name="globe" size="xs" />
                          <span>{$t('diagnostics.mx-health.results.mxRecords.ipv6')}</span>
                        </div>
                        <div class="address-list">
                          {#if mx.addresses.ipv6.length > 0}
                            {#each mx.addresses.ipv6 as ip, ipIndex (ipIndex)}
                              <code class="ip-address">{ip}</code>
                            {/each}
                          {:else}
                            <span class="no-addresses">{$t('common.none')}</span>
                          {/if}
                        </div>
                      </div>
                    </div>

                    <!-- Port Checks -->
                    {#if mx.portChecks && checkPorts}
                      <div class="ports-section">
                        <div class="ports-header">
                          <Icon name="wifi" size="xs" />
                          <span>{$t('diagnostics.mx-health.results.mxRecords.portConnectivity')}</span>
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
                                <span class="port-status"
                                  >{portCheck.open
                                    ? $t('diagnostics.mx-health.results.mxRecords.open')
                                    : $t('diagnostics.mx-health.results.mxRecords.closed')}</span
                                >
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

  <ErrorCard title={$t('diagnostics.mx-health.error.title')} error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics.mx-health.education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics.mx-health.education.basics.title')}</h4>
          <ul>
            <li>
              <strong>{$t('diagnostics.mx-health.education.basics.priority.title')}:</strong>
              {$t('diagnostics.mx-health.education.basics.priority.description')}
            </li>
            <li>
              <strong>{$t('diagnostics.mx-health.education.basics.exchange.title')}:</strong>
              {$t('diagnostics.mx-health.education.basics.exchange.description')}
            </li>
            <li>
              <strong>{$t('diagnostics.mx-health.education.basics.redundancy.title')}:</strong>
              {$t('diagnostics.mx-health.education.basics.redundancy.description')}
            </li>
            <li>
              <strong>{$t('diagnostics.mx-health.education.basics.loadBalancing.title')}:</strong>
              {$t('diagnostics.mx-health.education.basics.loadBalancing.description')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.mx-health.education.smtpPorts.title')}</h4>
          <div class="port-explanations">
            <div class="port-explanation">
              <strong>{$t('diagnostics.mx-health.education.smtpPorts.port25.title')}:</strong>
              {$t('diagnostics.mx-health.education.smtpPorts.port25.description')}
            </div>
            <div class="port-explanation">
              <strong>{$t('diagnostics.mx-health.education.smtpPorts.port587.title')}:</strong>
              {$t('diagnostics.mx-health.education.smtpPorts.port587.description')}
            </div>
            <div class="port-explanation">
              <strong>{$t('diagnostics.mx-health.education.smtpPorts.port465.title')}:</strong>
              {$t('diagnostics.mx-health.education.smtpPorts.port465.description')}
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.mx-health.education.healthIndicators.title')}</h4>
          <ul>
            <li>{$t('diagnostics.mx-health.education.healthIndicators.allResolve')}</li>
            <li>{$t('diagnostics.mx-health.education.healthIndicators.oneReachable')}</li>
            <li>{$t('diagnostics.mx-health.education.healthIndicators.multipleRedundancy')}</li>
            <li>{$t('diagnostics.mx-health.education.healthIndicators.lowerPriority')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.mx-health.education.commonIssues.title')}</h4>
          <ul>
            <li>{$t('diagnostics.mx-health.education.commonIssues.nonExistentHosts')}</li>
            <li>{$t('diagnostics.mx-health.education.commonIssues.portsBlocked')}</li>
            <li>{$t('diagnostics.mx-health.education.commonIssues.singlePoint')}</li>
            <li>{$t('diagnostics.mx-health.education.commonIssues.incorrectPriority')}</li>
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
