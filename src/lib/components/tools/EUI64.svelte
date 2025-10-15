<script lang="ts">
  import { convertEUI64Addresses, type EUI64Result } from '$lib/utils/eui64.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';
  import Icon from '$lib/components/global/Icon.svelte';

  let inputText = $state('00:1A:2B:3C:4D:5E\n02:1A:2B:FF:FE:3C:4D:5F\n08:00:27:12:34:56\n0A:00:27:FF:FE:12:34:57');
  let globalPrefix = $state('2001:db8::/64');
  let result = $state<EUI64Result | null>(null);
  let isLoading = $state(false);
  const clipboard = useClipboard();

  function convertAddresses() {
    if (!inputText.trim()) {
      result = null;
      return;
    }

    isLoading = true;

    try {
      const inputs = inputText.split('\n').filter((line) => line.trim());
      const prefix = globalPrefix.trim() || undefined;
      result = convertEUI64Addresses(inputs, prefix);
    } catch (error) {
      result = {
        conversions: [],
        summary: { totalInputs: 0, validInputs: 0, invalidInputs: 0, macToEUI64: 0, eui64ToMAC: 0 },
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
        'Input,Type,MAC Address,EUI-64,IPv6 Link-Local,IPv6 Global,Universal/Local,Unicast/Multicast,Valid,Error';
      const rows = result.conversions.map(
        (conv) =>
          `"${conv.input}","${conv.inputType.toUpperCase()}","${conv.macAddress}","${conv.eui64Address}","${conv.ipv6LinkLocal}","${conv.ipv6Global}","${conv.details.universalLocal}","${conv.details.unicastMulticast}","${conv.isValid}","${conv.error || ''}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `eui64-conversions-${timestamp}.csv`;
    } else {
      content = JSON.stringify(result, null, 2);
      filename = `eui64-conversions-${timestamp}.json`;
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Auto-convert when inputs change
  $effect(() => {
    if (inputText.trim()) {
      const timeoutId = setTimeout(convertAddresses, 300);
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h2>EUI-64 Converter</h2>
    <p>Convert between MAC addresses and IPv6 EUI-64 interface identifiers with automatic IPv6 address generation</p>
  </header>

  <div class="input-section">
    <div class="inputs-section">
      <h3>Address Conversion</h3>
      <div class="input-group">
        <label
          for="inputs"
          use:tooltip={{ text: 'Enter MAC addresses (48-bit) or EUI-64 identifiers (64-bit)', position: 'top' }}
        >
          MAC Addresses or EUI-64 Identifiers
        </label>
        <textarea
          id="inputs"
          bind:value={inputText}
          placeholder="00:1A:2B:3C:4D:5E&#10;02:1A:2B:FF:FE:3C:4D:5F&#10;08:00:27:12:34:56"
          rows="6"
        ></textarea>
        <div class="input-help">
          Enter MAC addresses (48-bit) or EUI-64 identifiers (64-bit) one per line. Various formats supported:
          xx:xx:xx:xx:xx:xx or xx-xx-xx-xx-xx-xx
        </div>
      </div>

      <div class="input-group">
        <label
          for="prefix"
          use:tooltip={{
            text: 'IPv6 network prefix for generating global addresses (e.g., 2001:db8::/64)',
            position: 'top',
          }}
        >
          IPv6 Global Prefix (Optional)
        </label>
        <input id="prefix" type="text" bind:value={globalPrefix} placeholder="2001:db8::/64" />
        <div class="input-help">
          IPv6 prefix for generating global unicast addresses. Leave empty to use example prefix.
        </div>
      </div>
    </div>

    <div class="info-section">
      <h3>EUI-64 Information</h3>
      <div class="info-content">
        <p>
          <strong>EUI-64</strong> (Extended Unique Identifier 64-bit) is used to generate IPv6 interface identifiers from
          MAC addresses:
        </p>
        <ul>
          <li>Split MAC address: OUI (24 bits) + Device ID (24 bits)</li>
          <li>Insert FFFE between OUI and Device ID</li>
          <li>Flip the Universal/Local bit (bit 1) in the first octet</li>
          <li>Result: 64-bit interface identifier for IPv6</li>
        </ul>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="loading">
      <Icon name="loader" />
      Converting addresses...
    </div>
  {/if}

  {#if result}
    <div class="results">
      {#if result.errors.length > 0}
        <div class="errors">
          <h3><Icon name="alert-triangle" /> Errors</h3>
          {#each result.errors as error (error)}
            <div class="error-item">{error}</div>
          {/each}
        </div>
      {/if}

      {#if result.conversions.length > 0}
        <div class="summary">
          <h3>Conversion Summary</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-value">{result.summary.totalInputs}</span>
              <span class="stat-label">Total Inputs</span>
            </div>
            <div class="stat valid">
              <span class="stat-value">{result.summary.validInputs}</span>
              <span class="stat-label">Valid</span>
            </div>
            <div class="stat invalid">
              <span class="stat-value">{result.summary.invalidInputs}</span>
              <span class="stat-label">Invalid</span>
            </div>
            <div class="stat mac-to-eui">
              <span class="stat-value">{result.summary.macToEUI64}</span>
              <span class="stat-label">MAC → EUI-64</span>
            </div>
            <div class="stat eui-to-mac">
              <span class="stat-value">{result.summary.eui64ToMAC}</span>
              <span class="stat-label">EUI-64 → MAC</span>
            </div>
          </div>
        </div>

        <div class="conversions">
          <div class="conversions-header">
            <h3>Address Conversions</h3>
            <div class="export-buttons">
              <button onclick={() => exportResults('csv')}>
                <Icon name="download" />
                Export CSV
              </button>
              <button onclick={() => exportResults('json')}>
                <Icon name="download" />
                Export JSON
              </button>
            </div>
          </div>

          <div class="conversions-list">
            {#each result.conversions as conversion (conversion.input)}
              <div class="conversion-card" class:valid={conversion.isValid} class:invalid={!conversion.isValid}>
                <div class="card-header">
                  <div class="input-info">
                    <span class="input-text">{conversion.input}</span>
                    <div class="input-meta">
                      <span class="input-type">{conversion.inputType.toUpperCase()}</span>
                      <span class="conversion-direction">
                        {conversion.inputType === 'mac' ? 'MAC → EUI-64' : 'EUI-64 → MAC'}
                      </span>
                    </div>
                  </div>

                  <div class="status">
                    {#if conversion.isValid}
                      <Icon name="check-circle" />
                    {:else}
                      <Icon name="x-circle" />
                    {/if}
                  </div>
                </div>

                {#if conversion.isValid}
                  <div class="conversion-details">
                    <div class="addresses-section">
                      <div class="address-item">
                        <span class="address-label">MAC Address:</span>
                        <div class="code-container">
                          <code>{conversion.macAddress}</code>
                          <button
                            type="button"
                            class="btn btn-icon btn-xs"
                            class:copied={clipboard.isCopied(conversion.macAddress)}
                            onclick={() => clipboard.copy(conversion.macAddress, conversion.macAddress)}
                            use:tooltip={{ text: 'Copy to clipboard', position: 'top' }}
                          >
                            <Icon name={clipboard.isCopied(conversion.macAddress) ? 'check' : 'copy'} size="xs" />
                          </button>
                        </div>
                      </div>

                      <div class="address-item">
                        <span class="address-label">EUI-64:</span>
                        <div class="code-container">
                          <code>{conversion.eui64Address}</code>
                          <button
                            type="button"
                            class="btn btn-icon btn-xs"
                            class:copied={clipboard.isCopied(conversion.eui64Address)}
                            onclick={() => clipboard.copy(conversion.eui64Address, conversion.eui64Address)}
                            use:tooltip={{ text: 'Copy to clipboard', position: 'top' }}
                          >
                            <Icon name={clipboard.isCopied(conversion.eui64Address) ? 'check' : 'copy'} size="xs" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="ipv6-section">
                      <h4>Generated IPv6 Addresses</h4>
                      <div class="ipv6-item">
                        <span class="ipv6-label">Link-Local:</span>
                        <div class="code-container">
                          <code>{conversion.ipv6LinkLocal}</code>
                          <button
                            type="button"
                            class="btn btn-icon btn-xs"
                            class:copied={clipboard.isCopied(conversion.ipv6LinkLocal)}
                            onclick={() => clipboard.copy(conversion.ipv6LinkLocal, conversion.ipv6LinkLocal)}
                            use:tooltip={{ text: 'Copy to clipboard', position: 'top' }}
                          >
                            <Icon name={clipboard.isCopied(conversion.ipv6LinkLocal) ? 'check' : 'copy'} size="xs" />
                          </button>
                        </div>
                      </div>

                      <div class="ipv6-item">
                        <span class="ipv6-label">Global:</span>
                        <div class="code-container">
                          <code>{conversion.ipv6Global}</code>
                          <button
                            type="button"
                            class="btn btn-icon btn-xs"
                            class:copied={clipboard.isCopied(conversion.ipv6Global)}
                            onclick={() => clipboard.copy(conversion.ipv6Global, conversion.ipv6Global)}
                            use:tooltip={{ text: 'Copy to clipboard', position: 'top' }}
                          >
                            <Icon name={clipboard.isCopied(conversion.ipv6Global) ? 'check' : 'copy'} size="xs" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="properties-section">
                      <h4>Address Properties</h4>
                      <div class="properties-grid">
                        <div class="property-item">
                          <span class="property-label">OUI Part:</span>
                          <code>{conversion.details.ouiPart}</code>
                        </div>

                        <div class="property-item">
                          <span class="property-label">Device Part:</span>
                          <code>{conversion.details.devicePart}</code>
                        </div>

                        <div class="property-item">
                          <span class="property-label">Modified OUI:</span>
                          <code>{conversion.details.modifiedOUI}</code>
                        </div>

                        <div class="property-item">
                          <span class="property-label">Scope:</span>
                          <span
                            class="property-value"
                            class:universal={conversion.details.universalLocal === 'universal'}
                            class:local={conversion.details.universalLocal === 'local'}
                          >
                            {conversion.details.universalLocal.toUpperCase()}
                          </span>
                        </div>

                        <div class="property-item">
                          <span class="property-label">Type:</span>
                          <span
                            class="property-value"
                            class:unicast={conversion.details.unicastMulticast === 'unicast'}
                            class:multicast={conversion.details.unicastMulticast === 'multicast'}
                          >
                            {conversion.details.unicastMulticast.toUpperCase()}
                          </span>
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
      {/if}
    </div>
  {/if}
</div>

<style>
  .input-section {
    display: grid;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  @media (min-width: 768px) {
    .input-section {
      grid-template-columns: 2fr 1fr;
    }
  }

  .inputs-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .inputs-section h3 {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-md);
    font-weight: 600;
  }

  .info-section {
    background: var(--bg-info);
    border: 1px solid var(--border-info);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .info-section h3 {
    color: var(--color-info-dark);
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-md);
    font-weight: 600;
  }

  .info-content {
    color: var(--color-info-dark);
  }

  .info-content p {
    margin-bottom: var(--spacing-sm);
  }

  .info-content ul {
    margin: 0;
    color: var(--color-info-dark);
    padding-left: var(--spacing-lg);
  }

  .code-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
    flex: 1;
  }

  .code-container code {
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-weight: 600;
    padding: 0.375rem 0.75rem;
    flex: 1;
    border-radius: 0;
  }

  .code-container button {
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-xs);
    padding: var(--spacing-xs);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition-fast);
    flex-shrink: 0;
  }

  .code-container button:hover {
    background: var(--color-primary-hover);
  }

  .code-container button.copied {
    background: var(--color-success);
  }

  .code-container button.copied:hover {
    background: var(--color-success);
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
  .input-group input {
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
  .input-group input:focus {
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

  .info-content li {
    margin-bottom: var(--spacing-xs);
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
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
  }

  .stat {
    text-align: center;
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .stat.valid {
    border-color: var(--color-success);
  }

  .stat.invalid {
    border-color: var(--color-error);
  }

  .stat.mac-to-eui {
    border-color: var(--color-info);
  }

  .stat.eui-to-mac {
    border-color: var(--color-warning);
  }

  .stat-value {
    display: block;
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat.valid .stat-value {
    color: var(--color-success);
  }

  .stat.invalid .stat-value {
    color: var(--color-error);
  }

  .stat.mac-to-eui .stat-value {
    color: var(--color-info);
  }

  .stat.eui-to-mac .stat-value {
    color: var(--color-warning);
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

  @media (max-width: 768px) {
    .conversions-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }
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

  .conversions-list {
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

  .conversion-card.valid {
    border-color: var(--color-success);
  }

  .conversion-card.invalid {
    border-color: var(--color-error);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: var(--spacing-md);
  }

  @media (max-width: 768px) {
    .card-header {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .input-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .input-text {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  .input-meta {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .input-type,
  .conversion-direction {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .status {
    color: var(--color-success);
  }

  .conversion-card.invalid .status {
    color: var(--color-error);
  }

  .conversion-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .addresses-section,
  .ipv6-section,
  .properties-section {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
  }

  .ipv6-section h4,
  .properties-section h4 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
    font-size: var(--font-size-md);
    font-weight: 600;
  }

  .address-item,
  .ipv6-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .address-item:last-child,
  .ipv6-item:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    .address-item,
    .ipv6-item {
      flex-direction: column;
      gap: var(--spacing-xs);
      align-items: stretch;
    }
  }

  .address-label,
  .ipv6-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .properties-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-sm);
  }

  .property-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  @media (max-width: 768px) {
    .property-item {
      flex-direction: column;
      gap: var(--spacing-xs);
      align-items: stretch;
    }
  }

  .property-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .property-item code {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .property-value {
    font-weight: 600;
    font-size: var(--font-size-sm);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
  }

  .property-value.universal {
    background: var(--color-success);
    color: var(--bg-primary);
  }

  .property-value.local {
    background: var(--color-warning);
    color: var(--bg-primary);
  }

  .property-value.unicast {
    background: var(--color-info);
    color: var(--bg-primary);
  }

  .property-value.multicast {
    background: var(--color-error);
    color: var(--bg-primary);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-error);
    font-size: var(--font-size-sm);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
  }

  @media (max-width: 768px) {
    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .export-buttons {
      flex-direction: column;
    }

    .properties-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
