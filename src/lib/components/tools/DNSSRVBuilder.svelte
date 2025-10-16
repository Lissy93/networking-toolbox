<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import Icon from '$lib/components/global/Icon.svelte';

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

  const examples = [
    {
      label: 'Web Services',
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
      label: 'Mail Services',
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
      label: 'SIP Services',
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
      label: 'XMPP Services',
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
  ];

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
      issues.push('Service name cannot be empty');
    } else if (!record.service.startsWith('_')) {
      issues.push('Service name must start with underscore (_)');
    }

    if (!record.name.trim()) {
      issues.push('Domain name cannot be empty');
    }

    if (record.priority < 0 || record.priority > 65535) {
      issues.push('Priority must be between 0 and 65535');
    }

    if (record.weight < 0 || record.weight > 65535) {
      issues.push('Weight must be between 0 and 65535');
    }

    if (record.port < 1 || record.port > 65535) {
      issues.push('Port must be between 1 and 65535');
    }

    if (!record.target.trim()) {
      issues.push('Target cannot be empty');
    } else if (!record.target.endsWith('.')) {
      issues.push('Target should end with a dot (FQDN)');
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
    <h1>SRV Record Builder</h1>
    <p class="card-subtitle">
      Compose SRV records with service discovery, protocol specification, priority/weight balancing, and target
      validation.
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="controls-header">
        <div class="input-group">
          <label for="ttl" use:tooltip={'Default Time To Live in seconds for all SRV records'}>
            <Icon name="clock" size="sm" />
            Default TTL (seconds)
          </label>
          <input type="number" id="ttl" bind:value={ttl} min="60" max="86400" />
        </div>

        <button class="add-record-btn" onclick={addSRVRecord}>
          <Icon name="plus" size="sm" />
          Add SRV Record
        </button>
      </div>

      <div class="srv-records-section">
        <div class="section-header">
          <h3>SRV Records</h3>
        </div>

        <div class="records-list">
          {#each srvRecords as record (record.id)}
            {@const validation = validateSRVRecord(record)}
            <div class="record-row" class:error={!validation.valid}>
              <div class="record-fields">
                <div class="service-protocol-row">
                  <div class="service-input">
                    <label
                      for="service-{record.id}"
                      use:tooltip={'The service name, typically starting with underscore (e.g., _http, _smtp)'}
                      >Service</label
                    >
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
                        <option value="custom">Custom</option>
                      </select>
                      {#if record.service === 'custom'}
                        <input
                          type="text"
                          value={record.service}
                          oninput={(e) => updateRecord(record.id, 'service', (e.target as HTMLInputElement).value)}
                          placeholder="_myservice"
                          class="custom-service-input"
                        />
                      {/if}
                    </div>
                  </div>

                  <div class="protocol-input">
                    <label
                      for="protocol-{record.id}"
                      use:tooltip={'Transport protocol used by the service (TCP/UDP/TLS/SCTP)'}>Protocol</label
                    >
                    <select
                      id="protocol-{record.id}"
                      value={record.protocol}
                      onchange={(e) => updateRecord(record.id, 'protocol', (e.target as HTMLSelectElement).value)}
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="tls">TLS</option>
                      <option value="sctp">SCTP</option>
                    </select>
                  </div>

                  <div class="name-input">
                    <label for="domain-{record.id}" use:tooltip={'The domain name where this service is located'}
                      >Domain</label
                    >
                    <input
                      id="domain-{record.id}"
                      type="text"
                      value={record.name}
                      oninput={(e) => updateRecord(record.id, 'name', (e.target as HTMLInputElement).value)}
                      placeholder="example.com"
                    />
                  </div>
                </div>

                <div class="priority-weight-row">
                  <div class="priority-input">
                    <label for="priority-{record.id}" use:tooltip={'Lower numbers = higher priority'}>Priority</label>
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
                    <label for="weight-{record.id}" use:tooltip={'Load balancing weight for same priority'}
                      >Weight</label
                    >
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
                    <label for="port-{record.id}" use:tooltip={'Port number where the service is listening (1-65535)'}
                      >Port</label
                    >
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
                    <label
                      for="target-{record.id}"
                      use:tooltip={'Fully Qualified Domain Name of the server hosting the service (must end with dot)'}
                      >Target (FQDN)</label
                    >
                    <input
                      id="target-{record.id}"
                      type="text"
                      value={record.target}
                      oninput={(e) => updateRecord(record.id, 'target', (e.target as HTMLInputElement).value)}
                      placeholder="server.example.com."
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
          Service Examples
        </summary>
        <div class="examples-grid">
          {#each examples as example (example.label)}
            <button class="example-card" onclick={() => loadExample(example)}>
              <h4>{example.label}</h4>
              <p>{example.records.length} SRV records</p>
            </button>
          {/each}
        </div>
      </details>

      <div class="info-panel">
        <h4>SRV Record Structure</h4>
        <div class="srv-format">
          <code>_service._protocol.domain. TTL IN SRV priority weight port target.</code>
        </div>
        <ul>
          <li><strong>Service:</strong> Must start with underscore (e.g., _http, _sip)</li>
          <li><strong>Protocol:</strong> Usually tcp, udp, tls, or sctp</li>
          <li><strong>Priority:</strong> Lower values = higher priority (0-65535)</li>
          <li><strong>Weight:</strong> Load balancing within same priority (0-65535)</li>
          <li><strong>Port:</strong> Service port number (1-65535)</li>
          <li><strong>Target:</strong> FQDN of the server (must end with dot)</li>
        </ul>
      </div>
    </div>
  </div>

  {#if srvRecords.length > 0}
    <div class="results-section">
      <div class="results-header">
        <h2>Generated SRV Records</h2>
        <div class="export-buttons">
          <button onclick={() => copyToClipboard(generateSRVRecords())}>
            <Icon name="copy" size="sm" />
            Copy Records
          </button>
        </div>
      </div>

      <div class="records-table">
        <div class="table-header">
          <div use:tooltip={'Service name and protocol'}>Service</div>
          <div use:tooltip={'Time To Live - how long DNS resolvers should cache this record'}>TTL</div>
          <div use:tooltip={'DNS record type (always SRV for service records)'}>Type</div>
          <div use:tooltip={'Priority - lower values are preferred (0-65535)'}>Priority</div>
          <div use:tooltip={'Weight for load balancing among same priority records (0-65535)'}>Weight</div>
          <div use:tooltip={'Port number where the service is available'}>Port</div>
          <div use:tooltip={'Target server hostname (FQDN)'}>Target</div>
          <div use:tooltip={'Validation status of this SRV record'}>Status</div>
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
                {validation.valid ? 'Valid' : 'Issues'}
              </span>
            </div>
          </div>
        {/each}
      </div>

      {#if srvRecords.some((r) => !validateSRVRecord(r).valid)}
        <div class="validation-summary">
          <h3>
            <Icon name="alert-triangle" size="sm" />
            Configuration Issues
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
