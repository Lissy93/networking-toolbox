<script lang="ts">
  // import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';

  let input = $state('192.168.1.0/28');
  let maxDisplayLimit = $state(1000);
  let includeNetwork = $state(true);
  let includeBroadcast = $state(true);
  let result = $state<{
    success: boolean;
    error?: string;
    addresses: string[];
    totalCount: number;
    displayCount: number;
    truncated: boolean;
    networkInfo: {
      type: 'cidr' | 'range' | 'single';
      network?: string;
      broadcast?: string;
      firstUsable?: string;
      lastUsable?: string;
      totalHosts?: number;
    };
  } | null>(null);
  let isGenerating = $state(false);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let _userModified = $state(false);

  // Safety limits to prevent browser crashes
  const ABSOLUTE_MAX_DISPLAY = 10000;
  const ABSOLUTE_MAX_GENERATION = 100000;

  const examples = [
    {
      label: 'Small Subnet /28',
      input: '192.168.1.0/28',
      description: '16 addresses',
    },
    {
      label: 'Point-to-Point /30',
      input: '10.0.0.0/30',
      description: '4 addresses',
    },
    {
      label: 'IP Range',
      input: '172.16.1.1-172.16.1.10',
      description: '10 addresses',
    },
    {
      label: 'Class C /24',
      input: '192.168.0.0/24',
      description: '256 addresses',
    },
    {
      label: 'IPv6 /126',
      input: '2001:db8::/126',
      description: '4 addresses',
    },
  ];

  function loadExample(example: (typeof examples)[0]) {
    input = example.input;
    selectedExample = example.label;
    _userModified = false;
    enumerateIPs();
  }

  function parseIP(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  function ipToString(ip: number): string {
    return [(ip >>> 24) & 0xff, (ip >>> 16) & 0xff, (ip >>> 8) & 0xff, ip & 0xff].join('.');
  }

  function parseIPv6(ip: string): bigint {
    // Simplified IPv6 parsing for basic cases
    const parts = ip.split(':');
    let result = 0n;

    for (let i = 0; i < 8; i++) {
      if (i < parts.length && parts[i]) {
        const hexValue = parseInt(parts[i], 16);
        result = (result << 16n) + BigInt(hexValue);
      } else {
        result = result << 16n;
      }
    }

    return result;
  }

  function ipv6ToString(ip: bigint): string {
    const parts = [];
    for (let i = 0; i < 8; i++) {
      const part = (ip >> BigInt((7 - i) * 16)) & 0xffffn;
      parts.push(part.toString(16));
    }
    return parts.join(':');
  }

  function parseCIDR(cidr: string): { network: number; size: number; prefixLength: number } {
    const [networkStr, prefixStr] = cidr.split('/');
    const prefixLength = parseInt(prefixStr);
    const network = parseIP(networkStr) & (0xffffffff << (32 - prefixLength));
    const size = Math.pow(2, 32 - prefixLength);
    return { network, prefixLength, size };
  }

  function parseIPv6CIDR(cidr: string): { network: bigint; size: bigint; prefixLength: number } {
    const [networkStr, prefixStr] = cidr.split('/');
    const prefixLength = parseInt(prefixStr);
    const network = parseIPv6(networkStr) & (0xffffffffffffffffffffffffffffffffn << BigInt(128 - prefixLength));
    const size = 2n ** BigInt(128 - prefixLength);
    return { network, prefixLength, size };
  }

  function parseRange(range: string): { start: number; end: number; count: number } {
    const [startStr, endStr] = range.split('-').map((s) => s.trim());
    const start = parseIP(startStr);
    const end = parseIP(endStr);
    return { start, end, count: end - start + 1 };
  }

  function estimateMemoryUsage(count: number): string {
    // Rough estimate: each IP string ~15 bytes + overhead
    const bytesPerIP = 20;
    const totalBytes = count * bytesPerIP;

    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${Math.round(totalBytes / 1024)} KB`;
    return `${Math.round(totalBytes / (1024 * 1024))} MB`;
  }

  async function enumerateIPs() {
    if (!input.trim()) {
      result = null;
      return;
    }

    isGenerating = true;

    try {
      const trimmed = input.trim();
      let addresses: string[] = [];
      let totalCount = 0;
      let networkInfo: {
        type: 'cidr' | 'range' | 'single';
        network?: string;
        broadcast?: string;
        firstUsable?: string;
        lastUsable?: string;
        totalHosts?: number;
      } = { type: 'single' as const };

      // Determine input type
      if (trimmed.includes('/')) {
        // CIDR notation
        if (trimmed.includes(':')) {
          // IPv6 CIDR
          const { network, size, prefixLength } = parseIPv6CIDR(trimmed);

          if (size > BigInt(ABSOLUTE_MAX_GENERATION)) {
            throw new Error(
              `IPv6 /${prefixLength} would generate ${formatNumber(Number(size))} addresses. Maximum allowed: ${formatNumber(ABSOLUTE_MAX_GENERATION)}`,
            );
          }

          totalCount = Number(size);
          networkInfo = {
            type: 'cidr' as const,
            network: ipv6ToString(network),
            totalHosts: totalCount,
          };

          // Generate IPv6 addresses
          const displayLimit = Math.min(maxDisplayLimit, ABSOLUTE_MAX_DISPLAY, totalCount);
          for (let i = 0n; i < BigInt(displayLimit); i++) {
            addresses.push(ipv6ToString(network + i));
          }
        } else {
          // IPv4 CIDR
          const { network, size, prefixLength } = parseCIDR(trimmed);

          if (size > ABSOLUTE_MAX_GENERATION) {
            throw new Error(
              `/${prefixLength} would generate ${formatNumber(size)} addresses. Maximum allowed: ${formatNumber(ABSOLUTE_MAX_GENERATION)}`,
            );
          }

          totalCount = size;
          const broadcast = network + size - 1;

          networkInfo = {
            type: 'cidr' as const,
            network: ipToString(network),
            broadcast: ipToString(broadcast),
            firstUsable: size > 2 ? ipToString(network + 1) : ipToString(network),
            lastUsable: size > 2 ? ipToString(broadcast - 1) : ipToString(broadcast),
            totalHosts: Math.max(0, size - 2),
          };

          // Generate addresses based on inclusion options
          let startAddr = network;
          let endAddr = network + size;

          if (!includeNetwork && size > 1) startAddr += 1;
          if (!includeBroadcast && size > 1) endAddr -= 1;

          const displayLimit = Math.min(maxDisplayLimit, ABSOLUTE_MAX_DISPLAY, endAddr - startAddr);
          for (let i = 0; i < displayLimit; i++) {
            addresses.push(ipToString(startAddr + i));
          }
        }
      } else if (trimmed.includes('-')) {
        // IP range
        const { start, end, count } = parseRange(trimmed);

        if (count > ABSOLUTE_MAX_GENERATION) {
          throw new Error(
            `Range would generate ${formatNumber(count)} addresses. Maximum allowed: ${formatNumber(ABSOLUTE_MAX_GENERATION)}`,
          );
        }

        totalCount = count;
        networkInfo = {
          type: 'range' as const,
          firstUsable: ipToString(start),
          lastUsable: ipToString(end),
        };

        const displayLimit = Math.min(maxDisplayLimit, ABSOLUTE_MAX_DISPLAY, count);
        for (let i = 0; i < displayLimit; i++) {
          addresses.push(ipToString(start + i));
        }
      } else {
        // Single IP
        addresses = [trimmed];
        totalCount = 1;
        networkInfo = { type: 'single' as const };
      }

      // Add small delay for UX (shows loading state)
      await new Promise((resolve) => setTimeout(resolve, 100));

      result = {
        success: true,
        addresses,
        totalCount,
        displayCount: addresses.length,
        truncated: addresses.length < totalCount,
        networkInfo,
      };
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        addresses: [],
        totalCount: 0,
        displayCount: 0,
        truncated: false,
        networkInfo: { type: 'single' as const },
      };
    } finally {
      isGenerating = false;
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExample = null;
    enumerateIPs();
  }

  async function exportToCSV() {
    if (!result?.addresses.length) return;

    // For large datasets, generate on-the-fly to avoid memory issues
    let csvContent = 'ip_address\n';

    if (result.totalCount <= 10000) {
      // Small dataset - include all addresses
      for (const ip of result.addresses) {
        csvContent += `${ip}\n`;
      }
    } else {
      // Large dataset - this would need chunked generation
      // For now, just export what's displayed
      csvContent += '# Note: Only displaying first ' + result.addresses.length + ' addresses\n';
      for (const ip of result.addresses) {
        csvContent += `${ip}\n`;
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip-enumerate-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function exportToJSON() {
    if (!result?.addresses.length) return;

    const jsonData = {
      input: input,
      timestamp: new Date().toISOString(),
      totalCount: result.totalCount,
      displayCount: result.displayCount,
      truncated: result.truncated,
      networkInfo: result.networkInfo,
      addresses: result.addresses,
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip-enumerate-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Generate on component load
  enumerateIPs();
</script>

<div class="container">
  <!-- Input Card with everything -->
  <div class="card main-input-card">
    <header class="card-header">
      <h2>IP Enumerate</h2>
      <p>Safely enumerate all IP addresses in CIDR blocks and ranges</p>
    </header>

    <input
      type="text"
      bind:value={input}
      oninput={handleInputChange}
      placeholder="192.168.1.0/28 or 10.0.0.1-10.0.0.10"
      class="network-input"
    />

    <div class="options-row">
      <div class="limit-control">
        <label for="max-display">Max Display</label>
        <input
          id="max-display"
          type="number"
          bind:value={maxDisplayLimit}
          oninput={handleInputChange}
          min="1"
          max={ABSOLUTE_MAX_DISPLAY}
          class="limit-input"
        />
      </div>

      <div class="checkbox-group">
        <label class="checkbox-option">
          <input type="checkbox" bind:checked={includeNetwork} onchange={handleInputChange} />
          <span class="checkmark"></span>
          Network
        </label>
        <label class="checkbox-option">
          <input type="checkbox" bind:checked={includeBroadcast} onchange={handleInputChange} />
          <span class="checkmark"></span>
          Broadcast
        </label>
      </div>
    </div>

    <!-- Quick Examples -->
    <div class="examples-section">
      <details class="examples-details">
        <summary class="examples-summary">
          <Icon name="chevron-right" size="sm" />
          <h4>Quick Examples</h4>
        </summary>
        <div class="examples-list">
          {#each examples as example (example.label)}
            <button
              class="example-item {selectedExample === example.label ? 'active' : ''}"
              onclick={() => loadExample(example)}
            >
              <div class="example-label">{example.label}</div>
              <code class="example-input">{example.input}</code>
              <div class="example-desc">{example.description}</div>
            </button>
          {/each}
        </div>
      </details>
    </div>

    <!-- Safety Warning -->
    <div class="safety-warning">
      <Icon name="alert-triangle" size="sm" />
      <div>
        <strong>Safety:</strong> Max {formatNumber(ABSOLUTE_MAX_DISPLAY)} displayed, {formatNumber(
          ABSOLUTE_MAX_GENERATION,
        )}
        generated
      </div>
    </div>
  </div>

  <!-- Loading -->
  {#if isGenerating}
    <div class="card loading-card">
      <div class="loading-content">
        <Icon name="loader" size="lg" />
        <span>Generating IP addresses...</span>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if result && !isGenerating}
    <div class="results-grid">
      {#if result.success}
        <!-- Summary Card -->
        <div class="card summary-card">
          <div class="card-header">
            <h3>
              <Icon name="list" size="sm" />
              Results
            </h3>
          </div>

          <div class="export-actions">
            <button class="export-btn" onclick={exportToJSON}>
              <Icon name="json-file" size="sm" />
              JSON
            </button>
            <button class="export-btn" onclick={exportToCSV}>
              <Icon name="csv-file" size="sm" />
              CSV
            </button>
            <button
              class="copy-btn {clipboard.isCopied('all-addresses') ? 'copied' : ''}"
              onclick={() => clipboard.copy((result?.addresses || []).join('\n'), 'all-addresses')}
            >
              <Icon name={clipboard.isCopied('all-addresses') ? 'check' : 'copy'} size="sm" />
              Copy All
            </button>
          </div>

          <div class="summary-stats">
            <div class="stat">
              <span class="stat-value">{formatNumber(result.totalCount)}</span>
              <span class="stat-label">Total</span>
            </div>
            <div class="stat">
              <span class="stat-value">{formatNumber(result.displayCount)}</span>
              <span class="stat-label">Shown</span>
            </div>
            <div class="stat">
              <span class="stat-value">{estimateMemoryUsage(result.displayCount)}</span>
              <span class="stat-label">Memory</span>
            </div>
          </div>

          {#if result.networkInfo.network}
            <div class="network-info">
              <div class="info-item">
                <span>Network:</span>
                <code>{result.networkInfo.network}</code>
              </div>
              {#if result.networkInfo.broadcast}
                <div class="info-item">
                  <span>Broadcast:</span>
                  <code>{result.networkInfo.broadcast}</code>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Addresses Card -->
        <div class="card addresses-card">
          <div class="card-header">
            <h3>
              <Icon name="target" size="sm" />
              IP Addresses
            </h3>
            {#if result.truncated}
              <span class="truncated-notice"
                >Showing {formatNumber(result.displayCount)} of {formatNumber(result.totalCount)}</span
              >
            {/if}
          </div>

          <div class="addresses-list">
            {#each result.addresses as address, index (index)}
              <div class="address-item">
                <span class="address-index">{index + 1}</span>
                <code class="address-code">{address}</code>
                <button
                  class="copy-btn-small {clipboard.isCopied(address) ? 'copied' : ''}"
                  onclick={() => clipboard.copy(address, address)}
                >
                  <Icon name={clipboard.isCopied(address) ? 'check' : 'copy'} size="xs" />
                </button>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="card error-card">
          <div class="error-content">
            <Icon name="alert-triangle" size="lg" />
            <h3>Error</h3>
            <p>{result.error}</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    max-width: 100%;
  }

  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .main-input-card {
    margin-bottom: var(--spacing-xl);

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

    .safety-warning {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: rgba(var(--color-warning-rgb), 0.1);
      border: 1px solid var(--color-warning);
      border-radius: var(--radius-md);
      color: var(--color-warning);
      font-size: var(--font-size-sm);
      margin: var(--spacing-lg) auto 0;
    }

    .network-input {
      width: 100%;
      padding: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      font-size: var(--font-size-lg);
      font-family: var(--font-mono);
      border: 2px solid var(--border-primary);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }

    .options-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
      }
    }

    .examples-section {
      border-top: 1px solid var(--border-secondary);
      padding-top: var(--spacing-lg);
    }

    .limit-control {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      label {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }

      .limit-input {
        width: 100px;
        padding: var(--spacing-xs);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        background: var(--bg-primary);
      }
    }

    .checkbox-group {
      display: flex;
      gap: var(--spacing-md);

      @media (max-width: 768px) {
        justify-content: space-around;
      }
    }

    .checkbox-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      cursor: pointer;

      input[type='checkbox'] {
        display: none;
      }

      .checkmark {
        width: 16px;
        height: 16px;
        border: 2px solid var(--border-primary);
        border-radius: var(--radius-sm);
        background: var(--bg-primary);
        position: relative;

        &::after {
          content: '✓';
          position: absolute;
          top: -2px;
          left: 1px;
          font-size: 12px;
          color: var(--color-primary);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
      }

      input[type='checkbox']:checked + .checkmark {
        background: var(--color-primary);
        border-color: var(--color-primary);

        &::after {
          opacity: 1;
          color: var(--bg-secondary);
        }
      }
    }
  }

  .examples-details {
    summary {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      cursor: pointer;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }

      :global(.icon) {
        transition: transform var(--transition-fast);
      }

      h4 {
        margin: 0;
      }
    }
  }

  .examples-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
  }

  .example-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover,
    &.active {
      border-color: var(--color-primary);
      background: var(--surface-hover);
    }

    .example-label {
      font-weight: 600;
      font-size: var(--font-size-sm);
    }

    .example-input {
      font-family: var(--font-mono);
      font-size: var(--font-size-xs);
      color: var(--color-primary);
      background: var(--bg-tertiary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-sm);
    }

    .example-desc {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }
  }

  .loading-card {
    text-align: center;
    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-md);
    }
  }

  .results-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--spacing-lg);
    .card {
      width: 100%;
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .summary-card {
    .export-actions {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
      justify-content: center;

      @media (max-width: 768px) {
        flex-direction: column;
      }
    }

    .export-btn,
    .copy-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--surface-hover);
      }
    }

    .copy-btn {
      &.copied {
        color: var(--color-success);
      }
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: var(--spacing-md);
      margin: var(--spacing-lg) 0;
    }

    .stat {
      text-align: center;

      .stat-value {
        display: block;
        font-size: var(--font-size-lg);
        font-weight: 700;
        color: var(--text-primary);
      }

      .stat-label {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        text-transform: uppercase;
      }
    }

    .network-info {
      border-top: 1px solid var(--border-secondary);
      padding-top: var(--spacing-md);

      .info-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-xs);

        span {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }

        code {
          font-family: var(--font-mono);
          background: var(--bg-tertiary);
          padding: 2px var(--spacing-xs);
          border-radius: var(--radius-sm);
        }
      }
    }
  }

  .addresses-card {
    .truncated-notice {
      font-size: var(--font-size-xs);
      color: var(--color-warning);
      margin-left: auto;
    }

    .addresses-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }

    .address-item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-bottom: 1px solid var(--border-secondary);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--surface-hover);
      }

      .address-index {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        width: 40px;
      }

      .address-code {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
      }

      .copy-btn-small {
        padding: var(--spacing-xs);
        border: none;
        background: none;
        cursor: pointer;
        color: var(--text-secondary);
        transition: color var(--transition-fast);

        &:hover {
          color: var(--text-primary);
        }

        &.copied {
          color: var(--color-success);
        }
      }
    }
  }

  .error-card {
    .error-content {
      text-align: center;
      color: var(--color-error);

      h3 {
        margin: var(--spacing-md) 0;
      }
    }
  }
</style>
