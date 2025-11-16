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
  import { tooltip } from '$lib/actions/tooltip';
  import { t } from '$lib/stores/language';

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

  const navOptions = $derived([
    { value: 'build', label: $t('tools/dhcp-options-6-15.nav.build') },
    { value: 'decode', label: $t('tools/dhcp-options-6-15.nav.decode') },
  ]);

  const decodeExamples = [
    {
      label: 'Google DNS (Option 6)',
      hexValue: '08080808 08080404',
      description: '8.8.8.8, 8.8.4.4',
      option: 'option6' as DecodeOption,
    },
    {
      label: 'Cloudflare DNS (Option 6)',
      hexValue: '01010101 01000001',
      description: '1.1.1.1, 1.0.0.1',
      option: 'option6' as DecodeOption,
    },
    {
      label: 'example.com (Option 15)',
      hexValue: '6578616d706c6503636f6d00',
      description: 'example.com domain',
      option: 'option15' as DecodeOption,
    },
    {
      label: 'local.domain (Option 15)',
      hexValue: '056c6f63616c06646f6d61696e00',
      description: 'local.domain',
      option: 'option15' as DecodeOption,
    },
  ];

  function loadExample(example: (typeof DNS_EXAMPLES)[0]) {
    activeTab = 'build';
    dnsServers = [...example.dnsServers];
    domainName = example.domainName;
  }

  function loadDecodeExample(example: (typeof decodeExamples)[0]) {
    activeTab = 'decode';
    decodeOption = example.option;
    hexInput = example.hexValue;
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
  title={$t('tools/dhcp-options-6-15.title')}
  description={$t('tools/dhcp-options-6-15.subtitle')}
  {navOptions}
  bind:selectedNav={activeTab}
>
  {#if activeTab === 'build'}
    <ExamplesCard
      examples={DNS_EXAMPLES}
      onSelect={loadExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
    />

    <div class="card input-card">
      <h3>{$t('tools/dhcp-options-6-15.build.title')}</h3>

      <fieldset class="form-group">
        <legend>{$t('tools/dhcp-options-6-15.build.dnsServers.legend')}</legend>
        {#each dnsServers as _server, i (i)}
          <div class="server-row">
            <input
              type="text"
              bind:value={dnsServers[i]}
              placeholder={$t('tools/dhcp-options-6-15.build.dnsServers.placeholder')}
              class="input"
            />
            {#if dnsServers.length > 1}
              <button class="btn btn-danger btn-sm" onclick={() => removeDNSServer(i)}
                >{$t('tools/dhcp-options-6-15.build.dnsServers.removeButton')}</button
              >
            {/if}
          </div>
        {/each}
        <button class="btn btn-secondary btn-sm" onclick={addDNSServer}
          >{$t('tools/dhcp-options-6-15.build.dnsServers.addButton')}</button
        >
      </fieldset>

      <div class="form-group">
        <label for="domain-name">{$t('tools/dhcp-options-6-15.build.domainName.label')}</label>
        <input
          id="domain-name"
          type="text"
          bind:value={domainName}
          placeholder={$t('tools/dhcp-options-6-15.build.domainName.placeholder')}
          class="input"
        />
        <span class="hint">{$t('tools/dhcp-options-6-15.build.domainName.hint')}</span>
      </div>

      {#if buildErrors.length > 0}
        <div class="error-card">
          <strong>{$t('tools/dhcp-options-6-15.build.validationErrors')}</strong>
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
        <h3>{$t('tools/dhcp-options-6-15.results.title')}</h3>

        {#if buildResult.option6}
          <div class="option-section">
            <h4>{$t('tools/dhcp-options-6-15.results.option6.title')}</h4>
            <div class="result-grid">
              <div class="result-item">
                <span class="label">{$t('tools/dhcp-options-6-15.results.option6.servers')}</span>
                <div class="servers-list">
                  {#each buildResult.option6.servers as srv, i (i)}
                    <span class="server-badge">{srv}</span>
                  {/each}
                </div>
              </div>

              <div class="result-item">
                <span class="label">{$t('tools/dhcp-options-6-15.results.option6.hexEncoded')}</span>
                <code class="code-value">{buildResult.option6.hexEncoded}</code>
                <button
                  class="btn-copy"
                  class:copied={clipboard.isCopied('option6-hex')}
                  onclick={() => clipboard.copy(buildResult!.option6!.hexEncoded, 'option6-hex')}
                  aria-label={$t('tools/dhcp-options-6-15.results.copyHexLabel')}
                >
                  {clipboard.isCopied('option6-hex')
                    ? $t('tools/dhcp-options-6-15.results.copiedButton')
                    : $t('tools/dhcp-options-6-15.results.copyButton')}
                </button>
              </div>

              <div class="result-item">
                <span class="label">{$t('tools/dhcp-options-6-15.results.option6.wireFormat')}</span>
                <code class="code-value">{buildResult.option6.wireFormat}</code>
                <button
                  class="btn-copy"
                  class:copied={clipboard.isCopied('option6-wire')}
                  onclick={() => clipboard.copy(buildResult!.option6!.wireFormat, 'option6-wire')}
                  aria-label={$t('tools/dhcp-options-6-15.results.copyWireLabel')}
                >
                  {clipboard.isCopied('option6-wire')
                    ? $t('tools/dhcp-options-6-15.results.copiedButton')
                    : $t('tools/dhcp-options-6-15.results.copyButton')}
                </button>
              </div>

              <div class="result-item">
                <span class="label">{$t('tools/dhcp-options-6-15.results.option6.totalLength')}</span>
                <span class="value"
                  >{$t('tools/dhcp-options-6-15.results.option6.bytes', {
                    length: buildResult.option6.totalLength,
                  })}</span
                >
              </div>
            </div>
          </div>
        {/if}

        {#if buildResult.option15}
          <div class="option-section">
            <h4>{$t('tools/dhcp-options-6-15.results.option15.title')}</h4>
            <div class="result-grid">
              <div class="result-item">
                <span class="label">{$t('tools/dhcp-options-6-15.results.option15.domain')}</span>
                <span class="value">{buildResult.option15.domain}</span>
              </div>

              <div class="result-item">
                <span class="label">{$t('tools/dhcp-options-6-15.results.option15.hexEncoded')}</span>
                <code class="code-value">{buildResult.option15.hexEncoded}</code>
                <button
                  class="btn-copy"
                  class:copied={clipboard.isCopied('option15-hex')}
                  onclick={() => clipboard.copy(buildResult!.option15!.hexEncoded, 'option15-hex')}
                  aria-label={$t('tools/dhcp-options-6-15.results.copyHexLabel')}
                >
                  {clipboard.isCopied('option15-hex')
                    ? $t('tools/dhcp-options-6-15.results.copiedButton')
                    : $t('tools/dhcp-options-6-15.results.copyButton')}
                </button>
              </div>

              <div class="result-item">
                <span class="label">{$t('tools/dhcp-options-6-15.results.option15.wireFormat')}</span>
                <code class="code-value">{buildResult.option15.wireFormat}</code>
                <button
                  class="btn-copy"
                  class:copied={clipboard.isCopied('option15-wire')}
                  onclick={() => clipboard.copy(buildResult!.option15!.wireFormat, 'option15-wire')}
                  aria-label={$t('tools/dhcp-options-6-15.results.copyWireLabel')}
                >
                  {clipboard.isCopied('option15-wire')
                    ? $t('tools/dhcp-options-6-15.results.copiedButton')
                    : $t('tools/dhcp-options-6-15.results.copyButton')}
                </button>
              </div>

              <div class="result-item">
                <span class="label">{$t('tools/dhcp-options-6-15.results.option15.totalLength')}</span>
                <span class="value"
                  >{$t('tools/dhcp-options-6-15.results.option15.bytes', {
                    length: buildResult.option15.totalLength,
                  })}</span
                >
              </div>
            </div>
          </div>
        {/if}

        <div class="config-section">
          <h4>{$t('tools/dhcp-options-6-15.results.config.title')}</h4>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/dhcp-options-6-15.results.config.iscDhcpd')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('isc')}
                onclick={() => clipboard.copy(buildResult!.configExamples.iscDhcpd, 'isc')}
              >
                {clipboard.isCopied('isc')
                  ? $t('tools/dhcp-options-6-15.results.copiedButton')
                  : $t('tools/dhcp-options-6-15.results.copyButton')}
              </button>
            </div>
            <pre class="code-block"><code>{buildResult.configExamples.iscDhcpd}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/dhcp-options-6-15.results.config.keaDhcp4')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('kea')}
                onclick={() => clipboard.copy(buildResult!.configExamples.keaDhcp4, 'kea')}
              >
                {clipboard.isCopied('kea')
                  ? $t('tools/dhcp-options-6-15.results.copiedButton')
                  : $t('tools/dhcp-options-6-15.results.copyButton')}
              </button>
            </div>
            <pre class="code-block"><code>{buildResult.configExamples.keaDhcp4}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/dhcp-options-6-15.results.config.dnsmasq')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('dnsmasq')}
                onclick={() => clipboard.copy(buildResult!.configExamples.dnsmasq, 'dnsmasq')}
              >
                {clipboard.isCopied('dnsmasq')
                  ? $t('tools/dhcp-options-6-15.results.copiedButton')
                  : $t('tools/dhcp-options-6-15.results.copyButton')}
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
      <h3>{$t('tools/dhcp-options-6-15.decode.title')}</h3>

      <fieldset class="form-group">
        <legend>{$t('tools/dhcp-options-6-15.decode.optionSelect.legend')}</legend>
        <div class="option-select">
          <label
            class="radio-label"
            class:selected={decodeOption === 'option6'}
            use:tooltip={{ text: $t('tools/dhcp-options-6-15.decode.optionSelect.option6Tooltip') }}
          >
            <input type="radio" bind:group={decodeOption} value="option6" />
            <span class="radio-text">{$t('tools/dhcp-options-6-15.decode.optionSelect.option6')}</span>
          </label>
          <label
            class="radio-label"
            class:selected={decodeOption === 'option15'}
            use:tooltip={{ text: $t('tools/dhcp-options-6-15.decode.optionSelect.option15Tooltip') }}
          >
            <input type="radio" bind:group={decodeOption} value="option15" />
            <span class="radio-text">{$t('tools/dhcp-options-6-15.decode.optionSelect.option15')}</span>
          </label>
        </div>
      </fieldset>

      <div class="form-group">
        <label for="hex-input">{$t('tools/dhcp-options-6-15.decode.hexInput.label')}</label>
        <textarea
          id="hex-input"
          bind:value={hexInput}
          placeholder={decodeOption === 'option6'
            ? $t('tools/dhcp-options-6-15.decode.hexInput.placeholderOption6')
            : $t('tools/dhcp-options-6-15.decode.hexInput.placeholderOption15')}
          rows="3"
          class="input"
        ></textarea>
        <span class="hint">{$t('tools/dhcp-options-6-15.decode.hexInput.hint')}</span>
      </div>

      {#if decodeError}
        <div class="error-card">
          <strong>{$t('tools/dhcp-options-6-15.decode.error')}</strong>
          <p>{decodeError}</p>
        </div>
      {/if}
    </div>

    {#if decodeResult}
      <div class="card result-card">
        <h3>
          {$t('tools/dhcp-options-6-15.results.decodedTitle', {
            option: decodeOption === 'option6' ? 'Option 6' : 'Option 15',
          })}
        </h3>

        {#if decodeOption === 'option6'}
          <div class="result-grid">
            <div class="result-item">
              <span class="label">{$t('tools/dhcp-options-6-15.results.option6.servers')}</span>
              <div class="servers-list">
                {#each decodeResult.servers as srv, i (i)}
                  <span class="server-badge">{srv}</span>
                {/each}
              </div>
            </div>

            <div class="result-item">
              <span class="label">{$t('tools/dhcp-options-6-15.results.option6.serverCount')}</span>
              <span class="value">{decodeResult.servers.length}</span>
            </div>

            <div class="result-item">
              <span class="label">{$t('tools/dhcp-options-6-15.results.option6.totalLength')}</span>
              <span class="value"
                >{$t('tools/dhcp-options-6-15.results.option6.bytes', { length: decodeResult.totalLength })}</span
              >
            </div>
          </div>
        {:else}
          <div class="result-grid">
            <div class="result-item">
              <span class="label">{$t('tools/dhcp-options-6-15.results.option15.domainName')}</span>
              <span class="value">{decodeResult.domain}</span>
            </div>

            <div class="result-item">
              <span class="label">{$t('tools/dhcp-options-6-15.results.option15.totalLength')}</span>
              <span class="value"
                >{$t('tools/dhcp-options-6-15.results.option15.bytes', { length: decodeResult.totalLength })}</span
              >
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm);

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-secondary);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--border-secondary);
    }

    &.selected {
      background: var(--bg-secondary);
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 90%);
    }

    input[type='radio'] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .radio-text {
      font-weight: 500;
      color: var(--text-primary);
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
