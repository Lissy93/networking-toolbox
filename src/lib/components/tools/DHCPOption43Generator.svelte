<script lang="ts">
  import {
    generateOption43,
    parseIPList,
    isValidIPv4,
    VENDOR_INFO,
    type VendorType,
    type Option43Result,
  } from '$lib/utils/dhcp-option43';
  import { useClipboard, useExamples } from '$lib/composables';
  import Icon from '$lib/components/global/Icon.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';

  let vendorType = $state<VendorType>('cisco-catalyst');
  let ipInput = $state('');
  let result = $state<Option43Result | null>(null);
  let errors = $state<string[]>([]);
  const clipboard = useClipboard();

  const vendorInfo = $derived(VENDOR_INFO[vendorType]);

  const examplesList = [
    {
      vendor: 'cisco-catalyst' as VendorType,
      ips: '192.168.1.10\n192.168.1.11',
      description: 'Cisco Catalyst with dual controllers',
    },
    {
      vendor: 'cisco-meraki' as VendorType,
      ips: '192.168.10.5',
      description: 'Single Meraki cloud controller',
    },
    {
      vendor: 'ruckus-smartzone' as VendorType,
      ips: '10.0.0.100',
      description: 'Ruckus SmartZone controller',
    },
    {
      vendor: 'aruba' as VendorType,
      ips: '172.16.1.50',
      description: 'Aruba wireless controller',
    },
    {
      vendor: 'unifi' as VendorType,
      ips: '192.168.1.20',
      description: 'UniFi Network Controller',
    },
    {
      vendor: 'ruckus-zonedirector' as VendorType,
      ips: '10.50.100.200',
      description: 'Ruckus ZoneDirector (legacy)',
    },
  ];

  const examples = useExamples(examplesList);

  function generate() {
    errors = [];
    result = null;

    const ips = parseIPList(ipInput);

    if (ips.length === 0) {
      errors = ['Please enter at least one IP address'];
      return;
    }

    // Validate each IP
    const invalidIPs = ips.filter((ip) => !isValidIPv4(ip));
    if (invalidIPs.length > 0) {
      errors = [`Invalid IP address format: ${invalidIPs.join(', ')}`];
      return;
    }

    // Check max IPs for vendor
    if (ips.length > vendorInfo.maxIPs) {
      errors = [
        `${vendorInfo.name} supports maximum ${vendorInfo.maxIPs} controller${vendorInfo.maxIPs > 1 ? 's' : ''}. You entered ${ips.length}.`,
      ];
      return;
    }

    try {
      result = generateOption43(vendorType, ips);
    } catch (error) {
      errors = [error instanceof Error ? error.message : 'Unknown error occurred'];
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    vendorType = example.vendor;
    ipInput = example.ips;
    examples.select(index);
    generate();
  }
</script>

<!-- Examples -->
<ExamplesCard
  examples={examplesList}
  selectedIndex={examples.selectedIndex}
  onSelect={loadExample}
  getLabel={(ex) => VENDOR_INFO[ex.vendor].name}
  getDescription={(ex) => ex.description}
  getTooltip={(ex) => `Generate Option 43 for ${VENDOR_INFO[ex.vendor].name}`}
/>

<!-- Input Form -->
<div class="card input-card">
  <div class="card-header">
    <h3>Generator Configuration</h3>
  </div>
  <div class="card-content">
    <section class="inputs">
      <div class="input-group">
        <label for="vendor">
          <Icon name="wifi" size="sm" />
          Wireless Controller Vendor
        </label>
        <select
          id="vendor"
          bind:value={vendorType}
          onchange={() => {
            result = null;
            examples.clear();
          }}
        >
          {#each Object.entries(VENDOR_INFO) as [value, info] (value)}
            <option {value}>{info.name}</option>
          {/each}
        </select>
        <span class="help-text">{vendorInfo.description}</span>
      </div>

      <div class="input-group">
        <label for="ip-input">
          <Icon name="network" size="sm" />
          Controller IP Address{vendorInfo.maxIPs > 1 ? 'es' : ''}
          <span class="label-hint">
            (max {vendorInfo.maxIPs})
          </span>
        </label>
        <textarea
          id="ip-input"
          bind:value={ipInput}
          placeholder={`Enter IP address${vendorInfo.maxIPs > 1 ? 'es' : ''} (one per line or comma-separated)\ne.g., 192.168.1.10, 192.168.1.11`}
          rows="3"
          onchange={() => examples.clear()}
        ></textarea>
        <div class="input-actions">
          <button type="button" class="btn-primary" onclick={generate}>
            <Icon name="zap" size="sm" />
            Generate
          </button>
        </div>
      </div>

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
    <h3>Generated Option 43 Values</h3>

    {#if result.iosCommand && result.workings}
      <div class="ios-command-section">
        <div class="ios-header">
          <h4>
            <Icon name="terminal" size="sm" />
            {result.commandLabel || 'DHCP Server Command'}
          </h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('ios')}
            onclick={() => clipboard.copy(result!.iosCommand!, 'ios')}
          >
            <Icon name={clipboard.isCopied('ios') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('ios') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="ios-command">{result.iosCommand}</pre>

        <div class="workings">
          <h5>How this value is calculated:</h5>
          <ul>
            {#each result.workings as working, i (i)}
              <li>{working}</li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}

    <div class="explanation">
      <Icon name="info" size="sm" />
      <p>{result.explanation}</p>
    </div>

    <div class="output-formats">
      <div class="output-group">
        <div class="output-header">
          <h4>Hexadecimal String</h4>
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
        <code class="output-value">{result.hex}</code>
        <p class="format-hint">Raw hexadecimal - used in most DHCP server configurations</p>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Colon-Separated Hex</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('colonHex')}
            onclick={() => clipboard.copy(result!.colonHex, 'colonHex')}
          >
            <Icon name={clipboard.isCopied('colonHex') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('colonHex') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <code class="output-value">{result.colonHex}</code>
        <p class="format-hint">Used by Infoblox and some network appliances</p>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Windows DHCP Binary</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('windows')}
            onclick={() => clipboard.copy(result!.windowsBinary, 'windows')}
          >
            <Icon name={clipboard.isCopied('windows') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('windows') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <code class="output-value">{result.windowsBinary}</code>
        <p class="format-hint">Enter in Windows DHCP Server's Binary field for Option 43</p>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>ISC DHCP Configuration</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('isc')}
            onclick={() => clipboard.copy(result!.iscDhcp, 'isc')}
          >
            <Icon name={clipboard.isCopied('isc') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('isc') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre class="output-value code-block">{result.iscDhcp}</pre>
        <p class="format-hint">Add to dhcpd.conf for ISC DHCP server</p>
      </div>

      <div class="output-group">
        <div class="output-header">
          <h4>Mikrotik Configuration</h4>
          <button
            type="button"
            class="copy-btn"
            class:copied={clipboard.isCopied('mikrotik')}
            onclick={() => clipboard.copy(result!.mikrotik, 'mikrotik')}
          >
            <Icon name={clipboard.isCopied('mikrotik') ? 'check' : 'copy'} size="xs" />
            {clipboard.isCopied('mikrotik') ? 'Copied' : 'Copy'}
          </button>
        </div>
        <code class="output-value">{result.mikrotik}</code>
        <p class="format-hint">RouterOS DHCP option configuration command</p>
      </div>
    </div>
  </div>

  <div class="card info">
    <h3>Important Notes</h3>
    <ul class="notes-list">
      <li>
        <strong>DHCP Option 43</strong> is vendor-specific and must match the AP manufacturer's expected format
      </li>
      <li>
        Some vendors require <strong>Option 60</strong> (Vendor Class Identifier) to be set in addition to Option 43
      </li>
      <li>Ensure controller IPs are reachable from the AP management network</li>
      <li>
        For high availability, configure <strong>multiple controller IPs</strong> when supported
      </li>
      <li>Changes to DHCP options require AP to renew lease or reboot to take effect</li>
      <li>Always test in a controlled environment before deploying to production networks</li>
    </ul>
  </div>
{/if}

<style lang="scss">
  .input-card {
    margin-bottom: var(--spacing-lg);
  }

  .card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-primary);

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin: 0 0 var(--spacing-md);
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

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 500;
      color: var(--text-primary);
    }

    .label-hint {
      font-size: 0.875rem;
      font-weight: 400;
      color: var(--text-secondary);
    }

    select,
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
      min-height: 80px;
      font-family: var(--font-mono);
    }

    .help-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
  }

  .input-actions {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
    margin: var(--spacing-sm) auto 0 auto;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--color-primary);
    color: var(--bg-primary);

    &:hover {
      background: color-mix(in srgb, var(--color-primary), black 10%);
      transform: translateY(-1px);
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

  .ios-command-section {
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

  .ios-header {
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

  .ios-command {
    display: block;
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-success);
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: auto;
    margin: 0 0 var(--spacing-md);
  }

  .workings {
    h5 {
      margin: 0 0 var(--spacing-xs);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      li {
        font-family: var(--font-mono);
        font-size: 0.875rem;
        color: var(--text-primary);
        line-height: 1.6;
      }
    }
  }

  .explanation {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-info), transparent 92%);
    border-left: 3px solid var(--color-info);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);

    p {
      margin: 0;
      color: var(--text-primary);
      line-height: 1.5;
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

        strong {
          color: var(--color-primary);
        }
      }
    }
  }

  @media (max-width: 768px) {
    .card {
      padding: var(--spacing-md);
    }

    .input-actions {
      flex-direction: column;
      button {
        width: 100%;
      }
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
