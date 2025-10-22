<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import {
    type FQDNConfig,
    type FQDNResult,
    buildFQDNOption,
    getDefaultFQDNConfig,
    validateFQDNConfig,
    FQDN_EXAMPLES,
  } from '$lib/utils/dhcpv6-fqdn-rfc4704';

  let config = $state<FQDNConfig>(getDefaultFQDNConfig());
  let result = $state<FQDNResult | null>(null);
  let validationErrors = $state<string[]>([]);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  function loadExample(example: FQDNConfig & { label: string; description: string }, index: number): void {
    config = {
      fqdn: example.fqdn,
      serverShouldUpdate: example.serverShouldUpdate,
      serverOverride: example.serverOverride,
      clientShouldUpdate: example.clientShouldUpdate,
    };
    selectedExampleIndex = index;
  }

  function checkIfExampleStillMatches(): void {
    if (selectedExampleIndex === null) return;

    const example = FQDN_EXAMPLES[selectedExampleIndex];
    if (!example) {
      selectedExampleIndex = null;
      return;
    }

    const matches =
      config.fqdn === example.fqdn &&
      config.serverShouldUpdate === example.serverShouldUpdate &&
      config.serverOverride === example.serverOverride &&
      config.clientShouldUpdate === example.clientShouldUpdate;

    if (!matches) {
      selectedExampleIndex = null;
    }
  }

  $effect(() => {
    // Read config properties to trigger effect when they change
    const currentFqdn = config.fqdn;
    const currentServerUpdate = config.serverShouldUpdate;
    const currentServerOverride = config.serverOverride;
    const currentClientUpdate = config.clientShouldUpdate;

    // Update validationErrors and result without tracking them (prevents infinite loop)
    untrack(() => {
      const currentConfig: FQDNConfig = {
        fqdn: currentFqdn,
        serverShouldUpdate: currentServerUpdate,
        serverOverride: currentServerOverride,
        clientShouldUpdate: currentClientUpdate,
      };

      // Check if form is in initial empty state
      const isInitialState = !currentConfig.fqdn.trim();

      if (isInitialState) {
        validationErrors = [];
        result = null;
      } else {
        validationErrors = validateFQDNConfig(currentConfig);

        if (validationErrors.length === 0) {
          try {
            result = buildFQDNOption(currentConfig);
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
  title="DHCPv6 Client FQDN Option (RFC 4704)"
  description="Configure the Client FQDN Option (Option 39) for DHCPv6, enabling dynamic DNS updates and hostname management for IPv6 clients."
>
  <ExamplesCard
    examples={FQDN_EXAMPLES}
    onSelect={loadExample}
    getLabel={(ex) => ex.label}
    getDescription={(ex) => ex.description}
    selectedIndex={selectedExampleIndex}
  />

  <div class="card input-card">
    <div class="card-header">
      <h3>FQDN Configuration</h3>
      <p class="help-text">Fully Qualified Domain Name for the DHCPv6 client</p>
    </div>
    <div class="card-content">
      <div class="input-group">
        <label for="fqdn">
          <Icon name="globe" size="sm" />
          Fully Qualified Domain Name (FQDN)
        </label>
        <input id="fqdn" type="text" bind:value={config.fqdn} placeholder="client.example.com" />
      </div>
    </div>
  </div>

  <div class="card input-card">
    <div class="card-header">
      <h3>DNS Update Flags</h3>
      <p class="help-text">Control how DNS updates are performed</p>
    </div>
    <div class="card-content flags-content">
      <div class="checkbox-group">
        <input id="server-update" type="checkbox" bind:checked={config.serverShouldUpdate} />
        <label for="server-update">
          <Icon name="server" size="sm" />
          <div class="checkbox-text">
            <strong>Server Should Update DNS (S Flag)</strong>
            <span class="help-text">Server will perform AAAA and PTR record updates</span>
          </div>
        </label>
      </div>

      <div class="checkbox-group">
        <input id="server-override" type="checkbox" bind:checked={config.serverOverride} />
        <label for="server-override">
          <Icon name="shield" size="sm" />
          <div class="checkbox-text">
            <strong>Server Override (O Flag)</strong>
            <span class="help-text">Server can override client's preferences</span>
          </div>
        </label>
      </div>

      <div class="checkbox-group">
        <input id="client-update" type="checkbox" bind:checked={config.clientShouldUpdate} />
        <label for="client-update">
          <Icon name="user" size="sm" />
          <div class="checkbox-text">
            <strong>Client Should Update DNS (N Flag = 0)</strong>
            <span class="help-text">Client will perform its own DNS updates</span>
          </div>
        </label>
      </div>
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
      <h3>Option 39: Client FQDN</h3>

      <div class="summary-card">
        <div><strong>FQDN:</strong> {result.fqdn}</div>
        <div><strong>Total Length:</strong> {result.totalLength} bytes</div>
      </div>

      <div class="flags-section">
        <h4>Flags Breakdown</h4>
        <div class="flags-grid">
          <div class="flag-item" class:active={result.flags.S}>
            <Icon name="server" size="sm" />
            <div class="flag-content">
              <strong>S Flag</strong>
              <span>{result.flags.S ? 'Set' : 'Not Set'}</span>
            </div>
          </div>
          <div class="flag-item" class:active={result.flags.O}>
            <Icon name="shield" size="sm" />
            <div class="flag-content">
              <strong>O Flag</strong>
              <span>{result.flags.O ? 'Set' : 'Not Set'}</span>
            </div>
          </div>
          <div class="flag-item" class:active={result.flags.N}>
            <Icon name="user" size="sm" />
            <div class="flag-content">
              <strong>N Flag</strong>
              <span>{result.flags.N ? 'Set' : 'Not Set'}</span>
            </div>
          </div>
        </div>

        <div class="flag-descriptions">
          {#each result.flags.description as desc, i (i)}
            <div class="flag-desc-item">
              <Icon name="info" size="xs" />
              {desc}
            </div>
          {/each}
        </div>

        <div class="output-group">
          <div class="output-header">
            <h4>Flags Byte</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('flags')}
              onclick={() => clipboard.copy(result!.flags.flagsByte, 'flags')}
            >
              <Icon name={clipboard.isCopied('flags') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('flags') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.flags.flagsByte}</pre>
        </div>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Hex-Encoded (Compact)</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('hex')}
            onclick={() => clipboard.copy(result!.hexEncoded, 'hex')}
          >
            <Icon name={clipboard.isCopied('hex') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('hex') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{result.hexEncoded}</pre>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Wire Format (Spaced)</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('wire')}
            onclick={() => clipboard.copy(result!.wireFormat, 'wire')}
          >
            <Icon name={clipboard.isCopied('wire') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('wire') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{result.wireFormat}</pre>
      </div>

      <div class="breakdown-section">
        <h4>Encoding Breakdown</h4>
        <div class="breakdown-grid">
          <div class="breakdown-item">
            <span class="breakdown-label">Flags:</span>
            <span class="breakdown-value">{result.breakdown.flags}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">FQDN:</span>
            <span class="breakdown-value">{result.breakdown.fqdn}</span>
          </div>
        </div>
      </div>
    </div>

    {#if result.examples.keaDhcp6}
      <div class="card results">
        <h3>Configuration Example</h3>

        <div class="output-group">
          <div class="output-header">
            <h4>Kea DHCPv6 Configuration</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('kea')}
              onclick={() => clipboard.copy(result!.examples.keaDhcp6!, 'kea')}
            >
              <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('kea') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.keaDhcp6}</pre>
        </div>
      </div>
    {/if}

    <div class="card results info-card">
      <h3>About RFC 4704</h3>
      <p>
        RFC 4704 defines the Client FQDN Option for DHCPv6, enabling clients and servers to negotiate dynamic DNS
        updates for IPv6 addresses.
      </p>
      <ul>
        <li>
          <strong>S Flag (Bit 0):</strong> Server should perform DNS updates
        </li>
        <li>
          <strong>O Flag (Bit 1):</strong> Server can override client preferences
        </li>
        <li>
          <strong>N Flag (Bit 2):</strong> Client requests server to perform updates (client will NOT update)
        </li>
      </ul>
      <p>
        The FQDN is encoded using DNS wire format with length-prefixed labels, enabling automated hostname registration
        in DNS for IPv6 networks.
      </p>
    </div>
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

    h4 {
      margin: 0;
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

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);

    &.flags-content {
      gap: var(--spacing-lg);
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

    input[type='text'] {
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

  .checkbox-group {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;

    &:has(input:checked) {
      background: color-mix(in srgb, var(--color-primary), transparent 95%);
      border-color: var(--color-primary);
    }

    input[type='checkbox'] {
      margin-top: 0.25rem;
      width: 1.125rem;
      height: 1.125rem;
      cursor: pointer;
      accent-color: var(--color-primary);
    }

    label {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
      cursor: pointer;
      font-size: 0.9375rem;

      .checkbox-text {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);

        strong {
          color: var(--text-primary);
        }

        .help-text {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          font-style: italic;
          margin: 0;
        }
      }
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

  .results {
    background: var(--bg-tertiary);
    animation: slideIn 0.3s ease-out;

    &.info-card {
      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: var(--spacing-sm) 0;
      }

      ul {
        margin: var(--spacing-md) 0;
        padding-left: var(--spacing-xl);
        color: var(--text-secondary);
        line-height: 1.8;

        li {
          margin: var(--spacing-xs) 0;

          strong {
            color: var(--text-primary);
          }
        }
      }
    }
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

    div {
      strong {
        color: var(--text-primary);
      }
    }

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-xs);
    }
  }

  .flags-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);

    h4 {
      margin: 0 0 var(--spacing-xs);
    }
  }

  .flags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .flag-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    transition: all 0.2s ease;

    &.active {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      border-color: var(--color-success);

      .flag-content strong {
        color: var(--color-success);
      }
    }

    .flag-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      strong {
        color: var(--text-primary);
      }

      span {
        color: var(--text-secondary);
        font-size: 0.8125rem;
      }
    }
  }

  .flag-descriptions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .flag-desc-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border-left: 3px solid var(--color-info);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .breakdown-section {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    h4 {
      margin-bottom: var(--spacing-md);
    }
  }

  .breakdown-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .breakdown-item {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;

    .breakdown-label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .breakdown-value {
      font-family: var(--font-mono);
      color: var(--color-primary);
      overflow-x: auto;
    }
  }
</style>
