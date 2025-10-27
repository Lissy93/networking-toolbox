<script lang="ts">
  import { checkCIDRAlignment, type AlignmentResult } from '$lib/utils/cidr-alignment.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { t } from '$lib/stores/language';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../styles/diagnostics-pages.scss';

  let inputText = $state('192.168.1.0/24\n10.0.0.0-10.0.0.255\n172.16.1.5');
  let targetPrefix = $state(24);
  let result = $state<AlignmentResult | null>(null);
  let isLoading = $state(false);
  let copiedStates = $state<Record<string, boolean>>({});
  let _selectedExample = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);
  let _userModified = $state(false);
  let validationErrors = $state<string[]>([]);

  const examples = $derived([
    {
      label: $t('tools/cidr-alignment.examples.basicIPv4'),
      input: `192.168.1.0/24
192.168.2.0/24
192.168.3.0/24`,
      targetPrefix: 22,
    },
    {
      label: $t('tools/cidr-alignment.examples.mixedIPTypes'),
      input: `10.0.0.0-10.0.0.255
172.16.5.100
192.168.1.0/25`,
      targetPrefix: 24,
    },
    {
      label: $t('tools/cidr-alignment.examples.subnetAggregation'),
      input: `192.168.0.0/26
192.168.0.64/26
192.168.0.128/26
192.168.0.192/26`,
      targetPrefix: 24,
    },
    {
      label: $t('tools/cidr-alignment.examples.networkConsolidation'),
      input: `10.1.0.0/24
10.1.1.0/24
10.1.2.0/24
10.1.3.0/24`,
      targetPrefix: 22,
    },
    {
      label: $t('tools/cidr-alignment.examples.vlanAlignment'),
      input: `172.16.10.0/24
172.16.11.0/24
172.16.15.0/24
172.16.20.0/24`,
      targetPrefix: 20,
    },
    {
      label: $t('tools/cidr-alignment.examples.pointToPointLinks'),
      input: `192.168.100.0/30
192.168.100.4/30
192.168.100.8/30
192.168.100.12/30`,
      targetPrefix: 28,
    },
  ]);

  function validateTargetPrefix(): string[] {
    const errors: string[] = [];

    // Check if target prefix is a valid number
    if (isNaN(targetPrefix) || targetPrefix === null || targetPrefix === undefined) {
      errors.push($t('tools/cidr-alignment.validation.mustBeValidNumber'));
      return errors;
    }

    // Check if target prefix is within basic bounds
    if (targetPrefix < 0 || targetPrefix > 128) {
      errors.push($t('tools/cidr-alignment.validation.outOfRange'));
      return errors;
    }

    // Check if inputs exist to validate against
    if (!inputText.trim()) {
      return errors;
    }

    // Analyze input types to determine valid prefix ranges
    const inputs = inputText.split('\n').filter((line) => line.trim());
    let hasIPv4 = false;
    let hasIPv6 = false;

    for (const input of inputs) {
      const trimmed = input.trim();
      if (!trimmed) continue;

      // Check for IPv6 (contains colons)
      if (trimmed.includes(':')) {
        hasIPv6 = true;
      }
      // Check for IPv4 patterns
      else if (trimmed.match(/^\d+\.\d+\.\d+\.\d+/) || trimmed.includes('-') || trimmed.includes('/')) {
        hasIPv4 = true;
      }
    }

    // Validate prefix length based on IP types present
    if (hasIPv4 && !hasIPv6 && targetPrefix > 32) {
      errors.push($t('tools/cidr-alignment.validation.ipv4OutOfRange'));
    }

    if (hasIPv6 && targetPrefix > 128) {
      errors.push($t('tools/cidr-alignment.validation.ipv6OutOfRange'));
    }

    // Additional practical validation
    if (targetPrefix === 0) {
      errors.push($t('tools/cidr-alignment.validation.notPractical'));
    }

    return errors;
  }

  function checkAlignment() {
    // Reset validation errors
    validationErrors = [];

    if (!inputText.trim()) {
      result = null;
      return;
    }

    // Validate target prefix first
    const prefixErrors = validateTargetPrefix();
    if (prefixErrors.length > 0) {
      validationErrors = prefixErrors;
      result = {
        checks: [],
        summary: { totalInputs: 0, alignedInputs: 0, misalignedInputs: 0, alignmentRate: 0 },
        errors: prefixErrors,
      };
      return;
    }

    isLoading = true;

    try {
      const inputs = inputText.split('\n').filter((line) => line.trim());
      result = checkCIDRAlignment(inputs, targetPrefix);
      validationErrors = []; // Clear validation errors on success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      validationErrors = [errorMessage];
      result = {
        checks: [],
        summary: { totalInputs: 0, alignedInputs: 0, misalignedInputs: 0, alignmentRate: 0 },
        errors: [errorMessage],
      };
    } finally {
      isLoading = false;
    }
  }

  function exportResults(format: 'csv' | 'json') {
    if (!result) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    let content = '';
    let filename = '';

    if (format === 'csv') {
      const headers = 'Input,Type,Is Aligned,Target Prefix,Aligned CIDR,Reason';
      const rows = result.checks.map(
        (check) =>
          `"${check.input}","${check.type}","${check.isAligned}","${check.targetPrefix}","${check.alignedCIDR || ''}","${check.reason || ''}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `cidr-alignment-${timestamp}.csv`;
    } else {
      content = JSON.stringify(result, null, 2);
      filename = `cidr-alignment-${timestamp}.json`;
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedStates[id] = true;
      setTimeout(() => {
        copiedStates[id] = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    inputText = example.input;
    targetPrefix = example.targetPrefix;
    _selectedExample = example.label;
    selectedExampleIndex = index;
    _userModified = false;
  }

  function handleInputChange() {
    _userModified = true;
    _selectedExample = null;
    selectedExampleIndex = null;
  }

  // Auto-check when inputs change
  $effect(() => {
    if (inputText.trim() && targetPrefix > 0) {
      const timeoutId = setTimeout(checkAlignment, 300);
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h2>{$t('tools/cidr-alignment.title')}</h2>
    <p>{$t('tools/cidr-alignment.description')}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('tools/cidr-alignment.examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (example.label)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
          >
            <div class="example-label">{example.label}</div>
            <div class="example-preview">
              {$t('tools/cidr-alignment.input.targetPreview', { targetPrefix: example.targetPrefix })}
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <div class="input-section">
    <div class="inputs-card">
      <h3 use:tooltip={$t('tools/cidr-alignment.input.networkInputsTooltip')}>
        {$t('tools/cidr-alignment.input.networkInputsTitle')}
      </h3>
      <div class="input-group">
        <label for="inputs" use:tooltip={$t('tools/cidr-alignment.input.inputsTooltip')}>
          {$t('tools/cidr-alignment.input.inputsLabel')}
        </label>
        <textarea
          id="inputs"
          bind:value={inputText}
          oninput={handleInputChange}
          placeholder={$t('tools/cidr-alignment.input.inputsPlaceholder')}
          rows="8"
        ></textarea>
        <div class="input-help">
          {$t('tools/cidr-alignment.input.inputHelp')}
        </div>
      </div>

      <div class="input-group">
        <label for="prefix" use:tooltip={$t('tools/cidr-alignment.input.targetPrefixTooltip')}>
          {$t('tools/cidr-alignment.input.targetPrefixLabel')}
        </label>
        <input
          id="prefix"
          type="number"
          bind:value={targetPrefix}
          oninput={handleInputChange}
          min="0"
          max="128"
          placeholder={$t('tools/cidr-alignment.input.targetPrefixPlaceholder')}
          class:error={validationErrors.length > 0}
        />
        <div class="input-help">{$t('tools/cidr-alignment.input.targetPrefixHelp')}</div>
        {#if validationErrors.length > 0}
          <div class="validation-errors">
            {#each validationErrors as error (error)}
              <div class="validation-error">
                <Icon name="alert-circle" size="xs" />
                {error}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="loading">
      <Icon name="loader" />
      {$t('tools/cidr-alignment.loading')}
    </div>
  {/if}

  {#if result}
    <div class="results">
      {#if result.errors.length > 0}
        <div class="errors">
          <h3><Icon name="alert-triangle" /> {$t('tools/cidr-alignment.results.errorsTitle')}</h3>
          {#each result.errors as error (error)}
            <div class="error-item">{error}</div>
          {/each}
        </div>
      {/if}

      {#if result.checks.length > 0}
        <div class="summary">
          <h3 use:tooltip={$t('tools/cidr-alignment.results.summaryTooltip')}>
            {$t('tools/cidr-alignment.results.summaryTitle')}
          </h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-value">{result.summary.totalInputs}</span>
              <span class="stat-label" use:tooltip={$t('tools/cidr-alignment.results.totalInputsTooltip')}
                >{$t('tools/cidr-alignment.results.totalInputsLabel')}</span
              >
            </div>
            <div class="stat aligned">
              <span class="stat-value">{result.summary.alignedInputs}</span>
              <span class="stat-label" use:tooltip={$t('tools/cidr-alignment.results.alignedTooltip')}
                >{$t('tools/cidr-alignment.results.alignedLabel')}</span
              >
            </div>
            <div class="stat misaligned">
              <span class="stat-value">{result.summary.misalignedInputs}</span>
              <span class="stat-label" use:tooltip={$t('tools/cidr-alignment.results.misalignedTooltip')}
                >{$t('tools/cidr-alignment.results.misalignedLabel')}</span
              >
            </div>
            <div class="stat">
              <span class="stat-value">{result.summary.alignmentRate}%</span>
              <span class="stat-label" use:tooltip={$t('tools/cidr-alignment.results.alignmentRateTooltip')}
                >{$t('tools/cidr-alignment.results.alignmentRateLabel')}</span
              >
            </div>
          </div>
        </div>

        <div class="checks">
          <div class="checks-header">
            <h3 use:tooltip={$t('tools/cidr-alignment.results.checksTooltip')}>
              {$t('tools/cidr-alignment.results.checksTitle')}
            </h3>
            <div class="export-buttons">
              <button onclick={() => exportResults('csv')}>
                <Icon name="csv-file" />
                {$t('tools/cidr-alignment.results.exportCSV')}
              </button>
              <button onclick={() => exportResults('json')}>
                <Icon name="json-file" />
                {$t('tools/cidr-alignment.results.exportJSON')}
              </button>
            </div>
          </div>

          <div class="checks-list">
            {#each result.checks as check (check.input)}
              <div class="check-item" class:aligned={check.isAligned} class:misaligned={!check.isAligned}>
                <div class="check-header">
                  <div class="check-input">
                    <span class="input-text">{check.input}</span>
                    <span class="input-type">{check.type.toUpperCase()}</span>
                  </div>
                  <div class="check-status">
                    {#if check.isAligned}
                      <Icon name="check-circle" size="sm" />
                      <span class="status-text"
                        >{$t('tools/cidr-alignment.check.alignedTo', { targetPrefix: check.targetPrefix })}</span
                      >
                    {:else}
                      <Icon name="x-circle" size="sm" />
                      <span class="status-text"
                        >{$t('tools/cidr-alignment.check.notAlignedTo', { targetPrefix: check.targetPrefix })}</span
                      >
                    {/if}
                  </div>
                </div>

                {#if check.alignedCIDR}
                  <div class="aligned-cidr">
                    <span class="aligned-label" use:tooltip={$t('tools/cidr-alignment.check.alignedCIDRTooltip')}
                      >{$t('tools/cidr-alignment.check.alignedCIDRLabel')}</span
                    >
                    <div class="cidr-with-copy">
                      <code class="aligned-code">{check.alignedCIDR}</code>
                      <button
                        type="button"
                        class="copy-button {copiedStates[`cidr-${check.input}`] ? 'copied' : ''}"
                        onclick={() => copyToClipboard(check.alignedCIDR!, `cidr-${check.input}`)}
                        use:tooltip={$t('tools/cidr-alignment.check.copyAlignedCIDR')}
                      >
                        <Icon name={copiedStates[`cidr-${check.input}`] ? 'check' : 'copy'} size="xs" />
                      </button>
                    </div>
                  </div>
                {/if}

                {#if check.reason}
                  <div class="reason">
                    <span class="reason-label" use:tooltip={$t('tools/cidr-alignment.check.reasonTooltip')}
                      >{$t('tools/cidr-alignment.check.reasonLabel')}</span
                    >
                    <span class="reason-text">{check.reason}</span>
                  </div>
                {/if}

                {#if check.suggestions.length > 0}
                  <div class="suggestions">
                    <span class="suggestions-label" use:tooltip={$t('tools/cidr-alignment.check.suggestionsTooltip')}
                      >{$t('tools/cidr-alignment.check.suggestionsLabel')}</span
                    >
                    {#each check.suggestions as suggestion (suggestion.type + suggestion.description)}
                      <div class="suggestion">
                        <div class="suggestion-type">
                          {#if suggestion.type === 'larger'}
                            <Icon name="zoom-out" size="sm" />
                          {:else if suggestion.type === 'smaller'}
                            <Icon name="zoom-in" size="sm" />
                          {:else}
                            <Icon name="scissors" size="sm" />
                          {/if}
                          <span class="suggestion-description">{suggestion.description}</span>
                        </div>
                        <div class="suggestion-cidrs">
                          {#each suggestion.cidrs as cidr, idx (cidr)}
                            <div class="suggestion-cidr">
                              <code class="suggestion-code">{cidr}</code>
                              <button
                                type="button"
                                class="copy-button {copiedStates[`suggestion-${check.input}-${idx}`] ? 'copied' : ''}"
                                onclick={() => copyToClipboard(cidr, `suggestion-${check.input}-${idx}`)}
                                use:tooltip={$t('tools/cidr-alignment.check.copySuggestedCIDR')}
                              >
                                <Icon
                                  name={copiedStates[`suggestion-${check.input}-${idx}`] ? 'check' : 'copy'}
                                  size="xs"
                                />
                              </button>
                            </div>
                          {/each}
                        </div>
                        {#if suggestion.efficiency}
                          <div
                            class="suggestion-efficiency"
                            use:tooltip={$t('tools/cidr-alignment.check.efficiencyTooltip')}
                          >
                            {$t('tools/cidr-alignment.check.efficiency', { efficiency: suggestion.efficiency })}
                          </div>
                        {/if}
                      </div>
                    {/each}
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
  .input-section {
    margin-bottom: var(--spacing-lg);
  }

  .inputs-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  .inputs-card h3 {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-md);
    font-weight: 600;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
  }

  .input-group:last-child {
    margin-bottom: 0;
  }

  .input-group label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .input-group textarea,
  .input-group input {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    transition: var(--transition-fast);
  }

  .input-group textarea:focus,
  .input-group input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .input-group input.error {
    border-color: var(--color-error);
    background: color-mix(in srgb, var(--color-error), transparent 95%);
  }

  .validation-errors {
    margin-top: var(--spacing-xs);
  }

  .validation-error {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-error);
    font-size: var(--font-size-xs);
    font-weight: 500;
    margin-bottom: var(--spacing-xs);

    &:last-child {
      margin-bottom: 0;
    }

    :global(.icon) {
      color: var(--color-error);
      flex-shrink: 0;
    }
  }

  .input-group textarea {
    resize: vertical;
    min-height: 200px;
  }

  .input-help {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
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
    background: var(--bg-secondary);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
  }

  .errors h3 {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    color: var(--color-error);
  }

  .error-item {
    color: var(--color-error-light);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);
  }

  .summary {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .summary h3 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--spacing-md);
  }

  .stat {
    text-align: center;
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .stat.aligned {
    border-color: var(--color-success);
  }

  .stat.misaligned {
    border-color: var(--color-error);
  }

  .stat-value {
    display: block;
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat.aligned .stat-value {
    color: var(--color-success);
  }

  .stat.misaligned .stat-value {
    color: var(--color-error);
  }

  .stat-label {
    display: block;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .checks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .checks-header h3 {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }

  .export-buttons {
    display: flex;
    gap: var(--spacing-sm);
  }

  .export-buttons button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .export-buttons button:hover {
    background: var(--color-primary-hover);
  }

  .checks {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .checks-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .check-item {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    background: var(--bg-tertiary);
  }

  .check-item.aligned {
    border-color: var(--color-success);
  }

  .check-item.misaligned {
    border-color: var(--color-error);
  }

  .check-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: var(--spacing-md);
  }

  @media (max-width: 768px) {
    .check-header {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .check-input {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .input-text {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  .input-type {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    background: var(--bg-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    align-self: flex-start;
  }

  .check-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-weight: 600;
  }

  .status-text {
    font-size: var(--font-size-sm);
  }

  .check-item.aligned .check-status {
    color: var(--color-success);
  }

  .check-item.misaligned .check-status {
    color: var(--color-error);
  }

  .aligned-cidr {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
  }

  .aligned-label {
    font-weight: 600;
    /* color: var(--color-success-light); */
    font-size: var(--font-size-sm);
  }

  .cidr-with-copy {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .aligned-code {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: var(--font-size-md);
    color: var(--color-success-light);
    background: var(--bg-tertiary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .reason {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);
  }

  .reason-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .reason-text {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    line-height: 1.5;
  }

  .suggestions {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);
  }

  .suggestions-label {
    display: block;
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-sm);
  }

  .suggestion {
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .suggestion-type {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .suggestion-description {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .suggestion-cidrs {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }

  .suggestion-cidr {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .suggestion-code {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: var(--font-size-sm);
    color: var(--color-info-light);
    background: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-info);
  }

  .suggestion-efficiency {
    font-size: var(--font-size-xs);
    color: var(--color-warning-light);
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .copy-button {
    background: none;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--text-primary);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 90%);
    }
  }

  @media (max-width: 768px) {
    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .export-buttons {
      flex-direction: column;
    }
  }
</style>
