<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { locale, loadTranslations, t } from '$lib/stores/language.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { useClipboard } from '$lib/composables';

  onMount(async () => {
    await loadTranslations(get(locale), 'tools/svcb-https-builder');
  });

  interface ServiceParameter {
    key: string;
    value: string;
    enabled: boolean;
  }

  interface ServiceRecord {
    recordType: 'SVCB' | 'HTTPS';
    priority: number;
    targetName: string;
    parameters: ServiceParameter[];
  }

  let domain = $state('example.com');
  let recordType = $state<'SVCB' | 'HTTPS'>('HTTPS');
  let priority = $state(1);
  let targetName = $state('.');

  let parameters = $state<ServiceParameter[]>([
    { key: 'mandatory', value: '', enabled: false },
    { key: 'alpn', value: '', enabled: false },
    { key: 'no-default-alpn', value: '', enabled: false },
    { key: 'port', value: '', enabled: false },
    { key: 'ipv4hint', value: '', enabled: false },
    { key: 'ech', value: '', enabled: false },
    { key: 'ipv6hint', value: '', enabled: false },
  ]);

  let showExamples = $state(false);
  let selectedExample = $state<string | null>(null);

  // Button success states
  const clipboard = useClipboard();

  const parameterDescriptions = $derived({
    mandatory: $t('parameters.descriptions.mandatory'),
    alpn: $t('parameters.descriptions.alpn'),
    'no-default-alpn': $t('parameters.descriptions.no-default-alpn'),
    port: $t('parameters.descriptions.port'),
    ipv4hint: $t('parameters.descriptions.ipv4hint'),
    ech: $t('parameters.descriptions.ech'),
    ipv6hint: $t('parameters.descriptions.ipv6hint'),
  });

  const parameterKeyMap: Record<string, number> = {
    mandatory: 0,
    alpn: 1,
    'no-default-alpn': 2,
    port: 3,
    ipv4hint: 4,
    ech: 5,
    ipv6hint: 6,
  };

  const serviceRecord = $derived.by((): ServiceRecord => {
    const enabledParams = parameters.filter((p) => p.enabled && (p.value.trim() || p.key === 'no-default-alpn'));

    return {
      recordType,
      priority,
      targetName: targetName.trim() || '.',
      parameters: enabledParams,
    };
  });

  const dnsRecord = $derived.by(() => {
    const record = serviceRecord;
    const target = record.targetName === '.' ? '.' : record.targetName;

    let recordString = `${domain}. IN ${record.recordType} ${record.priority} ${target}`;

    if (record.parameters.length > 0) {
      const paramStrings = record.parameters.map((param) => {
        const _keyNum = parameterKeyMap[param.key];
        if (param.key === 'no-default-alpn') {
          return `${param.key}`;
        } else if (param.key === 'alpn') {
          // Format ALPN values as comma-separated quoted strings
          const alpnValues = param.value
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v);
          return `${param.key}=${alpnValues.join(',')}`;
        } else if (param.key === 'ipv4hint' || param.key === 'ipv6hint') {
          // Format IP hints as comma-separated values
          const ipValues = param.value
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v);
          return `${param.key}=${ipValues.join(',')}`;
        } else {
          return `${param.key}=${param.value.trim()}`;
        }
      });

      recordString += ` ${paramStrings.join(' ')}`;
    }

    return recordString;
  });

  const validation = $derived.by(() => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check domain format
    if (!domain.trim()) {
      errors.push($t('validation.errors.domainRequired'));
    } else if (!domain.includes('.')) {
      warnings.push($t('validation.errors.domainTld'));
    }

    // Check priority
    if (priority < 0 || priority > 65535) {
      errors.push($t('validation.errors.priorityRange'));
    }

    if (priority === 0 && targetName !== '.') {
      warnings.push($t('validation.errors.priorityZeroTarget'));
    }

    // Check target name
    if (targetName && targetName !== '.' && !targetName.includes('.')) {
      warnings.push($t('validation.errors.targetFqdn'));
    }

    // Validate parameters
    const enabledParams = parameters.filter((p) => p.enabled);

    for (const param of enabledParams) {
      if (param.key === 'port') {
        const port = parseInt(param.value);
        if (isNaN(port) || port < 1 || port > 65535) {
          errors.push($t('validation.errors.portRange'));
        }
      }

      if (param.key === 'alpn' && !param.value.trim()) {
        errors.push($t('validation.errors.alpnRequired'));
      }

      if (param.key === 'ipv4hint') {
        const ips = param.value.split(',').map((ip) => ip.trim());
        for (const ip of ips) {
          if (ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            errors.push($t('validation.errors.invalidIPv4', { ip }));
          }
        }
      }

      if (param.key === 'ipv6hint') {
        const ips = param.value.split(',').map((ip) => ip.trim());
        for (const ip of ips) {
          if (ip && !ip.includes(':')) {
            errors.push($t('validation.errors.invalidIPv6', { ip }));
          }
        }
      }
    }

    // Check for conflicting parameters
    const hasAlpn = enabledParams.some((p) => p.key === 'alpn');
    const hasNoDefaultAlpn = enabledParams.some((p) => p.key === 'no-default-alpn');

    if (hasAlpn && hasNoDefaultAlpn) {
      warnings.push($t('validation.errors.alpnConflict'));
    }

    // Check record type specific recommendations
    if (recordType === 'HTTPS' && priority > 0) {
      const hasPort = enabledParams.some((p) => p.key === 'port');
      if (!hasPort) {
        warnings.push($t('validation.errors.httpsPortRecommendation'));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      parameterCount: enabledParams.length,
    };
  });

  function exportAsZoneFile(): void {
    if (!dnsRecord) return;

    const zoneContent = dnsRecord;
    const blob = new Blob([zoneContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-${recordType.toLowerCase()}-record.zone`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('downloaded', 'export-svcb');
  }

  function _addParameter(key: string): void {
    const param = parameters.find((p) => p.key === key);
    if (param) {
      param.enabled = true;
      parameters = parameters;
    }
  }

  const exampleConfigurations = $derived([
    {
      name: $t('examples.items.0.name'),
      description: $t('examples.items.0.description'),
      recordType: 'HTTPS' as const,
      domain: 'example.com',
      priority: 1,
      targetName: '.',
      parameters: [
        { key: 'alpn', value: 'h2,h3', enabled: true },
        { key: 'port', value: '443', enabled: true },
      ],
    },
    {
      name: $t('examples.items.1.name'),
      description: $t('examples.items.1.description'),
      recordType: 'HTTPS' as const,
      domain: 'www.example.com',
      priority: 1,
      targetName: 'cdn.example.com',
      parameters: [
        { key: 'alpn', value: 'h2', enabled: true },
        { key: 'ipv4hint', value: '203.0.113.1,203.0.113.2', enabled: true },
        { key: 'port', value: '443', enabled: true },
      ],
    },
    {
      name: $t('examples.items.2.name'),
      description: $t('examples.items.2.description'),
      recordType: 'HTTPS' as const,
      domain: 'api.example.com',
      priority: 2,
      targetName: 'api-alt.example.com',
      parameters: [
        { key: 'alpn', value: 'h2', enabled: true },
        { key: 'port', value: '8443', enabled: true },
        { key: 'ipv4hint', value: '203.0.113.10', enabled: true },
      ],
    },
  ]);

  function loadExample(example: (typeof exampleConfigurations)[0]): void {
    domain = example.domain;
    recordType = example.recordType;
    priority = example.priority;
    targetName = example.targetName;

    // Reset all parameters
    parameters = parameters.map((p) => ({ ...p, enabled: false, value: '' }));

    // Set example parameters
    for (const exampleParam of example.parameters) {
      const param = parameters.find((p) => p.key === exampleParam.key);
      if (param) {
        param.enabled = exampleParam.enabled;
        param.value = exampleParam.value;
      }
    }
    parameters = parameters;
    selectedExample = example.name;
  }

  const usageNotes = $derived($t('usageNotes'));
</script>

<div class="card">
  <div class="card-header">
    <h1>{$t('title')}</h1>
    <p class="card-subtitle">
      {$t('description')}
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="service-config-section">
        <div class="section-header">
          <h3>
            <Icon name="globe" size="sm" />
            {$t('sections.serviceConfiguration')}
          </h3>
        </div>

        <div class="service-config-grid">
          <div class="input-group">
            <label for="domain" use:tooltip={$t('form.domain.tooltip')}> {$t('form.domain.label')} </label>
            <input id="domain" type="text" bind:value={domain} placeholder={$t('form.domain.placeholder')} />
          </div>

          <div class="input-group">
            <label for="recordType" use:tooltip={$t('form.recordType.tooltip')}>
              {$t('form.recordType.label')}
            </label>
            <select id="recordType" bind:value={recordType}>
              <option value="HTTPS">HTTPS</option>
              <option value="SVCB">SVCB</option>
            </select>
          </div>

          <div class="input-group">
            <label for="priority" use:tooltip={$t('form.priority.tooltip')}> {$t('form.priority.label')} </label>
            <input
              id="priority"
              type="number"
              bind:value={priority}
              min="0"
              max="65535"
              placeholder={$t('form.priority.placeholder')}
            />
          </div>

          <div class="input-group">
            <label for="targetName" use:tooltip={$t('form.targetName.tooltip')}> {$t('form.targetName.label')} </label>
            <input
              id="targetName"
              type="text"
              bind:value={targetName}
              placeholder={$t('form.targetName.placeholder')}
            />
          </div>
        </div>
      </div>

      <div class="parameters-section">
        <div class="section-header">
          <h3>
            <Icon name="settings" size="sm" />
            {$t('sections.serviceParameters')}
          </h3>
        </div>

        <div class="parameters-list">
          {#each parameters as parameter (parameter.key)}
            <div class="parameter-item" class:enabled={parameter.enabled}>
              <div class="parameter-header">
                <label class="parameter-toggle">
                  <input type="checkbox" bind:checked={parameter.enabled} />
                  <span class="parameter-name">{parameter.key}</span>
                  <span
                    class="parameter-description"
                    use:tooltip={parameterDescriptions[parameter.key as keyof typeof parameterDescriptions]}
                  >
                    {parameterDescriptions[parameter.key as keyof typeof parameterDescriptions]}
                  </span>
                </label>
              </div>

              {#if parameter.key !== 'no-default-alpn'}
                <div class="parameter-value">
                  <input
                    type="text"
                    bind:value={parameter.value}
                    disabled={!parameter.enabled}
                    placeholder={parameter.key === 'alpn'
                      ? $t('parameters.placeholders.alpn')
                      : parameter.key === 'port'
                        ? $t('parameters.placeholders.port')
                        : parameter.key === 'ipv4hint'
                          ? $t('parameters.placeholders.ipv4hint')
                          : parameter.key === 'ipv6hint'
                            ? $t('parameters.placeholders.ipv6hint')
                            : parameter.key === 'ech'
                              ? $t('parameters.placeholders.ech')
                              : parameter.key === 'mandatory'
                                ? $t('parameters.placeholders.mandatory')
                                : $t('parameters.placeholders.default')}
                    class="parameter-input"
                  />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="results-section">
      <div class="record-section">
        <div class="section-header">
          <h3>{$t('results.generatedRecord', { recordType })}</h3>
          <div class="actions">
            <button
              type="button"
              class="copy-btn"
              class:success={clipboard.isCopied('copy-svcb')}
              onclick={() => clipboard.copy(dnsRecord, 'copy-svcb')}
              use:tooltip={$t('results.actions.copy.tooltip')}
            >
              <Icon name={clipboard.isCopied('copy-svcb') ? 'check' : 'copy'} size="sm" />
              {clipboard.isCopied('copy-svcb') ? $t('results.actions.copy.copied') : $t('results.actions.copy.button')}
            </button>
            <button
              type="button"
              class="export-btn"
              class:success={clipboard.isCopied('export-svcb')}
              onclick={exportAsZoneFile}
              use:tooltip={$t('results.actions.export.tooltip')}
            >
              <Icon name={clipboard.isCopied('export-svcb') ? 'check' : 'download'} size="sm" />
              {clipboard.isCopied('export-svcb')
                ? $t('results.actions.export.downloaded')
                : $t('results.actions.export.button')}
            </button>
          </div>
        </div>

        <div class="record-output">
          <div class="code-block">
            <code>{dnsRecord}</code>
          </div>
        </div>

        <div class="record-breakdown">
          <h4>{$t('results.recordBreakdown')}</h4>
          <div class="breakdown-grid">
            <div class="breakdown-item">
              <strong>{$t('results.breakdown.type')}</strong>
              {recordType}
            </div>
            <div class="breakdown-item">
              <strong>{$t('results.breakdown.priority')}</strong>
              {priority} ({priority === 0 ? $t('results.breakdown.aliasMode') : $t('results.breakdown.serviceMode')})
            </div>
            <div class="breakdown-item">
              <strong>{$t('results.breakdown.target')}</strong>
              {serviceRecord.targetName}
            </div>
            <div class="breakdown-item">
              <strong>{$t('results.breakdown.parameters')}</strong>
              {validation.parameterCount}
            </div>
          </div>
        </div>
      </div>

      <div class="validation-section">
        <div class="section-header">
          <h3>
            <Icon name="bar-chart" size="sm" />
            {$t('validation.title')}
          </h3>
        </div>

        <div class="validation-status">
          <div class="status-item">
            <span class="status-label">{$t('validation.status.label')}</span>
            <span class="status-value" class:success={validation.isValid} class:error={!validation.isValid}>
              {validation.isValid ? $t('validation.status.valid') : $t('validation.status.invalid')}
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
            <div class="message">{$t('validation.success', { recordType })}</div>
          </div>
        {/if}
      </div>

      <div class="usage-guide">
        <div class="section-header">
          <h3>
            <Icon name="info" size="sm" />
            {$t('sections.usageNotes')}
          </h3>
        </div>

        <div class="usage-tips">
          <ul>
            {#each usageNotes as note, index (index)}
              <li>{note}</li>
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
        {$t('examples.title')}
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
            <div class="example-config">
              <div>
                {$t('examples.config.type')} <code>{example.recordType}</code>, {$t('examples.config.priority')}
                <code>{example.priority}</code>
              </div>
              <div>{$t('examples.config.target')} <code>{example.targetName}</code></div>
              <div class="example-params">
                {$t('examples.config.params')}
                {example.parameters.map((p) => `${p.key}=${p.value}`).join(', ')}
              </div>
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>
</div>

<style lang="scss">
  .service-config-section,
  .parameters-section {
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

  .service-config-grid {
    display: grid;
    gap: var(--spacing-md);

    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
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

  .parameters-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .parameter-item {
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

  .parameter-header {
    margin-bottom: var(--spacing-sm);
  }

  .parameter-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    width: 100%;

    input[type='checkbox'] {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
      flex-shrink: 0;
    }

    .parameter-name {
      font-weight: 600;
      font-family: var(--font-mono);
      color: var(--color-primary);
      min-width: 120px;
      flex-shrink: 0;
    }

    .parameter-description {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-style: italic;
      margin-left: var(--spacing-xs);
      flex: 1;
      min-width: 0;
    }
  }

  .parameter-value {
    margin-left: calc(16px + var(--spacing-xs));
  }

  .parameter-input {
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

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }
  }

  .record-breakdown {
    margin-top: var(--spacing-md);

    h4 {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-sm);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .breakdown-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);

    strong {
      color: var(--color-primary);
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

  .validation-status {
    display: flex;
    justify-content: center;
    margin-bottom: var(--spacing-md);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-sm);
  }

  .status-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .status-value {
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

  .usage-tips {
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
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
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

    .example-params {
      word-break: break-all;
      font-size: var(--font-size-xs);
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

    &:hover:not(.success) {
      background: var(--color-primary-hover);
    }
  }

  .export-btn {
    background: var(--color-success);
    color: var(--bg-secondary);

    &:hover:not(.success) {
      background: var(--color-success-hover);
    }
  }
</style>
