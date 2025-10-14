<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { mailTLSContent as content } from '$lib/content/mail-tls';
  import { useDiagnosticState, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  interface CertificateInfo {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    daysUntilExpiry: number;
    serialNumber: string;
    fingerprint: string;
    commonName: string;
    altNames: string[];
  }

  interface TLSCheckResult {
    domain: string;
    port: number;
    supportsSTARTTLS: boolean;
    supportsDirectTLS: boolean;
    certificate?: CertificateInfo;
    tlsVersion?: string;
    cipherSuite?: string;
    timestamp: string;
  }

  const examplesList = [
    { domain: 'gmail.com', port: 587, desc: 'Google Mail STARTTLS' },
    { domain: 'outlook.com', port: 587, desc: 'Microsoft Outlook STARTTLS' },
    { domain: 'smtp.gmail.com', port: 465, desc: 'Gmail Direct TLS' },
  ];

  let domain = $state('');
  let port = $state(587);

  const diagnosticState = useDiagnosticState<TLSCheckResult>();
  const examples = useExamples(examplesList);

  async function loadExample(example: (typeof examplesList)[0], index: number) {
    domain = example.domain;
    port = example.port;
    examples.select(index);
    await checkTLS();
  }

  async function checkTLS() {
    if (!domain.trim()) {
      diagnosticState.setError('Please enter a domain name');
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/mail-tls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim(), port }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || 'TLS check failed');
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{content.title}</h1>
    <p>{content.description}</p>
  </header>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Check Mail Server TLS</h3>
    </div>
    <div class="card-content">
      <div class="lookup-form">
        <input
          type="text"
          bind:value={domain}
          placeholder="mail.example.com"
          onkeydown={(e) => e.key === 'Enter' && checkTLS()}
          disabled={diagnosticState.loading}
        />
        <input
          type="number"
          bind:value={port}
          min="1"
          max="65535"
          placeholder="Port"
          class="port-input"
          disabled={diagnosticState.loading}
        />
        <button class="lookup-btn" onclick={checkTLS} disabled={diagnosticState.loading}>
          <Icon
            name={diagnosticState.loading ? 'loader' : 'lock'}
            size="sm"
            animate={diagnosticState.loading ? 'spin' : undefined}
          />
          {diagnosticState.loading ? 'Checking...' : 'Check TLS'}
        </button>
      </div>
    </div>
  </div>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Quick Examples"
    getLabel={(ex) => `${ex.domain}:${ex.port}`}
    getDescription={(ex) => ex.desc}
    getTooltip={(ex) => `Check TLS for ${ex.domain} on port ${ex.port}`}
  />

  <!-- Loading -->
  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Checking TLS Support</h3>
            <p>Testing connection to {domain}:{port}...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard error={diagnosticState.error} />

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>TLS Check Results for {diagnosticState.results.domain}:{diagnosticState.results.port}</h3>
      </div>
      <div class="card-content">
        <!-- TLS Support Status -->
        <div class="status-overview">
          {#if diagnosticState.results.supportsSTARTTLS}
            <div class="status-item success">
              <Icon name="check-circle" size="md" />
              <div>
                <h4>STARTTLS Supported</h4>
                <p>Server supports upgrading to TLS</p>
              </div>
            </div>
          {/if}
          {#if diagnosticState.results.supportsDirectTLS}
            <div class="status-item success">
              <Icon name="lock" size="md" />
              <div>
                <h4>Direct TLS Supported</h4>
                <p>Server supports implicit TLS</p>
              </div>
            </div>
          {/if}
          {#if !diagnosticState.results.supportsSTARTTLS && !diagnosticState.results.supportsDirectTLS}
            <div class="status-item error">
              <Icon name="x-circle" size="md" />
              <div>
                <h4>TLS Not Supported</h4>
                <p>Server does not support TLS encryption</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Connection Details -->
        {#if diagnosticState.results.tlsVersion || diagnosticState.results.cipherSuite}
          <div class="subsection">
            <h4>
              <Icon name="shield" size="sm" />
              Connection Details
            </h4>
            <div class="details-grid">
              {#if diagnosticState.results.tlsVersion}
                <div class="detail-item">
                  <span class="detail-label">TLS Version</span>
                  <span class="detail-value">{diagnosticState.results.tlsVersion}</span>
                </div>
              {/if}
              {#if diagnosticState.results.cipherSuite}
                <div class="detail-item">
                  <span class="detail-label">Cipher Suite</span>
                  <span class="detail-value mono">{diagnosticState.results.cipherSuite}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Certificate Information -->
        {#if diagnosticState.results.certificate}
          <div class="subsection">
            <h4>
              <Icon name="award" size="sm" />
              Certificate Information
            </h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Common Name</span>
                <span class="detail-value">{diagnosticState.results.certificate.commonName}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Issuer</span>
                <span class="detail-value">{diagnosticState.results.certificate.issuer}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Valid From</span>
                <span class="detail-value"
                  >{new Date(diagnosticState.results.certificate.validFrom).toLocaleDateString()}</span
                >
              </div>
              <div class="detail-item">
                <span class="detail-label">Valid To</span>
                <span class="detail-value {diagnosticState.results.certificate.daysUntilExpiry < 30 ? 'warning' : ''}">
                  {new Date(diagnosticState.results.certificate.validTo).toLocaleDateString()}
                  {#if diagnosticState.results.certificate.daysUntilExpiry < 30}
                    <span class="badge warning"
                      >Expires in {diagnosticState.results.certificate.daysUntilExpiry} days</span
                    >
                  {/if}
                </span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Serial Number</span>
                <span class="detail-value mono">{diagnosticState.results.certificate.serialNumber}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Fingerprint</span>
                <span class="detail-value mono">{diagnosticState.results.certificate.fingerprint}</span>
              </div>
              {#if diagnosticState.results.certificate.altNames.length > 0}
                <div class="detail-item full-width">
                  <span class="detail-label"
                    >Alternative Names ({diagnosticState.results.certificate.altNames.length})</span
                  >
                  <div class="alt-names">
                    {#each diagnosticState.results.certificate.altNames as altName (altName)}
                      <span class="alt-name-tag">{altName}</span>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Info Sections -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About SMTP TLS</h3>
    </div>
    <div class="card-content">
      <details class="info-accordion">
        <summary class="accordion-summary">
          <Icon name="chevron-right" size="sm" />
          <h4>{content.sections.whatIsTLS.title}</h4>
        </summary>
        <div class="accordion-content">
          <p>{content.sections.whatIsTLS.content}</p>
        </div>
      </details>

      <details class="info-accordion">
        <summary class="accordion-summary">
          <Icon name="chevron-right" size="sm" />
          <h4>{content.sections.portInfo.title}</h4>
        </summary>
        <div class="accordion-content">
          <div class="port-list">
            {#each content.sections.portInfo.ports as portInfo (portInfo.port)}
              <div class="port-item">
                <div class="port-number">{portInfo.port}</div>
                <div class="port-details">
                  <strong>{portInfo.name}</strong>
                  <p>{portInfo.desc}</p>
                  <span class="security-badge">{portInfo.security}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </details>

      {#each [{ title: content.sections.tlsTypes.title, items: content.sections.tlsTypes.types, keys: ['name', 'desc', 'ports'] }, { title: content.sections.certificateFields.title, items: content.sections.certificateFields.fields, keys: ['field', 'desc'] }, { title: content.sections.security.title, items: content.sections.security.points, keys: ['point', 'desc'] }, { title: content.sections.troubleshooting.title, items: content.sections.troubleshooting.issues, keys: ['issue', 'solution'] }] as section (section.title)}
        <details class="info-accordion">
          <summary class="accordion-summary">
            <Icon name="chevron-right" size="sm" />
            <h4>{section.title}</h4>
          </summary>
          <div class="accordion-content">
            <ul>
              {#each section.items as item ((item as any)[section.keys[0]])}
                <li>
                  <strong>{(item as any)[section.keys[0]]}:</strong>
                  {(item as any)[section.keys[1]]}
                  {#if section.keys[2] && (item as any)[section.keys[2]]}
                    <em class="example-text">({(item as any)[section.keys[2]]})</em>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        </details>
      {/each}

      <details class="info-accordion">
        <summary class="accordion-summary">
          <Icon name="chevron-right" size="sm" />
          <h4>Quick Tips</h4>
        </summary>
        <div class="accordion-content">
          <ul>
            {#each content.quickTips as tip (tip)}
              <li>{tip}</li>
            {/each}
          </ul>
        </div>
      </details>
    </div>
  </div>
</div>

<style lang="scss">
  .subsection {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-primary);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    &.full-width {
      grid-column: 1 / -1;
    }
  }

  .detail-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-weight: 500;
    text-transform: uppercase;
  }

  .detail-value {
    color: var(--color-text);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;

    &.mono {
      font-family: var(--font-mono);
      font-size: 0.9rem;
    }

    &.warning {
      color: var(--color-warning);
    }
  }

  .badge {
    display: inline-block;
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;

    &.warning {
      background: var(--color-warning-bg);
      color: var(--color-warning);
    }
  }

  .alt-names {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .alt-name-tag {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--border-primary);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }

  .port-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .port-item {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--border-primary);
    border-radius: var(--radius-sm);
  }

  .port-number {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--color-primary);
    min-width: 60px;
    text-align: center;
  }

  .port-details {
    flex: 1;

    strong {
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    p {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }
  }

  .security-badge {
    display: inline-block;
    padding: 2px var(--spacing-xs);
    background: color-mix(in srgb, var(--color-success), transparent 90%);
    color: var(--color-success);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .lookup-form {
    display: flex;
    gap: var(--spacing-md);
    align-items: stretch;

    input {
      flex: 1;
      min-width: 0;
    }

    .port-input {
      flex: 0 0 100px;
      width: 100px;
    }

    @media (max-width: 640px) {
      flex-wrap: wrap;

      input {
        flex: 1 1 calc(100% - 110px);
      }

      .port-input {
        flex: 0 0 100px;
      }

      button {
        flex: 1 1 100%;
      }
    }
  }

  .example-text {
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .info-accordion {
    border: none;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
    overflow: hidden;
    transition: all var(--transition-fast);

    &:hover {
      background: color-mix(in srgb, var(--bg-secondary), var(--bg-primary) 30%);
    }

    &[open] {
      .accordion-summary {
        border-bottom: 1px solid var(--border-primary);

        :global(svg) {
          transform: rotate(90deg);
        }
      }

      .accordion-content {
        animation: accordionOpen 0.2s ease-out;
      }
    }
  }

  .accordion-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);

    &::-webkit-details-marker {
      display: none;
    }

    :global(svg) {
      transition: transform var(--transition-fast);
      color: var(--color-primary);
      flex-shrink: 0;
    }

    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    &:hover {
      :global(svg) {
        color: var(--color-primary-hover);
      }
    }
  }

  .accordion-content {
    padding: var(--spacing-md);
    padding-top: var(--spacing-sm);
    animation: accordionOpen 0.2s ease-out;

    p {
      margin: 0;
      line-height: 1.6;
      color: var(--text-secondary);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      list-style-type: disc;

      li {
        margin-bottom: var(--spacing-sm);
        line-height: 1.6;
        color: var(--text-secondary);

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  @keyframes accordionOpen {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .info-card {
    margin-top: var(--spacing-lg);
  }
</style>
