<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let ip = $state('8.8.8.8');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { ip: '8.8.8.8', description: 'Google DNS - Public DNS service' },
    { ip: '1.1.1.1', description: 'Cloudflare DNS - Fast public resolver' },
    { ip: '208.67.222.222', description: 'OpenDNS - Cisco public DNS' },
    { ip: '192.0.2.1', description: 'RFC 5737 - Documentation IP range' },
    { ip: '2001:4860:4860::8888', description: 'Google IPv6 DNS' },
    { ip: '2606:4700:4700::1111', description: 'Cloudflare IPv6 DNS' },
  ];

  async function lookupIP() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/rdap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ip-lookup',
          ip: ip.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `IP RDAP lookup failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: { ip: string }, index: number) {
    ip = example.ip;
    selectedExampleIndex = index;
    lookupIP();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  async function copyResults() {
    if (!results?.raw) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(results.raw, null, 2));
      copiedState = true;
      setTimeout(() => (copiedState = false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  function formatContact(contact: unknown): string {
    const vcard = (contact as any).vcardArray;
    if (!vcard || !vcard[1]) return (contact as any).handle || 'Unknown';

    const properties = vcard[1];
    const name = properties.find((p: unknown[]) => p[0] === 'fn')?.[3] || (contact as { handle?: string }).handle;
    const org = properties.find((p: unknown[]) => p[0] === 'org')?.[3]?.[0];

    return org ? `${name} (${org})` : name;
  }

  function getIPVersion(ipAddress: string): string {
    return ipAddress.includes(':') ? 'IPv6' : 'IPv4';
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>IP Address RDAP Lookup</h1>
    <p>
      Look up IP address allocation and registration data using RDAP through Regional Internet Registry (RIR) services.
      Automatically routes queries to the appropriate RIR based on IP address prefix.
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
            use:tooltip={`Perform RDAP lookup for ${example.ip} (${example.description})`}
          >
            <h5>{example.ip}</h5>
            <p>{example.description}</p>
            <small>{getIPVersion(example.ip)}</small>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>RDAP Lookup Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="ip" use:tooltip={'Enter an IPv4 or IPv6 address to query allocation data via RDAP'}>
            IP Address
            <input
              id="ip"
              type="text"
              bind:value={ip}
              placeholder="8.8.8.8 or 2001:4860:4860::8888"
              onchange={() => {
                clearExampleSelection();
                if (ip.trim()) lookupIP();
              }}
            />
            <small>Supports both IPv4 (e.g., 8.8.8.8) and IPv6 (e.g., 2001:4860:4860::8888) addresses</small>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={lookupIP} disabled={loading || !ip.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Performing RDAP Lookup...
          {:else}
            <Icon name="search" size="sm" />
            Lookup IP Address
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>RDAP Data for {results.ip}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? 'Copied!' : 'Copy Raw JSON'}
        </button>
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={'The IP address that was queried'}>IP Address:</span>
            <span class="info-value">
              <span class="mono">{results.ip}</span>
              <span class="ip-version">{getIPVersion(results.ip)}</span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={'RDAP service used for the query'}>RDAP Service:</span>
            <span class="info-value mono">{results.serviceUrl}</span>
          </div>
        </div>

        <div class="results-grid">
          <!-- Network Information -->
          <div class="result-section">
            <h4>Network Information</h4>
            <dl class="definition-list">
              <dt>Network Block:</dt>
              <dd><code>{results.data.network || 'Not available'}</code></dd>

              <dt>Network Name:</dt>
              <dd>{results.data.name || 'Not available'}</dd>

              <dt>Type:</dt>
              <dd>{results.data.type || 'Not available'}</dd>

              <dt>Country:</dt>
              <dd>
                {#if results.data.country}
                  <span class="country-code">{results.data.country}</span>
                {:else}
                  Not available
                {/if}
              </dd>

              <dt>Registry:</dt>
              <dd>{results.data.registry || 'Not available'}</dd>
            </dl>
          </div>

          <!-- Status and Dates -->
          <div class="result-section">
            <h4>Allocation Details</h4>
            <dl class="definition-list">
              <dt>Status:</dt>
              <dd>
                {#if results.data.status?.length}
                  <div class="status-list">
                    {#each results.data.status as status, index (index)}
                      <span class="status-badge">{status}</span>
                    {/each}
                  </div>
                {:else}
                  Not available
                {/if}
              </dd>

              <dt>Allocation Date:</dt>
              <dd>{formatDate(results.data.allocation)}</dd>

              <dt>Last Changed:</dt>
              <dd>{formatDate(results.data.lastChanged)}</dd>
            </dl>
          </div>

          <!-- Contact Information -->
          {#if results.data.contacts?.length}
            <div class="result-section full-width">
              <h4>Contact Information</h4>
              <div class="contacts-grid">
                {#each results.data.contacts as contact, index (index)}
                  <div class="contact-card">
                    <h5>
                      {#if contact.roles?.includes('registrant')}
                        Registrant
                      {:else if contact.roles?.includes('administrative')}
                        Administrative
                      {:else if contact.roles?.includes('technical')}
                        Technical
                      {:else if contact.roles?.includes('abuse')}
                        Abuse
                      {:else}
                        Contact
                      {/if}
                    </h5>
                    <p><strong>{formatContact(contact)}</strong></p>
                    {#if contact.handle}
                      <p><small>Handle: {contact.handle}</small></p>
                    {/if}
                    {#if contact.roles}
                      <div class="roles-list">
                        {#each contact.roles as role, index (index)}
                          <span class="role-badge">{role}</span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>RDAP Lookup Failed</strong>
            <p>{error}</p>
            <div class="troubleshooting">
              <p><strong>Troubleshooting Tips:</strong></p>
              <ul>
                <li>Ensure the IP address is valid and properly formatted</li>
                <li>Private IP addresses (RFC 1918) may not have RDAP data</li>
                <li>Some RIRs may have rate limiting or access restrictions</li>
                <li>Reserved or special-use addresses may not be publicly queryable</li>
                <li>Try again in a few moments if the service is temporarily unavailable</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About IP Address RDAP Lookups</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>How it Works</h4>
          <p>
            IP RDAP provides detailed allocation information from Regional Internet Registries (RIRs). The tool
            automatically routes queries to the appropriate RIR using IANA bootstrap registries.
          </p>
        </div>

        <div class="info-section">
          <h4>Regional Internet Registries</h4>
          <ul>
            <li><strong>ARIN:</strong> North America, parts of Caribbean</li>
            <li><strong>RIPE NCC:</strong> Europe, Central Asia, Middle East</li>
            <li><strong>APNIC:</strong> Asia Pacific region</li>
            <li><strong>LACNIC:</strong> Latin America, parts of Caribbean</li>
            <li><strong>AFRINIC:</strong> Africa</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>What You'll Get</h4>
          <ul>
            <li>Network block and CIDR prefix</li>
            <li>Allocation type and country</li>
            <li>Organization responsible for the block</li>
            <li>Contact information (registrant, admin, technical, abuse)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .form-group label {
    flex-direction: column;

    small {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      margin-top: var(--spacing-xs);
    }
  }

  .example-card small {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }
</style>
