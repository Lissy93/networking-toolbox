<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip';
  import Icon from '$lib/components/global/Icon.svelte';
  import { SvelteSet } from 'svelte/reactivity';

  let aliasInput = $state('');
  let targetInput = $state('');
  let ttl = $state(3600);
  let generateMultiple = $state(false);
  let results = $state<
    {
      alias: string;
      target: string;
      ttl: number;
      status: 'valid' | 'loop' | 'self-target' | 'invalid-format' | 'missing-dot';
    }[]
  >([]);
  let showExamples = $state(false);

  const examples = [
    {
      label: 'Web Aliases',
      aliases: 'www\nblog\nshop\napi',
      targets: 'server1.example.com.\nwordpress.hosting.com.\necommerce.platform.com.\napi-gateway.example.com.',
    },
    {
      label: 'Service Redirects',
      aliases: 'mail\nftp\nvpn',
      targets: 'mailserver.example.com.\nftpserver.example.com.\nvpngateway.example.com.',
    },
    {
      label: 'CDN Configuration',
      aliases: 'cdn\nstatic\nassets\nimages',
      targets: 'cdn.cloudflare.com.\nstatic.fastly.com.\nassets.cloudfront.net.\nimg.amazonaws.com.',
    },
  ];

  function isValidHostname(hostname: string): boolean {
    if (!hostname || hostname.length > 253) return false;

    // Remove trailing dot for validation
    const host = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;

    // Check each label
    const labels = host.split('.');
    if (labels.length < 1) return false;

    return labels.every((label) => {
      if (label.length === 0 || label.length > 63) return false;
      if (label.startsWith('-') || label.endsWith('-')) return false;
      return /^[a-zA-Z0-9-]+$/.test(label);
    });
  }

  function validateCNAME(
    alias: string,
    target: string,
    allRecords: typeof results,
  ): 'valid' | 'loop' | 'self-target' | 'invalid-format' | 'missing-dot' {
    // Check format validity
    if (!isValidHostname(alias) || !isValidHostname(target)) {
      return 'invalid-format';
    }

    // Ensure target ends with dot (FQDN)
    if (!target.endsWith('.')) {
      return 'missing-dot';
    }

    // Check for self-targeting
    const aliasNormalized = alias.endsWith('.') ? alias : alias + '.';
    if (aliasNormalized === target) {
      return 'self-target';
    }

    // Check for loops
    const visited = new SvelteSet<string>();
    let current = target;

    while (current) {
      if (visited.has(current)) {
        return 'loop';
      }
      visited.add(current);

      // Find if current target is also an alias in our records
      const nextRecord = allRecords.find((r) => {
        const recordAlias = r.alias.endsWith('.') ? r.alias : r.alias + '.';
        return recordAlias === current;
      });

      if (nextRecord) {
        current = nextRecord.target;
      } else {
        break;
      }
    }

    return 'valid';
  }

  function generateRecords() {
    if (generateMultiple) {
      const aliases = aliasInput
        .split('\n')
        .map((a) => a.trim())
        .filter((a) => a);
      const targets = targetInput
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t);

      if (aliases.length === 0 || targets.length === 0) {
        results = [];
        return;
      }

      const newResults: typeof results = [];
      const maxLength = Math.max(aliases.length, targets.length);

      for (let i = 0; i < maxLength; i++) {
        const alias = aliases[i % aliases.length];
        const target = targets[i % targets.length];

        if (alias && target) {
          newResults.push({
            alias,
            target,
            ttl,
            status: 'valid', // Will be validated after all records are created
          });
        }
      }

      // Validate all records for loops
      newResults.forEach((record) => {
        record.status = validateCNAME(record.alias, record.target, newResults);
      });

      results = newResults;
    } else {
      // Single record mode
      if (aliasInput.trim() && targetInput.trim()) {
        const singleResult = [
          {
            alias: aliasInput.trim(),
            target: targetInput.trim(),
            ttl,
            status: validateCNAME(aliasInput.trim(), targetInput.trim(), []),
          },
        ];
        results = singleResult;
      } else {
        results = [];
      }
    }
  }

  function loadExample(example: (typeof examples)[0]) {
    aliasInput = example.aliases;
    targetInput = example.targets;
    generateMultiple = true;
    generateRecords();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function getStatusInfo(status: (typeof results)[0]['status']) {
    switch (status) {
      case 'valid':
        return { icon: 'check-circle', class: 'success', text: 'Valid' };
      case 'loop':
        return { icon: 'alert-triangle', class: 'error', text: 'Loop Detected' };
      case 'self-target':
        return { icon: 'alert-triangle', class: 'error', text: 'Self Target' };
      case 'invalid-format':
        return { icon: 'x-circle', class: 'error', text: 'Invalid Format' };
      case 'missing-dot':
        return { icon: 'info', class: 'warning', text: 'Missing FQDN Dot' };
      default:
        return { icon: 'help-circle', class: 'info', text: 'Unknown' };
    }
  }

  $effect(() => {
    generateRecords();
  });
</script>

<div class="card">
  <div class="card-header">
    <h1>CNAME Builder</h1>
    <p class="card-subtitle">Build valid CNAME records with loop detection, self-target checks, and FQDN validation.</p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="mode-selector">
        <label class="checkbox-option">
          <input type="checkbox" bind:checked={generateMultiple} />
          <span class="checkmark"></span>
          Bulk mode (multiple records)
        </label>
      </div>

      {#if generateMultiple}
        <div class="input-group">
          <label for="aliases" use:tooltip={'Enter alias names, one per line'}>
            <Icon name="alias" size="sm" />
            Alias Names
          </label>
          <textarea id="aliases" bind:value={aliasInput} placeholder="www&#10;blog&#10;mail&#10;ftp" rows="6"
          ></textarea>
        </div>

        <div class="input-group">
          <label for="targets" use:tooltip={'Enter target FQDNs, one per line. Must end with dot (.).'}>
            <Icon name="target" size="sm" />
            Target FQDNs
          </label>
          <textarea
            id="targets"
            bind:value={targetInput}
            placeholder="server1.example.com.&#10;server2.example.com.&#10;mailserver.example.com.&#10;ftpserver.example.com."
            rows="6"
          ></textarea>
        </div>
      {:else}
        <div class="input-group">
          <label for="alias" use:tooltip={'Enter the alias name (left side of CNAME)'}>
            <Icon name="alias" size="sm" />
            Alias Name
          </label>
          <input type="text" id="alias" bind:value={aliasInput} placeholder="www" />
        </div>

        <div class="input-group">
          <label for="target" use:tooltip={'Enter the target FQDN (right side of CNAME). Must end with dot (.).'}>
            <Icon name="target" size="sm" />
            Target FQDN
          </label>
          <input type="text" id="target" bind:value={targetInput} placeholder="server1.example.com." />
        </div>
      {/if}

      <div class="controls-row">
        <div class="input-group">
          <label for="ttl" use:tooltip={'Time To Live in seconds'}>
            <Icon name="clock" size="sm" />
            TTL (seconds)
          </label>
          <input type="number" id="ttl" bind:value={ttl} min="60" max="86400" />
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
              <p>{example.aliases.split('\n').length} records</p>
            </button>
          {/each}
        </div>
      </details>

      <div class="info-panel">
        <h4>CNAME Best Practices</h4>
        <ul>
          <li>Target must be a Fully Qualified Domain Name (FQDN) ending with a dot</li>
          <li>CNAME records cannot coexist with other record types</li>
          <li>Avoid CNAME chains longer than 3-4 hops</li>
          <li>Never point a CNAME to another CNAME if possible</li>
        </ul>
      </div>
    </div>
  </div>

  {#if results.length > 0}
    <div class="results-section">
      <div class="results-header">
        <h2>Generated CNAME Records</h2>
        <div class="export-buttons">
          <button
            onclick={() => copyToClipboard(results.map((r) => `${r.alias} ${r.ttl} IN CNAME ${r.target}`).join('\n'))}
          >
            <Icon name="copy" size="sm" />
            Copy Records
          </button>
        </div>
      </div>

      <div class="records-table">
        <div class="table-header">
          <div>Alias</div>
          <div>TTL</div>
          <div>Type</div>
          <div>Target</div>
          <div>Status</div>
        </div>
        {#each results as record, index (index)}
          {@const statusInfo = getStatusInfo(record.status)}
          <div class="table-row" class:error={record.status !== 'valid'}>
            <div class="alias">{record.alias}</div>
            <div class="ttl">{record.ttl}</div>
            <div class="type">
              <span class="record-type">CNAME</span>
            </div>
            <div class="target">{record.target}</div>
            <div class="status">
              <span class="status-badge {statusInfo.class}">
                <Icon name={statusInfo.icon} size="xs" />
                {statusInfo.text}
              </span>
            </div>
          </div>
        {/each}
      </div>

      {#if results.some((r) => r.status !== 'valid')}
        <div class="validation-warnings">
          <h3>
            <Icon name="alert-triangle" size="sm" />
            Validation Issues
          </h3>
          <ul>
            {#each results.filter((r) => r.status !== 'valid') as record, index (index)}
              {@const statusInfo = getStatusInfo(record.status)}
              <li class="warning-item {statusInfo.class}">
                <strong>{record.alias}</strong>: {statusInfo.text}
                {#if record.status === 'missing-dot'}
                  - Target should end with '.' to be a proper FQDN
                {/if}
                {#if record.status === 'loop'}
                  - Creates a circular reference that will cause DNS resolution to fail
                {/if}
                {#if record.status === 'self-target'}
                  - Points to itself, which is not allowed
                {/if}
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

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .input-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);

    textarea,
    input[type='text'],
    input[type='number'] {
      background: var(--bg-primary);
    }
  }

  .mode-selector {
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-secondary);
    margin-bottom: var(--spacing-sm);
  }

  .controls-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    font-size: var(--font-size-sm);

    input[type='checkbox'] {
      display: none;
    }

    .checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-primary);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      position: relative;
      transition: all var(--transition-fast);

      &::after {
        content: '';
        position: absolute;
        left: 5px;
        top: 2px;
        width: 6px;
        height: 10px;
        border: 2px solid var(--bg-primary);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
        opacity: 0;
        transition: opacity var(--transition-fast);
      }
    }

    input:checked + .checkmark {
      background: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        opacity: 1;
      }
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
      grid-template-columns: 2fr 1fr 1fr 2fr 1.5fr;
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
      grid-template-columns: 2fr 1fr 1fr 2fr 1.5fr;
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

      .alias,
      .target {
        font-weight: 500;
        font-family: var(--font-mono);
      }

      .target {
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

    &.warning {
      background: rgba(var(--color-warning-rgb), 0.2);
      color: var(--color-warning);
    }

    &.error {
      background: rgba(var(--color-error-rgb), 0.2);
      color: var(--color-error);
    }

    &.info {
      background: rgba(var(--color-info-rgb), 0.2);
      color: var(--color-info);
    }
  }

  .validation-warnings {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: rgba(var(--color-warning-rgb), 0.1);
    border: 1px solid rgba(var(--color-warning-rgb), 0.3);
    border-radius: var(--radius-md);

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-md);
      color: var(--color-warning);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);

      .warning-item {
        margin-bottom: var(--spacing-xs);
        font-size: var(--font-size-sm);

        &.error {
          color: var(--color-error);
        }

        &.warning {
          color: var(--color-warning);
        }
      }
    }
  }
</style>
