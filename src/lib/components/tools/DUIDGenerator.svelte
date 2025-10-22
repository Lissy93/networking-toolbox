<script lang="ts">
  import {
    type DUIDConfig,
    type DUIDResult,
    type DUIDType,
    validateDUIDConfig,
    buildDUID,
    DUID_EXAMPLES,
    HARDWARE_TYPES,
    calculateDUIDTimestamp,
  } from '$lib/utils/dhcp-duid-generator';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import { tooltip } from '$lib/actions/tooltip';

  let duidType = $state<DUIDType>('DUID-LLT');
  let macAddress = $state('');
  let hardwareType = $state<number>(HARDWARE_TYPES.ETHERNET);
  let timestamp = $state<number | undefined>(undefined);
  let enterpriseNumber = $state<number | undefined>(undefined);
  let enterpriseIdentifier = $state('');
  let uuid = $state('');

  let validationErrors = $state<string[]>([]);
  let result = $state<DUIDResult | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  interface DUIDExample {
    label: string;
    config: DUIDConfig;
    description: string;
  }

  const examples: DUIDExample[] = DUID_EXAMPLES.map((ex) => ({
    label: ex.name,
    config: ex,
    description: `${ex.type} configuration example`,
  }));

  function loadExample(example: DUIDExample, index: number): void {
    const cfg = example.config;
    duidType = cfg.type;
    macAddress = cfg.macAddress || '';
    hardwareType = cfg.hardwareType ?? HARDWARE_TYPES.ETHERNET;
    timestamp = cfg.timestamp;
    enterpriseNumber = cfg.enterpriseNumber;
    enterpriseIdentifier = cfg.enterpriseIdentifier || '';
    uuid = cfg.uuid || '';
    selectedExampleIndex = index;
  }

  function checkIfExampleStillMatches(): void {
    if (selectedExampleIndex === null) return;

    const example = examples[selectedExampleIndex];
    if (!example) {
      selectedExampleIndex = null;
      return;
    }

    const cfg = example.config;
    const matches =
      duidType === cfg.type &&
      macAddress === (cfg.macAddress || '') &&
      hardwareType === (cfg.hardwareType ?? HARDWARE_TYPES.ETHERNET) &&
      timestamp === cfg.timestamp &&
      enterpriseNumber === cfg.enterpriseNumber &&
      enterpriseIdentifier === (cfg.enterpriseIdentifier || '') &&
      uuid === (cfg.uuid || '');

    if (!matches) {
      selectedExampleIndex = null;
    }
  }

  function useCurrentTimestamp() {
    timestamp = calculateDUIDTimestamp();
  }

  function clearTimestamp() {
    timestamp = undefined;
  }

  $effect(() => {
    // Read config properties to trigger effect when they change
    const currentType = duidType;
    const currentMAC = macAddress;
    const currentHWType = hardwareType;
    const currentTimestamp = timestamp;
    const currentEnterpriseNumber = enterpriseNumber;
    const currentEnterpriseIdentifier = enterpriseIdentifier;
    const currentUUID = uuid;

    untrack(() => {
      const config: DUIDConfig = {
        type: currentType,
        macAddress: currentMAC,
        hardwareType: currentHWType,
        timestamp: currentTimestamp,
        enterpriseNumber: currentEnterpriseNumber,
        enterpriseIdentifier: currentEnterpriseIdentifier,
        uuid: currentUUID,
      };

      // Check if form is in initial empty state
      const isInitialState =
        (currentType === 'DUID-LLT' && !currentMAC.trim()) ||
        (currentType === 'DUID-LL' && !currentMAC.trim()) ||
        (currentType === 'DUID-EN' && !currentEnterpriseNumber && !currentEnterpriseIdentifier.trim()) ||
        (currentType === 'DUID-UUID' && !currentUUID.trim());

      if (isInitialState) {
        validationErrors = [];
        result = null;
      } else {
        validationErrors = validateDUIDConfig(config);

        if (validationErrors.length === 0) {
          try {
            result = buildDUID(config);
          } catch (e) {
            validationErrors = [e instanceof Error ? e.message : String(e)];
            result = null;
          }
        } else {
          result = null;
        }
      }

      checkIfExampleStillMatches();
    });
  });
</script>

<ToolContentContainer
  title="DUID Generator"
  description="Generate DHCP Unique Identifier (DUID) for DHCPv6 clients per RFC 8415. Supports DUID-LLT, DUID-EN, DUID-LL, and DUID-UUID types with configuration export."
>
  <ExamplesCard
    {examples}
    onSelect={loadExample}
    getLabel={(ex) => ex.label}
    getDescription={(ex) => ex.description}
    selectedIndex={selectedExampleIndex}
  />

  <div class="card input-card">
    <div class="card-header">
      <h3>DUID Configuration</h3>
      <p class="help-text">Configure DHCP Unique Identifier for DHCPv6 client identification</p>
    </div>
    <div class="card-content">
      <div class="input-group">
        <label for="duid-type">
          <Icon name="settings" size="sm" />
          DUID Type
        </label>
        <select id="duid-type" bind:value={duidType}>
          <option value="DUID-LLT">DUID-LLT (Type 1) - Link-layer address + time</option>
          <option value="DUID-EN">DUID-EN (Type 2) - Enterprise number</option>
          <option value="DUID-LL">DUID-LL (Type 3) - Link-layer address</option>
          <option value="DUID-UUID">DUID-UUID (Type 4) - UUID</option>
        </select>
      </div>

      {#if duidType === 'DUID-LLT' || duidType === 'DUID-LL'}
        <div class="input-group">
          <label for="mac-address">
            <Icon name="hash" size="sm" />
            MAC Address
          </label>
          <input id="mac-address" type="text" bind:value={macAddress} placeholder="00:1A:2B:3C:4D:5E or 001A2B3C4D5E" />
          <small>Enter MAC address in any common format</small>
        </div>

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
      {/if}

      {#if duidType === 'DUID-LLT'}
        <div class="input-group">
          <label for="timestamp">
            <Icon name="clock" size="sm" />
            Timestamp (seconds since Jan 1, 2000 UTC)
          </label>
          <div class="timestamp-controls">
            <input id="timestamp" type="number" bind:value={timestamp} placeholder="Leave empty for current time" />
            <button type="button" class="btn-icon" onclick={useCurrentTimestamp} use:tooltip={'Use current timestamp'}>
              <Icon name="clock" size="sm" />
            </button>
            <button type="button" class="btn-icon" onclick={clearTimestamp} use:tooltip={'Clear timestamp'}>
              <Icon name="x" size="sm" />
            </button>
          </div>
          <small>Current: {calculateDUIDTimestamp()} seconds since epoch</small>
        </div>
      {/if}

      {#if duidType === 'DUID-EN'}
        <div class="input-group">
          <label for="enterprise-number">
            <Icon name="building" size="sm" />
            Enterprise Number (IANA)
          </label>
          <input
            id="enterprise-number"
            type="number"
            bind:value={enterpriseNumber}
            placeholder="e.g., 9 for Cisco, 311 for Microsoft"
          />
          <small>IANA Private Enterprise Number</small>
        </div>

        <div class="input-group">
          <label for="enterprise-identifier">
            <Icon name="key" size="sm" />
            Enterprise Identifier (hex)
          </label>
          <input
            id="enterprise-identifier"
            type="text"
            bind:value={enterpriseIdentifier}
            placeholder="e.g., 0123456789abcdef"
          />
          <small>Custom identifier in hexadecimal format</small>
        </div>
      {/if}

      {#if duidType === 'DUID-UUID'}
        <div class="input-group">
          <label for="uuid">
            <Icon name="fingerprint" size="sm" />
            UUID
          </label>
          <input id="uuid" type="text" bind:value={uuid} placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000" />
          <small>Standard UUID format (with or without hyphens)</small>
        </div>
      {/if}
    </div>
  </div>

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

  {#if result && validationErrors.length === 0}
    <div class="card results">
      <h3>Generated DUID</h3>

      <div class="summary-card">
        <div><strong>Type:</strong> {result.type} (Type {result.typeCode})</div>
        <div><strong>Total Length:</strong> {result.totalLength} bytes</div>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Hex Encoded DUID</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('hex')}
            onclick={() => clipboard.copy(result!.hexEncoded, 'hex')}
          >
            <Icon name={clipboard.isCopied('hex') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('hex') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{result.hexEncoded}</pre>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Wire Format (Spaced)</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('wire')}
            onclick={() => clipboard.copy(result!.wireFormat, 'wire')}
          >
            <Icon name={clipboard.isCopied('wire') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('wire') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{result.wireFormat}</pre>
      </div>

      {#if result.breakdown && result.breakdown.length > 0}
        <div class="breakdown-section">
          <h4>DUID Breakdown</h4>
          {#each result.breakdown as item, i (i)}
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

    {#if result.examples.keaDhcp6}
      <div class="card results">
        <h3>Kea DHCPv6 Configuration</h3>
        <div class="output-group">
          <div class="output-header">
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('kea')}
              onclick={() => clipboard.copy(result!.examples.keaDhcp6!, 'kea')}
            >
              <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('kea') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.keaDhcp6}</pre>
        </div>
      </div>
    {/if}

    {#if result.examples.iscDhcpd}
      <div class="card results">
        <h3>ISC DHCPd Configuration</h3>
        <div class="output-group">
          <div class="output-header">
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('isc')}
              onclick={() => clipboard.copy(result!.examples.iscDhcpd!, 'isc')}
            >
              <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('isc') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.iscDhcpd}</pre>
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

  .timestamp-controls {
    display: flex;
    align-items: stretch;
    gap: var(--spacing-sm);

    input {
      flex: 1;
    }
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 2.5rem;

    &:hover:not(:disabled) {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .errors-card {
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border-color: var(--color-error);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    color: var(--color-error);
    font-size: 0.9375rem;
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

    div {
      strong {
        color: var(--text-primary);
      }
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
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    .timestamp-controls {
      flex-direction: column;
    }

    .breakdown-item {
      grid-template-columns: 1fr;
    }
  }
</style>
