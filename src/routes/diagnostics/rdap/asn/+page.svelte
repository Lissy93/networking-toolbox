<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/i18n';
  import '../../../../styles/diagnostics-pages.scss';

  let asn = $state('AS15169');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { asn: 'AS15169', description: t('diagnostics/rdap-asn.examples.items.google.description') },
    { asn: 'AS13335', description: t('diagnostics/rdap-asn.examples.items.cloudflare.description') },
    { asn: 'AS16509', description: t('diagnostics/rdap-asn.examples.items.amazon.description') },
    { asn: 'AS8075', description: t('diagnostics/rdap-asn.examples.items.microsoft.description') },
    { asn: 'AS32934', description: t('diagnostics/rdap-asn.examples.items.meta.description') },
    { asn: 'AS396982', description: t('diagnostics/rdap-asn.examples.items.googleCloud.description') },
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
        throw new Error(errorData.message || t('diagnostics/rdap-asn.error.lookupFailed', { status: response.status }));
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
    if (!dateString) return t('diagnostics/rdap-asn.results.notAvailable');
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
    <h1>{t('diagnostics/rdap-asn.title')}</h1>
    <p>
      {t('diagnostics/rdap-asn.subtitle')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{t('diagnostics/rdap-asn.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={t('diagnostics/rdap-asn.examples.items.google.tooltip')
              .replace('AS15169', example.asn)
              .replace('Google LLC - Major cloud provider', example.description)}
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
      <h3>{t('diagnostics/rdap-asn.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="asn" use:tooltip={t('diagnostics/rdap-asn.form.asnTooltip')}>
            {t('diagnostics/rdap-asn.form.asnLabel')}
            <input
              id="asn"
              type="text"
              bind:value={asn}
              placeholder={t('diagnostics/rdap-asn.form.asnPlaceholder')}
              onchange={() => {
                clearExampleSelection();
                if (asn.trim()) lookupASN();
              }}
            />
            <small>{t('diagnostics/rdap-asn.form.asnHint')}</small>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={lookupASN} disabled={loading || !asn.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            {t('diagnostics/rdap-asn.form.performing')}
          {:else}
            <Icon name="search" size="sm" />
            {t('diagnostics/rdap-asn.form.lookupButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{t('diagnostics/rdap-asn.results.title', { asn: formatASN(results.asn) })}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? t('diagnostics/rdap-asn.results.copied') : t('diagnostics/rdap-asn.results.copy')}
        </button>
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={t('diagnostics/rdap-asn.results.asnTooltip')}
              >{t('diagnostics/rdap-asn.results.asn')}:</span
            >
            <span class="info-value">
              <span class="asn-number">{formatASN(results.asn)}</span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={t('diagnostics/rdap-asn.results.rdapServiceTooltip')}
              >{t('diagnostics/rdap-asn.results.rdapService')}:</span
            >
            <span class="info-value mono">{results.serviceUrl}</span>
          </div>
        </div>

        <div class="results-grid">
          <!-- ASN Information -->
          <div class="result-section">
            <h4>{t('diagnostics/rdap-asn.results.asnInfo.title')}</h4>
            <dl class="definition-list">
              <dt>{t('diagnostics/rdap-asn.results.asnInfo.organizationName')}</dt>
              <dd>{results.data.name || t('diagnostics/rdap-asn.results.notAvailable')}</dd>

              <dt>{t('diagnostics/rdap-asn.results.asnInfo.type')}</dt>
              <dd>{results.data.type || t('diagnostics/rdap-asn.results.notAvailable')}</dd>

              <dt>{t('diagnostics/rdap-asn.results.asnInfo.country')}</dt>
              <dd>
                {#if results.data.country}
                  <span class="country-code">{results.data.country}</span>
                {:else}
                  {t('diagnostics/rdap-asn.results.notAvailable')}
                {/if}
              </dd>

              <dt>{t('diagnostics/rdap-asn.results.asnInfo.registry')}</dt>
              <dd>{results.data.registry || t('diagnostics/rdap-asn.results.notAvailable')}</dd>
            </dl>
          </div>

          <!-- Status and Dates -->
          <div class="result-section">
            <h4>{t('diagnostics/rdap-asn.results.allocation.title')}</h4>
            <dl class="definition-list">
              <dt>{t('diagnostics/rdap-asn.results.allocation.status')}</dt>
              <dd>
                {#if results.data.status?.length}
                  <div class="status-list">
                    {#each results.data.status as status, index (index)}
                      <span class="status-badge">{status}</span>
                    {/each}
                  </div>
                {:else}
                  {t('diagnostics/rdap-asn.results.notAvailable')}
                {/if}
              </dd>

              <dt>{t('diagnostics/rdap-asn.results.allocation.allocationDate')}</dt>
              <dd>{formatDate(results.data.allocation)}</dd>

              <dt>{t('diagnostics/rdap-asn.results.allocation.lastChanged')}</dt>
              <dd>{formatDate(results.data.lastChanged)}</dd>
            </dl>
          </div>

          <!-- Contact Information -->
          {#if results.data.contacts?.length}
            <div class="result-section full-width">
              <h4>{t('diagnostics/rdap-asn.results.contacts.title')}</h4>
              <div class="contacts-grid">
                {#each results.data.contacts as contact, index (index)}
                  <div class="contact-card">
                    <h5>
                      {#if contact.roles?.includes('registrant')}
                        {t('diagnostics/rdap-asn.results.contacts.registrant')}
                      {:else if contact.roles?.includes('administrative')}
                        {t('diagnostics/rdap-asn.results.contacts.administrative')}
                      {:else if contact.roles?.includes('technical')}
                        {t('diagnostics/rdap-asn.results.contacts.technical')}
                      {:else if contact.roles?.includes('abuse')}
                        {t('diagnostics/rdap-asn.results.contacts.abuse')}
                      {:else}
                        {t('diagnostics/rdap-asn.results.contacts.contact')}
                      {/if}
                    </h5>
                    <p><strong>{formatContact(contact)}</strong></p>
                    {#if contact.handle}
                      <p>
                        <small>{t('diagnostics/rdap-asn.results.contacts.handle', { handle: contact.handle })}</small>
                      </p>
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
            <strong>{t('diagnostics/rdap-asn.error.title')}</strong>
            <p>{error}</p>
            <div class="troubleshooting">
              <p><strong>{t('diagnostics/rdap-asn.error.troubleshooting.title')}</strong></p>
              <ul>
                <li>{t('diagnostics/rdap-asn.error.troubleshooting.validFormat')}</li>
                <li>{t('diagnostics/rdap-asn.error.troubleshooting.asnExists')}</li>
                <li>{t('diagnostics/rdap-asn.error.troubleshooting.privateASN')}</li>
                <li>{t('diagnostics/rdap-asn.error.troubleshooting.rateLimiting')}</li>
                <li>{t('diagnostics/rdap-asn.error.troubleshooting.tryAgain')}</li>
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
      <h3>{t('diagnostics/rdap-asn.educational.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{t('diagnostics/rdap-asn.educational.whatIsASN.title')}</h4>
          <p>
            {t('diagnostics/rdap-asn.educational.whatIsASN.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{t('diagnostics/rdap-asn.educational.asnRanges.title')}</h4>
          <ul>
            <li><strong>ARIN:</strong> {t('diagnostics/rdap-asn.educational.asnRanges.arin')}</li>
            <li><strong>RIPE NCC:</strong> {t('diagnostics/rdap-asn.educational.asnRanges.ripe')}</li>
            <li><strong>APNIC:</strong> {t('diagnostics/rdap-asn.educational.asnRanges.apnic')}</li>
            <li><strong>LACNIC:</strong> {t('diagnostics/rdap-asn.educational.asnRanges.lacnic')}</li>
            <li><strong>AFRINIC:</strong> {t('diagnostics/rdap-asn.educational.asnRanges.afrinic')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{t('diagnostics/rdap-asn.educational.whatYouGet.title')}</h4>
          <ul>
            <li>{t('diagnostics/rdap-asn.educational.whatYouGet.organization')}</li>
            <li>{t('diagnostics/rdap-asn.educational.whatYouGet.country')}</li>
            <li>{t('diagnostics/rdap-asn.educational.whatYouGet.allocation')}</li>
            <li>{t('diagnostics/rdap-asn.educational.whatYouGet.contacts')}</li>
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
