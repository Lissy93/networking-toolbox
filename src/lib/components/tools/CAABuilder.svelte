<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { SvelteSet } from 'svelte/reactivity';
  import { t } from '$lib/stores/language';

  interface CAARecord {
    flag: number;
    tag: 'issue' | 'issuewild' | 'iodef';
    value: string;
    enabled: boolean;
  }

  let domain = $state('example.com');
  let records = $state<CAARecord[]>([
    { flag: 0, tag: 'issue', value: '', enabled: false },
    { flag: 0, tag: 'issuewild', value: '', enabled: false },
    { flag: 0, tag: 'iodef', value: '', enabled: false },
  ]);

  let showExamples = $state(false);
  let selectedExample = $state<string | null>(null);

  // Button success states
  let buttonStates = $state<Record<string, boolean>>({});

  const commonCAs = [
    { name: "Let's Encrypt", value: 'letsencrypt.org' },
    { name: 'DigiCert', value: 'digicert.com' },
    { name: 'Sectigo', value: 'sectigo.com' },
    { name: 'GlobalSign', value: 'globalsign.com' },
    { name: 'GoDaddy', value: 'godaddy.com' },
    { name: 'Amazon (ACM)', value: 'amazon.com' },
    { name: 'Google Trust Services', value: 'pki.goog' },
    { name: 'Cloudflare', value: 'comodoca.com' },
  ];

  const tagDescriptions = $derived({
    issue: $t('tools/caa-builder.tags.issue'),
    issuewild: $t('tools/caa-builder.tags.issuewild'),
    iodef: $t('tools/caa-builder.tags.iodef'),
  });

  const _flagDescriptions = $derived({
    0: $t('tools/caa-builder.flags.descriptions.0'),
    128: $t('tools/caa-builder.flags.descriptions.128'),
  });

  const caaRecords = $derived.by(() => {
    return records
      .filter((record) => record.enabled && record.value.trim())
      .map((record) => {
        let value = record.value.trim();

        // Format iodef values properly
        if (record.tag === 'iodef') {
          if (value.includes('@') && !value.startsWith('mailto:')) {
            value = `mailto:${value}`;
          } else if (value.startsWith('http') && !value.startsWith('http://') && !value.startsWith('https://')) {
            value = `https://${value}`;
          }
        }

        return `${domain}. IN CAA ${record.flag} ${record.tag} "${value}"`;
      });
  });

  const validation = $derived.by(() => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const enabledRecords = records.filter((r) => r.enabled);

    // Check domain format
    if (!domain.trim()) {
      errors.push($t('tools/caa-builder.validation.errors.domainRequired'));
    } else if (!domain.includes('.')) {
      warnings.push($t('tools/caa-builder.validation.warnings.domainNoTLD'));
    }

    // Check if any records are enabled
    if (enabledRecords.length === 0) {
      warnings.push($t('tools/caa-builder.validation.warnings.noRecordsEnabled'));
    }

    // Check for issue records
    const issueRecords = enabledRecords.filter((r) => r.tag === 'issue');
    const issuewildRecords = enabledRecords.filter((r) => r.tag === 'issuewild');

    if (issueRecords.length === 0 && issuewildRecords.length === 0) {
      warnings.push($t('tools/caa-builder.validation.warnings.noIssueRecords'));
    }

    // Check for wildcard without base issue
    if (issuewildRecords.length > 0 && issueRecords.length === 0) {
      warnings.push($t('tools/caa-builder.validation.warnings.wildcardWithoutBase'));
    }

    // Check for deny-all configuration
    const hasIssueNone = issueRecords.some((r) => r.value.trim() === ';');
    const hasIssuewildNone = issuewildRecords.some((r) => r.value.trim() === ';');

    if (hasIssueNone && hasIssuewildNone) {
      warnings.push($t('tools/caa-builder.validation.warnings.denyAll'));
    }

    // Validate iodef records
    const iodefRecords = enabledRecords.filter((r) => r.tag === 'iodef');
    for (const record of iodefRecords) {
      const value = record.value.trim();
      if (value) {
        if (value.includes('@')) {
          // Email format
          if (!value.includes('@') || (!value.startsWith('mailto:') && value.indexOf('@') === -1)) {
            errors.push($t('tools/caa-builder.validation.errors.invalidIodefEmail'));
          }
        } else if (!value.startsWith('http://') && !value.startsWith('https://')) {
          warnings.push($t('tools/caa-builder.validation.warnings.iodefURLFormat'));
        }
      }
    }

    // Check for conflicting records
    const duplicateValues = new SvelteSet<string>();
    const seen = new SvelteSet<string>();

    for (const record of enabledRecords) {
      const key = `${record.tag}:${record.value.trim()}`;
      if (seen.has(key)) {
        duplicateValues.add(record.value.trim());
      }
      seen.add(key);
    }

    if (duplicateValues.size > 0) {
      warnings.push(
        $t('tools/caa-builder.validation.warnings.duplicateRecords', {
          duplicates: Array.from(duplicateValues).join(', '),
        }),
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recordCount: enabledRecords.length,
    };
  });

  function addRecord(tag: 'issue' | 'issuewild' | 'iodef'): void {
    records.push({
      flag: 0,
      tag,
      value: '',
      enabled: true,
    });
    records = records;
  }

  function removeRecord(index: number): void {
    records.splice(index, 1);
    records = records;
  }

  function addCA(recordIndex: number, ca: string): void {
    records[recordIndex].value = ca;
    records[recordIndex].enabled = true;
    records = records;
  }

  function showButtonSuccess(buttonId: string): void {
    buttonStates[buttonId] = true;
    setTimeout(() => {
      buttonStates[buttonId] = false;
    }, 2000);
  }

  function copyToClipboard(text: string, buttonId: string): void {
    navigator.clipboard.writeText(text);
    showButtonSuccess(buttonId);
  }

  function exportAsZoneFile(): void {
    const zoneContent = caaRecords.join('\n');
    const blob = new Blob([zoneContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-caa-records.zone`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showButtonSuccess('export-caa');
  }

  const exampleConfigurations = $derived([
    {
      name: $t('tools/caa-builder.examples.letsEncryptOnly.name'),
      description: $t('tools/caa-builder.examples.letsEncryptOnly.description'),
      domain: 'example.com',
      records: [
        { flag: 0, tag: 'issue' as const, value: 'letsencrypt.org', enabled: true },
        { flag: 0, tag: 'iodef' as const, value: 'security@example.com', enabled: true },
      ],
    },
    {
      name: $t('tools/caa-builder.examples.multipleCAs.name'),
      description: $t('tools/caa-builder.examples.multipleCAs.description'),
      domain: 'mycompany.com',
      records: [
        { flag: 0, tag: 'issue' as const, value: 'letsencrypt.org', enabled: true },
        { flag: 0, tag: 'issue' as const, value: 'digicert.com', enabled: true },
        { flag: 0, tag: 'issuewild' as const, value: 'letsencrypt.org', enabled: true },
        { flag: 0, tag: 'iodef' as const, value: 'certificates@mycompany.com', enabled: true },
      ],
    },
    {
      name: $t('tools/caa-builder.examples.noCertificates.name'),
      description: $t('tools/caa-builder.examples.noCertificates.description'),
      domain: 'secure.example.com',
      records: [
        { flag: 0, tag: 'issue' as const, value: ';', enabled: true },
        { flag: 0, tag: 'issuewild' as const, value: ';', enabled: true },
        { flag: 0, tag: 'iodef' as const, value: 'security@example.com', enabled: true },
      ],
    },
  ]);

  function loadExample(example: (typeof exampleConfigurations)[0]): void {
    domain = example.domain;

    // Reset all records
    records = records.map((r) => ({ ...r, enabled: false, value: '' }));

    // Add example records
    for (const exampleRecord of example.records) {
      const existingIndex = records.findIndex((r) => r.tag === exampleRecord.tag && !r.enabled);

      if (existingIndex >= 0) {
        records[existingIndex] = { ...exampleRecord };
      } else {
        records.push({ ...exampleRecord });
      }
    }

    records = records;
    selectedExample = example.name;
    showExamples = false;
  }

  const securityTips = $derived($t('tools/caa-builder.securityGuide.tips'));
</script>

<div class="card">
  <div class="card-header">
    <h1>{$t('tools/caa-builder.title')}</h1>
    <p class="card-subtitle">
      {$t('tools/caa-builder.description')}
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="domain-section">
        <div class="section-header">
          <h3>
            <Icon name="globe" size="sm" />
            {$t('tools/caa-builder.domain.title')}
          </h3>
        </div>

        <div class="input-group">
          <label for="domain" use:tooltip={$t('tools/caa-builder.domain.tooltip')}>
            {$t('tools/caa-builder.domain.label')}
          </label>
          <input id="domain" type="text" bind:value={domain} placeholder={$t('tools/caa-builder.domain.placeholder')} />
        </div>
      </div>

      <div class="records-section">
        <div class="section-header">
          <h3>
            <Icon name="shield" size="sm" />
            {$t('tools/caa-builder.records.title')}
          </h3>
          <div class="add-buttons">
            <button
              type="button"
              class="add-btn"
              onclick={() => addRecord('issue')}
              use:tooltip={$t('tools/caa-builder.records.addButtons.issue.tooltip')}
            >
              <Icon name="plus" size="sm" />
              {$t('tools/caa-builder.records.addButtons.issue.label')}
            </button>
            <button
              type="button"
              class="add-btn"
              onclick={() => addRecord('issuewild')}
              use:tooltip={$t('tools/caa-builder.records.addButtons.issuewild.tooltip')}
            >
              <Icon name="plus" size="sm" />
              {$t('tools/caa-builder.records.addButtons.issuewild.label')}
            </button>
            <button
              type="button"
              class="add-btn"
              onclick={() => addRecord('iodef')}
              use:tooltip={$t('tools/caa-builder.records.addButtons.iodef.tooltip')}
            >
              <Icon name="plus" size="sm" />
              {$t('tools/caa-builder.records.addButtons.iodef.label')}
            </button>
          </div>
        </div>

        <div class="records-list">
          {#each records as record, index (record.tag + index)}
            <div class="record-item" class:enabled={record.enabled}>
              <div class="record-header">
                <label class="record-toggle">
                  <input type="checkbox" bind:checked={record.enabled} />
                  <span class="record-tag">{record.tag.toUpperCase()}</span>
                  <span class="record-description" use:tooltip={tagDescriptions[record.tag]}>
                    {tagDescriptions[record.tag]}
                  </span>
                </label>

                <div class="record-controls">
                  <div class="flag-select">
                    <select bind:value={record.flag} disabled={!record.enabled}>
                      <option value={0}>{$t('tools/caa-builder.flags.nonCritical')}</option>
                      <option value={128}>{$t('tools/caa-builder.flags.critical')}</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    class="remove-btn"
                    onclick={() => removeRecord(index)}
                    use:tooltip={$t('tools/caa-builder.records.removeTooltip')}
                  >
                    <Icon name="x" size="sm" />
                  </button>
                </div>
              </div>

              <div class="record-value-section">
                <input
                  type="text"
                  bind:value={record.value}
                  disabled={!record.enabled}
                  placeholder={record.tag === 'issue'
                    ? $t('tools/caa-builder.placeholders.issue')
                    : record.tag === 'issuewild'
                      ? $t('tools/caa-builder.placeholders.issuewild')
                      : $t('tools/caa-builder.placeholders.iodef')}
                  class="record-input"
                />

                {#if (record.tag === 'issue' || record.tag === 'issuewild') && record.enabled}
                  <div class="ca-shortcuts">
                    <span class="shortcuts-label">{$t('tools/caa-builder.caShortcuts.label')}</span>
                    <div class="ca-buttons">
                      {#each commonCAs.slice(0, 4) as ca (ca.name)}
                        <button
                          type="button"
                          class="ca-btn"
                          onclick={() => addCA(index, ca.value)}
                          use:tooltip={ca.name}
                        >
                          {ca.name}
                        </button>
                      {/each}
                      <button
                        type="button"
                        class="ca-btn deny-all"
                        onclick={() => addCA(index, ';')}
                        use:tooltip={$t('tools/caa-builder.caShortcuts.denyAllTooltip')}
                      >
                        {$t('tools/caa-builder.caShortcuts.denyAll')}
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="results-section">
      <div class="records-output-section">
        <div class="section-header">
          <h3>{$t('tools/caa-builder.output.title')}</h3>
          <div class="actions">
            <button
              type="button"
              class="copy-btn"
              class:success={buttonStates['copy-caa']}
              onclick={() => copyToClipboard(caaRecords.join('\n'), 'copy-caa')}
              use:tooltip={$t('tools/caa-builder.output.copyTooltip')}
              disabled={caaRecords.length === 0}
            >
              <Icon name={buttonStates['copy-caa'] ? 'check' : 'copy'} size="sm" />
              {buttonStates['copy-caa']
                ? $t('tools/caa-builder.output.copied')
                : $t('tools/caa-builder.output.copyButton')}
            </button>
            <button
              type="button"
              class="export-btn"
              class:success={buttonStates['export-caa']}
              onclick={exportAsZoneFile}
              use:tooltip={$t('tools/caa-builder.output.exportTooltip')}
              disabled={caaRecords.length === 0}
            >
              <Icon name={buttonStates['export-caa'] ? 'check' : 'download'} size="sm" />
              {buttonStates['export-caa']
                ? $t('tools/caa-builder.output.downloaded')
                : $t('tools/caa-builder.output.exportButton')}
            </button>
          </div>
        </div>

        {#if caaRecords.length > 0}
          <div class="records-output">
            {#each caaRecords as record (record)}
              <div class="code-block">
                <code>{record}</code>
              </div>
            {/each}
          </div>
        {:else}
          <div class="no-records">
            <Icon name="info" size="sm" />
            <span>{$t('tools/caa-builder.output.noRecords')}</span>
          </div>
        {/if}
      </div>

      <div class="validation-section">
        <div class="section-header">
          <h3>
            <Icon name="bar-chart" size="sm" />
            {$t('tools/caa-builder.validation.title')}
          </h3>
        </div>

        <div class="validation-stats">
          <div class="stat-item">
            <span class="stat-label">{$t('tools/caa-builder.validation.activeRecordsLabel')}</span>
            <span class="stat-value">{validation.recordCount}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{$t('tools/caa-builder.validation.statusLabel')}</span>
            <span class="stat-value" class:success={validation.isValid} class:error={!validation.isValid}>
              {validation.isValid
                ? $t('tools/caa-builder.validation.valid')
                : $t('tools/caa-builder.validation.invalid')}
            </span>
          </div>
        </div>

        {#if validation.errors.length > 0}
          <div class="validation-messages error">
            <Icon name="x-circle" size="sm" />
            <div class="messages">
              {#each validation.errors as error (error)}
                <div class="message">{error}</div>
              {/each}
            </div>
          </div>
        {/if}

        {#if validation.warnings.length > 0}
          <div class="validation-messages warning">
            <Icon name="alert-triangle" size="sm" />
            <div class="messages">
              {#each validation.warnings as warning (warning)}
                <div class="message">{warning}</div>
              {/each}
            </div>
          </div>
        {/if}

        {#if validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0}
          <div class="validation-messages success">
            <Icon name="check-circle" size="sm" />
            <div class="message">{$t('tools/caa-builder.validation.success')}</div>
          </div>
        {/if}
      </div>

      <div class="security-guide">
        <div class="section-header">
          <h3>
            <Icon name="info" size="sm" />
            {$t('tools/caa-builder.securityGuide.title')}
          </h3>
        </div>

        <div class="security-tips">
          <ul>
            {#each securityTips as tip (tip)}
              <li>{tip}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="examples-section">
    <details class="examples-toggle" bind:open={showExamples}>
      <summary>
        <Icon name="lightbulb" size="sm" />
        {$t('tools/caa-builder.examples.title')}
      </summary>
      <div class="examples-grid">
        {#each exampleConfigurations as example (example.name)}
          <button
            type="button"
            class="example-card"
            class:selected={selectedExample === example.name}
            onclick={() => loadExample(example)}
          >
            <div class="example-header">
              <strong>{example.name}</strong>
            </div>
            <p class="example-description">{example.description}</p>
            <div class="example-records">
              {#each example.records as record (record.tag + record.value)}
                <div class="example-record">
                  <code>{record.tag}: {record.value}</code>
                </div>
              {/each}
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>
</div>

<style lang="scss">
  .domain-section,
  .records-section {
    margin-bottom: var(--spacing-lg);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0;
      color: var(--color-text);
    }

    .actions,
    .add-buttons {
      display: flex;
      gap: var(--spacing-xs);
    }
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    label {
      font-weight: 600;
      color: var(--color-text);
      font-size: var(--font-size-sm);
    }

    input {
      padding: var(--spacing-sm);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
      }
    }
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-primary);
    color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .record-item {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    opacity: 0.7;
    transition: all 0.2s ease;

    &.enabled {
      opacity: 1;
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
      filter: brightness(1.1);
    }
  }

  .record-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-xs);
    }
  }

  .record-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    flex: 1;
    min-width: 0;

    input[type='checkbox'] {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
      flex-shrink: 0;
    }

    .record-tag {
      font-weight: 600;
      font-family: var(--font-mono);
      color: var(--color-primary);
      min-width: 80px;
      flex-shrink: 0;
    }

    .record-description {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-style: italic;
      margin-left: var(--spacing-xs);
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .record-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-shrink: 0;
  }

  .flag-select select {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    cursor: pointer;
    min-width: 120px;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }

    &:disabled {
      background: var(--color-surface-disabled);
      color: var(--color-text-disabled);
      cursor: not-allowed;
    }
  }

  .remove-btn {
    padding: var(--spacing-xs);
    background: var(--color-error);
    color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    opacity: 0.7;
    width: 24px;
    height: 24px;

    &:hover {
      background: var(--color-error-light);
      opacity: 1;
      transform: scale(1.05);
    }
  }

  .record-value-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .record-input {
    width: 100%;
    padding: var(--spacing-xs);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);

    &:disabled {
      background: var(--color-surface-disabled);
      color: var(--color-text-disabled);
    }
  }

  .ca-shortcuts {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    .shortcuts-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-weight: 600;
    }

    .ca-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }
  }

  .ca-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-xs);
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    }

    &.deny-all {
      background: color-mix(in srgb, var(--color-error) 10%, transparent);
      border-color: color-mix(in srgb, var(--color-error) 30%, transparent);
      color: var(--color-error);

      &:hover {
        background: color-mix(in srgb, var(--color-error) 15%, transparent);
      }
    }
  }

  .code-block {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);

    &:last-child {
      margin-bottom: 0;
    }

    code {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      word-break: break-all;
      display: block;
    }
  }

  .no-records {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    color: var(--color-text-secondary);
    font-style: italic;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
  }

  .validation-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-sm);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .stat-value {
    font-weight: 600;
    font-family: var(--font-mono);

    &.success {
      color: var(--color-success);
    }

    &.error {
      color: var(--color-error);
    }
  }

  .validation-messages {
    display: flex;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);

    &:last-child {
      margin-bottom: 0;
    }

    &.success {
      background: color-mix(in srgb, var(--color-success) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
      color: var(--color-success);
    }

    &.warning {
      background: color-mix(in srgb, var(--color-warning) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
      color: var(--color-warning);
    }

    &.error {
      background: color-mix(in srgb, var(--color-error) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
      color: var(--color-error);
    }

    .messages {
      flex: 1;
    }

    .message {
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-xs);

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .security-tips {
    ul {
      margin: 0;
      padding-left: var(--spacing-md);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);

      li {
        margin-bottom: var(--spacing-sm);
        line-height: 1.5;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .examples-section {
    margin-top: var(--spacing-lg);
  }

  .examples-toggle {
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);

    summary {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      cursor: pointer;
      color: var(--color-text);
      font-weight: 600;

      &:hover {
        color: var(--color-primary);
      }
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .example-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;

    &:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }

    &.selected {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    }

    .example-header strong {
      color: var(--color-primary);
      font-size: var(--font-size-sm);
    }

    .example-description {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      width: 100%;
    }

    .example-records {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      width: 100%;
    }

    .example-record {
      code {
        font-family: var(--font-mono);
        background: var(--bg-tertiary);
        padding: 2px var(--spacing-xs);
        border-radius: var(--radius-xs);
        color: var(--color-primary);
        font-size: var(--font-size-xs);
      }
    }
  }

  .copy-btn,
  .export-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all 0.3s ease;
    transform: scale(1);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.success {
      background: var(--color-success) !important;
      color: var(--bg-secondary) !important;
      transform: scale(1.05);

      &:hover {
        background: var(--color-success) !important;
      }
    }
  }

  .copy-btn {
    background: var(--color-primary);
    color: var(--bg-secondary);

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }
  }

  .export-btn {
    background: var(--color-success);
    color: var(--bg-secondary);

    &:hover:not(:disabled) {
      background: var(--color-success-hover);
    }
  }
</style>
