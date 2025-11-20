<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';
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

  const resolvers = $derived([
    { value: 'cloudflare', label: $t('diagnostics/dns-reverse-lookup.resolvers.cloudflare') },
    { value: 'google', label: $t('diagnostics/dns-reverse-lookup.resolvers.google') },
    { value: 'quad9', label: $t('diagnostics/dns-reverse-lookup.resolvers.quad9') },
    { value: 'opendns', label: $t('diagnostics/dns-reverse-lookup.resolvers.opendns') },
  ]);

  const examples = $derived([
    {
      ip: $t('diagnostics/dns-reverse-lookup.examples.items.googleDNS.ip'),
      description: $t('diagnostics/dns-reverse-lookup.examples.items.googleDNS.description'),
      tooltip: $t('diagnostics/dns-reverse-lookup.examples.items.googleDNS.tooltip'),
    },
    {
      ip: $t('diagnostics/dns-reverse-lookup.examples.items.cloudflareDNS.ip'),
      description: $t('diagnostics/dns-reverse-lookup.examples.items.cloudflareDNS.description'),
      tooltip: $t('diagnostics/dns-reverse-lookup.examples.items.cloudflareDNS.tooltip'),
    },
    {
      ip: $t('diagnostics/dns-reverse-lookup.examples.items.googleIPv6.ip'),
      description: $t('diagnostics/dns-reverse-lookup.examples.items.googleIPv6.description'),
      tooltip: $t('diagnostics/dns-reverse-lookup.examples.items.googleIPv6.tooltip'),
    },
    {
      ip: $t('diagnostics/dns-reverse-lookup.examples.items.cloudflareIPv6.ip'),
      description: $t('diagnostics/dns-reverse-lookup.examples.items.cloudflareIPv6.description'),
      tooltip: $t('diagnostics/dns-reverse-lookup.examples.items.cloudflareIPv6.tooltip'),
    },
  ]);

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
        throw new Error($t('diagnostics/dns-reverse-lookup.error.invalidIPFormat'));
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
        throw new Error($t('diagnostics/dns-reverse-lookup.error.lookupFailed', { status: response.status }));
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
    <h1>{$t('diagnostics/dns-reverse-lookup.title')}</h1>
    <p>{$t('diagnostics/dns-reverse-lookup.subtitle')}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics/dns-reverse-lookup.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={example.tooltip}
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
      <h3>{$t('diagnostics/dns-reverse-lookup.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="ip" use:tooltip={$t('diagnostics/dns-reverse-lookup.form.ipTooltip')}>
            {$t('diagnostics/dns-reverse-lookup.form.ipLabel')}
            <input
              id="ip"
              type="text"
              bind:value={ipAddress}
              placeholder={$t('diagnostics/dns-reverse-lookup.form.ipPlaceholder')}
              class:invalid={ipAddress && !isValidIP(ipAddress.trim())}
              onchange={() => {
                clearExampleSelection();
                if (ipAddress && isValidIP(ipAddress.trim())) performReverseLookup();
              }}
            />
            {#if ipAddress && !isValidIP(ipAddress.trim())}
              <span class="error-text">{$t('diagnostics/dns-reverse-lookup.form.invalidFormat')}</span>
            {/if}
          </label>
        </div>

        <div class="form-group resolver-group">
          <label use:tooltip={$t('diagnostics/dns-reverse-lookup.form.dnsResolverTooltip')}>
            {$t('diagnostics/dns-reverse-lookup.form.dnsResolverLabel')}
            <div class="resolver-options">
              {#if useCustomResolver}
                <input
                  type="text"
                  bind:value={customResolver}
                  placeholder={$t('diagnostics/dns-reverse-lookup.form.customResolverPlaceholder')}
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
                {$t('diagnostics/dns-reverse-lookup.form.useCustomResolver')}
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
            {$t('diagnostics/dns-reverse-lookup.form.performingLookup')}
          {:else}
            <Icon name="search" size="sm" />
            {$t('diagnostics/dns-reverse-lookup.form.lookupButton')}
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
        <h3>{$t('diagnostics/dns-reverse-lookup.results.title')}</h3>
        {#if results.Answer?.length > 0}
          <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
            <span class={copiedState ? 'text-green-500' : ''}
              ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
            >
            {copiedState
              ? $t('diagnostics/dns-reverse-lookup.results.copied')
              : $t('diagnostics/dns-reverse-lookup.results.copyButton')}
          </button>
        {/if}
      </div>
      <div class="card-content">
        <div class="lookup-info">
          <div class="info-item">
            <span class="info-label" use:tooltip={$t('diagnostics/dns-reverse-lookup.results.ipAddressTooltip')}
              >{$t('diagnostics/dns-reverse-lookup.results.ipAddressLabel')}</span
            >
            <span class="info-value mono">{ipAddress}</span>
          </div>
          <div class="info-item">
            <span class="info-label" use:tooltip={$t('diagnostics/dns-reverse-lookup.results.reverseZoneTooltip')}
              >{$t('diagnostics/dns-reverse-lookup.results.reverseZoneLabel')}</span
            >
            <span class="info-value mono">{results.reverseName}</span>
          </div>
        </div>

        {#if results.Answer?.length > 0}
          {@const resData = results as { Answer: Array<{ data: string; TTL?: number }> }}
          <div class="records-list">
            <h4>{$t('diagnostics/dns-reverse-lookup.results.ptrRecordsFound')}</h4>
            {#each resData.Answer as record, _i (_i)}
              <div class="record-item">
                <div class="record-data mono">{record.data}</div>
                {#if record.TTL}
                  <div class="record-ttl" use:tooltip={$t('diagnostics/dns-reverse-lookup.results.ttlTooltip')}>
                    TTL: {record.TTL}s
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="no-records">
            <Icon name="alert-circle" size="md" />
            <p>{$t('diagnostics/dns-reverse-lookup.results.noRecords.title')} <code>{ipAddress}</code></p>
            <p class="help-text">{$t('diagnostics/dns-reverse-lookup.results.noRecords.helpText')}</p>
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
            <strong>{$t('diagnostics/dns-reverse-lookup.error.title')}</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/dns-reverse-lookup.education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/dns-reverse-lookup.education.howItWorks.title')}</h4>
          <p>{$t('diagnostics/dns-reverse-lookup.education.howItWorks.description')}</p>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-reverse-lookup.education.useCases.title')}</h4>
          <ul>
            <li>{$t('diagnostics/dns-reverse-lookup.education.useCases.items.emailVerification')}</li>
            <li>{$t('diagnostics/dns-reverse-lookup.education.useCases.items.securityAnalysis')}</li>
            <li>{$t('diagnostics/dns-reverse-lookup.education.useCases.items.troubleshooting')}</li>
            <li>{$t('diagnostics/dns-reverse-lookup.education.useCases.items.ownership')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-reverse-lookup.education.zoneFormat.title')}</h4>
          <div class="format-examples">
            <div class="format-example">
              <strong>{$t('diagnostics/dns-reverse-lookup.education.zoneFormat.ipv4Label')}</strong>
              {$t('diagnostics/dns-reverse-lookup.education.zoneFormat.ipv4Example')}
            </div>
            <div class="format-example">
              <strong>{$t('diagnostics/dns-reverse-lookup.education.zoneFormat.ipv6Label')}</strong>
              {$t('diagnostics/dns-reverse-lookup.education.zoneFormat.ipv6Example')}
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
