<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../../styles/diagnostics-pages.scss';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics');
  });

  let domain = $state('example.com');
  let recordType = $state('A');
  let resolver = $state('cloudflare');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const recordTypes = $derived([
    { value: 'A', label: 'A', description: $t('diagnostics.dnssec-adflag.recordTypes.a') },
    { value: 'AAAA', label: 'AAAA', description: $t('diagnostics.dnssec-adflag.recordTypes.aaaa') },
    { value: 'CNAME', label: 'CNAME', description: $t('diagnostics.dnssec-adflag.recordTypes.cname') },
    { value: 'MX', label: 'MX', description: $t('diagnostics.dnssec-adflag.recordTypes.mx') },
    { value: 'TXT', label: 'TXT', description: $t('diagnostics.dnssec-adflag.recordTypes.txt') },
    { value: 'NS', label: 'NS', description: $t('diagnostics.dnssec-adflag.recordTypes.ns') },
    { value: 'SOA', label: 'SOA', description: $t('diagnostics.dnssec-adflag.recordTypes.soa') },
  ]);

  const resolvers = [
    { value: 'cloudflare', label: 'Cloudflare (1.1.1.1)' },
    { value: 'google', label: 'Google (8.8.8.8)' },
    { value: 'quad9', label: 'Quad9 (9.9.9.9)' },
    { value: 'opendns', label: 'OpenDNS (208.67.222.222)' },
  ];

  const examples = $derived([
    { domain: 'cloudflare.com', type: 'A', description: $t('diagnostics.dnssec-adflag.examples.cloudflare') },
    { domain: 'dnssec-failed.org', type: 'A', description: $t('diagnostics.dnssec-adflag.examples.dnssecFailed') },
    { domain: 'example.com', type: 'A', description: $t('diagnostics.dnssec-adflag.examples.example') },
    { domain: 'google.com', type: 'A', description: $t('diagnostics.dnssec-adflag.examples.google') },
    { domain: 'iana.org', type: 'A', description: $t('diagnostics.dnssec-adflag.examples.iana') },
  ]);

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
    <h1>{$t('diagnostics.dnssec-adflag.title')}</h1>
    <p>
      {$t('diagnostics.dnssec-adflag.description')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics.dnssec-adflag.examples.title')}</h4>
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
      <h3>{$t('diagnostics.dnssec-adflag.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="domain" use:tooltip={$t('diagnostics.dnssec-adflag.form.domain.tooltip')}>
            {$t('diagnostics.dnssec-adflag.form.domain.label')}
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
          <label for="recordType" use:tooltip={$t('diagnostics.dnssec-adflag.form.recordType.tooltip')}>
            {$t('diagnostics.dnssec-adflag.form.recordType.label')}
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
          <label for="resolver" use:tooltip={$t('diagnostics.dnssec-adflag.form.resolver.tooltip')}>
            {$t('diagnostics.dnssec-adflag.form.resolver.label')}
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
            {$t('diagnostics.dnssec-adflag.form.button.checking')}
          {:else}
            <Icon name="search" size="sm" />
            {$t('diagnostics.dnssec-adflag.form.button.check')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics.dnssec-adflag.results.title', { domain: results.name })}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? $t('common.copied') : $t('diagnostics.dnssec-adflag.results.copyRawJson')}
        </button>
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={$t('diagnostics.dnssec-adflag.results.query.tooltip')}
              >{$t('diagnostics.dnssec-adflag.results.query.label')}:</span
            >
            <span class="info-value mono">{results.name} ({results.type})</span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={$t('diagnostics.dnssec-adflag.results.resolver.tooltip')}
              >{$t('diagnostics.dnssec-adflag.results.resolver.label')}:</span
            >
            <span class="info-value">{results.resolver}</span>
          </div>
        </div>

        <!-- DNSSEC Status -->
        <div class="result-section">
          <h4>{$t('diagnostics.dnssec-adflag.results.validation.title')}</h4>
          <div class="dnssec-status">
            <div class="status-item {results.authenticated ? 'success' : 'warning'}">
              <Icon name={results.authenticated ? 'shield-check' : 'shield-alert'} size="md" />
              <div>
                <strong>{$t('diagnostics.dnssec-adflag.results.validation.adFlag.title')}</strong>
                <p>
                  {results.authenticated
                    ? $t('diagnostics.dnssec-adflag.results.validation.adFlag.set')
                    : $t('diagnostics.dnssec-adflag.results.validation.adFlag.notSet')}
                </p>
              </div>
            </div>

            {#if results.checkingDisabled}
              <div class="status-item info">
                <Icon name="info" size="md" />
                <div>
                  <strong>{$t('diagnostics.dnssec-adflag.results.validation.cdFlag.title')}</strong>
                  <p>{$t('diagnostics.dnssec-adflag.results.validation.cdFlag.message')}</p>
                </div>
              </div>
            {/if}

            <div class="status-item {results.rcode === 0 ? 'success' : 'error'}">
              <Icon name={results.rcode === 0 ? 'check-circle' : 'x-circle'} size="md" />
              <div>
                <strong>{$t('diagnostics.dnssec-adflag.results.validation.responseCode.title')}</strong>
                <p>{results.rcodeText}</p>
              </div>
            </div>
          </div>

          <div class="explanation">
            <h5>{$t('diagnostics.dnssec-adflag.results.explanation.title')}</h5>
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
            <strong>{$t('diagnostics.dnssec-adflag.error.title')}</strong>
            <p>{error}</p>
            <div class="troubleshooting">
              <p><strong>{$t('diagnostics.dnssec-adflag.error.troubleshooting.title')}:</strong></p>
              <ul>
                <li>{$t('diagnostics.dnssec-adflag.error.troubleshooting.domain')}</li>
                <li>{$t('diagnostics.dnssec-adflag.error.troubleshooting.recordType')}</li>
                <li>{$t('diagnostics.dnssec-adflag.error.troubleshooting.resolver')}</li>
                <li>{$t('diagnostics.dnssec-adflag.error.troubleshooting.records')}</li>
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
      <h3>{$t('diagnostics.dnssec-adflag.education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics.dnssec-adflag.education.dnssec.title')}</h4>
          <p>
            {$t('diagnostics.dnssec-adflag.education.dnssec.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.dnssec-adflag.education.adFlag.title')}</h4>
          <p>
            {$t('diagnostics.dnssec-adflag.education.adFlag.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.dnssec-adflag.education.doh.title')}</h4>
          <p>
            {$t('diagnostics.dnssec-adflag.education.doh.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.dnssec-adflag.education.interpreting.title')}</h4>
          <ul>
            <li>
              <strong>{$t('diagnostics.dnssec-adflag.education.interpreting.adSet.title')}:</strong>
              {$t('diagnostics.dnssec-adflag.education.interpreting.adSet.description')}
            </li>
            <li>
              <strong>{$t('diagnostics.dnssec-adflag.education.interpreting.adNotSet.title')}:</strong>
              {$t('diagnostics.dnssec-adflag.education.interpreting.adNotSet.description')}
            </li>
            <li>
              <strong>{$t('diagnostics.dnssec-adflag.education.interpreting.cdSet.title')}:</strong>
              {$t('diagnostics.dnssec-adflag.education.interpreting.cdSet.description')}
            </li>
            <li>
              <strong>{$t('diagnostics.dnssec-adflag.education.interpreting.servfail.title')}:</strong>
              {$t('diagnostics.dnssec-adflag.education.interpreting.servfail.description')}
            </li>
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
