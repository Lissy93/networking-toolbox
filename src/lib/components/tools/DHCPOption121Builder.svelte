<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import {
    buildOption121,
    parseOption121,
    getDefaultOption121Config,
    type ClasslessRoutesConfig,
    type ClasslessRoutesResult,
    type ParsedClasslessRoutes,
  } from '$lib/utils/dhcp-option121.js';

  const modeOptions = [
    { value: 'encode' as const, label: 'Encode', icon: 'wrench' },
    { value: 'decode' as const, label: 'Decode', icon: 'search' },
  ];

  let mode = $state<'encode' | 'decode'>('encode');
  let config = $state<ClasslessRoutesConfig>({
    ...getDefaultOption121Config(),
    network: {
      subnet: '',
      netmask: '',
      rangeStart: '',
      rangeEnd: '',
    },
  });
  let result = $state<ClasslessRoutesResult | null>(null);
  let decodeInput = $state<string>('');
  let decodeResult = $state<ParsedClasslessRoutes | null>(null);
  let validationErrors = $state<string[]>([]);
  let networkValidationErrors = $state<string[]>([]);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  interface EncodeExample {
    label: string;
    routes: Array<{ destination: string; gateway: string }>;
    description: string;
  }

  interface DecodeExample {
    label: string;
    hexInput: string;
    description: string;
  }

  const encodeExamples: EncodeExample[] = [
    {
      label: 'Private Networks',
      routes: [
        { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
        { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
      ],
      description: 'Routes to RFC 1918 private networks',
    },
    {
      label: 'Default + Specific',
      routes: [
        { destination: '0.0.0.0/0', gateway: '192.168.1.1' },
        { destination: '10.10.0.0/16', gateway: '192.168.1.254' },
      ],
      description: 'Default route with specific override',
    },
    {
      label: 'Multi-site VPN',
      routes: [
        { destination: '10.1.0.0/16', gateway: '192.168.1.10' },
        { destination: '10.2.0.0/16', gateway: '192.168.1.20' },
        { destination: '10.3.0.0/16', gateway: '192.168.1.30' },
      ],
      description: 'Multiple VPN site routes',
    },
  ];

  const decodeExamples: DecodeExample[] = [
    {
      label: 'Private Networks',
      hexInput: '080ac0a801010cac10c0a80101',
      description: '10.0.0.0/8 and 172.16.0.0/12 via 192.168.1.1',
    },
    {
      label: 'Default Route',
      hexInput: '00c0a80101',
      description: '0.0.0.0/0 via 192.168.1.1',
    },
    {
      label: 'Specific /24',
      hexInput: '18c0a80ac0a80101',
      description: '192.168.10.0/24 via 192.168.1.1',
    },
  ];

  // Reactive generation - use untrack to prevent infinite loop
  $effect(() => {
    if (mode === 'encode') {
      // Track config and all its nested properties
      const currentRoutes = config.routes.map((r) => ({ ...r }));
      const currentNetwork = config.network ? { ...config.network } : undefined;

      untrack(() => {
        validateAndEncode({ routes: currentRoutes, network: currentNetwork });
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

  function validateAndEncode(cfg: ClasslessRoutesConfig = config) {
    const routeErrors: string[] = [];
    const netErrors: string[] = [];

    // Validate routes
    if (cfg.routes.length === 0) {
      routeErrors.push('At least one route is required');
    }

    for (let i = 0; i < cfg.routes.length; i++) {
      const route = cfg.routes[i];

      if (!route.destination.trim()) {
        routeErrors.push(`Route ${i + 1}: Destination is required`);
        continue;
      }

      if (!route.gateway.trim()) {
        routeErrors.push(`Route ${i + 1}: Gateway is required`);
        continue;
      }

      // Validate CIDR format
      const cidrMatch = route.destination.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
      if (!cidrMatch) {
        routeErrors.push(`Route ${i + 1}: Invalid CIDR notation (use format: x.x.x.x/y)`);
        continue;
      }

      const [, prefix, prefixLenStr] = cidrMatch;
      const prefixLen = parseInt(prefixLenStr, 10);

      if (prefixLen < 0 || prefixLen > 32) {
        routeErrors.push(`Route ${i + 1}: Prefix length must be 0-32`);
        continue;
      }

      // Validate IPv4 address in CIDR
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      if (!ipv4Regex.test(prefix)) {
        routeErrors.push(`Route ${i + 1}: Invalid IPv4 address in destination`);
        continue;
      }

      const octets = prefix.split('.').map((o) => parseInt(o, 10));
      if (octets.some((o) => o > 255)) {
        routeErrors.push(`Route ${i + 1}: Invalid IPv4 address (octets must be 0-255)`);
        continue;
      }

      // Validate gateway
      if (!ipv4Regex.test(route.gateway)) {
        routeErrors.push(`Route ${i + 1}: Invalid gateway IPv4 address`);
        continue;
      }

      const gwOctets = route.gateway.split('.').map((o) => parseInt(o, 10));
      if (gwOctets.some((o) => o > 255)) {
        routeErrors.push(`Route ${i + 1}: Invalid gateway address (octets must be 0-255)`);
        continue;
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

    validationErrors = routeErrors;
    networkValidationErrors = netErrors;

    if (routeErrors.length === 0) {
      try {
        result = buildOption121(cfg);
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
      decodeResult = parseOption121(decodeInput);
    } catch (error) {
      validationErrors = [error instanceof Error ? error.message : 'Decoding failed'];
      decodeResult = null;
    }
  }

  function addRoute() {
    config.routes = [...config.routes, { destination: '', gateway: '' }];
  }

  function removeRoute(index: number) {
    if (config.routes.length > 1) {
      config.routes = config.routes.filter((_, i) => i !== index);
    }
  }

  function loadEncodeExample(example: EncodeExample, index: number) {
    config = {
      routes: example.routes.map((r) => ({ ...r })),
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
        config.routes.length === example.routes.length &&
        config.routes.every(
          (route, i) =>
            route.destination === example.routes[i].destination && route.gateway === example.routes[i].gateway,
        );

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
  title="DHCP Option 121/249 - Classless Static Routes"
  description="Encode and decode Classless Static Routes (RFC 3442 / MSFT 249) with bit-packed network prefixes. Generate configurations for ISC dhcpd and Kea DHCP."
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
        <h3>Static Routes</h3>
      </div>
      <div class="card-content">
        {#each config.routes as _, i (`route-${i}`)}
          <div class="route-group">
            <div class="route-header">
              <h4>
                <Icon name="compass" size="sm" />Route {i + 1}
              </h4>
              {#if config.routes.length > 1}
                <button type="button" class="btn-icon" onclick={() => removeRoute(i)}>
                  <Icon name="x" size="sm" />
                </button>
              {/if}
            </div>

            <div class="input-row">
              <div class="input-group">
                <label for="destination-{i}">
                  <Icon name="target" size="sm" />
                  Destination (CIDR)
                </label>
                <input
                  id="destination-{i}"
                  type="text"
                  bind:value={config.routes[i].destination}
                  placeholder="10.0.0.0/8"
                />
              </div>

              <div class="input-group">
                <label for="gateway-{i}">
                  <Icon name="arrow-right" size="sm" />
                  Gateway
                </label>
                <input id="gateway-{i}" type="text" bind:value={config.routes[i].gateway} placeholder="192.168.1.1" />
              </div>
            </div>
          </div>
        {/each}

        <button type="button" class="btn-add" onclick={addRoute}>
          <Icon name="plus" size="sm" />
          Add Route
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
        <h3>Encoded Option 121/249</h3>

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
          <div><strong>Routes:</strong> {result.routes.length}</div>
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
              <h4>ISC dhcpd Configuration (Option 121)</h4>
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

        {#if result.examples.msftOption249}
          <div class="output-group">
            <div class="output-header">
              <h4>Microsoft Option 249 Configuration</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('msft')}
                onclick={() => clipboard.copy(result!.examples.msftOption249!, 'msft')}
              >
                <Icon name={clipboard.isCopied('msft') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('msft') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.msftOption249}</pre>
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="card input-card">
      <div class="card-header">
        <h3>Decode Option 121/249 Hex</h3>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="decode-input">
            <Icon name="code" size="sm" />
            Hex-Encoded Option 121/249
          </label>
          <textarea
            id="decode-input"
            bind:value={decodeInput}
            placeholder="Enter hex string (e.g., 080ac0a80101acc01000c0a80101)"
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
        <h3>Decoded Classless Static Routes</h3>

        <div class="summary-card">
          <div><strong>Total Length:</strong> {decodeResult.totalLength} bytes</div>
          <div><strong>Routes Found:</strong> {decodeResult.routes.length}</div>
        </div>

        <div class="routes-section">
          <h4>Route List</h4>
          {#each decodeResult.routes as route, i (i)}
            <div class="route-item">
              <div class="route-field">
                <Icon name="target" size="sm" />
                <span class="field-label">Destination:</span>
                <span class="field-value">{route.destination}</span>
              </div>
              <div class="route-field">
                <Icon name="arrow-right" size="sm" />
                <span class="field-label">Gateway:</span>
                <span class="field-value">{route.gateway}</span>
              </div>
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

  .route-group {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .route-header {
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

  .routes-section {
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

  .route-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .route-field {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.9375rem;

    .field-label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .field-value {
      font-family: var(--font-mono);
      color: var(--text-primary);
    }
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
