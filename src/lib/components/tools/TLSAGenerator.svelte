<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { useClipboard } from '$lib/composables';

  let domain = $state('example.com');
  let port = $state(443);
  let protocol = $state('tcp');
  let inputType = $state('certificate');
  let certificateInput = $state('');
  let hashInput = $state('');

  let usage = $state(3);
  let selector = $state(1);
  let matchingType = $state(1);

  let showExamples = $state(false);
  let selectedExample = $state<string | null>(null);
  const clipboard = useClipboard();

  const usageDescriptions = {
    0: 'CA Constraint - Certificate must be issued by the CA represented in the TLSA record',
    1: 'Service Certificate Constraint - Certificate must match the one in the TLSA record',
    2: 'Trust Anchor Assertion - Certificate must chain to the CA in the TLSA record',
    3: 'Domain-Issued Certificate - Certificate must match the one specified (most common)',
  };

  const selectorDescriptions = {
    0: 'Full Certificate - Use the entire certificate',
    1: 'Subject Public Key Info - Use only the public key portion (recommended)',
  };

  const matchingTypeDescriptions = {
    0: 'Exact Match - Use the certificate/key data as-is (not recommended)',
    1: 'SHA-256 Hash - Use SHA-256 hash of the certificate/key (recommended)',
    2: 'SHA-512 Hash - Use SHA-512 hash of the certificate/key',
  };

  const tlsaRecord = $derived.by(() => {
    let associationData = '';

    if (inputType === 'hash') {
      associationData = hashInput
        .trim()
        .replace(/[^a-fA-F0-9]/g, '')
        .toLowerCase();
    } else if (inputType === 'certificate') {
      if (certificateInput.trim()) {
        associationData = 'Generated hash would appear here (requires certificate parsing)';
      }
    }

    if (!associationData) return null;

    return {
      usage,
      selector,
      matchingType,
      certificateAssociation: associationData,
    };
  });

  const dnsRecord = $derived.by(() => {
    if (!tlsaRecord) return '';
    return `_${port}._${protocol}.${domain}. IN TLSA ${tlsaRecord.usage} ${tlsaRecord.selector} ${tlsaRecord.matchingType} ${tlsaRecord.certificateAssociation}`;
  });

  const validation = $derived.by(() => {
    const warnings = [];
    const errors = [];

    if (!domain.trim()) {
      errors.push('Domain is required');
    } else if (!domain.includes('.')) {
      warnings.push('Domain should include TLD (e.g., .com, .org)');
    }

    if (port < 1 || port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }

    if (inputType === 'certificate') {
      if (!certificateInput.trim()) {
        errors.push('Certificate data is required');
      } else if (!certificateInput.includes('BEGIN CERTIFICATE') && !certificateInput.includes('BEGIN PUBLIC KEY')) {
        warnings.push('Certificate should be in PEM format');
      }
    } else if (inputType === 'hash') {
      if (!hashInput.trim()) {
        errors.push('Hash value is required');
      } else {
        const cleanHash = hashInput.trim().replace(/[^a-fA-F0-9]/g, '');
        if (matchingType === 1 && cleanHash.length !== 64) {
          warnings.push('SHA-256 hash should be exactly 64 hexadecimal characters');
        } else if (matchingType === 2 && cleanHash.length !== 128) {
          warnings.push('SHA-512 hash should be exactly 128 hexadecimal characters');
        } else if (!/^[a-fA-F0-9]+$/.test(cleanHash)) {
          errors.push('Hash must contain only hexadecimal characters');
        }
      }
    }

    if (usage === 0 || usage === 2) {
      warnings.push('Usage types 0 and 2 require careful CA certificate management');
    }

    if (selector === 0) {
      warnings.push('Full certificate selector (0) is less flexible than SPKI selector (1)');
    }

    if (matchingType === 0) {
      warnings.push('Exact match (0) is not recommended - use SHA-256 (1) or SHA-512 (2)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  });

  function copyToClipboard(text: string, buttonId: string) {
    clipboard.copy(text, buttonId);
  }

  function exportAsZoneFile() {
    if (!dnsRecord) return;

    const zoneContent = dnsRecord;
    const blob = new Blob([zoneContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-tlsa-record.zone`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('downloaded', 'export-tlsa');
  }

  async function generateHashFromInput() {
    if (inputType === 'certificate' && certificateInput.trim()) {
      const demoHash =
        matchingType === 1
          ? 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
          : 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      hashInput = demoHash;
      inputType = 'hash';
    }
  }

  const exampleConfigurations = [
    {
      name: 'HTTPS Certificate Pin',
      description: 'Pin a specific certificate for HTTPS',
      domain: 'example.com',
      port: 443,
      protocol: 'tcp',
      usage: 3,
      selector: 1,
      matchingType: 1,
      hash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    {
      name: 'SMTP TLS Certificate',
      description: 'DANE for email server TLS',
      domain: 'mail.example.com',
      port: 587,
      protocol: 'tcp',
      usage: 3,
      selector: 1,
      matchingType: 1,
      hash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    },
    {
      name: 'CA Trust Anchor',
      description: 'Trust anchor for certificate authority',
      domain: 'secure.example.com',
      port: 443,
      protocol: 'tcp',
      usage: 2,
      selector: 1,
      matchingType: 2,
      hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
  ];

  function loadExample(example: {
    name: string;
    description: string;
    domain: string;
    port: number;
    protocol: string;
    usage: number;
    selector: number;
    matchingType: number;
    hash: string;
  }) {
    domain = example.domain;
    port = example.port;
    protocol = example.protocol;
    usage = example.usage;
    selector = example.selector;
    matchingType = example.matchingType;
    hashInput = example.hash;
    inputType = 'hash';
    certificateInput = '';
    selectedExample = example.name;
  }

  const securityTips = [
    'Use usage type 3 (Domain-Issued Certificate) for most scenarios',
    'Prefer selector 1 (SPKI) over selector 0 (full certificate) for flexibility',
    'Use SHA-256 (1) or SHA-512 (2) matching types, avoid exact match (0)',
    'Pin multiple certificates to avoid service disruption during certificate rotation',
    'Test TLSA records with DANE validation tools before deployment',
  ];
</script>

<div class="container">
  <div class="card">
    <div class="card-header">
      <h1>TLSA Generator</h1>
      <p>
        Create TLSA (DNS-based Authentication of Named Entities) records for certificate pinning and DANE
        implementation.
      </p>
    </div>

    <div class="main-grid">
      <div class="input-section">
        <!-- Service Configuration -->
        <div class="card sub-card">
          <h3 class="section-title">
            <Icon name="globe" size="sm" />
            Service Configuration
          </h3>

          <div class="service-grid">
            <div class="input-group">
              <label for="domain" use:tooltip={'Domain name for the TLSA record'}>Domain:</label>
              <input id="domain" type="text" bind:value={domain} placeholder="example.com" />
            </div>

            <div class="input-group">
              <label for="port" use:tooltip={'Port number for the service (e.g., 443 for HTTPS, 25 for SMTP)'}
                >Port:</label
              >
              <input id="port" type="number" bind:value={port} min="1" max="65535" placeholder="443" />
            </div>

            <div class="input-group">
              <label for="protocol" use:tooltip={'Protocol type (tcp or udp)'}>Protocol:</label>
              <select id="protocol" bind:value={protocol}>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
          </div>
        </div>

        <!-- TLSA Parameters -->
        <div class="card sub-card">
          <h3 class="section-title">
            <Icon name="settings" size="sm" />
            TLSA Parameters
          </h3>

          <div class="input-group">
            <label for="usage" use:tooltip={'Certificate usage - how the certificate should be used for authentication'}
              >Certificate Usage:</label
            >
            <select id="usage" bind:value={usage}>
              <option value={0}>0 - CA Constraint</option>
              <option value={1}>1 - Service Certificate Constraint</option>
              <option value={2}>2 - Trust Anchor Assertion</option>
              <option value={3}>3 - Domain-Issued Certificate</option>
            </select>
            <p class="description">{usageDescriptions[usage as keyof typeof usageDescriptions]}</p>
          </div>

          <div class="input-group">
            <label for="selector" use:tooltip={'Which part of the certificate to use'}>Selector:</label>
            <select id="selector" bind:value={selector}>
              <option value={0}>0 - Full Certificate</option>
              <option value={1}>1 - Subject Public Key Info</option>
            </select>
            <p class="description">{selectorDescriptions[selector as keyof typeof selectorDescriptions]}</p>
          </div>

          <div class="input-group">
            <label for="matchingType" use:tooltip={'How to process the certificate data'}>Matching Type:</label>
            <select id="matchingType" bind:value={matchingType}>
              <option value={0}>0 - Exact Match</option>
              <option value={1}>1 - SHA-256 Hash</option>
              <option value={2}>2 - SHA-512 Hash</option>
            </select>
            <p class="description">{matchingTypeDescriptions[matchingType as keyof typeof matchingTypeDescriptions]}</p>
          </div>
        </div>

        <!-- Certificate Data -->
        <div class="card sub-card">
          <h3 class="section-title">
            <Icon name="key" size="sm" />
            Certificate Data
          </h3>

          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" bind:group={inputType} value="certificate" />
              <span>Certificate/Public Key (PEM)</span>
            </label>
            <label class="radio-option">
              <input type="radio" bind:group={inputType} value="hash" />
              <span>Hash Value</span>
            </label>
          </div>

          {#if inputType === 'certificate'}
            <div class="input-group">
              <label for="certificate" use:tooltip={'Paste the PEM-encoded certificate or public key'}
                >Certificate/Public Key:</label
              >
              <textarea
                id="certificate"
                bind:value={certificateInput}
                placeholder="-----BEGIN CERTIFICATE-----&#10;MIIFXzCCA0egAwIBAgIJAKZ5QeHxw...&#10;-----END CERTIFICATE-----"
                rows="8"
              ></textarea>
              <button
                type="button"
                onclick={generateHashFromInput}
                disabled={!certificateInput.trim()}
                class="btn btn-secondary"
                use:tooltip={'Generate hash from certificate (demo mode)'}
              >
                <Icon name="arrow-right" size="sm" />
                Generate Hash
              </button>
            </div>
          {:else}
            <div class="input-group">
              <label
                for="hash"
                use:tooltip={`Enter the ${matchingType === 1 ? 'SHA-256' : matchingType === 2 ? 'SHA-512' : 'exact'} hash value`}
                >Hash Value:</label
              >
              <textarea
                id="hash"
                bind:value={hashInput}
                placeholder={matchingType === 1
                  ? 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
                  : matchingType === 2
                    ? 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
                    : 'Certificate or key data'}
                rows="3"
              ></textarea>
            </div>
          {/if}
        </div>
      </div>

      <div class="output-section">
        {#if tlsaRecord}
          <!-- Generated Record -->
          <div class="card">
            <div class="card-header-with-actions">
              <h3>Generated TLSA Record</h3>
              <div class="actions">
                <button
                  type="button"
                  class="btn btn-primary"
                  class:success={clipboard.isCopied('copy-tlsa')}
                  onclick={() => copyToClipboard(dnsRecord, 'copy-tlsa')}
                  use:tooltip={'Copy TLSA record to clipboard'}
                >
                  <Icon name={clipboard.isCopied('copy-tlsa') ? 'check' : 'copy'} size="sm" />
                  {clipboard.isCopied('copy-tlsa') ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  class="btn btn-success"
                  class:success={clipboard.isCopied('export-tlsa')}
                  onclick={exportAsZoneFile}
                  use:tooltip={'Download as zone file'}
                >
                  <Icon name={clipboard.isCopied('export-tlsa') ? 'check' : 'download'} size="sm" />
                  {clipboard.isCopied('export-tlsa') ? 'Downloaded!' : 'Export'}
                </button>
              </div>
            </div>

            <div class="code-block">
              <code>{dnsRecord}</code>
            </div>

            <div class="breakdown">
              <h4>Record Breakdown:</h4>
              <div class="breakdown-grid">
                <div class="breakdown-item">
                  <strong>Service:</strong> _{port}._{protocol}
                </div>
                <div class="breakdown-item">
                  <strong>Usage:</strong>
                  {usage} ({Object.values(usageDescriptions)[usage].split(' - ')[0]})
                </div>
                <div class="breakdown-item">
                  <strong>Selector:</strong>
                  {selector} ({Object.values(selectorDescriptions)[selector].split(' - ')[0]})
                </div>
                <div class="breakdown-item">
                  <strong>Matching:</strong>
                  {matchingType} ({Object.values(matchingTypeDescriptions)[matchingType].split(' - ')[0]})
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Validation -->
        <div class="card">
          <h3 class="section-title">
            <Icon name="bar-chart" size="sm" />
            Validation
          </h3>

          <div class="status-center">
            <div class="status-item">
              <span>Status:</span>
              <span class="status" class:valid={validation.isValid} class:invalid={!validation.isValid}>
                {validation.isValid ? 'Valid' : 'Invalid'}
              </span>
            </div>
          </div>

          {#if validation.errors.length > 0}
            <div class="message error">
              <Icon name="x-circle" size="sm" />
              <div>
                {#each validation.errors as error, index (index)}
                  <div>{error}</div>
                {/each}
              </div>
            </div>
          {/if}

          {#if validation.warnings.length > 0}
            <div class="message warning">
              <Icon name="alert-triangle" size="sm" />
              <div>
                {#each validation.warnings as warning, index (index)}
                  <div>{warning}</div>
                {/each}
              </div>
            </div>
          {/if}

          {#if validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0}
            <div class="message success">
              <Icon name="check-circle" size="sm" />
              <div>TLSA record is valid and ready to deploy!</div>
            </div>
          {/if}
        </div>

        <!-- Security Best Practices -->
        <div class="card">
          <h3 class="section-title">
            <Icon name="shield" size="sm" />
            Security Best Practices
          </h3>

          <ul class="tips-list">
            {#each securityTips as tip, index (index)}
              <li>{tip}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <!-- Examples -->
    <div class="card examples-card">
      <details bind:open={showExamples}>
        <summary class="examples-summary">
          <Icon name="lightbulb" size="sm" />
          Example Configurations
          <span class="chevron"><Icon name="chevron-down" size="sm" /></span>
        </summary>
        <div class="examples-grid">
          {#each exampleConfigurations as example (example.name)}
            <button
              type="button"
              class="example-card"
              class:selected={selectedExample === example.name}
              onclick={() => loadExample(example)}
            >
              <div class="example-name">{example.name}</div>
              <p class="example-description">{example.description}</p>
              <div class="example-config">
                <div>Port: <code>{example.port}/{example.protocol}</code></div>
                <div>
                  Usage: <code>{example.usage}</code>, Selector: <code>{example.selector}</code>, Type:
                  <code>{example.matchingType}</code>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </details>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
  }

  .card {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .card-header {
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-primary);
  }

  .card-header h1 {
    color: var(--text-primary);
    font-size: var(--font-size-2xl);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .card-header p {
    color: var(--text-secondary);
    margin: 0;
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
  }

  @media (max-width: 768px) {
    .main-grid {
      grid-template-columns: 1fr;
    }
  }

  .input-section,
  .output-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .sub-card {
    padding: var(--spacing-md);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin: 0 0 var(--spacing-md) 0;
  }

  .service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .input-group label {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .input-group input,
  .input-group select,
  .input-group textarea {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .input-group input:focus,
  .input-group select:focus,
  .input-group textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .input-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-style: italic;
    margin-top: var(--spacing-xs);
  }

  .radio-group {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  @media (max-width: 768px) {
    .radio-group {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: background-color var(--transition-fast);
  }

  .radio-option:hover {
    background: var(--surface-hover);
  }

  .radio-option input[type='radio'] {
    width: 16px;
    height: 16px;
  }

  .radio-option span {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-normal);
    text-decoration: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--bg-primary);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--color-info);
    color: var(--bg-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-info-light);
  }

  .btn-success {
    background: var(--color-success);
    color: var(--bg-primary);
  }

  .btn-success:hover:not(:disabled) {
    background: var(--color-success-light);
  }

  .btn.success {
    background: var(--color-success) !important;
    transform: scale(1.05);
  }

  .card-header-with-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-primary);
  }

  .card-header-with-actions h3 {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin: 0;
  }

  .actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .code-block {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin: var(--spacing-md);
  }

  .code-block code {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    word-break: break-all;
  }

  .breakdown {
    padding: var(--spacing-md);
  }

  .breakdown h4 {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-sm);
  }

  @media (max-width: 768px) {
    .breakdown-grid {
      grid-template-columns: 1fr;
    }
  }

  .breakdown-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .breakdown-item strong {
    color: var(--color-primary);
  }

  .status-center {
    display: flex;
    justify-content: center;
    margin-bottom: var(--spacing-md);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .status-item span:first-child {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .status {
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .status.valid {
    color: var(--color-success);
  }

  .status.invalid {
    color: var(--color-error);
  }

  .message {
    display: flex;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
  }

  .message:last-child {
    margin-bottom: 0;
  }

  .message.success {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
    color: var(--color-success);
  }

  .message.warning {
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
    color: var(--color-warning);
  }

  .message.error {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
    color: var(--color-error);
  }

  .message div {
    font-size: var(--font-size-sm);
  }

  .tips-list {
    margin: 0;
    padding-left: var(--spacing-md);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .tips-list li {
    margin-bottom: var(--spacing-sm);
    line-height: 1.5;
  }

  .tips-list li:last-child {
    margin-bottom: 0;
  }

  .examples-card {
    margin-top: var(--spacing-lg);
  }

  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    color: var(--text-primary);
    font-weight: 600;
    padding: var(--spacing-md);
  }

  .examples-summary:hover {
    color: var(--color-primary);
  }

  .chevron {
    margin-left: auto;
    transform: rotate(0deg);
    transition: transform var(--transition-normal);
  }

  details[open] .chevron {
    transform: rotate(180deg);
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-md);
    padding: 0 var(--spacing-md) var(--spacing-md);
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }
  }

  .example-card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-normal);
    text-align: left;
  }

  .example-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .example-card.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);
  }

  .example-name {
    color: var(--color-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .example-description {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .example-config {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .example-config code {
    font-family: var(--font-mono);
    background: var(--bg-primary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
    color: var(--color-primary);
  }
</style>
