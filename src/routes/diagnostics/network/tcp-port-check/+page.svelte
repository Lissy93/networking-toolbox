<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let targets = $state('google.com:443\ngithub.com:443\nstackoverflow.com:443');
  let timeout = $state(5000);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const examplesList = [
    {
      targets: $t('diagnostics/network-tcp-port-check.examples.items.https.targets'),
      description: $t('diagnostics/network-tcp-port-check.examples.items.https.description'),
      tooltip: $t('diagnostics/network-tcp-port-check.examples.items.https.tooltip'),
    },
    {
      targets: $t('diagnostics/network-tcp-port-check.examples.items.smtp.targets'),
      description: $t('diagnostics/network-tcp-port-check.examples.items.smtp.description'),
      tooltip: $t('diagnostics/network-tcp-port-check.examples.items.smtp.tooltip'),
    },
    {
      targets: $t('diagnostics/network-tcp-port-check.examples.items.dns.targets'),
      description: $t('diagnostics/network-tcp-port-check.examples.items.dns.description'),
      tooltip: $t('diagnostics/network-tcp-port-check.examples.items.dns.tooltip'),
    },
    {
      targets: $t('diagnostics/network-tcp-port-check.examples.items.httpVsHttps.targets'),
      description: $t('diagnostics/network-tcp-port-check.examples.items.httpVsHttps.description'),
      tooltip: $t('diagnostics/network-tcp-port-check.examples.items.httpVsHttps.tooltip'),
    },
    {
      targets: $t('diagnostics/network-tcp-port-check.examples.items.localDev.targets'),
      description: $t('diagnostics/network-tcp-port-check.examples.items.localDev.description'),
      tooltip: $t('diagnostics/network-tcp-port-check.examples.items.localDev.tooltip'),
    },
    {
      targets: $t('diagnostics/network-tcp-port-check.examples.items.microsoft.targets'),
      description: $t('diagnostics/network-tcp-port-check.examples.items.microsoft.description'),
      tooltip: $t('diagnostics/network-tcp-port-check.examples.items.microsoft.tooltip'),
    },
  ];

  const examples = useExamples(() => examplesList);

  const commonPorts = $derived([
    {
      port: $t('diagnostics/network-tcp-port-check.commonPorts.ssh.port'),
      service: $t('diagnostics/network-tcp-port-check.commonPorts.ssh.service'),
      description: $t('diagnostics/network-tcp-port-check.commonPorts.ssh.description'),
    },
    {
      port: $t('diagnostics/network-tcp-port-check.commonPorts.http.port'),
      service: $t('diagnostics/network-tcp-port-check.commonPorts.http.service'),
      description: $t('diagnostics/network-tcp-port-check.commonPorts.http.description'),
    },
    {
      port: $t('diagnostics/network-tcp-port-check.commonPorts.https.port'),
      service: $t('diagnostics/network-tcp-port-check.commonPorts.https.service'),
      description: $t('diagnostics/network-tcp-port-check.commonPorts.https.description'),
    },
    {
      port: $t('diagnostics/network-tcp-port-check.commonPorts.smtp.port'),
      service: $t('diagnostics/network-tcp-port-check.commonPorts.smtp.service'),
      description: $t('diagnostics/network-tcp-port-check.commonPorts.smtp.description'),
    },
    {
      port: $t('diagnostics/network-tcp-port-check.commonPorts.smtpSubmission.port'),
      service: $t('diagnostics/network-tcp-port-check.commonPorts.smtpSubmission.service'),
      description: $t('diagnostics/network-tcp-port-check.commonPorts.smtpSubmission.description'),
    },
    {
      port: $t('diagnostics/network-tcp-port-check.commonPorts.imaps.port'),
      service: $t('diagnostics/network-tcp-port-check.commonPorts.imaps.service'),
      description: $t('diagnostics/network-tcp-port-check.commonPorts.imaps.description'),
    },
    {
      port: $t('diagnostics/network-tcp-port-check.commonPorts.pop3s.port'),
      service: $t('diagnostics/network-tcp-port-check.commonPorts.pop3s.service'),
      description: $t('diagnostics/network-tcp-port-check.commonPorts.pop3s.description'),
    },
    {
      port: $t('diagnostics/network-tcp-port-check.commonPorts.dns.port'),
      service: $t('diagnostics/network-tcp-port-check.commonPorts.dns.service'),
      description: $t('diagnostics/network-tcp-port-check.commonPorts.dns.description'),
    },
  ]);

  // Reactive validation
  const targetsList = $derived(() => {
    return targets
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t)
      .slice(0, 50); // Limit to 50 targets
  });

  const isInputValid = $derived(() => {
    return targetsList().length > 0 && targetsList().every((target: string) => /^[a-zA-Z0-9.-]+:\d+$/.test(target));
  });

  async function checkPorts() {
    diagnosticState.startOperation();

    // Calculate targets list at function call time
    const currentTargets = targets
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t)
      .slice(0, 50);

    try {
      const response = await fetch('/api/internal/diagnostics/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tcp-port-check',
          targets: currentTargets,
          timeout,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `Port check failed (${response.status})`);
        } catch {
          // If JSON parsing fails, use the raw error text or status
          throw new Error(errorText || `Port check failed (${response.status})`);
        }
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError((err as Error).message);
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    targets = example.targets;
    timeout = 5000;
    examples.select(index);
    checkPorts();
  }

  function addCommonPort(port: string) {
    const currentTargets = targets.trim();
    const newTarget = `example.com:${port}`;
    targets = currentTargets ? `${currentTargets}\n${newTarget}` : newTarget;
    examples.clear();
  }

  function getPortStatus(result: { open: boolean; latency?: number; error?: string }): {
    icon: string;
    class: string;
    text: string;
  } {
    if (result.open) {
      return {
        icon: 'check-circle',
        class: 'success',
        text: $t('diagnostics/network-tcp-port-check.results.statusOpen', { latency: result.latency || 0 }),
      };
    } else {
      return {
        icon: 'x-circle',
        class: 'error',
        text: result.error || $t('diagnostics/network-tcp-port-check.results.statusClosed'),
      };
    }
  }

  async function copyResults() {
    if (!diagnosticState.results) return;

    let text = `TCP Port Check Results\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;
    text += `Summary:\n`;
    text += `  Total ports: ${diagnosticState.results.summary.total}\n`;
    text += `  Open: ${diagnosticState.results.summary.open}\n`;
    text += `  Closed: ${diagnosticState.results.summary.closed}\n`;
    if (diagnosticState.results.summary.avgLatency) {
      text += `  Average latency: ${diagnosticState.results.summary.avgLatency}ms\n`;
    }
    text += `\nResults:\n`;

    (
      diagnosticState.results as {
        results: Array<{ host: string; port: number; open: boolean; latency?: number; error?: string }>;
      }
    ).results.forEach((result) => {
      const status = result.open ? `OPEN (${result.latency}ms)` : `CLOSED${result.error ? ` - ${result.error}` : ''}`;
      text += `  ${result.host}:${result.port} - ${status}\n`;
    });

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics/network-tcp-port-check.title')}</h1>
    <p>{$t('diagnostics/network-tcp-port-check.subtitle')}</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('diagnostics/network-tcp-port-check.examples.title')}
    getLabel={(ex) => ex.description}
    getDescription={(ex) => {
      const targets = ex.targets.split('\n');
      const preview = targets.slice(0, 3).join(', ');
      return targets.length > 3 ? `${preview} (+${targets.length - 3} more)` : preview;
    }}
    getTooltip={(ex) => ex.tooltip}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics/network-tcp-port-check.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group">
          <label for="targets" use:tooltip={$t('diagnostics/network-tcp-port-check.form.targetsTooltip')}>
            {$t('diagnostics/network-tcp-port-check.form.targetsLabel')}
            <textarea
              id="targets"
              bind:value={targets}
              placeholder={$t('diagnostics/network-tcp-port-check.form.targetsPlaceholder')}
              rows="6"
              class:invalid={targets && !isInputValid()}
              onchange={() => {
                examples.clear();
                if (isInputValid()) checkPorts();
              }}
            ></textarea>
            <div class="input-help">
              <span class="target-count"
                >{$t('diagnostics/network-tcp-port-check.form.targetCount', { count: targetsList.length })}</span
              >
              {#if targets && !isInputValid}
                <span class="error-text">{$t('diagnostics/network-tcp-port-check.form.invalidFormat')}</span>
              {/if}
            </div>
          </label>
        </div>
      </div>

      <!-- Common Ports -->
      <div class="form-row">
        <div class="form-group">
          <h3>{$t('diagnostics/network-tcp-port-check.form.commonPortsTitle')}</h3>
          <div class="port-shortcuts">
            {#each commonPorts as port, index (index)}
              <button
                type="button"
                class="port-btn"
                onclick={() => addCommonPort(port.port)}
                use:tooltip={`${port.service}: ${port.description}`}
              >
                {port.port} ({port.service})
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="timeout" use:tooltip={$t('diagnostics/network-tcp-port-check.form.timeoutTooltip')}>
            {$t('diagnostics/network-tcp-port-check.form.timeoutLabel')}
            <input
              id="timeout"
              type="number"
              bind:value={timeout}
              min="1000"
              max="30000"
              step="1000"
              onchange={() => {
                examples.clear();
                if (isInputValid()) checkPorts();
              }}
            />
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={checkPorts} disabled={diagnosticState.loading || !isInputValid()}>
          {#if diagnosticState.loading}
            <Icon name="loader-2" size="sm" animate="spin" />
            {$t('diagnostics/network-tcp-port-check.form.checking')}
          {:else}
            <Icon name="activity" size="sm" />
            {$t('diagnostics/network-tcp-port-check.form.checkButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics/network-tcp-port-check.results.title')}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied()
            ? $t('diagnostics/network-tcp-port-check.results.copied')
            : $t('diagnostics/network-tcp-port-check.results.copyButton')}
        </button>
      </div>
      <div class="card-content">
        <!-- Summary -->
        <div class="status-overview">
          <div class="status-item success">
            <Icon name="check-circle" size="sm" />
            <div>
              <span class="status-title"
                >{$t('diagnostics/network-tcp-port-check.results.summaryOpenPorts', {
                  count: diagnosticState.results.summary.open,
                })}</span
              >
              <p class="status-desc">{$t('diagnostics/network-tcp-port-check.results.openPortsDescription')}</p>
            </div>
          </div>
          <div class="status-item error">
            <Icon name="x-circle" size="sm" />
            <div>
              <span class="status-title"
                >{$t('diagnostics/network-tcp-port-check.results.summaryClosedPorts', {
                  count: diagnosticState.results.summary.closed,
                })}</span
              >
              <p class="status-desc">{$t('diagnostics/network-tcp-port-check.results.closedPortsDescription')}</p>
            </div>
          </div>
          {#if diagnosticState.results.summary.avgLatency}
            <div class="status-item">
              <Icon name="zap" size="sm" />
              <div>
                <span class="status-title"
                  >{$t('diagnostics/network-tcp-port-check.results.summaryAvgLatency', {
                    latency: diagnosticState.results.summary.avgLatency,
                  })}</span
                >
                <p class="status-desc">{$t('diagnostics/network-tcp-port-check.results.avgLatencyDescription')}</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Detailed Results -->
        <div class="ports-section">
          <h4>
            {$t('diagnostics/network-tcp-port-check.results.portStatusTitle', {
              count: diagnosticState.results.results.length,
            })}
          </h4>
          <div class="ports-list">
            {#each diagnosticState.results.results as result, index (index)}
              {@const status = getPortStatus(result)}
              <div class="port-result {status.class}">
                <div class="port-header">
                  <div class="port-target">
                    <Icon name={status.icon} size="sm" />
                    <span class="host-port mono">{result.host}:{result.port}</span>
                  </div>
                  <span class="port-status">{status.text}</span>
                </div>
                {#if result.error && !result.open}
                  <div class="port-error">
                    <span class="error-detail">{result.error}</span>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard title={$t('diagnostics/network-tcp-port-check.error.title')} error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/network-tcp-port-check.info.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/network-tcp-port-check.info.portStates.title')}</h4>
          <ul>
            <li>
              <strong>{$t('diagnostics/network-tcp-port-check.info.portStates.open')}</strong>
              {$t('diagnostics/network-tcp-port-check.info.portStates.openDesc')}
            </li>
            <li>
              <strong>{$t('diagnostics/network-tcp-port-check.info.portStates.closed')}</strong>
              {$t('diagnostics/network-tcp-port-check.info.portStates.closedDesc')}
            </li>
            <li>
              <strong>{$t('diagnostics/network-tcp-port-check.info.portStates.filtered')}</strong>
              {$t('diagnostics/network-tcp-port-check.info.portStates.filteredDesc')}
            </li>
            <li>
              <strong>{$t('diagnostics/network-tcp-port-check.info.portStates.timeout')}</strong>
              {$t('diagnostics/network-tcp-port-check.info.portStates.timeoutDesc')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/network-tcp-port-check.info.commonPorts.title')}</h4>
          <ul>
            <li>
              <strong>{$t('diagnostics/network-tcp-port-check.info.commonPorts.ssh')}</strong>
              {$t('diagnostics/network-tcp-port-check.info.commonPorts.sshDesc')}
            </li>
            <li>
              <strong>{$t('diagnostics/network-tcp-port-check.info.commonPorts.http')}</strong>
              {$t('diagnostics/network-tcp-port-check.info.commonPorts.httpDesc')}
            </li>
            <li>
              <strong>{$t('diagnostics/network-tcp-port-check.info.commonPorts.https')}</strong>
              {$t('diagnostics/network-tcp-port-check.info.commonPorts.httpsDesc')}
            </li>
            <li>
              <strong>{$t('diagnostics/network-tcp-port-check.info.commonPorts.smtp')}</strong>
              {$t('diagnostics/network-tcp-port-check.info.commonPorts.smtpDesc')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/network-tcp-port-check.info.troubleshooting.title')}</h4>
          <ul>
            <li>{$t('diagnostics/network-tcp-port-check.info.troubleshooting.tip1')}</li>
            <li>{$t('diagnostics/network-tcp-port-check.info.troubleshooting.tip2')}</li>
            <li>{$t('diagnostics/network-tcp-port-check.info.troubleshooting.tip3')}</li>
            <li>{$t('diagnostics/network-tcp-port-check.info.troubleshooting.tip4')}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .example-targets {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: var(--spacing-xs);
  }

  .target-item {
    background: var(--bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .more-targets {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-style: italic;
  }

  .input-help {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--spacing-xs);
  }

  .target-count {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .port-shortcuts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }

  .port-btn {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-primary);
      color: var(--bg-primary);
      border-color: var(--color-primary);
    }
  }

  .status-title {
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-desc {
    font-size: var(--font-size-xs);
    margin: 2px 0 0 0;
    opacity: 0.8;
  }

  .ports-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .ports-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .port-result {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-md);

    &.success {
      border-left: 4px solid var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 97%);
    }

    &.error {
      border-left: 4px solid var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 97%);
    }
  }

  .port-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .port-target {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .host-port {
    font-weight: 600;
    color: var(--text-primary);
  }

  .port-status {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .port-error {
    margin-top: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: color-mix(in srgb, var(--color-error), transparent 90%);
    border-radius: var(--radius-xs);
    border-left: 3px solid var(--color-error);
  }

  .error-detail {
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .mono {
    font-family: var(--font-mono);
  }

  textarea {
    resize: vertical;
    min-height: 120px;
  }
</style>
