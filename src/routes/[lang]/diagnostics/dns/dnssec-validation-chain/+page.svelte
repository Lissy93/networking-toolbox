<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';
  import '../../../../../styles/diagnostics-pages.scss';

  let domain = $state('');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = $derived([
    {
      domain: $t('diagnostics/dns-dnssec-validation-chain.examples.items.govuk.domain'),
      description: $t('diagnostics/dns-dnssec-validation-chain.examples.items.govuk.description'),
    },
    {
      domain: $t('diagnostics/dns-dnssec-validation-chain.examples.items.cloudflare.domain'),
      description: $t('diagnostics/dns-dnssec-validation-chain.examples.items.cloudflare.description'),
    },
    {
      domain: $t('diagnostics/dns-dnssec-validation-chain.examples.items.failed.domain'),
      description: $t('diagnostics/dns-dnssec-validation-chain.examples.items.failed.description'),
    },
    {
      domain: $t('diagnostics/dns-dnssec-validation-chain.examples.items.google.domain'),
      description: $t('diagnostics/dns-dnssec-validation-chain.examples.items.google.description'),
    },
    {
      domain: $t('diagnostics/dns-dnssec-validation-chain.examples.items.isc.domain'),
      description: $t('diagnostics/dns-dnssec-validation-chain.examples.items.isc.description'),
    },
    {
      domain: $t('diagnostics/dns-dnssec-validation-chain.examples.items.ietf.domain'),
      description: $t('diagnostics/dns-dnssec-validation-chain.examples.items.ietf.description'),
    },
  ]);

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
      error = $t('diagnostics/dns-dnssec-validation-chain.error.invalidDomain');
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
        throw new Error(data.message || $t('diagnostics/dns-dnssec-validation-chain.error.validationFailed'));
      }

      results = data;
    } catch (err) {
      error = err instanceof Error ? err.message : $t('diagnostics/dns-dnssec-validation-chain.error.unexpectedError');
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
    <h1>{$t('diagnostics/dns-dnssec-validation-chain.title')}</h1>
    <p>{$t('diagnostics/dns-dnssec-validation-chain.subtitle')}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('diagnostics/dns-dnssec-validation-chain.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={$t(
              `diagnostics/dns-dnssec-validation-chain.examples.items.${['govuk', 'cloudflare', 'failed', 'google', 'isc', 'ietf'][i]}.tooltip`,
            )}
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
      <h3>{$t('diagnostics/dns-dnssec-validation-chain.form.title')}</h3>
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
          <label for="domain">{$t('diagnostics/dns-dnssec-validation-chain.form.domainLabel')}</label>
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder={$t('diagnostics/dns-dnssec-validation-chain.form.domainPlaceholder')}
            disabled={loading}
            onchange={() => clearExampleSelection()}
          />
        </div>

        <button type="submit" disabled={loading || !isInputValid} class="primary submit-btn">
          {#if loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('diagnostics/dns-dnssec-validation-chain.form.validating')}
          {:else}
            <Icon name="shield" size="sm" />
            {$t('diagnostics/dns-dnssec-validation-chain.form.validateButton')}
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
            <strong>{$t('diagnostics/dns-dnssec-validation-chain.error.title')}</strong>
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
            <h3>{$t('diagnostics/dns-dnssec-validation-chain.loading.title')}</h3>
            <p>{$t('diagnostics/dns-dnssec-validation-chain.loading.message', { domain })}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h3>{$t('diagnostics/dns-dnssec-validation-chain.results.title')}</h3>
      </div>
      <div class="card-content">
        <!-- Summary -->
        <div class="card summary-section" class:valid={results.valid} class:invalid={!results.valid}>
          <div class="card-header">
            <h3>
              {#if results.valid}
                <Icon name="check-circle" size="sm" />
                {$t('diagnostics/dns-dnssec-validation-chain.results.summary.valid')}
              {:else}
                <Icon name="x-circle" size="sm" />
                {$t('diagnostics/dns-dnssec-validation-chain.results.summary.invalid')}
              {/if}
            </h3>
          </div>
          <div class="card-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{$t('diagnostics/dns-dnssec-validation-chain.results.summary.domain')}</span>
                <span class="info-value">{results.domain}</span>
              </div>
              <div class="info-item">
                <span class="info-label"
                  >{$t('diagnostics/dns-dnssec-validation-chain.results.summary.chainLinks')}</span
                >
                <span class="info-value">{results.summary.totalLinks}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{$t('diagnostics/dns-dnssec-validation-chain.results.summary.validated')}</span
                >
                <span class="info-value">{results.summary.validatedLinks}/{results.summary.totalLinks}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{$t('diagnostics/dns-dnssec-validation-chain.results.summary.status')}</span>
                <span class="info-value" class:success={results.valid} class:error={!results.valid}>
                  {results.valid
                    ? $t('diagnostics/dns-dnssec-validation-chain.results.summary.secure')
                    : $t('diagnostics/dns-dnssec-validation-chain.results.summary.brokenChain')}
                </span>
              </div>
            </div>

            {#if results.summary.errors.length > 0}
              <div class="errors-section">
                <h4>{$t('diagnostics/dns-dnssec-validation-chain.results.summary.errors')}</h4>
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
            <h3>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.title')}</h3>
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
                        <span class="level"
                          >{$t('diagnostics/dns-dnssec-validation-chain.results.chain.level', {
                            level: link.level,
                          })}</span
                        >
                      </h4>
                    </div>
                  </div>

                  <div class="link-body">
                    <!-- DS Records -->
                    {#if link.ds && link.ds.length > 0}
                      <div class="record-section">
                        <h5 use:tooltip={$t('diagnostics/dns-dnssec-validation-chain.results.chain.ds.tooltip')}>
                          <Icon name="key" size="xs" />
                          {$t('diagnostics/dns-dnssec-validation-chain.results.chain.ds.title')}
                        </h5>
                        {#each link.ds as ds, j (j)}
                          <div class="record-item">
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.ds.keyTagTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.ds.keyTag')}</span
                              >
                              <code>{ds.keyTag}</code>
                            </div>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.ds.algorithmTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.ds.algorithm')}</span
                              >
                              <code>{getAlgorithmName(ds.algorithm)}</code>
                            </div>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.ds.digestTypeTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.ds.digestType')}</span
                              >
                              <code>{getDigestTypeName(ds.digestType)}</code>
                            </div>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t('diagnostics/dns-dnssec-validation-chain.results.chain.ds.hashTooltip')}
                                >{$t('diagnostics/dns-dnssec-validation-chain.results.chain.ds.hash')}</span
                              >
                              <code class="hash">{ds.digest.substring(0, 40)}...</code>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <!-- DNSKEY Records -->
                    {#if link.dnskey && link.dnskey.length > 0}
                      <div class="record-section">
                        <h5 use:tooltip={$t('diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.tooltip')}>
                          <Icon name="lock" size="xs" />
                          {$t('diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.title')}
                        </h5>
                        {#each link.dnskey as key, j (j)}
                          <div class="record-item" class:matched={key.matched}>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.keyTagTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.keyTag')}</span
                              >
                              <code>{key.keyTag}</code>
                              {#if key.matched}
                                <span
                                  class="badge success"
                                  use:tooltip={$t(
                                    'diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.matchedDSTooltip',
                                  )}
                                  >{$t('diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.matchedDS')}</span
                                >
                              {/if}
                            </div>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.flagsTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.flags')}</span
                              >
                              <code>{key.flags}</code>
                              {#if key.isKSK}
                                <span
                                  class="badge info"
                                  use:tooltip={$t(
                                    'diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.kskTooltip',
                                  )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.ksk')}</span
                                >
                              {/if}
                              {#if key.isZSK}
                                <span
                                  class="badge info"
                                  use:tooltip={$t(
                                    'diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.zskTooltip',
                                  )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.zsk')}</span
                                >
                              {/if}
                            </div>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.algorithmTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.dnskey.algorithm')}</span
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
                        <h5 use:tooltip={$t('diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.tooltip')}>
                          <Icon name="signature" size="xs" />
                          {$t('diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.title')}
                        </h5>
                        {#each link.rrsig as sig, j (j)}
                          <div class="record-item" class:valid={sig.valid} class:invalid={!sig.valid}>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.typeCoveredTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.typeCovered')}</span
                              >
                              <code>{sig.typeCovered}</code>
                              {#if sig.valid}
                                <span
                                  class="badge success"
                                  use:tooltip={$t(
                                    'diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.validTooltip',
                                  )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.valid')}</span
                                >
                              {:else}
                                <span
                                  class="badge error"
                                  use:tooltip={$t(
                                    'diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.invalidTooltip',
                                  )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.invalid')}</span
                                >
                              {/if}
                            </div>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.keyTagTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.keyTag')}</span
                              >
                              <code>{sig.keyTag}</code>
                            </div>
                            <div class="record-details">
                              <span
                                class="label"
                                use:tooltip={$t(
                                  'diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.signerTooltip',
                                )}>{$t('diagnostics/dns-dnssec-validation-chain.results.chain.rrsig.signer')}</span
                              >
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
                          {$t('diagnostics/dns-dnssec-validation-chain.results.chain.errors.title')}
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
