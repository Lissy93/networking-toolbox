<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../../styles/diagnostics-pages.scss';

  let domain = $state('google.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { domain: 'google.com', description: 'Google DMARC policy' },
    { domain: 'github.com', description: 'GitHub enterprise DMARC' },
    { domain: 'microsoft.com', description: 'Microsoft DMARC configuration' },
    { domain: 'paypal.com', description: 'PayPal strict DMARC policy' },
    { domain: 'amazon.com', description: 'Amazon DMARC implementation' },
    { domain: 'salesforce.com', description: 'Salesforce DMARC setup' },
  ];

  async function checkDMARC() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
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

      results = await response.json();
    } catch (err: unknown) {
      error = (err as Error).message;
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    checkDMARC();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
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

  function getAlignmentColor(alignment: string): string {
    switch (alignment) {
      case 's':
        return 'success'; // strict
      case 'r':
        return 'warning'; // relaxed
      default:
        return 'secondary';
    }
  }

  function getSeverityColor(severity: 'high' | 'medium' | 'low'): string {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'secondary';
    }
  }

  function getIssues(): Array<{ message: string; severity: 'high' | 'medium' | 'low' }> {
    if (!results?.parsed) return [];

    const issues: Array<{ message: string; severity: 'high' | 'medium' | 'low' }> = [];
    const parsed = results.parsed;

    // Policy issues
    if (parsed.policy === 'none') {
      issues.push({
        message: 'Policy is set to "none" - no action taken on DMARC failures',
        severity: 'high',
      });
    }

    // Alignment issues
    if (parsed.alignment.dkim === 'r' && parsed.alignment.spf === 'r') {
      issues.push({
        message: 'Both DKIM and SPF alignment are relaxed - consider strict alignment',
        severity: 'medium',
      });
    }

    // Reporting issues
    if (!parsed.reporting.aggregate) {
      issues.push({
        message: 'No aggregate reporting address (rua) specified',
        severity: 'medium',
      });
    }

    if (!parsed.reporting.forensic) {
      issues.push({
        message: 'No forensic reporting address (ruf) specified',
        severity: 'low',
      });
    }

    // Percentage issues
    const percentage = parseInt(parsed.percentage);
    if (percentage < 100) {
      issues.push({
        message: `Only ${percentage}% of messages are subject to DMARC policy`,
        severity: percentage < 50 ? 'high' : 'medium',
      });
    }

    // Add original issues from API
    if (results.issues) {
      results.issues.forEach((issue: string) => {
        issues.push({ message: issue, severity: 'medium' });
      });
    }

    return issues;
  }

  async function copyResults() {
    if (!results) return;

    let text = `DMARC Check for ${domain}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    if (results.record) {
      text += `DMARC Record:\n${results.record}\n\n`;
    }

    if (results.parsed) {
      const p = results.parsed;
      text += `Parsed Policy:\n`;
      text += `  Main Policy: ${p.policy}\n`;
      if (p.subdomainPolicy) text += `  Subdomain Policy: ${p.subdomainPolicy}\n`;
      text += `  DKIM Alignment: ${p.alignment.dkim} (${p.alignment.dkim === 's' ? 'strict' : 'relaxed'})\n`;
      text += `  SPF Alignment: ${p.alignment.spf} (${p.alignment.spf === 's' ? 'strict' : 'relaxed'})\n`;
      text += `  Percentage: ${p.percentage}%\n`;
      if (p.reporting.aggregate) text += `  Aggregate Reports: ${p.reporting.aggregate}\n`;
      if (p.reporting.forensic) text += `  Forensic Reports: ${p.reporting.forensic}\n`;
      text += `  Failure Options: ${p.reporting.failureOptions}\n\n`;
    }

    const issues = getIssues();
    if (issues.length > 0) {
      text += `Issues Found:\n`;
      issues.forEach((issue) => {
        text += `  [${issue.severity.toUpperCase()}] ${issue.message}\n`;
      });
    } else {
      text += `No issues found - DMARC configuration looks good!\n`;
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DMARC Policy Checker</h1>
    <p>
      Analyze DMARC (Domain-based Message Authentication, Reporting & Conformance) policies. Check policy configuration,
      alignment settings, and identify potential security issues.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>DMARC Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Check DMARC policy for ${example.domain} (${example.description})`}
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
      <h3>DMARC Policy Check</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={'Enter the domain to check DMARC policy for'}>
          Domain Name
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder="example.com"
            onchange={() => {
              clearExampleSelection();
              if (domain) checkDMARC();
            }}
          />
        </label>
      </div>

      <div class="action-section">
        <button class="check-btn lookup-btn" onclick={checkDMARC} disabled={loading || !domain.trim()}>
          {#if loading}
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
  {#if results && results.hasRecord}
    <div class="card results-card">
      <div class="card-header row">
        <h3>DMARC Policy Analysis</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <Icon name={copiedState ? 'check' : 'copy'} size="xs" />
          {copiedState ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- Status Overview -->
        {#if results.parsed}
          {@const issues = getIssues()}
          {@const parsed = results.parsed}
          <div class="status-overview">
            <div
              class="status-item {issues.length === 0
                ? 'success'
                : issues.some((i) => i.severity === 'high')
                  ? 'error'
                  : 'warning'}"
            >
              <Icon
                name={issues.length === 0
                  ? 'shield-check'
                  : issues.some((i) => i.severity === 'high')
                    ? 'shield-x'
                    : 'shield-alert'}
                size="md"
              />
              <div>
                <h4>
                  {#if issues.length === 0}
                    DMARC Configuration Secure
                  {:else if issues.some((i) => i.severity === 'high')}
                    DMARC Issues Found
                  {:else}
                    DMARC Needs Improvement
                  {/if}
                </h4>
                <p>
                  {#if issues.length === 0}
                    No critical issues detected
                  {:else}
                    {issues.length} issue{issues.length > 1 ? 's' : ''} identified
                  {/if}
                </p>
              </div>
            </div>
          </div>

          <!-- Original Record -->
          {#if results.record}
            <div class="record-section">
              <h4>DMARC Record</h4>
              <div class="record-display">
                <div class="record-location">_dmarc.{domain}</div>
                <code>{results.record}</code>
              </div>
            </div>
          {/if}

          <!-- Parsed Policy -->
          <div class="policy-section">
            <h4>Policy Configuration</h4>
            <div class="policy-grid">
              <!-- Main Policy -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="shield" size="sm" />
                  <span>Main Policy</span>
                </div>
                <div class="policy-value {getPolicyColor(parsed.policy)}">
                  <span class="policy-text">{parsed.policy}</span>
                  <span class="policy-description">
                    {#if parsed.policy === 'reject'}
                      Reject non-compliant messages
                    {:else if parsed.policy === 'quarantine'}
                      Quarantine suspicious messages
                    {:else if parsed.policy === 'none'}
                      Monitor only, no action
                    {:else}
                      Unknown policy
                    {/if}
                  </span>
                </div>
              </div>

              <!-- Subdomain Policy -->
              {#if parsed.subdomainPolicy}
                <div class="policy-item">
                  <div class="policy-header">
                    <Icon name="git-branch" size="sm" />
                    <span>Subdomain Policy</span>
                  </div>
                  <div class="policy-value {getPolicyColor(parsed.subdomainPolicy)}">
                    <span class="policy-text">{parsed.subdomainPolicy}</span>
                  </div>
                </div>
              {/if}

              <!-- Percentage -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="percent" size="sm" />
                  <span>Coverage</span>
                </div>
                <div class="policy-value {parseInt(parsed.percentage) === 100 ? 'success' : 'warning'}">
                  <span class="policy-text">{parsed.percentage}%</span>
                  <span class="policy-description">of messages affected</span>
                </div>
              </div>

              <!-- DKIM Alignment -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="key" size="sm" />
                  <span>DKIM Alignment</span>
                </div>
                <div class="policy-value {getAlignmentColor(parsed.alignment.dkim)}">
                  <span class="policy-text">{parsed.alignment.dkim === 's' ? 'Strict' : 'Relaxed'}</span>
                  <span class="policy-description">
                    {parsed.alignment.dkim === 's' ? 'Exact domain match' : 'Organizational domain match'}
                  </span>
                </div>
              </div>

              <!-- SPF Alignment -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="mail" size="sm" />
                  <span>SPF Alignment</span>
                </div>
                <div class="policy-value {getAlignmentColor(parsed.alignment.spf)}">
                  <span class="policy-text">{parsed.alignment.spf === 's' ? 'Strict' : 'Relaxed'}</span>
                  <span class="policy-description">
                    {parsed.alignment.spf === 's' ? 'Exact domain match' : 'Organizational domain match'}
                  </span>
                </div>
              </div>

              <!-- Failure Options -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="settings" size="sm" />
                  <span>Failure Options</span>
                </div>
                <div class="policy-value secondary">
                  <span class="policy-text">{parsed.reporting.failureOptions}</span>
                  <span class="policy-description">
                    {#if parsed.reporting.failureOptions === '0'}
                      DKIM and SPF failure
                    {:else if parsed.reporting.failureOptions === '1'}
                      Any alignment failure
                    {:else if parsed.reporting.failureOptions === 'd'}
                      DKIM failure only
                    {:else if parsed.reporting.failureOptions === 's'}
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
            <h4>Reporting Configuration</h4>
            <div class="reporting-grid">
              <div class="reporting-item">
                <div class="reporting-header">
                  <Icon name="bar-chart" size="sm" />
                  <span>Aggregate Reports (RUA)</span>
                </div>
                <div class="reporting-value">
                  {#if parsed.reporting.aggregate}
                    <span class="email-address">{parsed.reporting.aggregate}</span>
                  {:else}
                    <span class="not-configured">Not configured</span>
                  {/if}
                </div>
              </div>

              <div class="reporting-item">
                <div class="reporting-header">
                  <Icon name="search" size="sm" />
                  <span>Forensic Reports (RUF)</span>
                </div>
                <div class="reporting-value">
                  {#if parsed.reporting.forensic}
                    <span class="email-address">{parsed.reporting.forensic}</span>
                  {:else}
                    <span class="not-configured">Not configured</span>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <!-- Issues -->
          {#if issues.length > 0}
            <div class="issues-section">
              <h4>Issues & Recommendations</h4>
              <div class="issues-list">
                {#each issues as issue, index (index)}
                  <div class="issue-item {getSeverityColor(issue.severity)}">
                    <Icon
                      name={issue.severity === 'high'
                        ? 'alert-triangle'
                        : issue.severity === 'medium'
                          ? 'alert-circle'
                          : 'info'}
                      size="sm"
                    />
                    <div class="issue-content">
                      <span class="issue-severity">{issue.severity.toUpperCase()}</span>
                      <span class="issue-message">{issue.message}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}

  <!-- No Record Found (but not an error) -->
  {#if results && results.hasRecord === false}
    <div class="card warning-card none-found">
      <div class="card-content">
        <div class="warning-content">
          <Icon name="info" size="md" />
          <div>
            <strong>No DMARC Record Found</strong>
            <p>
              Domain <code>{domain}</code> does not have a DMARC policy configured at <code>{results.domain}</code>.
            </p>
            <p class="help-text">
              This means the domain is not protected by DMARC. Consider implementing a DMARC policy to prevent email
              spoofing.
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if error || results?.error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>DMARC Check Failed</strong>
            <p>{error || results.error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding DMARC</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>DMARC Policies</h4>
          <div class="policy-explanations">
            <div class="explanation-item">
              <strong>none:</strong> Monitor mode - collect data but take no action on failures
            </div>
            <div class="explanation-item">
              <strong>quarantine:</strong> Mark suspicious messages, often sent to spam folder
            </div>
            <div class="explanation-item">
              <strong>reject:</strong> Reject non-compliant messages outright (strongest security)
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>Alignment Modes</h4>
          <div class="alignment-explanations">
            <div class="explanation-item">
              <strong>Relaxed (r):</strong> Allows organizational domain matching (default)
            </div>
            <div class="explanation-item">
              <strong>Strict (s):</strong> Requires exact domain matching (more secure)
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>Reporting Types</h4>
          <ul>
            <li><strong>Aggregate (RUA):</strong> Daily summary reports of DMARC activity</li>
            <li><strong>Forensic (RUF):</strong> Real-time failure reports with message samples</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Best Practices</h4>
          <ul>
            <li>Start with <code>p=none</code> to monitor before enforcement</li>
            <li>Gradually increase to <code>p=quarantine</code> then <code>p=reject</code></li>
            <li>Set up aggregate reporting to monitor DMARC activity</li>
            <li>Use strict alignment for enhanced security when possible</li>
            <li>Consider subdomain policy for comprehensive coverage</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .record-display {
    display: flex;
    // flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    @media (max-width: 600px) {
      flex-wrap: wrap;
    }
    code {
      display: block;
      word-break: break-all;
    }
  }

  .none-found {
    margin: var(--spacing-md) 0 var(--spacing-lg);
  }

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  // Custom status item styling for DMARC (extends shared styles)
  .status-item {
    border: 2px solid;
    gap: var(--spacing-md);

    &.success {
      border-color: var(--color-success);
    }

    &.warning {
      border-color: var(--color-warning);
    }

    &.error {
      border-color: var(--color-error);
    }

    h4 {
      margin: 0;
      font-size: var(--font-size-md);
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      opacity: 0.8;
    }
  }

  .policy-section,
  .reporting-section,
  .issues-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
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
    }

    .policy-description {
      font-size: var(--font-size-xs);
      opacity: 0.8;
    }

    &.success .policy-text {
      color: var(--color-success);
    }

    &.warning .policy-text {
      color: var(--color-warning);
    }

    &.error .policy-text {
      color: var(--color-error);
    }

    &.secondary .policy-text {
      color: var(--text-secondary);
    }
  }

  .reporting-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
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
      display: block;
      word-break: break-all;
      .email-address {
        font-family: var(--font-mono);
        color: var(--text-primary);
        font-size: var(--font-size-sm);
      }

      .not-configured {
        color: var(--text-secondary);
        font-style: italic;
        font-size: var(--font-size-sm);
      }
    }
  }

  .issues-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .issue-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .issue-severity {
    font-size: var(--font-size-xs);
    font-weight: 600;
    opacity: 0.8;
  }

  .issue-message {
    font-size: var(--font-size-sm);
    line-height: 1.4;
  }

  .policy-explanations,
  .alignment-explanations {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .explanation-item {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
      font-family: var(--font-mono);
    }
  }

  // Page-specific styles (shared styles moved to diagnostics-pages.scss)
</style>
