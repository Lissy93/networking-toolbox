<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { tooltip } from '$lib/actions/tooltip.js';
  import '../../../../styles/diagnostics-pages.scss';

  let host = $state('google.com:443');
  let servername = $state('');
  let useCustomServername = $state(false);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  interface Certificate {
    isExpired: boolean;
    daysUntilExpiry: number;
  }

  const examplesList = [
    { host: 'google.com:443', description: 'Google TLS certificate' },
    { host: 'github.com:443', description: 'GitHub certificate chain' },
    { host: 'cloudflare.com:443', description: 'Cloudflare certificate' },
    { host: 'wikipedia.org:443', description: 'Wikipedia certificate' },
    { host: 'stackoverflow.com:443', description: 'Stack Overflow certificate' },
    { host: 'microsoft.com:443', description: 'Microsoft certificate' },
  ];

  const examples = useExamples(examplesList);

  // Reactive validation
  const isInputValid = $derived(() => {
    const trimmedHost = host.trim();
    if (!trimmedHost) return false;
    // Basic host:port validation
    return /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(trimmedHost);
  });

  async function analyzeCertificate() {
    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/tls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'certificate',
          host: host.trim(),
          servername: useCustomServername && servername ? servername.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `Certificate analysis failed (${response.status})`);
        } catch {
          throw new Error(`Certificate analysis failed (${response.status})`);
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
    servername = '';
    useCustomServername = false;
    examples.select(index);
    analyzeCertificate();
  }

  function getExpiryStatus(cert: Certificate): { status: string; icon: string; class: string } {
    if (cert.isExpired) {
      return { status: 'Expired', icon: 'x-circle', class: 'error' };
    }
    if (cert.daysUntilExpiry <= 7) {
      return { status: `Expires in ${cert.daysUntilExpiry} days`, icon: 'alert-triangle', class: 'error' };
    }
    if (cert.daysUntilExpiry <= 30) {
      return { status: `Expires in ${cert.daysUntilExpiry} days`, icon: 'alert-triangle', class: 'warning' };
    }
    return { status: `Valid for ${cert.daysUntilExpiry} days`, icon: 'check-circle', class: 'success' };
  }

  async function copyCertificateInfo() {
    if (!diagnosticState.results?.peerCertificate) return;

    const cert = diagnosticState.results.peerCertificate;
    let text = `TLS Certificate Analysis for ${host}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;
    text += `Subject: ${cert.subject.CN}\n`;
    text += `Issuer: ${cert.issuer.CN}\n`;
    text += `Valid From: ${cert.validFrom}\n`;
    text += `Valid To: ${cert.validTo}\n`;
    text += `Days Until Expiry: ${cert.daysUntilExpiry}\n`;
    text += `Serial Number: ${cert.serialNumber}\n`;
    text += `Fingerprint (SHA1): ${cert.fingerprint}\n`;
    text += `Fingerprint (SHA256): ${cert.fingerprint256}\n`;

    if (cert.subjectAltNames.length > 0) {
      text += `\nSubject Alternative Names:\n`;
      cert.subjectAltNames.forEach((san: string) => {
        text += `  ${san}\n`;
      });
    }

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>TLS Certificate Analyzer</h1>
    <p>
      Analyze TLS certificates, view certificate chains, check expiration dates, and examine Subject Alternative Names
      (SANs). Supports custom SNI servername for multi-domain certificates.
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Certificate Examples"
    getLabel={(example) => example.host}
    getDescription={(example) => example.description}
    getTooltip={(example) => `Analyze certificate for ${example.host} (${example.description})`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Certificate Analysis Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group">
          <label for="host">
            Host:Port
            <input
              id="host"
              type="text"
              bind:value={host}
              placeholder="google.com:443"
              class:invalid={host && !isInputValid}
              use:tooltip={'Enter hostname:port (e.g., google.com:443)'}
              onchange={() => {
                examples.clear();
                if (isInputValid()) analyzeCertificate();
              }}
            />
            {#if host && !isInputValid}
              <span class="error-text">Invalid host:port format</span>
            {/if}
          </label>
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
                if (isInputValid()) analyzeCertificate();
              }}
            />
            Use custom SNI servername
          </label>
          {#if useCustomServername}
            <input
              type="text"
              bind:value={servername}
              placeholder="example.com"
              use:tooltip={'Custom servername for SNI (Server Name Indication)'}
              onchange={() => {
                examples.clear();
                if (isInputValid()) analyzeCertificate();
              }}
            />
          {/if}
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={analyzeCertificate} disabled={diagnosticState.loading || !isInputValid}>
          {#if diagnosticState.loading}
            <Icon name="loader-2" size="sm" animate="spin" />
            Analyzing Certificate...
          {:else}
            <Icon name="shield-check" size="sm" />
            Analyze Certificate
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>Certificate Analysis Results</h3>
        <button class="copy-btn" onclick={copyCertificateInfo} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? 'Copied!' : 'Copy Certificate Info'}
        </button>
      </div>
      <div class="card-content">
        <!-- Certificate Overview -->
        {#if diagnosticState.results.peerCertificate}
          {@const cert = diagnosticState.results.peerCertificate}
          {@const expiryStatus = getExpiryStatus(cert)}

          <div class="cert-overview">
            <div class="status-overview">
              <div class="status-item {expiryStatus.class}">
                <Icon name={expiryStatus.icon} size="sm" />
                <span>{expiryStatus.status}</span>
              </div>
              <div class="status-item {cert.isNotYetValid ? 'warning' : 'success'}">
                <Icon name={cert.isNotYetValid ? 'clock' : 'calendar'} size="sm" />
                <span>{cert.isNotYetValid ? 'Not yet valid' : 'Currently valid'}</span>
              </div>
            </div>

            <!-- Certificate Details -->
            <div class="cert-details">
              <div class="detail-section">
                <h4>Certificate Information</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">Common Name:</span>
                    <span class="detail-value mono">{cert.subject.CN}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Organization:</span>
                    <span class="detail-value">{cert.subject.O || 'N/A'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Issuer:</span>
                    <span class="detail-value">{cert.issuer.CN}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Serial Number:</span>
                    <span class="detail-value mono">{cert.serialNumber}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Valid From:</span>
                    <span class="detail-value">{new Date(cert.validFrom).toLocaleString()}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Valid To:</span>
                    <span class="detail-value">{new Date(cert.validTo).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <!-- Subject Alternative Names -->
              {#if cert.subjectAltNames?.length > 0}
                <div class="detail-section">
                  <h4>Subject Alternative Names</h4>
                  <div class="san-list">
                    {#each cert.subjectAltNames as san, index (index)}
                      <span class="san-item mono">{san}</span>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Fingerprints -->
              <div class="detail-section">
                <h4>Fingerprints</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">SHA1:</span>
                    <span class="detail-value mono">{cert.fingerprint}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">SHA256:</span>
                    <span class="detail-value mono">{cert.fingerprint256}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Certificate Chain -->
        {#if diagnosticState.results.chain?.length > 0}
          <div class="chain-section">
            <h4>Certificate Chain ({diagnosticState.results.chain.length} certificates)</h4>
            <div class="chain-list">
              {#each diagnosticState.results.chain as chainCert, i (i)}
                <div class="chain-item">
                  <div class="chain-header">
                    <span class="chain-level">Level {i}</span>
                    <span class="chain-cn mono">{chainCert.subject.CN}</span>
                  </div>
                  <div class="chain-details">
                    <span>Issuer: {chainCert.issuer.CN}</span>
                    <span>Expires: {new Date(chainCert.validTo).toLocaleDateString()}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Connection Details -->
        {#if diagnosticState.results.protocol || diagnosticState.results.cipher || diagnosticState.results.alpnProtocol}
          <div class="connection-section">
            <h4>Connection Details</h4>
            <div class="detail-grid">
              {#if diagnosticState.results.protocol}
                <div class="detail-item">
                  <span class="detail-label">TLS Version:</span>
                  <span class="detail-value">{diagnosticState.results.protocol}</span>
                </div>
              {/if}
              {#if diagnosticState.results.cipher}
                <div class="detail-item">
                  <span class="detail-label">Cipher Suite:</span>
                  <span class="detail-value">{diagnosticState.results.cipher.name}</span>
                </div>
              {/if}
              {#if diagnosticState.results.alpnProtocol}
                <div class="detail-item">
                  <span class="detail-label">ALPN Protocol:</span>
                  <span class="detail-value">{diagnosticState.results.alpnProtocol}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <ErrorCard title="Certificate Analysis Failed" error={diagnosticState.error} />
</div>

<style lang="scss">
  .cert-overview {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .cert-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .detail-section {
    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
    word-break: break-all;

    &.mono {
      font-family: var(--font-mono);
    }
  }

  .san-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .san-item {
    background: var(--bg-secondary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
    font-size: var(--font-size-xs);
    color: var(--text-primary);
  }

  .chain-section {
    margin-top: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .chain-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .chain-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-md);
  }

  .chain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .chain-level {
    background: var(--color-primary);
    color: var(--bg-primary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .chain-cn {
    font-weight: 500;
    color: var(--text-primary);
  }

  .chain-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
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

  .error-text {
    color: var(--color-error);
    font-size: var(--font-size-xs);
    margin-top: var(--spacing-xs);
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>
