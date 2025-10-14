<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let domain = $state('gmail.com');

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  const examplesList = [
    { domain: 'gmail.com', description: 'Google Gmail DMARC policy' },
    { domain: 'outlook.com', description: 'Microsoft Outlook DMARC setup' },
    { domain: 'github.com', description: 'GitHub enterprise DMARC' },
    { domain: 'paypal.com', description: 'PayPal strict DMARC policy' },
    { domain: 'amazon.com', description: 'Amazon DMARC implementation' },
    { domain: 'salesforce.com', description: 'Salesforce DMARC configuration' },
  ];

  const examples = useExamples(examplesList);

  async function checkDMARC() {
    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dmarc-check',
          domain: domain.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`DMARC check failed: ${response.status}`);
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    domain = example.domain;
    examples.select(index);
    checkDMARC();
  }

  function getPolicyColor(policy: string): string {
    switch (policy) {
      case 'reject':
        return 'success';
      case 'quarantine':
        return 'warning';
      case 'none':
        return 'error';
      default:
        return 'secondary';
    }
  }

  function getPolicyIcon(policy: string): string {
    switch (policy) {
      case 'reject':
        return 'shield-check';
      case 'quarantine':
        return 'shield-alert';
      case 'none':
        return 'shield-x';
      default:
        return 'shield';
    }
  }

  function getAlignmentColor(alignment: string): string {
    switch (alignment) {
      case 's':
        return 'success';
      case 'r':
        return 'warning';
      default:
        return 'secondary';
    }
  }

  async function copyResults() {
    if (!diagnosticState.results) return;

    let text = `DMARC Check for ${domain}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    if (diagnosticState.results.record) {
      text += `DMARC Record:\n${diagnosticState.results.record}\n\n`;
    }

    if (diagnosticState.results.deliverabilityHints) {
      text += `Email Deliverability Impact:\n`;
      text += `${diagnosticState.results.deliverabilityHints.policyImpact}\n\n`;

      if (diagnosticState.results.deliverabilityHints.recommendations.length > 0) {
        text += `Recommendations:\n`;
        diagnosticState.results.deliverabilityHints.recommendations.forEach((rec: string) => {
          text += `  • ${rec}\n`;
        });
        text += `\n`;
      }
    }

    if (diagnosticState.results.parsed) {
      const p = diagnosticState.results.parsed;
      text += `Policy Configuration:\n`;
      text += `  Main Policy: ${p.policy}\n`;
      if (p.subdomainPolicy) text += `  Subdomain Policy: ${p.subdomainPolicy}\n`;
      text += `  DKIM Alignment: ${p.alignment.dkim} (${p.alignment.dkim === 's' ? 'strict' : 'relaxed'})\n`;
      text += `  SPF Alignment: ${p.alignment.spf} (${p.alignment.spf === 's' ? 'strict' : 'relaxed'})\n`;
      text += `  Percentage: ${p.percentage}%\n`;
      if (p.reporting.aggregate) text += `  Aggregate Reports: ${p.reporting.aggregate}\n`;
      if (p.reporting.forensic) text += `  Forensic Reports: ${p.reporting.forensic}\n`;
    }

    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>Email DMARC Policy Checker</h1>
    <p>
      Check DMARC (Domain-based Message Authentication, Reporting & Conformance) policies with focus on email
      deliverability impact. Understand how DMARC affects your email delivery and reputation.
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="DMARC Examples"
    getLabel={(ex) => ex.domain}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Check DMARC policy for ${ex.domain}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>DMARC Policy Check</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain">
          Domain Name
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder="example.com"
            onchange={() => {
              examples.clear();
              if (domain) checkDMARC();
            }}
          />
        </label>
      </div>

      <div class="action-section">
        <button class="check-btn lookup-btn" onclick={checkDMARC} disabled={diagnosticState.loading || !domain.trim()}>
          {#if diagnosticState.loading}
            <Icon name="loader" size="sm" animate="spin" />
            Checking DMARC...
          {:else}
            <Icon name="shield-check" size="sm" />
            Check DMARC Policy
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results && diagnosticState.results.hasRecord}
    <div class="card results-card">
      <div class="card-header row">
        <h3>DMARC Policy Analysis</h3>
        <button class="copy-btn" onclick={copyResults} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        {#if diagnosticState.results.parsed && diagnosticState.results.deliverabilityHints}
          <!-- Email Deliverability Impact -->
          <div class="deliverability-section">
            <div class="deliverability-overview {getPolicyColor(diagnosticState.results.parsed.policy)}">
              <Icon name={getPolicyIcon(diagnosticState.results.parsed.policy)} size="md" />
              <div>
                <h4>Email Deliverability Impact</h4>
                <p class="policy-impact">{diagnosticState.results.deliverabilityHints.policyImpact}</p>
                {#if diagnosticState.results.deliverabilityHints.alignmentComplexity?.strict}
                  <p class="alignment-warning">
                    {diagnosticState.results.deliverabilityHints.alignmentComplexity.strict}
                  </p>
                {/if}
              </div>
            </div>

            <!-- Recommendations -->
            {#if diagnosticState.results.deliverabilityHints.recommendations.length > 0}
              {@const hintsData = (diagnosticState.results as { deliverabilityHints: { recommendations: string[] } })
                .deliverabilityHints}
              <div class="recommendations-section">
                <h5>Deliverability Recommendations</h5>
                <div class="recommendation-list">
                  {#each hintsData.recommendations as recommendation, recIndex (recIndex)}
                    <div class="recommendation-item">
                      <Icon name="lightbulb" size="xs" />
                      <span>{recommendation}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <!-- DMARC Record -->
          <div class="record-section">
            <h4>DMARC Record</h4>
            <div class="record-display">
              <div class="record-location">_dmarc.{domain}</div>
              <code>{diagnosticState.results.record}</code>
            </div>
          </div>

          <!-- Policy Configuration -->
          <div class="policy-section">
            <h4>Policy Configuration</h4>
            <div class="policy-grid">
              <!-- Main Policy -->
              <div class="policy-item {getPolicyColor(diagnosticState.results.parsed.policy)}">
                <div class="policy-header">
                  <Icon name="shield" size="sm" />
                  <span>Main Policy</span>
                </div>
                <div class="policy-value">
                  <span class="policy-text">{diagnosticState.results.parsed.policy}</span>
                  <span class="policy-description">
                    {#if diagnosticState.results.parsed.policy === 'reject'}
                      Reject non-compliant messages
                    {:else if diagnosticState.results.parsed.policy === 'quarantine'}
                      Quarantine suspicious messages
                    {:else if diagnosticState.results.parsed.policy === 'none'}
                      Monitor only, no action
                    {:else}
                      Unknown policy
                    {/if}
                  </span>
                </div>
              </div>

              <!-- Subdomain Policy -->
              {#if diagnosticState.results.parsed.subdomainPolicy}
                <div class="policy-item {getPolicyColor(diagnosticState.results.parsed.subdomainPolicy)}">
                  <div class="policy-header">
                    <Icon name="git-branch" size="sm" />
                    <span>Subdomain Policy</span>
                  </div>
                  <div class="policy-value">
                    <span class="policy-text">{diagnosticState.results.parsed.subdomainPolicy}</span>
                  </div>
                </div>
              {/if}

              <!-- Coverage Percentage -->
              <div
                class="policy-item {parseInt(diagnosticState.results.parsed.percentage) === 100
                  ? 'success'
                  : 'warning'}"
              >
                <div class="policy-header">
                  <Icon name="percent" size="sm" />
                  <span>Coverage</span>
                </div>
                <div class="policy-value">
                  <span class="policy-text">{diagnosticState.results.parsed.percentage}%</span>
                  <span class="policy-description">of messages affected</span>
                </div>
              </div>

              <!-- DKIM Alignment -->
              <div class="policy-item {getAlignmentColor(diagnosticState.results.parsed.alignment.dkim)}">
                <div class="policy-header">
                  <Icon name="key" size="sm" />
                  <span>DKIM Alignment</span>
                </div>
                <div class="policy-value">
                  <span class="policy-text"
                    >{diagnosticState.results.parsed.alignment.dkim === 's' ? 'Strict' : 'Relaxed'}</span
                  >
                  <span class="policy-description">
                    {diagnosticState.results.parsed.alignment.dkim === 's'
                      ? 'Exact domain match required'
                      : 'Organizational domain match allowed'}
                  </span>
                </div>
              </div>

              <!-- SPF Alignment -->
              <div class="policy-item {getAlignmentColor(diagnosticState.results.parsed.alignment.spf)}">
                <div class="policy-header">
                  <Icon name="mail" size="sm" />
                  <span>SPF Alignment</span>
                </div>
                <div class="policy-value">
                  <span class="policy-text"
                    >{diagnosticState.results.parsed.alignment.spf === 's' ? 'Strict' : 'Relaxed'}</span
                  >
                  <span class="policy-description">
                    {diagnosticState.results.parsed.alignment.spf === 's'
                      ? 'Exact domain match required'
                      : 'Organizational domain match allowed'}
                  </span>
                </div>
              </div>

              <!-- Failure Options -->
              <div class="policy-item secondary">
                <div class="policy-header">
                  <Icon name="settings" size="sm" />
                  <span>Failure Options</span>
                </div>
                <div class="policy-value">
                  <span class="policy-text">{diagnosticState.results.parsed.reporting.failureOptions}</span>
                  <span class="policy-description">
                    {#if diagnosticState.results.parsed.reporting.failureOptions === '0'}
                      DKIM and SPF failure
                    {:else if diagnosticState.results.parsed.reporting.failureOptions === '1'}
                      Any alignment failure
                    {:else if diagnosticState.results.parsed.reporting.failureOptions === 'd'}
                      DKIM failure only
                    {:else if diagnosticState.results.parsed.reporting.failureOptions === 's'}
                      SPF failure only
                    {:else}
                      Custom configuration
                    {/if}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Reporting Configuration -->
          <div class="reporting-section">
            <h4>Email Reporting Configuration</h4>
            <div class="reporting-grid">
              <div class="reporting-item">
                <div class="reporting-header">
                  <Icon name="bar-chart" size="sm" />
                  <span>Aggregate Reports (RUA)</span>
                </div>
                <div class="reporting-value">
                  {#if diagnosticState.results.parsed.reporting.aggregate}
                    <span class="email-address">{diagnosticState.results.parsed.reporting.aggregate}</span>
                    <span class="reporting-description">Daily summaries of DMARC activity</span>
                  {:else}
                    <span class="not-configured">Not configured</span>
                    <span class="reporting-description">Missing aggregate reporting - consider adding rua=</span>
                  {/if}
                </div>
              </div>

              <div class="reporting-item">
                <div class="reporting-header">
                  <Icon name="search" size="sm" />
                  <span>Forensic Reports (RUF)</span>
                </div>
                <div class="reporting-value">
                  {#if diagnosticState.results.parsed.reporting.forensic}
                    <span class="email-address">{diagnosticState.results.parsed.reporting.forensic}</span>
                    <span class="reporting-description">Real-time failure reports with message samples</span>
                  {:else}
                    <span class="not-configured">Not configured</span>
                    <span class="reporting-description">Optional - provides detailed failure analysis</span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- No Record Found -->
  {#if diagnosticState.results && diagnosticState.results.hasRecord === false}
    <div class="card warning-card none-found">
      <div class="card-content">
        <div class="warning-content">
          <Icon name="shield-x" size="md" />
          <div>
            <strong>No DMARC Record Found</strong>
            <p>Domain <code>{domain}</code> does not have a DMARC policy configured at <code>_dmarc.{domain}</code>.</p>
            <div class="deliverability-impact">
              <h5>Email Deliverability Impact:</h5>
              <ul>
                <li>No protection against email spoofing</li>
                <li>May affect email reputation with major providers</li>
                <li>Missing visibility into email authentication failures</li>
                <li>Consider implementing DMARC starting with p=none for monitoring</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard title="DMARC Check Failed" error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding DMARC for Email Delivery</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>DMARC Policies & Email Impact</h4>
          <div class="policy-explanations">
            <div class="explanation-item">
              <strong>none:</strong> Monitor mode - no delivery impact, collect data only
            </div>
            <div class="explanation-item">
              <strong>quarantine:</strong> Failed messages may go to spam/junk folder
            </div>
            <div class="explanation-item">
              <strong>reject:</strong> Failed messages rejected outright - strongest protection
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>Email Delivery Best Practices</h4>
          <ul>
            <li>Start with p=none to monitor before enforcement</li>
            <li>Gradually increase to p=quarantine then p=reject</li>
            <li>Set up aggregate reporting to monitor delivery</li>
            <li>Test alignment requirements carefully</li>
            <li>Consider subdomain policy for comprehensive coverage</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Alignment Modes & Delivery</h4>
          <div class="alignment-explanations">
            <div class="explanation-item">
              <strong>Relaxed (r):</strong> Allows organizational domain matching (safer for delivery)
            </div>
            <div class="explanation-item">
              <strong>Strict (s):</strong> Requires exact domain matching (higher security, delivery risk)
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>Common Delivery Issues</h4>
          <ul>
            <li>Strict alignment with third-party senders</li>
            <li>Forwarded emails failing DMARC checks</li>
            <li>Mailing lists modifying message headers</li>
            <li>Percentage rollout causing inconsistent delivery</li>
          </ul>
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
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    .policy-impact {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      font-weight: 500;
    }

    .alignment-warning {
      margin: 0;
      color: var(--color-warning);
      font-size: var(--font-size-xs);
      font-style: italic;
    }
  }

  .recommendations-section {
    h5 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
    }
  }

  .recommendation-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .recommendation-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-primary);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    :global(svg) {
      color: var(--color-primary);
      margin-top: 1px;
    }
  }

  .record-section,
  .policy-section,
  .reporting-section {
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

  .policy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .policy-item {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    padding: var(--spacing-md);
    border-left: 4px solid;

    &.success {
      border-left-color: var(--color-success);
    }

    &.warning {
      border-left-color: var(--color-warning);
    }

    &.error {
      border-left-color: var(--color-error);
    }

    &.secondary {
      border-left-color: var(--text-secondary);
    }
  }

  .policy-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .policy-value {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .policy-text {
      font-size: var(--font-size-md);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-primary);
    }

    .policy-description {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }
  }

  .reporting-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .reporting-item {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    padding: var(--spacing-md);

    .reporting-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .reporting-value {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .email-address {
        font-family: var(--font-mono);
        color: var(--text-primary);
        font-size: var(--font-size-sm);
        word-break: break-all;
      }

      .not-configured {
        color: var(--text-secondary);
        font-style: italic;
        font-size: var(--font-size-sm);
      }

      .reporting-description {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
      }
    }
  }

  .none-found {
    margin: var(--spacing-md) 0 var(--spacing-lg);

    .warning-content {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);

      strong {
        color: var(--text-primary);
        display: block;
        margin-bottom: var(--spacing-sm);
      }

      p {
        margin: 0 0 var(--spacing-md) 0;
        color: var(--text-secondary);

        code {
          background: var(--bg-secondary);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: var(--font-mono);
        }
      }

      .deliverability-impact {
        h5 {
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs) 0;
          font-size: var(--font-size-sm);
        }

        ul {
          margin: 0;
          padding-left: var(--spacing-md);
          color: var(--text-secondary);
          font-size: var(--font-size-xs);

          li {
            margin-bottom: var(--spacing-xs);
          }
        }
      }
    }
  }

  .policy-explanations,
  .alignment-explanations {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .explanation-item {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);

      strong {
        color: var(--text-primary);
        font-family: var(--font-mono);
      }
    }
  }
</style>
