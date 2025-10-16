<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatNumber } from '$lib/utils/formatters';
  import '../../../styles/diagnostics-pages.scss';
  let pools = $state(`192.168.0.0/16
10.0.0.0/20`);
  let requests = $state(`/24 - Office Network
/25 - Guest WiFi
/26 - Servers
/27 - Management
/28 - DMZ`);
  let algorithm = $state<'first-fit' | 'best-fit'>('best-fit');
  let result = $state<{
    success: boolean;
    error?: string;
    allocations: Array<{
      request: string;
      description: string;
      prefixLength: number;
      size: number;
      allocated: boolean;
      cidr?: string;
      pool?: string;
      reason?: string;
    }>;
    pools: Array<{
      original: string;
      network: number;
      size: number;
      allocated: Array<{
        cidr: string;
        start: number;
        size: number;
        description: string;
      }>;
      remaining: Array<{
        start: number;
        size: number;
        cidr: string;
      }>;
      utilization: number;
    }>;
    summary: {
      totalRequests: number;
      successfulAllocations: number;
      failedAllocations: number;
      totalPoolSpace: number;
      allocatedSpace: number;
      wastedSpace: number;
      efficiency: number;
    };
  } | null>(null);
  const clipboard = useClipboard();
  let _selectedExample = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);
  let _userModified = $state(false);

  const examples = [
    {
      label: 'Office Network Planning',
      pools: '192.168.0.0/16',
      requests: `/24 - Main Office
/25 - Guest Network
/26 - Servers
/27 - Management`,
      algorithm: 'best-fit' as const,
    },
    {
      label: 'Multi-Pool Allocation',
      pools: `10.0.0.0/20
172.16.0.0/24`,
      requests: `/22 - Data Center
/26 - Office A
/27 - Office B
/28 - Point-to-Point`,
      algorithm: 'first-fit' as const,
    },
    {
      label: 'Dense Packing Challenge',
      pools: '192.168.0.0/22',
      requests: `/28 - Subnet A
/28 - Subnet B
/28 - Subnet C
/28 - Subnet D
/28 - Subnet E
/28 - Subnet F`,
      algorithm: 'best-fit' as const,
    },
    {
      label: 'Campus VLAN Allocation',
      pools: `10.0.0.0/16
172.16.0.0/16`,
      requests: `/22 - Student Housing
/23 - Academic Buildings
/24 - Admin Offices
/25 - Library Systems
/26 - Lab Networks
/28 - Printer VLANs`,
      algorithm: 'best-fit' as const,
    },
    {
      label: 'Cloud Infrastructure',
      pools: `10.100.0.0/16
10.200.0.0/16
10.255.0.0/20`,
      requests: `/20 - Production Cluster
/21 - Staging Environment
/22 - Development Pods
/24 - CI/CD Pipeline
/25 - Database Tier
/26 - Load Balancers
/27 - Monitoring Stack`,
      algorithm: 'first-fit' as const,
    },
    {
      label: 'ISP Customer Allocation',
      pools: `203.0.113.0/24
198.51.100.0/24
192.0.2.0/24`,
      requests: `/27 - Enterprise Customer A
/28 - Small Business B
/29 - Home Office C
/30 - Point-to-Point Links
/28 - Enterprise Customer D
/29 - Remote Branch E
/30 - Backup Connections`,
      algorithm: 'best-fit' as const,
    },
  ];

  function loadExample(example: (typeof examples)[0], index: number) {
    pools = example.pools;
    requests = example.requests;
    algorithm = example.algorithm;
    _selectedExample = example.label;
    selectedExampleIndex = index;
    _userModified = false;
    performAllocation();
  }

  function parseIP(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  function ipToString(ip: number): string {
    return [(ip >>> 24) & 0xff, (ip >>> 16) & 0xff, (ip >>> 8) & 0xff, ip & 0xff].join('.');
  }

  function parseCIDR(cidr: string): { network: number; prefixLength: number; size: number } {
    const [networkStr, prefixStr] = cidr.split('/');
    const prefixLength = parseInt(prefixStr);
    const network = parseIP(networkStr) & (0xffffffff << (32 - prefixLength));
    const size = Math.pow(2, 32 - prefixLength);
    return { network, prefixLength, size };
  }

  function parseRequests(input: string): Array<{ prefixLength: number; description: string; size: number }> {
    const lines = input
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    const requests: Array<{ prefixLength: number; description: string; size: number }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Parse format: "/24 - Description" or just "/24"
      const match = trimmed.match(/^\/(\d+)(?:\s*-\s*(.*))?$/);
      if (!match) {
        throw new Error(`Invalid request format: ${trimmed}. Expected format: "/24 - Description" or "/24"`);
      }

      const prefixLength = parseInt(match[1]);
      const description = match[2]?.trim() || `/${prefixLength} subnet`;

      if (prefixLength < 1 || prefixLength > 32) {
        throw new Error(`Invalid prefix length: /${prefixLength}`);
      }

      const size = Math.pow(2, 32 - prefixLength);
      requests.push({ prefixLength, description, size });
    }

    return requests;
  }

  function findFreeBlocks(
    pool: { network: number; size: number },
    allocated: Array<{ start: number; size: number }>,
  ): Array<{ start: number; size: number }> {
    if (allocated.length === 0) {
      return [{ start: pool.network, size: pool.size }];
    }

    // Sort allocated blocks by start address
    const sorted = [...allocated].sort((a, b) => a.start - b.start);
    const freeBlocks: Array<{ start: number; size: number }> = [];

    let currentPos = pool.network;
    const poolEnd = pool.network + pool.size;

    for (const block of sorted) {
      // Add gap before this allocation if it exists
      if (currentPos < block.start) {
        freeBlocks.push({
          start: currentPos,
          size: block.start - currentPos,
        });
      }
      currentPos = block.start + block.size;
    }

    // Add gap after the last allocation if it exists
    if (currentPos < poolEnd) {
      freeBlocks.push({
        start: currentPos,
        size: poolEnd - currentPos,
      });
    }

    return freeBlocks;
  }

  function findBestFitBlock(
    freeBlocks: Array<{ start: number; size: number }>,
    requiredSize: number,
    _prefixLength: number,
  ): { start: number; size: number } | null {
    // Filter blocks that can fit the required size and are properly aligned
    const viableBlocks = freeBlocks.filter((block) => {
      if (block.size < requiredSize) return false;

      // Check if we can find a properly aligned address within this block
      const alignmentMask = requiredSize - 1;
      const alignedStart = (block.start + alignmentMask) & ~alignmentMask;
      return alignedStart + requiredSize <= block.start + block.size;
    });

    if (viableBlocks.length === 0) return null;

    if (algorithm === 'best-fit') {
      // Best-fit: smallest block that fits
      return viableBlocks.reduce((best, current) => (current.size < best.size ? current : best));
    } else {
      // First-fit: first block that fits
      return viableBlocks[0];
    }
  }

  function performAllocation() {
    try {
      if (!pools.trim() || !requests.trim()) {
        result = null;
        return;
      }

      const poolLines = pools
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      const requestList = parseRequests(requests);

      // Parse pools
      const parsedPools = poolLines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed.includes('/')) {
          throw new Error(`Invalid pool format: ${trimmed}. Expected CIDR notation.`);
        }

        const { network, prefixLength: _prefixLength, size } = parseCIDR(trimmed);
        return {
          original: trimmed,
          network,
          size,
          allocated: [] as Array<{ cidr: string; start: number; size: number; description: string }>,
          remaining: [] as Array<{ start: number; size: number; cidr: string }>,
          utilization: 0,
        };
      });

      // Sort requests by size (largest first for better packing)
      const sortedRequests = [...requestList].sort((a, b) => b.size - a.size);

      const allocations: Array<{
        request: string;
        description: string;
        prefixLength: number;
        size: number;
        allocated: boolean;
        cidr?: string;
        pool?: string;
        reason?: string;
      }> = [];

      // Attempt to allocate each request
      for (const request of sortedRequests) {
        let allocated = false;
        let allocationResult: { cidr: string; pool: string } | null = null;

        // Try each pool in order
        for (const pool of parsedPools) {
          const freeBlocks = findFreeBlocks({ network: pool.network, size: pool.size }, pool.allocated);

          const bestBlock = findBestFitBlock(freeBlocks, request.size, request.prefixLength);

          if (bestBlock) {
            // Find properly aligned address within the block
            const alignmentMask = request.size - 1;
            const alignedStart = (bestBlock.start + alignmentMask) & ~alignmentMask;

            if (alignedStart + request.size <= bestBlock.start + bestBlock.size) {
              const cidr = `${ipToString(alignedStart)}/${request.prefixLength}`;

              pool.allocated.push({
                cidr,
                start: alignedStart,
                size: request.size,
                description: request.description,
              });

              allocationResult = {
                cidr,
                pool: pool.original,
              };

              allocated = true;
              break;
            }
          }
        }

        allocations.push({
          request: `/${request.prefixLength}`,
          description: request.description,
          prefixLength: request.prefixLength,
          size: request.size,
          allocated,
          cidr: allocationResult?.cidr,
          pool: allocationResult?.pool,
          reason: allocated ? undefined : 'No suitable block found with proper alignment',
        });
      }

      // Calculate remaining space and utilization for each pool
      for (const pool of parsedPools) {
        const freeBlocks = findFreeBlocks({ network: pool.network, size: pool.size }, pool.allocated);

        pool.remaining = freeBlocks
          .map((block) => ({
            start: block.start,
            size: block.size,
            cidr: block.size > 0 ? `${ipToString(block.start)}/${32 - Math.log2(block.size)}` : '',
          }))
          .filter((block) => block.size > 0);

        const allocatedSize = pool.allocated.reduce((sum, alloc) => sum + alloc.size, 0);
        pool.utilization = (allocatedSize / pool.size) * 100;
      }

      // Calculate summary statistics
      const totalRequests = allocations.length;
      const successfulAllocations = allocations.filter((a) => a.allocated).length;
      const failedAllocations = totalRequests - successfulAllocations;
      const totalPoolSpace = parsedPools.reduce((sum, pool) => sum + pool.size, 0);
      const allocatedSpace = parsedPools.reduce(
        (sum, pool) => sum + pool.allocated.reduce((poolSum, alloc) => poolSum + alloc.size, 0),
        0,
      );

      // Calculate wasted space (internal fragmentation)
      const wastedSpace = parsedPools.reduce((sum, pool) => {
        const freeBlocks = pool.remaining;
        const unusableSpace = freeBlocks.reduce((blockSum, block) => {
          // Space is "wasted" if it's too small for the smallest failed allocation
          const failedRequests = allocations.filter((a) => !a.allocated);
          if (failedRequests.length === 0) return blockSum;

          const smallestFailed = Math.min(...failedRequests.map((a) => a.size));
          return blockSum + (block.size < smallestFailed ? block.size : 0);
        }, 0);
        return sum + unusableSpace;
      }, 0);

      const efficiency = totalPoolSpace > 0 ? (allocatedSpace / totalPoolSpace) * 100 : 0;

      result = {
        success: true,
        allocations,
        pools: parsedPools,
        summary: {
          totalRequests,
          successfulAllocations,
          failedAllocations,
          totalPoolSpace,
          allocatedSpace,
          wastedSpace,
          efficiency,
        },
      };
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        allocations: [],
        pools: [],
        summary: {
          totalRequests: 0,
          successfulAllocations: 0,
          failedAllocations: 0,
          totalPoolSpace: 0,
          allocatedSpace: 0,
          wastedSpace: 0,
          efficiency: 0,
        },
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    _selectedExample = null;
    selectedExampleIndex = null;
    performAllocation();
  }

  async function copyAllAllocations() {
    if (!result?.allocations) return;

    const successful = result.allocations.filter((a) => a.allocated);
    if (successful.length === 0) return;

    const text = successful.map((a) => `${a.cidr} - ${a.description}`).join('\n');
    await clipboard.copy(text, 'all-allocations');
  }

  // Calculate on component load
  performAllocation();
</script>

<div class="card">
  <header class="card-header">
    <h2>CIDR Allocator</h2>
    <p>Pack requested subnet sizes into pools using intelligent bin-packing algorithms</p>
  </header>

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
            onclick={() => loadExample(example, i)}
          >
            <div class="example-label">{example.label}</div>
            <div class="example-preview">
              Algorithm: {example.algorithm}
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Algorithm Selection -->
  <section class="algorithm-section">
    <h4 use:tooltip={'Choose between first-fit (faster) and best-fit (more efficient packing) algorithms'}>
      Allocation Algorithm
    </h4>
    <div class="algorithm-options">
      <label class="algorithm-option">
        <input type="radio" bind:group={algorithm} value="first-fit" onchange={handleInputChange} />
        <div class="option-content">
          <div class="option-title">
            <Icon name="zap" size="sm" />
            First-Fit
          </div>
          <div class="option-description">
            Fast allocation - uses the first available block that fits (good for speed)
          </div>
        </div>
      </label>

      <label class="algorithm-option">
        <input type="radio" bind:group={algorithm} value="best-fit" onchange={handleInputChange} />
        <div class="option-content">
          <div class="option-title">
            <Icon name="target" size="sm" />
            Best-Fit
          </div>
          <div class="option-description">
            Optimal packing - uses the smallest available block that fits (reduces fragmentation)
          </div>
        </div>
      </label>
    </div>
  </section>

  <!-- Input Section -->
  <section class="input-section">
    <div class="input-grid">
      <div class="input-group">
        <label for="pools" use:tooltip={'Available network pools - one CIDR block per line'}>
          <Icon name="database" size="sm" />
          Available Pools
        </label>
        <textarea
          id="pools"
          bind:value={pools}
          oninput={handleInputChange}
          placeholder="192.168.0.0/16&#10;10.0.0.0/20"
          rows="6"
          required
        ></textarea>
      </div>

      <div class="input-group">
        <label for="requests" use:tooltip={"Subnet requests in format '/24 - Description' - one per line"}>
          <Icon name="list-check" size="sm" />
          Subnet Requests
        </label>
        <textarea
          id="requests"
          bind:value={requests}
          oninput={handleInputChange}
          placeholder="/24 - Main Office&#10;/26 - Servers&#10;/28 - Management"
          rows="6"
          required
        ></textarea>
      </div>
    </div>
  </section>

  <!-- Results Section -->
  {#if result}
    <section class="results-section">
      {#if result.success}
        <!-- Summary -->
        <div class="allocation-summary">
          <div class="summary-header">
            <h3 use:tooltip={'Summary of subnet allocation requests and pool utilization'}>Allocation Results</h3>
            {#if result.summary.successfulAllocations > 0}
              <button
                class="copy-all-button {clipboard.isCopied('all-allocations') ? 'copied' : ''}"
                onclick={copyAllAllocations}
              >
                <Icon name={clipboard.isCopied('all-allocations') ? 'check' : 'copy'} size="sm" />
                {clipboard.isCopied('all-allocations') ? 'Copied!' : 'Copy All'}
              </button>
            {/if}
          </div>

          <div class="summary-grid">
            <div class="summary-card success">
              <div class="summary-icon">
                <Icon name="check-circle" />
              </div>
              <div class="summary-content">
                <div class="summary-number">{result.summary.successfulAllocations}</div>
                <div class="summary-label">Allocated</div>
              </div>
            </div>

            <div class="summary-card error">
              <div class="summary-icon">
                <Icon name={result.summary.failedAllocations > 0 ? 'x-circle' : 'check-circle'} />
              </div>
              <div class="summary-content">
                <div class="summary-number">{result.summary.failedAllocations}</div>
                <div class="summary-label">Failed</div>
              </div>
            </div>

            <div class="summary-card info">
              <div class="summary-icon">
                <Icon name="pie-chart" />
              </div>
              <div class="summary-content">
                <div class="summary-number">{result.summary.efficiency.toFixed(1)}%</div>
                <div class="summary-label">Efficiency</div>
              </div>
            </div>
          </div>

          <div class="space-breakdown">
            <div class="breakdown-item">
              <span class="breakdown-label">Total Pool Space:</span>
              <span class="breakdown-value">
                {formatNumber(result.summary.totalPoolSpace)} addresses
              </span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Allocated:</span>
              <span class="breakdown-value allocated">
                {formatNumber(result.summary.allocatedSpace)} addresses
              </span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Remaining:</span>
              <span class="breakdown-value">
                {formatNumber(result.summary.totalPoolSpace - result.summary.allocatedSpace)} addresses
              </span>
            </div>
          </div>
        </div>

        <!-- Allocations -->
        <div class="allocations-section">
          <h4 use:tooltip={'Individual subnet allocation results with assigned CIDR blocks'}>Subnet Allocations</h4>
          <div class="allocations-list">
            {#each result.allocations as allocation (allocation.request)}
              <div class="allocation-item {allocation.allocated ? 'success' : 'failed'}">
                <div class="allocation-header">
                  <div class="allocation-info">
                    <code class="allocation-request">{allocation.request}</code>
                    <span class="allocation-description">{allocation.description}</span>
                  </div>
                  <div class="allocation-status">
                    {#if allocation.allocated}
                      <Icon name="check-circle" size="sm" />
                      <span class="status-text success">Allocated</span>
                    {:else}
                      <Icon name="x-circle" size="sm" />
                      <span class="status-text failed">Failed</span>
                    {/if}
                  </div>
                </div>

                {#if allocation.allocated && allocation.cidr}
                  <div class="allocation-result">
                    <div class="result-info">
                      <code class="result-cidr">{allocation.cidr}</code>
                      <span class="result-pool">in {allocation.pool}</span>
                      <span class="result-size">
                        ({formatNumber(allocation.size)} addresses)
                      </span>
                    </div>
                    <button
                      class="copy-button {clipboard.isCopied(`alloc-${allocation.cidr}`) ? 'copied' : ''}"
                      onclick={() => clipboard.copy(allocation.cidr || '', `alloc-${allocation.cidr}`)}
                    >
                      <Icon name={clipboard.isCopied(`alloc-${allocation.cidr}`) ? 'check' : 'copy'} size="xs" />
                    </button>
                  </div>
                {:else if allocation.reason}
                  <div class="allocation-reason failed">
                    <Icon name="alert-triangle" size="xs" />
                    {allocation.reason}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Pool Utilization -->
        <div class="pools-section">
          <h4 use:tooltip={'Detailed breakdown of how address space was used in each pool'}>Pool Utilization</h4>
          <div class="pools-grid">
            {#each result.pools as pool (pool.original)}
              <div class="pool-card">
                <div class="pool-header">
                  <code class="pool-cidr">{pool.original}</code>
                  <div class="pool-stats">
                    <span
                      class="pool-utilization"
                      class:high={pool.utilization >= 80}
                      class:medium={pool.utilization >= 50 && pool.utilization < 80}
                      class:low={pool.utilization < 50}
                    >
                      {pool.utilization.toFixed(1)}% used
                    </span>
                  </div>
                </div>

                <!-- Utilization Bar -->
                <div class="utilization-bar">
                  <div class="utilization-fill" style="width: {pool.utilization}%"></div>
                </div>

                <!-- Allocated Subnets -->
                {#if pool.allocated.length > 0}
                  <div class="pool-allocations">
                    <h5>Allocated Subnets</h5>
                    <div class="allocated-list">
                      {#each pool.allocated as subnet (subnet.cidr)}
                        <div class="allocated-subnet">
                          <code class="subnet-cidr">{subnet.cidr}</code>
                          <span class="subnet-desc">{subnet.description}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Remaining Space -->
                {#if pool.remaining.length > 0}
                  <div class="pool-remaining">
                    <h5>Available Space</h5>
                    <div class="remaining-list">
                      {#each pool.remaining.slice(0, 5) as remaining (remaining.cidr)}
                        <div class="remaining-block">
                          <code class="remaining-size">
                            {formatNumber(remaining.size)} addresses
                          </code>
                          <span class="remaining-range">
                            {ipToString(remaining.start)} - {ipToString(remaining.start + remaining.size - 1)}
                          </span>
                        </div>
                      {/each}
                      {#if pool.remaining.length > 5}
                        <div class="remaining-more">
                          +{pool.remaining.length - 5} more blocks
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="error-message">
          <Icon name="alert-triangle" />
          <h4>Allocation Error</h4>
          <p>{result.error || 'Unknown error occurred'}</p>
        </div>
      {/if}
    </section>
  {/if}
</div>

<style lang="scss">
  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
  }

  .card-header {
    margin-bottom: var(--spacing-lg);

    h2 {
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-xl);
    }

    p {
      color: var(--text-secondary);
      margin: 0;
    }
  }

  .input-group {
    margin-bottom: var(--spacing-lg);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
    }

    textarea {
      width: 100%;
      padding: var(--spacing-md);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      resize: vertical;
      min-height: 120px;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
      }

      &::placeholder {
        color: var(--text-secondary);
      }
    }
  }

  .algorithm-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .algorithm-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    input {
      display: none;
    }
  }

  .algorithm-option {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
    }

    &:has(input:checked) {
      border-color: var(--color-primary);
      background-color: var(--surface-hover);
    }

    input[type='radio'] {
      margin-top: 2px;
    }
  }

  .option-content {
    flex: 1;
  }

  .option-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .option-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .input-section {
    margin-bottom: var(--spacing-lg);
  }

  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .input-group label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .results-section {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-lg);
  }

  .allocation-summary {
    margin-bottom: var(--spacing-xl);

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);

      h3 {
        color: var(--color-primary);
        margin: 0;
      }
    }
  }

  .copy-all-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
    }

    &.copied {
      background-color: var(--color-success);
      color: var(--bg-primary);
      border-color: var(--color-success);
    }
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    &.success {
      border-color: var(--color-success);
      .summary-icon {
        background-color: var(--color-success);
        color: var(--bg-primary);
      }
    }

    &.info {
      border-color: var(--color-info);
      .summary-icon {
        background-color: var(--color-info);
        color: var(--bg-primary);
      }
    }

    &.error {
      border-color: var(--color-error);

      .summary-icon {
        background-color: var(--color-error);
        color: var(--bg-primary);
      }
    }
  }

  .summary-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .summary-content {
    flex: 1;
  }

  .summary-number {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .summary-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .space-breakdown {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .breakdown-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-xs);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .breakdown-label {
    color: var(--text-secondary);
  }

  .breakdown-value {
    color: var(--text-primary);

    &.allocated {
      color: var(--color-success-light);
      font-weight: 600;
    }
  }

  .allocations-section,
  .pools-section {
    margin-bottom: var(--spacing-xl);

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }
  }

  .allocations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .allocation-item {
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    border: 1px solid var(--border-primary);
    &.success {
      border-left: 4px solid var(--color-success);
    }
    &.failed {
      border-left: 4px solid var(--color-error);
    }
  }

  .allocation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .allocation-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .allocation-request {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-primary);
    background-color: var(--bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
  }

  .allocation-description {
    color: var(--text-secondary);
  }

  .allocation-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .status-text {
    font-size: var(--font-size-sm);
    font-weight: 600;

    &.success {
      color: var(--color-success-light);
    }

    &.failed {
      color: var(--color-error-light);
    }
  }

  .allocation-result {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--bg-tertiary);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
  }

  .result-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .result-cidr {
    font-weight: 600;
    color: var(--color-success-light);
  }

  .result-pool,
  .result-size {
    color: var(--text-secondary);
  }

  .allocation-reason {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-error-light);
    font-size: var(--font-size-sm);
    font-style: italic;

    &.failed {
      background: rgba(var(--color-error-rgb), 0.1);
      border: 1px solid var(--color-error);
      border-radius: var(--radius-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      color: var(--color-error);

      :global(.icon) {
        color: var(--color-error);
      }
    }
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

  .pools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--spacing-lg);
  }

  .pool-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .pool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .pool-cidr {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-primary);
  }

  .pool-utilization {
    font-size: var(--font-size-sm);
    font-weight: 600;
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);

    &.high {
      background-color: var(--color-error);
      color: var(--bg-primary);
    }

    &.medium {
      background-color: var(--color-warning);
      color: var(--bg-primary);
    }

    &.low {
      background-color: var(--color-success);
      color: var(--bg-primary);
    }
  }

  .utilization-bar {
    width: 100%;
    height: 8px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: var(--spacing-md);
  }

  .utilization-fill {
    height: 100%;
    background-color: var(--color-success);
    transition: width var(--transition-fast);
  }

  .pool-allocations,
  .pool-remaining {
    margin-bottom: var(--spacing-md);

    &:last-child {
      margin-bottom: 0;
    }

    h5 {
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-sm);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .allocated-list,
  .remaining-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .allocated-subnet {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .subnet-cidr {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-success-light);
  }

  .subnet-desc {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .remaining-block {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
  }

  .remaining-size {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  .remaining-range {
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }

  .remaining-more {
    padding: var(--spacing-xs);
    text-align: center;
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-style: italic;
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

  @media (max-width: 768px) {
    .input-grid {
      grid-template-columns: 1fr;
    }

    .algorithm-options {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: 1fr;
    }

    .pools-grid {
      grid-template-columns: 1fr;
    }

    .allocation-header {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-sm);
    }

    .allocation-result {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .pool-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }
  }
  .examples-card {
    padding: 0;
  }
</style>
