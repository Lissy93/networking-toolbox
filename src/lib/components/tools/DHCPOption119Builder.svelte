<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import {
    buildOption119,
    parseOption119,
    getDefaultOption119Config,
    type DomainSearchConfig,
    type DomainSearchResult,
    type ParsedDomainSearch,
  } from '$lib/utils/dhcp-option119.js';

  const modeOptions = [
    { value: 'encode' as const, label: 'Encode', icon: 'wrench' },
    { value: 'decode' as const, label: 'Decode', icon: 'search' },
  ];

  let mode = $state<'encode' | 'decode'>('encode');
  let config = $state<DomainSearchConfig>({
    ...getDefaultOption119Config(),
    network: {
      subnet: '',
      netmask: '',
      rangeStart: '',
      rangeEnd: '',
    },
  });
  let result = $state<DomainSearchResult | null>(null);
  let decodeInput = $state<string>('');
  let decodeResult = $state<ParsedDomainSearch | null>(null);
  let validationErrors = $state<string[]>([]);
  let networkValidationErrors = $state<string[]>([]);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  interface EncodeExample {
    label: string;
    domains: string[];
    description: string;
  }

  interface DecodeExample {
    label: string;
    hexInput: string;
    description: string;
  }

  const encodeExamples: EncodeExample[] = [
    {
      label: 'Corporate',
      domains: ['corp.example.com', 'example.com'],
      description: 'Corporate network with domain compression',
    },
    {
      label: 'Multi-site',
      domains: ['site1.example.com', 'site2.example.com', 'example.com'],
      description: 'Multiple sites sharing common suffix',
    },
    {
      label: 'Development',
      domains: ['dev.example.com', 'staging.example.com', 'example.com'],
      description: 'Development environments',
    },
  ];

  const decodeExamples: DecodeExample[] = [
    {
      label: 'Corporate',
      hexInput: '04636f7270076578616d706c6503636f6d00c005',
      description: 'corp.example.com, example.com (with compression)',
    },
    {
      label: 'Multi-site',
      hexInput: '057369746531076578616d706c6503636f6d00057369746532c006c006',
      description: 'site1.example.com, site2.example.com, example.com',
    },
    {
      label: 'Single Domain',
      hexInput: '076578616d706c6503636f6d00',
      description: 'example.com (no compression)',
    },
  ];

  // Reactive generation - use untrack to prevent infinite loop
  $effect(() => {
    if (mode === 'encode') {
      // Track config and all its nested properties
      const currentDomains = [...config.domains];
      const currentNetwork = config.network ? { ...config.network } : undefined;

      untrack(() => {
        validateAndEncode({ domains: currentDomains, network: currentNetwork });
        checkIfExampleStillMatches();
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      decodeInput;

      untrack(() => {
        checkIfExampleStillMatches();
      });
    }
  });

  // Clear selected example when switching modes
  $effect(() => {
    void mode;
    untrack(() => {
      selectedExampleIndex = null;
    });
  });

  function validateAndEncode(cfg: DomainSearchConfig = config) {
    const domainErrors: string[] = [];
    const netErrors: string[] = [];

    // Validate domains
    if (cfg.domains.length === 0) {
      domainErrors.push('At least one domain is required');
    }

    for (let i = 0; i < cfg.domains.length; i++) {
      const domain = cfg.domains[i];

      if (!domain.trim()) {
        domainErrors.push(`Domain ${i + 1}: Value is required`);
        continue;
      }

      if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
        domainErrors.push(`Domain ${i + 1}: Invalid characters (use only letters, numbers, dots, hyphens)`);
        continue;
      }

      if (domain.startsWith('.') || domain.endsWith('.')) {
        domainErrors.push(`Domain ${i + 1}: Cannot start or end with a dot`);
        continue;
      }

      if (domain.includes('..')) {
        domainErrors.push(`Domain ${i + 1}: Cannot contain consecutive dots`);
        continue;
      }

      if (domain.length > 253) {
        domainErrors.push(`Domain ${i + 1}: Exceeds maximum length of 253 characters`);
        continue;
      }

      const labels = domain.split('.');
      for (const label of labels) {
        if (label.length === 0) {
          domainErrors.push(`Domain ${i + 1}: Empty label found`);
          break;
        }
        if (label.length > 63) {
          domainErrors.push(`Domain ${i + 1}: Label "${label}" exceeds maximum length of 63 characters`);
          break;
        }
        if (label.startsWith('-') || label.endsWith('-')) {
          domainErrors.push(`Domain ${i + 1}: Label "${label}" cannot start or end with hyphen`);
          break;
        }
      }
    }

    // Validate network settings if provided
    if (cfg.network) {
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

      if (cfg.network.subnet && cfg.network.subnet.trim() && !ipv4Regex.test(cfg.network.subnet)) {
        netErrors.push('Invalid subnet address');
      }

      if (cfg.network.netmask && cfg.network.netmask.trim() && !ipv4Regex.test(cfg.network.netmask)) {
        netErrors.push('Invalid netmask');
      }

      if (cfg.network.rangeStart && cfg.network.rangeStart.trim() && !ipv4Regex.test(cfg.network.rangeStart)) {
        netErrors.push('Invalid range start address');
      }

      if (cfg.network.rangeEnd && cfg.network.rangeEnd.trim() && !ipv4Regex.test(cfg.network.rangeEnd)) {
        netErrors.push('Invalid range end address');
      }
    }

    validationErrors = domainErrors;
    networkValidationErrors = netErrors;

    if (domainErrors.length === 0) {
      try {
        result = buildOption119(cfg);
      } catch (error) {
        validationErrors = [error instanceof Error ? error.message : 'Encoding failed'];
        result = null;
      }
    } else {
      result = null;
    }
  }

  function decode() {
    if (!decodeInput.trim()) {
      decodeResult = null;
      validationErrors = [];
      return;
    }

    if (!/^[0-9a-fA-F\s:]+$/.test(decodeInput)) {
      validationErrors = ['Invalid hex input: only hexadecimal characters allowed'];
      decodeResult = null;
      return;
    }

    try {
      validationErrors = [];
      decodeResult = parseOption119(decodeInput);
    } catch (error) {
      validationErrors = [error instanceof Error ? error.message : 'Decoding failed'];
      decodeResult = null;
    }
  }

  function addDomain() {
    config.domains = [...config.domains, ''];
  }

  function removeDomain(index: number) {
    if (config.domains.length > 1) {
      config.domains = config.domains.filter((_, i) => i !== index);
    }
  }

  function loadEncodeExample(example: EncodeExample, index: number) {
    config = {
      domains: [...example.domains],
      network: {
        subnet: '',
        netmask: '',
        rangeStart: '',
        rangeEnd: '',
      },
    };
    selectedExampleIndex = index;
  }

  function loadDecodeExample(example: DecodeExample, index: number) {
    decodeInput = example.hexInput;
    selectedExampleIndex = index;
    decode();
  }

  function checkIfExampleStillMatches() {
    if (selectedExampleIndex === null) return;

    if (mode === 'encode') {
      const example = encodeExamples[selectedExampleIndex];
      if (!example) {
        selectedExampleIndex = null;
        return;
      }

      // Check if current config matches the selected example
      const matches =
        config.domains.length === example.domains.length &&
        config.domains.every((_domain, i) => _domain === example.domains[i]);

      if (!matches) {
        selectedExampleIndex = null;
      }
    } else {
      const example = decodeExamples[selectedExampleIndex];
      if (!example) {
        selectedExampleIndex = null;
        return;
      }

      if (decodeInput !== example.hexInput) {
        selectedExampleIndex = null;
      }
    }
  }
</script>

<ToolContentContainer
  title="DHCP Option 119 - Domain Search List"
  description="Encode and decode Domain Search List (RFC 3397/6731) to/from RFC 1035 wire format with domain compression. Generate configurations for ISC dhcpd and Kea DHCP."
  navOptions={modeOptions}
  bind:selectedNav={mode}
>
  {#if mode === 'encode'}
    <ExamplesCard
      examples={encodeExamples}
      onSelect={loadEncodeExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
      selectedIndex={selectedExampleIndex}
    />
  {:else}
    <ExamplesCard
      examples={decodeExamples}
      onSelect={loadDecodeExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
      selectedIndex={selectedExampleIndex}
    />
  {/if}

  {#if mode === 'encode'}
    <div class="card input-card">
      <div class="card-header">
        <h3>Domain List</h3>
      </div>
      <div class="card-content">
        {#each config.domains as _, i (`domain-${i}`)}
          <div class="domain-group">
            <div class="domain-header">
              <h4>
                <Icon name="globe" size="sm" />Domain {i + 1}
              </h4>
              <!-- <label for="domain-{i}">  
                Domain Name
              </label> -->
              {#if config.domains.length > 1}
                <button type="button" class="btn-icon" onclick={() => removeDomain(i)}>
                  <Icon name="x" size="sm" />
                </button>
              {/if}
            </div>

            <div class="input-group">
              <input id="domain-{i}" type="text" bind:value={config.domains[i]} placeholder="example.com" />
            </div>
          </div>
        {/each}

        <button type="button" class="btn-add" onclick={addDomain}>
          <Icon name="plus" size="sm" />
          Add Domain
        </button>
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
        <h3>Encoded Option 119</h3>

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

        <div class="summary-card">
          <div><strong>Total Length:</strong> {result.totalLength} bytes</div>
          <div><strong>Domains:</strong> {result.domainList.length}</div>
        </div>
      </div>
    {/if}

    <hr />

    {#if result}
      <div class="card input-card">
        <div class="card-header">
          <h3>Network Settings (Optional)</h3>
          <p class="help-text">Customize network values for configuration examples below</p>
        </div>
        <div class="card-content">
          <div class="input-row">
            <div class="input-group">
              <label for="subnet">
                <Icon name="network" size="sm" />
                Subnet
              </label>
              <input id="subnet" type="text" bind:value={config.network!.subnet} placeholder="192.168.1.0" />
            </div>

            <div class="input-group">
              <label for="netmask">
                <Icon name="network" size="sm" />
                Netmask
              </label>
              <input id="netmask" type="text" bind:value={config.network!.netmask} placeholder="255.255.255.0" />
            </div>
          </div>

          <div class="input-row">
            <div class="input-group">
              <label for="range-start">
                <Icon name="arrow-right" size="sm" />
                Range Start
              </label>
              <input id="range-start" type="text" bind:value={config.network!.rangeStart} placeholder="192.168.1.100" />
            </div>

            <div class="input-group">
              <label for="range-end">
                <Icon name="arrow-right" size="sm" />
                Range End
              </label>
              <input id="range-end" type="text" bind:value={config.network!.rangeEnd} placeholder="192.168.1.200" />
            </div>
          </div>
        </div>

        {#if networkValidationErrors.length > 0}
          <div class="network-errors">
            <h4>Network Settings Errors</h4>
            {#each networkValidationErrors as error, i (i)}
              <div class="network-error-item">
                <Icon name="alert-triangle" size="sm" />
                {error}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if result && networkValidationErrors.length === 0}
      <div class="card results">
        <h3>Configuration Examples</h3>

        {#if result.examples.iscDhcpd}
          <div class="output-group">
            <div class="output-header">
              <h4>ISC dhcpd Configuration</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('isc')}
                onclick={() => clipboard.copy(result!.examples.iscDhcpd!, 'isc')}
              >
                <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('isc') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.iscDhcpd}</pre>
          </div>
        {/if}

        {#if result.examples.keaDhcp4}
          <div class="output-group">
            <div class="output-header">
              <h4>Kea DHCPv4 Configuration</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('kea')}
                onclick={() => clipboard.copy(result!.examples.keaDhcp4!, 'kea')}
              >
                <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('kea') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.keaDhcp4}</pre>
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="card input-card">
      <div class="card-header">
        <h3>Decode Option 119 Hex</h3>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="decode-input">
            <Icon name="code" size="sm" />
            Hex-Encoded Option 119
          </label>
          <textarea
            id="decode-input"
            bind:value={decodeInput}
            placeholder="Enter hex string (e.g., 0765786d706c6503636f6d00)"
            rows="4"
          ></textarea>
        </div>
        <button type="button" class="btn-primary" onclick={decode}>
          <Icon name="search" size="sm" />
          Decode
        </button>
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

    {#if decodeResult && validationErrors.length === 0}
      <div class="card results">
        <h3>Decoded Domain Search List</h3>

        <div class="summary-card">
          <div><strong>Total Length:</strong> {decodeResult.totalLength} bytes</div>
          <div><strong>Domains Found:</strong> {decodeResult.domains.length}</div>
        </div>

        <div class="domains-section">
          <h4>Domain List</h4>
          {#each decodeResult.domains as domain, i (i)}
            <div class="domain-item">
              <Icon name="globe" size="sm" />
              <span>{domain}</span>
            </div>
          {/each}
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
  }

  .domain-group {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .domain-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-secondary);

    h4 {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
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
    textarea {
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

    textarea {
      resize: vertical;
      font-family: var(--font-mono);
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

  .btn-add,
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
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
    }
  }

  .btn-primary {
    border-style: solid;
    background: var(--color-primary);
    color: var(--bg-primary);
    border-color: var(--color-primary);

    &:hover {
      background: var(--color-primary-dark);
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

  .summary-card {
    display: flex;
    gap: var(--spacing-lg);
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

  .domains-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);

    h4 {
      margin: 0 0 var(--spacing-xs);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .domain-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 0.9375rem;
    color: var(--text-primary);
  }

  .network-errors {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);

    h4 {
      margin: 0 0 var(--spacing-sm);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-error);
    }
  }

  .network-error-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) 0;
    color: var(--color-error);
    font-size: 0.875rem;
  }
</style>
