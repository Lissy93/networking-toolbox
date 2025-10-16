<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { humanizeTTL, calculateCacheExpiry, type TTLInfo } from '$lib/utils/dns-validation.js';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';

  let ttlInput = $state('3600');
  let customDate = $state('');
  let useCustomDate = $state(false);
  let activeTTLIndex = $state<number | null>(null);
  let activeExampleIndex = $state<number | null>(null);

  let results = $state<{
    ttlInfo: TTLInfo;
    expiryFromNow: Date;
    expiryFromCustom?: Date;
    customDateValid: boolean;
  } | null>(null);

  const clipboard = useClipboard();

  const commonTTLs = [
    { seconds: 60, label: '1 minute', description: 'Very short - high DNS load' },
    { seconds: 300, label: '5 minutes', description: 'Short - for frequently changing records' },
    { seconds: 600, label: '10 minutes', description: 'Short - development/testing' },
    { seconds: 1800, label: '30 minutes', description: 'Medium-short - moderate changes' },
    { seconds: 3600, label: '1 hour', description: 'Medium - balanced performance' },
    { seconds: 7200, label: '2 hours', description: 'Medium - most web services' },
    { seconds: 14400, label: '4 hours', description: 'Medium-long - stable services' },
    { seconds: 43200, label: '12 hours', description: 'Long - very stable records' },
    { seconds: 86400, label: '1 day', description: 'Long - default for many records' },
    { seconds: 172800, label: '2 days', description: 'Very long - infrastructure records' },
    { seconds: 604800, label: '1 week', description: 'Very long - rarely changing records' },
  ];

  const examples = [
    {
      ttl: '300',
      scenario: 'Load Balancer IP',
      description: 'Short TTL for quick failover capability',
    },
    {
      ttl: '3600',
      scenario: 'Web Server A Record',
      description: 'Standard TTL for web services',
    },
    {
      ttl: '86400',
      scenario: 'MX Record',
      description: 'Stable mail server configuration',
    },
    {
      ttl: '604800',
      scenario: 'NS Record',
      description: 'Authoritative name servers rarely change',
    },
  ];

  function loadExample(example: (typeof examples)[0], index: number) {
    ttlInput = example.ttl;
    activeExampleIndex = index;
    activeTTLIndex = null;
    calculateTTL();
  }

  function loadCommonTTL(ttl: number, index: number) {
    ttlInput = ttl.toString();
    activeTTLIndex = index;
    activeExampleIndex = null;
    calculateTTL();
  }

  function calculateTTL() {
    const ttlSeconds = parseInt(ttlInput);

    if (isNaN(ttlSeconds) || ttlSeconds < 0) {
      results = null;
      return;
    }

    const ttlInfo = humanizeTTL(ttlSeconds);
    const expiryFromNow = calculateCacheExpiry(ttlSeconds);

    let expiryFromCustom: Date | undefined;
    let customDateValid = true;

    if (useCustomDate && customDate) {
      const customDateTime = new Date(customDate);
      if (!isNaN(customDateTime.getTime())) {
        expiryFromCustom = calculateCacheExpiry(ttlSeconds, customDateTime);
      } else {
        customDateValid = false;
      }
    }

    results = {
      ttlInfo,
      expiryFromNow,
      expiryFromCustom,
      customDateValid,
    };
  }

  function formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  }

  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (Math.abs(diffMinutes) < 60) {
      return diffMinutes > 0 ? `in ${diffMinutes} minutes` : `${Math.abs(diffMinutes)} minutes ago`;
    } else if (Math.abs(diffHours) < 24) {
      return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
    } else {
      return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
    }
  }

  function handleInputChange() {
    // Clear active states when user manually changes input
    activeTTLIndex = null;
    activeExampleIndex = null;
    calculateTTL();
  }

  // Calculate on component load
  calculateTTL();
</script>

<div class="card">
  <header class="card-header">
    <h1>TTL Calculator</h1>
    <p>Humanize DNS TTL values and compute cache expiry times from now or specific dates</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="clock" size="sm" />
        <div>
          <strong>TTL Humanization:</strong> Convert seconds to human-readable formats like "2 hours" or "1 day".
        </div>
      </div>
      <div class="overview-item">
        <Icon name="calendar" size="sm" />
        <div>
          <strong>Cache Expiry:</strong> Calculate when DNS records will expire from resolver caches.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="target" size="sm" />
        <div>
          <strong>TTL Guidelines:</strong> Get recommendations based on record stability and use case.
        </div>
      </div>
    </div>
  </div>

  <!-- Common TTLs -->
  <div class="card common-ttls-card">
    <details class="common-details">
      <summary class="common-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Common TTL Values</h4>
      </summary>
      <div class="ttls-grid">
        {#each commonTTLs as ttl, index (ttl.seconds)}
          <button
            class="ttl-card {activeTTLIndex === index ? 'active' : ''}"
            onclick={() => loadCommonTTL(ttl.seconds, index)}
          >
            <div class="ttl-value">{ttl.label}</div>
            <div class="ttl-seconds">{ttl.seconds}s</div>
            <div class="ttl-description">{ttl.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>TTL by Use Case</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (example.scenario)}
          <button
            class="example-card {activeExampleIndex === index ? 'active' : ''}"
            onclick={() => loadExample(example, index)}
          >
            <div class="example-scenario">{example.scenario}</div>
            <div class="example-ttl">{example.ttl} seconds</div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <!-- TTL Input -->
    <div class="input-group">
      <label for="ttl-input" use:tooltip={'Enter TTL value in seconds'}>
        <Icon name="clock" size="sm" />
        TTL (seconds)
      </label>
      <input
        id="ttl-input"
        type="number"
        bind:value={ttlInput}
        oninput={handleInputChange}
        placeholder="3600"
        class="ttl-input"
        min="0"
        max="2147483647"
      />
    </div>

    <!-- Custom Date Toggle -->
    <div class="input-group">
      <label class="checkbox-label">
        <input type="checkbox" class="styled-checkbox" bind:checked={useCustomDate} onchange={handleInputChange} />
        Calculate expiry from custom date/time
      </label>

      {#if useCustomDate}
        <input
          type="datetime-local"
          bind:value={customDate}
          oninput={handleInputChange}
          class="custom-date-input {results && !results.customDateValid ? 'invalid' : ''}"
        />
      {/if}
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="results-header">
        <h3>TTL Analysis</h3>
        <button class="copy-button {clipboard.isCopied() ? 'copied' : ''}" onclick={() => clipboard.copy(ttlInput)}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
          Copy TTL
        </button>
      </div>

      <!-- TTL Information -->
      <div class="ttl-analysis">
        <div class="ttl-main-info">
          <div class="ttl-human">
            <span class="ttl-human-value">{results.ttlInfo.human}</span>
            <span class="ttl-category {results.ttlInfo.category}">{results.ttlInfo.category.replace('-', ' ')}</span>
          </div>
          <div class="ttl-seconds-display">
            <span class="seconds-value">{formatNumber(results.ttlInfo.seconds)}</span>
            <span class="seconds-label">seconds</span>
          </div>
        </div>
      </div>

      <!-- Cache Expiry Times -->
      <div class="expiry-section">
        <h4>Cache Expiry Times</h4>

        <div class="expiry-cards">
          <div class="expiry-card">
            <div class="expiry-label">
              <Icon name="clock" size="sm" />
              From Now
            </div>
            <div class="expiry-time">{formatDateTime(results.expiryFromNow)}</div>
            <div class="expiry-relative">{formatRelativeTime(results.expiryFromNow)}</div>
          </div>

          {#if useCustomDate && results.expiryFromCustom}
            <div class="expiry-card">
              <div class="expiry-label">
                <Icon name="calendar" size="sm" />
                From Custom Date
              </div>
              <div class="expiry-time">{formatDateTime(results.expiryFromCustom)}</div>
              <div class="expiry-relative">{formatRelativeTime(results.expiryFromCustom)}</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Recommendations -->
      <div class="recommendations-section">
        <h4>Summary</h4>
        <ul class="recommendations-list">
          {#each results.ttlInfo.recommendations as recommendation, index (index)}
            <li class="recommendation-item">{recommendation}</li>
          {/each}
        </ul>
      </div>

      <!-- TTL Guidelines -->
      <div class="guidelines-section">
        <h4>TTL Guidelines by Category</h4>
        <div class="guidelines-grid">
          <div class="guideline-item">
            <div class="guideline-category very-short">Very Short (&lt; 5 min)</div>
            <div class="guideline-text">High DNS load, instant propagation</div>
          </div>
          <div class="guideline-item">
            <div class="guideline-category short">Short (5 min - 1 hr)</div>
            <div class="guideline-text">Frequent changes, good for testing</div>
          </div>
          <div class="guideline-item">
            <div class="guideline-category medium">Medium (1 hr - 1 day)</div>
            <div class="guideline-text">Balanced performance and flexibility</div>
          </div>
          <div class="guideline-item">
            <div class="guideline-category long">Long (1 day - 1 week)</div>
            <div class="guideline-text">Stable records, reduced DNS queries</div>
          </div>
          <div class="guideline-item">
            <div class="guideline-category very-long">Very Long (> 1 week)</div>
            <div class="guideline-text">Infrastructure, rarely changes</div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>TTL Trade-offs</h4>
        <p>
          Lower TTLs allow faster propagation of DNS changes but increase DNS query load. Higher TTLs reduce DNS traffic
          but slow down change propagation. Balance based on your needs.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Cache Behavior</h4>
        <p>
          DNS resolvers cache records for the TTL duration. Once expired, they must query authoritative servers again.
          Some resolvers may cache slightly longer or shorter than the exact TTL.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Change Planning</h4>
        <p>
          Before making DNS changes, consider lowering TTLs in advance. This reduces the time users see old records.
          After changes stabilize, you can increase TTLs again.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Monitoring Impact</h4>
        <p>
          Monitor DNS query volumes when changing TTLs. Very short TTLs can significantly increase load on authoritative
          servers and may impact DNS provider costs.
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .info-card {
    margin-bottom: var(--spacing-xl);
  }

  .overview-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .overview-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
    }
  }

  .common-ttls-card,
  .examples-card {
    margin-bottom: var(--spacing-md);
    padding: 0;
  }

  .common-details,
  .examples-details {
    border: none;
    background: none;

    &[open] {
      :global(.icon) {
        transform: rotate(90deg);
      }
    }
  }

  .common-summary,
  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);
    border-radius: var(--radius-md);
    h4 {
      margin: 0;
    }

    &:hover {
      background-color: var(--surface-hover);
    }

    &::-webkit-details-marker {
      display: none;
    }

    :global(.icon) {
      transition: transform var(--transition-fast);
    }
  }

  .ttls-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .ttl-card {
    padding: var(--spacing-sm);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 2px;

    &:hover {
      background-color: var(--surface-hover);
      transform: translateY(-1px);
    }

    &.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
      background-color: var(--surface-hover);
    }
  }

  .ttl-value {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .ttl-seconds {
    font-family: var(--font-mono);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .ttl-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .example-card {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    &:hover {
      background-color: var(--surface-hover);
      transform: translateY(-1px);
    }

    &.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
      background-color: var(--surface-hover);
    }
  }

  .example-scenario {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-ttl {
    font-family: var(--font-mono);
    color: var(--color-primary);
    font-size: var(--font-size-sm);
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .input-card {
    margin-bottom: var(--spacing-xl);
  }

  .input-group {
    margin-bottom: var(--spacing-lg);

    label:not(.checkbox-label) {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    cursor: pointer;
    font-weight: 600;
    color: var(--text-primary);

    .styled-checkbox {
      appearance: none;
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-secondary);
      border-radius: var(--radius-sm);
      background-color: var(--bg-tertiary);
      cursor: pointer;
      position: relative;
      transition: all var(--transition-fast);
      margin: 0;
      flex-shrink: 0;

      &:checked {
        background-color: var(--color-primary);
        border-color: var(--color-primary);

        &::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--bg-secondary);
          font-size: 14px;
          font-weight: bold;
          line-height: 1;
        }
      }

      &:hover {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
      }
    }
  }

  .ttl-input {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-xl);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }
  }

  .custom-date-input {
    width: 100%;
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    margin-top: var(--spacing-sm);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &.invalid {
      border-color: var(--color-error);
    }
  }

  .results-card {
    margin-bottom: var(--spacing-xl);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    h3 {
      margin: 0;
    }
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);

    &:hover {
      background-color: var(--surface-hover);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .ttl-analysis {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-lg);
  }
  .ttl-main-info {
    display: flex;
    justify-content: space-between;
    align-items: center;

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
    }
  }

  .ttl-human {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .ttl-human-value {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .ttl-category {
    font-size: var(--font-size-sm);
    font-weight: 600;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    text-transform: capitalize;

    &.very-short {
      background-color: color-mix(in srgb, var(--color-error), transparent 90%);
      color: var(--color-error);
    }
    &.short {
      background-color: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
    }
    &.medium {
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
    }
    &.long {
      background-color: color-mix(in srgb, var(--color-info), transparent 90%);
      color: var(--color-info);
    }
    &.very-long {
      background-color: color-mix(in srgb, var(--color-accent), transparent 90%);
      color: var(--color-accent);
    }
  }

  .ttl-seconds-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    @media (max-width: 768px) {
      align-items: center;
    }
  }

  .seconds-value {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .seconds-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .expiry-section {
    margin-bottom: var(--spacing-xl);

    h4 {
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .expiry-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .expiry-card {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .expiry-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .expiry-time {
    font-size: var(--font-size-md);
    font-family: var(--font-mono);
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .expiry-relative {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-style: italic;
  }

  .recommendations-section {
    margin-bottom: var(--spacing-xl);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .recommendations-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .recommendation-item {
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-xs);
    background-color: var(--bg-tertiary);
    border-left: 3px solid var(--color-info);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .guidelines-section {
    h4 {
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .guidelines-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-sm);
  }

  .guideline-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .guideline-category {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    text-align: center;

    &.very-short {
      background-color: color-mix(in srgb, var(--color-error), transparent 90%);
      color: var(--color-error);
    }
    &.short {
      background-color: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
    }
    &.medium {
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
    }
    &.long {
      background-color: color-mix(in srgb, var(--color-info), transparent 90%);
      color: var(--color-info);
    }
    &.very-long {
      background-color: color-mix(in srgb, var(--color-accent), transparent 90%);
      color: var(--color-accent);
    }
  }

  .guideline-text {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-align: center;
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .education-item {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);

    h4 {
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
      color: var(--color-primary);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  }

  @media (max-width: 768px) {
    .ttls-grid {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .examples-grid {
      grid-template-columns: 1fr;
    }

    .expiry-cards {
      grid-template-columns: 1fr;
    }

    .guidelines-grid {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
