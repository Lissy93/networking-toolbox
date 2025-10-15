<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import { generateRandomIPAddresses, type RandomIPResult } from '$lib/utils/random-ip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import '../../../styles/diagnostics-pages.scss';

  let inputText = $state('192.168.1.0/24 x 10\n10.0.0.0-10.0.0.255 5\n172.16.0.0/16 * 3\n2001:db8::/64[15]');
  let defaultCount = $state(5);
  let unique = $state(true);
  let seed = $state('');
  let result = $state<RandomIPResult | null>(null);
  let isLoading = $state(false);
  let selectedExampleIndex = $state<number | null>(null);
  let _userModified = $state(false);
  const clipboard = useClipboard();

  const examples = [
    {
      input: '192.168.1.0/24 x 5',
      description: 'Generate 5 random IPs from a /24 subnet',
    },
    {
      input: '10.0.0.0-10.0.0.255 * 3\n172.16.0.0/16 [8]',
      description: 'Multiple formats: range and CIDR with different counts',
    },
    {
      input: '2001:db8::/64 # 10\nfe80::/10 x 5',
      description: 'IPv6 networks with various syntax formats',
    },
    {
      input: '192.168.0.0/16 100\n203.0.113.0/24 * 20',
      description: 'Large generation counts from different networks',
    },
    {
      input: '127.0.0.0/8\n::1/128 x 1\n169.254.0.0/16 [10]',
      description: 'Special-use addresses: loopback and link-local',
    },
    {
      input: '198.51.100.0/24 * 15\n198.18.0.0/15 [25]',
      description: 'Test networks for documentation and benchmarking',
    },
  ];

  function generateIPs() {
    if (!inputText.trim()) {
      result = null;
      return;
    }

    isLoading = true;

    try {
      const inputs = inputText.split('\n').filter((line) => line.trim());
      const actualSeed = seed.trim() || undefined;
      result = generateRandomIPAddresses(inputs, defaultCount, unique, actualSeed);
    } catch (error) {
      result = {
        generations: [],
        summary: {
          totalNetworks: 0,
          validNetworks: 0,
          invalidNetworks: 0,
          totalIPsGenerated: 0,
          uniqueIPsGenerated: 0,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        allGeneratedIPs: [],
      };
    } finally {
      isLoading = false;
    }
  }

  function exportResults(format: 'csv' | 'json' | 'txt') {
    if (!result) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (format === 'csv') {
      const headers = 'Network,Type,Version,Requested,Generated,Seed,Valid,Error';
      const rows = result.generations.map(
        (gen) =>
          `"${gen.network}","${gen.networkType}","IPv${gen.version}","${gen.requestedCount}","${gen.generatedIPs.length}","${gen.seed || ''}","${gen.isValid}","${gen.error || ''}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `random-ips-${timestamp}.csv`;
      mimeType = 'text/csv';
    } else if (format === 'json') {
      content = JSON.stringify(result, null, 2);
      filename = `random-ips-${timestamp}.json`;
      mimeType = 'application/json';
    } else {
      // Plain text format with just the IPs
      content = result.allGeneratedIPs.join('\n');
      filename = `random-ips-${timestamp}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyAllIPs() {
    if (result && result.allGeneratedIPs.length > 0) {
      clipboard.copy(result.allGeneratedIPs.join('\n'), 'all-ips');
    }
  }

  function generateNewSeed() {
    seed = Math.random().toString(36).substring(2, 15);
  }

  function selectExample(index: number) {
    const example = examples[index];
    if (example) {
      inputText = example.input;
      selectedExampleIndex = index;
      _userModified = false;
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExampleIndex = null;
  }

  // Auto-generate when inputs change
  $effect(() => {
    if (inputText.trim()) {
      const timeoutId = setTimeout(generateIPs, 300);
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<div class="tool-container">
  <div class="tool-header">
    <h1>Random IP Generator</h1>
    <p>Generate random IP addresses from networks and ranges with uniqueness control and seeded randomness</p>
  </div>

  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary" use:tooltip={'Click to see example inputs'}>
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (`${example.input}-${index}`)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === index}
            onclick={() => selectExample(index)}
            use:tooltip={example.description}
          >
            <div class="example-input">{example.input.split('\n')[0]}{example.input.includes('\n') ? '...' : ''}</div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <div class="card">
    <h3>Network Configuration</h3>
    <div class="form-row">
      <div class="textarea-group">
        <div class="form-group">
          <label for="inputs" use:tooltip={'Enter networks with generation counts using various formats'}
            >Networks and Counts</label
          >
          <textarea
            id="inputs"
            bind:value={inputText}
            oninput={handleInputChange}
            placeholder="192.168.1.0/24 x 10&#10;10.0.0.0-10.0.0.255 5&#10;172.16.0.0/16 * 3&#10;2001:db8::/64[15]"
            rows="6"
            use:tooltip={'Specify networks and generation counts'}
          ></textarea>
          <div class="input-help">
            Formats: network x count, network * count, network count, network#count, network[count]
          </div>
        </div>
      </div>

      <div class="options-group">
        <div class="option-card">
          <label for="default-count" use:tooltip={'Number of IPs to generate when count is not specified'}
            >Default Count</label
          >
          <input
            id="default-count"
            type="number"
            bind:value={defaultCount}
            min="1"
            max="1000"
            placeholder="5"
            use:tooltip={'Default generation count'}
          />
        </div>

        <div class="checkbox-group">
          <label class="checkbox-label" use:tooltip={'Ensure all generated IPs are unique within each network'}>
            <input type="checkbox" bind:checked={unique} />
            <span class="checkmark"></span>
            Unique IPs Only
          </label>
        </div>

        <div class="option-card">
          <label for="seed" use:tooltip={'Use the same seed for reproducible random results'}>Random Seed</label>
          <div class="seed-input">
            <input
              id="seed"
              type="text"
              bind:value={seed}
              placeholder="Optional seed for reproducible results"
              use:tooltip={'Enter seed for reproducible randomness'}
            />
            <button onclick={generateNewSeed} type="button" use:tooltip={'Generate new random seed'}>
              <Icon name="refresh" size="sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="loading">
      <Icon name="loader" />
      Generating random IPs...
    </div>
  {/if}

  {#if result}
    <div class="results-container">
      {#if result.errors.length > 0}
        <div class="card error-card">
          <div class="card-header row">
            <h3><Icon name="alert-triangle" size="sm" /> Errors</h3>
          </div>
          <div class="card-content">
            {#each result.errors as error, index (index)}
              <div class="error-message">
                <Icon name="alert-circle" size="sm" />
                <span>{error}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if result.generations.length > 0}
        <div class="card summary-card">
          <div class="card-header row">
            <h3>Generation Summary</h3>
            <button
              class="copy-btn"
              class:copied={clipboard.isCopied('summary')}
              onclick={() =>
                result &&
                result.summary &&
                clipboard.copy(
                  `Total Networks: ${result.summary.totalNetworks}\nValid: ${result.summary.validNetworks}\nInvalid: ${result.summary.invalidNetworks}\nTotal IPs: ${result.summary.totalIPsGenerated}\nUnique IPs: ${result.summary.uniqueIPsGenerated}`,
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
                <div class="info-label" use:tooltip={'Total number of networks processed'}>Total Networks</div>
                <div class="metric-value">{result.summary.totalNetworks}</div>
              </div>
              <div class="info-card">
                <div class="info-label" use:tooltip={'Networks that were processed successfully'}>Valid</div>
                <div class="metric-value success">{result.summary.validNetworks}</div>
              </div>
              <div class="info-card">
                <div class="info-label" use:tooltip={'Networks that had processing errors'}>Invalid</div>
                <div class="metric-value error">{result.summary.invalidNetworks}</div>
              </div>
              <div class="info-card">
                <div class="info-label" use:tooltip={'Total IP addresses generated across all networks'}>Total IPs</div>
                <div class="metric-value info">{result.summary.totalIPsGenerated}</div>
              </div>
              <div class="info-card">
                <div class="info-label" use:tooltip={'Number of unique IP addresses generated'}>Unique IPs</div>
                <div class="metric-value">{result.summary.uniqueIPsGenerated}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card all-ips-card">
          <div class="card-header row">
            <h3>All Generated IPs ({result.allGeneratedIPs.length})</h3>
            <div class="export-buttons">
              <button
                class="copy-btn"
                class:copied={clipboard.isCopied('all-ips')}
                onclick={copyAllIPs}
                use:tooltip={'Copy all generated IPs to clipboard'}
              >
                <Icon name={clipboard.isCopied('all-ips') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('all-ips') ? 'Copied!' : 'Copy All'}
              </button>
              <button onclick={() => exportResults('txt')} use:tooltip={'Export as plain text file'}>
                <Icon name="download" size="xs" />
                TXT
              </button>
              <button onclick={() => exportResults('csv')} use:tooltip={'Export as CSV file'}>
                <Icon name="csv-file" size="xs" />
                CSV
              </button>
              <button onclick={() => exportResults('json')} use:tooltip={'Export as JSON file'}>
                <Icon name="json-file" size="xs" />
                JSON
              </button>
            </div>
          </div>
          <div class="card-content">
            {#if result.allGeneratedIPs.length > 0}
              <div class="all-ips-list">
                {#each result.allGeneratedIPs as ip, index (`${ip}-${index}`)}
                  <button
                    type="button"
                    class="ip-tag"
                    class:copied={clipboard.isCopied(`ip-${index}`)}
                    onclick={() => clipboard.copy(ip, `ip-${index}`)}
                    use:tooltip={'Click to copy IP address'}
                  >
                    {ip}
                    <Icon name={clipboard.isCopied(`ip-${index}`) ? 'check' : 'copy'} size="xs" />
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="generations">
          <h3>Network Generations</h3>

          <div class="generations-list">
            {#each result.generations as generation, index (index)}
              <div class="generation-card" class:valid={generation.isValid} class:invalid={!generation.isValid}>
                <div class="card-header row">
                  <div class="network-info">
                    <span class="network-text">{generation.network}</span>
                    <div class="network-meta">
                      <span class="network-type">{generation.networkType.toUpperCase()}</span>
                      <span class="ip-version">IPv{generation.version}</span>
                    </div>
                  </div>

                  <div class="status">
                    {#if generation.isValid}
                      <Icon name="check-circle" />
                    {:else}
                      <Icon name="x-circle" />
                    {/if}
                  </div>
                </div>

                {#if generation.isValid}
                  <div class="generation-details">
                    <div class="generation-info">
                      <div class="info-grid">
                        <div class="info-item">
                          <span class="info-label">Requested:</span>
                          <span class="info-value">{generation.requestedCount}</span>
                        </div>

                        <div class="info-item">
                          <span class="info-label">Generated:</span>
                          <span class="info-value">{generation.generatedIPs.length}</span>
                        </div>

                        <div class="info-item">
                          <span class="info-label">Unique:</span>
                          <span class="info-value">{generation.uniqueIPs ? 'Yes' : 'No'}</span>
                        </div>

                        {#if generation.seed}
                          <div class="info-item">
                            <span class="info-label">Seed:</span>
                            <button
                              type="button"
                              class="code-button info-code"
                              onclick={() => clipboard.copy(generation.seed!, 'seed')}
                              title="Click to copy"
                            >
                              {generation.seed}
                            </button>
                          </div>
                        {/if}
                      </div>
                    </div>

                    {#if generation.networkDetails}
                      <div class="network-details">
                        <h4>Network Range</h4>
                        <div class="range-info">
                          <div class="range-item">
                            <span class="range-label">Start:</span>
                            <button
                              type="button"
                              class="code-button range-code"
                              onclick={() => clipboard.copy(generation.networkDetails!.start, 'start')}
                              title="Click to copy"
                            >
                              {generation.networkDetails.start}
                            </button>
                          </div>

                          <div class="range-item">
                            <span class="range-label">End:</span>
                            <button
                              type="button"
                              class="code-button range-code"
                              onclick={() => clipboard.copy(generation.networkDetails!.end, 'end')}
                              title="Click to copy"
                            >
                              {generation.networkDetails.end}
                            </button>
                          </div>

                          <div class="range-item">
                            <span class="range-label">Total:</span>
                            <span class="range-value">{generation.networkDetails.totalAddresses}</span>
                          </div>
                        </div>
                      </div>
                    {/if}

                    {#if generation.generatedIPs.length > 0}
                      <div class="generated-ips">
                        <div class="details-header">
                          <h4>Generated IPs ({generation.generatedIPs.length})</h4>
                        </div>
                        <div class="ips-list">
                          {#each generation.generatedIPs as ip, ipIndex (`${ip}-${ipIndex}`)}
                            <button
                              type="button"
                              class="ip-tag"
                              class:copied={clipboard.isCopied(`gen-${index}-ip-${ipIndex}`)}
                              onclick={() => clipboard.copy(ip, `gen-${index}-ip-${ipIndex}`)}
                              use:tooltip={'Click to copy IP address'}
                            >
                              {ip}
                              <Icon
                                name={clipboard.isCopied(`gen-${index}-ip-${ipIndex}`) ? 'check' : 'copy'}
                                size="xs"
                              />
                            </button>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div class="error-message">
                    <Icon name="alert-triangle" size="sm" />
                    <span>{generation.error}</span>
                  </div>
                {/if}
              </div>
            {/each}
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
      grid-template-columns: 2fr 1fr;
      align-items: start;
    }
  }

  .textarea-group {
    .form-group {
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
          outline: none;
        }
      }

      .input-help {
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
        line-height: 1.4;
      }
    }
  }

  .options-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    align-self: start;

    .option-card {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      label {
        color: var(--text-primary);
        font-weight: 500;
        font-size: var(--font-size-sm);
      }

      input[type='number'],
      input[type='text'] {
        padding: var(--spacing-sm);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        transition: all var(--transition-fast);

        &:focus {
          border-color: var(--color-primary);
          outline: none;
        }
      }

      .seed-input {
        display: flex;
        gap: var(--spacing-xs);

        input {
          flex: 1;
        }

        button {
          padding: var(--spacing-xs);
          background: var(--color-primary);
          color: var(--bg-primary);
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;

          &:hover {
            background: color-mix(in srgb, var(--color-primary), black 10%);
            transform: translateY(-1px);
          }
        }
      }
    }
  }

  .results-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-lg);
    .card {
      width: 100%;
    }
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-sm);

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .all-ips-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    max-height: 300px;
    overflow-y: auto;
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);
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

  .generations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .generation-card {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    transition: all var(--transition-fast);

    &.valid {
      border-color: color-mix(in srgb, var(--color-success), transparent 60%);
    }

    &.invalid {
      border-color: color-mix(in srgb, var(--color-error), transparent 60%);
    }
  }

  .status {
    color: var(--color-success);

    .generation-card.invalid & {
      color: var(--color-error);
    }
  }

  .generation-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .generation-info {
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-sm);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }
  }

  .generated-ips {
    background: var(--bg-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    .ips-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
      max-height: 200px;
      overflow-y: auto;
    }
  }

  .ip-tag {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--bg-primary);
      transform: translateY(-1px);
    }

    &.copied {
      background: var(--color-success);
      color: var(--bg-primary);
      border-color: var(--color-success);
    }
  }

  .details-header {
    margin-bottom: var(--spacing-sm);

    h4 {
      color: var(--text-primary);
      font-size: var(--font-size-md);
      font-weight: 600;
      margin: 0;
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
