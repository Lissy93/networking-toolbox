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
  import { t } from '$lib/stores/language';

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

  const navOptions = $derived([
    { value: 'build' as const, label: $t('tools/lease-time-option51.nav.build') },
    { value: 'decode' as const, label: $t('tools/lease-time-option51.nav.decode') },
  ]);

  const examples = LEASE_TIME_PRESETS.map((preset) => ({
    ...preset,
    description: `${preset.description} • ${preset.infinite ? 'Infinite' : formatTime(preset.seconds)}`,
  }));

  const decodeExamples = $derived([
    {
      label: $t('tools/lease-time-option51.examples.decode.oneHour.label'),
      hexValue: '00000e10',
      description: $t('tools/lease-time-option51.examples.decode.oneHour.description'),
    },
    {
      label: $t('tools/lease-time-option51.examples.decode.twentyFourHours.label'),
      hexValue: '00015180',
      description: $t('tools/lease-time-option51.examples.decode.twentyFourHours.description'),
    },
    {
      label: $t('tools/lease-time-option51.examples.decode.sevenDays.label'),
      hexValue: '00093a80',
      description: $t('tools/lease-time-option51.examples.decode.sevenDays.description'),
    },
    {
      label: $t('tools/lease-time-option51.examples.decode.infinite.label'),
      hexValue: 'ffffffff',
      description: $t('tools/lease-time-option51.examples.decode.infinite.description'),
    },
  ]);

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

  function loadDecodeExample(example: (typeof decodeExamples)[0]) {
    activeTab = 'decode';
    hexInput = example.hexValue;
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
  title={$t('tools/lease-time-option51.title')}
  description={$t('tools/lease-time-option51.subtitle')}
  {navOptions}
  bind:selectedNav={activeTab}
>
  {#if activeTab === 'build'}
    <ExamplesCard
      {examples}
      onSelect={loadPreset}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
    />

    <div class="card input-card">
      <h3>{$t('tools/lease-time-option51.build.title')}</h3>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={infinite} />
          {$t('tools/lease-time-option51.build.infinite.label')}
        </label>
        <span class="hint">{$t('tools/lease-time-option51.build.infinite.hint')}</span>
      </div>

      {#if !infinite}
        <div class="form-group">
          <label for="lease-seconds">{$t('tools/lease-time-option51.build.leaseSeconds.label')}</label>
          <input id="lease-seconds" type="number" bind:value={leaseSeconds} min="0" max="4294967294" class="input" />
          {#if leaseSeconds > 0}
            <span class="hint"
              >{$t('tools/lease-time-option51.build.leaseSeconds.hint', { time: formatTime(leaseSeconds) })}</span
            >
          {/if}
        </div>

        <div class="quick-values">
          <span class="label">{$t('tools/lease-time-option51.build.quickValues.label')}</span>
          <button class="btn-quick" onclick={() => (leaseSeconds = 3600)}
            >{$t('tools/lease-time-option51.build.quickValues.oneHour')}</button
          >
          <button class="btn-quick" onclick={() => (leaseSeconds = 14400)}
            >{$t('tools/lease-time-option51.build.quickValues.fourHours')}</button
          >
          <button class="btn-quick" onclick={() => (leaseSeconds = 86400)}
            >{$t('tools/lease-time-option51.build.quickValues.twentyFourHours')}</button
          >
          <button class="btn-quick" onclick={() => (leaseSeconds = 259200)}
            >{$t('tools/lease-time-option51.build.quickValues.threeDays')}</button
          >
          <button class="btn-quick" onclick={() => (leaseSeconds = 604800)}
            >{$t('tools/lease-time-option51.build.quickValues.sevenDays')}</button
          >
        </div>
      {/if}

      {#if buildErrors.length > 0}
        <div class="error-card" class:warning={buildErrors.every((e) => e.startsWith('Warning:'))}>
          <strong
            >{buildErrors.some((e) => e.startsWith('Warning:'))
              ? $t('tools/lease-time-option51.build.errors.warnings')
              : $t('tools/lease-time-option51.build.errors.validationErrors')}</strong
          >
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
        <h3>{$t('tools/lease-time-option51.results.buildTitle')}</h3>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">{$t('tools/lease-time-option51.results.leaseTime')}</span>
            <span class="value highlight">{buildResult.humanReadable}</span>
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/lease-time-option51.results.hexEncoded')}</span>
            <code class="code-value">{buildResult.hexEncoded}</code>
            <button
              class="btn-copy"
              class:copied={clipboard.isCopied('build-hex')}
              onclick={() => clipboard.copy(buildResult!.hexEncoded, 'build-hex')}
              aria-label="Copy hex"
            >
              {clipboard.isCopied('build-hex')
                ? $t('tools/lease-time-option51.buttons.copied')
                : $t('tools/lease-time-option51.buttons.copy')}
            </button>
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/lease-time-option51.results.wireFormat')}</span>
            <code class="code-value">{buildResult.wireFormat}</code>
            <button
              class="btn-copy"
              class:copied={clipboard.isCopied('build-wire')}
              onclick={() => clipboard.copy(buildResult!.wireFormat, 'build-wire')}
              aria-label="Copy wire format"
            >
              {clipboard.isCopied('build-wire')
                ? $t('tools/lease-time-option51.buttons.copied')
                : $t('tools/lease-time-option51.buttons.copy')}
            </button>
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/lease-time-option51.results.totalLength')}</span>
            <span class="value"
              >{$t('tools/lease-time-option51.results.lengthBytes', { length: buildResult.totalLength })}</span
            >
          </div>

          {#if !buildResult.isInfinite}
            <div class="result-item">
              <span class="label">{$t('tools/lease-time-option51.results.t1Renewal')}</span>
              <span class="value"
                >{$t('tools/lease-time-option51.results.t1RenewalValue', {
                  time: buildResult.t1RenewalFormatted ?? '',
                })}</span
              >
            </div>

            <div class="result-item">
              <span class="label">{$t('tools/lease-time-option51.results.t2Rebinding')}</span>
              <span class="value"
                >{$t('tools/lease-time-option51.results.t2RebindingValue', {
                  time: buildResult.t2RebindingFormatted ?? '',
                })}</span
              >
            </div>
          {/if}
        </div>

        <div class="config-section">
          <h4>{$t('tools/lease-time-option51.results.configExamples')}</h4>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/lease-time-option51.results.iscDhcpd')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('build-isc')}
                onclick={() => clipboard.copy(buildResult!.configExamples.iscDhcpd, 'build-isc')}
              >
                {clipboard.isCopied('build-isc')
                  ? $t('tools/lease-time-option51.buttons.copied')
                  : $t('tools/lease-time-option51.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{buildResult.configExamples.iscDhcpd}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/lease-time-option51.results.keaDhcp4')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('build-kea')}
                onclick={() => clipboard.copy(buildResult!.configExamples.keaDhcp4, 'build-kea')}
              >
                {clipboard.isCopied('build-kea')
                  ? $t('tools/lease-time-option51.buttons.copied')
                  : $t('tools/lease-time-option51.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{buildResult.configExamples.keaDhcp4}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/lease-time-option51.results.dnsmasq')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('build-dnsmasq')}
                onclick={() => clipboard.copy(buildResult!.configExamples.dnsmasq, 'build-dnsmasq')}
              >
                {clipboard.isCopied('build-dnsmasq')
                  ? $t('tools/lease-time-option51.buttons.copied')
                  : $t('tools/lease-time-option51.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{buildResult.configExamples.dnsmasq}</code></pre>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <ExamplesCard
      examples={decodeExamples}
      onSelect={loadDecodeExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
    />

    <div class="card input-card">
      <h3>{$t('tools/lease-time-option51.decode.title')}</h3>

      <div class="form-group">
        <label for="hex-input">{$t('tools/lease-time-option51.decode.hexInput.label')}</label>
        <input
          id="hex-input"
          type="text"
          bind:value={hexInput}
          placeholder={$t('tools/lease-time-option51.decode.hexInput.placeholder')}
          class="input"
        />
        <span class="hint">{$t('tools/lease-time-option51.decode.hexInput.hint')}</span>
      </div>

      {#if decodeError}
        <div class="error-card">
          <strong>{$t('tools/lease-time-option51.decode.error.title')}</strong>
          <p>{decodeError}</p>
        </div>
      {/if}
    </div>

    {#if decodeResult}
      <div class="card result-card">
        <h3>{$t('tools/lease-time-option51.results.decodeTitle')}</h3>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">{$t('tools/lease-time-option51.results.leaseTime')}</span>
            <span class="value highlight">{decodeResult.humanReadable}</span>
          </div>

          <div class="result-item">
            <span class="label">{$t('tools/lease-time-option51.results.seconds')}</span>
            <span class="value"
              >{$t('tools/lease-time-option51.results.secondsValue', {
                seconds: decodeResult.leaseSeconds.toLocaleString(),
              })}</span
            >
          </div>

          {#if decodeResult.isInfinite}
            <div class="result-item infinite-badge">
              <span class="badge">{$t('tools/lease-time-option51.results.infiniteLease')}</span>
            </div>
          {/if}

          {#if !decodeResult.isInfinite}
            <div class="result-item">
              <span class="label">{$t('tools/lease-time-option51.results.t1Renewal')}</span>
              <span class="value"
                >{$t('tools/lease-time-option51.results.t1RenewalValue', {
                  time: decodeResult.t1RenewalFormatted ?? '',
                })}</span
              >
            </div>

            <div class="result-item">
              <span class="label">{$t('tools/lease-time-option51.results.t2Rebinding')}</span>
              <span class="value"
                >{$t('tools/lease-time-option51.results.t2RebindingValue', {
                  time: decodeResult.t2RebindingFormatted ?? '',
                })}</span
              >
            </div>
          {/if}
        </div>

        <div class="config-section">
          <h4>{$t('tools/lease-time-option51.results.configExamples')}</h4>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/lease-time-option51.results.iscDhcpd')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('decode-isc')}
                onclick={() => clipboard.copy(decodeResult!.configExamples.iscDhcpd, 'decode-isc')}
              >
                {clipboard.isCopied('decode-isc')
                  ? $t('tools/lease-time-option51.buttons.copied')
                  : $t('tools/lease-time-option51.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{decodeResult.configExamples.iscDhcpd}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/lease-time-option51.results.keaDhcp4')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('decode-kea')}
                onclick={() => clipboard.copy(decodeResult!.configExamples.keaDhcp4, 'decode-kea')}
              >
                {clipboard.isCopied('decode-kea')
                  ? $t('tools/lease-time-option51.buttons.copied')
                  : $t('tools/lease-time-option51.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{decodeResult.configExamples.keaDhcp4}</code></pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h5>{$t('tools/lease-time-option51.results.dnsmasq')}</h5>
              <button
                class="btn-copy"
                class:copied={clipboard.isCopied('decode-dnsmasq')}
                onclick={() => clipboard.copy(decodeResult!.configExamples.dnsmasq, 'decode-dnsmasq')}
              >
                {clipboard.isCopied('decode-dnsmasq')
                  ? $t('tools/lease-time-option51.buttons.copied')
                  : $t('tools/lease-time-option51.buttons.copy')}
              </button>
            </div>
            <pre class="code-block"><code>{decodeResult.configExamples.dnsmasq}</code></pre>
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
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      cursor: pointer;

      input[type='checkbox'] {
        cursor: pointer;
      }
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
    background: var(--bg-tertiary);

    h3 {
      color: var(--text-primary);
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
    background: var(--bg-secondary);
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
      background: var(--bg-primary);
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
        color: var(--bg-primary);
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

  .output-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h5 {
      margin: 0;
    }
  }

  .code-block {
    margin: 0;
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    overflow-x: auto;
    white-space: pre;
    word-break: normal;

    code {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      background: var(--bg-primary);
    }
  }

  .btn-copy {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.2s;

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
</style>
