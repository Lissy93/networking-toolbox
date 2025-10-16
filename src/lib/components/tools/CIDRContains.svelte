<script lang="ts">
  import { computeCIDRContains, type ContainsResult, type ContainmentStatus } from '$lib/utils/cidr-contains.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';

  let setA = $state(`192.168.0.0/16
10.0.0.0/8`);
  let setB = $state(`192.168.1.0/24
192.168.1.100/32
172.16.0.0/16`);
  let mergeContainers = $state(true);
  let strictEquality = $state(false);
  let result = $state<ContainsResult | null>(null);
  const clipboard = useClipboard();
  let selectedExampleIndex = $state<number | null>(null);
  let userModified = $state(false);

  const examples = [
    {
      label: 'Basic Containment',
      setA: '192.168.0.0/16',
      setB: `192.168.1.0/24
192.168.2.0/24`,
    },
    {
      label: 'Mixed Results',
      setA: `192.168.1.0/24
10.0.0.0/16`,
      setB: `192.168.1.100/32
10.0.1.0/24
172.16.0.0/24`,
    },
    {
      label: 'Partial Overlap',
      setA: '192.168.1.0/25',
      setB: '192.168.1.0/24',
    },
    {
      label: 'IPv6 Containment',
      setA: '2001:db8::/32',
      setB: `2001:db8:1::/48
2001:db8:2::/64`,
    },
  ];

  /* Set example */
  function setExample(example: (typeof examples)[0], index: number) {
    setA = example.setA;
    setB = example.setB;
    selectedExampleIndex = index;
    userModified = false;
    performContainmentCheck();
  }

  function handleInputChange() {
    userModified = true;
  }

  /* Export results as CSV */
  function exportAsCSV() {
    if (!result) return;

    const headers = ['Input', 'Status', 'Coverage %', 'Matching Containers', 'Gaps'];
    const rows = result.checks.map((check) => [
      `"${check.input}"`,
      check.status,
      check.coverage,
      `"${check.matchingContainers.join(', ')}"`,
      `"${check.gaps.join(', ')}"`,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    clipboard.copy(csv, 'csv-export');
  }

  /* Export results as JSON */
  function exportAsJSON() {
    if (!result) return;

    const exportData = {
      checks: result.checks,
      stats: result.stats,
      timestamp: new Date().toISOString(),
    };

    const json = JSON.stringify(exportData, null, 2);
    clipboard.copy(json, 'json-export');
  }

  /* Clear inputs */
  function clearInputs() {
    setA = '';
    setB = '';
    result = null;
  }

  /* Perform containment check */
  function performContainmentCheck() {
    if (!setA.trim() || !setB.trim()) {
      result = null;
      return;
    }

    try {
      result = computeCIDRContains(setA, setB, mergeContainers, strictEquality);
    } catch (error) {
      result = {
        checks: [],
        stats: { setA: { count: 0, addresses: '0' }, totalChecked: 0, inside: 0, equal: 0, partial: 0, outside: 0 },
        visualization: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /* Get status display info */
  function getStatusInfo(status: ContainmentStatus) {
    switch (status) {
      case 'inside':
        return { icon: 'check-circle', color: 'var(--color-success)', label: 'Inside' };
      case 'equal':
        return { icon: 'equals', color: 'var(--color-info)', label: 'Equal' };
      case 'partial':
        return { icon: 'alert-circle', color: 'var(--color-warning)', label: 'Partial' };
      case 'outside':
        return { icon: 'x-circle', color: 'var(--color-error)', label: 'Outside' };
    }
  }

  /* Calculate visualization bar width percentage */
  function getBarWidth(range: { start: bigint; end: bigint }, totalRange: { start: bigint; end: bigint }): number {
    const totalSize = totalRange.end - totalRange.start + 1n;
    const rangeSize = range.end - range.start + 1n;
    return Number((rangeSize * 10000n) / totalSize) / 100;
  }

  /* Calculate visualization bar offset percentage */
  function getBarOffset(range: { start: bigint; end: bigint }, totalRange: { start: bigint; end: bigint }): number {
    const totalSize = totalRange.end - totalRange.start + 1n;
    const offset = range.start - totalRange.start;
    return Number((offset * 10000n) / totalSize) / 100;
  }

  /* Generate tooltip text for visualization segments */
  function getSegmentTooltip(
    range: { start: bigint; end: bigint; label?: string; cidr?: string },
    type: 'candidate' | 'container' | 'gap',
  ): string {
    const size = range.end - range.start + 1n;
    const label = type === 'candidate' ? 'Candidate' : type === 'container' ? 'Container' : 'Gap';

    return `${label}${range.label ? ` (${range.label})` : ''}\nSize: ${formatNumber(Number(size))}${range.cidr ? `\nCIDR: ${range.cidr}` : ''}`;
  }

  // Reactive computation
  $effect(() => {
    if (setA.trim() && setB.trim()) {
      performContainmentCheck();
    }
  });
</script>

<!-- Options -->
<div class="options-section">
  <h3>Options</h3>
  <div class="options-grid">
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={mergeContainers} />
      <span class="checkbox-text">
        Merge/normalize containers first
        <Tooltip text="Combine overlapping ranges in set A before checking containment">
          <Icon name="help" size="sm" />
        </Tooltip>
      </span>
    </label>
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={strictEquality} />
      <span class="checkbox-text">
        Strict equality counts as contain
        <Tooltip text="Treat exact matches as 'equal' instead of 'inside'">
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
        Set A (Containers)
        <Tooltip text="The containing set - these ranges may contain items from Set B">
          <Icon name="help" size="sm" />
        </Tooltip>
      </h3>
      <div class="input-wrapper">
        <textarea
          bind:value={setA}
          placeholder="192.168.0.0/16&#10;10.0.0.0/8"
          class="input-textarea set-a"
          rows="6"
          oninput={handleInputChange}
        ></textarea>
      </div>
    </div>

    <!-- Set B -->
    <div class="input-group">
      <h3>
        Set B (Candidates)
        <Tooltip text="Items to check for containment within Set A">
          <Icon name="help" size="sm" />
        </Tooltip>
      </h3>
      <div class="input-wrapper">
        <textarea
          bind:value={setB}
          placeholder="192.168.1.0/24&#10;172.16.0.0/24"
          class="input-textarea set-b"
          rows="6"
          oninput={handleInputChange}
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
            class:selected={selectedExampleIndex === i && !userModified}
            onclick={() => setExample(example, i)}
          >
            <div class="example-label">{example.label}</div>
            <div class="example-preview">
              {example.setA.split('\n')[0]}... ⊆ {example.setB.split('\n')[0]}...
            </div>
          </button>
        {/each}
      </div>
    </details>
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

    {#if result.checks.length > 0}
      <!-- Summary Statistics -->
      <div class="stats-section">
        <div class="summary-header">
          <h3>Containment Analysis</h3>
          <div class="export-buttons">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              class:copied={clipboard.isCopied('csv-export')}
              onclick={exportAsCSV}
            >
              <Icon name={clipboard.isCopied('csv-export') ? 'check' : 'csv-file'} size="sm" />
              CSV
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              class:copied={clipboard.isCopied('json-export')}
              onclick={exportAsJSON}
            >
              <Icon name={clipboard.isCopied('json-export') ? 'check' : 'json-file'} size="sm" />
              JSON
            </button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card containers">
            <span class="stat-label">Containers (A)</span>
            <span class="stat-value">{result.stats.setA.count} items</span>
            <span class="stat-detail">{result.stats.setA.addresses} addresses</span>
          </div>
          <div class="stat-card candidates">
            <span class="stat-label">Candidates (B)</span>
            <span class="stat-value">{result.stats.totalChecked} items</span>
            <span class="stat-detail">checked for containment</span>
          </div>
          <div class="stat-card inside">
            <span class="stat-label">Inside</span>
            <span class="stat-value">{result.stats.inside}</span>
            <span class="stat-detail">fully contained</span>
          </div>
          <div class="stat-card equal">
            <span class="stat-label">Equal</span>
            <span class="stat-value">{result.stats.equal}</span>
            <span class="stat-detail">exact matches</span>
          </div>
          <div class="stat-card partial">
            <span class="stat-label">Partial</span>
            <span class="stat-value">{result.stats.partial}</span>
            <span class="stat-detail">partial overlap</span>
          </div>
          <div class="stat-card outside">
            <span class="stat-label">Outside</span>
            <span class="stat-value">{result.stats.outside}</span>
            <span class="stat-detail">no overlap</span>
          </div>
        </div>
      </div>

      <!-- Containment Results Table -->
      <div class="table-section">
        <h4>Containment Results</h4>
        <div class="results-table">
          <div class="table-header">
            <div class="col-input">Candidate</div>
            <div class="col-status">Status</div>
            <div class="col-coverage">Coverage</div>
            <div class="col-containers">Containers</div>
            <div class="col-gaps">Gaps</div>
          </div>

          {#each result.checks as check, index (`${check.input}-${index}`)}
            {@const statusInfo = getStatusInfo(check.status)}
            <div class="table-row status-{check.status}">
              <div class="col-input">
                <code class="candidate-input">{check.input}</code>
              </div>
              <div class="col-status">
                <div class="status-badge" style="color: {statusInfo.color}">
                  <Icon name={statusInfo.icon} size="sm" />
                  {statusInfo.label}
                </div>
              </div>
              <div class="col-coverage">
                <div class="coverage-bar">
                  <div
                    class="coverage-fill"
                    style="width: {check.coverage}%; background-color: {statusInfo.color}"
                  ></div>
                  <span class="coverage-text">{check.coverage}%</span>
                </div>
              </div>
              <div class="col-containers">
                {#if check.matchingContainers.length > 0}
                  <div class="container-list">
                    {#each check.matchingContainers as container (container)}
                      <code class="container-item">{container}</code>
                    {/each}
                  </div>
                {:else}
                  <span class="no-containers">-</span>
                {/if}
              </div>
              <div class="col-gaps">
                {#if check.gaps.length > 0}
                  <div class="gaps-list">
                    {#each check.gaps as gap (gap)}
                      <code class="gap-item">{gap}</code>
                    {/each}
                  </div>
                  <button
                    type="button"
                    class="btn btn-icon btn-xs"
                    class:copied={clipboard.isCopied(`gaps-${check.input}`)}
                    onclick={() => clipboard.copy(check.gaps.join('\n'), `gaps-${check.input}`)}
                  >
                    <Icon name={clipboard.isCopied(`gaps-${check.input}`) ? 'check' : 'copy'} size="xs" />
                  </button>
                {:else}
                  <span class="no-gaps">-</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Visualization -->
      {#if result.visualization.length > 0}
        <div class="visualization-section">
          <h4>Containment Visualization</h4>
          <div class="viz-legend">
            <div class="legend-item">
              <div class="legend-color candidate-color"></div>
              <span>Candidate Range</span>
            </div>
            <div class="legend-item">
              <div class="legend-color container-color"></div>
              <span>Container Coverage</span>
            </div>
            <div class="legend-item">
              <div class="legend-color gap-color"></div>
              <span>Uncovered Gaps</span>
            </div>
          </div>

          <div class="visualization-list">
            {#each result.visualization as viz, index (viz.candidate)}
              {@const check = result.checks[index]}
              {@const statusInfo = getStatusInfo(check.status)}
              <div class="viz-item status-{check.status}">
                <div class="viz-header">
                  <code class="viz-candidate">{viz.candidate}</code>
                  <div class="viz-status" style="color: {statusInfo.color}">
                    <Icon name={statusInfo.icon} size="sm" />
                    {statusInfo.label} ({check.coverage}%)
                  </div>
                </div>

                <div class="viz-bar-container">
                  <!-- Candidate base -->
                  <div class="viz-bar candidate-bar">
                    <div
                      class="viz-segment candidate-segment"
                      style="width: {getBarWidth(viz.candidateRange, viz.totalRange)}%; left: {getBarOffset(
                        viz.candidateRange,
                        viz.totalRange,
                      )}%"
                      use:tooltip={{ text: getSegmentTooltip(viz.candidateRange, 'candidate'), position: 'top' }}
                    ></div>
                  </div>

                  <!-- Container overlays -->
                  <div class="viz-bar container-bar">
                    {#each viz.containers as container (`${container.start}-${container.end}`)}
                      <div
                        class="viz-segment container-segment"
                        style="width: {getBarWidth(container, viz.totalRange)}%; left: {getBarOffset(
                          container,
                          viz.totalRange,
                        )}%"
                        use:tooltip={{ text: getSegmentTooltip(container, 'container'), position: 'top' }}
                      ></div>
                    {/each}
                  </div>

                  <!-- Gap highlights -->
                  <div class="viz-bar gap-bar">
                    {#each viz.gaps as gap (`${gap.start}-${gap.end}`)}
                      <div
                        class="viz-segment gap-segment"
                        style="width: {getBarWidth(gap, viz.totalRange)}%; left: {getBarOffset(gap, viz.totalRange)}%"
                        use:tooltip={{ text: getSegmentTooltip(gap, 'gap'), position: 'bottom' }}
                      ></div>
                    {/each}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style lang="scss">
  /* Reuse base styles from previous components */
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
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-md);
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

  /* Examples section */
  .examples-card {
    margin-top: var(--spacing-lg);

    .examples-details {
      summary {
        list-style: none;
        cursor: pointer;

        &::-webkit-details-marker {
          display: none;
        }
      }

      .examples-summary {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
        background-color: var(--bg-tertiary);
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);

        &:hover {
          background-color: var(--surface-hover);
        }

        :global(svg) {
          transition: transform var(--transition-fast);
        }

        h4 {
          margin: 0;
          font-size: var(--font-size-md);
          font-weight: 600;
          color: var(--text-primary);
        }
      }

      &[open] .examples-summary :global(svg) {
        transform: rotate(90deg);
      }
    }

    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
    }

    .example-card {
      display: flex;
      flex-direction: column;
      padding: var(--spacing-sm);
      background: var(--bg-secondary);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
      text-align: left;

      &:hover {
        background-color: var(--surface-hover);
        border-color: var(--color-primary);
        transform: translateY(-1px);
      }

      &.selected {
        border-color: var(--color-primary);
        border-width: 2px;
        background: color-mix(in srgb, var(--color-primary), transparent 95%);
      }

      .example-label {
        font-weight: 600;
        font-size: var(--font-size-sm);
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
      }

      .example-preview {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        font-family: var(--font-mono);
        line-height: 1.4;
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

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

    &.containers {
      border-left: 4px solid var(--color-info);
    }
    &.candidates {
      border-left: 4px solid var(--color-warning);
    }
    &.inside {
      border-left: 4px solid var(--color-success);
    }
    &.equal {
      border-left: 4px solid var(--color-info);
    }
    &.partial {
      border-left: 4px solid var(--color-warning);
    }
    &.outside {
      border-left: 4px solid var(--color-error);
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

  /* Results table */
  .table-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      @extend %section-title;
    }
  }

  .results-table {
    @extend %bg-surface;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border-primary);
  }

  .table-header {
    background-color: var(--bg-tertiary);
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 2fr 2fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-primary);
    font-size: var(--font-size-sm);
  }

  .table-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 2fr 2fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-secondary);
    align-items: center;

    &:last-child {
      border-bottom: none;
    }

    &.status-inside {
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
    }
    &.status-equal {
      background-color: color-mix(in srgb, var(--color-info), transparent 90%);
    }
    &.status-partial {
      background-color: color-mix(in srgb, var(--color-warning), transparent 90%);
    }
    &.status-outside {
      background-color: color-mix(in srgb, var(--color-error), transparent 90%);
    }
    .col-gaps {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }
  }

  .candidate-input {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background-color: var(--bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 500;
    font-size: var(--font-size-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
  }

  .coverage-bar {
    position: relative;
    height: 20px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--border-primary);

    .coverage-fill {
      height: 100%;
      transition: width var(--transition-fast);
      opacity: 0.7;
    }

    .coverage-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .container-list,
  .gaps-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .container-item,
  .gap-item {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background-color: var(--bg-tertiary);
    padding: 1px var(--spacing-xs);
    border-radius: var(--radius-xs);
  }

  .no-containers,
  .no-gaps {
    color: var(--text-secondary);
    font-style: italic;
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

          &.candidate-color {
            background-color: var(--color-warning);
          }
          &.container-color {
            background-color: var(--color-info);
          }
          &.gap-color {
            background-color: var(--color-error);
          }
        }
      }
    }
  }

  .visualization-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .viz-item {
    @extend %bg-surface;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    padding: var(--spacing-md);

    &.status-inside {
      border-left: 4px solid var(--color-success);
    }
    &.status-equal {
      border-left: 4px solid var(--color-info);
    }
    &.status-partial {
      border-left: 4px solid var(--color-warning);
    }
    &.status-outside {
      border-left: 4px solid var(--color-error);
    }
  }

  .viz-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .viz-candidate {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-primary);
  }

  .viz-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .viz-bar-container {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .viz-bar {
    position: relative;
    height: 16px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-secondary);
  }

  .viz-segment {
    position: absolute;
    height: 100%;
    cursor: pointer;
    transition: all var(--transition-fast);

    &.candidate-segment {
      background-color: var(--color-warning);
      opacity: 0.6;
    }

    &.container-segment {
      background-color: var(--color-info);
      opacity: 0.8;
    }

    &.gap-segment {
      background-color: var(--color-error);
      opacity: 0.9;
      border: 1px solid var(--bg-primary);
    }

    &:hover {
      filter: brightness(1.1);
      z-index: 10;
    }
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
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
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

    .stats-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .examples-grid {
      grid-template-columns: 1fr;
    }

    .summary-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .table-header,
    .table-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-xs);
    }

    .table-header {
      display: none; // Hide on mobile, rely on card-like layout
    }

    .table-row {
      display: block;
      padding: var(--spacing-md);

      > div {
        margin-bottom: var(--spacing-sm);

        &:before {
          content: attr(data-label);
          font-weight: 600;
          color: var(--text-secondary);
          margin-right: var(--spacing-sm);
        }
      }
    }

    .viz-legend {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .viz-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }
  }
</style>
