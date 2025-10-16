<script lang="ts">
  import { computeCIDROverlap, type OverlapResult } from '$lib/utils/cidr-overlap.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';

  let setA = $state(`192.168.1.0/24
10.0.0.0/16`);
  let setB = $state(`192.168.1.128/25
10.0.1.0/24`);
  let mergeInputs = $state(true);
  let showOnlyBoolean = $state(false);
  let result = $state<OverlapResult | null>(null);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let userModified = $state(false);

  const examples = [
    {
      label: 'Basic Overlap',
      setA: '192.168.1.0/24',
      setB: '192.168.1.128/25',
    },
    {
      label: 'No Overlap',
      setA: '192.168.1.0/24',
      setB: '192.168.2.0/24',
    },
    {
      label: 'Partial Overlap',
      setA: `192.168.1.0/25
192.168.2.0/24`,
      setB: `192.168.1.64/26
192.168.3.0/24`,
    },
    {
      label: 'IPv6 Overlap',
      setA: '2001:db8::/48',
      setB: '2001:db8:1::/64',
    },
  ];

  /* Set example */
  function setExample(example: (typeof examples)[0]) {
    setA = example.setA;
    setB = example.setB;
    selectedExample = example.label;
    userModified = false;
    performOverlapCheck();
  }

  /* Copy all results */
  function copyAllResults(format: 'text' | 'json') {
    if (!result) return;

    let content = '';
    if (format === 'json') {
      content = JSON.stringify(
        {
          hasOverlap: result.hasOverlap,
          ipv4: result.ipv4,
          ipv6: result.ipv6,
          stats: result.stats,
        },
        null,
        2,
      );
    } else {
      const lines = [`Overlap: ${result.hasOverlap ? 'Yes' : 'No'}`];
      if (result.ipv4.length > 0) {
        lines.push('IPv4 Intersection:', ...result.ipv4);
      }
      if (result.ipv6.length > 0) {
        lines.push('IPv6 Intersection:', ...result.ipv6);
      }
      content = lines.join('\n');
    }

    clipboard.copy(content, `all-${format}`);
  }

  /* Clear inputs */
  function clearInputs() {
    setA = '';
    setB = '';
    result = null;
  }

  /* Perform overlap check */
  function performOverlapCheck() {
    if (!setA.trim() && !setB.trim()) {
      result = null;
      return;
    }

    try {
      result = computeCIDROverlap(setA, setB, mergeInputs);
    } catch (error) {
      result = {
        hasOverlap: false,
        ipv4: [],
        ipv6: [],
        stats: {
          setA: { count: 0, addresses: '0' },
          setB: { count: 0, addresses: '0' },
          intersection: { count: 0, addresses: '0' },
          overlapPercent: 0,
        },
        visualization: { setA: [], setB: [], intersection: [], version: 4, totalRange: { start: 0n, end: 0n } },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /* Calculate visualization bar width percentage */
  function getBarWidth(range: { start: bigint; end: bigint }): number {
    if (!result?.visualization.totalRange) return 0;
    const totalSize = result.visualization.totalRange.end - result.visualization.totalRange.start + 1n;
    const rangeSize = range.end - range.start + 1n;
    return Number((rangeSize * 10000n) / totalSize) / 100;
  }

  /* Calculate visualization bar offset percentage */
  function getBarOffset(range: { start: bigint; end: bigint }): number {
    if (!result?.visualization.totalRange) return 0;
    const totalSize = result.visualization.totalRange.end - result.visualization.totalRange.start + 1n;
    const offset = range.start - result.visualization.totalRange.start;
    return Number((offset * 10000n) / totalSize) / 100;
  }

  /* Generate tooltip text for visualization segments */
  function getSegmentTooltip(
    range: { start: bigint; end: bigint; cidr?: string },
    type: 'A' | 'B' | 'intersection',
  ): string {
    const version = result?.visualization.version || 4;
    const startIP =
      version === 4
        ? [
            Math.floor(Number(range.start) / 16777216) % 256,
            Math.floor(Number(range.start) / 65536) % 256,
            Math.floor(Number(range.start) / 256) % 256,
            Number(range.start) % 256,
          ].join('.')
        : 'IPv6';
    const endIP =
      version === 4
        ? [
            Math.floor(Number(range.end) / 16777216) % 256,
            Math.floor(Number(range.end) / 65536) % 256,
            Math.floor(Number(range.end) / 256) % 256,
            Number(range.end) % 256,
          ].join('.')
        : 'IPv6';
    const size = range.end - range.start + 1n;

    const label = type === 'A' ? 'Set A' : type === 'B' ? 'Set B' : 'Intersection';

    return `${label}\nRange: ${startIP} - ${endIP}\nSize: ${formatNumber(Number(size))}${range.cidr ? `\nCIDR: ${range.cidr}` : ''}`;
  }

  // Track user modifications
  $effect(() => {
    if (userModified) {
      selectedExample = null;
    }
  });

  // Reactive computation
  $effect(() => {
    if (setA.trim() || setB.trim()) {
      performOverlapCheck();
    }
  });
</script>

<!-- Options -->
<div class="options-section">
  <h3>Options</h3>
  <div class="options-grid">
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={mergeInputs} onchange={() => (userModified = true)} />
      <span class="checkbox-text">
        Merge overlapping inputs first
        <Tooltip text="Combine overlapping ranges within each set before comparison">
          <Icon name="help" size="sm" />
        </Tooltip>
      </span>
    </label>
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={showOnlyBoolean} onchange={() => (userModified = true)} />
      <span class="checkbox-text">
        Show only boolean result
        <Tooltip text="Display just yes/no overlap instead of detailed intersection blocks">
          <Icon name="help" size="sm" />
        </Tooltip>
      </span>
    </label>
  </div>
</div>

<!-- Input Section -->
<div class="input-section">
  <div class="input-grid">
    <!-- Set A -->
    <div class="input-group">
      <h3>
        Set A
        <Tooltip text="First set of IP addresses, CIDR blocks, or ranges">
          <Icon name="help" size="sm" />
        </Tooltip>
      </h3>
      <div class="input-wrapper">
        <textarea
          bind:value={setA}
          oninput={() => (userModified = true)}
          placeholder="192.168.1.0/24&#10;10.0.0.0-10.0.0.100"
          class="input-textarea set-a"
          rows="6"
        ></textarea>
      </div>
    </div>

    <!-- Set B -->
    <div class="input-group">
      <h3>
        Set B
        <Tooltip text="Second set of IP addresses, CIDR blocks, or ranges">
          <Icon name="help" size="sm" />
        </Tooltip>
      </h3>
      <div class="input-wrapper">
        <textarea
          bind:value={setB}
          oninput={() => (userModified = true)}
          placeholder="192.168.1.128/25&#10;10.0.0.50-10.0.0.150"
          class="input-textarea set-b"
          rows="6"
        ></textarea>
      </div>
    </div>
  </div>

  <div class="input-actions">
    <button type="button" class="btn btn-secondary btn-sm" onclick={clearInputs}>
      <Icon name="trash" size="sm" />
      Clear All
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
    {#if result.errors.length > 0}
      <div class="info-panel error">
        <h3>Parse Errors</h3>
        <ul class="error-list">
          {#each result.errors as error (error)}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Overlap Status -->
    <div class="status-section">
      <div class="status-card {result.hasOverlap ? 'overlap' : 'no-overlap'}">
        <div class="status-icon">
          <Icon name={result.hasOverlap ? 'check-circle' : 'x-circle'} size="lg" />
        </div>
        <div class="status-content">
          <h3>{result.hasOverlap ? 'Overlap Detected' : 'No Overlap'}</h3>
          <p>
            {result.hasOverlap
              ? `Sets A and B have overlapping address ranges (${result.stats.overlapPercent}% of smaller set)`
              : 'Sets A and B do not share any common address ranges'}
          </p>
        </div>
      </div>
    </div>

    {#if !showOnlyBoolean && (result.ipv4.length > 0 || result.ipv6.length > 0)}
      <!-- Statistics -->
      <div class="stats-section">
        <div class="summary-header">
          <h3>Intersection Results (A ∩ B)</h3>
          <div class="export-buttons">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              class:copied={clipboard.isCopied('all-text')}
              onclick={() => copyAllResults('text')}
            >
              <Icon name={clipboard.isCopied('all-text') ? 'check' : 'copy'} size="sm" />
              Text
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              class:copied={clipboard.isCopied('all-json')}
              onclick={() => copyAllResults('json')}
            >
              <Icon name={clipboard.isCopied('all-json') ? 'check' : 'download'} size="sm" />
              JSON
            </button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card set-a">
            <span class="stat-label">Set A</span>
            <span class="stat-value">{result.stats.setA.count} items</span>
            <span class="stat-detail">{result.stats.setA.addresses} addresses</span>
          </div>
          <div class="stat-card set-b">
            <span class="stat-label">Set B</span>
            <span class="stat-value">{result.stats.setB.count} items</span>
            <span class="stat-detail">{result.stats.setB.addresses} addresses</span>
          </div>
          <div class="stat-card intersection">
            <span class="stat-label">Intersection</span>
            <span class="stat-value">{result.stats.intersection.count} CIDRs</span>
            <span class="stat-detail">{result.stats.intersection.addresses} addresses</span>
          </div>
          <div class="stat-card overlap-percent">
            <span class="stat-label">Overlap</span>
            <span class="stat-value">{result.stats.overlapPercent}%</span>
            <span class="stat-detail">of smaller set</span>
          </div>
        </div>
      </div>

      <!-- Visualization -->
      {#if result.visualization.setA.length > 0 || result.visualization.setB.length > 0}
        <div class="visualization-section">
          <h4>Overlap Visualization</h4>
          <div class="viz-legend">
            <div class="legend-item">
              <div class="legend-color set-a-color"></div>
              <span>Set A</span>
            </div>
            <div class="legend-item">
              <div class="legend-color set-b-color"></div>
              <span>Set B</span>
            </div>
            <div class="legend-item">
              <div class="legend-color intersection-color"></div>
              <span>Intersection (A ∩ B)</span>
            </div>
          </div>

          <div class="visualization-stack">
            <!-- Set A Bar -->
            <div class="viz-bar set-a-bar">
              <div class="bar-label">Set A</div>
              <div class="bar-segments">
                {#each result.visualization.setA as range (`${range.start}-${range.end}`)}
                  <div
                    class="viz-segment set-a-segment"
                    style="width: {getBarWidth(range)}%; left: {getBarOffset(range)}%"
                    use:tooltip={{ text: getSegmentTooltip(range, 'A'), position: 'top' }}
                  ></div>
                {/each}
              </div>
            </div>

            <!-- Set B Bar -->
            <div class="viz-bar set-b-bar">
              <div class="bar-label">Set B</div>
              <div class="bar-segments">
                {#each result.visualization.setB as range (`${range.start}-${range.end}`)}
                  <div
                    class="viz-segment set-b-segment"
                    style="width: {getBarWidth(range)}%; left: {getBarOffset(range)}%"
                    use:tooltip={{ text: getSegmentTooltip(range, 'B'), position: 'top' }}
                  ></div>
                {/each}
              </div>
            </div>

            <!-- Intersection Highlights -->
            <div class="viz-bar intersection-bar">
              <div class="bar-label">A ∩ B</div>
              <div class="bar-segments">
                {#each result.visualization.intersection as range (`${range.start}-${range.end}`)}
                  <div
                    class="viz-segment intersection-segment"
                    style="width: {getBarWidth(range)}%; left: {getBarOffset(range)}%"
                    use:tooltip={{ text: getSegmentTooltip(range, 'intersection'), position: 'bottom' }}
                  ></div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Results Grid -->
      <div class="results-grid">
        <!-- IPv4 Results -->
        {#if result.ipv4.length > 0}
          <div class="result-panel ipv4">
            <div class="panel-header">
              <h4>IPv4 Intersection ({result.ipv4.length})</h4>
              <button
                type="button"
                class="btn btn-icon"
                class:copied={clipboard.isCopied('ipv4')}
                onclick={() => clipboard.copy((result?.ipv4 || []).join('\n'), 'ipv4')}
              >
                <Icon name={clipboard.isCopied('ipv4') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
            <div class="cidr-list">
              {#each result.ipv4 as cidr (cidr)}
                <div class="cidr-item">
                  <code class="cidr-block">{cidr}</code>
                  <button
                    type="button"
                    class="btn btn-icon btn-xs"
                    class:copied={clipboard.isCopied(cidr)}
                    onclick={() => clipboard.copy(cidr, cidr)}
                  >
                    <Icon name={clipboard.isCopied(cidr) ? 'check' : 'copy'} size="xs" />
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- IPv6 Results -->
        {#if result.ipv6.length > 0}
          <div class="result-panel ipv6">
            <div class="panel-header">
              <h4>IPv6 Intersection ({result.ipv6.length})</h4>
              <button
                type="button"
                class="btn btn-icon"
                class:copied={clipboard.isCopied('ipv6')}
                onclick={() => clipboard.copy((result?.ipv6 || []).join('\n'), 'ipv6')}
              >
                <Icon name={clipboard.isCopied('ipv6') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
            <div class="cidr-list">
              {#each result.ipv6 as cidr (cidr)}
                <div class="cidr-item">
                  <code class="cidr-block">{cidr}</code>
                  <button
                    type="button"
                    class="btn btn-icon btn-xs"
                    class:copied={clipboard.isCopied(cidr)}
                    onclick={() => clipboard.copy(cidr, cidr)}
                  >
                    <Icon name={clipboard.isCopied(cidr) ? 'check' : 'copy'} size="xs" />
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  /* Reusable tokens */
  %section-title {
    color: var(--color-primary);
    margin-bottom: var(--spacing-md);
  }

  %bg-surface {
    background-color: var(--bg-secondary);
  }

  /* Options section */
  .options-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      @extend %section-title;
    }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-sm);
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
      cursor: pointer;

      input[type='checkbox'] {
        margin-top: 2px;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .checkbox-text {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);

        :global(.tooltip-trigger) {
          color: var(--text-secondary);
          opacity: 0.7;
          &:hover {
            opacity: 1;
          }
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

    .input-group {
      h3 {
        @extend %section-title;
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);

        :global(.tooltip-trigger) {
          color: var(--text-secondary);
          opacity: 0.7;
          &:hover {
            opacity: 1;
          }
        }
      }
    }

    .input-textarea {
      width: 100%;
      height: 140px;
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      background: var(--bg-primary);
      resize: vertical;

      &.set-a {
        border-left: 4px solid var(--color-primary);
      }
      &.set-b {
        border-left: 4px solid var(--color-primary);
      }
    }

    .input-actions {
      display: flex;
      justify-content: center;
      margin-bottom: var(--spacing-lg);
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
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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

  /* Status section */
  .status-section {
    margin-bottom: var(--spacing-lg);
  }

  .status-card {
    @extend %bg-surface;
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    border: 2px solid var(--border-primary);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    &.overlap {
      border-color: var(--color-success);
      .status-icon :global(.icon) {
        color: var(--color-success);
      }
    }

    &.no-overlap {
      border-color: var(--color-error);
      .status-icon :global(.icon) {
        color: var(--color-error);
      }
    }

    .status-content h3 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    .status-content p {
      margin: 0;
      color: var(--text-secondary);
    }
  }

  /* Stats and other sections reuse styles from CIDRDiff */
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .stat-card {
    @extend %bg-surface;
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    &.set-a {
      border-left: 4px solid var(--color-primary);
    }
    &.set-b {
      border-left: 4px solid var(--color-primary);
    }
    &.intersection {
      border-left: 4px solid var(--color-primary);
    }
    &.overlap-percent {
      border-left: 4px solid var(--color-primary);
    }
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
  }

  .stat-detail {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  /* Visualization */
  .visualization-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      @extend %section-title;
    }

    .viz-legend {
      display: flex;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-md);
      justify-content: center;

      .legend-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-size: var(--font-size-sm);

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: var(--radius-xs);

          &.set-a-color {
            background-color: var(--color-info);
          }
          &.set-b-color {
            background-color: var(--color-warning);
          }
          &.intersection-color {
            background-color: var(--color-success);
          }
        }
      }
    }
  }

  .visualization-stack {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-md);
    border: 2px solid var(--border-primary);
  }

  .viz-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    .bar-label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-secondary);
      width: 60px;
      text-align: right;
    }

    .bar-segments {
      flex: 1;
      position: relative;
      height: 24px;
      background-color: var(--bg-primary);
      border-radius: var(--radius-xs);
      border: 1px solid var(--border-primary);
    }
  }

  .viz-segment {
    position: absolute;
    height: 100%;
    transition: all var(--transition-fast);
    cursor: pointer;

    &.set-a-segment {
      background-color: var(--color-info);
      opacity: 0.7;
    }

    &.set-b-segment {
      background-color: var(--color-warning);
      opacity: 0.7;
    }

    &.intersection-segment {
      background-color: var(--color-success);
      opacity: 0.9;
      border: 1px solid var(--bg-primary);
    }

    &:hover {
      filter: brightness(1.1);
      z-index: 10;
    }
  }

  /* Result panels - reuse from CIDRDiff */
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);
  }

  .result-panel {
    @extend %bg-surface;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 2px solid var(--color-primary);

    .panel-header {
      padding: var(--spacing-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--color-primary);

      h4 {
        margin: 0;
        color: var(--bg-primary);
        font-size: var(--font-size-md);
      }
    }
  }

  .cidr-list {
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .cidr-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .cidr-block {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  /* Shared styles */
  .error-list {
    margin: var(--spacing-sm) 0;
    padding-left: var(--spacing-md);

    li {
      color: var(--color-error);
      margin-bottom: var(--spacing-xs);
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

  /* Responsive */
  @media (max-width: 768px) {
    .input-grid {
      grid-template-columns: 1fr;
    }

    .results-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .examples-grid {
      grid-template-columns: 1fr;
    }

    .summary-header,
    .status-card {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .status-card {
      text-align: center;
    }

    .viz-legend {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .viz-bar {
      flex-direction: column;
      gap: var(--spacing-xs);

      .bar-label {
        width: auto;
        text-align: left;
      }
    }
  }
</style>
