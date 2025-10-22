<script lang="ts">
  import {
    type DNSConfig,
    type DNSResult,
    buildDNSOptions,
    decodeDNSServersOption,
    decodeDomainNameOption,
    validateDNSConfig,
    DNS_EXAMPLES,
  } from '$lib/utils/dhcp-options6-15-dns';
  import { untrack } from 'svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables/useClipboard.svelte';

  const clipboard = useClipboard();

  type Tab = 'build' | 'decode';
  let activeTab = $state<Tab>('build');

  // Build mode state
  let dnsServers = $state<string[]>(['']);
  let domainName = $state<string>('');
  let buildResult = $state<DNSResult | null>(null);
  let buildErrors = $state<string[]>([]);

  // Decode mode state
  type DecodeOption = 'option6' | 'option15';
  let decodeOption = $state<DecodeOption>('option6');
  let hexInput = $state<string>('');
  let decodeResult = $state<any>(null);
  let decodeError = $state<string>('');

  const navOptions = [
    { value: 'build', label: 'Build Options' },
    { value: 'decode', label: 'Decode Options' },
  ];

  function loadExample(example: (typeof DNS_EXAMPLES)[0]) {
    activeTab = 'build';
    dnsServers = [...example.dnsServers];
    domainName = example.domainName;
  }

  function addDNSServer() {
    dnsServers = [...dnsServers, ''];
  }

  function removeDNSServer(index: number) {
    dnsServers = dnsServers.filter((_, i) => i !== index);
    if (dnsServers.length === 0) {
      dnsServers = [''];
    }
  }

  // Build mode effect
  $effect(() => {
    if (activeTab !== 'build') return;

    const currentServers = dnsServers;
    const currentDomain = domainName;

    untrack(() => {
      const hasInput = currentServers.some((s) => s.trim()) || currentDomain.trim();
      if (!hasInput) {
        buildResult = null;
        buildErrors = [];
        return;
      }

      const config: DNSConfig = {
        dnsServers: currentServers,
        domainName: currentDomain || undefined,
      };

      buildErrors = validateDNSConfig(config);

      if (buildErrors.length === 0) {
        try {
          buildResult = buildDNSOptions(config);
        } catch (err) {
          buildErrors = [err instanceof Error ? err.message : 'Unknown error'];
          buildResult = null;
        }
      } else {
        buildResult = null;
      }
    });
  });

  // Decode mode effect
  $effect(() => {
    if (activeTab !== 'decode') return;

    const currentHex = hexInput;
    const currentOption = decodeOption;

    untrack(() => {
      if (!currentHex.trim()) {
        decodeResult = null;
        decodeError = '';
        return;
      }

      try {
        if (currentOption === 'option6') {
          decodeResult = decodeDNSServersOption(currentHex);
        } else {
          decodeResult = decodeDomainNameOption(currentHex);
        }
        decodeError = '';
      } catch (err) {
        decodeError = err instanceof Error ? err.message : 'Unknown error';
        decodeResult = null;
      }
    });
  });
</script>

<ToolContentContainer
  title="DHCP Options 6 & 15 - DNS Servers and Domain"
  description="Option 6 specifies DNS servers for name resolution, while Option 15 provides the domain name for client hostname resolution. These options work together for complete DNS configuration."
  {navOptions}
  bind:selectedNav={activeTab}
>
  <ExamplesCard
    examples={DNS_EXAMPLES}
    onSelect={loadExample}
    getLabel={(ex) => ex.label}
    getDescription={(ex) => ex.description}
  />

  {#if activeTab === 'build'}
    <div class="card input-card">
      <h3>DNS Configuration</h3>

      <fieldset class="form-group">
        <legend>DNS Servers (Option 6)</legend>
        {#each dnsServers as _server, i (i)}
          <div class="server-row">
            <input type="text" bind:value={dnsServers[i]} placeholder="e.g., 8.8.8.8" class="input" />
            {#if dnsServers.length > 1}
              <button class="btn btn-danger btn-sm" onclick={() => removeDNSServer(i)}>Remove</button>
            {/if}
          </div>
        {/each}
        <button class="btn btn-secondary btn-sm" onclick={addDNSServer}>Add DNS Server</button>
      </fieldset>

      <div class="form-group">
        <label for="domain-name">Domain Name (Option 15)</label>
        <input id="domain-name" type="text" bind:value={domainName} placeholder="e.g., example.com" class="input" />
        <span class="hint">Domain name for client hostname resolution</span>
      </div>

      {#if buildErrors.length > 0}
        <div class="error-card">
          <strong>Validation Errors:</strong>
          <ul>
            {#each buildErrors as error, i (i)}
              <li>{error}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    {#if buildResult}
      <div class="card result-card">
        <h3>DHCP DNS Options</h3>

        {#if buildResult.option6}
          <div class="option-section">
            <h4>Option 6 - DNS Servers</h4>
            <div class="result-grid">
              <div class="result-item">
                <span class="label">DNS Servers:</span>
                <div class="servers-list">
                  {#each buildResult.option6.servers as srv, i (i)}
                    <span class="server-badge">{srv}</span>
                  {/each}
                </div>
              </div>

              <div class="result-item">
                <span class="label">Hex Encoded:</span>
                <code class="code-value">{buildResult.option6.hexEncoded}</code>
                <button
                  class="btn-copy"
                  onclick={() => clipboard.copy(buildResult!.option6!.hexEncoded)}
                  aria-label="Copy hex"
                >
                  Copy
                </button>
              </div>

              <div class="result-item">
                <span class="label">Wire Format:</span>
                <code class="code-value">{buildResult.option6.wireFormat}</code>
                <button
                  class="btn-copy"
                  onclick={() => clipboard.copy(buildResult!.option6!.wireFormat)}
                  aria-label="Copy wire format"
                >
                  Copy
                </button>
              </div>

              <div class="result-item">
                <span class="label">Total Length:</span>
                <span class="value">{buildResult.option6.totalLength} bytes</span>
              </div>
            </div>
          </div>
        {/if}

        {#if buildResult.option15}
          <div class="option-section">
            <h4>Option 15 - Domain Name</h4>
            <div class="result-grid">
              <div class="result-item">
                <span class="label">Domain:</span>
                <span class="value">{buildResult.option15.domain}</span>
              </div>

              <div class="result-item">
                <span class="label">Hex Encoded:</span>
                <code class="code-value">{buildResult.option15.hexEncoded}</code>
                <button
                  class="btn-copy"
                  onclick={() => clipboard.copy(buildResult!.option15!.hexEncoded)}
                  aria-label="Copy hex"
                >
                  Copy
                </button>
              </div>

              <div class="result-item">
                <span class="label">Wire Format:</span>
                <code class="code-value">{buildResult.option15.wireFormat}</code>
                <button
                  class="btn-copy"
                  onclick={() => clipboard.copy(buildResult!.option15!.wireFormat)}
                  aria-label="Copy wire format"
                >
                  Copy
                </button>
              </div>

              <div class="result-item">
                <span class="label">Total Length:</span>
                <span class="value">{buildResult.option15.totalLength} bytes</span>
              </div>
            </div>
          </div>
        {/if}

        <div class="config-section">
          <h4>Configuration Examples</h4>

          <div class="config-example">
            <h5>ISC DHCPd</h5>
            <pre><code>{buildResult.configExamples.iscDhcpd}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(buildResult!.configExamples.iscDhcpd)}>
              Copy
            </button>
          </div>

          <div class="config-example">
            <h5>Kea DHCPv4</h5>
            <pre><code>{buildResult.configExamples.keaDhcp4}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(buildResult!.configExamples.keaDhcp4)}>
              Copy
            </button>
          </div>

          <div class="config-example">
            <h5>dnsmasq</h5>
            <pre><code>{buildResult.configExamples.dnsmasq}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(buildResult!.configExamples.dnsmasq)}> Copy </button>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <div class="card input-card">
      <h3>Decode DNS Options</h3>

      <fieldset class="form-group">
        <legend>Option to Decode</legend>
        <div class="option-select">
          <label class="radio-label">
            <input type="radio" bind:group={decodeOption} value="option6" />
            Option 6 - DNS Servers
          </label>
          <label class="radio-label">
            <input type="radio" bind:group={decodeOption} value="option15" />
            Option 15 - Domain Name
          </label>
        </div>
      </fieldset>

      <div class="form-group">
        <label for="hex-input">Hex String</label>
        <textarea
          id="hex-input"
          bind:value={hexInput}
          placeholder={decodeOption === 'option6'
            ? 'e.g., 08080808 or 08 08 08 08 08 08 04 04'
            : 'e.g., 6578616d706c6503636f6d'}
          rows="3"
          class="input"
        ></textarea>
        <span class="hint">Enter hex bytes (spaces optional)</span>
      </div>

      {#if decodeError}
        <div class="error-card">
          <strong>Decode Error:</strong>
          <p>{decodeError}</p>
        </div>
      {/if}
    </div>

    {#if decodeResult}
      <div class="card result-card">
        <h3>Decoded {decodeOption === 'option6' ? 'Option 6' : 'Option 15'}</h3>

        {#if decodeOption === 'option6'}
          <div class="result-grid">
            <div class="result-item">
              <span class="label">DNS Servers:</span>
              <div class="servers-list">
                {#each decodeResult.servers as srv, i (i)}
                  <span class="server-badge">{srv}</span>
                {/each}
              </div>
            </div>

            <div class="result-item">
              <span class="label">Server Count:</span>
              <span class="value">{decodeResult.servers.length}</span>
            </div>

            <div class="result-item">
              <span class="label">Total Length:</span>
              <span class="value">{decodeResult.totalLength} bytes</span>
            </div>
          </div>
        {:else}
          <div class="result-grid">
            <div class="result-item">
              <span class="label">Domain Name:</span>
              <span class="value">{decodeResult.domain}</span>
            </div>

            <div class="result-item">
              <span class="label">Total Length:</span>
              <span class="value">{decodeResult.totalLength} bytes</span>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</ToolContentContainer>

<style lang="scss">
  .card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    margin-bottom: var(--spacing-md);

    &.input-card {
      background: var(--bg-tertiary);
    }

    h3 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
      font-size: var(--font-size-lg);
    }

    h4 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }

    h5 {
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
  }

  .form-group {
    margin-bottom: var(--spacing-md);

    label {
      display: block;
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
      font-weight: 500;
    }

    .hint {
      display: block;
      margin-top: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
    }
  }

  fieldset.form-group {
    border: none;
    padding: 0;

    legend {
      display: block;
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  .input {
    width: 100%;
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .server-row {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    align-items: center;

    .input {
      flex: 1;
    }
  }

  .option-select {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--bg-secondary);
    }

    input[type='radio'] {
      cursor: pointer;
    }
  }

  .btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }

    &.btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-primary);
    }

    &.btn-danger {
      background: var(--color-error);
    }

    &.btn-sm {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
    }
  }

  .error-card {
    background: color-mix(in srgb, var(--color-error), transparent 90%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-top: var(--spacing-md);

    strong {
      color: var(--color-error);
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      color: var(--text-primary);
    }

    p {
      margin: 0;
      color: var(--text-primary);
    }
  }

  .result-card {
    h3 {
      color: var(--color-success);
    }
  }

  .option-section {
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--border-primary);

    &:last-of-type {
      border-bottom: none;
      padding-bottom: 0;
      margin-bottom: 0;
    }
  }

  .result-grid {
    display: grid;
    gap: var(--spacing-md);
  }

  .result-item {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);

    .label {
      font-weight: 500;
      color: var(--text-secondary);
      min-width: 120px;
    }

    .value,
    .code-value {
      flex: 1;
      font-family: var(--font-mono);
      color: var(--text-primary);
      word-break: break-all;
    }
  }

  .servers-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .server-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-primary);
    color: var(--text-inverse);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .config-section {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-primary);
  }

  .config-example {
    position: relative;
    margin-bottom: var(--spacing-md);

    pre {
      margin: 0;
      padding: var(--spacing-md);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      overflow-x: auto;

      code {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        color: var(--text-primary);
      }
    }
  }

  .btn-copy {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--bg-secondary);
    }
  }
</style>
