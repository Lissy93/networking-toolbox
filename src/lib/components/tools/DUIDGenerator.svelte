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
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools/dhcp-duid-generator');
  });

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

  const examples: DUIDExample[] = $derived(
    DUID_EXAMPLES.map((ex) => ({
      label: ex.name,
      config: ex,
      description: $t('tools/dhcp-duid-generator.exampleDescription', { type: ex.type }),
    })),
  );

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
  title={$t('tools/dhcp-duid-generator.title')}
  description={$t('tools/dhcp-duid-generator.subtitle')}
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
      <h3>{$t('tools/dhcp-duid-generator.input.title')}</h3>
      <p class="help-text">{$t('tools/dhcp-duid-generator.input.helpText')}</p>
    </div>
    <div class="card-content">
      <div class="input-group">
        <label for="duid-type">
          <Icon name="settings" size="sm" />
          {$t('tools/dhcp-duid-generator.input.duidType.label')}
        </label>
        <select id="duid-type" bind:value={duidType}>
          <option value="DUID-LLT">{$t('tools/dhcp-duid-generator.input.duidType.options.duidLlt')}</option>
          <option value="DUID-EN">{$t('tools/dhcp-duid-generator.input.duidType.options.duidEn')}</option>
          <option value="DUID-LL">{$t('tools/dhcp-duid-generator.input.duidType.options.duidLl')}</option>
          <option value="DUID-UUID">{$t('tools/dhcp-duid-generator.input.duidType.options.duidUuid')}</option>
        </select>
      </div>

      {#if duidType === 'DUID-LLT' || duidType === 'DUID-LL'}
        <div class="input-group">
          <label for="mac-address">
            <Icon name="hash" size="sm" />
            {$t('tools/dhcp-duid-generator.input.macAddress.label')}
          </label>
          <input
            id="mac-address"
            type="text"
            bind:value={macAddress}
            placeholder={$t('tools/dhcp-duid-generator.input.macAddress.placeholder')}
          />
          <small>{$t('tools/dhcp-duid-generator.input.macAddress.hint')}</small>
        </div>

        <div class="input-group">
          <label for="hardware-type">
            <Icon name="cpu" size="sm" />
            {$t('tools/dhcp-duid-generator.input.hardwareType.label')}
          </label>
          <select id="hardware-type" bind:value={hardwareType}>
            <option value={HARDWARE_TYPES.ETHERNET}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.ethernet')}</option
            >
            <option value={HARDWARE_TYPES.EXPERIMENTAL_ETHERNET}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.experimentalEthernet')}</option
            >
            <option value={HARDWARE_TYPES.IEEE_802}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.ieee802')}</option
            >
            <option value={HARDWARE_TYPES.ARCNET}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.arcnet')}</option
            >
            <option value={HARDWARE_TYPES.FRAME_RELAY}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.frameRelay')}</option
            >
            <option value={HARDWARE_TYPES.ATM}>{$t('tools/dhcp-duid-generator.input.hardwareType.options.atm')}</option>
            <option value={HARDWARE_TYPES.HDLC}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.hdlc')}</option
            >
            <option value={HARDWARE_TYPES.FIBRE_CHANNEL}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.fibreChannel')}</option
            >
            <option value={HARDWARE_TYPES.IEEE_1394}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.ieee1394')}</option
            >
            <option value={HARDWARE_TYPES.INFINIBAND}
              >{$t('tools/dhcp-duid-generator.input.hardwareType.options.infiniband')}</option
            >
          </select>
        </div>
      {/if}

      {#if duidType === 'DUID-LLT'}
        <div class="input-group">
          <label for="timestamp">
            <Icon name="clock" size="sm" />
            {$t('tools/dhcp-duid-generator.input.timestamp.label')}
          </label>
          <div class="timestamp-controls">
            <input
              id="timestamp"
              type="number"
              bind:value={timestamp}
              placeholder={$t('tools/dhcp-duid-generator.input.timestamp.placeholder')}
            />
            <button
              type="button"
              class="btn-icon"
              onclick={useCurrentTimestamp}
              use:tooltip={$t('tools/dhcp-duid-generator.input.timestamp.useCurrentTooltip')}
            >
              <Icon name="clock" size="sm" />
            </button>
            <button
              type="button"
              class="btn-icon"
              onclick={clearTimestamp}
              use:tooltip={$t('tools/dhcp-duid-generator.input.timestamp.clearTooltip')}
            >
              <Icon name="x" size="sm" />
            </button>
          </div>
          <small>{$t('tools/dhcp-duid-generator.input.timestamp.hint', { timestamp: calculateDUIDTimestamp() })}</small>
        </div>
      {/if}

      {#if duidType === 'DUID-EN'}
        <div class="input-group">
          <label for="enterprise-number">
            <Icon name="building" size="sm" />
            {$t('tools/dhcp-duid-generator.input.enterpriseNumber.label')}
          </label>
          <input
            id="enterprise-number"
            type="number"
            bind:value={enterpriseNumber}
            placeholder={$t('tools/dhcp-duid-generator.input.enterpriseNumber.placeholder')}
          />
          <small>{$t('tools/dhcp-duid-generator.input.enterpriseNumber.hint')}</small>
        </div>

        <div class="input-group">
          <label for="enterprise-identifier">
            <Icon name="key" size="sm" />
            {$t('tools/dhcp-duid-generator.input.enterpriseIdentifier.label')}
          </label>
          <input
            id="enterprise-identifier"
            type="text"
            bind:value={enterpriseIdentifier}
            placeholder={$t('tools/dhcp-duid-generator.input.enterpriseIdentifier.placeholder')}
          />
          <small>{$t('tools/dhcp-duid-generator.input.enterpriseIdentifier.hint')}</small>
        </div>
      {/if}

      {#if duidType === 'DUID-UUID'}
        <div class="input-group">
          <label for="uuid">
            <Icon name="fingerprint" size="sm" />
            {$t('tools/dhcp-duid-generator.input.uuid.label')}
          </label>
          <input
            id="uuid"
            type="text"
            bind:value={uuid}
            placeholder={$t('tools/dhcp-duid-generator.input.uuid.placeholder')}
          />
          <small>{$t('tools/dhcp-duid-generator.input.uuid.hint')}</small>
        </div>
      {/if}
    </div>
  </div>

  {#if validationErrors.length > 0}
    <div class="card errors-card">
      <h3>{$t('tools/dhcp-duid-generator.errors.title')}</h3>
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
      <h3>{$t('tools/dhcp-duid-generator.results.title')}</h3>

      <div class="summary-card">
        <div>
          <strong>{$t('tools/dhcp-duid-generator.results.summary.type')}</strong>
          {result.type}
          {$t('tools/dhcp-duid-generator.results.summary.typeCode', { code: result.typeCode })}
        </div>
        <div>
          <strong>{$t('tools/dhcp-duid-generator.results.summary.totalLength')}</strong>
          {$t('tools/dhcp-duid-generator.results.summary.bytes', { length: result.totalLength })}
        </div>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>{$t('tools/dhcp-duid-generator.results.hexEncoded.title')}</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('hex')}
            onclick={() => clipboard.copy(result!.hexEncoded, 'hex')}
          >
            <Icon name={clipboard.isCopied('hex') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('hex')
              ? $t('tools/dhcp-duid-generator.buttons.copied')
              : $t('tools/dhcp-duid-generator.buttons.copy')}
          </button>
        </div>
        <pre class="output-value code-block">{result.hexEncoded}</pre>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>{$t('tools/dhcp-duid-generator.results.wireFormat.title')}</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('wire')}
            onclick={() => clipboard.copy(result!.wireFormat, 'wire')}
          >
            <Icon name={clipboard.isCopied('wire') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('wire')
              ? $t('tools/dhcp-duid-generator.buttons.copied')
              : $t('tools/dhcp-duid-generator.buttons.copy')}
          </button>
        </div>
        <pre class="output-value code-block">{result.wireFormat}</pre>
      </div>

      {#if result.breakdown && result.breakdown.length > 0}
        <div class="breakdown-section">
          <h4>{$t('tools/dhcp-duid-generator.results.breakdown.title')}</h4>
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
        <h3>{$t('tools/dhcp-duid-generator.config.keaDhcp6')}</h3>
        <div class="output-group">
          <div class="output-header">
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('kea')}
              onclick={() => clipboard.copy(result!.examples.keaDhcp6!, 'kea')}
            >
              <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('kea')
                ? $t('tools/dhcp-duid-generator.buttons.copied')
                : $t('tools/dhcp-duid-generator.buttons.copy')}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.keaDhcp6}</pre>
        </div>
      </div>
    {/if}

    {#if result.examples.iscDhcpd}
      <div class="card results">
        <h3>{$t('tools/dhcp-duid-generator.config.iscDhcpd')}</h3>
        <div class="output-group">
          <div class="output-header">
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('isc')}
              onclick={() => clipboard.copy(result!.examples.iscDhcpd!, 'isc')}
            >
              <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('isc')
                ? $t('tools/dhcp-duid-generator.buttons.copied')
                : $t('tools/dhcp-duid-generator.buttons.copy')}
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
