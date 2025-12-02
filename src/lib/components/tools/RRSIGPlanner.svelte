<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'tools/rrsig-planner');
  });
  import {
    suggestRRSIGWindows,
    formatRRSIGDates,
    validateRRSIGTiming,
    type RRSIGPlanningOptions,
    type RRSIGWindow as _RRSIGWindow,
  } from '$lib/utils/dnssec';

  let ttl = $state(3600);
  let desiredOverlap = $state(24);
  let renewalLeadTime = $state(24);
  let clockSkew = $state(1);
  let signatureValidityDays = $state(30);

  const clipboard = useClipboard();

  const planningOptions = $derived({
    ttl,
    desiredOverlap,
    renewalLeadTime,
    clockSkew,
    signatureValidityDays,
  } as RRSIGPlanningOptions);

  const windows = $derived(suggestRRSIGWindows(planningOptions));
  const currentWindow = $derived(windows?.[0] || null);
  const nextWindow = $derived(windows?.[1] || null);

  const currentWindowFormatted = $derived(currentWindow ? formatRRSIGDates(currentWindow) : null);

  const nextWindowFormatted = $derived(nextWindow ? formatRRSIGDates(nextWindow) : null);

  const currentValidation = $derived(currentWindow ? validateRRSIGTiming(currentWindow, ttl) : null);

  function copyCurrentWindow() {
    if (!currentWindowFormatted) return;
    const text = $t('copyTemplates.single', {
      inception: currentWindowFormatted.inceptionFormatted,
      inceptionTimestamp: currentWindowFormatted.inceptionTimestamp,
      expiration: currentWindowFormatted.expirationFormatted,
      expirationTimestamp: currentWindowFormatted.expirationTimestamp,
      renewal: currentWindowFormatted.renewalFormatted,
    });
    clipboard.copy(text, 'current');
  }

  function copyBothWindows() {
    if (!currentWindowFormatted || !nextWindowFormatted) return;
    const text = $t('copyTemplates.schedule', {
      currentInception: currentWindowFormatted.inceptionFormatted,
      currentInceptionTimestamp: currentWindowFormatted.inceptionTimestamp,
      currentExpiration: currentWindowFormatted.expirationFormatted,
      currentExpirationTimestamp: currentWindowFormatted.expirationTimestamp,
      currentRenewal: currentWindowFormatted.renewalFormatted,
      nextInception: nextWindowFormatted.inceptionFormatted,
      nextInceptionTimestamp: nextWindowFormatted.inceptionTimestamp,
      nextExpiration: nextWindowFormatted.expirationFormatted,
      nextExpirationTimestamp: nextWindowFormatted.expirationTimestamp,
      nextRenewal: nextWindowFormatted.renewalFormatted,
    });
    clipboard.copy(text, 'both');
  }

  function formatDuration(hours: number): string {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
  }

  const isValidTTL = $derived(() => ttl > 0 && ttl <= 86400);
  const isValidOverlap = $derived(() => desiredOverlap > 0 && desiredOverlap <= 168);
  const isValidLeadTime = $derived(() => renewalLeadTime > 0 && renewalLeadTime <= 168);
  const isValidClockSkew = $derived(() => clockSkew >= 0 && clockSkew <= 24);
  const isValidityDays = $derived(() => signatureValidityDays > 0 && signatureValidityDays <= 365);
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('title')}</h1>
    <p>
      {$t('description')}
    </p>
  </header>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="input-grid">
      <div class="form-group">
        <label for="ttl">
          <Icon name="clock" size="sm" />
          {$t('form.ttl.label')}
        </label>
        <input
          id="ttl"
          type="number"
          bind:value={ttl}
          min="1"
          max="86400"
          class="number-input {!isValidTTL ? 'invalid' : ''}"
        />
        {#if !isValidTTL}
          <p class="field-error">{$t('form.ttl.error')}</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="overlap">
          <Icon name="overlap" size="sm" />
          {$t('form.overlap.label')}
        </label>
        <input
          id="overlap"
          type="number"
          bind:value={desiredOverlap}
          min="1"
          max="168"
          class="number-input {!isValidOverlap ? 'invalid' : ''}"
        />
        {#if !isValidOverlap}
          <p class="field-error">{$t('form.overlap.error')}</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="lead-time">
          <Icon name="timer" size="sm" />
          {$t('form.leadTime.label')}
        </label>
        <input
          id="lead-time"
          type="number"
          bind:value={renewalLeadTime}
          min="1"
          max="168"
          class="number-input {!isValidLeadTime ? 'invalid' : ''}"
        />
        {#if !isValidLeadTime}
          <p class="field-error">{$t('form.leadTime.error')}</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="clock-skew">
          <Icon name="clock" size="sm" />
          {$t('form.clockSkew.label')}
        </label>
        <input
          id="clock-skew"
          type="number"
          bind:value={clockSkew}
          min="0"
          max="24"
          step="0.5"
          class="number-input {!isValidClockSkew ? 'invalid' : ''}"
        />
        {#if !isValidClockSkew}
          <p class="field-error">{$t('form.clockSkew.error')}</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="validity-days">
          <Icon name="calendar" size="sm" />
          {$t('form.validityDays.label')}
        </label>
        <input
          id="validity-days"
          type="number"
          bind:value={signatureValidityDays}
          min="1"
          max="365"
          class="number-input {!isValidityDays ? 'invalid' : ''}"
        />
        {#if !isValidityDays}
          <p class="field-error">{$t('form.validityDays.error')}</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Timing Warnings -->
  {#if currentValidation && currentValidation.warnings.length > 0}
    <div class="card warning-card">
      <div class="warning-content">
        <Icon name="alert-triangle" size="sm" />
        <div>
          <strong>{$t('warnings.title')}</strong>
          <ul class="warning-list">
            {#each currentValidation.warnings as warning, index (index)}
              <li>{warning}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  {/if}

  <!-- Signature Windows -->
  <div class="windows-section">
    <div class="windows-grid">
      <!-- Current Window -->
      <div class="card window-card">
        <div class="window-header">
          <h3>{$t('windows.current.title')}</h3>
          <button class="copy-button {clipboard.isCopied('current') ? 'copied' : ''}" onclick={copyCurrentWindow}>
            <Icon name={clipboard.isCopied('current') ? 'check' : 'copy'} size="sm" />
            {$t('windows.current.copy')}
          </button>
        </div>

        {#if currentWindowFormatted}
          <div class="window-content">
            <div class="timing-item inception">
              <div class="timing-header">
                <Icon name="play" size="sm" />
                <span class="timing-label">{$t('windows.timing.inception')}</span>
              </div>
              <div class="timing-value mono">{currentWindowFormatted.inceptionFormatted}</div>
              <div class="timing-readable">{currentWindowFormatted.inceptionTimestamp}</div>
            </div>

            <div class="timing-item expiration">
              <div class="timing-header">
                <Icon name="stop" size="sm" />
                <span class="timing-label">{$t('windows.timing.expiration')}</span>
              </div>
              <div class="timing-value mono">{currentWindowFormatted.expirationFormatted}</div>
              <div class="timing-readable">{currentWindowFormatted.expirationTimestamp}</div>
            </div>

            <div class="timing-item renewal">
              <div class="timing-header">
                <Icon name="refresh" size="sm" />
                <span class="timing-label">{$t('windows.timing.renewal')}</span>
              </div>
              <div class="timing-value mono">{currentWindowFormatted.renewalFormatted}</div>
              <div class="timing-note">{$t('windows.timing.renewalNote')}</div>
            </div>

            <div class="metrics-grid">
              <div class="metric-item">
                <span class="metric-label">{$t('windows.metrics.validityPeriod')}</span>
                <span class="metric-value">{formatDuration(currentWindow.validity)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">{$t('windows.metrics.leadTime')}</span>
                <span class="metric-value">{formatDuration(currentWindow.leadTime)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">{$t('windows.metrics.overlapPeriod')}</span>
                <span class="metric-value">{formatDuration(desiredOverlap)}</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Next Window -->
      <div class="card window-card">
        <div class="window-header">
          <h3>{$t('windows.next.title')}</h3>
        </div>

        {#if nextWindowFormatted}
          <div class="window-content">
            <div class="timing-item inception">
              <div class="timing-header">
                <Icon name="play" size="sm" />
                <span class="timing-label">{$t('windows.timing.nextInception')}</span>
              </div>
              <div class="timing-value mono">{nextWindowFormatted.inceptionFormatted}</div>
              <div class="timing-readable">{nextWindowFormatted.inceptionTimestamp}</div>
            </div>

            <div class="timing-item expiration">
              <div class="timing-header">
                <Icon name="stop" size="sm" />
                <span class="timing-label">{$t('windows.timing.nextExpiration')}</span>
              </div>
              <div class="timing-value mono">{nextWindowFormatted.expirationFormatted}</div>
              <div class="timing-readable">{nextWindowFormatted.expirationTimestamp}</div>
            </div>

            <div class="timing-item renewal">
              <div class="timing-header">
                <Icon name="refresh" size="sm" />
                <span class="timing-label">{$t('windows.timing.followingRenewal')}</span>
              </div>
              <div class="timing-value mono">{nextWindowFormatted.renewalFormatted}</div>
            </div>

            <div class="copy-schedule-section">
              <button class="copy-button {clipboard.isCopied('both') ? 'copied' : ''}" onclick={copyBothWindows}>
                <Icon name={clipboard.isCopied('both') ? 'check' : 'copy'} size="sm" />
                {$t('windows.next.copySchedule')}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Implementation Guidelines -->
  <div class="card guidelines-card">
    <div class="card-section-header">
      <h3>{$t('guidelines.title')}</h3>
    </div>
    <div class="guidelines-content">
      <div class="guideline-section">
        <h4>{$t('guidelines.automation.title')}</h4>
        <ul class="guideline-list">
          <li>{$t('guidelines.automation.monitor')}</li>
          <li>{$t('guidelines.automation.generate', { leadTime: formatDuration(renewalLeadTime) })}</li>
          <li>{$t('guidelines.automation.maintain', { overlap: formatDuration(desiredOverlap) })}</li>
          <li>{$t('guidelines.automation.account', { clockSkew: clockSkew })}</li>
        </ul>
      </div>
      <div class="guideline-section">
        <h4>{$t('guidelines.bestPractices.title')}</h4>
        <ul class="guideline-list">
          <li>{$t('guidelines.bestPractices.test')}</li>
          <li>{$t('guidelines.bestPractices.monitor')}</li>
          <li>{$t('guidelines.bestPractices.backup')}</li>
          <li>{$t('guidelines.bestPractices.log')}</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>{$t('education.timing.title')}</h4>
        <p>
          {$t('education.timing.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.overlap.title')}</h4>
        <p>
          {$t('education.overlap.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.clockSkew.title')}</h4>
        <p>
          {$t('education.clockSkew.content')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('education.automation.title')}</h4>
        <p>
          {$t('education.automation.content')}
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .card {
    width: 100%;
  }

  .input-card {
    margin-bottom: var(--spacing-lg);
    background: var(--bg-tertiary);
  }

  .input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .number-input {
    width: 100%;
    font-family: var(--font-mono);

    &.invalid {
      border-color: var(--color-error);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-error), transparent 80%);
    }
  }

  .field-error {
    color: var(--color-error);
    font-size: var(--font-size-xs);
    margin-top: var(--spacing-xs);
    margin-bottom: 0;
  }

  .warning-card {
    margin-bottom: var(--spacing-lg);
    border-color: var(--color-warning);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-warning), transparent 95%),
      color-mix(in srgb, var(--color-warning), transparent 98%)
    );
  }

  .warning-content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-primary);

    strong {
      color: var(--text-primary);
    }
  }

  .warning-list {
    list-style: disc;
    padding-left: var(--spacing-md);
    margin: var(--spacing-xs) 0 0 0;
  }

  .windows-section {
    margin-bottom: var(--spacing-lg);
  }

  .windows-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: var(--spacing-lg);

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  .window-card {
    background: var(--bg-tertiary);
    margin-bottom: 0;
  }

  .window-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    h3 {
      margin: 0;
      color: var(--text-primary);
    }
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--surface-hover);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .window-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .timing-item {
    padding: var(--spacing-md);
    border-radius: var(--radius-md);

    &.inception {
      background-color: color-mix(in srgb, var(--color-success), transparent 95%);
      border: 1px solid color-mix(in srgb, var(--color-success), transparent 80%);
    }

    &.expiration {
      background-color: color-mix(in srgb, var(--color-error), transparent 95%);
      border: 1px solid color-mix(in srgb, var(--color-error), transparent 80%);
    }

    &.renewal {
      background-color: color-mix(in srgb, var(--color-warning), transparent 95%);
      border: 1px solid color-mix(in srgb, var(--color-warning), transparent 80%);
    }
  }

  .timing-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }

  .timing-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .timing-value {
    font-size: var(--font-size-md);
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);

    &.mono {
      font-family: var(--font-mono);
    }
  }

  .timing-readable {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .timing-note {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-style: italic;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
  }

  .metric-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    text-align: center;
  }

  .metric-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .metric-value {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .copy-schedule-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-md);
  }

  .guidelines-card {
    background: var(--bg-tertiary);
    margin-bottom: var(--spacing-lg);
  }

  .card-section-header {
    margin-bottom: var(--spacing-md);

    h3 {
      margin: 0;
      color: var(--text-primary);
    }
  }

  .guidelines-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .guideline-section {
    h4 {
      margin-bottom: var(--spacing-sm);
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .guideline-list {
    list-style: disc;
    padding-left: var(--spacing-md);
    margin: 0;

    li {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xs);
      line-height: 1.4;
    }
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
    .windows-grid {
      grid-template-columns: 1fr;
    }

    .metrics-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
