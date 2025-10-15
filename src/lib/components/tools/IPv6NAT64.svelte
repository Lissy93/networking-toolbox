<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';

  let inputAddress = $state('192.168.1.100');
  let customPrefix = $state('64:ff9b::/96');
  let conversionMode = $state<'ipv4-to-ipv6' | 'ipv6-to-ipv4'>('ipv4-to-ipv6');
  let result = $state<{
    success: boolean;
    error?: string;
    originalAddress: string;
    translatedAddress: string;
    prefix: string;
    details: {
      inputType: 'ipv4' | 'ipv6';
      prefixUsed: string;
      prefixLength: number;
      ipv4Hex: string;
      explanation: string[];
    };
  } | null>(null);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let _userModified = $state(false);

  const examples = [
    {
      label: 'Standard IPv4',
      address: '192.168.1.100',
      prefix: '64:ff9b::/96',
      mode: 'ipv4-to-ipv6' as const,
      description: 'Private IPv4 address with default NAT64 prefix',
    },
    {
      label: 'Public IPv4',
      address: '8.8.8.8',
      prefix: '64:ff9b::/96',
      mode: 'ipv4-to-ipv6' as const,
      description: 'Google DNS server with standard prefix',
    },
    {
      label: 'Custom Prefix',
      address: '10.0.0.1',
      prefix: '2001:db8:64::/96',
      mode: 'ipv4-to-ipv6' as const,
      description: 'Documentation prefix for NAT64',
    },
    {
      label: 'IPv6 to IPv4',
      address: '64:ff9b::c0a8:164',
      prefix: '64:ff9b::/96',
      mode: 'ipv6-to-ipv4' as const,
      description: 'Extract IPv4 from NAT64 address',
    },
  ];

  function loadExample(example: (typeof examples)[0]) {
    inputAddress = example.address;
    customPrefix = example.prefix;
    conversionMode = example.mode;
    selectedExample = example.label;
    _userModified = false;
    translateAddress();
  }

  function expandIPv6(address: string): string {
    // Remove zone ID if present
    const cleanAddress = address.split('%')[0];

    // Handle :: compression
    let expanded = cleanAddress;
    if (cleanAddress.includes('::')) {
      const parts = cleanAddress.split('::');
      const leftParts = parts[0] ? parts[0].split(':') : [];
      const rightParts = parts[1] ? parts[1].split(':') : [];

      const totalParts = leftParts.length + rightParts.length;
      const missingParts = 8 - totalParts;

      const middleParts = Array(missingParts).fill('0000');
      const allParts = [...leftParts, ...middleParts, ...rightParts];
      expanded = allParts.join(':');
    }

    // Pad each group to 4 characters
    return expanded
      .split(':')
      .map((group) => group.padStart(4, '0'))
      .join(':');
  }

  function compressIPv6(address: string): string {
    // First expand to normalize
    const expanded = expandIPv6(address);

    // Remove leading zeros from each group
    let groups = expanded.split(':').map((group) => group.replace(/^0+/, '') || '0');

    // Find the longest sequence of consecutive '0' groups
    let maxZeroStart = -1;
    let maxZeroLength = 0;
    let currentZeroStart = -1;
    let currentZeroLength = 0;

    for (let i = 0; i < groups.length; i++) {
      if (groups[i] === '0') {
        if (currentZeroStart === -1) {
          currentZeroStart = i;
          currentZeroLength = 1;
        } else {
          currentZeroLength++;
        }
      } else {
        if (currentZeroLength > maxZeroLength) {
          maxZeroStart = currentZeroStart;
          maxZeroLength = currentZeroLength;
        }
        currentZeroStart = -1;
        currentZeroLength = 0;
      }
    }

    // Check the last sequence
    if (currentZeroLength > maxZeroLength) {
      maxZeroStart = currentZeroStart;
      maxZeroLength = currentZeroLength;
    }

    // Replace the longest zero sequence with ::
    if (maxZeroLength > 1) {
      const beforeZeros = groups.slice(0, maxZeroStart);
      const afterZeros = groups.slice(maxZeroStart + maxZeroLength);

      if (beforeZeros.length === 0) {
        return '::' + afterZeros.join(':');
      } else if (afterZeros.length === 0) {
        return beforeZeros.join(':') + '::';
      } else {
        return beforeZeros.join(':') + '::' + afterZeros.join(':');
      }
    }

    return groups.join(':');
  }

  function isValidIPv4(address: string): boolean {
    const parts = address.split('.');
    if (parts.length !== 4) return false;

    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
  }

  function _isValidIPv6(address: string): boolean {
    try {
      const expanded = expandIPv6(address);
      const groups = expanded.split(':');

      if (groups.length !== 8) return false;

      for (const group of groups) {
        if (group.length !== 4) return false;
        if (!/^[0-9a-fA-F]{4}$/.test(group)) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  function parsePrefix(prefix: string): { network: string; length: number } {
    const [network, lengthStr] = prefix.split('/');
    const length = parseInt(lengthStr, 10);

    if (!_isValidIPv6(network) || isNaN(length) || length < 0 || length > 128) {
      throw new Error('Invalid IPv6 prefix format');
    }

    return { network, length };
  }

  function ipv4ToNAT64(
    ipv4: string,
    prefix: string,
  ): {
    ipv6: string;
    prefixUsed: string;
    prefixLength: number;
    ipv4Hex: string;
    explanation: string[];
  } {
    if (!isValidIPv4(ipv4)) {
      throw new Error('Invalid IPv4 address format');
    }

    const { network, length } = parsePrefix(prefix);

    // NAT64 requires /96 prefix length for standard operation
    if (length !== 96) {
      throw new Error('NAT64 prefix must be /96 for proper IPv4 embedding');
    }

    // Convert IPv4 to hex representation
    const parts = ipv4.split('.').map((part) => parseInt(part, 10));
    const ipv4Hex = parts.map((part) => part.toString(16).padStart(2, '0')).join('');

    // Get the first 96 bits (6 groups) from the prefix
    const expandedPrefix = expandIPv6(network);
    const prefixGroups = expandedPrefix.split(':').slice(0, 6);

    // Embed IPv4 in last 32 bits (2 groups)
    const ipv4Group1 = ipv4Hex.substring(0, 4);
    const ipv4Group2 = ipv4Hex.substring(4, 8);

    const nat64Groups = [...prefixGroups, ipv4Group1, ipv4Group2];
    const nat64Address = nat64Groups.join(':');
    const compressedAddress = compressIPv6(nat64Address);

    const explanation = [
      `1. IPv4 address: ${ipv4}`,
      `2. Convert to hex: ${parts.map((p, _i) => `${p} → ${p.toString(16).padStart(2, '0')}`).join(', ')}`,
      `3. IPv4 as hex: ${ipv4Hex} (${ipv4Group1}:${ipv4Group2})`,
      `4. NAT64 prefix: ${prefix} → first 96 bits`,
      `5. Combine: ${network.split(':').slice(0, 6).join(':')}:${ipv4Group1}:${ipv4Group2}`,
      `6. Compressed: ${compressedAddress}`,
    ];

    return {
      ipv6: compressedAddress,
      prefixUsed: prefix,
      prefixLength: length,
      ipv4Hex,
      explanation,
    };
  }

  function nat64ToIPv4(
    ipv6: string,
    expectedPrefix: string,
  ): {
    ipv4: string;
    prefixUsed: string;
    prefixLength: number;
    ipv4Hex: string;
    explanation: string[];
  } {
    if (!_isValidIPv6(ipv6)) {
      throw new Error('Invalid IPv6 address format');
    }

    const { network, length } = parsePrefix(expectedPrefix);

    if (length !== 96) {
      throw new Error('NAT64 prefix must be /96 for proper IPv4 extraction');
    }

    const expandedIPv6 = expandIPv6(ipv6);
    const expandedPrefix = expandIPv6(network);

    const ipv6Groups = expandedIPv6.split(':');
    const prefixGroups = expandedPrefix.split(':').slice(0, 6);

    // Check if the IPv6 address matches the expected prefix
    for (let i = 0; i < 6; i++) {
      if (ipv6Groups[i] !== prefixGroups[i]) {
        throw new Error(`IPv6 address does not match the expected NAT64 prefix ${expectedPrefix}`);
      }
    }

    // Extract IPv4 from the last 32 bits
    const ipv4Group1 = ipv6Groups[6];
    const ipv4Group2 = ipv6Groups[7];
    const ipv4Hex = ipv4Group1 + ipv4Group2;

    // Convert hex back to IPv4
    const byte1 = parseInt(ipv4Hex.substring(0, 2), 16);
    const byte2 = parseInt(ipv4Hex.substring(2, 4), 16);
    const byte3 = parseInt(ipv4Hex.substring(4, 6), 16);
    const byte4 = parseInt(ipv4Hex.substring(6, 8), 16);

    const ipv4 = `${byte1}.${byte2}.${byte3}.${byte4}`;

    const explanation = [
      `1. IPv6 address: ${ipv6}`,
      `2. Expanded: ${expandedIPv6}`,
      `3. Expected prefix: ${expectedPrefix}`,
      `4. Verify prefix match: ✓ First 96 bits match`,
      `5. Extract IPv4 hex: ${ipv4Group1}:${ipv4Group2} → ${ipv4Hex}`,
      `6. Convert to IPv4: ${ipv4Hex} → ${byte1}.${byte2}.${byte3}.${byte4}`,
    ];

    return {
      ipv4,
      prefixUsed: expectedPrefix,
      prefixLength: length,
      ipv4Hex,
      explanation,
    };
  }

  function autoDetectInputType(input: string): 'ipv4' | 'ipv6' | 'unknown' {
    if (input.includes(':')) {
      return _isValidIPv6(input) ? 'ipv6' : 'unknown';
    } else if (input.includes('.')) {
      return isValidIPv4(input) ? 'ipv4' : 'unknown';
    }
    return 'unknown';
  }

  function translateAddress() {
    if (!inputAddress.trim()) {
      result = null;
      return;
    }

    try {
      const trimmedInput = inputAddress.trim();
      const trimmedPrefix = customPrefix.trim();

      // Auto-detect input type if not manually set
      const detectedType = autoDetectInputType(trimmedInput);

      if (detectedType === 'unknown') {
        throw new Error('Invalid IP address format. Please enter a valid IPv4 or IPv6 address.');
      }

      let translationResult;
      let inputType: 'ipv4' | 'ipv6';

      if (conversionMode === 'ipv4-to-ipv6') {
        if (detectedType !== 'ipv4') {
          throw new Error('IPv4 to IPv6 mode requires an IPv4 address as input.');
        }
        translationResult = ipv4ToNAT64(trimmedInput, trimmedPrefix);
        inputType = 'ipv4';

        result = {
          success: true,
          originalAddress: trimmedInput,
          translatedAddress: translationResult.ipv6,
          prefix: trimmedPrefix,
          details: {
            inputType,
            prefixUsed: translationResult.prefixUsed,
            prefixLength: translationResult.prefixLength,
            ipv4Hex: translationResult.ipv4Hex,
            explanation: translationResult.explanation,
          },
        };
      } else {
        if (detectedType !== 'ipv6') {
          throw new Error('IPv6 to IPv4 mode requires an IPv6 address as input.');
        }
        translationResult = nat64ToIPv4(trimmedInput, trimmedPrefix);
        inputType = 'ipv6';

        result = {
          success: true,
          originalAddress: trimmedInput,
          translatedAddress: translationResult.ipv4,
          prefix: trimmedPrefix,
          details: {
            inputType,
            prefixUsed: translationResult.prefixUsed,
            prefixLength: translationResult.prefixLength,
            ipv4Hex: translationResult.ipv4Hex,
            explanation: translationResult.explanation,
          },
        };
      }
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        originalAddress: inputAddress,
        translatedAddress: '',
        prefix: customPrefix,
        details: {
          inputType: autoDetectInputType(inputAddress) as 'ipv4' | 'ipv6',
          prefixUsed: '',
          prefixLength: 0,
          ipv4Hex: '',
          explanation: [],
        },
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExample = null;
    translateAddress();
  }

  function handleModeChange() {
    _userModified = true;
    selectedExample = null;
    translateAddress();
  }

  // Translate on component load
  translateAddress();
</script>

<div class="card">
  <header class="card-header">
    <h1>IPv6 NAT64 Translator</h1>
    <p>Translate between IPv4 and IPv6 addresses using NAT64 prefix mechanism</p>
  </header>

  <!-- Educational Overview Card -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="shuffle" size="sm" />
        <div>
          <strong>NAT64 Translation:</strong> Stateless mechanism to embed IPv4 addresses within IPv6 using a /96 prefix.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="globe" size="sm" />
        <div>
          <strong>Well-Known Prefix:</strong> <code>64:ff9b::/96</code> is the standard prefix defined in RFC 6052 for NAT64
          translation.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="network" size="sm" />
        <div>
          <strong>Bidirectional:</strong> Convert IPv4→IPv6 for dual-stack communication or extract IPv4 from NAT64 addresses.
        </div>
      </div>
    </div>
  </div>

  <!-- Examples Card -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Quick Examples</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example (example.label)}
          <button
            class="example-card {selectedExample === example.label ? 'active' : ''}"
            onclick={() => loadExample(example)}
          >
            <div class="example-header">
              <div class="example-label">{example.label}</div>
              <div class="example-mode {example.mode}">
                {example.mode === 'ipv4-to-ipv6' ? '→ IPv6' : '→ IPv4'}
              </div>
            </div>
            <code class="example-address">{example.address}</code>
            <code class="example-prefix">{example.prefix}</code>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Card -->
  <div class="card input-card">
    <!-- Conversion Mode -->
    <div class="mode-section">
      <h3 class="mode-label">Conversion Direction</h3>
      <div class="mode-options">
        <label class="mode-option">
          <input type="radio" bind:group={conversionMode} value="ipv4-to-ipv6" onchange={handleModeChange} />
          <div class="mode-content">
            <Icon name="arrow-right" size="sm" />
            <span>IPv4 → IPv6</span>
          </div>
        </label>
        <label class="mode-option">
          <input type="radio" bind:group={conversionMode} value="ipv6-to-ipv4" onchange={handleModeChange} />
          <div class="mode-content">
            <Icon name="arrow-left" size="sm" />
            <span>IPv6 → IPv4</span>
          </div>
        </label>
      </div>
    </div>

    <!-- IP Address Input -->
    <div class="input-group">
      <label
        for="address-input"
        use:tooltip={conversionMode === 'ipv4-to-ipv6'
          ? 'Enter an IPv4 address to convert to NAT64 IPv6 format'
          : 'Enter a NAT64 IPv6 address to extract the embedded IPv4'}
      >
        <Icon name={conversionMode === 'ipv4-to-ipv6' ? 'globe' : 'globe'} size="sm" />
        {conversionMode === 'ipv4-to-ipv6' ? 'IPv4 Address' : 'NAT64 IPv6 Address'}
      </label>
      <input
        id="address-input"
        type="text"
        bind:value={inputAddress}
        oninput={handleInputChange}
        placeholder={conversionMode === 'ipv4-to-ipv6' ? '192.168.1.100' : '64:ff9b::c0a8:164'}
        class="address-input {result?.success === true ? 'valid' : result?.success === false ? 'invalid' : ''}"
        spellcheck="false"
      />
    </div>

    <!-- NAT64 Prefix Input -->
    <div class="input-group">
      <label
        for="prefix-input"
        use:tooltip={'NAT64 prefix must be /96. Default is 64:ff9b::/96 (RFC 6052 well-known prefix)'}
      >
        <Icon name="hash" size="sm" />
        NAT64 Prefix
      </label>
      <input
        id="prefix-input"
        type="text"
        bind:value={customPrefix}
        oninput={handleInputChange}
        placeholder="64:ff9b::/96"
        class="prefix-input"
        spellcheck="false"
      />
      <div class="input-hint">Must be a /96 prefix for proper IPv4 embedding</div>
    </div>
  </div>

  <!-- Results Card -->
  {#if result && inputAddress.trim()}
    <div class="card results-card">
      {#if result.success}
        <div class="results-header">
          <h3>
            <Icon name="check-circle" size="sm" />
            Translation Result
          </h3>
        </div>

        <!-- Translation Summary -->
        <div class="translation-summary">
          <div class="translation-flow">
            <div class="translation-step input">
              <div class="step-label">Input ({result.details.inputType.toUpperCase()})</div>
              <code class="step-value">{result.originalAddress}</code>
            </div>

            <div class="translation-arrow">
              <Icon name="arrow-right" size="lg" />
            </div>

            <div class="translation-step output">
              <div class="step-label">Output ({result.details.inputType === 'ipv4' ? 'IPv6' : 'IPv4'})</div>
              <div class="step-content">
                <code class="step-value">{result.translatedAddress}</code>
                <button
                  class="copy-button {clipboard.isCopied('result') ? 'copied' : ''}"
                  onclick={() => result && clipboard.copy(result.translatedAddress, 'result')}
                >
                  <Icon name={clipboard.isCopied('result') ? 'check' : 'copy'} size="sm" />
                </button>
              </div>
            </div>
          </div>

          <div class="prefix-info">
            <span class="prefix-label">Using prefix:</span>
            <code class="prefix-value">{result.details.prefixUsed}</code>
          </div>
        </div>

        <!-- Technical Details -->
        <div class="technical-details">
          <h4>
            <Icon name="settings" size="sm" />
            Technical Details
          </h4>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">IPv4 Hex Representation:</span>
              <code class="detail-value">{result.details.ipv4Hex}</code>
            </div>
            <div class="detail-item">
              <span class="detail-label">Prefix Length:</span>
              <span class="detail-value">/{result.details.prefixLength}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Translation Method:</span>
              <span class="detail-value">NAT64 (RFC 6052)</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Address Family:</span>
              <span class="detail-value">{result.details.inputType === 'ipv4' ? 'IPv4 → IPv6' : 'IPv6 → IPv4'}</span>
            </div>
          </div>
        </div>

        <!-- Step-by-step Explanation -->
        <div class="explanation-steps">
          <h4>
            <Icon name="list-ordered" size="sm" />
            Translation Steps
          </h4>
          <div class="steps-list">
            {#each result.details.explanation as step, index (`step-${index}`)}
              <div class="step-item">
                <div class="step-number">{index + 1}</div>
                <div class="step-content">{step}</div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="error-result">
          <Icon name="alert-triangle" size="lg" />
          <h4>Translation Error</h4>
          <p>{result.error}</p>
          <div class="error-help">
            <strong>Requirements:</strong>
            <ul>
              <li>For IPv4→IPv6: Valid IPv4 address (e.g., 192.168.1.1)</li>
              <li>For IPv6→IPv4: Valid NAT64 IPv6 address matching the prefix</li>
              <li>NAT64 prefix must be /96 (e.g., 64:ff9b::/96)</li>
              <li>IPv6 address must contain the embedded IPv4 in last 32 bits</li>
            </ul>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Educational Content Card -->
  <div class="card education-card">
    <div class="education-grid">
      <div class="education-item">
        <h4>
          <Icon name="book-open" size="sm" />
          What is NAT64?
        </h4>
        <p>
          NAT64 is a stateless IP/ICMP translation mechanism that allows IPv6-only clients to communicate with IPv4-only
          servers. It embeds IPv4 addresses within IPv6 addresses using a /96 prefix.
        </p>
      </div>

      <div class="education-item">
        <h4>
          <Icon name="shield" size="sm" />
          Well-Known Prefix
        </h4>
        <p>
          RFC 6052 defines <code>64:ff9b::/96</code> as the well-known prefix for NAT64 translation. This prefix is reserved
          for this purpose and should not be routed on the global Internet.
        </p>
      </div>

      <div class="education-item">
        <h4>
          <Icon name="layers" size="sm" />
          Address Structure
        </h4>
        <p>
          NAT64 addresses use 96 bits for the prefix and embed the 32-bit IPv4 address in the remaining bits: <code
            >Prefix::/96 + IPv4(32 bits)</code
          >
        </p>
      </div>

      <div class="education-item">
        <h4>
          <Icon name="network" size="sm" />
          Use Cases
        </h4>
        <p>
          Common in IPv6 transition scenarios, dual-stack networks, and environments where IPv6-only clients need to
          access legacy IPv4 services through translation gateways.
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .info-card {
    margin-bottom: var(--spacing-xl);
  }

  .overview-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .overview-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-secondary);

    code {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
    }

    strong {
      color: var(--text-primary);
    }
  }

  .examples-card {
    margin-bottom: var(--spacing-xl);
  }

  .examples-details {
    border: none;
    background: none;

    &[open] {
      .examples-summary :global(.icon) {
        transform: rotate(90deg);
      }
    }
  }

  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);
    border-radius: var(--radius-md);

    &:hover {
      background-color: var(--surface-hover);
    }

    &::-webkit-details-marker {
      display: none;
    }

    :global(.icon) {
      transition: transform var(--transition-fast);
    }

    h3 {
      margin: 0;
      font-size: var(--font-size-md);
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .example-card {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
      transform: translateY(-1px);
    }

    &.active {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
      box-shadow: var(--shadow-md);
    }
  }

  .example-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .example-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-mode {
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-weight: 600;

    &.ipv4-to-ipv6 {
      background-color: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    &.ipv6-to-ipv4 {
      background-color: rgba(59, 130, 246, 0.1);
      color: var(--color-primary);
    }
  }

  .example-address {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    word-break: break-all;
  }

  .example-prefix {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .input-card {
    margin-bottom: var(--spacing-xl);
  }

  .mode-section {
    margin-bottom: var(--spacing-lg);
  }

  .mode-label {
    display: block;
    margin-bottom: var(--spacing-sm);
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-md);
  }

  .mode-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .mode-option {
    position: relative;
    cursor: pointer;

    input[type='radio'] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .mode-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background-color: var(--bg-secondary);
      border: 2px solid var(--border-primary);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      font-weight: 600;
      color: var(--text-primary);
    }

    &:hover .mode-content {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
    }

    input[type='radio']:checked + .mode-content {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }
  }

  .input-group {
    margin-bottom: var(--spacing-lg);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .address-input,
  .prefix-input {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-lg);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--border-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }

    &.valid {
      border-color: var(--color-success);
    }

    &.invalid {
      border-color: var(--color-error);
    }
  }

  .input-hint {
    margin-top: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-style: italic;
  }

  .results-card {
    margin-bottom: var(--spacing-xl);
  }

  .results-header {
    margin-bottom: var(--spacing-lg);

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0;
    }
  }

  .translation-summary {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
  }

  .translation-flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
  }

  .translation-step {
    flex: 1;
    text-align: center;
  }

  .step-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .step-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    display: block;
    word-break: break-all;
  }

  .step-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .translation-arrow {
    color: var(--text-primary);
    flex-shrink: 0;
  }

  .copy-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    flex-shrink: 0;

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
    }

    &.copied {
      color: var(--color-success);
    }
  }

  .prefix-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-secondary);
  }

  .prefix-label {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .prefix-value {
    font-family: var(--font-mono);
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
  }

  .technical-details {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
    }
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
  }

  .detail-label {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: var(--font-size-sm);
  }

  .detail-value {
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .explanation-steps {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-xl);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-lg);
    }
  }

  .steps-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .step-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: var(--text-primary);
    color: var(--bg-primary);
    border-radius: 50%;
    font-weight: 600;
    font-size: var(--font-size-sm);
    flex-shrink: 0;
  }

  .step-content {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.5;
    padding-top: var(--spacing-xs);
  }

  .error-result {
    text-align: center;
    padding: var(--spacing-xl);
    background-color: var(--bg-secondary);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-lg);
    color: var(--color-error-light);

    :global(.icon) {
      color: var(--color-error);
      margin-bottom: var(--spacing-md);
    }

    h4 {
      margin-bottom: var(--spacing-md);
    }

    p {
      margin-bottom: var(--spacing-lg);
    }
  }

  .error-help {
    text-align: left;
    background-color: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    color: var(--text-secondary);

    ul {
      margin-top: var(--spacing-sm);
      padding-left: var(--spacing-lg);

      li {
        margin-bottom: var(--spacing-xs);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
      }
    }
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .education-item {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }

    code {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
    }
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .mode-options {
      grid-template-columns: 1fr;
    }

    .translation-flow {
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .translation-arrow {
      transform: rotate(90deg);
    }

    .step-content {
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .details-grid {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }

    .detail-item {
      flex-direction: column;
      gap: var(--spacing-xs);
      align-items: stretch;
    }

    .step-item {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }
</style>
