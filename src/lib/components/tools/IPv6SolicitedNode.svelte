<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';

  let input = $state('2001:db8::1234:5678');
  let result = $state<{
    success: boolean;
    error?: string;
    unicastAddress: string;
    solicitedNodeAddress: string;
    details: {
      normalizedUnicast: string;
      last24Bits: string;
      multicastPrefix: string;
      explanation: string[];
    };
  } | null>(null);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let _userModified = $state(false);

  const examples = [
    {
      label: 'Standard Unicast',
      address: '2001:db8::1234:5678',
      description: 'Regular IPv6 unicast address',
    },
    {
      label: 'Link-Local',
      address: 'fe80::1234:5678:9abc:def0',
      description: 'Link-local unicast address',
    },
    {
      label: 'Compressed Form',
      address: '2001:db8::1',
      description: 'Heavily compressed address',
    },
    {
      label: 'Full Form',
      address: '2001:0db8:0000:0000:0000:0000:1234:5678',
      description: 'Uncompressed IPv6 address',
    },
    {
      label: 'Interface ID Only',
      address: '::1234:5678:9abc:def0',
      description: 'Only interface identifier specified',
    },
  ];

  function loadExample(example: (typeof examples)[0]) {
    input = example.address;
    selectedExample = example.label;
    _userModified = false;
    calculateSolicitedNode();
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

  function calculateSolicitedNodeMulticast(unicastAddress: string): string {
    const expanded = expandIPv6(unicastAddress);
    const groups = expanded.split(':');

    // Get the last 24 bits (last 3 hex digits of the last two groups)
    const secondLastGroup = groups[6]; // e.g., "1234"
    const lastGroup = groups[7]; // e.g., "5678"

    // Take last digit of second-last group and all digits of last group
    const last24Bits = secondLastGroup.slice(-2) + lastGroup; // "45678"

    // Solicited-node multicast prefix is ff02::1:ff00:0/104
    const solicitedNodePrefix = 'ff02:0000:0000:0000:0000:0001:ff';

    // Insert the 24 bits into the last group
    const lastTwoHex = last24Bits.slice(0, 2); // "45"
    const lastFourHex = last24Bits.slice(1); // "5678"

    return `${solicitedNodePrefix}${lastTwoHex}:${lastFourHex}`;
  }

  function calculateSolicitedNode() {
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

      // Check if it's already a multicast address
      const expanded = expandIPv6(trimmed);
      const firstGroup = expanded.split(':')[0];
      if (firstGroup.toLowerCase().startsWith('ff')) {
        throw new Error('Input is already a multicast address. Please provide a unicast IPv6 address.');
      }

      const normalizedUnicast = expandIPv6(trimmed);
      const solicitedNodeAddress = calculateSolicitedNodeMulticast(trimmed);
      const groups = normalizedUnicast.split(':');
      const last24Bits = groups[6].slice(-2) + groups[7];

      const explanation = [
        `1. Take the last 24 bits of the unicast address: ${groups[6]}:${groups[7]} → ${last24Bits}`,
        `2. Prepend the solicited-node multicast prefix: ff02::1:ff`,
        `3. Insert the 24 bits: ff02::1:ff${last24Bits.slice(0, 2)}:${last24Bits.slice(1)}`,
        `4. Result: ${solicitedNodeAddress.toLowerCase()}`,
      ];

      result = {
        success: true,
        unicastAddress: trimmed,
        solicitedNodeAddress: solicitedNodeAddress.toLowerCase(),
        details: {
          normalizedUnicast,
          last24Bits,
          multicastPrefix: 'ff02::1:ff',
          explanation,
        },
      };
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        unicastAddress: input,
        solicitedNodeAddress: '',
        details: {
          normalizedUnicast: '',
          last24Bits: '',
          multicastPrefix: '',
          explanation: [],
        },
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExample = null;
    calculateSolicitedNode();
  }

  // Calculate on component load
  calculateSolicitedNode();
</script>

<div class="card">
  <header class="card-header">
    <h1>IPv6 Solicited-Node Multicast</h1>
    <p>Compute solicited-node multicast addresses from IPv6 unicast for Neighbor Discovery Protocol</p>
  </header>

  <!-- Educational Overview -->
  <section class="overview-section">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="info" size="sm" />
        <div>
          <strong>Purpose:</strong> Solicited-node multicast addresses enable efficient IPv6 Neighbor Discovery by targeting
          specific network nodes instead of all nodes.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="target" size="sm" />
        <div>
          <strong>Format:</strong> <code>ff02::1:ffXX:XXXX</code> where XX:XXXX are the last 24 bits of the unicast address.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="network" size="sm" />
        <div>
          <strong>Usage:</strong> Used in NDP Neighbor Solicitation messages for address resolution and duplicate address
          detection.
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
        for="ipv6-input"
        use:tooltip={'Enter a valid IPv6 unicast address (not multicast) to calculate its solicited-node multicast address'}
      >
        <Icon name="globe" size="sm" />
        IPv6 Unicast Address
      </label>
      <input
        id="ipv6-input"
        type="text"
        bind:value={input}
        oninput={handleInputChange}
        placeholder="2001:db8::1234:5678"
        class="ipv6-input {result?.success === true ? 'valid' : result?.success === false ? 'invalid' : ''}"
        spellcheck="false"
      />
      <div class="input-hint">Enter any valid IPv6 unicast address in any format (compressed or full)</div>
    </div>
  </section>

  <!-- Results -->
  {#if result && input.trim()}
    <section class="results-section">
      {#if result.success}
        <div class="results-header">
          <h3>
            <Icon name="check-circle" size="sm" />
            Solicited-Node Calculation
          </h3>
        </div>

        <!-- Main Result -->
        <div class="result-main">
          <div class="result-item">
            <div class="result-label">
              <Icon name="globe" size="sm" />
              Unicast Address
            </div>
            <div class="result-content">
              <code class="result-value unicast">{result.details.normalizedUnicast}</code>
              <button
                class="copy-button {clipboard.isCopied('unicast') ? 'copied' : ''}"
                onclick={() => result && clipboard.copy(result.details.normalizedUnicast, 'unicast')}
              >
                <Icon name={clipboard.isCopied('unicast') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          <div class="arrow-down">
            <Icon name="arrow-down" size="lg" />
          </div>

          <div class="result-item highlight">
            <div class="result-label">
              <Icon name="users" size="sm" />
              Solicited-Node Multicast
            </div>
            <div class="result-content">
              <code class="result-value multicast">{result.solicitedNodeAddress}</code>
              <button
                class="copy-button {clipboard.isCopied('multicast') ? 'copied' : ''}"
                onclick={() => result && clipboard.copy(result.solicitedNodeAddress, 'multicast')}
              >
                <Icon name={clipboard.isCopied('multicast') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>
        </div>

        <!-- Calculation Steps -->
        <div class="calculation-steps">
          <h4>
            <Icon name="list-ordered" size="sm" />
            Calculation Steps
          </h4>
          <div class="steps-list">
            {#each result.details.explanation as step, index (`explanation-${index}`)}
              <div class="step-item">
                <div class="step-number">{index + 1}</div>
                <div class="step-content">{step}</div>
              </div>
            {/each}
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
              <span class="detail-label">Last 24 bits:</span>
              <code class="detail-value">{result.details.last24Bits}</code>
            </div>
            <div class="detail-item">
              <span class="detail-label">Multicast prefix:</span>
              <code class="detail-value">{result.details.multicastPrefix}</code>
            </div>
            <div class="detail-item">
              <span class="detail-label">Address scope:</span>
              <span class="detail-value">Link-local multicast (ff02)</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Multicast flag:</span>
              <span class="detail-value">Well-known (0)</span>
            </div>
          </div>
        </div>
      {:else}
        <div class="error-result">
          <Icon name="alert-triangle" size="lg" />
          <h4>Invalid IPv6 Address</h4>
          <p>{result.error}</p>
          <div class="error-help">
            <strong>Valid formats include:</strong>
            <ul>
              <li>Full form: 2001:0db8:0000:0000:0000:0000:1234:5678</li>
              <li>Compressed: 2001:db8::1234:5678</li>
              <li>Link-local: fe80::1234:5678:9abc:def0</li>
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
          <Icon name="info" size="sm" />
          What is NDP?
        </h4>
        <p>
          Neighbor Discovery Protocol (NDP) is IPv6's equivalent to IPv4's ARP. It's used for address resolution, router
          discovery, and duplicate address detection on local network segments.
        </p>
      </div>

      <div class="education-card">
        <h4>
          <Icon name="zap" size="sm" />
          Why Solicited-Node?
        </h4>
        <p>
          Instead of broadcasting to all nodes (like ARP), IPv6 uses solicited-node multicast to efficiently target only
          nodes that might have the specific address, reducing network traffic.
        </p>
      </div>

      <div class="education-card">
        <h4>
          <Icon name="shield" size="sm" />
          Address Collision
        </h4>
        <p>
          Multiple unicast addresses can map to the same solicited-node multicast address. This is acceptable since
          nodes will ignore solicitations for addresses they don't own.
        </p>
      </div>

      <div class="education-card">
        <h4>
          <Icon name="layers" size="sm" />
          Multicast Membership
        </h4>
        <p>
          Every IPv6 node automatically joins the solicited-node multicast group for each of its unicast addresses,
          enabling it to receive neighbor solicitations.
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
      color: var(--color-primary-light);
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
      color: var(--color-primary);
    }

    h3 {
      margin: 0;
      color: var(--color-primary);
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
      border-color: var(--color-primary);
      transform: translateY(-1px);
    }

    &.active {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
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
    color: var(--color-primary-light);
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

  .ipv6-input {
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
      border-color: var(--color-primary);
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
      color: var(--color-success-light);
      margin: 0;
    }
  }

  .result-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
  }

  .result-item {
    width: 100%;
    max-width: 600px;
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);

    &.highlight {
      border-color: var(--color-success);
      background-color: var(--color-success);
      color: var(--bg-primary);
    }
  }

  .result-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-md);

    .result-item.highlight & {
      color: var(--bg-primary);
    }
  }

  .result-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .result-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    word-break: break-all;
    flex: 1;

    &.unicast {
      color: var(--color-primary-light);
    }

    &.multicast {
      background-color: rgba(255, 255, 255, 0.1);
      color: var(--bg-primary);
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
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
    }

    &.copied {
      color: var(--color-success);
    }

    .result-item.highlight & {
      color: var(--bg-primary);

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  .arrow-down {
    color: var(--color-primary);
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }

  .calculation-steps {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--color-primary);
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
    background-color: var(--color-primary);
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

  .technical-details {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-xl);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--color-primary);
      margin-bottom: var(--spacing-md);
    }
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
      color: var(--color-primary);
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

    .details-grid {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }

    .result-content {
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
