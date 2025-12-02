<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../../styles/diagnostics-pages.scss';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics');
  });

  let host = $state('google.com:443');
  let servername = $state('');
  let useCustomServername = $state(false);
  let protocols = $state('h2,http/1.1');

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const examplesList = $derived([
    { host: 'google.com:443', protocols: 'h2,http/1.1', description: $t('diagnostics.alpn.examples.google') },
    { host: 'github.com:443', protocols: 'h2,http/1.1', description: $t('diagnostics.alpn.examples.github') },
    {
      host: 'cloudflare.com:443',
      protocols: 'h2,http/1.1,h3',
      description: $t('diagnostics.alpn.examples.cloudflare'),
    },
    { host: 'wikipedia.org:443', protocols: 'h2,http/1.1', description: $t('diagnostics.alpn.examples.wikipedia') },
    { host: 'cdn.jsdelivr.net:443', protocols: 'h2,http/1.1', description: $t('diagnostics.alpn.examples.cdn') },
    { host: 'api.github.com:443', protocols: 'h2,http/1.1', description: $t('diagnostics.alpn.examples.api') },
  ]);

  const examples = useExamples(() => examplesList);

  const commonProtocols = $derived([
    { value: 'h2,http/1.1', label: 'HTTP/2 + HTTP/1.1', description: $t('diagnostics.alpn.protocols.standard') },
    {
      value: 'h3,h2,http/1.1',
      label: 'HTTP/3 + HTTP/2 + HTTP/1.1',
      description: $t('diagnostics.alpn.protocols.experimental'),
    },
    { value: 'h2', label: 'HTTP/2 only', description: $t('diagnostics.alpn.protocols.http2Only') },
    { value: 'http/1.1', label: 'HTTP/1.1 only', description: $t('diagnostics.alpn.protocols.fallback') },
  ]);

  // Reactive validation
  const isInputValid = $derived(() => {
    const trimmedHost = host.trim();
    if (!trimmedHost) return false;
    return /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(trimmedHost);
  });

  const protocolsArray = $derived(() => {
    return protocols
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p);
  });

  async function probeALPN() {
    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/tls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'alpn',
          host: host.trim(),
          protocols: protocolsArray,
          servername: useCustomServername && servername ? servername.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `ALPN probe failed (${response.status})`);
        } catch {
          throw new Error(`ALPN probe failed (${response.status})`);
        }
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    host = example.host;
    protocols = example.protocols;
    servername = '';
    useCustomServername = false;
    examples.select(index);
    probeALPN();
  }

  function setCommonProtocols(protocolSet: string) {
    protocols = protocolSet;
    examples.clear();
    if (isInputValid()) probeALPN();
  }

  function getProtocolInfo(protocol: string): { name: string; description: string; version: string } {
    switch (protocol) {
      case 'h3':
        return {
          name: $t('diagnostics.alpn.protocolInfo.h3.name'),
          description: $t('diagnostics.alpn.protocolInfo.h3.description'),
          version: $t('diagnostics.alpn.protocolInfo.h3.name'),
        };
      case 'h2':
        return {
          name: $t('diagnostics.alpn.protocolInfo.h2.name'),
          description: $t('diagnostics.alpn.protocolInfo.h2.description'),
          version: $t('diagnostics.alpn.protocolInfo.h2.name'),
        };
      case 'http/1.1':
        return {
          name: $t('diagnostics.alpn.protocolInfo.http11.name'),
          description: $t('diagnostics.alpn.protocolInfo.http11.description'),
          version: $t('diagnostics.alpn.protocolInfo.http11.name'),
        };
      case 'http/1.0':
        return {
          name: $t('diagnostics.alpn.protocolInfo.http10.name'),
          description: $t('diagnostics.alpn.protocolInfo.http10.description'),
          version: $t('diagnostics.alpn.protocolInfo.http10.name'),
        };
      default:
        return {
          name: protocol,
          description: $t('diagnostics.alpn.protocolInfo.unknown.description'),
          version: protocol,
        };
    }
  }

  function getNegotiationStatus(): { status: string; icon: string; class: string; description: string } {
    if (!diagnosticState.results)
      return {
        status: $t('diagnostics.alpn.status.unknown'),
        icon: 'help-circle',
        class: 'secondary',
        description: $t('diagnostics.alpn.status.noResults'),
      };

    if (diagnosticState.results.success && diagnosticState.results.negotiatedProtocol) {
      const protocol = getProtocolInfo(diagnosticState.results.negotiatedProtocol);
      return {
        status: $t('diagnostics.alpn.status.successful'),
        icon: 'check-circle',
        class: 'success',
        description: $t('diagnostics.alpn.status.serverSelected', { protocol: protocol.name }),
      };
    } else if (!diagnosticState.results.success) {
      return {
        status: $t('diagnostics.alpn.status.failed'),
        icon: 'x-circle',
        class: 'error',
        description: $t('diagnostics.alpn.status.noNegotiation'),
      };
    } else {
      return {
        status: $t('diagnostics.alpn.status.noSelection'),
        icon: 'minus-circle',
        class: 'warning',
        description: $t('diagnostics.alpn.status.noProtocolSelected'),
      };
    }
  }

  async function copyALPNInfo() {
    if (!diagnosticState.results) return;

    let text = $t('diagnostics.alpn.copy.header', { host }) + '\n';
    text += $t('diagnostics.alpn.copy.generatedAt', { timestamp: new Date().toISOString() }) + '\n\n';
    text +=
      $t('diagnostics.alpn.copy.requestedProtocols', {
        protocols: diagnosticState.results.requestedProtocols.join(', '),
      }) + '\n';
    text +=
      $t('diagnostics.alpn.copy.negotiatedProtocol', {
        protocol: diagnosticState.results.negotiatedProtocol || $t('diagnostics.alpn.copy.none'),
      }) + '\n';
    text +=
      $t('diagnostics.alpn.copy.tlsVersion', {
        version: diagnosticState.results.tlsVersion || $t('diagnostics.alpn.copy.unknown'),
      }) + '\n';
    text +=
      $t('diagnostics.alpn.copy.success', {
        success: diagnosticState.results.success ? $t('diagnostics.alpn.copy.yes') : $t('diagnostics.alpn.copy.no'),
      }) + '\n';

    const status = getNegotiationStatus();
    text += '\n' + $t('diagnostics.alpn.copy.negotiationStatus', { status: status.status }) + '\n';
    text += $t('diagnostics.alpn.copy.description', { description: status.description }) + '\n';

    if (diagnosticState.results.negotiatedProtocol) {
      const protocolInfo = getProtocolInfo(diagnosticState.results.negotiatedProtocol);
      text += '\n' + $t('diagnostics.alpn.copy.selectedProtocolInfo') + '\n';
      text += $t('diagnostics.alpn.copy.name', { name: protocolInfo.name }) + '\n';
      text += $t('diagnostics.alpn.copy.protocolDescription', { description: protocolInfo.description }) + '\n';
    }

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics.alpn.title')}</h1>
    <p>
      {$t('diagnostics.alpn.description')}
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('diagnostics.alpn.examples.title')}
    getLabel={(ex) => ex.host}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => $t('diagnostics.alpn.examples.tooltip', { host: ex.host, description: ex.description })}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics.alpn.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group">
          <label for="host" use:tooltip={$t('diagnostics.alpn.form.hostTooltip')}>
            {$t('diagnostics.alpn.form.hostLabel')}
            <input
              id="host"
              type="text"
              bind:value={host}
              placeholder="google.com:443"
              class:invalid={host && !isInputValid}
              onchange={() => {
                examples.clear();
                if (isInputValid()) probeALPN();
              }}
            />
            {#if host && !isInputValid}
              <span class="error-text">{$t('diagnostics.alpn.form.invalidHost')}</span>
            {/if}
          </label>
        </div>
      </div>

      <!-- Protocol Selection -->
      <div class="form-row">
        <div class="form-group">
          <label for="protocols" use:tooltip={$t('diagnostics.alpn.form.protocolsTooltip')}>
            {$t('diagnostics.alpn.form.protocolsLabel')}
            <input
              id="protocols"
              type="text"
              bind:value={protocols}
              placeholder="h2,http/1.1"
              onchange={() => {
                examples.clear();
                if (isInputValid()) probeALPN();
              }}
            />
          </label>
          <div class="protocol-presets">
            <span class="preset-label">{$t('diagnostics.alpn.form.quickSelect')}</span>
            {#each commonProtocols as preset, index (index)}
              <button
                type="button"
                class="preset-btn"
                onclick={() => setCommonProtocols(preset.value)}
                use:tooltip={preset.description}
              >
                {preset.label}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="checkbox-group">
            <input
              type="checkbox"
              bind:checked={useCustomServername}
              onchange={() => {
                examples.clear();
                if (isInputValid()) probeALPN();
              }}
            />
            {$t('diagnostics.alpn.form.customSni')}
          </label>
          {#if useCustomServername}
            <input
              type="text"
              bind:value={servername}
              placeholder="example.com"
              use:tooltip={$t('diagnostics.alpn.form.sniTooltip')}
              onchange={() => {
                examples.clear();
                if (isInputValid()) probeALPN();
              }}
            />
          {/if}
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={probeALPN} disabled={diagnosticState.loading || !isInputValid}>
          {#if diagnosticState.loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('diagnostics.alpn.form.testing')}
          {:else}
            <Icon name="shuffle" size="sm" />
            {$t('diagnostics.alpn.form.testButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics.alpn.results.title')}</h3>
        <button class="copy-btn" onclick={copyALPNInfo} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? $t('diagnostics.alpn.results.copied') : $t('diagnostics.alpn.results.copyButton')}
        </button>
      </div>
      <div class="card-content">
        <!-- Negotiation Overview -->
        {#if diagnosticState.results}
          {@const status = getNegotiationStatus()}
          <div class="status-overview">
            <div class="status-item {status.class}">
              <Icon name={status.icon} size="sm" />
              <div>
                <span class="status-title"
                  >{$t('diagnostics.alpn.results.negotiationStatus', { status: status.status })}</span
                >
                <p class="status-desc">{status.description}</p>
              </div>
            </div>
            {#if diagnosticState.results.tlsVersion}
              <div class="status-item success">
                <Icon name="shield-check" size="sm" />
                <div>
                  <span class="status-title"
                    >{$t('diagnostics.alpn.results.tlsVersion', { version: diagnosticState.results.tlsVersion })}</span
                  >
                  <p class="status-desc">{$t('diagnostics.alpn.results.connectionEstablished')}</p>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Protocol Details -->
        <div class="protocols-section">
          <h4>{$t('diagnostics.alpn.results.protocolDetails')}</h4>

          <div class="protocol-details">
            <div class="detail-section">
              <h5>{$t('diagnostics.alpn.results.requestedProtocols')}</h5>
              <div class="protocol-list">
                {#each diagnosticState.results.requestedProtocols as protocol, i (i)}
                  {@const protocolInfo = getProtocolInfo(protocol)}
                  <div class="protocol-item requested">
                    <div class="protocol-header">
                      <span class="protocol-name">{protocolInfo.name}</span>
                      <span class="protocol-id mono">({protocol})</span>
                      <span class="protocol-priority"
                        >{$t('diagnostics.alpn.results.priority', { priority: i + 1 })}</span
                      >
                    </div>
                    <p class="protocol-desc">{protocolInfo.description}</p>
                  </div>
                {/each}
              </div>
            </div>

            {#if diagnosticState.results.negotiatedProtocol}
              {@const selectedProtocol = getProtocolInfo(diagnosticState.results.negotiatedProtocol)}
              <div class="detail-section">
                <h5>{$t('diagnostics.alpn.results.selectedProtocol')}</h5>
                <div class="selected-protocol">
                  <div class="protocol-item selected">
                    <div class="protocol-header">
                      <span class="success-icon"><Icon name="check-circle" size="sm" /></span>
                      <span class="protocol-name">{selectedProtocol.name}</span>
                      <span class="protocol-id mono">({diagnosticState.results.negotiatedProtocol})</span>
                    </div>
                    <p class="protocol-desc">{selectedProtocol.description}</p>
                  </div>
                </div>
              </div>
            {:else}
              <div class="detail-section">
                <h5>{$t('diagnostics.alpn.results.selectedProtocol')}</h5>
                <div class="no-selection">
                  <Icon name="x-circle" size="sm" />
                  <span>{$t('diagnostics.alpn.results.noProtocolSelected')}</span>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Connection Info -->
        {#if diagnosticState.results.servername || diagnosticState.results.tlsVersion}
          <div class="connection-section">
            <h4>{$t('diagnostics.alpn.results.connectionInfo')}</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">{$t('diagnostics.alpn.results.serverName')}</span>
                <span class="detail-value mono">{diagnosticState.results.servername}</span>
              </div>
              {#if diagnosticState.results.tlsVersion}
                <div class="detail-item">
                  <span class="detail-label">{$t('diagnostics.alpn.results.tlsVersionLabel')}</span>
                  <span class="detail-value">{diagnosticState.results.tlsVersion}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <ErrorCard title={$t('diagnostics.alpn.error.title')} error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics.alpn.info.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics.alpn.info.whatIsAlpn.title')}</h4>
          <p>
            {$t('diagnostics.alpn.info.whatIsAlpn.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.alpn.info.commonProtocols.title')}</h4>
          <ul>
            <li><strong>h2:</strong> {$t('diagnostics.alpn.info.commonProtocols.h2')}</li>
            <li><strong>h3:</strong> {$t('diagnostics.alpn.info.commonProtocols.h3')}</li>
            <li><strong>http/1.1:</strong> {$t('diagnostics.alpn.info.commonProtocols.http11')}</li>
            <li><strong>spdy/3.1:</strong> {$t('diagnostics.alpn.info.commonProtocols.spdy')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.alpn.info.priority.title')}</h4>
          <p>
            {$t('diagnostics.alpn.info.priority.description')}
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .example-protocols {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
    background: var(--bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
  }

  .protocol-presets {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }

  .preset-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-right: var(--spacing-xs);
  }

  .preset-btn {
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-xs);
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

  .protocols-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .protocol-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .detail-section {
    h5 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      font-size: var(--font-size-md);
    }
  }

  .protocol-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .protocol-item {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-md);

    &.requested {
      background: var(--bg-secondary);
    }

    &.selected {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      border-color: var(--color-success);
    }
  }

  .protocol-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .protocol-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .protocol-id {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .protocol-priority {
    font-size: var(--font-size-xs);
    background: var(--bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
    color: var(--text-secondary);
    margin-left: auto;
  }

  .protocol-desc {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .selected-protocol {
    .success-icon {
      color: var(--color-success);
    }
  }

  .no-selection {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
    color: var(--color-error);
  }

  .connection-section {
    margin-top: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .detail-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detail-value {
    color: var(--text-primary);
    font-weight: 500;
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>
