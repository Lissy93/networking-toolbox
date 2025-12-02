<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { locale, loadTranslations, t } from '$lib/stores/language.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import {
    generateCIDRPTRs,
    generateReverseZoneFile,
    calculateReverseZones,
    type PTRRecord as _PTRRecord,
    type ZoneFileOptions,
  } from '$lib/utils/reverse-dns';

  onMount(async () => {
    await loadTranslations(get(locale), 'tools/reverse-zone-generator');
  });

  let cidrInput = $state('192.168.1.0/24');
  let hostnameTemplate = $state('host-{ip-dashes}.example.com.');
  let nameServers = $state('ns1.example.com.\nns2.example.com.');
  let contactEmail = $state('hostmaster.example.com.');
  let ttl = $state(86400);

  let results = $state<{
    success: boolean;
    error?: string;
    zones: Array<{
      zone: string;
      type: 'IPv4' | 'IPv6';
      content: string;
      recordCount: number;
    }>;
    summary: {
      totalZones: number;
      totalRecords: number;
    };
  } | null>(null);

  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let _userModified = $state(false);

  const examples = $derived([
    {
      label: $t('examples.items.0.label'),
      cidr: '192.168.1.0/24',
      template: 'host-{ip-dashes}.example.com.',
      description: $t('examples.items.0.description'),
    },
    {
      label: $t('examples.items.1.label'),
      cidr: '10.0.0.16/28',
      template: 'server{ip}.lan.example.com.',
      description: $t('examples.items.1.description'),
    },
    {
      label: $t('examples.items.2.label'),
      cidr: '2001:db8:1000::/64',
      template: 'host-{ip-dashes}.ipv6.example.com.',
      description: $t('examples.items.2.description'),
    },
    {
      label: $t('examples.items.3.label'),
      cidr: '172.16.100.0/24',
      template: 'workstation-{ip-dashes}.corp.example.com.',
      description: $t('examples.items.3.description'),
    },
  ]);

  const templateHelp = $derived([
    { placeholder: '{ip}', description: $t('templateHelp.placeholders.0.description') },
    { placeholder: '{ip-dashes}', description: $t('templateHelp.placeholders.1.description') },
    { placeholder: '{domain}', description: $t('templateHelp.placeholders.2.description') },
  ]);

  function loadExample(example: (typeof examples)[0]) {
    cidrInput = example.cidr;
    hostnameTemplate = example.template;
    selectedExample = example.label;
    _userModified = false;
    generateZones();
  }

  function generateZones() {
    if (!cidrInput.trim()) {
      results = null;
      return;
    }

    try {
      const trimmed = cidrInput.trim();

      // Generate PTR records for the CIDR
      const ptrRecords = generateCIDRPTRs(trimmed, 5000);

      if (ptrRecords.length === 0) {
        throw new Error('No valid PTR records could be generated from this CIDR');
      }

      // Get the zones that need to be created
      const zoneInfos = calculateReverseZones(trimmed);

      // Parse name servers
      const nsArray = nameServers
        .split('\n')
        .map((ns) => ns.trim())
        .filter((ns) => ns.length > 0)
        .map((ns) => (ns.endsWith('.') ? ns : ns + '.'));

      const domainSuffix = contactEmail.split('@')[1] || 'example.com';

      const options: ZoneFileOptions = {
        nameServers: nsArray,
        contactEmail: contactEmail.endsWith('.') ? contactEmail : contactEmail + '.',
        domainSuffix: domainSuffix.endsWith('.') ? domainSuffix : domainSuffix + '.',
        ttl,
      };

      const zones = zoneInfos.map((zoneInfo) => {
        const zoneRecords = ptrRecords.filter((record) => record.zone === zoneInfo.zone);
        const content = generateReverseZoneFile(zoneInfo.zone, zoneRecords, hostnameTemplate, options);

        return {
          zone: zoneInfo.zone,
          type: zoneInfo.type,
          content,
          recordCount: zoneRecords.length,
        };
      });

      const summary = {
        totalZones: zones.length,
        totalRecords: ptrRecords.length,
      };

      results = {
        success: true,
        zones,
        summary,
      };
    } catch (error) {
      results = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        zones: [],
        summary: { totalZones: 0, totalRecords: 0 },
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExample = null;
    generateZones();
  }

  // Generate on component load
  generateZones();
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('title')}</h1>
    <p>{$t('description')}</p>
  </header>

  <!-- Educational Overview Card -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="file" size="sm" />
        <div>
          <strong>{$t('overview.fullZoneFiles.title')}</strong>
          {$t('overview.fullZoneFiles.description')}
        </div>
      </div>
      <div class="overview-item">
        <Icon name="template" size="sm" />
        <div>
          <strong>{$t('overview.hostnameTemplates.title')}</strong>
          {$t('overview.hostnameTemplates.description')}
        </div>
      </div>
      <div class="overview-item">
        <Icon name="settings" size="sm" />
        <div>
          <strong>{$t('overview.zoneConfiguration.title')}</strong>
          {$t('overview.zoneConfiguration.description')}
        </div>
      </div>
    </div>
  </div>

  <!-- Examples Card -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>{$t('examples.title')}</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example (example.label)}
          <button
            class="example-card {selectedExample === example.label ? 'active' : ''}"
            onclick={() => loadExample(example)}
          >
            <div class="example-header">
              <div class="example-label">{example.label}</div>
            </div>
            <code class="example-input">{example.cidr}</code>
            <div class="example-template">Template: <code>{example.template}</code></div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Card -->
  <div class="card input-card">
    <!-- CIDR Input -->
    <div class="input-group">
      <label for="cidr-input" use:tooltip={$t('form.cidrBlock.tooltip')}>
        <Icon name="network" size="sm" />
        {$t('form.cidrBlock.label')}
      </label>
      <input
        id="cidr-input"
        type="text"
        bind:value={cidrInput}
        oninput={handleInputChange}
        placeholder={$t('form.cidrBlock.placeholder')}
        class="cidr-input {results?.success === true ? 'valid' : results?.success === false ? 'invalid' : ''}"
        spellcheck="false"
      />
    </div>

    <!-- Hostname Template -->
    <div class="input-group">
      <label for="template-input" use:tooltip={$t('form.hostnameTemplate.tooltip')}>
        <Icon name="tag" size="sm" />
        {$t('form.hostnameTemplate.label')}
      </label>
      <input
        id="template-input"
        type="text"
        bind:value={hostnameTemplate}
        oninput={handleInputChange}
        placeholder={$t('form.hostnameTemplate.placeholder')}
        class="template-input"
        spellcheck="false"
      />

      <!-- Template Help -->
      <div class="template-help">
        <h4>{$t('templateHelp.title')}</h4>
        <div class="placeholder-grid">
          {#each templateHelp as item (item.placeholder)}
            <div class="placeholder-item">
              <code class="placeholder">{item.placeholder}</code>
              <span class="placeholder-desc">{item.description}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Zone Configuration -->
    <div class="config-section">
      <h3>{$t('form.zoneConfiguration')}</h3>

      <div class="config-grid">
        <div class="config-group">
          <label for="nameservers-input" use:tooltip={$t('form.nameServers.tooltip')}>
            <Icon name="server" size="sm" />
            {$t('form.nameServers.label')}
          </label>
          <textarea
            id="nameservers-input"
            bind:value={nameServers}
            oninput={handleInputChange}
            placeholder={$t('form.nameServers.placeholder')}
            class="nameservers-input"
            rows="3"
            spellcheck="false"
          ></textarea>
        </div>

        <div class="config-group">
          <label for="contact-input" use:tooltip={$t('form.contactEmail.tooltip')}>
            <Icon name="mail" size="sm" />
            {$t('form.contactEmail.label')}
          </label>
          <input
            id="contact-input"
            type="email"
            bind:value={contactEmail}
            oninput={handleInputChange}
            placeholder={$t('form.contactEmail.placeholder')}
            class="contact-input"
            spellcheck="false"
          />
        </div>

        <div class="config-group">
          <label for="ttl-input" use:tooltip={$t('form.defaultTTL.tooltip')}>
            <Icon name="clock" size="sm" />
            {$t('form.defaultTTL.label')}
          </label>
          <input
            id="ttl-input"
            type="number"
            bind:value={ttl}
            oninput={handleInputChange}
            placeholder={$t('form.defaultTTL.placeholder')}
            class="ttl-input"
            min="60"
            max="2147483647"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Results Card -->
  {#if results && cidrInput.trim()}
    <div class="card results-card">
      {#if results.success}
        <div class="results-header">
          <h3>{$t('results.title')}</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">{results.summary.totalZones}</span>
              <span class="stat-label">{$t('results.summary.zoneFiles')}</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{results.summary.totalRecords}</span>
              <span class="stat-label">{$t('results.summary.ptrRecords')}</span>
            </div>
          </div>
        </div>

        <!-- Zone Files -->
        <div class="zone-files">
          {#each results.zones as zone, index (zone.zone)}
            <div class="zone-file">
              <div class="zone-file-header">
                <div class="zone-info">
                  <h4>{zone.zone}</h4>
                  <div class="zone-meta">
                    <span class="zone-type {zone.type.toLowerCase()}">{zone.type}</span>
                    <span class="record-count">{$t('results.recordCount', { count: zone.recordCount })}</span>
                  </div>
                </div>
                <button
                  class="copy-button {clipboard.isCopied(`zone-${index}`) ? 'copied' : ''}"
                  onclick={() => clipboard.copy(zone.content, `zone-${index}`)}
                >
                  <Icon name={clipboard.isCopied(`zone-${index}`) ? 'check' : 'copy'} size="sm" />
                  {$t('results.copyZoneFile')}
                </button>
              </div>

              <div class="zone-content-container">
                <pre class="zone-content"><code>{zone.content}</code></pre>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="error-result">
          <Icon name="alert-triangle" size="lg" />
          <h4>{$t('results.error.title')}</h4>
          <p>{results.error}</p>
          <div class="error-help">
            <strong>{$t('results.error.validFormats')}</strong>
            <ul>
              <li>{$t('results.error.ipv4CIDR')}</li>
              <li>{$t('results.error.ipv6CIDR')}</li>
            </ul>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Educational Content Card -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>{$t('education.zoneFileStructure.title')}</h4>
        <p>
          {$t('education.zoneFileStructure.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.hostnameTemplates.title')}</h4>
        <p>
          {$t('education.hostnameTemplates.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.zoneDelegation.title')}</h4>
        <p>
          {$t('education.zoneDelegation.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.bestPractices.title')}</h4>
        <p>
          {$t('education.bestPractices.content')}
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .info-card {
    margin-bottom: var(--spacing-xl);
  }

  .overview-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .overview-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
    }
  }

  .examples-card {
    margin-bottom: var(--spacing-xl);
    padding: 0;
  }

  .examples-details {
    border: none;
    background: none;

    &[open] {
      .examples-summary :global(.icon) {
        transform: rotate(90deg);
      }
    }
  }

  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);
    border-radius: var(--radius-md);

    &:hover {
      background-color: var(--surface-hover);
    }

    &::-webkit-details-marker {
      display: none;
    }

    :global(.icon) {
      transition: transform var(--transition-fast);
    }

    h3 {
      margin: 0;
      font-size: var(--font-size-md);
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .example-card {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
      transform: translateY(-1px);
    }

    &.active {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
      box-shadow: var(--shadow-md);
    }
  }

  .example-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-input {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    word-break: break-all;
  }

  .example-template {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    code {
      font-size: var(--font-size-xs);
      color: var(--text-primary);
    }
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .input-card {
    margin-bottom: var(--spacing-xl);
  }

  .input-group {
    margin-bottom: var(--spacing-lg);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .cidr-input,
  .template-input {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-lg);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--border-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }

    &.valid {
      border-color: var(--color-success);
    }

    &.invalid {
      border-color: var(--color-error);
    }
  }

  .template-help {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);

    h4 {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }
  }

  .placeholder-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .placeholder-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .placeholder {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    min-width: 100px;
  }

  .placeholder-desc {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .config-section {
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-secondary);

    h3 {
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 200px;
    gap: var(--spacing-lg);
    align-items: flex-start;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .config-group {
    min-width: 13rem;
    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }
  }

  .nameservers-input,
  .contact-input,
  .ttl-input {
    width: 100%;
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--border-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }
  }

  .nameservers-input {
    font-family: var(--font-mono);
    resize: vertical;
  }

  .contact-input {
    font-family: var(--font-mono);
  }

  .ttl-input {
    font-family: var(--font-mono);
  }

  .results-card {
    margin-bottom: var(--spacing-xl);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
    }

    h3 {
      margin: 0;
    }
  }

  .summary-stats {
    display: flex;
    gap: var(--spacing-lg);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .stat-value {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .zone-files {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .zone-file {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .zone-file-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
      align-items: stretch;
    }
  }

  .zone-info {
    h4 {
      margin: 0 0 var(--spacing-xs) 0;
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .zone-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .zone-type {
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-weight: 600;

    &.ipv4 {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    &.ipv6 {
      background-color: rgba(147, 51, 234, 0.1);
      color: var(--color-accent);
    }
  }

  .record-count {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);
    font-weight: 500;

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .zone-content-container {
    max-height: 400px;
    overflow-y: auto;
  }

  .zone-content {
    padding: var(--spacing-lg);
    background-color: var(--bg-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;

    code {
      background: none;
    }
  }

  .error-result {
    text-align: center;
    padding: var(--spacing-xl);
    background-color: var(--bg-secondary);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-lg);
    color: var(--color-error-light);

    :global(.icon) {
      color: var(--color-error);
      margin-bottom: var(--spacing-md);
    }

    h4 {
      margin-bottom: var(--spacing-md);
    }

    p {
      margin-bottom: var(--spacing-lg);
    }
  }

  .error-help {
    text-align: left;
    background-color: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    color: var(--text-secondary);

    ul {
      margin-top: var(--spacing-sm);
      padding-left: var(--spacing-lg);

      li {
        margin-bottom: var(--spacing-xs);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
      }
    }
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .education-item {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);

    h4 {
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
      color: var(--color-primary);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .summary-stats {
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
