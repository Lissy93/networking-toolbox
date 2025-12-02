<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import Icon from '$lib/components/global/Icon.svelte';
  import { t } from '$lib/stores/language';

  type SRVRecord = {
    id: string;
    service: string;
    protocol: 'tcp' | 'udp' | 'tls' | 'sctp';
    name: string;
    priority: number;
    weight: number;
    port: number;
    target: string;
    ttl: number;
  };

  let ttl = $state(3600);
  let srvRecords = $state<SRVRecord[]>([
    {
      id: '1',
      service: '_http',
      protocol: 'tcp',
      name: 'example.com',
      priority: 10,
      weight: 5,
      port: 80,
      target: 'web1.example.com.',
      ttl: 3600,
    },
  ]);
  let showExamples = $state(false);

  const examples = $derived([
    {
      label: $t('tools/dns-srv-builder.examples.webServices'),
      records: [
        { service: '_http', protocol: 'tcp' as const, priority: 10, weight: 5, port: 80, target: 'web1.example.com.' },
        {
          service: '_https',
          protocol: 'tcp' as const,
          priority: 10,
          weight: 5,
          port: 443,
          target: 'web1.example.com.',
        },
        {
          service: '_http',
          protocol: 'tcp' as const,
          priority: 20,
          weight: 5,
          port: 8080,
          target: 'web2.example.com.',
        },
      ],
    },
    {
      label: $t('tools/dns-srv-builder.examples.mailServices'),
      records: [
        { service: '_smtp', protocol: 'tcp' as const, priority: 10, weight: 5, port: 25, target: 'mail1.example.com.' },
        {
          service: '_submission',
          protocol: 'tcp' as const,
          priority: 10,
          weight: 5,
          port: 587,
          target: 'mail1.example.com.',
        },
        {
          service: '_imaps',
          protocol: 'tcp' as const,
          priority: 10,
          weight: 5,
          port: 993,
          target: 'mail1.example.com.',
        },
      ],
    },
    {
      label: $t('tools/dns-srv-builder.examples.sipServices'),
      records: [
        { service: '_sip', protocol: 'tcp' as const, priority: 10, weight: 5, port: 5060, target: 'sip1.example.com.' },
        { service: '_sip', protocol: 'udp' as const, priority: 10, weight: 5, port: 5060, target: 'sip1.example.com.' },
        {
          service: '_sips',
          protocol: 'tcp' as const,
          priority: 10,
          weight: 5,
          port: 5061,
          target: 'sip1.example.com.',
        },
      ],
    },
    {
      label: $t('tools/dns-srv-builder.examples.xmppServices'),
      records: [
        {
          service: '_xmpp-server',
          protocol: 'tcp' as const,
          priority: 10,
          weight: 5,
          port: 5269,
          target: 'xmpp.example.com.',
        },
        {
          service: '_xmpp-client',
          protocol: 'tcp' as const,
          priority: 10,
          weight: 5,
          port: 5222,
          target: 'xmpp.example.com.',
        },
      ],
    },
  ]);

  const commonServices = [
    { service: '_http', port: 80, protocol: 'tcp' as const },
    { service: '_https', port: 443, protocol: 'tcp' as const },
    { service: '_ftp', port: 21, protocol: 'tcp' as const },
    { service: '_smtp', port: 25, protocol: 'tcp' as const },
    { service: '_submission', port: 587, protocol: 'tcp' as const },
    { service: '_imap', port: 143, protocol: 'tcp' as const },
    { service: '_imaps', port: 993, protocol: 'tcp' as const },
    { service: '_pop3', port: 110, protocol: 'tcp' as const },
    { service: '_pop3s', port: 995, protocol: 'tcp' as const },
    { service: '_sip', port: 5060, protocol: 'tcp' as const },
    { service: '_sips', port: 5061, protocol: 'tcp' as const },
    { service: '_xmpp-server', port: 5269, protocol: 'tcp' as const },
    { service: '_xmpp-client', port: 5222, protocol: 'tcp' as const },
    { service: '_ldap', port: 389, protocol: 'tcp' as const },
    { service: '_ldaps', port: 636, protocol: 'tcp' as const },
  ];

  function addSRVRecord() {
    const newId = (Math.max(...srvRecords.map((r) => parseInt(r.id)), 0) + 1).toString();
    srvRecords.push({
      id: newId,
      service: '_http',
      protocol: 'tcp',
      name: 'example.com',
      priority: 10,
      weight: 5,
      port: 80,
      target: 'server.example.com.',
      ttl: ttl,
    });
    srvRecords = srvRecords;
  }

  function removeSRVRecord(id: string) {
    srvRecords = srvRecords.filter((r) => r.id !== id);
  }

  function updateRecord(id: string, field: keyof SRVRecord, value: string | number) {
    const record = srvRecords.find((r) => r.id === id);
    if (record) {
      (record as Record<string, any>)[field] = value;
      srvRecords = srvRecords;
    }
  }

  function loadExample(example: (typeof examples)[0]) {
    srvRecords = example.records.map((record, index) => ({
      id: (index + 1).toString(),
      service: record.service,
      protocol: record.protocol,
      name: 'example.com',
      priority: record.priority,
      weight: record.weight,
      port: record.port,
      target: record.target,
      ttl: ttl,
    }));
  }

  function fillCommonService(recordId: string, serviceName: string) {
    const service = commonServices.find((s) => s.service === serviceName);
    if (service) {
      updateRecord(recordId, 'service', service.service);
      updateRecord(recordId, 'protocol', service.protocol);
      updateRecord(recordId, 'port', service.port);
    }
  }

  function validateSRVRecord(record: SRVRecord): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!record.service.trim()) {
      issues.push($t('tools/dns-srv-builder.validation.serviceEmpty'));
    } else if (!record.service.startsWith('_')) {
      issues.push($t('tools/dns-srv-builder.validation.serviceUnderscore'));
    }

    if (!record.name.trim()) {
      issues.push($t('tools/dns-srv-builder.validation.domainEmpty'));
    }

    if (record.priority < 0 || record.priority > 65535) {
      issues.push($t('tools/dns-srv-builder.validation.priorityRange'));
    }

    if (record.weight < 0 || record.weight > 65535) {
      issues.push($t('tools/dns-srv-builder.validation.weightRange'));
    }

    if (record.port < 1 || record.port > 65535) {
      issues.push($t('tools/dns-srv-builder.validation.portRange'));
    }

    if (!record.target.trim()) {
      issues.push($t('tools/dns-srv-builder.validation.targetEmpty'));
    } else if (!record.target.endsWith('.')) {
      issues.push($t('tools/dns-srv-builder.validation.targetFQDN'));
    }

    return { valid: issues.length === 0, issues };
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function generateSRVRecords() {
    return srvRecords
      .map((record) => {
        const srvName = `${record.service}.${record.protocol}.${record.name}`;
        return `${srvName} ${record.ttl} IN SRV ${record.priority} ${record.weight} ${record.port} ${record.target}`;
      })
      .join('\n');
  }

  // Update TTL for all records when global TTL changes
  $effect(() => {
    srvRecords.forEach((record) => (record.ttl = ttl));
    srvRecords = srvRecords;
  });
</script>

<div class="card">
  <div class="card-header">
    <h1>{$t('tools/dns-srv-builder.title')}</h1>
    <p class="card-subtitle">
      {$t('tools/dns-srv-builder.description')}
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="controls-header">
        <div class="input-group">
          <label for="ttl" use:tooltip={$t('tools/dns-srv-builder.input.ttl.tooltip')}>
            <Icon name="clock" size="sm" />
            {$t('tools/dns-srv-builder.input.ttl.label')}
          </label>
          <input type="number" id="ttl" bind:value={ttl} min="60" max="86400" />
        </div>

        <button class="add-record-btn" onclick={addSRVRecord}>
          <Icon name="plus" size="sm" />
          {$t('tools/dns-srv-builder.input.addRecordButton')}
        </button>
      </div>

      <div class="srv-records-section">
        <div class="section-header">
          <h3>{$t('tools/dns-srv-builder.input.recordsTitle')}</h3>
        </div>

        <div class="records-list">
          {#each srvRecords as record (record.id)}
            {@const validation = validateSRVRecord(record)}
            <div class="record-row" class:error={!validation.valid}>
              <div class="record-fields">
                <div class="service-protocol-row">
                  <div class="service-input">
                    <label for="service-{record.id}" use:tooltip={$t('tools/dns-srv-builder.input.service.tooltip')}>
                      {$t('tools/dns-srv-builder.input.service.label')}
                    </label>
                    <div class="service-select-wrapper">
                      <select
                        id="service-{record.id}"
                        value={record.service}
                        onchange={(e) => {
                          const serviceName = (e.target as HTMLSelectElement).value;
                          updateRecord(record.id, 'service', serviceName);
                          if (serviceName !== 'custom') {
                            fillCommonService(record.id, serviceName);
                          }
                        }}
                      >
                        {#each commonServices as service (service.service)}
                          <option value={service.service}>{service.service}</option>
                        {/each}
                        <option value="custom">{$t('tools/dns-srv-builder.input.service.customOption')}</option>
                      </select>
                      {#if record.service === 'custom'}
                        <input
                          type="text"
                          value={record.service}
                          oninput={(e) => updateRecord(record.id, 'service', (e.target as HTMLInputElement).value)}
                          placeholder={$t('tools/dns-srv-builder.input.service.customPlaceholder')}
                          class="custom-service-input"
                        />
                      {/if}
                    </div>
                  </div>

                  <div class="protocol-input">
                    <label for="protocol-{record.id}" use:tooltip={$t('tools/dns-srv-builder.input.protocol.tooltip')}>
                      {$t('tools/dns-srv-builder.input.protocol.label')}
                    </label>
                    <select
                      id="protocol-{record.id}"
                      value={record.protocol}
                      onchange={(e) => updateRecord(record.id, 'protocol', (e.target as HTMLSelectElement).value)}
                    >
                      <option value="tcp">{$t('tools/dns-srv-builder.input.protocol.tcp')}</option>
                      <option value="udp">{$t('tools/dns-srv-builder.input.protocol.udp')}</option>
                      <option value="tls">{$t('tools/dns-srv-builder.input.protocol.tls')}</option>
                      <option value="sctp">{$t('tools/dns-srv-builder.input.protocol.sctp')}</option>
                    </select>
                  </div>

                  <div class="name-input">
                    <label for="domain-{record.id}" use:tooltip={$t('tools/dns-srv-builder.input.domain.tooltip')}>
                      {$t('tools/dns-srv-builder.input.domain.label')}
                    </label>
                    <input
                      id="domain-{record.id}"
                      type="text"
                      value={record.name}
                      oninput={(e) => updateRecord(record.id, 'name', (e.target as HTMLInputElement).value)}
                      placeholder={$t('tools/dns-srv-builder.input.domain.placeholder')}
                    />
                  </div>
                </div>

                <div class="priority-weight-row">
                  <div class="priority-input">
                    <label for="priority-{record.id}" use:tooltip={$t('tools/dns-srv-builder.input.priority.tooltip')}>
                      {$t('tools/dns-srv-builder.input.priority.label')}
                    </label>
                    <input
                      id="priority-{record.id}"
                      type="number"
                      value={record.priority}
                      oninput={(e) =>
                        updateRecord(record.id, 'priority', parseInt((e.target as HTMLInputElement).value))}
                      min="0"
                      max="65535"
                    />
                  </div>

                  <div class="weight-input">
                    <label for="weight-{record.id}" use:tooltip={$t('tools/dns-srv-builder.input.weight.tooltip')}>
                      {$t('tools/dns-srv-builder.input.weight.label')}
                    </label>
                    <input
                      id="weight-{record.id}"
                      type="number"
                      value={record.weight}
                      oninput={(e) => updateRecord(record.id, 'weight', parseInt((e.target as HTMLInputElement).value))}
                      min="0"
                      max="65535"
                    />
                  </div>

                  <div class="port-input">
                    <label for="port-{record.id}" use:tooltip={$t('tools/dns-srv-builder.input.port.tooltip')}>
                      {$t('tools/dns-srv-builder.input.port.label')}
                    </label>
                    <input
                      id="port-{record.id}"
                      type="number"
                      value={record.port}
                      oninput={(e) => updateRecord(record.id, 'port', parseInt((e.target as HTMLInputElement).value))}
                      min="1"
                      max="65535"
                    />
                  </div>

                  <div class="target-input">
                    <label for="target-{record.id}" use:tooltip={$t('tools/dns-srv-builder.input.target.tooltip')}>
                      {$t('tools/dns-srv-builder.input.target.label')}
                    </label>
                    <input
                      id="target-{record.id}"
                      type="text"
                      value={record.target}
                      oninput={(e) => updateRecord(record.id, 'target', (e.target as HTMLInputElement).value)}
                      placeholder={$t('tools/dns-srv-builder.input.target.placeholder')}
                    />
                  </div>
                </div>
              </div>

              <button class="remove-btn" onclick={() => removeSRVRecord(record.id)}>
                <Icon name="trash" size="sm" />
              </button>

              {#if !validation.valid}
                <div class="validation-errors">
                  {#each validation.issues as issue, index (index)}
                    <div class="error-message">
                      <Icon name="alert-circle" size="xs" />
                      {issue}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="examples-section">
      <details class="examples-toggle" bind:open={showExamples}>
        <summary>
          <Icon name="lightbulb" size="sm" />
          {$t('tools/dns-srv-builder.examples.title')}
        </summary>
        <div class="examples-grid">
          {#each examples as example (example.label)}
            <button class="example-card" onclick={() => loadExample(example)}>
              <h4>{example.label}</h4>
              <p>{$t('tools/dns-srv-builder.examples.recordsCount', { count: example.records.length })}</p>
            </button>
          {/each}
        </div>
      </details>

      <div class="info-panel">
        <h4>{$t('tools/dns-srv-builder.info.title')}</h4>
        <div class="srv-format">
          <code>{$t('tools/dns-srv-builder.info.format')}</code>
        </div>
        <ul>
          <li>
            <strong>{$t('tools/dns-srv-builder.info.serviceLabel')}</strong>
            {$t('tools/dns-srv-builder.info.serviceDescription')}
          </li>
          <li>
            <strong>{$t('tools/dns-srv-builder.info.protocolLabel')}</strong>
            {$t('tools/dns-srv-builder.info.protocolDescription')}
          </li>
          <li>
            <strong>{$t('tools/dns-srv-builder.info.priorityLabel')}</strong>
            {$t('tools/dns-srv-builder.info.priorityDescription')}
          </li>
          <li>
            <strong>{$t('tools/dns-srv-builder.info.weightLabel')}</strong>
            {$t('tools/dns-srv-builder.info.weightDescription')}
          </li>
          <li>
            <strong>{$t('tools/dns-srv-builder.info.portLabel')}</strong>
            {$t('tools/dns-srv-builder.info.portDescription')}
          </li>
          <li>
            <strong>{$t('tools/dns-srv-builder.info.targetLabel')}</strong>
            {$t('tools/dns-srv-builder.info.targetDescription')}
          </li>
        </ul>
      </div>
    </div>
  </div>

  {#if srvRecords.length > 0}
    <div class="results-section">
      <div class="results-header">
        <h2>{$t('tools/dns-srv-builder.results.title')}</h2>
        <div class="export-buttons">
          <button onclick={() => copyToClipboard(generateSRVRecords())}>
            <Icon name="copy" size="sm" />
            {$t('tools/dns-srv-builder.results.copyButton')}
          </button>
        </div>
      </div>

      <div class="records-table">
        <div class="table-header">
          <div use:tooltip={$t('tools/dns-srv-builder.results.tableHeaders.serviceTooltip')}>
            {$t('tools/dns-srv-builder.results.tableHeaders.service')}
          </div>
          <div use:tooltip={$t('tools/dns-srv-builder.results.tableHeaders.ttlTooltip')}>
            {$t('tools/dns-srv-builder.results.tableHeaders.ttl')}
          </div>
          <div use:tooltip={$t('tools/dns-srv-builder.results.tableHeaders.typeTooltip')}>
            {$t('tools/dns-srv-builder.results.tableHeaders.type')}
          </div>
          <div use:tooltip={$t('tools/dns-srv-builder.results.tableHeaders.priorityTooltip')}>
            {$t('tools/dns-srv-builder.results.tableHeaders.priority')}
          </div>
          <div use:tooltip={$t('tools/dns-srv-builder.results.tableHeaders.weightTooltip')}>
            {$t('tools/dns-srv-builder.results.tableHeaders.weight')}
          </div>
          <div use:tooltip={$t('tools/dns-srv-builder.results.tableHeaders.portTooltip')}>
            {$t('tools/dns-srv-builder.results.tableHeaders.port')}
          </div>
          <div use:tooltip={$t('tools/dns-srv-builder.results.tableHeaders.targetTooltip')}>
            {$t('tools/dns-srv-builder.results.tableHeaders.target')}
          </div>
          <div use:tooltip={$t('tools/dns-srv-builder.results.tableHeaders.statusTooltip')}>
            {$t('tools/dns-srv-builder.results.tableHeaders.status')}
          </div>
        </div>
        {#each srvRecords as record (record.id)}
          {@const validation = validateSRVRecord(record)}
          <div class="table-row" class:error={!validation.valid}>
            <div class="service-name">{record.service}.{record.protocol}.{record.name}</div>
            <div class="ttl">{record.ttl}</div>
            <div class="type">
              <span class="record-type">SRV</span>
            </div>
            <div class="priority">{record.priority}</div>
            <div class="weight">{record.weight}</div>
            <div class="port">{record.port}</div>
            <div class="target">{record.target}</div>
            <div class="status">
              <span class="status-badge {validation.valid ? 'success' : 'error'}">
                <Icon name={validation.valid ? 'check-circle' : 'x-circle'} size="xs" />
                {validation.valid
                  ? $t('tools/dns-srv-builder.results.statusValid')
                  : $t('tools/dns-srv-builder.results.statusIssues')}
              </span>
            </div>
          </div>
        {/each}
      </div>

      {#if srvRecords.some((r) => !validateSRVRecord(r).valid)}
        <div class="validation-summary">
          <h3>
            <Icon name="alert-triangle" size="sm" />
            {$t('tools/dns-srv-builder.results.validationSummaryTitle')}
          </h3>
          <ul>
            {#each srvRecords.filter((r) => !validateSRVRecord(r).valid) as record (record.id)}
              {@const validation = validateSRVRecord(record)}
              <li>
                <strong>{record.service}.{record.protocol}.{record.name}</strong>: {validation.issues.join(', ')}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .card-header {
    .card-subtitle {
      color: var(--text-secondary);
      margin-top: var(--spacing-xs);
    }
  }

  .grid-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-lg);
    margin: var(--spacing-lg) 0;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }

  .input-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);

    input[type='number'] {
      background: var(--bg-primary);
    }
  }

  .controls-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--spacing-md);
    align-items: end;
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border-secondary);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .add-record-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-primary-dark);
      transform: translateY(-1px);
    }
  }

  .srv-records-section {
    .section-header {
      margin-bottom: var(--spacing-md);

      h3 {
        margin: 0;
        font-size: var(--font-size-md);
        color: var(--text-primary);
      }
    }
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .record-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    align-items: start;

    &.error {
      border-color: var(--color-error);
      background: rgba(var(--color-error-rgb), 0.05);
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .record-fields {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .service-protocol-row,
  .priority-weight-row {
    display: grid;
    gap: var(--spacing-sm);

    label {
      display: block;
      font-size: var(--font-size-xs);
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xs);
    }

    input {
      width: 100%;
      padding: var(--spacing-xs);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      font-size: var(--font-size-sm);
    }
  }

  .service-protocol-row {
    grid-template-columns: 2fr 1fr 2fr;

    select {
      width: 100%;
      padding: var(--spacing-xs);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      font-size: var(--font-size-sm);
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .priority-weight-row {
    grid-template-columns: 1fr 1fr 1fr 2fr;

    @media (max-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .service-select-wrapper {
    position: relative;

    .custom-service-input {
      margin-top: var(--spacing-xs);
    }
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(var(--color-error-rgb), 0.1);
    border: 1px solid rgba(var(--color-error-rgb), 0.3);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-error);
      color: var(--bg-primary);
    }
  }

  .validation-errors {
    grid-column: 1 / -1;
    margin-top: var(--spacing-sm);

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--color-error);
      margin-bottom: var(--spacing-xs);
    }
  }

  .examples-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);

    .examples-toggle {
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);
      background: var(--bg-secondary);

      summary {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        cursor: pointer;
        font-weight: 500;
        color: var(--text-primary);

        &:hover {
          color: var(--color-primary);
        }
      }
    }

    .examples-grid {
      display: grid;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
    }

    .example-card {
      padding: var(--spacing-sm);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      cursor: pointer;
      transition: all var(--transition-fast);

      h4 {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: var(--font-size-sm);
        font-weight: 600;
      }

      p {
        margin: 0;
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
      }

      &:hover {
        border-color: var(--color-primary);
        background: var(--surface-hover);
      }
    }

    .info-panel {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);

      h4 {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: var(--font-size-sm);
        color: var(--color-primary);
      }

      .srv-format {
        background: var(--bg-primary);
        border: 1px solid var(--border-secondary);
        border-radius: var(--radius-sm);
        padding: var(--spacing-xs) var(--spacing-sm);
        margin: var(--spacing-sm) 0;

        code {
          font-family: var(--font-mono);
          font-size: var(--font-size-xs);
          color: var(--color-primary);
        }
      }

      ul {
        margin: 0;
        padding-left: var(--spacing-lg);
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        line-height: 1.4;

        li {
          margin-bottom: var(--spacing-xs);

          strong {
            color: var(--text-primary);
          }
        }
      }
    }
  }

  .results-section {
    border-top: 1px solid var(--border-primary);
    padding-top: var(--spacing-lg);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    h2 {
      margin: 0;
      font-size: var(--font-size-lg);
      color: var(--text-primary);
    }

    .export-buttons {
      display: flex;
      gap: var(--spacing-sm);

      button {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: var(--font-size-sm);
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          background: var(--color-primary);
          color: var(--bg-primary);
          border-color: var(--color-primary);
        }
      }
    }
  }

  .records-table {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    overflow: hidden;

    .table-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 2fr 1fr;
      background: var(--bg-primary);
      font-weight: 600;
      font-size: var(--font-size-sm);

      > div {
        padding: var(--spacing-sm) var(--spacing-md);
        border-right: 1px solid var(--border-primary);

        &:last-child {
          border-right: none;
        }
      }
    }

    .table-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 2fr 1fr;
      border-top: 1px solid var(--border-secondary);

      &.error {
        background: rgba(var(--color-error-rgb), 0.05);
      }

      > div {
        padding: var(--spacing-sm) var(--spacing-md);
        border-right: 1px solid var(--border-secondary);
        font-size: var(--font-size-sm);

        &:last-child {
          border-right: none;
        }
      }

      .service-name,
      .target {
        font-family: var(--font-mono);
        word-break: break-all;
      }
    }
  }

  .record-type {
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(var(--color-info-rgb), 0.2);
    color: var(--color-info);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;

    &.success {
      background: rgba(var(--color-success-rgb), 0.2);
      color: var(--color-success);
    }

    &.error {
      background: rgba(var(--color-error-rgb), 0.2);
      color: var(--color-error);
    }
  }

  .validation-summary {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: rgba(var(--color-error-rgb), 0.1);
    border: 1px solid rgba(var(--color-error-rgb), 0.3);
    border-radius: var(--radius-md);

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-md);
      color: var(--color-error);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);

      li {
        margin-bottom: var(--spacing-xs);
        font-size: var(--font-size-sm);
        color: var(--color-error);
      }
    }
  }
</style>
