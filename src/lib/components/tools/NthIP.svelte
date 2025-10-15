<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import { calculateNthIPs, type NthIPResult } from '$lib/utils/nth-ip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import '../../../styles/diagnostics-pages.scss';

  let inputText = $state('192.168.1.0/24 @ 10\n10.0.0.0-10.0.0.255 [50]\n172.16.0.0/16 100\n2001:db8::/64#1000');
  let globalOffset = $state(0);
  let result = $state<NthIPResult | null>(null);
  let isLoading = $state(false);
  let selectedExampleIndex = $state<number | null>(null);
  let userModified = $state(false);
  const clipboard = useClipboard();

  const examples = [
    {
      input: '192.168.1.0/24 @ 10',
      description: 'Get 10th IP from a /24 subnet',
    },
    {
      input: '10.0.0.0-10.0.0.255 [128]\n172.16.0.0/16 1000',
      description: 'Multiple range types with different indices',
    },
    {
      input: '2001:db8::/64#100\nfe80::/10 @ 50',
      description: 'IPv6 networks with various formats',
    },
    {
      input: '192.168.0.0/16 + 100\n10.0.0.0/8 [5000]',
      description: 'Large networks with high indices',
    },
    {
      input: '203.0.113.0/24 @ 1\n203.0.113.0/24 @ -1',
      description: 'First and last IP using positive/negative indexing',
    },
    {
      input: '192.168.1.1-192.168.1.100 [25]\n192.168.1.101-192.168.1.200 [75]',
      description: 'Sequential IP ranges with specific indices',
    },
    {
      input: '2001:db8:85a3::/48#65536\nfc00::/7 @ 1000000',
      description: 'Large IPv6 address spaces',
    },
    {
      input: '127.0.0.0/8 @ 256\n::1/128 @ 0\n169.254.0.0/16 [32768]',
      description: 'Special-use addresses: loopback and link-local',
    },
  ];

  function calculateIPs() {
    if (!inputText.trim()) {
      result = null;
      return;
    }

    isLoading = true;

    try {
      const inputs = inputText.split('\n').filter((line) => line.trim());
      if (inputs.length === 0) {
        result = {
          calculations: [],
          summary: { totalCalculations: 0, validCalculations: 0, invalidCalculations: 0, outOfBoundsCalculations: 0 },
          errors: ['No valid input lines found'],
        };
        return;
      }

      result = calculateNthIPs(inputs, globalOffset);
    } catch (error) {
      result = {
        calculations: [],
        summary: { totalCalculations: 0, validCalculations: 0, invalidCalculations: 0, outOfBoundsCalculations: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error occurred while calculating nth IPs'],
      };
    } finally {
      isLoading = false;
    }
  }

  function exportResults(format: 'csv' | 'json') {
    if (!result) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    let content = '';
    let filename = '';

    if (format === 'csv') {
      const headers = 'Input,Network,Index,Offset,Result IP,Version,Total Addresses,In Bounds,Valid,Error';
      const rows = result.calculations.map(
        (calc) =>
          `"${calc.input}","${calc.network}","${calc.index}","${calc.offset}","${calc.resultIP}","IPv${calc.version}","${calc.totalAddresses}","${calc.isInBounds}","${calc.isValid}","${calc.error || ''}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `nth-ip-${timestamp}.csv`;
    } else {
      content = JSON.stringify(result, null, 2);
      filename = `nth-ip-${timestamp}.json`;
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    inputText = example.input;
    selectedExampleIndex = index;
    userModified = false;
    calculateIPs();
  }

  function handleInputChange() {
    userModified = true;
    selectedExampleIndex = null;
  }

  // Auto-calculate when inputs change
  $effect(() => {
    if (inputText.trim()) {
      const timeoutId = setTimeout(calculateIPs, 300);
      return () => clearTimeout(timeoutId);
    } else {
      result = null;
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h1>Nth IP Calculator</h1>
    <p>Resolve the IP address at a specific index within networks and ranges with optional global offset.</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (`${example.input}-${i}`)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i && !userModified}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Calculate: ${example.input.split('\n')[0]}`}
          >
            <h5>{example.input.split('\n')[0]}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Network Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group textarea-group">
          <label
            for="inputs"
            use:tooltip={'Enter network and index specifications, one per line. Supports formats: network @ index, network [index], network index, or network#index'}
          >
            Network and Index Specifications
          </label>
          <textarea
            id="inputs"
            bind:value={inputText}
            oninput={handleInputChange}
            placeholder="192.168.1.0/24 @ 10&#10;10.0.0.0-10.0.0.255 [50]&#10;172.16.0.0/16 100&#10;2001:db8::/64#1000"
            rows="6"
          ></textarea>
          <div class="input-help">
            Formats: network @ index, network [index], network index, or network#index. Optional offset: + number
          </div>
        </div>

        <div class="options-section">
          <div class="option-group">
            <label for="offset" use:tooltip={'Add this value to all index calculations (0-based indexing)'}>
              Global Offset
            </label>
            <input
              id="offset"
              type="number"
              bind:value={globalOffset}
              oninput={handleInputChange}
              placeholder="0"
              min="0"
            />
            <div class="option-help">Add this value to all index calculations (0-based indexing)</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="card loading-card">
      <div class="card-content">
        <div class="loading">
          <Icon name="loader" size="sm" animate="spin" />
          Calculating IPs...
        </div>
      </div>
    </div>
  {/if}

  {#if result}
    <div class="results">
      {#if result.errors.length > 0}
        <div class="card error-card">
          <div class="card-content">
            <div class="error-content">
              <Icon name="alert-triangle" size="md" />
              <div>
                <strong>Calculation Errors</strong>
                {#each result.errors as error, index (index)}
                  <p>{error}</p>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if result.calculations.length > 0}
        <div class="card summary-card">
          <div class="card-header row">
            <h3>Calculation Summary</h3>
            <button
              class="copy-btn"
              class:copied={clipboard.isCopied('summary')}
              onclick={() =>
                result &&
                result.summary &&
                clipboard.copy(
                  `Total: ${result.summary.totalCalculations}\nValid: ${result.summary.validCalculations}\nInvalid: ${result.summary.invalidCalculations}\nOut of Bounds: ${result.summary.outOfBoundsCalculations}`,
                  'summary',
                )}
              use:tooltip={'Copy summary to clipboard'}
            >
              <Icon name={clipboard.isCopied('summary') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('summary') ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div class="card-content">
            <div class="summary-stats">
              <div class="info-card">
                <div class="info-label">Total</div>
                <div class="metric-value">{result.summary.totalCalculations}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Valid</div>
                <div class="metric-value success">{result.summary.validCalculations}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Invalid</div>
                <div class="metric-value" class:error={result.summary.invalidCalculations > 0}>
                  {result.summary.invalidCalculations}
                </div>
              </div>
              <div class="info-card">
                <div class="info-label">Out of Bounds</div>
                <div class="metric-value" class:warning={result.summary.outOfBoundsCalculations > 0}>
                  {result.summary.outOfBoundsCalculations}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card calculations-card">
          <div class="card-header row">
            <h3>IP Calculations</h3>
            <div class="export-buttons">
              <button onclick={() => exportResults('csv')} use:tooltip={'Export results as CSV file'}>
                <Icon name="csv-file" size="xs" />
                Export CSV
              </button>
              <button onclick={() => exportResults('json')} use:tooltip={'Export results as JSON file'}>
                <Icon name="json-file" size="xs" />
                Export JSON
              </button>
            </div>
          </div>
          <div class="card-content">
            <div class="calculations-list">
              {#each result.calculations as calculation, index (`${calculation.index}-${index}`)}
                <div
                  class="calculation-card"
                  class:valid={calculation.isValid && calculation.isInBounds}
                  class:out-of-bounds={calculation.isValid && !calculation.isInBounds}
                  class:invalid={!calculation.isValid}
                >
                  <div class="calc-header">
                    <div class="input-info">
                      <div class="value-copy">
                        <span class="input-text">{calculation.input}</span>
                        <button
                          class="copy-btn"
                          class:copied={clipboard.isCopied(`input-${index}`)}
                          onclick={() => clipboard.copy(calculation.input, `input-${index}`)}
                          use:tooltip={'Copy input specification'}
                        >
                          <Icon name={clipboard.isCopied(`input-${index}`) ? 'check' : 'copy'} size="xs" />
                        </button>
                      </div>
                      <div class="input-meta">
                        <span class="network-type" use:tooltip={`Network type: ${calculation.inputType}`}
                          >{calculation.inputType.toUpperCase()}</span
                        >
                        <span class="ip-version" use:tooltip={`IP version ${calculation.version}`}
                          >IPv{calculation.version}</span
                        >
                      </div>
                    </div>

                    <div class="status">
                      {#if calculation.isValid && calculation.isInBounds}
                        <span use:tooltip={'Valid calculation within bounds'}>
                          <Icon name="check-circle" size="md" />
                        </span>
                      {:else if calculation.isValid && !calculation.isInBounds}
                        <span use:tooltip={'Valid calculation but index out of bounds'}>
                          <Icon name="alert-circle" size="md" />
                        </span>
                      {:else}
                        <span use:tooltip={'Invalid calculation'}>
                          <Icon name="x-circle" size="md" />
                        </span>
                      {/if}
                    </div>
                  </div>

                  {#if calculation.isValid}
                    <div class="calculation-details">
                      <div class="result-section">
                        <div class="result-ip">
                          <span class="result-label" use:tooltip={'The calculated IP address at the specified index'}
                            >Result IP:</span
                          >
                          <div class="value-copy">
                            <span class="result-value">{calculation.resultIP}</span>
                            <button
                              class="copy-btn"
                              class:copied={clipboard.isCopied(`result-${index}`)}
                              onclick={() => clipboard.copy(calculation.resultIP, `result-${index}`)}
                              use:tooltip={'Copy result IP address'}
                            >
                              <Icon name={clipboard.isCopied(`result-${index}`) ? 'check' : 'copy'} size="xs" />
                            </button>
                          </div>
                        </div>

                        {#if !calculation.isInBounds}
                          <div class="bounds-warning">
                            <Icon name="alert-triangle" size="sm" />
                            <span>Index out of bounds</span>
                          </div>
                        {/if}
                      </div>

                      <div class="calculation-info">
                        <div class="details-header">
                          <h4>Calculation Details</h4>
                        </div>
                        <div class="info-grid">
                          <div class="info-card">
                            <div class="info-label" use:tooltip={'Network or range being processed'}>Network</div>
                            <div class="value-copy">
                              <span class="ip-value">{calculation.network}</span>
                              <button
                                class="copy-btn"
                                class:copied={clipboard.isCopied(`network-${index}`)}
                                onclick={() => clipboard.copy(calculation.network, `network-${index}`)}
                                use:tooltip={'Copy network address'}
                              >
                                <Icon name={clipboard.isCopied(`network-${index}`) ? 'check' : 'copy'} size="xs" />
                              </button>
                            </div>
                          </div>

                          <div class="info-card">
                            <div class="info-label" use:tooltip={'Total number of addresses in this network'}>
                              Total Addresses
                            </div>
                            <div class="metric-value">{calculation.totalAddresses}</div>
                          </div>

                          <div class="info-card">
                            <div class="info-label" use:tooltip={'The index position requested'}>Index</div>
                            <div class="metric-value info">{calculation.index}</div>
                          </div>

                          <div class="info-card">
                            <div class="info-label" use:tooltip={'Global offset applied to the calculation'}>
                              Offset
                            </div>
                            <div class="metric-value">{calculation.offset}</div>
                          </div>
                        </div>
                      </div>

                      {#if calculation.details}
                        <div>
                          <div class="details-header">
                            <h4>Network Details</h4>
                          </div>
                          <div class="network-details">
                            <div class="details-grid">
                              <div class="info-card">
                                <div class="info-label" use:tooltip={'First IP address in the network'}>Start</div>
                                <div class="value-copy">
                                  <span class="ip-value">{calculation.details.networkStart}</span>
                                  <button
                                    class="copy-btn"
                                    class:copied={clipboard.isCopied(`start-${index}`)}
                                    onclick={() =>
                                      calculation.details &&
                                      clipboard.copy(calculation.details.networkStart, `start-${index}`)}
                                    use:tooltip={'Copy network start address'}
                                  >
                                    <Icon name={clipboard.isCopied(`start-${index}`) ? 'check' : 'copy'} size="xs" />
                                  </button>
                                </div>
                              </div>

                              <div class="info-card">
                                <div class="info-label" use:tooltip={'Last IP address in the network'}>End</div>
                                <div class="value-copy">
                                  <span class="ip-value">{calculation.details.networkEnd}</span>
                                  <button
                                    class="copy-btn"
                                    class:copied={clipboard.isCopied(`end-${index}`)}
                                    onclick={() =>
                                      calculation.details &&
                                      clipboard.copy(calculation.details.networkEnd, `end-${index}`)}
                                    use:tooltip={'Copy network end address'}
                                  >
                                    <Icon name={clipboard.isCopied(`end-${index}`) ? 'check' : 'copy'} size="xs" />
                                  </button>
                                </div>
                              </div>

                              <div class="info-card">
                                <div class="info-label" use:tooltip={'The actual index used (including offset)'}>
                                  Actual Index
                                </div>
                                <div class="metric-value info">{calculation.details.actualIndex}</div>
                              </div>

                              <div class="info-card">
                                <div class="info-label" use:tooltip={'Maximum valid index for this network'}>
                                  Max Index
                                </div>
                                <div class="metric-value">{calculation.details.maxIndex}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {:else}
                    <div class="error-message">
                      <Icon name="alert-triangle" size="sm" />
                      <span>{calculation.error}</span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .form-row {
    display: grid;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);

    @media (min-width: 768px) {
      grid-template-columns: 2fr 180px;
      align-items: start;
    }
  }

  .textarea-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);

    label {
      color: var(--text-primary);
      font-weight: 500;
      font-size: var(--font-size-sm);
    }

    textarea {
      width: 100%;
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      resize: vertical;
      min-height: 150px;
      transition: all var(--transition-fast);

      &:focus {
        border-color: var(--color-primary);
        outline: 2px solid color-mix(in srgb, var(--color-primary), transparent 70%);
        outline-offset: 2px;
      }
    }

    .input-help {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      line-height: 1.4;
    }
  }

  .options-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);

    .option-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);

      label {
        color: var(--text-primary);
        font-weight: 500;
        font-size: var(--font-size-sm);
      }

      input {
        padding: var(--spacing-sm);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        transition: all var(--transition-fast);

        &:focus {
          border-color: var(--color-primary);
          outline: 2px solid color-mix(in srgb, var(--color-primary), transparent 70%);
          outline-offset: 2px;
        }
      }

      .option-help {
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
        line-height: 1.4;
      }
    }
  }

  .loading {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    justify-content: center;
    padding: var(--spacing-lg);
    color: var(--color-primary);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    .card {
      width: 100%;
    }
  }

  .error-content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);

    strong {
      color: var(--color-error-light);
      margin-bottom: var(--spacing-xs);
    }

    p {
      color: var(--color-error-light);
      font-size: var(--font-size-sm);
      margin: var(--spacing-xs) 0;
      line-height: 1.4;
    }
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--spacing-sm);

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .export-buttons {
    display: flex;
    gap: var(--spacing-sm);

    button {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--color-primary);
      color: var(--bg-primary);
      border: none;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: color-mix(in srgb, var(--color-primary), black 10%);
        transform: translateY(-1px);
      }
    }

    @media (max-width: 768px) {
      flex-direction: column;

      button {
        justify-content: center;
      }
    }
  }

  .calculations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .calculation-card {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    transition: all var(--transition-fast);

    &.valid {
      border-color: color-mix(in srgb, var(--color-success), transparent 60%);
    }

    &.out-of-bounds {
      border-color: color-mix(in srgb, var(--color-warning), transparent 60%);
    }

    &.invalid {
      border-color: color-mix(in srgb, var(--color-error), transparent 60%);
    }
  }

  .calc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-md);
    .input-info {
      display: flex;
      flex-direction: row;
      gap: var(--spacing-sm);
    }

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .input-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .input-text {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    .input-meta {
      display: flex;
      gap: var(--spacing-xs);

      .network-type,
      .ip-version {
        font-size: var(--font-size-xs);
        font-weight: 500;
        padding: var(--spacing-xs);
        border-radius: var(--radius-xs);
        background: var(--bg-secondary);
        color: var(--text-secondary);
        border: 1px solid var(--border-secondary);
      }
    }
  }

  .status {
    color: var(--color-success);

    .calculation-card.out-of-bounds & {
      color: var(--color-warning);
    }

    .calculation-card.invalid & {
      color: var(--color-error);
    }
  }

  .calculation-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .result-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    .result-ip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);

      .result-label {
        font-weight: 600;
        color: var(--text-primary);
        font-size: var(--font-size-md);
      }

      .result-value {
        font-family: var(--font-mono);
        font-size: var(--font-size-lg);
        font-weight: 700;
        color: var(--color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }

      @media (max-width: 768px) {
        flex-direction: column;
        gap: var(--spacing-xs);
        align-items: flex-start;
      }
    }

    .bounds-warning {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--color-warning-light);
      font-weight: 500;
      font-size: var(--font-size-sm);
      padding: var(--spacing-xs);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      border-radius: var(--radius-sm);
    }
  }

  .calculation-info {
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-sm);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }
  }

  .network-details {
    background: var(--bg-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-sm);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }
  }

  .info-grid,
  .details-grid {
    background: var(--bg-secondary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    .info-card {
      flex-direction: column;
      .metric-value,
      .value-copy {
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        white-space: nowrap;
      }
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--color-error-light);
    font-size: var(--font-size-sm);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);

    span {
      line-height: 1.4;
    }
  }
</style>
