<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics/tls-certificate');
  });

  let host = $state('google.com:443');
  let servername = $state('');
  let useCustomServername = $state(false);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  interface Certificate {
    isExpired: boolean;
    daysUntilExpiry: number;
  }

  const examplesList = $derived([
    { host: 'google.com:443', description: $t('examples.0.description') },
    { host: 'github.com:443', description: $t('examples.1.description') },
    { host: 'cloudflare.com:443', description: $t('examples.2.description') },
    { host: 'wikipedia.org:443', description: $t('examples.3.description') },
    { host: 'stackoverflow.com:443', description: $t('examples.4.description') },
    { host: 'microsoft.com:443', description: $t('examples.5.description') },
  ]);

  const examples = useExamples(() => examplesList);

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
          throw new Error(errorData.message || $t('form.errors.analysisFailedStatus', { status: response.status }));
        } catch {
          throw new Error($t('form.errors.analysisFailedStatus', { status: response.status }));
        }
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : $t('form.errors.unknownError'));
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
      return { status: $t('results.status.expired'), icon: 'x-circle', class: 'error' };
    }
    if (cert.daysUntilExpiry <= 7) {
      return {
        status: $t('results.status.expiresInDays', { days: cert.daysUntilExpiry }),
        icon: 'alert-triangle',
        class: 'error',
      };
    }
    if (cert.daysUntilExpiry <= 30) {
      return {
        status: $t('results.status.expiresInDays', { days: cert.daysUntilExpiry }),
        icon: 'alert-triangle',
        class: 'warning',
      };
    }
    return {
      status: $t('results.status.validForDays', { days: cert.daysUntilExpiry }),
      icon: 'check-circle',
      class: 'success',
    };
  }

  async function copyCertificateInfo() {
    if (!diagnosticState.results?.peerCertificate) return;

    const cert = diagnosticState.results.peerCertificate;
    let text = $t('copyTemplate.header', { host }) + '\n';
    text += $t('copyTemplate.generated', { timestamp: new Date().toISOString() }) + '\n\n';
    text += $t('copyTemplate.subject', { subject: cert.subject.CN }) + '\n';
    text += $t('copyTemplate.issuer', { issuer: cert.issuer.CN }) + '\n';
    text += $t('copyTemplate.validFrom', { validFrom: cert.validFrom }) + '\n';
    text += $t('copyTemplate.validTo', { validTo: cert.validTo }) + '\n';
    text += $t('copyTemplate.daysUntilExpiry', { days: cert.daysUntilExpiry }) + '\n';
    text += $t('copyTemplate.serialNumber', { serialNumber: cert.serialNumber }) + '\n';
    text += $t('copyTemplate.fingerprintSha1', { fingerprint: cert.fingerprint }) + '\n';
    text += $t('copyTemplate.fingerprintSha256', { fingerprint256: cert.fingerprint256 }) + '\n';

    if (cert.subjectAltNames.length > 0) {
      text += '\n' + $t('copyTemplate.sanHeader') + '\n';
      cert.subjectAltNames.forEach((san: string) => {
        text += $t('copyTemplate.sanItem', { san }) + '\n';
      });
    }

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('title')}</h1>
    <p>
      {$t('description')}
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('examplesSection.title')}
    getLabel={(example) => example.host}
    getDescription={(example) => example.description}
    getTooltip={(example) => $t('examplesSection.tooltip', { host: example.host, description: example.description })}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group">
          <label for="host">
            {$t('form.hostPort.label')}
            <input
              id="host"
              type="text"
              bind:value={host}
              placeholder={$t('form.hostPort.placeholder')}
              class:invalid={host && !isInputValid}
              use:tooltip={$t('form.hostPort.tooltip')}
              onchange={() => {
                examples.clear();
                if (isInputValid()) analyzeCertificate();
              }}
            />
            {#if host && !isInputValid}
              <span class="error-text">{$t('form.hostPort.error')}</span>
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
            {$t('form.customSni.label')}
          </label>
          {#if useCustomServername}
            <input
              type="text"
              bind:value={servername}
              placeholder={$t('form.customSni.placeholder')}
              use:tooltip={$t('form.customSni.tooltip')}
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
            {$t('form.analyzing')}
          {:else}
            <Icon name="shield-check" size="sm" />
            {$t('form.analyze')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('results.title')}</h3>
        <button class="copy-btn" onclick={copyCertificateInfo} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? $t('results.copied') : $t('results.copy')}
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
                <span
                  >{cert.isNotYetValid ? $t('results.status.notYetValid') : $t('results.status.currentlyValid')}</span
                >
              </div>
            </div>

            <!-- Certificate Details -->
            <div class="cert-details">
              <div class="detail-section">
                <h4>{$t('results.certificate.title')}</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">{$t('results.certificate.commonName')}</span>
                    <span class="detail-value mono">{cert.subject.CN}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{$t('results.certificate.organization')}</span>
                    <span class="detail-value">{cert.subject.O || $t('results.certificate.na')}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{$t('results.certificate.issuer')}</span>
                    <span class="detail-value">{cert.issuer.CN}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{$t('results.certificate.serialNumber')}</span>
                    <span class="detail-value mono">{cert.serialNumber}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{$t('results.certificate.validFrom')}</span>
                    <span class="detail-value">{new Date(cert.validFrom).toLocaleString()}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{$t('results.certificate.validTo')}</span>
                    <span class="detail-value">{new Date(cert.validTo).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <!-- Subject Alternative Names -->
              {#if cert.subjectAltNames?.length > 0}
                <div class="detail-section">
                  <h4>{$t('results.san.title')}</h4>
                  <div class="san-list">
                    {#each cert.subjectAltNames as san, index (index)}
                      <span class="san-item mono">{san}</span>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Fingerprints -->
              <div class="detail-section">
                <h4>{$t('results.fingerprints.title')}</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">{$t('results.fingerprints.sha1')}</span>
                    <span class="detail-value mono">{cert.fingerprint}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{$t('results.fingerprints.sha256')}</span>
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
            <h4>{$t('results.chain.title', { count: diagnosticState.results.chain.length })}</h4>
            <div class="chain-list">
              {#each diagnosticState.results.chain as chainCert, i (i)}
                <div class="chain-item">
                  <div class="chain-header">
                    <span class="chain-level">{$t('results.chain.level', { level: i })}</span>
                    <span class="chain-cn mono">{chainCert.subject.CN}</span>
                  </div>
                  <div class="chain-details">
                    <span>{$t('results.chain.issuer', { issuer: chainCert.issuer.CN })}</span>
                    <span
                      >{$t('results.chain.expires', { date: new Date(chainCert.validTo).toLocaleDateString() })}</span
                    >
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Connection Details -->
        {#if diagnosticState.results.protocol || diagnosticState.results.cipher || diagnosticState.results.alpnProtocol}
          <div class="connection-section">
            <h4>{$t('results.connection.title')}</h4>
            <div class="detail-grid">
              {#if diagnosticState.results.protocol}
                <div class="detail-item">
                  <span class="detail-label">{$t('results.connection.tlsVersion')}</span>
                  <span class="detail-value">{diagnosticState.results.protocol}</span>
                </div>
              {/if}
              {#if diagnosticState.results.cipher}
                <div class="detail-item">
                  <span class="detail-label">{$t('results.connection.cipherSuite')}</span>
                  <span class="detail-value">{diagnosticState.results.cipher.name}</span>
                </div>
              {/if}
              {#if diagnosticState.results.alpnProtocol}
                <div class="detail-item">
                  <span class="detail-label">{$t('results.connection.alpnProtocol')}</span>
                  <span class="detail-value">{diagnosticState.results.alpnProtocol}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <ErrorCard title={$t('error.title')} error={diagnosticState.error} />
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
