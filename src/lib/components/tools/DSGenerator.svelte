<script lang="ts">
  import {
    parseDNSKEYRecord,
    generateDSRecord,
    validateDNSKEY,
    formatDSRecord,
    DNSSEC_ALGORITHMS,
    DS_DIGEST_TYPES,
  } from '$lib/utils/dnssec';
  import type { DSRecord } from '$lib/utils/dnssec';
  import { useClipboard } from '$lib/composables';
  import Icon from '$lib/components/global/Icon.svelte';

  let dnskeyInput = $state('');
  let ownerName = $state('example.com.');
  let selectedDigestTypes = $state([2]); // SHA-256 by default
  let activeExampleIndex = $state(-1);

  const examples = [
    {
      title: 'KSK for Root Zone',
      dnskey:
        '. IN DNSKEY 257 3 8 AwEAAag/8pPvt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuP',
      owner: '.',
    },
    {
      title: 'Example.com KSK',
      dnskey:
        'example.com. IN DNSKEY 257 3 13 kC1gJ+0qtVgdl0VAO/6t9vRaB15v4PclEV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuP',
      owner: 'example.com.',
    },
    {
      title: 'Subdomain KSK',
      dnskey:
        'secure.example.org. IN DNSKEY 257 3 8 AwEAAag/8pPvt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuP',
      owner: 'secure.example.org.',
    },
  ];

  const digestTypeOptions = [
    { value: 1, label: 'SHA-1', recommended: false },
    { value: 2, label: 'SHA-256', recommended: true },
    { value: 4, label: 'SHA-384', recommended: true },
  ];

  let generatingDS = $state(false);
  let dsRecords = $state<DSRecord[]>([]);
  let error = $state<string | null>(null);
  const clipboard = useClipboard();

  async function generateDS() {
    error = null;
    dsRecords = [];
    generatingDS = true;

    try {
      const validation = validateDNSKEY(dnskeyInput);
      if (!validation.valid) {
        error = validation.error || 'Invalid DNSKEY';
        return;
      }

      const dnskey = parseDNSKEYRecord(dnskeyInput);
      if (!dnskey) {
        error = 'Failed to parse DNSKEY record';
        return;
      }

      const normalizedOwner = ownerName.trim() || 'example.com.';
      const records: DSRecord[] = [];

      for (const digestType of selectedDigestTypes) {
        const ds = await generateDSRecord(dnskey, normalizedOwner, digestType);
        if (ds) {
          records.push(ds);
        }
      }

      dsRecords = records;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate DS records';
    } finally {
      generatingDS = false;
    }
  }

  const isValid = $derived(() => {
    return dnskeyInput.trim() && ownerName.trim() && selectedDigestTypes.length > 0;
  });

  function loadExample(index: number) {
    const example = examples[index];
    dnskeyInput = example.dnskey;
    ownerName = example.owner;
    activeExampleIndex = index;
    generateDS();
  }

  function handleInput() {
    activeExampleIndex = -1;
    error = null;
    dsRecords = [];
    if (isValid()) {
      generateDS();
    }
  }

  function toggleDigestType(type: number) {
    if (selectedDigestTypes.includes(type)) {
      selectedDigestTypes = selectedDigestTypes.filter((t) => t !== type);
    } else {
      selectedDigestTypes = [...selectedDigestTypes, type];
    }
    if (isValid()) {
      generateDS();
    }
  }

  function copyDS(ds: DSRecord) {
    const formatted = formatDSRecord(ds, ownerName);
    const key = `ds-${ds.keyTag}-${ds.digestType}`;
    clipboard.copy(formatted, key);
  }

  function copyAllDS() {
    const formatted = dsRecords.map((ds) => formatDSRecord(ds, ownerName)).join('\n');
    clipboard.copy(formatted, 'all');
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DS Record Generator</h1>
    <p>
      Generate DS records (SHA-1/256/384) from a DNSKEY or public key, with copyable output for parent zone submission.
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>DNSKEY Examples</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button class="example-card" class:active={activeExampleIndex === i} onclick={() => loadExample(i)}>
            <div class="example-title">{example.title}</div>
            <div class="example-owner">Owner: <code>{example.owner}</code></div>
            <div class="example-dnskey"><code>{example.dnskey}</code></div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="input-form-layout">
      <div class="inputs-section">
        <div class="input-group">
          <label for="owner-input">
            <Icon name="globe" size="sm" />
            Owner Name (FQDN)
          </label>
          <input id="owner-input" type="text" bind:value={ownerName} oninput={handleInput} placeholder="example.com." />
        </div>

        <div class="input-group">
          <label for="dnskey-input">
            <Icon name="key" size="sm" />
            DNSKEY Record
          </label>
          <textarea
            id="dnskey-input"
            bind:value={dnskeyInput}
            oninput={handleInput}
            placeholder="example.com. IN DNSKEY 257 3 8 AwEAAag/8pPvt1p1YKzY7mD5oCwr..."
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="digest-section">
        <div class="digest-header">
          <Icon name="hash" size="sm" />
          <span>Digest Types</span>
        </div>
        <div class="digest-options">
          {#each digestTypeOptions as option (option.value)}
            <label class="digest-option" class:recommended={option.recommended}>
              <input
                type="checkbox"
                checked={selectedDigestTypes.includes(option.value)}
                onchange={() => toggleDigestType(option.value)}
              />
              <span class="checkmark"></span>
              <div class="option-info">
                <span class="digest-name">{option.label}</span>
                {#if option.recommended}
                  <span class="recommended-badge">Recommended</span>
                {/if}
              </div>
            </label>
          {/each}
        </div>
      </div>
    </div>

    <button class="generate-btn" class:loading={generatingDS} disabled={!isValid || generatingDS} onclick={generateDS}>
      {#if generatingDS}
        <Icon name="loader" size="sm" />
        <span>Generating DS Records...</span>
      {:else}
        <Icon name="shield" size="sm" />
        <span>Generate DS Records</span>
      {/if}
    </button>
  </div>

  {#if error}
    <div class="card error">
      <div class="card-header">
        <Icon name="alert-triangle" />
        <h3>Generation Error</h3>
      </div>
      <p>{error}</p>
    </div>
  {/if}

  {#if dsRecords.length > 0}
    <div class="results">
      <div class="card success">
        <div class="card-header">
          <div class="header-content">
            <Icon name="shield" />
            <h3>Generated DS Records</h3>
          </div>
          <button
            class="copy-btn"
            class:copied={clipboard.isCopied('all')}
            onclick={copyAllDS}
            title="Copy all DS records"
          >
            <Icon name={clipboard.isCopied('all') ? 'check' : 'copy'} />
            Copy All
          </button>
        </div>

        <div class="ds-records">
          {#each dsRecords as ds (`${ds.keyTag}-${ds.digestType}`)}
            <div class="ds-record">
              <div class="ds-header">
                <div class="digest-info">
                  <span class="digest-type">{DS_DIGEST_TYPES[ds.digestType as keyof typeof DS_DIGEST_TYPES]}</span>
                  <span class="key-tag">Key Tag: {ds.keyTag}</span>
                </div>
                <button
                  class="copy-btn small"
                  class:copied={clipboard.isCopied(`ds-${ds.keyTag}-${ds.digestType}`)}
                  onclick={() => copyDS(ds)}
                  title="Copy this DS record"
                >
                  <Icon name={clipboard.isCopied(`ds-${ds.keyTag}-${ds.digestType}`) ? 'check' : 'copy'} />
                </button>
              </div>

              <div class="ds-content">
                <code>{formatDSRecord(ds, ownerName)}</code>
              </div>

              <div class="ds-details">
                <div class="detail-item">
                  <span class="label">Algorithm:</span>
                  <span class="value"
                    >{ds.algorithm} ({DNSSEC_ALGORITHMS[ds.algorithm as keyof typeof DNSSEC_ALGORITHMS] ||
                      'Unknown'})</span
                  >
                </div>
                <div class="detail-item">
                  <span class="label">Digest Type:</span>
                  <span class="value"
                    >{ds.digestType} ({DS_DIGEST_TYPES[ds.digestType as keyof typeof DS_DIGEST_TYPES]})</span
                  >
                </div>
                <div class="detail-item">
                  <span class="label">Digest:</span>
                  <span class="value digest">{ds.digest}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <div class="info-cards">
    <div class="card info">
      <div class="card-header">
        <h4>DS Record Purpose</h4>
      </div>
      <p>
        DS (Delegation Signer) records are published in the parent zone to establish a secure delegation to the child
        zone. They contain a hash of the child's KSK (Key Signing Key) and enable DNSSEC validators to verify the
        authenticity of the child zone's DNSKEY records.
      </p>
    </div>

    <div class="card warning">
      <div class="card-header">
        <h4>Digest Algorithm Recommendations</h4>
      </div>
      <p>
        <strong>SHA-256 and SHA-384</strong> are recommended for new deployments. <strong>SHA-1</strong> is deprecated but
        may still be required for compatibility with older systems. Most registrars accept multiple DS records with different
        digest types for redundancy.
      </p>
    </div>

    <div class="card info">
      <div class="card-header">
        <h4>Parent Zone Submission</h4>
      </div>
      <p>
        Submit the generated DS records to your parent zone operator (registrar for TLDs, hosting provider for
        subdomains). The DS records must be published in the parent zone before enabling DNSSEC signing in the child
        zone to maintain the chain of trust.
      </p>
    </div>
  </div>
</div>

<style lang="scss">
  .examples-card {
    padding: 0;
    background: var(--bg-tertiary);
    margin-bottom: var(--spacing-md);
  }
  .input-card {
    background: var(--bg-tertiary);
    margin-bottom: var(--spacing-md);
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
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .example-card {
    padding: var(--spacing-sm);
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

    .example-title {
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      margin-bottom: var(--spacing-xs);
    }

    .example-owner {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xs);
    }

    .example-dnskey code {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-family: var(--font-mono);
      word-break: break-all;
    }
  }

  .input-form-layout {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: var(--spacing-lg);
    }
  }

  .inputs-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-group {
    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }
  }

  input,
  textarea {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
    }
  }

  textarea {
    resize: vertical;
    min-height: 70px;
  }

  .digest-section {
    min-width: 200px;
    display: flex;
    flex-direction: column;
  }

  .digest-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .digest-options {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .digest-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
    }
    input[type='checkbox'] {
      display: none;
    }
  }

  .checkmark {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-xs);
    background: var(--bg-primary);
    position: relative;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .digest-option input:checked + .checkmark {
    background: var(--color-primary);
    border-color: var(--color-primary);

    &::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 1px;
      width: 4px;
      height: 8px;
      border: solid var(--bg-primary);
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  }

  .option-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    gap: var(--spacing-sm);
  }

  .digest-name {
    color: var(--text-primary);
  }

  .recommended-badge {
    margin: var(--spacing-xs) 0;
    background: var(--color-success);
    color: var(--bg-primary);
    padding: 0 var(--spacing-xs);
    border-radius: var(--radius-xs);
    font-size: var(--font-size-xs);
  }

  .generate-btn {
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
      background: var(--color-primary-hover);
    }

    &.loading {
      pointer-events: none;
    }
  }

  .card.error {
    background: color-mix(in srgb, var(--color-error) 10%, var(--bg-secondary));
    border-color: var(--color-error);

    .card-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);

      h3 {
        margin: 0;
        color: var(--text-primary);
      }
    }
  }

  .card.success {
    background: var(--bg-tertiary);
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);

      h3 {
        margin: 0;
        color: var(--text-primary);
      }
    }
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    transition: all var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success) 10%, transparent);
    }

    &.small {
      padding: var(--spacing-xs);
      font-size: var(--font-size-xs);
    }
  }

  .ds-records {
    display: grid;
    gap: var(--spacing-md);
  }

  .ds-record {
    background: var(--bg-primary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .ds-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }
  }

  .digest-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }
  }

  .digest-type {
    color: var(--color-primary);
    font-size: var(--font-size-sm);
  }

  .key-tag {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .ds-content {
    padding: var(--spacing-sm);

    code {
      display: block;
      font-family: var(--font-mono);
      font-size: var(--font-size-xs);
      color: var(--text-primary);
      word-break: break-all;
    }
  }

  .ds-details {
    padding: var(--spacing-sm);
    border-top: 1px solid var(--border-primary);
    display: grid;
    gap: var(--spacing-xs);
  }

  .detail-item {
    display: flex;
    gap: var(--spacing-sm);
    align-items: flex-start;
    font-size: var(--font-size-xs);

    .label {
      color: var(--text-secondary);
      min-width: 80px;
      flex-shrink: 0;
    }

    .value {
      color: var(--text-primary);
      font-family: var(--font-mono);
      word-break: break-all;

      &.digest {
        color: var(--color-success);
      }
    }
  }

  .info-cards {
    display: grid;
    gap: var(--spacing-md);
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    margin-top: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    .card {
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      .card-header {
        margin-bottom: var(--spacing-sm);
        h4 {
          margin: 0;
        }
      }
      p {
        margin: 0;
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
      }
    }
  }
</style>
