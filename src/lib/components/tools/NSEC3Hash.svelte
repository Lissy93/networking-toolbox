<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { calculateNSEC3Hash, NSEC3_HASH_ALGORITHMS } from '$lib/utils/dnssec';
  import { useClipboard } from '$lib/composables';

  let domainName = $state('www.example.com.');
  let salt = $state('');
  let iterations = $state(10);
  let algorithm = $state(1);
  let activeExampleIndex = $state<number | null>(null);
  let isActiveExample = $state(true);
  const clipboard = useClipboard();

  const examples = [
    {
      title: 'Standard Configuration',
      name: 'www.example.com.',
      salt: 'AABBCCDD',
      iterations: 10,
      algorithm: 1,
      description: 'Typical NSEC3 setup with moderate iterations',
    },
    {
      title: 'High Iteration Count',
      name: 'secure.example.org.',
      salt: '1234567890ABCDEF',
      iterations: 100,
      algorithm: 1,
      description: 'High security configuration with more iterations',
    },
    {
      title: 'No Salt (Empty)',
      name: 'blog.example.net.',
      salt: '',
      iterations: 5,
      algorithm: 1,
      description: 'Minimal configuration without salt',
    },
    {
      title: 'Subdomain Example',
      name: 'mail.internal.example.com.',
      salt: 'DEADBEEF',
      iterations: 50,
      algorithm: 1,
      description: 'Complex domain name with standard settings',
    },
  ];

  let calculating = $state(false);
  let result = $state<{ hash: string; originalName: string } | null>(null);
  let error = $state<string | null>(null);

  async function calculateHash() {
    error = null;
    result = null;
    calculating = true;

    try {
      if (!domainName.trim()) {
        error = 'Domain name is required';
        return;
      }

      if (iterations < 0 || iterations > 2500) {
        error = 'Iterations must be between 0 and 2500';
        return;
      }

      if (salt && !/^[0-9A-Fa-f]*$/.test(salt)) {
        error = 'Salt must be hexadecimal (0-9, A-F) or empty';
        return;
      }

      const normalizedName = domainName.trim().toLowerCase();
      const normalizedSalt = salt.toUpperCase();

      const hash = await calculateNSEC3Hash(normalizedName, normalizedSalt, iterations, algorithm);

      if (!hash) {
        error = 'Failed to calculate NSEC3 hash';
        return;
      }

      result = {
        hash,
        originalName: normalizedName,
      };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to calculate hash';
    } finally {
      calculating = false;
    }
  }

  const isValid = $derived(() => {
    return domainName.trim() && iterations >= 0 && iterations <= 2500 && (salt === '' || /^[0-9A-Fa-f]*$/.test(salt));
  });

  // Auto-calculate on mount with default values
  $effect(() => {
    if (domainName === 'www.example.com.' && salt === '' && iterations === 10 && algorithm === 1) {
      calculateHash();
    }
  });

  function loadExample(index: number) {
    const example = examples[index];
    domainName = example.name;
    salt = example.salt;
    iterations = example.iterations;
    algorithm = example.algorithm;
    activeExampleIndex = index;
    isActiveExample = false;

    // Auto-calculate after loading example
    if (isValid()) {
      calculateHash();
    }
  }

  function handleInputChange() {
    if (isActiveExample && domainName !== 'www.example.com.') {
      isActiveExample = false;
    }
    activeExampleIndex = null;
    error = null;
    result = null;

    // Auto-calculate if inputs are valid
    if (isValid()) {
      calculateHash();
    }
  }

  function copyHash() {
    if (result?.hash) {
      clipboard.copy(result.hash, 'hash');
    }
  }

  function copyNSEC3Record() {
    if (result?.hash && result?.originalName) {
      const record = `${result.hash}.example.com. IN NSEC3 1 0 ${iterations} ${salt || '-'} ${result.hash} A RRSIG`;
      clipboard.copy(record, 'record');
    }
  }

  function generateRandomSalt() {
    const chars = '0123456789ABCDEF';
    let randomSalt = '';
    for (let i = 0; i < 16; i++) {
      randomSalt += chars[Math.floor(Math.random() * chars.length)];
    }
    salt = randomSalt;
    handleInputChange();
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>NSEC3 Hash Calculator</h1>
    <p>
      Calculate NSEC3 owner hashes for a name given salt, iterations, and algorithm, showing the hashed owner FQDN for
      DNSSEC authenticated denial of existence.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>NSEC3 Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (example.title)}
          <button
            class="example-card {activeExampleIndex === index ? 'active' : ''}"
            onclick={() => loadExample(index)}
          >
            <div class="example-title">{example.title}</div>
            <div class="example-params">
              <div class="param-row">
                <span class="param-label">Name:</span>
                <span class="param-value">{example.name}</span>
              </div>
              <div class="param-row">
                <span class="param-label">Salt:</span>
                <span class="param-value">{example.salt || '(empty)'}</span>
              </div>
              <div class="param-row">
                <span class="param-label">Iterations:</span>
                <span class="param-value">{example.iterations}</span>
              </div>
            </div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="form-group">
      <label
        for="domain-name"
        use:tooltip={"Enter the fully qualified domain name to generate NSEC3 hash for. Must end with a dot (e.g., 'www.example.com.')"}
      >
        <Icon name="globe" size="sm" />
        Domain Name (FQDN)
      </label>
      <input
        id="domain-name"
        type="text"
        bind:value={domainName}
        oninput={handleInputChange}
        placeholder="www.example.com."
        class="domain-input {isActiveExample ? 'example-active' : ''}"
      />
      {#if isActiveExample}
        <p class="field-help">Using example data - modify to see your results</p>
      {/if}
    </div>

    <div class="form-group">
      <label
        for="salt-input"
        use:tooltip={"Optional salt value in hexadecimal format (e.g., 'AABBCCDD'). Salt adds randomness to prevent dictionary attacks. Leave empty for no salt."}
      >
        <Icon name="key" size="sm" />
        Salt (Hexadecimal)
        <button class="generate-salt-btn" onclick={generateRandomSalt} type="button">
          <Icon name="refresh" size="xs" />
          Generate
        </button>
      </label>
      <input
        id="salt-input"
        type="text"
        bind:value={salt}
        oninput={handleInputChange}
        placeholder="AABBCCDD (or leave empty for no salt)"
        class="salt-input"
      />
    </div>

    <div class="input-row">
      <div class="form-group">
        <label
          for="iterations"
          use:tooltip={'Number of additional hashing iterations to perform. Higher values increase security but also increase CPU cost. Typical values: 0-10 for most zones.'}
        >
          <Icon name="repeat" size="sm" />
          Iterations (0-2500)
        </label>
        <input
          id="iterations"
          type="number"
          bind:value={iterations}
          oninput={handleInputChange}
          min="0"
          max="2500"
          class="number-input"
        />
      </div>

      <div class="form-group">
        <label
          for="algorithm"
          use:tooltip={'Cryptographic hash algorithm used for NSEC3. Algorithm 1 (SHA-1) is the most commonly supported option.'}
        >
          <Icon name="hash" size="sm" />
          Hash Algorithm
        </label>
        <select id="algorithm" bind:value={algorithm} onchange={handleInputChange}>
          {#each Object.entries(NSEC3_HASH_ALGORITHMS) as [value, name] (value)}
            <option value={Number(value)}>{value} - {name}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="action-section">
      <button
        class="calculate-btn"
        class:loading={calculating}
        disabled={!isValid || calculating}
        onclick={calculateHash}
      >
        {#if calculating}
          <div class="loading">
            <div class="spinner"></div>
            <span>Calculating Hash...</span>
          </div>
        {:else}
          <Icon name="hash" size="sm" />
          <span>Calculate NSEC3 Hash</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="card error-card">
      <div class="error-content">
        <Icon name="alert-triangle" size="sm" />
        <div>
          <strong>Calculation Error:</strong>
          {error}
        </div>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if result}
    <div class="card results-card">
      <div class="results-header">
        <h3>NSEC3 Hash Result</h3>
        <div class="header-actions">
          <button class="copy-button {clipboard.isCopied('hash') ? 'copied' : ''}" onclick={copyHash}>
            <Icon name={clipboard.isCopied('hash') ? 'check' : 'copy'} size="sm" />
            Copy Hash
          </button>
          <button class="copy-button {clipboard.isCopied('record') ? 'copied' : ''}" onclick={copyNSEC3Record}>
            <Icon name={clipboard.isCopied('record') ? 'check' : 'copy'} size="sm" />
            Copy Record
          </button>
        </div>
      </div>

      <!-- Hash Display -->
      <div class="hash-display">
        <div
          class="hash-label"
          use:tooltip={'The calculated NSEC3 hash value that becomes the owner name for the NSEC3 record in the zone'}
        >
          NSEC3 Hash
        </div>
        <div class="hash-value">{result.hash}</div>
      </div>

      <!-- Calculation Details -->
      <div class="details-section">
        <h4>Calculation Parameters</h4>
        <div class="details-grid">
          <div class="detail-item">
            <span
              class="detail-label"
              use:tooltip={'The original domain name that was hashed to produce the NSEC3 hash'}>Original Name</span
            >
            <span class="detail-value mono">{result.originalName}</span>
          </div>
          <div class="detail-item">
            <span
              class="detail-label"
              use:tooltip={'The hexadecimal salt value used in the hash calculation. Helps prevent dictionary attacks against zone contents.'}
              >Salt</span
            >
            <span class="detail-value mono">{salt || '(none)'}</span>
          </div>
          <div class="detail-item">
            <span
              class="detail-label"
              use:tooltip={'Number of additional hash iterations performed. Higher values make brute-force attacks more difficult but increase computational cost.'}
              >Iterations</span
            >
            <span class="detail-value mono">{iterations}</span>
          </div>
          <div class="detail-item">
            <span
              class="detail-label"
              use:tooltip={'The cryptographic hash algorithm used. Algorithm 1 (SHA-1) is the standard and most widely supported.'}
              >Algorithm</span
            >
            <span class="detail-value mono"
              >{algorithm} ({NSEC3_HASH_ALGORITHMS[algorithm as keyof typeof NSEC3_HASH_ALGORITHMS]})</span
            >
          </div>
        </div>
      </div>

      <!-- Sample NSEC3 Record -->
      <div class="record-section">
        <h4 use:tooltip={'Example of how this hash would appear as an NSEC3 record in a DNS zone file'}>
          Sample NSEC3 Record
        </h4>
        <div class="record-display">
          <code>{result.hash}.example.com. IN NSEC3 1 0 {iterations} {salt || '-'} {result.hash} A RRSIG</code>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>NSEC3 Purpose</h4>
        <p>
          NSEC3 provides authenticated denial of existence for DNS records while preventing zone enumeration. The hash
          function obscures the actual domain names in the zone, making it difficult for attackers to discover all
          records through zone walking.
        </p>
      </div>

      <div class="education-item info-panel warning">
        <h4>Security Considerations</h4>
        <p>
          Use sufficient iterations (10-100) and a random salt to resist offline dictionary attacks. Higher iteration
          counts increase CPU usage during validation. The salt should be randomly generated and periodically changed
          during zone re-signing.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Implementation Notes</h4>
        <p>
          NSEC3 hashes are calculated by iteratively applying SHA-1 to the concatenation of the domain name (in wire
          format) and salt. The resulting hash is encoded in Base32 without padding and used as the owner name for NSEC3
          records.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Performance Impact</h4>
        <p>
          Higher iteration counts provide better security but increase validation time. Consider server capacity and
          client timeout requirements when choosing iteration values. Typical values range from 5-150 iterations
          depending on security needs.
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .examples-card {
    margin-bottom: var(--spacing-md);
    background: var(--bg-tertiary);
    padding: 0;
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
    padding: var(--spacing-sm);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: all var(--transition-fast);
    border-radius: var(--radius-md);

    h4 {
      margin: 0;
      font-size: var(--font-size-md);
      color: var(--text-primary);
    }

    &:hover {
      background-color: var(--surface-hover);
    }

    &::-webkit-details-marker {
      display: none;
    }

    :global(.icon) {
      transition: transform var(--transition-fast);
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
      transform: translateY(-1px);
    }

    &.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
      background-color: var(--surface-hover);
    }
  }

  .example-title {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);
  }

  .example-params {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: var(--spacing-xs) 0;
  }

  .param-row {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .param-label {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    min-width: 70px;
  }

  .param-value {
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    word-break: break-all;
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .input-card {
    background: var(--bg-tertiary);
    margin-bottom: var(--spacing-lg);
  }

  .form-group {
    margin-bottom: var(--spacing-lg);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
      position: relative;
    }
  }

  .generate-salt-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: var(--font-size-xs);

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
    }
  }

  .domain-input,
  .salt-input {
    width: 100%;
    padding: var(--spacing-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
    }
  }

  .domain-input {
    &.example-active {
      border-color: var(--color-warning);
      background-color: color-mix(in srgb, var(--color-warning), transparent 95%);
    }
  }

  .input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .number-input {
    width: 100%;
    font-family: var(--font-mono);
  }

  select {
    width: 100%;
    font-family: var(--font-mono);
  }

  .field-help {
    color: var(--color-warning);
    font-size: var(--font-size-xs);
    margin-top: var(--spacing-xs);
    margin-bottom: 0;
  }

  .action-section {
    margin-top: var(--spacing-xl);
  }

  .calculate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    margin: 0 auto;
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      background-color: var(--color-primary-hover);
      transform: translateY(-1px);
    }

    &.loading {
      pointer-events: none;
    }
  }

  .loading {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .error-card {
    margin-bottom: var(--spacing-lg);
    border-color: var(--color-error);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-error), transparent 95%),
      color-mix(in srgb, var(--color-error), transparent 98%)
    );
  }

  .error-content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-primary);

    strong {
      color: var(--text-primary);
    }
  }

  .results-card {
    margin-bottom: var(--spacing-lg);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    h3 {
      margin: 0;
      color: var(--text-primary);
    }

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-md);
    }
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-sm);

    @media (max-width: 768px) {
      width: 100%;
      justify-content: stretch;
    }
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);

    @media (max-width: 768px) {
      flex: 1;
      justify-content: center;
    }

    &:hover {
      background-color: var(--surface-hover);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .hash-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-xl);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-success), transparent 95%),
      color-mix(in srgb, var(--color-success), transparent 98%)
    );
    border: 1px solid color-mix(in srgb, var(--color-success), transparent 80%);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .hash-label {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .hash-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-success);
    word-break: break-all;
    text-align: center;
  }

  .details-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }
  }

  .detail-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .detail-value {
    font-size: var(--font-size-sm);
    color: var(--text-primary);

    &.mono {
      font-family: var(--font-mono);
    }
  }

  .record-section {
    h4 {
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .record-display {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    code {
      display: block;
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      word-break: break-all;
      line-height: 1.4;
    }
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-lg);
  }

  .education-item {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);

    &.warning {
      border-color: var(--color-warning);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-warning), transparent 95%),
        color-mix(in srgb, var(--color-warning), transparent 98%)
      );
    }

    h4 {
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
      color: var(--color-primary);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
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
  }
</style>
