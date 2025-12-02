<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { locale, loadTranslations, t } from '$lib/stores/language.js';
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics/glue-check');
  });

  let zoneName = $state('example.com');
  let loading = $state(false);
  let results = $state<any>(null);
  let error = $state<string | null>(null);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = $derived([
    { zone: $t('examples.items.0.zone'), description: $t('examples.items.0.description') },
    { zone: $t('examples.items.1.zone'), description: $t('examples.items.1.description') },
    { zone: $t('examples.items.2.zone'), description: $t('examples.items.2.description') },
    { zone: $t('examples.items.3.zone'), description: $t('examples.items.3.description') },
    { zone: $t('examples.items.4.zone'), description: $t('examples.items.4.description') },
    { zone: $t('examples.items.5.zone'), description: $t('examples.items.5.description') },
  ]);

  async function checkGlue() {
    if (!zoneName?.trim()) {
      error = $t('errors.emptyZone');
      return;
    }

    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'glue-check',
          zone: zoneName.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || $t('errors.fetchFailed'));
      }

      results = data;
    } catch (err) {
      error = err instanceof Error ? err.message : $t('errors.genericError');
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    zoneName = example.zone;
    selectedExampleIndex = index;
    checkGlue();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('title')}</h1>
    <p>{$t('description')}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>{$t('examples.title')}</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={$t('examples.title') + `: ${example.zone}`}
          >
            <h5>{example.zone}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('results.summary.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-group">
        <label for="zone">{$t('form.zoneName.label')}</label>
        <div class="input-flex-container">
          <input
            id="zone"
            type="text"
            bind:value={zoneName}
            placeholder={$t('form.zoneName.placeholder')}
            disabled={loading}
            onchange={() => clearExampleSelection()}
            onkeydown={(e) => e.key === 'Enter' && checkGlue()}
          />
          <button onclick={checkGlue} disabled={loading} class="primary">
            {#if loading}
              <Icon name="loader" size="sm" animate="spin" />
              {$t('form.checkButton.checking')}
            {:else}
              <Icon name="search" size="sm" />
              {$t('form.checkButton.default')}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>{$t('results.summary.title')}</strong>
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
            <h3>{$t('loading.title')}</h3>
            <p>{$t('loading.description')}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if results}
    <div class="card results-card">
      <div class="card-header">
        <h3>{$t('results.title')}</h3>
      </div>
      <div class="card-content">
        <div class="results-section">
          <div class="zone-info">
            <h2>Zone: {results.zone}</h2>
            {#if results.parent}
              <p class="parent-zone">Parent Zone: {results.parent}</p>
            {/if}
          </div>

          <div class="nameservers-section">
            <div class="section-header">
              <Icon name="server" size="md" />
              <h3>Nameservers Analysis</h3>
            </div>

            <div class="nameserver-grid">
              {#each results.nameservers as ns (ns.name)}
                <div
                  class="nameserver-card"
                  class:requires-glue={ns.requiresGlue}
                  class:has-issues={ns.status === 'error' || ns.status === 'warning'}
                >
                  <div class="ns-header">
                    <div class="ns-title">
                      <Icon name="dns" size="sm" />
                      <span class="ns-name">{ns.name}</span>
                    </div>
                    <div class="ns-badges">
                      {#if ns.requiresGlue}
                        <span class="glue-badge glue-required" use:tooltip={'This nameserver requires glue records'}>
                          <Icon name="link" size="xs" />
                          Glue Required
                        </span>
                      {:else}
                        <span class="glue-badge external" use:tooltip={'External nameserver - no glue needed'}>
                          <Icon name="external-link" size="xs" />
                          External
                        </span>
                      {/if}
                    </div>
                  </div>

                  <div class="ns-details">
                    {#if ns.requiresGlue}
                      <div class="glue-records">
                        <div class="record-group">
                          <div class="record-header">
                            <Icon name="globe" size="xs" />
                            <span class="record-label" use:tooltip={'IPv4 addresses for this nameserver'}
                              >A Records</span
                            >
                          </div>
                          {#if ns.glue.a && ns.glue.a.length > 0}
                            <div class="record-list">
                              {#each ns.glue.a as ip (ip)}
                                <span class="ip-address ipv4" use:tooltip={'IPv4 address: ' + ip}>
                                  <Icon name="globe" size="xs" />
                                  {ip}
                                </span>
                              {/each}
                            </div>
                          {:else}
                            <div class="missing-records">
                              <Icon name="x-circle" size="xs" />
                              <span class="missing" use:tooltip={'No IPv4 glue records found'}>No A records found</span>
                            </div>
                          {/if}
                        </div>

                        <div class="record-group">
                          <div class="record-header">
                            <Icon name="globe" size="xs" />
                            <span class="record-label" use:tooltip={'IPv6 addresses for this nameserver'}
                              >AAAA Records</span
                            >
                          </div>
                          {#if ns.glue.aaaa && ns.glue.aaaa.length > 0}
                            <div class="record-list">
                              {#each ns.glue.aaaa as ip (ip)}
                                <span class="ip-address ipv6" use:tooltip={'IPv6 address: ' + ip}>
                                  <Icon name="globe" size="xs" />
                                  {ip}
                                </span>
                              {/each}
                            </div>
                          {:else}
                            <div class="missing-records">
                              <Icon name="x-circle" size="xs" />
                              <span class="missing" use:tooltip={'No IPv6 glue records found'}
                                >No AAAA records found</span
                              >
                            </div>
                          {/if}
                        </div>
                      </div>
                    {:else}
                      <div class="external-ns-info">
                        <Icon name="info" size="sm" />
                        <div>
                          <p class="external-ns">External nameserver</p>
                          <span class="external-explanation"
                            >No glue records required as this nameserver is outside the zone</span
                          >
                        </div>
                      </div>
                    {/if}
                  </div>

                  {#if ns.status}
                    <div class="ns-status-footer">
                      <div
                        class="status-indicator"
                        class:error={ns.status === 'error'}
                        class:warning={ns.status === 'warning'}
                        class:success={ns.status === 'ok'}
                      >
                        {#if ns.status === 'error'}
                          <Icon name="alert-circle" size="sm" />
                          <span>Critical: No glue records found</span>
                        {:else if ns.status === 'warning'}
                          <Icon name="alert-triangle" size="sm" />
                          <span>Warning: Incomplete glue records</span>
                        {:else}
                          <Icon name="check-circle" size="sm" />
                          <span>Healthy: All glue records present</span>
                        {/if}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
    {#if results.summary}
      <div class="card">
        <div class="card-header">
          <h3>Glue Check Summary</h3>
        </div>
        <div class="card-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label" use:tooltip={'Total number of nameservers for this zone'}>Total Nameservers</div>
              <div class="stat-value">{results.summary.total}</div>
            </div>
            <div class="stat-card">
              <div
                class="stat-label"
                use:tooltip={'Nameservers that need glue records because they are in the same zone'}
              >
                Requiring Glue
              </div>
              <div class="stat-value">{results.summary.requiringGlue}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label" use:tooltip={'Nameservers that have complete glue records (A and/or AAAA)'}>
                With Valid Glue
              </div>
              <div
                class="stat-value"
                class:success={results.summary.withValidGlue === results.summary.requiringGlue}
                class:warning={results.summary.withValidGlue > 0 &&
                  results.summary.withValidGlue < results.summary.requiringGlue}
              >
                <Icon
                  name={results.summary.withValidGlue === results.summary.requiringGlue
                    ? 'check-circle'
                    : results.summary.withValidGlue > 0
                      ? 'alert-triangle'
                      : 'x-circle'}
                  size="sm"
                />
                {results.summary.withValidGlue}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label" use:tooltip={'Nameservers that require glue but are missing necessary records'}>
                Missing Glue
              </div>
              <div class="stat-value" class:error={results.summary.missingGlue > 0}>
                <Icon name={results.summary.missingGlue > 0 ? 'alert-circle' : 'check-circle'} size="sm" />
                {results.summary.missingGlue}
              </div>
            </div>
          </div>
        </div>
      </div>

      {#if results.summary.issues && results.summary.issues.length > 0}
        <div class="card">
          <div class="card-header">
            <h3>Issues Found</h3>
          </div>
          <div class="card-content">
            <div class="issues-section">
              <ul class="issues-list">
                {#each results.summary.issues as issue (issue)}
                  <li class="issue-item">
                    <Icon name="alert-circle" />
                    {issue}
                  </li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>

<style lang="scss">
  .zone-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-lg);
    background: var(--bg-secondary);
    padding: var(--spacing-md);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);

    h2 {
      margin: 0;
      font-size: var(--font-size-xl);
    }

    .parent-zone {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);

    h3 {
      margin: 0;
      color: var(--color-text-primary);
    }

    :global(svg) {
      color: var(--color-primary);
    }
  }

  .nameserver-grid {
    display: grid;
    gap: var(--spacing-lg);
  }

  .nameserver-card {
    background: var(--bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0;
    transition: all var(--transition-normal);
    overflow: hidden;

    &.requires-glue {
      border-color: var(--color-warning);
    }

    &.has-issues {
      border-color: var(--color-error);
    }
  }

  .ns-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);

    .ns-title {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      .ns-name {
        font-family: var(--font-mono);
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--color-text-primary);
      }

      :global(svg) {
        color: var(--color-primary);
      }
    }

    .ns-badges {
      display: flex;
      gap: var(--spacing-xs);
    }

    .glue-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-2xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-weight: 600;
      text-transform: uppercase;

      &.glue-required {
        background: color-mix(in srgb, var(--color-warning), transparent 90%);
        color: var(--color-warning);
        border: 1px solid color-mix(in srgb, var(--color-warning), transparent 80%);
      }

      &.external {
        background: color-mix(in srgb, var(--color-info), transparent 90%);
        color: var(--color-info);
        border: 1px solid color-mix(in srgb, var(--color-info), transparent 80%);
      }

      :global(svg) {
        width: var(--font-size-xs);
        height: var(--font-size-xs);
      }
    }
  }

  .ns-details {
    padding: var(--spacing-md);
  }

  .glue-records {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .record-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);

    .record-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);

      .record-label {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 600;
      }

      :global(svg) {
        color: var(--color-primary);
      }
    }

    .record-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
      margin-left: var(--spacing-md);
    }

    .ip-address {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-2xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);

      &.ipv4 {
        color: var(--color-info);
        border-color: color-mix(in srgb, var(--color-info), transparent 80%);
      }

      &.ipv6 {
        color: var(--color-success);
        border-color: color-mix(in srgb, var(--color-success), transparent 80%);
      }

      :global(svg) {
        width: var(--font-size-2xs);
        height: var(--font-size-2xs);
      }
    }

    .missing-records {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-left: var(--spacing-md);
      color: var(--color-error);

      .missing {
        font-style: italic;
        font-size: var(--font-size-sm);
      }

      :global(svg) {
        color: var(--color-error);
      }
    }
  }

  .external-ns-info {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);

    .external-ns {
      color: var(--color-text-primary);
      font-size: var(--font-size-md);
      font-weight: 600;
      margin: 0;
    }

    .external-explanation {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      margin-top: var(--spacing-2xs);
      display: block;
    }

    :global(svg) {
      color: var(--color-info);
      margin-top: var(--spacing-2xs);
    }
  }

  .ns-status-footer {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);

    .status-indicator {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: 500;

      &.error {
        background: color-mix(in srgb, var(--color-error), transparent 90%);
        color: var(--color-error);
        border: 1px solid color-mix(in srgb, var(--color-error), transparent 80%);
      }

      &.warning {
        background: color-mix(in srgb, var(--color-warning), transparent 90%);
        color: var(--color-warning);
        border: 1px solid color-mix(in srgb, var(--color-warning), transparent 80%);
      }

      &.success {
        background: color-mix(in srgb, var(--color-success), transparent 90%);
        color: var(--color-success);
        border: 1px solid color-mix(in srgb, var(--color-success), transparent 80%);
      }

      :global(svg) {
        width: var(--font-size-md);
        height: var(--font-size-md);
      }
    }
  }
</style>
