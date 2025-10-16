<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let asn = $state('AS15169');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { asn: 'AS15169', description: 'Google LLC - Major cloud provider' },
    { asn: 'AS13335', description: 'Cloudflare - CDN and security services' },
    { asn: 'AS16509', description: 'Amazon.com - AWS cloud infrastructure' },
    { asn: 'AS8075', description: 'Microsoft Corporation - Azure cloud' },
    { asn: 'AS32934', description: 'Meta Platforms - Facebook services' },
    { asn: 'AS396982', description: 'Google Cloud Platform - Additional ranges' },
  ];

  async function lookupASN() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/rdap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'asn-lookup',
          asn: asn.trim().toUpperCase(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `ASN RDAP lookup failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = (err as Error).message;
    } finally {
      loading = false;
    }
  }

  function loadExample(example: { asn: string }, index: number) {
    asn = example.asn;
    selectedExampleIndex = index;
    lookupASN();
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

  function formatContact(contact: {
    handle?: string;
    vcardArray?: [string, Array<[string, unknown, string, unknown]>];
  }): string {
    const vcard = contact.vcardArray;
    if (!vcard || !vcard[1]) return contact.handle || 'Unknown';

    const properties = vcard[1];
    const name = (properties as any[]).find((p: any) => p[0] === 'fn')?.[3] || contact.handle;
    const org = (properties as any[]).find((p: any) => p[0] === 'org')?.[3]?.[0];

    return org ? `${name} (${org})` : name;
  }

  function formatASN(asnString: string): string {
    return asnString.startsWith('AS') ? asnString : `AS${asnString}`;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>ASN RDAP Lookup</h1>
    <p>
      Query Autonomous System Number allocation and registration data using RDAP through Regional Internet Registries.
      ASNs identify networks on the global Internet routing table and are essential for BGP routing operations.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Common ASN Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Perform RDAP lookup for ${example.asn} (${example.description})`}
          >
            <h5>{example.asn}</h5>
            <p>{example.description}</p>
            <small>{example.asn.replace('AS', '')}</small>
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
          <label for="asn" use:tooltip={'Enter an Autonomous System Number to query allocation data via RDAP'}>
            Autonomous System Number
            <input
              id="asn"
              type="text"
              bind:value={asn}
              placeholder="AS15169 or 15169"
              onchange={() => {
                clearExampleSelection();
                if (asn.trim()) lookupASN();
              }}
            />
            <small>Supports both formats: AS15169 or 15169 (AS prefix is optional)</small>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={lookupASN} disabled={loading || !asn.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Performing RDAP Lookup...
          {:else}
            <Icon name="search" size="sm" />
            Lookup ASN
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>RDAP Data for {formatASN(results.asn)}</h3>
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
            <span class="info-label" use:tooltip={'The ASN that was queried'}>ASN:</span>
            <span class="info-value">
              <span class="asn-number">{formatASN(results.asn)}</span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={'RDAP service used for the query'}>RDAP Service:</span>
            <span class="info-value mono">{results.serviceUrl}</span>
          </div>
        </div>

        <div class="results-grid">
          <!-- ASN Information -->
          <div class="result-section">
            <h4>ASN Information</h4>
            <dl class="definition-list">
              <dt>Organization Name:</dt>
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
                <li>Ensure the ASN format is valid (e.g., AS15169 or just 15169)</li>
                <li>Check if the ASN exists and is currently allocated</li>
                <li>Private ASNs (64512-65534, 4200000000-4294967294) may not have public RDAP data</li>
                <li>Some RIRs may have rate limiting or access restrictions</li>
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
      <h3>About ASN RDAP Lookups</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>What is an ASN?</h4>
          <p>
            Autonomous System Numbers identify networks on the global Internet routing table and are essential for BGP
            routing operations. Each ASN represents a collection of IP address blocks under unified administrative
            control.
          </p>
        </div>

        <div class="info-section">
          <h4>ASN Ranges by Registry</h4>
          <ul>
            <li><strong>ARIN:</strong> AS1 - AS23551, AS393216 - AS394239</li>
            <li><strong>RIPE NCC:</strong> AS24576 - AS25599, AS34816 - AS35839</li>
            <li><strong>APNIC:</strong> AS23552 - AS24575, AS37888 - AS38911</li>
            <li><strong>LACNIC:</strong> AS26592 - AS27647, AS61440 - AS61951</li>
            <li><strong>AFRINIC:</strong> AS36864 - AS37887, AS327680 - AS328703</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>What You'll Get</h4>
          <ul>
            <li>Organization name and type</li>
            <li>Country of registration</li>
            <li>Allocation date and status</li>
            <li>Contact information (admin, technical, abuse)</li>
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
