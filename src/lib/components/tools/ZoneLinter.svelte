<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { parseZoneFile, normalizeZone, formatZoneFile, type ParsedZone } from '$lib/utils/zone-parser.js';
  import { useClipboard } from '$lib/composables';

  let zoneInput = $state('');
  let results = $state<{
    normalized: ParsedZone;
    formattedZone: string;
  } | null>(null);
  const clipboard = useClipboard();
  let activeExampleIndex = $state<number | null>(null);

  const examples = [
    {
      name: 'Basic Zone',
      content: `$ORIGIN example.com.
$TTL 3600
@	IN	SOA	ns1.example.com. admin.example.com. (
		2023010101	; Serial
		3600		; Refresh
		1800		; Retry
		1209600		; Expire
		86400 )		; Minimum TTL

	IN	NS	ns1.example.com.
	IN	NS	ns2.example.com.

www	IN	A	192.0.2.1
mail	IN	A	192.0.2.10
	IN	MX	10 mail.example.com.`,
      description: 'Standard zone with SOA, NS, A, and MX records',
    },
    {
      name: 'Messy Zone',
      content: `example.com.	3600	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
www.example.com.	300	IN	A	192.0.2.1
www.example.com.	300	IN	A	192.0.2.1
mail.example.com.	IN	A	192.0.2.10
example.com.	IN	MX	10	mail.example.com.
example.com.		IN	NS	ns1.example.com.
example.com.	IN	NS	ns2.example.com.`,
      description: 'Unorganized zone with duplicates and inconsistent formatting',
    },
    {
      name: 'Complex Zone',
      content: `$ORIGIN example.com.
$TTL 86400

@	IN	SOA	ns1.example.com. hostmaster.example.com. (
		2023010101 10800 3600 604800 86400 )

	IN	NS	ns1.example.com.
	IN	NS	ns2.example.com.
	IN	MX	10	mail.example.com.
	IN	TXT	"v=spf1 mx ~all"

www	300	IN	A	192.0.2.1
	300	IN	AAAA	2001:db8::1
ftp	IN	CNAME	www.example.com.
mail	IN	A	192.0.2.10
	IN	AAAA	2001:db8::10

_http._tcp	IN	SRV	0 5 80 www.example.com.
_https._tcp	IN	SRV	0 5 443 www.example.com.`,
      description: 'Comprehensive zone with multiple record types',
    },
  ];

  function loadExample(example: (typeof examples)[0], index: number) {
    zoneInput = example.content;
    activeExampleIndex = index;
    lintZone();
  }

  function clearActiveIfChanged() {
    if (activeExampleIndex !== null) {
      const activeExample = examples[activeExampleIndex];
      if (!activeExample || zoneInput !== activeExample.content) {
        activeExampleIndex = null;
      }
    }
  }

  function lintZone() {
    if (!zoneInput.trim()) {
      results = null;
      return;
    }

    try {
      const parsed = parseZoneFile(zoneInput);
      const normalized = normalizeZone(parsed);
      const formattedZone = formatZoneFile(normalized);

      results = {
        normalized,
        formattedZone,
      };
    } catch (error) {
      console.error('Failed to parse zone:', error);
      results = null;
    }
  }

  function copyZone() {
    if (!results) return;
    clipboard.copy(results.formattedZone);
  }

  function handleInputChange() {
    clearActiveIfChanged();
    lintZone();
  }

  function downloadZone() {
    if (!results) return;

    const blob = new Blob([results.formattedZone], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'normalized-zone.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DNS Zone Linter</h1>
    <p>Normalize and canonicalize BIND zone files with error checking and formatting</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="check-circle" size="sm" />
        <div>
          <strong>Normalization:</strong> Sort records, remove duplicates, and apply consistent formatting.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="alert-triangle" size="sm" />
        <div>
          <strong>Error Detection:</strong> Identify syntax errors, missing records, and configuration issues.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="layout" size="sm" />
        <div>
          <strong>Canonicalization:</strong> Apply standard ordering and TTL defaults for clean output.
        </div>
      </div>
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Zone File Examples</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (example.name)}
          <button
            class="example-card {activeExampleIndex === index ? 'active' : ''}"
            onclick={() => loadExample(example, index)}
          >
            <div class="example-name">{example.name}</div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Section -->
  <div class="card input-card">
    <div class="input-group">
      <label for="zone-input" use:tooltip={'Paste your BIND zone file content here for analysis and normalization'}>
        <Icon name="file" size="sm" />
        Zone File Content
      </label>
      <textarea
        id="zone-input"
        bind:value={zoneInput}
        oninput={handleInputChange}
        placeholder="$ORIGIN example.com.
$TTL 3600
@	IN	SOA	ns1.example.com. admin.example.com. (
		2023010101	; Serial
		3600		; Refresh
		1800		; Retry
		1209600		; Expire
		86400 )		; Minimum TTL

	IN	NS	ns1.example.com.
	IN	NS	ns2.example.com.

www	IN	A	192.0.2.1"
        class="zone-textarea"
        rows="12"
      ></textarea>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <section class="results-section">
      <h3>Linting Results</h3>
      <div class="results-inner">
        <!-- Errors and Warnings -->
        {#if results.normalized.errors.length > 0 || results.normalized.warnings.length > 0}
          <div class="issues-card">
            <h4>
              <Icon name="alert-circle" size="sm" />
              Issues Found
            </h4>

            {#if results.normalized.errors.length > 0}
              <div class="error-list">
                <h5>Errors ({results.normalized.errors.length})</h5>
                {#each results.normalized.errors as error, index (index)}
                  <div class="issue-item error">
                    <Icon name="x-circle" size="sm" />
                    <div>
                      <span class="issue-line">Line {error.line}:</span>
                      {error.message}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            {#if results.normalized.warnings.length > 0}
              <div class="warning-list">
                <h5>Warnings ({results.normalized.warnings.length})</h5>
                {#each results.normalized.warnings as warning, index (index)}
                  <div class="issue-item warning">
                    <Icon name="alert-triangle" size="sm" />
                    <div>
                      <span class="issue-line">Line {warning.line || 'General'}:</span>
                      {warning.message}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Zone Summary -->
        <div class="summary-card">
          <h4>
            <Icon name="info" size="sm" />
            Zone Summary
          </h4>
          <div class="summary-stats">
            <div class="stat-item">
              <div class="stat-label">Total Records</div>
              <div class="stat-value">{results.normalized.records.length}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Origin</div>
              <div class="stat-value">{results.normalized.origin || 'Not specified'}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Default TTL</div>
              <div class="stat-value">{results.normalized.defaultTTL || 'Not specified'}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Has SOA</div>
              <div class="stat-value {results.normalized.soa ? 'success' : 'error'}">
                {results.normalized.soa ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </div>

        <!-- Normalized Output -->
        <div class="output-card">
          <div class="output-header">
            <h4>
              <Icon name="file" size="sm" />
              Normalized Zone File
            </h4>
            <div class="output-actions">
              <button class="copy-button {clipboard.isCopied() ? 'copied' : ''}" onclick={copyZone}>
                <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
                {clipboard.isCopied() ? 'Copied!' : 'Copy'}
              </button>
              <button class="download-button" onclick={downloadZone}>
                <Icon name="download" size="sm" />
                Download
              </button>
            </div>
          </div>

          <div class="code-output">
            <pre>{results.formattedZone}</pre>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>Zone File Format</h4>
        <p>
          BIND zone files define DNS records for a domain. They include resource records (RRs) with owner names, TTL
          values, classes, types, and data. Proper formatting ensures reliable DNS operation.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Normalization Benefits</h4>
        <p>
          Normalizing zone files improves readability, reduces errors, and ensures consistent formatting. It also helps
          identify duplicate records and missing essential records like SOA and NS.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Common Issues</h4>
        <p>
          Watch for missing trailing dots in FQDNs, duplicate records, incorrect TTL values, and missing SOA or NS
          records. The linter helps catch these configuration problems early.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Best Practices</h4>
        <p>
          Use consistent TTL values, maintain proper record ordering, include comprehensive NS records, and regularly
          validate your zones. Consider using shorter TTLs during transitions.
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
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

  .example-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .input-card {
    margin-bottom: var(--spacing-xl);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .zone-textarea {
    width: 100%;
    padding: var(--spacing-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    resize: vertical;
    min-height: 300px;
    line-height: 1.4;
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 90%);
    }
  }

  .results-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);

    h3 {
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }
  }

  .results-inner {
    display: grid;
    gap: var(--spacing-md);
  }

  .issues-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      color: var(--color-error);
      font-size: var(--font-size-md);
    }

    h5 {
      margin: var(--spacing-md) 0 var(--spacing-sm);
      font-size: var(--font-size-sm);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .error-list h5 {
      color: var(--color-error);
    }

    .warning-list h5 {
      color: var(--color-warning);
    }
  }

  .issue-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-xs);
    font-size: var(--font-size-sm);

    &.error {
      background-color: color-mix(in srgb, var(--color-error), transparent 90%);
      color: var(--color-error);
    }

    &.warning {
      background-color: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
    }

    .issue-line {
      font-weight: 600;
    }
  }

  .summary-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
  }

  .stat-item {
    text-align: center;

    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xs);
    }

    .stat-value {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      font-family: var(--font-mono);

      &.success {
        color: var(--color-success);
      }

      &.error {
        color: var(--color-error);
      }
    }
  }

  .output-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .output-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .copy-button,
  .download-button {
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
  }

  .copy-button {
    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .code-output {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    overflow-x: auto;

    pre {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      white-space: pre;
      margin: 0;
      line-height: 1.4;
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

    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .output-actions {
      flex-direction: column;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
