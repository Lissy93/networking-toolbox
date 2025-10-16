<script lang="ts">
  import { convertWildcardMasks, type WildcardResult } from '$lib/utils/wildcard-mask.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../styles/diagnostics-pages.scss';
  import { useClipboard } from '$lib/composables';
  import { formatNumber } from '$lib/utils/formatters';

  let inputText = $state('192.168.1.0/24\n10.0.0.0 255.255.255.0\n172.16.0.0 0.0.255.255');
  let result = $state<WildcardResult | null>(null);
  let isLoading = $state(false);
  const clipboard = useClipboard();
  let _selectedExample = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);
  let _userModified = $state(false);

  const examples = [
    {
      label: 'Basic CIDR to Wildcard',
      input: `192.168.1.0/24
10.0.0.0/16
172.16.0.0/20`,
      generateACL: false,
    },
    {
      label: 'Subnet Mask Format',
      input: `192.168.1.0 255.255.255.0
10.0.0.0 255.255.0.0
172.16.0.0 255.255.240.0`,
      generateACL: false,
    },
    {
      label: 'Wildcard Mask Input',
      input: `192.168.0.0 0.0.255.255
10.0.0.0 0.255.255.255
172.16.0.0 0.0.15.255`,
      generateACL: false,
    },
    {
      label: 'Mixed Formats',
      input: `192.168.1.0/24
10.0.0.0 255.255.0.0
172.16.0.0 0.0.255.255`,
      generateACL: false,
    },
    {
      label: 'Cisco ACL Generation',
      input: `192.168.1.0/24
10.0.0.0/16`,
      generateACL: true,
    },
    {
      label: 'Complex Network ACLs',
      input: `192.168.0.0/22
10.1.0.0/20
172.16.100.0/24`,
      generateACL: true,
    },
  ];

  // ACL options
  let generateACL = $state(false);
  let aclType = $state<'permit' | 'deny'>('permit');
  let protocol = $state('ip');
  let destination = $state('any');

  function convertMasks() {
    if (!inputText.trim()) {
      result = null;
      return;
    }

    isLoading = true;

    try {
      const inputs = inputText.split('\n').filter((line) => line.trim());
      result = convertWildcardMasks(inputs, {
        type: aclType,
        protocol: protocol || 'ip',
        destination: destination || 'any',
        generateACL,
      });
    } catch (error) {
      result = {
        conversions: [],
        aclRules: { cisco: [], juniper: [], generic: [] },
        summary: { totalInputs: 0, validInputs: 0, invalidInputs: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      isLoading = false;
    }
  }

  function exportResults(format: 'csv' | 'json') {
    if (!result) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    let content = '';
    let filename = '';

    if (format === 'csv') {
      const headers =
        'Input,Type,CIDR,Subnet Mask,Wildcard Mask,Prefix,Host Bits,Network,Broadcast,Total Hosts,Usable Hosts,Valid,Error';
      const rows = result.conversions.map(
        (conv) =>
          `"${conv.input}","${conv.inputType}","${conv.cidr}","${conv.subnetMask}","${conv.wildcardMask}","${conv.prefixLength}","${conv.hostBits}","${conv.networkAddress}","${conv.broadcastAddress}","${conv.totalHosts}","${conv.usableHosts}","${conv.isValid}","${conv.error || ''}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `wildcard-masks-${timestamp}.csv`;
    } else {
      content = JSON.stringify(result, null, 2);
      filename = `wildcard-masks-${timestamp}.json`;
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyACLRules(type: 'cisco' | 'juniper' | 'generic') {
    if (!result) return;
    const rules = result.aclRules[type];
    if (rules.length > 0) {
      clipboard.copy(rules.join('\n'), `acl-${type}`);
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    inputText = example.input;
    generateACL = example.generateACL;
    _selectedExample = example.label;
    selectedExampleIndex = index;
    _userModified = false;
  }

  function handleInputChange() {
    _userModified = true;
    _selectedExample = null;
    selectedExampleIndex = null;
  }

  // Auto-convert when inputs or ACL settings change
  $effect(() => {
    if (inputText.trim()) {
      const timeoutId = setTimeout(convertMasks, 300);
      return () => clearTimeout(timeoutId);
    }
  });

  // Update ACL when settings change
  $effect(() => {
    if (result && generateACL) {
      const timeoutId = setTimeout(convertMasks, 100);
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h2>Wildcard Mask Converter</h2>
    <p>Convert between CIDR notation, subnet masks, and wildcard masks with ACL rule generation</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (example.label)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
          >
            <div class="example-label">{example.label}</div>
            <div class="example-preview">
              {example.generateACL ? 'With ACL' : 'Conversion only'}
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <div class="input-section">
    <div class="inputs-section">
      <h3 use:tooltip={'Enter networks in various formats for wildcard mask conversion'}>Network Inputs</h3>
      <div class="input-group">
        <label for="inputs" use:tooltip={'Enter networks in CIDR, subnet mask, or wildcard mask format'}>
          IP Addresses, CIDRs, or Ranges
        </label>
        <textarea
          id="inputs"
          bind:value={inputText}
          oninput={handleInputChange}
          placeholder="192.168.1.0/24&#10;10.0.0.0 255.255.255.0&#10;172.16.0.0 0.0.255.255"
          rows="6"
        ></textarea>
        <div class="input-help">
          Enter one per line: CIDR (192.168.1.0/24), network + subnet mask (10.0.0.0 255.255.255.0), or network +
          wildcard mask (172.16.0.0 0.0.255.255)
        </div>
      </div>
    </div>

    <div class="acl-section">
      <h3 use:tooltip={'Configure access control list rule generation for network devices'}>ACL Options</h3>
      <div class="checkbox-group">
        <label class="checkbox-label" use:tooltip={'Generate access control list rules for network devices'}>
          <input type="checkbox" bind:checked={generateACL} onchange={handleInputChange} />
          <span class="checkbox-text">Generate ACL Rules</span>
        </label>
      </div>

      {#if generateACL}
        <div class="acl-settings">
          <div class="input-group">
            <label for="acl-type" use:tooltip={'Whether to permit or deny traffic matching this rule'}> Action </label>
            <select id="acl-type" bind:value={aclType} onchange={handleInputChange}>
              <option value="permit">Permit</option>
              <option value="deny">Deny</option>
            </select>
          </div>

          <div class="input-group">
            <label for="protocol" use:tooltip={'Network protocol (ip, tcp, udp, icmp, etc.)'}> Protocol </label>
            <input id="protocol" type="text" bind:value={protocol} oninput={handleInputChange} placeholder="ip" />
          </div>

          <div class="input-group">
            <label for="destination" use:tooltip={"Destination network or 'any' for all destinations"}>
              Destination
            </label>
            <input
              id="destination"
              type="text"
              bind:value={destination}
              oninput={handleInputChange}
              placeholder="any"
            />
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if isLoading}
    <div class="loading">
      <Icon name="loader" />
      Converting masks...
    </div>
  {/if}

  {#if result}
    <div class="results">
      {#if result.errors.length > 0}
        <div class="errors">
          <h3><Icon name="alert-triangle" /> Errors</h3>
          {#each result.errors as error, index (index)}
            <div class="error-item">{error}</div>
          {/each}
        </div>
      {/if}

      {#if result.conversions.length > 0}
        <div class="summary">
          <h3 use:tooltip={'Overview of wildcard mask conversion results'}>Conversion Summary</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-value">{result.summary.totalInputs}</span>
              <span class="stat-label" use:tooltip={'Total number of network inputs processed'}>Total Inputs</span>
            </div>
            <div class="stat aligned">
              <span class="stat-value">{result.summary.validInputs}</span>
              <span class="stat-label" use:tooltip={'Successfully converted network inputs'}>Valid</span>
            </div>
            <div class="stat misaligned">
              <span class="stat-value">{result.summary.invalidInputs}</span>
              <span class="stat-label" use:tooltip={'Network inputs that could not be converted'}>Invalid</span>
            </div>
          </div>
        </div>

        <div class="conversions">
          <div class="conversions-header">
            <h3 use:tooltip={'Detailed conversion results for each network input'}>Mask Conversions</h3>
            <div class="export-buttons">
              <button onclick={() => exportResults('csv')}>
                <Icon name="csv-file" />
                Export CSV
              </button>
              <button onclick={() => exportResults('json')}>
                <Icon name="json-file" />
                Export JSON
              </button>
            </div>
          </div>

          <div class="conversions-grid">
            {#each result.conversions as conversion, index (index)}
              <div class="conversion-card" class:aligned={conversion.isValid} class:misaligned={!conversion.isValid}>
                <div class="check-header">
                  <div class="check-input">
                    <span class="input-text">{conversion.input}</span>
                    <span class="input-type">{conversion.inputType.replace('-', ' ').toUpperCase()}</span>
                  </div>
                  <div class="check-status">
                    {#if conversion.isValid}
                      <Icon name="check-circle" />
                      Valid
                    {:else}
                      <Icon name="x-circle" />
                      Invalid
                    {/if}
                  </div>
                </div>

                {#if conversion.isValid}
                  <div class="conversion-details">
                    <div class="detail-row">
                      <span class="label" use:tooltip={'Classless Inter-Domain Routing notation'}>CIDR:</span>
                      <div class="code-container">
                        <code>{conversion.cidr}</code>
                        <button
                          type="button"
                          class="btn btn-icon btn-xs"
                          class:copied={clipboard.isCopied(conversion.cidr)}
                          onclick={() => clipboard.copy(conversion.cidr, conversion.cidr)}
                          use:tooltip={{ text: 'Copy to clipboard', position: 'top' }}
                        >
                          <Icon name={clipboard.isCopied(conversion.cidr) ? 'check' : 'copy'} size="xs" />
                        </button>
                      </div>
                    </div>

                    <div class="detail-row">
                      <span class="label" use:tooltip={'Standard subnet mask in dotted decimal notation'}
                        >Subnet Mask:</span
                      >
                      <div class="code-container">
                        <code>{conversion.subnetMask}</code>
                        <button
                          type="button"
                          class="btn btn-icon btn-xs"
                          class:copied={clipboard.isCopied(conversion.subnetMask)}
                          onclick={() => clipboard.copy(conversion.subnetMask, conversion.subnetMask)}
                          use:tooltip={{ text: 'Copy to clipboard', position: 'top' }}
                        >
                          <Icon name={clipboard.isCopied(conversion.subnetMask) ? 'check' : 'copy'} size="xs" />
                        </button>
                      </div>
                    </div>

                    <div class="detail-row">
                      <span class="label" use:tooltip={'Inverse subnet mask used in Cisco ACLs and OSPF'}
                        >Wildcard Mask:</span
                      >
                      <div class="code-container">
                        <code>{conversion.wildcardMask}</code>
                        <button
                          type="button"
                          class="btn btn-icon btn-xs"
                          class:copied={clipboard.isCopied(conversion.wildcardMask)}
                          onclick={() => clipboard.copy(conversion.wildcardMask, conversion.wildcardMask)}
                          use:tooltip={{ text: 'Copy to clipboard', position: 'top' }}
                        >
                          <Icon name={clipboard.isCopied(conversion.wildcardMask) ? 'check' : 'copy'} size="xs" />
                        </button>
                      </div>
                    </div>

                    <div class="network-info">
                      <div class="info-grid">
                        <div>
                          <span class="info-label" use:tooltip={'First address in the network range'}>Network:</span>
                          <span class="info-value">{conversion.networkAddress}</span>
                        </div>
                        <div>
                          <span class="info-label" use:tooltip={'Last address in the network range'}>Broadcast:</span>
                          <span class="info-value">{conversion.broadcastAddress}</span>
                        </div>
                        <div>
                          <span class="info-label" use:tooltip={'Number of bits available for host addresses'}
                            >Host Bits:</span
                          >
                          <span class="info-value">{conversion.hostBits}</span>
                        </div>
                        <div>
                          <span
                            class="info-label"
                            use:tooltip={'Total assignable host addresses (excluding network and broadcast)'}
                            >Usable Hosts:</span
                          >
                          <span class="info-value">{formatNumber(conversion.usableHosts)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                {:else}
                  <div class="error-message">
                    <Icon name="alert-triangle" />
                    {conversion.error}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        {#if generateACL && (result.aclRules.cisco.length > 0 || result.aclRules.juniper.length > 0 || result.aclRules.generic.length > 0)}
          <div class="acl-rules-container">
            <h3 use:tooltip={'Access control list rules generated for network devices'}>Generated ACL Rules</h3>

            {#if result.aclRules.cisco.length > 0}
              <div class="acl-section">
                <div class="acl-header">
                  <h4 use:tooltip={'Cisco IOS access control list format'}>Cisco ACL</h4>
                  <button
                    onclick={() => copyACLRules('cisco')}
                    class="copy-btn {clipboard.isCopied('acl-cisco') ? 'copied' : ''}"
                    use:tooltip={'Copy all Cisco ACL rules to clipboard'}
                  >
                    <Icon name={clipboard.isCopied('acl-cisco') ? 'check' : 'copy'} size="xs" />
                    {clipboard.isCopied('acl-cisco') ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div class="acl-code">
                  {#each result.aclRules.cisco as rule, index (index)}
                    <div class="acl-line">{rule}</div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if result.aclRules.juniper.length > 0}
              <div class="acl-section">
                <div class="acl-header">
                  <h4 use:tooltip={'Juniper JunOS firewall filter format'}>Juniper ACL</h4>
                  <button
                    onclick={() => copyACLRules('juniper')}
                    class="copy-btn {clipboard.isCopied('acl-juniper') ? 'copied' : ''}"
                    use:tooltip={'Copy all Juniper ACL rules to clipboard'}
                  >
                    <Icon name={clipboard.isCopied('acl-juniper') ? 'check' : 'copy'} size="xs" />
                    {clipboard.isCopied('acl-juniper') ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div class="acl-code">
                  {#each result.aclRules.juniper as rule, index (index)}
                    <div class="acl-line">{rule}</div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if result.aclRules.generic.length > 0}
              <div class="acl-section">
                <div class="acl-header">
                  <h4 use:tooltip={'Generic access control list format'}>Generic ACL</h4>
                  <button
                    onclick={() => copyACLRules('generic')}
                    class="copy-btn {clipboard.isCopied('acl-generic') ? 'copied' : ''}"
                    use:tooltip={'Copy all generic ACL rules to clipboard'}
                  >
                    <Icon name={clipboard.isCopied('acl-generic') ? 'check' : 'copy'} size="xs" />
                    {clipboard.isCopied('acl-generic') ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div class="acl-code">
                  {#each result.aclRules.generic as rule, index (index)}
                    <div class="acl-line">{rule}</div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .input-section {
    display: grid;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);

    @media (min-width: 768px) {
      grid-template-columns: 2fr 1fr;
    }
  }

  .inputs-section,
  .acl-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h3 {
      color: var(--text-primary);
      font-size: var(--font-size-lg);
      margin-bottom: var(--spacing-md);
      font-weight: 600;
    }
  }

  .checkbox-group {
    margin-bottom: var(--spacing-md);

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      cursor: pointer;
      padding: var(--spacing-sm);
      background-color: var(--bg-primary);
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
      width: fit-content;

      &:hover {
        background-color: var(--surface-hover);
      }

      input[type='checkbox'] {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        cursor: pointer;
        accent-color: var(--color-primary);
      }

      .checkbox-text {
        color: var(--text-primary);
        font-size: var(--font-size-sm);
        line-height: 1.4;
        font-weight: 600;
      }
    }
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
  }

  .input-group:last-child {
    margin-bottom: 0;
  }

  .input-group label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .input-group textarea,
  .input-group input,
  .input-group select {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    transition: var(--transition-fast);
  }

  .input-group textarea:focus,
  .input-group input:focus,
  .input-group select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .input-group textarea {
    resize: vertical;
    min-height: 150px;
  }

  .input-help {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .acl-settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    margin-top: var(--spacing-md);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .loading {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    justify-content: center;
    padding: var(--spacing-lg);
    color: var(--color-primary);
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .errors {
    background: var(--bg-secondary);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
  }

  .errors h3 {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    color: var(--color-error);
  }

  .error-item {
    color: var(--color-error-light);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);
  }

  .summary {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .summary h3 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--spacing-md);
  }

  .stat {
    text-align: center;
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .stat.aligned {
    border-color: var(--color-success);
  }

  .stat.misaligned {
    border-color: var(--color-error);
  }

  .stat-value {
    display: block;
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat.aligned .stat-value {
    color: var(--color-success);
  }

  .stat.misaligned .stat-value {
    color: var(--color-error);
  }

  .stat-label {
    display: block;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .conversions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .conversions-header h3 {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }

  .export-buttons {
    display: flex;
    gap: var(--spacing-sm);
  }

  .export-buttons button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .export-buttons button:hover {
    background: var(--color-primary-hover);
  }

  .conversions-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .conversion-card {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    background: var(--bg-tertiary);
  }

  .conversion-card.aligned {
    border-color: var(--color-success);
  }

  .conversion-card.misaligned {
    border-color: var(--color-error);
  }

  .check-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: var(--spacing-md);
  }

  @media (max-width: 768px) {
    .check-header {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .check-input {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .input-text {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  .input-type {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    background: var(--bg-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    align-self: flex-start;
  }

  .check-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 600;
  }

  .conversion-card.aligned .check-status {
    color: var(--color-success);
  }

  .conversion-card.misaligned .check-status {
    color: var(--color-error);
  }

  .conversion-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
  }

  .label {
    font-weight: 600;
    color: var(--text-primary);
  }

  .code-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .code-container code {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--color-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .btn {
    &.copied {
      color: var(--color-success);
      background-color: rgba(35, 134, 54, 0.1);
      border-color: var(--color-success);
    }
  }

  .network-info {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
  }

  .info-label {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .info-value {
    display: block;
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-error);
    font-size: var(--font-size-sm);
  }

  .acl-section {
    margin-bottom: var(--spacing-lg);
  }

  .acl-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .acl-header h4 {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .copy-btn:hover {
    background: var(--color-primary-hover);
  }

  .acl-code {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: var(--spacing-md);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    overflow-x: auto;
    border: 1px solid var(--border-primary);
  }

  .acl-line {
    margin-bottom: 0.25rem;
    white-space: nowrap;
  }

  /* ACL Rules Container */
  .acl-rules-container {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    margin-top: var(--spacing-lg);

    h3 {
      margin-bottom: var(--spacing-lg);
      color: var(--text-primary);
      font-size: var(--font-size-lg);
    }

    .acl-section {
      margin-bottom: var(--spacing-lg);

      &:last-child {
        margin-bottom: 0;
      }

      .acl-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-sm);

        h4 {
          color: var(--text-primary);
          font-size: var(--font-size-md);
          margin: 0;
        }
      }

      .copy-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-sm);
        cursor: pointer;
        transition: var(--transition-fast);

        &:hover {
          background: var(--surface-hover);
          border-color: var(--color-primary);
        }

        &.copied {
          color: var(--color-success);
          border-color: var(--color-success);
          background: color-mix(in srgb, var(--color-success), transparent 90%);
        }
      }

      .acl-code {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        padding: var(--spacing-md);
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        overflow-x: auto;
        border: 1px solid var(--border-primary);

        .acl-line {
          margin-bottom: 0.25rem;
          white-space: nowrap;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  }

  @media (max-width: 768px) {
    .input-section {
      grid-template-columns: 1fr;
    }

    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .export-buttons {
      flex-direction: column;
    }

    .acl-rules-container {
      .acl-section {
        .acl-header {
          flex-direction: column;
          gap: var(--spacing-sm);
          align-items: stretch;

          .copy-btn {
            align-self: center;
          }
        }
      }
    }
  }
</style>
