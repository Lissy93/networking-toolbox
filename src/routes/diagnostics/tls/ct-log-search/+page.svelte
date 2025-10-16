<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { ctLogContent as content } from '$lib/content/ct-log-search';
  import '../../../../styles/diagnostics-pages.scss';

  interface ProcessedCertificate {
    id: number;
    commonName: string;
    sans: string[];
    issuer: string;
    issuerId: number;
    entryTimestamp: string;
    notBefore: string;
    notAfter: string;
    serialNumber: string;
    isValid: boolean;
    daysUntilExpiry: number;
    isWildcard: boolean;
    ctLogUrl: string;
  }

  interface CTLogResponse {
    domain: string;
    certificates: ProcessedCertificate[];
    totalCertificates: number;
    discoveredHostnames: string[];
    issuers: Array<{ name: string; count: number }>;
    validCertificates: number;
    expiringSoon: number;
    wildcardCertificates: number;
    timestamp: string;
  }

  const examplesList = [
    { domain: 'as93.net', desc: 'Domain hosting multiple apps' },
    { domain: 'github.com', desc: 'Popular tech platform with modern certificate infrastructure' },
    { domain: 'google.com', desc: 'Shows historic DigiNotar breach certificate from 2011' },
    { domain: 'reddit.com', desc: 'Demonstrates subdomain discovery capabilities' },
    { domain: 'wikipedia.org', desc: 'Example of wildcard certificate usage' },
    { domain: 'twitter.com', desc: 'Shows certificate lifecycle and expiration tracking' },
  ];
  const examples = useExamples(examplesList);

  const statsConfig = [
    {
      icon: 'check-circle',
      label: 'Valid Certificates',
      key: 'validCertificates',
      valueClass: 'success',
      desc: 'Currently valid',
    },
    {
      icon: 'alert-triangle',
      label: 'Expiring Soon',
      key: 'expiringSoon',
      valueClass: 'warning',
      desc: 'Within 30 days',
    },
    {
      icon: 'asterisk',
      label: 'Wildcard Certs',
      key: 'wildcardCertificates',
      valueClass: '',
      desc: 'Covering subdomains',
    },
    {
      icon: 'globe',
      label: 'Discovered Hosts',
      key: 'discoveredHostnames',
      valueClass: '',
      desc: 'Unique hostnames',
      isArray: true,
    },
  ];

  const certDetailFields = [
    {
      icon: 'calendar',
      label: 'Valid Period',
      key: 'validPeriod',
      formatter: (cert: ProcessedCertificate) =>
        `${new Date(cert.notBefore).toLocaleDateString()} - ${new Date(cert.notAfter).toLocaleDateString()}`,
    },
    { icon: 'building', label: 'Issuer', key: 'issuer' },
    { icon: 'hash', label: 'Serial Number', key: 'serialNumber', mono: true },
    { icon: 'globe', label: 'SANs', key: 'sans', isSans: true },
    { icon: 'external-link', label: 'View Details', key: 'ctLogUrl', isLink: true },
  ];

  let domain = $state('');
  const diagnosticState = useDiagnosticState<CTLogResponse>();
  const clipboard = useClipboard();
  let expandedCert = $state<number | null>(null);

  async function loadExample(example: (typeof examplesList)[0], index: number) {
    domain = example.domain;
    examples.select(index);
    await searchCTLogs();
  }

  async function searchCTLogs() {
    if (!domain.trim()) {
      diagnosticState.setError('Please enter a domain name');
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/ct-log-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || 'Search failed');
      }

      diagnosticState.setResults(await response.json());
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }

  async function copyResults() {
    if (!diagnosticState.results) return;

    let text = `Certificate Transparency Log Search\nDomain: ${diagnosticState.results.domain}\nGenerated at: ${diagnosticState.results.timestamp}\n\n`;
    text += `Total Certificates: ${diagnosticState.results.totalCertificates}\n`;
    text += `Valid Certificates: ${diagnosticState.results.validCertificates}\n`;
    text += `Expiring Soon (30 days): ${diagnosticState.results.expiringSoon}\n`;
    text += `Wildcard Certificates: ${diagnosticState.results.wildcardCertificates}\n\n`;
    text += `Discovered Hostnames (${diagnosticState.results.discoveredHostnames.length}):\n`;
    diagnosticState.results.discoveredHostnames.forEach((h) => (text += `  - ${h}\n`));
    text += `\nTop Issuers:\n`;
    diagnosticState.results.issuers.forEach((i) => (text += `  - ${i.name}: ${i.count} certificates\n`));

    clipboard.copy(text);
  }

  function toggleCert(id: number) {
    expandedCert = expandedCert === id ? null : id;
  }

  function getCertBadges(cert: ProcessedCertificate) {
    const badges = [];
    if (cert.isValid) {
      badges.push({ text: 'Valid', class: 'success' });
      if (cert.daysUntilExpiry <= 30) {
        badges.push({ text: `Expires in ${cert.daysUntilExpiry}d`, class: 'warning' });
      }
    } else if (cert.daysUntilExpiry > 0) {
      badges.push({ text: 'Expired', class: 'warning' });
    } else {
      badges.push({ text: 'Not Yet Valid', class: 'muted' });
    }
    return badges;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{content.title}</h1>
    <p>{content.description}</p>
  </header>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Search CT Logs</h3>
    </div>
    <div class="card-content">
      <div class="lookup-form">
        <input
          type="text"
          bind:value={domain}
          placeholder="example.com"
          onkeydown={(e) => e.key === 'Enter' && searchCTLogs()}
          disabled={diagnosticState.loading}
        />
        <button class="lookup-btn" onclick={searchCTLogs} disabled={diagnosticState.loading}>
          <Icon
            name={diagnosticState.loading ? 'loader' : 'search'}
            size="sm"
            animate={diagnosticState.loading ? 'spin' : undefined}
          />
          {diagnosticState.loading ? 'Searching...' : 'Search CT Logs'}
        </button>
      </div>
    </div>
  </div>

  <!-- Quick Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    getLabel={(ex) => ex.domain}
    getDescription={(ex) => ex.desc}
  />

  <!-- Loading -->
  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Searching Certificate Transparency Logs</h3>
            <p>Querying CT logs for {domain}...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard title="CT Log Search Failed" error={diagnosticState.error} />

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>CT Log Results for {diagnosticState.results.domain}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- Statistics Overview -->
        <div class="status-overview">
          <div class="status-item info">
            <Icon name="file" size="md" />
            <div>
              <h4>{diagnosticState.results.totalCertificates} Total Certificates</h4>
              <p>Found in Certificate Transparency logs</p>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="results-grid">
          {#each statsConfig as stat (stat.key)}
            <div class="result-card">
              <h4>
                <Icon name={stat.icon} size="sm" />
                {stat.label}
              </h4>
              <div class="stat-value {stat.valueClass}">
                {stat.isArray
                  ? (diagnosticState.results[stat.key as keyof CTLogResponse] as any[]).length
                  : diagnosticState.results[stat.key as keyof CTLogResponse]}
              </div>
              <p class="stat-label">{stat.desc}</p>
            </div>
          {/each}
        </div>

        <!-- Discovered Hostnames -->
        {#if diagnosticState.results.discoveredHostnames.length > 0}
          <div class="subsection">
            <h4>
              <Icon name="list" size="sm" />
              Discovered Hostnames ({diagnosticState.results.discoveredHostnames.length})
            </h4>
            <div class="hostname-list">
              {#each diagnosticState.results.discoveredHostnames.slice(0, 50) as hostname (hostname)}
                <span class="hostname-tag {hostname.startsWith('*') ? 'wildcard' : ''}">
                  {#if hostname.startsWith('*')}
                    <Icon name="asterisk" size="xs" />
                  {/if}
                  {hostname}
                </span>
              {/each}
              {#if diagnosticState.results.discoveredHostnames.length > 50}
                <span class="hostname-tag muted">
                  +{diagnosticState.results.discoveredHostnames.length - 50} more
                </span>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Top Issuers -->
        {#if diagnosticState.results.issuers.length > 0}
          <div class="subsection">
            <h4>
              <Icon name="building" size="sm" />
              Certificate Issuers ({diagnosticState.results.issuers.length})
            </h4>
            <div class="issuer-list">
              {#each diagnosticState.results.issuers.slice(0, 10) as issuer (issuer.name)}
                <div class="issuer-item">
                  <span class="issuer-name">{issuer.name}</span>
                  <span class="issuer-count">{issuer.count}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Certificates List -->
        <div class="subsection">
          <h4>
            <Icon name="file" size="sm" />
            Certificates ({diagnosticState.results.certificates.length})
          </h4>
          <div class="cert-list">
            {#each diagnosticState.results.certificates.slice(0, 20) as cert (cert.id)}
              <div class="cert-item">
                <div
                  class="cert-header"
                  role="button"
                  tabindex="0"
                  onclick={() => toggleCert(cert.id)}
                  onkeydown={(e) => e.key === 'Enter' && toggleCert(cert.id)}
                >
                  <div class="cert-title">
                    {#if cert.isWildcard}
                      <Icon name="asterisk" size="xs" />
                    {/if}
                    <strong>{cert.commonName}</strong>
                    {#each getCertBadges(cert) as badge (badge.text)}
                      <span class="badge {badge.class}">{badge.text}</span>
                    {/each}
                  </div>
                  <Icon name={expandedCert === cert.id ? 'chevron-up' : 'chevron-down'} size="sm" />
                </div>

                {#if expandedCert === cert.id}
                  <div class="cert-details">
                    <div class="info-list">
                      {#each certDetailFields as field (field.key)}
                        <div class="info-item">
                          <Icon name={field.icon} size="sm" />
                          <div class="info-content">
                            <span class="info-label">{field.label}{field.isSans ? ` (${cert.sans.length})` : ''}</span>
                            {#if field.isSans}
                              <div class="sans-list">
                                {#each cert.sans.slice(0, 10) as san (san)}
                                  <span class="san-tag">{san}</span>
                                {/each}
                                {#if cert.sans.length > 10}
                                  <span class="san-tag muted">+{cert.sans.length - 10} more</span>
                                {/if}
                              </div>
                            {:else if field.isLink}
                              <a href={cert.ctLogUrl} target="_blank" rel="noopener noreferrer">
                                crt.sh #{cert.id}
                              </a>
                            {:else if field.formatter}
                              <span class="info-value {field.mono ? 'mono' : ''}">{field.formatter(cert)}</span>
                            {:else}
                              <span class="info-value {field.mono ? 'mono' : ''}"
                                >{cert[field.key as keyof ProcessedCertificate]}</span
                              >
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
            {#if diagnosticState.results.certificates.length > 20}
              <div class="cert-item muted-text">
                Showing first 20 of {diagnosticState.results.certificates.length} certificates
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Info Sections -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About Certificate Transparency</h3>
    </div>
    <div class="card-content">
      <!-- What is CT -->
      <details class="info-accordion">
        <summary class="accordion-summary">
          <Icon name="chevron-right" size="sm" />
          <h4>{content.sections.whatIsCT.title}</h4>
        </summary>
        <div class="accordion-content">
          <p>{content.sections.whatIsCT.content}</p>
        </div>
      </details>

      {#each [{ title: content.sections.benefits.title, items: content.sections.benefits.benefits, keys: ['benefit', 'description'] }, { title: content.sections.useCases.title, items: content.sections.useCases.cases, keys: ['useCase', 'description', 'example'] }, { title: content.sections.certificateFields.title, items: content.sections.certificateFields.fields, keys: ['field', 'description'] }, { title: content.sections.security.title, items: content.sections.security.points, keys: ['point', 'description'] }, { title: content.sections.bestPractices.title, items: content.sections.bestPractices.practices, keys: ['practice', 'description'] }] as section (section.title)}
        <details class="info-accordion">
          <summary class="accordion-summary">
            <Icon name="chevron-right" size="sm" />
            <h4>{section.title}</h4>
          </summary>
          <div class="accordion-content">
            <ul>
              {#each section.items as item ((item as any)[section.keys[0]])}
                <li>
                  <strong>{(item as any)[section.keys[0]]}:</strong>
                  {(item as any)[section.keys[1]]}
                  {#if section.keys[2] && (item as any)[section.keys[2]]}
                    <em class="example-text">({(item as any)[section.keys[2]]})</em>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        </details>
      {/each}

      <!-- Quick Tips -->
      <details class="info-accordion">
        <summary class="accordion-summary">
          <Icon name="chevron-right" size="sm" />
          <h4>Quick Tips</h4>
        </summary>
        <div class="accordion-content">
          <ul>
            {#each content.quickTips as tip (tip)}
              <li>{tip}</li>
            {/each}
          </ul>
        </div>
      </details>
    </div>
  </div>
</div>

<style lang="scss">
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    margin: var(--spacing-sm) 0;

    &.success {
      color: var(--color-success);
    }

    &.warning {
      color: var(--color-warning);
    }
  }

  .stat-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .subsection {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-primary);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }
  }

  .hostname-list,
  .sans-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .hostname-tag {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--border-primary);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.85rem;

    &.wildcard {
      background: color-mix(in srgb, var(--color-primary), transparent 90%);
      color: var(--color-primary);
      font-weight: 500;
    }

    &.muted {
      background: var(--color-surface);
      color: var(--color-text-muted);
      font-style: italic;
    }
  }

  .issuer-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .issuer-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--border-primary);
    border-radius: var(--radius-sm);
  }

  .issuer-name {
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .issuer-count {
    font-weight: 600;
    color: var(--color-primary);
    font-family: var(--font-mono);
  }

  .cert-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .cert-item {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    overflow: hidden;

    &.muted-text {
      text-align: center;
      padding: var(--spacing-md);
      color: var(--color-text-muted);
      font-style: italic;
      border: none;
    }
  }

  .cert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--border-primary);
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover {
      background: color-mix(in srgb, var(--border-primary), var(--bg-primary) 5%);
    }
  }

  .cert-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .badge {
    display: inline-block;
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;

    &.success {
      background: var(--color-success-bg);
      color: var(--color-success);
    }

    &.warning {
      background: var(--color-warning-bg);
      color: var(--color-warning);
    }

    &.muted {
      background: var(--color-surface);
      color: var(--color-text-muted);
    }
  }

  .cert-details {
    padding: var(--spacing-md);
    background: var(--color-bg);
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .info-item {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .info-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .info-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .info-value {
    color: var(--color-text);
    font-weight: 500;

    &.mono {
      font-family: var(--font-mono);
      font-size: 0.9rem;
    }
  }

  .san-tag {
    padding: 2px var(--spacing-xs);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.8rem;

    &.muted {
      font-style: italic;
      color: var(--color-text-muted);
    }
  }

  .example-text {
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .results-grid {
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: var(--spacing-md);
    .result-card {
      background: var(--border-primary);
      padding: var(--spacing-md);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      align-items: center;

      h4 {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
      }
    }
  }

  .lookup-form {
    display: flex;
    gap: var(--spacing-md);
    align-items: stretch;

    input {
      flex: 1;
      min-width: 0;
    }

    @media (max-width: 640px) {
      flex-direction: column;
    }
  }

  .card-content {
    ul {
      list-style-type: disc;
      padding-left: var(--spacing-lg);
      margin-top: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }

    a {
      color: var(--color-primary);
      text-decoration: none;
      font-family: var(--font-mono);

      &:hover {
        text-decoration: underline;
      }
    }

    .status-item {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
    }
  }

  .info-accordion {
    border: none;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
    overflow: hidden;
    transition: all var(--transition-fast);

    &:hover {
      background: color-mix(in srgb, var(--bg-secondary), var(--bg-primary) 30%);
    }

    &[open] {
      .accordion-summary {
        border-bottom: 1px solid var(--border-primary);

        :global(svg) {
          transform: rotate(90deg);
        }
      }

      .accordion-content {
        animation: accordionOpen 0.2s ease-out;
      }
    }
  }

  .accordion-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);

    &::-webkit-details-marker {
      display: none;
    }

    :global(svg) {
      transition: transform var(--transition-fast);
      color: var(--color-primary);
      flex-shrink: 0;
    }

    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    &:hover {
      :global(svg) {
        color: var(--color-primary-hover);
      }
    }
  }

  .accordion-content {
    padding: var(--spacing-md);
    padding-top: var(--spacing-sm);
    animation: accordionOpen 0.2s ease-out;

    p {
      margin: 0;
      line-height: 1.6;
      color: var(--text-secondary);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);

      li {
        margin-bottom: var(--spacing-sm);
        line-height: 1.6;
        color: var(--text-secondary);

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  @keyframes accordionOpen {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .info-card {
    margin-top: var(--spacing-lg);
  }
</style>
