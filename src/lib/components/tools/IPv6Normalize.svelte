<script lang="ts">
  import { normalizeIPv6Addresses, type IPv6NormalizeResult } from '$lib/utils/ipv6-normalize.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';

  let inputText = $state(
    '2001:0db8:0000:0000:0000:ff00:0042:8329\n2001:db8:0:0:1:0:0:1\n2001:0db8:0001:0000:0000:0ab9:C0A8:0102\n2001:db8::1\nfe80::1%eth0',
  );
  let result = $state<IPv6NormalizeResult | null>(null);
  let isLoading = $state(false);
  const clipboard = useClipboard();

  function normalizeAddresses() {
    if (!inputText.trim()) {
      result = null;
      return;
    }

    isLoading = true;

    try {
      const inputs = inputText.split('\n').filter((line) => line.trim());
      result = normalizeIPv6Addresses(inputs);
    } catch (error) {
      result = {
        normalizations: [],
        summary: { totalInputs: 0, validInputs: 0, invalidInputs: 0, alreadyNormalizedInputs: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      isLoading = false;
    }
  }

  function exportResults(format: 'csv' | 'json' | 'txt') {
    if (!result) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (format === 'csv') {
      const headers = 'Input,Normalized,Valid,Compression Applied,Leading Zeros Removed,Lowercase Applied,Error';
      const rows = result.normalizations.map(
        (norm) =>
          `"${norm.input}","${norm.normalized}","${norm.isValid}","${norm.compressionApplied}","${norm.leadingZerosRemoved}","${norm.lowercaseApplied}","${norm.error || ''}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `ipv6-normalized-${timestamp}.csv`;
      mimeType = 'text/csv';
    } else if (format === 'json') {
      content = JSON.stringify(result, null, 2);
      filename = `ipv6-normalized-${timestamp}.json`;
      mimeType = 'application/json';
    } else {
      // Plain text format with just normalized addresses
      content = result.normalizations
        .filter((n) => n.isValid)
        .map((n) => n.normalized)
        .join('\n');
      filename = `ipv6-normalized-${timestamp}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyAllNormalized() {
    if (result) {
      const normalized = result.normalizations
        .filter((n) => n.isValid)
        .map((n) => n.normalized)
        .join('\n');
      clipboard.copy(normalized, 'copy-all');
    }
  }

  // Auto-normalize when inputs change
  $effect(() => {
    if (inputText.trim()) {
      const timeoutId = setTimeout(normalizeAddresses, 300);
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h2>IPv6 Normalizer</h2>
    <p>
      Normalize IPv6 addresses to RFC 5952 canonical form with lowercase, zero compression, and leading zero removal
    </p>
  </header>

  <div class="input-section">
    <div class="input-group">
      <label for="inputs">IPv6 Addresses</label>
      <textarea
        id="inputs"
        bind:value={inputText}
        placeholder="2001:0db8:0000:0000:0000:ff00:0042:8329&#10;2001:db8:0:0:1:0:0:1&#10;2001:0db8:0001:0000:0000:0ab9:C0A8:0102&#10;fe80::1%eth0"
        rows="6"
      ></textarea>
      <div class="input-help">
        Enter one IPv6 address per line. Supports zone identifiers (%) and IPv4-mapped addresses
      </div>
    </div>

    <div class="rfc-info">
      <h3>RFC 5952 Normalization Rules</h3>
      <ul>
        <li>Convert hexadecimal to lowercase</li>
        <li>Remove leading zeros in each group</li>
        <li>Compress longest sequence of consecutive zero groups with ::</li>
        <li>Preserve zone identifiers (%)</li>
        <li>Support IPv4-mapped IPv6 addresses</li>
      </ul>
    </div>
  </div>

  {#if isLoading}
    <div class="loading">
      <Icon name="loader" />
      Normalizing addresses...
    </div>
  {/if}

  {#if result}
    <div class="results">
      {#if result.errors.length > 0}
        <div class="errors">
          <h3><Icon name="alert-triangle" /> Errors</h3>
          {#each result.errors as error (error)}
            <div class="error-item">{error}</div>
          {/each}
        </div>
      {/if}

      {#if result.normalizations.length > 0}
        <div class="summary">
          <h3>Normalization Summary</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-value">{result.summary.totalInputs}</span>
              <span class="stat-label">Total Inputs</span>
            </div>
            <div class="stat valid">
              <span class="stat-value">{result.summary.validInputs}</span>
              <span class="stat-label">Valid</span>
            </div>
            <div class="stat invalid">
              <span class="stat-value">{result.summary.invalidInputs}</span>
              <span class="stat-label">Invalid</span>
            </div>
            <div class="stat already-normalized">
              <span class="stat-value">{result.summary.alreadyNormalizedInputs}</span>
              <span class="stat-label">Already Normalized</span>
            </div>
          </div>
        </div>

        <div class="normalized-addresses">
          <div class="normalized-header">
            <h3>Normalized Addresses</h3>
            <div class="export-buttons">
              <button onclick={copyAllNormalized} class:copied={clipboard.isCopied('copy-all')}>
                <Icon name={clipboard.isCopied('copy-all') ? 'check' : 'copy'} />
                Copy All
              </button>
              <button onclick={() => exportResults('txt')}>
                <Icon name="download" />
                Export TXT
              </button>
              <button onclick={() => exportResults('csv')}>
                <Icon name="csv-file" />
                Export CSV
              </button>
              <button onclick={() => exportResults('json')}>
                <Icon name="json-file" />
                Export JSON
              </button>
            </div>
          </div>
        </div>

        <div class="normalizations">
          <div class="normalizations-list">
            {#each result.normalizations as normalization, index (`norm-${index}`)}
              <div
                class="normalization-card"
                class:valid={normalization.isValid}
                class:invalid={!normalization.isValid}
              >
                <div class="status">
                  {#if normalization.isValid}
                    <Icon name="check-circle" />
                  {:else}
                    <Icon name="x-circle" />
                  {/if}
                </div>

                <div class="card-content">
                  <div class="address-info">
                    <div class="original-address">
                      <span class="address-label">Original:</span>
                      <button
                        type="button"
                        class="code-button"
                        onclick={() => clipboard.copy(normalization.input, `original-${index}`)}
                        title="Click to copy"
                      >
                        {normalization.input}
                      </button>
                    </div>

                    {#if normalization.isValid}
                      <div class="normalized-address">
                        <span class="address-label">Normalized:</span>
                        <div class="normalized-content">
                          <button
                            type="button"
                            class="code-button normalized"
                            onclick={() => clipboard.copy(normalization.normalized, `normalized-${index}`)}
                            title="Click to copy"
                          >
                            {normalization.normalized}
                          </button>
                          <button
                            type="button"
                            class="copy-button"
                            class:copied={clipboard.isCopied(`copy-${index}`)}
                            onclick={() => clipboard.copy(normalization.normalized, `copy-${index}`)}
                            title="Copy normalized address"
                          >
                            <Icon name={clipboard.isCopied(`copy-${index}`) ? 'check' : 'copy'} size="sm" />
                          </button>
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>

                {#if normalization.isValid}
                  <div class="normalization-details">
                    {#if normalization.input === normalization.normalized}
                      <div class="already-normalized">
                        <Icon name="check" />
                        Address is already in RFC 5952 canonical form
                      </div>
                    {:else}
                      <div class="applied-rules">
                        <h4>Applied Normalization Rules:</h4>
                        <div class="rules-list">
                          {#if normalization.lowercaseApplied}
                            <div class="rule-applied">
                              <Icon name="check" />
                              Converted to lowercase
                            </div>
                          {/if}
                          {#if normalization.leadingZerosRemoved}
                            <div class="rule-applied">
                              <Icon name="check" />
                              Removed leading zeros
                            </div>
                          {/if}
                          {#if normalization.compressionApplied}
                            <div class="rule-applied">
                              <Icon name="check" />
                              Applied zero compression (::)
                            </div>
                          {/if}
                        </div>
                      </div>

                      {#if normalization.steps.length > 0}
                        <div class="normalization-steps">
                          <h4>Normalization Steps:</h4>
                          {#each normalization.steps as step (`step-${step.step}`)}
                            <div class="step">
                              <div class="step-header">
                                <span class="step-number">Step {step.step}</span>
                                <span class="step-description">{step.description}</span>
                              </div>
                              <div class="step-transformation">
                                <div class="transformation-item">
                                  <span class="transformation-label">Before:</span>
                                  <code>{step.before}</code>
                                </div>
                                <div class="transformation-arrow">→</div>
                                <div class="transformation-item">
                                  <span class="transformation-label">After:</span>
                                  <code>{step.after}</code>
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    {/if}
                  </div>
                {:else}
                  <div class="error-message">
                    <Icon name="alert-triangle" />
                    {normalization.error}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Card styles already defined in base.scss */

  .card h2 {
    color: var(--text-primary);
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-xl);
  }

  .card p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    line-height: 1.5;
  }

  .input-section {
    display: grid;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  @media (min-width: 768px) {
    .input-section {
      grid-template-columns: 2fr 1fr;
    }
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .input-group label {
    display: block;
    color: var(--text-primary);
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
  }

  .input-group textarea {
    width: 100%;
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-mono);
    resize: vertical;
    min-height: 150px;
  }

  .input-help {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-xs);
  }

  .rfc-info {
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .rfc-info h3 {
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-size: var(--font-size-md);
  }

  .rfc-info ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .rfc-info li {
    margin-bottom: var(--spacing-xs);
  }

  .loading {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    justify-content: center;
    padding: var(--spacing-lg);
    color: var(--color-primary);
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .errors {
    background: var(--bg-tertiary);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .errors h3 {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--color-error);
  }

  .error-item {
    color: var(--color-error);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);
  }

  .summary {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .summary h3 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--spacing-md);
  }

  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .stat-label {
    color: var(--text-secondary);
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .stat.valid .stat-value {
    color: var(--color-success);
  }

  .stat.invalid .stat-value {
    color: var(--color-error);
  }

  .stat.already-normalized .stat-value {
    color: var(--color-info);
  }

  .normalized-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  @media (max-width: 767px) {
    .normalized-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }
  }

  .normalized-header h3 {
    color: var(--text-primary);
  }

  .export-buttons {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .export-buttons button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;

    &:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
    }

    &.copied {
      background: var(--color-success);
      transform: scale(1.05);
    }
  }

  .normalizations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .normalization-card {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    position: relative;
  }

  .normalization-card.valid {
    border-color: color-mix(in srgb, var(--color-success), transparent 65%);
  }

  .normalization-card.invalid {
    border-color: color-mix(in srgb, var(--color-error), transparent 65%);
  }

  .card-content {
    margin-bottom: var(--spacing-md);
  }

  .address-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    flex: 1;
    max-width: 28rem;
  }

  .original-address,
  .normalized-address {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .normalized-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 1;
  }

  .copy-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;

    &:hover {
      background: var(--surface-hover);
      color: var(--color-primary);
      border-color: var(--color-primary);
      transform: translateY(-1px);
    }

    &.copied {
      background: var(--color-success);
      color: var(--bg-secondary);
      border-color: var(--color-success);
      transform: scale(1.05);
    }
  }

  @media (max-width: 767px) {
    .original-address,
    .normalized-address {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-xs);
    }

    .normalized-content {
      flex-direction: row;
      align-items: center;
    }
  }

  .address-label {
    font-weight: 500;
    color: var(--text-secondary);
    min-width: 80px;
  }

  .code-button {
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all var(--transition-fast);
    word-break: break-all;
    font-size: var(--font-size-sm);
    border: 1px solid var(--border-primary);
    flex: 1;

    &.normalized {
      color: var(--color-success);
      border-color: var(--color-success);
    }

    &:hover {
      background: var(--bg-primary);
      transform: translateY(-1px);
    }
  }

  .status {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    color: var(--color-success);
    z-index: 1;
  }

  .normalization-card.invalid .status {
    color: var(--color-error);
  }

  .normalization-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .already-normalized {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    color: var(--color-info);
    font-weight: 500;
    max-width: 28rem;
  }

  .applied-rules {
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .applied-rules h4 {
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-size: var(--font-size-md);
  }

  .rules-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .rule-applied {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-success);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .normalization-steps {
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
  }

  .normalization-steps h4 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
    font-size: 1rem;
  }

  .step {
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .step:last-child {
    margin-bottom: 0;
  }

  .step-header {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .step-number {
    font-weight: 700;
    color: var(--color-primary);
    font-size: 0.875rem;
  }

  .step-description {
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .step-transformation {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--spacing-sm);
    align-items: center;
  }

  @media (max-width: 767px) {
    .step-transformation {
      grid-template-columns: 1fr;
      gap: var(--spacing-xs);
    }

    .transformation-arrow {
      justify-self: center;
    }
  }

  .transformation-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .transformation-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .transformation-item code {
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    word-break: break-all;
  }

  .transformation-arrow {
    font-size: 1.5rem;
    color: var(--color-primary);
    font-weight: 700;
    text-align: center;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-error);
    font-size: 0.875rem;
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
  }

  @media (max-width: 767px) {
    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .export-buttons {
      justify-content: stretch;
    }

    .export-buttons button {
      flex: 1;
      justify-content: center;
    }
  }
</style>
