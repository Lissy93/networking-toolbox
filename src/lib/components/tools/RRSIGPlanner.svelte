<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
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
    const text = `RRSIG Timing Window:
Inception: ${currentWindowFormatted.inceptionFormatted} (${currentWindowFormatted.inceptionTimestamp})
Expiration: ${currentWindowFormatted.expirationFormatted} (${currentWindowFormatted.expirationTimestamp})
Renewal Time: ${currentWindowFormatted.renewalFormatted}`;
    clipboard.copy(text, 'current');
  }

  function copyBothWindows() {
    if (!currentWindowFormatted || !nextWindowFormatted) return;
    const text = `RRSIG Planning Schedule:

Current Window:
Inception: ${currentWindowFormatted.inceptionFormatted} (${currentWindowFormatted.inceptionTimestamp})
Expiration: ${currentWindowFormatted.expirationFormatted} (${currentWindowFormatted.expirationTimestamp})
Renewal Time: ${currentWindowFormatted.renewalFormatted}

Next Window:
Inception: ${nextWindowFormatted.inceptionFormatted} (${nextWindowFormatted.inceptionTimestamp})
Expiration: ${nextWindowFormatted.expirationFormatted} (${nextWindowFormatted.expirationTimestamp})
Renewal Time: ${nextWindowFormatted.renewalFormatted}`;
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
    <h1>RRSIG Planner</h1>
    <p>
      Suggest RRSIG validity windows (inception/expiration) based on TTLs and desired overlap, with renewal lead-time
      guidance for automated DNSSEC signature management.
    </p>
  </header>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="input-grid">
      <div class="form-group">
        <label for="ttl">
          <Icon name="clock" size="sm" />
          TTL (seconds)
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
          <p class="field-error">TTL must be between 1 and 86400 seconds</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="overlap">
          <Icon name="overlap" size="sm" />
          Desired Overlap (hours)
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
          <p class="field-error">Overlap must be between 1 and 168 hours</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="lead-time">
          <Icon name="timer" size="sm" />
          Renewal Lead Time (hours)
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
          <p class="field-error">Lead time must be between 1 and 168 hours</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="clock-skew">
          <Icon name="clock" size="sm" />
          Clock Skew (hours)
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
          <p class="field-error">Clock skew must be between 0 and 24 hours</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="validity-days">
          <Icon name="calendar" size="sm" />
          Signature Validity (days)
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
          <p class="field-error">Validity must be between 1 and 365 days</p>
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
          <strong>Timing Warnings:</strong>
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
          <h3>Current Signature Window</h3>
          <button class="copy-button {clipboard.isCopied('current') ? 'copied' : ''}" onclick={copyCurrentWindow}>
            <Icon name={clipboard.isCopied('current') ? 'check' : 'copy'} size="sm" />
            Copy
          </button>
        </div>

        {#if currentWindowFormatted}
          <div class="window-content">
            <div class="timing-item inception">
              <div class="timing-header">
                <Icon name="play" size="sm" />
                <span class="timing-label">Inception (Start Time)</span>
              </div>
              <div class="timing-value mono">{currentWindowFormatted.inceptionFormatted}</div>
              <div class="timing-readable">{currentWindowFormatted.inceptionTimestamp}</div>
            </div>

            <div class="timing-item expiration">
              <div class="timing-header">
                <Icon name="stop" size="sm" />
                <span class="timing-label">Expiration (End Time)</span>
              </div>
              <div class="timing-value mono">{currentWindowFormatted.expirationFormatted}</div>
              <div class="timing-readable">{currentWindowFormatted.expirationTimestamp}</div>
            </div>

            <div class="timing-item renewal">
              <div class="timing-header">
                <Icon name="refresh" size="sm" />
                <span class="timing-label">Renewal Time</span>
              </div>
              <div class="timing-value mono">{currentWindowFormatted.renewalFormatted}</div>
              <div class="timing-note">Generate next signatures before this time</div>
            </div>

            <div class="metrics-grid">
              <div class="metric-item">
                <span class="metric-label">Validity Period</span>
                <span class="metric-value">{formatDuration(currentWindow.validity)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Lead Time</span>
                <span class="metric-value">{formatDuration(currentWindow.leadTime)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Overlap Period</span>
                <span class="metric-value">{formatDuration(desiredOverlap)}</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Next Window -->
      <div class="card window-card">
        <div class="window-header">
          <h3>Next Signature Window</h3>
        </div>

        {#if nextWindowFormatted}
          <div class="window-content">
            <div class="timing-item inception">
              <div class="timing-header">
                <Icon name="play" size="sm" />
                <span class="timing-label">Next Inception</span>
              </div>
              <div class="timing-value mono">{nextWindowFormatted.inceptionFormatted}</div>
              <div class="timing-readable">{nextWindowFormatted.inceptionTimestamp}</div>
            </div>

            <div class="timing-item expiration">
              <div class="timing-header">
                <Icon name="stop" size="sm" />
                <span class="timing-label">Next Expiration</span>
              </div>
              <div class="timing-value mono">{nextWindowFormatted.expirationFormatted}</div>
              <div class="timing-readable">{nextWindowFormatted.expirationTimestamp}</div>
            </div>

            <div class="timing-item renewal">
              <div class="timing-header">
                <Icon name="refresh" size="sm" />
                <span class="timing-label">Following Renewal</span>
              </div>
              <div class="timing-value mono">{nextWindowFormatted.renewalFormatted}</div>
            </div>

            <div class="copy-schedule-section">
              <button class="copy-button {clipboard.isCopied('both') ? 'copied' : ''}" onclick={copyBothWindows}>
                <Icon name={clipboard.isCopied('both') ? 'check' : 'copy'} size="sm" />
                Copy Full Schedule
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
      <h3>Implementation Guidelines</h3>
    </div>
    <div class="guidelines-content">
      <div class="guideline-section">
        <h4>Automation Schedule:</h4>
        <ul class="guideline-list">
          <li>Monitor renewal times continuously</li>
          <li>Generate new signatures {formatDuration(renewalLeadTime)} before expiration</li>
          <li>Maintain {formatDuration(desiredOverlap)} overlap period</li>
          <li>Account for {clockSkew}h clock skew tolerance</li>
        </ul>
      </div>
      <div class="guideline-section">
        <h4>Best Practices:</h4>
        <ul class="guideline-list">
          <li>Test signature generation before deployment</li>
          <li>Monitor DNSSEC validation after updates</li>
          <li>Keep backup signatures for rollback</li>
          <li>Log all signature generation events</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>RRSIG Timing</h4>
        <p>
          RRSIG records have inception and expiration timestamps that define when the signature is valid. Proper timing
          ensures continuous DNSSEC validation during key transitions.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Overlap Strategy</h4>
        <p>
          Overlapping signature validity periods prevent validation failures during rollover. New signatures should be
          generated before old ones expire.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Clock Skew Tolerance</h4>
        <p>
          Account for time differences between authoritative servers and validators. Start signatures slightly in the
          past to accommodate clock skew.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Automation Benefits</h4>
        <p>
          Automated RRSIG generation reduces manual errors and ensures consistent timing. Plan renewal schedules based
          on TTL values and operational requirements.
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
