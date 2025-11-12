<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/i18n';
  import '../../../../../styles/diagnostics-pages.scss';

  let domain = $state('gmail.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { domain: 'gmail.com', description: 'Google Gmail SPF policy' },
    { domain: 'outlook.com', description: 'Microsoft Outlook SPF setup' },
    { domain: 'salesforce.com', description: 'Salesforce SPF configuration' },
    { domain: 'mailchimp.com', description: 'MailChimp email service SPF' },
    { domain: 'github.com', description: 'GitHub enterprise SPF policy' },
    { domain: 'sendgrid.com', description: 'SendGrid email platform SPF' },
  ];

  async function checkSPF() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'spf-check',
          domain: domain.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`SPF check failed: ${response.status}`);
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
    checkSPF();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function getDeliverabilityColor(risk: string): string {
    switch (risk) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'secondary';
    }
  }

  function getDeliverabilityIcon(risk: string): string {
    switch (risk) {
      case 'low':
        return 'shield-check';
      case 'medium':
        return 'shield-alert';
      case 'high':
        return 'shield-x';
      default:
        return 'shield';
    }
  }

  async function copyResults() {
    if (!results) return;

    let text = `SPF Check for ${domain}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    if (results.record) {
      text += `SPF Record:\n${results.record}\n\n`;
    }

    if (results.emailAnalysis) {
      text += `Email Deliverability Analysis:\n`;
      text += `  Risk Level: ${results.emailAnalysis.deliverabilityRisk}\n`;
      text += `  Hard Fail (-all): ${results.emailAnalysis.hasHardFail ? 'Yes' : 'No'}\n`;
      text += `  Soft Fail (~all): ${results.emailAnalysis.hasSoftFail ? 'Yes' : 'No'}\n`;
      text += `  Allows All (+all): ${results.emailAnalysis.allowsAll ? 'Yes' : 'No'}\n\n`;
    }

    const expandedResults = results as {
      expanded?: { mechanisms: string[]; includes: Array<{ domain: string }> };
      lookupCount?: number;
    };
    if (expandedResults.expanded) {
      text += `Expanded SPF Analysis:\n`;
      text += `  Total DNS lookups: ${expandedResults.lookupCount || 0}\n`;
      text += `  Mechanisms: ${expandedResults.expanded.mechanisms.join(', ')}\n`;
      if (expandedResults.expanded.includes.length > 0) {
        text += `  Includes: ${expandedResults.expanded.includes.map((inc) => inc.domain).join(', ')}\n`;
      }
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{t('diagnostics.email-spf-check.title')}</h1>
    <p>
      {t('diagnostics.email-spf-check.description')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{t('diagnostics.email-spf-check.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Check SPF policy for ${example.domain}`}
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
      <h3>SPF Policy Check</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={'Enter the domain to check SPF policy for'}>
          Domain Name
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder="example.com"
            onchange={() => {
              clearExampleSelection();
              if (domain) checkSPF();
            }}
          />
        </label>
      </div>

      <div class="action-section">
        <button class="check-btn lookup-btn" onclick={checkSPF} disabled={loading || !domain.trim()}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Checking SPF...
          {:else}
            <Icon name="mail-check" size="sm" />
            Check SPF Policy
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>SPF Policy Analysis</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <Icon name={copiedState ? 'check' : 'copy'} size="xs" />
          {copiedState ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        {#if results.record}
          <!-- Email Deliverability Overview -->
          {#if results.emailAnalysis}
            <div class="deliverability-section">
              <div class="deliverability-overview {getDeliverabilityColor(results.emailAnalysis.deliverabilityRisk)}">
                <Icon name={getDeliverabilityIcon(results.emailAnalysis.deliverabilityRisk)} size="md" />
                <div>
                  <h4>Email Deliverability Risk: {results.emailAnalysis.deliverabilityRisk.toUpperCase()}</h4>
                  <p>
                    {#if results.emailAnalysis.deliverabilityRisk === 'low'}
                      Strong SPF policy with hard fail - excellent email security
                    {:else if results.emailAnalysis.deliverabilityRisk === 'medium'}
                      Moderate SPF policy with soft fail - good but could be stronger
                    {:else}
                      Weak or missing SPF policy - high risk of email spoofing
                    {/if}
                  </p>
                </div>
              </div>

              <div class="deliverability-details">
                <div class="detail-item {results.emailAnalysis.hasHardFail ? 'success' : 'warning'}">
                  <Icon name={results.emailAnalysis.hasHardFail ? 'check-circle' : 'alert-circle'} size="sm" />
                  <div>
                    <span class="detail-label">Hard Fail (-all)</span>
                    <span class="detail-value">{results.emailAnalysis.hasHardFail ? 'Enabled' : 'Disabled'}</span>
                    <span class="detail-description">
                      {results.emailAnalysis.hasHardFail
                        ? 'Unauthorized emails will be rejected'
                        : 'Consider upgrading to -all for better security'}
                    </span>
                  </div>
                </div>

                <div
                  class="detail-item {results.emailAnalysis.hasSoftFail
                    ? 'warning'
                    : results.emailAnalysis.hasHardFail
                      ? 'success'
                      : 'error'}"
                >
                  <Icon
                    name={results.emailAnalysis.hasSoftFail
                      ? 'alert-triangle'
                      : results.emailAnalysis.hasHardFail
                        ? 'check-circle'
                        : 'x-circle'}
                    size="sm"
                  />
                  <div>
                    <span class="detail-label">Soft Fail (~all)</span>
                    <span class="detail-value">{results.emailAnalysis.hasSoftFail ? 'Enabled' : 'Disabled'}</span>
                    <span class="detail-description">
                      {results.emailAnalysis.hasSoftFail
                        ? 'Unauthorized emails marked as suspicious'
                        : results.emailAnalysis.hasHardFail
                          ? 'Using stronger hard fail instead'
                          : 'No SPF enforcement configured'}
                    </span>
                  </div>
                </div>

                {#if results.emailAnalysis.allowsAll}
                  <div class="detail-item error">
                    <Icon name="alert-triangle" size="sm" />
                    <div>
                      <span class="detail-label">Allows All (+all)</span>
                      <span class="detail-value">Enabled</span>
                      <span class="detail-description">WARNING: Any server can send email for this domain</span>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- SPF Record Display -->
          <div class="record-section">
            <h4>SPF Record</h4>
            <div class="record-display">
              <div class="record-location">TXT record for {domain}</div>
              <code>{results.record}</code>
            </div>
          </div>

          <!-- Expanded Analysis -->
          {#if results.expanded}
            <div class="analysis-section">
              <h4>SPF Policy Breakdown</h4>

              <!-- Lookup Count Warning -->
              {#if results.lookupCount > 8}
                <div class="warning-box">
                  <Icon name="alert-triangle" size="sm" />
                  <div>
                    <strong>DNS Lookup Limit Exceeded</strong>
                    <p>
                      This SPF record requires {results.lookupCount} DNS lookups, which exceeds the RFC limit of 10. This
                      may cause delivery failures.
                    </p>
                  </div>
                </div>
              {:else if results.lookupCount > 6}
                <div class="info-box">
                  <Icon name="info" size="sm" />
                  <div>
                    <strong>High DNS Lookup Count</strong>
                    <p>
                      This SPF record requires {results.lookupCount} DNS lookups. Consider optimizing to stay well below
                      the 10-lookup limit.
                    </p>
                  </div>
                </div>
              {/if}

              <!-- Mechanisms -->
              {#if results.expanded.mechanisms.length > 0}
                {@const spfExpanded = (results as { expanded: { mechanisms: string[] } }).expanded}
                <div class="mechanisms-section">
                  <h5>Direct Mechanisms</h5>
                  <div class="mechanism-list">
                    {#each spfExpanded.mechanisms as mechanism, mechanismIndex (mechanismIndex)}
                      <div class="mechanism-item">
                        <code>{mechanism}</code>
                        <span class="mechanism-description">
                          {#if mechanism.startsWith('v=spf1')}
                            SPF version identifier
                          {:else if mechanism.startsWith('ip4:')}
                            IPv4 address or network: {mechanism.substring(4)}
                          {:else if mechanism.startsWith('ip6:')}
                            IPv6 address or network: {mechanism.substring(4)}
                          {:else if mechanism.startsWith('a:')}
                            A record lookup for: {mechanism.substring(2)}
                          {:else if mechanism === 'a'}
                            A record lookup for domain itself
                          {:else if mechanism.startsWith('mx:')}
                            MX record lookup for: {mechanism.substring(3)}
                          {:else if mechanism === 'mx'}
                            MX record lookup for domain itself
                          {:else if mechanism.startsWith('exists:')}
                            DNS lookup test: {mechanism.substring(7)}
                          {:else if mechanism === '-all'}
                            Hard fail - reject unauthorized emails
                          {:else if mechanism === '~all'}
                            Soft fail - mark unauthorized emails as suspicious
                          {:else if mechanism === '+all'}
                            Pass all - allow any server (dangerous)
                          {:else if mechanism === '?all'}
                            Neutral - no policy decision
                          {:else}
                            {mechanism}
                          {/if}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Includes -->
              {#if results.expanded.includes.length > 0}
                {@const spfIncludes = (
                  results as {
                    expanded: { includes: Array<{ domain: string; result: { record?: string; error?: string } }> };
                  }
                ).expanded}
                <div class="includes-section">
                  <h5>Included SPF Policies</h5>
                  <div class="include-list">
                    {#each spfIncludes.includes as include, includeIndex (includeIndex)}
                      <div class="include-item">
                        <div class="include-header">
                          <Icon name="external-link" size="xs" />
                          <span class="include-domain">{include.domain}</span>
                        </div>
                        {#if include.result.record}
                          <div class="include-record">
                            <code>{include.result.record}</code>
                          </div>
                        {/if}
                        {#if include.result.error}
                          <div class="include-error">
                            <Icon name="alert-triangle" size="xs" />
                            <span>{include.result.error}</span>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        {:else}
          <div class="no-record-section">
            <div class="no-record-content">
              <Icon name="alert-triangle" size="md" />
              <div>
                <h4>No SPF Record Found</h4>
                <p>Domain <code>{domain}</code> does not have an SPF record configured.</p>
                <p class="risk-warning">
                  This means anyone can send email claiming to be from this domain, significantly increasing spoofing
                  risk.
                </p>
              </div>
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
            <strong>SPF Check Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding SPF for Email</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>SPF Mechanisms</h4>
          <div class="mechanism-explanations">
            <div class="mechanism-explanation">
              <strong>ip4/ip6:</strong> Authorize specific IP addresses or networks
            </div>
            <div class="mechanism-explanation">
              <strong>a/mx:</strong> Authorize servers from A or MX records
            </div>
            <div class="mechanism-explanation">
              <strong>include:</strong> Include another domain's SPF policy
            </div>
            <div class="mechanism-explanation">
              <strong>all:</strong> Final policy decision (+pass, ~soft fail, -hard fail)
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>Email Deliverability</h4>
          <ul>
            <li><strong>Hard Fail (-all):</strong> Best security, blocks unauthorized senders</li>
            <li><strong>Soft Fail (~all):</strong> Marks suspicious, doesn't block delivery</li>
            <li><strong>No SPF:</strong> High spoofing risk, may affect deliverability</li>
            <li><strong>Too many lookups:</strong> Can cause delivery failures</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Best Practices</h4>
          <ul>
            <li>Use -all for hard fail when possible</li>
            <li>Keep DNS lookups under 10 (preferably under 5)</li>
            <li>Test SPF changes before deployment</li>
            <li>Monitor email delivery after SPF changes</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Common SPF Examples</h4>
          <div class="spf-examples">
            <div class="spf-example">
              <code>v=spf1 include:_spf.google.com ~all</code>
              <span>Use Google Workspace with soft fail</span>
            </div>
            <div class="spf-example">
              <code>v=spf1 ip4:192.168.1.1 -all</code>
              <span>Only allow specific IP with hard fail</span>
            </div>
            <div class="spf-example">
              <code>v=spf1 a mx -all</code>
              <span>Allow A and MX record servers with hard fail</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  .deliverability-section {
    margin-bottom: var(--spacing-lg);
  }

  .deliverability-overview {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    border: 2px solid;
    margin-bottom: var(--spacing-md);

    &.success {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      border-color: var(--color-success);
    }

    &.warning {
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      border-color: var(--color-warning);
    }

    &.error {
      background: color-mix(in srgb, var(--color-error), transparent 95%);
      border-color: var(--color-error);
    }

    h4 {
      margin: 0;
      color: var(--text-primary);
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .deliverability-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .detail-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border-left: 4px solid;

    &.success {
      border-left-color: var(--color-success);
      :global(svg) {
        color: var(--color-success);
      }
    }

    &.warning {
      border-left-color: var(--color-warning);
      :global(svg) {
        color: var(--color-warning);
      }
    }

    &.error {
      border-left-color: var(--color-error);
      :global(svg) {
        color: var(--color-error);
      }
    }

    div {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .detail-label {
        font-weight: 600;
        color: var(--text-primary);
        font-size: var(--font-size-sm);
      }

      .detail-value {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        font-weight: 500;
      }

      .detail-description {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        line-height: 1.4;
      }
    }
  }

  .record-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .record-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);

    @media (max-width: 600px) {
      flex-wrap: wrap;
    }

    .record-location {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      white-space: nowrap;
    }

    code {
      flex: 1;
      word-break: break-all;
      font-family: var(--font-mono);
    }
  }

  .warning-box,
  .info-box {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-md);

    strong {
      color: var(--text-primary);
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .warning-box {
    background: color-mix(in srgb, var(--color-warning), transparent 95%);
    border: 1px solid var(--color-warning);
    :global(svg) {
      color: var(--color-warning);
    }
  }

  .info-box {
    background: color-mix(in srgb, var(--color-primary), transparent 95%);
    border: 1px solid var(--color-primary);
    :global(svg) {
      color: var(--color-primary);
    }
  }

  .analysis-section {
    h4,
    h5 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }

    h5 {
      font-size: var(--font-size-md);
      margin-bottom: var(--spacing-sm);
    }
  }

  .mechanisms-section,
  .includes-section {
    margin-bottom: var(--spacing-lg);
  }

  .mechanism-list,
  .include-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .mechanism-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);

    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-weight: 600;
    }

    .mechanism-description {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }
  }

  .include-item {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);

    .include-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);

      .include-domain {
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .include-record {
      margin-bottom: var(--spacing-sm);

      code {
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        word-break: break-all;
      }
    }

    .include-error {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--color-error);
      font-size: var(--font-size-xs);
    }
  }

  .no-record-section {
    .no-record-content {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      border: 2px solid var(--color-warning);
      border-radius: var(--radius-md);

      h4 {
        margin: 0 0 var(--spacing-sm) 0;
        color: var(--text-primary);
      }

      p {
        margin: 0 0 var(--spacing-xs) 0;
        color: var(--text-secondary);

        code {
          background: var(--bg-secondary);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: var(--font-mono);
        }
      }

      .risk-warning {
        color: var(--color-warning) !important;
        font-weight: 500;
      }
    }
  }

  .mechanism-explanations {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .mechanism-explanation {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);

      strong {
        color: var(--text-primary);
        font-family: var(--font-mono);
      }
    }
  }

  .spf-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .spf-example {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);

      code {
        background: var(--bg-secondary);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--font-mono);
        color: var(--text-primary);
        margin-right: var(--spacing-xs);
        display: block;
        margin-bottom: var(--spacing-xs);
      }
    }
  }
</style>
