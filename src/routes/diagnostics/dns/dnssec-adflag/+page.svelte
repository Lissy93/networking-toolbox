<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let domain = $state('example.com');
  let recordType = $state('A');
  let resolver = $state('cloudflare');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const recordTypes = [
    { value: 'A', label: 'A', description: 'IPv4 address records' },
    { value: 'AAAA', label: 'AAAA', description: 'IPv6 address records' },
    { value: 'CNAME', label: 'CNAME', description: 'Canonical name records' },
    { value: 'MX', label: 'MX', description: 'Mail exchange records' },
    { value: 'TXT', label: 'TXT', description: 'Text records' },
    { value: 'NS', label: 'NS', description: 'Name server records' },
    { value: 'SOA', label: 'SOA', description: 'Start of authority records' },
  ];

  const resolvers = [
    { value: 'cloudflare', label: 'Cloudflare (1.1.1.1)' },
    { value: 'google', label: 'Google (8.8.8.8)' },
    { value: 'quad9', label: 'Quad9 (9.9.9.9)' },
    { value: 'opendns', label: 'OpenDNS (208.67.222.222)' },
  ];

  const examples = [
    { domain: 'cloudflare.com', type: 'A', description: 'DNSSEC-signed domain' },
    { domain: 'dnssec-failed.org', type: 'A', description: 'DNSSEC validation failure test' },
    { domain: 'example.com', type: 'A', description: 'Unsigned domain example' },
    { domain: 'google.com', type: 'A', description: 'Popular signed domain' },
    { domain: 'iana.org', type: 'A', description: 'Internet registry domain' },
  ];

  async function checkDNSSEC() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dnssec-adflag',
          name: domain.trim(),
          type: recordType,
          resolverOpts: { doh: resolver },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `DNSSEC check failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = (err as Error).message;
    } finally {
      loading = false;
    }
  }

  function loadExample(example: { domain: string; type: string }, index: number) {
    domain = example.domain;
    recordType = example.type;
    selectedExampleIndex = index;
    checkDNSSEC();
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
</script>

<div class="card">
  <header class="card-header">
    <h1>DNSSEC AD Flag Checker</h1>
    <p>
      Query DNS records via DoH and report if the AD (Authenticated Data) bit is set. The AD bit indicates whether the
      DNS response has been cryptographically verified through DNSSEC validation.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Example DNSSEC Tests</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Check DNSSEC for ${example.domain} (${example.description})`}
          >
            <h5>{example.domain}</h5>
            <p>{example.description}</p>
            <small>{example.type} record</small>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>DNSSEC Query Configuration</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="domain" use:tooltip={'Enter a domain name to check DNSSEC validation status'}>
            Domain Name
            <input
              id="domain"
              type="text"
              bind:value={domain}
              placeholder="example.com"
              onchange={() => {
                clearExampleSelection();
                if (domain.trim()) checkDNSSEC();
              }}
            />
          </label>
        </div>

        <div class="form-group">
          <label for="recordType" use:tooltip={'Select the DNS record type to query'}>
            Record Type
            <select
              id="recordType"
              bind:value={recordType}
              onchange={() => {
                clearExampleSelection();
                if (domain.trim()) checkDNSSEC();
              }}
            >
              {#each recordTypes as type, index (index)}
                <option value={type.value}>{type.label} - {type.description}</option>
              {/each}
            </select>
          </label>
        </div>

        <div class="form-group">
          <label for="resolver" use:tooltip={'Choose a DNS-over-HTTPS resolver for the query'}>
            DoH Resolver
            <select
              id="resolver"
              bind:value={resolver}
              onchange={() => {
                if (domain.trim()) checkDNSSEC();
              }}
            >
              {#each resolvers as res, index (index)}
                <option value={res.value}>{res.label}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={checkDNSSEC} disabled={loading || !domain.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Checking DNSSEC...
          {:else}
            <Icon name="search" size="sm" />
            Check DNSSEC
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>DNSSEC Status for {results.name}</h3>
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
            <span class="info-label" use:tooltip={'The domain and record type that was queried'}>Query:</span>
            <span class="info-value mono">{results.name} ({results.type})</span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={'DNS-over-HTTPS resolver used for the query'}>DoH Resolver:</span>
            <span class="info-value">{results.resolver}</span>
          </div>
        </div>

        <!-- DNSSEC Status -->
        <div class="result-section">
          <h4>DNSSEC Validation Status</h4>
          <div class="dnssec-status">
            <div class="status-item {results.authenticated ? 'success' : 'warning'}">
              <Icon name={results.authenticated ? 'shield-check' : 'shield-alert'} size="md" />
              <div>
                <strong>AD (Authenticated Data) Flag</strong>
                <p>
                  {results.authenticated ? 'SET - Response is DNSSEC validated' : 'NOT SET - Response is not validated'}
                </p>
              </div>
            </div>

            {#if results.checkingDisabled}
              <div class="status-item info">
                <Icon name="info" size="md" />
                <div>
                  <strong>CD (Checking Disabled) Flag</strong>
                  <p>SET - DNSSEC validation was disabled for this query</p>
                </div>
              </div>
            {/if}

            <div class="status-item {results.rcode === 0 ? 'success' : 'error'}">
              <Icon name={results.rcode === 0 ? 'check-circle' : 'x-circle'} size="md" />
              <div>
                <strong>Response Code</strong>
                <p>{results.rcodeText}</p>
              </div>
            </div>
          </div>

          <div class="explanation">
            <h5>Explanation</h5>
            <p>{results.explanation}</p>
          </div>
        </div>

        <!-- DNS Records -->
        {#if results.records?.length}
          <div class="result-section">
            <h4>DNS Records ({results.records.length})</h4>
            <div class="records-list">
              {#each results.records as record, index (index)}
                <div class="record-item">
                  <div class="record-data mono">{record.data}</div>
                  {#if record.TTL}
                    <div class="record-ttl">TTL: {record.TTL}s</div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Authority Section -->
        {#if results.authority?.length}
          <div class="result-section">
            <h4>Authority Section ({results.authority.length})</h4>
            <div class="records-list">
              {#each results.authority as record, index (index)}
                <div class="record-item">
                  <div class="record-data mono">{record.name} {record.type} {record.data}</div>
                  {#if record.TTL}
                    <div class="record-ttl">TTL: {record.TTL}s</div>
                  {/if}
                </div>
              {/each}
            </div>
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
            <strong>DNSSEC Check Failed</strong>
            <p>{error}</p>
            <div class="troubleshooting">
              <p><strong>Troubleshooting Tips:</strong></p>
              <ul>
                <li>Ensure the domain name is valid and exists</li>
                <li>Try a different record type if the current one doesn't exist</li>
                <li>Switch to a different DoH resolver</li>
                <li>Some domains may not have the requested record type</li>
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
      <h3>About DNSSEC and the AD Flag</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>What is DNSSEC?</h4>
          <p>
            DNS Security Extensions (DNSSEC) adds cryptographic authentication to DNS responses, protecting against DNS
            spoofing and cache poisoning attacks by ensuring response integrity.
          </p>
        </div>

        <div class="info-section">
          <h4>The AD (Authenticated Data) Flag</h4>
          <p>
            The AD bit in DNS responses indicates that the resolver has successfully validated the response using
            DNSSEC. When set, you can trust the response hasn't been tampered with.
          </p>
        </div>

        <div class="info-section">
          <h4>Why Use DoH for DNSSEC?</h4>
          <p>
            DNS-over-HTTPS preserves DNSSEC validation status in the AD flag, while traditional DNS queries may not
            expose this information clearly to clients.
          </p>
        </div>

        <div class="info-section">
          <h4>Interpreting Results</h4>
          <ul>
            <li><strong>AD Set:</strong> Response is cryptographically verified</li>
            <li><strong>AD Not Set:</strong> Domain unsigned, validation failed, or resolver doesn't validate</li>
            <li><strong>CD Set:</strong> Validation was disabled for this query</li>
            <li><strong>SERVFAIL:</strong> May indicate DNSSEC validation failure</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .form-group label {
    flex-direction: column;
  }

  .dnssec-status {
    display: grid;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid;

    &.success {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
      border-color: var(--color-success);
    }

    &.warning {
      background: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
      border-color: var(--color-warning);
    }

    &.error {
      background: color-mix(in srgb, var(--color-error), transparent 90%);
      color: var(--color-error);
      border-color: var(--color-error);
    }

    &.info {
      background: color-mix(in srgb, var(--color-info), transparent 90%);
      color: var(--color-info);
      border-color: var(--color-info);
    }

    strong {
      color: var(--text-primary);
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    p {
      color: var(--text-secondary);
      margin: 0;
      font-size: var(--font-size-sm);
    }
  }

  .explanation {
    background: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h5 {
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--color-primary);
    }

    p {
      margin: 0;
      color: var(--text-primary);
      line-height: 1.5;
    }
  }

  .record-ttl {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .example-card small {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }
</style>
