<script lang="ts">
  import { convertRangeToCIDR, type RangeConversionResult } from '$lib/utils/range-to-cidr.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';

  let startIP = $state('192.168.1.10');
  let endIP = $state('192.168.1.50');
  let result = $state<RangeConversionResult | null>(null);
  let copiedStates = $state<Record<string, boolean>>({});
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { start: '192.168.1.10', end: '192.168.1.50', description: 'Small IPv4 range' },
    { start: '10.0.0.0', end: '10.0.0.255', description: 'IPv4 /24 network' },
    { start: '172.16.0.0', end: '172.16.3.255', description: 'IPv4 /22 equivalent' },
    { start: '2001:db8::', end: '2001:db8::ff', description: 'Small IPv6 range' },
  ];

  function convertRange() {
    if (!startIP.trim() || !endIP.trim()) {
      result = null;
      return;
    }

    result = convertRangeToCIDR(startIP, endIP);
  }

  async function copyToClipboard(text: string, id: string = text) {
    try {
      await navigator.clipboard.writeText(text);
      copiedStates[id] = true;
      setTimeout(() => (copiedStates[id] = false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function copyAllCIDRs() {
    if (!result || !result.isValid) return;
    const allCIDRs = result.cidrs.map((c) => c.cidr).join('\n');
    copyToClipboard(allCIDRs, 'all-cidrs');
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    startIP = example.start;
    endIP = example.end;
    selectedExampleIndex = index;
    convertRange();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function exportResults(format: 'csv' | 'json' | 'txt') {
    if (!result || !result.isValid) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    let content = '';
    let filename = '';

    if (format === 'csv') {
      const headers = 'CIDR,Network,Prefix,First IP,Last IP,Total IPs';
      const rows = result.cidrs.map(
        (cidr) =>
          `"${cidr.cidr}","${cidr.network}","${cidr.prefix}","${cidr.firstIP}","${cidr.lastIP}","${cidr.totalIPs}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `range-to-cidr-${timestamp}.csv`;
    } else if (format === 'json') {
      content = JSON.stringify(result, null, 2);
      filename = `range-to-cidr-${timestamp}.json`;
    } else {
      content = result.cidrs.map((c) => c.cidr).join('\n');
      filename = `range-to-cidr-${timestamp}.txt`;
    }

    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv' : format === 'json' ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Auto-convert when inputs change
  $effect(() => {
    if (startIP.trim() && endIP.trim()) {
      const timeoutId = setTimeout(convertRange, 300);
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<ToolContentContainer
  title="IP Range to CIDR Converter"
  description="Convert an IP address range (start IP → end IP) into the minimal set of CIDR blocks that cover the range"
>
  <!-- Quick Examples -->
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
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Convert ${example.start} - ${example.end}`}
          >
            <div class="example-range">
              <code>{example.start}</code>
              <Icon name="arrow-right" size="xs" />
              <code>{example.end}</code>
            </div>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-content">
      <div class="input-form">
        <div class="input-row">
          <div class="input-group">
            <label for="start-ip" use:tooltip={{ text: 'Starting IP address of the range', position: 'top' }}>
              Start IP Address
            </label>
            <input
              id="start-ip"
              type="text"
              bind:value={startIP}
              placeholder="192.168.1.10"
              onchange={clearExampleSelection}
            />
          </div>

          <div class="range-arrow">
            <Icon name="arrow-right" />
          </div>

          <div class="input-group">
            <label for="end-ip" use:tooltip={{ text: 'Ending IP address of the range', position: 'top' }}>
              End IP Address
            </label>
            <input
              id="end-ip"
              type="text"
              bind:value={endIP}
              placeholder="192.168.1.50"
              onchange={clearExampleSelection}
            />
          </div>

          <button class="convert-btn" onclick={convertRange}>
            <Icon name="zap" size="sm" />
            Convert
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if result}
    <div class="results">
      {#if result.error}
        <div class="error-box">
          <Icon name="alert-triangle" />
          <div>
            <h3>Error</h3>
            <p>{result.error}</p>
          </div>
        </div>
      {:else if result.isValid}
        <div class="summary">
          <h3>Conversion Result</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">IP Version</span>
              <span class="summary-value">IPv{result.ipVersion}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Start IP</span>
              <code class="summary-value">{result.startIP}</code>
            </div>
            <div class="summary-item">
              <span class="summary-label">End IP</span>
              <code class="summary-value">{result.endIP}</code>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Addresses</span>
              <span class="summary-value">{result.totalAddresses.toLocaleString()}</span>
            </div>
            <div class="summary-item highlight">
              <span class="summary-label">CIDR Blocks</span>
              <span class="summary-value">{result.totalBlocks}</span>
            </div>
          </div>
        </div>

        <div class="cidr-results">
          <div class="cidr-header">
            <h3>CIDR Blocks ({result.totalBlocks})</h3>
            <div class="action-buttons">
              <button onclick={copyAllCIDRs} class="action-btn">
                <Icon name={copiedStates['all-cidrs'] ? 'check' : 'copy'} />
                {copiedStates['all-cidrs'] ? 'Copied!' : 'Copy All'}
              </button>
              <button onclick={() => exportResults('txt')} class="action-btn">
                <Icon name="download" />
                Export TXT
              </button>
              <button onclick={() => exportResults('csv')} class="action-btn">
                <Icon name="download" />
                Export CSV
              </button>
              <button onclick={() => exportResults('json')} class="action-btn">
                <Icon name="download" />
                Export JSON
              </button>
            </div>
          </div>

          <div class="cidr-list">
            {#each result.cidrs as cidr, index (cidr.cidr)}
              <div class="cidr-block">
                <div class="cidr-main">
                  <span class="cidr-index">{index + 1}</span>
                  <code class="cidr-notation">{cidr.cidr}</code>
                  <button
                    class="copy-btn"
                    onclick={() => copyToClipboard(cidr.cidr, `cidr-${index}`)}
                    use:tooltip={{ text: 'Copy CIDR', position: 'top' }}
                  >
                    <Icon name={copiedStates[`cidr-${index}`] ? 'check' : 'copy'} />
                  </button>
                </div>
                <div class="cidr-details">
                  <div class="detail">
                    <span class="detail-label">Network:</span>
                    <code>{cidr.network}</code>
                  </div>
                  <div class="detail">
                    <span class="detail-label">Prefix:</span>
                    <code>/{cidr.prefix}</code>
                  </div>
                  <div class="detail">
                    <span class="detail-label">Range:</span>
                    <code>{cidr.firstIP} - {cidr.lastIP}</code>
                  </div>
                  <div class="detail">
                    <span class="detail-label">Addresses:</span>
                    <span>{BigInt(cidr.totalIPs).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- About section moved to bottom -->
  <div class="info-section">
    <h3>About Range to CIDR</h3>
    <div class="info-content">
      <p>This tool converts arbitrary IP ranges into CIDR notation blocks:</p>
      <ul>
        <li><strong>Minimal set</strong>: Finds the smallest number of CIDR blocks</li>
        <li><strong>Aligned blocks</strong>: CIDRs respect network boundaries</li>
        <li><strong>IPv4 & IPv6</strong>: Supports both address families</li>
        <li><strong>Exact coverage</strong>: All addresses in range are included</li>
      </ul>
      <p>Useful for converting firewall rules, ACLs, or vendor-provided IP ranges to CIDR format.</p>
    </div>
  </div>
</ToolContentContainer>

<style lang="scss">
  // Examples card (matches diagnostics pages style)
  .examples-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    padding: 0;

    .examples-details {
      border: none;
      background: none;

      summary {
        list-style: none;
        cursor: pointer;
        user-select: none;

        &::-webkit-details-marker {
          display: none;
        }
      }

      .examples-summary {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md);
        cursor: pointer;

        :global(svg) {
          transition: transform var(--transition-fast);
          color: var(--text-secondary);
        }

        h4 {
          font-size: var(--font-size-md);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
      }

      &[open] .examples-summary :global(svg) {
        transform: rotate(90deg);
      }

      .examples-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--spacing-sm);
        padding: 0 var(--spacing-md) var(--spacing-md);

        .example-card {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;

          &:hover,
          &.selected {
            border-color: var(--color-primary);
            background: var(--bg-primary);
          }

          .example-range {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            font-size: var(--font-size-sm);

            code {
              font-family: var(--font-mono);
              color: var(--text-primary);
              font-size: var(--font-size-xs);
            }
          }

          p {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            margin: 0;
          }
        }
      }
    }
  }

  // Input card
  .input-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
    padding: var(--spacing-sm);

    .card-content {
      padding: var(--spacing-md);
    }

    .input-form {
      .input-row {
        display: flex;
        align-items: flex-end;
        gap: var(--spacing-md);

        @media (max-width: 768px) {
          flex-direction: column;
          align-items: stretch;

          .range-arrow {
            transform: rotate(90deg);
          }

          .convert-btn {
            width: 100%;
          }
        }

        .input-group {
          flex: 1;

          label {
            display: block;
            font-size: var(--font-size-sm);
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: var(--spacing-xs);
          }

          input {
            width: 100%;
            padding: var(--spacing-sm) var(--spacing-md);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: var(--font-size-md);
            transition: border-color var(--transition-fast);

            &:focus {
              outline: none;
              border-color: var(--color-primary);
            }
          }
        }

        .range-arrow {
          display: flex;
          align-items: center;
          padding-bottom: var(--spacing-sm);
          color: var(--text-secondary);
        }

        .convert-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--color-primary);
          color: var(--bg-primary);
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
          height: fit-content;
          margin-bottom: 1px;

          &:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }
        }
      }
    }
  }

  .results {
    margin-top: var(--spacing-xl);
  }

  .error-box {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-error), transparent 90%);
    border-left: 4px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);

    h3 {
      font-size: var(--font-size-md);
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    p {
      font-size: var(--font-size-sm);
    }
  }

  .summary {
    margin-bottom: var(--spacing-xl);

    h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);

      .summary-item {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        padding: var(--spacing-md);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);

        &.highlight {
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-primary), transparent 95%),
            color-mix(in srgb, var(--color-primary), transparent 98%)
          );
          border-color: var(--color-primary);
        }

        .summary-label {
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-value {
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--text-primary);

          &:is(code) {
            font-family: var(--font-mono);
          }
        }
      }
    }
  }

  .cidr-results {
    .cidr-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
      flex-wrap: wrap;
      gap: var(--spacing-md);

      h3 {
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--text-primary);
      }

      .action-buttons {
        display: flex;
        gap: var(--spacing-sm);
        flex-wrap: wrap;

        .action-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all var(--transition-fast);

          &:hover {
            background: var(--bg-primary);
            border-color: var(--color-primary);
          }
        }
      }
    }

    .cidr-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);

      .cidr-block {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        border: 1px solid var(--border-primary);
        transition: all var(--transition-fast);
        .cidr-main {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-sm);

          .cidr-index {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 2rem;
            height: 2rem;
            background: var(--color-primary);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-weight: 600;
            color: var(--bg-primary);
          }

          .cidr-notation {
            flex: 1;
            font-family: var(--font-mono);
            font-size: var(--font-size-lg);
            font-weight: 600;
            color: var(--text-primary);
          }

          .copy-btn {
            padding: var(--spacing-sm);
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: color var(--transition-fast);

            &:hover {
              color: var(--color-primary);
            }
          }
        }

        .cidr-details {
          padding-left: calc(2rem + var(--spacing-md));
          display: flex;
          gap: var(--spacing-lg);
          flex-wrap: wrap;

          @media (max-width: 640px) {
            padding-left: 0;
            grid-template-columns: 1fr;
          }

          .detail {
            display: flex;
            align-items: baseline;
            gap: var(--spacing-xs);
            font-size: var(--font-size-sm);

            .detail-label {
              color: var(--text-secondary);
              font-weight: 500;
            }

            code {
              font-family: var(--font-mono);
              color: var(--text-primary);
              background: var(--bg-primary);
            }

            span {
              color: var(--text-primary);
            }
          }
        }
      }
    }
  }

  // Info section at bottom
  .info-section {
    margin-top: var(--spacing-xl);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-info), transparent 95%),
      color-mix(in srgb, var(--color-info), transparent 98%)
    );
    border: 1px solid color-mix(in srgb, var(--color-info), transparent 80%);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);

    h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }

    .info-content {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.6;

      p {
        margin-bottom: var(--spacing-sm);
      }

      ul {
        margin-left: var(--spacing-md);
        margin-bottom: var(--spacing-sm);
        li {
          margin-bottom: var(--spacing-xs);
        }
      }

      strong {
        color: var(--text-primary);
      }
    }
  }
</style>
