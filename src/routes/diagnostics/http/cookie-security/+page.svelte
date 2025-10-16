<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://example.com');

  const diagnosticState = useDiagnosticState<any>();

  const examplesList = [
    { url: 'https://github.com', description: 'Excellent security (Score: 91)' },
    { url: 'https://www.cloudflare.com', description: 'Strong security (Score: 90)' },
    { url: 'https://www.paypal.com', description: 'Good security (Score: 80)' },
    { url: 'https://www.ebay.com', description: 'Many cookies (7 cookies, Score: 67)' },
    { url: 'https://www.nytimes.com', description: 'No HttpOnly flags (Score: 59)' },
    { url: 'https://www.apple.com', description: 'Poor security (1 cookie, Score: 37)' },
    { url: 'https://www.linkedin.com', description: 'Large set (7 cookies, Score: 69)' },
    { url: 'https://domain-locker.com', description: 'No cookies found' },
  ];

  const examples = useExamples(examplesList);

  const isInputValid = $derived(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return false;
    try {
      const parsed = new URL(trimmedUrl);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  });

  async function checkCookieSecurity() {
    if (!isInputValid) {
      diagnosticState.setError('Please enter a valid HTTP/HTTPS URL');
      return;
    }

    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cookie-security',
          url: url.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || 'Failed to check cookie security';
        if (errorMessage.includes('Host not found') || errorMessage.includes('ENOTFOUND')) {
          throw new Error('Domain not found. Please check the URL and try again.');
        } else if (errorMessage.includes('Connection refused') || errorMessage.includes('ECONNREFUSED')) {
          throw new Error('Connection refused. The server may be down or unreachable.');
        } else if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          throw new Error('Request timed out. The server may be slow to respond.');
        }
        throw new Error(errorMessage);
      }

      diagnosticState.setResults(data);
    } catch (err) {
      if (err instanceof Error) {
        diagnosticState.setError(err.message);
      } else {
        diagnosticState.setError('An unexpected error occurred. Please try again.');
      }
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    url = example.url;
    examples.select(index);
    checkCookieSecurity();
  }

  function getSecurityIcon(level: string): string {
    switch (level) {
      case 'secure':
        return 'shield-check';
      case 'warning':
        return 'alert-triangle';
      case 'error':
        return 'shield-x';
      default:
        return 'help-circle';
    }
  }

  function getSecurityGrade(score: number | null): { grade: string; color: string } {
    if (score === null) return { grade: 'N/A', color: 'var(--text-secondary)' };
    if (score >= 90) return { grade: 'A+', color: 'var(--color-success)' };
    if (score >= 80) return { grade: 'A', color: 'var(--color-success)' };
    if (score >= 70) return { grade: 'B', color: 'color-mix(in srgb, var(--color-success), var(--color-warning) 30%)' };
    if (score >= 60) return { grade: 'C', color: 'var(--color-warning)' };
    if (score >= 50) return { grade: 'D', color: 'color-mix(in srgb, var(--color-warning), var(--color-error) 30%)' };
    return { grade: 'F', color: 'var(--color-error)' };
  }

  function getSameSiteColor(value: string): string {
    switch (value.toLowerCase()) {
      case 'strict':
        return 'var(--color-success)';
      case 'lax':
        return 'var(--color-warning)';
      case 'none':
        return 'var(--color-error)';
      default:
        return 'var(--color-error)';
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>HTTP Cookie Security Inspector</h1>
    <p>Analyze Set-Cookie headers for Secure, HttpOnly, SameSite, and other security attributes</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title="Cookie Security Examples"
    getLabel={(ex) => ex.url}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Inspect cookies for ${ex.url}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>URL to Inspect</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="url">URL</label>
        <div class="input-flex-container">
          <input
            id="url"
            type="url"
            bind:value={url}
            placeholder="https://example.com"
            disabled={diagnosticState.loading}
            onchange={() => examples.clear()}
            onkeydown={(e) => e.key === 'Enter' && checkCookieSecurity()}
          />
          <button onclick={checkCookieSecurity} disabled={diagnosticState.loading || !isInputValid} class="primary">
            {#if diagnosticState.loading}
              <Icon name="loader" size="sm" animate="spin" />
              Analyzing...
            {:else}
              <Icon name="search" size="sm" />
              Inspect Cookies
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <ErrorCard title="Cookie Inspection Failed" error={diagnosticState.error} />

  {#if diagnosticState.loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Analyzing Cookies</h3>
            <p>Inspecting Set-Cookie headers for security attributes...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header">
        <h3>Cookie Security Analysis</h3>
      </div>
      <div class="card-content">
        <!-- Overall Security Score -->
        <div class="card score-section">
          <div class="card-header">
            <h3>Security Score</h3>
          </div>
          <div class="card-content">
            <div class="score-container">
              <div
                class="score-circle"
                style="--score-color: {getSecurityGrade(diagnosticState.results.securityScore).color}"
              >
                <div class="score-value">{getSecurityGrade(diagnosticState.results.securityScore).grade}</div>
                <div class="score-label">
                  {diagnosticState.results.securityScore !== null
                    ? `${diagnosticState.results.securityScore}/100`
                    : 'No cookies'}
                </div>
              </div>
              <div class="score-summary">
                <h4>Overall Assessment</h4>
                <p>{diagnosticState.results.summary}</p>
                <div class="score-stats">
                  <div class="stat">
                    <span class="stat-label">Total Cookies:</span>
                    <span class="stat-value">{diagnosticState.results.totalCookies}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Secure Cookies:</span>
                    <span class="stat-value">{diagnosticState.results.secureCookies}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">HttpOnly Cookies:</span>
                    <span class="stat-value">{diagnosticState.results.httpOnlyCookies}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cookie Details -->
        {#if diagnosticState.results.cookies && diagnosticState.results.cookies.length > 0}
          <div class="card cookies-section">
            <div class="card-header">
              <h3>Cookie Details</h3>
            </div>
            <div class="card-content">
              <div class="cookies-grid">
                {#each diagnosticState.results.cookies as cookie (cookie.id || cookie.name)}
                  <div
                    class="cookie-card"
                    class:secure={cookie.securityLevel === 'secure'}
                    class:warning={cookie.securityLevel === 'warning'}
                    class:error={cookie.securityLevel === 'error'}
                  >
                    <div class="cookie-header">
                      <div class="cookie-name">
                        <Icon name="cookie" size="sm" />
                        <span class="name">{cookie.name}</span>
                      </div>
                      <div
                        class="cookie-security"
                        class:secure={cookie.securityLevel === 'secure'}
                        class:warning={cookie.securityLevel === 'warning'}
                        class:error={cookie.securityLevel === 'error'}
                      >
                        <Icon name={getSecurityIcon(cookie.securityLevel)} size="xs" />
                        <span class="level">{cookie.securityLevel}</span>
                      </div>
                    </div>

                    <div class="cookie-details">
                      <div class="cookie-value">
                        <span class="detail-label">Value:</span>
                        <span class="detail-value truncated">{cookie.value}</span>
                      </div>

                      <div class="security-attributes">
                        <div class="attribute" class:present={cookie.secure}>
                          <Icon name={cookie.secure ? 'check' : 'x'} size="xs" />
                          <span>Secure</span>
                        </div>
                        <div class="attribute" class:present={cookie.httpOnly}>
                          <Icon name={cookie.httpOnly ? 'check' : 'x'} size="xs" />
                          <span>HttpOnly</span>
                        </div>
                        <div
                          class="attribute samesite"
                          style="--samesite-color: {getSameSiteColor(cookie.sameSite || 'none')}"
                        >
                          <Icon name="shield" size="xs" />
                          <span>SameSite: {cookie.sameSite || 'None'}</span>
                        </div>
                      </div>

                      {#if cookie.domain || cookie.path || cookie.expires || cookie.maxAge}
                        <div class="cookie-metadata">
                          {#if cookie.domain}
                            <div class="metadata-item">
                              <span class="metadata-label">Domain:</span>
                              <span class="metadata-value">{cookie.domain}</span>
                            </div>
                          {/if}
                          {#if cookie.path}
                            <div class="metadata-item">
                              <span class="metadata-label">Path:</span>
                              <span class="metadata-value">{cookie.path}</span>
                            </div>
                          {/if}
                          {#if cookie.expires}
                            <div class="metadata-item">
                              <span class="metadata-label">Expires:</span>
                              <span class="metadata-value">{cookie.expires}</span>
                            </div>
                          {/if}
                          {#if cookie.maxAge}
                            <div class="metadata-item">
                              <span class="metadata-label">Max-Age:</span>
                              <span class="metadata-value">{cookie.maxAge}s</span>
                            </div>
                          {/if}
                        </div>
                      {/if}

                      {#if cookie.issues && cookie.issues.length > 0}
                        <div class="cookie-issues">
                          <h5>Security Issues:</h5>
                          <ul>
                            {#each cookie.issues as issue, issueIndex (issueIndex)}
                              <li class="issue">
                                <Icon name="alert-circle" size="xs" />
                                {issue}
                              </li>
                            {/each}
                          </ul>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {:else}
          <div class="card no-cookies-section">
            <div class="card-content">
              <div class="no-cookies-message">
                <Icon name="cookie" size="lg" />
                <h3>No Cookies Found</h3>
                <p>The server did not send any Set-Cookie headers in the response.</p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Security Recommendations -->
        {#if diagnosticState.results.recommendations && diagnosticState.results.recommendations.length > 0}
          <div class="card recommendations-section">
            <div class="card-header">
              <h3>Security Recommendations</h3>
            </div>
            <div class="card-content">
              <div class="recommendations-list">
                {#each diagnosticState.results.recommendations as recommendation, index (index)}
                  <div class="recommendation-item">
                    <Icon name="lightbulb" size="sm" />
                    <div class="recommendation-content">
                      <h4>{recommendation.title}</h4>
                      <p>{recommendation.description}</p>
                      {#if recommendation.example}
                        <code class="recommendation-example">{recommendation.example}</code>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .score-section,
  .cookies-section,
  .no-cookies-section,
  .recommendations-section {
    background: var(--bg-secondary);
  }

  .score-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
  }

  .score-circle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--score-color), transparent 90%);
    border: 3px solid var(--score-color);
    flex-shrink: 0;
  }

  .score-value {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--score-color);
    line-height: 1;
  }

  .score-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-2xs);
  }

  .score-summary {
    flex: 1;
    min-width: 250px;

    h4 {
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
    }

    p {
      color: var(--text-secondary);
      margin-bottom: var(--spacing-sm);
    }
  }

  .score-stats {
    display: flex;
    gap: var(--spacing-md);
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .cookies-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--spacing-md);
  }

  .cookie-card {
    background: var(--color-surface-elevated);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    transition: all var(--transition-normal);

    &.secure {
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 95%);
    }

    &.warning {
      border-color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
    }

    &.error {
      border-color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 95%);
    }
  }

  .cookie-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .cookie-name {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 600;

    .name {
      font-family: var(--font-mono);
      color: var(--text-primary);
    }
  }

  .cookie-security {
    display: flex;
    align-items: center;
    gap: var(--spacing-2xs);
    font-size: var(--font-size-xs);
    padding: var(--spacing-2xs) var(--spacing-xs);
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    font-weight: 600;

    &.secure {
      color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 90%);
    }

    &.warning {
      color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning), transparent 90%);
    }

    &.error {
      color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 90%);
    }
  }

  .cookie-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .cookie-value {
    display: flex;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);

    .detail-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .detail-value {
      font-family: var(--font-mono);
      color: var(--text-primary);

      &.truncated {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .security-attributes {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .attribute {
    display: flex;
    align-items: center;
    gap: var(--spacing-2xs);
    font-size: var(--font-size-xs);
    padding: var(--spacing-2xs) var(--spacing-xs);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    color: var(--text-secondary);

    &.present {
      color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 90%);
    }

    &.samesite {
      color: var(--samesite-color);
      background: color-mix(in srgb, var(--samesite-color), transparent 90%);
    }
  }

  .cookie-metadata {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
  }

  .metadata-item {
    display: flex;
    gap: var(--spacing-xs);
  }

  .metadata-label {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .metadata-value {
    font-family: var(--font-mono);
    color: var(--text-primary);
  }

  .cookie-issues {
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border: 1px solid color-mix(in srgb, var(--color-error), transparent 80%);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);

    h5 {
      margin-bottom: var(--spacing-xs);
      color: var(--color-error);
      font-size: var(--font-size-sm);
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .issue {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--color-error);
      margin-bottom: var(--spacing-2xs);

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .no-cookies-message {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);

    h3 {
      margin: var(--spacing-sm) 0;
      color: var(--text-primary);
    }
  }

  .recommendations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .recommendation-item {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--color-surface-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-primary);
  }

  .recommendation-content {
    flex: 1;

    h4 {
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-xs);
    }
  }

  .recommendation-example {
    display: block;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    background: var(--bg-primary);
  }

  @media (max-width: 768px) {
    .cookies-grid {
      grid-template-columns: 1fr;
    }

    .score-container {
      flex-direction: column;
      text-align: center;
    }

    .score-stats {
      justify-content: center;
    }

    .security-attributes {
      flex-direction: column;
    }

    .cookie-metadata {
      grid-template-columns: 1fr;
    }
  }
</style>
