<script lang="ts">
  import { computeCIDRDifference, type DiffResult, type AlignmentMode } from '$lib/utils/cidr-diff.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatNumber } from '$lib/utils/formatters';
  import { t } from '$lib/stores/language';

  let setA = $state(`192.168.1.0/24
192.168.2.0/24`);
  let setB = $state(`192.168.1.100-192.168.1.200
192.168.2.50/26`);
  let alignment = $state<AlignmentMode>('minimal');
  let constrainedPrefix = $state(24);
  let result = $state<DiffResult | null>(null);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let userModified = $state(false);

  const alignmentModes = $derived([
    {
      value: 'minimal' as const,
      label: $t('tools/cidr-diff.alignmentMode.minimal.label'),
      description: $t('tools/cidr-diff.alignmentMode.minimal.description'),
    },
    {
      value: 'constrained' as const,
      label: $t('tools/cidr-diff.alignmentMode.constrained.label'),
      description: $t('tools/cidr-diff.alignmentMode.constrained.description'),
    },
  ]);

  const examples = $derived([
    {
      label: $t('tools/cidr-diff.examples.basicIPv4'),
      setA: '192.168.1.0/24',
      setB: '192.168.1.128/25',
    },
    {
      label: $t('tools/cidr-diff.examples.multipleRanges'),
      setA: `10.0.0.0/16
172.16.0.0/16`,
      setB: `10.0.1.0/24
172.16.50.0/24`,
    },
    {
      label: $t('tools/cidr-diff.examples.ipv6Example'),
      setA: '2001:db8::/48',
      setB: '2001:db8:1::/64',
    },
    {
      label: $t('tools/cidr-diff.examples.mixedOperations'),
      setA: `192.168.0.0/16
2001:db8::/32`,
      setB: `192.168.100.0/24
2001:db8:abcd::/48`,
    },
  ]);

  /* Set example */
  function setExample(example: (typeof examples)[0]) {
    setA = example.setA;
    setB = example.setB;
    selectedExample = example.label;
    userModified = false;
    performDiff();
  }

  /* Copy all results */
  function copyAllResults(format: 'text' | 'json') {
    if (!result) return;

    let content = '';
    if (format === 'json') {
      content = JSON.stringify(
        {
          ipv4: result.ipv4,
          ipv6: result.ipv6,
          stats: result.stats,
        },
        null,
        2,
      );
    } else {
      const sections = [];
      if (result.ipv4.length > 0) {
        sections.push('IPv4:', ...result.ipv4);
      }
      if (result.ipv6.length > 0) {
        sections.push('IPv6:', ...result.ipv6);
      }
      content = sections.join('\n');
    }

    clipboard.copy(content, `all-${format}`);
  }

  /* Clear inputs */
  function clearInputs() {
    setA = '';
    setB = '';
    result = null;
  }

  /* Perform difference computation */
  function performDiff() {
    if (!setA.trim()) {
      result = null;
      return;
    }

    try {
      result = computeCIDRDifference(
        setA,
        setB,
        alignment,
        alignment === 'constrained' ? constrainedPrefix : undefined,
      );
    } catch (error) {
      result = {
        ipv4: [],
        ipv6: [],
        stats: {
          inputA: { count: 0, addresses: '0' },
          inputB: { count: 0, addresses: '0' },
          output: { count: 0, addresses: '0' },
          removed: { count: 0, addresses: '0' },
          efficiency: 0,
        },
        visualization: { setA: [], setB: [], result: [], version: 4, totalRange: { start: 0n, end: 0n } },
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
  function getSegmentTooltip(range: { start: bigint; end: bigint; cidr?: string }, type: 'A' | 'B' | 'result'): string {
    const version = result?.visualization.version || 4;
    const startIP =
      version === 4
        ? [
            Math.floor(Number(range.start) / 16777216) % 256,
            Math.floor(Number(range.start) / 65536) % 256,
            Math.floor(Number(range.start) / 256) % 256,
            Number(range.start) % 256,
          ].join('.')
        : 'IPv6'; // Simplified for tooltip
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
    const cidrPart = range.cidr ? `\nCIDR: ${range.cidr}` : '';

    const tooltipKey = type === 'A' ? 'setATooltip' : type === 'B' ? 'setBTooltip' : 'resultTooltip';
    return $t(`tools/cidr-diff.visualization.${tooltipKey}`, {
      startIP,
      endIP,
      size: formatNumber(Number(size)),
      cidr: cidrPart,
    });
  }

  // Track user modifications
  $effect(() => {
    if (userModified) {
      selectedExample = null;
    }
  });

  // Reactive computation
  $effect(() => {
    if (setA.trim()) {
      performDiff();
    }
  });
</script>

<!-- Alignment Mode -->
<div class="mode-section">
  <h3>{$t('tools/cidr-diff.alignmentMode.title')}</h3>
  <div class="tabs-container">
    <div class="tabs">
      {#each alignmentModes as mode (mode.value)}
        <button
          type="button"
          class="tab"
          class:active={alignment === mode.value}
          onclick={() => (alignment = mode.value)}
          use:tooltip={{ text: mode.description, position: 'top' }}
        >
          {mode.label}
        </button>
      {/each}
    </div>

    {#if alignment === 'constrained'}
      <div class="constraint-input">
        <label
          for="constrained-prefix"
          use:tooltip={{ text: $t('tools/cidr-diff.alignmentMode.constrained.prefixTooltip'), position: 'top' }}
        >
          {$t('tools/cidr-diff.alignmentMode.constrained.prefixLabel')}
        </label>
        <input
          id="constrained-prefix"
          type="number"
          bind:value={constrainedPrefix}
          oninput={() => (userModified = true)}
          min="8"
          max="30"
          class="input-field constraint-field"
        />
      </div>
    {/if}
  </div>
</div>

<!-- Input Section -->
<div class="input-section">
  <div class="input-grid">
    <!-- Set A -->
    <div class="input-group">
      <h3 use:tooltip={{ text: $t('tools/cidr-diff.input.setATooltip'), position: 'top' }}>
        {$t('tools/cidr-diff.input.setALabel')}
      </h3>
      <div class="input-wrapper">
        <textarea
          bind:value={setA}
          oninput={() => (userModified = true)}
          placeholder={$t('tools/cidr-diff.input.setAPlaceholder')}
          class="input-textarea set-a"
          rows="6"
        ></textarea>
      </div>
    </div>

    <!-- Set B -->
    <div class="input-group">
      <h3 use:tooltip={{ text: $t('tools/cidr-diff.input.setBTooltip'), position: 'top' }}>
        {$t('tools/cidr-diff.input.setBLabel')}
      </h3>
      <div class="input-wrapper">
        <textarea
          bind:value={setB}
          oninput={() => (userModified = true)}
          placeholder={$t('tools/cidr-diff.input.setBPlaceholder')}
          class="input-textarea set-b"
          rows="6"
        ></textarea>
      </div>
    </div>
  </div>

  <div class="input-actions">
    <button
      type="button"
      class="btn btn-secondary btn-sm"
      onclick={clearInputs}
      use:tooltip={{ text: $t('tools/cidr-diff.input.clearTooltip'), position: 'top' }}
    >
      <Icon name="trash" size="sm" />
    </button>
  </div>

  <!-- Examples -->
  <div class="examples-section">
    <h4>
      {$t('tools/cidr-diff.examples.title')}
      <Tooltip text={$t('tools/cidr-diff.examples.tooltip')}>
        <Icon name="help" size="sm" />
      </Tooltip>
    </h4>
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
        <h3>{$t('tools/cidr-diff.results.errorsTitle')}</h3>
        <ul class="error-list">
          {#each result.errors as error (error)}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if result.ipv4.length > 0 || result.ipv6.length > 0}
      <!-- Statistics -->
      <div class="stats-section">
        <div class="summary-header">
          <h3>{$t('tools/cidr-diff.results.title')}</h3>
          <div class="export-buttons">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              class:copied={clipboard.isCopied('all-text')}
              onclick={() => copyAllResults('text')}
            >
              <Icon name={clipboard.isCopied('all-text') ? 'check' : 'copy'} size="sm" />
              {$t('tools/cidr-diff.results.exportText')}
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              class:copied={clipboard.isCopied('all-json')}
              onclick={() => copyAllResults('json')}
            >
              <Icon name={clipboard.isCopied('all-json') ? 'check' : 'download'} size="sm" />
              {$t('tools/cidr-diff.results.exportJSON')}
            </button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card input-a">
            <span class="stat-label">{$t('tools/cidr-diff.stats.setALabel')}</span>
            <span class="stat-value"
              >{$t('tools/cidr-diff.stats.itemsCount', { count: result.stats.inputA.count })}</span
            >
            <span class="stat-detail"
              >{$t('tools/cidr-diff.stats.addressesCount', { count: result.stats.inputA.addresses })}</span
            >
          </div>
          <div class="stat-card input-b">
            <span class="stat-label">{$t('tools/cidr-diff.stats.setBLabel')}</span>
            <span class="stat-value"
              >{$t('tools/cidr-diff.stats.itemsCount', { count: result.stats.inputB.count })}</span
            >
            <span class="stat-detail"
              >{$t('tools/cidr-diff.stats.addressesCount', { count: result.stats.inputB.addresses })}</span
            >
          </div>
          <div class="stat-card result">
            <span class="stat-label">{$t('tools/cidr-diff.stats.resultLabel')}</span>
            <span class="stat-value"
              >{$t('tools/cidr-diff.stats.cidrsCount', { count: result.stats.output.count })}</span
            >
            <span class="stat-detail"
              >{$t('tools/cidr-diff.stats.addressesCount', { count: result.stats.output.addresses })}</span
            >
          </div>
          <div
            class="stat-card efficiency"
            data-efficiency={result.stats.efficiency >= 80 ? 'high' : result.stats.efficiency >= 50 ? 'medium' : 'low'}
          >
            <span class="stat-label">{$t('tools/cidr-diff.stats.efficiencyLabel')}</span>
            <span class="stat-value"
              >{$t('tools/cidr-diff.stats.efficiencyValue', { percent: result.stats.efficiency })}</span
            >
            <span class="stat-detail"
              >{$t('tools/cidr-diff.stats.removedCount', { count: result.stats.removed.addresses })}</span
            >
          </div>
        </div>
      </div>

      <!-- Visualization -->
      {#if result.visualization.setA.length > 0}
        <div class="visualization-section">
          <h4>
            {$t('tools/cidr-diff.visualization.title')}
            <Tooltip text={$t('tools/cidr-diff.visualization.tooltip')}>
              <Icon name="help" size="sm" />
            </Tooltip>
          </h4>
          <div class="viz-legend">
            <div class="legend-item">
              <div class="legend-color set-a-color"></div>
              <span>{$t('tools/cidr-diff.visualization.setALegend')}</span>
            </div>
            <div class="legend-item">
              <div class="legend-color set-b-color"></div>
              <span>{$t('tools/cidr-diff.visualization.setBLegend')}</span>
            </div>
            <div class="legend-item">
              <div class="legend-color result-color"></div>
              <span>{$t('tools/cidr-diff.visualization.resultLegend')}</span>
            </div>
          </div>

          <div class="visualization-bar">
            <!-- Set A (background) -->
            {#each result.visualization.setA as range (`${range.start}-${range.end}`)}
              <div
                class="viz-segment set-a-segment"
                style="width: {getBarWidth(range)}%; left: {getBarOffset(range)}%"
                use:tooltip={{ text: getSegmentTooltip(range, 'A'), position: 'top' }}
              ></div>
            {/each}

            <!-- Set B (overlay) -->
            {#each result.visualization.setB as range (`${range.start}-${range.end}`)}
              <div
                class="viz-segment set-b-segment"
                style="width: {getBarWidth(range)}%; left: {getBarOffset(range)}%"
                use:tooltip={{ text: getSegmentTooltip(range, 'B'), position: 'top' }}
              ></div>
            {/each}

            <!-- Result (final) -->
            {#each result.visualization.result as range (`${range.start}-${range.end}`)}
              <div
                class="viz-segment result-segment"
                style="width: {getBarWidth(range)}%; left: {getBarOffset(range)}%"
                use:tooltip={{ text: getSegmentTooltip(range, 'result'), position: 'bottom' }}
              ></div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Results Grid -->
      <div class="results-grid">
        <!-- IPv4 Results -->
        {#if result.ipv4.length > 0}
          <div class="result-panel ipv4">
            <div class="panel-header">
              <h4>{$t('tools/cidr-diff.output.ipv4Title', { count: result.ipv4.length })}</h4>
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
              <h4>{$t('tools/cidr-diff.output.ipv6Title', { count: result.ipv6.length })}</h4>
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
    {:else}
      <div class="info-panel info">
        <h3>{$t('tools/cidr-diff.results.noResultsTitle')}</h3>
        <p>{$t('tools/cidr-diff.results.noResultsMessage')}</p>
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

  /* Mode section */
  .mode-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      @extend %section-title;
    }

    .tabs-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-lg);
      flex-wrap: wrap;
    }

    .tabs {
      display: flex;
      gap: var(--spacing-sm);
      margin: 0;

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

    .constraint-input {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      label {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        cursor: pointer;
      }

      .constraint-field {
        width: 120px;

        /* Hide number input spinner */
        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* Firefox */
        &[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;
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
    }

    .input-group {
      max-width: none;
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
      resize: vertical;
      background: var(--bg-primary);
      border-left: 4px solid var(--color-primary);
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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

    &.input-a {
      border-left: 4px solid var(--color-primary);
    }
    &.input-b {
      border-left: 4px solid var(--color-primary);
    }
    &.result {
      border-left: 4px solid var(--color-primary);
    }
    &.efficiency {
      border-left: 4px solid var(--color-primary);

      /* Semantic colors based on efficiency */
      &[data-efficiency='high'] {
        border-left-color: var(--color-success);
      }
      &[data-efficiency='medium'] {
        border-left-color: var(--color-warning);
      }
      &[data-efficiency='low'] {
        border-left-color: var(--color-error);
      }
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
          &.result-color {
            background-color: var(--color-success);
          }
        }
      }
    }
  }

  .visualization-bar {
    position: relative;
    height: 60px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    border: 2px solid var(--border-primary);
    overflow: hidden;
    margin-bottom: var(--spacing-sm);
  }

  .viz-segment {
    position: absolute;
    height: 100%;
    transition: all var(--transition-fast);
    cursor: pointer;

    &.set-a-segment {
      background-color: var(--color-info);
      opacity: 0.6;
      z-index: 1;
    }

    &.set-b-segment {
      background-color: var(--color-warning);
      opacity: 0.8;
      z-index: 2;
      top: 25%;
      height: 50%;
    }

    &.result-segment {
      background-color: var(--color-success);
      opacity: 0.9;
      z-index: 3;
      top: 10%;
      height: 80%;
      border: 1px solid var(--bg-primary);
    }

    &:hover {
      filter: brightness(1.1);
      z-index: 10;
    }
  }

  /* Result panels */
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
      padding: var(--spacing-sm);
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
    max-height: 600px;
    overflow: auto;
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

    .summary-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .viz-legend {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .mode-section {
      .tabs-container {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-md);
      }
    }
  }
</style>
