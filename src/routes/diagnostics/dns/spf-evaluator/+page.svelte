<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let domain = $state('google.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { domain: 'google.com', description: 'Google SPF with multiple includes' },
    { domain: 'github.com', description: 'GitHub SPF record structure' },
    { domain: 'mailchimp.com', description: 'MailChimp complex SPF policy' },
    { domain: 'salesforce.com', description: 'Salesforce enterprise SPF' },
    { domain: 'microsoft.com', description: 'Microsoft Office 365 SPF' },
    { domain: 'atlassian.com', description: 'Atlassian SPF configuration' },
  ];

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
      error = err instanceof Error ? err.message : 'Unknown error occurred';
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
    if (mechanism.startsWith('v=spf1')) return { type: 'version', color: 'primary', icon: 'shield' };
    if (mechanism.startsWith('+all') || mechanism === 'all')
      return { type: 'pass all', color: 'error', icon: 'shield-off' };
    if (mechanism.startsWith('-all')) return { type: 'fail all', color: 'success', icon: 'shield-check' };
    if (mechanism.startsWith('~all')) return { type: 'soft fail all', color: 'warning', icon: 'shield-alert' };
    if (mechanism.startsWith('?all')) return { type: 'neutral all', color: 'secondary', icon: 'shield-question' };
    if (mechanism.startsWith('ip4:')) return { type: 'IPv4', color: 'primary', icon: 'globe' };
    if (mechanism.startsWith('ip6:')) return { type: 'IPv6', color: 'primary', icon: 'globe' };
    if (mechanism.startsWith('a:') || mechanism === 'a') return { type: 'A record', color: 'secondary', icon: 'dns' };
    if (mechanism.startsWith('mx:') || mechanism === 'mx')
      return { type: 'MX record', color: 'secondary', icon: 'mail' };
    if (mechanism.startsWith('exists:')) return { type: 'exists check', color: 'warning', icon: 'search' };
    if (mechanism.startsWith('ptr:') || mechanism === 'ptr')
      return { type: 'PTR record', color: 'secondary', icon: 'arrow-left' };
    return { type: 'other', color: 'secondary', icon: 'help-circle' };
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
    if (!results) return { status: 'unknown', color: 'secondary', message: 'No evaluation performed' };
    if (results.error) return { status: 'error', color: 'error', message: results.error };

    const count = results.lookupCount || 0;
    if (count > 10) return { status: 'exceeded', color: 'error', message: `DNS lookup limit exceeded (${count}/10)` };
    if (count > 8) return { status: 'warning', color: 'warning', message: `High DNS lookup count (${count}/10)` };
    return { status: 'ok', color: 'success', message: `DNS lookups used: ${count}/10` };
  }

  async function copyResults() {
    if (!results) return;

    let text = `SPF Evaluation for ${domain}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    if (results.record) {
      text += `Original SPF Record:\n${results.record}\n\n`;
    }

    const expandedData = (results as { expanded?: { mechanisms?: string[]; includes?: unknown[] } }).expanded;
    if (expandedData?.mechanisms) {
      text += `Mechanisms:\n`;
      expandedData.mechanisms.forEach((mech: string) => {
        text += `  ${mech}\n`;
      });
      text += '\n';
    }

    if (expandedData?.includes) {
      text += `Includes:\n`;
      const includeTree = renderIncludeTree(expandedData.includes);
      includeTree.forEach((item) => {
        const indent = '  '.repeat(item.level + 1);
        text += `${indent}${item.type}: ${item.domain}`;
        if (item.result?.error) {
          text += ` (Error: ${item.result.error})`;
        }
        text += '\n';
      });
    }

    const status = getLookupStatus();
    text += `\nStatus: ${status.message}`;

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>SPF Record Evaluator</h1>
    <p>
      Analyze SPF (Sender Policy Framework) records with recursive expansion of includes and redirects. Check DNS lookup
      limits and identify potential policy issues.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>SPF Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Evaluate SPF record for ${example.domain} (${example.description})`}
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
      <h3>SPF Evaluation</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={'Enter the domain to evaluate SPF records for'}>
          Domain Name
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder="example.com"
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
            Evaluating SPF...
          {:else}
            <Icon name="shield-check" size="sm" />
            Evaluate SPF Record
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
        <h3>SPF Evaluation Results</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? 'Copied!' : 'Copy Results'}
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
            <h4>Original SPF Record</h4>
            <div class="record-display">
              <code>{results.record}</code>
            </div>
          </div>
        {/if}

        <!-- Mechanisms -->
        {#if (results as { expanded?: { mechanisms?: string[] } }).expanded?.mechanisms?.length}
          {@const resultsExpanded = (results as { expanded?: { mechanisms?: string[] } }).expanded}
          <div class="mechanisms-section">
            <h4>Direct Mechanisms</h4>
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
            <h4>Include Chain</h4>
            <div class="include-tree">
              {#each renderIncludeTree(includesData) as item, itemIndex (itemIndex)}
                <div class="include-item level-{item.level}">
                  <div class="include-header">
                    <Icon name={item.type === 'include' ? 'arrow-right' : 'corner-down-right'} size="xs" />
                    <span class="include-type">{item.type}:</span>
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
            <h4>Redirects</h4>
            <div class="redirects-list">
              {#each redirectsData as redirect, redirectIndex (redirectIndex)}
                <div class="redirect-item">
                  <div class="redirect-header">
                    <Icon name="external-link" size="xs" />
                    <span>redirect to: {redirect.domain}</span>
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
            <strong>SPF Evaluation Failed</strong>
            <p>{error || results.error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding SPF Records</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>SPF Mechanisms</h4>
          <div class="mechanism-types">
            <div class="mechanism-doc">
              <strong>all:</strong> Matches all addresses (use carefully)
            </div>
            <div class="mechanism-doc">
              <strong>ip4/ip6:</strong> Matches specific IP addresses or ranges
            </div>
            <div class="mechanism-doc">
              <strong>a/mx:</strong> Matches A or MX record addresses
            </div>
            <div class="mechanism-doc">
              <strong>include:</strong> References another domain's SPF record
            </div>
            <div class="mechanism-doc">
              <strong>redirect:</strong> Redirects to another domain's SPF record
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>SPF Qualifiers</h4>
          <div class="qualifier-types">
            <div class="qualifier-doc">
              <strong>+</strong> (Pass): Explicitly allow
            </div>
            <div class="qualifier-doc">
              <strong>-</strong> (Fail): Explicitly deny
            </div>
            <div class="qualifier-doc">
              <strong>~</strong> (Soft Fail): Mark as suspicious
            </div>
            <div class="qualifier-doc">
              <strong>?</strong> (Neutral): No explicit policy
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>DNS Lookup Limits</h4>
          <p>SPF has a limit of 10 DNS lookups to prevent infinite loops and reduce load. This includes:</p>
          <ul>
            <li>Each <code>include</code> mechanism</li>
            <li>Each <code>a</code>, <code>mx</code>, <code>exists</code>, <code>ptr</code> mechanism</li>
            <li>Lookups from <code>redirect</code> modifiers</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Best Practices</h4>
          <ul>
            <li>Keep DNS lookups under the 10-lookup limit</li>
            <li>End with <code>-all</code> or <code>~all</code> for security</li>
            <li>Use IP addresses when possible to reduce lookups</li>
            <li>Avoid excessive nesting of includes</li>
            <li>Regularly audit and update SPF records</li>
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
