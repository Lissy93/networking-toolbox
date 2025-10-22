<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
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

  const modeOptions = [
    { value: 'encode' as const, label: 'Encode', icon: 'wrench' },
    { value: 'decode' as const, label: 'Decode', icon: 'search' },
  ];

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

  const encodeExamples: EncodeExample[] = [
    {
      label: 'Cisco IP Phones',
      option150Servers: ['192.168.1.10', '192.168.1.11'],
      description: 'Redundant TFTP servers for Cisco IP phone configuration',
    },
    {
      label: 'PXE Boot (Standard)',
      option66Server: 'pxe.example.com',
      option67Bootfile: 'pxelinux.0',
      description: 'Standard PXE boot with single TFTP server',
    },
    {
      label: 'PXE Boot (UEFI)',
      option66Server: '192.168.1.10',
      option67Bootfile: 'bootx64.efi',
      description: 'UEFI PXE boot configuration',
    },
    {
      label: 'Combined (Option 150 + 67)',
      option150Servers: ['192.168.1.10', '192.168.1.11'],
      option67Bootfile: 'SEP{MAC}.cnf.xml',
      description: 'Cisco phones with redundant TFTP and config template',
    },
  ];

  const decodeExamples: DecodeExample[] = [
    {
      label: 'Option 150: Dual TFTP',
      mode: 'option150',
      hexInput: 'c0a8010ac0a8010b',
      description: '192.168.1.10 and 192.168.1.11',
    },
    {
      label: 'Option 66: Hostname',
      mode: 'option66',
      hexInput: '7078652e6578616d706c652e636f6d',
      description: 'pxe.example.com',
    },
    {
      label: 'Option 67: PXE Boot',
      mode: 'option67',
      hexInput: '7078656c696e75782e30',
      description: 'pxelinux.0',
    },
    {
      label: 'Option 67: UEFI Boot',
      mode: 'option67',
      hexInput: '626f6f747836 42e656669',
      description: 'bootx64.efi',
    },
  ];

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
  title="DHCP Options 150/66/67 - TFTP Server Configuration"
  description="Configure TFTP servers for PXE boot and Cisco IP phones. Option 150 (Cisco TFTP list), Option 66 (TFTP server name), and Option 67 (bootfile name)."
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
        <h3>Option 150: Cisco TFTP Server List</h3>
        <p class="help-text">Multiple IPv4 addresses for redundant TFTP servers (Cisco IP phones)</p>
      </div>
      <div class="card-content">
        {#if config.option150Servers && config.option150Servers.length > 0}
          {#each config.option150Servers as _, i (`opt150-${i}`)}
            <div class="server-row">
              <div class="input-group flex-grow">
                <label for="opt150-server-{i}">
                  <Icon name="server" size="sm" />
                  Server {i + 1}
                </label>
                <input
                  id="opt150-server-{i}"
                  type="text"
                  bind:value={config.option150Servers[i]}
                  placeholder="192.168.1.10"
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
          Add TFTP Server
        </button>
      </div>
    </div>

    <div class="card input-card">
      <div class="card-header">
        <h3>Option 66: TFTP Server Name (Standard)</h3>
        <p class="help-text">Single hostname or IP address for standard PXE boot</p>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="opt66-server">
            <Icon name="globe" size="sm" />
            TFTP Server Hostname/IP
          </label>
          <input
            id="opt66-server"
            type="text"
            bind:value={config.option66Server}
            placeholder="tftp.example.com or 192.168.1.10"
          />
        </div>
      </div>
    </div>

    <div class="card input-card">
      <div class="card-header">
        <h3>Option 67: Bootfile Name</h3>
        <p class="help-text">Filename to boot from TFTP server (e.g., pxelinux.0 for BIOS, bootx64.efi for UEFI)</p>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="opt67-bootfile">
            <Icon name="file" size="sm" />
            Bootfile Name
          </label>
          <input id="opt67-bootfile" type="text" bind:value={config.option67Bootfile} placeholder="pxelinux.0" />
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
      {#if result.option150}
        <div class="card results">
          <h3>Option 150: TFTP Server List</h3>

          <div class="output-group">
            <div class="output-header">
              <h4>Hex-Encoded (Compact)</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt150-hex')}
                onclick={() => clipboard.copy(result!.option150!.hexEncoded, 'opt150-hex')}
              >
                <Icon name={clipboard.isCopied('opt150-hex') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt150-hex') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.option150.hexEncoded}</pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h4>Wire Format (Spaced)</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt150-wire')}
                onclick={() => clipboard.copy(result!.option150!.wireFormat, 'opt150-wire')}
              >
                <Icon name={clipboard.isCopied('opt150-wire') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt150-wire') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.option150.wireFormat}</pre>
          </div>

          <div class="summary-card">
            <div><strong>Total Length:</strong> {result.option150.totalLength} bytes</div>
            <div><strong>Servers:</strong> {result.option150.servers.length}</div>
          </div>
        </div>
      {/if}

      {#if result.option66}
        <div class="card results">
          <h3>Option 66: TFTP Server Name</h3>

          <div class="output-group">
            <div class="output-header">
              <h4>Value</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt66-value')}
                onclick={() => clipboard.copy(result!.option66!.value, 'opt66-value')}
              >
                <Icon name={clipboard.isCopied('opt66-value') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt66-value') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.option66.value}</pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h4>Hex-Encoded</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt66-hex')}
                onclick={() => clipboard.copy(result!.option66!.hexEncoded, 'opt66-hex')}
              >
                <Icon name={clipboard.isCopied('opt66-hex') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt66-hex') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.option66.hexEncoded}</pre>
          </div>

          <div class="summary-card">
            <div><strong>Total Length:</strong> {result.option66.totalLength} bytes</div>
          </div>
        </div>
      {/if}

      {#if result.option67}
        <div class="card results">
          <h3>Option 67: Bootfile Name</h3>

          <div class="output-group">
            <div class="output-header">
              <h4>Value</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt67-value')}
                onclick={() => clipboard.copy(result!.option67!.value, 'opt67-value')}
              >
                <Icon name={clipboard.isCopied('opt67-value') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt67-value') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.option67.value}</pre>
          </div>

          <div class="output-group">
            <div class="output-header">
              <h4>Hex-Encoded</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('opt67-hex')}
                onclick={() => clipboard.copy(result!.option67!.hexEncoded, 'opt67-hex')}
              >
                <Icon name={clipboard.isCopied('opt67-hex') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('opt67-hex') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre class="output-value code-block">{result.option67.hexEncoded}</pre>
          </div>

          <div class="summary-card">
            <div><strong>Total Length:</strong> {result.option67.totalLength} bytes</div>
          </div>
        </div>
      {/if}
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

        {#if result.examples.ciscoIos}
          <div class="output-group">
            <div class="output-header">
              <h4>Cisco IOS Configuration</h4>
              <button
                type="button"
                class="copy-btn"
                class:copied={clipboard.isCopied('cisco')}
                onclick={() => clipboard.copy(result!.examples.ciscoIos!, 'cisco')}
              >
                <Icon name={clipboard.isCopied('cisco') ? 'check' : 'copy'} size="xs" />
                {clipboard.isCopied('cisco') ? 'Copied' : 'Copy'}
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
        <h3>Decode TFTP Option</h3>
      </div>
      <div class="card-content">
        <div class="input-group">
          <label for="decode-mode">
            <Icon name="settings" size="sm" />
            Option Type
          </label>
          <select id="decode-mode" bind:value={decodeMode}>
            <option value="option150">Option 150: TFTP Server List</option>
            <option value="option66">Option 66: TFTP Server Name</option>
            <option value="option67">Option 67: Bootfile Name</option>
          </select>
        </div>

        <div class="input-group">
          <label for="decode-input">
            <Icon name="code" size="sm" />
            Hex-Encoded Option Data
          </label>
          <textarea
            id="decode-input"
            bind:value={decodeInput}
            placeholder="Enter hex string (e.g., c0a8010ac0a8010b for Option 150)"
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

    {#if decodeResult150 && validationErrors.length === 0}
      <div class="card results">
        <h3>Decoded Option 150: TFTP Server List</h3>

        <div class="summary-card">
          <div><strong>Total Length:</strong> {decodeResult150.totalLength} bytes</div>
          <div><strong>Servers Found:</strong> {decodeResult150.servers.length}</div>
        </div>

        <div class="servers-section">
          <h4>TFTP Servers</h4>
          {#each decodeResult150.servers as server, i (i)}
            <div class="server-item">
              <Icon name="server" size="sm" />
              <span class="field-label">Server {i + 1}:</span>
              <span class="field-value">{server}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if decodeResult66 && validationErrors.length === 0}
      <div class="card results">
        <h3>Decoded Option 66: TFTP Server Name</h3>

        <div class="summary-card">
          <div><strong>Total Length:</strong> {decodeResult66.totalLength} bytes</div>
        </div>

        <div class="decoded-value">
          <h4>TFTP Server</h4>
          <div class="value-display">
            <Icon name="globe" size="sm" />
            <span>{decodeResult66.value}</span>
          </div>
        </div>
      </div>
    {/if}

    {#if decodeResult67 && validationErrors.length === 0}
      <div class="card results">
        <h3>Decoded Option 67: Bootfile Name</h3>

        <div class="summary-card">
          <div><strong>Total Length:</strong> {decodeResult67.totalLength} bytes</div>
        </div>

        <div class="decoded-value">
          <h4>Bootfile</h4>
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
