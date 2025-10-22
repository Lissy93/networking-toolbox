<script lang="ts">
  import {
    type PrefixDelegationConfig,
    type PrefixConfig,
    type PrefixDelegationResult,
    buildPrefixDelegation,
    validatePrefixDelegationConfig,
    PREFIX_DELEGATION_EXAMPLES,
    formatTime,
  } from '$lib/utils/dhcpv6-prefix-delegation';
  import { untrack } from 'svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables/useClipboard.svelte';

  const clipboard = useClipboard();

  // State
  let iaid = $state<number>(1);
  let t1 = $state<number | undefined>(302400);
  let t2 = $state<number | undefined>(483840);
  let prefixes = $state<PrefixConfig[]>([
    {
      prefix: '2001:db8::/56',
      preferredLifetime: 604800,
      validLifetime: 2592000,
    },
  ]);
  let result = $state<PrefixDelegationResult | null>(null);
  let errors = $state<string[]>([]);

  function loadExample(example: (typeof PREFIX_DELEGATION_EXAMPLES)[0]) {
    iaid = example.config.iaid;
    t1 = example.config.t1;
    t2 = example.config.t2;
    prefixes = example.config.prefixes.map((p) => ({ ...p }));
  }

  function addPrefix() {
    prefixes = [
      ...prefixes,
      {
        prefix: '2001:db8::/56',
        preferredLifetime: 604800,
        validLifetime: 2592000,
      },
    ];
  }

  function removePrefix(index: number) {
    prefixes = prefixes.filter((_, i) => i !== index);
    if (prefixes.length === 0) {
      addPrefix();
    }
  }

  // Build effect
  $effect(() => {
    const currentIaid = iaid;
    const currentT1 = t1;
    const currentT2 = t2;
    const currentPrefixes = prefixes;

    untrack(() => {
      const config: PrefixDelegationConfig = {
        iaid: currentIaid,
        t1: currentT1,
        t2: currentT2,
        prefixes: currentPrefixes,
      };

      errors = validatePrefixDelegationConfig(config);

      if (errors.length === 0) {
        try {
          result = buildPrefixDelegation(config);
        } catch (err) {
          errors = [err instanceof Error ? err.message : 'Unknown error'];
          result = null;
        }
      } else {
        result = null;
      }
    });
  });
</script>

<ToolContentContainer
  title="DHCPv6 Prefix Delegation (IA_PD)"
  description="Build DHCPv6 IA_PD options for delegating IPv6 prefixes to requesting routers. Configure Identity Association for Prefix Delegation (Option 25) with IA Prefix options (Option 26) per RFC 8415."
>
  <ExamplesCard
    examples={PREFIX_DELEGATION_EXAMPLES}
    onSelect={(ex) => loadExample(ex)}
    getLabel={(ex) => ex.label}
    getDescription={(ex) => ex.description}
  />

  <div class="card input-card">
    <h3>Prefix Delegation Configuration</h3>

    <div class="form-row">
      <div class="form-group">
        <label for="iaid">IAID (Identity Association ID)</label>
        <input id="iaid" type="number" bind:value={iaid} min="0" max="4294967295" class="input" />
        <span class="hint">Unique identifier for this IA_PD (0-4294967295)</span>
      </div>

      <div class="form-group">
        <label for="t1">T1 Renewal Time (seconds)</label>
        <input id="t1" type="number" bind:value={t1} min="0" max="4294967295" placeholder="Optional" class="input" />
        {#if t1}
          <span class="hint">= {formatTime(t1)}</span>
        {/if}
      </div>

      <div class="form-group">
        <label for="t2">T2 Rebinding Time (seconds)</label>
        <input id="t2" type="number" bind:value={t2} min="0" max="4294967295" placeholder="Optional" class="input" />
        {#if t2}
          <span class="hint">= {formatTime(t2)}</span>
        {/if}
      </div>
    </div>

    <div class="form-group">
      <label for="prefix-0">Delegated Prefixes</label>
      {#each prefixes as prefix, i (i)}
        <div class="prefix-row">
          <div class="prefix-inputs">
            <input
              id={i === 0 ? 'prefix-0' : undefined}
              type="text"
              bind:value={prefix.prefix}
              placeholder="e.g., 2001:db8::/56"
              class="input"
              aria-label={i > 0 ? `Prefix ${i + 1}` : undefined}
            />
            <input
              type="number"
              bind:value={prefix.preferredLifetime}
              min="0"
              max="4294967295"
              placeholder="Preferred (s)"
              class="input input-sm"
              aria-label="Preferred lifetime"
            />
            <input
              type="number"
              bind:value={prefix.validLifetime}
              min="0"
              max="4294967295"
              placeholder="Valid (s)"
              class="input input-sm"
              aria-label="Valid lifetime"
            />
          </div>
          {#if prefixes.length > 1}
            <button class="btn btn-danger btn-sm" onclick={() => removePrefix(i)}>Remove</button>
          {/if}
        </div>
      {/each}
      <button class="btn btn-secondary btn-sm" onclick={addPrefix}>Add Prefix</button>
    </div>

    {#if errors.length > 0}
      <div class="error-card">
        <strong>Validation Errors:</strong>
        <ul>
          {#each errors as error, i (i)}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  {#if result}
    <div class="card result-card">
      <h3>Option 25 - IA_PD</h3>

      <div class="result-grid">
        <div class="result-item">
          <span class="label">IAID:</span>
          <code class="code-value">{result.iaid} (0x{result.iaidHex})</code>
        </div>

        <div class="result-item">
          <span class="label">T1 Renewal:</span>
          <span class="value">{result.t1Formatted} ({result.t1}s)</span>
        </div>

        <div class="result-item">
          <span class="label">T2 Rebinding:</span>
          <span class="value">{result.t2Formatted} ({result.t2}s)</span>
        </div>

        <div class="result-item">
          <span class="label">Full Hex:</span>
          <code class="code-value">{result.fullHex}</code>
          <button
            class="btn-copy"
            class:copied={clipboard.isCopied('full-hex')}
            onclick={() => clipboard.copy(result!.fullHex, 'full-hex')}
            aria-label="Copy hex"
          >
            {clipboard.isCopied('full-hex') ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div class="result-item">
          <span class="label">Wire Format:</span>
          <code class="code-value">{result.fullWireFormat}</code>
          <button
            class="btn-copy"
            class:copied={clipboard.isCopied('full-wire')}
            onclick={() => clipboard.copy(result!.fullWireFormat, 'full-wire')}
            aria-label="Copy wire format"
          >
            {clipboard.isCopied('full-wire') ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div class="result-item">
          <span class="label">Total Length:</span>
          <span class="value">{result.totalLength} bytes</span>
        </div>
      </div>

      <div class="prefixes-section">
        <h4>Delegated Prefixes (Option 26)</h4>
        {#each result.prefixes as prefix, i (i)}
          <div class="prefix-card">
            <div class="prefix-header">
              <span class="prefix-number">{i + 1}</span>
              <code class="prefix-value">{prefix.prefix}</code>
            </div>
            <div class="prefix-details">
              <div class="detail-item">
                <span class="detail-label">Preferred Lifetime:</span>
                <span>{prefix.preferredLifetimeFormatted} ({prefix.preferredLifetime}s)</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Valid Lifetime:</span>
                <span>{prefix.validLifetimeFormatted} ({prefix.validLifetime}s)</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Wire Format:</span>
                <code class="code-small">{prefix.wireFormat}</code>
                <button
                  class="btn-copy btn-copy-sm"
                  class:copied={clipboard.isCopied(`prefix-wire-${i}`)}
                  onclick={() => clipboard.copy(prefix.wireFormat.replace(/\s/g, ''), `prefix-wire-${i}`)}
                  aria-label="Copy prefix wire format"
                >
                  {clipboard.isCopied(`prefix-wire-${i}`) ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <div class="config-section">
        <h4>Configuration Example</h4>

        <div class="output-group">
          <div class="output-header">
            <h5>Kea DHCPv6</h5>
            <button
              class="btn-copy"
              class:copied={clipboard.isCopied('kea-config')}
              onclick={() => clipboard.copy(result!.examples.keaDhcp6!, 'kea-config')}
            >
              {clipboard.isCopied('kea-config') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="code-block"><code>{result.examples.keaDhcp6}</code></pre>
        </div>
      </div>
    </div>
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

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
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

    &.input-sm {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-xs);
    }
  }

  .prefix-row {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    align-items: flex-start;

    .prefix-inputs {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: var(--spacing-sm);
      flex: 1;
    }
  }

  .btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }

    &.btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-primary);
    }

    &.btn-danger {
      background: var(--color-error);
      color: var(--bg-primary);
    }

    &.btn-sm {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
    }
  }

  .error-card {
    background: color-mix(in srgb, var(--color-error), transparent 90%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-top: var(--spacing-md);

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
    }
  }

  .prefixes-section {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-primary);
  }

  .prefix-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    .prefix-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);

      .prefix-number {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        background: var(--color-primary);
        color: var(--bg-primary);
        border-radius: var(--radius-sm);
        font-weight: 600;
        font-size: var(--font-size-sm);
      }

      .prefix-value {
        font-family: var(--font-mono);
        font-size: var(--font-size-md);
        color: var(--color-primary);
        font-weight: 600;
      }
    }

    .prefix-details {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);

      .detail-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-size: var(--font-size-sm);

        .detail-label {
          font-weight: 500;
          color: var(--text-secondary);
          min-width: 140px;
        }

        .code-small {
          font-family: var(--font-mono);
          color: var(--text-primary);
          word-break: break-all;
          flex: 1;
        }
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

    &.btn-copy-sm {
      padding: 2px var(--spacing-xs);
      font-size: var(--font-size-xs);
    }
  }
</style>
