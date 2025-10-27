<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { parseDNSKEYRecord, calculateKeyTag, validateDNSKEY, DNSSEC_ALGORITHMS } from '$lib/utils/dnssec';
  import { useClipboard } from '$lib/composables';
  import { t } from '$lib/stores/language';

  let dnskeyInput = $state('example.org. 3600 IN DNSKEY 257 3 8 AwEAAag');
  let activeExampleIndex = $state<number | null>(null);
  let isActiveExample = $state(true);
  const clipboard = useClipboard();

  const examples = $derived([
    {
      title: $t('tools/dnskey-key-tag.examples.ksk.title'),
      dnskey:
        'example.org. 3600 IN DNSKEY 257 3 8 AwEAAag/8pPvt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuP',
      description: $t('tools/dnskey-key-tag.examples.ksk.description'),
    },
    {
      title: $t('tools/dnskey-key-tag.examples.zsk.title'),
      dnskey:
        'example.org. 3600 IN DNSKEY 256 3 13 kC1gJ+0qtVgdl0VAO/6t9vRaB15v4PclEV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuP',
      description: $t('tools/dnskey-key-tag.examples.zsk.description'),
    },
    {
      title: $t('tools/dnskey-key-tag.examples.rdataOnly.title'),
      dnskey:
        '257 3 8 AwEAAag/8pPvt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuPt1p1YKzY7mD5oCwrTDQeF3jhFV9h4n9JfCuP',
      description: $t('tools/dnskey-key-tag.examples.rdataOnly.description'),
    },
  ]);

  const result = $derived.by(() => {
    if (!dnskeyInput.trim()) return null;

    const validation = validateDNSKEY(dnskeyInput);
    if (!validation.valid) {
      return { error: validation.error };
    }

    const dnskey = parseDNSKEYRecord(dnskeyInput);
    if (!dnskey) {
      return { error: $t('tools/dnskey-key-tag.errors.failedParse') };
    }

    const keyTag = calculateKeyTag(dnskey);

    return {
      dnskey: {
        ...dnskey,
        keyTag,
      },
      keyTag,
    };
  });

  function loadExample(index: number) {
    dnskeyInput = examples[index].dnskey;
    activeExampleIndex = index;
    isActiveExample = false;
  }

  function handleInputChange() {
    if (
      isActiveExample &&
      dnskeyInput !==
        'example.org. 3600 IN DNSKEY 257 3 8 AwEAAcvvJUWJNrPOTMmNhZmJLk85n4Pz+KqvfxJ1X0O+fJ4GJNdqsNvP1mQJJv8A4dNn...'
    ) {
      isActiveExample = false;
    }
    activeExampleIndex = null;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('tools/dnskey-key-tag.title')}</h1>
    <p>
      {$t('tools/dnskey-key-tag.description')}
    </p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('tools/dnskey-key-tag.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (index)}
          <button
            class="example-card {activeExampleIndex === index ? 'active' : ''}"
            onclick={() => loadExample(index)}
          >
            <div class="example-title">{example.title}</div>
            <div class="example-dnskey">{example.dnskey}</div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="form-group">
      <label for="dnskey-input" use:tooltip={$t('tools/dnskey-key-tag.input.tooltip')}>
        <Icon name="key" size="sm" />
        {$t('tools/dnskey-key-tag.input.label')}
      </label>
      <textarea
        id="dnskey-input"
        bind:value={dnskeyInput}
        oninput={handleInputChange}
        placeholder={$t('tools/dnskey-key-tag.input.placeholder')}
        rows="4"
        class="dnskey-input {isActiveExample ? 'example-active' : ''}"
      ></textarea>
      {#if isActiveExample}
        <p class="field-help">{$t('tools/dnskey-key-tag.input.exampleActive')}</p>
      {/if}
    </div>
  </div>

  <!-- Results -->
  {#if result}
    {#if result.error}
      <div class="card error-card">
        <div class="error-content">
          <Icon name="alert-triangle" size="sm" />
          <div>
            <strong>{$t('tools/dnskey-key-tag.errors.validationError')}</strong>
            {result.error}
          </div>
        </div>
      </div>
    {:else if result.dnskey}
      <div class="card results-card">
        <div class="results-header">
          <h3>{$t('tools/dnskey-key-tag.results.title')}</h3>
          <button
            class="copy-button {clipboard.isCopied() ? 'copied' : ''}"
            onclick={() =>
              result && !result.error && result.keyTag !== undefined && clipboard.copy(result.keyTag.toString())}
          >
            <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
            {$t('tools/dnskey-key-tag.results.copyButton')}
          </button>
        </div>

        <!-- Key Tag Display -->
        <div class="key-tag-display">
          <div class="key-tag-label" use:tooltip={$t('tools/dnskey-key-tag.results.keyTagTooltip')}>
            {$t('tools/dnskey-key-tag.results.keyTagLabel')}
          </div>
          <div class="key-tag-value">{result.keyTag}</div>
        </div>

        <!-- DNSKEY Metadata -->
        <div class="metadata-section">
          <h4>{$t('tools/dnskey-key-tag.metadata.title')}</h4>
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label" use:tooltip={$t('tools/dnskey-key-tag.metadata.keyType.tooltip')}
                >{$t('tools/dnskey-key-tag.metadata.keyType.label')}</span
              >
              <span class="metadata-value key-type-{result.dnskey.keyType?.toLowerCase()}"
                >{result.dnskey.keyType || $t('tools/dnskey-key-tag.metadata.keyType.unknown')}</span
              >
            </div>
            <div class="metadata-item">
              <span class="metadata-label" use:tooltip={$t('tools/dnskey-key-tag.metadata.flags.tooltip')}
                >{$t('tools/dnskey-key-tag.metadata.flags.label')}</span
              >
              <span class="metadata-value mono">{result.dnskey.flags}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label" use:tooltip={$t('tools/dnskey-key-tag.metadata.protocol.tooltip')}
                >{$t('tools/dnskey-key-tag.metadata.protocol.label')}</span
              >
              <span class="metadata-value mono">{result.dnskey.protocol}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label" use:tooltip={$t('tools/dnskey-key-tag.metadata.algorithm.tooltip')}
                >{$t('tools/dnskey-key-tag.metadata.algorithm.label')}</span
              >
              <span class="metadata-value mono"
                >{result.dnskey.algorithm} ({(DNSSEC_ALGORITHMS as Record<number, string>)[result.dnskey.algorithm] ||
                  $t('tools/dnskey-key-tag.metadata.algorithm.unknown')})</span
              >
            </div>
          </div>

          <div class="public-key-section">
            <h5 use:tooltip={$t('tools/dnskey-key-tag.metadata.publicKey.tooltip')}>
              {$t('tools/dnskey-key-tag.metadata.publicKey.label')}
            </h5>
            <div class="public-key">{result.dnskey.publicKey}</div>
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>{$t('tools/dnskey-key-tag.education.purpose.title')}</h4>
        <p>
          {$t('tools/dnskey-key-tag.education.purpose.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools/dnskey-key-tag.education.keyTypes.title')}</h4>
        <p>
          {$t('tools/dnskey-key-tag.education.keyTypes.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools/dnskey-key-tag.education.algorithmSupport.title')}</h4>
        <p>
          {$t('tools/dnskey-key-tag.education.algorithmSupport.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools/dnskey-key-tag.education.validation.title')}</h4>
        <p>
          {$t('tools/dnskey-key-tag.education.validation.description')}
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .info-card {
    margin-bottom: var(--spacing-lg);
  }

  .overview-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .examples-card {
    background: var(--bg-tertiary);
    margin-bottom: var(--spacing-md);
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

  .example-title {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-dnskey {
    font-family: var(--font-mono);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    word-break: break-all;
    line-height: 1.3;
    margin: var(--spacing-xs) 0;
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .input-card {
    background: var(--bg-tertiary);
    margin-bottom: var(--spacing-lg);
  }

  .form-group {
    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .dnskey-input {
    width: 100%;
    padding: var(--spacing-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    resize: vertical;
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
    }

    &.example-active {
      border-color: var(--color-warning);
      background-color: color-mix(in srgb, var(--color-warning), transparent 95%);
    }
  }

  .field-help {
    color: var(--color-warning);
    font-size: var(--font-size-xs);
    margin-top: var(--spacing-xs);
    margin-bottom: 0;
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
    background: var(--bg-tertiary);
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

    &:hover {
      background-color: var(--surface-hover);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .key-tag-display {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-primary), transparent 95%),
      color-mix(in srgb, var(--color-primary), transparent 98%)
    );
    border: 1px solid color-mix(in srgb, var(--color-primary), transparent 80%);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);
    flex-direction: column;
    padding: var(--spacing-md);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .key-tag-label {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .key-tag-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-3xl);
    font-weight: 700;
    color: var(--color-primary);
  }

  .metadata-section {
    h4 {
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
    }

    h5 {
      margin-bottom: var(--spacing-sm);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .metadata-item {
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-direction: column;
    gap: 0;
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
  }

  .metadata-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .metadata-value {
    font-size: var(--font-size-sm);
    color: var(--text-primary);

    &.mono {
      font-family: var(--font-mono);
    }

    &.key-type-ksk {
      color: var(--color-error);
      font-weight: 600;
    }

    &.key-type-zsk {
      color: var(--color-info);
      font-weight: 600;
    }
  }

  .public-key-section {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
  }

  .public-key {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    word-break: break-all;
    line-height: 1.4;
    padding: var(--spacing-md);
    // background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    margin-top: var(--spacing-sm);
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
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

    .metadata-grid {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
