<script lang="ts">
  import { expandIPv6, compressIPv6, validateIPv6Address } from '$lib/utils/ipv6-subnet-calculations.js';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';

  interface Props {
    mode: 'expand' | 'compress';
  }

  let { mode }: Props = $props();

  let inputAddress = $state('2001:db8::1');
  let outputAddress = $state('');
  let conversionError = $state('');
  const clipboard = useClipboard();
  let selectedExampleIndex = $state<number | null>(null);

  /* Common IPv6 example addresses for testing */
  const exampleAddresses = [
    { label: 'Documentation Prefix', compressed: '2001:db8::', expanded: '2001:0db8:0000:0000:0000:0000:0000:0000' },
    { label: 'Loopback Address', compressed: '::1', expanded: '0000:0000:0000:0000:0000:0000:0000:0001' },
    { label: 'Link-Local Address', compressed: 'fe80::1', expanded: 'fe80:0000:0000:0000:0000:0000:0000:0001' },
    {
      label: 'Global Unicast',
      compressed: '2001:db8:85a3::8a2e:370:7334',
      expanded: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    },
    { label: 'IPv4-mapped IPv6', compressed: '::ffff:192.0.2.1', expanded: '0000:0000:0000:0000:0000:ffff:c000:0201' },
    { label: 'Multicast Address', compressed: 'ff02::1', expanded: 'ff02:0000:0000:0000:0000:0000:0000:0001' },
  ];

  /* Set example address */
  function setExample(address: string, index: number) {
    inputAddress = address;
    selectedExampleIndex = index;
    performConversion();
  }

  /* Clear example selection when input changes */
  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  /* Handle input change */
  function handleInput() {
    clearExampleSelection();
    performConversion();
  }

  /* Perform the conversion based on mode */
  function performConversion() {
    conversionError = '';
    outputAddress = '';

    if (!inputAddress.trim()) {
      conversionError = 'Please enter an IPv6 address';
      return;
    }

    const validation = validateIPv6Address(inputAddress);
    if (!validation.valid) {
      conversionError = validation.error || 'Invalid IPv6 address format';
      return;
    }

    try {
      if (mode === 'expand') {
        outputAddress = expandIPv6(inputAddress);
      } else {
        outputAddress = compressIPv6(inputAddress);
      }
    } catch (error) {
      conversionError = error instanceof Error ? error.message : 'Conversion failed';
    }
  }

  /* Clear input and output */
  function clearAll() {
    inputAddress = '';
    outputAddress = '';
    conversionError = '';
  }

  // Reactive conversion
  $effect(() => {
    if (inputAddress) {
      performConversion();
    }
  });
</script>

<!-- Input Section -->
<div class="converter-section">
  <h3>Input IPv6 Address</h3>

  <div class="input-group">
    <div class="form-group">
      <label for="ipv6-input">
        IPv6 Address
        <Tooltip
          text={mode === 'expand'
            ? 'Enter compressed IPv6 address to expand'
            : 'Enter expanded IPv6 address to compress'}
        >
          <Icon name="help" size="sm" />
        </Tooltip>
      </label>
      <div class="input-wrapper">
        <input
          id="ipv6-input"
          type="text"
          bind:value={inputAddress}
          oninput={handleInput}
          placeholder={mode === 'expand' ? '2001:db8::1' : '2001:0db8:0000:0000:0000:0000:0000:0001'}
          class="ipv6-input"
        />
        <button type="button" class="btn btn-secondary btn-md" onclick={clearAll}>
          <Icon name="trash" size="md" />
        </button>
      </div>
      {#if conversionError}
        <p class="error-message">{conversionError}</p>
      {/if}
    </div>
  </div>
</div>

<!-- Examples Section -->
<div class="examples-section">
  <details class="examples-details">
    <summary class="examples-summary">
      <Icon name="chevron-right" size="xs" />
      <h3>Common Examples</h3>
    </summary>
    <div class="examples-grid">
      {#each exampleAddresses as example, index (`example-${index}`)}
        <button
          type="button"
          class="example-btn"
          class:selected={selectedExampleIndex === index}
          onclick={() => setExample(mode === 'expand' ? example.compressed : example.expanded, index)}
        >
          <div class="example-label">{example.label}</div>
          <code class="example-address">
            {mode === 'expand' ? example.compressed : example.expanded}
          </code>
        </button>
      {/each}
    </div>
  </details>
</div>

<!-- Output Section -->
{#if outputAddress && !conversionError}
  <div class="output-section">
    <h3>Converted Address</h3>

    <div class="conversion-result">
      <div class="result-card success">
        <div class="result-header">
          <h4>
            <Icon name={mode === 'expand' ? 'maximize' : 'minimize'} size="sm" />
            {mode === 'expand' ? 'Expanded Format' : 'Compressed Format'}
          </h4>
        </div>

        <div class="result-content">
          <div class="address-display">
            <div class="address-wrapper">
              <code class="converted-address">{outputAddress}</code>
              <button
                type="button"
                class="btn btn-icon copy-btn"
                class:copied={clipboard.isCopied('output')}
                onclick={() => clipboard.copy(outputAddress, 'output')}
              >
                <Icon name={clipboard.isCopied('output') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          <!-- Comparison View -->
          <div class="comparison-view">
            <div class="comparison-item">
              <span class="comparison-label">Input ({mode === 'expand' ? 'Compressed' : 'Expanded'}):</span>
              <code class="comparison-address input">{inputAddress}</code>
            </div>
            <div class="comparison-item">
              <span class="comparison-label">Output ({mode === 'expand' ? 'Expanded' : 'Compressed'}):</span>
              <code class="comparison-address output">{outputAddress}</code>
            </div>
          </div>

          <!-- Character Count -->
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Input Length</span>
              <span class="stat-value">{inputAddress.length} characters</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Output Length</span>
              <span class="stat-value">{outputAddress.length} characters</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Difference</span>
              <span class="stat-value {outputAddress.length > inputAddress.length ? 'expanded' : 'compressed'}">
                {outputAddress.length > inputAddress.length ? '+' : ''}{outputAddress.length - inputAddress.length} characters
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .converter-section,
  .examples-section,
  .output-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      /* color: var(--color-primary); */
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-lg);
    }
  }

  .examples-section {
    .examples-details {
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      background-color: var(--bg-secondary);
      transition: all var(--transition-fast);

      &[open] {
        box-shadow: var(--shadow-sm);

        .examples-summary {
          border-bottom: 1px solid var(--border-primary);
        }
      }
    }

    .examples-summary {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--surface-hover);
      }

      h3 {
        margin: 0;
        font-size: var(--font-size-, d);
      }

      :global(.icon) {
        transition: transform var(--transition-fast);
        color: var(--color-primary);
      }
    }

    .examples-grid {
      padding: var(--spacing-md);
    }
  }

  .converter-section {
    display: flex;
    flex-direction: column;
    align-items: baseline;
    gap: 0;
    .input-group {
      max-width: none;
      width: 100%;
    }
  }

  .input-wrapper {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .ipv6-input {
    flex: 1;
    font-family: var(--font-mono);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-lg);
  }

  .error-message {
    color: var(--color-error);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-xs);
    font-weight: 500;
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-sm);
  }

  .example-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-secondary);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    text-align: left;
    cursor: pointer;

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    &.selected {
      border-color: var(--color-primary);
      background-color: color-mix(in srgb, var(--color-primary), transparent 95%);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);

      .example-label {
        color: var(--color-primary);
        font-weight: 700;
      }

      .example-address {
        color: var(--color-primary);
        font-weight: 600;
      }
    }
  }

  .example-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);
  }

  .example-address {
    font-family: var(--font-mono);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    word-break: break-all;
    display: block;
  }

  .conversion-result {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .result-card {
    border-radius: var(--radius-lg);
    overflow: hidden;

    &.success {
      border: 2px solid var(--color-success);
    }
  }

  .result-header {
    background: linear-gradient(135deg, var(--color-success), var(--color-success-light));
    padding: var(--spacing-md);
    h4 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: var(--font-size-md);
      color: var(--bg-primary);
      :global(.icon) {
        width: 1.2rem;
        height: 1.2rem;
      }
    }
  }

  .result-content {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
  }

  .address-display {
    margin-bottom: var(--spacing-lg);
  }

  .address-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border: 2px solid var(--color-success);
  }

  .converted-address {
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-success);
    word-break: break-all;
  }

  .copy-btn {
    transition: all var(--transition-fast);

    &.copied {
      color: var(--color-success);
      background-color: rgba(35, 134, 54, 0.1);
      border-color: var(--color-success);
      transform: scale(1.05);
    }
  }

  .comparison-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
    background-color: var(--bg-primary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
  }

  .comparison-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .comparison-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: 600;
  }

  .comparison-address {
    font-family: var(--font-mono);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    word-break: break-all;

    &.input {
      background-color: rgba(var(--color-info-rgb), 0.1);
      color: var(--color-info);
    }

    &.output {
      background-color: rgba(var(--color-success-rgb), 0.1);
      color: var(--color-success);
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background-color: var(--bg-primary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: 600;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);

    &.expanded {
      color: var(--color-info);
    }

    &.compressed {
      color: var(--color-success);
    }
  }

  label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    :global(.tooltip-trigger) {
      color: var(--text-secondary);
      opacity: 0.7;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 1;
        color: var(--color-info);
      }
    }
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .address-wrapper {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-md);
    }

    .input-wrapper {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
