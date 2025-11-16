<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { t } from '$lib/stores/language';

  interface DMARCPolicy {
    version: 'DMARC1';
    policy: 'none' | 'quarantine' | 'reject';
    subdomainPolicy?: 'none' | 'quarantine' | 'reject';
    dkimAlignment: 'r' | 's';
    spfAlignment: 'r' | 's';
    percentage: number;
    reportingURI?: string;
    forensicURI?: string;
    failureOptions: ('0' | '1' | 'd' | 's')[];
    reportInterval: number;
  }

  let domain = $state('example.com');
  let policy: DMARCPolicy = $state({
    version: 'DMARC1',
    policy: 'none',
    subdomainPolicy: undefined,
    dkimAlignment: 'r',
    spfAlignment: 'r',
    percentage: 100,
    reportingURI: undefined,
    forensicURI: undefined,
    failureOptions: ['0'],
    reportInterval: 86400,
  });

  let showAdvanced = $state(false);
  let selectedExample = $state<string | null>(null);

  // Button success states
  let buttonStates = $state<Record<string, boolean>>({});

  const policyDescriptions = $derived({
    none: $t('tools/dmarc-builder.policy.types.none.description'),
    quarantine: $t('tools/dmarc-builder.policy.types.quarantine.description'),
    reject: $t('tools/dmarc-builder.policy.types.reject.description'),
  });

  const alignmentDescriptions = $derived({
    r: $t('tools/dmarc-builder.advanced.alignment.relaxed.description'),
    s: $t('tools/dmarc-builder.advanced.alignment.strict.description'),
  });

  const failureOptionDescriptions = $derived({
    '0': $t('tools/dmarc-builder.advanced.failureOptions.options.0'),
    '1': $t('tools/dmarc-builder.advanced.failureOptions.options.1'),
    d: $t('tools/dmarc-builder.advanced.failureOptions.options.d'),
    s: $t('tools/dmarc-builder.advanced.failureOptions.options.s'),
  });

  const dmarcRecord = $derived.by(() => {
    let record = `v=${policy.version}; p=${policy.policy}`;

    if (policy.subdomainPolicy && policy.subdomainPolicy !== policy.policy) {
      record += `; sp=${policy.subdomainPolicy}`;
    }

    if (policy.dkimAlignment !== 'r') {
      record += `; adkim=${policy.dkimAlignment}`;
    }

    if (policy.spfAlignment !== 'r') {
      record += `; aspf=${policy.spfAlignment}`;
    }

    if (policy.percentage !== 100) {
      record += `; pct=${policy.percentage}`;
    }

    if (policy.reportingURI?.trim()) {
      record += `; rua=mailto:${policy.reportingURI.trim()}`;
    }

    if (policy.forensicURI?.trim()) {
      record += `; ruf=mailto:${policy.forensicURI.trim()}`;
    }

    if (policy.failureOptions.length > 0) {
      record += `; fo=${policy.failureOptions.join(':')}`;
    }

    if (policy.reportInterval !== 86400) {
      record += `; ri=${policy.reportInterval}`;
    }

    return record;
  });

  const txtRecord = $derived.by(() => {
    return `_dmarc.${domain}. IN TXT "${dmarcRecord}"`;
  });

  const validation = $derived.by(() => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check domain format
    if (!domain.trim()) {
      errors.push($t('tools/dmarc-builder.validation.errors.domainRequired'));
    } else if (!domain.includes('.')) {
      warnings.push($t('tools/dmarc-builder.validation.warnings.domainNoTLD'));
    }

    // Policy progression warnings
    if (policy.policy === 'reject' && !policy.reportingURI) {
      warnings.push($t('tools/dmarc-builder.validation.warnings.rejectNeedsReporting'));
    }

    if (policy.policy === 'none' && policy.percentage < 100) {
      warnings.push($t('tools/dmarc-builder.validation.warnings.noneWithPercentage'));
    }

    // Alignment warnings
    if (policy.dkimAlignment === 's' && policy.spfAlignment === 's') {
      warnings.push($t('tools/dmarc-builder.validation.warnings.strictAlignment'));
    }

    // Reporting warnings
    if (policy.reportingURI && !policy.reportingURI.includes('@')) {
      errors.push($t('tools/dmarc-builder.validation.errors.reportingEmail'));
    }

    if (policy.forensicURI && !policy.forensicURI.includes('@')) {
      errors.push($t('tools/dmarc-builder.validation.errors.forensicEmail'));
    }

    // Record length check
    const recordLength = dmarcRecord.length;
    if (recordLength > 255) {
      errors.push($t('tools/dmarc-builder.validation.errors.recordTooLong', { length: recordLength }));
    } else if (recordLength > 200) {
      warnings.push($t('tools/dmarc-builder.validation.warnings.recordLong', { length: recordLength }));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recordLength,
    };
  });

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
    const zoneContent = txtRecord;
    const blob = new Blob([zoneContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-dmarc-record.zone`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showButtonSuccess('export-zone');
  }

  function toggleFailureOption(option: '0' | '1' | 'd' | 's'): void {
    if (policy.failureOptions.includes(option)) {
      policy.failureOptions = policy.failureOptions.filter((o) => o !== option);
    } else {
      policy.failureOptions = [...policy.failureOptions, option];
    }
  }

  const examplePolicies = $derived([
    {
      name: $t('tools/dmarc-builder.examples.monitor.name'),
      description: $t('tools/dmarc-builder.examples.monitor.description'),
      domain: 'example.com',
      config: {
        policy: 'none' as const,
        percentage: 100,
        reportingURI: 'dmarc@example.com',
        dkimAlignment: 'r' as const,
        spfAlignment: 'r' as const,
        failureOptions: ['0' as const],
      },
    },
    {
      name: $t('tools/dmarc-builder.examples.quarantine.name'),
      description: $t('tools/dmarc-builder.examples.quarantine.description'),
      domain: 'mycompany.com',
      config: {
        policy: 'quarantine' as const,
        percentage: 25,
        reportingURI: 'dmarc-reports@mycompany.com',
        dkimAlignment: 'r' as const,
        spfAlignment: 'r' as const,
        failureOptions: ['1' as const],
      },
    },
    {
      name: $t('tools/dmarc-builder.examples.fullProtection.name'),
      description: $t('tools/dmarc-builder.examples.fullProtection.description'),
      domain: 'secure.example.com',
      config: {
        policy: 'reject' as const,
        subdomainPolicy: 'reject' as const,
        percentage: 100,
        reportingURI: 'dmarc@secure.example.com',
        forensicURI: 'forensics@secure.example.com',
        dkimAlignment: 's' as const,
        spfAlignment: 's' as const,
        failureOptions: ['1' as const],
      },
    },
  ]);

  function loadExample(example: (typeof examplePolicies)[0]): void {
    domain = example.domain;
    policy = {
      version: 'DMARC1',
      reportInterval: 86400,
      ...example.config,
    };
    selectedExample = example.name;
  }

  const deploymentSteps = $derived($t('tools/dmarc-builder.deployment.steps'));
</script>

<div class="card">
  <div class="card-header">
    <h1>{$t('tools/dmarc-builder.title')}</h1>
    <p class="card-subtitle">
      {$t('tools/dmarc-builder.description')}
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="domain-section">
        <div class="section-header">
          <h3>
            <Icon name="globe" size="sm" />
            {$t('tools/dmarc-builder.domain.title')}
          </h3>
        </div>

        <div class="input-group">
          <label for="domain" use:tooltip={$t('tools/dmarc-builder.domain.tooltip')}>
            {$t('tools/dmarc-builder.domain.label')}
          </label>
          <input
            id="domain"
            type="text"
            bind:value={domain}
            placeholder={$t('tools/dmarc-builder.domain.placeholder')}
          />
        </div>
      </div>

      <div class="policy-section">
        <div class="section-header">
          <h3>
            <Icon name="shield" size="sm" />
            {$t('tools/dmarc-builder.policy.title')}
          </h3>
        </div>

        <div class="policy-grid">
          <div class="input-group">
            <label for="policy" use:tooltip={$t('tools/dmarc-builder.policy.mainTooltip')}>
              {$t('tools/dmarc-builder.policy.mainLabel')}
            </label>
            <select id="policy" bind:value={policy.policy}>
              <option value="none">{$t('tools/dmarc-builder.policy.types.none.label')}</option>
              <option value="quarantine">{$t('tools/dmarc-builder.policy.types.quarantine.label')}</option>
              <option value="reject">{$t('tools/dmarc-builder.policy.types.reject.label')}</option>
            </select>
            <div class="policy-description">
              {policyDescriptions[policy.policy]}
            </div>
          </div>

          <div class="input-group">
            <label for="percentage" use:tooltip={$t('tools/dmarc-builder.policy.percentageTooltip')}>
              {$t('tools/dmarc-builder.policy.percentageLabel')}
            </label>
            <div class="percentage-input">
              <input id="percentage" type="range" bind:value={policy.percentage} min="0" max="100" step="5" />
              <span class="percentage-value">{policy.percentage}%</span>
            </div>
          </div>
        </div>

        <details class="advanced-toggle" bind:open={showAdvanced}>
          <summary>
            <Icon name="settings" size="sm" />
            {$t('tools/dmarc-builder.advanced.title')}
          </summary>

          <div class="advanced-grid">
            <div class="input-group">
              <label for="subdomainPolicy" use:tooltip={$t('tools/dmarc-builder.policy.subdomainTooltip')}>
                {$t('tools/dmarc-builder.policy.subdomainLabel')}
              </label>
              <select id="subdomainPolicy" bind:value={policy.subdomainPolicy}>
                <option value={undefined}>{$t('tools/dmarc-builder.policy.subdomainInherit')}</option>
                <option value="none">{$t('tools/dmarc-builder.policy.types.none.label')}</option>
                <option value="quarantine">{$t('tools/dmarc-builder.policy.types.quarantine.label')}</option>
                <option value="reject">{$t('tools/dmarc-builder.policy.types.reject.label')}</option>
              </select>
            </div>

            <div class="alignment-section">
              <h4>{$t('tools/dmarc-builder.advanced.alignment.title')}</h4>

              <div class="alignment-grid">
                <div class="input-group">
                  <label for="dkimAlignment" use:tooltip={$t('tools/dmarc-builder.advanced.alignment.dkimTooltip')}>
                    {$t('tools/dmarc-builder.advanced.alignment.dkimLabel')}
                  </label>
                  <select id="dkimAlignment" bind:value={policy.dkimAlignment}>
                    <option value="r">{$t('tools/dmarc-builder.advanced.alignment.relaxed.label')}</option>
                    <option value="s">{$t('tools/dmarc-builder.advanced.alignment.strict.label')}</option>
                  </select>
                  <div class="alignment-description">
                    {alignmentDescriptions[policy.dkimAlignment]}
                  </div>
                </div>

                <div class="input-group">
                  <label for="spfAlignment" use:tooltip={$t('tools/dmarc-builder.advanced.alignment.spfTooltip')}>
                    {$t('tools/dmarc-builder.advanced.alignment.spfLabel')}
                  </label>
                  <select id="spfAlignment" bind:value={policy.spfAlignment}>
                    <option value="r">{$t('tools/dmarc-builder.advanced.alignment.relaxed.label')}</option>
                    <option value="s">{$t('tools/dmarc-builder.advanced.alignment.strict.label')}</option>
                  </select>
                  <div class="alignment-description">
                    {alignmentDescriptions[policy.spfAlignment]}
                  </div>
                </div>
              </div>
            </div>

            <div class="reporting-section">
              <h4>{$t('tools/dmarc-builder.advanced.reporting.title')}</h4>

              <div class="reporting-grid">
                <div class="input-group">
                  <label for="reportingURI" use:tooltip={$t('tools/dmarc-builder.advanced.reporting.aggregateTooltip')}>
                    {$t('tools/dmarc-builder.advanced.reporting.aggregateLabel')}
                  </label>
                  <input
                    id="reportingURI"
                    type="email"
                    bind:value={policy.reportingURI}
                    placeholder={$t('tools/dmarc-builder.advanced.reporting.aggregatePlaceholder')}
                  />
                </div>

                <div class="input-group">
                  <label for="forensicURI" use:tooltip={$t('tools/dmarc-builder.advanced.reporting.forensicTooltip')}>
                    {$t('tools/dmarc-builder.advanced.reporting.forensicLabel')}
                  </label>
                  <input
                    id="forensicURI"
                    type="email"
                    bind:value={policy.forensicURI}
                    placeholder={$t('tools/dmarc-builder.advanced.reporting.forensicPlaceholder')}
                  />
                </div>

                <div class="input-group">
                  <label
                    for="reportInterval"
                    use:tooltip={$t('tools/dmarc-builder.advanced.reporting.intervalTooltip')}
                  >
                    {$t('tools/dmarc-builder.advanced.reporting.intervalLabel')}
                  </label>
                  <select id="reportInterval" bind:value={policy.reportInterval}>
                    <option value={3600}>{$t('tools/dmarc-builder.advanced.reporting.intervals.hourly')}</option>
                    <option value={86400}>{$t('tools/dmarc-builder.advanced.reporting.intervals.daily')}</option>
                    <option value={604800}>{$t('tools/dmarc-builder.advanced.reporting.intervals.weekly')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="failure-options-section">
              <h4 use:tooltip={$t('tools/dmarc-builder.advanced.failureOptions.tooltip')}>
                {$t('tools/dmarc-builder.advanced.failureOptions.title')}
              </h4>

              <div class="failure-options">
                {#each Object.entries(failureOptionDescriptions) as [option, description] (option)}
                  <label class="failure-option">
                    <input
                      type="checkbox"
                      checked={policy.failureOptions.includes(option as '0' | '1' | 'd' | 's')}
                      onchange={() => toggleFailureOption(option as '0' | '1' | 'd' | 's')}
                    />
                    <span class="option-code">{option}:</span>
                    <span class="option-description">{description}</span>
                  </label>
                {/each}
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>

    <div class="results-section">
      <div class="record-section">
        <div class="section-header">
          <h3>{$t('tools/dmarc-builder.output.title')}</h3>
          <div class="actions">
            <button
              type="button"
              class="copy-btn"
              class:success={buttonStates['copy-dmarc']}
              onclick={() => copyToClipboard(dmarcRecord, 'copy-dmarc')}
              use:tooltip={$t('tools/dmarc-builder.output.copyTooltip')}
            >
              <Icon name={buttonStates['copy-dmarc'] ? 'check' : 'copy'} size="sm" />
              {buttonStates['copy-dmarc']
                ? $t('tools/dmarc-builder.output.copied')
                : $t('tools/dmarc-builder.output.copyButton')}
            </button>
            <button
              type="button"
              class="export-btn"
              class:success={buttonStates['export-zone']}
              onclick={exportAsZoneFile}
              use:tooltip={$t('tools/dmarc-builder.output.exportTooltip')}
            >
              <Icon name={buttonStates['export-zone'] ? 'check' : 'download'} size="sm" />
              {buttonStates['export-zone']
                ? $t('tools/dmarc-builder.output.downloaded')
                : $t('tools/dmarc-builder.output.exportButton')}
            </button>
          </div>
        </div>

        <div class="record-output">
          <div class="code-block">
            <code>{dmarcRecord}</code>
          </div>
        </div>

        <div class="zone-file-output">
          <h4>{$t('tools/dmarc-builder.output.txtRecordLabel')}</h4>
          <div class="code-block">
            <code>{txtRecord}</code>
          </div>
        </div>
      </div>

      <div class="validation-section">
        <div class="section-header">
          <h3>
            <Icon name="bar-chart" size="sm" />
            {$t('tools/dmarc-builder.validation.title')}
          </h3>
        </div>

        <div class="validation-stats">
          <div class="stat-item">
            <span class="stat-label">{$t('tools/dmarc-builder.validation.recordLengthLabel')}</span>
            <span
              class="stat-value"
              class:warning={validation.recordLength > 200}
              class:error={validation.recordLength > 255}
            >
              {validation.recordLength}/255 chars
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{$t('tools/dmarc-builder.validation.statusLabel')}</span>
            <span class="stat-value" class:success={validation.isValid} class:error={!validation.isValid}>
              {validation.isValid
                ? $t('tools/dmarc-builder.validation.valid')
                : $t('tools/dmarc-builder.validation.invalid')}
            </span>
          </div>
        </div>

        {#if validation.errors.length > 0}
          <div class="validation-messages error">
            <Icon name="x-circle" size="sm" />
            <div class="messages">
              {#each validation.errors as error, index (index)}
                <div class="message">{error}</div>
              {/each}
            </div>
          </div>
        {/if}

        {#if validation.warnings.length > 0}
          <div class="validation-messages warning">
            <Icon name="alert-triangle" size="sm" />
            <div class="messages">
              {#each validation.warnings as warning, index (index)}
                <div class="message">{warning}</div>
              {/each}
            </div>
          </div>
        {/if}

        {#if validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0}
          <div class="validation-messages success">
            <Icon name="check-circle" size="sm" />
            <div class="message">{$t('tools/dmarc-builder.validation.success')}</div>
          </div>
        {/if}
      </div>

      <div class="deployment-guide">
        <div class="section-header">
          <h3>
            <Icon name="info" size="sm" />
            {$t('tools/dmarc-builder.deployment.title')}
          </h3>
        </div>

        <div class="deployment-steps">
          <ol>
            {#each deploymentSteps as step, index (index)}
              <li
                class:current={(policy.policy === 'none' && index === 0) ||
                  (policy.policy === 'quarantine' && index >= 2 && index <= 5) ||
                  (policy.policy === 'reject' && index === 6)}
              >
                {step}
              </li>
            {/each}
          </ol>
        </div>
      </div>
    </div>
  </div>

  <div class="examples-section">
    <details class="examples-toggle">
      <summary>
        <Icon name="lightbulb" size="sm" />
        {$t('tools/dmarc-builder.examples.title')}
      </summary>
      <div class="examples-grid">
        {#each examplePolicies as example (example.name)}
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
            <div class="example-config">
              <div>{$t('tools/dmarc-builder.examples.policyLabel')} <code>{example.config.policy}</code></div>
              <div>{$t('tools/dmarc-builder.examples.percentageLabel')} <code>{example.config.percentage}%</code></div>
              {#if example.config.reportingURI}
                <div>{$t('tools/dmarc-builder.examples.reportsLabel')} <code>{example.config.reportingURI}</code></div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>
</div>

<style lang="scss">
  .domain-section,
  .policy-section {
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

    .actions {
      display: flex;
      gap: var(--spacing-sm);
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

    input,
    select {
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

  .policy-grid {
    display: grid;
    gap: var(--spacing-md);

    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .policy-description,
  .alignment-description {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    font-style: italic;
    margin-top: var(--spacing-xs);
  }

  .percentage-input {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    input[type='range'] {
      flex: 1;
    }

    .percentage-value {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-primary);
      min-width: 40px;
      text-align: right;
    }
  }

  .advanced-toggle {
    margin-top: var(--spacing-md);
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
      padding: var(--spacing-xs);

      &:hover {
        color: var(--color-primary);
      }
    }
  }

  .advanced-grid {
    margin-top: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .alignment-section,
  .reporting-section,
  .failure-options-section {
    h4 {
      margin-bottom: var(--spacing-sm);
      color: var(--color-text);
      font-size: var(--font-size-sm);
    }
  }

  .alignment-grid,
  .reporting-grid {
    display: grid;
    gap: var(--spacing-md);

    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .reporting-grid {
    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }

    @media (min-width: 1024px) {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }

  .failure-options {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .failure-option {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: background-color 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    }

    input[type='checkbox'] {
      margin: 0;
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
      flex-shrink: 0;
    }

    .option-code {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-primary);
      min-width: 20px;
    }

    .option-description {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
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

  .zone-file-output {
    h4 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
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

    &.warning {
      color: var(--color-warning);
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

  .deployment-guide {
    margin-top: var(--spacing-lg);
  }

  .deployment-steps {
    ol {
      margin: 0;
      padding-left: var(--spacing-lg);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);

      li {
        margin-bottom: var(--spacing-sm);
        line-height: 1.5;

        &:last-child {
          margin-bottom: 0;
        }

        &.current {
          color: var(--color-primary);
          font-weight: 600;
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

    .example-config {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      width: 100%;

      code {
        font-family: var(--font-mono);
        background: var(--bg-tertiary);
        padding: 2px var(--spacing-xs);
        border-radius: var(--radius-xs);
        color: var(--color-primary);
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

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  .export-btn {
    background: var(--color-success);
    color: var(--bg-secondary);

    &:hover {
      background: var(--color-success-hover);
    }
  }
</style>
