<script lang="ts">
  import { processIPv6ZoneIdentifiers, type IPv6ZoneResult } from '$lib/utils/ipv6-zone-id.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools');
  });

  let inputText = $state('fe80::1\nfe80::1%eth0\nfe80::1234:5678:90ab:cdef%wlan0\n::1\n2001:db8::1\nff02::1%eth0');
  let result = $state<IPv6ZoneResult | null>(null);
  let isLoading = $state(false);
  const clipboard = useClipboard();

  function processAddresses() {
    if (!inputText.trim()) {
      result = null;
      return;
    }

    isLoading = true;

    try {
      const inputs = inputText.split('\n').filter((line) => line.trim());
      result = processIPv6ZoneIdentifiers(inputs);
    } catch (error) {
      result = {
        processings: [],
        summary: {
          totalInputs: 0,
          validInputs: 0,
          invalidInputs: 0,
          addressesWithZones: 0,
          addressesRequiringZones: 0,
        },
        errors: [error instanceof Error ? error.message : $t('tools.ipv6_zone_id.errors.unknownError')],
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
      const headers = [
        $t('tools.ipv6_zone_id.export.headers.input'),
        $t('tools.ipv6_zone_id.export.headers.hasZoneId'),
        $t('tools.ipv6_zone_id.export.headers.address'),
        $t('tools.ipv6_zone_id.export.headers.zoneId'),
        $t('tools.ipv6_zone_id.export.headers.addressType'),
        $t('tools.ipv6_zone_id.export.headers.requiresZoneId'),
        $t('tools.ipv6_zone_id.export.headers.withZone'),
        $t('tools.ipv6_zone_id.export.headers.withoutZone'),
        $t('tools.ipv6_zone_id.export.headers.valid'),
        $t('tools.ipv6_zone_id.export.headers.error'),
      ].join(',');
      const rows = result.processings.map(
        (proc) =>
          `"${proc.input}","${proc.hasZoneId}","${proc.address}","${proc.zoneId}","${proc.addressType}","${proc.requiresZoneId}","${proc.processing.withZone}","${proc.processing.withoutZone}","${proc.isValid}","${proc.error || ''}"`,
      );
      content = [headers, ...rows].join('\n');
      filename = `ipv6-zones-${timestamp}.csv`;
    } else {
      content = JSON.stringify(result, null, 2);
      filename = `ipv6-zones-${timestamp}.json`;
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getAddressTypeColor(type: string): string {
    switch (type) {
      case 'link-local':
        return 'var(--color-warning)';
      case 'unique-local':
        return 'var(--color-purple)';
      case 'multicast':
        return 'var(--color-error)';
      case 'global':
        return 'var(--color-success)';
      case 'loopback':
        return 'var(--color-info)';
      case 'unspecified':
        return 'var(--text-secondary)';
      default:
        return 'var(--text-primary)';
    }
  }

  function getAddressTypeDescription(type: string): string {
    switch (type) {
      case 'link-local':
        return $t('tools.ipv6_zone_id.addressTypes.linkLocal');
      case 'unique-local':
        return $t('tools.ipv6_zone_id.addressTypes.uniqueLocal');
      case 'multicast':
        return $t('tools.ipv6_zone_id.addressTypes.multicast');
      case 'global':
        return $t('tools.ipv6_zone_id.addressTypes.global');
      case 'loopback':
        return $t('tools.ipv6_zone_id.addressTypes.loopback');
      case 'unspecified':
        return $t('tools.ipv6_zone_id.addressTypes.unspecified');
      default:
        return $t('tools.ipv6_zone_id.addressTypes.unknown');
    }
  }

  // Auto-process when inputs change
  $effect(() => {
    if (inputText.trim()) {
      const timeoutId = setTimeout(processAddresses, 300);
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h2>{$t('tools.ipv6_zone_id.title')}</h2>
    <p>{$t('tools.ipv6_zone_id.description')}</p>
  </header>

  <div class="input-section">
    <div class="input-group">
      <label for="inputs">{$t('tools.ipv6_zone_id.input.label')}</label>
      <textarea id="inputs" bind:value={inputText} placeholder={$t('tools.ipv6_zone_id.input.placeholder')} rows="6"
      ></textarea>
      <div class="input-help">
        {$t('tools.ipv6_zone_id.input.help')}
      </div>
    </div>

    <div class="zone-info">
      <h3>{$t('tools.ipv6_zone_id.info.title')}</h3>
      <div class="info-section">
        <h4>{$t('tools.ipv6_zone_id.info.whenRequired.title')}</h4>
        <ul>
          <li>
            <strong>{$t('tools.ipv6_zone_id.info.whenRequired.linkLocal.type')}</strong>
            {$t('tools.ipv6_zone_id.info.whenRequired.linkLocal.description')}
          </li>
          <li>
            <strong>{$t('tools.ipv6_zone_id.info.whenRequired.multicast.type')}</strong>
            {$t('tools.ipv6_zone_id.info.whenRequired.multicast.description')}
          </li>
        </ul>
      </div>

      <div class="info-section">
        <h4>{$t('tools.ipv6_zone_id.info.commonIdentifiers.title')}</h4>
        <div class="zone-examples">
          <code>eth0</code>
          <code>wlan0</code>
          <code>en0</code>
          <code>lo</code>
          <code>%1</code>
          <code>%2</code>
        </div>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="loading">
      <Icon name="loader" />
      {$t('tools.ipv6_zone_id.processing')}
    </div>
  {/if}

  {#if result}
    <div class="results">
      {#if result.errors.length > 0}
        <div class="errors">
          <h3><Icon name="alert-triangle" /> {$t('tools.ipv6_zone_id.results.errors.title')}</h3>
          {#each result.errors as error (error)}
            <div class="error-item">{error}</div>
          {/each}
        </div>
      {/if}

      {#if result.processings.length > 0}
        <div class="summary">
          <h3>{$t('tools.ipv6_zone_id.results.summary.title')}</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-value">{result.summary.totalInputs}</span>
              <span class="stat-label">{$t('tools.ipv6_zone_id.results.summary.totalInputs')}</span>
            </div>
            <div class="stat valid">
              <span class="stat-value">{result.summary.validInputs}</span>
              <span class="stat-label">{$t('tools.ipv6_zone_id.results.summary.valid')}</span>
            </div>
            <div class="stat invalid">
              <span class="stat-value">{result.summary.invalidInputs}</span>
              <span class="stat-label">{$t('tools.ipv6_zone_id.results.summary.invalid')}</span>
            </div>
            <div class="stat with-zone">
              <span class="stat-value">{result.summary.addressesWithZones}</span>
              <span class="stat-label">{$t('tools.ipv6_zone_id.results.summary.withZones')}</span>
            </div>
            <div class="stat require-zone">
              <span class="stat-value">{result.summary.addressesRequiringZones}</span>
              <span class="stat-label">{$t('tools.ipv6_zone_id.results.summary.requireZones')}</span>
            </div>
          </div>
        </div>

        <div class="processings">
          <div class="processings-header">
            <h3>{$t('tools.ipv6_zone_id.results.processing.title')}</h3>
            <div class="export-buttons">
              <button onclick={() => exportResults('csv')}>
                <Icon name="csv-file" />
                {$t('tools.ipv6_zone_id.actions.exportCSV')}
              </button>
              <button onclick={() => exportResults('json')}>
                <Icon name="json-file" />
                {$t('tools.ipv6_zone_id.actions.exportJSON')}
              </button>
            </div>
          </div>

          <div class="processings-list">
            {#each result?.processings || [] as processing (processing.input)}
              <div class="processing-card" class:valid={processing.isValid} class:invalid={!processing.isValid}>
                <div class="card-header row">
                  <div class="address-info">
                    <div class="original-input">
                      <span class="input-label">{$t('tools.ipv6_zone_id.results.processing.input')}:</span>
                      <div class="input-with-copy">
                        <code>{processing.input}</code>
                        <button
                          type="button"
                          class:copied={clipboard.isCopied(`input-${processing.input}`)}
                          onclick={() => clipboard.copy(processing.input, `input-${processing.input}`)}
                          title={$t('tools.ipv6_zone_id.actions.copyInput')}
                        >
                          <Icon name={clipboard.isCopied(`input-${processing.input}`) ? 'check' : 'copy'} size="xs" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="status">
                    {#if processing.isValid}
                      <Icon name="check-circle" />
                    {:else}
                      <Icon name="x-circle" />
                    {/if}
                  </div>
                </div>

                {#if processing.isValid}
                  <div class="processing-details">
                    <div class="address-breakdown">
                      <div class="breakdown-item">
                        <span class="breakdown-label">{$t('tools.ipv6_zone_id.results.processing.address')}:</span>
                        <div class="input-with-copy">
                          <code>{processing.address}</code>
                          <button
                            type="button"
                            class:copied={clipboard.isCopied(`address-${processing.address}`)}
                            onclick={() => clipboard.copy(processing.address, `address-${processing.address}`)}
                            title={$t('tools.ipv6_zone_id.actions.copyAddress')}
                          >
                            <Icon
                              name={clipboard.isCopied(`address-${processing.address}`) ? 'check' : 'copy'}
                              size="xs"
                            />
                          </button>
                        </div>
                      </div>

                      {#if processing.hasZoneId}
                        <div class="breakdown-item">
                          <span class="breakdown-label">{$t('tools.ipv6_zone_id.results.processing.zoneId')}:</span>
                          <div class="input-with-copy">
                            <code>{processing.zoneId}</code>
                            <button
                              type="button"
                              class:copied={clipboard.isCopied(`zone-${processing.zoneId}`)}
                              onclick={() => clipboard.copy(processing.zoneId, `zone-${processing.zoneId}`)}
                              title={$t('tools.ipv6_zone_id.actions.copyZoneId')}
                            >
                              <Icon
                                name={clipboard.isCopied(`zone-${processing.zoneId}`) ? 'check' : 'copy'}
                                size="xs"
                              />
                            </button>
                          </div>
                          {#if processing.processing.zoneIdValid}
                            <span class="zone-status valid">
                              <Icon name="check" />
                              {$t('tools.ipv6_zone_id.results.processing.zoneStatus.valid')}
                            </span>
                          {:else}
                            <span class="zone-status invalid">
                              <Icon name="x" />
                              {$t('tools.ipv6_zone_id.results.processing.zoneStatus.invalid')}
                            </span>
                          {/if}
                        </div>
                      {:else}
                        <div class="breakdown-item">
                          <span class="breakdown-label">{$t('tools.ipv6_zone_id.results.processing.zoneId')}:</span>
                          <span class="no-zone">{$t('tools.ipv6_zone_id.results.processing.noZone')}</span>
                        </div>
                      {/if}
                    </div>

                    <div class="address-classification">
                      <div class="classification-item">
                        <span class="classification-label"
                          >{$t('tools.ipv6_zone_id.results.processing.addressType')}:</span
                        >
                        <span
                          class="address-type"
                          style="color: {getAddressTypeColor(processing.addressType)}"
                          title={getAddressTypeDescription(processing.addressType)}
                        >
                          <Icon name="info" />
                          {processing.addressType.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div class="classification-item">
                        <span class="classification-label"
                          >{$t('tools.ipv6_zone_id.results.processing.requiresZone')}:</span
                        >
                        <span
                          class="zone-requirement"
                          class:required={processing.requiresZoneId}
                          class:optional={!processing.requiresZoneId}
                        >
                          {processing.requiresZoneId
                            ? $t('tools.ipv6_zone_id.common.yes')
                            : $t('tools.ipv6_zone_id.common.no')}
                        </span>
                      </div>
                    </div>

                    <div class="processing-results">
                      <div class="result-item">
                        <span class="result-label">{$t('tools.ipv6_zone_id.results.processing.withZone')}:</span>
                        <div class="input-with-copy">
                          <code>{processing.processing.withZone}</code>
                          <button
                            type="button"
                            class:copied={clipboard.isCopied(`with-zone-${processing.processing.withZone}`)}
                            onclick={() =>
                              clipboard.copy(
                                processing.processing.withZone,
                                `with-zone-${processing.processing.withZone}`,
                              )}
                            title={$t('tools.ipv6_zone_id.actions.copyWithZone')}
                          >
                            <Icon
                              name={clipboard.isCopied(`with-zone-${processing.processing.withZone}`)
                                ? 'check'
                                : 'copy'}
                              size="xs"
                            />
                          </button>
                        </div>
                      </div>

                      <div class="result-item">
                        <span class="result-label">{$t('tools.ipv6_zone_id.results.processing.withoutZone')}:</span>
                        <div class="input-with-copy">
                          <code>{processing.processing.withoutZone}</code>
                          <button
                            type="button"
                            class:copied={clipboard.isCopied(`without-zone-${processing.processing.withoutZone}`)}
                            onclick={() =>
                              clipboard.copy(
                                processing.processing.withoutZone,
                                `without-zone-${processing.processing.withoutZone}`,
                              )}
                            title={$t('tools.ipv6_zone_id.actions.copyWithoutZone')}
                          >
                            <Icon
                              name={clipboard.isCopied(`without-zone-${processing.processing.withoutZone}`)
                                ? 'check'
                                : 'copy'}
                              size="xs"
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {#if processing.processing.suggestedZones.length > 0}
                      <div class="suggested-zones">
                        <h4>{$t('tools.ipv6_zone_id.results.processing.suggestedZones')}:</h4>
                        <div class="zones-list">
                          {#each processing.processing.suggestedZones as zone (zone)}
                            <button
                              type="button"
                              class="zone-button"
                              class:copied={clipboard.isCopied(`suggested-${zone}`)}
                              onclick={() => clipboard.copy(`${processing.address}%${zone}`, `suggested-${zone}`)}
                              title={$t('tools.ipv6_zone_id.actions.copyFullAddress')}
                            >
                              <code>{zone}</code>
                              <Icon name={clipboard.isCopied(`suggested-${zone}`) ? 'check' : 'copy'} size="xs" />
                            </button>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    {#if processing.requiresZoneId && !processing.hasZoneId}
                      <div class="zone-warning">
                        <Icon name="alert-triangle" />
                        {$t('tools.ipv6_zone_id.results.processing.zoneWarning')}
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div class="error-message">
                    <Icon name="alert-triangle" />
                    {processing.error}
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
    color: var(--color-primary);
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

  .zone-info {
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
  }

  .zone-info h3 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
    font-size: var(--font-size-md);
  }

  .info-section {
    margin-bottom: var(--spacing-md);
  }

  .info-section:last-child {
    margin-bottom: 0;
  }

  .info-section h4 {
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .info-section ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .info-section li {
    margin-bottom: var(--spacing-xs);
  }

  .zone-examples {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .zone-examples code {
    background: var(--bg-secondary);
    color: var(--color-primary);
    border: 1px solid var(--border-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 0.75rem;
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
  }

  .errors h3 {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    color: var(--color-error);
  }

  .error-item {
    color: var(--color-error);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-xs);
  }

  .summary {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .summary h3 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
  }

  .stat {
    text-align: center;
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
  }

  .stat.valid {
    background: var(--bg-tertiary);
    border: 1px solid color-mix(in srgb, var(--color-success), transparent 65%);
  }

  .stat.invalid {
    background: var(--bg-tertiary);
    border: 1px solid color-mix(in srgb, var(--color-error), transparent 65%);
  }

  .stat.with-zone {
    background: var(--bg-tertiary);
    border: 1px solid color-mix(in srgb, var(--color-info), transparent 65%);
  }

  .stat.require-zone {
    background: var(--bg-tertiary);
    border: 1px solid color-mix(in srgb, var(--color-warning), transparent 65%);
  }

  .stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat.valid .stat-value {
    color: var(--color-success);
  }

  .stat.invalid .stat-value {
    color: var(--color-error);
  }

  .stat.with-zone .stat-value {
    color: var(--color-info);
  }

  .stat.require-zone .stat-value {
    color: var(--color-warning);
  }

  .stat-label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .processings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  @media (max-width: 767px) {
    .processings-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }
  }

  .processings-header h3 {
    color: var(--text-primary);
  }

  .export-buttons {
    display: flex;
    gap: var(--spacing-sm);
  }

  .export-buttons button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-primary);
    color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
    }
  }

  .processings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .processing-card {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
  }

  .processing-card.valid {
    border-color: color-mix(in srgb, var(--color-success), transparent 65%);
    background: var(--bg-tertiary);
  }

  .processing-card.invalid {
    border-color: color-mix(in srgb, var(--color-error), transparent 65%);
    background: var(--bg-tertiary);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: var(--spacing-md);
  }

  .address-info {
    flex: 1;
  }

  .original-input {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .input-with-copy {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    /* flex: 1; */
    /* max-width: 28rem; */
  }

  @media (max-width: 767px) {
    .original-input {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-xs);
    }

    .input-with-copy {
      flex-direction: row;
      align-items: center;
    }
  }

  .input-label {
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 50px;
  }

  .input-with-copy code {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);
    flex: 1;
    min-width: 0;
    overflow-wrap: break-word;

    &:hover {
      background: var(--surface-hover);
      transform: translateY(-1px);
    }
  }

  .input-with-copy button {
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
    min-width: 32px;
    height: 32px;

    &:hover {
      background: var(--surface-hover);
      color: var(--color-primary);
      border-color: var(--color-primary);
      transform: translateY(-1px);
    }

    &.copied {
      background: var(--color-success);
      color: var(--bg-primary);
      border-color: var(--color-success);
      transform: scale(1.05);
    }
  }

  .status {
    color: var(--color-success);
    margin-left: var(--spacing-sm);
  }

  .processing-card.invalid .status {
    color: var(--color-error);
  }

  .processing-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .address-breakdown,
  .address-info {
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: 0.25rem;
  }

  .breakdown-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .breakdown-item:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 767px) {
    .breakdown-item {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-xs);
    }
  }

  .breakdown-label {
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 80px;
    font-size: 0.875rem;
  }

  .breakdown-item {
    .input-with-copy {
      flex: 1;
    }
  }

  .no-zone {
    color: var(--text-secondary);
    font-style: italic;
    font-size: var(--font-size-sm);
  }

  .zone-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);

    &.valid {
      color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 90%);
    }

    &.invalid {
      color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 90%);
    }
  }

  .address-classification,
  .processing-results {
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--bg-primary), transparent 40%);
    border-radius: var(--radius-sm);
  }

  .classification-item,
  .result-item {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
    margin-bottom: var(--spacing-sm);

    .result-label,
    .classification-label {
      min-width: 8rem;
    }
  }

  .classification-item:last-child,
  .result-item:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 767px) {
    .classification-item,
    .result-item {
      flex-direction: column;
      gap: var(--spacing-xs);
      align-items: stretch;
    }
  }

  .classification-label,
  .result-label {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .address-type {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 600;
    font-size: var(--font-size-sm);
  }

  .zone-requirement {
    font-weight: 600;
    font-size: var(--font-size-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);

    &.required {
      color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning), transparent 90%);
    }

    &.optional {
      color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 90%);
    }
  }

  .result-item code {
    background: var(--color-primary);
    color: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);

    &:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
    }
  }

  .suggested-zones {
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--bg-primary), transparent 40%);
    border-radius: var(--radius-sm);
  }

  .suggested-zones h4 {
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-size: 1rem;
  }

  .zones-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .zone-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
      transform: translateY(-1px);
    }

    &.copied {
      background: var(--color-success);
      color: var(--bg-primary);
      border-color: var(--color-success);
      transform: scale(1.05);
    }

    code {
      background: transparent;
      color: var(--text-primary);
      padding: 0;
      border-radius: 0;
      font-family: var(--font-mono);
      font-size: var(--font-size-xs);
      border: none;
    }
  }

  .zone-button.copied code {
    color: var(--bg-primary);
  }

  .zone-warning {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-warning), transparent 90%);
    border-radius: var(--radius-sm);
    color: var(--color-warning);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-error);
    font-size: var(--font-size-sm);
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--bg-primary), transparent 40%);
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
