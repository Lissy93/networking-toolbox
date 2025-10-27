<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import { t } from '$lib/stores/language';
  import {
    buildTFTPOptions,
    parseOption150,
    parseOption66,
    parseOption67,
    getDefaultTFTPConfig,
    type TFTPConfig,
    type TFTPResult,
    type ParsedOption150,
    type ParsedStringOption,
  } from '$lib/utils/dhcp-option150.js';

  const modeOptions = $derived([
    { value: 'encode' as const, label: $t('tools/dhcp-option150-builder.modes.encode'), icon: 'wrench' },
    { value: 'decode' as const, label: $t('tools/dhcp-option150-builder.modes.decode'), icon: 'search' },
  ]);

  let mode = $state<'encode' | 'decode'>('encode');
  let config = $state<TFTPConfig>({
    ...getDefaultTFTPConfig(),
    network: {
      subnet: '',
      netmask: '',
      rangeStart: '',
      rangeEnd: '',
    },
  });
  let result = $state<TFTPResult | null>(null);
  let decodeMode = $state<'option150' | 'option66' | 'option67'>('option150');
  let decodeInput = $state<string>('');
  let decodeResult150 = $state<ParsedOption150 | null>(null);
  let decodeResult66 = $state<ParsedStringOption | null>(null);
  let decodeResult67 = $state<ParsedStringOption | null>(null);
  let validationErrors = $state<string[]>([]);
  let networkValidationErrors = $state<string[]>([]);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  interface EncodeExample {
    label: string;
    option150Servers?: string[];
    option66Server?: string;
    option67Bootfile?: string;
    description: string;
  }

  interface DecodeExample {
    label: string;
    mode: 'option150' | 'option66' | 'option67';
    hexInput: string;
    description: string;
  }

  const encodeExamples: EncodeExample[] = $derived([
    {
      label: $t('tools/dhcp-option150-builder.encodeExamples.ciscoIPPhones.label'),
      option150Servers: ['192.168.1.10', '192.168.1.11'],
      description: $t('tools/dhcp-option150-builder.encodeExamples.ciscoIPPhones.description'),
    },
    {
      label: $t('tools/dhcp-option150-builder.encodeExamples.pxeBootStandard.label'),
      option66Server: 'pxe.example.com',
      option67Bootfile: 'pxelinux.0',
      description: $t('tools/dhcp-option150-builder.encodeExamples.pxeBootStandard.description'),
    },
    {
      label: $t('tools/dhcp-option150-builder.encodeExamples.pxeBootUEFI.label'),
      option66Server: '192.168.1.10',
      option67Bootfile: 'bootx64.efi',
      description: $t('tools/dhcp-option150-builder.encodeExamples.pxeBootUEFI.description'),
    },
    {
      label: $t('tools/dhcp-option150-builder.encodeExamples.combined.label'),
      option150Servers: ['192.168.1.10', '192.168.1.11'],
      option67Bootfile: 'SEP{MAC}.cnf.xml',
      description: $t('tools/dhcp-option150-builder.encodeExamples.combined.description'),
    },
  ]);

  const decodeExamples: DecodeExample[] = $derived([
    {
      label: $t('tools/dhcp-option150-builder.decodeExamples.option150DualTFTP.label'),
      mode: 'option150',
      hexInput: 'c0a8010ac0a8010b',
      description: $t('tools/dhcp-option150-builder.decodeExamples.option150DualTFTP.description'),
    },
    {
      label: $t('tools/dhcp-option150-builder.decodeExamples.option66Hostname.label'),
      mode: 'option66',
      hexInput: '7078652e6578616d706c652e636f6d',
      description: $t('tools/dhcp-option150-builder.decodeExamples.option66Hostname.description'),
    },
    {
      label: $t('tools/dhcp-option150-builder.decodeExamples.option67PXEBoot.label'),
      mode: 'option67',
      hexInput: '7078656c696e75782e30',
      description: $t('tools/dhcp-option150-builder.decodeExamples.option67PXEBoot.description'),
    },
    {
      label: $t('tools/dhcp-option150-builder.decodeExamples.option67UEFIBoot.label'),
      mode: 'option67',
      hexInput: '626f6f747836 42e656669',
      description: $t('tools/dhcp-option150-builder.decodeExamples.option67UEFIBoot.description'),
    },
  ]);

  // Reactive generation
  $effect(() => {
    if (mode === 'encode') {
      const currentOption150 = config.option150Servers ? [...config.option150Servers] : undefined;
      const currentOption66 = config.option66Server;
      const currentOption67 = config.option67Bootfile;
      const currentNetwork = config.network ? { ...config.network } : undefined;

      untrack(() => {
        validateAndEncode({
          option150Servers: currentOption150,
          option66Server: currentOption66,
          option67Bootfile: currentOption67,
          network: currentNetwork,
        });
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

  function validateAndEncode(cfg: TFTPConfig = config) {
    const errors: string[] = [];
    const netErrors: string[] = [];

    // Validate Option 150 servers
    if (cfg.option150Servers && cfg.option150Servers.length > 0) {
      for (let i = 0; i < cfg.option150Servers.length; i++) {
        const server = cfg.option150Servers[i];
        if (!server.trim()) {
          errors.push(`Option 150 Server ${i + 1}: Address is required`);
          continue;
        }

        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        if (!ipv4Regex.test(server)) {
          errors.push(`Option 150 Server ${i + 1}: Invalid IPv4 address`);
          continue;
        }

        const octets = server.split('.').map((o) => parseInt(o, 10));
        if (octets.some((o) => o > 255)) {
          errors.push(`Option 150 Server ${i + 1}: Invalid IPv4 address (octets must be 0-255)`);
        }
      }
    }

    // Validate Option 66 (optional)
    if (cfg.option66Server && cfg.option66Server.trim() && cfg.option66Server.trim().length > 255) {
      errors.push('Option 66: Server name too long (max 255 characters)');
    }

    // Validate Option 67 (optional)
    if (cfg.option67Bootfile && cfg.option67Bootfile.trim() && cfg.option67Bootfile.trim().length > 128) {
      errors.push('Option 67: Bootfile name too long (max 128 characters)');
    }

    // Check at least one option is configured
    const hasOption150 = cfg.option150Servers && cfg.option150Servers.some((s) => s.trim());
    const hasOption66 = cfg.option66Server && cfg.option66Server.trim();
    const hasOption67 = cfg.option67Bootfile && cfg.option67Bootfile.trim();

    if (!hasOption150 && !hasOption66 && !hasOption67) {
      errors.push('At least one TFTP option must be configured (150, 66, or 67)');
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

    validationErrors = errors;
    networkValidationErrors = netErrors;

    if (errors.length === 0) {
      try {
        result = buildTFTPOptions(cfg);
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
      decodeResult150 = null;
      decodeResult66 = null;
      decodeResult67 = null;
      validationErrors = [];
      return;
    }

    if (!/^[0-9a-fA-F\s:]+$/.test(decodeInput)) {
      validationErrors = ['Invalid hex input: only hexadecimal characters allowed'];
      decodeResult150 = null;
      decodeResult66 = null;
      decodeResult67 = null;
      return;
    }

    try {
      validationErrors = [];

      if (decodeMode === 'option150') {
        decodeResult150 = parseOption150(decodeInput);
        decodeResult66 = null;
        decodeResult67 = null;
      } else if (decodeMode === 'option66') {
        decodeResult66 = parseOption66(decodeInput);
        decodeResult150 = null;
        decodeResult67 = null;
      } else {
        decodeResult67 = parseOption67(decodeInput);
        decodeResult150 = null;
        decodeResult66 = null;
      }
    } catch (error) {
      validationErrors = [error instanceof Error ? error.message : 'Decoding failed'];
      decodeResult150 = null;
      decodeResult66 = null;
      decodeResult67 = null;
    }
  }

  function addOption150Server() {
    if (!config.option150Servers) {
      config.option150Servers = [''];
    } else {
      config.option150Servers = [...config.option150Servers, ''];
    }
  }

  function removeOption150Server(index: number) {
    if (config.option150Servers && config.option150Servers.length > 1) {
      config.option150Servers = config.option150Servers.filter((_, i) => i !== index);
    } else if (config.option150Servers) {
      config.option150Servers = [];
    }
  }

  function loadEncodeExample(example: EncodeExample, index: number) {
    config = {
      option150Servers: example.option150Servers ? [...example.option150Servers] : [],
      option66Server: example.option66Server || '',
      option67Bootfile: example.option67Bootfile || '',
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
    decodeMode = example.mode;
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

      const option150Match =
        ((!example.option150Servers || example.option150Servers.length === 0) &&
          (!config.option150Servers || config.option150Servers.length === 0)) ||
        (example.option150Servers &&
          config.option150Servers &&
          example.option150Servers.length === config.option150Servers.length &&
          example.option150Servers.every((s, i) => s === config.option150Servers![i]));

      const option66Match = (example.option66Server || '') === (config.option66Server || '');
      const option67Match = (example.option67Bootfile || '') === (config.option67Bootfile || '');

      if (!option150Match || !option66Match || !option67Match) {
        selectedExampleIndex = null;
      }
    } else {
      const example = decodeExamples[selectedExampleIndex];
      if (!example) {
        selectedExampleIndex = null;
        return;
      }

      if (decodeInput !== example.hexInput || decodeMode !== example.mode) {
        selectedExampleIndex = null;
      }
    }
  }
</script>

<ToolContentContainer
  title={$t('tools/dhcp-option150-builder.title')}
  description={$t('tools/dhcp-option150-builder.subtitle')}
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
        <h3>{$t('tools/dhcp-option150-builder.encode.option150.title')}</h3>
        <p class="help-text">{$t('tools/dhcp-option150-builder.encode.option150.helpText')}</p>
      </div>
      <div class="card-content">
        {#if config.option150Servers && config.option150Servers.length > 0}
          {#each config.option150Servers as _, i (`opt150-${i}`)}
            <div class="server-row">
              <div class="input-group flex-grow">
                <label for="opt150-server-{i}">
                  <Icon name="server" size="sm" />
                  {$t('tools/dhcp-option150-builder.encode.option150.serverLabel', { number: i + 1 })}
                </label>
                <input
                  id="opt150-server-{i}"
                  type="text"
                  bind:value={config.option150Servers[i]}
                  placeholder={$t('tools/dhcp-option150-builder.encode.option150.serverPlaceholder')}
                />
              </div>
              <button type="button" class="btn-icon" onclick={() => removeOption150Server(i)}>
                <Icon name="x" size="sm" />
              </button>
            </div>
          {/each}
        {/if}

        <button type="button" class="btn-add" onclick={addOption150Server}>
          <Icon name="plus" size="sm" />
          {$t('tools/dhcp-option150-builder.encode.option150.addButton')}
        </button>
      </div>
    </div>

    <div class="card input-card">
      <div class="card-header">
        <h3>{$t('tools/dhcp-option150-builder.encode.option66.title')}</h3>
        <p class="help-text">{$t('tools/dhcp-option150-builder.encode.option66.helpText')}</p>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="opt66-server">
            <Icon name="globe" size="sm" />
            {$t('tools/dhcp-option150-builder.encode.option66.label')}
          </label>
          <input
            id="opt66-server"
            type="text"
            bind:value={config.option66Server}
            placeholder={$t('tools/dhcp-option150-builder.encode.option66.placeholder')}
          />
        </div>
      </div>
    </div>

    <div class="card input-card">
      <div class="card-header">
        <h3>{$t('tools/dhcp-option150-builder.encode.option67.title')}</h3>
        <p class="help-text">{$t('tools/dhcp-option150-builder.encode.option67.helpText')}</p>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="opt67-bootfile">
            <Icon name="file" size="sm" />
            {$t('tools/dhcp-option150-builder.encode.option67.label')}
          </label>
          <input
            id="opt67-bootfile"
            type="text"
            bind:value={config.option67Bootfile}
            placeholder={$t('tools/dhcp-option150-builder.encode.option67.placeholder')}
          />
        </div>
      </div>
    </div>

    {#if validationErrors.length > 0}
      <div class="card errors-card">
        <h3>{$t('tools/dhcp-option150-builder.errors.title')}</h3>
        {#each validationErrors as error, i (i)}
          <div class="error-message">
            <Icon name="alert-triangle" size="sm" />
            {error}
          </div>
        {/each}
      </div>
    {/if}

    {#if result && validationErrors.length === 0}
      {#if result.option150}
        <div class="card results">
          <h3>{$t('tools/dhcp-option150-builder.results.option150.title')}</h3>

          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.option150.hexEncodedTitle')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt150-hex')}
                onclick={() => clipboard.copy(result!.option150!.hexEncoded, 'opt150-hex')}
              >
                <Icon name={clipboard.isCopied('opt150-hex') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt150-hex')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.option150.hexEncoded}</pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.option150.wireFormatTitle')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt150-wire')}
                onclick={() => clipboard.copy(result!.option150!.wireFormat, 'opt150-wire')}
              >
                <Icon name={clipboard.isCopied('opt150-wire') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt150-wire')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.option150.wireFormat}</pre>
          </div>

          <div class="summary-card">
            <div>
              <strong>{$t('tools/dhcp-option150-builder.results.option150.totalLength')}</strong>
              {$t('tools/dhcp-option150-builder.results.option150.bytes', { length: result.option150.totalLength })}
            </div>
            <div>
              <strong>{$t('tools/dhcp-option150-builder.results.option150.servers')}</strong>
              {$t('tools/dhcp-option150-builder.results.option150.serverCount', {
                count: result.option150.servers.length,
              })}
            </div>
          </div>
        </div>
      {/if}

      {#if result.option66}
        <div class="card results">
          <h3>{$t('tools/dhcp-option150-builder.results.option66.title')}</h3>

          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.option66.valueTitle')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt66-value')}
                onclick={() => clipboard.copy(result!.option66!.value, 'opt66-value')}
              >
                <Icon name={clipboard.isCopied('opt66-value') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt66-value')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.option66.value}</pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.option66.hexEncodedTitle')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt66-hex')}
                onclick={() => clipboard.copy(result!.option66!.hexEncoded, 'opt66-hex')}
              >
                <Icon name={clipboard.isCopied('opt66-hex') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt66-hex')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.option66.hexEncoded}</pre>
          </div>

          <div class="summary-card">
            <div>
              <strong>{$t('tools/dhcp-option150-builder.results.option66.totalLength')}</strong>
              {$t('tools/dhcp-option150-builder.results.option66.bytes', { length: result.option66.totalLength })}
            </div>
          </div>
        </div>
      {/if}

      {#if result.option67}
        <div class="card results">
          <h3>{$t('tools/dhcp-option150-builder.results.option67.title')}</h3>

          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.option67.valueTitle')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt67-value')}
                onclick={() => clipboard.copy(result!.option67!.value, 'opt67-value')}
              >
                <Icon name={clipboard.isCopied('opt67-value') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt67-value')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.option67.value}</pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.option67.hexEncodedTitle')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt67-hex')}
                onclick={() => clipboard.copy(result!.option67!.hexEncoded, 'opt67-hex')}
              >
                <Icon name={clipboard.isCopied('opt67-hex') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt67-hex')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.option67.hexEncoded}</pre>
          </div>

          <div class="summary-card">
            <div>
              <strong>{$t('tools/dhcp-option150-builder.results.option67.totalLength')}</strong>
              {$t('tools/dhcp-option150-builder.results.option67.bytes', { length: result.option67.totalLength })}
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <hr />

    {#if result}
      <div class="card input-card">
        <div class="card-header">
          <h3>{$t('tools/dhcp-option150-builder.encode.networkSettings.title')}</h3>
          <p class="help-text">{$t('tools/dhcp-option150-builder.encode.networkSettings.helpText')}</p>
        </div>
        <div class="card-content">
          <div class="input-row">
            <div class="input-group">
              <label for="subnet">
                <Icon name="network" size="sm" />
                {$t('tools/dhcp-option150-builder.encode.networkSettings.subnet.label')}
              </label>
              <input
                id="subnet"
                type="text"
                bind:value={config.network!.subnet}
                placeholder={$t('tools/dhcp-option150-builder.encode.networkSettings.subnet.placeholder')}
              />
            </div>

            <div class="input-group">
              <label for="netmask">
                <Icon name="network" size="sm" />
                {$t('tools/dhcp-option150-builder.encode.networkSettings.netmask.label')}
              </label>
              <input
                id="netmask"
                type="text"
                bind:value={config.network!.netmask}
                placeholder={$t('tools/dhcp-option150-builder.encode.networkSettings.netmask.placeholder')}
              />
            </div>
          </div>

          <div class="input-row">
            <div class="input-group">
              <label for="range-start">
                <Icon name="arrow-right" size="sm" />
                {$t('tools/dhcp-option150-builder.encode.networkSettings.rangeStart.label')}
              </label>
              <input
                id="range-start"
                type="text"
                bind:value={config.network!.rangeStart}
                placeholder={$t('tools/dhcp-option150-builder.encode.networkSettings.rangeStart.placeholder')}
              />
            </div>

            <div class="input-group">
              <label for="range-end">
                <Icon name="arrow-right" size="sm" />
                {$t('tools/dhcp-option150-builder.encode.networkSettings.rangeEnd.label')}
              </label>
              <input
                id="range-end"
                type="text"
                bind:value={config.network!.rangeEnd}
                placeholder={$t('tools/dhcp-option150-builder.encode.networkSettings.rangeEnd.placeholder')}
              />
            </div>
          </div>
        </div>

        {#if networkValidationErrors.length > 0}
          <div class="network-errors">
            <h4>{$t('tools/dhcp-option150-builder.encode.networkSettings.errorsTitle')}</h4>
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
        <h3>{$t('tools/dhcp-option150-builder.results.configExamples.title')}</h3>

        {#if result.examples.iscDhcpd}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.configExamples.iscDhcpd')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('isc')}
                onclick={() => clipboard.copy(result!.examples.iscDhcpd!, 'isc')}
              >
                <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('isc')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.iscDhcpd}</pre>
          </div>
        {/if}

        {#if result.examples.keaDhcp4}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.configExamples.keaDhcp4')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('kea')}
                onclick={() => clipboard.copy(result!.examples.keaDhcp4!, 'kea')}
              >
                <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('kea')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.keaDhcp4}</pre>
          </div>
        {/if}

        {#if result.examples.ciscoIos}
          <div class="output-group">
            <div class="output-header">
              <h4>{$t('tools/dhcp-option150-builder.results.configExamples.ciscoIos')}</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('cisco')}
                onclick={() => clipboard.copy(result!.examples.ciscoIos!, 'cisco')}
              >
                <Icon name={clipboard.isCopied('cisco') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('cisco')
                  ? $t('tools/dhcp-option150-builder.buttons.copied')
                  : $t('tools/dhcp-option150-builder.buttons.copy')}
              </button>
            </div>
            <pre class="output-value code-block">{result.examples.ciscoIos}</pre>
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="card input-card">
      <div class="card-header">
        <h3>{$t('tools/dhcp-option150-builder.decode.title')}</h3>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="decode-mode">
            <Icon name="settings" size="sm" />
            {$t('tools/dhcp-option150-builder.decode.optionType.label')}
          </label>
          <select id="decode-mode" bind:value={decodeMode}>
            <option value="option150">{$t('tools/dhcp-option150-builder.decode.optionType.option150')}</option>
            <option value="option66">{$t('tools/dhcp-option150-builder.decode.optionType.option66')}</option>
            <option value="option67">{$t('tools/dhcp-option150-builder.decode.optionType.option67')}</option>
          </select>
        </div>

        <div class="input-group">
          <label for="decode-input">
            <Icon name="code" size="sm" />
            {$t('tools/dhcp-option150-builder.decode.hexInput.label')}
          </label>
          <textarea
            id="decode-input"
            bind:value={decodeInput}
            placeholder={$t('tools/dhcp-option150-builder.decode.hexInput.placeholder')}
            rows="4"
          ></textarea>
        </div>
        <button type="button" class="btn-primary" onclick={decode}>
          <Icon name="search" size="sm" />
          {$t('tools/dhcp-option150-builder.decode.decodeButton')}
        </button>
      </div>
    </div>

    {#if validationErrors.length > 0}
      <div class="card errors-card">
        <h3>{$t('tools/dhcp-option150-builder.errors.title')}</h3>
        {#each validationErrors as error, i (i)}
          <div class="error-message">
            <Icon name="alert-triangle" size="sm" />
            {error}
          </div>
        {/each}
      </div>
    {/if}

    {#if decodeResult150 && validationErrors.length === 0}
      <div class="card results">
        <h3>{$t('tools/dhcp-option150-builder.decodeResults.option150.title')}</h3>

        <div class="summary-card">
          <div>
            <strong>{$t('tools/dhcp-option150-builder.decodeResults.option150.totalLength')}</strong>
            {$t('tools/dhcp-option150-builder.decodeResults.option150.bytes', { length: decodeResult150.totalLength })}
          </div>
          <div>
            <strong>{$t('tools/dhcp-option150-builder.decodeResults.option150.serversFound')}</strong>
            {$t('tools/dhcp-option150-builder.decodeResults.option150.serverCount', {
              count: decodeResult150.servers.length,
            })}
          </div>
        </div>

        <div class="servers-section">
          <h4>{$t('tools/dhcp-option150-builder.decodeResults.option150.serversTitle')}</h4>
          {#each decodeResult150.servers as server, i (i)}
            <div class="server-item">
              <Icon name="server" size="sm" />
              <span class="field-label"
                >{$t('tools/dhcp-option150-builder.decodeResults.option150.serverLabel', { number: i + 1 })}</span
              >
              <span class="field-value">{server}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if decodeResult66 && validationErrors.length === 0}
      <div class="card results">
        <h3>{$t('tools/dhcp-option150-builder.decodeResults.option66.title')}</h3>

        <div class="summary-card">
          <div>
            <strong>{$t('tools/dhcp-option150-builder.decodeResults.option66.totalLength')}</strong>
            {$t('tools/dhcp-option150-builder.decodeResults.option66.bytes', { length: decodeResult66.totalLength })}
          </div>
        </div>

        <div class="decoded-value">
          <h4>{$t('tools/dhcp-option150-builder.decodeResults.option66.serverTitle')}</h4>
          <div class="value-display">
            <Icon name="globe" size="sm" />
            <span>{decodeResult66.value}</span>
          </div>
        </div>
      </div>
    {/if}

    {#if decodeResult67 && validationErrors.length === 0}
      <div class="card results">
        <h3>{$t('tools/dhcp-option150-builder.decodeResults.option67.title')}</h3>

        <div class="summary-card">
          <div>
            <strong>{$t('tools/dhcp-option150-builder.decodeResults.option67.totalLength')}</strong>
            {$t('tools/dhcp-option150-builder.decodeResults.option67.bytes', { length: decodeResult67.totalLength })}
          </div>
        </div>

        <div class="decoded-value">
          <h4>{$t('tools/dhcp-option150-builder.decodeResults.option67.bootfileTitle')}</h4>
          <div class="value-display">
            <Icon name="file" size="sm" />
            <span>{decodeResult67.value}</span>
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

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    &.flex-grow {
      flex: 1;
    }

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    input,
    textarea,
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

    textarea {
      resize: vertical;
      font-family: var(--font-mono);
    }

    select {
      cursor: pointer;
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

  .server-row {
    display: flex;
    gap: var(--spacing-sm);
    align-items: flex-end;
  }

  .btn-icon {
    padding: var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    cursor: pointer;
    transition: all 0.2s ease;
    height: fit-content;

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

  .servers-section,
  .decoded-value {
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

  .server-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
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

  .value-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
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
