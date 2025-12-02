<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { analyzePTRCoverage, type PTRCoverageAnalysis } from '$lib/utils/reverse-dns.js';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  onMount(async () => {
    await loadTranslations(get(locale), 'tools');
  });

  let cidrInput = $state('192.168.1.0/24');
  let existingPTRsInput = $state(`100.1.168.192.in-addr.arpa
101.1.168.192.in-addr.arpa
105.1.168.192.in-addr.arpa
200.1.168.192.in-addr.arpa`);
  let namingPattern = $state('.*\\.example\\.com\\.$');

  let results = $state<{
    success: boolean;
    error?: string;
    analysis: PTRCoverageAnalysis;
  } | null>(null);

  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);
  let _userModified = $state(false);

  const examples = $derived([
    {
      label: $t('tools.ptr_sweep_planner.examples.partialCoverage.label'),
      cidr: '192.168.1.0/28',
      ptrs: `100.1.168.192.in-addr.arpa
101.1.168.192.in-addr.arpa
105.1.168.192.in-addr.arpa`,
      pattern: '.*\\.example\\.com\\.$',
      description: $t('tools.ptr_sweep_planner.examples.partialCoverage.description'),
    },
    {
      label: $t('tools.ptr_sweep_planner.examples.mixedNaming.label'),
      cidr: '10.0.0.0/28',
      ptrs: `1.0.0.10.in-addr.arpa
2.0.0.10.in-addr.arpa
10.0.0.10.in-addr.arpa
15.0.0.10.in-addr.arpa
20.0.0.10.in-addr.arpa`,
      pattern: 'host-.*\\.corp\\.com\\.$',
      description: $t('tools.ptr_sweep_planner.examples.mixedNaming.description'),
    },
    {
      label: $t('tools.ptr_sweep_planner.examples.ipv6Network.label'),
      cidr: '2001:db8:1000::/64',
      ptrs: `0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.8.b.d.0.1.0.0.2.ip6.arpa
1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.8.b.d.0.1.0.0.2.ip6.arpa`,
      pattern: '.*\\.ipv6\\.example\\.com\\.$',
      description: $t('tools.ptr_sweep_planner.examples.ipv6Network.description'),
    },
  ]);

  const patternHelp = $derived([
    { pattern: '.*\\.example\\.com\\.$', description: $t('tools.ptr_sweep_planner.patternHelp.anyExample') },
    { pattern: 'host-.*\\.corp\\.com\\.$', description: $t('tools.ptr_sweep_planner.patternHelp.hostCorp') },
    { pattern: '^[0-9-]+\\.net\\.example\\.com\\.$', description: $t('tools.ptr_sweep_planner.patternHelp.ipBased') },
    { pattern: '(server|workstation)-.*', description: $t('tools.ptr_sweep_planner.patternHelp.serverWorkstation') },
  ]);

  function loadExample(example: (typeof examples)[0]) {
    cidrInput = example.cidr;
    existingPTRsInput = example.ptrs;
    namingPattern = example.pattern;
    selectedExample = example.label;
    _userModified = false;
    analyzeCoverage();
  }

  function analyzeCoverage() {
    if (!cidrInput.trim()) {
      results = null;
      return;
    }

    try {
      const trimmedCidr = cidrInput.trim();
      const existingPTRs = existingPTRsInput
        .split('\n')
        .map((ptr) => ptr.trim())
        .filter((ptr) => ptr.length > 0);

      const analysis = analyzePTRCoverage(trimmedCidr, existingPTRs, namingPattern.trim() || undefined);

      results = {
        success: true,
        analysis,
      };
    } catch (error) {
      results = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        analysis: {
          cidr: '',
          totalAddresses: 0,
          expectedPTRs: [],
          missingPTRs: [],
          extraPTRs: [],
          patternMatches: 0,
          coverage: 0,
        },
      };
    }
  }

  function handleInputChange() {
    _userModified = true;
    selectedExample = null;
    analyzeCoverage();
  }

  function _generateDigCommands(missingPTRs: string[]): string {
    return missingPTRs
      .slice(0, 20)
      .map(
        (ptr) =>
          `dig +short -x ${ptr.replace(/(.*\.in-addr\.arpa|.*\.ip6\.arpa)$/, (match, domain) => {
            if (domain.includes('in-addr.arpa')) {
              // Convert IPv4 PTR back to IP
              const parts = domain.replace('.in-addr.arpa', '').split('.');
              return parts.reverse().join('.');
            } else {
              // IPv6 conversion is more complex, skip for now
              return ptr;
            }
          })}`,
      )
      .join('\n');
  }

  function generateCreateCommands(missingPTRs: string[]): string {
    return missingPTRs
      .slice(0, 20)
      .map((ptr) => {
        const recordName = ptr.split('.').slice(0, -4).join('.');
        return `${recordName}    IN    PTR    host-${recordName.split('.').reverse().join('-')}.example.com.`;
      })
      .join('\n');
  }

  // Analyze on component load
  analyzeCoverage();
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('tools.ptr_sweep_planner.title')}</h1>
    <p>{$t('tools.ptr_sweep_planner.description')}</p>
  </header>

  <!-- Educational Overview Card -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="search" size="sm" />
        <div>
          <strong>{$t('tools.ptr_sweep_planner.overview.coverageAnalysis.title')}:</strong>
          {$t('tools.ptr_sweep_planner.overview.coverageAnalysis.description')}
        </div>
      </div>
      <div class="overview-item">
        <Icon name="target" size="sm" />
        <div>
          <strong>{$t('tools.ptr_sweep_planner.overview.patternMatching.title')}:</strong>
          {$t('tools.ptr_sweep_planner.overview.patternMatching.description')}
        </div>
      </div>
      <div class="overview-item">
        <Icon name="list-check" size="sm" />
        <div>
          <strong>{$t('tools.ptr_sweep_planner.overview.gapAnalysis.title')}:</strong>
          {$t('tools.ptr_sweep_planner.overview.gapAnalysis.description')}
        </div>
      </div>
    </div>
  </div>

  <!-- Examples Card -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>{$t('tools.ptr_sweep_planner.examples.title')}</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example, idx (`${example.label}-${idx}`)}
          <button
            class="example-card {selectedExample === example.label ? 'active' : ''}"
            onclick={() => loadExample(example)}
          >
            <div class="example-header">
              <div class="example-label">{example.label}</div>
            </div>
            <div class="example-details">
              <div class="example-field">CIDR: <code>{example.cidr}</code></div>
              <div class="example-field">Pattern: <code>{example.pattern}</code></div>
              <div class="example-field">PTRs: {example.ptrs.split('\n').length} records</div>
            </div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Card -->
  <div class="card input-card">
    <!-- CIDR Input -->
    <div class="input-group">
      <label for="cidr-input" use:tooltip={$t('tools.ptr_sweep_planner.form.cidrBlock.tooltip')}>
        <Icon name="network" size="sm" />
        {$t('tools.ptr_sweep_planner.form.cidrBlock.label')}
      </label>
      <input
        id="cidr-input"
        type="text"
        bind:value={cidrInput}
        oninput={handleInputChange}
        placeholder={$t('tools.ptr_sweep_planner.form.cidrBlock.placeholder')}
        class="cidr-input {results?.success === true ? 'valid' : results?.success === false ? 'invalid' : ''}"
        spellcheck="false"
      />
    </div>

    <!-- Existing PTRs Input -->
    <div class="input-group">
      <label for="ptrs-input" use:tooltip={$t('tools.ptr_sweep_planner.form.existingPtrs.tooltip')}>
        <Icon name="list" size="sm" />
        {$t('tools.ptr_sweep_planner.form.existingPtrs.label')}
      </label>
      <textarea
        id="ptrs-input"
        bind:value={existingPTRsInput}
        oninput={handleInputChange}
        placeholder={$t('tools.ptr_sweep_planner.form.existingPtrs.placeholder')}
        class="ptrs-input"
        rows="8"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Naming Pattern -->
    <div class="input-group">
      <label for="pattern-input" use:tooltip={$t('tools.ptr_sweep_planner.form.namingPattern.tooltip')}>
        <Icon name="search" size="sm" />
        {$t('tools.ptr_sweep_planner.form.namingPattern.label')}
      </label>
      <input
        id="pattern-input"
        type="text"
        bind:value={namingPattern}
        oninput={handleInputChange}
        placeholder={$t('tools.ptr_sweep_planner.form.namingPattern.placeholder')}
        class="pattern-input"
        spellcheck="false"
      />

      <!-- Pattern Help -->
      <div class="pattern-help">
        <h4>{$t('tools.ptr_sweep_planner.patternHelp.title')}:</h4>
        <div class="pattern-examples">
          {#each patternHelp as item, helpIdx (`${item.pattern}-${helpIdx}`)}
            <button
              class="pattern-example"
              onclick={() => {
                namingPattern = item.pattern;
                handleInputChange();
              }}
            >
              <code class="pattern-code">{item.pattern}</code>
              <span class="pattern-desc">{item.description}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Results Card -->
  {#if results && cidrInput.trim()}
    <div class="card results-card">
      {#if results.success}
        <div class="results-header">
          <h3>{$t('tools.ptr_sweep_planner.results.title')}</h3>
          <div class="coverage-meter">
            <div class="coverage-bar">
              <div
                class="coverage-fill {results.analysis.coverage >= 80
                  ? 'good'
                  : results.analysis.coverage >= 50
                    ? 'fair'
                    : 'poor'}"
                style="width: {results.analysis.coverage}%"
              ></div>
            </div>
            <div class="coverage-text">
              {$t('tools.ptr_sweep_planner.results.coverage', { percentage: results.analysis.coverage.toFixed(1) })}
            </div>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-value">{results.analysis.totalAddresses}</span>
            <span class="stat-label">{$t('tools.ptr_sweep_planner.results.stats.expectedPtrs')}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{results.analysis.totalAddresses - results.analysis.missingPTRs.length}</span>
            <span class="stat-label">{$t('tools.ptr_sweep_planner.results.stats.foundPtrs')}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{results.analysis.missingPTRs.length}</span>
            <span class="stat-label">{$t('tools.ptr_sweep_planner.results.stats.missingPtrs')}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{results.analysis.extraPTRs.length}</span>
            <span class="stat-label">{$t('tools.ptr_sweep_planner.results.stats.extraPtrs')}</span>
          </div>
          {#if namingPattern.trim()}
            <div class="stat-item">
              <span class="stat-value">{results.analysis.patternMatches}</span>
              <span class="stat-label">{$t('tools.ptr_sweep_planner.results.stats.patternMatches')}</span>
            </div>
          {/if}
        </div>

        <!-- Analysis Sections -->
        <div class="analysis-sections">
          <!-- Missing PTRs -->
          {#if results.analysis.missingPTRs.length > 0}
            <div class="analysis-section">
              <div class="section-header">
                <h4>
                  <Icon name="alert-circle" size="sm" />
                  {$t('tools.ptr_sweep_planner.results.sections.missingPtrs.title', {
                    count: results.analysis.missingPTRs.length,
                  })}
                </h4>
                <button
                  class="copy-button {clipboard.isCopied('missing-ptrs') ? 'copied' : ''}"
                  onclick={() => results && clipboard.copy(results.analysis.missingPTRs.join('\n'), 'missing-ptrs')}
                >
                  <Icon name={clipboard.isCopied('missing-ptrs') ? 'check' : 'copy'} size="sm" />
                  {$t('tools.ptr_sweep_planner.results.copyList')}
                </button>
              </div>

              <div class="records-list">
                {#each results.analysis.missingPTRs.slice(0, 20) as ptr, index (`missing-${ptr}-${index}`)}
                  <div class="record-item missing">
                    <code>{ptr}</code>
                  </div>
                {/each}
                {#if results.analysis.missingPTRs.length > 20}
                  <div class="records-truncated">
                    {$t('tools.ptr_sweep_planner.results.sections.missingPtrs.truncated', {
                      count: results.analysis.missingPTRs.length - 20,
                    })}
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Extra PTRs -->
          {#if results.analysis.extraPTRs.length > 0}
            <div class="analysis-section">
              <div class="section-header">
                <h4>
                  <Icon name="plus-circle" size="sm" />
                  {$t('tools.ptr_sweep_planner.results.sections.extraPtrs.title', {
                    count: results.analysis.extraPTRs.length,
                  })}
                </h4>
                <button
                  class="copy-button {clipboard.isCopied('extra-ptrs') ? 'copied' : ''}"
                  onclick={() => results && clipboard.copy(results.analysis.extraPTRs.join('\n'), 'extra-ptrs')}
                >
                  <Icon name={clipboard.isCopied('extra-ptrs') ? 'check' : 'copy'} size="sm" />
                  {$t('tools.ptr_sweep_planner.results.copyList')}
                </button>
              </div>

              <div class="records-list">
                {#each results.analysis.extraPTRs.slice(0, 10) as ptr, index (`extra-${ptr}-${index}`)}
                  <div class="record-item extra">
                    <code>{ptr}</code>
                  </div>
                {/each}
                {#if results.analysis.extraPTRs.length > 10}
                  <div class="records-truncated">
                    {$t('tools.ptr_sweep_planner.results.sections.extraPtrs.truncated', {
                      count: results.analysis.extraPTRs.length - 10,
                    })}
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Action Items -->
          <div class="analysis-section">
            <div class="section-header">
              <h4>
                <Icon name="clipboard-list" size="sm" />
                {$t('tools.ptr_sweep_planner.results.actions.title')}
              </h4>
            </div>

            <div class="action-items">
              {#if results.analysis.missingPTRs.length > 0}
                <div class="action-item">
                  <div class="action-header">
                    <Icon name="plus" size="sm" />
                    <span>{$t('tools.ptr_sweep_planner.results.actions.createMissing.title')}</span>
                    <button
                      class="copy-button {clipboard.isCopied('create-commands') ? 'copied' : ''}"
                      onclick={() =>
                        results &&
                        clipboard.copy(generateCreateCommands(results.analysis.missingPTRs), 'create-commands')}
                    >
                      <Icon name={clipboard.isCopied('create-commands') ? 'check' : 'copy'} size="sm" />
                      {$t('tools.ptr_sweep_planner.results.actions.createMissing.copyZoneLines')}
                    </button>
                  </div>
                  <div class="action-description">
                    {$t('tools.ptr_sweep_planner.results.actions.createMissing.description', {
                      count: results.analysis.missingPTRs.length,
                    })}
                  </div>
                </div>
              {/if}

              {#if results.analysis.extraPTRs.length > 0}
                <div class="action-item">
                  <div class="action-header">
                    <Icon name="trash-2" size="sm" />
                    <span>{$t('tools.ptr_sweep_planner.results.actions.reviewExtra.title')}</span>
                  </div>
                  <div class="action-description">
                    {$t('tools.ptr_sweep_planner.results.actions.reviewExtra.description', {
                      count: results.analysis.extraPTRs.length,
                    })}
                  </div>
                </div>
              {/if}

              {#if namingPattern.trim() && results.analysis.patternMatches < results.analysis.totalAddresses - results.analysis.missingPTRs.length}
                <div class="action-item">
                  <div class="action-header">
                    <Icon name="edit" size="sm" />
                    <span>{$t('tools.ptr_sweep_planner.results.actions.fixPattern.title')}</span>
                  </div>
                  <div class="action-description">
                    {$t('tools.ptr_sweep_planner.results.actions.fixPattern.description', {
                      count:
                        results.analysis.totalAddresses -
                        results.analysis.missingPTRs.length -
                        results.analysis.patternMatches,
                    })}
                  </div>
                </div>
              {/if}

              {#if results.analysis.coverage >= 95}
                <div class="action-item success">
                  <div class="action-header">
                    <Icon name="check-circle" size="sm" />
                    <span>{$t('tools.ptr_sweep_planner.results.actions.excellentCoverage.title')}</span>
                  </div>
                  <div class="action-description">
                    {$t('tools.ptr_sweep_planner.results.actions.excellentCoverage.description', {
                      percentage: results.analysis.coverage.toFixed(1),
                    })}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {:else}
        <div class="error-result">
          <Icon name="alert-triangle" size="lg" />
          <h4>{$t('tools.ptr_sweep_planner.error.title')}</h4>
          <p>{results.error}</p>
          <div class="error-help">
            <strong>{$t('tools.ptr_sweep_planner.error.checkInput')}:</strong>
            <ul>
              <li>{$t('tools.ptr_sweep_planner.error.help.cidr')}</li>
              <li>{$t('tools.ptr_sweep_planner.error.help.ptrRecords')}</li>
              <li>{$t('tools.ptr_sweep_planner.error.help.pattern')}</li>
            </ul>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Educational Content Card -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>{$t('tools.ptr_sweep_planner.education.ptrCoverage.title')}</h4>
        <p>
          {$t('tools.ptr_sweep_planner.education.ptrCoverage.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools.ptr_sweep_planner.education.namingPattern.title')}</h4>
        <p>
          {$t('tools.ptr_sweep_planner.education.namingPattern.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools.ptr_sweep_planner.education.commonIssues.title')}</h4>
        <p>
          {$t('tools.ptr_sweep_planner.education.commonIssues.description')}
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>{$t('tools.ptr_sweep_planner.education.remediation.title')}</h4>
        <p>
          {$t('tools.ptr_sweep_planner.education.remediation.description')}
        </p>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .info-card {
    margin-bottom: var(--spacing-xl);
  }

  .overview-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .overview-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
    }
  }

  .examples-card {
    margin-bottom: var(--spacing-xl);
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
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
      border-color: var(--border-primary);
      transform: translateY(-1px);
    }

    &.active {
      background-color: var(--surface-hover);
      border-color: var(--border-primary);
      box-shadow: var(--shadow-md);
    }
  }

  .example-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .example-field {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    code {
      font-size: var(--font-size-xs);
      color: var(--text-primary);
    }
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .input-card {
    margin-bottom: var(--spacing-xl);
  }

  .input-group {
    margin-bottom: var(--spacing-lg);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .cidr-input,
  .pattern-input {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-lg);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--border-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }
  }

  .cidr-input {
    &.valid {
      border-color: var(--color-success);
    }

    &.invalid {
      border-color: var(--color-error);
    }
  }

  .ptrs-input {
    width: 100%;
    padding: var(--spacing-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);
    resize: vertical;
    min-height: 120px;

    &:focus {
      outline: none;
      border-color: var(--border-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }
  }

  .pattern-help {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-secondary);

    h4 {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }
  }

  .pattern-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .pattern-example {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--spacing-xs);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background-color var(--transition-fast);

    &:hover {
      background-color: var(--surface-hover);
    }
  }

  .pattern-code {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
  }

  .pattern-desc {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .results-card {
    margin-bottom: var(--spacing-xl);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
      align-items: stretch;
    }

    h3 {
      margin: 0;
    }
  }

  .coverage-meter {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .coverage-bar {
    width: 200px;
    height: 20px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    overflow: hidden;

    @media (max-width: 768px) {
      width: 100%;
    }
  }

  .coverage-fill {
    height: 100%;
    transition: width var(--transition-slow);

    &.good {
      background-color: var(--color-success);
    }

    &.fair {
      background-color: var(--color-warning);
    }

    &.poor {
      background-color: var(--color-error);
    }
  }

  .coverage-text {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-align: center;
  }

  .analysis-sections {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .analysis-section {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);

      h4 {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        margin: 0;
      }
    }
  }

  .records-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-xs);
  }

  .record-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);

    &.missing {
      background-color: rgba(var(--color-error-rgb), 0.1);
      border: 1px solid rgba(var(--color-error-rgb), 0.2);
    }

    &.extra {
      background-color: rgba(var(--color-warning-rgb), 0.1);
      border: 1px solid rgba(var(--color-warning-rgb), 0.2);
    }

    code {
      font-size: var(--font-size-xs);
      background: none;
      color: var(--text-primary);
    }
  }

  .records-truncated {
    grid-column: 1 / -1;
    text-align: center;
    font-style: italic;
    color: var(--text-secondary);
    padding: var(--spacing-md);
  }

  .action-items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .action-item {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    &.success {
      border-color: var(--color-success);
      background-color: rgba(var(--color-success-rgb), 0.05);
    }

    .action-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-xs);
      font-weight: 600;
      color: var(--text-primary);
    }

    .action-description {
      color: var(--text-secondary);
      line-height: 1.4;
    }
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: 1px solid var(--border-primary);
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);

    &:hover {
      background-color: var(--surface-hover);
      color: var(--text-primary);
      border-color: var(--border-primary);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .error-result {
    text-align: center;
    padding: var(--spacing-xl);
    background-color: var(--bg-secondary);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-lg);
    color: var(--color-error-light);

    :global(.icon) {
      color: var(--color-error);
      margin-bottom: var(--spacing-md);
    }

    h4 {
      margin-bottom: var(--spacing-md);
    }

    p {
      margin-bottom: var(--spacing-lg);
    }
  }

  .error-help {
    text-align: left;
    background-color: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    color: var(--text-secondary);

    ul {
      margin-top: var(--spacing-sm);
      padding-left: var(--spacing-lg);

      li {
        margin-bottom: var(--spacing-xs);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
      }
    }
  }

  .education-card {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
  }

  .education-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .records-list {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }

    .action-item .action-header {
      flex-wrap: wrap;
    }
  }
</style>
