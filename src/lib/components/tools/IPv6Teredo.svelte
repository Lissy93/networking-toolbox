<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';

  let input = $state('2001:0000:4136:e378:8000:63bf:3fff:fdd2');
  let result = $state<{
    success: boolean;
    error?: string;
    originalAddress: string;
    components: {
      prefix: string;
      serverIPv4: string;
      flags: string;
      clientPort: number;
      clientIPv4: string;
      cone: boolean;
      clientPortObfuscated: string;
      clientIPv4Obfuscated: string;
    };
    details: {
      fullAddress: string;
      addressGroups: string[];
      explanation: string[];
    };
  } | null>(null);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let _userModified = $state(false);

  const examples = [
    {
      label: 'Microsoft Teredo',
      address: '2001:0000:4136:e378:8000:63bf:3fff:fdd2',
      description: 'Microsoft Teredo server example',
    },
    {
      label: 'Compressed Form',
      address: '2001::4136:e378:8000:63bf:3fff:fdd2',
      description: 'Same address in compressed format',
    },
    {
      label: 'Behind NAT (Cone)',
      address: '2001:0000:5ef5:79fb:0000:5efe:c0a8:0101',
      description: 'Client behind cone NAT',
    },
    {
      label: 'Direct Connection',
      address: '2001:0000:4136:e378:ffff:ffff:ffff:ffff',
      description: 'Direct connection without NAT',
    },
  ];

  function loadExample(example: (typeof examples)[0]) {
    input = example.address;
    selectedExample = example.label;
    _userModified = false;
    parseTeredo();
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

  function isValidIPv6(address: string): boolean {
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

  function isTeredo(address: string): boolean {
    const expanded = expandIPv6(address);
    const groups = expanded.split(':');

    // Teredo prefix is 2001:0000::/32
    return groups[0].toLowerCase() === '2001' && groups[1] === '0000';
  }

  function hexToIPv4(hex: string): string {
    // Convert 4-character hex groups to IPv4
    const group1 = hex.substring(0, 4);
    const group2 = hex.substring(4, 8);

    const byte1 = parseInt(group1.substring(0, 2), 16);
    const byte2 = parseInt(group1.substring(2, 4), 16);
    const byte3 = parseInt(group2.substring(0, 2), 16);
    const byte4 = parseInt(group2.substring(2, 4), 16);

    return `${byte1}.${byte2}.${byte3}.${byte4}`;
  }

  function parseFlags(flagsHex: string): { cone: boolean; flagsString: string } {
    const flags = parseInt(flagsHex, 16);
    const cone = (flags & 0x8000) === 0x8000; // Check if bit 15 is set

    const flagBits = [];
    if (cone) flagBits.push('Cone NAT');
    if (flags & 0x4000) flagBits.push('Reserved bit 14');
    if (flags & 0x2000) flagBits.push('Reserved bit 13');
    if (flags & 0x1000) flagBits.push('Reserved bit 12');

    const flagsString = flagBits.length > 0 ? flagBits.join(', ') : 'No flags set';

    return { cone, flagsString };
  }

  function parsePort(portHex: string): number {
    const obfuscatedPort = parseInt(portHex, 16);
    // XOR with 0xFFFF to get the actual port
    return obfuscatedPort ^ 0xffff;
  }

  function parseClientIPv4(ipHex: string): string {
    // Client IPv4 is XOR'd with 0xFFFFFFFF
    const obfuscated = parseInt(ipHex, 16);
    const actual = (obfuscated ^ 0xffffffff) >>> 0; // Unsigned 32-bit

    return [(actual >>> 24) & 0xff, (actual >>> 16) & 0xff, (actual >>> 8) & 0xff, actual & 0xff].join('.');
  }

  function parseTeredo() {
    if (!input.trim()) {
      result = null;
      return;
    }

    try {
      const trimmed = input.trim();

      // Basic format validation
      if (!trimmed.includes(':')) {
        throw new Error('IPv6 addresses must contain colons (:)');
      }

      // Validate IPv6 format
      if (!isValidIPv6(trimmed)) {
        throw new Error('Invalid IPv6 address format');
      }

      // Check if it's a Teredo address
      if (!isTeredo(trimmed)) {
        throw new Error('This is not a Teredo address. Teredo addresses must start with 2001:0000::/32 (2001::)');
      }

      const fullAddress = expandIPv6(trimmed);
      const groups = fullAddress.split(':');

      // Parse Teredo components according to RFC 4380
      // Format: 2001:0000:SSSS:SSSS:FFFF:PPPP:CCCC:CCCC
      // Where:
      // - 2001:0000 = Teredo prefix
      // - SSSS:SSSS = Teredo server IPv4 address
      // - FFFF = Flags
      // - PPPP = Obfuscated client port
      // - CCCC:CCCC = Obfuscated client IPv4 address

      const prefix = `${groups[0]}:${groups[1]}`;
      const serverHex = groups[2] + groups[3];
      const serverIPv4 = hexToIPv4(serverHex);

      const flagsHex = groups[4];
      const { cone, flagsString } = parseFlags(flagsHex);

      const portHex = groups[5];
      const clientPort = parsePort(portHex);

      const clientHex = groups[6] + groups[7];
      const clientIPv4 = parseClientIPv4(clientHex);

      const explanation = [
        `1. Teredo prefix: ${prefix} (identifies this as a Teredo tunnel)`,
        `2. Server IPv4: ${groups[2]}:${groups[3]} → ${serverIPv4}`,
        `3. Flags: ${flagsHex} → ${flagsString}`,
        `4. Client port: ${portHex} XOR FFFF → ${clientPort}`,
        `5. Client IPv4: ${groups[6]}:${groups[7]} XOR FFFFFFFF → ${clientIPv4}`,
      ];

      result = {
        success: true,
        originalAddress: trimmed,
        components: {
          prefix,
          serverIPv4,
          flags: flagsString,
          clientPort,
          clientIPv4,
          cone,
          clientPortObfuscated: portHex,
          clientIPv4Obfuscated: groups[6] + ':' + groups[7],
        },
        details: {
          fullAddress,
          addressGroups: groups,
          explanation,
        },
      };
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        originalAddress: input,
        components: {
          prefix: '',
          serverIPv4: '',
          flags: '',
          clientPort: 0,
          clientIPv4: '',
          cone: false,
          clientPortObfuscated: '',
          clientIPv4Obfuscated: '',
        },
        details: {
          fullAddress: '',
          addressGroups: [],
          explanation: [],
        },
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExample = null;
    parseTeredo();
  }

  // Parse on component load
  parseTeredo();
</script>

<div class="card">
  <header class="card-header">
    <h1>IPv6 Teredo Parser</h1>
    <p>Parse Teredo IPv6 addresses to extract server IPv4, flags, mapped port, and client IPv4</p>
  </header>

  <!-- Educational Overview -->
  <section class="overview-section">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="tunnel" size="sm" />
        <div>
          <strong>Teredo Tunneling:</strong> Allows IPv6 connectivity for hosts behind IPv4 NATs by encapsulating IPv6 packets
          in IPv4 UDP.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="globe" size="sm" />
        <div>
          <strong>Address Format:</strong> <code>2001:0000:SSSS:SSSS:FFFF:PPPP:CCCC:CCCC</code> where components are encoded
          and obfuscated.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="shield" size="sm" />
        <div>
          <strong>Obfuscation:</strong> Client IP and port are XOR'ed to prevent some NATs from interfering with the tunnel.
        </div>
      </div>
    </div>
  </section>

  <!-- Examples -->
  <section class="examples-section">
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
            <div class="example-label">{example.label}</div>
            <code class="example-address">{example.address}</code>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </section>

  <!-- Input Section -->
  <section class="input-section">
    <div class="input-group">
      <label
        for="teredo-input"
        use:tooltip={'Enter a Teredo IPv6 address starting with 2001:0000:: (or 2001::) to parse its components'}
      >
        <Icon name="tunnel" size="sm" />
        Teredo IPv6 Address
      </label>
      <input
        id="teredo-input"
        type="text"
        bind:value={input}
        oninput={handleInputChange}
        placeholder="2001:0000:4136:e378:8000:63bf:3fff:fdd2"
        class="teredo-input {result?.success === true ? 'valid' : result?.success === false ? 'invalid' : ''}"
        spellcheck="false"
      />
      <div class="input-hint">Enter any Teredo IPv6 address in compressed or full format</div>
    </div>
  </section>

  <!-- Results -->
  {#if result && input.trim()}
    <section class="results-section">
      {#if result.success}
        <div class="results-header">
          <h3>
            <Icon name="check-circle" size="sm" />
            Teredo Components
          </h3>
        </div>

        <!-- Address Breakdown -->
        <div class="address-breakdown">
          <div class="breakdown-header">
            <h4>Address Structure</h4>
            <code class="full-address">{result.details.fullAddress}</code>
          </div>

          <div class="breakdown-grid">
            <div class="breakdown-section prefix">
              <div class="section-label">Prefix</div>
              <code class="section-value">{result.components.prefix}</code>
              <div class="section-description">Teredo identifier</div>
            </div>

            <div class="breakdown-section server">
              <div class="section-label">Server</div>
              <code class="section-value">{result.details.addressGroups[2]}:{result.details.addressGroups[3]}</code>
              <div class="section-description">IPv4: {result.components.serverIPv4}</div>
            </div>

            <div class="breakdown-section flags">
              <div class="section-label">Flags</div>
              <code class="section-value">{result.details.addressGroups[4]}</code>
              <div class="section-description">{result.components.flags}</div>
            </div>

            <div class="breakdown-section port">
              <div class="section-label">Port</div>
              <code class="section-value">{result.details.addressGroups[5]}</code>
              <div class="section-description">Actual: {result.components.clientPort}</div>
            </div>

            <div class="breakdown-section client">
              <div class="section-label">Client</div>
              <code class="section-value">{result.details.addressGroups[6]}:{result.details.addressGroups[7]}</code>
              <div class="section-description">IPv4: {result.components.clientIPv4}</div>
            </div>
          </div>
        </div>

        <!-- Parsed Components -->
        <div class="components-section">
          <h4>
            <Icon name="layers" size="sm" />
            Extracted Components
          </h4>

          <div class="components-grid">
            <div class="component-card server">
              <div class="component-header">
                <Icon name="server" size="sm" />
                <span class="component-title">Teredo Server</span>
              </div>
              <div class="component-content">
                <code class="component-value">{result.components.serverIPv4}</code>
                <button
                  class="copy-button {clipboard.isCopied('server') ? 'copied' : ''}"
                  onclick={() => result && clipboard.copy(result.components.serverIPv4, 'server')}
                >
                  <Icon name={clipboard.isCopied('server') ? 'check' : 'copy'} size="sm" />
                </button>
              </div>
              <div class="component-description">The Teredo relay server handling this tunnel</div>
            </div>

            <div class="component-card client">
              <div class="component-header">
                <Icon name="user" size="sm" />
                <span class="component-title">Client IPv4</span>
              </div>
              <div class="component-content">
                <code class="component-value">{result.components.clientIPv4}</code>
                <button
                  class="copy-button {clipboard.isCopied('client') ? 'copied' : ''}"
                  onclick={() => result && clipboard.copy(result.components.clientIPv4, 'client')}
                >
                  <Icon name={clipboard.isCopied('client') ? 'check' : 'copy'} size="sm" />
                </button>
              </div>
              <div class="component-description">The client's external IPv4 address (XOR decoded)</div>
            </div>

            <div class="component-card port">
              <div class="component-header">
                <Icon name="hash" size="sm" />
                <span class="component-title">Client Port</span>
              </div>
              <div class="component-content">
                <code class="component-value">{result.components.clientPort}</code>
                <button
                  class="copy-button {clipboard.isCopied('port') ? 'copied' : ''}"
                  onclick={() => result && clipboard.copy(result.components.clientPort.toString(), 'port')}
                >
                  <Icon name={clipboard.isCopied('port') ? 'check' : 'copy'} size="sm" />
                </button>
              </div>
              <div class="component-description">The client's external port (XOR decoded with FFFF)</div>
            </div>

            <div class="component-card flags">
              <div class="component-header">
                <Icon name="flag" size="sm" />
                <span class="component-title">NAT Type</span>
              </div>
              <div class="component-content">
                <span class="component-value {result.components.cone ? 'cone' : 'restricted'}"
                  >{result.components.cone ? 'Cone NAT' : 'Restricted NAT'}</span
                >
              </div>
              <div class="component-description">Indicates the type of NAT the client is behind</div>
            </div>
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
              <span class="detail-label">Obfuscated Port:</span>
              <code class="detail-value">{result.components.clientPortObfuscated}</code>
            </div>
            <div class="detail-item">
              <span class="detail-label">Obfuscated Client:</span>
              <code class="detail-value">{result.components.clientIPv4Obfuscated}</code>
            </div>
            <div class="detail-item">
              <span class="detail-label">Port Calculation:</span>
              <span class="detail-value"
                >{result.components.clientPortObfuscated} XOR FFFF = {result.components.clientPort}</span
              >
            </div>
            <div class="detail-item">
              <span class="detail-label">Tunnel Protocol:</span>
              <span class="detail-value">IPv6-in-IPv4 via UDP port 3544</span>
            </div>
          </div>
        </div>

        <!-- Calculation Steps -->
        <div class="card calculation-steps">
          <h4>
            <Icon name="list-ordered" size="sm" />
            Parsing Steps
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
          <h4>Invalid Teredo Address</h4>
          <p>{result.error}</p>
          <div class="error-help">
            <strong>Valid Teredo addresses:</strong>
            <ul>
              <li>Must start with 2001:0000:: (or 2001:: compressed)</li>
              <li>Example: 2001:0000:4136:e378:8000:63bf:3fff:fdd2</li>
              <li>Example: 2001::4136:e378:8000:63bf:3fff:fdd2</li>
            </ul>
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Educational Content -->
  <section class="education-section">
    <div class="education-grid">
      <div class="education-card">
        <h4>
          <Icon name="book-open" size="sm" />
          What is Teredo?
        </h4>
        <p>
          Teredo is an IPv6 transition technology that allows IPv6 connectivity for hosts located behind IPv4 NATs. It
          tunnels IPv6 packets inside IPv4 UDP datagrams, enabling communication with the IPv6 Internet.
        </p>
      </div>

      <div class="education-card">
        <h4>
          <Icon name="lock" size="sm" />
          Why Obfuscation?
        </h4>
        <p>
          The client IP and port are XOR'ed with known values to prevent some NAT devices from automatically translating
          these embedded addresses, which would break the Teredo mechanism.
        </p>
      </div>

      <div class="education-card">
        <h4>
          <Icon name="network" size="sm" />
          NAT Detection
        </h4>
        <p>
          The flags field indicates whether the client is behind a cone NAT (more permissive) or restricted NAT (more
          restrictive), which affects how the tunnel operates and performs.
        </p>
      </div>

      <div class="education-card">
        <h4>
          <Icon name="clock" size="sm" />
          Legacy Technology
        </h4>
        <p>
          Teredo was important during IPv6 transition but is less common today. Modern systems prefer native IPv6 or
          other transition mechanisms like 6to4 or NAT64.
        </p>
      </div>
    </div>
  </section>
</div>

<style lang="scss">
  .overview-section {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-primary);
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

  .examples-section {
    margin-bottom: var(--spacing-xl);
  }

  .examples-details {
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);

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
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

  .example-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
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

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .input-section {
    margin-bottom: var(--spacing-xl);
  }

  .input-group {
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

  .teredo-input {
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

  .results-section {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
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

  .address-breakdown {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
  }

  .breakdown-header {
    margin-bottom: var(--spacing-lg);
    text-align: center;

    h4 {
      margin-bottom: var(--spacing-md);
    }

    .full-address {
      font-family: var(--font-mono);
      font-size: var(--font-size-lg);
      color: var(--text-primary);
      background-color: var(--bg-tertiary);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      word-break: break-all;
      display: inline-block;
    }
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
  }

  .breakdown-section {
    text-align: center;
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);

    &.prefix {
      background-color: rgba(99, 102, 241, 0.1);
    }
    &.server {
      background-color: rgba(34, 197, 94, 0.1);
    }
    &.flags {
      background-color: rgba(251, 146, 60, 0.1);
    }
    &.port {
      background-color: rgba(168, 85, 247, 0.1);
    }
    &.client {
      background-color: rgba(239, 68, 68, 0.1);
    }
  }

  .section-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    display: block;
    margin-bottom: var(--spacing-xs);
  }

  .section-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .components-section {
    margin-bottom: var(--spacing-xl);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-lg);
    }
  }

  .components-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .component-card {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
  }

  .component-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .component-title {
    font-weight: 600;
    color: var(--text-primary);
  }

  .component-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
  }

  .component-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    flex: 1;

    &.cone {
      color: var(--color-success-light);
    }

    &.restricted {
      color: var(--color-warning-light);
    }
  }

  .copy-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
    }

    &.copied {
      color: var(--color-success);
    }
  }

  .component-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
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

  .calculation-steps {
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

  .education-section {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .education-card {
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
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .breakdown-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .components-grid {
      grid-template-columns: 1fr;
    }

    .details-grid {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }

    .component-content {
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .step-item {
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .detail-item {
      flex-direction: column;
      gap: var(--spacing-xs);
      align-items: stretch;
    }
  }
</style>
