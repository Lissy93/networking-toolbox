<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let host = $state('');
  let port = $state<number | null>(null);
  let service = $state('custom');

  const diagnosticState = useDiagnosticState<any>();

  const services = {
    custom: { port: null, description: 'Custom port' },
    ssh: { port: 22, description: 'SSH Server' },
    smtp: { port: 25, description: 'SMTP Mail Server' },
    whois: { port: 43, description: 'WHOIS Service' },
    http: { port: 80, description: 'HTTP Web Server' },
    https: { port: 443, description: 'HTTPS Web Server' },
    ftp: { port: 21, description: 'FTP Server' },
    telnet: { port: 23, description: 'Telnet Server' },
    pop3: { port: 110, description: 'POP3 Mail Server' },
    imap: { port: 143, description: 'IMAP Mail Server' },
    smtps: { port: 465, description: 'SMTP over TLS' },
    submission: { port: 587, description: 'Mail Submission' },
    imaps: { port: 993, description: 'IMAP over TLS' },
    pop3s: { port: 995, description: 'POP3 over TLS' },
    mysql: { port: 3306, description: 'MySQL Database' },
    postgresql: { port: 5432, description: 'PostgreSQL Database' },
    redis: { port: 6379, description: 'Redis Database' },
    mongodb: { port: 27017, description: 'MongoDB Database' },
    rdp: { port: 3389, description: 'Remote Desktop' },
    vnc: { port: 5900, description: 'VNC Remote Desktop' },
  };

  const examplesList = [
    { host: 'scanme.nmap.org', port: 22, service: 'ssh', description: 'Nmap SSH Test' },
    { host: 'test.rebex.net', port: 21, service: 'ftp', description: 'Rebex FTP Test' },
    { host: 'example.com', port: 80, service: 'http', description: 'Example.com HTTP' },
    { host: 'www.google.com', port: 80, service: 'http', description: 'Google HTTP' },
    { host: 'aspmx.l.google.com', port: 25, service: 'smtp', description: 'Google MX Server' },
    { host: 'whois.iana.org', port: 43, service: 'whois', description: 'IANA WHOIS' },
    { host: 'ftp.freebsd.org', port: 21, service: 'ftp', description: 'FreeBSD FTP' },
    { host: 'httpbin.org', port: 80, service: 'http', description: 'HTTPBin API' },
    { host: 'whois.verisign-grs.com', port: 43, service: 'whois', description: 'Verisign WHOIS' },
  ];

  const examples = useExamples(examplesList);

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
      diagnosticState.setError('Please enter a valid host and port (1-65535)');
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
        const errorMessage = data.message || 'Failed to grab banner';
        if (errorMessage.includes('ENOTFOUND')) {
          throw new Error('Host not found. Please check the hostname and try again.');
        } else if (errorMessage.includes('ECONNREFUSED')) {
          throw new Error(`Connection refused on port ${port}. The service may be down or port closed.`);
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          throw new Error('Connection timed out. The host may be unreachable or port filtered.');
        }
        throw new Error(errorMessage);
      }

      diagnosticState.setResults(data);
    } catch (err) {
      diagnosticState.setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    host = example.host;
    port = example.port;
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
    <h1>Service Banner Grabber</h1>
    <p>Retrieve service banners from SSH, SMTP, HTTP, FTP, and other network services</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Quick Examples"
    getLabel={(ex) => ex.description}
    getDescription={(ex) => `${ex.host}:${ex.port}`}
    getTooltip={(ex) => `Grab banner from ${ex.host}:${ex.port}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Target Service</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group">
          <label for="service">Service Type</label>
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
          <label for="host">Host / IP Address</label>
          <input
            id="host"
            type="text"
            bind:value={host}
            placeholder="example.com or 192.168.1.1"
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && grabBanner()}
          />
        </div>
        <div class="form-group flex-1">
          <label for="port">Port</label>
          <input
            id="port"
            type="number"
            bind:value={port}
            min="1"
            max="65535"
            placeholder="1-65535"
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && grabBanner()}
          />
        </div>
      </div>

      <button onclick={grabBanner} disabled={diagnosticState.loading || !isInputValid} class="primary">
        {#if diagnosticState.loading}
          <Icon name="loader" size="sm" animate="spin" />
          Connecting...
        {:else}
          <Icon name="terminal" size="sm" />
          Grab Banner
        {/if}
      </button>
    </div>
  </div>

  <ErrorCard title="Connection Failed" error={diagnosticState.error} />

  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Grabbing Banner</h3>
            <p>Connecting to {host}:{port}...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>Banner Information</h3>
      </div>
      <div class="card-content">
        <!-- Connection Info -->
        <div class="card info-section">
          <div class="card-header">
            <h3>Connection Details</h3>
          </div>
          <div class="card-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Host:</span>
                <span class="info-value">{diagnosticState.results.host}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Port:</span>
                <span class="info-value">{diagnosticState.results.port}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Protocol:</span>
                <span class="info-value">
                  <Icon name={getProtocolIcon(diagnosticState.results.protocol)} size="xs" />
                  {diagnosticState.results.protocol || 'Unknown'}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Response Time:</span>
                <span class="info-value">{diagnosticState.results.responseTime}ms</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Banner Content -->
        <div class="card banner-section">
          <div class="card-header">
            <h3>Service Banner</h3>
          </div>
          <div class="card-content">
            {#if diagnosticState.results.banner}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <pre class="banner-content">{@html formatBanner(diagnosticState.results.banner)}</pre>
            {:else}
              <div class="no-banner">
                <Icon name="file-x" size="lg" />
                <p>No banner received from service</p>
                <small>The service may not send a banner or requires specific protocol handshake</small>
              </div>
            {/if}
          </div>
        </div>

        <!-- Service Analysis -->
        {#if diagnosticState.results.analysis && (diagnosticState.results.analysis.software || diagnosticState.results.analysis.version || diagnosticState.results.analysis.os || (diagnosticState.results.analysis.security && diagnosticState.results.analysis.security.length > 0))}
          <div class="card analysis-section">
            <div class="card-header">
              <h3>Service Analysis</h3>
            </div>
            <div class="card-content">
              <div class="analysis-grid">
                {#if diagnosticState.results.analysis.software}
                  <div class="analysis-item">
                    <Icon name="package" size="sm" />
                    <div>
                      <h4>Software</h4>
                      <p>{diagnosticState.results.analysis.software}</p>
                    </div>
                  </div>
                {/if}
                {#if diagnosticState.results.analysis.version}
                  <div class="analysis-item">
                    <Icon name="tag" size="sm" />
                    <div>
                      <h4>Version</h4>
                      <p>{diagnosticState.results.analysis.version}</p>
                    </div>
                  </div>
                {/if}
                {#if diagnosticState.results.analysis.os}
                  <div class="analysis-item">
                    <Icon name="monitor" size="sm" />
                    <div>
                      <h4>Operating System</h4>
                      <p>{diagnosticState.results.analysis.os}</p>
                    </div>
                  </div>
                {/if}
                {#if diagnosticState.results.analysis.security && diagnosticState.results.analysis.security.length > 0}
                  <div class="analysis-item full-width">
                    <Icon name="shield" size="sm" />
                    <div>
                      <h4>Security Notes</h4>
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
              <h3>TLS Information</h3>
            </div>
            <div class="card-content">
              <div class="tls-info">
                <div class="tls-item">
                  <span class="tls-label">Protocol:</span>
                  <span class="tls-value">{diagnosticState.results.tls.protocol}</span>
                </div>
                <div class="tls-item">
                  <span class="tls-label">Cipher:</span>
                  <span class="tls-value">{diagnosticState.results.tls.cipher}</span>
                </div>
                {#if diagnosticState.results.tls.certificate}
                  <div class="tls-item">
                    <span class="tls-label">Certificate CN:</span>
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
