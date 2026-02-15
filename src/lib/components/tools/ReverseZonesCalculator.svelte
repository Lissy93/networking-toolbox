<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { calculateReverseZones, type ReverseZoneInfo } from '$lib/utils/reverse-dns.js';
  import { useClipboard } from '$lib/composables';

  let cidrInput = $state('192.168.1.0/24');
  let results = $state<{
    success: boolean;
    error?: string;
    zones: ReverseZoneInfo[];
    analysis: {
      totalZones: number;
      ipv4Zones: number;
      ipv6Zones: number;
      delegationType: string;
    };
  } | null>(null);

  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let _userModified = $state(false);

  const examples = [
    {
      label: 'IPv4 /24 Network',
      cidr: '192.168.1.0/24',
      description: 'Single /24 zone delegation',
    },
    {
      label: 'IPv4 /16 Network',
      cidr: '10.0.0.0/16',
      description: '/16 network with multiple /24 zones',
    },
    {
      label: 'IPv4 /20 Block',
      cidr: '172.16.32.0/20',
      description: '16 /24 zones needed',
    },
    {
      label: 'IPv4 /28 Subnet',
      cidr: '192.168.1.16/28',
      description: 'Small subnet within /24 zone',
    },
    {
      label: 'IPv6 /64 Network',
      cidr: '2001:db8:1000::/64',
      description: 'IPv6 nibble boundary delegation',
    },
    {
      label: 'IPv6 /48 Prefix',
      cidr: '2001:db8::/48',
      description: 'IPv6 /48 delegation zone',
    },
  ];

  function loadExample(example: (typeof examples)[0]) {
    cidrInput = example.cidr;
    selectedExample = example.label;
    _userModified = false;
    calculateZones();
  }

  function calculateZones() {
    if (!cidrInput.trim()) {
      results = null;
      return;
    }

    try {
      const trimmed = cidrInput.trim();
      const zones = calculateReverseZones(trimmed);

      if (zones.length === 0) {
        throw new Error('No reverse zones could be calculated for this CIDR');
      }

      // Analyze the results
      const ipv4Zones = zones.filter((z) => z.type === 'IPv4').length;
      const ipv6Zones = zones.filter((z) => z.type === 'IPv6').length;

      let delegationType = '';
      if (ipv4Zones > 0) {
        if (ipv4Zones === 1) {
          delegationType = zones[0].delegation.includes('/24') ? '/24 network' : `Custom (${zones[0].delegation})`;
        } else {
          delegationType = `Multiple zones (${ipv4Zones} x /24)`;
        }
      } else if (ipv6Zones > 0) {
        const nibbleDepth = zones[0].nibbleDepth || 0;
        delegationType = `IPv6 nibble boundary (${nibbleDepth} nibbles)`;
      }

      results = {
        success: true,
        zones,
        analysis: {
          totalZones: zones.length,
          ipv4Zones,
          ipv6Zones,
          delegationType,
        },
      };
    } catch (error) {
      results = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        zones: [],
        analysis: { totalZones: 0, ipv4Zones: 0, ipv6Zones: 0, delegationType: '' },
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExample = null;
    calculateZones();
  }

  function generateBindConfig(zones: ReverseZoneInfo[]): string {
    return zones
      .map(
        (zone) =>
          `zone "${zone.zone}" {
    type master;
    file "/etc/bind/zones/${zone.zone}";
};`,
      )
      .join('\n\n');
  }

  function generateDelegationCommands(zones: ReverseZoneInfo[]): string {
    return zones
      .map((zone) => {
        const _zoneFile = zone.zone.replace(/\./g, '_');
        return `# Create zone file for ${zone.zone}
touch /etc/bind/zones/${zone.zone}
chown bind:bind /etc/bind/zones/${zone.zone}
chmod 644 /etc/bind/zones/${zone.zone}`;
      })
      .join('\n\n');
  }

  // Calculate on component load
  calculateZones();
</script>

<div class="card">
  <header class="card-header">
    <h1>Reverse Zones Calculator</h1>
    <p>Calculate the minimal set of reverse DNS zones needed to delegate a CIDR block</p>
  </header>

  <!-- Educational Overview Card -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="layers" size="sm" />
        <div>
          <strong>Zone Boundaries:</strong> IPv4 uses octet boundaries (/8, /16, /24) and IPv6 uses nibble boundaries (4-bit
          increments).
        </div>
      </div>
      <div class="overview-item">
        <Icon name="share" size="sm" />
        <div>
          <strong>Delegation:</strong> DNS zones must be properly delegated by upstream providers at natural boundaries.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="calculator" size="sm" />
        <div>
          <strong>Optimization:</strong> Calculate the minimal number of zones needed to avoid unnecessary complexity.
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
            </div>
            <code class="example-input">{example.cidr}</code>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Card -->
  <div class="card input-card">
    <div class="input-group">
      <label for="cidr-input" use:tooltip={'Enter a CIDR block to calculate reverse zones for'}>
        <Icon name="network" size="sm" />
        CIDR Block
      </label>
      <input
        id="cidr-input"
        type="text"
        bind:value={cidrInput}
        oninput={handleInputChange}
        placeholder="192.168.1.0/24 or 2001:db8::/64"
        class="cidr-input {results?.success === true ? 'valid' : results?.success === false ? 'invalid' : ''}"
        spellcheck="false"
      />
    </div>
  </div>

  <!-- Results Card -->
  {#if results && cidrInput.trim()}
    <div class="card results-card">
      {#if results.success}
        <div class="results-header">
          <h3>Reverse Zone Analysis</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">{results.analysis.totalZones}</span>
              <span class="stat-label">Total Zones</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{results.analysis.delegationType}</span>
              <span class="stat-label">Delegation Type</span>
            </div>
          </div>
        </div>

        <!-- Zone List -->
        <div class="zones-section">
          <h4>
            <Icon name="list" size="sm" />
            Required Reverse Zones
          </h4>
          <div class="zones-grid">
            {#each results.zones as zone, index (zone.zone)}
              <div class="zone-card">
                <div class="zone-header">
                  <div class="zone-info">
                    <h5>{zone.zone}</h5>
                    <div class="zone-meta">
                      <span class="zone-type {zone.type.toLowerCase()}">{zone.type}</span>
                      <span class="delegation-info">{zone.delegation}</span>
                      {#if zone.nibbleDepth}
                        <span class="nibble-info">{zone.nibbleDepth} nibbles</span>
                      {/if}
                    </div>
                  </div>
                  <button
                    class="copy-button {clipboard.isCopied(`zone-${index}`) ? 'copied' : ''}"
                    onclick={() => clipboard.copy(zone.zone, `zone-${index}`)}
                  >
                    <Icon name={clipboard.isCopied(`zone-${index}`) ? 'check' : 'copy'} size="sm" />
                  </button>
                </div>

                <div class="zone-description">
                  {#if zone.type === 'IPv4'}
                    {#if zone.delegation === '/24'}
                      Standard /24 reverse zone for 256 addresses
                    {:else if zone.delegation === '/16'}
                      /16 reverse zone covering 65,536 addresses
                    {:else if zone.delegation === '/8'}
                      /8 reverse zone covering 16,777,216 addresses
                    {:else}
                      Custom IPv4 reverse zone for {zone.delegation} prefix
                    {/if}
                  {:else}
                    IPv6 reverse zone using {zone.nibbleDepth} nibble{zone.nibbleDepth !== 1 ? 's' : ''}
                    ({zone.delegation} prefix)
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Configuration Examples -->
        <div class="config-section">
          <h4>
            <Icon name="settings" size="sm" />
            Configuration Examples
          </h4>

          <div class="config-examples">
            <!-- BIND Configuration -->
            <div class="config-example">
              <div class="config-header">
                <h5>BIND9 Configuration</h5>
                <button
                  class="copy-button {clipboard.isCopied('bind-config') ? 'copied' : ''}"
                  onclick={() => results && clipboard.copy(generateBindConfig(results.zones), 'bind-config')}
                >
                  <Icon name={clipboard.isCopied('bind-config') ? 'check' : 'copy'} size="sm" />
                  Copy Config
                </button>
              </div>
              <pre class="config-content"><code>{generateBindConfig(results.zones)}</code></pre>
            </div>

            <!-- Delegation Commands -->
            <div class="config-example">
              <div class="config-header">
                <h5>Zone File Setup Commands</h5>
                <button
                  class="copy-button {clipboard.isCopied('setup-commands') ? 'copied' : ''}"
                  onclick={() => results && clipboard.copy(generateDelegationCommands(results.zones), 'setup-commands')}
                >
                  <Icon name={clipboard.isCopied('setup-commands') ? 'check' : 'copy'} size="sm" />
                  Copy Commands
                </button>
              </div>
              <pre class="config-content"><code>{generateDelegationCommands(results.zones)}</code></pre>
            </div>
          </div>
        </div>
      {:else}
        <div class="error-result">
          <Icon name="alert-triangle" size="lg" />
          <h4>Calculation Error</h4>
          <p>{results.error}</p>
          <div class="error-help">
            <strong>Valid formats:</strong>
            <ul>
              <li>IPv4 CIDR: 192.168.1.0/24, 10.0.0.0/16, 172.16.0.0/20</li>
              <li>IPv6 CIDR: 2001:db8::/64, fe80::/10, ::1/128</li>
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
        <h4>Zone Delegation Basics</h4>
        <p>
          Reverse DNS zones must be delegated at natural boundaries. IPv4 uses octet boundaries (/8, /16, /24) while
          IPv6 uses nibble boundaries (every 4 bits). Delegation happens from your ISP or hosting provider.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>IPv4 Boundaries</h4>
        <p>
          IPv4 reverse zones align with classful network boundaries: /8 creates single zones like <code
            >10.in-addr.arpa</code
          >, /16 creates zones like <code>0.10.in-addr.arpa</code>, and /24 creates zones like
          <code>1.0.10.in-addr.arpa</code>.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>IPv6 Nibbles</h4>
        <p>
          IPv6 reverse zones use nibble boundaries (4-bit increments). Each hex digit becomes a separate label in the <code
            >ip6.arpa</code
          > domain. A /48 prefix typically requires 12 nibbles of delegation.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Practical Considerations</h4>
        <p>
          Most organizations receive /24 (IPv4) or /48 to /64 (IPv6) delegations from their ISP. Smaller subnets like
          /28 still require the full /24 zone to be delegated to you for proper reverse DNS operation.
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
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

  .example-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
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

  .input-group {
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

  .cidr-input {
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
      margin: 0;
    }
  }

  .summary-stats {
    display: flex;
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);

    @media (max-width: 768px) {
      flex-direction: row;
      align-items: center;
    }
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .zones-section {
    margin-bottom: var(--spacing-xl);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
    }
  }

  .zones-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--spacing-md);
  }

  .zone-card {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
  }

  .zone-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-md);
  }

  .zone-info {
    h5 {
      margin: 0 0 var(--spacing-xs) 0;
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-size: var(--font-size-md);
      word-break: break-all;
    }
  }

  .zone-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
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

  .delegation-info,
  .nibble-info {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    background-color: var(--bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
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

  .zone-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .config-section {
    margin-bottom: var(--spacing-xl);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
    }
  }

  .config-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .config-example {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);

    h5 {
      margin: 0;
      font-size: var(--font-size-md);
      color: var(--text-primary);
    }

    .copy-button {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      border: 1px solid var(--border-primary);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: 500;

      &:hover {
        background-color: var(--surface-hover);
      }
    }
  }

  .config-content {
    padding: var(--spacing-lg);
    background-color: var(--bg-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
    overflow-x: auto;

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

    .zones-grid {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }

    .config-header {
      flex-direction: column;
      gap: var(--spacing-md);
      align-items: stretch;
    }
  }
</style>
