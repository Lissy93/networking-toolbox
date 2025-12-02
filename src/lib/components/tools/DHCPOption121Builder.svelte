<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import { t } from '$lib/stores/language';
  import {
    buildOption121,
    parseOption121,
    getDefaultOption121Config,
    type ClasslessRoutesConfig,
    type ClasslessRoutesResult,
    type ParsedClasslessRoutes,
  } from '$lib/utils/dhcp-option121.js';

  const modeOptions = $derived([
    { value: 'encode' as const, label: $t('tools/dhcp-option121-builder.modes.encode'), icon: 'wrench' },
    { value: 'decode' as const, label: $t('tools/dhcp-option121-builder.modes.decode'), icon: 'search' },
  ]);

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

  const encodeExamples = $derived<EncodeExample[]>([
    {
      label: $t('tools/dhcp-option121-builder.encodeExamples.privateNetworks.label'),
      routes: [
        { destination: '10.0.0.0/8', gateway: '192.168.1.1' },
        { destination: '172.16.0.0/12', gateway: '192.168.1.1' },
      ],
      description: $t('tools/dhcp-option121-builder.encodeExamples.privateNetworks.description'),
    },
    {
      label: $t('tools/dhcp-option121-builder.encodeExamples.defaultSpecific.label'),
      routes: [
        { destination: '0.0.0.0/0', gateway: '192.168.1.1' },
        { destination: '10.10.0.0/16', gateway: '192.168.1.254' },
      ],
      description: $t('tools/dhcp-option121-builder.encodeExamples.defaultSpecific.description'),
    },
    {
      label: $t('tools/dhcp-option121-builder.encodeExamples.multiSiteVPN.label'),
      routes: [
        { destination: '10.1.0.0/16', gateway: '192.168.1.10' },
        { destination: '10.2.0.0/16', gateway: '192.168.1.20' },
        { destination: '10.3.0.0/16', gateway: '192.168.1.30' },
      ],
      description: $t('tools/dhcp-option121-builder.encodeExamples.multiSiteVPN.description'),
    },
  ]);

  const decodeExamples = $derived<DecodeExample[]>([
    {
      label: $t('tools/dhcp-option121-builder.decodeExamples.privateNetworks.label'),
      hexInput: '080ac0a801010cac10c0a80101',
      description: $t('tools/dhcp-option121-builder.decodeExamples.privateNetworks.description'),
    },
    {
      label: $t('tools/dhcp-option121-builder.decodeExamples.defaultRoute.label'),
      hexInput: '00c0a80101',
      description: $t('tools/dhcp-option121-builder.decodeExamples.defaultRoute.description'),
    },
    {
      label: $t('tools/dhcp-option121-builder.decodeExamples.specific24.label'),
      hexInput: '18c0a80ac0a80101',
      description: $t('tools/dhcp-option121-builder.decodeExamples.specific24.description'),
    },
  ]);

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
      routeErrors.push($t('tools/dhcp-option121-builder.errors.atLeastOneRoute'));
    }

    for (let i = 0; i < cfg.routes.length; i++) {
      const route = cfg.routes[i];

      if (!route.destination.trim()) {
        routeErrors.push($t('tools/dhcp-option121-builder.errors.destinationRequired', { number: i + 1 }));
        continue;
      }

      if (!route.gateway.trim()) {
        routeErrors.push($t('tools/dhcp-option121-builder.errors.gatewayRequired', { number: i + 1 }));
        continue;
      }

      // Validate CIDR format
      const cidrMatch = route.destination.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
      if (!cidrMatch) {
        routeErrors.push($t('tools/dhcp-option121-builder.errors.invalidCIDR', { number: i + 1 }));
        continue;
      }

      const [, prefix, prefixLenStr] = cidrMatch;
      const prefixLen = parseInt(prefixLenStr, 10);

      if (prefixLen < 0 || prefixLen > 32) {
        routeErrors.push($t('tools/dhcp-option121-builder.errors.invalidPrefixLength', { number: i + 1 }));
        continue;
      }

      // Validate IPv4 address in CIDR
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      if (!ipv4Regex.test(prefix)) {
        routeErrors.push($t('tools/dhcp-option121-builder.errors.invalidIPv4Dest', { number: i + 1 }));
        continue;
      }

      const octets = prefix.split('.').map((o) => parseInt(o, 10));
      if (octets.some((o) => o > 255)) {
        routeErrors.push($t('tools/dhcp-option121-builder.errors.invalidIPv4Octets', { number: i + 1 }));
        continue;
      }

      // Validate gateway
      if (!ipv4Regex.test(route.gateway)) {
        routeErrors.push($t('tools/dhcp-option121-builder.errors.invalidGateway', { number: i + 1 }));
        continue;
      }

      const gwOctets = route.gateway.split('.').map((o) => parseInt(o, 10));
      if (gwOctets.some((o) => o > 255)) {
        routeErrors.push($t('tools/dhcp-option121-builder.errors.invalidGatewayOctets', { number: i + 1 }));
        continue;
      }
    }

    // Validate network settings if provided
    if (cfg.network) {
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

      if (cfg.network.subnet && cfg.network.subnet.trim() && !ipv4Regex.test(cfg.network.subnet)) {
        netErrors.push($t('tools/dhcp-option121-builder.errors.invalidSubnet'));
      }

      if (cfg.network.netmask && cfg.network.netmask.trim() && !ipv4Regex.test(cfg.network.netmask)) {
        netErrors.push($t('tools/dhcp-option121-builder.errors.invalidNetmask'));
      }

      if (cfg.network.rangeStart && cfg.network.rangeStart.trim() && !ipv4Regex.test(cfg.network.rangeStart)) {
        netErrors.push($t('tools/dhcp-option121-builder.errors.invalidRangeStart'));
      }

      if (cfg.network.rangeEnd && cfg.network.rangeEnd.trim() && !ipv4Regex.test(cfg.network.rangeEnd)) {
        netErrors.push($t('tools/dhcp-option121-builder.errors.invalidRangeEnd'));
      }
    }

    validationErrors = routeErrors;
    networkValidationErrors = netErrors;

    if (routeErrors.length === 0) {
      try {
        result = buildOption121(cfg);
      } catch (error) {
        validationErrors = [
          error instanceof Error ? error.message : $t('tools/dhcp-option121-builder.errors.encodingFailed'),
        ];
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
      validationErrors = [$t('tools/dhcp-option121-builder.errors.invalidHex')];
      decodeResult = null;
      return;
    }

    try {
      validationErrors = [];
      decodeResult = parseOption121(decodeInput);
    } catch (error) {
      validationErrors = [
        error instanceof Error ? error.message : $t('tools/dhcp-option121-builder.errors.decodingFailed'),
      ];
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
  title={$t('tools/dhcp-option121-builder.title')}
  description={$t('tools/dhcp-option121-builder.subtitle')}
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
        <h3>{$t('tools/dhcp-option121-builder.encode.staticRoutesTitle')}</h3>
      </div>
      <div class="card-content">
        {#each config.routes as _, i (`route-${i}`)}
          <div class="route-group">
            <div class="route-header">
              <h4>
                <Icon name="compass" size="sm" />{$t('tools/dhcp-option121-builder.encode.route.title', {
                  number: i + 1,
                })}
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
                  {$t('tools/dhcp-option121-builder.encode.route.destination.label')}
                </label>
                <input
                  id="destination-{i}"
                  type="text"
                  bind:value={config.routes[i].destination}
                  placeholder={$t('tools/dhcp-option121-builder.encode.route.destination.placeholder')}
                />
              </div>

              <div class="input-group">
                <label for="gateway-{i}">
                  <Icon name="arrow-right" size="sm" />
                  {$t('tools/dhcp-option121-builder.encode.route.gateway.label')}
                </label>
                <input
                  id="gateway-{i}"
                  type="text"
                  bind:value={config.routes[i].gateway}
                  placeholder={$t('tools/dhcp-option121-builder.encode.route.gateway.placeholder')}
                />
              </div>
            </div>
          </div>
        {/each}

        <button type="button" class="btn-add" onclick={addRoute}>
          <Icon name="plus" size="sm" />
          {$t('tools/dhcp-option121-builder.encode.addRoute')}
        </button>
      </div>
    </div>

    {#if validationErrors.length > 0}
      <div class="card errors-card">
        <h3>{$t('tools/dhcp-option121-builder.errors.title')}</h3>
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
        <h3>{$t('tools/dhcp-option121-builder.results.encodeTitle')}</h3>

        <div class="output-group">
          <div class="output-header">
            <h4>{$t('tools/dhcp-option121-builder.results.hexEncoded.title')}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('hex')}
              onclick={() => clipboard.copy(result!.hexEncoded, 'hex')}
            >
              <Icon name={clipboard.isCopied('hex') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('hex')
                ? $t('tools/dhcp-option121-builder.buttons.copied')
                : $t('tools/dhcp-option121-builder.buttons.copy')}
            </button>
          </div>
          <pre class="output-value code-block">{result.hexEncoded}</pre>
        </div>

        <div class="output-group">
          <div class="output-header">
            <h4>{$t('tools/dhcp-option121-builder.results.wireFormat.title')}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('wire')}
              onclick={() => clipboard.copy(result!.wireFormat, 'wire')}
            >
              <Icon name={clipboard.isCopied('wire') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('wire')
                ? $t('tools/dhcp-option121-builder.buttons.copied')
                : $t('tools/dhcp-option121-builder.buttons.copy')}
            </button>
          </div>
          <pre class="output-value code-block">{result.wireFormat}</pre>
        </div>

        <div class="summary-card">
          <div>
            <strong>{$t('tools/dhcp-option121-builder.results.summary.totalLength')}</strong>
            {$t('tools/dhcp-option121-builder.results.summary.bytes', { length: result.totalLength })}
          </div>
          <div><strong>{$t('tools/dhcp-option121-builder.results.summary.routes')}</strong> {result.routes.length}</div>
        </div>
      </div>
    {/if}

    <hr />

    {#if result}
      <div class="card input-card">
        <div class="card-header">
          <h3>{$t('tools/dhcp-option121-builder.encode.networkSettings.title')}</h3>
          <p class="help-text">{$t('tools/dhcp-option121-builder.encode.networkSettings.help')}</p>
        </div>
        <div class="card-content">
          <div class="input-row">
            <div class="input-group">
              <label for="subnet">
                <Icon name="network" size="sm" />
                {$t('tools/dhcp-option121-builder.encode.networkSettings.subnet.label')}
              </label>
              <input
                id="subnet"
                type="text"
                bind:value={config.network!.subnet}
                placeholder={$t('tools/dhcp-option121-builder.encode.networkSettings.subnet.placeholder')}
              />
            </div>

            <div class="input-group">
              <label for="netmask">
                <Icon name="network" size="sm" />
                {$t('tools/dhcp-option121-builder.encode.networkSettings.netmask.label')}
              </label>
              <input
                id="netmask"
                type="text"
                bind:value={config.network!.netmask}
                placeholder={$t('tools/dhcp-option121-builder.encode.networkSettings.netmask.placeholder')}
              />
            </div>
          </div>

          <div class="input-row">
            <div class="input-group">
              <label for="range-start">
                <Icon name="arrow-right" size="sm" />
                {$t('tools/dhcp-option121-builder.encode.networkSettings.rangeStart.label')}
              </label>
              <input
                id="range-start"
                type="text"
                bind:value={config.network!.rangeStart}
                placeholder={$t('tools/dhcp-option121-builder.encode.networkSettings.rangeStart.placeholder')}
              />
            </div>

            <div class="input-group">
              <label for="range-end">
                <Icon name="arrow-right" size="sm" />
                {$t('tools/dhcp-option121-builder.encode.networkSettings.rangeEnd.label')}
              </label>
              <input
                id="range-end"
                type="text"
                bind:value={config.network!.rangeEnd}
                placeholder={$t('tools/dhcp-option121-builder.encode.networkSettings.rangeEnd.placeholder')}
              />
            </div>
          </div>
        </div>

        {#if networkValidationErrors.length > 0}
          <div class="network-errors">
            <h4>{$t('tools/dhcp-option121-builder.encode.networkSettings.errorsTitle')}</h4>
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
        <h3>{$t('tools/dhcp-option121-builder.results.configExamplesTitle')}</h3>

        {#if result.examples.iscDhcpd}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option121-builder.results.formats.iscDhcpd')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('isc')}
                onclick={() => clipboard.copy(result!.examples.iscDhcpd!, 'isc')}
              >
                <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('isc')
                  ? $t('tools/dhcp-option121-builder.buttons.copied')
                  : $t('tools/dhcp-option121-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.iscDhcpd}</pre>
          </div>
        {/if}

        {#if result.examples.keaDhcp4}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option121-builder.results.formats.keaDhcp4')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('kea')}
                onclick={() => clipboard.copy(result!.examples.keaDhcp4!, 'kea')}
              >
                <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('kea')
                  ? $t('tools/dhcp-option121-builder.buttons.copied')
                  : $t('tools/dhcp-option121-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.keaDhcp4}</pre>
          </div>
        {/if}

        {#if result.examples.msftOption249}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option121-builder.results.formats.msftOption249')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('msft')}
                onclick={() => clipboard.copy(result!.examples.msftOption249!, 'msft')}
              >
                <Icon name={clipboard.isCopied('msft') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('msft')
                  ? $t('tools/dhcp-option121-builder.buttons.copied')
                  : $t('tools/dhcp-option121-builder.buttons.copy')}
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
        <h3>{$t('tools/dhcp-option121-builder.decode.title')}</h3>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="decode-input">
            <Icon name="code" size="sm" />
            {$t('tools/dhcp-option121-builder.decode.input.label')}
          </label>
          <textarea
            id="decode-input"
            bind:value={decodeInput}
            placeholder={$t('tools/dhcp-option121-builder.decode.input.placeholder')}
            rows="4"
          ></textarea>
        </div>
        <button type="button" class="btn-primary" onclick={decode}>
          <Icon name="search" size="sm" />
          {$t('tools/dhcp-option121-builder.decode.button')}
        </button>
      </div>
    </div>

    {#if validationErrors.length > 0}
      <div class="card errors-card">
        <h3>{$t('tools/dhcp-option121-builder.errors.title')}</h3>
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
        <h3>{$t('tools/dhcp-option121-builder.results.decodeTitle')}</h3>

        <div class="summary-card">
          <div>
            <strong>{$t('tools/dhcp-option121-builder.results.summary.totalLength')}</strong>
            {$t('tools/dhcp-option121-builder.results.summary.bytes', { length: decodeResult.totalLength })}
          </div>
          <div>
            <strong>{$t('tools/dhcp-option121-builder.results.routesFound')}</strong>
            {decodeResult.routes.length}
          </div>
        </div>

        <div class="routes-section">
          <h4>{$t('tools/dhcp-option121-builder.results.routeListTitle')}</h4>
          {#each decodeResult.routes as route, i (i)}
            <div class="route-item">
              <div class="route-field">
                <Icon name="target" size="sm" />
                <span class="field-label">{$t('tools/dhcp-option121-builder.results.destination')}</span>
                <span class="field-value">{route.destination}</span>
              </div>
              <div class="route-field">
                <Icon name="arrow-right" size="sm" />
                <span class="field-label">{$t('tools/dhcp-option121-builder.results.gateway')}</span>
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
