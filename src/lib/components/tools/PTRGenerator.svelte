<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';

  let inputValue = $state('192.168.1.100');
  let inputType = $state<'single' | 'cidr'>('single');
  let results = $state<{
    success: boolean;
    error?: string;
    entries: Array<{
      ip: string;
      ptrName: string;
      type: 'IPv4' | 'IPv6';
      zone: string;
    }>;
    zoneFiles: Array<{
      zone: string;
      type: 'IPv4' | 'IPv6';
      content: string;
    }>;
    summary: {
      totalEntries: number;
      ipv4Entries: number;
      ipv6Entries: number;
      uniqueZones: number;
    };
  } | null>(null);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let _userModified = $state(false);
  let showZoneFiles = $state(true);

  const examples = [
    {
      label: 'Single IPv4',
      input: '192.168.1.100',
      type: 'single' as const,
      description: 'Generate PTR for single IPv4 address',
    },
    {
      label: 'Single IPv6',
      input: '2001:db8::1',
      type: 'single' as const,
      description: 'Generate PTR for single IPv6 address',
    },
    {
      label: 'IPv4 /24 Subnet',
      input: '192.168.1.0/24',
      type: 'cidr' as const,
      description: 'Generate PTRs for entire /24 subnet',
    },
    {
      label: 'IPv4 /28 Small Block',
      input: '10.0.0.16/28',
      type: 'cidr' as const,
      description: 'Generate PTRs for /28 block (16 addresses)',
    },
    {
      label: 'IPv6 /64 Network',
      input: '2001:db8::/64',
      type: 'cidr' as const,
      description: 'Generate IPv6 PTR zone structure',
    },
    {
      label: 'IPv6 /48 Prefix',
      input: '2001:db8:1000::/48',
      type: 'cidr' as const,
      description: 'Generate IPv6 /48 PTR zone',
    },
  ];

  function loadExample(example: (typeof examples)[0]) {
    inputValue = example.input;
    inputType = example.type;
    selectedExample = example.label;
    _userModified = false;
    generatePTRs();
  }

  function isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
  }

  function isValidIPv6(ip: string): boolean {
    // Basic IPv6 validation - handles compressed notation
    if (ip.includes('::')) {
      const parts = ip.split('::');
      if (parts.length > 2) return false;

      const leftParts = parts[0] ? parts[0].split(':').filter((p) => p) : [];
      const rightParts = parts[1] ? parts[1].split(':').filter((p) => p) : [];

      if (leftParts.length + rightParts.length >= 8) return false;

      return [...leftParts, ...rightParts].every((part) => part.length <= 4 && /^[0-9a-fA-F]*$/.test(part));
    } else {
      const parts = ip.split(':');
      return parts.length === 8 && parts.every((part) => part.length <= 4 && /^[0-9a-fA-F]+$/.test(part));
    }
  }

  function expandIPv6(ip: string): string {
    if (!ip.includes('::')) {
      return ip
        .split(':')
        .map((part) => part.padStart(4, '0'))
        .join(':');
    }

    const parts = ip.split('::');
    const leftParts = parts[0] ? parts[0].split(':').filter((p) => p) : [];
    const rightParts = parts[1] ? parts[1].split(':').filter((p) => p) : [];

    const missingParts = 8 - leftParts.length - rightParts.length;
    const middleParts = Array(missingParts).fill('0000');

    const allParts = [...leftParts, ...middleParts, ...rightParts];
    return allParts.map((part) => part.padStart(4, '0')).join(':');
  }

  function generateIPv4PTR(ip: string): { ptrName: string; zone: string } {
    const parts = ip.split('.');
    const reversed = parts.reverse().join('.');
    const ptrName = `${reversed}.in-addr.arpa`;

    // Determine the zone based on class boundaries
    const zone = `${parts[1]}.${parts[2]}.${parts[3]}.in-addr.arpa`;

    return { ptrName, zone };
  }

  function generateIPv6PTR(ip: string): { ptrName: string; zone: string } {
    const expanded = expandIPv6(ip);
    const hex = expanded.replace(/:/g, '');
    const reversed = hex.split('').reverse().join('.');
    const ptrName = `${reversed}.ip6.arpa`;

    // For zone, typically use /64 boundary (first 16 hex chars)
    const zoneHex = hex.substring(0, 16).split('').reverse().join('.');
    const zone = `${zoneHex}.ip6.arpa`;

    return { ptrName, zone };
  }

  function parseIPv4CIDR(cidr: string): string[] {
    const [network, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr);

    if (!isValidIPv4(network) || prefix < 0 || prefix > 32) {
      throw new Error('Invalid IPv4 CIDR notation');
    }

    const networkParts = network.split('.').map((p) => parseInt(p));
    const hostBits = 32 - prefix;

    // Limit to reasonable sizes
    if (hostBits > 16) {
      throw new Error('CIDR block too large (more than 65536 addresses). Please use a smaller block.');
    }

    const totalHosts = Math.pow(2, hostBits);
    const ips: string[] = [];

    // Calculate network base
    let baseIP = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
    const mask = 0xffffffff << hostBits;
    baseIP = baseIP & mask;

    for (let i = 0; i < totalHosts; i++) {
      const currentIP = baseIP + i;
      const ip = [
        (currentIP >>> 24) & 0xff,
        (currentIP >>> 16) & 0xff,
        (currentIP >>> 8) & 0xff,
        currentIP & 0xff,
      ].join('.');

      ips.push(ip);
    }

    return ips;
  }

  function parseIPv6CIDR(cidr: string): string[] {
    const [network, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr);

    if (!isValidIPv6(network) || prefix < 0 || prefix > 128) {
      throw new Error('Invalid IPv6 CIDR notation');
    }

    // For IPv6, we'll generate a representative set rather than all addresses
    // since IPv6 networks can be astronomically large
    if (prefix > 64) {
      throw new Error('IPv6 CIDR blocks smaller than /64 are not supported for enumeration');
    }

    // For demonstration, return just the network address and a few examples
    const expanded = expandIPv6(network);
    const networkIP = expanded.replace(/:/g, '');

    // Generate some representative addresses
    const ips: string[] = [];

    // Add the network address
    ips.push(network);

    // Add ::1, ::2, ::10, etc for demonstration
    const baseHex = networkIP.substring(0, prefix / 4);
    const examples = ['0001', '0002', '0010', '00ff', 'ffff'];

    examples.forEach((suffix) => {
      const fullHex = baseHex + suffix.padEnd(32 - baseHex.length, '0');
      const formatted = fullHex.match(/.{4}/g)?.join(':') || fullHex;
      ips.push(formatted);
    });

    return ips.slice(0, 10); // Limit to 10 examples
  }

  function generateZoneFileStub(
    zone: string,
    entries: Array<{ ip: string; ptrName: string; type: 'IPv4' | 'IPv6' }>,
    type: 'IPv4' | 'IPv6',
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const serial = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 10);

    let content = `; PTR Zone file for ${zone}
; Generated on ${timestamp}
$TTL 86400

@       IN      SOA     ns1.example.com. hostmaster.example.com. (
                ${serial}01  ; Serial
                3600        ; Refresh
                1800        ; Retry
                1209600     ; Expire
                86400       ; Minimum TTL
)

; Name servers
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; PTR Records
`;

    entries.forEach((entry) => {
      if (entry.type === type) {
        const recordName = entry.ptrName.replace(`.${zone}`, '').replace(/\.$/, '');
        const hostname = `host-${entry.ip.replace(/[:.]/g, '-')}.example.com.`;
        content += `${recordName}        IN      PTR     ${hostname}\n`;
      }
    });

    return content;
  }

  function generatePTRs() {
    if (!inputValue.trim()) {
      results = null;
      return;
    }

    try {
      const trimmed = inputValue.trim();
      const entries: Array<{ ip: string; ptrName: string; type: 'IPv4' | 'IPv6'; zone: string }> = [];

      if (inputType === 'single') {
        // Single IP address
        if (isValidIPv4(trimmed)) {
          const { ptrName, zone } = generateIPv4PTR(trimmed);
          entries.push({ ip: trimmed, ptrName, type: 'IPv4', zone });
        } else if (isValidIPv6(trimmed)) {
          const { ptrName, zone } = generateIPv6PTR(trimmed);
          entries.push({ ip: trimmed, ptrName, type: 'IPv6', zone });
        } else {
          throw new Error('Invalid IP address format');
        }
      } else {
        // CIDR notation
        if (!trimmed.includes('/')) {
          throw new Error('CIDR notation requires a prefix length (e.g., 192.168.1.0/24)');
        }

        const [network] = trimmed.split('/');

        if (isValidIPv4(network)) {
          const ips = parseIPv4CIDR(trimmed);
          ips.forEach((ip) => {
            const { ptrName, zone } = generateIPv4PTR(ip);
            entries.push({ ip, ptrName, type: 'IPv4', zone });
          });
        } else if (isValidIPv6(network)) {
          const ips = parseIPv6CIDR(trimmed);
          ips.forEach((ip) => {
            const { ptrName, zone } = generateIPv6PTR(ip);
            entries.push({ ip, ptrName, type: 'IPv6', zone });
          });
        } else {
          throw new Error('Invalid network address in CIDR notation');
        }
      }

      // Generate zone files
      const uniqueZones = [...new Set(entries.map((e) => e.zone))];
      const zoneFiles = uniqueZones.map((zone) => {
        const zoneEntries = entries.filter((e) => e.zone === zone);
        const type = zoneEntries[0].type;

        return {
          zone,
          type,
          content: generateZoneFileStub(zone, entries, type),
        };
      });

      // Generate summary
      const summary = {
        totalEntries: entries.length,
        ipv4Entries: entries.filter((e) => e.type === 'IPv4').length,
        ipv6Entries: entries.filter((e) => e.type === 'IPv6').length,
        uniqueZones: uniqueZones.length,
      };

      results = {
        success: true,
        entries,
        zoneFiles,
        summary,
      };
    } catch (error) {
      results = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        entries: [],
        zoneFiles: [],
        summary: { totalEntries: 0, ipv4Entries: 0, ipv6Entries: 0, uniqueZones: 0 },
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExample = null;
    generatePTRs();
  }

  function handleTypeChange() {
    _userModified = true;
    selectedExample = null;
    generatePTRs();
  }

  // Generate on component load
  generatePTRs();
</script>

<div class="card">
  <header class="card-header">
    <h1>PTR Record Generator</h1>
    <p>Generate PTR record names for IPv4 and IPv6 addresses and CIDR blocks with zone file stubs</p>
  </header>

  <!-- Educational Overview Card -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="rotate" size="sm" />
        <div>
          <strong>Reverse DNS:</strong> PTR records provide reverse DNS lookups, mapping IP addresses back to domain names.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="server" size="sm" />
        <div>
          <strong>Zone Structure:</strong> IPv4 uses <code>in-addr.arpa</code> and IPv6 uses <code>ip6.arpa</code> for reverse
          DNS zones.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="file" size="sm" />
        <div>
          <strong>Zone Files:</strong> Generates ready-to-use DNS zone file stubs with proper SOA and NS records.
        </div>
      </div>
    </div>
  </div>

  <!-- Examples Card -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Quick Examples</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example (example.label)}
          <button
            class="example-card {selectedExample === example.label ? 'active' : ''}"
            onclick={() => loadExample(example)}
          >
            <div class="example-header">
              <div class="example-label">{example.label}</div>
              <div class="example-type {example.type}">
                {example.type === 'single' ? 'Single IP' : 'CIDR Block'}
              </div>
            </div>
            <code class="example-input">{example.input}</code>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Card -->
  <div class="card input-card">
    <!-- Input Type Selection -->
    <div class="type-section">
      <h3 class="type-label">Input Type</h3>
      <div class="type-options">
        <label class="type-option">
          <input type="radio" bind:group={inputType} value="single" onchange={handleTypeChange} />
          <div class="type-content">
            <Icon name="target" size="sm" />
            <span>Single IP</span>
          </div>
        </label>
        <label class="type-option">
          <input type="radio" bind:group={inputType} value="cidr" onchange={handleTypeChange} />
          <div class="type-content">
            <Icon name="network" size="sm" />
            <span>CIDR Block</span>
          </div>
        </label>
      </div>
    </div>

    <!-- IP/CIDR Input -->
    <div class="input-group">
      <label
        for="ip-input"
        use:tooltip={inputType === 'single'
          ? 'Enter a single IPv4 or IPv6 address'
          : 'Enter an IPv4 or IPv6 CIDR block (e.g., 192.168.1.0/24)'}
      >
        <Icon name={inputType === 'single' ? 'target' : 'network'} size="sm" />
        {inputType === 'single' ? 'IP Address' : 'CIDR Block'}
      </label>
      <input
        id="ip-input"
        type="text"
        bind:value={inputValue}
        oninput={handleInputChange}
        placeholder={inputType === 'single' ? '192.168.1.100 or 2001:db8::1' : '192.168.1.0/24 or 2001:db8::/64'}
        class="ip-input {results?.success === true ? 'valid' : results?.success === false ? 'invalid' : ''}"
        spellcheck="false"
      />
    </div>

    <!-- Options -->
    <div class="options-section">
      <label class="checkbox-option">
        <input type="checkbox" bind:checked={showZoneFiles} />
        <div class="checkbox-custom"></div>
        <div class="checkbox-content">
          <span class="checkbox-label">Generate zone file stubs</span>
          <div class="checkbox-hint">Include DNS zone file templates with SOA and NS records</div>
        </div>
      </label>
    </div>
  </div>

  <!-- Results Card -->
  {#if results && inputValue.trim()}
    <div class="card results-card">
      {#if results.success}
        <div class="results-header">
          <h3>PTR Records Generated</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">{results.summary.totalEntries}</span>
              <span class="stat-label">Total PTRs</span>
            </div>
            {#if results.summary.ipv4Entries > 0}
              <div class="stat-item">
                <span class="stat-value">{results.summary.ipv4Entries}</span>
                <span class="stat-label">IPv4</span>
              </div>
            {/if}
            {#if results.summary.ipv6Entries > 0}
              <div class="stat-item">
                <span class="stat-value">{results.summary.ipv6Entries}</span>
                <span class="stat-label">IPv6</span>
              </div>
            {/if}
            <div class="stat-item">
              <span class="stat-value">{results.summary.uniqueZones}</span>
              <span class="stat-label">Zones</span>
            </div>
          </div>
        </div>

        <!-- PTR Records Table -->
        <div class="ptr-records">
          <h4>
            <Icon name="list" size="sm" />
            PTR Records
          </h4>
          <div class="records-table">
            <div class="table-header">
              <div class="col-ip">IP Address</div>
              <div class="col-ptr">PTR Record Name</div>
              <div class="col-type">Type</div>
              <div class="col-zone">Zone</div>
            </div>
            {#each results.entries.slice(0, 50) as entry (`${entry.ip}-${entry.ptrName}`)}
              <div class="table-row">
                <div class="col-ip">
                  <code>{entry.ip}</code>
                </div>
                <div class="col-ptr">
                  <code>{entry.ptrName}</code>
                  <button
                    class="copy-button {clipboard.isCopied(`ptr-${entry.ip}`) ? 'copied' : ''}"
                    onclick={() => clipboard.copy(entry.ptrName, `ptr-${entry.ip}`)}
                  >
                    <Icon name={clipboard.isCopied(`ptr-${entry.ip}`) ? 'check' : 'copy'} size="sm" />
                  </button>
                </div>
                <div class="col-type">
                  <span class="type-badge {entry.type.toLowerCase()}">{entry.type}</span>
                </div>
                <div class="col-zone">
                  <code class="zone-name">{entry.zone}</code>
                </div>
              </div>
            {/each}
            {#if results.entries.length > 50}
              <div class="table-truncated">
                ... and {results.entries.length - 50} more records
              </div>
            {/if}
          </div>
        </div>

        <!-- Zone Files -->
        {#if showZoneFiles && results.zoneFiles.length > 0}
          <div class="zone-files">
            <h4>
              <Icon name="file" size="sm" />
              Zone File Stubs
            </h4>
            {#each results.zoneFiles as zoneFile (zoneFile.zone)}
              <div class="zone-file">
                <div class="zone-file-header">
                  <div class="zone-info">
                    <h5>{zoneFile.zone}</h5>
                    <span class="zone-type {zoneFile.type.toLowerCase()}">{zoneFile.type}</span>
                  </div>
                  <button
                    class="copy-button {clipboard.isCopied(`zone-${zoneFile.zone}`) ? 'copied' : ''}"
                    onclick={() => clipboard.copy(zoneFile.content, `zone-${zoneFile.zone}`)}
                  >
                    <Icon name={clipboard.isCopied(`zone-${zoneFile.zone}`) ? 'check' : 'copy'} size="sm" />
                    Copy Zone File
                  </button>
                </div>
                <pre class="zone-content"><code>{zoneFile.content}</code></pre>
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="error-result">
          <Icon name="alert-triangle" size="lg" />
          <h4>Generation Error</h4>
          <p>{results.error}</p>
          <div class="error-help">
            <strong>Valid formats:</strong>
            <ul>
              <li>Single IPv4: 192.168.1.100</li>
              <li>Single IPv6: 2001:db8::1</li>
              <li>IPv4 CIDR: 192.168.1.0/24 (max /16)</li>
              <li>IPv6 CIDR: 2001:db8::/64 (max /64)</li>
            </ul>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Educational Content Card -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>What are PTR Records?</h4>
        <p>
          PTR (Pointer) records provide reverse DNS lookups, allowing you to resolve an IP address back to a domain
          name. They're essential for mail servers, logging, and network diagnostics.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Zone Structure</h4>
        <p>
          IPv4 reverse zones use <code>in-addr.arpa</code> with octets reversed (e.g., 1.168.192.in-addr.arpa for
          192.168.1.x). IPv6 uses <code>ip6.arpa</code> with individual hex digits reversed.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Zone Delegation</h4>
        <p>
          PTR zones are typically delegated by your ISP or hosting provider. The zone files generated here provide
          templates that can be customized for your specific DNS infrastructure.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Best Practices</h4>
        <p>
          Ensure PTR records match forward DNS (A/AAAA) records. Use descriptive hostnames that include the IP address
          or subnet information for easier network management.
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .info-card {
    margin-bottom: var(--spacing-xl);
  }

  .overview-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .overview-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-secondary);

    code {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
    }

    strong {
      color: var(--text-primary);
    }
  }

  .examples-card {
    margin-bottom: var(--spacing-xl);
    padding: 0;
  }

  .examples-details {
    border: none;
    background: none;

    &[open] {
      .examples-summary :global(.icon) {
        transform: rotate(90deg);
      }
    }
  }

  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);
    border-radius: var(--radius-md);

    &:hover {
      background-color: var(--surface-hover);
    }

    &::-webkit-details-marker {
      display: none;
    }

    :global(.icon) {
      transition: transform var(--transition-fast);
    }

    h3 {
      margin: 0;
      font-size: var(--font-size-md);
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .example-card {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
      transform: translateY(-1px);
    }

    &.active {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
      box-shadow: var(--shadow-md);
    }
  }

  .example-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .example-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-type {
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-weight: 600;

    &.single {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    &.cidr {
      background-color: rgba(59, 130, 246, 0.1);
      color: var(--color-primary);
    }
  }

  .example-input {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    word-break: break-all;
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .input-card {
    margin-bottom: var(--spacing-xl);
  }

  .type-section {
    margin-bottom: var(--spacing-lg);
  }

  .type-label {
    display: block;
    margin-bottom: var(--spacing-sm);
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-md);
  }

  .type-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
  }

  .type-option {
    position: relative;
    cursor: pointer;

    input[type='radio'] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .type-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background-color: var(--bg-secondary);
      border: 2px solid var(--border-primary);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      font-weight: 600;
      color: var(--text-primary);
    }

    &:hover .type-content {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
    }

    input[type='radio']:checked + .type-content {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
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
      font-size: var(--font-size-md);
    }
  }

  .ip-input {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-lg);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--border-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }

    &.valid {
      border-color: var(--color-success);
    }

    &.invalid {
      border-color: var(--color-error);
    }
  }

  .options-section {
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-secondary);
  }

  .checkbox-option {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    cursor: pointer;
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
    align-items: center;

    &:hover {
      background-color: var(--surface-hover);
    }

    input[type='checkbox'] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checkbox-custom {
      position: relative;
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-primary);
      border-radius: var(--radius-md);
      background-color: var(--bg-secondary);
      transition: all var(--transition-fast);
      flex-shrink: 0;
      margin-top: 2px; // Align with text baseline

      &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 5px;
        width: 6px;
        height: 10px;
        border: solid var(--bg-primary);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg) scale(0);
        transition: all var(--transition-fast);
        opacity: 0;
      }
    }

    input[type='checkbox']:checked + .checkbox-custom {
      background-color: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        transform: rotate(45deg) scale(1);
        opacity: 1;
      }
    }

    input[type='checkbox']:focus + .checkbox-custom {
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
    }

    .checkbox-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .checkbox-label {
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }

    .checkbox-hint {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.4;
    }
  }

  .results-card {
    margin-bottom: var(--spacing-xl);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
    }

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0;
    }
  }

  .summary-stats {
    display: flex;
    gap: var(--spacing-lg);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .stat-value {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ptr-records {
    margin-bottom: var(--spacing-xl);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
    }
  }

  .records-table {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: 1.2fr 2fr auto 1.3fr;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    align-items: center;
  }

  .table-header {
    background-color: var(--bg-secondary);
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-primary);
  }

  .table-row {
    border-bottom: 1px solid var(--border-secondary);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: var(--surface-hover);
    }
  }

  .col-ptr {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .copy-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    flex-shrink: 0;

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
    }

    &.copied {
      color: var(--color-success);
    }
  }

  .type-badge {
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-weight: 600;

    &.ipv4 {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    &.ipv6 {
      background-color: rgba(147, 51, 234, 0.1);
      color: var(--color-accent);
    }
  }

  .zone-name {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .table-truncated {
    padding: var(--spacing-md);
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
    background-color: var(--bg-secondary);
  }

  .zone-files {
    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-lg);
    }
  }

  .zone-file {
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .zone-file-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
  }

  .zone-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    h5 {
      margin: 0;
      font-family: var(--font-mono);
      color: var(--text-primary);
    }
  }

  .zone-type {
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-weight: 600;

    &.ipv4 {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    &.ipv6 {
      background-color: rgba(147, 51, 234, 0.1);
      color: var(--color-accent);
    }
  }

  .zone-content {
    padding: var(--spacing-lg);
    background-color: var(--bg-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    line-height: 1.6;
    overflow-x: auto;
    color: var(--text-secondary);
    code {
      background: none;
    }
  }

  .error-result {
    text-align: center;
    padding: var(--spacing-xl);
    background-color: var(--bg-secondary);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-lg);
    color: var(--color-error-light);

    :global(.icon) {
      color: var(--color-error);
      margin-bottom: var(--spacing-md);
    }

    h4 {
      margin-bottom: var(--spacing-md);
    }

    p {
      margin-bottom: var(--spacing-lg);
    }
  }

  .error-help {
    text-align: left;
    background-color: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    color: var(--text-secondary);

    ul {
      margin-top: var(--spacing-sm);
      padding-left: var(--spacing-lg);

      li {
        margin-bottom: var(--spacing-xs);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
      }
    }
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .education-item {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
      color: var(--color-primary);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }

    code {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
    }
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .type-options {
      grid-template-columns: 1fr;
    }

    .summary-stats {
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .table-header,
    .table-row {
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-sm);
      font-size: var(--font-size-sm);
    }

    .col-type,
    .col-zone {
      order: 3;
    }

    .zone-file-header {
      flex-direction: column;
      gap: var(--spacing-md);
      align-items: stretch;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
