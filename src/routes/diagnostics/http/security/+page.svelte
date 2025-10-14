<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { formatDNSError } from '$lib/utils/dns-validation.js';
  import '../../../../styles/diagnostics-pages.scss';

  let url = $state('https://github.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);

  const examples = [
    { url: 'https://github.com', description: 'GitHub security headers' },
    { url: 'https://www.cloudflare.com', description: 'Cloudflare security setup' },
    {
      url: 'https://httpbin.org/response-headers?Strict-Transport-Security=max-age=31536000',
      description: 'Example with HSTS',
    },
    { url: 'https://example.com', description: 'Basic site (minimal headers)' },
  ];

  // Reactive validation
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

  async function analyzeSecurity() {
    loading = true;
    error = null;
    results = null;

    // Validation
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      error = 'URL is required';
      loading = false;
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      error = 'Invalid URL format';
      loading = false;
      return;
    }

    try {
      const response = await fetch('/api/internal/diagnostics/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'security',
          url: trimmedUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Security analysis failed (${response.status})`;

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) errorMessage = errorData.message;
        } catch {
          // Ignore JSON parse errors, use default message
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

  function loadExample(example: (typeof examples)[0]) {
    url = example.url;
    analyzeSecurity();
  }

  async function copyResults() {
    if (!results?.analysis) return;

    let text = `Security Headers Analysis\nURL: ${results.url}\nStatus: ${results.status}\n\n`;

    text += 'Security Headers Found:\n';
    Object.entries(results.headers || {}).forEach(([key, value]) => {
      text += `${key}: ${value}\n`;
    });

    text += '\nSecurity Analysis:\n';
    (results as { analysis: Array<{ header: string; message: string; recommendation?: string }> }).analysis.forEach(
      (item) => {
        text += `• ${item.header}: ${item.message}\n`;
        if (item.recommendation) {
          text += `  Recommendation: ${item.recommendation}\n`;
        }
      },
    );

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }

  function getAnalysisClass(status: string): string {
    switch (status) {
      case 'present':
        return 'success';
      case 'weak':
        return 'warning';
      case 'missing':
        return 'error';
      default:
        return '';
    }
  }

  function getAnalysisIcon(status: string): string {
    switch (status) {
      case 'present':
        return 'shield-check';
      case 'weak':
        return 'alert-triangle';
      case 'missing':
        return 'shield-x';
      default:
        return 'shield';
    }
  }

  function getOverallScore(): { score: number; grade: string; class: string } {
    if (!results?.analysis) return { score: 0, grade: 'F', class: 'error' };

    const total = results.analysis.length;
    const present = (results as { analysis: Array<{ status: string }> }).analysis.filter(
      (a) => a.status === 'present',
    ).length;
    const weak = (results as { analysis: Array<{ status: string }> }).analysis.filter(
      (a) => a.status === 'weak',
    ).length;

    const score = Math.round(((present + weak * 0.5) / total) * 100);

    let grade: string;
    let className: string;

    if (score >= 90) {
      grade = 'A';
      className = 'success';
    } else if (score >= 80) {
      grade = 'B';
      className = 'success';
    } else if (score >= 70) {
      grade = 'C';
      className = 'warning';
    } else if (score >= 60) {
      grade = 'D';
      className = 'warning';
    } else {
      grade = 'F';
      className = 'error';
    }

    return { score, grade, class: className };
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>HTTP Security Headers Analyzer</h1>
    <p>
      Analyze and evaluate security headers to identify potential vulnerabilities and security improvements. Check for
      HSTS, CSP, XSS protection, and other essential security headers.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Security Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (index)}
          <button class="example-card" onclick={() => loadExample(example)}>
            <h5>{example.url}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Security Analysis</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="url" use:tooltip={'Enter the URL to analyze security headers for'}>
          URL
          <input
            id="url"
            type="url"
            bind:value={url}
            placeholder="https://example.com"
            class:invalid={url && !isInputValid()}
            onchange={() => {
              if (isInputValid()) analyzeSecurity();
            }}
          />
          {#if url && !isInputValid()}
            <span class="error-text">Invalid URL format</span>
          {/if}
        </label>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={analyzeSecurity} disabled={loading || !isInputValid}>
          {#if loading}
            <Icon name="loader-2" size="sm" animate="spin" />
            Analyzing Security...
          {:else}
            <Icon name="shield" size="sm" />
            Analyze Security Headers
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    {@const overallScore = getOverallScore()}
    <div class="card results-card">
      <div class="card-header">
        <h3>Security Headers Analysis</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? 'Copied!' : 'Copy Analysis'}
        </button>
      </div>
      <div class="card-content">
        <!-- Security Score -->
        <div class="status-overview">
          <div class="status-item {overallScore.class}">
            <Icon name="shield" size="sm" />
            <div>
              <strong>Grade {overallScore.grade}</strong>
              <div class="status-text">Security Score: {overallScore.score}%</div>
            </div>
          </div>

          <div class="status-item">
            <Icon name="check-circle" size="sm" />
            <div>
              <strong
                >{(results as { analysis?: Array<{ status: string }> })?.analysis?.filter((a) => a.status === 'present')
                  .length || 0}</strong
              >
              <div class="status-text">Headers Present</div>
            </div>
          </div>

          <div class="status-item">
            <Icon name="alert-triangle" size="sm" />
            <div>
              <strong
                >{(results as { analysis?: Array<{ status: string }> })?.analysis?.filter((a) => a.status === 'missing')
                  .length || 0}</strong
              >
              <div class="status-text">Headers Missing</div>
            </div>
          </div>
        </div>

        <!-- Security Analysis -->
        <div class="record-section">
          <h4>Security Header Analysis</h4>
          <div class="security-analysis">
            {#each results.analysis as analysis, index (index)}
              <div class="analysis-item {getAnalysisClass(analysis.status)}">
                <div class="analysis-header">
                  <div class="analysis-status">
                    <Icon name={getAnalysisIcon(analysis.status)} size="sm" />
                    <strong>{analysis.header}</strong>
                  </div>
                  <div class="analysis-badge {getAnalysisClass(analysis.status)}">
                    {analysis.status}
                  </div>
                </div>
                <div class="analysis-message">{analysis.message}</div>
                {#if analysis.recommendation}
                  <div class="analysis-recommendation">
                    <Icon name="lightbulb" size="xs" />
                    {analysis.recommendation}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Present Headers -->
        {#if Object.keys(results.headers || {}).length > 0}
          <div class="record-section">
            <h4>Security Headers Found</h4>
            <div class="records-list">
              {#each Object.entries(results.headers) as [name, value], index (index)}
                <div class="record-item">
                  <div class="record-data">
                    <strong>{name}:</strong>
                    {value}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="no-records">
            <Icon name="shield-x" size="md" />
            <p>No security headers found</p>
            <p class="help-text">This site may be vulnerable to various attacks</p>
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
            <strong>Security Analysis Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About Security Headers</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>Critical Headers</h4>
          <ul>
            <li><strong>Strict-Transport-Security:</strong> Forces HTTPS connections</li>
            <li><strong>Content-Security-Policy:</strong> Prevents XSS and injection attacks</li>
            <li><strong>X-Frame-Options:</strong> Prevents clickjacking attacks</li>
            <li><strong>X-Content-Type-Options:</strong> Prevents MIME sniffing</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Additional Protection</h4>
          <ul>
            <li><strong>Referrer-Policy:</strong> Controls referrer information</li>
            <li><strong>Permissions-Policy:</strong> Controls browser features</li>
            <li><strong>Cross-Origin-*:</strong> CORS and isolation policies</li>
            <li><strong>X-XSS-Protection:</strong> Legacy XSS protection</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>Implementation Tips</h4>
          <p>
            Start with basic headers (HSTS, CSP, X-Frame-Options) and gradually add more. Test thoroughly as some
            headers may break functionality if misconfigured.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .security-analysis {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .analysis-item {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    background: var(--bg-secondary);

    &.success {
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

  .analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .analysis-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .analysis-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    text-transform: capitalize;

    &.success {
      background: var(--color-success);
      color: var(--bg-secondary);
    }

    &.warning {
      background: var(--color-warning);
      color: var(--bg-secondary);
    }

    &.error {
      background: var(--color-error);
      color: var(--bg-secondary);
    }
  }

  .analysis-message {
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .analysis-recommendation {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-style: italic;
    padding-top: var(--spacing-xs);
    border-top: 1px solid var(--border-color);
  }

  .error-text {
    color: var(--text-error);
    font-size: var(--font-size-xs);
    margin-top: var(--spacing-xs);
  }

  // Page-specific styles only (common utilities moved to diagnostics-pages.scss)
</style>
