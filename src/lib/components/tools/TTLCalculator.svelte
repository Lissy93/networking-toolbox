<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { humanizeTTL, calculateCacheExpiry, type TTLInfo } from '$lib/utils/dns-validation.js';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'tools/ttl-calculator');
  });

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
      scenario: $t('examples.useCases.scenarios.loadBalancer'),
      description: $t('examples.useCases.descriptions.loadBalancer'),
    },
    {
      ttl: '3600',
      scenario: $t('examples.useCases.scenarios.webServer'),
      description: $t('examples.useCases.descriptions.webServer'),
    },
    {
      ttl: '86400',
      scenario: $t('examples.useCases.scenarios.mxRecord'),
      description: $t('examples.useCases.descriptions.mxRecord'),
    },
    {
      ttl: '604800',
      scenario: $t('examples.useCases.scenarios.nsRecord'),
      description: $t('examples.useCases.descriptions.nsRecord'),
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
    <h1>{$t('title')}</h1>
    <p>{$t('description')}</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="clock" size="sm" />
        <div>
          <strong>{$t('overview.humanization.title')}</strong>
          {$t('overview.humanization.content')}
        </div>
      </div>
      <div class="overview-item">
        <Icon name="calendar" size="sm" />
        <div>
          <strong>{$t('overview.cacheExpiry.title')}</strong>
          {$t('overview.cacheExpiry.content')}
        </div>
      </div>
      <div class="overview-item">
        <Icon name="target" size="sm" />
        <div>
          <strong>{$t('overview.guidelines.title')}</strong>
          {$t('overview.guidelines.content')}
        </div>
      </div>
    </div>
  </div>

  <!-- Common TTLs -->
  <div class="card common-ttls-card">
    <details class="common-details">
      <summary class="common-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('examples.commonValues.title')}</h4>
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
        <h4>{$t('examples.useCases.title')}</h4>
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
      <label for="ttl-input" use:tooltip={$t('input.tooltip')}>
        <Icon name="clock" size="sm" />
        {$t('input.label')}
      </label>
      <input
        id="ttl-input"
        type="number"
        bind:value={ttlInput}
        oninput={handleInputChange}
        placeholder={$t('input.placeholder')}
        class="ttl-input"
        min="0"
        max="2147483647"
      />
    </div>

    <!-- Custom Date Toggle -->
    <div class="input-group">
      <label class="checkbox-label">
        <input type="checkbox" class="styled-checkbox" bind:checked={useCustomDate} onchange={handleInputChange} />
        {$t('input.customDateLabel')}
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
        <h3>{$t('results.title')}</h3>
        <button class="copy-button {clipboard.isCopied() ? 'copied' : ''}" onclick={() => clipboard.copy(ttlInput)}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
          {$t('results.copyTTL')}
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
            <span class="seconds-label">{$t('results.secondsLabel')}</span>
          </div>
        </div>
      </div>

      <!-- Cache Expiry Times -->
      <div class="expiry-section">
        <h4>{$t('results.cacheExpiry')}</h4>

        <div class="expiry-cards">
          <div class="expiry-card">
            <div class="expiry-label">
              <Icon name="clock" size="sm" />
              {$t('results.fromNow')}
            </div>
            <div class="expiry-time">{formatDateTime(results.expiryFromNow)}</div>
            <div class="expiry-relative">{formatRelativeTime(results.expiryFromNow)}</div>
          </div>

          {#if useCustomDate && results.expiryFromCustom}
            <div class="expiry-card">
              <div class="expiry-label">
                <Icon name="calendar" size="sm" />
                {$t('results.fromCustomDate')}
              </div>
              <div class="expiry-time">{formatDateTime(results.expiryFromCustom)}</div>
              <div class="expiry-relative">{formatRelativeTime(results.expiryFromCustom)}</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Recommendations -->
      <div class="recommendations-section">
        <h4>{$t('results.summary')}</h4>
        <ul class="recommendations-list">
          {#each results.ttlInfo.recommendations as recommendation, index (index)}
            <li class="recommendation-item">{recommendation}</li>
          {/each}
        </ul>
      </div>

      <!-- TTL Guidelines -->
      <div class="guidelines-section">
        <h4>{$t('results.guidelinesTitle')}</h4>
        <div class="guidelines-grid">
          <div class="guideline-item">
            <div class="guideline-category very-short">{$t('guidelines.veryShort.label')}</div>
            <div class="guideline-text">{$t('guidelines.veryShort.description')}</div>
          </div>
          <div class="guideline-item">
            <div class="guideline-category short">{$t('guidelines.short.label')}</div>
            <div class="guideline-text">{$t('guidelines.short.description')}</div>
          </div>
          <div class="guideline-item">
            <div class="guideline-category medium">{$t('guidelines.medium.label')}</div>
            <div class="guideline-text">{$t('guidelines.medium.description')}</div>
          </div>
          <div class="guideline-item">
            <div class="guideline-category long">{$t('guidelines.long.label')}</div>
            <div class="guideline-text">{$t('guidelines.long.description')}</div>
          </div>
          <div class="guideline-item">
            <div class="guideline-category very-long">{$t('guidelines.veryLong.label')}</div>
            <div class="guideline-text">{$t('guidelines.veryLong.description')}</div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>{$t('education.tradeoffs.title')}</h4>
        <p>
          {$t('education.tradeoffs.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.cacheBehavior.title')}</h4>
        <p>
          {$t('education.cacheBehavior.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.changePlanning.title')}</h4>
        <p>
          {$t('education.changePlanning.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.monitoringImpact.title')}</h4>
        <p>
          {$t('education.monitoringImpact.content')}
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
