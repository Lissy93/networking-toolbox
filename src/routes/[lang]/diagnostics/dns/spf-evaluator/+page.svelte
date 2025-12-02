<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { locale, loadTranslations, t } from '$lib/stores/language.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics/dns-spf-evaluator');
  });

  let domain = $state('google.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = $derived([
    { domain: 'google.com', description: $t('examples.0.description') },
    { domain: 'github.com', description: $t('examples.1.description') },
    { domain: 'mailchimp.com', description: $t('examples.2.description') },
    { domain: 'salesforce.com', description: $t('examples.3.description') },
    { domain: 'microsoft.com', description: $t('examples.4.description') },
    { domain: 'atlassian.com', description: $t('examples.5.description') },
  ]);

  async function evaluateSPF() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'spf-evaluator',
          domain: domain.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`SPF evaluation failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : $t('form.errors.unknownError');
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    evaluateSPF();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function getMechanismType(mechanism: string): { type: string; color: string; icon: string } {
    if (mechanism.startsWith('v=spf1'))
      return { type: $t('results.mechanisms.types.version'), color: 'primary', icon: 'shield' };
    if (mechanism.startsWith('+all') || mechanism === 'all')
      return { type: $t('results.mechanisms.types.passAll'), color: 'error', icon: 'shield-off' };
    if (mechanism.startsWith('-all'))
      return { type: $t('results.mechanisms.types.failAll'), color: 'success', icon: 'shield-check' };
    if (mechanism.startsWith('~all'))
      return { type: $t('results.mechanisms.types.softFailAll'), color: 'warning', icon: 'shield-alert' };
    if (mechanism.startsWith('?all'))
      return { type: $t('results.mechanisms.types.neutralAll'), color: 'secondary', icon: 'shield-question' };
    if (mechanism.startsWith('ip4:'))
      return { type: $t('results.mechanisms.types.ipv4'), color: 'primary', icon: 'globe' };
    if (mechanism.startsWith('ip6:'))
      return { type: $t('results.mechanisms.types.ipv6'), color: 'primary', icon: 'globe' };
    if (mechanism.startsWith('a:') || mechanism === 'a')
      return { type: $t('results.mechanisms.types.aRecord'), color: 'secondary', icon: 'dns' };
    if (mechanism.startsWith('mx:') || mechanism === 'mx')
      return { type: $t('results.mechanisms.types.mxRecord'), color: 'secondary', icon: 'mail' };
    if (mechanism.startsWith('exists:'))
      return { type: $t('results.mechanisms.types.existsCheck'), color: 'warning', icon: 'search' };
    if (mechanism.startsWith('ptr:') || mechanism === 'ptr')
      return { type: $t('results.mechanisms.types.ptrRecord'), color: 'secondary', icon: 'arrow-left' };
    return { type: $t('results.mechanisms.types.other'), color: 'secondary', icon: 'help-circle' };
  }

  function renderIncludeTree(includes: unknown[], level = 0): any[] {
    const items: unknown[] = [];

    includes.forEach((include) => {
      items.push({
        type: 'include',
        domain: (include as any).domain,
        level,
        result: (include as any).result,
      });

      if ((include as any).result?.expanded?.includes) {
        items.push(...renderIncludeTree((include as any).result.expanded.includes, level + 1));
      }

      if ((include as any).result?.expanded?.redirects) {
        const includeData = include as {
          result: { expanded: { redirects: Array<{ domain: string; result: unknown }> } };
        };
        includeData.result.expanded.redirects.forEach((redirect) => {
          items.push({
            type: 'redirect',
            domain: redirect.domain,
            level: level + 1,
            result: redirect.result,
          });
        });
      }
    });

    return items;
  }

  function getLookupStatus(): { status: string; color: string; message: string } {
    if (!results) return { status: 'unknown', color: 'secondary', message: $t('results.status.noEvaluation') };
    if (results.error) return { status: 'error', color: 'error', message: results.error };

    const count = results.lookupCount || 0;
    if (count > 10)
      return { status: 'exceeded', color: 'error', message: $t('results.status.limitExceeded', { count }) };
    if (count > 8) return { status: 'warning', color: 'warning', message: $t('results.status.highCount', { count }) };
    return { status: 'ok', color: 'success', message: $t('results.status.lookupsUsed', { count }) };
  }

  async function copyResults() {
    if (!results) return;

    let text = $t('copyTemplate.header', { domain }) + '\n';
    text += $t('copyTemplate.generated', { timestamp: new Date().toISOString() }) + '\n\n';

    if (results.record) {
      text += $t('copyTemplate.originalRecord', { record: results.record }) + '\n\n';
    }

    const expandedData = (results as { expanded?: { mechanisms?: string[]; includes?: unknown[] } }).expanded;
    if (expandedData?.mechanisms) {
      text += $t('copyTemplate.mechanismsHeader') + '\n';
      expandedData.mechanisms.forEach((mech: string) => {
        text += $t('copyTemplate.mechanismItem', { mechanism: mech }) + '\n';
      });
      text += '\n';
    }

    if (expandedData?.includes) {
      text += $t('copyTemplate.includesHeader') + '\n';
      const includeTree = renderIncludeTree(expandedData.includes);
      includeTree.forEach((item) => {
        const indent = '  '.repeat(item.level + 1);
        text += $t('copyTemplate.includeItem', { indent, type: item.type, domain: item.domain });
        if (item.result?.error) {
          text += $t('copyTemplate.includeError', { error: item.result.error });
        }
        text += '\n';
      });
    }

    const status = getLookupStatus();
    text += $t('copyTemplate.statusHeader', { message: status.message });

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('title')}</h1>
    <p>
      {$t('description')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('examplesSection.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={$t('examplesSection.tooltip', { domain: example.domain, description: example.description })}
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
      <h3>{$t('form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={$t('form.domain.tooltip')}>
          {$t('form.domain.label')}
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder={$t('form.domain.placeholder')}
            onchange={() => {
              clearExampleSelection();
              if (domain) evaluateSPF();
            }}
          />
        </label>
      </div>

      <div class="action-section">
        <button class="evaluate-btn lookup-btn" onclick={evaluateSPF} disabled={loading || !domain.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('form.evaluating')}
          {:else}
            <Icon name="shield-check" size="sm" />
            {$t('form.evaluate')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results && !results.error}
    {@const status = getLookupStatus()}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('results.title')}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? $t('results.copied') : $t('results.copy')}
        </button>
      </div>
      <div class="card-content">
        <!-- Status -->
        <div class="status-section">
          <div class="status-item card {status.color}">
            <Icon
              name={status.status === 'ok'
                ? 'check-circle'
                : status.status === 'warning'
                  ? 'alert-triangle'
                  : 'x-circle'}
              size="sm"
            />
            <span>{status.message}</span>
          </div>
        </div>

        <!-- Original Record -->
        {#if results.record}
          <div class="record-section">
            <h4>{$t('results.record.title')}</h4>
            <div class="record-display">
              <code>{results.record}</code>
            </div>
          </div>
        {/if}

        <!-- Mechanisms -->
        {#if (results as { expanded?: { mechanisms?: string[] } }).expanded?.mechanisms?.length}
          {@const resultsExpanded = (results as { expanded?: { mechanisms?: string[] } }).expanded}
          <div class="mechanisms-section">
            <h4>{$t('results.mechanisms.title')}</h4>
            <div class="mechanisms-grid">
              {#each resultsExpanded!.mechanisms! as mechanism, mechanismIndex (mechanismIndex)}
                {@const mechInfo = getMechanismType(mechanism as string)}
                <div class="mechanism-item {mechInfo.color}">
                  <Icon name={mechInfo.icon} size="xs" />
                  <div class="mechanism-content">
                    <span class="mechanism-value">{mechanism}</span>
                    <span class="mechanism-type">{mechInfo.type}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Include Tree -->
        {#if results.expanded?.includes?.length > 0}
          {@const includesData = (results as { expanded: { includes: unknown[] } }).expanded.includes}
          <div class="includes-section">
            <h4>{$t('results.includes.title')}</h4>
            <div class="include-tree">
              {#each renderIncludeTree(includesData) as item, itemIndex (itemIndex)}
                <div class="include-item level-{item.level}">
                  <div class="include-header">
                    <Icon name={item.type === 'include' ? 'arrow-right' : 'corner-down-right'} size="xs" />
                    <span class="include-type">{$t(`results.includes.types.${item.type}`)}:</span>
                    <span class="include-domain">{item.domain}</span>
                    {#if item.result?.error}
                      <span class="text-error"><Icon name="alert-triangle" size="xs" /></span>
                    {:else}
                      <span class="text-success"><Icon name="check-circle" size="xs" /></span>
                    {/if}
                  </div>

                  {#if item.result?.error}
                    <div class="include-error">
                      <Icon name="alert-triangle" size="xs" />
                      <span>{item.result.error}</span>
                    </div>
                  {:else if item.result?.record}
                    <div class="include-record">
                      <code>{item.result.record}</code>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Redirects -->
        {#if results.expanded?.redirects?.length > 0}
          {@const redirectsData = (
            results as {
              expanded: { redirects: Array<{ domain: string; result?: { error?: string; record?: string } }> };
            }
          ).expanded.redirects}
          <div class="redirects-section">
            <h4>{$t('results.redirects.title')}</h4>
            <div class="redirects-list">
              {#each redirectsData as redirect, redirectIndex (redirectIndex)}
                <div class="redirect-item">
                  <div class="redirect-header">
                    <Icon name="external-link" size="xs" />
                    <span>{$t('results.includes.redirectTo', { domain: redirect.domain })}</span>
                    {#if redirect.result?.error}
                      <span class="text-error"><Icon name="alert-triangle" size="xs" /></span>
                    {:else}
                      <span class="text-success"><Icon name="check-circle" size="xs" /></span>
                    {/if}
                  </div>

                  {#if redirect.result?.error}
                    <div class="redirect-error">
                      <span>{redirect.result.error}</span>
                    </div>
                  {:else if redirect.result?.record}
                    <div class="redirect-record">
                      <code>{redirect.result.record}</code>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if error || results?.error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>{$t('error.title')}</strong>
            <p>{error || results.error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('education.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('education.mechanisms.title')}</h4>
          <div class="mechanism-types">
            <div class="mechanism-doc">
              <strong>all:</strong>
              {$t('education.mechanisms.all')}
            </div>
            <div class="mechanism-doc">
              <strong>ip4/ip6:</strong>
              {$t('education.mechanisms.ipAddresses')}
            </div>
            <div class="mechanism-doc">
              <strong>a/mx:</strong>
              {$t('education.mechanisms.records')}
            </div>
            <div class="mechanism-doc">
              <strong>include:</strong>
              {$t('education.mechanisms.include')}
            </div>
            <div class="mechanism-doc">
              <strong>redirect:</strong>
              {$t('education.mechanisms.redirect')}
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>{$t('education.qualifiers.title')}</h4>
          <div class="qualifier-types">
            <div class="qualifier-doc">
              <strong>+</strong>
              {$t('education.qualifiers.pass')}
            </div>
            <div class="qualifier-doc">
              <strong>-</strong>
              {$t('education.qualifiers.fail')}
            </div>
            <div class="qualifier-doc">
              <strong>~</strong>
              {$t('education.qualifiers.softFail')}
            </div>
            <div class="qualifier-doc">
              <strong>?</strong>
              {$t('education.qualifiers.neutral')}
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>{$t('education.dnsLimits.title')}</h4>
          <p>{$t('education.dnsLimits.description')}</p>
          <ul>
            <li>{$t('education.dnsLimits.includeMechanisms', { mechanism: 'include' })}</li>
            <li>{$t('education.dnsLimits.recordMechanisms', { mechanisms: 'a, mx, exists, ptr' })}</li>
            <li>{$t('education.dnsLimits.redirectLookups', { modifier: 'redirect' })}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('education.bestPractices.title')}</h4>
          <ul>
            <li>{$t('education.bestPractices.keepUnderLimit')}</li>
            <li>{$t('education.bestPractices.endWithAll', { failAll: '-all', softFailAll: '~all' })}</li>
            <li>{$t('education.bestPractices.useIpAddresses')}</li>
            <li>{$t('education.bestPractices.avoidNesting')}</li>
            <li>{$t('education.bestPractices.regularAudit')}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .record-display code {
    background: var(--bg-primary);
    padding: var(--spacing-sm);
    display: block;
  }

  .form-group {
    label {
      flex-direction: column;
    }
  }

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  // SPF-specific mechanism styles
  .mechanisms-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .mechanisms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-sm);
  }

  .mechanism-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    border-left: 3px solid;

    &.primary {
      border-color: var(--color-primary);
    }

    &.success {
      border-color: var(--color-success);
    }

    &.warning {
      border-color: var(--color-warning);
    }

    &.error {
      border-color: var(--color-error);
    }

    &.secondary {
      border-color: var(--text-secondary);
    }
  }

  .mechanism-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .mechanism-value {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .mechanism-type {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .includes-section,
  .redirects-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .include-tree {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .include-item {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);

    &.level-0 {
      margin-left: 0;
    }

    &.level-1 {
      margin-left: var(--spacing-lg);
    }

    &.level-2 {
      margin-left: calc(var(--spacing-lg) * 2);
    }
  }

  .include-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
  }

  .include-type {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .include-domain {
    font-family: var(--font-mono);
    color: var(--text-primary);
    flex: 1;
  }

  .include-record,
  .redirect-record {
    padding: var(--spacing-sm) var(--spacing-md);

    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-size: var(--font-size-xs);
      word-break: break-all;
    }
  }

  .include-error,
  .redirect-error {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    color: var(--text-error);
    font-size: var(--font-size-xs);
  }

  .redirects-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .redirect-item {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }

  .redirect-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
    font-family: var(--font-mono);
    color: var(--text-primary);
  }

  .mechanism-types,
  .qualifier-types {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .mechanism-doc,
  .qualifier-doc {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
      font-family: var(--font-mono);
    }
  }

  // Shared utilities moved to diagnostics-pages.scss
</style>
