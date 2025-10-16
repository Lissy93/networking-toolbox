<script lang="ts">
  import { planSubnets, type SubnetRequest, type PlannerResult } from '$lib/utils/subnet-planner.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import _Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';

  let parentCIDR = $state('192.168.1.0/24');
  let strategy = $state<'preserve-order' | 'fit-best'>('fit-best');
  let usableHosts = $state(true);
  let result = $state<PlannerResult | null>(null);
  const clipboard = useClipboard();
  let showVisualization = $state(true);
  let draggedIndex = $state<number | null>(null);

  let requests = $state<SubnetRequest[]>([
    { id: crypto.randomUUID(), name: 'Sales', size: 50, priority: 1 },
    { id: crypto.randomUUID(), name: 'Engineering', size: 30, priority: 2 },
    { id: crypto.randomUUID(), name: 'Marketing', size: 20, priority: 3 },
    { id: crypto.randomUUID(), name: 'Servers', size: 10, priority: 4 },
  ]);

  const examples = [
    {
      label: 'Office Network',
      parent: '192.168.0.0/24',
      requests: [
        { name: 'Sales', size: 50 },
        { name: 'Engineering', size: 30 },
        { name: 'Servers', size: 10 },
      ],
    },
    {
      label: 'Large Corporate',
      parent: '10.0.0.0/16',
      requests: [
        { name: 'HQ', size: 2000 },
        { name: 'Branch Office', size: 500 },
        { name: 'DMZ', size: 100 },
        { name: 'Management', size: 20 },
      ],
    },
    {
      label: 'Data Center',
      parent: '172.16.0.0/20',
      requests: [
        { name: 'Web Servers', size: 200 },
        { name: 'Database Cluster', size: 50 },
        { name: 'Load Balancers', size: 10 },
        { name: 'Monitoring', size: 5 },
      ],
    },
  ];

  /* Add new subnet request */
  function addRequest() {
    requests.push({
      id: crypto.randomUUID(),
      name: `Subnet ${requests.length + 1}`,
      size: 10,
      priority: requests.length + 1,
    });
    performPlanning();
  }

  /* Remove subnet request */
  function removeRequest(id: string) {
    requests = requests.filter((req) => req.id !== id);
    // Renumber priorities
    requests.forEach((req, i) => (req.priority = i + 1));
    performPlanning();
  }

  /* Set example */
  function setExample(example: (typeof examples)[0]) {
    parentCIDR = example.parent;
    requests = example.requests.map((req, i) => ({
      id: crypto.randomUUID(),
      name: req.name,
      size: req.size,
      priority: i + 1,
    }));
    performPlanning();
  }

  /* Export results */
  function exportResults(format: 'csv' | 'json') {
    if (!result || result.allocated.length === 0) return;

    let content = '';
    if (format === 'json') {
      content = JSON.stringify(
        {
          parent: result.stats.parentCIDR,
          strategy,
          allocations: result.allocated,
          leftover: result.leftover,
          stats: result.stats,
        },
        null,
        2,
      );
    } else {
      const headers = ['Name', 'CIDR', 'Network', 'Broadcast', 'Usable Hosts', 'Requested', 'Efficiency %'];
      const rows = result.allocated.map((subnet) => [
        `"${subnet.name}"`,
        subnet.cidr,
        subnet.network,
        subnet.broadcast,
        subnet.usableHosts,
        subnet.requestedSize.toString(),
        subnet.efficiency.toString(),
      ]);

      content = [headers, ...rows].map((row) => row.join(',')).join('\n');
    }

    clipboard.copy(content, `export-${format}`);
  }

  /* Handle drag and drop reordering */
  function handleDragStart(event: DragEvent, index: number) {
    draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const draggedItem = requests[draggedIndex];
      const newRequests = [...requests];

      // Remove dragged item
      newRequests.splice(draggedIndex, 1);

      // Insert at new position
      const insertIndex = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex;
      newRequests.splice(insertIndex, 0, draggedItem);

      // Update priorities
      newRequests.forEach((req, i) => (req.priority = i + 1));

      requests = newRequests;
      performPlanning();
    }
    draggedIndex = null;
  }

  /* Clear all requests */
  function clearRequests() {
    requests = [];
    result = null;
  }

  /* Perform subnet planning */
  function performPlanning() {
    if (!parentCIDR.trim() || requests.length === 0) {
      result = null;
      return;
    }

    result = planSubnets(parentCIDR, requests, strategy, usableHosts);
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
    item: { cidr: string; name?: string; start?: bigint; end?: bigint },
    type: 'allocated' | 'leftover',
  ): string {
    if (type === 'allocated' && item.name) {
      const size = item.start && item.end ? formatNumber(Number(item.end - item.start + 1n)) : 'Unknown';
      return `${item.name}\n${item.cidr}\nSize: ${size} addresses`;
    } else {
      const size = item.start && item.end ? formatNumber(Number(item.end - item.start + 1n)) : 'Unknown';
      return `Leftover Space\n${item.cidr}\nSize: ${size} addresses`;
    }
  }

  // Reactive computation
  $effect(() => {
    if (parentCIDR.trim() && requests.length > 0) {
      performPlanning();
    }
  });
</script>

<ToolContentContainer
  title="Subnet Planner (VLSM)"
  description="Design Variable Length Subnet Mask (VLSM) allocations with drag-and-drop reordering and space optimization."
>
  <!-- Strategy Selection -->
  <div class="strategy-section">
    <h3>Allocation Strategy</h3>
    <div class="strategy-tabs">
      <button
        type="button"
        class="tab"
        class:active={strategy === 'fit-best'}
        onclick={() => {
          strategy = 'fit-best';
          performPlanning();
        }}
        use:tooltip={{ text: 'Sort by size (largest first) for optimal space usage', position: 'top' }}
      >
        Fit Best
      </button>
      <button
        type="button"
        class="tab"
        class:active={strategy === 'preserve-order'}
        onclick={() => {
          strategy = 'preserve-order';
          performPlanning();
        }}
        use:tooltip={{ text: 'Allocate in the order specified (may waste space)', position: 'top' }}
      >
        Preserve Order
      </button>
      <div class="options">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={usableHosts} onchange={() => performPlanning()} />
          <span class="checkbox-text" use:tooltip={'For IPv4, treat network and broadcast addresses as unusable'}>
            IPv4 usable hosts (exclude network/broadcast)
          </span>
        </label>
      </div>
    </div>
  </div>

  <!-- Parent Network -->
  <div class="parent-section">
    <div class="input-group">
      <label for="parent-cidr" use:tooltip={'The parent CIDR to subdivide (e.g., 192.168.1.0/24)'}>
        Parent Network
      </label>
      <input
        id="parent-cidr"
        type="text"
        bind:value={parentCIDR}
        oninput={() => performPlanning()}
        placeholder="192.168.1.0/24"
        class="input-field"
      />
    </div>
  </div>

  <!-- Subnet Requests -->
  <div class="requests-section">
    <div class="requests-header">
      <h3>Subnet Requirements</h3>
      <div class="requests-actions">
        <button type="button" class="btn btn-primary btn-sm" onclick={addRequest}>
          <Icon name="plus" size="sm" />
          Add Subnet
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick={clearRequests} disabled={requests.length === 0}>
          <Icon name="trash" size="sm" />
          Clear All
        </button>
      </div>
    </div>

    <div class="requests-list" role="list">
      {#each requests as request, index (request.id)}
        <div
          class="request-item"
          draggable="true"
          ondragstart={(e) => handleDragStart(e, index)}
          ondragover={handleDragOver}
          ondrop={(e) => handleDrop(e, index)}
          class:dragging={draggedIndex === index}
          role="listitem"
          aria-grabbed={draggedIndex === index}
        >
          <div class="drag-handle">
            <Icon name="draggable" size="sm" />
          </div>

          <div class="request-priority" use:tooltip={'Processing priority - drag to reorder'}>
            #{request.priority}
          </div>

          <div class="request-fields">
            <input
              type="text"
              bind:value={request.name}
              oninput={() => performPlanning()}
              placeholder="Subnet name"
              class="name-field"
            />
            <input
              type="number"
              bind:value={request.size}
              oninput={() => performPlanning()}
              min="1"
              placeholder="Host count"
              class="size-field"
            />
            <span class="hosts-label">hosts</span>
          </div>

          <button type="button" class="btn btn-danger btn-xs" onclick={() => removeRequest(request.id)}>
            <Icon name="x" size="xs" />
          </button>
        </div>
      {/each}

      {#if requests.length === 0}
        <div class="empty-state">
          <p>No subnet requirements defined. Add some subnets to get started.</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Examples -->
  <div class="examples-section">
    <h4>Quick Examples</h4>
    <div class="examples-grid">
      {#each examples as example (example.label)}
        <button type="button" class="example-btn" onclick={() => setExample(example)}>
          {example.label}
        </button>
      {/each}
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

      {#if result.allocated.length > 0}
        <!-- Statistics -->
        <div class="stats-section">
          <div class="summary-header">
            <h3>Allocation Results</h3>
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
            <div class="stat-card parent">
              <span class="stat-label" use:tooltip={'The original network being subdivided into smaller subnets'}
                >Parent Network</span
              >
              <span class="stat-value">{result.stats.parentCIDR}</span>
              <span class="stat-detail">total space</span>
            </div>
            <div class="stat-card allocated">
              <span class="stat-label" use:tooltip={'Total addresses assigned to subnets'}>Allocated</span>
              <span class="stat-value">{result.stats.totalAllocated}</span>
              <span class="stat-detail">{result.stats.successfulAllocations} subnets</span>
            </div>
            <div class="stat-card leftover">
              <span class="stat-label" use:tooltip={'Unallocated address space that could be used for future subnets'}
                >Leftover</span
              >
              <span class="stat-value">{result.stats.totalLeftover}</span>
              <span class="stat-detail">addresses</span>
            </div>
            <div class="stat-card efficiency">
              <span class="stat-label" use:tooltip={'Percentage of parent network space that has been allocated'}
                >Efficiency</span
              >
              <span class="stat-value">{result.stats.efficiency}%</span>
              <span class="stat-detail">space utilized</span>
            </div>
          </div>
        </div>

        <!-- Visualization -->
        {#if showVisualization && result.visualization}
          <div class="visualization-section">
            <div class="viz-header">
              <h4>Address Space Layout</h4>
              <button
                type="button"
                class="btn btn-secondary btn-xs"
                onclick={() => (showVisualization = !showVisualization)}
              >
                <Icon name="hide" size="xs" />
                Hide
              </button>
            </div>

            <div class="visualization-bar">
              <!-- Allocated subnets -->
              {#each result.visualization.allocated as subnet, i (subnet.cidr)}
                <div
                  class="viz-segment allocated-segment subnet-{i % 5}"
                  style="width: {getBarWidth(subnet)}%; left: {getBarOffset(subnet)}%"
                  use:tooltip={{ text: getSegmentTooltip(subnet, 'allocated'), position: 'top' }}
                ></div>
              {/each}

              <!-- Leftover space -->
              {#each result.visualization.leftover as leftover, index (index)}
                <div
                  class="viz-segment leftover-segment"
                  style="width: {getBarWidth(leftover)}%; left: {getBarOffset(leftover)}%"
                  use:tooltip={{ text: getSegmentTooltip(leftover, 'leftover'), position: 'bottom' }}
                ></div>
              {/each}
            </div>

            <div class="viz-legend">
              <div class="legend-item">
                <div class="legend-color allocated-color"></div>
                <span>Allocated Subnets</span>
              </div>
              <div class="legend-item">
                <div class="legend-color leftover-color"></div>
                <span>Leftover Space</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Allocation Table -->
        <div class="allocations-section">
          <h4>Allocated Subnets ({result.allocated.length})</h4>
          <div class="allocations-table">
            <div class="table-header">
              <div class="col-name" use:tooltip={'User-defined name for the subnet'}>Name</div>
              <div class="col-cidr" use:tooltip={'Network address in CIDR notation'}>CIDR</div>
              <div class="col-range" use:tooltip={'Network/broadcast range and usable host addresses'}>
                Address Range
              </div>
              <div class="col-hosts" use:tooltip={'Number of usable and total host addresses'}>Hosts</div>
              <div class="col-efficiency" use:tooltip={'How well the allocated subnet matches the requested size'}>
                Efficiency
              </div>
              <div class="col-actions">Actions</div>
            </div>

            {#each result.allocated as subnet (subnet.cidr)}
              <div class="table-row">
                <div class="col-name">
                  <span class="subnet-name">{subnet.name}</span>
                </div>
                <div class="col-cidr">
                  <code class="subnet-cidr">{subnet.cidr}</code>
                </div>
                <div class="col-range">
                  <div class="range-info">
                    <div class="network-broadcast">
                      {subnet.network} - {subnet.broadcast}
                    </div>
                    <div class="host-range">
                      Hosts: {subnet.firstHost} - {subnet.lastHost}
                    </div>
                  </div>
                </div>
                <div class="col-hosts">
                  <div class="hosts-info">
                    <div class="usable-hosts">{subnet.usableHosts} usable</div>
                    <div class="total-hosts">{subnet.totalHosts} total</div>
                  </div>
                </div>
                <div class="col-efficiency">
                  <div class="efficiency-info">
                    <span class="efficiency-percent">{subnet.efficiency}%</span>
                    <span class="requested-size">({subnet.requestedSize} req.)</span>
                  </div>
                </div>
                <div class="col-actions">
                  <button
                    type="button"
                    class="btn btn-icon btn-xs"
                    class:copied={clipboard.isCopied(subnet.cidr)}
                    onclick={() => clipboard.copy(subnet.cidr, subnet.cidr)}
                  >
                    <Icon name={clipboard.isCopied(subnet.cidr) ? 'check' : 'copy'} size="xs" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Leftover Space -->
        {#if result.leftover.length > 0}
          <div class="leftover-section">
            <h4>Leftover Space ({result.leftover.length} blocks)</h4>
            <div class="leftover-grid">
              {#each result.leftover as block, index (index)}
                <div class="leftover-card">
                  <code class="leftover-cidr">{block.cidr}</code>
                  <span class="leftover-size">{block.size} addresses</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {:else}
        <div class="info-panel info">
          <h3>No Allocations</h3>
          <p>Unable to allocate any subnets. Check that:</p>
          <ul>
            <li>Parent CIDR is valid</li>
            <li>Requested subnet sizes are reasonable</li>
            <li>There's sufficient address space</li>
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</ToolContentContainer>

<style lang="scss">
  /* Reusable tokens */
  %section-title {
    color: var(--color-primary);
    margin-bottom: var(--spacing-md);
  }

  %bg-surface {
    background-color: var(--bg-secondary);
  }

  /* Strategy section */
  .strategy-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      @extend %section-title;
    }

    .strategy-tabs {
      margin-bottom: var(--spacing-md);
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-md);

      .tab {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        max-width: 12rem;

        &.active {
          outline: 2px solid var(--color-primary);
          outline-offset: -2px;
        }

        :global(.tooltip-trigger) {
          color: var(--text-secondary);
          opacity: 0.7;
          transition: opacity var(--transition-fast);

          &:hover {
            opacity: 1;
          }
        }
      }
    }

    .options {
      .checkbox-label {
        display: flex;
        gap: var(--spacing-sm);
        cursor: pointer;

        input[type='checkbox'] {
          margin-top: 2px;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          appearance: none;
          border: 2px solid var(--border-primary);
          border-radius: var(--radius-xs);
          background-color: var(--bg-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;

          &:checked {
            background-color: var(--color-primary);
            border-color: var(--color-primary);

            &::after {
              content: '✓';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: var(--bg-tertiary);
              font-size: 12px;
              font-weight: bold;
              line-height: 1;
            }
          }

          &:hover {
            border-color: var(--color-primary);
          }

          &:focus {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
          }
        }

        .checkbox-text {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          cursor: help;

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
  }

  /* Parent section */
  .parent-section {
    margin-bottom: var(--spacing-lg);

    .input-group {
      max-width: 400px;

      label {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-sm);
        font-weight: 600;
        color: var(--text-primary);

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

  /* Requests section */
  .requests-section {
    margin-bottom: var(--spacing-lg);

    .requests-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);

      h3 {
        @extend %section-title;
        margin: 0;
      }

      .requests-actions {
        display: flex;
        gap: var(--spacing-sm);
      }
    }
  }

  .requests-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    min-height: 100px;
  }

  .request-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    @extend %bg-surface;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    transition: all var(--transition-fast);
    cursor: grab;

    &:hover {
      border-color: var(--color-primary);
      transform: translateY(-1px);
    }

    &.dragging {
      opacity: 0.6;
      transform: rotate(2deg);
    }

    &:active {
      cursor: grabbing;
    }

    .drag-handle {
      color: var(--text-secondary);
      cursor: grab;

      &:hover {
        color: var(--color-primary);
      }
    }

    .request-priority {
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-xs);
      font-size: var(--font-size-xs);
      font-weight: 600;
      min-width: 28px;
      text-align: center;
    }

    .request-fields {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex: 1;

      .name-field {
        flex: 1;
        min-width: 120px;
      }

      .size-field {
        width: 80px;
        text-align: right;
      }

      .hosts-label {
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
      }
    }
  }

  .empty-state {
    @extend %bg-surface;
    padding: var(--spacing-xl);
    border-radius: var(--radius-md);
    border: 2px dashed var(--border-secondary);
    text-align: center;

    p {
      color: var(--text-secondary);
      margin: 0;
    }
  }

  /* Examples */
  .examples-section {
    margin-bottom: var(--spacing-lg);

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
    cursor: pointer;
    transition: all var(--transition-fast);

    &.allocated-segment {
      top: 10%;
      height: 80%;
      border: 1px solid var(--bg-primary);

      &.subnet-0 {
        background-color: var(--color-primary);
      }
      &.subnet-1 {
        background-color: var(--color-info);
      }
      &.subnet-2 {
        background-color: var(--color-success);
      }
      &.subnet-3 {
        background-color: var(--color-warning);
      }
      &.subnet-4 {
        background-color: var(--color-error);
      }
    }

    &.leftover-segment {
      background-color: var(--bg-primary);
      border: 2px dashed var(--border-secondary);
      opacity: 0.7;
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

        &.allocated-color {
          background-color: var(--color-primary);
        }
        &.leftover-color {
          background-color: var(--bg-primary);
          border: 2px dashed var(--border-secondary);
        }
      }
    }
  }

  /* Allocations table */
  .allocations-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      @extend %section-title;
    }
  }

  .allocations-table {
    @extend %bg-surface;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border-primary);
  }

  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: 1fr 1fr 2fr 1fr 1fr auto;
    gap: var(--spacing-sm);
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .table-header {
    background-color: var(--bg-tertiary);
    font-weight: 600;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .table-row {
    border-top: 1px solid var(--border-secondary);

    &:hover {
      background-color: var(--surface-hover);
    }
  }

  .subnet-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .subnet-cidr {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background-color: var(--bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
  }

  .range-info,
  .hosts-info {
    font-size: var(--font-size-sm);
  }

  .range-info {
    .network-broadcast {
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .host-range {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
    }
  }

  .hosts-info {
    .usable-hosts {
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .total-hosts {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
    }
  }

  .efficiency-info {
    text-align: center;

    .efficiency-percent {
      font-weight: 600;
      color: var(--text-primary);
    }

    .requested-size {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }
  }

  /* Leftover section */
  .leftover-section {
    h4 {
      @extend %section-title;
    }
  }

  .leftover-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-sm);
  }

  .leftover-card {
    @extend %bg-surface;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 2px dashed var(--border-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .leftover-cidr {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }

    .leftover-size {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
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
  @media (max-width: 600px) {
    .requests-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .request-item {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
      .drag-handle {
        display: none;
      }

      .request-fields {
        width: 100%;

        .name-field {
          min-width: 100px;
        }
      }
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

    .table-header,
    .table-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-xs);
      text-align: left;
    }

    .viz-legend {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }
  }
</style>
