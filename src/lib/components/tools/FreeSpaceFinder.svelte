<script lang="ts">
  import { computeCIDRDifference, type DiffResult } from '$lib/utils/cidr-diff.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';
  import '../../../styles/diagnostics-pages.scss';

  let pools = $state(`192.168.0.0/16
10.0.0.0/8`);
  let allocations = $state(`192.168.1.0/24
192.168.10.0/24
10.0.0.0/16`);
  let targetPrefix = $state<number | null>(null);
  let result = $state<{
    success: boolean;
    error?: string;
    availableBlocks: string[];
    totalBlocks: number;
    totalAddresses: number;
    stats?: DiffResult['stats'];
    visualization?: DiffResult['visualization'];
  } | null>(null);
  const clipboard = useClipboard();
  let _selectedExample = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);
  let _userModified = $state(false);

  const examples = [
    {
      label: 'Office Network Gaps',
      pools: '192.168.0.0/16',
      allocations: `192.168.1.0/24
192.168.10.0/24
192.168.100.0/24`,
      targetPrefix: 24,
    },
    {
      label: 'Large Pool Analysis',
      pools: '10.0.0.0/8',
      allocations: `10.0.0.0/16
10.1.0.0/16
10.255.0.0/16`,
      targetPrefix: null,
    },
    {
      label: 'Multi-Pool Setup',
      pools: `172.16.0.0/12
192.168.0.0/16`,
      allocations: `172.16.1.0/24
192.168.100.0/24`,
      targetPrefix: 28,
    },
    {
      label: 'Campus Network Planning',
      pools: `10.10.0.0/16
10.20.0.0/16`,
      allocations: `10.10.1.0/24
10.10.5.0/24
10.20.10.0/24`,
      targetPrefix: 25,
    },
    {
      label: 'Data Center Allocation',
      pools: '172.20.0.0/14',
      allocations: `172.20.0.0/16
172.21.0.0/16
172.23.128.0/17`,
      targetPrefix: 20,
    },
    {
      label: 'Service Provider Space',
      pools: `203.0.113.0/24
198.51.100.0/24`,
      allocations: `203.0.113.0/26
203.0.113.128/25
198.51.100.64/26`,
      targetPrefix: 27,
    },
  ];

  function loadExample(example: (typeof examples)[0], index: number) {
    pools = example.pools;
    allocations = example.allocations;
    targetPrefix = example.targetPrefix;
    _selectedExample = example.label;
    selectedExampleIndex = index;
    _userModified = false;
    calculateGaps();
  }

  function calculateGaps() {
    try {
      if (!pools.trim()) {
        result = null;
        return;
      }

      // Use CIDR diff to get all available blocks (A - B = pools - allocations)
      const diffResult = computeCIDRDifference(pools, allocations || '', 'minimal');

      // Check for errors
      if (diffResult.errors.length > 0) {
        result = {
          success: false,
          error: diffResult.errors.join('; '),
          availableBlocks: [],
          totalBlocks: 0,
          totalAddresses: 0,
        };
        return;
      }

      // Combine IPv4 and IPv6 results
      const allBlocks = [...diffResult.ipv4, ...diffResult.ipv6];

      // Filter by target prefix if specified
      let filteredBlocks = allBlocks;
      if (targetPrefix !== null) {
        const target = targetPrefix; // Capture for closure
        filteredBlocks = allBlocks.filter((block) => {
          // Extract prefix length from CIDR notation
          const match = block.match(/\/(\d+)$/);
          if (!match) return false;
          const prefixLength = parseInt(match[1]);
          return prefixLength <= target; // Can be subdivided to target prefix
        });
      }

      // Calculate total addresses
      const totalAddresses = filteredBlocks.reduce((sum, block) => {
        const match = block.match(/\/(\d+)$/);
        if (!match) return sum;
        const prefixLength = parseInt(match[1]);
        const version = block.includes(':') ? 6 : 4;
        const totalBits = version === 4 ? 32 : 128;
        return sum + Math.pow(2, totalBits - prefixLength);
      }, 0);

      result = {
        success: true,
        availableBlocks: filteredBlocks,
        totalBlocks: filteredBlocks.length,
        totalAddresses: totalAddresses,
        stats: diffResult.stats,
        visualization: diffResult.visualization,
      };
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        availableBlocks: [],
        totalBlocks: 0,
        totalAddresses: 0,
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    _selectedExample = null;
    selectedExampleIndex = null;
    calculateGaps();
  }

  // Visualization helper functions
  function getBlockPosition(start: bigint, totalRange: { start: bigint; end: bigint }): number {
    const rangeSize = totalRange.end - totalRange.start;
    const blockOffset = start - totalRange.start;
    return Number((blockOffset * 10000n) / rangeSize) / 100;
  }

  function getBlockWidth(start: bigint, end: bigint, totalRange: { start: bigint; end: bigint }): number {
    const rangeSize = totalRange.end - totalRange.start;
    const blockSize = end - start + 1n;
    return Number((blockSize * 10000n) / rangeSize) / 100;
  }

  function formatAddress(addr: bigint, version: 4 | 6): string {
    if (version === 4) {
      // Convert bigint to IPv4 dotted decimal
      const num = Number(addr);
      return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join('.');
    } else {
      // Convert bigint to IPv6 (simplified)
      const hex = addr.toString(16).padStart(32, '0');
      return [0, 1, 2, 3, 4, 5, 6, 7]
        .map((i) => hex.substr(i * 4, 4))
        .join(':')
        .replace(/(:0{1,3})+/g, ':')
        .replace(/^:|:$/g, '')
        .replace(/::/g, '::');
    }
  }

  // Calculate on component load
  calculateGaps();
</script>

<div class="card">
  <header class="card-header">
    <h2>Free Space Finder</h2>
    <p>Discover all available address blocks within network pools</p>
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
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
          >
            <div class="example-label">{example.label}</div>
            <div class="example-preview">
              {example.pools.split('\n')[0]}
              {example.pools.includes('\n') ? '...' : ''}
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Section -->
  <section class="input-section">
    <div class="input-grid">
      <div class="input-group">
        <label for="pools" use:tooltip={'Enter network pools - one CIDR block per line (e.g., 192.168.0.0/16)'}>
          Network Pools
        </label>
        <textarea
          id="pools"
          bind:value={pools}
          oninput={handleInputChange}
          placeholder="192.168.0.0/16&#10;10.0.0.0/8"
          rows="4"
          required
        ></textarea>
      </div>

      <div class="input-group">
        <label for="allocations" use:tooltip={'Enter allocated/used blocks - one CIDR block per line'}>
          Allocated Blocks
        </label>
        <textarea
          id="allocations"
          bind:value={allocations}
          oninput={handleInputChange}
          placeholder="192.168.1.0/24&#10;192.168.10.0/24"
          rows="4"
        ></textarea>
      </div>
    </div>

    <div class="filter-section">
      <div class="input-group">
        <label
          for="target-prefix"
          use:tooltip={'Filter results to show only blocks that can accommodate the target prefix length'}
        >
          Target Prefix Length (Optional)
        </label>
        <div class="prefix-input-wrapper">
          <input
            id="target-prefix"
            type="number"
            bind:value={targetPrefix}
            oninput={handleInputChange}
            min="1"
            max="32"
            placeholder="e.g., 24"
          />
          <span class="prefix-hint">/{targetPrefix || 'xx'}</span>
          <button
            class="clear-filter"
            onclick={() => {
              targetPrefix = null;
              handleInputChange();
            }}
            aria-label="Clear filter"
          >
            <Icon name="x" size="xs" />
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Results Section -->
  {#if result}
    <section class="results-section">
      {#if result.success}
        <div class="results-header">
          <h3>Available Free Space</h3>
          <div class="results-summary">
            <span class="metric">
              <Icon name="free-blocks" size="sm" />
              {result.totalBlocks} free blocks
            </span>
            <span class="metric">
              <Icon name="network" size="sm" />
              {formatNumber(result.totalAddresses)} addresses
            </span>
          </div>
        </div>

        <!-- Address Space Visualization -->
        {#if result.availableBlocks.length > 0 && result.visualization}
          <div class="visualization-section">
            <h4>Address Space Visualization</h4>
            <div class="visualization-container">
              <div class="viz-legend">
                <div class="legend-item">
                  <div class="legend-color pools"></div>
                  <span>Network Pools</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color allocated"></div>
                  <span>Allocated Space</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color available"></div>
                  <span>Available Space</span>
                </div>
              </div>

              <div class="address-blocks">
                <!-- Pool blocks (background) -->
                {#each result.visualization.setA as pool (pool.start + pool.end)}
                  <div
                    class="address-block pool-block"
                    style="left: {getBlockPosition(
                      pool.start,
                      result.visualization.totalRange,
                    )}%; width: {getBlockWidth(pool.start, pool.end, result.visualization.totalRange)}%"
                    title="Pool: {pool.cidr ||
                      `${formatAddress(pool.start, result.visualization.version)}-${formatAddress(pool.end, result.visualization.version)}`}"
                  ></div>
                {/each}

                <!-- Allocated blocks -->
                {#each result.visualization.setB as allocation (allocation.start + allocation.end)}
                  <div
                    class="address-block allocated-block"
                    style="left: {getBlockPosition(
                      allocation.start,
                      result.visualization.totalRange,
                    )}%; width: {getBlockWidth(allocation.start, allocation.end, result.visualization.totalRange)}%"
                    title="Allocated: {allocation.cidr ||
                      `${formatAddress(allocation.start, result.visualization.version)}-${formatAddress(allocation.end, result.visualization.version)}`}"
                  ></div>
                {/each}

                <!-- Available blocks (result) -->
                {#each result.visualization.result as available (available.start + available.end)}
                  <div
                    class="address-block available-block"
                    style="left: {getBlockPosition(
                      available.start,
                      result.visualization.totalRange,
                    )}%; width: {getBlockWidth(available.start, available.end, result.visualization.totalRange)}%"
                    title="Available: {available.cidr}"
                  >
                    <span class="block-label">{available.cidr}</span>
                  </div>
                {/each}
              </div>

              <div class="address-scale">
                <span class="scale-start"
                  >{formatAddress(result.visualization.totalRange.start, result.visualization.version)}</span
                >
                <span class="scale-end"
                  >{formatAddress(result.visualization.totalRange.end, result.visualization.version)}</span
                >
              </div>
            </div>
          </div>
        {/if}
        {#if result.availableBlocks.length > 0}
          <div class="free-blocks-grid">
            {#each result.availableBlocks as block, index (index)}
              {@const blockAddresses = (() => {
                const match = block.match(/\/(\d+)$/);
                if (!match) return 0;
                const prefixLength = parseInt(match[1]);
                const version = block.includes(':') ? 6 : 4;
                const totalBits = version === 4 ? 32 : 128;
                return Math.pow(2, totalBits - prefixLength);
              })()}
              <div class="free-block-card">
                <div class="block-header">
                  <code class="block-cidr">{block}</code>
                  <button
                    class="copy-button {clipboard.isCopied(`block-${index}`) ? 'copied' : ''}"
                    onclick={() => clipboard.copy(block, `block-${index}`)}
                    aria-label="Copy CIDR block"
                  >
                    <Icon name={clipboard.isCopied(`block-${index}`) ? 'check' : 'copy'} size="xs" />
                  </button>
                </div>
                <div class="block-info">
                  <span class="address-count">
                    {formatNumber(blockAddresses)} addresses
                  </span>
                  {#if targetPrefix && blockAddresses >= Math.pow(2, 32 - targetPrefix)}
                    <span class="can-fit">
                      <Icon name="check-circle" size="xs" />
                      Can fit /{targetPrefix}
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="no-gaps">
            <Icon name="alert-circle" />
            <h4>No Available Space</h4>
            <p>All address space in the pools is allocated or there are no pools defined.</p>
          </div>
        {/if}
      {:else}
        <div class="error-message">
          <Icon name="alert-triangle" />
          <h4>Calculation Error</h4>
          <p>{result.error || 'Unknown error occurred'}</p>
        </div>
      {/if}
    </section>
  {/if}
</div>

<style lang="scss">
  .input-section {
    margin-bottom: var(--spacing-lg);
  }

  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .filter-section {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-md);
  }

  .prefix-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 200px;

    input {
      padding-right: 3rem;
    }

    .prefix-hint {
      position: absolute;
      right: 2.5rem;
      color: var(--text-secondary);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      pointer-events: none;
    }

    .clear-filter {
      position: absolute;
      right: var(--spacing-xs);
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: var(--spacing-xs);
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--surface-hover);
        color: var(--text-primary);
      }
    }
  }

  .results-section {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-lg);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-md);

    h3 {
      color: var(--color-primary);
      margin: 0;
    }
  }

  .results-summary {
    display: flex;
    gap: var(--spacing-md);
    flex-wrap: wrap;
  }

  .metric {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);

    :global(.icon) {
      color: var(--color-info);
    }
  }

  .free-blocks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .free-block-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-success);
      box-shadow: var(--shadow-sm);
    }
  }

  .block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .block-cidr {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-success);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
  }

  .copy-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
    }

    &.copied {
      color: var(--color-success);
    }
  }

  .block-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .address-count {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .can-fit {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--color-success);
    font-weight: 500;

    :global(.icon) {
      color: var(--color-success);
    }
  }

  .no-gaps {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);

    :global(.icon) {
      font-size: 2rem;
      color: var(--color-warning);
      margin-bottom: var(--spacing-md);
    }

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-sm);
    }
  }

  .error-message {
    text-align: center;
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);

    :global(.icon) {
      font-size: 1.5rem;
      color: var(--color-error);
      margin-bottom: var(--spacing-sm);
    }

    h4 {
      color: var(--color-error-light);
      margin-bottom: var(--spacing-sm);
    }
  }

  .visualization-section {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
      text-align: center;
    }
  }

  .visualization-container {
    .viz-legend {
      display: flex;
      justify-content: center;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-secondary);

      &.pools {
        background-color: var(--color-info);
        opacity: 0.3;
      }

      &.allocated {
        background-color: var(--color-error);
        opacity: 0.7;
      }

      &.available {
        background-color: var(--color-success);
      }
    }

    .address-blocks {
      position: relative;
      height: 60px;
      background-color: var(--bg-tertiary);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-md);
      overflow: hidden;
    }

    .address-block {
      position: absolute;
      height: 100%;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-xs);
      font-family: var(--font-mono);
      cursor: pointer;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 0.8;
      }

      &.pool-block {
        background-color: var(--color-info);
        opacity: 0.3;
        z-index: 1;
      }

      &.allocated-block {
        background-color: var(--color-error);
        opacity: 0.7;
        z-index: 2;
      }

      &.available-block {
        background-color: var(--color-success);
        z-index: 3;
        color: var(--bg-primary);
        font-weight: 600;

        .block-label {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
      }
    }

    .address-scale {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-xs);
      font-family: var(--font-mono);
      color: var(--text-secondary);
      padding: 0 var(--spacing-xs);
    }
  }

  @media (max-width: 768px) {
    .input-grid {
      grid-template-columns: 1fr;
    }

    .free-blocks-grid {
      grid-template-columns: 1fr;
    }

    .results-header {
      flex-direction: column;
      align-items: stretch;
    }

    .results-summary {
      justify-content: center;
    }
  }
</style>
