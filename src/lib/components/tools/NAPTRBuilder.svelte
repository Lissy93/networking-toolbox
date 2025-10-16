<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { useClipboard } from '$lib/composables';

  let domain = $state('');
  let order = $state('100');
  let preference = $state('10');
  let flags = $state('U');
  let service = $state('E2U+sip');
  let regexp = $state('!^.*$!sip:info@example.com!');
  let replacement = $state('.');

  const clipboard = useClipboard();
  let showExamples = $state(false);

  const flagOptions = [
    { value: 'U', label: 'U - Terminal rule (URI)', description: 'The Rule is terminal and the result is a URI' },
    {
      value: 'S',
      label: 'S - Terminal rule (SRV)',
      description: 'The Rule is terminal and the result is for SRV lookup',
    },
    {
      value: 'A',
      label: 'A - Terminal rule (Address)',
      description: 'The Rule is terminal and the result is an address record',
    },
    { value: 'P', label: 'P - Protocol specific', description: 'Protocol-specific flags' },
    { value: '', label: 'Empty - Non-terminal', description: 'The Rule is not terminal (continue processing)' },
  ];

  const serviceExamples = [
    { value: 'E2U+sip', label: 'SIP Service', description: 'Session Initiation Protocol' },
    { value: 'E2U+email', label: 'Email Service', description: 'Electronic mail service' },
    { value: 'E2U+web+http', label: 'HTTP Web Service', description: 'Web service over HTTP' },
    { value: 'E2U+web+https', label: 'HTTPS Web Service', description: 'Secure web service over HTTPS' },
    { value: 'E2U+tel', label: 'Telephone Service', description: 'Telephone number mapping' },
    { value: 'E2U+fax', label: 'Fax Service', description: 'Facsimile service' },
    { value: 'E2U+h323', label: 'H.323 Service', description: 'H.323 multimedia protocol' },
    { value: 'E2U+im', label: 'Instant Messaging', description: 'Instant messaging service' },
  ];

  let naptrRecord = $derived.by(() => {
    if (!domain.trim()) return '';

    const cleanDomain = domain.trim().replace(/\.$/, '');
    return `${cleanDomain}. IN NAPTR ${order} ${preference} "${flags}" "${service}" "${regexp}" ${replacement}`;
  });

  let isValid = $derived.by(() => {
    return (
      domain.trim() !== '' &&
      order !== '' &&
      preference !== '' &&
      parseInt(order) >= 0 &&
      parseInt(order) <= 65535 &&
      parseInt(preference) >= 0 &&
      parseInt(preference) <= 65535
    );
  });

  let warnings = $derived.by(() => {
    const warns = [];

    if (flags === 'U' && !regexp.includes('!')) {
      warns.push('URI flag requires a valid substitution expression with delimiters');
    }

    if (flags === 'S' && replacement === '.') {
      warns.push('SRV flag typically requires a replacement domain, not "."');
    }

    if (flags === '' && replacement === '.') {
      warns.push('Non-terminal rules should have a replacement domain for continued processing');
    }

    if (regexp && !regexp.match(/^!.*!.*!$/)) {
      warns.push('Regular expressions should follow the format: !pattern!replacement!');
    }

    if (parseInt(order) === parseInt(preference)) {
      warns.push('Order and Preference should typically be different values');
    }

    return warns;
  });

  function copyToClipboard() {
    clipboard.copy(naptrRecord, 'copy');
  }

  function downloadRecord() {
    const blob = new Blob([naptrRecord], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain.replace(/\.$/, '') || 'naptr'}-record.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('', 'download');
  }

  function loadExample(exampleType: string) {
    switch (exampleType) {
      case 'sip':
        domain = 'example.com';
        order = '100';
        preference = '10';
        flags = 'U';
        service = 'E2U+sip';
        regexp = '!^.*$!sip:info@example.com!';
        replacement = '.';
        break;
      case 'email':
        domain = 'example.com';
        order = '100';
        preference = '10';
        flags = 'U';
        service = 'E2U+email';
        regexp = '!^.*$!mailto:admin@example.com!';
        replacement = '.';
        break;
      case 'web':
        domain = 'example.com';
        order = '100';
        preference = '10';
        flags = 'U';
        service = 'E2U+web+https';
        regexp = '!^.*$!https://www.example.com/!';
        replacement = '.';
        break;
      case 'srv':
        domain = 'example.com';
        order = '100';
        preference = '10';
        flags = 'S';
        service = 'SIP+D2T';
        regexp = '';
        replacement = '_sip._tcp.example.com.';
        break;
    }
  }
</script>

<div class="container">
  <div class="card">
    <div class="card-header">
      <h1>NAPTR Record Builder</h1>
      <p>Construct NAPTR (Naming Authority Pointer) records for dynamic delegation and service mapping</p>
    </div>

    <div class="content">
      <!-- Examples -->
      <div class="card examples-card">
        <details bind:open={showExamples}>
          <summary class="examples-summary">
            <Icon name="lightbulb" size="sm" />
            Quick Examples
            <span class="chevron"><Icon name="chevron-down" size="sm" /></span>
          </summary>
          <div class="examples-grid">
            <button class="example-btn" onclick={() => loadExample('sip')}> SIP Service </button>
            <button class="example-btn" onclick={() => loadExample('email')}> Email Service </button>
            <button class="example-btn" onclick={() => loadExample('web')}> Web Service </button>
            <button class="example-btn" onclick={() => loadExample('srv')}> SRV Delegation </button>
          </div>
        </details>
      </div>

      <div class="main-grid">
        <!-- Input Form -->
        <div class="input-section">
          <div class="input-group">
            <label for="domain" use:tooltip={'The domain name for this NAPTR record'}>Domain Name *</label>
            <input id="domain" type="text" bind:value={domain} placeholder="example.com" />
            <p class="description">The domain name for this NAPTR record</p>
          </div>

          <div class="order-grid">
            <div class="input-group">
              <label for="order" use:tooltip={'Processing order - lower values are processed first (0-65535)'}
                >Order *</label
              >
              <input id="order" type="number" bind:value={order} min="0" max="65535" />
              <p class="description">Processing order (0-65535)</p>
            </div>

            <div class="input-group">
              <label for="preference" use:tooltip={'Preference within the same order value (0-65535)'}
                >Preference *</label
              >
              <input id="preference" type="number" bind:value={preference} min="0" max="65535" />
              <p class="description">Preference within order (0-65535)</p>
            </div>
          </div>

          <div class="input-group">
            <label for="flags" use:tooltip={'Control processing behavior - affects how the result is interpreted'}
              >Flags</label
            >
            <select id="flags" bind:value={flags}>
              {#each flagOptions as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            <p class="description">
              {flagOptions.find((opt) => opt.value === flags)?.description || 'Select flag type'}
            </p>
          </div>

          <div class="input-group">
            <label for="service" use:tooltip={'Service identifier or protocol (e.g., E2U+sip for SIP services)'}
              >Service</label
            >
            <input id="service" type="text" bind:value={service} placeholder="E2U+sip" />
            <details class="service-examples">
              <summary>Show service examples</summary>
              <div class="service-list">
                {#each serviceExamples as example (example.value)}
                  <button class="service-item" onclick={() => (service = example.value)}>
                    <strong>{example.value}</strong> - {example.description}
                  </button>
                {/each}
              </div>
            </details>
          </div>

          <div class="input-group">
            <label
              for="regexp"
              use:tooltip={'Regular expression for pattern matching and substitution (format: !pattern!replacement!)'}
              >Regular Expression</label
            >
            <input id="regexp" type="text" bind:value={regexp} placeholder="!^.*$!sip:info@example.com!" class="mono" />
            <p class="description">Substitution expression (format: !pattern!replacement!)</p>
          </div>

          <div class="input-group">
            <label for="replacement" use:tooltip={"Next domain to query, or '.' for terminal rules"}>Replacement</label>
            <input id="replacement" type="text" bind:value={replacement} placeholder="." />
            <p class="description">Domain name for next lookup, or "." for terminal rules</p>
          </div>
        </div>

        <!-- Output -->
        <div class="output-section">
          <div class="card">
            <h3 class="section-title">Generated NAPTR Record</h3>
            <div class="code-block">
              {#if isValid}
                <code>{naptrRecord}</code>
              {:else}
                <p class="placeholder">Fill in the required fields to generate the NAPTR record</p>
              {/if}
            </div>
          </div>

          {#if warnings.length > 0}
            <div class="message warning">
              <Icon name="alert-triangle" size="sm" />
              <div>
                <h4>Configuration Warnings</h4>
                <ul>
                  {#each warnings as warning, index (index)}
                    <li>{warning}</li>
                  {/each}
                </ul>
              </div>
            </div>
          {/if}

          {#if isValid}
            <div class="actions">
              <button onclick={copyToClipboard} class="btn btn-primary" class:success={clipboard.isCopied('copy')}>
                <Icon name={clipboard.isCopied('copy') ? 'check' : 'copy'} size="sm" />
                {clipboard.isCopied('copy') ? 'Copied!' : 'Copy Record'}
              </button>
              <button onclick={downloadRecord} class="btn btn-success" class:success={clipboard.isCopied('download')}>
                <Icon name={clipboard.isCopied('download') ? 'check' : 'download'} size="sm" />
                {clipboard.isCopied('download') ? 'Downloaded!' : 'Download'}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Information Section -->
      <div class="info-section">
        <div class="card info-card">
          <h3 class="section-title">About NAPTR Records</h3>
          <p>
            NAPTR (Naming Authority Pointer) records provide a way to map domain names to URIs or other domain names
            through regular expression-based rewriting. They're commonly used in telecommunications for ENUM (E.164
            Number Mapping) and SIP services, allowing dynamic delegation and service discovery.
          </p>
        </div>

        <div class="info-grid">
          <div class="card info-card">
            <h4>Field Descriptions</h4>
            <dl class="field-list">
              <dt>Order:</dt>
              <dd>Processing order (lower values first)</dd>
              <dt>Preference:</dt>
              <dd>Preference within same order</dd>
              <dt>Flags:</dt>
              <dd>Control processing behavior</dd>
              <dt>Service:</dt>
              <dd>Service identifier or protocol</dd>
              <dt>RegExp:</dt>
              <dd>Pattern matching and substitution</dd>
              <dt>Replacement:</dt>
              <dd>Next domain to query</dd>
            </dl>
          </div>

          <div class="card info-card">
            <h4>Common Use Cases</h4>
            <ul class="use-case-list">
              <li>ENUM telephone number mapping</li>
              <li>SIP service discovery</li>
              <li>Dynamic delegation</li>
              <li>Protocol mapping</li>
              <li>Service location</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
  }

  .card {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .card-header {
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-primary);
  }

  .card-header h1 {
    color: var(--text-primary);
    font-size: var(--font-size-2xl);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .card-header p {
    color: var(--text-secondary);
    margin: 0;
  }

  .content {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .examples-card {
    padding: var(--spacing-md);
  }

  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    color: var(--text-primary);
    font-weight: 600;
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-md);
  }

  .examples-summary:hover {
    color: var(--color-primary);
  }

  .chevron {
    margin-left: auto;
    transform: rotate(0deg);
    transition: transform var(--transition-normal);
  }

  details[open] .chevron {
    transform: rotate(180deg);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin: 0 0 var(--spacing-md) 0;
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-sm);
  }

  .example-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .example-btn:hover {
    background: var(--color-primary-hover);
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
  }

  @media (max-width: 768px) {
    .main-grid {
      grid-template-columns: 1fr;
    }
  }

  .input-section,
  .output-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .input-group label {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .input-group input,
  .input-group select {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .input-group input:focus,
  .input-group select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .input-group input.mono {
    font-family: var(--font-mono);
  }

  .description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin: 0;
  }

  .order-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .service-examples {
    margin-top: var(--spacing-sm);
  }

  .service-examples summary {
    color: var(--color-primary);
    cursor: pointer;
    font-size: var(--font-size-xs);
    transition: color var(--transition-fast);
  }

  .service-examples summary:hover {
    color: var(--color-primary-hover);
  }

  .service-list {
    margin-top: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .service-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .service-item:hover {
    background: var(--surface-hover);
    border-color: var(--color-primary);
  }

  .service-item strong {
    color: var(--text-primary);
  }

  .code-block {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .code-block code {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    word-break: break-all;
    white-space: pre-wrap;
  }

  .code-block .placeholder {
    color: var(--text-secondary);
    font-style: italic;
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .message {
    display: flex;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
  }

  .message.warning {
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
    color: var(--color-warning);
  }

  .message h4 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .message ul {
    margin: 0;
    padding-left: var(--spacing-md);
    font-size: var(--font-size-sm);
  }

  .message li {
    margin-bottom: var(--spacing-xs);
  }

  .actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-normal);
    text-decoration: none;
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--bg-primary);
  }

  .btn-primary:hover:not(.success) {
    background: var(--color-primary-hover);
  }

  .btn-success {
    background: var(--color-success);
    color: var(--bg-primary);
  }

  .btn-success:hover:not(.success) {
    background: var(--color-success-light);
  }

  .btn.success {
    background: var(--color-success) !important;
    transform: scale(1.05);
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
  }

  .info-card {
    padding: var(--spacing-md);
  }

  .info-card h3,
  .info-card h4 {
    color: var(--text-primary);
    font-size: var(--font-size-md);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .info-card p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    line-height: 1.5;
    margin: 0;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  @media (max-width: 768px) {
    .info-grid {
      grid-template-columns: 1fr;
    }
  }

  .field-list {
    font-size: var(--font-size-sm);
  }

  .field-list dt {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .field-list dd {
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-sm) var(--spacing-md);
  }

  .use-case-list {
    margin: 0;
    padding: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .use-case-list li {
    position: relative;
    padding-left: var(--spacing-md);
    margin-bottom: var(--spacing-xs);
    list-style: none;
  }

  .use-case-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.5em;
    width: 6px;
    height: 6px;
    background: var(--color-primary);
    border-radius: 50%;
  }
</style>
