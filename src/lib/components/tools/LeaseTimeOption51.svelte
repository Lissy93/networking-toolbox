<script lang="ts">
  import {
    type LeaseTimeConfig,
    type LeaseTimeResult,
    buildLeaseTimeOption,
    decodeLeaseTimeOption,
    validateLeaseTimeConfig,
    formatTime,
    LEASE_TIME_PRESETS,
  } from '$lib/utils/dhcp-option51-lease-time';
  import { untrack } from 'svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables/useClipboard.svelte';

  const clipboard = useClipboard();

  type Tab = 'build' | 'decode';
  let activeTab = $state<Tab>('build');

  // Build mode state
  let leaseSeconds = $state<number>(86400);
  let infinite = $state<boolean>(false);
  let buildResult = $state<LeaseTimeResult | null>(null);
  let buildErrors = $state<string[]>([]);

  // Decode mode state
  let hexInput = $state<string>('');
  let decodeResult = $state<LeaseTimeResult | null>(null);
  let decodeError = $state<string>('');

  const navOptions = [
    { value: 'build', label: 'Build Option' },
    { value: 'decode', label: 'Decode Option' },
  ];

  const examples = LEASE_TIME_PRESETS.map((preset) => ({
    ...preset,
    description: `${preset.description} • ${preset.infinite ? 'Infinite' : formatTime(preset.seconds)}`,
  }));

  function loadPreset(preset: (typeof LEASE_TIME_PRESETS)[0]) {
    activeTab = 'build';
    if (preset.infinite) {
      infinite = true;
      leaseSeconds = 0;
    } else {
      infinite = false;
      leaseSeconds = preset.seconds;
    }
  }

  // Build mode effect
  $effect(() => {
    if (activeTab !== 'build') return;

    const currentSeconds = leaseSeconds;
    const currentInfinite = infinite;

    untrack(() => {
      const config: LeaseTimeConfig = {
        leaseSeconds: currentSeconds,
        infinite: currentInfinite,
      };

      buildErrors = validateLeaseTimeConfig(config);

      // Build even with warnings
      try {
        buildResult = buildLeaseTimeOption(config);
      } catch (err) {
        buildErrors = [err instanceof Error ? err.message : 'Unknown error'];
        buildResult = null;
      }
    });
  });

  // Decode mode effect
  $effect(() => {
    if (activeTab !== 'decode') return;

    const currentHex = hexInput;

    untrack(() => {
      if (!currentHex.trim()) {
        decodeResult = null;
        decodeError = '';
        return;
      }

      try {
        decodeResult = decodeLeaseTimeOption(currentHex);
        decodeError = '';
      } catch (err) {
        decodeError = err instanceof Error ? err.message : 'Unknown error';
        decodeResult = null;
      }
    });
  });
</script>

<ToolContentContainer
  title="DHCP Option 51 - IP Address Lease Time"
  description="Option 51 specifies the lease time in seconds for the IP address assignment. T1 (renewal at 50%) and T2 (rebinding at 87.5%) timers are automatically calculated."
  {navOptions}
  bind:selectedNav={activeTab}
>
  <ExamplesCard {examples} onSelect={loadPreset} getLabel={(ex) => ex.label} getDescription={(ex) => ex.description} />

  {#if activeTab === 'build'}
    <div class="card input-card">
      <h3>Lease Time Configuration</h3>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={infinite} />
          Infinite Lease (0xFFFFFFFF)
        </label>
        <span class="hint">Permanent IP address assignment (may not be supported by all servers)</span>
      </div>

      {#if !infinite}
        <div class="form-group">
          <label for="lease-seconds">Lease Time (seconds)</label>
          <input id="lease-seconds" type="number" bind:value={leaseSeconds} min="0" max="4294967294" class="input" />
          {#if leaseSeconds > 0}
            <span class="hint">= {formatTime(leaseSeconds)}</span>
          {/if}
        </div>

        <div class="quick-values">
          <span class="label">Quick Values:</span>
          <button class="btn-quick" onclick={() => (leaseSeconds = 3600)}>1h</button>
          <button class="btn-quick" onclick={() => (leaseSeconds = 14400)}>4h</button>
          <button class="btn-quick" onclick={() => (leaseSeconds = 86400)}>24h</button>
          <button class="btn-quick" onclick={() => (leaseSeconds = 259200)}>3d</button>
          <button class="btn-quick" onclick={() => (leaseSeconds = 604800)}>7d</button>
        </div>
      {/if}

      {#if buildErrors.length > 0}
        <div class="error-card" class:warning={buildErrors.every((e) => e.startsWith('Warning:'))}>
          <strong>{buildErrors.some((e) => e.startsWith('Warning:')) ? 'Warnings:' : 'Validation Errors:'}</strong>
          <ul>
            {#each buildErrors as error, i (i)}
              <li>{error}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    {#if buildResult}
      <div class="card result-card">
        <h3>Option 51 - Lease Time</h3>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">Lease Time:</span>
            <span class="value highlight">{buildResult.humanReadable}</span>
          </div>

          <div class="result-item">
            <span class="label">Hex Encoded:</span>
            <code class="code-value">{buildResult.hexEncoded}</code>
            <button class="btn-copy" onclick={() => clipboard.copy(buildResult!.hexEncoded)} aria-label="Copy hex">
              Copy
            </button>
          </div>

          <div class="result-item">
            <span class="label">Wire Format:</span>
            <code class="code-value">{buildResult.wireFormat}</code>
            <button
              class="btn-copy"
              onclick={() => clipboard.copy(buildResult!.wireFormat)}
              aria-label="Copy wire format"
            >
              Copy
            </button>
          </div>

          <div class="result-item">
            <span class="label">Total Length:</span>
            <span class="value">{buildResult.totalLength} bytes</span>
          </div>

          {#if !buildResult.isInfinite}
            <div class="result-item">
              <span class="label">T1 Renewal:</span>
              <span class="value">{buildResult.t1RenewalFormatted} (50% of lease)</span>
            </div>

            <div class="result-item">
              <span class="label">T2 Rebinding:</span>
              <span class="value">{buildResult.t2RebindingFormatted} (87.5% of lease)</span>
            </div>
          {/if}
        </div>

        <div class="config-section">
          <h4>Configuration Examples</h4>

          <div class="config-example">
            <h5>ISC DHCPd</h5>
            <pre><code>{buildResult.configExamples.iscDhcpd}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(buildResult!.configExamples.iscDhcpd)}>
              Copy
            </button>
          </div>

          <div class="config-example">
            <h5>Kea DHCPv4</h5>
            <pre><code>{buildResult.configExamples.keaDhcp4}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(buildResult!.configExamples.keaDhcp4)}>
              Copy
            </button>
          </div>

          <div class="config-example">
            <h5>dnsmasq</h5>
            <pre><code>{buildResult.configExamples.dnsmasq}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(buildResult!.configExamples.dnsmasq)}> Copy </button>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <div class="card input-card">
      <h3>Decode Option 51</h3>

      <div class="form-group">
        <label for="hex-input">Hex String</label>
        <input
          id="hex-input"
          type="text"
          bind:value={hexInput}
          placeholder="e.g., 00015180 or 00 01 51 80"
          class="input"
        />
        <span class="hint">Enter 8 hex characters (4 bytes, spaces optional)</span>
      </div>

      {#if decodeError}
        <div class="error-card">
          <strong>Decode Error:</strong>
          <p>{decodeError}</p>
        </div>
      {/if}
    </div>

    {#if decodeResult}
      <div class="card result-card">
        <h3>Decoded Option 51</h3>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">Lease Time:</span>
            <span class="value highlight">{decodeResult.humanReadable}</span>
          </div>

          <div class="result-item">
            <span class="label">Seconds:</span>
            <span class="value">{decodeResult.leaseSeconds.toLocaleString()}</span>
          </div>

          {#if decodeResult.isInfinite}
            <div class="result-item infinite-badge">
              <span class="badge">Infinite Lease</span>
            </div>
          {/if}

          {#if !decodeResult.isInfinite}
            <div class="result-item">
              <span class="label">T1 Renewal:</span>
              <span class="value">{decodeResult.t1RenewalFormatted} (50% of lease)</span>
            </div>

            <div class="result-item">
              <span class="label">T2 Rebinding:</span>
              <span class="value">{decodeResult.t2RebindingFormatted} (87.5% of lease)</span>
            </div>
          {/if}
        </div>

        <div class="config-section">
          <h4>Configuration Examples</h4>

          <div class="config-example">
            <h5>ISC DHCPd</h5>
            <pre><code>{decodeResult.configExamples.iscDhcpd}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(decodeResult!.configExamples.iscDhcpd)}>
              Copy
            </button>
          </div>

          <div class="config-example">
            <h5>Kea DHCPv4</h5>
            <pre><code>{decodeResult.configExamples.keaDhcp4}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(decodeResult!.configExamples.keaDhcp4)}>
              Copy
            </button>
          </div>

          <div class="config-example">
            <h5>dnsmasq</h5>
            <pre><code>{decodeResult.configExamples.dnsmasq}</code></pre>
            <button class="btn-copy" onclick={() => clipboard.copy(decodeResult!.configExamples.dnsmasq)}>
              Copy
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</ToolContentContainer>

<style lang="scss">
  .card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    margin-bottom: var(--spacing-md);

    &.input-card {
      background: var(--bg-tertiary);
    }

    h3 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
      font-size: var(--font-size-lg);
    }

    h4 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }

    h5 {
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
  }

  .form-group {
    margin-bottom: var(--spacing-md);

    label {
      display: block;
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
      font-weight: 500;
    }

    .hint {
      display: block;
      margin-top: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
    }
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;

    input[type='checkbox'] {
      cursor: pointer;
    }
  }

  .input {
    width: 100%;
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .quick-values {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-md);

    .label {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-right: var(--spacing-xs);
    }
  }

  .btn-quick {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--bg-secondary);
    }
  }

  .error-card {
    background: color-mix(in srgb, var(--color-error), transparent 90%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-top: var(--spacing-md);

    &.warning {
      background: color-mix(in srgb, var(--color-warning), transparent 90%);
      border-color: var(--color-warning);

      strong {
        color: var(--color-warning);
      }
    }

    strong {
      color: var(--color-error);
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      color: var(--text-primary);
    }

    p {
      margin: 0;
      color: var(--text-primary);
    }
  }

  .result-card {
    h3 {
      color: var(--color-success);
    }
  }

  .result-grid {
    display: grid;
    gap: var(--spacing-md);
  }

  .result-item {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);

    .label {
      font-weight: 500;
      color: var(--text-secondary);
      min-width: 120px;
    }

    .value,
    .code-value {
      flex: 1;
      font-family: var(--font-mono);
      color: var(--text-primary);
      word-break: break-all;
    }

    .value.highlight {
      color: var(--color-primary);
      font-weight: 600;
      font-size: var(--font-size-md);
    }

    &.infinite-badge {
      justify-content: center;
      background: color-mix(in srgb, var(--color-info), transparent 90%);
      border: 1px solid var(--color-info);

      .badge {
        padding: var(--spacing-xs) var(--spacing-md);
        background: var(--color-info);
        color: var(--text-inverse);
        border-radius: var(--radius-sm);
        font-weight: 600;
      }
    }
  }

  .config-section {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-primary);
  }

  .config-example {
    position: relative;
    margin-bottom: var(--spacing-md);

    pre {
      margin: 0;
      padding: var(--spacing-md);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      overflow-x: auto;

      code {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        color: var(--text-primary);
      }
    }
  }

  .btn-copy {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--bg-secondary);
    }
  }
</style>
