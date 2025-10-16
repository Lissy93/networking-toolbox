<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';
  import Icon from '$lib/components/global/Icon.svelte';
  import { normalizeLabel, type LabelAnalysis } from '$lib/utils/dns-validation';

  let input = $state('');
  let results = $state<LabelAnalysis[]>([]);
  const clipboard = useClipboard();
  let activeExampleIndex = $state<number | null>(null);

  function normalizeInput() {
    if (!input.trim()) {
      results = [];
      return;
    }

    // Split by whitespace, commas, or newlines to handle multiple labels
    const labels = input.split(/[\s,\n]+/).filter((label) => label.trim());
    results = labels.map((label) => normalizeLabel(label.trim()));
  }

  // Auto-normalize on input change and clear active example when user types
  $effect(() => {
    normalizeInput();

    // If user manually changes input, clear active example
    if (activeExampleIndex !== null) {
      const exampleValue = examples[activeExampleIndex]?.value;
      if (input !== exampleValue) {
        activeExampleIndex = null;
      }
    }
  });

  function loadExample(exampleValue: string, index: number) {
    input = exampleValue;
    activeExampleIndex = index;
    normalizeInput();
  }

  const examples = [
    {
      label: 'Case Normalization',
      value: 'Example.COM\nWWW.GOOGLE.com',
      description: 'Mixed case domain labels',
    },
    {
      label: 'IDN/Punycode',
      value: 'москва.рф\nxn--80adxhks.xn--p1ai',
      description: 'International domain names',
    },
    {
      label: 'Homograph Attack',
      value: 'googlе.com\nexаmple.org',
      description: 'Cyrillic characters mixed with Latin',
    },
  ];
</script>

<div class="card">
  <header class="card-header">
    <h2>DNS Label Normalizer</h2>
    <p>Normalize domain labels with case conversion, IDN detection, and homograph attack analysis.</p>
  </header>

  <!-- Overview Section -->
  <section class="overview-section">
    <div class="overview-cards">
      <div class="overview-card">
        <Icon name="case" size="sm" />
        <div>
          <strong>Case Normalization</strong>
          <span>Converts labels to lowercase following DNS case-insensitivity</span>
        </div>
      </div>
      <div class="overview-card">
        <Icon name="globe" size="sm" />
        <div>
          <strong>IDN Detection</strong>
          <span>Identifies internationalized domain names and punycode encoding</span>
        </div>
      </div>
      <div class="overview-card">
        <Icon name="shield" size="sm" />
        <div>
          <strong>Security Analysis</strong>
          <span>Detects homograph attacks and mixed script vulnerabilities</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Examples Section -->
  <section class="examples-section">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Example Labels</h3>
      </summary>
      <div class="examples-inner">
        <div class="examples-grid">
          {#each examples as example, index (index)}
            <button
              class="example-item {activeExampleIndex === index ? 'active' : ''}"
              onclick={() => loadExample(example.value, index)}
            >
              <div class="example-header">
                <span class="example-label">{example.label}</span>
              </div>
              <div class="example-value">{example.value}</div>
              <div class="example-description">{example.description}</div>
            </button>
          {/each}
        </div>
      </div>
    </details>
  </section>

  <!-- Input Section -->
  <section class="input-section">
    <h3>Domain Labels</h3>
    <div class="input-inner">
      <div class="form-group">
        <label for="input" use:tooltip={'Enter domain labels separated by spaces, commas, or newlines'}>
          <Icon name="dns-label-normalize" size="xs" />
          Labels to Normalize
        </label>
        <textarea
          id="input"
          bind:value={input}
          placeholder="example.com
xn--e1afmkfd.xn--p1ai
mixed-script-еxample.com"
          rows="4"
          class="label-input"
        ></textarea>
      </div>
    </div>
  </section>

  <!-- Results Section -->
  {#if results.length > 0}
    <section class="results-section">
      <h3>Normalization Results</h3>
      {#each results as result, index (index)}
        <div class="result-item">
          <div class="result-header">
            <h4>Label {index + 1}</h4>
            <div class="badges">
              {#if result.isIDN}
                <span class="badge info">IDN</span>
              {/if}
              {#if result.hasHomoglyphs}
                <span class="badge warning">Homoglyphs</span>
              {/if}
              {#if result.scripts.length > 1}
                <span class="badge error">Mixed Scripts</span>
              {/if}
            </div>
          </div>

          <div class="label-comparison">
            <div class="label-row">
              <span class="label-type">Original:</span>
              <code class="label-value">{result.original}</code>
              <button
                class="copy-button {clipboard.isCopied(`orig-${index}`) ? 'copied' : ''}"
                onclick={() => clipboard.copy(result.original, `orig-${index}`)}
              >
                <Icon name={clipboard.isCopied(`orig-${index}`) ? 'check' : 'copy'} size="sm" />
              </button>
            </div>

            <div class="label-row">
              <span class="label-type">Normalized:</span>
              <code class="label-value normalized">{result.normalized}</code>
              <button
                class="copy-button {clipboard.isCopied(`norm-${index}`) ? 'copied' : ''}"
                onclick={() => clipboard.copy(result.normalized, `norm-${index}`)}
              >
                <Icon name={clipboard.isCopied(`norm-${index}`) ? 'check' : 'copy'} size="sm" />
              </button>
            </div>

            {#if result.original !== result.normalized}
              <div class="change-indicator success">
                <Icon name="arrow-right" size="sm" />
                Label was normalized
              </div>
            {:else}
              <div class="change-indicator neutral">
                <Icon name="minus" size="sm" />
                No changes needed
              </div>
            {/if}
          </div>

          {#if result.scripts.length > 0}
            <div class="scripts-section">
              <h5>
                <Icon name="globe" size="sm" />
                Scripts Detected ({result.scripts.length})
              </h5>
              <div class="script-badges">
                {#each result.scripts as script (script)}
                  <span class="script-badge">{script}</span>
                {/each}
              </div>
            </div>
          {/if}

          {#if result.warnings.length > 0}
            <div class="validation-section warnings">
              <h5>
                <Icon name="alert-triangle" size="sm" />
                Security Warnings ({result.warnings.length})
              </h5>
              <ul class="validation-list">
                {#each result.warnings as warning, index (`warning-${index}`)}
                  <li class="warning-item">{warning}</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if result.errors.length > 0}
            <div class="validation-section errors">
              <h5>
                <Icon name="x-circle" size="sm" />
                Errors ({result.errors.length})
              </h5>
              <ul class="validation-list">
                {#each result.errors as error, index (`error-${index}`)}
                  <li class="error-item">{error}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/each}
    </section>
  {/if}

  <!-- Educational Section -->
  <section class="education-section">
    <h3>About DNS Label Normalization</h3>
    <div class="education-grid">
      <div class="education-item">
        <h4>Case Normalization</h4>
        <p>
          DNS labels are case-insensitive. This tool converts all labels to lowercase for consistency and comparison.
        </p>
        <div class="code-example">
          <code>Example.COM</code> → <code>example.com</code>
        </div>
      </div>

      <div class="education-item">
        <h4>IDN Processing</h4>
        <p>
          Internationalized Domain Names use punycode encoding. This tool detects IDN labels and potential encoding
          issues.
        </p>
        <div class="code-example">
          <code>москва.рф</code> ↔ <code>xn--80adxhks.xn--p1ai</code>
        </div>
      </div>

      <div class="education-item">
        <h4>Security Analysis</h4>
        <p>Mixed scripts in labels can indicate homograph attacks. This tool warns about potential security risks.</p>
        <div class="code-example">
          <code>googlе.com</code> (Cyrillic 'е')
        </div>
      </div>

      <div class="education-item">
        <h4>Best Practices</h4>
        <p>
          Always normalize labels before comparison. Be cautious of mixed scripts and visually similar characters from
          different scripts.
        </p>
        <div class="code-example">Normalize → Compare → Validate</div>
      </div>
    </div>
  </section>
</div>

<style lang="scss">
  // Overview Section - tertiary background
  .overview-section {
    margin-bottom: var(--spacing-lg);
    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-md);
      .overview-card {
        background-color: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-sm);
        div {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        strong {
          color: var(--text-primary);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }
        span {
          color: var(--text-secondary);
          font-size: var(--font-size-xs);
          line-height: 1.4;
        }
      }
    }
  }

  // Examples Section - tertiary background
  .examples-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
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
      color: var(--text-primary);
    }
  }

  .examples-inner {
    border-radius: var(--radius-md);
    margin: var(--spacing-md);
    margin-top: 0;
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .example-item {
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
    }
  }

  .example-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .example-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 2px var(--spacing-xs);
    background-color: var(--color-primary);
    color: var(--bg-primary);
    border-radius: var(--radius-sm);
  }

  .example-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    word-break: break-all;
    white-space: pre-line;
    border: 1px solid var(--border-secondary);
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  // Input Section - tertiary background
  .input-section {
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

  .form-group {
    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      user-select: none;
      cursor: help;
      opacity: 0.6;
    }
  }

  .label-input {
    width: 100%;
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    resize: vertical;
    min-height: 120px;
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }
  }

  // Results Section - tertiary background
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

  .result-item {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    transition: all var(--transition-fast);
    margin-bottom: var(--spacing-md);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }
  }

  .badges {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .badge {
    padding: 0.25rem var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;

    &.info {
      color: var(--color-info);
      background-color: color-mix(in srgb, var(--color-info), transparent 85%);
      border: 1px solid color-mix(in srgb, var(--color-info), transparent 50%);
    }

    &.warning {
      color: var(--color-warning);
      background-color: color-mix(in srgb, var(--color-warning), transparent 85%);
      border: 1px solid color-mix(in srgb, var(--color-warning), transparent 50%);
    }

    &.error {
      color: var(--color-error);
      background-color: color-mix(in srgb, var(--color-error), transparent 85%);
      border: 1px solid color-mix(in srgb, var(--color-error), transparent 50%);
    }
  }

  .label-comparison {
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
  }

  .label-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    flex-wrap: wrap;

    &:last-child {
      margin-bottom: 0;
    }

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .label-type {
    font-weight: 600;
    color: var(--text-primary);
    min-width: 90px;
    font-size: var(--font-size-sm);
  }

  .label-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-secondary);
    flex: 1;

    &.normalized {
      color: var(--color-success);
      font-weight: 600;
    }
  }

  .copy-button {
    display: flex;
    align-items: center;
    background: none;
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--surface-hover);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .change-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    font-weight: 500;
    margin-top: var(--spacing-xs);

    &.success {
      color: var(--color-success);
    }

    &.neutral {
      color: var(--text-secondary);
    }
  }

  .scripts-section {
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-secondary);

    h5 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }
  }

  .script-badges {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .script-badge {
    display: inline-block;
    background-color: color-mix(in srgb, var(--color-info), transparent 85%);
    color: var(--color-info);
    padding: 0.25rem var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    border: 1px solid rgba(var(--color-info-rgb), 0.2);
  }

  .validation-section {
    margin-bottom: var(--spacing-md);

    &:last-child {
      margin-bottom: 0;
    }

    h5 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-sm);
    }

    &.warnings h5 {
      color: var(--color-warning);
    }

    &.errors h5 {
      color: var(--color-error);
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

    &:last-child {
      margin-bottom: 0;
    }
  }

  .error-item {
    background-color: color-mix(in srgb, var(--color-error), transparent 95%);
    border-left: 3px solid var(--color-error);
    color: var(--color-error-light);
  }

  .warning-item {
    background-color: color-mix(in srgb, var(--color-warning), transparent 95%);
    border-left: 3px solid var(--color-warning);
    color: var(--color-warning-light);
  }

  // Education Section - tertiary background
  .education-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);

    h3 {
      margin-top: 0;
      margin-bottom: var(--spacing-md);
    }
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-md);
  }

  .education-item {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    transition: all var(--transition-fast);

    h4 {
      margin-top: 0;
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
      color: var(--color-primary);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
    }
  }

  .code-example {
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-primary);
    border: 1px solid var(--border-secondary);
  }

  @media (max-width: 768px) {
    .overview-cards,
    .examples-grid,
    .education-grid {
      grid-template-columns: 1fr;
    }

    .badges {
      justify-content: flex-start;
    }

    .examples-inner,
    .input-inner {
      margin: var(--spacing-sm);
      margin-top: 0;
    }
  }
</style>
