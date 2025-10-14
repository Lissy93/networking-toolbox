<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { tlsHandshakeContent } from '$lib/content/tls-handshake';
  import '../../../../styles/diagnostics-pages.scss';

  interface HandshakePhase {
    phase: string;
    timestamp: number;
    duration?: number;
    details?: Record<string, any>;
  }

  interface TLSHandshakeResponse {
    hostname: string;
    port: number;
    success: boolean;
    totalTime: number;
    phases: HandshakePhase[];
    tlsVersion: string;
    cipherSuite: string;
    certificateInfo?: {
      subject: string;
      issuer: string;
      validFrom: string;
      validTo: string;
      san?: string[];
    };
    alpnProtocol?: string;
    timestamp: string;
  }

  let hostname = $state('google.com');
  let port = $state(443);
  const diagnosticState = useDiagnosticState<TLSHandshakeResponse>();
  const clipboard = useClipboard();
  const examplesList = [
    { hostname: 'as93.net', port: 443, description: 'Alicia Sykes' },
    { hostname: 'apple.com', port: 443, description: 'Apple (Fast - 28ms)' },
    { hostname: 'cloudflare.com', port: 443, description: 'Cloudflare' },
    { hostname: 'amazon.com', port: 443, description: 'Amazon (High latency)' },
    { hostname: 'baidu.com', port: 443, description: 'Baidu (China - TLS 1.2)' },
    { hostname: 'zoom.us', port: 443, description: 'Zoom' },
  ];
  const examples = useExamples(examplesList);

  async function analyzeHandshake() {
    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/tls-handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: hostname.trim(), port }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `Analysis failed: ${response.status}`);
      }

      diagnosticState.setResults(await response.json());
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    hostname = example.hostname;
    port = example.port;
    examples.select(index);
    analyzeHandshake();
  }

  async function copyResults() {
    if (!diagnosticState.results) return;

    let text = `TLS Handshake Analysis for ${diagnosticState.results.hostname}:${diagnosticState.results.port}\n`;
    text += `Generated at: ${diagnosticState.results.timestamp}\n\n`;
    text += `Total Time: ${diagnosticState.results.totalTime}ms\n`;
    text += `TLS Version: ${diagnosticState.results.tlsVersion}\n`;
    text += `Cipher Suite: ${diagnosticState.results.cipherSuite}\n`;
    if (diagnosticState.results.alpnProtocol) text += `ALPN Protocol: ${diagnosticState.results.alpnProtocol}\n`;

    text += `\nHandshake Phases:\n`;
    diagnosticState.results.phases.forEach((phase) => {
      text += `  ${phase.phase}: ${phase.duration}ms (at ${phase.timestamp}ms)\n`;
    });

    if (diagnosticState.results.certificateInfo) {
      text += `\nCertificate:\n`;
      text += `  Subject: ${diagnosticState.results.certificateInfo.subject}\n`;
      text += `  Issuer: ${diagnosticState.results.certificateInfo.issuer}\n`;
      text += `  Valid From: ${diagnosticState.results.certificateInfo.validFrom}\n`;
      text += `  Valid To: ${diagnosticState.results.certificateInfo.validTo}\n`;
    }

    clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{tlsHandshakeContent.title}</h1>
    <p>{tlsHandshakeContent.description}</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Example Hosts"
    getLabel={(ex) => ex.hostname}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Analyze ${ex.hostname}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Handshake Analysis</h3>
    </div>
    <div class="card-content">
      <div class="lookup-form">
        <div class="input-row">
          <label for="hostname"> Hostname </label>
          <input
            id="hostname"
            type="text"
            bind:value={hostname}
            placeholder="google.com"
            onchange={() => {
              examples.clear();
              if (hostname.trim()) analyzeHandshake();
            }}
          />
        </div>
        <div class="port-row">
          <label for="port"> Port </label>
          <input id="port" type="number" bind:value={port} placeholder="443" min="1" max="65535" />
        </div>
        <button class="lookup-btn" onclick={analyzeHandshake} disabled={diagnosticState.loading || !hostname.trim()}>
          {#if diagnosticState.loading}
            <Icon name="loader" size="sm" animate="spin" />
            Analyzing...
          {:else}
            <Icon name="activity" size="sm" />
            Analyze
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>
          Handshake Results for {diagnosticState.results.hostname}:{diagnosticState.results.port}
        </h3>
        <button class="copy-btn" onclick={copyResults} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <div class="results-grid">
          <!-- Summary Card -->
          <div class="result-card">
            <h4>Connection Summary</h4>
            <div class="info-list">
              <div class="info-item">
                <Icon name="clock" size="sm" />
                <div class="info-content">
                  <span class="info-label">Total Time</span>
                  <span class="info-value highlight">{diagnosticState.results.totalTime}ms</span>
                </div>
              </div>
              <div class="info-item">
                <Icon name="shield" size="sm" />
                <div class="info-content">
                  <span class="info-label">TLS Version</span>
                  <span class="info-value">{diagnosticState.results.tlsVersion}</span>
                </div>
              </div>
              <div class="info-item">
                <Icon name="key" size="sm" />
                <div class="info-content">
                  <span class="info-label">Cipher Suite</span>
                  <span class="info-value cipher">{diagnosticState.results.cipherSuite}</span>
                </div>
              </div>
              {#if diagnosticState.results.alpnProtocol}
                <div class="info-item">
                  <Icon name="layers" size="sm" />
                  <div class="info-content">
                    <span class="info-label">ALPN Protocol</span>
                    <span class="info-value">{diagnosticState.results.alpnProtocol}</span>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Certificate Card -->
          {#if diagnosticState.results.certificateInfo}
            <div class="result-card">
              <h4>Certificate Information</h4>
              <div class="info-list">
                <div class="info-item">
                  <Icon name="file" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Subject</span>
                    <span class="info-value">{diagnosticState.results.certificateInfo.subject}</span>
                  </div>
                </div>
                <div class="info-item">
                  <Icon name="building" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Issuer</span>
                    <span class="info-value">{diagnosticState.results.certificateInfo.issuer}</span>
                  </div>
                </div>
                <div class="info-item">
                  <Icon name="calendar" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Valid</span>
                    <span class="info-value cert-date">
                      {new Date(diagnosticState.results.certificateInfo.validFrom).toLocaleDateString()} →
                      {new Date(diagnosticState.results.certificateInfo.validTo).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {#if diagnosticState.results.certificateInfo.san}
                  <div class="info-item">
                    <Icon name="globe" size="sm" />
                    <div class="info-content">
                      <span class="info-label">SANs</span>
                      <span class="info-value">{diagnosticState.results.certificateInfo.san.length} domains</span>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Timing Breakdown -->
          <div class="result-card timeline-card">
            <h4>Handshake Timeline</h4>
            <div class="timeline">
              {#each diagnosticState.results.phases as phase (phase.phase)}
                <div class="timeline-item">
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <span class="phase-name">{phase.phase}</span>
                      <span class="phase-duration">{phase.duration}ms</span>
                    </div>
                    <div class="phase-timestamp">at {phase.timestamp}ms</div>
                    {#if phase.details && Object.keys(phase.details).length > 0}
                      <div class="phase-details">
                        {#each Object.entries(phase.details) as [key, value] (key)}
                          <span class="detail-badge">{key}: {value}</span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard title="Analysis Failed" error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About TLS Handshakes</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{tlsHandshakeContent.sections.whatIsHandshake.title}</h4>
          <p>{tlsHandshakeContent.sections.whatIsHandshake.content}</p>
        </div>

        <div class="info-section">
          <h4>{tlsHandshakeContent.sections.tlsVersions.title}</h4>
          <ul>
            {#each tlsHandshakeContent.sections.tlsVersions.versions as version (version.version)}
              <li>
                <strong>{version.version} ({version.status}):</strong>
                {version.description}
              </li>
            {/each}
          </ul>
        </div>

        <div class="info-section">
          <h4>{tlsHandshakeContent.sections.performanceFactors.title}</h4>
          <ul>
            {#each tlsHandshakeContent.sections.performanceFactors.factors as factor (factor.factor)}
              <li>
                <strong>{factor.factor}:</strong>
                {factor.description}
              </li>
            {/each}
          </ul>
        </div>

        <div class="info-section">
          <h4>{tlsHandshakeContent.sections.optimization.title}</h4>
          <ul>
            {#each tlsHandshakeContent.sections.optimization.techniques.slice(0, 3) as technique (technique.technique)}
              <li>
                <strong>{technique.technique}:</strong>
                {technique.benefit}
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <div class="quick-tips">
        <h4>Quick Tips</h4>
        <ul>
          {#each tlsHandshakeContent.quickTips as tip, idx (idx)}
            <li>{tip}</li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .lookup-form {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-end;

    label {
      display: block;
      margin-bottom: var(--spacing-sm);
      color: var(--text-primary);
      font-weight: 500;
    }

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .input-row {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;

    input {
      width: 100%;
    }
  }

  .port-row {
    display: flex;
    flex-direction: column;
    width: 120px;

    input {
      width: 100%;
    }

    @media (max-width: 768px) {
      width: 100%;
    }
  }

  .lookup-btn {
    flex-shrink: 0;
    white-space: nowrap;

    @media (max-width: 768px) {
      width: 100%;
    }
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .result-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);

    h4 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }

    &.timeline-card {
      grid-column: 1 / -1;
    }
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .info-item {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .info-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .info-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-weight: 500;

    &.highlight {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: var(--font-size-lg);
      color: var(--color-success);
    }

    &.cipher {
      font-family: var(--font-mono);
      font-size: var(--font-size-xs);
    }

    &.cert-date {
      font-size: var(--font-size-xs);
    }
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    position: relative;
    padding-left: var(--spacing-lg);

    &::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--border-color);
    }
  }

  .timeline-item {
    display: flex;
    gap: var(--spacing-md);
    position: relative;
  }

  .timeline-marker {
    position: absolute;
    left: -22px;
    top: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--bg-secondary);
    z-index: 1;
  }

  .timeline-content {
    flex: 1;
    background: var(--bg-primary);
    padding: var(--spacing-md);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .phase-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .phase-duration {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-primary);
    font-size: var(--font-size-sm);
  }

  .phase-timestamp {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .phase-details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);
  }

  .detail-badge {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
  }

  .quick-tips {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm) 0;
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      li {
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        line-height: 1.6;
      }
    }
  }

  .info-card {
    background: var(--bg-tertiary);
  }
</style>
