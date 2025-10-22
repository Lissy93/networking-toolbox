<script lang="ts">
  import {
    type ClientIDConfig,
    type ClientIDResult,
    type DecodeClientIDConfig,
    validateClientIDConfig,
    buildClientID,
    decodeClientID,
    CLIENTID_BUILD_EXAMPLES,
    CLIENTID_DECODE_EXAMPLES,
    HARDWARE_TYPES,
  } from '$lib/utils/dhcp-clientid-option61';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';

  let activeTab = $state<'build' | 'decode'>('build');

  const navOptions = [
    { value: 'build' as const, label: 'Build', icon: 'settings' },
    { value: 'decode' as const, label: 'Decode', icon: 'code' },
  ];

  let mode = $state<'hardware' | 'opaque'>('hardware');
  let hardwareType = $state<number>(HARDWARE_TYPES.ETHERNET);
  let macAddress = $state('');
  let opaqueData = $state('');
  let opaqueFormat = $state<'hex' | 'text'>('text');
  let decodeHex = $state('');

  let validationErrors = $state<string[]>([]);
  let buildResult = $state<ClientIDResult | null>(null);
  let decodeResult = $state<ClientIDResult | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  const buildExamples = CLIENTID_BUILD_EXAMPLES.map((ex) => ({
    label: ex.name,
    config: ex,
    description: ex.description,
  }));

  const decodeExamples = CLIENTID_DECODE_EXAMPLES.map((ex) => ({
    label: ex.name,
    hexData: ex.hexData,
    description: ex.description,
  }));

  function loadBuildExample(example: (typeof buildExamples)[0], index: number): void {
    const cfg = example.config;
    mode = cfg.mode;
    hardwareType = cfg.hardwareType ?? HARDWARE_TYPES.ETHERNET;
    macAddress = cfg.macAddress || '';
    opaqueData = cfg.opaqueData || '';
    opaqueFormat = cfg.opaqueFormat || 'text';
    selectedExampleIndex = index;
  }

  function loadDecodeExample(example: (typeof decodeExamples)[0], index: number): void {
    decodeHex = example.hexData;
    selectedExampleIndex = index;
  }

  function checkIfExampleStillMatches(): void {
    if (selectedExampleIndex === null) return;

    if (activeTab === 'build') {
      const example = buildExamples[selectedExampleIndex];
      if (!example) {
        selectedExampleIndex = null;
        return;
      }
      const cfg = example.config;
      const matches =
        mode === cfg.mode &&
        hardwareType === (cfg.hardwareType ?? HARDWARE_TYPES.ETHERNET) &&
        macAddress === (cfg.macAddress || '') &&
        opaqueData === (cfg.opaqueData || '') &&
        opaqueFormat === (cfg.opaqueFormat || 'text');
      if (!matches) selectedExampleIndex = null;
    } else {
      const example = decodeExamples[selectedExampleIndex];
      if (!example || decodeHex !== example.hexData) {
        selectedExampleIndex = null;
      }
    }
  }

  $effect(() => {
    const currentTab = activeTab;
    selectedExampleIndex = null; // Reset selection on tab change

    if (currentTab === 'build') {
      const currentMode = mode;
      const currentHWType = hardwareType;
      const currentMAC = macAddress;
      const currentOpaque = opaqueData;
      const currentFormat = opaqueFormat;

      untrack(() => {
        const config: ClientIDConfig = {
          mode: currentMode,
          hardwareType: currentHWType,
          macAddress: currentMAC,
          opaqueData: currentOpaque,
          opaqueFormat: currentFormat,
        };

        const isInitialState =
          (currentMode === 'hardware' && !currentMAC.trim()) || (currentMode === 'opaque' && !currentOpaque.trim());

        if (isInitialState) {
          validationErrors = [];
          buildResult = null;
        } else {
          validationErrors = validateClientIDConfig(config);

          if (validationErrors.length === 0) {
            try {
              buildResult = buildClientID(config);
            } catch (e) {
              validationErrors = [e instanceof Error ? e.message : String(e)];
              buildResult = null;
            }
          } else {
            buildResult = null;
          }
        }

        checkIfExampleStillMatches();
      });
    } else {
      const currentDecodeHex = decodeHex;

      untrack(() => {
        if (!currentDecodeHex.trim()) {
          validationErrors = [];
          decodeResult = null;
        } else {
          try {
            const config: DecodeClientIDConfig = {
              hexData: currentDecodeHex,
            };
            decodeResult = decodeClientID(config);
            validationErrors = [];
          } catch (e) {
            validationErrors = [e instanceof Error ? e.message : String(e)];
            decodeResult = null;
          }
        }

        selectedExampleIndex = null;
      });
    }
  });
</script>

<ToolContentContainer
  title="DHCPv4 Client Identifier (Option 61)"
  description="Build and decode DHCPv4 Client Identifier (Option 61) with hardware type + MAC address or arbitrary opaque data per RFC 2132."
  {navOptions}
  bind:selectedNav={activeTab}
>
  {#if activeTab === 'build'}
    <ExamplesCard
      examples={buildExamples}
      onSelect={loadBuildExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
      selectedIndex={selectedExampleIndex}
    />
  {:else}
    <ExamplesCard
      examples={decodeExamples}
      onSelect={loadDecodeExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
      selectedIndex={selectedExampleIndex}
    />
  {/if}

  {#if activeTab === 'build'}
    <div class="card input-card">
      <div class="card-header">
        <h3>Build Client Identifier</h3>
        <p class="help-text">Configure DHCPv4 Client Identifier for device identification</p>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="mode">
            <Icon name="settings" size="sm" />
            Mode
          </label>
          <select id="mode" bind:value={mode}>
            <option value="hardware">Hardware Type + MAC Address</option>
            <option value="opaque">Opaque Data (Text or Hex)</option>
          </select>
        </div>

        {#if mode === 'hardware'}
          <div class="input-group">
            <label for="hardware-type">
              <Icon name="cpu" size="sm" />
              Hardware Type
            </label>
            <select id="hardware-type" bind:value={hardwareType}>
              <option value={HARDWARE_TYPES.ETHERNET}>Ethernet (1)</option>
              <option value={HARDWARE_TYPES.EXPERIMENTAL_ETHERNET}>Experimental Ethernet (2)</option>
              <option value={HARDWARE_TYPES.IEEE_802}>IEEE 802 (6)</option>
              <option value={HARDWARE_TYPES.ARCNET}>ARCNET (7)</option>
              <option value={HARDWARE_TYPES.FRAME_RELAY}>Frame Relay (15)</option>
              <option value={HARDWARE_TYPES.ATM}>ATM (16)</option>
              <option value={HARDWARE_TYPES.HDLC}>HDLC (17)</option>
              <option value={HARDWARE_TYPES.FIBRE_CHANNEL}>Fibre Channel (18)</option>
              <option value={HARDWARE_TYPES.IEEE_1394}>IEEE 1394 (24)</option>
              <option value={HARDWARE_TYPES.INFINIBAND}>InfiniBand (32)</option>
            </select>
          </div>

          <div class="input-group">
            <label for="mac-address">
              <Icon name="hash" size="sm" />
              MAC Address
            </label>
            <input id="mac-address" type="text" bind:value={macAddress} placeholder="00:0c:29:4f:a3:d2" />
            <small>Hardware address in any common format</small>
          </div>
        {/if}

        {#if mode === 'opaque'}
          <div class="input-group">
            <label for="opaque-format">
              <Icon name="code" size="sm" />
              Data Format
            </label>
            <select id="opaque-format" bind:value={opaqueFormat}>
              <option value="text">Text (ASCII)</option>
              <option value="hex">Hexadecimal</option>
            </select>
          </div>

          <div class="input-group">
            <label for="opaque-data">
              <Icon name="edit" size="sm" />
              {opaqueFormat === 'hex' ? 'Hex Data' : 'Text Data'}
            </label>
            <input
              id="opaque-data"
              type="text"
              bind:value={opaqueData}
              placeholder={opaqueFormat === 'hex' ? '0123456789abcdef' : 'client-device-001'}
            />
            <small>{opaqueFormat === 'hex' ? 'Hexadecimal string (even length)' : 'Plain text identifier'}</small>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="card input-card">
      <div class="card-header">
        <h3>Decode Client Identifier</h3>
        <p class="help-text">Decode hex-encoded Client Identifier back to fields</p>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="decode-hex">
            <Icon name="code" size="sm" />
            Hex Data
          </label>
          <input id="decode-hex" type="text" bind:value={decodeHex} placeholder="01000c294fa3d2" />
          <small>Paste hex-encoded Client Identifier to decode</small>
        </div>
      </div>
    </div>
  {/if}

  {#if validationErrors.length > 0}
    <div class="card errors-card">
      <h3>Validation Errors</h3>
      {#each validationErrors as error, i (i)}
        <div class="error-message">
          <Icon name="alert-triangle" size="sm" />
          {error}
        </div>
      {/each}
    </div>
  {/if}

  {#if activeTab === 'build' && buildResult && validationErrors.length === 0}
    <div class="card results">
      <h3>Generated Client Identifier</h3>

      <div class="summary-card">
        <div><strong>Mode:</strong> {buildResult.mode === 'hardware' ? 'Hardware Type + MAC' : 'Opaque Data'}</div>
        <div><strong>Length:</strong> {buildResult.length} bytes</div>
      </div>

      {#each [{ title: 'Hexadecimal', content: buildResult.hex, key: 'hex' }, { title: 'Wire Format (Spaced)', content: buildResult.wireFormat, key: 'wire' }] as output (output.key)}
        <div class="output-group">
          <div class="output-header">
            <h4>{output.title}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied(output.key)}
              onclick={() => clipboard.copy(output.content, output.key)}
            >
              <Icon name={clipboard.isCopied(output.key) ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied(output.key) ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{output.content}</pre>
        </div>
      {/each}

      {#if buildResult.breakdown && buildResult.breakdown.length > 0}
        <div class="breakdown-section">
          <h4>Breakdown</h4>
          {#each buildResult.breakdown as item, i (i)}
            <div class="breakdown-item">
              <div class="breakdown-label">{item.field}</div>
              <div class="breakdown-value">
                <code>{item.hex}</code>
                {#if item.description}
                  <small>{item.description}</small>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#each [{ title: 'ISC DHCPd Configuration', content: buildResult.configExamples?.iscDhcpd, key: 'isc' }, { title: 'Kea DHCPv4 Configuration', content: buildResult.configExamples?.keaDhcp4, key: 'kea' }] as config (config.key)}
      {#if config.content}
        <div class="card results">
          <div class="card-header-with-action">
            <h3>{config.title}</h3>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied(config.key)}
              onclick={() => clipboard.copy(config.content!, config.key)}
            >
              <Icon name={clipboard.isCopied(config.key) ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied(config.key) ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{config.content}</pre>
        </div>
      {/if}
    {/each}
  {/if}

  {#if activeTab === 'decode' && decodeResult && validationErrors.length === 0}
    <div class="card results">
      <h3>Decoded Client Identifier</h3>

      <div class="summary-card">
        <div>
          <strong>Detected Mode:</strong>
          {decodeResult.mode === 'hardware' ? 'Hardware Type + MAC' : 'Opaque Data'}
        </div>
        <div><strong>Length:</strong> {decodeResult.length} bytes</div>
      </div>

      {#if decodeResult.decoded}
        <div class="decoded-fields">
          {#if decodeResult.decoded.hardwareType !== undefined}
            <div class="decoded-field">
              <div class="field-label">Hardware Type</div>
              <div class="field-value">
                {decodeResult.decoded.hardwareType} ({decodeResult.decoded.hardwareTypeName || 'Unknown'})
              </div>
            </div>
          {/if}

          {#if decodeResult.decoded.macAddress}
            <div class="decoded-field">
              <div class="field-label">MAC Address</div>
              <div class="field-value">
                <code>{decodeResult.decoded.macAddress}</code>
                <button
                  type="button"
                  class="copy-btn-small"
                  onclick={() => clipboard.copy(decodeResult!.decoded!.macAddress!, 'mac')}
                >
                  <Icon name={clipboard.isCopied('mac') ? 'check' : 'copy'} size="xs" />
                </button>
              </div>
            </div>
          {/if}

          {#if decodeResult.decoded.opaqueData}
            <div class="decoded-field">
              <div class="field-label">Opaque Data</div>
              <div class="field-value">
                <code>{decodeResult.decoded.opaqueData}</code>
                <button
                  type="button"
                  class="copy-btn-small"
                  onclick={() => clipboard.copy(decodeResult!.decoded!.opaqueData!, 'opaque')}
                >
                  <Icon name={clipboard.isCopied('opaque') ? 'check' : 'copy'} size="xs" />
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      {#if decodeResult.breakdown && decodeResult.breakdown.length > 0}
        <div class="breakdown-section">
          <h4>Breakdown</h4>
          {#each decodeResult.breakdown as item, i (i)}
            <div class="breakdown-item">
              <div class="breakdown-label">{item.field}</div>
              <div class="breakdown-value">
                <code>{item.hex}</code>
                {#if item.description}
                  <small>{item.description}</small>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</ToolContentContainer>

<style lang="scss">
  .card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    margin-bottom: var(--spacing-lg);

    &.input-card {
      background: var(--bg-tertiary);

      .card-header {
        margin-bottom: var(--spacing-md);
      }
    }

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin: 0 0 var(--spacing-sm);
      font-size: 1.25rem;
      color: var(--text-primary);
    }

    h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .card-header {
    .help-text {
      margin: var(--spacing-xs) 0 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-style: italic;
    }
  }

  .card-header-with-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);

    h3 {
      margin: 0;
    }
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    input,
    select {
      padding: var(--spacing-sm);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.9375rem;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 90%);
      }
    }

    small {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }
  }

  .errors-card {
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border-color: var(--color-error);

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      color: var(--color-error);
      font-size: 0.9375rem;
    }
  }

  .results {
    background: var(--bg-tertiary);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .summary-card {
    display: flex;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    font-size: 0.9375rem;

    div strong {
      color: var(--text-primary);
    }

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-xs);
    }
  }

  .output-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-lg);

    &:last-child {
      margin-bottom: 0;
    }

    .output-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;

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

  .copy-btn-small {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .output-value {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-primary);
    overflow-x: auto;
  }

  .code-block {
    white-space: pre;
    word-break: normal;
  }

  .breakdown-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    h4 {
      margin-bottom: var(--spacing-sm);
    }

    .breakdown-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      background: var(--bg-secondary);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;

      .breakdown-label {
        font-weight: 500;
        color: var(--text-secondary);
      }

      .breakdown-value {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);

        code {
          font-family: var(--font-mono);
          color: var(--color-primary);
          word-break: break-all;
        }

        small {
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
      }
    }

    @media (max-width: 768px) {
      .breakdown-item {
        grid-template-columns: 1fr;
      }
    }
  }

  .decoded-fields {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);

    .decoded-field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);

      .field-label {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .field-value {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-size: 1rem;
        color: var(--text-primary);

        code {
          font-family: var(--font-mono);
          color: var(--color-primary);
          font-size: 0.9375rem;
        }
      }
    }
  }
</style>
