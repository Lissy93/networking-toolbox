<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { greylistContent as content } from '$lib/content/greylist';
  import { useDiagnosticState } from '$lib/composables';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  interface GreylistAttempt {
    attemptNumber: number;
    timestamp: string;
    connected: boolean;
    response?: string;
    responseCode?: string;
    duration: number;
    error?: string;
  }

  interface GreylistTestResult {
    domain: string;
    port: number;
    implementsGreylisting: boolean;
    attempts: GreylistAttempt[];
    analysis: {
      initialRejected: boolean;
      subsequentAccepted: boolean;
      typicalDelay?: number;
      confidence: 'high' | 'medium' | 'low' | 'none';
    };
    timestamp: string;
  }

  const examplesList = [
    { domain: 'mail.protonmail.ch', port: 25, desc: 'ProtonMail (privacy-focused)' },
    { domain: 'mail.tutanota.de', port: 25, desc: 'Tutanota (encrypted email)' },
    { domain: 'mx01.mail.icloud.com', port: 25, desc: 'iCloud Mail' },
    { domain: 'mx.zoho.com', port: 25, desc: 'Zoho Mail (business)' },
    { domain: 'aspmx.l.google.com', port: 25, desc: 'Google Workspace MX' },
    { domain: 'smtp.runbox.com', port: 25, desc: 'Runbox (Exim-based)' },
  ];

  let domain = $state('');
  let port = $state(25);
  let attempts = $state(2);
  let delayBetweenAttempts = $state(5);
  let selectedExample = $state<string | null>(null);

  const diagnosticState = useDiagnosticState<GreylistTestResult>();

  async function loadExample(exampleDomain: string, examplePort: number) {
    domain = exampleDomain;
    port = examplePort;
    selectedExample = `${exampleDomain}:${examplePort}`;
    await testGreylist();
  }

  async function testGreylist() {
    if (!domain.trim()) {
      diagnosticState.setError('Please enter a domain name');
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/greylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          port,
          attempts,
          delayBetweenAttempts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || 'Greylisting test failed');
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }

  const getConfidenceBadgeClass = (c: string) => ({ high: 'success', medium: 'warning', low: 'info' })[c] || '';

  const getAttemptBadgeClass = (code?: string) =>
    !code
      ? 'error'
      : code.startsWith('2')
        ? 'success'
        : code.startsWith('4')
          ? 'warning'
          : code.startsWith('5')
            ? 'error'
            : '';

  const getConfidenceIcon = (c: string) =>
    c === 'high' ? 'check-circle' : c === 'medium' ? 'alert-triangle' : c === 'low' ? 'info' : 'help-circle';

  const connectedCount = $derived(diagnosticState.results?.attempts.filter((a) => a.connected).length ?? 0);
  const testDuration = $derived(
    diagnosticState.results
      ? Math.round(
          (new Date(diagnosticState.results.attempts[diagnosticState.results.attempts.length - 1].timestamp).getTime() -
            new Date(diagnosticState.results.attempts[0].timestamp).getTime()) /
            1000,
        )
      : 0,
  );
</script>

<div class="card">
  <header class="card-header">
    <h1>{content.title}</h1>
    <p>{content.description}</p>
  </header>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Test Mail Server Greylisting</h3>
    </div>
    <div class="card-content">
      <div class="form-grid">
        <div class="form-group">
          <label for="domain">Domain</label>
          <input
            type="text"
            id="domain"
            bind:value={domain}
            placeholder="smtp.example.com"
            onkeydown={(e) => e.key === 'Enter' && testGreylist()}
            disabled={diagnosticState.loading}
          />
        </div>
        <div class="form-group port-group">
          <label for="port">Port</label>
          <input
            type="number"
            id="port"
            bind:value={port}
            placeholder="25"
            min="1"
            max="65535"
            disabled={diagnosticState.loading}
          />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label for="attempts">Connection Attempts</label>
          <input type="number" id="attempts" bind:value={attempts} min="2" max="5" disabled={diagnosticState.loading} />
        </div>
        <div class="form-group">
          <label for="delay">Delay Between Attempts (seconds)</label>
          <input
            type="number"
            id="delay"
            bind:value={delayBetweenAttempts}
            min="1"
            max="300"
            disabled={diagnosticState.loading}
          />
        </div>
      </div>

      <button class="lookup-btn" onclick={testGreylist} disabled={diagnosticState.loading}>
        <Icon
          name={diagnosticState.loading ? 'loader' : 'play'}
          size="sm"
          animate={diagnosticState.loading ? 'spin' : undefined}
        />
        {diagnosticState.loading ? 'Testing...' : 'Test Greylisting'}
      </button>
    </div>
  </div>

  <!-- Loading State -->
  {#if diagnosticState.loading}
    <div class="card loading-card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Testing Greylisting</h3>
            <p>
              Testing {attempts} connection{attempts > 1 ? 's' : ''} to {domain}:{port} with {delayBetweenAttempts}s
              delay...
            </p>
            <p class="loading-note">
              This will take approximately {attempts * delayBetweenAttempts + 10} seconds to complete
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <ErrorCard error={diagnosticState.error} />

  <!-- Quick Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examplesList as example (example.domain)}
          <button
            class="example-card"
            class:selected={selectedExample === `${example.domain}:${example.port}`}
            onclick={() => loadExample(example.domain, example.port)}
            disabled={diagnosticState.loading}
          >
            <strong>{example.domain}</strong>
            <span>Port {example.port}</span>
            <em>{example.desc}</em>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>Test Results for {diagnosticState.results.domain}:{diagnosticState.results.port}</h3>
      </div>
      <div class="card-content">
        <!-- Greylisting Status -->
        <div class="status-overview">
          {#if diagnosticState.results.implementsGreylisting}
            <div class="status-item success">
              <Icon name="check-circle" size="md" />
              <div>
                <h4>Greylisting Detected</h4>
                <p>Server implements greylisting (Confidence: {diagnosticState.results.analysis.confidence})</p>
              </div>
            </div>
          {:else}
            <div class="status-item error">
              <Icon name="x-circle" size="md" />
              <div>
                <h4>No Greylisting Detected</h4>
                <p>Server does not appear to implement greylisting</p>
              </div>
            </div>
          {/if}

          {#if diagnosticState.results.analysis.typicalDelay}
            <div class="status-item info">
              <Icon name="clock" size="md" />
              <div>
                <h4>Typical Delay</h4>
                <p>{diagnosticState.results.analysis.typicalDelay} seconds between rejection and acceptance</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Connection Attempts -->
        <div class="subsection">
          <h4>
            <Icon name="activity" size="sm" />
            Connection Attempts
          </h4>
          <div class="attempts-list">
            {#each diagnosticState.results.attempts as attempt (attempt.attemptNumber)}
              <div class="attempt-item">
                <div class="attempt-header">
                  <span class="attempt-number">#{attempt.attemptNumber}</span>
                  <span class="badge {getAttemptBadgeClass(attempt.responseCode)}"
                    >{attempt.responseCode || 'Failed'}</span
                  >
                  <span class="attempt-time">{new Date(attempt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="attempt-details">
                  {#if attempt.connected}
                    <div class="detail-row {attempt.responseCode?.startsWith('2') ? 'success' : ''}">
                      {#if attempt.responseCode?.startsWith('2')}
                        <Icon name="check-circle" size="sm" />
                      {/if}
                      <span class="detail-label">Response:</span>
                      <span class="detail-value mono">
                        {attempt.response}
                      </span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Duration:</span>
                      <span class="detail-value">{attempt.duration}ms</span>
                    </div>
                  {:else}
                    <div class="detail-row">
                      <span class="detail-label">Error:</span>
                      <span class="detail-value error">
                        <Icon name="x-circle" size="sm" />
                        {attempt.error}
                      </span>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Analysis -->
        <div class="subsection">
          <h4>
            <Icon name="search" size="sm" />
            Analysis
          </h4>
          <div class="analysis-details">
            <div class="detail-row">
              <span class="detail-label">Server:</span>
              <span class="detail-value">
                <Icon name="server" size="sm" />
                {diagnosticState.results.domain}:{diagnosticState.results.port}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Attempts:</span>
              <span class="detail-value">
                <Icon name="activity" size="sm" />
                {diagnosticState.results.attempts.length}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Successful Connections:</span>
              <span class="detail-value {connectedCount > 0 ? 'success' : 'error'}">
                <Icon name={connectedCount > 0 ? 'check-circle' : 'x-circle'} size="sm" />
                {connectedCount} / {diagnosticState.results.attempts.length}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Test Duration:</span>
              <span class="detail-value info">
                <Icon name="clock" size="sm" />
                {testDuration}s
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Initial Connection:</span>
              <span class="detail-value {diagnosticState.results.analysis.initialRejected ? 'warning' : 'success'}">
                <Icon name={diagnosticState.results.analysis.initialRejected ? 'x-circle' : 'check-circle'} size="sm" />
                {diagnosticState.results.analysis.initialRejected ? 'Temporarily rejected' : 'Accepted immediately'}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Subsequent Attempts:</span>
              <span class="detail-value {diagnosticState.results.analysis.subsequentAccepted ? 'success' : 'error'}">
                <Icon
                  name={diagnosticState.results.analysis.subsequentAccepted ? 'check-circle' : 'x-circle'}
                  size="sm"
                />
                {diagnosticState.results.analysis.subsequentAccepted ? 'Accepted after delay' : 'Still rejected'}
              </span>
            </div>
            {#if diagnosticState.results.analysis.typicalDelay}
              <div class="detail-row">
                <span class="detail-label">Delay Duration:</span>
                <span class="detail-value info">
                  <Icon name="clock" size="sm" />
                  {diagnosticState.results.analysis.typicalDelay} seconds
                </span>
              </div>
            {/if}
            <div class="detail-row">
              <span class="detail-label">Confidence Level:</span>
              <span class="detail-value {getConfidenceBadgeClass(diagnosticState.results.analysis.confidence)}">
                <Icon name={getConfidenceIcon(diagnosticState.results.analysis.confidence)} size="sm" />
                {diagnosticState.results.analysis.confidence.charAt(0).toUpperCase() +
                  diagnosticState.results.analysis.confidence.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Documentation -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding Greylisting</h3>
    </div>
    <div class="card-content">
      {#each [{ title: content.sections.whatIsGreylisting.title, content: content.sections.whatIsGreylisting.content, open: true }, { title: content.sections.howItWorks.title, list: content.sections.howItWorks.steps, listKey: 'step' }, { title: content.sections.smtpCodes.title, codes: content.sections.smtpCodes.codes }, { title: content.sections.confidenceLevels.title, list: content.sections.confidenceLevels.levels, listKey: 'level' }, { title: content.sections.benefits.title, list: content.sections.benefits.points, listKey: 'point' }, { title: content.sections.drawbacks.title, list: content.sections.drawbacks.points, listKey: 'point' }, { title: content.sections.bestPractices.title, simpleList: content.sections.bestPractices.practices }, { title: 'Quick Tips', simpleList: content.quickTips }] as section (section.title)}
        <details class="info-accordion" open={section.open}>
          <summary class="accordion-summary">
            <Icon name="chevron-right" size="sm" />
            <h4>{section.title}</h4>
          </summary>
          <div class="accordion-content">
            {#if section.content}
              <p>{section.content}</p>
            {:else if section.codes}
              <div class="port-list">
                {#each section.codes as code (code.code)}
                  <div class="port-item">
                    <div class="port-number badge {getAttemptBadgeClass(code.code)}">{code.code}</div>
                    <div class="port-details">
                      <strong>{code.name}</strong>
                      <p>{code.desc}</p>
                    </div>
                  </div>
                {/each}
              </div>
            {:else if section.list}
              <ul>
                {#each section.list as item ('step' in item ? item.step : 'level' in item ? item.level : item.point)}
                  <li>
                    <strong>{'step' in item ? item.step : 'level' in item ? item.level : item.point}:</strong>
                    {item.desc}
                  </li>
                {/each}
              </ul>
            {:else if section.simpleList}
              <ul>
                {#each section.simpleList as item, i (i)}
                  <li>{item}</li>
                {/each}
              </ul>
            {/if}
          </div>
        </details>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .subsection {
    h4 {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    label {
      font-size: 0.85rem;
      color: var(--color-text-muted);
      font-weight: 500;
    }

    &.port-group {
      min-width: 120px;
    }
  }

  // Connection attempt timeline specific styles
  .attempts-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .attempt-item {
    padding: var(--spacing-md);
    background: var(--border-primary);
    border-radius: var(--radius-sm);
  }

  .attempt-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding-bottom: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-secondary);

    .attempt-number {
      font-weight: 600;
      font-family: var(--font-mono);
    }

    .attempt-time {
      margin-left: auto;
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }
  }

  .attempt-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .detail-row {
      display: flex;
      gap: var(--spacing-sm);
      font-size: 0.9rem;
    }
  }

  // Info accordion styles (matching CT log search)
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

        strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  // Port list and code examples styling
  .port-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .port-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--bg-secondary), var(--bg-primary) 50%);
    border-radius: var(--radius-sm);
  }

  .port-number {
    font-size: 1.25rem;
    font-weight: 700;
    font-family: var(--font-mono);
    min-width: 50px;
    text-align: center;
    flex-shrink: 0;
  }

  .port-details {
    flex: 1;

    strong {
      display: block;
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.95rem;
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
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

  .loading-note {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin-top: var(--spacing-xs);
  }

  // Analysis details styling
  .analysis-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--spacing-sm);
    border-radius: var(--radius-sm);

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }

    .detail-row {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
      background: var(--border-primary);
      padding: var(--spacing-sm);
      border-radius: var(--radius-sm);
    }
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-md);
    font-size: var(--font-size-sm);

    @media (max-width: 640px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }
  }

  .detail-label {
    color: var(--color-text-muted);
    font-weight: 500;
    min-width: 70px;
  }

  .detail-value {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-text);
    font-weight: 500;
    flex: 1;
  }
  .examples-card {
    margin-top: var(--spacing-md);
    .example-card {
      flex-direction: column;
      display: flex;
    }
  }
  .lookup-btn {
    margin: 0 auto;
  }

  .success :global(.icon) {
    color: var(--color-success);
  }
  .error :global(.icon) {
    color: var(--color-error);
  }
  .warning :global(.icon) {
    color: var(--color-warning);
  }
  .info :global(.icon) {
    color: var(--color-info);
  }

  .status-item {
    &.success :global(.icon) {
      color: var(--color-success);
    }

    &.error :global(.icon) {
      color: var(--color-error);
    }

    &.info :global(.icon) {
      color: var(--color-info);
    }
  }
</style>
