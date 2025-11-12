<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { generateULAAddresses, parseULA, type ULAResult } from '$lib/utils/ula';

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools/ula-generator');
  });

  let count = 1;
  let subnetIds = '';
  let result: ULAResult | null = null;
  let loading = false;
  let parseInput = '';
  let parseResult: ReturnType<typeof parseULA> | null = null;

  async function generateULAs() {
    if (count < 1 || count > 100) return;

    loading = true;

    try {
      // Parse subnet IDs if provided
      const subnetIdArray = subnetIds
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      result = generateULAAddresses(count, subnetIdArray.length > 0 ? subnetIdArray : undefined);
    } finally {
      loading = false;
    }
  }

  function parseULAAddress() {
    if (!parseInput.trim()) {
      parseResult = null;
      return;
    }
    parseResult = parseULA(parseInput.trim());
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text);
  }
</script>

<div class="container">
  <div class="card">
    <h2>{$t('tools.ula-generator.title')}</h2>
    <p>{$t('tools.ula-generator.description')}</p>

    <div class="input-section">
      <div class="input-group">
        <label for="count">{$t('tools.ula-generator.form.count.label')}</label>
        <input
          id="count"
          type="number"
          min="1"
          max="100"
          bind:value={count}
          placeholder={$t('tools.ula-generator.form.count.placeholder')}
        />
      </div>

      <div class="input-group">
        <label for="subnet-ids">{$t('tools.ula-generator.form.subnetIds.label')}</label>
        <textarea
          id="subnet-ids"
          bind:value={subnetIds}
          rows="3"
          placeholder={$t('tools.ula-generator.form.subnetIds.placeholder')}
        ></textarea>
        <small>{$t('tools.ula-generator.form.subnetIds.helpText')}</small>
      </div>

      <button on:click={generateULAs} disabled={loading || count < 1 || count > 100} class="generate-btn">
        {loading ? $t('tools.ula-generator.buttons.generating') : $t('tools.ula-generator.buttons.generate')}
      </button>
    </div>

    {#if result}
      <div class="results-section">
        <div class="summary">
          <h3>{$t('tools.ula-generator.results.summary.title')}</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="label">{$t('tools.ula-generator.results.summary.stats.totalRequested')}</span>
              <span class="value">{result.summary.totalRequests}</span>
            </div>
            <div class="stat">
              <span class="label">{$t('tools.ula-generator.results.summary.stats.successfullyGenerated')}</span>
              <span class="value success">{result.summary.successfulGenerations}</span>
            </div>
            {#if result.summary.failedGenerations > 0}
              <div class="stat">
                <span class="label">{$t('tools.ula-generator.results.summary.stats.failed')}</span>
                <span class="value error">{result.summary.failedGenerations}</span>
              </div>
            {/if}
          </div>
        </div>

        {#if result.errors.length > 0}
          <div class="errors">
            <h4>{$t('tools.ula-generator.results.errors.title')}</h4>
            <ul>
              {#each result.errors as error, index (index)}
                <li class="error">{error}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if result.generations.some((g) => g.isValid)}
          <div class="generations">
            <h3>{$t('tools.ula-generator.results.addresses.title')}</h3>
            {#each result.generations as generation, i (generation.globalID)}
              {#if generation.isValid}
                <div class="generation-result">
                  <div class="generation-header">
                    <h4>{$t('tools.ula-generator.results.addresses.ulaNumber')}{i + 1}</h4>
                    <button
                      class="copy-btn"
                      on:click={() => copyToClipboard(generation.network)}
                      title={$t('tools.ula-generator.buttons.copyTooltip')}
                    >
                      📋
                    </button>
                  </div>

                  <div class="address-info">
                    <div class="address-row">
                      <span class="label">{$t('tools.ula-generator.results.addresses.network')}</span>
                      <code class="network">{generation.network}</code>
                    </div>
                    <div class="address-row">
                      <span class="label">{$t('tools.ula-generator.results.addresses.prefix')}</span>
                      <code>{generation.fullPrefix}::/64</code>
                    </div>
                  </div>

                  <div class="components">
                    <h5>{$t('tools.ula-generator.results.components.title')}</h5>
                    <div class="component-grid">
                      <div class="component">
                        <span class="comp-label">{$t('tools.ula-generator.results.components.ulaPrefix')}</span>
                        <code>{generation.prefix}</code>
                        <small>{generation.details.prefixBinary}</small>
                      </div>
                      <div class="component">
                        <span class="comp-label">{$t('tools.ula-generator.results.components.globalId')}</span>
                        <code>{generation.globalID}</code>
                        <small>{generation.details.globalIDBinary}</small>
                      </div>
                      <div class="component">
                        <span class="comp-label">{$t('tools.ula-generator.results.components.subnetId')}</span>
                        <code>{generation.subnetID}</code>
                        <small>{generation.details.subnetIDBinary}</small>
                      </div>
                    </div>
                  </div>

                  <div class="generation-details">
                    <h5>{$t('tools.ula-generator.results.details.title')}</h5>
                    <div class="detail-grid">
                      <div class="detail">
                        <span class="detail-label">{$t('tools.ula-generator.results.details.algorithm')}</span>
                        <span>{generation.details.algorithm}</span>
                      </div>
                      <div class="detail">
                        <span class="detail-label">{$t('tools.ula-generator.results.details.timestamp')}</span>
                        <span>{new Date(generation.details.timestamp).toISOString()}</span>
                      </div>
                      <div class="detail">
                        <span class="detail-label">{$t('tools.ula-generator.results.details.entropy')}</span>
                        <code>{generation.details.entropy}</code>
                      </div>
                    </div>
                  </div>
                </div>
              {:else}
                <div class="generation-result error-result">
                  <h4>
                    {$t('tools.ula-generator.results.addresses.ulaNumber')}{i + 1}
                    {$t('tools.ula-generator.results.addresses.error')}
                  </h4>
                  <p class="error">{generation.error}</p>
                </div>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="card">
    <h3>{$t('tools.ula-generator.parser.title')}</h3>
    <p>{$t('tools.ula-generator.parser.description')}</p>

    <div class="input-group">
      <label for="parse-input">{$t('tools.ula-generator.parser.form.address.label')}</label>
      <input
        id="parse-input"
        type="text"
        bind:value={parseInput}
        on:input={parseULAAddress}
        placeholder={$t('tools.ula-generator.parser.form.address.placeholder')}
      />
    </div>

    {#if parseResult}
      {#if parseResult.isValid}
        <div class="parse-results">
          <h4>{$t('tools.ula-generator.parser.results.title')}</h4>
          <div class="component-grid">
            <div class="component">
              <span class="comp-label">{$t('tools.ula-generator.parser.results.components.ulaPrefix')}</span>
              <code>{parseResult.prefix}</code>
            </div>
            <div class="component">
              <span class="comp-label">{$t('tools.ula-generator.parser.results.components.globalId')}</span>
              <code>{parseResult.globalID}</code>
            </div>
            <div class="component">
              <span class="comp-label">{$t('tools.ula-generator.parser.results.components.subnetId')}</span>
              <code>{parseResult.subnetID}</code>
            </div>
            {#if parseResult.interfaceID}
              <div class="component">
                <span class="comp-label">{$t('tools.ula-generator.parser.results.components.interfaceId')}</span>
                <code>{parseResult.interfaceID}</code>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="error-message">
          <p class="error">{parseResult.error}</p>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-md);
  }

  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  .card h2 {
    color: var(--color-primary);
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-xl);
  }

  .card h3 {
    color: var(--color-primary);
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-lg);
  }

  .card p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    line-height: 1.5;
  }

  .input-section {
    margin-bottom: var(--spacing-lg);
  }

  .input-group {
    margin-bottom: var(--spacing-md);
  }

  .input-group label {
    display: block;
    color: var(--text-primary);
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
  }

  .input-group input,
  .input-group textarea {
    width: 100%;
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .input-group small {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-xs);
    display: block;
  }

  .generate-btn {
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .generate-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }

  .generate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .results-section {
    margin-top: var(--spacing-lg);
  }

  .summary {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .summary h3 {
    margin: 0 0 var(--spacing-sm) 0;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-sm);
  }

  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat .label {
    color: var(--text-secondary);
  }

  .stat .value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .stat .value.success {
    color: var(--color-success);
  }

  .stat .value.error {
    color: var(--color-error);
  }

  .errors {
    background: var(--bg-tertiary);
    border: 1px solid var(--color-error);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .errors h4 {
    color: var(--color-error);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .errors ul {
    margin: 0;
    padding-left: var(--spacing-md);
  }

  .error {
    color: var(--color-error);
  }

  .generations {
    margin-top: var(--spacing-md);
  }

  .generation-result {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .generation-result.error-result {
    border-color: var(--color-error);
  }

  .generation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .generation-header h4 {
    margin: 0;
    color: var(--text-primary);
  }

  .copy-btn {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: var(--spacing-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .copy-btn:hover {
    background: var(--bg-secondary);
    border-color: var(--color-primary);
  }

  .address-info {
    margin-bottom: var(--spacing-md);
  }

  .address-row {
    display: flex;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .address-row .label {
    color: var(--text-secondary);
    width: 80px;
    flex-shrink: 0;
  }

  .address-row code {
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .network {
    color: var(--color-success) !important;
  }

  .components,
  .generation-details {
    margin-bottom: var(--spacing-md);
  }

  .components h5,
  .generation-details h5 {
    color: var(--text-primary);
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-md);
  }

  .component-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-sm);
  }

  .component {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: var(--spacing-sm);
  }

  .comp-label {
    display: block;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);
  }

  .component code {
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-weight: 600;
    display: block;
    margin-bottom: var(--spacing-xs);
  }

  .component small {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    word-break: break-all;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-sm);
  }

  .detail {
    display: flex;
    flex-direction: column;
  }

  .detail-label {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);
  }

  .detail span:not(.detail-label) {
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .parse-results {
    margin-top: var(--spacing-md);
  }

  .parse-results h4 {
    color: var(--text-primary);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .error-message {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--color-error);
    border-radius: var(--border-radius);
  }
</style>
