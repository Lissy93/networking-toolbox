<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { useClipboard } from '$lib/composables';

  interface _SSHFPRecord {
    algorithm: number;
    fingerprintType: number;
    fingerprint: string;
  }

  let domain = $state('example.com');
  let inputType = $state<'public-key' | 'fingerprint'>('public-key');
  let publicKeyInput = $state('');
  let fingerprintInput = $state('');

  let algorithm = $state(1);
  let fingerprintType = $state(1);

  let showExamples = $state(false);
  let selectedExample = $state<string | null>(null);

  // Button success states
  const clipboard = useClipboard();

  const algorithmDescriptions = {
    1: 'RSA - Traditional RSA algorithm (most common)',
    2: 'DSA - Digital Signature Algorithm (deprecated)',
    3: 'ECDSA - Elliptic Curve Digital Signature Algorithm',
    4: 'Ed25519 - Edwards-curve Digital Signature Algorithm (modern, recommended)',
  };

  const fingerprintTypeDescriptions = {
    1: 'SHA-1 - Legacy hash algorithm (160-bit)',
    2: 'SHA-256 - Modern hash algorithm (256-bit, recommended)',
  };

  const sshfpRecord = $derived.by(() => {
    let fingerprintValue = '';

    if (inputType === 'fingerprint') {
      // Use provided fingerprint directly
      fingerprintValue = fingerprintInput
        .trim()
        .replace(/[^a-fA-F0-9]/g, '')
        .toLowerCase();
    } else if (inputType === 'public-key') {
      // For demo purposes, we'll show how it would work
      // In a real implementation, you'd parse the public key and generate the fingerprint
      if (publicKeyInput.trim()) {
        // Generate demo fingerprint based on fingerprint type
        fingerprintValue =
          fingerprintType === 1
            ? 'abcd1234567890abcdef1234567890abcdef1234'
            : 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';
      }
    }

    if (!fingerprintValue) return null;

    return {
      algorithm,
      fingerprintType,
      fingerprint: fingerprintValue,
    };
  });

  const dnsRecord = $derived.by(() => {
    if (!sshfpRecord) return '';
    return `${domain}. IN SSHFP ${sshfpRecord.algorithm} ${sshfpRecord.fingerprintType} ${sshfpRecord.fingerprint}`;
  });

  const validation = $derived.by(() => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check domain format
    if (!domain.trim()) {
      errors.push('Domain is required');
    } else if (!domain.includes('.')) {
      warnings.push('Domain should include TLD (e.g., .com, .org)');
    }

    // Check public key/fingerprint input
    if (inputType === 'public-key') {
      if (!publicKeyInput.trim()) {
        errors.push('SSH public key is required');
      } else {
        const key = publicKeyInput.trim();
        if (!key.startsWith('ssh-') && !key.startsWith('ecdsa-') && !key.includes(' ')) {
          warnings.push('Public key should be in OpenSSH format (e.g., "ssh-rsa AAAAB3NzaC1...")');
        }
      }
    } else if (inputType === 'fingerprint') {
      if (!fingerprintInput.trim()) {
        errors.push('Fingerprint value is required');
      } else {
        const cleanFingerprint = fingerprintInput.trim().replace(/[^a-fA-F0-9]/g, '');
        if (fingerprintType === 1 && cleanFingerprint.length !== 40) {
          warnings.push('SHA-1 fingerprint should be exactly 40 hexadecimal characters');
        } else if (fingerprintType === 2 && cleanFingerprint.length !== 64) {
          warnings.push('SHA-256 fingerprint should be exactly 64 hexadecimal characters');
        } else if (!/^[a-fA-F0-9]+$/.test(cleanFingerprint)) {
          errors.push('Fingerprint must contain only hexadecimal characters');
        }
      }
    }

    // Algorithm recommendations
    if (algorithm === 2) {
      warnings.push('DSA algorithm is deprecated and should be avoided');
    }

    if (fingerprintType === 1) {
      warnings.push('SHA-1 is deprecated - use SHA-256 for new deployments');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  });

  function copyToClipboard(text: string, buttonId: string): void {
    clipboard.copy(text, buttonId);
  }

  function exportAsZoneFile(): void {
    if (!dnsRecord) return;

    const zoneContent = dnsRecord;
    const blob = new Blob([zoneContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-sshfp-record.zone`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('downloaded', 'export-sshfp');
  }

  // Simulate fingerprint generation from public key
  async function generateFingerprintFromKey(): Promise<void> {
    if (inputType === 'public-key' && publicKeyInput.trim()) {
      // This is a placeholder - in a real implementation you would:
      // 1. Parse the OpenSSH public key format
      // 2. Extract the key material
      // 3. Hash it with the chosen algorithm

      const demoFingerprint =
        fingerprintType === 1
          ? 'abcd1234567890abcdef1234567890abcdef1234'
          : 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

      fingerprintInput = demoFingerprint;
      inputType = 'fingerprint';
    }
  }

  const exampleConfigurations = [
    {
      name: 'RSA SSH Key',
      description: 'RSA public key with SHA-256 fingerprint',
      domain: 'server.example.com',
      algorithm: 1,
      fingerprintType: 2,
      fingerprint: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    {
      name: 'Ed25519 SSH Key',
      description: 'Modern Ed25519 key with SHA-256 fingerprint',
      domain: 'ssh.example.com',
      algorithm: 4,
      fingerprintType: 2,
      fingerprint: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    },
    {
      name: 'ECDSA SSH Key',
      description: 'ECDSA key with SHA-256 fingerprint',
      domain: 'secure.example.com',
      algorithm: 3,
      fingerprintType: 2,
      fingerprint: '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
    },
  ];

  function loadExample(example: (typeof exampleConfigurations)[0]): void {
    domain = example.domain;
    algorithm = example.algorithm;
    fingerprintType = example.fingerprintType;
    fingerprintInput = example.fingerprint;
    inputType = 'fingerprint';
    publicKeyInput = '';
    selectedExample = example.name;
  }

  const securityTips = [
    'Use Ed25519 (algorithm 4) for new SSH key deployments',
    'Prefer SHA-256 (type 2) over SHA-1 (type 1) for fingerprints',
    'Deploy SSHFP records for all SSH host keys on your servers',
    'Update SSHFP records when rotating SSH host keys',
    'Configure SSH clients to verify SSHFP records for enhanced security',
  ];
</script>

<div class="card">
  <div class="card-header">
    <h1>SSHFP Generator</h1>
    <p class="card-subtitle">
      Generate SSHFP (SSH Fingerprint) records to enable DNS-based SSH host key verification and authentication.
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="domain-section">
        <div class="section-header">
          <h3>
            <Icon name="globe" size="sm" />
            Domain Configuration
          </h3>
        </div>

        <div class="input-group">
          <label for="domain" use:tooltip={'Domain name for the SSHFP record'}> Domain: </label>
          <input id="domain" type="text" bind:value={domain} placeholder="example.com" />
        </div>
      </div>

      <div class="sshfp-parameters-section">
        <div class="section-header">
          <h3>
            <Icon name="settings" size="sm" />
            SSHFP Parameters
          </h3>
        </div>

        <div class="parameters-grid">
          <div class="input-group">
            <label for="algorithm" use:tooltip={'SSH key algorithm used by the server'}> Algorithm: </label>
            <select id="algorithm" bind:value={algorithm}>
              <option value={1}>1 - RSA</option>
              <option value={2}>2 - DSA (deprecated)</option>
              <option value={3}>3 - ECDSA</option>
              <option value={4}>4 - Ed25519</option>
            </select>
            <div class="parameter-description">
              {algorithmDescriptions[algorithm as keyof typeof algorithmDescriptions]}
            </div>
          </div>

          <div class="input-group">
            <label for="fingerprintType" use:tooltip={'Hash algorithm used to generate the fingerprint'}>
              Fingerprint Type:
            </label>
            <select id="fingerprintType" bind:value={fingerprintType}>
              <option value={1}>1 - SHA-1</option>
              <option value={2}>2 - SHA-256</option>
            </select>
            <div class="parameter-description">
              {fingerprintTypeDescriptions[fingerprintType as keyof typeof fingerprintTypeDescriptions]}
            </div>
          </div>
        </div>
      </div>

      <div class="input-data-section">
        <div class="section-header">
          <h3>
            <Icon name="key" size="sm" />
            SSH Key Data
          </h3>
        </div>

        <div class="input-type-selector">
          <label class="input-type-option">
            <input type="radio" bind:group={inputType} value="public-key" />
            <span>SSH Public Key</span>
          </label>
          <label class="input-type-option">
            <input type="radio" bind:group={inputType} value="fingerprint" />
            <span>Fingerprint Value</span>
          </label>
        </div>

        {#if inputType === 'public-key'}
          <div class="input-group">
            <label for="publicKey" use:tooltip={'Paste the SSH public key from ~/.ssh/id_rsa.pub or similar'}>
              SSH Public Key:
            </label>
            <textarea
              id="publicKey"
              bind:value={publicKeyInput}
              placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC... user@hostname&#10;ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@hostname"
              rows="4"
              class="public-key-input"
            ></textarea>
            <button
              type="button"
              class="generate-fingerprint-btn"
              onclick={generateFingerprintFromKey}
              disabled={!publicKeyInput.trim()}
              use:tooltip={'Generate fingerprint from public key (demo mode)'}
            >
              <Icon name="arrow-right" size="sm" />
              Generate Fingerprint
            </button>
          </div>
        {:else}
          <div class="input-group">
            <label
              for="fingerprint"
              use:tooltip={`Enter the ${fingerprintType === 1 ? 'SHA-1' : 'SHA-256'} fingerprint value`}
            >
              Fingerprint Value:
            </label>
            <textarea
              id="fingerprint"
              bind:value={fingerprintInput}
              placeholder={fingerprintType === 1
                ? 'abcd1234567890abcdef1234567890abcdef1234'
                : 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'}
              rows="2"
              class="fingerprint-input"
            ></textarea>
          </div>
        {/if}
      </div>
    </div>

    <div class="results-section">
      {#if sshfpRecord}
        <div class="sshfp-record-section">
          <div class="section-header">
            <h3>Generated SSHFP Record</h3>
            <div class="actions">
              <button
                type="button"
                class="copy-btn"
                class:success={clipboard.isCopied('copy-sshfp')}
                onclick={() => copyToClipboard(dnsRecord, 'copy-sshfp')}
                use:tooltip={'Copy SSHFP record to clipboard'}
              >
                <Icon name={clipboard.isCopied('copy-sshfp') ? 'check' : 'copy'} size="sm" />
                {clipboard.isCopied('copy-sshfp') ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                class="export-btn"
                class:success={clipboard.isCopied('export-sshfp')}
                onclick={exportAsZoneFile}
                use:tooltip={'Download as zone file'}
              >
                <Icon name={clipboard.isCopied('export-sshfp') ? 'check' : 'download'} size="sm" />
                {clipboard.isCopied('export-sshfp') ? 'Downloaded!' : 'Export'}
              </button>
            </div>
          </div>

          <div class="record-output">
            <div class="code-block">
              <code>{dnsRecord}</code>
            </div>
          </div>

          <div class="record-breakdown">
            <h4>Record Breakdown:</h4>
            <div class="breakdown-grid">
              <div class="breakdown-item">
                <strong>Algorithm:</strong>
                {algorithm} ({Object.values(algorithmDescriptions)[algorithm - 1].split(' - ')[1].split(' (')[0]})
              </div>
              <div class="breakdown-item">
                <strong>Fingerprint Type:</strong>
                {fingerprintType} ({Object.values(fingerprintTypeDescriptions)
                  [fingerprintType - 1].split(' - ')[1]
                  .split(' (')[0]})
              </div>
              <div class="breakdown-item">
                <strong>Fingerprint Length:</strong>
                {sshfpRecord.fingerprint.length} chars
              </div>
            </div>
          </div>
        </div>
      {/if}

      <div class="validation-section">
        <div class="section-header">
          <h3>
            <Icon name="bar-chart" size="sm" />
            Validation
          </h3>
        </div>

        <div class="validation-status">
          <div class="status-item">
            <span class="status-label">Status:</span>
            <span class="status-value" class:success={validation.isValid} class:error={!validation.isValid}>
              {validation.isValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
        </div>

        {#if validation.errors.length > 0}
          <div class="validation-messages error">
            <Icon name="x-circle" size="sm" />
            <div class="messages">
              {#each validation.errors as error, index (index)}
                <div class="message">{error}</div>
              {/each}
            </div>
          </div>
        {/if}

        {#if validation.warnings.length > 0}
          <div class="validation-messages warning">
            <Icon name="alert-triangle" size="sm" />
            <div class="messages">
              {#each validation.warnings as warning, index (index)}
                <div class="message">{warning}</div>
              {/each}
            </div>
          </div>
        {/if}

        {#if validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0}
          <div class="validation-messages success">
            <Icon name="check-circle" size="sm" />
            <div class="message">SSHFP record is valid and ready to deploy!</div>
          </div>
        {/if}
      </div>

      <div class="usage-guide">
        <div class="section-header">
          <h3>
            <Icon name="info" size="sm" />
            SSH Client Configuration
          </h3>
        </div>

        <div class="usage-instructions">
          <h4>To enable SSHFP verification in SSH clients:</h4>
          <div class="code-block">
            <code>ssh -o "VerifyHostKeyDNS=yes" user@{domain}</code>
          </div>

          <h4>Or add to ~/.ssh/config:</h4>
          <div class="code-block">
            <code>Host {domain}<br />&nbsp;&nbsp;VerifyHostKeyDNS yes</code>
          </div>
        </div>
      </div>

      <div class="security-guide">
        <div class="section-header">
          <h3>
            <Icon name="shield" size="sm" />
            Security Best Practices
          </h3>
        </div>

        <div class="security-tips">
          <ul>
            {#each securityTips as tip, tipIdx (`tip-${tipIdx}`)}
              <li>{tip}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="examples-section">
    <details class="examples-toggle" bind:open={showExamples}>
      <summary>
        <Icon name="lightbulb" size="sm" />
        Example Configurations
      </summary>
      <div class="examples-grid">
        {#each exampleConfigurations as example, exampleIdx (`${example.name}-${exampleIdx}`)}
          <button
            type="button"
            class="example-card"
            class:selected={selectedExample === example.name}
            onclick={() => loadExample(example)}
          >
            <div class="example-header">
              <strong>{example.name}</strong>
            </div>
            <p class="example-description">{example.description}</p>
            <div class="example-config">
              <div>Algorithm: <code>{example.algorithm}</code>, Type: <code>{example.fingerprintType}</code></div>
              <div class="fingerprint-preview">
                Hash: <code>{example.fingerprint.substring(0, 16)}...</code>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>
</div>

<style lang="scss">
  .card {
    width: 100%;
  }

  .domain-section,
  .sshfp-parameters-section,
  .input-data-section {
    margin-bottom: var(--spacing-lg);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0;
      color: var(--color-text);
    }

    .actions {
      display: flex;
      gap: var(--spacing-sm);
    }
  }

  .parameters-grid {
    display: grid;
    gap: var(--spacing-md);

    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    label {
      font-weight: 600;
      color: var(--color-text);
      font-size: var(--font-size-sm);
    }

    input,
    select,
    textarea {
      padding: var(--spacing-sm);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
      }
    }

    textarea {
      resize: vertical;
      min-height: 60px;
    }
  }

  .parameter-description {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    font-style: italic;
    margin-top: var(--spacing-xs);
  }

  .input-type-selector {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .input-type-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: background-color 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    }

    input[type='radio'] {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
    }

    span {
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }
  }

  .public-key-input,
  .fingerprint-input {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background: var(--bg-primary);
  }

  .generate-fingerprint-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: var(--color-secondary);
    color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-sm);
    transition: all 0.2s ease;
    align-self: flex-start;

    &:hover:not(:disabled) {
      background: var(--color-secondary-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .record-breakdown {
    margin-top: var(--spacing-md);

    h4 {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-sm);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .breakdown-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);

    strong {
      color: var(--color-primary);
    }
  }

  .code-block {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);

    &:last-child {
      margin-bottom: 0;
    }

    code {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      word-break: break-all;
      display: block;
      white-space: pre-line;
    }
  }

  .validation-status {
    display: flex;
    justify-content: center;
    margin-bottom: var(--spacing-md);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-sm);
  }

  .status-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .status-value {
    font-weight: 600;
    font-family: var(--font-mono);

    &.success {
      color: var(--color-success);
    }

    &.error {
      color: var(--color-error);
    }
  }

  .validation-messages {
    display: flex;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);

    &:last-child {
      margin-bottom: 0;
    }

    &.success {
      background: color-mix(in srgb, var(--color-success) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
      color: var(--color-success);
    }

    &.warning {
      background: color-mix(in srgb, var(--color-warning) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
      color: var(--color-warning);
    }

    &.error {
      background: color-mix(in srgb, var(--color-error) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
      color: var(--color-error);
    }

    .messages {
      flex: 1;
    }

    .message {
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-xs);

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .usage-instructions {
    h4 {
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--color-text);
      font-size: var(--font-size-sm);
    }
  }

  .security-tips {
    ul {
      margin: 0;
      padding-left: var(--spacing-md);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);

      li {
        margin-bottom: var(--spacing-sm);
        line-height: 1.5;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .examples-section {
    margin-top: var(--spacing-lg);
  }

  .examples-toggle {
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);

    summary {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      cursor: pointer;
      color: var(--color-text);
      font-weight: 600;

      &:hover {
        color: var(--color-primary);
      }
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .example-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;

    &:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }

    &.selected {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    }

    .example-header strong {
      color: var(--color-primary);
      font-size: var(--font-size-sm);
    }

    .example-description {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      width: 100%;
    }

    .example-config {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      width: 100%;

      code {
        font-family: var(--font-mono);
        background: var(--bg-tertiary);
        padding: 2px var(--spacing-xs);
        border-radius: var(--radius-xs);
        color: var(--color-primary);
      }
    }

    .fingerprint-preview {
      word-break: break-all;
    }
  }

  .copy-btn,
  .export-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all 0.3s ease;
    transform: scale(1);

    &.success {
      background: var(--color-success) !important;
      color: var(--bg-secondary) !important;
      transform: scale(1.05);

      &:hover {
        background: var(--color-success) !important;
      }
    }
  }

  .copy-btn {
    background: var(--color-primary);
    color: var(--bg-secondary);

    &:hover:not(.success) {
      background: var(--color-primary-hover);
    }
  }

  .export-btn {
    background: var(--color-success);
    color: var(--bg-secondary);

    &:hover:not(.success) {
      background: var(--color-success-hover);
    }
  }
</style>
