<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { isValidDomainName, formatDNSError } from '$lib/utils/dns-validation.js';
  import { t } from '$lib/i18n';
  import '../../../../../styles/diagnostics-pages.scss';

  let domainName = $state('github.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  // Reactive validation state
  const isInputValid = $derived(() => {
    const domain = domainName.trim();
    return domain.length > 0 && isValidDomainName(domain);
  });

  const examples = [
    {
      domain: t('diagnostics/dns-caa-effective.examples.items.github.domain'),
      description: t('diagnostics/dns-caa-effective.examples.items.github.description'),
    },
    {
      domain: t('diagnostics/dns-caa-effective.examples.items.google.domain'),
      description: t('diagnostics/dns-caa-effective.examples.items.google.description'),
    },
    {
      domain: t('diagnostics/dns-caa-effective.examples.items.stripe.domain'),
      description: t('diagnostics/dns-caa-effective.examples.items.stripe.description'),
    },
    {
      domain: t('diagnostics/dns-caa-effective.examples.items.cloudflare.domain'),
      description: t('diagnostics/dns-caa-effective.examples.items.cloudflare.description'),
    },
    {
      domain: t('diagnostics/dns-caa-effective.examples.items.microsoft.domain'),
      description: t('diagnostics/dns-caa-effective.examples.items.microsoft.description'),
    },
    {
      domain: t('diagnostics/dns-caa-effective.examples.items.amazon.domain'),
      description: t('diagnostics/dns-caa-effective.examples.items.amazon.description'),
    },
  ];

  async function checkCAA() {
    loading = true;
    error = null;
    results = null;

    // Client-side validation
    const domain = domainName.trim();
    if (!domain) {
      error = t('diagnostics/dns-caa-effective.errors.domainRequired');
      loading = false;
      return;
    }

    if (!isValidDomainName(domain)) {
      error = t('diagnostics/dns-caa-effective.errors.invalidFormat');
      loading = false;
      return;
    }

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'caa-effective',
          name: domain,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = t('diagnostics/dns-caa-effective.errors.checkFailed', { status: response.status });

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If not JSON, use status-based message
          if (response.status === 400) {
            errorMessage = t('diagnostics/dns-caa-effective.errors.invalidRequest');
          } else if (response.status === 500) {
            errorMessage = t('diagnostics/dns-caa-effective.errors.serviceUnavailable');
          }
        }

        throw new Error(errorMessage);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = formatDNSError(err);
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domainName = example.domain;
    selectedExampleIndex = index;
    checkCAA();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function parseCAA(record: string): { flag: number; tag: string; value: string } | null {
    // CAA format: flag tag "value"
    const match = record.match(/^(\d+)\s+(\w+)\s+["]?([^"]+)["]?$/);
    if (match) {
      return {
        flag: parseInt(match[1]),
        tag: match[2],
        value: match[3],
      };
    }
    return null;
  }

  function getTagColor(tag: string): string {
    switch (tag) {
      case 'issue':
        return 'primary';
      case 'issuewild':
        return 'warning';
      case 'iodef':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  function getTagIcon(tag: string): string {
    switch (tag) {
      case 'issue':
        return 'shield-check';
      case 'issuewild':
        return 'shield-alert';
      case 'iodef':
        return 'mail';
      default:
        return 'help-circle';
    }
  }

  function getTagDescription(tag: string): string {
    switch (tag) {
      case 'issue':
        return t('diagnostics/dns-caa-effective.tags.issue');
      case 'issuewild':
        return t('diagnostics/dns-caa-effective.tags.issuewild');
      case 'iodef':
        return t('diagnostics/dns-caa-effective.tags.iodef');
      default:
        return t('diagnostics/dns-caa-effective.tags.unknown');
    }
  }

  async function copyResults() {
    if (!results) return;

    let text = `${t('diagnostics/dns-caa-effective.copyResults.header', { domain: domainName })}\n`;
    text += `${t('diagnostics/dns-caa-effective.copyResults.generatedAt')}: ${new Date().toISOString()}\n\n`;

    if (results.effective) {
      text += `${t('diagnostics/dns-caa-effective.copyResults.effectivePolicy')}:\n`;
      text += `${t('diagnostics/dns-caa-effective.copyResults.domain')}: ${results.effective.domain}\n`;
      text += `${t('diagnostics/dns-caa-effective.copyResults.records')}:\n`;
      results.effective.records.forEach((record: string) => {
        text += `  ${record}\n`;
      });
      text += '\n';
    } else {
      text += `${t('diagnostics/dns-caa-effective.copyResults.noRecords')}\n\n`;
    }

    if (results.chain?.length > 0) {
      text += `${t('diagnostics/dns-caa-effective.copyResults.chain', { domain: domainName })}:\n`;
      results.chain.forEach((item: unknown, index: number) => {
        text += `${index + 1}. ${(item as any).domain}:\n`;
        (item as any).records.forEach((record: string) => {
          text += `   ${record}\n`;
        });
      });
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }

  function getDomainDepth(domain: string, baseDomain: string): number {
    const domainParts = domain.split('.');
    const baseParts = baseDomain.split('.');
    return domainParts.length - baseParts.length;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{t('diagnostics/dns-caa-effective.title')}</h1>
    <p>
      {t('diagnostics/dns-caa-effective.subtitle')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{t('diagnostics/dns-caa-effective.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={t('diagnostics/dns-caa-effective.ui.checkTooltip', { domain: example.domain })}
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
      <h3>{t('diagnostics/dns-caa-effective.ui.checkTitle')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={t('diagnostics/dns-caa-effective.ui.domainTooltip')}>
          {t('diagnostics/dns-caa-effective.ui.domainLabel')}
          <input
            id="domain"
            type="text"
            bind:value={domainName}
            placeholder="example.com"
            class:invalid={domainName && !isValidDomainName(domainName.trim())}
            onchange={() => {
              clearExampleSelection();
              if (isInputValid()) checkCAA();
            }}
          />
          {#if domainName && !isValidDomainName(domainName.trim())}
            <span class="error-text">{t('diagnostics/dns-caa-effective.ui.invalidFormat')}</span>
          {/if}
        </label>
      </div>

      <div class="action-section">
        <button class="check-btn lookup-btn" onclick={checkCAA} disabled={loading || !isInputValid}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            {t('diagnostics/dns-caa-effective.ui.checking')}
          {:else}
            <Icon name="shield-check" size="sm" />
            {t('diagnostics/dns-caa-effective.ui.checkButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{t('diagnostics/dns-caa-effective.results.title')}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState
            ? t('diagnostics/dns-caa-effective.results.copied')
            : t('diagnostics/dns-caa-effective.results.copyButton')}
        </button>
      </div>
      <div class="card-content">
        <!-- Effective Policy -->
        <div class="effective-section">
          <h4>{t('diagnostics/dns-caa-effective.results.effectivePolicy')}</h4>
          {#if results.effective}
            <div class="effective-policy">
              <div class="effective-header">
                <span class="text-success"><Icon name="shield-check" size="md" /></span>
                <div>
                  <h5>
                    {t('diagnostics/dns-caa-effective.results.policyFoundAt')}:
                    <span class="domain-name">{results.effective.domain}</span>
                  </h5>
                  <p>{t('diagnostics/dns-caa-effective.results.policyDescription')}</p>
                </div>
              </div>

              <div class="caa-records">
                {#each results.effective.records as record, index (index)}
                  {@const parsed = parseCAA(record)}
                  {#if parsed}
                    <div class="caa-record {getTagColor(parsed.tag)}">
                      <div class="caa-header">
                        <Icon name={getTagIcon(parsed.tag)} size="sm" />
                        <div class="caa-info">
                          <span class="caa-tag">{parsed.tag}</span>
                          <span class="caa-description">{getTagDescription(parsed.tag)}</span>
                        </div>
                        <span
                          class="caa-flag"
                          use:tooltip={parsed.flag === 128
                            ? t('diagnostics/dns-caa-effective.results.criticalFlag')
                            : t('diagnostics/dns-caa-effective.results.standardFlag')}
                        >
                          {t('diagnostics/dns-caa-effective.results.flag')}: {parsed.flag}
                        </span>
                      </div>
                      <div class="caa-value">
                        <code>{parsed.value}</code>
                      </div>
                    </div>
                  {:else}
                    <div class="caa-record secondary">
                      <div class="caa-raw">
                        <code>{record}</code>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {:else}
            <div class="no-policy">
              <span class="text-warning"><Icon name="shield-off" size="md" /></span>
              <div>
                <h5>{t('diagnostics/dns-caa-effective.results.noPolicyFound')}</h5>
                <p>{t('diagnostics/dns-caa-effective.results.noRecordsFound', { domain: domainName })}</p>
                <p class="implication">{t('diagnostics/dns-caa-effective.results.implication')}</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Single Level Info -->
        {#if results.chain?.length === 1 && results.effective}
          <div class="chain-section">
            <div class="single-level-info">
              <Icon name="info" size="sm" />
              <div>
                <h5>{t('diagnostics/dns-caa-effective.results.topLevelPolicy')}</h5>
                <p>
                  {t('diagnostics/dns-caa-effective.results.topLevelDescription', { domain: results.effective.domain })}
                </p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Domain Chain -->
        {#if results.chain?.length > 1}
          <div class="chain-section">
            <h4>{t('diagnostics/dns-caa-effective.results.chainTitle')}</h4>
            <p class="chain-description">
              {t('diagnostics/dns-caa-effective.results.chainDescription')}
            </p>

            <div class="domain-chain">
              {#each results.chain as item, index (index)}
                {@const isEffective = item.domain === results.effective?.domain}
                <div class="chain-item {isEffective ? 'effective' : 'empty'}">
                  <div class="chain-connector">
                    {#if index > 0}
                      <div class="connector-line"></div>
                      <Icon name="arrow-up" size="xs" />
                    {/if}
                  </div>

                  <div class="chain-content">
                    <div class="chain-header">
                      <div class="domain-info">
                        <span class="domain-name">{item.domain}</span>
                        <span class="domain-depth">
                          {t('diagnostics/dns-caa-effective.results.levelUp', {
                            count: getDomainDepth(item.domain, results.chain[results.chain.length - 1].domain),
                          })}
                        </span>
                      </div>
                      {#if isEffective}
                        <span class="effective-badge">
                          <Icon name="shield-check" size="xs" />
                          {t('diagnostics/dns-caa-effective.results.effective')}
                        </span>
                      {:else}
                        <span class="empty-badge">
                          <Icon name="minus" size="xs" />
                          {t('diagnostics/dns-caa-effective.results.noCAA')}
                        </span>
                      {/if}
                    </div>

                    {#if item.records?.length > 0}
                      <div class="chain-records">
                        {#each item.records as record, index (index)}
                          <div class="chain-record">
                            <code>{record}</code>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
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
            <strong>{t('diagnostics/dns-caa-effective.error.title')}</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{t('diagnostics/dns-caa-effective.education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{t('diagnostics/dns-caa-effective.education.format.title')}</h4>
          <div class="format-example">
            <code>flag tag "value"</code>
          </div>
          <ul>
            <li>
              <strong>{t('diagnostics/dns-caa-effective.education.format.flag.label')}:</strong>
              {t('diagnostics/dns-caa-effective.education.format.flag.description')}
            </li>
            <li>
              <strong>{t('diagnostics/dns-caa-effective.education.format.tag.label')}:</strong>
              {t('diagnostics/dns-caa-effective.education.format.tag.description')}
            </li>
            <li>
              <strong>{t('diagnostics/dns-caa-effective.education.format.value.label')}:</strong>
              {t('diagnostics/dns-caa-effective.education.format.value.description')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{t('diagnostics/dns-caa-effective.education.tags.title')}</h4>
          <div class="tag-explanations">
            <div class="tag-explanation">
              <strong>issue:</strong>
              {t('diagnostics/dns-caa-effective.education.tags.issue')}
            </div>
            <div class="tag-explanation">
              <strong>issuewild:</strong>
              {t('diagnostics/dns-caa-effective.education.tags.issuewild')}
            </div>
            <div class="tag-explanation">
              <strong>iodef:</strong>
              {t('diagnostics/dns-caa-effective.education.tags.iodef')}
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>{t('diagnostics/dns-caa-effective.education.process.title')}</h4>
          <ol>
            <li>{t('diagnostics/dns-caa-effective.education.process.step1')}</li>
            <li>{t('diagnostics/dns-caa-effective.education.process.step2')}</li>
            <li>{t('diagnostics/dns-caa-effective.education.process.step3')}</li>
            <li>{t('diagnostics/dns-caa-effective.education.process.step4')}</li>
          </ol>
        </div>

        <div class="info-section">
          <h4>{t('diagnostics/dns-caa-effective.education.examples.title')}</h4>
          <div class="caa-examples">
            <div class="caa-example">
              <code>0 issue "letsencrypt.org"</code>
              <span>{t('diagnostics/dns-caa-effective.education.examples.letsencrypt')}</span>
            </div>
            <div class="caa-example">
              <code>0 issuewild ";"</code>
              <span>{t('diagnostics/dns-caa-effective.education.examples.prohibit')}</span>
            </div>
            <div class="caa-example">
              <code>0 iodef "mailto:security@example.com"</code>
              <span>{t('diagnostics/dns-caa-effective.education.examples.report')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  // Page-specific styles - shared styles removed
  // Use shared .lookup-btn instead of .check-btn

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  .effective-section,
  .chain-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .effective-policy {
    background: var(--bg-secondary);
    border: 2px solid var(--color-success);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .effective-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    h5 {
      margin: 0;
      color: var(--text-primary);

      .domain-name {
        font-family: var(--font-mono);
        color: var(--color-success);
      }
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .caa-records {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .caa-record {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-left: 4px solid;

    &.primary {
      border-left-color: var(--color-primary);
    }

    &.warning {
      border-left-color: var(--color-warning);
    }

    &.secondary {
      border-left-color: var(--text-secondary);
    }
  }

  .caa-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .caa-info {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .caa-tag {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .caa-description {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .caa-flag {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .caa-value {
    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }
  }

  .no-policy {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: var(--bg-warning);
    border: 2px solid var(--color-warning);
    border-radius: var(--radius-md);

    h5 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    p {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-secondary);
    }

    .implication {
      font-weight: 500;
      color: var(--color-warning) !important;
    }
  }

  .single-level-info {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);

    h5 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
    }
  }

  .chain-description {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-sm);
  }

  .domain-chain {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .chain-item {
    display: flex;
    gap: var(--spacing-md);

    &.effective {
      .chain-content {
        border-color: var(--color-success);
        background: var(--bg-success);
      }
    }

    &.empty {
      .chain-content {
        border-color: var(--border-color);
        background: var(--bg-secondary);
        opacity: 0.7;
      }
    }
  }

  .chain-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 24px;
    padding-top: var(--spacing-sm);

    .connector-line {
      width: 2px;
      height: var(--spacing-md);
      background: var(--border-color);
      margin-bottom: var(--spacing-xs);
    }
  }

  .chain-content {
    flex: 1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .chain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .domain-info {
    display: flex;
    flex-direction: column;
  }

  .domain-name {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-weight: 600;
  }

  .domain-depth {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .effective-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-success);
    color: var(--bg-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .empty-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--text-secondary);
    color: var(--bg-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .chain-records {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .chain-record {
    padding: var(--spacing-xs);
    background: var(--bg-primary);
    border-radius: var(--radius-sm);

    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-size: var(--font-size-xs);
    }
  }

  // Educational content specific to CAA
  .info-card {
    background: var(--bg-tertiary);
  }

  .format-example {
    background: var(--bg-secondary);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-sm);

    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
    }
  }

  .tag-explanations,
  .caa-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .tag-explanation,
  .caa-example {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    code {
      background: var(--bg-secondary);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: var(--font-mono);
      color: var(--text-primary);
      margin-right: var(--spacing-xs);
    }
  }

  .text-success {
    color: var(--color-success);
  }

  .text-warning {
    color: var(--color-warning);
  }
</style>
