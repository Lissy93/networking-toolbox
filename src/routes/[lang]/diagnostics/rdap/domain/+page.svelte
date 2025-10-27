<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';
  import '../../../../../styles/diagnostics-pages.scss';

  let domain = $state('example.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = $derived([
    {
      domain: $t('diagnostics/rdap-domain.examples.items.example.domain'),
      description: $t('diagnostics/rdap-domain.examples.items.example.description'),
    },
    {
      domain: $t('diagnostics/rdap-domain.examples.items.google.domain'),
      description: $t('diagnostics/rdap-domain.examples.items.google.description'),
    },
    {
      domain: $t('diagnostics/rdap-domain.examples.items.github.domain'),
      description: $t('diagnostics/rdap-domain.examples.items.github.description'),
    },
    {
      domain: $t('diagnostics/rdap-domain.examples.items.stackoverflow.domain'),
      description: $t('diagnostics/rdap-domain.examples.items.stackoverflow.description'),
    },
    {
      domain: $t('diagnostics/rdap-domain.examples.items.cloudflare.domain'),
      description: $t('diagnostics/rdap-domain.examples.items.cloudflare.description'),
    },
    {
      domain: $t('diagnostics/rdap-domain.examples.items.iana.domain'),
      description: $t('diagnostics/rdap-domain.examples.items.iana.description'),
    },
  ]);

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
        throw new Error(
          errorData.message || $t('diagnostics/rdap-domain.error.lookupFailed', { status: response.status }),
        );
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : $t('diagnostics/rdap-domain.error.unknownError');
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
    if (!dateString) return $t('diagnostics/rdap-domain.results.notAvailable');
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
    <h1>{$t('diagnostics/rdap-domain.title')}</h1>
    <p>{$t('diagnostics/rdap-domain.subtitle')}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics/rdap-domain.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={$t(
              `diagnostics/rdap-domain.examples.items.${['example', 'google', 'github', 'stackoverflow', 'cloudflare', 'iana'][i]}.tooltip`,
            )}
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
      <h3>{$t('diagnostics/rdap-domain.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="domain" use:tooltip={$t('diagnostics/rdap-domain.form.domainTooltip')}>
            {$t('diagnostics/rdap-domain.form.domainLabel')}
            <input
              id="domain"
              type="text"
              bind:value={domain}
              placeholder={$t('diagnostics/rdap-domain.form.domainPlaceholder')}
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
            {$t('diagnostics/rdap-domain.form.performing')}
          {:else}
            <Icon name="search" size="sm" />
            {$t('diagnostics/rdap-domain.form.lookupButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics/rdap-domain.results.title', { domain: results.domain })}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? $t('diagnostics/rdap-domain.results.copied') : $t('diagnostics/rdap-domain.results.copy')}
        </button>
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={$t('diagnostics/rdap-domain.results.domainTooltip')}
              >{$t('diagnostics/rdap-domain.results.domain')}:</span
            >
            <span class="info-value mono">{results.data.domain || results.domain}</span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={$t('diagnostics/rdap-domain.results.rdapServiceTooltip')}
              >{$t('diagnostics/rdap-domain.results.rdapService')}:</span
            >
            <span class="info-value mono">{results.serviceUrl}</span>
          </div>
        </div>

        <div class="results-grid">
          <!-- Domain Information -->
          <div class="result-section">
            <h4>{$t('diagnostics/rdap-domain.results.domainInfo.title')}</h4>
            <dl class="definition-list">
              <dt>{$t('diagnostics/rdap-domain.results.domainInfo.domainName')}</dt>
              <dd><code>{results.data.domain || results.domain}</code></dd>

              <dt>{$t('diagnostics/rdap-domain.results.domainInfo.status')}</dt>
              <dd>
                {#if results.data.status?.length}
                  <div class="status-list">
                    {#each results.data.status as status, index (index)}
                      <span class="status-badge">{status}</span>
                    {/each}
                  </div>
                {:else}
                  {$t('diagnostics/rdap-domain.results.notAvailable')}
                {/if}
              </dd>

              <dt>{$t('diagnostics/rdap-domain.results.domainInfo.registrar')}</dt>
              <dd>{results.data.registrar || $t('diagnostics/rdap-domain.results.notAvailable')}</dd>
            </dl>
          </div>

          <!-- Important Dates -->
          <div class="result-section">
            <h4>{$t('diagnostics/rdap-domain.results.dates.title')}</h4>
            <dl class="definition-list">
              <dt>{$t('diagnostics/rdap-domain.results.dates.registration')}</dt>
              <dd>{formatDate(results.data.created)}</dd>

              <dt>{$t('diagnostics/rdap-domain.results.dates.lastUpdated')}</dt>
              <dd>{formatDate(results.data.updated)}</dd>

              <dt>{$t('diagnostics/rdap-domain.results.dates.expiration')}</dt>
              <dd
                class:expires-soon={results.data.expires &&
                  new Date(results.data.expires) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
              >
                {formatDate(results.data.expires)}
                {#if results.data.expires && new Date(results.data.expires) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                  <span class="warning-badge">{$t('diagnostics/rdap-domain.results.dates.expiresSoon')}</span>
                {/if}
              </dd>
            </dl>
          </div>

          <!-- Nameservers -->
          {#if results.data.nameservers?.length}
            <div class="result-section">
              <h4>
                {$t('diagnostics/rdap-domain.results.nameservers.title', { count: results.data.nameservers.length })}
              </h4>
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
              <h4>{$t('diagnostics/rdap-domain.results.contacts.title')}</h4>
              <div class="contacts-grid">
                {#each results.data.contacts as contact, index (index)}
                  <div class="contact-card">
                    <h5>
                      {#if contact.roles?.includes('registrant')}
                        {$t('diagnostics/rdap-domain.results.contacts.registrant')}
                      {:else if contact.roles?.includes('administrative')}
                        {$t('diagnostics/rdap-domain.results.contacts.administrative')}
                      {:else if contact.roles?.includes('technical')}
                        {$t('diagnostics/rdap-domain.results.contacts.technical')}
                      {:else}
                        {$t('diagnostics/rdap-domain.results.contacts.contact')}
                      {/if}
                    </h5>
                    <p><strong>{formatContact(contact)}</strong></p>
                    {#if contact.handle}
                      <p>
                        <small
                          >{$t('diagnostics/rdap-domain.results.contacts.handle', { handle: contact.handle })}</small
                        >
                      </p>
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
            <strong>{$t('diagnostics/rdap-domain.error.title')}</strong>
            <p>{error}</p>
            <div class="troubleshooting">
              <p><strong>{$t('diagnostics/rdap-domain.error.troubleshooting.title')}</strong></p>
              <ul>
                <li>{$t('diagnostics/rdap-domain.error.troubleshooting.validDomain')}</li>
                <li>{$t('diagnostics/rdap-domain.error.troubleshooting.domainExists')}</li>
                <li>{$t('diagnostics/rdap-domain.error.troubleshooting.rateLimiting')}</li>
                <li>{$t('diagnostics/rdap-domain.error.troubleshooting.tryAgain')}</li>
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
      <h3>{$t('diagnostics/rdap-domain.educational.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/rdap-domain.educational.whatIsRDAP.title')}</h4>
          <p>{$t('diagnostics/rdap-domain.educational.whatIsRDAP.description')}</p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/rdap-domain.educational.whatYouGet.title')}</h4>
          <ul>
            <li>{$t('diagnostics/rdap-domain.educational.whatYouGet.statusDates')}</li>
            <li>{$t('diagnostics/rdap-domain.educational.whatYouGet.nameservers')}</li>
            <li>{$t('diagnostics/rdap-domain.educational.whatYouGet.registrar')}</li>
            <li>{$t('diagnostics/rdap-domain.educational.whatYouGet.contacts')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/rdap-domain.educational.rdapVsWhois.title')}</h4>
          <ul>
            <li>{$t('diagnostics/rdap-domain.educational.rdapVsWhois.structuredJSON')}</li>
            <li>{$t('diagnostics/rdap-domain.educational.rdapVsWhois.unicodeSupport')}</li>
            <li>{$t('diagnostics/rdap-domain.educational.rdapVsWhois.rateLimiting')}</li>
            <li>{$t('diagnostics/rdap-domain.educational.rdapVsWhois.restfulAPI')}</li>
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
