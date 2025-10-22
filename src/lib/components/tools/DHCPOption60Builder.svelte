<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import {
    generateOption60,
    isValidVendorClass,
    VENDOR_PRESETS,
    getDefaultNetworkConfig,
    type VendorPreset,
    type Option60Result,
    type NetworkConfig,
  } from '$lib/utils/dhcp-option60.js';
  import { useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';

  let selectedPreset = $state<VendorPreset>('cisco-phone');
  let customValue = $state('');
  let result = $state<Option60Result | null>(null);
  let errors = $state<string[]>([]);

  // Network configuration state - derived from preset
  let networkConfig = $state<NetworkConfig>(getDefaultNetworkConfig('cisco-phone'));

  const clipboard = useClipboard();

  const examplesList = [
    { preset: 'cisco-phone' as VendorPreset, description: 'Cisco IP Phones with TFTP' },
    { preset: 'cisco-ap' as VendorPreset, description: 'Cisco APs with Option 43' },
    { preset: 'pxe-client' as VendorPreset, description: 'PXE network boot' },
    { preset: 'aruba-ap' as VendorPreset, description: 'Aruba wireless APs' },
  ];

  const examples = useExamples(examplesList);

  const importantNotes = [
    '<strong>Option 60</strong> (Vendor Class Identifier) allows DHCP servers to provide different configurations based on client type',
    'Class-based policies enable <strong>separate IP pools</strong> and options for different device types',
    'Wireless APs typically require both <strong>Option 60 and Option 43</strong> for controller discovery',
    'Test configurations in a lab environment before deploying to production networks',
    'Adjust subnet addresses, pool ranges, and option values to match your network design',
  ];

  const poolFields = $derived([
    {
      id: 'poolStart',
      icon: 'arrow-right',
      label: 'Pool Start',
      help: 'First IP in matching pool',
      placeholder: '192.168.10.100',
      bind: () => networkConfig.poolStart,
      set: (v: string) => (networkConfig.poolStart = v),
    },
    {
      id: 'poolEnd',
      icon: 'arrow-left',
      label: 'Pool End',
      help: 'Last IP in matching pool',
      placeholder: '192.168.10.200',
      bind: () => networkConfig.poolEnd,
      set: (v: string) => (networkConfig.poolEnd = v),
    },
  ]);

  const nonMatchingPoolFields = $derived([
    {
      id: 'nonMatchingPoolStart',
      icon: 'arrow-right',
      label: 'Non-Matching Pool Start',
      help: 'First IP for non-matching clients',
      placeholder: '192.168.10.50',
      bind: () => networkConfig.nonMatchingPoolStart,
      set: (v: string) => (networkConfig.nonMatchingPoolStart = v),
    },
    {
      id: 'nonMatchingPoolEnd',
      icon: 'arrow-left',
      label: 'Non-Matching Pool End',
      help: 'Last IP for non-matching clients',
      placeholder: '192.168.10.99',
      bind: () => networkConfig.nonMatchingPoolEnd,
      set: (v: string) => (networkConfig.nonMatchingPoolEnd = v),
    },
  ]);

  // Track previous preset to detect changes
  let prevPreset = $state<VendorPreset>('cisco-phone');

  // Reactive: generate when inputs change
  $effect(() => {
    // Reset network config when preset changes
    if (selectedPreset !== prevPreset) {
      networkConfig = getDefaultNetworkConfig(selectedPreset);
      prevPreset = selectedPreset;
    }

    generate();
  });

  // Determine which fields to show based on preset
  const needsServerIp = $derived(['cisco-phone', 'pxe-client', 'docsis'].includes(selectedPreset));
  const needsBootFilename = $derived(['cisco-phone', 'pxe-client', 'docsis'].includes(selectedPreset));
  const needsNonMatchingPool = $derived(
    ['cisco-phone', 'cisco-ap', 'aruba-ap', 'ruckus-ap', 'unifi-ap', 'meraki-ap', 'pxe-client', 'custom'].includes(
      selectedPreset,
    ),
  );

  // Validation functions
  function isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
  }

  function isValidCIDR(cidr: string): boolean {
    const parts = cidr.split('/');
    if (parts.length !== 2) return false;
    const prefix = parseInt(parts[1], 10);
    return isValidIPv4(parts[0]) && !isNaN(prefix) && prefix >= 0 && prefix <= 32;
  }

  function isValidFilename(filename: string): boolean {
    // Basic filename validation - no empty, no path separators
    return filename.trim().length > 0 && !/[/\\]/.test(filename);
  }

  function validateNetworkConfig(): string[] {
    const validationErrors: string[] = [];

    // Validate subnet
    if (!isValidCIDR(networkConfig.subnet)) {
      validationErrors.push('Invalid subnet CIDR notation (e.g., 192.168.10.0/24)');
    }

    // Validate pool IPs
    if (!isValidIPv4(networkConfig.poolStart)) {
      validationErrors.push('Invalid pool start IP address');
    }
    if (!isValidIPv4(networkConfig.poolEnd)) {
      validationErrors.push('Invalid pool end IP address');
    }

    // Validate non-matching pool if provided
    if (networkConfig.nonMatchingPoolStart && !isValidIPv4(networkConfig.nonMatchingPoolStart)) {
      validationErrors.push('Invalid non-matching pool start IP address');
    }
    if (networkConfig.nonMatchingPoolEnd && !isValidIPv4(networkConfig.nonMatchingPoolEnd)) {
      validationErrors.push('Invalid non-matching pool end IP address');
    }

    // Validate server IP if needed and provided
    if (needsServerIp && networkConfig.serverIp && !isValidIPv4(networkConfig.serverIp)) {
      validationErrors.push('Invalid server IP address');
    }

    // Validate boot filename if needed and provided
    if (needsBootFilename && networkConfig.bootFilename && !isValidFilename(networkConfig.bootFilename)) {
      validationErrors.push('Invalid boot filename');
    }

    // Validate MikroTik server name
    if (networkConfig.mikrotikServerName && networkConfig.mikrotikServerName.trim().length === 0) {
      validationErrors.push('MikroTik server name cannot be empty');
    }

    // Validate lease time format (basic check)
    if (networkConfig.leaseTime && !/^\d+[smhd]$/.test(networkConfig.leaseTime.trim())) {
      validationErrors.push('Invalid lease time format (e.g., 24h, 1h, 30m)');
    }

    return validationErrors;
  }

  function generate() {
    errors = [];
    result = null;

    try {
      // Validate custom input if custom preset
      if (selectedPreset === 'custom') {
        if (!customValue.trim()) {
          errors = ['Custom vendor class identifier is required'];
          return;
        }
        if (!isValidVendorClass(customValue)) {
          errors = ['Invalid vendor class identifier. Must be 1-255 printable ASCII characters.'];
          return;
        }
      }

      // Validate network configuration
      const validationErrors = validateNetworkConfig();
      if (validationErrors.length > 0) {
        errors = validationErrors;
        return;
      }

      result = generateOption60(selectedPreset, customValue || undefined, networkConfig);
    } catch (err: unknown) {
      errors = [err instanceof Error ? err.message : 'Failed to generate configuration'];
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    selectedPreset = example.preset;
    if (example.preset === 'custom') {
      customValue = '';
    }
    examples.select(index);
  }
</script>

<!-- Examples -->
<ExamplesCard
  examples={examplesList}
  selectedIndex={examples.selectedIndex}
  onSelect={loadExample}
  getLabel={(ex) => VENDOR_PRESETS[ex.preset].name}
  getDescription={(ex) => ex.description}
  getTooltip={(ex) => `Generate config for ${VENDOR_PRESETS[ex.preset].name}`}
/>

<!-- Input Form -->
<div class="card input-card">
  <div class="card-header">
    <h3>Vendor Class Configuration</h3>
  </div>
  <div class="card-content">
    <section class="inputs">
      <div class="input-group">
        <label for="preset">
          <Icon name="tag" size="sm" />
          Vendor Preset
        </label>
        <select
          id="preset"
          bind:value={selectedPreset}
          onchange={() => {
            examples.clear();
            customValue = '';
          }}
        >
          {#each Object.entries(VENDOR_PRESETS) as [value, info] (value)}
            <option {value}>{info.name}</option>
          {/each}
        </select>
        <span class="help-text">{VENDOR_PRESETS[selectedPreset].description}</span>
      </div>

      {#if selectedPreset === 'custom'}
        <div class="input-group">
          <label for="custom">
            <Icon name="edit" size="sm" />
            Custom Vendor Class
          </label>
          <input id="custom" type="text" bind:value={customValue} placeholder="MyCustomVendorClass" maxlength="255" />
          <span class="help-text">1-255 printable ASCII characters</span>
        </div>
      {/if}

      <!-- Advanced Configuration Toggle -->
      <div class="advanced-section">
        <details open>
          <summary><h3>Advanced Options</h3></summary>
          <!-- Subnet Configuration -->
          <div class="input-group">
            <label for="subnet">
              <Icon name="network" size="sm" />
              Subnet (CIDR)
            </label>
            <input id="subnet" type="text" bind:value={networkConfig.subnet} placeholder="192.168.10.0/24" />
            <span class="help-text">Network address in CIDR notation</span>
          </div>

          <!-- Matching Pool Range -->
          <div class="input-row">
            {#each poolFields as field (field.id)}
              <div class="input-group">
                <label for={field.id}>
                  <Icon name={field.icon} size="sm" />
                  {field.label}
                </label>
                <input
                  id={field.id}
                  type="text"
                  value={field.bind()}
                  oninput={(e) => field.set(e.currentTarget.value)}
                  placeholder={field.placeholder}
                />
                <span class="help-text">{field.help}</span>
              </div>
            {/each}
          </div>

          {#if needsNonMatchingPool}
            <!-- Non-Matching Pool Range -->
            <div class="input-row">
              {#each nonMatchingPoolFields as field (field.id)}
                <div class="input-group">
                  <label for={field.id}>
                    <Icon name={field.icon} size="sm" />
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    type="text"
                    value={field.bind() || ''}
                    oninput={(e) => field.set(e.currentTarget.value)}
                    placeholder={field.placeholder}
                  />
                  <span class="help-text">{field.help}</span>
                </div>
              {/each}
            </div>
          {/if}

          {#if needsServerIp}
            <!-- Server IP -->
            <div class="input-group">
              <label for="serverIp">
                <Icon name="server" size="sm" />
                {selectedPreset === 'pxe-client'
                  ? 'TFTP Server IP'
                  : selectedPreset === 'docsis'
                    ? 'Config File Server IP'
                    : 'TFTP Server IP'}
              </label>
              <input id="serverIp" type="text" bind:value={networkConfig.serverIp} placeholder="192.168.10.5" />
              <span class="help-text">IP address of the provisioning server</span>
            </div>
          {/if}

          {#if needsBootFilename}
            <!-- Boot Filename -->
            <div class="input-group">
              <label for="bootFilename">
                <Icon name="file" size="sm" />
                {selectedPreset === 'docsis' ? 'Config Filename' : 'Boot Filename'}
              </label>
              <input
                id="bootFilename"
                type="text"
                bind:value={networkConfig.bootFilename}
                placeholder={selectedPreset === 'pxe-client'
                  ? 'pxelinux.0'
                  : selectedPreset === 'docsis'
                    ? 'modem.cfg'
                    : 'SEPDefault.cnf.xml'}
              />
              <span class="help-text">Name of the configuration or boot file</span>
            </div>
          {/if}

          <!-- MikroTik Server Name -->
          <div class="input-group">
            <label for="mikrotikServerName">
              <Icon name="server" size="sm" />
              MikroTik DHCP Server Name
            </label>
            <input
              id="mikrotikServerName"
              type="text"
              bind:value={networkConfig.mikrotikServerName}
              placeholder="dhcp1"
            />
            <span class="help-text">Name of DHCP server in MikroTik config</span>
          </div>

          <!-- Lease Time -->
          <div class="input-group">
            <label for="leaseTime">
              <Icon name="clock" size="sm" />
              Lease Time (dnsmasq)
            </label>
            <input id="leaseTime" type="text" bind:value={networkConfig.leaseTime} placeholder="24h" />
            <span class="help-text">DHCP lease time (e.g., 24h, 1h, 30m)</span>
          </div>
        </details>
      </div>

      <!-- Display Errors -->
      {#if errors.length > 0}
        <div class="errors">
          {#each errors as error, i (i)}
            <div class="error-message">
              <Icon name="alert-triangle" size="sm" />
              {error}
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

{#if result}
  <div class="card results">
    <h3>Generated Configurations</h3>

    <!-- Vendor Class Identifier -->
    <div class="vci-section">
      <div class="vci-header">
        <h4>
          <Icon name="tag" size="sm" />
          Vendor Class Identifier (Option 60)
        </h4>
        <button
          type="button"
          class="copy-btn"
          class:copied={clipboard.isCopied('vci')}
          onclick={() => clipboard.copy(result!.vendorClass, 'vci')}
        >
          <Icon name={clipboard.isCopied('vci') ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied('vci') ? 'Copied' : 'Copy'}
        </button>
      </div>
      <code class="vci-value">{result.vendorClass}</code>

      <div class="use-case">
        <Icon name="info" size="sm" />
        <p><strong>Use Case:</strong> {result.useCase}</p>
      </div>
    </div>

    <!-- Server Configurations -->
    <div class="output-formats">
      {#each [{ id: 'isc', title: 'ISC DHCP Server', content: result.iscDhcpConfig, hint: 'Add to /etc/dhcp/dhcpd.conf' }, { id: 'kea', title: 'Kea DHCP Server', content: result.keaConfig, hint: 'Add to Kea configuration JSON' }, { id: 'windows', title: 'Windows DHCP Server', content: result.windowsConfig, hint: 'Run PowerShell commands as Administrator' }, { id: 'dnsmasq', title: 'dnsmasq', content: result.dnsmasqConfig, hint: 'Add to /etc/dnsmasq.conf' }, { id: 'mikrotik', title: 'MikroTik RouterOS', content: result.mikrotikConfig, hint: 'RouterOS CLI commands' }] as config (config.id)}
        <div class="output-group">
          <div class="output-header">
            <h4>{config.title}</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied(config.id)}
              onclick={() => clipboard.copy(config.content, config.id)}
            >
              <Icon name={clipboard.isCopied(config.id) ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied(config.id) ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{config.content}</pre>
          <p class="format-hint">{config.hint}</p>
        </div>
      {/each}
    </div>
  </div>

  <div class="card info">
    <h3>Important Notes</h3>
    <ul class="notes-list">
      {#each importantNotes as note (note)}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <li>{@html note}</li>
      {/each}
    </ul>
  </div>
{/if}

<style lang="scss">
  .card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    &.input-card {
      background: var(--bg-tertiary);
      margin-bottom: var(--spacing-lg);
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

  .inputs {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 500;
      color: var(--text-primary);
    }

    select,
    input {
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

    .help-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
  }

  .advanced-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--bg-secondary), transparent 40%);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    margin-top: var(--spacing-sm);
    details {
      summary {
        h3 {
          margin: 0;
        }
        cursor: pointer;
        list-style: none;
        &::marker {
          content: none;
        }
      }
      &[open] {
        summary h3 {
          margin-bottom: var(--spacing-md);
        }
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

  .errors {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: color-mix(in srgb, var(--color-error), transparent 90%);
    border-left: 3px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
    font-size: 0.9375rem;
  }

  .results {
    animation: slideIn 0.3s ease-out;
    background: var(--bg-tertiary);
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

  .vci-section {
    padding: var(--spacing-md);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-success), transparent 95%),
      color-mix(in srgb, var(--color-success), transparent 98%)
    );
    border-left: 3px solid var(--color-success);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
  }

  .vci-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .vci-value {
    display: block;
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-success);
    word-break: break-word;
    margin: 0 0 var(--spacing-md);
  }

  .use-case {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border-radius: var(--radius-sm);

    p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-primary);
      line-height: 1.5;

      strong {
        color: var(--text-primary);
      }
    }
  }

  .output-formats {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .output-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
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
    word-break: break-all;
    overflow-x: auto;
  }

  .code-block {
    white-space: pre;
    word-break: normal;
    overflow-x: auto;
  }

  .format-hint {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .info {
    margin-top: var(--spacing-lg);
    background: color-mix(in srgb, var(--color-warning), transparent 95%);
    border-color: var(--color-warning);
    h3 {
      margin-bottom: var(--spacing-sm);
    }
    .notes-list {
      padding-left: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      li {
        line-height: 1.6;
        color: var(--text-primary);
      }
    }
  }

  @media (max-width: 768px) {
    .card {
      padding: var(--spacing-md);
    }

    .output-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);

      .copy-btn {
        align-self: flex-end;
      }
    }
  }
</style>
