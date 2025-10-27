<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';
  import '../../../../../styles/diagnostics-pages.scss';

  let domain = $state('google.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = $derived([
    {
      domain: $t('diagnostics/dns-dmarc-check.examples.items.google.domain'),
      description: $t('diagnostics/dns-dmarc-check.examples.items.google.description'),
      tooltip: $t('diagnostics/dns-dmarc-check.examples.items.google.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-dmarc-check.examples.items.github.domain'),
      description: $t('diagnostics/dns-dmarc-check.examples.items.github.description'),
      tooltip: $t('diagnostics/dns-dmarc-check.examples.items.github.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-dmarc-check.examples.items.microsoft.domain'),
      description: $t('diagnostics/dns-dmarc-check.examples.items.microsoft.description'),
      tooltip: $t('diagnostics/dns-dmarc-check.examples.items.microsoft.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-dmarc-check.examples.items.paypal.domain'),
      description: $t('diagnostics/dns-dmarc-check.examples.items.paypal.description'),
      tooltip: $t('diagnostics/dns-dmarc-check.examples.items.paypal.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-dmarc-check.examples.items.amazon.domain'),
      description: $t('diagnostics/dns-dmarc-check.examples.items.amazon.description'),
      tooltip: $t('diagnostics/dns-dmarc-check.examples.items.amazon.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-dmarc-check.examples.items.salesforce.domain'),
      description: $t('diagnostics/dns-dmarc-check.examples.items.salesforce.description'),
      tooltip: $t('diagnostics/dns-dmarc-check.examples.items.salesforce.tooltip'),
    },
  ]);

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
        throw new Error($t('diagnostics/dns-dmarc-check.error.lookupFailed', { status: response.status }));
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : $t('diagnostics/dns-dmarc-check.error.unknownError');
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
        message: $t('diagnostics/dns-dmarc-check.results.issues.messages.policyNone'),
        severity: 'high',
      });
    }

    // Alignment issues
    if (parsed.alignment.dkim === 'r' && parsed.alignment.spf === 'r') {
      issues.push({
        message: $t('diagnostics/dns-dmarc-check.results.issues.messages.relaxedAlignment'),
        severity: 'medium',
      });
    }

    // Reporting issues
    if (!parsed.reporting.aggregate) {
      issues.push({
        message: $t('diagnostics/dns-dmarc-check.results.issues.messages.noAggregateReporting'),
        severity: 'medium',
      });
    }

    if (!parsed.reporting.forensic) {
      issues.push({
        message: $t('diagnostics/dns-dmarc-check.results.issues.messages.noForensicReporting'),
        severity: 'low',
      });
    }

    // Percentage issues
    const percentage = parseInt(parsed.percentage);
    if (percentage < 100) {
      issues.push({
        message: $t('diagnostics/dns-dmarc-check.results.issues.messages.partialCoverage', { percentage }),
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

    let text = $t('diagnostics/dns-dmarc-check.copy.header', { domain }) + '\n';
    text += $t('diagnostics/dns-dmarc-check.copy.generatedAt', { timestamp: new Date().toISOString() }) + '\n\n';

    if (results.record) {
      text += $t('diagnostics/dns-dmarc-check.copy.recordLabel') + `\n${results.record}\n\n`;
    }

    if (results.parsed) {
      const p = results.parsed;
      text += $t('diagnostics/dns-dmarc-check.copy.parsedPolicyLabel') + `\n`;
      text += `  ` + $t('diagnostics/dns-dmarc-check.copy.mainPolicyLabel') + ` ${p.policy}\n`;
      if (p.subdomainPolicy)
        text += `  ` + $t('diagnostics/dns-dmarc-check.copy.subdomainPolicyLabel') + ` ${p.subdomainPolicy}\n`;
      text +=
        `  ` +
        $t('diagnostics/dns-dmarc-check.copy.dkimAlignmentLabel') +
        ` ${p.alignment.dkim} (${p.alignment.dkim === 's' ? $t('diagnostics/dns-dmarc-check.copy.alignmentStrict') : $t('diagnostics/dns-dmarc-check.copy.alignmentRelaxed')})\n`;
      text +=
        `  ` +
        $t('diagnostics/dns-dmarc-check.copy.spfAlignmentLabel') +
        ` ${p.alignment.spf} (${p.alignment.spf === 's' ? $t('diagnostics/dns-dmarc-check.copy.alignmentStrict') : $t('diagnostics/dns-dmarc-check.copy.alignmentRelaxed')})\n`;
      text += `  ` + $t('diagnostics/dns-dmarc-check.copy.percentageLabel') + ` ${p.percentage}%\n`;
      if (p.reporting.aggregate)
        text += `  ` + $t('diagnostics/dns-dmarc-check.copy.aggregateReportsLabel') + ` ${p.reporting.aggregate}\n`;
      if (p.reporting.forensic)
        text += `  ` + $t('diagnostics/dns-dmarc-check.copy.forensicReportsLabel') + ` ${p.reporting.forensic}\n`;
      text += `  ` + $t('diagnostics/dns-dmarc-check.copy.failureOptionsLabel') + ` ${p.reporting.failureOptions}\n\n`;
    }

    const issues = getIssues();
    if (issues.length > 0) {
      text += $t('diagnostics/dns-dmarc-check.copy.issuesFoundLabel') + `\n`;
      issues.forEach((issue) => {
        text += `  [${issue.severity.toUpperCase()}] ${issue.message}\n`;
      });
    } else {
      text += $t('diagnostics/dns-dmarc-check.copy.noIssuesFound') + `\n`;
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics/dns-dmarc-check.title')}</h1>
    <p>{$t('diagnostics/dns-dmarc-check.subtitle')}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics/dns-dmarc-check.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={example.tooltip}
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
      <h3>{$t('diagnostics/dns-dmarc-check.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={$t('diagnostics/dns-dmarc-check.form.domainTooltip')}>
          {$t('diagnostics/dns-dmarc-check.form.domainLabel')}
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder={$t('diagnostics/dns-dmarc-check.form.domainPlaceholder')}
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
            {$t('diagnostics/dns-dmarc-check.form.checking')}
          {:else}
            <Icon name="shield-check" size="sm" />
            {$t('diagnostics/dns-dmarc-check.form.checkButton')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results && results.hasRecord}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics/dns-dmarc-check.results.title')}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <Icon name={copiedState ? 'check' : 'copy'} size="xs" />
          {copiedState
            ? $t('diagnostics/dns-dmarc-check.results.copied')
            : $t('diagnostics/dns-dmarc-check.results.copy')}
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
                    {$t('diagnostics/dns-dmarc-check.results.status.secure')}
                  {:else if issues.some((i) => i.severity === 'high')}
                    {$t('diagnostics/dns-dmarc-check.results.status.issuesFound')}
                  {:else}
                    {$t('diagnostics/dns-dmarc-check.results.status.needsImprovement')}
                  {/if}
                </h4>
                <p>
                  {#if issues.length === 0}
                    {$t('diagnostics/dns-dmarc-check.results.status.noCriticalIssues')}
                  {:else}
                    {$t('diagnostics/dns-dmarc-check.results.status.issuesIdentified', {
                      count: issues.length,
                      plural: issues.length > 1 ? 's' : '',
                    })}
                  {/if}
                </p>
              </div>
            </div>
          </div>

          <!-- Original Record -->
          {#if results.record}
            <div class="record-section">
              <h4>{$t('diagnostics/dns-dmarc-check.results.recordSection.title')}</h4>
              <div class="record-display">
                <div class="record-location">
                  {$t('diagnostics/dns-dmarc-check.results.recordSection.location', { domain })}
                </div>
                <code>{results.record}</code>
              </div>
            </div>
          {/if}

          <!-- Parsed Policy -->
          <div class="policy-section">
            <h4>{$t('diagnostics/dns-dmarc-check.results.policyConfiguration.title')}</h4>
            <div class="policy-grid">
              <!-- Main Policy -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="shield" size="sm" />
                  <span>{$t('diagnostics/dns-dmarc-check.results.policyConfiguration.mainPolicy')}</span>
                </div>
                <div class="policy-value {getPolicyColor(parsed.policy)}">
                  <span class="policy-text">{parsed.policy}</span>
                  <span class="policy-description">
                    {#if parsed.policy === 'reject'}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.policies.reject')}
                    {:else if parsed.policy === 'quarantine'}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.policies.quarantine')}
                    {:else if parsed.policy === 'none'}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.policies.none')}
                    {:else}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.policies.unknown')}
                    {/if}
                  </span>
                </div>
              </div>

              <!-- Subdomain Policy -->
              {#if parsed.subdomainPolicy}
                <div class="policy-item">
                  <div class="policy-header">
                    <Icon name="git-branch" size="sm" />
                    <span>{$t('diagnostics/dns-dmarc-check.results.policyConfiguration.subdomainPolicy')}</span>
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
                  <span>{$t('diagnostics/dns-dmarc-check.results.policyConfiguration.coverage')}</span>
                </div>
                <div class="policy-value {parseInt(parsed.percentage) === 100 ? 'success' : 'warning'}">
                  <span class="policy-text">{parsed.percentage}%</span>
                  <span class="policy-description"
                    >{$t('diagnostics/dns-dmarc-check.results.policyConfiguration.coverageDescription')}</span
                  >
                </div>
              </div>

              <!-- DKIM Alignment -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="key" size="sm" />
                  <span>{$t('diagnostics/dns-dmarc-check.results.policyConfiguration.dkimAlignment')}</span>
                </div>
                <div class="policy-value {getAlignmentColor(parsed.alignment.dkim)}">
                  <span class="policy-text">
                    {parsed.alignment.dkim === 's'
                      ? $t('diagnostics/dns-dmarc-check.results.policyConfiguration.alignment.strict')
                      : $t('diagnostics/dns-dmarc-check.results.policyConfiguration.alignment.relaxed')}
                  </span>
                  <span class="policy-description">
                    {parsed.alignment.dkim === 's'
                      ? $t('diagnostics/dns-dmarc-check.results.policyConfiguration.alignment.strictDescription')
                      : $t('diagnostics/dns-dmarc-check.results.policyConfiguration.alignment.relaxedDescription')}
                  </span>
                </div>
              </div>

              <!-- SPF Alignment -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="mail" size="sm" />
                  <span>{$t('diagnostics/dns-dmarc-check.results.policyConfiguration.spfAlignment')}</span>
                </div>
                <div class="policy-value {getAlignmentColor(parsed.alignment.spf)}">
                  <span class="policy-text">
                    {parsed.alignment.spf === 's'
                      ? $t('diagnostics/dns-dmarc-check.results.policyConfiguration.alignment.strict')
                      : $t('diagnostics/dns-dmarc-check.results.policyConfiguration.alignment.relaxed')}
                  </span>
                  <span class="policy-description">
                    {parsed.alignment.spf === 's'
                      ? $t('diagnostics/dns-dmarc-check.results.policyConfiguration.alignment.strictDescription')
                      : $t('diagnostics/dns-dmarc-check.results.policyConfiguration.alignment.relaxedDescription')}
                  </span>
                </div>
              </div>

              <!-- Failure Options -->
              <div class="policy-item">
                <div class="policy-header">
                  <Icon name="settings" size="sm" />
                  <span>{$t('diagnostics/dns-dmarc-check.results.policyConfiguration.failureOptions')}</span>
                </div>
                <div class="policy-value secondary">
                  <span class="policy-text">{parsed.reporting.failureOptions}</span>
                  <span class="policy-description">
                    {#if parsed.reporting.failureOptions === '0'}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.failureOptionsDescriptions.both')}
                    {:else if parsed.reporting.failureOptions === '1'}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.failureOptionsDescriptions.any')}
                    {:else if parsed.reporting.failureOptions === 'd'}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.failureOptionsDescriptions.dkim')}
                    {:else if parsed.reporting.failureOptions === 's'}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.failureOptionsDescriptions.spf')}
                    {:else}
                      {$t('diagnostics/dns-dmarc-check.results.policyConfiguration.failureOptionsDescriptions.custom')}
                    {/if}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Reporting Configuration -->
          <div class="reporting-section">
            <h4>{$t('diagnostics/dns-dmarc-check.results.reporting.title')}</h4>
            <div class="reporting-grid">
              <div class="reporting-item">
                <div class="reporting-header">
                  <Icon name="bar-chart" size="sm" />
                  <span>{$t('diagnostics/dns-dmarc-check.results.reporting.aggregateReports')}</span>
                </div>
                <div class="reporting-value">
                  {#if parsed.reporting.aggregate}
                    <span class="email-address">{parsed.reporting.aggregate}</span>
                  {:else}
                    <span class="not-configured"
                      >{$t('diagnostics/dns-dmarc-check.results.reporting.notConfigured')}</span
                    >
                  {/if}
                </div>
              </div>

              <div class="reporting-item">
                <div class="reporting-header">
                  <Icon name="search" size="sm" />
                  <span>{$t('diagnostics/dns-dmarc-check.results.reporting.forensicReports')}</span>
                </div>
                <div class="reporting-value">
                  {#if parsed.reporting.forensic}
                    <span class="email-address">{parsed.reporting.forensic}</span>
                  {:else}
                    <span class="not-configured"
                      >{$t('diagnostics/dns-dmarc-check.results.reporting.notConfigured')}</span
                    >
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <!-- Issues -->
          {#if issues.length > 0}
            <div class="issues-section">
              <h4>{$t('diagnostics/dns-dmarc-check.results.issues.title')}</h4>
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
            <strong>{$t('diagnostics/dns-dmarc-check.noRecord.title')}</strong>
            <p>
              {$t('diagnostics/dns-dmarc-check.noRecord.message', { domain, dmarcDomain: results.domain })}
            </p>
            <p class="help-text">
              {$t('diagnostics/dns-dmarc-check.noRecord.helpText')}
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
            <strong>{$t('diagnostics/dns-dmarc-check.error.title')}</strong>
            <p>{error || results.error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics/dns-dmarc-check.educational.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics/dns-dmarc-check.educational.policies.title')}</h4>
          <div class="policy-explanations">
            <div class="explanation-item">
              <strong>none:</strong>
              {$t('diagnostics/dns-dmarc-check.educational.policies.none')}
            </div>
            <div class="explanation-item">
              <strong>quarantine:</strong>
              {$t('diagnostics/dns-dmarc-check.educational.policies.quarantine')}
            </div>
            <div class="explanation-item">
              <strong>reject:</strong>
              {$t('diagnostics/dns-dmarc-check.educational.policies.reject')}
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-dmarc-check.educational.alignmentModes.title')}</h4>
          <div class="alignment-explanations">
            <div class="explanation-item">
              <strong>Relaxed (r):</strong>
              {$t('diagnostics/dns-dmarc-check.educational.alignmentModes.relaxed')}
            </div>
            <div class="explanation-item">
              <strong>Strict (s):</strong>
              {$t('diagnostics/dns-dmarc-check.educational.alignmentModes.strict')}
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-dmarc-check.educational.reportingTypes.title')}</h4>
          <ul>
            <li>
              <strong>Aggregate (RUA):</strong>
              {$t('diagnostics/dns-dmarc-check.educational.reportingTypes.aggregate')}
            </li>
            <li>
              <strong>Forensic (RUF):</strong>
              {$t('diagnostics/dns-dmarc-check.educational.reportingTypes.forensic')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics/dns-dmarc-check.educational.bestPractices.title')}</h4>
          <ul>
            <li>{$t('diagnostics/dns-dmarc-check.educational.bestPractices.items.startMonitoring')}</li>
            <li>{$t('diagnostics/dns-dmarc-check.educational.bestPractices.items.gradualEnforcement')}</li>
            <li>{$t('diagnostics/dns-dmarc-check.educational.bestPractices.items.setupReporting')}</li>
            <li>{$t('diagnostics/dns-dmarc-check.educational.bestPractices.items.strictAlignment')}</li>
            <li>{$t('diagnostics/dns-dmarc-check.educational.bestPractices.items.subdomainPolicy')}</li>
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
