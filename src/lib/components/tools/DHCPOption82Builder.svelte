<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import { t } from '$lib/stores/language';
  import {
    buildOption82,
    parseOption82,
    getDefaultOption82Config,
    type Option82Config,
    type Option82Result,
    type ParsedOption82,
    type SuboptionType,
    type EncodingFormat,
  } from '$lib/utils/dhcp-option82.js';

  const modeOptions = $derived([
    { value: 'build' as const, label: $t('tools/dhcp-option82-builder.modes.build'), icon: 'wrench' },
    { value: 'parse' as const, label: $t('tools/dhcp-option82-builder.modes.parse'), icon: 'search' },
  ]);

  let mode = $state<'build' | 'parse'>('build');
  let config = $state<Option82Config>(getDefaultOption82Config());
  let result = $state<Option82Result | null>(null);
  let parseInput = $state<string>('');
  let parseResult = $state<ParsedOption82 | null>(null);
  let validationErrors = $state<string[]>([]);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  const formatOptions = $derived<Array<{ value: EncodingFormat; label: string }>>([
    { value: 'ascii', label: $t('tools/dhcp-option82-builder.formats.ascii') },
    { value: 'hex', label: $t('tools/dhcp-option82-builder.formats.hex') },
    { value: 'vlan-id', label: $t('tools/dhcp-option82-builder.formats.vlanId') },
    { value: 'hostname-port', label: $t('tools/dhcp-option82-builder.formats.hostnamePort') },
  ]);

  interface BuildExample {
    label: string;
    type: SuboptionType;
    format: EncodingFormat;
    value: string;
    description: string;
  }

  interface ParseExample {
    label: string;
    hexInput: string;
    description: string;
  }

  const buildExamples = $derived<BuildExample[]>([
    {
      label: $t('tools/dhcp-option82-builder.buildExamples.vlan100.label'),
      type: 'circuit-id',
      format: 'vlan-id',
      value: '100',
      description: $t('tools/dhcp-option82-builder.buildExamples.vlan100.description'),
    },
    {
      label: $t('tools/dhcp-option82-builder.buildExamples.switchPort.label'),
      type: 'circuit-id',
      format: 'hostname-port',
      value: 'sw1:Gi0/1',
      description: $t('tools/dhcp-option82-builder.buildExamples.switchPort.description'),
    },
    {
      label: $t('tools/dhcp-option82-builder.buildExamples.customCircuit.label'),
      type: 'circuit-id',
      format: 'ascii',
      value: 'building-a-floor-3',
      description: $t('tools/dhcp-option82-builder.buildExamples.customCircuit.description'),
    },
    {
      label: $t('tools/dhcp-option82-builder.buildExamples.switchHostname.label'),
      type: 'remote-id',
      format: 'ascii',
      value: 'relay-sw1.example.com',
      description: $t('tools/dhcp-option82-builder.buildExamples.switchHostname.description'),
    },
    {
      label: $t('tools/dhcp-option82-builder.buildExamples.macAddress.label'),
      type: 'remote-id',
      format: 'hex',
      value: '001122334455',
      description: $t('tools/dhcp-option82-builder.buildExamples.macAddress.description'),
    },
    {
      label: $t('tools/dhcp-option82-builder.buildExamples.agentId.label'),
      type: 'remote-id',
      format: 'ascii',
      value: 'DHCP-RELAY-01',
      description: $t('tools/dhcp-option82-builder.buildExamples.agentId.description'),
    },
  ]);

  const parseExamples = $derived<ParseExample[]>([
    {
      label: $t('tools/dhcp-option82-builder.parseExamples.vlanHostname.label'),
      hexInput: '01020064020c7377312e6578616d706c65',
      description: $t('tools/dhcp-option82-builder.parseExamples.vlanHostname.description'),
    },
    {
      label: $t('tools/dhcp-option82-builder.parseExamples.switchPort.label'),
      hexInput: '01094769302f31020c7377312e6578616d706c65',
      description: $t('tools/dhcp-option82-builder.parseExamples.switchPort.description'),
    },
    {
      label: $t('tools/dhcp-option82-builder.parseExamples.macAddress.label'),
      hexInput: '0206001122334455',
      description: $t('tools/dhcp-option82-builder.parseExamples.macAddress.description'),
    },
  ]);

  // Reactive generation - use untrack to prevent infinite loop
  $effect(() => {
    if (mode === 'build') {
      // Read config to track it
      const currentConfig = config;

      // Untrack writes to prevent infinite loop
      untrack(() => {
        validateAndGenerate(currentConfig);
        checkIfExampleStillMatches();
      });
    } else {
      // Track parseInput changes in parse mode
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      parseInput;

      untrack(() => {
        checkIfExampleStillMatches();
      });
    }
  });

  // Clear selected example when switching modes
  $effect(() => {
    // Track mode to trigger effect
    void mode;
    untrack(() => {
      selectedExampleIndex = null;
    });
  });

  function validateAndGenerate(cfg: Option82Config = config) {
    const errors: string[] = [];

    // Validate suboptions
    for (let i = 0; i < cfg.suboptions.length; i++) {
      const sub = cfg.suboptions[i];

      if (!sub.value.trim()) {
        errors.push($t('tools/dhcp-option82-builder.errors.valueRequired', { number: i + 1 }));
        continue;
      }

      if (sub.format === 'vlan-id') {
        const vlan = parseInt(sub.value, 10);
        if (isNaN(vlan) || vlan < 0 || vlan > 4095) {
          errors.push($t('tools/dhcp-option82-builder.errors.vlanRange', { number: i + 1 }));
        }
      }

      if (sub.format === 'hex') {
        if (!/^[0-9a-fA-F:]+$/.test(sub.value.replace(/\s/g, ''))) {
          errors.push($t('tools/dhcp-option82-builder.errors.invalidHex', { number: i + 1 }));
        }
      }
    }

    validationErrors = errors;

    if (errors.length === 0) {
      result = buildOption82(cfg);
    } else {
      result = null;
    }
  }

  function parse() {
    if (!parseInput.trim()) {
      parseResult = null;
      validationErrors = [];
      return;
    }

    if (!/^[0-9a-fA-F\s:]+$/.test(parseInput)) {
      validationErrors = [$t('tools/dhcp-option82-builder.errors.invalidHexInput')];
      parseResult = null;
      return;
    }

    validationErrors = [];
    parseResult = parseOption82(parseInput);
  }

  function addSuboption() {
    config.suboptions = [
      ...config.suboptions,
      {
        type: 'circuit-id',
        format: 'ascii',
        value: '',
      },
    ];
  }

  function removeSuboption(index: number) {
    if (config.suboptions.length > 1) {
      config.suboptions = config.suboptions.filter((_, i) => i !== index);
    }
  }

  function loadBuildExample(example: BuildExample, index: number) {
    config.suboptions = [
      {
        type: example.type,
        format: example.format,
        value: example.value,
      },
    ];
    selectedExampleIndex = index;
  }

  function loadParseExample(example: ParseExample, index: number) {
    parseInput = example.hexInput;
    selectedExampleIndex = index;
    parse();
  }

  function checkIfExampleStillMatches() {
    if (selectedExampleIndex === null) return;

    if (mode === 'build') {
      const example = buildExamples[selectedExampleIndex];
      if (!example) {
        selectedExampleIndex = null;
        return;
      }

      // Check if current config matches the selected example
      const matches =
        config.suboptions.length === 1 &&
        config.suboptions[0].type === example.type &&
        config.suboptions[0].format === example.format &&
        config.suboptions[0].value === example.value;

      if (!matches) {
        selectedExampleIndex = null;
      }
    } else {
      const example = parseExamples[selectedExampleIndex];
      if (!example) {
        selectedExampleIndex = null;
        return;
      }

      // Check if parse input matches the selected example
      if (parseInput !== example.hexInput) {
        selectedExampleIndex = null;
      }
    }
  }
</script>

<ToolContentContainer
  title={$t('tools/dhcp-option82-builder.title')}
  description={$t('tools/dhcp-option82-builder.subtitle')}
  navOptions={modeOptions}
  bind:selectedNav={mode}
>
  {#if mode === 'build'}
    <ExamplesCard
      examples={buildExamples}
      onSelect={loadBuildExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
      selectedIndex={selectedExampleIndex}
    />
  {:else}
    <ExamplesCard
      examples={parseExamples}
      onSelect={loadParseExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
      selectedIndex={selectedExampleIndex}
    />
  {/if}

  {#if mode === 'build'}
    <div class="card input-card">
      <div class="card-header">
        <h3>{$t('tools/dhcp-option82-builder.build.configurationTitle')}</h3>
      </div>
      <div class="card-content">
        {#each config.suboptions as suboption, i (`sub-${i}-${suboption.type}`)}
          <div class="suboption-group">
            <div class="suboption-header">
              <h4>{$t('tools/dhcp-option82-builder.build.suboption.title', { number: i + 1 })}</h4>
              {#if config.suboptions.length > 1}
                <button type="button" class="btn-icon" onclick={() => removeSuboption(i)}>
                  <Icon name="x" size="sm" />
                </button>
              {/if}
            </div>

            <div class="input-row">
              <div class="input-group">
                <label for="type-{i}">
                  <Icon name="tag" size="sm" />
                  {$t('tools/dhcp-option82-builder.build.suboption.typeLabel')}
                </label>
                <select id="type-{i}" bind:value={suboption.type}>
                  <option value="circuit-id">{$t('tools/dhcp-option82-builder.build.suboption.circuitId')}</option>
                  <option value="remote-id">{$t('tools/dhcp-option82-builder.build.suboption.remoteId')}</option>
                </select>
              </div>

              <div class="input-group">
                <label for="format-{i}">
                  <Icon name="code" size="sm" />
                  {$t('tools/dhcp-option82-builder.build.suboption.encodingFormat')}
                </label>
                <select id="format-{i}" bind:value={suboption.format}>
                  {#each formatOptions as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="input-group">
              <label for="value-{i}">
                <Icon name="edit" size="sm" />
                {$t('tools/dhcp-option82-builder.build.suboption.valueLabel')}
              </label>
              <input
                id="value-{i}"
                type="text"
                bind:value={suboption.value}
                placeholder={suboption.format === 'vlan-id'
                  ? $t('tools/dhcp-option82-builder.build.suboption.placeholders.vlanId')
                  : suboption.format === 'hex'
                    ? $t('tools/dhcp-option82-builder.build.suboption.placeholders.hex')
                    : $t('tools/dhcp-option82-builder.build.suboption.placeholders.default')}
              />
            </div>
          </div>
        {/each}

        <button type="button" class="btn-add" onclick={addSuboption}>
          <Icon name="plus" size="sm" />
          {$t('tools/dhcp-option82-builder.build.addSuboption')}
        </button>
      </div>
    </div>

    {#if validationErrors.length > 0}
      <div class="card errors-card">
        <h3>{$t('tools/dhcp-option82-builder.errors.title')}</h3>
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
        <h3>{$t('tools/dhcp-option82-builder.build.results.title')}</h3>

        <div class="output-group">
          <div class="output-header">
            <h4>{$t('tools/dhcp-option82-builder.build.results.hexEncoded')}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('hex')}
              onclick={() => clipboard.copy(result!.hexEncoded, 'hex')}
            >
              <Icon name={clipboard.isCopied('hex') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('hex')
                ? $t('tools/dhcp-option82-builder.buttons.copied')
                : $t('tools/dhcp-option82-builder.buttons.copy')}
            </button>
          </div>
          <pre class="output-value code-block">{result.hexEncoded}</pre>
        </div>

        <div class="breakdown-section">
          <h4>{$t('tools/dhcp-option82-builder.build.results.breakdown')}</h4>
          {#each result.breakdown as breakdown, i (i)}
            <div class="breakdown-item">
              <div class="breakdown-header">
                <strong
                  >{$t('tools/dhcp-option82-builder.build.results.typeCode', {
                    type: breakdown.type,
                    code: breakdown.typeCode,
                  })}</strong
                >
                <span class="breakdown-length"
                  >{$t('tools/dhcp-option82-builder.build.results.length', { length: breakdown.length })}</span
                >
              </div>
              <p class="breakdown-desc">{breakdown.description}</p>
              <div class="breakdown-values">
                <div>
                  <strong>{$t('tools/dhcp-option82-builder.build.results.valueLabel')}</strong>
                  {breakdown.value}
                </div>
                <div>
                  <strong>{$t('tools/dhcp-option82-builder.build.results.hexLabel')}</strong>
                  {breakdown.hexValue}
                </div>
              </div>
            </div>
          {/each}
        </div>

        {#if result.examples.iscDhcpd}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option82-builder.build.results.examples.iscDhcpd')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('isc')}
                onclick={() => clipboard.copy(result!.examples.iscDhcpd!, 'isc')}
              >
                <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('isc')
                  ? $t('tools/dhcp-option82-builder.buttons.copied')
                  : $t('tools/dhcp-option82-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.iscDhcpd}</pre>
          </div>
        {/if}

        {#if result.examples.keaDhcp4}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option82-builder.build.results.examples.keaDhcp4')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('kea')}
                onclick={() => clipboard.copy(result!.examples.keaDhcp4!, 'kea')}
              >
                <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('kea')
                  ? $t('tools/dhcp-option82-builder.buttons.copied')
                  : $t('tools/dhcp-option82-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.keaDhcp4}</pre>
          </div>
        {/if}

        {#if result.examples.ciscoRelay}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option82-builder.build.results.examples.ciscoRelay')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('cisco')}
                onclick={() => clipboard.copy(result!.examples.ciscoRelay!, 'cisco')}
              >
                <Icon name={clipboard.isCopied('cisco') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('cisco')
                  ? $t('tools/dhcp-option82-builder.buttons.copied')
                  : $t('tools/dhcp-option82-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.ciscoRelay}</pre>
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="card input-card">
      <div class="card-header">
        <h3>{$t('tools/dhcp-option82-builder.parse.title')}</h3>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="parse-input">
            <Icon name="code" size="sm" />
            {$t('tools/dhcp-option82-builder.parse.hexEncoded')}
          </label>
          <textarea
            id="parse-input"
            bind:value={parseInput}
            placeholder={$t('tools/dhcp-option82-builder.parse.placeholder')}
            rows="4"
          ></textarea>
        </div>
        <button type="button" class="btn-primary" onclick={parse}>
          <Icon name="search" size="sm" />
          {$t('tools/dhcp-option82-builder.parse.button')}
        </button>
      </div>
    </div>

    {#if validationErrors.length > 0}
      <div class="card errors-card">
        <h3>{$t('tools/dhcp-option82-builder.errors.title')}</h3>
        {#each validationErrors as error, i (i)}
          <div class="error-message">
            <Icon name="alert-triangle" size="sm" />
            {error}
          </div>
        {/each}
      </div>
    {/if}

    {#if parseResult && validationErrors.length === 0}
      <div class="card results">
        <h3>{$t('tools/dhcp-option82-builder.parse.results.title')}</h3>

        <div class="parse-summary">
          <div>
            <strong>{$t('tools/dhcp-option82-builder.parse.results.totalLength')}</strong>
            {$t('tools/dhcp-option82-builder.parse.results.bytes', { length: parseResult.totalLength })}
          </div>
          <div>
            <strong>{$t('tools/dhcp-option82-builder.parse.results.suboptionsFound')}</strong>
            {$t('tools/dhcp-option82-builder.parse.results.count', { count: parseResult.suboptions.length })}
          </div>
        </div>

        <div class="breakdown-section">
          <h4>{$t('tools/dhcp-option82-builder.parse.results.suboptionsTitle')}</h4>
          {#each parseResult.suboptions as suboption, i (i)}
            <div class="breakdown-item">
              <div class="breakdown-header">
                <strong
                  >{$t('tools/dhcp-option82-builder.parse.results.typeCode', {
                    type: suboption.type,
                    code: suboption.typeCode,
                  })}</strong
                >
                <span class="breakdown-length"
                  >{$t('tools/dhcp-option82-builder.parse.results.length', { length: suboption.length })}</span
                >
              </div>
              <p class="breakdown-desc">{suboption.description}</p>
              <div class="breakdown-values">
                <div>
                  <strong>{$t('tools/dhcp-option82-builder.parse.results.decodedValue')}</strong>
                  {suboption.value}
                </div>
                <div>
                  <strong>{$t('tools/dhcp-option82-builder.parse.results.hexValue')}</strong>
                  {suboption.hexValue}
                </div>
              </div>
            </div>
          {/each}
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
        margin-bottom: var(--spacing-sm);
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
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .suboption-group {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .suboption-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-secondary);

    h4 {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--text-secondary);
    }
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
    select,
    textarea {
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

    textarea {
      resize: vertical;
      font-family: var(--font-mono);
    }
  }

  .input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .btn-icon {
    padding: var(--spacing-xs);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--color-error), transparent 90%);
      border-color: var(--color-error);
    }
  }

  .btn-add,
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: transparent;
    border: 1px dashed var(--border-secondary);
    border-radius: var(--radius-md);
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

  .btn-primary {
    border-style: solid;
    background: var(--color-primary);
    color: var(--bg-primary);
    border-color: var(--color-primary);

    &:hover {
      background: color-mix(in srgb, var(--color-primary), black 10%);
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

    h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
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
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);

    h4 {
      margin: 0 0 var(--spacing-xs);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .breakdown-item {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .breakdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-xs);

    strong {
      color: var(--text-primary);
    }
  }

  .breakdown-length {
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .breakdown-desc {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  .breakdown-values {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    font-size: 0.875rem;
    font-family: var(--font-mono);

    div {
      strong {
        color: var(--text-secondary);
        font-weight: 500;
      }
    }
  }

  .parse-summary {
    display: flex;
    gap: var(--spacing-lg);
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
</style>
