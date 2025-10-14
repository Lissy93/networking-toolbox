<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { isValidDomainName, formatDNSError } from '$lib/utils/dns-validation.js';
  import '../../../../styles/diagnostics-pages.scss';

  let domainName = $state('github.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  // Reactive validation state
  const isInputValid = $derived(() => {
    const domain = domainName.trim();
    return domain.length > 0 && isValidDomainName(domain);
  });

  const examples = [
    { domain: 'github.com', description: 'GitHub CAA configuration' },
    { domain: 'www.google.com', description: 'Google subdomain CAA inheritance' },
    { domain: 'api.stripe.com', description: 'Stripe API subdomain CAA' },
    { domain: 'blog.cloudflare.com', description: 'Cloudflare blog CAA setup' },
    { domain: 'microsoft.com', description: 'Microsoft CAA settings' },
    { domain: 'amazon.com', description: 'Amazon CAA implementation' },
  ];

  async function checkCAA() {
    loading = true;
    error = null;
    results = null;

    // Client-side validation
    const domain = domainName.trim();
    if (!domain) {
      error = 'Domain name is required';
      loading = false;
      return;
    }

    if (!isValidDomainName(domain)) {
      error = 'Invalid domain name format. Use valid domain names like "example.com"';
      loading = false;
      return;
    }

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'caa-effective',
          name: domain,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `CAA check failed (${response.status})`;

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If not JSON, use status-based message
          if (response.status === 400) {
            errorMessage = 'Invalid request. Please check your domain name.';
          } else if (response.status === 500) {
            errorMessage = 'CAA check service temporarily unavailable. Please try again.';
          }
        }

        throw new Error(errorMessage);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = formatDNSError(err);
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domainName = example.domain;
    selectedExampleIndex = index;
    checkCAA();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function parseCAA(record: string): { flag: number; tag: string; value: string } | null {
    // CAA format: flag tag "value"
    const match = record.match(/^(\d+)\s+(\w+)\s+["]?([^"]+)["]?$/);
    if (match) {
      return {
        flag: parseInt(match[1]),
        tag: match[2],
        value: match[3],
      };
    }
    return null;
  }

  function getTagColor(tag: string): string {
    switch (tag) {
      case 'issue':
        return 'primary';
      case 'issuewild':
        return 'warning';
      case 'iodef':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  function getTagIcon(tag: string): string {
    switch (tag) {
      case 'issue':
        return 'shield-check';
      case 'issuewild':
        return 'shield-alert';
      case 'iodef':
        return 'mail';
      default:
        return 'help-circle';
    }
  }

  function getTagDescription(tag: string): string {
    switch (tag) {
      case 'issue':
        return 'Authorized to issue certificates';
      case 'issuewild':
        return 'Authorized to issue wildcard certificates';
      case 'iodef':
        return 'Incident reporting contact';
      default:
        return 'Unknown CAA tag';
    }
  }

  async function copyResults() {
    if (!results) return;

    let text = `CAA Check for ${domainName}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;

    if (results.effective) {
      text += `Effective CAA Policy:\n`;
      text += `Domain: ${results.effective.domain}\n`;
      text += `Records:\n`;
      results.effective.records.forEach((record: string) => {
        text += `  ${record}\n`;
      });
      text += '\n';
    } else {
      text += `No CAA records found in the domain chain.\n\n`;
    }

    if (results.chain?.length > 0) {
      text += `CAA Chain (walked up from ${domainName}):\n`;
      results.chain.forEach((item: unknown, index: number) => {
        text += `${index + 1}. ${(item as any).domain}:\n`;
        (item as any).records.forEach((record: string) => {
          text += `   ${record}\n`;
        });
      });
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }

  function getDomainDepth(domain: string, baseDomain: string): number {
    const domainParts = domain.split('.');
    const baseParts = baseDomain.split('.');
    return domainParts.length - baseParts.length;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>CAA Effective Policy Checker</h1>
    <p>
      Check effective CAA (Certificate Authority Authorization) policies by walking up the domain label chain. Determine
      which Certificate Authorities are authorized to issue certificates for a domain.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>CAA Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Check CAA policy for ${example.domain}`}
          >
            <h5>{example.domain}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>CAA Policy Check</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="domain" use:tooltip={'Enter the domain name to check effective CAA policy for'}>
          Domain Name
          <input
            id="domain"
            type="text"
            bind:value={domainName}
            placeholder="example.com"
            class:invalid={domainName && !isValidDomainName(domainName.trim())}
            onchange={() => {
              clearExampleSelection();
              if (isInputValid()) checkCAA();
            }}
          />
          {#if domainName && !isValidDomainName(domainName.trim())}
            <span class="error-text">Invalid domain name format</span>
          {/if}
        </label>
      </div>

      <div class="action-section">
        <button class="check-btn lookup-btn" onclick={checkCAA} disabled={loading || !isInputValid}>
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Checking CAA...
          {:else}
            <Icon name="shield-check" size="sm" />
            Check CAA Policy
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>CAA Policy Results</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <span class={copiedState ? 'text-green-500' : ''}
            ><Icon name={copiedState ? 'check' : 'copy'} size="xs" /></span
          >
          {copiedState ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- Effective Policy -->
        <div class="effective-section">
          <h4>Effective CAA Policy</h4>
          {#if results.effective}
            <div class="effective-policy">
              <div class="effective-header">
                <span class="text-success"><Icon name="shield-check" size="md" /></span>
                <div>
                  <h5>Policy found at: <span class="domain-name">{results.effective.domain}</span></h5>
                  <p>This domain has CAA records that control certificate issuance</p>
                </div>
              </div>

              <div class="caa-records">
                {#each results.effective.records as record, index (index)}
                  {@const parsed = parseCAA(record)}
                  {#if parsed}
                    <div class="caa-record {getTagColor(parsed.tag)}">
                      <div class="caa-header">
                        <Icon name={getTagIcon(parsed.tag)} size="sm" />
                        <div class="caa-info">
                          <span class="caa-tag">{parsed.tag}</span>
                          <span class="caa-description">{getTagDescription(parsed.tag)}</span>
                        </div>
                        <span
                          class="caa-flag"
                          use:tooltip={parsed.flag === 128
                            ? 'Critical flag set - unknown properties must be ignored'
                            : 'Standard flag'}
                        >
                          Flag: {parsed.flag}
                        </span>
                      </div>
                      <div class="caa-value">
                        <code>{parsed.value}</code>
                      </div>
                    </div>
                  {:else}
                    <div class="caa-record secondary">
                      <div class="caa-raw">
                        <code>{record}</code>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {:else}
            <div class="no-policy">
              <span class="text-warning"><Icon name="shield-off" size="md" /></span>
              <div>
                <h5>No CAA policy found</h5>
                <p>No CAA records found in the domain chain for <code>{domainName}</code></p>
                <p class="implication">This means any Certificate Authority can issue certificates for this domain.</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Single Level Info -->
        {#if results.chain?.length === 1 && results.effective}
          <div class="chain-section">
            <div class="single-level-info">
              <Icon name="info" size="sm" />
              <div>
                <h5>Top-level CAA Policy</h5>
                <p>
                  CAA records found directly on <code>{results.effective.domain}</code> - no domain tree traversal required.
                </p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Domain Chain -->
        {#if results.chain?.length > 1}
          <div class="chain-section">
            <h4>CAA Lookup Chain</h4>
            <p class="chain-description">
              CAA records are looked up by walking up the domain tree until a CAA record is found or the root is
              reached.
            </p>

            <div class="domain-chain">
              {#each results.chain as item, index (index)}
                {@const isEffective = item.domain === results.effective?.domain}
                <div class="chain-item {isEffective ? 'effective' : 'empty'}">
                  <div class="chain-connector">
                    {#if index > 0}
                      <div class="connector-line"></div>
                      <Icon name="arrow-up" size="xs" />
                    {/if}
                  </div>

                  <div class="chain-content">
                    <div class="chain-header">
                      <div class="domain-info">
                        <span class="domain-name">{item.domain}</span>
                        <span class="domain-depth">
                          {getDomainDepth(item.domain, results.chain[results.chain.length - 1].domain)} level{getDomainDepth(
                            item.domain,
                            results.chain[results.chain.length - 1].domain,
                          ) !== 1
                            ? 's'
                            : ''} up
                        </span>
                      </div>
                      {#if isEffective}
                        <span class="effective-badge">
                          <Icon name="shield-check" size="xs" />
                          Effective
                        </span>
                      {:else}
                        <span class="empty-badge">
                          <Icon name="minus" size="xs" />
                          No CAA
                        </span>
                      {/if}
                    </div>

                    {#if item.records?.length > 0}
                      <div class="chain-records">
                        {#each item.records as record, index (index)}
                          <div class="chain-record">
                            <code>{record}</code>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>CAA Check Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>Understanding CAA Records</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>CAA Record Format</h4>
          <div class="format-example">
            <code>flag tag "value"</code>
          </div>
          <ul>
            <li><strong>Flag:</strong> 0 (non-critical) or 128 (critical)</li>
            <li><strong>Tag:</strong> issue, issuewild, or iodef</li>
            <li><strong>Value:</strong> CA domain or contact information</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>CAA Tags</h4>
          <div class="tag-explanations">
            <div class="tag-explanation">
              <strong>issue:</strong> Authorizes a CA to issue certificates for the domain
            </div>
            <div class="tag-explanation">
              <strong>issuewild:</strong> Authorizes a CA to issue wildcard certificates
            </div>
            <div class="tag-explanation">
              <strong>iodef:</strong> Specifies a URL/email for incident reporting
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>CAA Lookup Process</h4>
          <ol>
            <li>Check for CAA records at the requested domain</li>
            <li>If none found, check the parent domain</li>
            <li>Continue up the tree until CAA records are found</li>
            <li>If no CAA records exist, any CA can issue certificates</li>
          </ol>
        </div>

        <div class="info-section">
          <h4>Common CAA Examples</h4>
          <div class="caa-examples">
            <div class="caa-example">
              <code>0 issue "letsencrypt.org"</code>
              <span>Allow Let's Encrypt to issue certificates</span>
            </div>
            <div class="caa-example">
              <code>0 issuewild ";"</code>
              <span>Prohibit wildcard certificate issuance</span>
            </div>
            <div class="caa-example">
              <code>0 iodef "mailto:security@example.com"</code>
              <span>Report policy violations to security team</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  // Page-specific styles - shared styles removed
  // Use shared .lookup-btn instead of .check-btn

  .action-section {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-xl);
  }

  .effective-section,
  .chain-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .effective-policy {
    background: var(--bg-secondary);
    border: 2px solid var(--color-success);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .effective-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    h5 {
      margin: 0;
      color: var(--text-primary);

      .domain-name {
        font-family: var(--font-mono);
        color: var(--color-success);
      }
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .caa-records {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .caa-record {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-left: 4px solid;

    &.primary {
      border-left-color: var(--color-primary);
    }

    &.warning {
      border-left-color: var(--color-warning);
    }

    &.secondary {
      border-left-color: var(--text-secondary);
    }
  }

  .caa-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .caa-info {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .caa-tag {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .caa-description {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .caa-flag {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .caa-value {
    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }
  }

  .no-policy {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: var(--bg-warning);
    border: 2px solid var(--color-warning);
    border-radius: var(--radius-md);

    h5 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    p {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-secondary);

      code {
        background: var(--bg-secondary);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--font-mono);
      }
    }

    .implication {
      font-weight: 500;
      color: var(--color-warning) !important;
    }
  }

  .single-level-info {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);

    h5 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-xs);

      code {
        background: var(--bg-primary);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--font-mono);
      }
    }
  }

  .chain-description {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-sm);
  }

  .domain-chain {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .chain-item {
    display: flex;
    gap: var(--spacing-md);

    &.effective {
      .chain-content {
        border-color: var(--color-success);
        background: var(--bg-success);
      }
    }

    &.empty {
      .chain-content {
        border-color: var(--border-color);
        background: var(--bg-secondary);
        opacity: 0.7;
      }
    }
  }

  .chain-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 24px;
    padding-top: var(--spacing-sm);

    .connector-line {
      width: 2px;
      height: var(--spacing-md);
      background: var(--border-color);
      margin-bottom: var(--spacing-xs);
    }
  }

  .chain-content {
    flex: 1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .chain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .domain-info {
    display: flex;
    flex-direction: column;
  }

  .domain-name {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-weight: 600;
  }

  .domain-depth {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .effective-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-success);
    color: var(--bg-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .empty-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--text-secondary);
    color: var(--bg-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .chain-records {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .chain-record {
    padding: var(--spacing-xs);
    background: var(--bg-primary);
    border-radius: var(--radius-sm);

    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      font-size: var(--font-size-xs);
    }
  }

  // Educational content specific to CAA
  .info-card {
    background: var(--bg-tertiary);
  }

  .format-example {
    background: var(--bg-secondary);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-sm);

    code {
      font-family: var(--font-mono);
      color: var(--text-primary);
    }
  }

  .tag-explanations,
  .caa-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .tag-explanation,
  .caa-example {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    code {
      background: var(--bg-secondary);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: var(--font-mono);
      color: var(--text-primary);
      margin-right: var(--spacing-xs);
    }
  }

  .text-success {
    color: var(--color-success);
  }

  .text-warning {
    color: var(--color-warning);
  }
</style>
