<script lang="ts">
  import {
    type LeaseTimeConfig,
    type LeaseTimeResult,
    validateLeaseTimeConfig,
    calculateLeaseTime,
    LEASE_TIME_EXAMPLES,
    NETWORK_TYPE_DEFAULTS,
    CHURN_RATE_HOURS,
    formatTime,
  } from '$lib/utils/dhcp-lease-calculator';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';

  let poolSize = $state<number | undefined>(100);
  let expectedClients = $state<number | undefined>(50);
  let churnRate = $state<'low' | 'medium' | 'high' | 'custom'>('medium');
  let customChurnHours = $state<number | undefined>(undefined);
  let networkType = $state<'corporate' | 'guest' | 'iot' | 'residential' | 'custom'>('corporate');

  let validationErrors = $state<string[]>([]);
  let result = $state<LeaseTimeResult | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  const examples = LEASE_TIME_EXAMPLES.map((ex) => ({
    label: ex.name,
    config: ex,
    description: ex.description,
  }));

  function loadExample(example: (typeof examples)[0], index: number): void {
    const cfg = example.config;
    poolSize = cfg.poolSize;
    expectedClients = cfg.expectedClients;
    churnRate = cfg.churnRate;
    customChurnHours = cfg.customChurnHours;
    networkType = cfg.networkType || 'corporate';
    selectedExampleIndex = index;
  }

  function checkIfExampleStillMatches(): void {
    if (selectedExampleIndex === null) return;

    const example = examples[selectedExampleIndex];
    if (!example) {
      selectedExampleIndex = null;
      return;
    }

    const cfg = example.config;
    const matches =
      poolSize === cfg.poolSize &&
      expectedClients === cfg.expectedClients &&
      churnRate === cfg.churnRate &&
      customChurnHours === cfg.customChurnHours &&
      networkType === (cfg.networkType || 'corporate');

    if (!matches) selectedExampleIndex = null;
  }

  $effect(() => {
    const currentPoolSize = poolSize;
    const currentExpectedClients = expectedClients;
    const currentChurnRate = churnRate;
    const currentCustomChurnHours = customChurnHours;
    const currentNetworkType = networkType;

    untrack(() => {
      const config: LeaseTimeConfig = {
        poolSize: currentPoolSize ?? 0,
        expectedClients: currentExpectedClients ?? 0,
        churnRate: currentChurnRate,
        customChurnHours: currentCustomChurnHours,
        networkType: currentNetworkType === 'custom' ? undefined : currentNetworkType,
      };

      const isInitialState = currentPoolSize === undefined || currentExpectedClients === undefined;

      if (isInitialState) {
        validationErrors = [];
        result = null;
      } else {
        validationErrors = validateLeaseTimeConfig(config);

        if (validationErrors.length === 0) {
          try {
            result = calculateLeaseTime(config);
          } catch (e) {
            validationErrors = [e instanceof Error ? e.message : String(e)];
            result = null;
          }
        } else {
          result = null;
        }
      }

      checkIfExampleStillMatches();
    });
  });
</script>

<ToolContentContainer
  title="DHCP Lease Time Calculator"
  description="Calculate optimal DHCP lease times based on network size, client turnover, and utilization. Includes T1/T2 renewal times and configuration examples."
>
  <ExamplesCard
    {examples}
    onSelect={loadExample}
    getLabel={(ex) => ex.label}
    getDescription={(ex) => ex.description}
    selectedIndex={selectedExampleIndex}
  />

  <div class="card input-card">
    <div class="card-header">
      <h3>Network Configuration</h3>
      <p class="help-text">Enter your network characteristics to calculate optimal lease times</p>
    </div>
    <div class="card-content">
      <div class="input-row">
        <div class="input-group">
          <label for="pool-size">
            <Icon name="layers" size="sm" />
            IP Pool Size
          </label>
          <input id="pool-size" type="number" bind:value={poolSize} placeholder="100" min="1" />
          <small>Total available IP addresses in your DHCP pool</small>
        </div>

        <div class="input-group">
          <label for="expected-clients">
            <Icon name="users" size="sm" />
            Expected Clients
          </label>
          <input id="expected-clients" type="number" bind:value={expectedClients} placeholder="50" min="0" />
          <small>Average number of concurrent clients</small>
        </div>
      </div>

      <div class="input-group">
        <label for="network-type">
          <Icon name="network" size="sm" />
          Network Type
        </label>
        <select id="network-type" bind:value={networkType}>
          {#each Object.entries(NETWORK_TYPE_DEFAULTS) as [key, value] (key)}
            <option value={key}>{value.name}</option>
          {/each}
          <option value="custom">Custom (use churn rate)</option>
        </select>
        {#if networkType !== 'custom'}
          <small>{NETWORK_TYPE_DEFAULTS[networkType].description}</small>
        {/if}
      </div>

      <div class="input-group">
        <label for="churn-rate">
          <Icon name="refresh" size="sm" />
          Client Churn Rate
        </label>
        <select id="churn-rate" bind:value={churnRate}>
          <option value="low">Low - {formatTime(CHURN_RATE_HOURS.low * 3600)}</option>
          <option value="medium">Medium - {formatTime(CHURN_RATE_HOURS.medium * 3600)}</option>
          <option value="high">High - {formatTime(CHURN_RATE_HOURS.high * 3600)}</option>
          <option value="custom">Custom</option>
        </select>
        <small>How long devices typically stay connected</small>
      </div>

      {#if churnRate === 'custom'}
        <div class="input-group">
          <label for="custom-churn">
            <Icon name="clock" size="sm" />
            Custom Churn Time (hours)
          </label>
          <input id="custom-churn" type="number" bind:value={customChurnHours} placeholder="24" min="1" />
          <small>Average hours a device stays connected</small>
        </div>
      {/if}
    </div>
  </div>

  {#if validationErrors.length > 0}
    <div class="card errors-card">
      <h3>Validation Errors</h3>
      {#each validationErrors as error, i (i)}
        <div class="error-message">
          <Icon name="alert-triangle" size="sm" />
          {error}
        </div>
      {/each}
    </div>
  {/if}

  {#if result && validationErrors.length === 0}
    <div class="card results">
      <h3>Calculated Lease Times</h3>

      <div class="summary-card">
        <div><strong>Pool Utilization:</strong> {result.utilizationPercent}%</div>
        <div><strong>Recommended Lease:</strong> {result.recommendedLeaseFormatted}</div>
      </div>

      {#if result.exhaustionTime}
        <div class="warning-card">
          <Icon name="alert-triangle" size="sm" />
          <span><strong>Address Exhaustion:</strong> {result.exhaustionTime}</span>
        </div>
      {/if}

      <div class="lease-times">
        {#each [{ label: 'Default Lease Time', value: result.recommendedLeaseFormatted, seconds: result.recommendedLeaseSeconds, key: 'lease' }, { label: 'T1 (Renewal)', value: result.t1RenewalFormatted, seconds: result.t1RenewalSeconds, key: 't1' }, { label: 'T2 (Rebinding)', value: result.t2RebindingFormatted, seconds: result.t2RebindingSeconds, key: 't2' }] as time (time.key)}
          <div class="time-item">
            <div class="time-header">
              <span class="time-label">{time.label}</span>
              <button
                type="button"
                class="copy-btn-small"
                onclick={() => clipboard.copy(String(time.seconds), time.key)}
              >
                <Icon name={clipboard.isCopied(time.key) ? 'check' : 'copy'} size="xs" />
              </button>
            </div>
            <div class="time-value">{time.value}</div>
            <div class="time-seconds">{time.seconds} seconds</div>
          </div>
        {/each}
      </div>

      {#if result.recommendations.length > 0}
        <div class="recommendations">
          <h4>Recommendations</h4>
          {#each result.recommendations as recommendation, i (i)}
            <div class="recommendation-item">
              {recommendation}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#each [{ title: 'ISC DHCPd Configuration', content: result.configExamples.iscDhcpd, key: 'isc' }, { title: 'Kea DHCPv4 Configuration', content: result.configExamples.keaDhcp4, key: 'kea' }] as config (config.key)}
      <div class="card results">
        <div class="card-header-with-action">
          <h3>{config.title}</h3>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied(config.key)}
            onclick={() => clipboard.copy(config.content, config.key)}
          >
            <Icon name={clipboard.isCopied(config.key) ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied(config.key) ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{config.content}</pre>
      </div>
    {/each}
  {/if}
</ToolContentContainer>

<style lang="scss">
  .card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    margin-bottom: var(--spacing-lg);

    &.input-card {
      background: var(--bg-tertiary);

      .card-header {
        margin-bottom: var(--spacing-md);
      }
    }

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin: 0 0 var(--spacing-sm);
      font-size: 1.25rem;
      color: var(--text-primary);
    }

    h4 {
      margin: 0 0 var(--spacing-sm);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .card-header {
    .help-text {
      margin: var(--spacing-xs) 0 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-style: italic;
    }
  }

  .card-header-with-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);

    h3 {
      margin: 0;
    }
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    input,
    select {
      padding: var(--spacing-sm);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.9375rem;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 90%);
      }
    }

    small {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }
  }

  .errors-card {
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border-color: var(--color-error);

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      color: var(--color-error);
      font-size: 0.9375rem;
    }
  }

  .results {
    background: var(--bg-tertiary);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .summary-card {
    display: flex;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    font-size: 0.9375rem;

    div strong {
      color: var(--text-primary);
    }

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-xs);
    }
  }

  .warning-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-warning), transparent 95%);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    color: var(--color-warning);
    font-size: 0.9375rem;
  }

  .lease-times {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);

    .time-item {
      padding: var(--spacing-md);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);

      .time-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--spacing-sm);

        .time-label {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .time-value {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-primary);
        margin-bottom: var(--spacing-xs);
      }

      .time-seconds {
        font-size: 0.8125rem;
        color: var(--text-secondary);
      }
    }
  }

  .recommendations {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    .recommendation-item {
      padding: var(--spacing-sm);
      margin-bottom: var(--spacing-xs);
      font-size: 0.9375rem;
      color: var(--text-primary);
      line-height: 1.5;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &.copied {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      border-color: var(--color-success);
      color: var(--color-success);
    }
  }

  .copy-btn-small {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .output-value {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-primary);
    overflow-x: auto;
  }

  .code-block {
    white-space: pre;
    word-break: normal;
  }
</style>
