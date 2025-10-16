<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';

  interface DKIMKey {
    privateKey: string;
    publicKey: string;
    publicKeyForDNS: string;
    selector: string;
    keySize: number;
  }

  let keySize = $state(2048);
  let selector = $state('default');
  let domain = $state('example.com');
  let generatedKey = $state<DKIMKey | null>(null);
  let isGenerating = $state(false);
  let showPrivateKey = $state(false);

  // Button success states
  let buttonStates = $state<Record<string, boolean>>({});

  // Generate RSA key pair using Web Crypto API
  async function generateDKIMKeys(): Promise<void> {
    if (isGenerating) return;

    isGenerating = true;
    try {
      // Generate RSA key pair
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-PSS',
          modulusLength: keySize,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['sign', 'verify'],
      );

      // Export private key
      const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);
      const privateKeyPEM = formatPrivateKey(privateKeyBase64);

      // Export public key
      const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);
      const publicKeyPEM = formatPublicKey(publicKeyBase64);

      // Create DNS-formatted public key (remove headers and whitespace)
      const publicKeyForDNS = publicKeyBase64.replace(/\s/g, '');

      generatedKey = {
        privateKey: privateKeyPEM,
        publicKey: publicKeyPEM,
        publicKeyForDNS,
        selector: selector.trim() || 'default',
        keySize,
      };
    } catch (error) {
      console.error('Failed to generate DKIM keys:', error);
      alert('Failed to generate DKIM keys. Please try again.');
    } finally {
      isGenerating = false;
    }
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function formatPrivateKey(base64: string): string {
    const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
  }

  function formatPublicKey(base64: string): string {
    const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
  }

  const txtRecord = $derived.by(() => {
    if (!generatedKey) return '';
    return `${generatedKey.selector}._domainkey.${domain}. IN TXT "v=DKIM1; k=rsa; p=${generatedKey.publicKeyForDNS}"`;
  });

  const dkimRecord = $derived.by(() => {
    if (!generatedKey) return '';
    return `v=DKIM1; k=rsa; p=${generatedKey.publicKeyForDNS}`;
  });

  function showButtonSuccess(buttonId: string): void {
    buttonStates[buttonId] = true;
    setTimeout(() => {
      buttonStates[buttonId] = false;
    }, 2000);
  }

  function copyToClipboard(text: string, buttonId: string): void {
    navigator.clipboard.writeText(text);
    showButtonSuccess(buttonId);
  }

  function downloadPrivateKey(): void {
    if (!generatedKey) return;

    const blob = new Blob([generatedKey.privateKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedKey.selector}.${domain}.private.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showButtonSuccess('download-private');
  }

  function downloadPublicKey(): void {
    if (!generatedKey) return;

    const blob = new Blob([generatedKey.publicKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedKey.selector}.${domain}.public.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showButtonSuccess('download-public');
  }

  function downloadTXTRecord(): void {
    if (!txtRecord) return;

    const blob = new Blob([txtRecord], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedKey?.selector}.${domain}.dns.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showButtonSuccess('download-txt');
  }

  const examples = [
    {
      name: 'Standard Setup',
      selector: 'default',
      domain: 'example.com',
      keySize: 2048,
    },
    {
      name: 'Monthly Rotation',
      selector: '202412',
      domain: 'mycompany.com',
      keySize: 2048,
    },
    {
      name: 'Service-Specific',
      selector: 'mailgun',
      domain: 'notifications.example.com',
      keySize: 1024,
    },
  ];

  function loadExample(example: (typeof examples)[0]): void {
    selector = example.selector;
    domain = example.domain;
    keySize = example.keySize;
    generatedKey = null;
  }
</script>

<div class="card">
  <div class="card-header">
    <h1>DKIM Key Generator</h1>
    <p class="card-subtitle">Generate DKIM RSA keypairs with selectors and DNS TXT records for email authentication.</p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="config-section">
        <div class="section-header">
          <h3>
            <Icon name="settings" size="sm" />
            Configuration
          </h3>
        </div>

        <div class="config-grid">
          <div class="input-group">
            <label
              for="selector"
              use:tooltip={"Unique identifier for this DKIM key (e.g., 'default', '202412', 'mailgun')"}
            >
              Selector:
            </label>
            <input id="selector" type="text" bind:value={selector} placeholder="default" />
          </div>

          <div class="input-group">
            <label for="domain" use:tooltip={'Domain that will use this DKIM key for signing emails'}> Domain: </label>
            <input id="domain" type="text" bind:value={domain} placeholder="example.com" />
          </div>

          <div class="input-group">
            <label
              for="keySize"
              use:tooltip={'RSA key size in bits. 2048-bit recommended for security, 1024-bit for compatibility'}
            >
              Key Size:
            </label>
            <select id="keySize" bind:value={keySize}>
              <option value={1024}>1024-bit (Legacy)</option>
              <option value={2048}>2048-bit (Recommended)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          class="generate-btn"
          onclick={generateDKIMKeys}
          disabled={isGenerating || !selector.trim() || !domain.trim()}
        >
          <Icon name={isGenerating ? 'loader' : 'key'} size="sm" />
          {isGenerating ? 'Generating...' : 'Generate DKIM Keys'}
        </button>
      </div>

      {#if generatedKey}
        <div class="keys-section">
          <div class="section-header">
            <h3>
              <Icon name="shield" size="sm" />
              Generated Keys
            </h3>
          </div>

          <div class="key-item">
            <div class="key-header">
              <h4>Private Key</h4>
              <div class="key-actions">
                <button
                  type="button"
                  class="toggle-btn"
                  onclick={() => (showPrivateKey = !showPrivateKey)}
                  use:tooltip={showPrivateKey ? 'Hide private key' : 'Show private key'}
                >
                  <Icon name={showPrivateKey ? 'hide' : 'eye'} size="sm" />
                  {showPrivateKey ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  class="download-btn"
                  class:success={buttonStates['download-private']}
                  onclick={downloadPrivateKey}
                  use:tooltip={'Download private key as PEM file'}
                >
                  <Icon name={buttonStates['download-private'] ? 'check' : 'download'} size="sm" />
                  {buttonStates['download-private'] ? 'Downloaded!' : 'Download'}
                </button>
              </div>
            </div>

            {#if showPrivateKey}
              <div class="key-content">
                <div class="code-block">
                  <code>{generatedKey.privateKey}</code>
                </div>
              </div>
            {:else}
              <div class="key-hidden">
                <Icon name="hide" size="sm" />
                Private key hidden for security
              </div>
            {/if}

            <div class="security-warning">
              <Icon name="alert-triangle" size="sm" />
              Keep this private key secure. Never share it publicly or store it in version control.
            </div>
          </div>

          <div class="key-item">
            <div class="key-header">
              <h4>Public Key</h4>
              <div class="key-actions">
                <button
                  type="button"
                  class="copy-btn"
                  class:success={buttonStates['copy-public']}
                  onclick={() => copyToClipboard(generatedKey?.publicKey || '', 'copy-public')}
                  use:tooltip={'Copy public key to clipboard'}
                >
                  <Icon name={buttonStates['copy-public'] ? 'check' : 'copy'} size="sm" />
                  {buttonStates['copy-public'] ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  class="download-btn"
                  class:success={buttonStates['download-public']}
                  onclick={downloadPublicKey}
                  use:tooltip={'Download public key as PEM file'}
                >
                  <Icon name={buttonStates['download-public'] ? 'check' : 'download'} size="sm" />
                  {buttonStates['download-public'] ? 'Downloaded!' : 'Download'}
                </button>
              </div>
            </div>

            <div class="key-content">
              <div class="code-block">
                <code>{generatedKey.publicKey}</code>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    {#if generatedKey}
      <div class="results-section">
        <div class="dns-section">
          <div class="section-header">
            <h3>DNS TXT Record</h3>
            <div class="actions">
              <button
                type="button"
                class="copy-btn"
                class:success={buttonStates['copy-txt']}
                onclick={() => copyToClipboard(txtRecord, 'copy-txt')}
                use:tooltip={'Copy DNS TXT record to clipboard'}
              >
                <Icon name={buttonStates['copy-txt'] ? 'check' : 'copy'} size="sm" />
                {buttonStates['copy-txt'] ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                class="export-btn"
                class:success={buttonStates['download-txt']}
                onclick={downloadTXTRecord}
                use:tooltip={'Download DNS record as text file'}
              >
                <Icon name={buttonStates['download-txt'] ? 'check' : 'download'} size="sm" />
                {buttonStates['download-txt'] ? 'Downloaded!' : 'Export'}
              </button>
            </div>
          </div>

          <div class="record-output">
            <h4>Zone File Format:</h4>
            <div class="code-block">
              <code>{txtRecord}</code>
            </div>
          </div>

          <div class="record-output">
            <h4>DKIM Record Value:</h4>
            <div class="code-block">
              <code>{dkimRecord}</code>
            </div>
          </div>
        </div>

        <div class="validation-section">
          <div class="section-header">
            <h3>
              <Icon name="info" size="sm" />
              Implementation Notes
            </h3>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <strong>Selector:</strong>
              {generatedKey.selector}
            </div>
            <div class="info-item">
              <strong>Domain:</strong>
              {domain}
            </div>
            <div class="info-item">
              <strong>Key Size:</strong>
              {generatedKey.keySize}-bit RSA
            </div>
            <div class="info-item">
              <strong>Algorithm:</strong> RSA-SHA256 (rsa-sha256)
            </div>
          </div>

          <div class="implementation-steps">
            <h4>Next Steps:</h4>
            <ol>
              <li>Add the DNS TXT record to your domain's DNS configuration</li>
              <li>Configure your mail server with the private key</li>
              <li>Set up DKIM signing for outgoing emails</li>
              <li>Test DKIM signatures using online validation tools</li>
            </ol>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="examples-section">
    <details class="examples-toggle">
      <summary>
        <Icon name="lightbulb" size="sm" />
        Example Configurations
      </summary>
      <div class="examples-grid">
        {#each examples as example, exIdx (`${example.name}-${exIdx}`)}
          <button type="button" class="example-card" onclick={() => loadExample(example)}>
            <div class="example-header">
              <strong>{example.name}</strong>
            </div>
            <div class="example-details">
              <div>Selector: <code>{example.selector}</code></div>
              <div>Domain: <code>{example.domain}</code></div>
              <div>Key Size: <code>{example.keySize}-bit</code></div>
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>
</div>

<style lang="scss">
  .config-section {
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

  .config-grid {
    display: grid;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);

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
    select {
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
  }

  .generate-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: all 0.2s ease;
    align-self: flex-start;

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
    }

    &:disabled {
      background: var(--color-surface-disabled);
      color: var(--color-text-disabled);
      cursor: not-allowed;
      transform: none;
    }
  }

  .keys-section {
    margin-bottom: var(--spacing-lg);
  }

  .key-item {
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .key-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
    border-radius: var(--radius-md) var(--radius-md) 0 0;

    h4 {
      margin: 0;
      color: var(--color-text);
    }

    .key-actions {
      display: flex;
      gap: var(--spacing-xs);
    }
  }

  .key-content {
    padding: var(--spacing-md);
  }

  .key-hidden {
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .security-warning {
    padding: var(--spacing-sm) var(--spacing-md);
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--color-warning) 20%, transparent);
    color: var(--color-warning);
    font-size: var(--font-size-sm);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
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
      white-space: pre-wrap;
    }
  }

  .record-output {
    margin-bottom: var(--spacing-md);

    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .info-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);

    strong {
      color: var(--color-primary);
    }
  }

  .implementation-steps {
    h4 {
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--color-text);
    }

    ol {
      margin: 0;
      padding-left: var(--spacing-md);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);

      li {
        margin-bottom: var(--spacing-xs);

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .toggle-btn,
  .copy-btn,
  .download-btn,
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
  }

  .toggle-btn {
    background: var(--color-secondary);
    color: var(--bg-secondary);

    &:hover {
      background: var(--color-secondary-hover);
    }
  }

  .copy-btn {
    background: var(--color-primary);
    color: var(--bg-secondary);

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  .download-btn {
    background: var(--color-success);
    color: var(--bg-secondary);

    &:hover {
      background: var(--color-success-hover);
    }
  }

  .export-btn {
    background: var(--color-success);
    color: var(--bg-secondary);

    &:hover {
      background: var(--color-success-hover);
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
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

    .example-header strong {
      color: var(--color-primary);
      font-size: var(--font-size-sm);
    }

    .example-details {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);

      code {
        font-family: var(--font-mono);
        background: var(--bg-tertiary);
        padding: 2px var(--spacing-xs);
        border-radius: var(--radius-xs);
        color: var(--color-primary);
      }
    }
  }
</style>
