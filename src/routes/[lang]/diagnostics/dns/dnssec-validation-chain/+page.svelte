<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../../styles/diagnostics-pages.scss';

  let domain = $state('');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { domain: 'gov.uk', description: 'UK Government (DNSSEC Enabled)' },
    { domain: 'cloudflare.com', description: 'Cloudflare (DNSSEC Enabled)' },
    { domain: 'dnssec-failed.org', description: 'DNSSEC Failed Test' },
    { domain: 'google.com', description: 'Google (DNSSEC Enabled)' },
    { domain: 'isc.org', description: 'ISC (DNSSEC Pioneer)' },
    { domain: 'ietf.org', description: 'IETF (DNSSEC Enabled)' },
  ];

  const isInputValid = $derived(() => {
    const trimmed = domain.trim();
    if (!trimmed) return false;
    // Basic domain validation
    const domainPattern =
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainPattern.test(trimmed);
  });

  async function validateChain() {
    if (!isInputValid) {
      error = 'Please enter a valid domain name';
      return;
    }

    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dnssec-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'DNSSEC validation failed');
      }

      results = data;
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unexpected error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    domain = example.domain;
    selectedExampleIndex = index;
    validateChain();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function getAlgorithmName(algo: number): string {
    const algorithms: Record<number, string> = {
      5: 'RSA/SHA-1',
      7: 'RSASHA1-NSEC3-SHA1',
      8: 'RSA/SHA-256',
      10: 'RSA/SHA-512',
      13: 'ECDSA P-256/SHA-256',
      14: 'ECDSA P-384/SHA-384',
      15: 'Ed25519',
      16: 'Ed448',
    };
    return algorithms[algo] || `Algorithm ${algo}`;
  }

  function getDigestTypeName(type: number): string {
    const types: Record<number, string> = {
      1: 'SHA-1',
      2: 'SHA-256',
      3: 'GOST R 34.11-94',
      4: 'SHA-384',
    };
    return types[type] || `Type ${type}`;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DNSSEC Validation Chain Checker</h1>
    <p>Validate DNSSEC chain from root to domain, verify DS/DNSKEY matching and RRSIG signatures</p>
  </header>

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
            use:tooltip={`Check DNSSEC for ${example.domain}`}
          >
            <h5>{example.description}</h5>
            <p>{example.domain}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Domain Name</h3>
    </div>
    <div class="card-content">
      <form
        class="inline-form"
        onsubmit={(e) => {
          e.preventDefault();
          validateChain();
        }}
      >
        <div class="form-group flex-grow">
          <label for="domain">Domain to Validate</label>
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder="example.com"
            disabled={loading}
            onchange={() => clearExampleSelection()}
          />
        </div>

        <button type="submit" disabled={loading || !isInputValid} class="primary submit-btn">
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            Validating...
          {:else}
            <Icon name="shield" size="sm" />
            Validate DNSSEC Chain
          {/if}
        </button>
      </form>
    </div>
  </div>

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>Validation Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="card">
      <div class="card-content">
        <div class="loading-state">
          <Icon name="loader" size="lg" animate="spin" />
          <div class="loading-text">
            <h3>Validating DNSSEC Chain</h3>
            <p>Querying DNS records from root to {domain}...</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h3>DNSSEC Validation Results</h3>
      </div>
      <div class="card-content">
        <!-- Summary -->
        <div class="card summary-section" class:valid={results.valid} class:invalid={!results.valid}>
          <div class="card-header">
            <h3>
              {#if results.valid}
                <Icon name="check-circle" size="sm" />
                DNSSEC Valid
              {:else}
                <Icon name="x-circle" size="sm" />
                DNSSEC Invalid
              {/if}
            </h3>
          </div>
          <div class="card-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Domain:</span>
                <span class="info-value">{results.domain}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Chain Links:</span>
                <span class="info-value">{results.summary.totalLinks}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Validated:</span>
                <span class="info-value">{results.summary.validatedLinks}/{results.summary.totalLinks}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value" class:success={results.valid} class:error={!results.valid}>
                  {results.valid ? 'Secure' : 'Broken Chain'}
                </span>
              </div>
            </div>

            {#if results.summary.errors.length > 0}
              <div class="errors-section">
                <h4>Validation Errors:</h4>
                <ul>
                  {#each results.summary.errors as err, i (i)}
                    <li>{err}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>

        <!-- Chain Links -->
        <div class="chain-section">
          <div class="card-header">
            <h3>DNSSEC Chain</h3>
          </div>
          <div class="card-content">
            <div class="chain-visualization">
              {#each results.chain as link, i (i)}
                <div class="chain-link" class:validated={link.validated} class:invalid={!link.validated}>
                  <div class="link-header">
                    <div class="link-title">
                      {#if link.validated}
                        <Icon name="check-circle" size="sm" />
                      {:else}
                        <Icon name="alert-circle" size="sm" />
                      {/if}
                      <h4>
                        {link.name}
                        <span class="level">Level {link.level}</span>
                      </h4>
                    </div>
                  </div>

                  <div class="link-body">
                    <!-- DS Records -->
                    {#if link.ds && link.ds.length > 0}
                      <div class="record-section">
                        <h5 use:tooltip={'Delegation Signer records link this zone to the parent zone'}>
                          <Icon name="key" size="xs" />
                          DS Records
                        </h5>
                        {#each link.ds as ds, j (j)}
                          <div class="record-item">
                            <div class="record-details">
                              <span class="label" use:tooltip={'Identifier for the DNSKEY this DS record refers to'}
                                >Key Tag:</span
                              >
                              <code>{ds.keyTag}</code>
                            </div>
                            <div class="record-details">
                              <span class="label" use:tooltip={'Cryptographic algorithm used for signing'}
                                >Algorithm:</span
                              >
                              <code>{getAlgorithmName(ds.algorithm)}</code>
                            </div>
                            <div class="record-details">
                              <span class="label" use:tooltip={'Hash algorithm used to create the digest'}
                                >Digest Type:</span
                              >
                              <code>{getDigestTypeName(ds.digestType)}</code>
                            </div>
                            <div class="record-details">
                              <span class="label" use:tooltip={'Hash of the DNSKEY record'}>Hash:</span>
                              <code class="hash">{ds.digest.substring(0, 40)}...</code>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- DNSKEY Records -->
                    {#if link.dnskey && link.dnskey.length > 0}
                      <div class="record-section">
                        <h5 use:tooltip={'Public keys used to verify DNSSEC signatures'}>
                          <Icon name="lock" size="xs" />
                          DNSKEY Records
                        </h5>
                        {#each link.dnskey as key, j (j)}
                          <div class="record-item" class:matched={key.matched}>
                            <div class="record-details">
                              <span class="label" use:tooltip={'Identifier for this DNSKEY'}>Key Tag:</span>
                              <code>{key.keyTag}</code>
                              {#if key.matched}
                                <span
                                  class="badge success"
                                  use:tooltip={'This DNSKEY matches a DS record in the parent zone'}>Matched DS</span
                                >
                              {/if}
                            </div>
                            <div class="record-details">
                              <span class="label" use:tooltip={'Key properties: 256=ZSK, 257=KSK'}>Flags:</span>
                              <code>{key.flags}</code>
                              {#if key.isKSK}
                                <span class="badge info" use:tooltip={'Key Signing Key - signs other DNSKEYs'}>KSK</span
                                >
                              {/if}
                              {#if key.isZSK}
                                <span class="badge info" use:tooltip={'Zone Signing Key - signs zone data'}>ZSK</span>
                              {/if}
                            </div>
                            <div class="record-details">
                              <span class="label" use:tooltip={'Cryptographic algorithm used for signing'}
                                >Algorithm:</span
                              >
                              <code>{getAlgorithmName(key.algorithm)}</code>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- RRSIG Records -->
                    {#if link.rrsig && link.rrsig.length > 0}
                      <div class="record-section">
                        <h5 use:tooltip={'Digital signatures created with DNSKEY to authenticate DNS data'}>
                          <Icon name="signature" size="xs" />
                          RRSIG Records
                        </h5>
                        {#each link.rrsig as sig, j (j)}
                          <div class="record-item" class:valid={sig.valid} class:invalid={!sig.valid}>
                            <div class="record-details">
                              <span class="label" use:tooltip={'DNS record type this signature covers'}
                                >Type Covered:</span
                              >
                              <code>{sig.typeCovered}</code>
                              {#if sig.valid}
                                <span class="badge success" use:tooltip={'Signature is valid and within time window'}
                                  >Valid</span
                                >
                              {:else}
                                <span class="badge error" use:tooltip={'Signature is expired or not yet valid'}
                                  >Invalid</span
                                >
                              {/if}
                            </div>
                            <div class="record-details">
                              <span class="label" use:tooltip={'Identifies which DNSKEY created this signature'}
                                >Key Tag:</span
                              >
                              <code>{sig.keyTag}</code>
                            </div>
                            <div class="record-details">
                              <span class="label" use:tooltip={'Zone that created this signature'}>Signer:</span>
                              <code>{sig.signerName}</code>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- Errors -->
                    {#if link.errors && link.errors.length > 0}
                      <div class="record-section errors">
                        <h5>
                          <Icon name="alert-triangle" size="xs" />
                          Errors
                        </h5>
                        <ul>
                          {#each link.errors as err, j (j)}
                            <li>{err}</li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
                  </div>
                </div>

                {#if i < results.chain.length - 1}
                  <div class="chain-arrow">
                    <Icon name="arrow-down" size="sm" />
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .results-card {
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);

      .card {
        width: 100%;
      }
    }
  }

  .summary-section {
    &.valid {
      border-left: 4px solid var(--color-success);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-success), transparent 95%),
        color-mix(in srgb, var(--color-success), transparent 98%)
      );
    }

    &.invalid {
      border-left: 4px solid var(--color-error);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-error), transparent 95%),
        color-mix(in srgb, var(--color-error), transparent 98%)
      );
    }

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }

  .info-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-weight: 600;
    color: var(--text-primary);

    &.success {
      color: var(--color-success);
    }

    &.error {
      color: var(--color-error);
    }
  }

  .errors-section {
    h4 {
      color: var(--color-error);
      margin-bottom: var(--spacing-sm);
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: var(--spacing-xs) 0;
        color: var(--text-secondary);
        font-size: var(--font-size-sm);

        &::before {
          content: '• ';
          color: var(--color-error);
        }
      }
    }
  }

  .chain-visualization {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .chain-link {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background: var(--bg-secondary);
    overflow: hidden;

    &.validated {
      border-left: 4px solid var(--color-success);
    }

    &.invalid {
      border-left: 4px solid var(--color-error);
    }
  }

  .link-header {
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
  }

  .link-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    h4 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .level {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-weight: normal;
    }
  }

  .link-body {
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .record-section {
    h5 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    &.errors {
      background: var(--bg-tertiary);
      padding: var(--spacing-sm);
      border-radius: var(--radius-md);

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          color: var(--color-error);
          font-size: var(--font-size-sm);
          padding: var(--spacing-2xs) 0;

          &::before {
            content: '⚠ ';
          }
        }
      }
    }
  }

  .record-item {
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    margin-bottom: var(--spacing-sm);

    &:last-child {
      margin-bottom: 0;
    }

    &.matched {
      border-color: var(--color-success);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-success), transparent 97%),
        color-mix(in srgb, var(--color-success), transparent 99%)
      );
    }

    &.valid {
      border-color: color-mix(in srgb, var(--color-success), transparent 60%);
    }

    &.invalid {
      border-color: color-mix(in srgb, var(--color-error), transparent 60%);
    }
  }

  .record-details {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-2xs) 0;
    flex-wrap: wrap;

    .label {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      min-width: 100px;
    }

    code {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);

      &.hash {
        word-break: break-all;
      }
    }
  }

  .badge {
    font-size: var(--font-size-xs);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-weight: 500;

    &.success {
      background: var(--color-success);
      color: var(--bg-primary);
    }

    &.error {
      background: var(--color-error);
      color: var(--bg-primary);
    }

    &.info {
      background: var(--color-info);
      color: var(--bg-primary);
    }
  }

  .chain-arrow {
    display: flex;
    justify-content: center;
    color: var(--text-secondary);
    margin: var(--spacing-xs) 0;
  }

  .inline-form {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-end;
    flex-wrap: wrap;

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2xs);
      min-width: 200px;
      margin: 0;

      &.flex-grow {
        flex: 1;
      }

      label {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        font-weight: 500;
      }

      input {
        padding: var(--spacing-sm);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: var(--font-size-md);
        transition: border-color var(--transition-fast);

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }

    .submit-btn {
      white-space: nowrap;
    }
  }

  // Mobile responsiveness improvements
  @media (max-width: 768px) {
    .inline-form {
      .submit-btn {
        width: 100%;
      }
    }

    .info-grid {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .record-details {
      flex-direction: column;
      align-items: flex-start;

      .label {
        min-width: auto;
        font-weight: 600;
      }
    }

    .chain-link {
      .link-header {
        padding: var(--spacing-sm);
      }

      .link-body {
        padding: var(--spacing-sm);
      }
    }

    .record-item {
      padding: var(--spacing-xs);
    }
  }

  @media (max-width: 480px) {
    .info-grid {
      grid-template-columns: 1fr;
    }

    .badge {
      font-size: var(--font-size-2xs);
      padding: 1px 6px;
    }

    .record-details {
      code {
        font-size: var(--font-size-xs);
        word-break: break-all;
      }
    }
  }
</style>
