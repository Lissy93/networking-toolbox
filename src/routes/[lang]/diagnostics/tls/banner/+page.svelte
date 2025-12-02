<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { t } from '$lib/stores/language';
  import '../../../../../styles/diagnostics-pages.scss';

  let host = $state('');
  let port = $state<number | null>(null);
  let service = $state('custom');

  const diagnosticState = useDiagnosticState<any>();

  const services = $derived({
    custom: { port: null, description: $t('diagnostics/tls-banner.services.custom') },
    ssh: { port: 22, description: $t('diagnostics/tls-banner.services.ssh') },
    smtp: { port: 25, description: $t('diagnostics/tls-banner.services.smtp') },
    whois: { port: 43, description: $t('diagnostics/tls-banner.services.whois') },
    http: { port: 80, description: $t('diagnostics/tls-banner.services.http') },
    https: { port: 443, description: $t('diagnostics/tls-banner.services.https') },
    ftp: { port: 21, description: $t('diagnostics/tls-banner.services.ftp') },
    telnet: { port: 23, description: $t('diagnostics/tls-banner.services.telnet') },
    pop3: { port: 110, description: $t('diagnostics/tls-banner.services.pop3') },
    imap: { port: 143, description: $t('diagnostics/tls-banner.services.imap') },
    smtps: { port: 465, description: $t('diagnostics/tls-banner.services.smtps') },
    submission: { port: 587, description: $t('diagnostics/tls-banner.services.submission') },
    imaps: { port: 993, description: $t('diagnostics/tls-banner.services.imaps') },
    pop3s: { port: 995, description: $t('diagnostics/tls-banner.services.pop3s') },
    mysql: { port: 3306, description: $t('diagnostics/tls-banner.services.mysql') },
    postgresql: { port: 5432, description: $t('diagnostics/tls-banner.services.postgresql') },
    redis: { port: 6379, description: $t('diagnostics/tls-banner.services.redis') },
    mongodb: { port: 27017, description: $t('diagnostics/tls-banner.services.mongodb') },
    rdp: { port: 3389, description: $t('diagnostics/tls-banner.services.rdp') },
    vnc: { port: 5900, description: $t('diagnostics/tls-banner.services.vnc') },
  });

  const examplesList = $derived([
    {
      host: $t('diagnostics/tls-banner.examples.items.nmapSSH.host'),
      port: $t('diagnostics/tls-banner.examples.items.nmapSSH.port'),
      service: 'ssh',
      description: $t('diagnostics/tls-banner.examples.items.nmapSSH.description'),
    },
    {
      host: $t('diagnostics/tls-banner.examples.items.rebexFTP.host'),
      port: $t('diagnostics/tls-banner.examples.items.rebexFTP.port'),
      service: 'ftp',
      description: $t('diagnostics/tls-banner.examples.items.rebexFTP.description'),
    },
    {
      host: $t('diagnostics/tls-banner.examples.items.exampleHTTP.host'),
      port: $t('diagnostics/tls-banner.examples.items.exampleHTTP.port'),
      service: 'http',
      description: $t('diagnostics/tls-banner.examples.items.exampleHTTP.description'),
    },
    {
      host: $t('diagnostics/tls-banner.examples.items.googleHTTP.host'),
      port: $t('diagnostics/tls-banner.examples.items.googleHTTP.port'),
      service: 'http',
      description: $t('diagnostics/tls-banner.examples.items.googleHTTP.description'),
    },
    {
      host: $t('diagnostics/tls-banner.examples.items.googleMX.host'),
      port: $t('diagnostics/tls-banner.examples.items.googleMX.port'),
      service: 'smtp',
      description: $t('diagnostics/tls-banner.examples.items.googleMX.description'),
    },
    {
      host: $t('diagnostics/tls-banner.examples.items.ianaWHOIS.host'),
      port: $t('diagnostics/tls-banner.examples.items.ianaWHOIS.port'),
      service: 'whois',
      description: $t('diagnostics/tls-banner.examples.items.ianaWHOIS.description'),
    },
    {
      host: $t('diagnostics/tls-banner.examples.items.freebsdFTP.host'),
      port: $t('diagnostics/tls-banner.examples.items.freebsdFTP.port'),
      service: 'ftp',
      description: $t('diagnostics/tls-banner.examples.items.freebsdFTP.description'),
    },
    {
      host: $t('diagnostics/tls-banner.examples.items.httpbinAPI.host'),
      port: $t('diagnostics/tls-banner.examples.items.httpbinAPI.port'),
      service: 'http',
      description: $t('diagnostics/tls-banner.examples.items.httpbinAPI.description'),
    },
    {
      host: $t('diagnostics/tls-banner.examples.items.verisignWHOIS.host'),
      port: $t('diagnostics/tls-banner.examples.items.verisignWHOIS.port'),
      service: 'whois',
      description: $t('diagnostics/tls-banner.examples.items.verisignWHOIS.description'),
    },
  ]);

  const examples = useExamples(() => examplesList);

  $effect(() => {
    if (service && service !== 'custom' && services[service as keyof typeof services]) {
      port = services[service as keyof typeof services].port;
    }
  });

  const isInputValid = $derived(() => {
    const trimmedHost = host.trim();
    if (!trimmedHost) return false;
    if (port === null || port < 1 || port > 65535) return false;
    // Basic hostname/IP validation
    const hostPattern =
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$|^\[?[a-fA-F0-9:]+\]?$/;
    return hostPattern.test(trimmedHost);
  });

  async function grabBanner() {
    if (!isInputValid) {
      diagnosticState.setError($t('diagnostics/tls-banner.error.invalidInput'));
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/tls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'banner',
          host: host.trim(),
          port: port,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || $t('diagnostics/tls-banner.error.failed');
        if (errorMessage.includes('ENOTFOUND')) {
          throw new Error($t('diagnostics/tls-banner.error.hostNotFound'));
        } else if (errorMessage.includes('ECONNREFUSED')) {
          throw new Error($t('diagnostics/tls-banner.error.connectionRefused', { port: port || 0 }));
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          throw new Error($t('diagnostics/tls-banner.error.timeout'));
        }
        throw new Error(errorMessage);
      }

      diagnosticState.setResults(data);
    } catch (err) {
      diagnosticState.setError(err instanceof Error ? err.message : $t('common.errors.unknownError'));
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    host = example.host;
    port = parseInt(example.port, 10);
    service = example.service;
    examples.select(index);
    grabBanner();
  }

  function getProtocolIcon(protocol: string): string {
    switch (protocol?.toLowerCase()) {
      case 'ssh':
        return 'terminal';
      case 'http':
      case 'https':
        return 'globe';
      case 'smtp':
      case 'smtps':
      case 'submission':
        return 'mail';
      case 'ftp':
        return 'folder';
      case 'tls':
      case 'ssl':
        return 'lock';
      default:
        return 'server';
    }
  }

  function formatBanner(banner: string): string {
    // Escape HTML and preserve formatting
    return banner
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics/tls-banner.title')}</h1>
    <p>{$t('diagnostics/tls-banner.subtitle')}</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('diagnostics/tls-banner.examples.title')}
    getLabel={(ex) => ex.description}
    getDescription={(ex) => `${ex.host}:${ex.port}`}
    getTooltip={(ex) => $t('diagnostics/tls-banner.examples.tooltip', { host: ex.host, port: ex.port })}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics/tls-banner.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group">
          <label for="service">{$t('diagnostics/tls-banner.form.service')}</label>
          <select
            id="service"
            bind:value={service}
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
          >
            {#each Object.entries(services) as [key, svc] (key)}
              <option value={key}>{svc.description} {svc.port ? `(${svc.port})` : ''}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex-2">
          <label for="host">{$t('diagnostics/tls-banner.form.host')}</label>
          <input
            id="host"
            type="text"
            bind:value={host}
            placeholder={$t('diagnostics/tls-banner.form.hostPlaceholder')}
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && grabBanner()}
          />
        </div>
        <div class="form-group flex-1">
          <label for="port">{$t('diagnostics/tls-banner.form.port')}</label>
          <input
            id="port"
            type="number"
            bind:value={port}
            min="1"
            max="65535"
            placeholder={$t('diagnostics/tls-banner.form.portPlaceholder')}
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && grabBanner()}
          />
        </div>
      </div>

      <button onclick={grabBanner} disabled={diagnosticState.loading || !isInputValid} class="primary">
        {#if diagnosticState.loading}
          <Icon name="loader" size="sm" animate="spin" />
          {$t('diagnostics/tls-banner.loading.connecting')}
        {:else}
          <Icon name="terminal" size="sm" />
          {$t('diagnostics/tls-banner.form.grabButton')}
        {/if}
      </button>
    </div>
  </div>

  <ErrorCard title={$t('diagnostics/tls-banner.error.title')} error={diagnosticState.error} />

  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>{$t('diagnostics/tls-banner.loading.title')}</h3>
            <p>{$t('diagnostics/tls-banner.loading.message', { host, port: port || 0 })}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>{$t('diagnostics/tls-banner.results.title')}</h3>
      </div>
      <div class="card-content">
        <!-- Connection Info -->
        <div class="card info-section">
          <div class="card-header">
            <h3>{$t('diagnostics/tls-banner.results.connectionDetails.title')}</h3>
          </div>
          <div class="card-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{$t('diagnostics/tls-banner.results.connectionDetails.host')}</span>
                <span class="info-value">{diagnosticState.results.host}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{$t('diagnostics/tls-banner.results.connectionDetails.port')}</span>
                <span class="info-value">{diagnosticState.results.port}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{$t('diagnostics/tls-banner.results.connectionDetails.protocol')}</span>
                <span class="info-value">
                  <Icon name={getProtocolIcon(diagnosticState.results.protocol)} size="xs" />
                  {diagnosticState.results.protocol || $t('diagnostics/tls-banner.results.connectionDetails.unknown')}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">{$t('diagnostics/tls-banner.results.connectionDetails.responseTime')}</span>
                <span class="info-value">{diagnosticState.results.responseTime}ms</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Banner Content -->
        <div class="card banner-section">
          <div class="card-header">
            <h3>{$t('diagnostics/tls-banner.results.banner.title')}</h3>
          </div>
          <div class="card-content">
            {#if diagnosticState.results.banner}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <pre class="banner-content">{@html formatBanner(diagnosticState.results.banner)}</pre>
            {:else}
              <div class="no-banner">
                <Icon name="file-x" size="lg" />
                <p>{$t('diagnostics/tls-banner.results.banner.noBanner')}</p>
                <small>{$t('diagnostics/tls-banner.results.banner.noBannerHint')}</small>
              </div>
            {/if}
          </div>
        </div>

        <!-- Service Analysis -->
        {#if diagnosticState.results.analysis && (diagnosticState.results.analysis.software || diagnosticState.results.analysis.version || diagnosticState.results.analysis.os || (diagnosticState.results.analysis.security && diagnosticState.results.analysis.security.length > 0))}
          <div class="card analysis-section">
            <div class="card-header">
              <h3>{$t('diagnostics/tls-banner.results.analysis.title')}</h3>
            </div>
            <div class="card-content">
              <div class="analysis-grid">
                {#if diagnosticState.results.analysis.software}
                  <div class="analysis-item">
                    <Icon name="package" size="sm" />
                    <div>
                      <h4>{$t('diagnostics/tls-banner.results.analysis.software')}</h4>
                      <p>{diagnosticState.results.analysis.software}</p>
                    </div>
                  </div>
                {/if}
                {#if diagnosticState.results.analysis.version}
                  <div class="analysis-item">
                    <Icon name="tag" size="sm" />
                    <div>
                      <h4>{$t('diagnostics/tls-banner.results.analysis.version')}</h4>
                      <p>{diagnosticState.results.analysis.version}</p>
                    </div>
                  </div>
                {/if}
                {#if diagnosticState.results.analysis.os}
                  <div class="analysis-item">
                    <Icon name="monitor" size="sm" />
                    <div>
                      <h4>{$t('diagnostics/tls-banner.results.analysis.os')}</h4>
                      <p>{diagnosticState.results.analysis.os}</p>
                    </div>
                  </div>
                {/if}
                {#if diagnosticState.results.analysis.security && diagnosticState.results.analysis.security.length > 0}
                  <div class="analysis-item full-width">
                    <Icon name="shield" size="sm" />
                    <div>
                      <h4>{$t('diagnostics/tls-banner.results.analysis.security')}</h4>
                      <ul>
                        {#each diagnosticState.results.analysis.security as note, i (i)}
                          <li>{note}</li>
                        {/each}
                      </ul>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- TLS Info (if applicable) -->
        {#if diagnosticState.results.tls}
          <div class="card tls-section">
            <div class="card-header">
              <h3>{$t('diagnostics/tls-banner.results.tls.title')}</h3>
            </div>
            <div class="card-content">
              <div class="tls-info">
                <div class="tls-item">
                  <span class="tls-label">{$t('diagnostics/tls-banner.results.tls.protocol')}</span>
                  <span class="tls-value">{diagnosticState.results.tls.protocol}</span>
                </div>
                <div class="tls-item">
                  <span class="tls-label">{$t('diagnostics/tls-banner.results.tls.cipher')}</span>
                  <span class="tls-value">{diagnosticState.results.tls.cipher}</span>
                </div>
                {#if diagnosticState.results.tls.certificate}
                  <div class="tls-item">
                    <span class="tls-label">{$t('diagnostics/tls-banner.results.tls.certificateCN')}</span>
                    <span class="tls-value">{diagnosticState.results.tls.certificate.cn}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .results-card {
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      .card {
        width: 100%;
      }
    }
  }
  .info-section,
  .banner-section,
  .analysis-section,
  .tls-section {
    background: var(--bg-secondary);
  }

  .form-row {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    @media (max-width: 768px) {
      flex-direction: column;
    }
  }

  .flex-1 {
    flex: 1;
  }

  .flex-2 {
    flex: 2;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }

  .info-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .banner-content {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    line-height: 1.6;
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .no-banner {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);

    p {
      margin: var(--spacing-sm) 0;
      font-weight: 500;
    }

    small {
      font-size: var(--font-size-xs);
      opacity: 0.8;
    }
  }

  .analysis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .analysis-item {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--color-surface-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-primary);

    &.full-width {
      grid-column: 1 / -1;
    }

    h4 {
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
    }

    p {
      font-family: var(--font-mono);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      padding: var(--spacing-2xs) 0;
    }
  }

  .tls-info {
    display: grid;
    gap: var(--spacing-sm);
  }

  .tls-item {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs);
    background: var(--color-surface-elevated);
    border-radius: var(--radius-sm);
  }

  .tls-label {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .tls-value {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    word-break: break-all;
  }

  select {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
