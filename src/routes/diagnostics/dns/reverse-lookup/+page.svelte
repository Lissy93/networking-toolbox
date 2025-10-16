<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let ipAddress = $state('8.8.8.8');
  let resolver = $state('cloudflare');
  let customResolver = $state('');
  let useCustomResolver = $state(false);
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const resolvers = [
    { value: 'cloudflare', label: 'Cloudflare (1.1.1.1)' },
    { value: 'google', label: 'Google (8.8.8.8)' },
    { value: 'quad9', label: 'Quad9 (9.9.9.9)' },
    { value: 'opendns', label: 'OpenDNS (208.67.222.222)' },
  ];

  const examples = [
    { ip: '8.8.8.8', description: 'Google DNS server' },
    { ip: '1.1.1.1', description: 'Cloudflare DNS server' },
    { ip: '2001:4860:4860::8888', description: 'Google IPv6 DNS' },
    { ip: '2606:4700:4700::1111', description: 'Cloudflare IPv6 DNS' },
  ];

  function isValidIP(ip: string): boolean {
    // Basic IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (ipv4Regex.test(ip)) return true;

    // IPv6 validation - comprehensive approach
    try {
      // Remove any zone identifier (e.g., %eth0)
      const cleanIp = ip.split('%')[0].toLowerCase();

      // Special cases
      if (cleanIp === '::' || cleanIp === '::1') return true;

      // Check for invalid characters
      if (!/^[0-9a-f:]+$/.test(cleanIp)) return false;

      // Check for double colon (can only appear once)
      const doubleColonCount = (cleanIp.match(/::/g) || []).length;
      if (doubleColonCount > 1) return false;

      // Split by double colon if present
      const parts = cleanIp.split('::');

      if (parts.length === 1) {
        // No compression - must be full format with exactly 8 groups
        const groups = cleanIp.split(':');
        if (groups.length !== 8) return false;

        // Each group must be 1-4 hex digits
        return groups.every((group) => /^[0-9a-f]{1,4}$/.test(group));
      } else if (parts.length === 2) {
        // Has compression
        const leftGroups = parts[0] ? parts[0].split(':').filter((g) => g !== '') : [];
        const rightGroups = parts[1] ? parts[1].split(':').filter((g) => g !== '') : [];

        // Total groups must be less than 8 (compression fills the gap)
        if (leftGroups.length + rightGroups.length >= 8) return false;

        // Each group must be 1-4 hex digits
        const allGroups = [...leftGroups, ...rightGroups];
        return allGroups.every((group) => /^[0-9a-f]{1,4}$/.test(group));
      }

      return false;
    } catch {
      return false;
    }
  }

  async function performReverseLookup() {
    loading = true;
    error = null;
    results = null;

    try {
      if (!isValidIP(ipAddress.trim())) {
        throw new Error('Invalid IP address format');
      }

      const resolverOpts =
        useCustomResolver && customResolver ? { server: customResolver, preferDoH: false } : { doh: resolver };

      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reverse-lookup',
          ip: ipAddress.trim(),
          resolverOpts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Reverse lookup failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    ipAddress = example.ip;
    selectedExampleIndex = index;
    performReverseLookup();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  async function copyResults() {
    const res = results as { Answer?: Array<{ data: string }> };
    if (!res?.Answer?.length) return;

    const text = res.Answer.map((r) => r.data).join('\n');
    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>Reverse DNS Lookup</h1>
    <p>
      Perform reverse DNS lookups (PTR records) to find hostnames associated with IP addresses. Automatically handles
      both IPv4 and IPv6 addresses with proper .in-addr.arpa and .ip6.arpa zone formatting.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Common IP Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Perform reverse lookup for ${example.ip} (${example.description})`}
          >
            <h5>{example.ip}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Reverse Lookup Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="ip" use:tooltip={'Enter an IPv4 or IPv6 address to perform reverse lookup'}>
            IP Address
            <input
              id="ip"
              type="text"
              bind:value={ipAddress}
              placeholder="8.8.8.8 or 2001:db8::1"
              class:invalid={ipAddress && !isValidIP(ipAddress.trim())}
              onchange={() => {
                clearExampleSelection();
                if (ipAddress && isValidIP(ipAddress.trim())) performReverseLookup();
              }}
            />
            {#if ipAddress && !isValidIP(ipAddress.trim())}
              <span class="error-text">Invalid IP address format</span>
            {/if}
          </label>
        </div>

        <div class="form-group resolver-group">
          <label use:tooltip={'Choose a DNS resolver to use for the query'}>
            DNS Resolver
            <div class="resolver-options">
              {#if useCustomResolver}
                <input
                  type="text"
                  bind:value={customResolver}
                  placeholder="8.8.8.8 or custom IP"
                  onchange={() => {
                    clearExampleSelection();
                    if (ipAddress && isValidIP(ipAddress.trim())) performReverseLookup();
                  }}
                />
              {:else}
                <select
                  bind:value={resolver}
                  onchange={() => {
                    if (ipAddress && isValidIP(ipAddress.trim())) performReverseLookup();
                  }}
                >
                  {#each resolvers as res, resIndex (resIndex)}
                    <option value={res.value}>{res.label}</option>
                  {/each}
                </select>
              {/if}
              <label class="checkbox-group">
                <input
                  type="checkbox"
                  bind:checked={useCustomResolver}
                  onchange={() => {
                    clearExampleSelection();
                    if (ipAddress && isValidIP(ipAddress.trim())) performReverseLookup();
                  }}
                />
                Use custom resolver
              </label>
            </div>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button
          class="lookup-btn"
          onclick={performReverseLookup}
          disabled={loading || !ipAddress.trim() || !isValidIP(ipAddress.trim())}
        >
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Performing Reverse Lookup...
          {:else}
            <Icon name="search" size="sm" />
            Reverse Lookup IP
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Warnings -->
  {#if results?.warnings?.length > 0}
    {@const res = results as { warnings?: string[] }}
    <div class="card warning-card">
      <div class="card-content">
        <div class="warning-content">
          <Icon name="alert-triangle" size="sm" />
          <div class="warning-messages">
            {#each res.warnings || [] as warning, warningIndex (warningIndex)}
              <p>{warning}</p>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>Reverse DNS Results</h3>
        {#if results.Answer?.length > 0}
          <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
            <span class={copiedState ? 'text-green-500' : ''}
              ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
            >
            {copiedState ? 'Copied!' : 'Copy Results'}
          </button>
        {/if}
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={'The IP address that was queried'}>IP Address:</span>
            <span class="info-value mono">{ipAddress}</span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={'The reverse DNS zone that was queried (automatically generated)'}
              >Reverse Zone:</span
            >
            <span class="info-value mono">{results.reverseName}</span>
          </div>
        </div>

        {#if results.Answer?.length > 0}
          {@const resData = results as { Answer: Array<{ data: string; TTL?: number }> }}
          <div class="records-list">
            <h4>PTR Records Found:</h4>
            {#each resData.Answer as record, _i (_i)}
              <div class="record-item">
                <div class="record-data mono">{record.data}</div>
                {#if record.TTL}
                  <div class="record-ttl" use:tooltip={'Time To Live - how long this record can be cached'}>
                    TTL: {record.TTL}s
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="no-records">
            <Icon name="alert-circle" size="md" />
            <p>No PTR records found for <code>{ipAddress}</code></p>
            <p class="help-text">This IP address may not have a reverse DNS entry configured.</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>Reverse Lookup Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About Reverse DNS Lookups</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>How it Works</h4>
          <p>
            Reverse DNS converts IP addresses to hostnames using PTR records. IPv4 addresses use .in-addr.arpa zones,
            while IPv6 addresses use .ip6.arpa zones with each nibble reversed.
          </p>
        </div>

        <div class="info-section">
          <h4>Common Use Cases</h4>
          <ul>
            <li>Email server verification</li>
            <li>Security analysis and logging</li>
            <li>Network troubleshooting</li>
            <li>Identifying server ownership</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Zone Format Examples</h4>
          <div class="format-examples">
            <div class="format-example">
              <strong>IPv4:</strong> 8.8.8.8 → 8.8.8.8.in-addr.arpa
            </div>
            <div class="format-example">
              <strong>IPv6:</strong> 2001:db8::1 → 1.0.0.0...b.d.0.1.0.0.2.ip6.arpa
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  // Page-specific overrides for form grid layout
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  // Custom form group styling for this page
  .form-group {
    label {
      flex-direction: column;
      input {
        &.invalid {
          border-color: var(--color-error);
        }
      }
    }

    .error-text {
      color: var(--text-error);
      font-size: var(--font-size-xs);
      margin-top: var(--spacing-xs);
    }
  }

  // Page-specific resolver group styling
  .resolver-group {
    .resolver-options {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .checkbox-group {
      flex-direction: row !important;
      align-items: center;
      gap: var(--spacing-xs) !important;

      input[type='checkbox'] {
        width: auto;
        margin: 0;
      }
    }
  }

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  // Page-specific lookup info styling
  .lookup-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .info-label {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .info-value {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  // Custom no-records styling for this page
  .no-records {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--text-secondary);

    code {
      color: var(--text-primary);
      background: var(--bg-secondary);
      padding: var(--spacing-xs);
      border-radius: var(--radius-sm);
    }

    .help-text {
      font-size: var(--font-size-xs);
      margin: 0;
    }
  }

  .format-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .format-example {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    padding: var(--spacing-xs);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);

    strong {
      color: var(--text-primary);
    }
  }

  .mono {
    font-family: var(--font-mono);
  }

  // Shared utilities moved to diagnostics-pages.scss
</style>
