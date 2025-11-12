<script lang="ts">
  import { t } from '$lib/i18n';
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
    { ip: '8.8.8.8', description: t('diagnostics/rdap-ip.examples.items.googleDNS.description') },
    { ip: '1.1.1.1', description: t('diagnostics/rdap-ip.examples.items.cloudflareDNS.description') },
    { ip: '208.67.222.222', description: t('diagnostics/rdap-ip.examples.items.openDNS.description') },
    { ip: '192.0.2.1', description: t('diagnostics/rdap-ip.examples.items.rfc5737.description') },
    { ip: '2001:4860:4860::8888', description: t('diagnostics/rdap-ip.examples.items.googleIPv6.description') },
    { ip: '2606:4700:4700::1111', description: t('diagnostics/rdap-ip.examples.items.cloudflareIPv6.description') },
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
      error = err instanceof Error ? err.message : t('diagnostics/rdap-ip.error.unknownError');
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
    if (!dateString) return t('diagnostics/rdap-ip.results.notAvailable');
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
    <h1>{t('diagnostics/rdap-ip.title')}</h1>
    <p>
      {t('diagnostics/rdap-ip.subtitle')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{t('diagnostics/rdap-ip.examples.title')}</h4>
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
      <h3>{t('diagnostics/rdap-ip.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="ip" use:tooltip={t('diagnostics/rdap-ip.form.ipTooltip')}>
            {t('diagnostics/rdap-ip.form.ipLabel')}
            <input
              id="ip"
              type="text"
              bind:value={ip}
              placeholder={t('diagnostics/rdap-ip.form.ipPlaceholder')}
              onchange={() => {
                clearExampleSelection();
                if (ip.trim()) lookupIP();
              }}
            />
            <small>{t('diagnostics/rdap-ip.form.ipHint')}</small>
          </label>
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={lookupIP} disabled={loading || !ip.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            {t('diagnostics/rdap-ip.form.performing')}
          {:else}
            <Icon name="search" size="sm" />
            {t('diagnostics/rdap-ip.form.lookupButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{t('diagnostics/rdap-ip.results.title', { ip: results.ip })}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? t('diagnostics/rdap-ip.results.copied') : t('diagnostics/rdap-ip.results.copy')}
        </button>
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={t('diagnostics/rdap-ip.results.ipAddressTooltip')}
              >{t('diagnostics/rdap-ip.results.ipAddress')}:</span
            >
            <span class="info-value">
              <span class="mono">{results.ip}</span>
              <span class="ip-version">{getIPVersion(results.ip)}</span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={t('diagnostics/rdap-ip.results.rdapServiceTooltip')}
              >{t('diagnostics/rdap-ip.results.rdapService')}:</span
            >
            <span class="info-value mono">{results.serviceUrl}</span>
          </div>
        </div>

        <div class="results-grid">
          <!-- Network Information -->
          <div class="result-section">
            <h4>{t('diagnostics/rdap-ip.results.networkInfo.title')}</h4>
            <dl class="definition-list">
              <dt>{t('diagnostics/rdap-ip.results.networkInfo.networkBlock')}:</dt>
              <dd><code>{results.data.network || t('diagnostics/rdap-ip.results.notAvailable')}</code></dd>

              <dt>{t('diagnostics/rdap-ip.results.networkInfo.networkName')}:</dt>
              <dd>{results.data.name || t('diagnostics/rdap-ip.results.notAvailable')}</dd>

              <dt>{t('diagnostics/rdap-ip.results.networkInfo.type')}:</dt>
              <dd>{results.data.type || t('diagnostics/rdap-ip.results.notAvailable')}</dd>

              <dt>{t('diagnostics/rdap-ip.results.networkInfo.country')}:</dt>
              <dd>
                {#if results.data.country}
                  <span class="country-code">{results.data.country}</span>
                {:else}
                  {t('diagnostics/rdap-ip.results.notAvailable')}
                {/if}
              </dd>

              <dt>{t('diagnostics/rdap-ip.results.networkInfo.registry')}:</dt>
              <dd>{results.data.registry || t('diagnostics/rdap-ip.results.notAvailable')}</dd>
            </dl>
          </div>

          <!-- Status and Dates -->
          <div class="result-section">
            <h4>{t('diagnostics/rdap-ip.results.allocation.title')}</h4>
            <dl class="definition-list">
              <dt>{t('diagnostics/rdap-ip.results.allocation.status')}:</dt>
              <dd>
                {#if results.data.status?.length}
                  <div class="status-list">
                    {#each results.data.status as status, index (index)}
                      <span class="status-badge">{status}</span>
                    {/each}
                  </div>
                {:else}
                  {t('diagnostics/rdap-ip.results.notAvailable')}
                {/if}
              </dd>

              <dt>{t('diagnostics/rdap-ip.results.allocation.allocationDate')}:</dt>
              <dd>{formatDate(results.data.allocation)}</dd>

              <dt>{t('diagnostics/rdap-ip.results.allocation.lastChanged')}:</dt>
              <dd>{formatDate(results.data.lastChanged)}</dd>
            </dl>
          </div>

          <!-- Contact Information -->
          {#if results.data.contacts?.length}
            <div class="result-section full-width">
              <h4>{t('diagnostics/rdap-ip.results.contacts.title')}</h4>
              <div class="contacts-grid">
                {#each results.data.contacts as contact, index (index)}
                  <div class="contact-card">
                    <h5>
                      {#if contact.roles?.includes('registrant')}
                        {t('diagnostics/rdap-ip.results.contacts.registrant')}
                      {:else if contact.roles?.includes('administrative')}
                        {t('diagnostics/rdap-ip.results.contacts.administrative')}
                      {:else if contact.roles?.includes('technical')}
                        {t('diagnostics/rdap-ip.results.contacts.technical')}
                      {:else if contact.roles?.includes('abuse')}
                        {t('diagnostics/rdap-ip.results.contacts.abuse')}
                      {:else}
                        {t('diagnostics/rdap-ip.results.contacts.contact')}
                      {/if}
                    </h5>
                    <p><strong>{formatContact(contact)}</strong></p>
                    {#if contact.handle}
                      <p>
                        <small>{t('diagnostics/rdap-ip.results.contacts.handle', { handle: contact.handle })}</small>
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
            <strong>{t('diagnostics/rdap-ip.error.title')}</strong>
            <p>{error}</p>
            <div class="troubleshooting">
              <p><strong>{t('diagnostics/rdap-ip.error.troubleshooting.title')}</strong></p>
              <ul>
                <li>{t('diagnostics/rdap-ip.error.troubleshooting.validIP')}</li>
                <li>{t('diagnostics/rdap-ip.error.troubleshooting.privateIP')}</li>
                <li>{t('diagnostics/rdap-ip.error.troubleshooting.rateLimiting')}</li>
                <li>{t('diagnostics/rdap-ip.error.troubleshooting.specialUse')}</li>
                <li>{t('diagnostics/rdap-ip.error.troubleshooting.tryAgain')}</li>
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
      <h3>{t('diagnostics/rdap-ip.educational.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{t('diagnostics/rdap-ip.educational.howItWorks.title')}</h4>
          <p>
            {t('diagnostics/rdap-ip.educational.howItWorks.description')}
          </p>
        </div>

        <div class="info-section">
          <h4>{t('diagnostics/rdap-ip.educational.rirs.title')}</h4>
          <ul>
            <li>{t('diagnostics/rdap-ip.educational.rirs.arin')}</li>
            <li>{t('diagnostics/rdap-ip.educational.rirs.ripe')}</li>
            <li>{t('diagnostics/rdap-ip.educational.rirs.apnic')}</li>
            <li>{t('diagnostics/rdap-ip.educational.rirs.lacnic')}</li>
            <li>{t('diagnostics/rdap-ip.educational.rirs.afrinic')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{t('diagnostics/rdap-ip.educational.whatYouGet.title')}</h4>
          <ul>
            <li>{t('diagnostics/rdap-ip.educational.whatYouGet.networkBlock')}</li>
            <li>{t('diagnostics/rdap-ip.educational.whatYouGet.allocationType')}</li>
            <li>{t('diagnostics/rdap-ip.educational.whatYouGet.organization')}</li>
            <li>{t('diagnostics/rdap-ip.educational.whatYouGet.contacts')}</li>
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
