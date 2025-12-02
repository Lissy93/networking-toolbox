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
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  const clipboard = useClipboard();

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools.gateway-option3');
  });

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

  const navOptions = $derived([
    { value: 'build', label: $t('tools/gateway-option3.nav.build') },
    { value: 'decode', label: $t('tools/gateway-option3.nav.decode') },
  ]);

  const decodeExamples = $derived([
    {
      label: $t('tools/gateway-option3.examples.decode.singleGateway.label'),
      hexValue: 'c0a80101',
      description: $t('tools/gateway-option3.examples.decode.singleGateway.description'),
    },
    {
      label: $t('tools/gateway-option3.examples.decode.dualGateways.label'),
      hexValue: 'c0a80101c0a80102',
      description: $t('tools/gateway-option3.examples.decode.dualGateways.description'),
    },
    {
      label: $t('tools/gateway-option3.examples.decode.googleDNS.label'),
      hexValue: '08080808',
      description: $t('tools/gateway-option3.examples.decode.googleDNS.description'),
    },
    {
      label: $t('tools/gateway-option3.examples.decode.commonRouter.label'),
      hexValue: 'c0a8000a',
      description: $t('tools/gateway-option3.examples.decode.commonRouter.description'),
    },
  ]);

  function loadExample(example: (typeof GATEWAY_EXAMPLES)[0]) {
    activeTab = 'build';
    gateways = [...example.gateways];
    subnet = example.subnet || '';
  }

  function loadDecodeExample(example: (typeof decodeExamples)[0]) {
    activeTab = 'decode';
    hexInput = example.hexValue;
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
  title={$t('tools/gateway-option3.title')}
  description={$t('tools/gateway-option3.subtitle')}
  {navOptions}
  bind:selectedNav={activeTab}
>
  {#if activeTab === 'build'}
    <ExamplesCard
      examples={GATEWAY_EXAMPLES}
      onSelect={loadExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
    />

    <div class="card input-card">
      <h3>{$t('tools/gateway-option3.build.title')}</h3>

      <div class="form-group">
        <label for="subnet">{$t('tools/gateway-option3.build.subnet.label')}</label>
        <input
          id="subnet"
          type="text"
          bind:value={subnet}
          placeholder={$t('tools/gateway-option3.build.subnet.placeholder')}
          class="input"
        />
        <span class="hint">{$t('tools/gateway-option3.build.subnet.hint')}</span>
      </div>

      <div class="form-group">
        <label for="gateway-0">{$t('tools/gateway-option3.build.gateways.label')}</label>
        {#each gateways as _gateway, i (i)}
          <div class="gateway-row">
            <input
              id={i === 0 ? 'gateway-0' : undefined}
              type="text"
              bind:value={gateways[i]}
              placeholder={$t('tools/gateway-option3.build.gateways.placeholder')}
              class="input"
              aria-label={i > 0 ? `Gateway ${i + 1}` : undefined}
            />
            {#if gateways.length > 1}
              <button class="btn btn-danger btn-sm" onclick={() => removeGateway(i)}
                >{$t('tools/gateway-option3.build.gateways.removeButton')}</button
              >
            {/if}
          </div>
        {/each}
        <button class="btn btn-secondary btn-sm" onclick={addGateway}
          >{$t('tools/gateway-option3.build.gateways.addButton')}</button
        >
      </div>

      {#if buildErrors.length > 0}
        <div class="error-card">
          <strong>{$t('tools/gateway-option3.build.errors.title')}</strong>
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
        <h3>{$t('tools/gateway-option3.results.buildTitle')}</h3>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">{$t('tools/gateway-option3.results.gateways')}</span>
            <div class="gateway-list">
              {#each buildResult.gateways as gw, i (i)}
                <span class="gateway-badge">
                  {i + 1}. {gw}
                </span>
              {/each}
            </div>
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/gateway-option3.results.hexEncoded')}</span>
            <code class="code-value">{buildResult.hexEncoded}</code>
            <button
              class="btn-copy"
              class:copied={clipboard.isCopied('hex')}
              onclick={() => clipboard.copy(buildResult!.hexEncoded, 'hex')}
              aria-label="Copy hex"
            >
              {clipboard.isCopied('hex')
                ? $t('tools/gateway-option3.buttons.copied')
                : $t('tools/gateway-option3.buttons.copy')}
            </button>
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/gateway-option3.results.wireFormat')}</span>
            <code class="code-value">{buildResult.wireFormat}</code>
            <button
              class="btn-copy"
              class:copied={clipboard.isCopied('wire')}
              onclick={() => clipboard.copy(buildResult!.wireFormat, 'wire')}
              aria-label="Copy wire format"
            >
              {clipboard.isCopied('wire')
                ? $t('tools/gateway-option3.buttons.copied')
                : $t('tools/gateway-option3.buttons.copy')}
            </button>
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/gateway-option3.results.totalLength')}</span>
            <span class="value"
              >{$t('tools/gateway-option3.results.lengthBytes', { length: buildResult.totalLength })}</span
            >
          </div>
        </div>

        <div class="config-section">
          <h4>{$t('tools/gateway-option3.results.configExamples')}</h4>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/gateway-option3.results.iscDhcpd')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('isc')}
                onclick={() => clipboard.copy(buildResult!.configExamples.iscDhcpd, 'isc')}
              >
                {clipboard.isCopied('isc')
                  ? $t('tools/gateway-option3.buttons.copied')
                  : $t('tools/gateway-option3.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{buildResult.configExamples.iscDhcpd}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/gateway-option3.results.keaDhcp4')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('kea')}
                onclick={() => clipboard.copy(buildResult!.configExamples.keaDhcp4, 'kea')}
              >
                {clipboard.isCopied('kea')
                  ? $t('tools/gateway-option3.buttons.copied')
                  : $t('tools/gateway-option3.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{buildResult.configExamples.keaDhcp4}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/gateway-option3.results.dnsmasq')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('dnsmasq')}
                onclick={() => clipboard.copy(buildResult!.configExamples.dnsmasq, 'dnsmasq')}
              >
                {clipboard.isCopied('dnsmasq')
                  ? $t('tools/gateway-option3.buttons.copied')
                  : $t('tools/gateway-option3.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{buildResult.configExamples.dnsmasq}</code></pre>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <ExamplesCard
      examples={decodeExamples}
      onSelect={loadDecodeExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
    />

    <div class="card input-card">
      <h3>{$t('tools/gateway-option3.decode.title')}</h3>

      <div class="form-group">
        <label for="hex-input">{$t('tools/gateway-option3.decode.hexInput.label')}</label>
        <textarea
          id="hex-input"
          bind:value={hexInput}
          placeholder={$t('tools/gateway-option3.decode.hexInput.placeholder')}
          rows="3"
          class="input"
        ></textarea>
        <span class="hint">{$t('tools/gateway-option3.decode.hexInput.hint')}</span>
      </div>

      {#if decodeError}
        <div class="error-card">
          <strong>{$t('tools/gateway-option3.decode.error.title')}</strong>
          <p>{decodeError}</p>
        </div>
      {/if}
    </div>

    {#if decodeResult}
      <div class="card result-card">
        <h3>{$t('tools/gateway-option3.results.decodeTitle')}</h3>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">{$t('tools/gateway-option3.results.gateways')}</span>
            <div class="gateway-list">
              {#each decodeResult.gateways as gw, i (i)}
                <span class="gateway-badge">
                  {i + 1}. {gw}
                </span>
              {/each}
            </div>
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/gateway-option3.results.totalLength')}</span>
            <span class="value"
              >{$t('tools/gateway-option3.results.lengthBytes', { length: decodeResult.totalLength })}</span
            >
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/gateway-option3.results.gatewayCount')}</span>
            <span class="value">{decodeResult.gateways.length}</span>
          </div>
        </div>

        <div class="config-section">
          <h4>{$t('tools/gateway-option3.results.configExamples')}</h4>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/gateway-option3.results.iscDhcpd')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('decode-isc')}
                onclick={() => clipboard.copy(decodeResult!.configExamples.iscDhcpd, 'decode-isc')}
              >
                {clipboard.isCopied('decode-isc')
                  ? $t('tools/gateway-option3.buttons.copied')
                  : $t('tools/gateway-option3.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{decodeResult.configExamples.iscDhcpd}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/gateway-option3.results.keaDhcp4')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('decode-kea')}
                onclick={() => clipboard.copy(decodeResult!.configExamples.keaDhcp4, 'decode-kea')}
              >
                {clipboard.isCopied('decode-kea')
                  ? $t('tools/gateway-option3.buttons.copied')
                  : $t('tools/gateway-option3.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{decodeResult.configExamples.keaDhcp4}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/gateway-option3.results.dnsmasq')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('decode-dnsmasq')}
                onclick={() => clipboard.copy(decodeResult!.configExamples.dnsmasq, 'decode-dnsmasq')}
              >
                {clipboard.isCopied('decode-dnsmasq')
                  ? $t('tools/gateway-option3.buttons.copied')
                  : $t('tools/gateway-option3.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{decodeResult.configExamples.dnsmasq}</code></pre>
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
    color: var(--bg-primary);
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
      color: var(--bg-primary);
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
    background: var(--bg-tertiary);

    h3 {
      color: var(--text-primary);
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
    background: var(--bg-secondary);
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
      background: var(--bg-primary);
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
    color: var(--bg-primary);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .config-section {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-primary);
  }

  .output-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h5 {
      margin: 0;
    }
  }

  .code-block {
    margin: 0;
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    overflow-x: auto;
    white-space: pre;
    word-break: normal;

    code {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      background: var(--bg-primary);
    }
  }

  .btn-copy {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &.copied {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      border-color: var(--color-success);
      color: var(--color-success);
    }
  }
</style>
