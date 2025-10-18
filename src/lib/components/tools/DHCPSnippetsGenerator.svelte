<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import {
    generateSnippets,
    getDefaultSnippetConfig,
    type SnippetConfig,
    type SnippetResult,
    type DhcpTarget,
    type PoolRange,
  } from '$lib/utils/dhcp-snippets.js';

  let config = $state<SnippetConfig>(getDefaultSnippetConfig());
  let result = $state<SnippetResult | null>(null);

  const clipboard = useClipboard();

  const targetOptions: Array<{ value: DhcpTarget; label: string }> = [
    { value: 'isc-dhcpd', label: 'ISC dhcpd' },
    { value: 'kea-dhcp4', label: 'Kea DHCPv4' },
    { value: 'kea-dhcp6', label: 'Kea DHCPv6' },
  ];

  // Reactive generation
  $effect(() => {
    generate();
  });

  function generate() {
    result = generateSnippets(config);
  }

  function addPool() {
    const lastPool = config.pools[config.pools.length - 1];
    const newPool: PoolRange = { start: lastPool.end, end: lastPool.end };
    config.pools = [...config.pools, newPool];
  }

  function removePool(index: number) {
    if (config.pools.length > 1) {
      config.pools = config.pools.filter((_, i) => i !== index);
    }
  }

  function toggleTarget(target: DhcpTarget) {
    if (config.targets.includes(target)) {
      config.targets = config.targets.filter((t) => t !== target);
    } else {
      config.targets = [...config.targets, target];
    }
  }
</script>

<div class="card input-card">
  <div class="card-header">
    <h3>Configuration</h3>
  </div>
  <div class="card-content">
    <!-- Target selection -->
    <div class="input-group">
      <label>
        <Icon name="server" size="sm" />
        Target Servers
      </label>
      <div class="checkbox-group">
        {#each targetOptions as option (option.value)}
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={config.targets.includes(option.value)}
              onchange={() => toggleTarget(option.value)}
            />
            {option.label}
          </label>
        {/each}
      </div>
    </div>

    <!-- Mode -->
    <div class="input-group">
      <label for="mode">
        <Icon name="network" size="sm" />
        IP Mode
      </label>
      <select id="mode" bind:value={config.mode}>
        <option value="dhcp4">DHCPv4 (IPv4)</option>
        <option value="dhcp6">DHCPv6 (IPv6)</option>
      </select>
    </div>

    <!-- Subnet -->
    <div class="input-group">
      <label for="subnet">
        <Icon name="network" size="sm" />
        Subnet (CIDR)
      </label>
      <input
        id="subnet"
        type="text"
        bind:value={config.subnet}
        placeholder={config.mode === 'dhcp6' ? '2001:db8::/64' : '192.168.1.0/24'}
      />
    </div>

    <!-- Pools -->
    <div class="input-group">
      <label>
        <Icon name="layers" size="sm" />
        Address Pools
      </label>
      {#each config.pools as pool, i (i)}
        <div class="pool-row">
          <input type="text" bind:value={pool.start} placeholder="Start IP" />
          <span>-</span>
          <input type="text" bind:value={pool.end} placeholder="End IP" />
          {#if config.pools.length > 1}
            <button type="button" class="btn-icon" onclick={() => removePool(i)}>
              <Icon name="x" size="sm" />
            </button>
          {/if}
        </div>
      {/each}
      <button type="button" class="btn-add" onclick={addPool}>
        <Icon name="plus" size="sm" />
        Add Pool
      </button>
    </div>

    <!-- Gateway -->
    <div class="input-group">
      <label for="gateway">
        <Icon name="arrow-right" size="sm" />
        Gateway (Router)
      </label>
      <input
        id="gateway"
        type="text"
        bind:value={config.gateway}
        placeholder={config.mode === 'dhcp6' ? 'fe80::1' : '192.168.1.1'}
      />
    </div>

    <!-- DNS -->
    <div class="input-group">
      <label for="dns">
        <Icon name="globe" size="sm" />
        DNS Servers (comma-separated)
      </label>
      <input
        id="dns"
        type="text"
        value={config.dnsServers?.join(', ') || ''}
        oninput={(e) => (config.dnsServers = e.currentTarget.value.split(',').map((s) => s.trim()))}
        placeholder="8.8.8.8, 8.8.4.4"
      />
    </div>

    <!-- Domain -->
    <div class="input-group">
      <label for="domain">
        <Icon name="globe" size="sm" />
        Domain Name
      </label>
      <input id="domain" type="text" bind:value={config.domainName} placeholder="example.com" />
    </div>

    <!-- Lease times -->
    <div class="input-row">
      <div class="input-group">
        <label for="defaultLease">
          <Icon name="clock" size="sm" />
          Default Lease (seconds)
        </label>
        <input id="defaultLease" type="number" bind:value={config.defaultLeaseTime} placeholder="86400" />
      </div>
      <div class="input-group">
        <label for="maxLease">
          <Icon name="clock" size="sm" />
          Max Lease (seconds)
        </label>
        <input id="maxLease" type="number" bind:value={config.maxLeaseTime} placeholder="604800" />
      </div>
    </div>

    <!-- Options -->
    <div class="input-row">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={config.emitOptionNames} />
        Use option names (ISC)
      </label>
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={config.prettyJson} />
        Pretty JSON (Kea)
      </label>
    </div>
  </div>
</div>

{#if result}
  {#if result.validations.length > 0}
    <div class="card errors-card">
      <h3>Validation Errors</h3>
      {#each result.validations as error (error.field)}
        <div class="error-message">
          <Icon name="alert-triangle" size="sm" />
          <strong>{error.field}:</strong>
          {error.message}
        </div>
      {/each}
    </div>
  {:else}
    <div class="card summary-card">
      <Icon name="info" size="sm" />
      <p>{result.summary}</p>
    </div>

    <div class="card results">
      <h3>Generated Snippets</h3>

      {#if result.iscDhcpdSnippet}
        <div class="output-group">
          <div class="output-header">
            <h4>ISC dhcpd.conf</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('isc')}
              onclick={() => clipboard.copy(result!.iscDhcpdSnippet!, 'isc')}
            >
              <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('isc') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.iscDhcpdSnippet}</pre>
        </div>
      {/if}

      {#if result.keaDhcp4Snippet}
        <div class="output-group">
          <div class="output-header">
            <h4>Kea DHCPv4 JSON</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('kea4')}
              onclick={() => clipboard.copy(result!.keaDhcp4Snippet!, 'kea4')}
            >
              <Icon name={clipboard.isCopied('kea4') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('kea4') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.keaDhcp4Snippet}</pre>
        </div>
      {/if}

      {#if result.keaDhcp6Snippet}
        <div class="output-group">
          <div class="output-header">
            <h4>Kea DHCPv6 JSON</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('kea6')}
              onclick={() => clipboard.copy(result!.keaDhcp6Snippet!, 'kea6')}
            >
              <Icon name={clipboard.isCopied('kea6') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('kea6') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.keaDhcp6Snippet}</pre>
        </div>
      {/if}
    </div>
  {/if}
{/if}

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
        margin-bottom: var(--spacing-sm);
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
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
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
  }

  .input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .checkbox-group {
    display: flex;
    flex-direction: row;
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-weight: normal;
      cursor: pointer;
      font-size: var(--font-size-sm);

      input[type='checkbox'] {
        width: auto;
      }
    }
  }

  .pool-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    input {
      flex: 1;
    }

    span {
      color: var(--text-secondary);
    }
  }

  .btn-icon {
    padding: var(--spacing-xs);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--color-error), transparent 90%);
      border-color: var(--color-error);
    }
  }

  .btn-add {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: transparent;
    border: 1px dashed var(--border-secondary);
    border-radius: var(--radius-md);
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

  .errors-card {
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border-color: var(--color-error);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    color: var(--color-error);
    font-size: 0.9375rem;
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border-color: var(--color-info);

    p {
      margin: 0;
      color: var(--text-primary);
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

  .output-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-lg);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
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
