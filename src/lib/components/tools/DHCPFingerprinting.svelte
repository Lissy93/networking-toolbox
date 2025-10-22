<script lang="ts">
  import {
    parseParameterList,
    searchFingerprints,
    searchByDevice,
    analyzeOptions,
    formatParameterListToHex,
    formatParameterListDisplay,
    exportAsJSON,
    exportAsCSV,
    DHCP_OPTION_NAMES,
    FINGERPRINT_DATABASE,
    type FingerprintMatch,
    type OptionAnalysis,
  } from '$lib/utils/dhcp-fingerprinting';
  import { untrack } from 'svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables/useClipboard.svelte';

  const clipboard = useClipboard(1800);

  type Tab = 'lookup' | 'reverse';
  let activeTab = $state<Tab>('lookup');
  let parameterInput = $state<string>('');
  let vendorClass = $state<string>('');
  let matches = $state<FingerprintMatch[]>([]);
  let parsedParams = $state<number[]>([]);
  let error = $state<string>('');
  let analysis = $state<OptionAnalysis | null>(null);
  let reverseQuery = $state<string>('');
  let reverseResults = $state<typeof FINGERPRINT_DATABASE>([]);

  const examples = [
    {
      label: 'Windows 10/11',
      description: 'Modern Windows desktop',
      params: '1,3,6,15,31,33,43,44,46,47,119,121,249,252',
      vendor: '',
    },
    {
      label: 'macOS/iOS',
      description: 'Apple device',
      params: '1,3,6,15,119,252',
      vendor: '',
    },
    {
      label: 'Android',
      description: 'Android smartphone',
      params: '1,3,6,15,26,28,51,58,59,43',
      vendor: 'dhcpcd',
    },
    {
      label: 'Linux (dhclient)',
      description: 'Linux with ISC dhclient',
      params: '1,3,6,15,26,28,42',
      vendor: '',
    },
    {
      label: 'Cisco IP Phone',
      description: 'Cisco VoIP device',
      params: '1,3,6,12,15,28,42,66,67,120,150',
      vendor: 'Cisco',
    },
    {
      label: 'Raspberry Pi',
      description: 'Raspberry Pi OS (Debian)',
      params: '1,3,6,12,15,28,40,41,42',
      vendor: '',
    },
    {
      label: 'Samsung Smart TV',
      description: 'Smart TV device',
      params: '1,3,6,12,15,28,40,41,42,119',
      vendor: 'SAMSUNG',
    },
  ];

  const navOptions = [
    { value: 'lookup', label: 'Fingerprint Lookup', icon: 'fingerprint' },
    { value: 'reverse', label: 'Device Search', icon: 'monitor' },
  ];

  function loadExample(ex: (typeof examples)[0]) {
    activeTab = 'lookup';
    parameterInput = ex.params;
    vendorClass = ex.vendor;
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

  function handleExportJSON() {
    if (!analysis || matches.length === 0) return;
    const json = exportAsJSON(parsedParams, matches, analysis, vendorClass || undefined);
    downloadFile(json, 'dhcp-fingerprint.json', 'application/json');
  }

  function handleExportCSV() {
    if (matches.length === 0) return;
    const csv = exportAsCSV(matches);
    downloadFile(csv, 'dhcp-fingerprint.csv', 'text/csv');
  }

  // Search effect for fingerprint lookup
  $effect(() => {
    if (activeTab !== 'lookup') return;
    const currentInput = parameterInput;
    const currentVendor = vendorClass;

    untrack(() => {
      if (!currentInput.trim()) {
        matches = [];
        parsedParams = [];
        error = '';
        analysis = null;
        return;
      }

      try {
        parsedParams = parseParameterList(currentInput);

        if (parsedParams.some(isNaN)) {
          error = 'Invalid parameter list format';
          matches = [];
          analysis = null;
          return;
        }

        matches = searchFingerprints(parsedParams, currentVendor || undefined);
        analysis = analyzeOptions(parsedParams, matches);
        error = '';
      } catch (err) {
        error = err instanceof Error ? err.message : 'Error parsing input';
        matches = [];
        parsedParams = [];
        analysis = null;
      }
    });
  });

  // Search effect for reverse lookup
  $effect(() => {
    if (activeTab !== 'reverse') return;
    const currentQuery = reverseQuery;

    untrack(() => {
      if (!currentQuery.trim()) {
        reverseResults = [];
        return;
      }

      reverseResults = searchByDevice(currentQuery);
    });
  });

  const categoryColors: Record<string, string> = {
    desktop: 'var(--color-primary)',
    mobile: 'var(--color-info)',
    iot: 'var(--color-warning)',
    server: 'var(--color-success)',
    network: 'var(--color-purple)',
    gaming: 'var(--color-primary)',
    other: 'var(--text-tertiary)',
  };

  const confidenceBadges: Record<string, string> = {
    high: '🟢',
    medium: '🟡',
    low: '🔴',
  };
</script>

<ToolContentContainer
  title="DHCP Fingerprinting Database"
  description="Identify devices based on their DHCP fingerprints using Parameter Request List (Option 55) and Vendor Class Identifier (Option 60). Database contains {FINGERPRINT_DATABASE.length} known fingerprints from common devices, operating systems, and IoT equipment."
  {navOptions}
  bind:selectedNav={activeTab}
>
  {#if activeTab === 'lookup'}
    <ExamplesCard
      {examples}
      onSelect={loadExample}
      getLabel={(ex) => ex.label}
      getDescription={(ex) => ex.description}
    />

    <div class="card input-card">
      <h3>Device Fingerprint Lookup</h3>

      <div class="form-group">
        <label for="param-list">Parameter Request List (Option 55)</label>
        <input
          id="param-list"
          type="text"
          bind:value={parameterInput}
          placeholder="e.g., 1,3,6,15 or 0103060f or 1 3 6 15"
          class="input"
        />
        <span class="hint">Enter as comma-separated, hex, or space-separated numbers</span>
      </div>

      <div class="form-group">
        <label for="vendor-class">Vendor Class Identifier (Option 60) - Optional</label>
        <input
          id="vendor-class"
          type="text"
          bind:value={vendorClass}
          placeholder="e.g., MSFT, dhcpcd, Cisco"
          class="input"
        />
        <span class="hint">Helps improve match accuracy</span>
      </div>

      {#if error}
        <div class="error-card">
          <strong>Error:</strong>
          <p>{error}</p>
        </div>
      {/if}
    </div>

    {#if parsedParams.length > 0}
      <div class="card result-card">
        <h3>Requested DHCP Options</h3>

        <div class="result-item">
          <span class="label">Parameter List:</span>
          <code class="code-value">{formatParameterListDisplay(parsedParams)}</code>
          <button
            class="btn-copy"
            class:copied={clipboard.isCopied('param-list')}
            onclick={() => clipboard.copy(formatParameterListDisplay(parsedParams), 'param-list')}
            aria-label="Copy"
          >
            {clipboard.isCopied('param-list') ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div class="result-item">
          <span class="label">Hex Encoded:</span>
          <code class="code-value">{formatParameterListToHex(parsedParams)}</code>
          <button
            class="btn-copy"
            class:copied={clipboard.isCopied('param-hex')}
            onclick={() => clipboard.copy(formatParameterListToHex(parsedParams), 'param-hex')}
            aria-label="Copy hex"
          >
            {clipboard.isCopied('param-hex') ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div class="options-grid">
          {#each parsedParams as param, i (i)}
            <div class="option-badge">
              <span class="option-num">{param}</span>
              <span class="option-name">{DHCP_OPTION_NAMES[param] || 'Unknown'}</span>
            </div>
          {/each}
        </div>

        {#if analysis && analysis.warnings.length > 0}
          <div class="card warning-card">
            <h3>Security Warnings</h3>
            {#each analysis.warnings as warning, i (i)}
              <div class="warning-item">⚠️ {warning}</div>
            {/each}
          </div>
        {/if}

        {#if analysis && (analysis.unusual.length > 0 || (analysis.missing.length > 0 && matches.length > 0))}
          <div class="card analysis-card">
            <h3>Option Analysis</h3>

            {#if analysis.unusual.length > 0}
              <div class="info-section">
                <h4>Unusual Options Detected</h4>
                <p>These options may indicate vendor-specific configurations:</p>
                <code class="code-value"
                  >{analysis.unusual.map((o) => `${o} (${DHCP_OPTION_NAMES[o] || 'Unknown'})`).join(', ')}</code
                >
              </div>
            {/if}

            {#if analysis.missing.length > 0 && matches.length > 0}
              <div class="info-section">
                <h4>Missing Options (vs. Best Match)</h4>
                <p>Options present in the best match but not in your fingerprint:</p>
                <code class="code-value"
                  >{analysis.missing.map((o) => `${o} (${DHCP_OPTION_NAMES[o] || 'Unknown'})`).join(', ')}</code
                >
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    {#if matches.length > 0}
      <div class="card matches-card">
        <div class="matches-header">
          <h3>Matching Devices ({matches.length})</h3>
          <div class="export-buttons">
            <button class="btn btn-secondary btn-sm" onclick={handleExportJSON}>Export JSON</button>
            <button class="btn btn-secondary btn-sm" onclick={handleExportCSV}>Export CSV</button>
          </div>
        </div>

        <div class="matches-list">
          {#each matches as match, i (i)}
            <div class="match-item">
              <div class="match-header">
                <div class="match-title">
                  <span
                    class="category-badge"
                    style="background: {categoryColors[match.fingerprint.category] || categoryColors.other}"
                  >
                    {match.fingerprint.category}
                  </span>
                  <h4>{match.fingerprint.device}</h4>
                  <span class="confidence">
                    {confidenceBadges[match.fingerprint.confidence] || ''}
                    {match.fingerprint.confidence} confidence
                  </span>
                </div>
                <div class="match-score">
                  <span class="score-value">{match.matchScore.toFixed(0)}%</span>
                  <span class="score-label">Match</span>
                </div>
              </div>

              <div class="match-details">
                <div class="detail-row">
                  <span class="detail-label">OS:</span>
                  <span>{match.fingerprint.os}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Matched On:</span>
                  <span>{match.matchedOn.join(', ')}</span>
                </div>
                {#if match.fingerprint.description}
                  <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <span>{match.fingerprint.description}</span>
                  </div>
                {/if}
                <div class="detail-row">
                  <span class="detail-label">Known Parameters:</span>
                  <code class="code-small">{formatParameterListDisplay(match.fingerprint.parameterRequestList)}</code>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else if parsedParams.length > 0 && !error}
      <div class="card no-match-card">
        <h3>No Matches Found</h3>
        <p>The provided fingerprint doesn't match any known devices in the database. This could be:</p>
        <ul>
          <li>A custom DHCP client configuration</li>
          <li>An uncommon device or operating system</li>
          <li>A device with a modified DHCP request list</li>
        </ul>
        <p class="hint">Try adding the Vendor Class Identifier if available.</p>
      </div>
    {/if}
  {:else}
    <div class="card input-card">
      <h3>Search by Device or OS</h3>

      <div class="form-group">
        <label for="reverse-query">Search for Device/OS/Vendor</label>
        <input
          id="reverse-query"
          type="text"
          bind:value={reverseQuery}
          placeholder="e.g., iPhone, Windows, Cisco, Printer..."
          class="input"
        />
        <span class="hint">Search the database by device name, OS, or vendor</span>
      </div>
    </div>

    {#if reverseResults.length > 0}
      <div class="card result-card">
        <h3>Found {reverseResults.length} Device{reverseResults.length > 1 ? 's' : ''}</h3>

        {#each reverseResults as device, i (i)}
          <div class="reverse-item">
            <div class="reverse-header">
              <span
                class="category-badge"
                style="background: {categoryColors[device.category] || categoryColors.other}"
              >
                {device.category}
              </span>
              <h4>{device.device}</h4>
              <span class="confidence">
                {confidenceBadges[device.confidence] || ''}
                {device.confidence} confidence
              </span>
            </div>

            <div class="reverse-details">
              <div class="detail-row">
                <span class="detail-label">OS:</span>
                <span>{device.os}</span>
              </div>
              {#if device.description}
                <div class="detail-row">
                  <span class="detail-label">Description:</span>
                  <span>{device.description}</span>
                </div>
              {/if}
              <div class="detail-row">
                <span class="detail-label">Parameter Request List:</span>
                <code class="code-small">{formatParameterListDisplay(device.parameterRequestList)}</code>
                <button
                  class="btn-copy"
                  class:copied={clipboard.isCopied(`reverse-${i}`)}
                  onclick={() =>
                    clipboard.copy(formatParameterListDisplay(device.parameterRequestList), `reverse-${i}`)}
                  aria-label="Copy parameter list"
                >
                  {clipboard.isCopied(`reverse-${i}`) ? 'Copied' : 'Copy'}
                </button>
              </div>
              {#if device.vendorClassPattern}
                <div class="detail-row">
                  <span class="detail-label">Vendor Class Pattern:</span>
                  <code class="code-small">{device.vendorClassPattern}</code>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else if reverseQuery.trim()}
      <div class="card no-match-card">
        <h3>No Devices Found</h3>
        <p>No devices matched "{reverseQuery}". Try a different search term.</p>
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
    margin-bottom: var(--spacing-md);

    &.input-card {
      background: var(--bg-tertiary);
    }

    h3 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
      font-size: var(--font-size-lg);
    }
  }

  .form-group {
    margin-bottom: var(--spacing-md);

    label {
      display: block;
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
      font-weight: 500;
    }

    .hint {
      display: block;
      margin-top: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
    }
  }

  .input {
    width: 100%;
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .error-card {
    background: color-mix(in srgb, var(--color-error), transparent 90%);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-top: var(--spacing-md);

    strong {
      color: var(--color-error);
      display: block;
      margin-bottom: var(--spacing-xs);
    }

    p {
      margin: 0;
      color: var(--text-primary);
    }
  }

  .result-card {
    background: var(--bg-tertiary);
  }

  .result-item {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);

    .label {
      font-weight: 500;
      color: var(--text-secondary);
      min-width: 120px;
    }

    .code-value {
      flex: 1;
      font-family: var(--font-mono);
      color: var(--text-primary);
      word-break: break-all;
      background: var(--bg-primary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
    }
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--spacing-xs);
    margin: var(--spacing-md) 0;
  }

  .option-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);

    .option-num {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: var(--spacing-xs);
      background: var(--color-primary);
      color: var(--bg-primary);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    .option-name {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  .matches-card {
    background: var(--bg-tertiary);
  }

  .match-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .match-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border-primary);
  }

  .match-title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 1;

    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }

    .confidence {
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
    }
  }

  .category-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    color: var(--bg-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
  }

  .match-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-success), transparent 90%);
    border-radius: var(--radius-md);
    min-width: 60px;

    .score-value {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--color-success);
    }

    .score-label {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }
  }

  .detail-row {
    display: flex;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);

    .detail-label {
      font-weight: 500;
      color: var(--text-secondary);
      min-width: 140px;
    }

    .code-small {
      font-family: var(--font-mono);
      color: var(--text-primary);
      word-break: break-all;
    }
  }

  .no-match-card {
    background: color-mix(in srgb, var(--color-warning), transparent 95%);
    border-color: var(--color-warning);

    h3 {
      color: var(--color-warning);
    }

    ul {
      margin: var(--spacing-sm) 0;
      padding-left: var(--spacing-lg);
      color: var(--text-primary);
    }

    p {
      margin: var(--spacing-sm) 0;
      color: var(--text-primary);

      &.hint {
        margin-top: var(--spacing-sm);
        font-size: var(--font-size-sm);
        color: var(--text-tertiary);
      }
    }
  }

  .btn-copy {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition:
      background 0.2s,
      border-color 0.2s,
      color 0.2s;

    &:hover {
      background: var(--bg-secondary);
    }

    &.copied {
      background: var(--color-success);
      border-color: var(--color-success);
      color: var(--bg-primary);
    }
  }

  .warning-card {
    background: color-mix(in srgb, var(--color-warning), transparent 95%);
    border-color: var(--color-warning);

    h3 {
      color: var(--color-warning);
    }
  }

  .warning-item {
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-warning), transparent 90%);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
    font-size: var(--font-size-sm);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .analysis-card {
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border-color: var(--color-info);

    h3 {
      color: var(--color-info);
    }

    h4 {
      margin: var(--spacing-sm) 0 var(--spacing-xs) 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }

    p {
      margin: var(--spacing-xs) 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .code-value {
      display: block;
      margin-top: var(--spacing-xs);
    }
  }

  .info-section {
    margin-bottom: var(--spacing-md);
  }

  .matches-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .export-buttons {
    display: flex;
    gap: var(--spacing-xs);
  }

  .btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }

    &.btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-primary);
    }

    &.btn-sm {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
    }
  }

  .reverse-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .reverse-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border-primary);

    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .reverse-details {
    .detail-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      align-items: center;
      margin-bottom: var(--spacing-xs);
    }
  }
</style>
