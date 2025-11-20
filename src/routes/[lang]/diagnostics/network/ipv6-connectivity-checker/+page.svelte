<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { ipv6ConnectivityContent as content } from '$lib/content/ipv6-connectivity';
  import '../../../../../styles/diagnostics-pages.scss';

  interface ConnectivityTest {
    protocol: 'IPv4' | 'IPv6';
    success: boolean;
    ip?: string;
    latency?: number;
    error?: string;
  }

  interface ConnectivityResponse {
    ipv4: ConnectivityTest;
    ipv6: ConnectivityTest;
    dualStack: boolean;
    preferredProtocol?: 'IPv4' | 'IPv6';
    timestamp: string;
  }

  let loading = $state(false);
  let results = $state<ConnectivityResponse | null>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);

  async function testConnectivity() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/ipv6-connectivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || 'Test failed');
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  async function copyResults() {
    if (!results) return;

    let text = `IPv6 Connectivity Test\nGenerated at: ${results.timestamp}\n\n`;
    text += `IPv4: ${results.ipv4.success ? 'Connected' : 'Not Available'}\n`;
    if (results.ipv4.success) {
      text += `  IP: ${results.ipv4.ip}\n`;
      text += `  Latency: ${results.ipv4.latency}ms\n`;
    }
    text += `\nIPv6: ${results.ipv6.success ? 'Connected' : 'Not Available'}\n`;
    if (results.ipv6.success) {
      text += `  IP: ${results.ipv6.ip}\n`;
      text += `  Latency: ${results.ipv6.latency}ms\n`;
    }
    text += `\nDual-Stack: ${results.dualStack ? 'Yes' : 'No'}\n`;
    if (results.preferredProtocol) {
      text += `Preferred Protocol: ${results.preferredProtocol}\n`;
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{content.title}</h1>
    <p>{content.description}</p>
  </header>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Connectivity Test</h3>
    </div>
    <div class="card-content">
      <div class="lookup-form">
        <button class="lookup-btn" onclick={testConnectivity} disabled={loading}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Testing...
          {:else}
            <Icon name="network" size="sm" />
            Test IPv6 Connectivity
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Error -->
  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-message">
          <Icon name="alert-circle" size="md" />
          <span>{error}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>Connectivity Results</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <Icon name={copiedState ? 'check' : 'copy'} size="xs" />
          {copiedState ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- Status Overview -->
        <div class="status-overview">
          <div class="status-item {results.dualStack ? 'success' : 'warning'}">
            <Icon name={results.dualStack ? 'check-circle' : 'alert-circle'} size="md" />
            <div>
              <h4>{results.dualStack ? 'Dual-Stack Available' : 'Single Protocol Only'}</h4>
              <p>
                {results.dualStack
                  ? 'Both IPv4 and IPv6 connectivity are available'
                  : results.ipv4.success
                    ? 'Only IPv4 connectivity is available'
                    : results.ipv6.success
                      ? 'Only IPv6 connectivity is available'
                      : 'No connectivity detected'}
              </p>
            </div>
          </div>
        </div>

        <!-- Results Grid -->
        <div class="results-grid">
          <!-- IPv4 -->
          <div class="result-card">
            <h4>
              <Icon name="network" size="sm" />
              IPv4 Connectivity
            </h4>
            <div class="connectivity-status {results.ipv4.success ? 'success' : 'error'}">
              <Icon name={results.ipv4.success ? 'check-circle' : 'x-circle'} size="md" />
              <span>{results.ipv4.success ? 'Connected' : 'Not Available'}</span>
            </div>
            {#if results.ipv4.success}
              <div class="info-list">
                <div class="info-item">
                  <Icon name="globe" size="sm" />
                  <div class="info-content">
                    <span class="info-label">IP Address</span>
                    <span class="info-value">{results.ipv4.ip}</span>
                  </div>
                </div>
                <div class="info-item">
                  <Icon name="clock" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Latency</span>
                    <span class="info-value">{results.ipv4.latency}ms</span>
                  </div>
                </div>
              </div>
            {:else if results.ipv4.error && results.ipv4.error !== 'fetch failed'}
              <div class="error-text">{results.ipv4.error}</div>
            {:else}
              <div class="error-text">No IPv4 connectivity available</div>
            {/if}
          </div>

          <!-- IPv6 -->
          <div class="result-card">
            <h4>
              <Icon name="network" size="sm" />
              IPv6 Connectivity
            </h4>
            <div class="connectivity-status {results.ipv6.success ? 'success' : 'error'}">
              <Icon name={results.ipv6.success ? 'check-circle' : 'x-circle'} size="md" />
              <span>{results.ipv6.success ? 'Connected' : 'Not Available'}</span>
            </div>
            {#if results.ipv6.success}
              <div class="info-list">
                <div class="info-item">
                  <Icon name="globe" size="sm" />
                  <div class="info-content">
                    <span class="info-label">IP Address</span>
                    <span class="info-value">{results.ipv6.ip}</span>
                  </div>
                </div>
                <div class="info-item">
                  <Icon name="clock" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Latency</span>
                    <span class="info-value">{results.ipv6.latency}ms</span>
                  </div>
                </div>
              </div>
            {:else if results.ipv6.error && results.ipv6.error !== 'fetch failed'}
              <div class="error-text">{results.ipv6.error}</div>
            {:else}
              <div class="error-text">No IPv6 connectivity available</div>
            {/if}
          </div>

          <!-- Summary -->
          {#if results.dualStack}
            <div class="result-card">
              <h4>
                <Icon name="info" size="sm" />
                Connection Summary
              </h4>
              <div class="info-list">
                <div class="info-item">
                  <Icon name="check-circle" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Dual-Stack</span>
                    <span class="info-value success">Enabled</span>
                  </div>
                </div>
                {#if results.preferredProtocol}
                  <div class="info-item">
                    <Icon name="zap" size="sm" />
                    <div class="info-content">
                      <span class="info-label">Preferred Protocol</span>
                      <span class="info-value preferred">{results.preferredProtocol}</span>
                    </div>
                  </div>
                  <div class="info-note">
                    <Icon name="info" size="xs" />
                    Based on latency comparison
                  </div>
                {/if}
                <div class="info-item">
                  <Icon name="clock" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Tested At</span>
                    <span class="info-value">{new Date(results.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Info Sections -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About IPv6 Connectivity</h3>
    </div>
    <div class="card-content">
      <section>
        <h4>{content.sections.whatIsIPv6.title}</h4>
        <p>{content.sections.whatIsIPv6.content}</p>
      </section>

      <hr />

      <section>
        <h4>{content.sections.dualStack.title}</h4>
        <p>{content.sections.dualStack.content}</p>
        <ul>
          {#each content.sections.dualStack.benefits as { benefit, description } (benefit)}
            <li><strong>{benefit}:</strong> {description}</li>
          {/each}
        </ul>
      </section>

      <hr />

      <section>
        <h4>{content.sections.ipv6Advantages.title}</h4>
        <ul>
          {#each content.sections.ipv6Advantages.advantages as { advantage, description } (advantage)}
            <li><strong>{advantage}:</strong> {description}</li>
          {/each}
        </ul>
      </section>

      <hr />

      <section>
        <h4>Quick Tips</h4>
        <ul>
          {#each content.quickTips as tip (tip)}
            <li>{tip}</li>
          {/each}
        </ul>
      </section>
    </div>
  </div>
</div>

<style lang="scss">
  .connectivity-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-lg);
    font-weight: 600;

    &.success {
      background: var(--color-success-bg);
      color: var(--color-success);
    }

    &.error {
      background: var(--color-error-bg);
      color: var(--color-error);
    }
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .info-item {
    display: flex;
    align-items: flex-start;
    flex-direction: row;
    gap: var(--spacing-sm);
  }

  .info-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .info-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .info-value {
    font-family: var(--font-mono);
    color: var(--color-text);
    font-weight: 500;

    &.success {
      color: var(--color-success);
      font-weight: 600;
    }

    &.preferred {
      color: var(--color-primary);
      font-weight: 600;
    }
  }

  .info-note {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: var(--color-surface);
    border-radius: var(--border-radius);
    font-size: 0.9rem;
    color: var(--color-text-muted);
    margin-top: var(--spacing-xs);
  }

  .error-text {
    color: var(--color-error);
    font-style: italic;
    padding: var(--spacing-sm);
    background: var(--color-error-bg);
    border-radius: var(--border-radius);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--color-error);
    font-weight: 500;
  }

  .result-card {
    background: var(--border-primary);
    padding: var(--spacing-md);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
  }

  .card-content {
    ul {
      list-style-type: disc;
      padding-left: var(--spacing-lg);
      margin-top: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }
  }
</style>
