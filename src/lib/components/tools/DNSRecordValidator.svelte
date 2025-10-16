<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import {
    validateARecord,
    validateAAAARecord,
    validateCNAMERecord,
    validateMXRecord,
    validateTXTRecord,
    validateSRVRecord,
    validateCAARecord,
    type ValidationResult,
  } from '$lib/utils/dns-validation.js';
  import { useClipboard } from '$lib/composables';

  let recordType = $state('A');
  let recordName = $state('example.com');
  let recordValue = $state('192.168.1.1');
  let ttl = $state(3600);

  // Additional fields for specific record types
  let priority = $state(10);
  let weight = $state(0);
  let port = $state(443);
  let service = $state('_http');
  let protocol = $state('_tcp');
  let flags = $state(0);
  let tag = $state('issue');

  let results = $state<ValidationResult | null>(null);
  const clipboard = useClipboard();

  const recordTypes = [
    { value: 'A', label: 'A (IPv4 Address)', description: 'Maps domain to IPv4 address' },
    { value: 'AAAA', label: 'AAAA (IPv6 Address)', description: 'Maps domain to IPv6 address' },
    { value: 'CNAME', label: 'CNAME (Canonical Name)', description: 'Alias to another domain' },
    { value: 'MX', label: 'MX (Mail Exchange)', description: 'Mail server for domain' },
    { value: 'TXT', label: 'TXT (Text)', description: 'Arbitrary text data' },
    { value: 'SRV', label: 'SRV (Service)', description: 'Service location and port' },
    { value: 'CAA', label: 'CAA (Certificate Authority)', description: 'Certificate authority authorization' },
  ];

  const examples = [
    {
      type: 'A',
      name: 'www.example.com',
      value: '192.0.2.1',
      description: 'Basic web server A record',
    },
    {
      type: 'AAAA',
      name: 'www.example.com',
      value: '2001:db8::1',
      description: 'IPv6 web server record',
    },
    {
      type: 'CNAME',
      name: 'blog.example.com',
      value: 'www.example.com.',
      description: 'Blog subdomain alias',
    },
    {
      type: 'MX',
      name: 'example.com',
      value: 'mail.example.com.',
      priority: 10,
      description: 'Primary mail server',
    },
    {
      type: 'TXT',
      name: 'example.com',
      value: 'v=spf1 include:_spf.google.com ~all',
      description: 'SPF policy record',
    },
    {
      type: 'SRV',
      name: '_https._tcp.example.com',
      value: 'server.example.com.',
      priority: 0,
      weight: 5,
      port: 443,
      description: 'HTTPS service record',
    },
  ];

  function loadExample(example: (typeof examples)[0]) {
    recordType = example.type;
    recordName = example.name;
    recordValue = example.value;
    if ('priority' in example && example.priority !== undefined) {
      priority = example.priority;
    }
    if ('weight' in example && example.weight !== undefined) {
      weight = example.weight;
    }
    if ('port' in example && example.port !== undefined) {
      port = example.port;
    }
    validateRecord();
  }

  function validateRecord() {
    if (!recordValue.trim()) {
      results = null;
      return;
    }

    try {
      switch (recordType) {
        case 'A':
          results = validateARecord(recordValue);
          break;
        case 'AAAA':
          results = validateAAAARecord(recordValue);
          break;
        case 'CNAME':
          results = validateCNAMERecord(recordValue);
          break;
        case 'MX':
          results = validateMXRecord(recordValue, priority);
          break;
        case 'TXT':
          results = validateTXTRecord(recordValue);
          break;
        case 'SRV':
          results = validateSRVRecord(service, protocol, priority, weight, port, recordValue);
          break;
        case 'CAA':
          results = validateCAARecord(flags, tag, recordValue);
          break;
        default:
          results = {
            valid: false,
            errors: [`Unsupported record type: ${recordType}`],
            warnings: [],
          };
      }
    } catch (error) {
      results = {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation error'],
        warnings: [],
      };
    }
  }

  function formatRecord(): string {
    switch (recordType) {
      case 'A':
      case 'AAAA':
      case 'CNAME':
        return `${recordName} ${ttl} IN ${recordType} ${recordValue}`;
      case 'MX':
        return `${recordName} ${ttl} IN MX ${priority} ${recordValue}`;
      case 'TXT':
        return `${recordName} ${ttl} IN TXT "${recordValue}"`;
      case 'SRV':
        return `${service}.${protocol}.${recordName} ${ttl} IN SRV ${priority} ${weight} ${port} ${recordValue}`;
      case 'CAA':
        return `${recordName} ${ttl} IN CAA ${flags} ${tag} "${recordValue}"`;
      default:
        return `${recordName} ${ttl} IN ${recordType} ${recordValue}`;
    }
  }

  // Validate on component load and when inputs change
  function handleInputChange() {
    validateRecord();
  }

  validateRecord();
</script>

<div class="card">
  <header class="card-header">
    <h1>DNS Record Validator</h1>
    <p>Validate individual DNS resource record syntax for proper formatting and common issues</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="check-circle" size="sm" />
        <div>
          <strong>Syntax Validation:</strong> Verify record values match RFC specifications for format and constraints.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="alert-triangle" size="sm" />
        <div>
          <strong>Error Detection:</strong> Identify format errors, range violations, and protocol mismatches.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="lightbulb" size="sm" />
        <div>
          <strong>Best Practices:</strong> Get warnings about potential issues and optimization suggestions.
        </div>
      </div>
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Quick Examples</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example (example.type + example.name)}
          <button class="example-card" onclick={() => loadExample(example)}>
            <div class="example-header">
              <span class="record-type-badge">{example.type}</span>
              <span class="example-name">{example.name}</span>
            </div>
            <code class="example-value">{example.value}</code>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <!-- Record Type Selection -->
    <div class="input-group">
      <label for="record-type" use:tooltip={'Select the DNS record type to validate'}>
        <Icon name="tag" size="sm" />
        Record Type
      </label>
      <select id="record-type" bind:value={recordType} onchange={handleInputChange} class="record-type-select">
        {#each recordTypes as type (type.value)}
          <option value={type.value}>{type.label}</option>
        {/each}
      </select>
      <div class="record-type-description">
        {recordTypes.find((t) => t.value === recordType)?.description || ''}
      </div>
    </div>

    <!-- Record Name -->
    <div class="input-group">
      <label for="record-name" use:tooltip={'The domain name for this DNS record'}>
        <Icon name="globe" size="sm" />
        Record Name
      </label>
      <input
        id="record-name"
        type="text"
        bind:value={recordName}
        oninput={handleInputChange}
        placeholder="example.com"
        class="record-name-input"
        spellcheck="false"
      />
    </div>

    <!-- Record Value -->
    <div class="input-group">
      <label for="record-value" use:tooltip={'The value/data for this DNS record'}>
        <Icon name="edit" size="sm" />
        Record Value
      </label>
      {#if recordType === 'TXT'}
        <textarea
          id="record-value"
          bind:value={recordValue}
          oninput={handleInputChange}
          placeholder="Enter TXT record content..."
          class="record-value-textarea"
          rows="3"
          spellcheck="false"
        ></textarea>
      {:else}
        <input
          id="record-value"
          type="text"
          bind:value={recordValue}
          oninput={handleInputChange}
          placeholder={recordType === 'A' ? '192.0.2.1' : recordType === 'AAAA' ? '2001:db8::1' : 'Record value...'}
          class="record-value-input {results?.valid === true ? 'valid' : results?.valid === false ? 'invalid' : ''}"
          spellcheck="false"
        />
      {/if}
    </div>

    <!-- Additional Fields Based on Record Type -->
    {#if recordType === 'MX'}
      <div class="additional-fields">
        <div class="field-group">
          <label for="priority">Priority</label>
          <input
            id="priority"
            type="number"
            bind:value={priority}
            oninput={handleInputChange}
            min="0"
            max="65535"
            class="priority-input"
          />
        </div>
      </div>
    {/if}

    {#if recordType === 'SRV'}
      <div class="additional-fields">
        <div class="field-group">
          <label for="service">Service</label>
          <input
            id="service"
            type="text"
            bind:value={service}
            oninput={handleInputChange}
            placeholder="_http"
            class="service-input"
          />
        </div>
        <div class="field-group">
          <label for="protocol">Protocol</label>
          <select id="protocol" bind:value={protocol} onchange={handleInputChange} class="protocol-select">
            <option value="_tcp">_tcp</option>
            <option value="_udp">_udp</option>
          </select>
        </div>
        <div class="field-group">
          <label for="srv-priority">Priority</label>
          <input
            id="srv-priority"
            type="number"
            bind:value={priority}
            oninput={handleInputChange}
            min="0"
            max="65535"
            class="priority-input"
          />
        </div>
        <div class="field-group">
          <label for="weight">Weight</label>
          <input
            id="weight"
            type="number"
            bind:value={weight}
            oninput={handleInputChange}
            min="0"
            max="65535"
            class="weight-input"
          />
        </div>
        <div class="field-group">
          <label for="port">Port</label>
          <input
            id="port"
            type="number"
            bind:value={port}
            oninput={handleInputChange}
            min="0"
            max="65535"
            class="port-input"
          />
        </div>
      </div>
    {/if}

    {#if recordType === 'CAA'}
      <div class="additional-fields">
        <div class="field-group">
          <label for="flags">Flags</label>
          <input
            id="flags"
            type="number"
            bind:value={flags}
            oninput={handleInputChange}
            min="0"
            max="255"
            class="flags-input"
          />
        </div>
        <div class="field-group">
          <label for="tag">Tag</label>
          <select id="tag" bind:value={tag} onchange={handleInputChange} class="tag-select">
            <option value="issue">issue</option>
            <option value="issuewild">issuewild</option>
            <option value="iodef">iodef</option>
          </select>
        </div>
      </div>
    {/if}

    <!-- TTL -->
    <div class="input-group">
      <label for="ttl" use:tooltip={'Time To Live in seconds (how long record should be cached)'}>
        <Icon name="clock" size="sm" />
        TTL (seconds)
      </label>
      <input
        id="ttl"
        type="number"
        bind:value={ttl}
        oninput={handleInputChange}
        min="0"
        max="2147483647"
        placeholder="3600"
        class="ttl-input"
      />
    </div>
  </div>

  <!-- Validation Results -->
  {#if results}
    <div class="card results-card">
      <div class="results-header">
        <div class="validation-status {results.valid ? 'valid' : 'invalid'}">
          <Icon name={results.valid ? 'check-circle' : 'x-circle'} size="sm" />
          <span>{results.valid ? 'Valid' : 'Invalid'} DNS Record</span>
        </div>
        <button
          class="copy-button {clipboard.isCopied() ? 'copied' : ''}"
          onclick={() => clipboard.copy(formatRecord())}
        >
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
          Copy Zone Line
        </button>
      </div>

      <!-- Formatted Record -->
      <div class="formatted-record">
        <h4>Zone File Format:</h4>
        <pre><code>{formatRecord()}</code></pre>
      </div>

      <!-- Errors -->
      {#if results.errors.length > 0}
        <div class="validation-section errors">
          <h4>
            <Icon name="x-circle" size="sm" />
            Errors ({results.errors.length})
          </h4>
          <ul class="validation-list">
            {#each results.errors as error, index (index)}
              <li class="error-item">{error}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Warnings -->
      {#if results.warnings.length > 0}
        <div class="validation-section warnings">
          <h4>
            <Icon name="alert-triangle" size="sm" />
            Warnings ({results.warnings.length})
          </h4>
          <ul class="validation-list">
            {#each results.warnings as warning, index (index)}
              <li class="warning-item">{warning}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Normalized Value -->
      {#if results.normalized && results.normalized !== recordValue}
        <div class="validation-section normalized">
          <h4>
            <Icon name="check" size="sm" />
            Normalized Value
          </h4>
          <code class="normalized-value">{results.normalized}</code>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>Common Record Types</h4>
        <p>
          A/AAAA records map domains to IP addresses. CNAME creates aliases. MX directs email. TXT stores arbitrary data
          like SPF policies. SRV specifies service locations.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Validation Scope</h4>
        <p>
          This validator checks syntax, format, and common configuration issues. It doesn't verify that targets exist or
          are reachable - use DNS lookup tools for connectivity testing.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>TTL Guidelines</h4>
        <p>
          Use shorter TTLs (300-3600s) for records that change frequently. Longer TTLs (3600-86400s) reduce DNS queries
          but slow propagation of changes. Balance based on your needs.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Best Practices</h4>
        <p>
          Always use fully qualified domain names (ending with .) in record values. Validate SPF/DMARC policies
          carefully. Keep MX priorities consistent. Use descriptive TXT record formatting.
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
    gap: var(--spacing-xs);
  }

  .overview-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
    }
  }

  .examples-card {
    margin-bottom: var(--spacing-xl);
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
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
  }

  .example-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .record-type-badge {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 2px var(--spacing-xs);
    background-color: var(--color-primary);
    color: var(--bg-secondary);
    border-radius: var(--radius-sm);
  }

  .example-name {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-value {
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

  .input-card {
    margin-bottom: var(--spacing-xl);
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

  .record-type-select {
    width: 100%;
    padding: var(--spacing-md);
    font-size: var(--font-size-lg);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .record-type-description {
    margin-top: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-style: italic;
  }

  .record-name-input,
  .record-value-input,
  .ttl-input {
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
  }

  .record-value-input {
    &.valid {
      border-color: var(--color-success);
    }

    &.invalid {
      border-color: var(--color-error);
    }
  }

  .record-value-textarea {
    width: 100%;
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    resize: vertical;
    min-height: 80px;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }
  }

  .additional-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);
  }

  .field-group {
    label {
      display: block;
      margin-bottom: var(--spacing-xs);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    input,
    select {
      width: 100%;
      padding: var(--spacing-sm);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-mono);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }
  }

  .results-card {
    margin-bottom: var(--spacing-xl);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
    }
  }

  .validation-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-weight: 600;
    font-size: var(--font-size-lg);

    &.valid {
      color: var(--color-success);
    }

    &.invalid {
      color: var(--color-error);
    }
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);

    &:hover {
      background-color: var(--surface-hover);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .formatted-record {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);

    h4 {
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--text-primary);
    }

    pre {
      margin: 0;

      code {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        color: var(--text-primary);
        background: none;
      }
    }
  }

  .validation-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
    }

    &.errors h4 {
      color: var(--color-error);
    }

    &.warnings h4 {
      color: var(--color-warning);
    }

    &.normalized h4 {
      color: var(--color-success);
    }
  }

  .validation-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .error-item,
  .warning-item {
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .error-item {
    background-color: rgba(var(--color-error-rgb), 0.1);
    border-left: 3px solid var(--color-error);
    color: var(--color-error-light);
  }

  .warning-item {
    background-color: rgba(var(--color-warning-rgb), 0.1);
    border-left: 3px solid var(--color-warning);
    color: var(--color-warning-light);
  }

  .normalized-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
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

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .additional-fields {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
