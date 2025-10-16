<script lang="ts">
  import {
    findNextAvailableSubnet,
    type NextAvailableInput,
    type NextAvailableResult,
    type AllocationPolicy,
  } from '$lib/utils/next-available.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import _Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';

  let pools = $state(`192.168.0.0/16
10.0.0.0/8`);
  let allocations = $state(`192.168.1.0/24
192.168.10.0/24
10.0.0.0/16`);
  let searchMode = $state<'prefix' | 'hosts'>('prefix');
  let desiredPrefix = $state(24);
  let desiredHostCount = $state(254);
  let ipv4UsableHosts = $state(true);
  let policy = $state<AllocationPolicy>('first-fit');
  let maxCandidates = $state(5);
  let result = $state<NextAvailableResult | null>(null);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let userModified = $state(false);
  let showVisualization = $state(true);

  const examples = [
    {
      label: 'Office Subnets',
      pools: '192.168.0.0/16',
      allocations: `192.168.1.0/24
192.168.10.0/24
192.168.100.0/24`,
      mode: 'prefix' as const,
      prefix: 24,
      policy: 'first-fit' as AllocationPolicy,
    },
    {
      label: 'Host-based Search',
      pools: '10.0.0.0/8',
      allocations: `10.0.0.0/16
10.1.0.0/16`,
      mode: 'hosts' as const,
      hosts: 1000,
      policy: 'best-fit' as AllocationPolicy,
    },
    {
      label: 'Multiple Pools',
      pools: `172.16.0.0/12
192.168.0.0/16`,
      allocations: `172.16.1.0/24
192.168.100.0/24`,
      mode: 'prefix' as const,
      prefix: 22,
      policy: 'first-fit' as AllocationPolicy,
    },
    {
      label: 'IPv6 Example',
      pools: '2001:db8::/32',
      allocations: `2001:db8:1::/48
2001:db8:10::/48`,
      mode: 'prefix' as const,
      prefix: 48,
      policy: 'first-fit' as AllocationPolicy,
    },
  ];

  /* Set example */
  function setExample(example: (typeof examples)[0]) {
    pools = example.pools;
    allocations = example.allocations;
    searchMode = example.mode;
    policy = example.policy;

    if (example.mode === 'prefix') {
      desiredPrefix = example.prefix!;
    } else {
      desiredHostCount = example.hosts!;
    }

    selectedExample = example.label;
    userModified = false;
    performSearch();
  }

  /* Export results */
  function exportResults(format: 'csv' | 'json') {
    if (!result || result.candidates.length === 0) return;

    let content = '';
    if (format === 'json') {
      content = JSON.stringify(
        {
          candidates: result.candidates,
          stats: result.stats,
          freeSpace: result.freeSpaceBlocks,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      );
    } else {
      const headers = ['Rank', 'CIDR', 'Network', 'Broadcast', 'Size', 'Usable Hosts', 'Parent Pool', 'Gap Size'];
      const rows = result.candidates.map((candidate, i) => [
        (i + 1).toString(),
        `"${candidate.cidr}"`,
        `"${candidate.network}"`,
        `"${candidate.broadcast}"`,
        candidate.size,
        candidate.usableHosts,
        `"${candidate.parentPool}"`,
        candidate.gapSize,
      ]);

      content = [headers, ...rows].map((row) => row.join(',')).join('\n');
    }

    clipboard.copy(content, `export-${format}`);
  }

  /* Clear inputs */
  function clearInputs() {
    pools = '';
    allocations = '';
    result = null;
  }

  /* Perform search */
  function performSearch() {
    if (!pools.trim()) {
      result = null;
      return;
    }

    const input: NextAvailableInput = {
      pools,
      allocations,
      desiredPrefix: searchMode === 'prefix' ? desiredPrefix : undefined,
      desiredHostCount: searchMode === 'hosts' ? desiredHostCount : undefined,
      ipv4UsableHosts,
      policy,
      maxCandidates,
    };

    result = findNextAvailableSubnet(input);
  }

  /* Calculate visualization bar width percentage */
  function getBarWidth(range: { start: bigint; end: bigint }): number {
    if (!result?.visualization || !showVisualization) return 0;
    const totalSize = result.visualization.totalRange.end - result.visualization.totalRange.start + 1n;
    const rangeSize = range.end - range.start + 1n;
    return Number((rangeSize * 10000n) / totalSize) / 100;
  }

  /* Calculate visualization bar offset percentage */
  function getBarOffset(range: { start: bigint; end: bigint }): number {
    if (!result?.visualization || !showVisualization) return 0;
    const totalSize = result.visualization.totalRange.end - result.visualization.totalRange.start + 1n;
    const offset = range.start - result.visualization.totalRange.start;
    return Number((offset * 10000n) / totalSize) / 100;
  }

  /* Generate tooltip text for visualization segments */
  function getSegmentTooltip(
    range: { cidr: string; start?: bigint; end?: bigint },
    type: 'pool' | 'allocation' | 'free' | 'candidate',
  ): string {
    const labels = {
      pool: 'Pool',
      allocation: 'Allocation',
      free: 'Free Space',
      candidate: 'Candidate',
    };

    const size = range.start && range.end ? formatNumber(Number(range.end - range.start + 1n)) : 'Unknown';
    return `${labels[type]}\n${range.cidr}\nSize: ${size} addresses`;
  }

  // Track user modifications
  $effect(() => {
    if (userModified) {
      selectedExample = null;
    }
  });

  // Reactive computation
  $effect(() => {
    if (pools.trim()) {
      performSearch();
    }
  });

  // Auto-hide visualization for complex results
  $effect(() => {
    if (result?.visualization) {
      const totalSegments =
        result.visualization.pools.length +
        result.visualization.allocations.length +
        result.visualization.freeSpace.length;
      showVisualization = totalSegments <= 50;
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h2>Next Available Subnet Finder</h2>
    <p>
      Find available subnets from pool CIDRs minus existing allocations with first-fit or best-fit allocation policies.
    </p>
  </header>

  <!-- Search Mode -->
  <div class="mode-section">
    <h3>Search Criteria</h3>
    <div class="tabs">
      <button
        type="button"
        class="tab"
        class:active={searchMode === 'prefix'}
        onclick={() => {
          searchMode = 'prefix';
          userModified = true;
        }}
        use:tooltip={{ text: 'Search for subnets with specific prefix length (e.g., /24)', position: 'top' }}
      >
        By Prefix
      </button>
      <button
        type="button"
        class="tab"
        class:active={searchMode === 'hosts'}
        onclick={() => {
          searchMode = 'hosts';
          userModified = true;
        }}
        use:tooltip={{ text: 'Search for subnets that can accommodate N hosts', position: 'top' }}
      >
        By Host Count
      </button>
    </div>
  </div>

  <!-- Input Section -->
  <div class="input-section">
    <div class="input-grid">
      <div class="input-group">
        <label for="pools" use:tooltip={{ text: 'Available IP address pools (one per line)', position: 'top' }}>
          Pool CIDRs
        </label>
        <textarea
          id="pools"
          bind:value={pools}
          oninput={() => (userModified = true)}
          placeholder="192.168.0.0/16&#10;10.0.0.0/8"
          class="input-textarea pools"
          rows="4"
        ></textarea>
      </div>

      <div class="input-group">
        <label
          for="allocations"
          use:tooltip={{ text: 'Already allocated subnets/ranges (optional, one per line)', position: 'top' }}
        >
          Existing Allocations
        </label>
        <textarea
          id="allocations"
          bind:value={allocations}
          oninput={() => (userModified = true)}
          placeholder="192.168.1.0/24&#10;10.0.0.0/16"
          class="input-textarea allocations"
          rows="4"
        ></textarea>
      </div>
    </div>

    <!-- Search Parameters -->
    <div class="params-grid">
      {#if searchMode === 'prefix'}
        <div class="input-group">
          <label
            for="desired-prefix"
            use:tooltip={{ text: 'Desired subnet prefix (e.g., 24 for /24 subnets)', position: 'top' }}
          >
            Target Prefix Length
          </label>
          <input
            id="desired-prefix"
            type="number"
            bind:value={desiredPrefix}
            oninput={() => (userModified = true)}
            min="1"
            max="128"
            class="input-field"
          />
        </div>
      {:else}
        <div class="input-group">
          <label
            for="desired-hosts"
            use:tooltip={{ text: 'Minimum number of hosts the subnet must accommodate', position: 'top' }}
          >
            Required Host Count
          </label>
          <input
            id="desired-hosts"
            type="number"
            bind:value={desiredHostCount}
            oninput={() => (userModified = true)}
            min="1"
            class="input-field"
          />
        </div>
      {/if}

      <div class="input-group">
        <label
          for="policy"
          use:tooltip={{ text: 'First-fit: lowest address. Best-fit: smallest gap.', position: 'top' }}
        >
          Allocation Policy
        </label>
        <select id="policy" bind:value={policy} onchange={() => (userModified = true)} class="input-field">
          <option value="first-fit">First Fit (Lowest)</option>
          <option value="best-fit">Best Fit (Smallest Gap)</option>
        </select>
      </div>

      <div class="input-group">
        <label
          for="max-candidates"
          use:tooltip={{ text: 'Maximum number of subnet suggestions to return', position: 'top' }}
        >
          Max Candidates
        </label>
        <input
          id="max-candidates"
          type="number"
          bind:value={maxCandidates}
          oninput={() => (userModified = true)}
          min="1"
          max="20"
          class="input-field"
        />
      </div>
    </div>

    <!-- Options -->
    <div class="options-section">
      <label
        class="checkbox-label"
        use:tooltip={{ text: 'For IPv4, treat network and broadcast addresses as unusable', position: 'top' }}
      >
        <input type="checkbox" bind:checked={ipv4UsableHosts} onchange={() => (userModified = true)} />
        <span class="checkbox-text"> IPv4 usable hosts (exclude network/broadcast) </span>
      </label>
    </div>

    <div class="input-actions">
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        onclick={clearInputs}
        use:tooltip={{ text: 'Clear all inputs', position: 'top' }}
      >
        <Icon name="trash" size="sm" />
      </button>
    </div>

    <!-- Examples -->
    <div class="examples-section">
      <h4>Quick Examples</h4>
      <div class="examples-grid">
        {#each examples as example (example.label)}
          <button
            type="button"
            class="example-btn"
            class:selected={selectedExample === example.label}
            onclick={() => setExample(example)}
          >
            {example.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Results Section -->
  {#if result}
    <div class="results-section">
      <!-- Errors -->
      {#if result.errors.length > 0}
        <div class="info-panel error">
          <h3>Errors</h3>
          <ul>
            {#each result.errors as error, index (index)}
              <li>{error}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Warnings -->
      {#if result.warnings.length > 0}
        <div class="info-panel warning">
          <h3>Warnings</h3>
          <ul>
            {#each result.warnings as warning, index (index)}
              <li>{warning}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if result.candidates.length > 0}
        <!-- Statistics -->
        <div class="stats-section">
          <div class="summary-header">
            <h3>Available Subnets</h3>
            <div class="export-buttons">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                class:copied={clipboard.isCopied('export-csv')}
                onclick={() => exportResults('csv')}
              >
                <Icon name={clipboard.isCopied('export-csv') ? 'check' : 'download'} size="sm" />
                CSV
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                class:copied={clipboard.isCopied('export-json')}
                onclick={() => exportResults('json')}
              >
                <Icon name={clipboard.isCopied('export-json') ? 'check' : 'download'} size="sm" />
                JSON
              </button>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card pools">
              <span class="stat-label">Total Pools</span>
              <span class="stat-value">{result.stats.totalPools}</span>
              <span class="stat-detail">address pools</span>
            </div>
            <div class="stat-card free-space">
              <span class="stat-label">Free Space</span>
              <span class="stat-value">{result.stats.totalFreeSpace}</span>
              <span class="stat-detail">addresses available</span>
            </div>
            <div class="stat-card requested">
              <span class="stat-label">Requested Size</span>
              <span class="stat-value">/{result.stats.requestedPrefix}</span>
              <span class="stat-detail">{result.stats.requestedSize} addresses</span>
            </div>
            <div class="stat-card fragmentation">
              <span class="stat-label">Fragmentation</span>
              <span class="stat-value">{result.stats.fragmentationCount}</span>
              <span class="stat-detail">free blocks</span>
            </div>
          </div>
        </div>

        <!-- Visualization -->
        {#if showVisualization && result.visualization}
          <div class="visualization-section">
            <div class="viz-header">
              <h4>Address Space Visualization</h4>
              <button
                type="button"
                class="btn btn-secondary btn-xs"
                onclick={() => (showVisualization = !showVisualization)}
              >
                <Icon name="hide" size="sm" />
                Hide
              </button>
            </div>

            <div class="visualization-stack">
              <!-- Pools (background) -->
              <div class="viz-bar pools-bar">
                <div class="bar-label">Pools</div>
                <div class="bar-segments">
                  {#each result.visualization.pools as pool, poolIndex (`${pool.cidr}-${poolIndex}`)}
                    <div
                      class="viz-segment pool-segment"
                      style="width: {getBarWidth(pool)}%; left: {getBarOffset(pool)}%"
                      use:tooltip={{ text: getSegmentTooltip(pool, 'pool'), position: 'top' }}
                    ></div>
                  {/each}
                </div>
              </div>

              <!-- Allocations (overlay) -->
              <div class="viz-bar allocations-bar">
                <div class="bar-label">Allocated</div>
                <div class="bar-segments">
                  {#each result.visualization.allocations as allocation, allocIndex (`${allocation.cidr}-${allocIndex}`)}
                    <div
                      class="viz-segment allocation-segment"
                      style="width: {getBarWidth(allocation)}%; left: {getBarOffset(allocation)}%"
                      use:tooltip={{ text: getSegmentTooltip(allocation, 'allocation'), position: 'top' }}
                    ></div>
                  {/each}
                </div>
              </div>

              <!-- Free space -->
              <div class="viz-bar free-bar">
                <div class="bar-label">Free</div>
                <div class="bar-segments">
                  {#each result.visualization.freeSpace as free, freeIndex (`${free.cidr}-${freeIndex}`)}
                    <div
                      class="viz-segment free-segment"
                      style="width: {getBarWidth(free)}%; left: {getBarOffset(free)}%"
                      use:tooltip={{ text: getSegmentTooltip(free, 'free'), position: 'top' }}
                    ></div>
                  {/each}
                </div>
              </div>

              <!-- Candidates (highlights) -->
              <div class="viz-bar candidates-bar">
                <div class="bar-label">Candidates</div>
                <div class="bar-segments">
                  {#each result.visualization.candidates as candidate, i (`${candidate.cidr}-${i}`)}
                    <div
                      class="viz-segment candidate-segment"
                      class:primary={i === 0}
                      style="width: {getBarWidth(candidate)}%; left: {getBarOffset(candidate)}%"
                      use:tooltip={{ text: getSegmentTooltip(candidate, 'candidate'), position: 'bottom' }}
                    ></div>
                  {/each}
                </div>
              </div>
            </div>

            <div class="viz-legend">
              <div class="legend-item">
                <div class="legend-color pool-color"></div>
                <span>Pools</span>
              </div>
              <div class="legend-item">
                <div class="legend-color allocation-color"></div>
                <span>Allocations</span>
              </div>
              <div class="legend-item">
                <div class="legend-color free-color"></div>
                <span>Free Space</span>
              </div>
              <div class="legend-item">
                <div class="legend-color candidate-color"></div>
                <span>Candidates</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Candidate Subnets -->
        <div class="candidates-section">
          <h4>Candidate Subnets ({result.candidates.length})</h4>
          <div class="candidates-grid">
            {#each result.candidates as candidate, i (`${candidate.cidr}-${i}`)}
              <div class="candidate-card" class:primary={i === 0}>
                <div class="candidate-header">
                  <div class="candidate-rank">#{i + 1}</div>
                  <code class="candidate-cidr">{candidate.cidr}</code>
                  <button
                    type="button"
                    class="btn btn-icon btn-xs"
                    class:copied={clipboard.isCopied(candidate.cidr)}
                    onclick={() => clipboard.copy(candidate.cidr, candidate.cidr)}
                  >
                    <Icon name={clipboard.isCopied(candidate.cidr) ? 'check' : 'copy'} size="xs" />
                  </button>
                </div>
                <div class="candidate-details">
                  <div class="detail-row">
                    <span class="detail-label">Range:</span>
                    <span class="detail-value">{candidate.network} - {candidate.broadcast}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Hosts:</span>
                    <span class="detail-value">{candidate.usableHosts} usable / {candidate.size} total</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Pool:</span>
                    <span class="detail-value pool-name">{candidate.parentPool}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Gap:</span>
                    <span class="detail-value">{candidate.gapSize} addresses</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Free Space Summary -->
        {#if result.freeSpaceBlocks.length > 0}
          <div class="free-space-section">
            <h4>Free Space Blocks ({result.freeSpaceBlocks.length})</h4>
            <div class="free-blocks-grid">
              {#each result.freeSpaceBlocks.slice(0, 10) as block, blockIndex (`${block.cidr}-${blockIndex}`)}
                <div class="free-block-card">
                  <code class="block-cidr">{block.cidr}</code>
                  <div class="block-info">
                    <span class="block-size">{block.size} addresses</span>
                    <span class="block-pool">from {block.parentPool}</span>
                  </div>
                </div>
              {/each}
            </div>
            {#if result.freeSpaceBlocks.length > 10}
              <div class="more-blocks">
                <Icon name="info" size="sm" />
                Showing first 10 of {result.freeSpaceBlocks.length} free blocks
              </div>
            {/if}
          </div>
        {/if}
      {:else}
        <div class="info-panel info">
          <h3>No Available Subnets</h3>
          <p>No subnets of the requested size were found in the available free space. Try:</p>
          <ul>
            <li>Reducing the subnet size (higher prefix number)</li>
            <li>Adding more pools</li>
            <li>Removing unnecessary allocations</li>
            <li>Using a different allocation policy</li>
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  /* Reusable tokens */
  %section-title {
    color: var(--color-primary);
    margin-bottom: var(--spacing-md);
  }

  %bg-surface {
    background-color: var(--bg-secondary);
  }

  /* Mode section */
  .mode-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      @extend %section-title;
    }

    .tabs {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
      max-width: 20rem;

      .tab {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        max-width: 12rem;

        &.active {
          outline: 2px solid var(--color-primary);
          outline-offset: -2px;
        }
      }
    }
  }

  /* Input section */
  .input-section {
    margin-bottom: var(--spacing-lg);

    .input-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-md);
    }

    .params-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .input-group {
      label {
        display: block;
        margin-bottom: var(--spacing-sm);
        font-weight: 600;
        color: var(--text-primary);
        cursor: pointer;
      }
    }

    .input-textarea {
      &.pools {
        border-left: 4px solid var(--color-primary);
      }
      &.allocations {
        border-left: 4px solid var(--color-primary);
      }
    }

    .options-section {
      margin: var(--spacing-md) 0;

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
        padding: var(--spacing-sm);
        background-color: var(--bg-secondary);
        border-radius: var(--radius-sm);
        transition: all var(--transition-fast);
        width: fit-content;

        &:hover {
          background-color: var(--surface-hover);
        }

        input[type='checkbox'] {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          cursor: pointer;
          accent-color: var(--color-primary);
        }

        .checkbox-text {
          color: var(--text-primary);
          font-size: var(--font-size-sm);
          line-height: 1.4;
        }
      }
    }

    .input-actions {
      display: flex;
      justify-content: end;
    }
  }

  /* Examples */
  .examples-section {
    margin-top: var(--spacing-lg);

    h4 {
      @extend %section-title;
    }

    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--spacing-sm);
    }

    .example-btn {
      padding: var(--spacing-sm);
      background-color: var(--bg-tertiary);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      transition: all var(--transition-fast);

      &.selected {
        outline: 2px solid var(--color-primary);
        outline-offset: -2px;
        background-color: var(--surface-hover);
      }

      &:hover {
        background-color: var(--surface-hover);
        border-color: var(--color-primary);
        transform: translateY(-1px);
      }
    }
  }

  /* Results */
  .results-section {
    border-top: 2px solid var(--border-secondary);
    padding-top: var(--spacing-lg);
  }

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    h3 {
      color: var(--color-primary);
      margin: 0;
    }

    .export-buttons {
      display: flex;
      gap: var(--spacing-sm);
    }
  }

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .stat-card {
    @extend %bg-surface;
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    border-left: 4px solid var(--color-primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-primary);
    margin-bottom: var(--spacing-xs);
    word-break: break-all;
  }

  .stat-detail {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  /* Visualization */
  .visualization-section {
    margin-bottom: var(--spacing-lg);

    .viz-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);

      h4 {
        @extend %section-title;
        margin: 0;
      }
    }
  }

  .visualization-stack {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-md);
    border: 2px solid var(--border-primary);
    margin-bottom: var(--spacing-md);
  }

  .viz-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    .bar-label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-secondary);
      width: 80px;
      text-align: right;
    }

    .bar-segments {
      flex: 1;
      position: relative;
      height: 20px;
      background-color: var(--bg-primary);
      border-radius: var(--radius-xs);
      border: 1px solid var(--border-primary);
    }
  }

  .viz-segment {
    position: absolute;
    height: 100%;
    cursor: pointer;
    transition: all var(--transition-fast);

    &.pool-segment {
      background-color: var(--color-info);
      opacity: 0.6;
    }

    &.allocation-segment {
      background-color: var(--color-error);
      opacity: 0.8;
      top: 10%;
      height: 80%;
    }

    &.free-segment {
      background-color: var(--color-success);
      opacity: 0.7;
    }

    &.candidate-segment {
      background-color: var(--color-warning);
      opacity: 0.9;
      border: 1px solid var(--bg-primary);

      &.primary {
        background-color: var(--color-primary);
        opacity: 1;
      }
    }

    &:hover {
      filter: brightness(1.1);
      z-index: 10;
    }
  }

  .viz-legend {
    display: flex;
    justify-content: center;
    gap: var(--spacing-lg);

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: var(--font-size-sm);

      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: var(--radius-xs);

        &.pool-color {
          background-color: var(--color-info);
          opacity: 0.6;
        }
        &.allocation-color {
          background-color: var(--color-error);
          opacity: 0.8;
        }
        &.free-color {
          background-color: var(--color-success);
          opacity: 0.7;
        }
        &.candidate-color {
          background-color: var(--color-primary);
        }
      }
    }
  }

  /* Candidates */
  .candidates-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      @extend %section-title;
    }
  }

  .candidates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--spacing-md);
  }

  .candidate-card {
    @extend %bg-surface;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    padding: var(--spacing-md);

    &.primary {
      border-color: var(--color-primary);
      border-width: 2px;

      .candidate-rank {
        background-color: var(--color-primary);
        color: var(--bg-primary);
      }
    }

    .candidate-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);

      .candidate-rank {
        background-color: var(--bg-tertiary);
        color: var(--text-secondary);
        padding: 2px var(--spacing-xs);
        border-radius: var(--radius-xs);
        font-size: var(--font-size-xs);
        font-weight: 600;
        min-width: 28px;
        text-align: center;
      }

      .candidate-cidr {
        font-family: var(--font-mono);
        font-size: var(--font-size-md);
        color: var(--color-primary);
        font-weight: 600;
        flex: 1;
      }
    }

    .candidate-details {
      font-size: var(--font-size-sm);

      .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-xs);

        .detail-label {
          font-weight: 600;
          color: var(--text-secondary);
          min-width: 50px;
        }

        .detail-value {
          font-family: var(--font-mono);
          color: var(--text-primary);
          text-align: right;

          &.pool-name {
            font-family: var(--font-mono);
            font-size: var(--font-size-xs);
          }
        }
      }
    }
  }

  /* Free Space */
  .free-space-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      @extend %section-title;
    }
  }

  .free-blocks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .free-block-card {
    @extend %bg-surface;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-secondary);

    .block-cidr {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--color-success);
      font-weight: 600;
    }

    .block-info {
      display: flex;
      justify-content: space-between;
      margin-top: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--text-secondary);

      .block-size {
        font-family: var(--font-mono);
      }

      .block-pool {
        text-align: right;
      }
    }
  }

  .more-blocks {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    justify-content: center;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);

    :global(.icon) {
      color: var(--color-info);
    }
  }

  /* Shared styles */
  .btn {
    &.copied {
      color: var(--color-success);
      background-color: rgba(35, 134, 54, 0.1);
      border-color: var(--color-success);
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .input-grid {
      grid-template-columns: 1fr;
    }

    .params-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .examples-grid {
      grid-template-columns: 1fr;
    }

    .summary-header,
    .viz-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .candidates-grid,
    .free-blocks-grid {
      grid-template-columns: 1fr;
    }

    .viz-bar {
      flex-direction: column;
      gap: var(--spacing-xs);

      .bar-label {
        width: auto;
        text-align: left;
      }
    }

    .viz-legend {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }
  }
</style>
