<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import { t } from '$lib/stores/language';
  import {
    type TLVOption,
    type TLVResult,
    type TLVDataType,
    buildTLVOption,
    getDefaultTLVOption,
    validateTLVOption,
    createTLVItem,
    TLV_EXAMPLES,
  } from '$lib/utils/dhcp-freeform-tlv';

  let option = $state<TLVOption>({
    ...getDefaultTLVOption(),
    items: [createTLVItem('string')],
  });
  let result = $state<TLVResult | null>(null);
  let validationErrors = $state<string[]>([]);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  interface TLVExample {
    label: string;
    option: TLVOption;
    description: string;
  }

  const examples: TLVExample[] = TLV_EXAMPLES.map((ex) => ({
    label: ex.optionName,
    option: ex,
    description: `Option ${ex.optionCode}: ${ex.items.length} item${ex.items.length > 1 ? 's' : ''} - ${ex.items.map((i) => i.dataType).join(', ')}`,
  }));

  const dataTypeOptions = $derived([
    {
      value: 'ipv4' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.ipv4.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.ipv4.description'),
    },
    {
      value: 'ipv6' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.ipv6.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.ipv6.description'),
    },
    {
      value: 'fqdn' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.fqdn.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.fqdn.description'),
    },
    {
      value: 'string' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.string.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.string.description'),
    },
    {
      value: 'hex' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.hex.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.hex.description'),
    },
    {
      value: 'uint8' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint8.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint8.description'),
    },
    {
      value: 'uint16' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint16.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint16.description'),
    },
    {
      value: 'uint32' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint32.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint32.description'),
    },
    {
      value: 'boolean' as const,
      label: $t('tools/freeform-tlv-builder.dataItems.dataTypes.boolean.label'),
      description: $t('tools/freeform-tlv-builder.dataItems.dataTypes.boolean.description'),
    },
  ]);

  function loadExample(example: TLVExample, index: number): void {
    // Deep copy the option to avoid reference issues
    option = {
      ...example.option,
      items: example.option.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
    };
    selectedExampleIndex = index;
  }

  function checkIfExampleStillMatches(): void {
    if (selectedExampleIndex === null) return;

    const example = examples[selectedExampleIndex];
    if (!example) {
      selectedExampleIndex = null;
      return;
    }

    const matches =
      option.optionCode === example.option.optionCode &&
      option.optionName === example.option.optionName &&
      option.items.length === example.option.items.length &&
      option.items.every(
        (item, i) => item.dataType === example.option.items[i].dataType && item.value === example.option.items[i].value,
      );

    if (!matches) {
      selectedExampleIndex = null;
    }
  }

  function addItem(): void {
    option.items = [...option.items, createTLVItem('string')];
  }

  function removeItem(id: string): void {
    if (option.items.length > 1) {
      option.items = option.items.filter((item) => item.id !== id);
    }
  }

  function getPlaceholder(dataType: TLVDataType): string {
    switch (dataType) {
      case 'ipv4':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.ipv4.placeholder');
      case 'ipv6':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.ipv6.placeholder');
      case 'fqdn':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.fqdn.placeholder');
      case 'string':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.string.placeholder');
      case 'hex':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.hex.placeholder');
      case 'uint8':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint8.placeholder');
      case 'uint16':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint16.placeholder');
      case 'uint32':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.uint32.placeholder');
      case 'boolean':
        return $t('tools/freeform-tlv-builder.dataItems.dataTypes.boolean.placeholder');
      default:
        return '';
    }
  }

  $effect(() => {
    // Read option properties to trigger effect when they change
    const currentOptionCode = option.optionCode;
    const currentOptionName = option.optionName;
    const _currentItems = option.items.map((item) => ({
      dataType: item.dataType,
      value: item.value,
    }));

    // Update validationErrors and result without tracking them (prevents infinite loop)
    untrack(() => {
      const currentOption: TLVOption = {
        optionCode: currentOptionCode,
        optionName: currentOptionName,
        items: option.items,
      };

      // Check if form is in initial empty state (1 item with no value)
      const isInitialState = currentOption.items.length === 1 && !currentOption.items[0].value.trim();

      if (isInitialState) {
        validationErrors = [];
        result = null;
      } else {
        validationErrors = validateTLVOption(currentOption);

        if (validationErrors.length === 0) {
          try {
            result = buildTLVOption(currentOption);
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
  title={$t('tools/freeform-tlv-builder.title')}
  description={$t('tools/freeform-tlv-builder.subtitle')}
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
      <h3>{$t('tools/freeform-tlv-builder.optionConfig.title')}</h3>
    </div>
    <div class="card-content">
      <div class="input-row">
        <div class="input-group">
          <label for="option-code">
            <Icon name="hash" size="sm" />
            {$t('tools/freeform-tlv-builder.optionConfig.optionCode.label')}
            <span class="required">{$t('tools/freeform-tlv-builder.common.required')}</span>
          </label>
          <input
            id="option-code"
            type="number"
            bind:value={option.optionCode}
            min="0"
            max="255"
            placeholder={$t('tools/freeform-tlv-builder.optionConfig.optionCode.placeholder')}
          />
          <span class="help-text">{$t('tools/freeform-tlv-builder.optionConfig.optionCode.hint')}</span>
        </div>

        <div class="input-group">
          <label for="option-name">
            <Icon name="tag" size="sm" />
            {$t('tools/freeform-tlv-builder.optionConfig.optionName.label')}
            <span class="required">{$t('tools/freeform-tlv-builder.common.required')}</span>
          </label>
          <input
            id="option-name"
            type="text"
            bind:value={option.optionName}
            placeholder={$t('tools/freeform-tlv-builder.optionConfig.optionName.placeholder')}
          />
          <span class="help-text">{$t('tools/freeform-tlv-builder.optionConfig.optionName.hint')}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('tools/freeform-tlv-builder.dataItems.title')}</h3>
      <p class="help-text">
        {$t('tools/freeform-tlv-builder.dataItems.hint')}
      </p>
    </div>
    <div class="card-content items-container">
      {#each option.items as item, i (item.id)}
        <div class="item-card">
          <div class="item-header">
            <h4>{$t('tools/freeform-tlv-builder.dataItems.item', { number: i + 1 })}</h4>
            <button
              type="button"
              class="btn-icon btn-remove"
              onclick={() => removeItem(item.id)}
              disabled={option.items.length === 1}
              aria-label="Remove item"
            >
              <Icon name="x" size="sm" />
            </button>
          </div>

          <div class="input-group">
            <label for="datatype-{item.id}">
              <Icon name="binary" size="sm" />
              {$t('tools/freeform-tlv-builder.dataItems.dataType')}
            </label>
            <select id="datatype-{item.id}" bind:value={item.dataType}>
              {#each dataTypeOptions as typeOption (typeOption.value)}
                <option value={typeOption.value}>{typeOption.label}</option>
              {/each}
            </select>
            <span class="help-text">
              {dataTypeOptions.find((t) => t.value === item.dataType)?.description}
            </span>
          </div>

          <div class="input-group">
            <label for="value-{item.id}">
              <Icon name="edit" size="sm" />
              {$t('tools/freeform-tlv-builder.dataItems.value')}
            </label>
            <input
              id="value-{item.id}"
              type="text"
              bind:value={item.value}
              placeholder={getPlaceholder(item.dataType)}
            />
          </div>
        </div>
      {/each}

      <button type="button" class="btn-add" onclick={addItem}>
        <Icon name="plus" size="sm" />
        {$t('tools/freeform-tlv-builder.dataItems.addButton')}
      </button>
    </div>
  </div>

  {#if validationErrors.length > 0}
    <div class="card errors-card">
      <h3>{$t('tools/freeform-tlv-builder.errors.title')}</h3>
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
      <h3>{$t('tools/freeform-tlv-builder.results.title')}</h3>

      <div class="summary-card">
        <div>
          <strong>{$t('tools/freeform-tlv-builder.results.summary.optionCode')}</strong>
          {result.option.optionCode}
        </div>
        <div>
          <strong>{$t('tools/freeform-tlv-builder.results.summary.optionName')}</strong>
          {result.option.optionName}
        </div>
        <div>
          <strong>{$t('tools/freeform-tlv-builder.results.summary.dataLength')}</strong>
          {$t('tools/freeform-tlv-builder.results.summary.bytes', { length: result.dataLength })}
        </div>
        <div>
          <strong>{$t('tools/freeform-tlv-builder.results.summary.items')}</strong>
          {result.option.items.length}
        </div>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>{$t('tools/freeform-tlv-builder.results.hexEncoded')}</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('hex')}
            onclick={() => clipboard.copy(result!.hexEncoded, 'hex')}
          >
            <Icon name={clipboard.isCopied('hex') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('hex')
              ? $t('tools/freeform-tlv-builder.common.copied')
              : $t('tools/freeform-tlv-builder.common.copy')}
          </button>
        </div>
        <pre class="output-value code-block">{result.hexEncoded}</pre>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>{$t('tools/freeform-tlv-builder.results.wireFormat')}</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('wire')}
            onclick={() => clipboard.copy(result!.wireFormat, 'wire')}
          >
            <Icon name={clipboard.isCopied('wire') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('wire')
              ? $t('tools/freeform-tlv-builder.common.copied')
              : $t('tools/freeform-tlv-builder.common.copy')}
          </button>
        </div>
        <pre class="output-value code-block">{result.wireFormat}</pre>
      </div>

      {#if result.breakdown.length > 0}
        <div class="breakdown-section">
          <h4>{$t('tools/freeform-tlv-builder.results.byteBreakdown')}</h4>
          {#each result.breakdown as item, i (i)}
            <div class="breakdown-item">
              <div class="breakdown-label">{item.label}</div>
              <div class="breakdown-hex">{item.hex}</div>
              <div class="breakdown-desc">{item.description}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="card results">
      <h3>{$t('tools/freeform-tlv-builder.results.configExamples')}</h3>

      {#if result.examples.iscDhcpd}
        <div class="output-group">
          <div class="output-header">
            <h4>{$t('tools/freeform-tlv-builder.results.iscDhcpd')}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('isc')}
              onclick={() => clipboard.copy(result!.examples.iscDhcpd!, 'isc')}
            >
              <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('isc')
                ? $t('tools/freeform-tlv-builder.common.copied')
                : $t('tools/freeform-tlv-builder.common.copy')}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.iscDhcpd}</pre>
        </div>
      {/if}

      {#if result.examples.keaDhcp4}
        <div class="output-group">
          <div class="output-header">
            <h4>{$t('tools/freeform-tlv-builder.results.keaDhcp4')}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('kea')}
              onclick={() => clipboard.copy(result!.examples.keaDhcp4!, 'kea')}
            >
              <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('kea')
                ? $t('tools/freeform-tlv-builder.common.copied')
                : $t('tools/freeform-tlv-builder.common.copy')}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.keaDhcp4}</pre>
        </div>
      {/if}
    </div>

    <div class="card results info-card">
      <h3>{$t('tools/freeform-tlv-builder.about.title')}</h3>
      <p>
        {$t('tools/freeform-tlv-builder.about.intro')}
      </p>
      <ul>
        <li>
          <strong>{$t('tools/freeform-tlv-builder.about.types.ipv4Ipv6')}</strong>
          {$t('tools/freeform-tlv-builder.about.types.ipv4Ipv6Desc')}
        </li>
        <li>
          <strong>{$t('tools/freeform-tlv-builder.about.types.fqdn')}</strong>
          {$t('tools/freeform-tlv-builder.about.types.fqdnDesc')}
        </li>
        <li>
          <strong>{$t('tools/freeform-tlv-builder.about.types.string')}</strong>
          {$t('tools/freeform-tlv-builder.about.types.stringDesc')}
        </li>
        <li>
          <strong>{$t('tools/freeform-tlv-builder.about.types.uintTypes')}</strong>
          {$t('tools/freeform-tlv-builder.about.types.uintTypesDesc')}
        </li>
        <li>
          <strong>{$t('tools/freeform-tlv-builder.about.types.boolean')}</strong>
          {$t('tools/freeform-tlv-builder.about.types.booleanDesc')}
        </li>
        <li>
          <strong>{$t('tools/freeform-tlv-builder.about.types.hex')}</strong>
          {$t('tools/freeform-tlv-builder.about.types.hexDesc')}
        </li>
      </ul>
      <p>
        {$t('tools/freeform-tlv-builder.about.outro')}
      </p>
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

    select {
      cursor: pointer;
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

  .required {
    color: var(--color-error);
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  .items-container {
    gap: var(--spacing-lg);
  }

  .item-card {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-secondary);
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background: var(--surface-hover);
      border-color: var(--color-primary);
    }

    &.btn-remove {
      color: var(--color-error);

      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-error), transparent 90%);
        border-color: var(--color-error);
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn-add {
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

    &.info-card {
      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: var(--spacing-sm) 0;
      }

      ul {
        margin: var(--spacing-md) 0;
        padding-left: var(--spacing-xl);
        color: var(--text-secondary);
        line-height: 1.8;

        li {
          margin: var(--spacing-xs) 0;

          strong {
            color: var(--text-primary);
          }
        }
      }
    }
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
      grid-column: 1;
    }

    .breakdown-hex {
      font-family: var(--font-mono);
      color: var(--color-primary);
      grid-column: 2;
    }

    .breakdown-desc {
      color: var(--text-tertiary);
      font-size: 0.8125rem;
      grid-column: 1 / -1;
    }
  }
</style>
