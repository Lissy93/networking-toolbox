<script lang="ts">
  import {
    type GatewayConfig,
    type GatewayResult,
    buildGatewayOption,
    decodeGatewayOption,
    validateGatewayConfig,
    GATEWAY_EXAMPLES,
  } from '$lib/utils/dhcp-option3-gateway';
  import { untrack } from 'svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables/useClipboard.svelte';

  const clipboard = useClipboard();

  type Tab = 'build' | 'decode';
  let activeTab = $state<Tab>('build');

  // Build mode state
  let gateways = $state<string[]>(['']);
  let subnet = $state<string>('');
  let buildResult = $state<GatewayResult | null>(null);
  let buildErrors = $state<string[]>([]);

  // Decode mode state
  let hexInput = $state<string>('');
  let decodeResult = $state<GatewayResult | null>(null);
  let decodeError = $state<string>('');

  const navOptions = [
    { value: 'build', label: 'Build Option' },
    { value: 'decode', label: 'Decode Option' },
  ];

  function loadExample(example: (typeof GATEWAY_EXAMPLES)[0]) {
    activeTab = 'build';
    gateways = [...example.gateways];
    subnet = example.subnet || '';
  }

  function addGateway() {
    gateways = [...gateways, ''];
  }

  function removeGateway(index: number) {
    gateways = gateways.filter((_, i) => i !== index);
    if (gateways.length === 0) {
      gateways = [''];
    }
  }

  // Build mode effect
  $effect(() => {
    if (activeTab !== 'build') return;

    const currentGateways = gateways;
    const currentSubnet = subnet;

    untrack(() => {
      const hasInput = currentGateways.some((g) => g.trim());
      if (!hasInput) {
        buildResult = null;
        buildErrors = [];
        return;
      }

      const config: GatewayConfig = {
        gateways: currentGateways,
        subnet: currentSubnet || undefined,
      };

      buildErrors = validateGatewayConfig(config);

      if (buildErrors.length === 0) {
        try {
          buildResult = buildGatewayOption(config);
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

    untrack(() => {
      if (!currentHex.trim()) {
        decodeResult = null;
        decodeError = '';
        return;
      }

      try {
        decodeResult = decodeGatewayOption(currentHex);
        decodeError = '';
      } catch (err) {
        decodeError = err instanceof Error ? err.message : 'Unknown error';
        decodeResult = null;
      }
    });
  });
</script>

<ToolContentContainer
  title="DHCP Option 3 - Router/Default Gateway"
  description="Build and decode default gateway configuration. Multiple gateways can be specified for redundancy or load balancing, listed in order of preference."
  {navOptions}
  bind:selectedNav={activeTab}
>
  <ExamplesCard
    examples={GATEWAY_EXAMPLES}
    onSelect={loadExample}
    getLabel={(ex) => ex.label}
    getDescription={(ex) => ex.description}
  />

  {#if activeTab === 'build'}
    <div class="card input-card">
      <h3>Gateway Configuration</h3>

      <div class="form-group">
        <label for="subnet">Subnet (Optional - for validation)</label>
        <input id="subnet" type="text" bind:value={subnet} placeholder="e.g., 192.168.1.0/24" class="input" />
        <span class="hint">If provided, gateways will be validated against this subnet</span>
      </div>

      <div class="form-group">
        <label for="gateway-0">Gateway Addresses (in order of preference)</label>
        {#each gateways as _gateway, i (i)}
          <div class="gateway-row">
            <input
              id={i === 0 ? 'gateway-0' : undefined}
              type="text"
              bind:value={gateways[i]}
              placeholder="e.g., 192.168.1.1"
              class="input"
              aria-label={i > 0 ? `Gateway ${i + 1}` : undefined}
            />
            {#if gateways.length > 1}
              <button class="btn btn-danger btn-sm" onclick={() => removeGateway(i)}>Remove</button>
            {/if}
          </div>
        {/each}
        <button class="btn btn-secondary btn-sm" onclick={addGateway}>Add Gateway</button>
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
        <h3>Option 3 - Router</h3>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">Gateways:</span>
            <div class="gateway-list">
              {#each buildResult.gateways as gw, i (i)}
                <span class="gateway-badge">
                  {i + 1}. {gw}
                </span>
              {/each}
            </div>
          </div>

          <div class="result-item">
            <span class="label">Hex Encoded:</span>
            <code class="code-value">{buildResult.hexEncoded}</code>
            <button class="btn-copy" onclick={() => clipboard.copy(buildResult!.hexEncoded)} aria-label="Copy hex">
              Copy
            </button>
          </div>

          <div class="result-item">
            <span class="label">Wire Format:</span>
            <code class="code-value">{buildResult.wireFormat}</code>
            <button
              class="btn-copy"
              onclick={() => clipboard.copy(buildResult!.wireFormat)}
              aria-label="Copy wire format"
            >
              Copy
            </button>
          </div>

          <div class="result-item">
            <span class="label">Total Length:</span>
            <span class="value">{buildResult.totalLength} bytes</span>
          </div>
        </div>

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
      <h3>Decode Option 3</h3>

      <div class="form-group">
        <label for="hex-input">Hex String</label>
        <textarea
          id="hex-input"
          bind:value={hexInput}
          placeholder="e.g., c0a80101 or c0 a8 01 01"
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
        <h3>Decoded Option 3</h3>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">Gateways:</span>
            <div class="gateway-list">
              {#each decodeResult.gateways as gw, i (i)}
                <span class="gateway-badge">
                  {i + 1}. {gw}
                </span>
              {/each}
            </div>
          </div>

          <div class="result-item">
            <span class="label">Total Length:</span>
            <span class="value">{decodeResult.totalLength} bytes</span>
          </div>

          <div class="result-item">
            <span class="label">Gateway Count:</span>
            <span class="value">{decodeResult.gateways.length}</span>
          </div>
        </div>

        <div class="config-section">
          <h4>Configuration Examples</h4>

          <div class="config-example">
            <h5>ISC DHCPd</h5>
            <pre><code>{decodeResult.configExamples.iscDhcpd}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(decodeResult!.configExamples.iscDhcpd)}>
              Copy
            </button>
          </div>

          <div class="config-example">
            <h5>Kea DHCPv4</h5>
            <pre><code>{decodeResult.configExamples.keaDhcp4}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(decodeResult!.configExamples.keaDhcp4)}>
              Copy
            </button>
          </div>

          <div class="config-example">
            <h5>dnsmasq</h5>
            <pre><code>{decodeResult.configExamples.dnsmasq}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(decodeResult!.configExamples.dnsmasq)}>
              Copy
            </button>
          </div>
        </div>
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
      margin: var(--spacing-lg) 0 var(--spacing-md) 0;
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

  .gateway-row {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    align-items: center;

    .input {
      flex: 1;
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

  .gateway-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .gateway-badge {
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
