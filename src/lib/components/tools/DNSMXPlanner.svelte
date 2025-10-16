<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import Icon from '$lib/components/global/Icon.svelte';

  type MXRecord = {
    id: string;
    priority: number;
    mailserver: string;
    ttl: number;
    role: 'primary' | 'backup' | 'custom';
  };

  let domain = $state('example.com');
  let ttl = $state(3600);
  let mxRecords = $state<MXRecord[]>([
    { id: '1', priority: 10, mailserver: 'mail1.example.com.', ttl: 3600, role: 'primary' },
    { id: '2', priority: 20, mailserver: 'mail2.example.com.', ttl: 3600, role: 'backup' },
  ]);

  let autoSort = $state(true);
  let showExamples = $state(false);
  let showGuidance = $state(true);

  // Derived array for display - sorted or original order based on autoSort
  const displayMxRecords = $derived(autoSort ? [...mxRecords].sort((a, b) => a.priority - b.priority) : mxRecords);

  const examples = [
    {
      label: 'Basic Setup',
      domain: 'company.com',
      records: [
        { priority: 10, mailserver: 'mail.company.com.', role: 'primary' as const },
        { priority: 20, mailserver: 'backup-mail.company.com.', role: 'backup' as const },
      ],
    },
    {
      label: 'Google Workspace',
      domain: 'company.com',
      records: [
        { priority: 1, mailserver: 'aspmx.l.google.com.', role: 'primary' as const },
        { priority: 5, mailserver: 'alt1.aspmx.l.google.com.', role: 'backup' as const },
        { priority: 5, mailserver: 'alt2.aspmx.l.google.com.', role: 'backup' as const },
        { priority: 10, mailserver: 'alt3.aspmx.l.google.com.', role: 'backup' as const },
        { priority: 10, mailserver: 'alt4.aspmx.l.google.com.', role: 'backup' as const },
      ],
    },
    {
      label: 'Microsoft 365',
      domain: 'company.com',
      records: [{ priority: 0, mailserver: 'company-com.mail.protection.outlook.com.', role: 'primary' as const }],
    },
    {
      label: 'Multi-Provider Setup',
      domain: 'company.com',
      records: [
        { priority: 10, mailserver: 'mail1.provider1.com.', role: 'primary' as const },
        { priority: 20, mailserver: 'mail2.provider1.com.', role: 'backup' as const },
        { priority: 30, mailserver: 'fallback.provider2.com.', role: 'backup' as const },
      ],
    },
  ];

  const priorityGuidelines = [
    { range: '0-9', usage: 'Highest priority, primary mail servers', color: 'success' },
    { range: '10-19', usage: 'High priority, secondary mail servers', color: 'info' },
    { range: '20-49', usage: 'Medium priority, backup servers', color: 'warning' },
    { range: '50+', usage: 'Low priority, fallback servers', color: 'error' },
  ];

  function addMXRecord() {
    const newId = (Math.max(...mxRecords.map((r) => parseInt(r.id)), 0) + 1).toString();
    mxRecords.push({
      id: newId,
      priority: 30,
      mailserver: '',
      ttl: ttl,
      role: 'custom',
    });
    mxRecords = mxRecords; // Trigger reactivity
  }

  function removeMXRecord(id: string) {
    mxRecords = mxRecords.filter((r) => r.id !== id);
  }

  function updateRecord(id: string, field: keyof MXRecord, value: string | number) {
    const record = mxRecords.find((r) => r.id === id);
    if (record) {
      (record as Record<string, any>)[field] = value;
      mxRecords = mxRecords; // Trigger reactivity
    }
  }

  function loadExample(example: (typeof examples)[0]) {
    domain = example.domain;
    mxRecords = example.records.map((record, index) => ({
      id: (index + 1).toString(),
      priority: record.priority,
      mailserver: record.mailserver,
      ttl: ttl,
      role: record.role,
    }));
  }

  function sortRecords() {
    autoSort = !autoSort;
  }

  function validateMXRecord(record: MXRecord): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!record.mailserver.trim()) {
      issues.push('Mail server cannot be empty');
    } else if (!record.mailserver.endsWith('.')) {
      issues.push('Mail server should end with a dot (FQDN)');
    }

    if (record.priority < 0 || record.priority > 65535) {
      issues.push('Priority must be between 0 and 65535');
    }

    // Check for duplicate priorities
    const duplicates = mxRecords.filter((r) => r.id !== record.id && r.priority === record.priority);
    if (duplicates.length > 0) {
      issues.push('Duplicate priority values detected');
    }

    return { valid: issues.length === 0, issues };
  }

  function getPriorityGuideline(priority: number) {
    if (priority <= 9) return priorityGuidelines[0];
    if (priority <= 19) return priorityGuidelines[1];
    if (priority <= 49) return priorityGuidelines[2];
    return priorityGuidelines[3];
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function generateZoneFileRecords() {
    // Always sort for zone file output regardless of display preference
    const sortedRecords = [...mxRecords].sort((a, b) => a.priority - b.priority);
    return sortedRecords
      .map((record) => `${domain}. ${record.ttl} IN MX ${record.priority} ${record.mailserver}`)
      .join('\n');
  }

  $effect(() => {
    // Update TTL for all records when global TTL changes
    mxRecords.forEach((record) => (record.ttl = ttl));
    mxRecords = mxRecords; // Trigger reactivity
  });
</script>

<div class="card">
  <div class="card-header">
    <h1>MX Record Planner</h1>
    <p class="card-subtitle">
      Plan MX record priorities with fallback guidance, best practices, and sample configurations for popular email
      providers.
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="domain-config">
        <div class="input-group">
          <label for="domain" use:tooltip={'Domain name for the MX records'}>
            <Icon name="globe" size="sm" />
            Domain
          </label>
          <input type="text" id="domain" bind:value={domain} placeholder="example.com" />
        </div>

        <div class="input-group">
          <label for="ttl" use:tooltip={'Default Time To Live in seconds for all MX records'}>
            <Icon name="clock" size="sm" />
            Default TTL (seconds)
          </label>
          <input type="number" id="ttl" bind:value={ttl} min="60" max="86400" />
        </div>

        <button class="add-record-btn" onclick={addMXRecord}>
          <Icon name="plus" size="sm" />
          Add MX Record
        </button>
      </div>

      <div class="mx-records-section">
        <div class="section-header">
          <h3>MX Records</h3>
          <button class="sort-btn" onclick={sortRecords}>
            <Icon name="sort" size="sm" />
            {autoSort ? 'Original Order' : 'Sort by Priority'}
          </button>
        </div>

        <div class="records-list">
          {#each displayMxRecords as record (record.id)}
            {@const validation = validateMXRecord(record)}
            <div class="record-row" class:error={!validation.valid}>
              <div class="priority-input">
                <label for="priority-{record.id}" use:tooltip={'Lower numbers = higher priority'}>Priority</label>
                <input
                  id="priority-{record.id}"
                  type="number"
                  value={record.priority}
                  oninput={(e) => updateRecord(record.id, 'priority', parseInt((e.target as HTMLInputElement).value))}
                  min="0"
                  max="65535"
                />
                {#if record.priority !== undefined}
                  {@const guideline = getPriorityGuideline(record.priority)}
                  <span class="priority-hint {guideline.color}">{guideline.usage}</span>
                {/if}
              </div>

              <div class="mailserver-input">
                <label for="mailserver-{record.id}">Mail Server (FQDN)</label>
                <input
                  id="mailserver-{record.id}"
                  type="text"
                  value={record.mailserver}
                  oninput={(e) => updateRecord(record.id, 'mailserver', (e.target as HTMLInputElement).value)}
                  placeholder="mail.example.com."
                />
              </div>

              <div class="role-select">
                <label for="role-{record.id}">Role</label>
                <select
                  id="role-{record.id}"
                  value={record.role}
                  onchange={(e) => updateRecord(record.id, 'role', (e.target as HTMLSelectElement).value)}
                >
                  <option value="primary">Primary</option>
                  <option value="backup">Backup</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <button class="remove-btn" onclick={() => removeMXRecord(record.id)}>
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
          Quick Examples
        </summary>
        <div class="examples-grid">
          {#each examples as example (example.label)}
            <button class="example-card" onclick={() => loadExample(example)}>
              <h4>{example.label}</h4>
              <p>{example.records.length} MX records</p>
            </button>
          {/each}
        </div>
      </details>

      <details class="guidance-toggle" bind:open={showGuidance}>
        <summary>
          <Icon name="info" size="sm" />
          Priority Guidelines
        </summary>
        <div class="priority-guide">
          {#each priorityGuidelines as guideline (guideline.range)}
            <div class="guide-item {guideline.color}">
              <span class="range">{guideline.range}</span>
              <span class="usage">{guideline.usage}</span>
            </div>
          {/each}
        </div>
      </details>

      <div class="info-panel">
        <h4>MX Best Practices</h4>
        <ul>
          <li>Always have at least two MX records for redundancy</li>
          <li>Use different priority values to control mail flow</li>
          <li>Ensure all mail servers are properly configured</li>
          <li>Test mail delivery to all configured servers</li>
          <li>Consider geographic distribution for better performance</li>
        </ul>
      </div>
    </div>
  </div>

  {#if mxRecords.length > 0}
    <div class="results-section">
      <div class="results-header">
        <h2>Generated MX Records</h2>
        <div class="export-buttons">
          <button onclick={() => copyToClipboard(generateZoneFileRecords())}>
            <Icon name="copy" size="sm" />
            Copy Zone Records
          </button>
        </div>
      </div>

      <div class="records-table">
        <div class="table-header">
          <div>Domain</div>
          <div>TTL</div>
          <div>Type</div>
          <div>Priority</div>
          <div>Mail Server</div>
          <div>Status</div>
        </div>
        {#each displayMxRecords as record (record.id)}
          {@const validation = validateMXRecord(record)}
          <div class="table-row" class:error={!validation.valid}>
            <div class="domain">{domain}</div>
            <div class="ttl">{record.ttl}</div>
            <div class="type">
              <span class="record-type">MX</span>
            </div>
            <div class="priority">
              <span class="priority-badge {getPriorityGuideline(record.priority).color}">
                {record.priority}
              </span>
            </div>
            <div class="mailserver">{record.mailserver}</div>
            <div class="status">
              <span class="status-badge {validation.valid ? 'success' : 'error'}">
                <Icon name={validation.valid ? 'check-circle' : 'x-circle'} size="xs" />
                {validation.valid ? 'Valid' : 'Issues'}
              </span>
            </div>
          </div>
        {/each}
      </div>

      {#if mxRecords.some((r) => !validateMXRecord(r).valid)}
        <div class="validation-summary">
          <h3>
            <Icon name="alert-triangle" size="sm" />
            Configuration Issues
          </h3>
          <ul>
            {#each mxRecords.filter((r) => !validateMXRecord(r).valid) as record (record.id)}
              {@const validation = validateMXRecord(record)}
              <li>
                <strong>Priority {record.priority}</strong>: {validation.issues.join(', ')}
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

    input[type='text'],
    input[type='number'] {
      background: var(--bg-primary);
    }
  }

  .domain-config {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
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

  .mx-records-section {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);

      h3 {
        margin: 0;
        font-size: var(--font-size-md);
        color: var(--text-primary);
      }

      .sort-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-xs) var(--spacing-sm);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        background: var(--bg-primary);
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
        }
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
    grid-template-columns: 1fr 2fr auto auto;
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
      gap: var(--spacing-sm);
    }

    label {
      display: block;
      font-size: var(--font-size-xs);
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xs);
    }

    input,
    select {
      width: 100%;
      padding: var(--spacing-xs);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      font-size: var(--font-size-sm);
    }

    .priority-hint {
      display: block;
      font-size: var(--font-size-xs);
      margin-top: var(--spacing-xs);
      padding: 2px 4px;
      border-radius: var(--radius-sm);

      &.success {
        color: var(--color-success);
      }
      &.info {
        color: var(--color-info);
      }
      &.warning {
        color: var(--color-warning);
      }
      &.error {
        color: var(--color-error);
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
  }

  .examples-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);

    .examples-toggle,
    .guidance-toggle {
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

    .priority-guide {
      margin-top: var(--spacing-md);

      .guide-item {
        display: flex;
        justify-content: space-between;
        padding: var(--spacing-xs);
        margin-bottom: var(--spacing-xs);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);

        .range {
          font-weight: 600;
          font-family: var(--font-mono);
        }

        &.success {
          background: rgba(var(--color-success-rgb), 0.1);
          color: var(--color-success);
        }
        &.info {
          background: rgba(var(--color-info-rgb), 0.1);
          color: var(--color-info);
        }
        &.warning {
          background: rgba(var(--color-warning-rgb), 0.1);
          color: var(--color-warning);
        }
        &.error {
          background: rgba(var(--color-error-rgb), 0.1);
          color: var(--color-error);
        }
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

      ul {
        margin: 0;
        padding-left: var(--spacing-lg);
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        line-height: 1.4;

        li {
          margin-bottom: var(--spacing-xs);
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
      grid-template-columns: 1.5fr 1fr 1fr 1fr 2fr 1fr;
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
      grid-template-columns: 1.5fr 1fr 1fr 1fr 2fr 1fr;
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

      .domain,
      .mailserver {
        font-family: var(--font-mono);
      }

      .mailserver {
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

  .priority-badge {
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
    font-family: var(--font-mono);

    &.success {
      background: rgba(var(--color-success-rgb), 0.2);
      color: var(--color-success);
    }
    &.info {
      background: rgba(var(--color-info-rgb), 0.2);
      color: var(--color-info);
    }
    &.warning {
      background: rgba(var(--color-warning-rgb), 0.2);
      color: var(--color-warning);
    }
    &.error {
      background: rgba(var(--color-error-rgb), 0.2);
      color: var(--color-error);
    }
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
