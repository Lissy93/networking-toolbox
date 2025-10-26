<script lang="ts">
  import { convertMACAddresses, type MACConversionResult, type MACFormat } from '$lib/utils/mac-address.js';
  import { macAddressContent } from '$lib/content/mac-address.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';

  interface OUIField {
    key: string;
    label: string;
    icon: string | ((c: MACConversionResult) => string);
    render: (c: MACConversionResult) => string | null | undefined;
    code?: boolean;
    class?: string;
    valueClass?: (c: MACConversionResult) => string;
    condition?: (c: MACConversionResult) => boolean;
    tooltip?: (c: MACConversionResult) => string;
  }

  interface DetailField {
    label: string;
    key: 'isUniversal' | 'isUnicast';
    invert?: boolean;
  }

  interface FormatField {
    key: keyof MACFormat | 'binary';
    label: string;
    tooltip: string;
    binary?: boolean;
    class?: string;
  }

  let inputText = $state('00:1A:2B:3C:4D:5E');
  let result = $state<{ conversions: MACConversionResult[]; summary: any } | null>(null);
  let copiedStates = $state<Record<string, boolean>>({});
  let isLoading = $state(false);
  let isBulkMode = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    {
      mac: '00:1A:79:00:00:01',
      vendor: 'Telecomunication Technologies',
      description: 'Ukrainian telecom equipment (Odessa)',
    },
    { mac: '3C:22:FB:A1:B2:C3', vendor: 'Apple', description: 'Apple device (Cupertino, CA)' },
    { mac: 'DC:A6:32:A1:B2:C3', vendor: 'Raspberry Pi Trading', description: 'Raspberry Pi (Cambridge, UK)' },
    { mac: '00:16:3E:1F:4A:B1', vendor: 'Xensource', description: 'Xen virtual machine (Palo Alto, CA)' },
    { mac: '00:00:5E:00:01:01', vendor: 'ICANN IANA', description: 'IANA reserved addresses (special use)' },
    { mac: '00:0D:B9:A1:B2:C3', vendor: 'PC Engines', description: 'PC Engines embedded systems (Switzerland)' },
    { mac: 'FF:FF:FF:FF:FF:FF', vendor: '', description: 'Multicast/Broadcast' },
  ];

  const ouiFields: OUIField[] = [
    { key: 'oui', label: 'OUI', icon: 'hash', render: (c: MACConversionResult) => c.oui.oui, code: true },
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      icon: (c: MACConversionResult) => (c.oui.found ? 'building' : 'help-circle'),
      render: (c: MACConversionResult) => (c.oui.found ? c.oui.manufacturer : 'Unknown'),
      class: 'manufacturer-item',
      valueClass: (c: MACConversionResult) => (!c.oui.found ? 'unknown' : ''),
    },
    {
      key: 'country',
      label: 'Country',
      icon: 'globe',
      render: (c: MACConversionResult) => c.oui.country || 'N/A',
      condition: (c: MACConversionResult) => !!c.oui.country,
    },
    {
      key: 'blockType',
      label: 'Block Type',
      icon: 'layers',
      render: (c: MACConversionResult) => c.oui.blockType || 'N/A',
      tooltip: (c: MACConversionResult) => (c.oui.blockType ? getBlockTypeTooltip(c.oui.blockType) : ''),
      condition: (c: MACConversionResult) => !!c.oui.blockType,
    },
    {
      key: 'blockSize',
      label: 'Block Size',
      icon: 'database',
      render: (c: MACConversionResult) => (c.oui.blockSize ? `${c.oui.blockSize.toLocaleString()} addresses` : 'N/A'),
      condition: (c: MACConversionResult) => c.oui.blockSize != null,
    },
    {
      key: 'blockRange',
      label: 'Address Range',
      icon: 'server',
      render: (c: MACConversionResult) => `${c.oui.blockStart}-${c.oui.blockEnd}`,
      valueClass: () => 'range',
      condition: (c: MACConversionResult) => !!(c.oui.blockStart && c.oui.blockEnd),
    },
    {
      key: 'isPrivate',
      label: 'Registry Status',
      icon: 'shield',
      render: (c: MACConversionResult) => (c.oui.isPrivate ? 'Private' : 'Public'),
      condition: (c: MACConversionResult) => c.oui.isPrivate != null,
    },
    {
      key: 'updated',
      label: 'Last Updated',
      icon: 'clock',
      render: (c: MACConversionResult) => (c.oui.updated ? new Date(c.oui.updated).toLocaleDateString() : 'N/A'),
      condition: (c: MACConversionResult) => !!c.oui.updated,
    },
    {
      key: 'address',
      label: 'Address',
      icon: 'map-pin',
      render: (c: MACConversionResult) => c.oui.address || 'N/A',
      class: 'address-item',
      condition: (c: MACConversionResult) => !!c.oui.address,
    },
  ];

  const detailFields: DetailField[] = [
    { label: 'Universal Address', key: 'isUniversal' },
    { label: 'Locally Administered', key: 'isUniversal', invert: true },
    { label: 'Unicast', key: 'isUnicast' },
    { label: 'Multicast/Broadcast', key: 'isUnicast', invert: true },
  ];

  const formatFields: FormatField[] = [
    { key: 'colon', label: 'Colon Notation', tooltip: 'Standard IEEE notation; most Linux, BSD, macOS use this' },
    { key: 'hyphen', label: 'Hyphen Notation', tooltip: 'Common on Windows systems' },
    { key: 'cisco', label: 'Cisco (Dot) Notation', tooltip: 'Cisco IOS / NX-OS style' },
    { key: 'bareUppercase', label: 'Bare (Uppercase)', tooltip: 'Common in databases, APIs' },
    { key: 'bareLowercase', label: 'Bare (Lowercase)', tooltip: 'Common in scripts, JSON, etc.' },
    {
      key: 'eui64',
      label: 'EUI-64 (expanded form)',
      tooltip: 'Used when converting MAC → IPv6 Interface ID (adds FFFE in the middle, flips the U/L bit)',
    },
    {
      key: 'ipv6Style',
      label: 'Dot-separated 2-byte groups',
      tooltip: 'Occasionally seen in debugging or tools that mimic IPv6 notation',
    },
    { key: 'spaceSeparated', label: 'Space-separated pairs', tooltip: 'Sometimes seen in hex dumps or firmware logs' },
    {
      key: 'decimalOctets',
      label: 'Decimal octets',
      tooltip: 'Rare, but some diagnostic tools display MACs in decimal',
    },
    { key: 'prefixedMac', label: 'Prefixed (MAC=)', tooltip: 'Seen in configuration files or CLI outputs' },
    { key: 'slashSeparated', label: 'Slash-separated', tooltip: 'Seen in some telecom equipment or SNMP exports' },
    {
      key: 'prefixedBare',
      label: 'Prefixed bare (MAC)',
      tooltip: 'Appears in certain JSON/CSV exports or proprietary APIs',
    },
    {
      key: 'prefixedAddr',
      label: 'Prefixed bare (addr)',
      tooltip: 'Appears in certain JSON/CSV exports or proprietary APIs',
    },
    {
      key: 'binary',
      label: 'Binary (8-bit groups)',
      tooltip: 'Rare, but useful for bit-level inspection',
      binary: true,
      class: 'binary-item',
    },
  ];

  const blockTypeTooltips = {
    'MA-L': 'Large block: 16.7 million addresses (24-bit prefix)',
    'MA-M': 'Medium block: 1 million addresses (28-bit prefix)',
    'MA-S': 'Small block: 4,096 addresses (36-bit prefix)',
    CID: 'Company ID',
  } as const;

  async function convertAddresses() {
    if (!inputText.trim()) return (result = null);
    isLoading = true;
    try {
      result = await convertMACAddresses(inputText.split('\n').filter((line) => line.trim()));
    } finally {
      isLoading = false;
    }
  }

  function toggleMode() {
    isBulkMode = !isBulkMode;
    result = null;
    selectedExampleIndex = null;
    inputText = isBulkMode ? '00:1A:2B:3C:4D:5E\n00-50-56-C0-00-08\n001A.2B3C.4D5E\n001b632b4567' : '00:1A:2B:3C:4D:5E';
  }

  async function copyToClipboard(text: string, id: string = text) {
    try {
      await navigator.clipboard.writeText(text);
      copiedStates[id] = true;
      setTimeout(() => (copiedStates[id] = false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function exportResults(format: 'csv' | 'json') {
    if (!result) return;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    if (format === 'csv') {
      const headers = 'Input,Valid,Colon Format,Hyphen Format,Cisco Format,Bare,OUI,Manufacturer,Universal,Unicast';
      const rows = result.conversions.map(
        (c) =>
          `"${c.input}","${c.isValid}","${c.formats.colon}","${c.formats.hyphen}","${c.formats.cisco}","${c.formats.bare}","${c.oui.oui}","${c.oui.manufacturer || 'Unknown'}","${c.details.isUniversal}","${c.details.isUnicast}"`,
      );
      downloadFile([headers, ...rows].join('\n'), `mac-addresses-${timestamp}.csv`, 'text/csv');
    } else {
      downloadFile(JSON.stringify(result, null, 2), `mac-addresses-${timestamp}.json`, 'application/json');
    }
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const getBlockTypeTooltip = (blockType: string) =>
    blockTypeTooltips[blockType as keyof typeof blockTypeTooltips] || blockType;
  const handleSubmit = (e?: Event) => (e?.preventDefault(), convertAddresses());
  const loadExample = (example: (typeof examples)[0], index: number) => (
    (inputText = example.mac),
    (selectedExampleIndex = index),
    (isBulkMode = false),
    handleSubmit()
  );
  const clearExampleSelection = () => (selectedExampleIndex = null);
</script>

<div class="card">
  <header class="card-header">
    <h2>MAC Address Converter & OUI Lookup</h2>
    <p>
      Convert MAC addresses between different formats and identify the manufacturer using the Organizationally Unique
      Identifier (OUI)
    </p>
  </header>

  <div class="input-section">
    <div class="inputs-section">
      <div class="mode-toggle-row">
        <h3>MAC Address{isBulkMode ? 'es' : ''}</h3>
        <button class="mode-toggle" onclick={toggleMode}>
          <Icon name={isBulkMode ? 'layers' : 'file'} size="sm" />
          {isBulkMode ? 'Switch to Single' : 'Switch to Bulk'}
        </button>
      </div>

      <div class="input-group">
        {#if isBulkMode}
          <label
            for="inputs"
            use:tooltip={{
              text: 'Enter multiple MAC addresses, one per line',
              position: 'top',
            }}
          >
            Enter MAC Addresses
          </label>
          <textarea
            id="inputs"
            bind:value={inputText}
            placeholder="00:1A:2B:3C:4D:5E&#10;00-50-56-C0-00-08&#10;001A.2B3C.4D5E&#10;001b632b4567"
            rows="6"
            onkeydown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit();
              }
            }}
          ></textarea>
          <div class="input-help">
            Enter MAC addresses one per line. Supported formats: <code>00:1A:2B:3C:4D:5E</code>,
            <code>00-1A-2B-3C-4D-5E</code>, <code>001A.2B3C.4D5E</code> (Cisco), <code>001A2B3C4D5E</code>
          </div>
          <button class="lookup-btn bulk" onclick={handleSubmit} disabled={isLoading || !inputText.trim()}>
            <Icon name={isLoading ? 'loader' : 'search'} size="sm" />
            {isLoading ? 'Looking up...' : 'Lookup'}
          </button>
        {:else}
          <label
            for="inputs"
            use:tooltip={{
              text: 'Enter MAC address in any format: colon, hyphen, dot notation, or bare',
              position: 'top',
            }}
          >
            Enter MAC Address
          </label>
          <div class="input-row">
            <input
              type="text"
              id="inputs"
              bind:value={inputText}
              placeholder="00:1A:2B:3C:4D:5E"
              class="mac-input"
              oninput={clearExampleSelection}
              onkeydown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
            <button class="lookup-btn inline" onclick={handleSubmit} disabled={isLoading || !inputText.trim()}>
              <Icon name={isLoading ? 'loader' : 'search'} size="sm" />
              {isLoading ? 'Looking up...' : 'Lookup'}
            </button>
          </div>
          <div class="input-help">
            Supported formats: <code>00:1A:2B:3C:4D:5E</code>, <code>00-1A-2B-3C-4D-5E</code>,
            <code>001A.2B3C.4D5E</code>
            (Cisco), <code>001A2B3C4D5E</code>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={example.description}
          >
            <h5>{example.mac}</h5>
            <p>{example.vendor}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  {#if result}
    <div class="results">
      {#if result.conversions.length > 0}
        <div class="conversions">
          <div class="conversions-header">
            <h3>{result.conversions.length === 1 ? 'Address Conversion' : 'Address Conversions'}</h3>
            {#if result.conversions.length > 1}
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
            {/if}
          </div>

          {#each result.conversions as conversion (conversion.input)}
            <div class="conversion-item" class:invalid={!conversion.isValid}>
              {#if result.conversions.length > 1}
                <div class="conversion-header">
                  <div class="input-display">
                    <Icon name={conversion.isValid ? 'check-circle' : 'x-circle'} />
                    <code>{conversion.input}</code>
                  </div>
                  {#if conversion.error}
                    <div class="error-message">{conversion.error}</div>
                  {/if}
                </div>
              {:else if !conversion.isValid}
                <div class="conversion-header">
                  <div class="input-display error">
                    <Icon name="x-circle" />
                    <span>Invalid MAC Address</span>
                  </div>
                  {#if conversion.error}
                    <div class="error-message">{conversion.error}</div>
                  {/if}
                </div>
              {/if}

              {#if conversion.isValid}
                <!-- OUI Information -->
                <div class="conversion-section">
                  <h4>OUI Information</h4>
                  <div class="oui-info">
                    {#each ouiFields as field (field.key)}
                      {@const value = field.render(conversion)}
                      {#if !field.condition || field.condition(conversion)}
                        {#if value !== undefined && value !== null && value !== ''}
                          <div class="oui-item {field.class || ''}">
                            <Icon
                              name={typeof field.icon === 'function' ? field.icon(conversion) : field.icon}
                              size="md"
                            />
                            <div class="oui-content">
                              <span class="oui-label">{field.label}</span>
                              {#if field.code}
                                {#if field.tooltip}
                                  <code
                                    class="oui-value {field.valueClass?.(conversion) || ''}"
                                    use:tooltip={{ text: field.tooltip(conversion), position: 'top' }}
                                  >
                                    {value}
                                  </code>
                                {:else}
                                  <code class="oui-value {field.valueClass?.(conversion) || ''}">
                                    {value}
                                  </code>
                                {/if}
                              {:else if field.tooltip}
                                <span
                                  class="oui-value {field.valueClass?.(conversion) || ''}"
                                  use:tooltip={{ text: field.tooltip(conversion), position: 'top' }}
                                >
                                  {value}
                                </span>
                              {:else}
                                <span class="oui-value {field.valueClass?.(conversion) || ''}">
                                  {value}
                                </span>
                              {/if}
                            </div>
                          </div>
                        {/if}
                      {/if}
                    {/each}
                  </div>
                </div>

                <!-- Address Details -->
                <div class="conversion-section">
                  <h4>Address Details</h4>
                  <div class="details-grid">
                    {#each detailFields as field (field.label)}
                      {@const active = field.invert ? !conversion.details[field.key] : conversion.details[field.key]}
                      <div class="detail-item" class:active>
                        <Icon name={active ? 'check-circle' : 'circle'} />
                        <span>{field.label}</span>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Formats -->
                <div class="conversion-section">
                  <h4>Formats</h4>
                  <div class="format-grid">
                    {#each formatFields as field (field.key)}
                      {@const value = field.binary
                        ? conversion.details.binary
                        : conversion.formats[field.key as keyof MACFormat]}
                      {@const copyId = `${field.key}-${conversion.input}`}
                      <div class="format-item {field.class || ''}">
                        <span class="format-label" use:tooltip={{ text: field.tooltip, position: 'top' }}
                          >{field.label}</span
                        >
                        <div class="format-value" class:binary={field.binary}>
                          <code class:binary-display={field.binary}
                            >{field.binary ? value.match(/.{1,8}/g)?.join(' ') : value}</code
                          >
                          <button
                            class="copy-btn"
                            onclick={() => copyToClipboard(value, copyId)}
                            use:tooltip={{ text: 'Copy to clipboard', position: 'top' }}
                          >
                            <Icon name={copiedStates[copyId] ? 'check' : 'copy'} />
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        {#if result.conversions.length > 1}
          <div class="summary">
            <h3>Conversion Summary</h3>
            <div class="summary-stats">
              <div class="stat">
                <span class="stat-value">{result.summary.total}</span>
                <span class="stat-label">Total</span>
              </div>
              <div class="stat valid">
                <span class="stat-value">{result.summary.valid}</span>
                <span class="stat-label">Valid</span>
              </div>
              <div class="stat invalid">
                <span class="stat-value">{result.summary.invalid}</span>
                <span class="stat-label">Invalid</span>
              </div>
              <div class="stat with-oui">
                <span class="stat-value">{result.summary.withOUI}</span>
                <span class="stat-label">With OUI</span>
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<!-- Info Sections -->
<div class="card info-card">
  <div class="card-header">
    <h3>Understanding MAC Addresses</h3>
  </div>
  <div class="card-content">
    <details class="info-accordion">
      <summary class="accordion-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>{macAddressContent.sections.whatIsMAC.title}</h4>
      </summary>
      <div class="accordion-content">
        <p>{macAddressContent.sections.whatIsMAC.content}</p>
      </div>
    </details>

    <details class="info-accordion">
      <summary class="accordion-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>{macAddressContent.sections.structure.title}</h4>
      </summary>
      <div class="accordion-content">
        <ul>
          {#each macAddressContent.sections.structure.components as comp (comp.component)}
            <li><strong>{comp.component}:</strong> {comp.description}</li>
          {/each}
        </ul>
        <p class="structure-example">
          <strong>Example:</strong> <code>{macAddressContent.sections.structure.example.address}</code><br />
          <span class="structure-breakdown">
            {#each macAddressContent.sections.structure.example.breakdown as line (line)}
              • {line}<br />
            {/each}
          </span>
        </p>
      </div>
    </details>

    <details class="info-accordion">
      <summary class="accordion-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>{macAddressContent.sections.addressTypes.title}</h4>
      </summary>
      <div class="accordion-content">
        <ul>
          {#each macAddressContent.sections.addressTypes.types as type (type.type)}
            <li><strong>{type.type}:</strong> {type.description}</li>
          {/each}
        </ul>
      </div>
    </details>

    <details class="info-accordion">
      <summary class="accordion-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>{macAddressContent.sections.formats.title}</h4>
      </summary>
      <div class="accordion-content">
        <ul>
          {#each macAddressContent.sections.formats.formats as fmt (fmt.format)}
            <li><strong>{fmt.format}:</strong> <code>{fmt.example}</code> - {fmt.usage}</li>
          {/each}
        </ul>
      </div>
    </details>

    <details class="info-accordion">
      <summary class="accordion-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>{macAddressContent.sections.ouiLookup.title}</h4>
      </summary>
      <div class="accordion-content">
        <p>{macAddressContent.sections.ouiLookup.content}</p>
        <ul>
          {#each macAddressContent.sections.ouiLookup.blockTypes as block (block.type)}
            <li><strong>{block.type}:</strong> {block.description}</li>
          {/each}
        </ul>
        <p>{macAddressContent.sections.ouiLookup.lookupInfo}</p>
      </div>
    </details>

    <details class="info-accordion">
      <summary class="accordion-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>{macAddressContent.sections.specialAddresses.title}</h4>
      </summary>
      <div class="accordion-content">
        <ul>
          {#each macAddressContent.sections.specialAddresses.addresses as addr (addr.type)}
            <li><strong>{addr.type}:</strong> <code>{addr.address}</code> - {addr.description}</li>
          {/each}
        </ul>
      </div>
    </details>

    <details class="info-accordion">
      <summary class="accordion-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>{macAddressContent.sections.useCases.title}</h4>
      </summary>
      <div class="accordion-content">
        <ul>
          {#each macAddressContent.sections.useCases.cases as useCase (useCase.useCase)}
            <li><strong>{useCase.useCase}:</strong> {useCase.description}</li>
          {/each}
        </ul>
      </div>
    </details>

    <details class="info-accordion">
      <summary class="accordion-summary">
        <Icon name="chevron-right" size="sm" />
        <h4>Quick Tips</h4>
      </summary>
      <div class="accordion-content">
        <ul>
          {#each macAddressContent.quickTips as tip (tip)}
            <li>{tip}</li>
          {/each}
        </ul>
      </div>
    </details>
  </div>
</div>

<style lang="scss">
  .card-header {
    margin-bottom: var(--spacing-xl);

    h2 {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: var(--spacing-sm);
    }

    p {
      font-size: var(--font-size-md);
      color: var(--text-secondary);
      line-height: 1.6;
    }
  }

  .examples-card {
    margin-bottom: var(--spacing-md);
    border: 1px solid var(--border-color);

    .examples-details {
      summary {
        list-style: none;
        cursor: pointer;

        &::-webkit-details-marker {
          display: none;
        }
      }

      &[open] summary :global(svg) {
        transform: rotate(90deg);
      }
    }

    .examples-summary {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      color: var(--text-primary);
      user-select: none;
      transition: background var(--transition-fast);

      &:hover {
        background: color-mix(in srgb, var(--bg-tertiary), transparent 50%);
      }

      :global(svg) {
        transition: transform var(--transition-fast);
        color: var(--text-secondary);
      }

      h4 {
        margin: 0;
        font-size: var(--font-size-md);
        font-weight: 600;
      }
    }

    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--spacing-sm);
      padding: 0 var(--spacing-md) var(--spacing-md);
    }

    .example-card {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
      text-align: left;

      &.selected {
        background: var(--bg-primary);
        border-color: var(--color-primary);
      }

      h5 {
        margin: 0;
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--color-primary);
      }

      p {
        margin: 0;
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        line-height: 1.4;
      }
    }
  }

  .input-section {
    margin-bottom: var(--spacing-xl);
  }

  .inputs-section {
    .mode-toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);

      h3 {
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      .mode-toggle {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--font-size-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          background: var(--bg-primary);
          border-color: var(--color-primary);
        }
      }
    }
  }

  .input-group {
    label {
      display: block;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-xs);
    }

    .input-row {
      display: flex;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .mac-input {
      flex: 1;
      padding: var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: var(--font-size-md);
      transition: border-color var(--transition-fast);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }

    textarea {
      width: 100%;
      padding: var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      resize: vertical;
      transition: border-color var(--transition-fast);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }

    .lookup-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-lg);
      background: var(--color-primary);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-md);
      color: var(--bg-primary);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;

      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-primary), black 10%);
        border-color: color-mix(in srgb, var(--color-primary), black 10%);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.inline {
        height: 100%;
      }

      &.bulk {
        margin-top: var(--spacing-sm);
        align-self: flex-start;
      }
    }

    .input-help {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      margin-top: var(--spacing-sm);
      line-height: 1.5;

      code {
        background: var(--bg-tertiary);
        padding: 0.125rem 0.375rem;
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: 0.875em;
      }
    }
  }

  .info-card {
    margin-top: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    .card-header {
      margin-bottom: var(--spacing-md);
    }
  }

  .info-accordion {
    border: none;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
    overflow: hidden;
    transition: all var(--transition-fast);

    &:hover {
      background: color-mix(in srgb, var(--bg-secondary), var(--bg-primary) 30%);
    }

    &[open] {
      .accordion-summary {
        border-bottom: 1px solid var(--border-color);

        :global(svg) {
          transform: rotate(90deg);
        }
      }

      .accordion-content {
        animation: accordionOpen 0.2s ease-out;
      }
    }
  }

  .accordion-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);

    &::-webkit-details-marker {
      display: none;
    }

    :global(svg) {
      transition: transform var(--transition-fast);
      color: var(--color-primary);
      flex-shrink: 0;
    }

    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    &:hover {
      :global(svg) {
        color: var(--color-primary-hover);
      }
    }
  }

  .accordion-content {
    padding: var(--spacing-md);
    padding-top: var(--spacing-sm);
    animation: accordionOpen 0.2s ease-out;

    p {
      margin: 0 0 var(--spacing-sm) 0;
      line-height: 1.6;
      color: var(--text-secondary);

      &:last-child {
        margin-bottom: 0;
      }

      code {
        background: var(--bg-tertiary);
        padding: 0.125rem 0.375rem;
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: 0.9em;
      }
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);

      li {
        margin-bottom: var(--spacing-sm);
        line-height: 1.6;
        color: var(--text-secondary);

        &:last-child {
          margin-bottom: 0;
        }

        code {
          background: var(--bg-tertiary);
          padding: 0.125rem 0.375rem;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 0.9em;
        }

        strong {
          color: var(--text-primary);
        }
      }
    }

    .structure-example {
      margin-top: var(--spacing-md);
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--color-primary);

      .structure-breakdown {
        display: block;
        margin-top: var(--spacing-xs);
        font-size: var(--font-size-sm);
        font-family: var(--font-mono);
        line-height: 1.8;
      }
    }
  }

  @keyframes accordionOpen {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .results {
    margin-top: var(--spacing-xl);
  }

  .summary {
    margin-top: var(--spacing-xl);

    h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--spacing-md);

      .stat {
        text-align: center;
        padding: var(--spacing-md);
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        border: 1px solid var(--border-color);

        &.valid {
          border-color: var(--color-success);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-success), transparent 95%),
            color-mix(in srgb, var(--color-success), transparent 98%)
          );
        }

        &.invalid {
          border-color: var(--color-error);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-error), transparent 95%),
            color-mix(in srgb, var(--color-error), transparent 98%)
          );
        }

        &.with-oui {
          border-color: var(--color-info);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-info), transparent 95%),
            color-mix(in srgb, var(--color-info), transparent 98%)
          );
        }

        .stat-value {
          display: block;
          font-size: var(--font-size-2xl);
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .stat-label {
          display: block;
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      }
    }
  }

  .conversions {
    .conversions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);

      h3 {
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--text-primary);
      }

      .export-buttons {
        display: flex;
        gap: var(--spacing-sm);

        button {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all var(--transition-fast);

          &:hover {
            background: var(--bg-primary);
            border-color: var(--color-primary);
          }
        }
      }
    }

    .conversion-item {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
      margin-top: var(--spacing-md);

      &.invalid {
        border-color: var(--color-error);
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--color-error), transparent 98%),
          color-mix(in srgb, var(--color-error), transparent 99%)
        );
      }

      .conversion-header {
        margin-bottom: var(--spacing-md);

        .input-display {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: var(--font-size-md);
          font-weight: 600;

          code {
            background: var(--bg-primary);
            font-family: var(--font-mono);
            color: var(--text-primary);
          }
        }

        .error-message {
          margin-top: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: color-mix(in srgb, var(--color-error), transparent 90%);
          border-left: 3px solid var(--color-error);
          border-radius: var(--radius-sm);
          color: var(--color-error);
          font-size: var(--font-size-sm);
        }
      }

      .conversion-section {
        h4 {
          font-size: var(--font-size-md);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }
      }

      .format-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--spacing-md);

        .format-item {
          &.binary-item {
            grid-column: span 2;

            @media (max-width: 670px) {
              grid-column: span 1;
            }
          }

          .format-label {
            display: block;
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            margin-bottom: var(--spacing-xs);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .format-value {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-sm);
            border-radius: var(--radius-sm);

            &.binary {
              overflow-x: auto;

              .binary-display {
                font-size: var(--font-size-xs);
                white-space: nowrap;
              }
            }

            code {
              flex: 1;
              font-family: var(--font-mono);
              font-size: var(--font-size-sm);
              color: var(--text-primary);
              background: var(--bg-primary);
            }

            .copy-btn {
              padding: var(--spacing-xs);
              background: transparent;
              border: none;
              color: var(--text-secondary);
              cursor: pointer;
              display: flex;
              align-items: center;
              transition: color var(--transition-fast);

              &:hover {
                color: var(--color-primary);
              }
            }
          }
        }
      }

      .oui-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--spacing-sm);

        .oui-item {
          display: flex;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          align-items: center;

          :global(svg) {
            flex-shrink: 0;
            color: var(--text-secondary);
          }

          &.manufacturer-item {
            grid-column: span 2;

            @media (max-width: 768px) {
              grid-column: span 1;
            }
          }

          &.address-item {
            grid-column: span 3;
            align-items: flex-start;

            @media (max-width: 1024px) {
              grid-column: span 2;
            }

            @media (max-width: 768px) {
              grid-column: span 1;
            }
          }

          .oui-content {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
            min-width: 0;
            flex: 1;
          }

          .oui-label {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            font-weight: 500;
          }

          .oui-value {
            font-size: var(--font-size-sm);
            font-weight: 600;
            color: var(--text-primary);

            &.unknown {
              color: var(--text-secondary);
              font-style: italic;
            }

            &.range {
              font-family: var(--font-mono);
              font-size: var(--font-size-xs);
              word-break: break-all;
            }
          }
        }
      }

      .format-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--spacing-sm);

        .format-item {
          display: flex;
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          flex-direction: column;
          justify-content: flex-start;
          align-items: baseline;

          .format-label {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
          }
        }
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--spacing-sm);

        .detail-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          background: var(--bg-secondary);
          &:not(.active) {
            color: var(--color-warning);
          }
          &.active {
            color: var(--color-success);
            font-weight: 600;
          }
        }
      }
    }
  }
</style>
