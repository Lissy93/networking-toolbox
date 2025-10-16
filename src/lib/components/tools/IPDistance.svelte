<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import { calculateIPDistances, type DistanceResult } from '$lib/utils/ip-distance.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';
  import '../../../styles/diagnostics-pages.scss';

  let inputText = $state('192.168.1.1 -> 192.168.1.100\n10.0.0.1 -> 10.0.0.255\n2001:db8::1 -> 2001:db8::ffff');
  let inclusive = $state(true);
  let showIntermediates = $state(false);
  let result = $state<DistanceResult | null>(null);
  let isLoading = $state(false);
  let selectedExampleIndex = $state<number | null>(null);
  let userModified = $state(false);
  const clipboard = useClipboard();

  const examples = [
    {
      input: '192.168.1.1 -> 192.168.1.10',
      description: 'Basic IPv4 range counting',
    },
    {
      input: '2001:db8::1 -> 2001:db8::100\nfe80::1 -> fe80::ffff',
      description: 'IPv6 address distances',
    },
    {
      input: '10.0.0.1 -> 10.255.255.254\n172.16.0.1 -> 172.31.255.254',
      description: 'Large private network ranges',
    },
    {
      input: '192.168.1.1 -> 192.168.1.2\n192.168.1.2 -> 192.168.1.1',
      description: 'Adjacent IPs and reverse counting',
    },
  ];

  function calculateDistances() {
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
          summary: {
            totalCalculations: 0,
            validCalculations: 0,
            invalidCalculations: 0,
            totalDistance: '0',
            averageDistance: '0',
          },
          errors: ['No valid input lines found'],
        };
        return;
      }

      result = calculateIPDistances(inputs, inclusive, showIntermediates);
    } catch (error) {
      result = {
        calculations: [],
        summary: {
          totalCalculations: 0,
          validCalculations: 0,
          invalidCalculations: 0,
          totalDistance: '0',
          averageDistance: '0',
        },
        errors: [error instanceof Error ? error.message : 'Unknown error occurred while calculating distances'],
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
      const headers = 'Start IP,End IP,Distance,Version,Inclusive,Direction,Valid,Error';
      const rows = result.calculations.map(
        (calc) =>
          `"${calc.startIP}","${calc.endIP}","${calc.distance}","IPv${calc.version}","${calc.inclusive}","${calc.direction}","${calc.isValid}","${calc.error || ''}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `ip-distances-${timestamp}.csv`;
    } else {
      content = JSON.stringify(result, null, 2);
      filename = `ip-distances-${timestamp}.json`;
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
    calculateDistances();
  }

  function handleInputChange() {
    userModified = true;
    selectedExampleIndex = null;
  }

  function formatDirection(direction: 'forward' | 'backward'): string {
    return direction === 'forward' ? '→' : '←';
  }

  function getDirectionColor(direction: 'forward' | 'backward'): string {
    return direction === 'forward' ? '#059669' : '#d97706';
  }

  // Auto-calculate when inputs change
  $effect(() => {
    if (inputText.trim()) {
      const timeoutId = setTimeout(calculateDistances, 300);
      return () => clearTimeout(timeoutId);
    } else {
      result = null;
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h1>IP Distance Calculator</h1>
    <p>
      Calculate the number of addresses between two IP addresses with inclusive/exclusive counting and detailed
      analysis.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i && !userModified}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Calculate distance for: ${example.input.split('\n')[0]}`}
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
      <h3>Distance Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group textarea-group">
          <label
            for="inputs"
            use:tooltip={'Enter IP address pairs, one per line. Supports formats: start → end, start -> end, start end, start - end'}
          >
            IP Address Pairs
          </label>
          <textarea
            id="inputs"
            bind:value={inputText}
            oninput={handleInputChange}
            placeholder="192.168.1.1 -> 192.168.1.100&#10;10.0.0.1 -> 10.0.0.255&#10;2001:db8::1 -> 2001:db8::ffff"
            rows="6"
          ></textarea>
          <div class="input-help">
            Enter one pair per line. Formats: start → end, start -> end, start end, start - end
          </div>
        </div>

        <div class="checkbox-section">
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={inclusive} onchange={handleInputChange} />
              <div class="checkbox-text">
                <span>Inclusive Counting</span>
                <span
                  use:tooltip={'Include both start and end addresses in the count. Exclusive counting only counts addresses between the endpoints.'}
                >
                  <Icon name="help-circle" size="xs" />
                </span>
              </div>
            </label>
          </div>

          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={showIntermediates} onchange={handleInputChange} />
              <div class="checkbox-text">
                <span>Show Intermediate IPs</span>
                <span use:tooltip={'Display sample addresses between start and end (maximum 10 addresses shown)'}>
                  <Icon name="help-circle" size="xs" />
                </span>
              </div>
            </label>
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
          Calculating distances...
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
                {#each result.errors as error (error)}
                  <p>{error}</p>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if result.calculations.length > 0}
        <div class="card summary-card">
          <div class="card-header">
            <h3>Distance Summary</h3>
            <button
              class="copy-btn"
              class:copied={clipboard.isCopied('summary')}
              onclick={() =>
                result &&
                clipboard.copy(
                  `Total Pairs: ${result.summary.totalCalculations}\nValid: ${result.summary.validCalculations}\nInvalid: ${result.summary.invalidCalculations}\nTotal Distance: ${result.summary.totalDistance}\nAverage Distance: ${result.summary.averageDistance}`,
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
                <div class="info-label">Total Pairs</div>
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
                <div class="info-label">Total Distance</div>
                <div class="metric-value info">{result.summary.totalDistance}</div>
              </div>
              <div class="info-card">
                <div class="info-label">Average Distance</div>
                <div class="metric-value">{result.summary.averageDistance}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card calculations-card">
          <div class="card-header">
            <h3>Distance Calculations</h3>
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
              {#each result.calculations as calculation, index (index)}
                <div class="calculation-card" class:valid={calculation.isValid} class:invalid={!calculation.isValid}>
                  <div class="calc-header">
                    <div class="ip-pair">
                      <div class="ip-address">
                        <span class="ip-label" use:tooltip={'Starting IP address'}>Start</span>
                        <div class="value-copy">
                          <span class="ip-value">{calculation.startIP}</span>
                          <button
                            class="copy-btn"
                            class:copied={clipboard.isCopied(`start-${index}`)}
                            onclick={() => clipboard.copy(calculation.startIP, `start-${index}`)}
                            use:tooltip={'Copy start IP'}
                          >
                            <Icon name={clipboard.isCopied(`start-${index}`) ? 'check' : 'copy'} size="xs" />
                          </button>
                        </div>
                      </div>

                      <div
                        class="direction-arrow"
                        style="color: {getDirectionColor(calculation.direction)}"
                        use:tooltip={`Direction: ${calculation.direction}`}
                      >
                        {formatDirection(calculation.direction)}
                      </div>

                      <div class="ip-address">
                        <span class="ip-label" use:tooltip={'Ending IP address'}>End</span>
                        <div class="value-copy">
                          <span class="ip-value">{calculation.endIP}</span>
                          <button
                            class="copy-btn"
                            class:copied={clipboard.isCopied(`end-${index}`)}
                            onclick={() => clipboard.copy(calculation.endIP, `end-${index}`)}
                            use:tooltip={'Copy end IP'}
                          >
                            <Icon name={clipboard.isCopied(`end-${index}`) ? 'check' : 'copy'} size="xs" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="status">
                      {#if calculation.isValid}
                        <Icon name="check-circle" size="sm" />
                      {:else}
                        <Icon name="x-circle" size="sm" />
                      {/if}
                    </div>
                  </div>

                  {#if calculation.isValid}
                    <div class="calculation-details">
                      <div class="distance-info">
                        <div class="distance-value">
                          <div class="value-copy">
                            <span class="distance-number">{calculation.distance}</span>
                            <button
                              class="copy-btn"
                              class:copied={clipboard.isCopied(`distance-${index}`)}
                              onclick={() => clipboard.copy(calculation.distance, `distance-${index}`)}
                              use:tooltip={'Copy distance value'}
                            >
                              <Icon name={clipboard.isCopied(`distance-${index}`) ? 'check' : 'copy'} size="xs" />
                            </button>
                          </div>
                          <span class="distance-label">
                            address{calculation.distanceNumber === 1n ? '' : 'es'}
                            ({calculation.inclusive ? 'inclusive' : 'exclusive'})
                          </span>
                        </div>

                        <div class="calculation-meta">
                          <span class="meta-item" use:tooltip={`IP version ${calculation.version}`}>
                            <Icon name="globe" size="xs" />
                            IPv{calculation.version}
                          </span>
                          <span
                            class="meta-item"
                            style="color: {getDirectionColor(calculation.direction)}"
                            use:tooltip={`Calculation direction: ${calculation.direction}`}
                          >
                            <Icon name="arrow-right" size="xs" />
                            {calculation.direction}
                          </span>
                        </div>
                      </div>

                      {#if calculation.intermediateAddresses.length > 0}
                        <div class="intermediates">
                          <div class="intermediates-header">
                            <h4>Intermediate Addresses</h4>
                            <button
                              class="copy-btn"
                              class:copied={clipboard.isCopied(`intermediates-${index}`)}
                              onclick={() =>
                                clipboard.copy(calculation.intermediateAddresses.join('\n'), `intermediates-${index}`)}
                              use:tooltip={'Copy all intermediate addresses'}
                            >
                              <Icon name={clipboard.isCopied(`intermediates-${index}`) ? 'check' : 'copy'} size="xs" />
                              Copy All
                            </button>
                          </div>
                          <div class="intermediate-list">
                            {#each calculation.intermediateAddresses as ip, ipIndex (ipIndex)}
                              <div class="value-copy">
                                <span class="ip-value">{ip}</span>
                                <button
                                  class="copy-btn"
                                  class:copied={clipboard.isCopied(`intermediate-${index}-${ipIndex}`)}
                                  onclick={() => clipboard.copy(ip, `intermediate-${index}-${ipIndex}`)}
                                  use:tooltip={'Copy this IP address'}
                                >
                                  <Icon
                                    name={clipboard.isCopied(`intermediate-${index}-${ipIndex}`) ? 'check' : 'copy'}
                                    size="xs"
                                  />
                                </button>
                              </div>
                            {/each}
                            {#if calculation.distanceNumber > BigInt(calculation.intermediateAddresses.length + 2)}
                              <span class="more-indicator">
                                ... and {formatNumber(
                                  Number(
                                    calculation.distanceNumber - BigInt(calculation.intermediateAddresses.length + 2),
                                  ),
                                )} more
                              </span>
                            {/if}
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
      grid-template-columns: 2fr 200px;
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

  .checkbox-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);

    .checkbox-group {
      display: flex;
      flex-direction: column;
      align-items: baseline;
      gap: var(--spacing-xs);
      .checkbox-label {
        width: 100%;
      }
      .checkbox-text {
        flex: 1;
        justify-content: space-between;
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
      .card-header {
        flex-direction: row;
      }
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
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--spacing-sm);
    .info-card {
      flex-direction: column;
    }

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
      border-color: var(--color-success);
    }

    &.invalid {
      border-color: var(--color-error);
    }
  }

  .calc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }
  }

  .ip-pair {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    flex-wrap: wrap;

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
      align-items: stretch;
    }
  }

  .ip-address {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);

    .ip-label {
      font-size: var(--font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-secondary);
      letter-spacing: 0.05em;
    }
  }

  .direction-arrow {
    font-size: var(--font-size-xl);
    font-weight: 700;
    cursor: help;

    @media (max-width: 768px) {
      transform: rotate(90deg);
    }
  }

  .status {
    color: var(--color-success);

    .calculation-card.invalid & {
      color: var(--color-error);
    }
  }

  .calculation-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .distance-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm);
      text-align: center;
    }
  }

  .distance-value {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);

    .distance-number {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--color-primary);
    }

    .distance-label {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      font-weight: 500;
    }
  }

  .calculation-meta {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-primary);
    }
  }

  .intermediates {
    background: var(--bg-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    .intermediates-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);

      h4 {
        color: var(--text-primary);
        font-size: var(--font-size-md);
        font-weight: 600;
        margin: 0;
      }
    }

    .intermediate-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .more-indicator {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        font-style: italic;
        text-align: center;
        padding: var(--spacing-xs);
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
