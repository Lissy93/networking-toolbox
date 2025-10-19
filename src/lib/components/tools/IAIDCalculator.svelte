<script lang="ts">
  import {
    type IAIDConfig,
    type IAIDResult,
    validateIAIDConfig,
    calculateIAID,
    IAID_EXAMPLES,
    INTERFACE_NAMING_GUIDE,
  } from '$lib/utils/dhcp-iaid-calculator';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';

  let method = $state<'interface-index' | 'interface-name' | 'mac-address' | 'custom'>('interface-index');
  let interfaceIndex = $state<number | undefined>(undefined);
  let interfaceName = $state('');
  let macAddress = $state('');
  let customValue = $state<number | undefined>(undefined);

  let validationErrors = $state<string[]>([]);
  let result = $state<IAIDResult | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  interface IAIDExample {
    label: string;
    config: IAIDConfig & { name: string; description: string };
    description: string;
  }

  const examples: IAIDExample[] = IAID_EXAMPLES.map((ex) => ({
    label: ex.name,
    config: ex,
    description: ex.description,
  }));

  function loadExample(example: IAIDExample, index: number): void {
    const cfg = example.config;
    method = cfg.method;
    interfaceIndex = cfg.interfaceIndex;
    interfaceName = cfg.interfaceName || '';
    macAddress = cfg.macAddress || '';
    customValue = cfg.customValue;
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
      method === cfg.method &&
      interfaceIndex === cfg.interfaceIndex &&
      interfaceName === (cfg.interfaceName || '') &&
      macAddress === (cfg.macAddress || '') &&
      customValue === cfg.customValue;

    if (!matches) {
      selectedExampleIndex = null;
    }
  }

  $effect(() => {
    const currentMethod = method;
    const currentInterfaceIndex = interfaceIndex;
    const currentInterfaceName = interfaceName;
    const currentMACAddress = macAddress;
    const currentCustomValue = customValue;

    untrack(() => {
      const config: IAIDConfig = {
        method: currentMethod,
        interfaceIndex: currentInterfaceIndex,
        interfaceName: currentInterfaceName,
        macAddress: currentMACAddress,
        customValue: currentCustomValue,
      };

      const isInitialState =
        (currentMethod === 'interface-index' && currentInterfaceIndex === undefined) ||
        (currentMethod === 'interface-name' && !currentInterfaceName.trim()) ||
        (currentMethod === 'mac-address' && !currentMACAddress.trim()) ||
        (currentMethod === 'custom' && currentCustomValue === undefined);

      if (isInitialState) {
        validationErrors = [];
        result = null;
      } else {
        validationErrors = validateIAIDConfig(config);

        if (validationErrors.length === 0) {
          try {
            result = calculateIAID(config);
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
  title="IAID Calculator"
  description="Calculate Identity Association Identifier (IAID) for DHCPv6 interfaces. Generate IAIDs from interface index, name, MAC address, or custom values with OS-specific conventions."
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
      <h3>IAID Configuration</h3>
      <p class="help-text">Select method to generate Identity Association Identifier</p>
    </div>
    <div class="card-content">
      <div class="input-group">
        <label for="method">
          <Icon name="settings" size="sm" />
          Generation Method
        </label>
        <select id="method" bind:value={method}>
          <option value="interface-index">Interface Index</option>
          <option value="interface-name">Interface Name (hash)</option>
          <option value="mac-address">MAC Address (hash)</option>
          <option value="custom">Custom Value</option>
        </select>
      </div>

      {#if method === 'interface-index'}
        <div class="input-group">
          <label for="interface-index">
            <Icon name="hash" size="sm" />
            Interface Index
          </label>
          <input
            id="interface-index"
            type="number"
            bind:value={interfaceIndex}
            placeholder="e.g., 2 for eth0, 3 for wlan0"
            min="0"
            max="4294967295"
          />
          <small>Network interface index (0-4294967295)</small>
        </div>
      {/if}

      {#if method === 'interface-name'}
        <div class="input-group">
          <label for="interface-name">
            <Icon name="network" size="sm" />
            Interface Name
          </label>
          <input id="interface-name" type="text" bind:value={interfaceName} placeholder="e.g., eth0, wlan0, enp3s0" />
          <small>Network interface name (will be hashed to generate IAID)</small>
        </div>
      {/if}

      {#if method === 'mac-address'}
        <div class="input-group">
          <label for="mac-address">
            <Icon name="cpu" size="sm" />
            MAC Address
          </label>
          <input id="mac-address" type="text" bind:value={macAddress} placeholder="00:0c:29:4f:a3:d2" />
          <small>Hardware address (last 4 bytes used for IAID)</small>
        </div>
      {/if}

      {#if method === 'custom'}
        <div class="input-group">
          <label for="custom-value">
            <Icon name="edit" size="sm" />
            Custom IAID Value
          </label>
          <input
            id="custom-value"
            type="number"
            bind:value={customValue}
            placeholder="Enter value between 0 and 4294967295"
            min="0"
            max="4294967295"
          />
          <small>32-bit unsigned integer (0-4294967295)</small>
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
      <h3>Calculated IAID</h3>

      <div class="summary-card">
        <div><strong>Method:</strong> {result.method}</div>
        <div><strong>IAID:</strong> {result.iaid}</div>
      </div>

      {#if result.collisionWarning}
        <div class="warning-card">
          <Icon name="alert-triangle" size="sm" />
          {result.collisionWarning}
        </div>
      {/if}

      <div class="output-group">
        <div class="output-header">
          <h4>Hexadecimal</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('hex')}
            onclick={() => clipboard.copy(result!.hex, 'hex')}
          >
            <Icon name={clipboard.isCopied('hex') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('hex') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{result.hex}</pre>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Decimal</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('decimal')}
            onclick={() => clipboard.copy(result!.decimal, 'decimal')}
          >
            <Icon name={clipboard.isCopied('decimal') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('decimal') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{result.decimal}</pre>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Binary</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('binary')}
            onclick={() => clipboard.copy(result!.binary, 'binary')}
          >
            <Icon name={clipboard.isCopied('binary') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('binary') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{result.binary}</pre>
      </div>
    </div>

    <div class="card results">
      <h3>OS-Specific Conventions</h3>
      <p class="help-text">How different operating systems typically generate IAIDs</p>

      <div class="os-conventions">
        {#each [{ icon: 'linux', name: 'Linux', text: result.osConventions.linux }, { icon: 'windows', name: 'Windows', text: result.osConventions.windows }, { icon: 'mac', name: 'macOS', text: result.osConventions.macos }, { icon: 'bsd', name: 'FreeBSD', text: result.osConventions.freebsd }] as os (os.name)}
          {#if os.text}
            <div class="os-item">
              <div class="os-label">
                <Icon name={os.icon} size="sm" />
                <strong>{os.name}</strong>
              </div>
              <div class="os-description">{os.text}</div>
            </div>
          {/if}
        {/each}
      </div>
    </div>

    {#each [{ title: 'Kea DHCPv6 Configuration', content: result?.configExamples?.keaDhcp6, key: 'kea' }, { title: 'ISC DHCPd Configuration', content: result?.configExamples?.iscDhcpd, key: 'isc' }] as config (config.key)}
      {#if config.content}
        <div class="card results">
          <div class="card-header-with-action">
            <h3>{config.title}</h3>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied(config.key)}
              onclick={() => clipboard.copy(config.content!, config.key)}
            >
              <Icon name={clipboard.isCopied(config.key) ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied(config.key) ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{config.content}</pre>
        </div>
      {/if}
    {/each}
  {/if}

  <div class="card naming-guide-wrap">
    <h3>Network Interface Naming Guide</h3>
    <p class="help-text">Common interface naming conventions across different operating systems</p>

    <div class="naming-guide">
      {#each [{ icon: 'linux', data: INTERFACE_NAMING_GUIDE.linux }, { icon: 'windows', data: INTERFACE_NAMING_GUIDE.windows }, { icon: 'mac', data: INTERFACE_NAMING_GUIDE.macos }, { icon: 'bsd', data: INTERFACE_NAMING_GUIDE.freebsd }] as osGuide (osGuide.data.title)}
        <div class="naming-os">
          <div class="naming-os-header">
            <Icon name={osGuide.icon} size="sm" />
            <strong>{osGuide.data.title}</strong>
          </div>
          <div class="naming-conventions">
            {#each osGuide.data.conventions as convention (convention.pattern)}
              <div class="naming-item">
                <code class="naming-pattern">{convention.pattern}</code>
                <span class="naming-description">{convention.description}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
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

    &.naming-guide-wrap {
      background: var(--bg-tertiary);
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

  .os-conventions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--spacing-md);

    .os-item {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);

      .os-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        color: var(--text-primary);
        font-size: 0.9375rem;

        strong {
          font-weight: 600;
        }
      }

      .os-description {
        color: var(--text-secondary);
        font-size: 0.875rem;
        line-height: 1.5;
      }
    }
  }

  .naming-guide {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--spacing-md);

    .naming-os {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      padding: var(--spacing-sm);

      .naming-os-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding-bottom: var(--spacing-sm);
        border-bottom: 2px solid var(--border-primary);
        font-size: 1rem;
        color: var(--text-primary);

        strong {
          font-weight: 600;
        }
      }

      .naming-conventions {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);

        .naming-item {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm);
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);

          .naming-pattern {
            font-family: var(--font-mono);
            font-size: 0.875rem;
            color: var(--color-primary);
            font-weight: 600;
            background: var(--bg-primary);
          }

          .naming-description {
            font-size: 0.8125rem;
            color: var(--text-secondary);
            line-height: 1.4;
          }
        }
      }
    }
  }
</style>
