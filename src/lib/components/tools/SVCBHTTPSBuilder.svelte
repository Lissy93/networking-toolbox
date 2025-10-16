<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { useClipboard } from '$lib/composables';

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

  const parameterDescriptions = {
    mandatory: 'Mandatory parameters that must be understood by the client',
    alpn: 'Application-Layer Protocol Negotiation identifiers (e.g., h2, h3)',
    'no-default-alpn': 'Indicates that no default ALPN should be assumed',
    port: 'Alternative port number for the service',
    ipv4hint: 'IPv4 address hints to avoid additional DNS lookups',
    ech: 'Encrypted Client Hello configuration',
    ipv6hint: 'IPv6 address hints to avoid additional DNS lookups',
  };

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
      errors.push('Domain is required');
    } else if (!domain.includes('.')) {
      warnings.push('Domain should include TLD (e.g., .com, .org)');
    }

    // Check priority
    if (priority < 0 || priority > 65535) {
      errors.push('Priority must be between 0 and 65535');
    }

    if (priority === 0 && targetName !== '.') {
      warnings.push('Priority 0 should typically use "." as target (alias mode)');
    }

    // Check target name
    if (targetName && targetName !== '.' && !targetName.includes('.')) {
      warnings.push('Target name should be a FQDN or "." for same domain');
    }

    // Validate parameters
    const enabledParams = parameters.filter((p) => p.enabled);

    for (const param of enabledParams) {
      if (param.key === 'port') {
        const port = parseInt(param.value);
        if (isNaN(port) || port < 1 || port > 65535) {
          errors.push('Port must be a number between 1 and 65535');
        }
      }

      if (param.key === 'alpn' && !param.value.trim()) {
        errors.push('ALPN parameter requires at least one protocol identifier');
      }

      if (param.key === 'ipv4hint') {
        const ips = param.value.split(',').map((ip) => ip.trim());
        for (const ip of ips) {
          if (ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            errors.push(`Invalid IPv4 address in ipv4hint: ${ip}`);
          }
        }
      }

      if (param.key === 'ipv6hint') {
        const ips = param.value.split(',').map((ip) => ip.trim());
        for (const ip of ips) {
          if (ip && !ip.includes(':')) {
            errors.push(`Invalid IPv6 address in ipv6hint: ${ip}`);
          }
        }
      }
    }

    // Check for conflicting parameters
    const hasAlpn = enabledParams.some((p) => p.key === 'alpn');
    const hasNoDefaultAlpn = enabledParams.some((p) => p.key === 'no-default-alpn');

    if (hasAlpn && hasNoDefaultAlpn) {
      warnings.push('Using both alpn and no-default-alpn may cause conflicts');
    }

    // Check record type specific recommendations
    if (recordType === 'HTTPS' && priority > 0) {
      const hasPort = enabledParams.some((p) => p.key === 'port');
      if (!hasPort) {
        warnings.push('HTTPS records typically benefit from port parameter');
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

  const exampleConfigurations = [
    {
      name: 'HTTPS with HTTP/2',
      description: 'Basic HTTPS service with HTTP/2 support',
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
      name: 'CDN Endpoint',
      description: 'HTTPS service pointing to CDN with IP hints',
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
      name: 'Alternative Service',
      description: 'Alternative HTTPS service on different port',
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
  ];

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

  const usageNotes = [
    'Priority 0 creates an alias record (AliasMode), priority >0 creates a service record (ServiceMode)',
    'Use "." as target name to indicate the same domain as the owner name',
    'ALPN values should match the protocols actually supported by the service',
    'IP hints can improve connection performance by avoiding additional DNS lookups',
    'ECH parameter enables Encrypted Client Hello for enhanced privacy',
  ];
</script>

<div class="card">
  <div class="card-header">
    <h1>SVCB/HTTPS Builder</h1>
    <p class="card-subtitle">
      Build SVCB and HTTPS resource records with service parameters for enhanced service discovery and connection
      optimization.
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="service-config-section">
        <div class="section-header">
          <h3>
            <Icon name="globe" size="sm" />
            Service Configuration
          </h3>
        </div>

        <div class="service-config-grid">
          <div class="input-group">
            <label for="domain" use:tooltip={'Domain name for the SVCB/HTTPS record'}> Domain: </label>
            <input id="domain" type="text" bind:value={domain} placeholder="example.com" />
          </div>

          <div class="input-group">
            <label for="recordType" use:tooltip={'Record type: HTTPS for HTTP services, SVCB for general services'}>
              Record Type:
            </label>
            <select id="recordType" bind:value={recordType}>
              <option value="HTTPS">HTTPS</option>
              <option value="SVCB">SVCB</option>
            </select>
          </div>

          <div class="input-group">
            <label for="priority" use:tooltip={'Priority: 0 for alias mode, >0 for service mode'}> Priority: </label>
            <input id="priority" type="number" bind:value={priority} min="0" max="65535" placeholder="1" />
          </div>

          <div class="input-group">
            <label for="targetName" use:tooltip={"Target domain name or '.' for same domain"}> Target Name: </label>
            <input id="targetName" type="text" bind:value={targetName} placeholder=". (same domain)" />
          </div>
        </div>
      </div>

      <div class="parameters-section">
        <div class="section-header">
          <h3>
            <Icon name="settings" size="sm" />
            Service Parameters
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
                      ? 'h2,h3'
                      : parameter.key === 'port'
                        ? '443'
                        : parameter.key === 'ipv4hint'
                          ? '203.0.113.1,203.0.113.2'
                          : parameter.key === 'ipv6hint'
                            ? '2001:db8::1,2001:db8::2'
                            : parameter.key === 'ech'
                              ? 'base64-encoded-config'
                              : parameter.key === 'mandatory'
                                ? '1,3'
                                : 'value'}
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
          <h3>Generated {recordType} Record</h3>
          <div class="actions">
            <button
              type="button"
              class="copy-btn"
              class:success={clipboard.isCopied('copy-svcb')}
              onclick={() => clipboard.copy(dnsRecord, 'copy-svcb')}
              use:tooltip={'Copy record to clipboard'}
            >
              <Icon name={clipboard.isCopied('copy-svcb') ? 'check' : 'copy'} size="sm" />
              {clipboard.isCopied('copy-svcb') ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              class="export-btn"
              class:success={clipboard.isCopied('export-svcb')}
              onclick={exportAsZoneFile}
              use:tooltip={'Download as zone file'}
            >
              <Icon name={clipboard.isCopied('export-svcb') ? 'check' : 'download'} size="sm" />
              {clipboard.isCopied('export-svcb') ? 'Downloaded!' : 'Export'}
            </button>
          </div>
        </div>

        <div class="record-output">
          <div class="code-block">
            <code>{dnsRecord}</code>
          </div>
        </div>

        <div class="record-breakdown">
          <h4>Record Breakdown:</h4>
          <div class="breakdown-grid">
            <div class="breakdown-item">
              <strong>Type:</strong>
              {recordType}
            </div>
            <div class="breakdown-item">
              <strong>Priority:</strong>
              {priority} ({priority === 0 ? 'Alias Mode' : 'Service Mode'})
            </div>
            <div class="breakdown-item">
              <strong>Target:</strong>
              {serviceRecord.targetName}
            </div>
            <div class="breakdown-item">
              <strong>Parameters:</strong>
              {validation.parameterCount}
            </div>
          </div>
        </div>
      </div>

      <div class="validation-section">
        <div class="section-header">
          <h3>
            <Icon name="bar-chart" size="sm" />
            Validation
          </h3>
        </div>

        <div class="validation-status">
          <div class="status-item">
            <span class="status-label">Status:</span>
            <span class="status-value" class:success={validation.isValid} class:error={!validation.isValid}>
              {validation.isValid ? 'Valid' : 'Invalid'}
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
            <div class="message">{recordType} record is valid and ready to deploy!</div>
          </div>
        {/if}
      </div>

      <div class="usage-guide">
        <div class="section-header">
          <h3>
            <Icon name="info" size="sm" />
            Usage Notes
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
        Example Configurations
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
              <div>Type: <code>{example.recordType}</code>, Priority: <code>{example.priority}</code></div>
              <div>Target: <code>{example.targetName}</code></div>
              <div class="example-params">
                Params: {example.parameters.map((p) => `${p.key}=${p.value}`).join(', ')}
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
