<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let domain = $state('example.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { domain: 'example.com', description: 'Example domain for testing' },
    { domain: 'google.com', description: 'Popular domain with comprehensive records' },
    { domain: 'github.com', description: 'Tech company domain' },
    { domain: 'stackoverflow.com', description: 'Community platform domain' },
    { domain: 'cloudflare.com', description: 'CDN provider domain' },
    { domain: 'iana.org', description: 'Internet registry domain' },
  ];

  async function lookupDomain() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/rdap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'domain-lookup',
          domain: domain.trim().toLowerCase(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `Domain RDAP lookup failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: { domain: string }, index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    lookupDomain();
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
</script>

<div class="card">
  <header class="card-header">
    <h1>Domain RDAP Lookup</h1>
    <p>
      Query domain registration data using RDAP (Registration Data Access Protocol). RDAP is the modern successor to
      WHOIS, providing structured JSON responses through IANA bootstrap registry routing.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Common Domain Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Perform RDAP lookup for ${example.domain} (${example.description})`}
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
      <h3>RDAP Lookup Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="domain" use:tooltip={'Enter a domain name to query registration data via RDAP'}>
            Domain Name
            <input
              id="domain"
              type="text"
              bind:value={domain}
              placeholder="example.com"
              onchange={() => {
                clearExampleSelection();
                if (domain.trim()) lookupDomain();
              }}
            />
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={lookupDomain} disabled={loading || !domain.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Performing RDAP Lookup...
          {:else}
            <Icon name="search" size="sm" />
            Lookup Domain
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>RDAP Data for {results.domain}</h3>
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
            <span class="info-label" use:tooltip={'The domain name that was queried'}>Domain:</span>
            <span class="info-value mono">{results.data.domain || results.domain}</span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={'RDAP service used for the query'}>RDAP Service:</span>
            <span class="info-value mono">{results.serviceUrl}</span>
          </div>
        </div>

        <div class="results-grid">
          <!-- Domain Information -->
          <div class="result-section">
            <h4>Domain Information</h4>
            <dl class="definition-list">
              <dt>Domain Name:</dt>
              <dd><code>{results.data.domain || results.domain}</code></dd>

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

              <dt>Registrar:</dt>
              <dd>{results.data.registrar || 'Not available'}</dd>
            </dl>
          </div>

          <!-- Important Dates -->
          <div class="result-section">
            <h4>Important Dates</h4>
            <dl class="definition-list">
              <dt>Registration Date:</dt>
              <dd>{formatDate(results.data.created)}</dd>

              <dt>Last Updated:</dt>
              <dd>{formatDate(results.data.updated)}</dd>

              <dt>Expiration Date:</dt>
              <dd
                class:expires-soon={results.data.expires &&
                  new Date(results.data.expires) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
              >
                {formatDate(results.data.expires)}
                {#if results.data.expires && new Date(results.data.expires) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                  <span class="warning-badge">Expires Soon!</span>
                {/if}
              </dd>
            </dl>
          </div>

          <!-- Nameservers -->
          {#if results.data.nameservers?.length}
            <div class="result-section">
              <h4>Nameservers ({results.data.nameservers.length})</h4>
              <ul class="nameserver-list">
                {#each results.data.nameservers as ns, index (index)}
                  <li><code>{ns}</code></li>
                {/each}
              </ul>
            </div>
          {/if}

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
                      {:else}
                        Contact
                      {/if}
                    </h5>
                    <p><strong>{formatContact(contact)}</strong></p>
                    {#if contact.handle}
                      <p><small>Handle: {contact.handle}</small></p>
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
                <li>Ensure the domain name is valid and properly formatted</li>
                <li>Check if the domain actually exists and is registered</li>
                <li>Some registries may have rate limiting or access restrictions</li>
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
      <h3>About RDAP Domain Lookups</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>What is RDAP?</h4>
          <p>
            RDAP (Registration Data Access Protocol) is the modern successor to WHOIS, providing structured JSON
            responses for domain registration information through IANA bootstrap registry routing.
          </p>
        </div>

        <div class="info-section">
          <h4>What You'll Get</h4>
          <ul>
            <li>Registration status and dates</li>
            <li>Nameserver information</li>
            <li>Registrar details</li>
            <li>Contact information (if available)</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>RDAP vs WHOIS</h4>
          <ul>
            <li>Structured JSON instead of free text</li>
            <li>Unicode support for internationalized domains</li>
            <li>Built-in rate limiting and privacy controls</li>
            <li>RESTful API with standard HTTP methods</li>
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
  }
</style>
