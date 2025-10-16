<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let domain = $state('google.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { domain: 'google.com', description: 'Google DNS infrastructure check' },
    { domain: 'github.com', description: 'GitHub nameserver configuration' },
    { domain: 'cloudflare.com', description: 'Cloudflare NS/SOA setup' },
    { domain: 'stackoverflow.com', description: 'Stack Overflow DNS consistency' },
    { domain: 'microsoft.com', description: 'Microsoft nameserver analysis' },
    { domain: 'aws.amazon.com', description: 'AWS subdomain NS/SOA check' },
  ];

  async function checkNSSOA() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ns-soa-check',
          domain: domain.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`NS/SOA check failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    checkNSSOA();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function parseSOA(soaString: string): any {
    // SOA format: primary-ns admin serial refresh retry expire minimum
    const parts = soaString.trim().split(/\s+/);
    if (parts.length >= 7) {
      return {
        primaryNS: parts[0],
        admin: parts[1],
        serial: parseInt(parts[2]),
        refresh: parseInt(parts[3]),
        retry: parseInt(parts[4]),
        expire: parseInt(parts[5]),
        minimum: parseInt(parts[6]),
      };
    }
    return null;
  }

  function formatTime(seconds: number): string {
    if (seconds >= 86400) {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    } else if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function getConsistencyStatus(): { status: string; color: string; message: string } {
    if (!results) return { status: 'unknown', color: 'secondary', message: 'No check performed' };
    if ((results as { error?: string }).error)
      return { status: 'error', color: 'error', message: (results as { error: string }).error };

    const resultsObj = results as { nameserverChecks?: Array<{ resolved?: boolean }> };
    const resolvedCount = resultsObj.nameserverChecks?.filter((ns) => ns.resolved)?.length || 0;
    const totalCount = resultsObj.nameserverChecks?.length || 0;

    if (resolvedCount === totalCount && totalCount > 0) {
      return { status: 'good', color: 'success', message: `All ${totalCount} nameservers resolve correctly` };
    } else if (resolvedCount > 0) {
      return {
        status: 'partial',
        color: 'warning',
        message: `${resolvedCount}/${totalCount} nameservers resolve correctly`,
      };
    } else {
      return { status: 'bad', color: 'error', message: 'No nameservers resolve correctly' };
    }
  }

  async function copyResults() {
    if (!results) return;

    let text = `NS/SOA Check for ${domain}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    if (results.nameservers?.length > 0) {
      text += `Nameservers (${results.nameservers.length}):\n`;
      results.nameservers.forEach((ns: string) => {
        text += `  ${ns}\n`;
      });
      text += '\n';
    }

    if (results.soa) {
      text += `SOA Record:\n${results.soa}\n\n`;
    }

    const nsChecks = (
      results as { nameserverChecks?: Array<{ nameserver: string; resolved: boolean; addresses?: string[] }> }
    ).nameserverChecks;
    if (nsChecks && nsChecks.length > 0) {
      text += `Nameserver Resolution Check:\n`;
      nsChecks!.forEach((check) => {
        text += `  ${check.nameserver}: `;
        if (check.resolved) {
          text += `✓ (${check.addresses?.join(', ') || 'No addresses'})\n`;
        } else {
          text += `✗ Failed to resolve\n`;
        }
      });
      text += '\n';
    }

    const status = getConsistencyStatus();
    text += `Status: ${status.message}`;

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>NS/SOA Consistency Checker</h1>
    <p>
      Verify DNS nameserver and SOA (Start of Authority) record consistency. Check that all listed nameservers resolve
      correctly and analyze SOA parameters for proper DNS configuration.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>NS/SOA Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Check NS/SOA consistency for ${example.domain}`}
          >
            <h5>{example.domain}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>NS/SOA Check</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={'Enter the domain to check nameserver and SOA consistency for'}>
          Domain Name
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder="example.com"
            onchange={() => {
              clearExampleSelection();
              if (domain) checkNSSOA();
            }}
          />
        </label>
      </div>

      <div class="action-section">
        <button class="check-btn lookup-btn" onclick={checkNSSOA} disabled={loading || !domain.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Checking NS/SOA...
          {:else}
            <Icon name="server" size="sm" />
            Check NS/SOA Records
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results && !results.error}
    <div class="card results-card">
      <div class="card-header row">
        <h3>NS/SOA Analysis Results</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- Status Overview -->
        <div class="status-overview">
          {#if results}
            {@const status = getConsistencyStatus()}
            <div class="status-item {status.color}">
              <Icon
                name={status.status === 'good'
                  ? 'check-circle'
                  : status.status === 'partial'
                    ? 'alert-circle'
                    : 'x-circle'}
                size="md"
              />
              <div>
                <h4>
                  {#if status.status === 'good'}
                    DNS Configuration Healthy
                  {:else if status.status === 'partial'}
                    DNS Issues Detected
                  {:else}
                    DNS Configuration Problems
                  {/if}
                </h4>
                <p>{status.message}</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Nameservers -->
        {#if results.nameservers?.length > 0}
          <div class="nameservers-section">
            <h4>Nameservers ({results.nameservers.length})</h4>
            <div class="nameserver-grid">
              {#each results.nameserverChecks as check, _index (_index)}
                <div class="nameserver-item {check.resolved ? 'success' : 'error'}">
                  <div class="nameserver-header">
                    <Icon name={check.resolved ? 'check-circle' : 'x-circle'} size="sm" />
                    <span class="nameserver-name">{check.nameserver}</span>
                  </div>

                  {#if check.resolved && (check as { addresses?: string[] }).addresses && (check as { addresses?: string[] }).addresses!.length > 0}
                    <div class="nameserver-addresses">
                      {#each (check as { addresses: string[] }).addresses! as address, addressIndex (addressIndex)}
                        <span class="address-badge">{address}</span>
                      {/each}
                    </div>
                  {:else if !check.resolved}
                    <div class="nameserver-error">
                      <Icon name="alert-triangle" size="xs" />
                      <span>Failed to resolve</span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- SOA Record -->
        {#if results.soa}
          {@const parsed = parseSOA(results.soa)}
          <div class="soa-section">
            <h4>SOA (Start of Authority) Record</h4>

            <!-- Raw SOA -->
            <div class="soa-raw">
              <h5>Raw SOA Record</h5>
              <div class="soa-display">
                <code>{results.soa}</code>
              </div>
            </div>

            <!-- Parsed SOA -->
            {#if parsed}
              <div class="soa-parsed">
                <h5>Parsed SOA Parameters</h5>
                <div class="soa-grid">
                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={'The primary nameserver for this zone'}>Primary NS</div>
                    <div class="soa-value">{parsed.primaryNS}</div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={'Email address of the zone administrator (@ replaced with .)'}>
                      Administrator
                    </div>
                    <div class="soa-value">{parsed.admin}</div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={'Zone serial number - used to track zone changes'}>Serial</div>
                    <div class="soa-value mono">{parsed.serial}</div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={'How often secondary servers should check for updates'}>
                      Refresh
                    </div>
                    <div class="soa-value">
                      <span class="mono">{parsed.refresh}s</span>
                      <span class="time-readable">({formatTime(parsed.refresh)})</span>
                    </div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={'How long to wait before retrying a failed zone transfer'}>
                      Retry
                    </div>
                    <div class="soa-value">
                      <span class="mono">{parsed.retry}s</span>
                      <span class="time-readable">({formatTime(parsed.retry)})</span>
                    </div>
                  </div>

                  <div class="soa-item">
                    <div
                      class="soa-label"
                      use:tooltip={"When secondary servers should stop answering queries if they can't contact the primary"}
                    >
                      Expire
                    </div>
                    <div class="soa-value">
                      <span class="mono">{parsed.expire}s</span>
                      <span class="time-readable">({formatTime(parsed.expire)})</span>
                    </div>
                  </div>

                  <div class="soa-item">
                    <div class="soa-label" use:tooltip={'Default TTL for negative responses (NXDOMAIN)'}>
                      Minimum TTL
                    </div>
                    <div class="soa-value">
                      <span class="mono">{parsed.minimum}s</span>
                      <span class="time-readable">({formatTime(parsed.minimum)})</span>
                    </div>
                  </div>
                </div>

                <!-- Configuration Analysis -->
                <div class="recommendations-section">
                  <h5>Configuration Analysis</h5>
                  <div class="recommendation-list">
                    <!-- Serial number check -->
                    {#if parsed.serial.toString().length === 10 && parsed.serial.toString().startsWith('202')}
                      <div class="recommendation-item success">
                        <Icon name="check-circle" size="sm" />
                        <span>Serial number appears to use YYYYMMDDNN format (recommended)</span>
                      </div>
                    {:else}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span>Consider using YYYYMMDDNN format for serial numbers for easier tracking</span>
                      </div>
                    {/if}

                    <!-- Refresh interval check -->
                    {#if parsed.refresh >= 3600 && parsed.refresh <= 86400}
                      <div class="recommendation-item success">
                        <Icon name="check-circle" size="sm" />
                        <span>Refresh interval ({formatTime(parsed.refresh)}) is within recommended range</span>
                      </div>
                    {:else if parsed.refresh < 3600}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span
                          >Refresh interval ({formatTime(parsed.refresh)}) is quite frequent - consider increasing</span
                        >
                      </div>
                    {:else}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span>Refresh interval ({formatTime(parsed.refresh)}) is quite long - consider reducing</span>
                      </div>
                    {/if}

                    <!-- Retry interval check -->
                    {#if parsed.retry >= 600 && parsed.retry < parsed.refresh}
                      <div class="recommendation-item success">
                        <Icon name="check-circle" size="sm" />
                        <span>Retry interval is properly configured</span>
                      </div>
                    {:else if parsed.retry >= parsed.refresh}
                      <div class="recommendation-item error">
                        <Icon name="x-circle" size="sm" />
                        <span>Retry interval should be less than refresh interval</span>
                      </div>
                    {:else}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span>Retry interval ({formatTime(parsed.retry)}) might be too short</span>
                      </div>
                    {/if}

                    <!-- Expire check -->
                    {#if parsed.expire >= 604800}
                      <div class="recommendation-item success">
                        <Icon name="check-circle" size="sm" />
                        <span>Expire time ({formatTime(parsed.expire)}) provides good resilience</span>
                      </div>
                    {:else}
                      <div class="recommendation-item warning">
                        <Icon name="alert-circle" size="sm" />
                        <span>Expire time ({formatTime(parsed.expire)}) is quite short - consider at least 1 week</span>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if error || results?.error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>NS/SOA Check Failed</strong>
            <p>{error || results.error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding NS and SOA Records</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>NS (Name Server) Records</h4>
          <p>NS records specify which name servers are authoritative for a domain. All listed nameservers should:</p>
          <ul>
            <li>Resolve to valid IP addresses</li>
            <li>Be reachable and responsive</li>
            <li>Serve consistent zone data</li>
            <li>Be geographically distributed for redundancy</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>SOA (Start of Authority)</h4>
          <p>The SOA record contains administrative information about the zone:</p>
          <ul>
            <li><strong>Serial:</strong> Version number for zone changes</li>
            <li><strong>Refresh:</strong> How often secondaries check for updates</li>
            <li><strong>Retry:</strong> Wait time before retrying failed transfers</li>
            <li><strong>Expire:</strong> When to stop serving stale data</li>
            <li><strong>Minimum:</strong> Default negative response TTL</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Recommended Values</h4>
          <div class="recommendations-table">
            <div class="rec-item">
              <strong>Refresh:</strong> 1-24 hours (3600-86400s)
            </div>
            <div class="rec-item">
              <strong>Retry:</strong> 10-60 minutes (600-3600s)
            </div>
            <div class="rec-item">
              <strong>Expire:</strong> 1-4 weeks (604800-2419200s)
            </div>
            <div class="rec-item">
              <strong>Minimum:</strong> 5 minutes to 1 hour (300-3600s)
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>Common Issues</h4>
          <ul>
            <li><strong>Unreachable nameservers:</strong> Can cause resolution failures</li>
            <li><strong>Inconsistent data:</strong> Different responses from different NS</li>
            <li><strong>Wrong SOA values:</strong> Too aggressive or too conservative timing</li>
            <li><strong>Serial number issues:</strong> Outdated or incorrect format</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  // Page-specific styles - shared styles removed
  // Use shared .lookup-btn instead of .check-btn

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  // Custom status item styling for NS/SOA (extends shared styles)
  .status-item {
    border: 2px solid;
    gap: var(--spacing-md);

    &.success {
      border-color: var(--color-success);
    }

    &.warning {
      border-color: var(--color-warning);
    }

    &.error {
      border-color: var(--color-error);
    }

    h4 {
      margin: 0;
      font-size: var(--font-size-md);
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      opacity: 0.8;
    }
  }

  .nameservers-section,
  .soa-section,
  .recommendations-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .soa-section,
  .recommendations-section {
    h5 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .nameserver-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .nameserver-item {
    background: var(--bg-secondary);
    border: 2px solid;
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    &.success {
      border-color: var(--border-primary);
    }

    &.error {
      border-color: var(--color-error);
    }
  }

  .nameserver-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .nameserver-name {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-weight: 600;
  }

  .nameserver-addresses {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .address-badge {
    background: var(--color-primary);
    color: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .nameserver-error {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-error);
    font-size: var(--font-size-sm);
  }

  .soa-raw {
    margin-bottom: var(--spacing-lg);
  }

  // SOA display uses shared record-display styles
  .soa-display {
    code {
      display: block;
      padding: var(--spacing-sm);
      background: var(--bg-secondary);
    }
  }

  .soa-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .soa-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .soa-label {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
  }

  .soa-value {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .mono {
      font-family: var(--font-mono);
      font-weight: 600;
    }

    .time-readable {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
    }
  }

  .recommendation-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  // Educational content specific to NS/SOA
  .info-card {
    background: var(--bg-tertiary);
  }

  .recommendations-table {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .rec-item {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
    }
  }

  .mono {
    font-family: var(--font-mono);
  }

  // Page-specific styles only (common utilities moved to diagnostics-pages.scss)
</style>
