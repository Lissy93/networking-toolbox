<script lang="ts">
  import { splitCIDRByCount, splitCIDRByPrefix, type SplitResult } from '$lib/utils/cidr-split.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../styles/diagnostics-pages.scss';

  let inputCIDR = $state('192.168.1.0/24');
  let splitMode = $state<'count' | 'prefix'>('count');
  let subnetCount = $state(4);
  let targetPrefix = $state(26);
  let result = $state<SplitResult | null>(null);
  const clipboard = useClipboard();
  let selectedExampleIndex = $state<number | null>(null);

  const modes = [
    {
      value: 'count' as const,
      label: 'By Count',
      description: 'Split into N equal subnets',
    },
    {
      value: 'prefix' as const,
      label: 'By Prefix',
      description: 'Split to target prefix length',
    },
  ];

  const examples = [
    {
      label: 'Split /24 → 4 subnets',
      cidr: '192.168.1.0/24',
      mode: 'count' as const,
      count: 4,
    },
    {
      label: 'Split /16 → /20',
      cidr: '10.0.0.0/16',
      mode: 'prefix' as const,
      prefix: 20,
    },
    {
      label: 'IPv6 /48 → 16 subnets',
      cidr: '2001:db8::/48',
      mode: 'count' as const,
      count: 16,
    },
    {
      label: 'IPv6 /32 → /40',
      cidr: '2001:db8::/32',
      mode: 'prefix' as const,
      prefix: 40,
    },
  ];

  /* Set example */
  function setExample(example: (typeof examples)[0], index: number) {
    inputCIDR = example.cidr;
    splitMode = example.mode;
    if (example.mode === 'count') {
      subnetCount = example.count!;
    } else {
      targetPrefix = example.prefix!;
    }
    selectedExampleIndex = index;
    performSplit();
  }

  /* Clear example selection when input changes */
  function _clearExampleSelection() {
    selectedExampleIndex = null;
  }

  /* Copy all subnets */
  function copyAllSubnets() {
    if (!result?.subnets) return;
    const text = result.subnets.map((s) => s.cidr).join('\n');
    clipboard.copy(text, 'all-subnets');
  }

  /* Clear input */
  function clearInput() {
    inputCIDR = '';
    result = null;
  }

  /* Perform split */
  function performSplit() {
    if (!inputCIDR.trim()) {
      result = null;
      return;
    }

    try {
      result =
        splitMode === 'count' ? splitCIDRByCount(inputCIDR, subnetCount) : splitCIDRByPrefix(inputCIDR, targetPrefix);
    } catch (error) {
      result = {
        subnets: [],
        stats: {
          parentCIDR: '',
          childCount: 0,
          childPrefix: 0,
          addressesPerChild: '0',
          totalAddressesCovered: '0',
          utilizationPercent: 0,
        },
        visualization: {
          parentStart: 0n,
          parentEnd: 0n,
          childRanges: [],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /* Calculate visualization bar width percentage */
  function getBarWidth(childRange: { start: bigint; end: bigint; cidr: string; size: bigint }): number {
    if (!result?.visualization) return 0;
    const parentSize = result.visualization.parentEnd - result.visualization.parentStart + 1n;
    const childSize = childRange.size;
    return Number((childSize * 10000n) / parentSize) / 100;
  }

  /* Calculate visualization bar offset percentage */
  function getBarOffset(childRange: { start: bigint; end: bigint; cidr: string; size: bigint }): number {
    if (!result?.visualization) return 0;
    const parentSize = result.visualization.parentEnd - result.visualization.parentStart + 1n;
    const offset = childRange.start - result.visualization.parentStart;
    return Number((offset * 10000n) / parentSize) / 100;
  }

  /* Generate tooltip text for subnet segment */
  function getSubnetTooltipText(childRange: { start: bigint; end: bigint; cidr: string; size: bigint }): string {
    if (!result?.subnets) return childRange.cidr;

    const subnet = result.subnets.find((s) => s.cidr === childRange.cidr);
    if (!subnet) return childRange.cidr;

    return `${subnet.cidr}\nRange: ${subnet.network} - ${subnet.broadcast}\nHosts: ${subnet.totalHosts}`;
  }

  // Reactive split and example selection tracking
  $effect(() => {
    if (inputCIDR.trim()) {
      performSplit();
    }

    // Check if current input matches any example
    const matchingIndex = examples.findIndex(
      (example) =>
        example.cidr === inputCIDR &&
        example.mode === splitMode &&
        (example.mode === 'count' ? example.count === subnetCount : example.prefix === targetPrefix),
    );

    if (matchingIndex !== -1 && selectedExampleIndex !== matchingIndex) {
      selectedExampleIndex = matchingIndex;
    } else if (matchingIndex === -1 && selectedExampleIndex !== null) {
      selectedExampleIndex = null;
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h2>CIDR Subnet Splitter</h2>
    <p>Split a network into equal child subnets by count or target prefix length.</p>
  </header>

  <!-- Mode Selection -->
  <div class="mode-section">
    <h3>Split Mode</h3>
    <div class="tabs">
      {#each modes as modeOption (modeOption.value)}
        <button
          type="button"
          class="tab"
          class:active={splitMode === modeOption.value}
          onclick={() => (splitMode = modeOption.value)}
          use:tooltip={modeOption.description}
        >
          {modeOption.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Input Section -->
  <div class="input-section">
    <h3>Parent Network</h3>
    <div class="form-group">
      <label for="input-cidr" use:tooltip={'Enter IPv4 or IPv6 network in CIDR notation (e.g., 192.168.1.0/24)'}>
        Parent CIDR block
      </label>
      <div class="input-wrapper">
        <input id="input-cidr" type="text" bind:value={inputCIDR} placeholder="192.168.1.0/24" class="input-field" />
        <button
          type="button"
          class="btn btn-secondary btn-sm clear-btn"
          onclick={clearInput}
          use:tooltip={'Clear input'}
        >
          <Icon name="trash" size="sm" />
        </button>
      </div>
    </div>

    <!-- Split Parameters -->
    <div class="form-group">
      {#if splitMode === 'count'}
        <label
          for="subnet-count"
          use:tooltip={'How many equal subnets to create (will be rounded to nearest power of 2)'}
        >
          Number of subnets
        </label>
        <input id="subnet-count" type="number" bind:value={subnetCount} min="1" max="1024" class="input-field" />
      {:else}
        <label
          for="target-prefix"
          use:tooltip={'The prefix length for child subnets (must be larger than parent prefix)'}
        >
          Target prefix length
        </label>
        <input id="target-prefix" type="number" bind:value={targetPrefix} min="1" max="128" class="input-field" />
      {/if}
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (example.label)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => setExample(example, i)}
            use:tooltip={`${example.mode === 'count' ? 'Split into ' + example.count + ' subnets' : 'Split to /' + example.prefix + ' prefix'}`}
          >
            <h5>{example.cidr}</h5>
            <p>{example.label}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Results Section -->
  {#if result}
    <div class="results-section">
      {#if result.error}
        <div class="info-panel error">
          <h3>Split Error</h3>
          <p>{result.error}</p>
        </div>
      {:else if result.subnets.length > 0}
        <!-- Statistics -->
        <div class="stats-section">
          <div class="summary-header">
            <h3>Split Results</h3>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              class:copied={clipboard.isCopied('all-subnets')}
              onclick={copyAllSubnets}
            >
              <Icon name={clipboard.isCopied('all-subnets') ? 'check' : 'copy'} size="sm" />
              Copy All CIDRs
            </button>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label" use:tooltip={'The original network that was split'}>Parent Network</span>
              <span class="stat-value">{result.stats.parentCIDR}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label" use:tooltip={'Number of child subnets created'}>Child Subnets</span>
              <span class="stat-value">{result.stats.childCount}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label" use:tooltip={'Prefix length of each child subnet'}>Child Prefix</span>
              <span class="stat-value">/{result.stats.childPrefix}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label" use:tooltip={'Total IP addresses in each child subnet'}>Addresses per Child</span
              >
              <span class="stat-value">{result.stats.addressesPerChild}</span>
            </div>
            {#if result.stats.utilizationPercent < 100}
              <div class="stat-card">
                <span class="stat-label" use:tooltip={"Percentage of parent network's address space used"}
                  >Utilization</span
                >
                <span class="stat-value">{result.stats.utilizationPercent}%</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Visualization -->
        <div class="visualization-section">
          <h4>Address Space Visualization</h4>
          <div class="address-bar">
            {#each result.visualization.childRanges as childRange (childRange.cidr)}
              <div
                class="subnet-segment"
                style="width: {getBarWidth(childRange)}%; left: {getBarOffset(childRange)}%"
                use:tooltip={{ text: getSubnetTooltipText(childRange), position: 'top', delay: 300 }}
              ></div>
            {/each}
          </div>
        </div>

        <!-- Subnet List -->
        <div class="subnets-section">
          <h4>Child Subnets</h4>
          <div class="subnets-grid">
            {#each result.subnets as subnet (subnet.cidr)}
              <div class="subnet-card">
                <div class="subnet-header">
                  <code class="subnet-cidr">{subnet.cidr}</code>
                  <button
                    type="button"
                    class="btn btn-icon btn-xs"
                    class:copied={clipboard.isCopied(subnet.cidr)}
                    onclick={() => clipboard.copy(subnet.cidr, subnet.cidr)}
                  >
                    <Icon name={clipboard.isCopied(subnet.cidr) ? 'check' : 'copy'} size="xs" />
                  </button>
                </div>
                <div class="subnet-details">
                  <div class="detail-row">
                    <span class="detail-label">Network:</span>
                    <span class="detail-value">{subnet.network}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Broadcast:</span>
                    <span class="detail-value">{subnet.broadcast}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Usable:</span>
                    <span class="detail-value">{subnet.firstHost} - {subnet.lastHost}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Hosts:</span>
                    <span class="detail-value">{subnet.usableHosts}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .mode-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-md);
    }

    .tabs {
      .tab {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);

        :global(.tooltip-trigger) {
          opacity: 0.7;
          transition: opacity var(--transition-fast);

          &:hover {
            opacity: 1;
          }
        }
      }
    }
  }

  .input-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-md);
    }

    .input-wrapper {
      position: relative;

      .clear-btn {
        position: absolute;
        top: 50%;
        right: var(--spacing-sm);
        transform: translateY(-50%);
      }
    }

    .input-field {
      width: 100%;
      padding-right: 3rem;
    }
  }

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
  }

  .stats-section {
    margin-bottom: var(--spacing-lg);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .stat-card {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .visualization-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-md);
    }
  }

  .address-bar {
    position: relative;
    height: 40px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    border: 2px solid var(--border-primary);
    overflow: hidden;
    margin-bottom: var(--spacing-sm);
  }

  .subnet-segment {
    position: absolute;
    height: 100%;
    background: linear-gradient(45deg, var(--color-primary), var(--color-primary-hover));
    border-right: 3px solid var(--bg-primary);
    transition: all var(--transition-fast);
    opacity: 0.85;
    cursor: pointer;

    &:hover {
      filter: brightness(1.1);
      opacity: 1;
      z-index: 2;
    }

    &:last-child {
      border-right: none;
    }
  }

  .subnets-section {
    h4 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-md);
    }
  }

  .subnets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .subnet-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .subnet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-secondary);
  }

  .subnet-cidr {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-primary);
    font-size: var(--font-size-md);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    flex: 1;
  }

  .subnet-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .detail-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    min-width: 80px;
  }

  .detail-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    flex: 1;
    text-align: right;
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

  .btn {
    &.copied {
      color: var(--color-success);
      background-color: rgba(35, 134, 54, 0.1);
      border-color: var(--color-success);
    }

    :global(.icon) {
      width: 1rem;
      height: 1rem;
    }

    &.btn-xs :global(.icon) {
      width: 0.75rem;
      height: 0.75rem;
    }
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .subnets-grid {
      grid-template-columns: 1fr;
    }

    .examples-grid {
      grid-template-columns: 1fr;
    }

    .summary-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .detail-row {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }
  }
</style>
