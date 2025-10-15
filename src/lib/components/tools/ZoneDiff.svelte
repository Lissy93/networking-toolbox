<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { parseZoneFile, compareZones, type ZoneDiff, type ResourceRecord } from '$lib/utils/zone-parser.js';
  import { useClipboard } from '$lib/composables';

  let oldZoneInput = $state('');
  let newZoneInput = $state('');
  let results = $state<ZoneDiff | null>(null);
  let showUnified = $state(false);
  const clipboard = useClipboard();
  let activeExampleIndex = $state<number | null>(null);

  const examples = [
    {
      name: 'Simple Changes',
      oldZone: `example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
example.com.	IN	NS	ns1.example.com.
example.com.	IN	NS	ns2.example.com.
www.example.com.	IN	A	192.0.2.1
mail.example.com.	IN	A	192.0.2.10`,
      newZone: `example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010102 3600 1800 1209600 86400
example.com.	IN	NS	ns1.example.com.
example.com.	IN	NS	ns2.example.com.
www.example.com.	IN	A	192.0.2.2
ftp.example.com.	IN	A	192.0.2.3
mail.example.com.	IN	A	192.0.2.10`,
      description: 'Changed IP address and added new record',
    },
    {
      name: 'Record Type Changes',
      oldZone: `example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
www.example.com.	IN	A	192.0.2.1
blog.example.com.	IN	A	192.0.2.2`,
      newZone: `example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
www.example.com.	IN	A	192.0.2.1
blog.example.com.	IN	CNAME	www.example.com.`,
      description: 'Changed A record to CNAME',
    },
    {
      name: 'Complex Migration',
      oldZone: `$ORIGIN example.com.
$TTL 86400
@	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
	IN	NS	ns1.example.com.
	IN	NS	ns2.example.com.
www	IN	A	192.0.2.1
mail	IN	A	192.0.2.10
	IN	MX	10	mail.example.com.`,
      newZone: `$ORIGIN example.com.
$TTL 3600
@	IN	SOA	ns1.example.com. hostmaster.example.com. 2023010201 10800 3600 604800 86400
	IN	NS	ns1.example.com.
	IN	NS	ns2.example.com.
	IN	NS	ns3.example.com.
www	300	IN	A	203.0.113.1
api	IN	A	203.0.113.2
mail	IN	A	203.0.113.10
	IN	MX	10	mail.example.com.`,
      description: 'Zone migration with IP changes and additions',
    },
  ];

  function loadExample(example: (typeof examples)[0], index: number) {
    oldZoneInput = example.oldZone;
    newZoneInput = example.newZone;
    activeExampleIndex = index;
    compareZoneFiles();
  }

  function clearActiveIfChanged() {
    if (activeExampleIndex !== null) {
      const activeExample = examples[activeExampleIndex];
      if (!activeExample || oldZoneInput !== activeExample.oldZone || newZoneInput !== activeExample.newZone) {
        activeExampleIndex = null;
      }
    }
  }

  function compareZoneFiles() {
    if (!oldZoneInput.trim() || !newZoneInput.trim()) {
      results = null;
      return;
    }

    try {
      const oldZone = parseZoneFile(oldZoneInput);
      const newZone = parseZoneFile(newZoneInput);
      results = compareZones(oldZone, newZone);
    } catch (error) {
      console.error('Failed to compare zones:', error);
      results = null;
    }
  }

  function generateUnifiedDiff(): string {
    if (!results) return '';

    const lines: string[] = [];
    lines.push('--- Old Zone');
    lines.push('+++ New Zone');
    lines.push(`@@ -1,${oldZoneInput.split('\n').length} +1,${newZoneInput.split('\n').length} @@`);

    // Show removed records
    for (const record of results.removed) {
      lines.push(`-${formatRecord(record)}`);
    }

    // Show added records
    for (const record of results.added) {
      lines.push(`+${formatRecord(record)}`);
    }

    // Show changed records
    for (const change of results.changed) {
      lines.push(`-${formatRecord(change.before)}`);
      lines.push(`+${formatRecord(change.after)}`);
    }

    return lines.join('\n');
  }

  function formatRecord(record: ResourceRecord): string {
    const ttl = record.ttl ? record.ttl.toString() : '';
    return [record.owner, ttl, record.class, record.type, record.rdata].filter(Boolean).join('\t');
  }

  function copyDiff() {
    if (!results) return;
    const diffText = showUnified ? generateUnifiedDiff() : formatStructuredDiff();
    clipboard.copy(diffText);
  }

  function formatStructuredDiff(): string {
    if (!results) return '';

    const lines: string[] = [];

    if (results.added.length > 0) {
      lines.push(`Added Records (${results.added.length}):`);
      for (const record of results.added) {
        lines.push(`+ ${formatRecord(record)}`);
      }
      lines.push('');
    }

    if (results.removed.length > 0) {
      lines.push(`Removed Records (${results.removed.length}):`);
      for (const record of results.removed) {
        lines.push(`- ${formatRecord(record)}`);
      }
      lines.push('');
    }

    if (results.changed.length > 0) {
      lines.push(`Changed Records (${results.changed.length}):`);
      for (const change of results.changed) {
        lines.push(`~ ${formatRecord(change.before)}`);
        lines.push(`  ${formatRecord(change.after)}`);
      }
    }

    return lines.join('\n');
  }

  function handleInputChange() {
    clearActiveIfChanged();
    compareZoneFiles();
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DNS Zone Diff</h1>
    <p>Compare two zone files and identify added, removed, and changed DNS records</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="plus-circle" size="sm" />
        <div>
          <strong>Added Records:</strong> Identify new DNS records in the updated zone file.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="minus-circle" size="sm" />
        <div>
          <strong>Removed Records:</strong> Find records that were deleted from the original zone.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="edit" size="sm" />
        <div>
          <strong>Changed Records:</strong> Detect modifications to existing records' data or TTL.
        </div>
      </div>
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Zone Comparison Examples</h3>
      </summary>
      <div class="examples-grid">
        {#each examples as example, index (example.name)}
          <button
            class="example-card {activeExampleIndex === index ? 'active' : ''}"
            onclick={() => loadExample(example, index)}
          >
            <div class="example-name">{example.name}</div>
            <div class="example-description">{example.description}</div>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Section -->
  <div class="card input-card">
    <div class="input-layout">
      <div class="zone-input-group">
        <label for="old-zone" use:tooltip={'Original zone file content for comparison'}>
          <Icon name="file" size="sm" />
          Original Zone
        </label>
        <textarea
          id="old-zone"
          bind:value={oldZoneInput}
          oninput={handleInputChange}
          placeholder="Original zone file content..."
          class="zone-textarea"
          rows="10"
        ></textarea>
      </div>

      <div class="zone-input-group">
        <label for="new-zone" use:tooltip={'Updated zone file content to compare against'}>
          <Icon name="file-tick" size="sm" />
          Updated Zone
        </label>
        <textarea
          id="new-zone"
          bind:value={newZoneInput}
          oninput={handleInputChange}
          placeholder="Updated zone file content..."
          class="zone-textarea"
          rows="10"
        ></textarea>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <section class="results-section">
      <div class="results-header">
        <h3>Zone Comparison Results</h3>
        <div class="results-controls">
          <label class="diff-format-toggle">
            <input type="checkbox" class="styled-checkbox" bind:checked={showUnified} />
            <span class="checkbox-text">Unified diff format</span>
          </label>
          <button class="copy-button {clipboard.isCopied() ? 'copied' : ''}" onclick={copyDiff}>
            <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
            {clipboard.isCopied() ? 'Copied!' : 'Copy Diff'}
          </button>
        </div>
      </div>

      <div class="results-inner">
        <!-- Summary Stats -->
        <div class="summary-card">
          <h4>
            <Icon name="list-check" size="sm" />
            Change Summary
          </h4>
          <div class="summary-stats">
            <div class="stat-item added">
              <div class="stat-value">{results.added.length}</div>
              <div class="stat-label">Added</div>
            </div>
            <div class="stat-item removed">
              <div class="stat-value">{results.removed.length}</div>
              <div class="stat-label">Removed</div>
            </div>
            <div class="stat-item changed">
              <div class="stat-value">{results.changed.length}</div>
              <div class="stat-label">Changed</div>
            </div>
            <div class="stat-item unchanged">
              <div class="stat-value">{results.unchanged.length}</div>
              <div class="stat-label">Unchanged</div>
            </div>
          </div>
        </div>

        <!-- Diff Output -->
        {#if showUnified}
          <div class="diff-card unified">
            <h4>
              <Icon name="code-diff" size="sm" />
              Unified Diff
            </h4>
            <div class="code-output">
              <pre>{generateUnifiedDiff()}</pre>
            </div>
          </div>
        {:else}
          <div class="diff-sections">
            <!-- Added Records -->
            {#if results.added.length > 0}
              <div class="diff-card added-card">
                <h4>
                  <Icon name="plus-circle" size="sm" />
                  Added Records ({results.added.length})
                </h4>
                <div class="records-list">
                  {#each results.added as record, index (index)}
                    <div class="record-item added">
                      <Icon name="plus" size="sm" />
                      <code>{formatRecord(record)}</code>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Removed Records -->
            {#if results.removed.length > 0}
              <div class="diff-card removed-card">
                <h4>
                  <Icon name="minus-circle" size="sm" />
                  Removed Records ({results.removed.length})
                </h4>
                <div class="records-list">
                  {#each results.removed as record, index (index)}
                    <div class="record-item removed">
                      <Icon name="minus" size="sm" />
                      <code>{formatRecord(record)}</code>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Changed Records -->
            {#if results.changed.length > 0}
              <div class="diff-card changed-card">
                <h4>
                  <Icon name="edit" size="sm" />
                  Changed Records ({results.changed.length})
                </h4>
                <div class="records-list">
                  {#each results.changed as change, index (index)}
                    <div class="change-group">
                      <div class="record-item removed">
                        <Icon name="minus" size="sm" />
                        <code>{formatRecord(change.before)}</code>
                      </div>
                      <div class="record-item added">
                        <Icon name="plus" size="sm" />
                        <code>{formatRecord(change.after)}</code>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>Zone File Comparison</h4>
        <p>
          Comparing zone files helps track DNS changes during migrations, updates, or troubleshooting. It identifies
          exactly what records were added, removed, or modified between two zone versions.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Change Types</h4>
        <p>
          Added records are new entries in the updated zone. Removed records exist in the original but not the updated
          zone. Changed records have the same owner and type but different data or TTL values.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Diff Formats</h4>
        <p>
          Structured format groups changes by type for easy review. Unified diff format follows standard patch
          conventions, useful for version control systems and automated processing.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Migration Planning</h4>
        <p>
          Use zone diffs to plan DNS migrations, verify changes before deployment, and audit modifications. Consider TTL
          impact on propagation when planning record updates or deletions.
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
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
      transform: translateY(-1px);
    }

    &.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
      background-color: var(--surface-hover);
    }
  }

  .example-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .example-description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .input-card {
    margin-bottom: var(--spacing-xl);
  }

  .input-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .zone-input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .zone-textarea {
    width: 100%;
    padding: var(--spacing-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    resize: vertical;
    min-height: 200px;
    line-height: 1.4;
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 90%);
    }
  }

  .results-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
      align-items: flex-start;
    }

    h3 {
      margin: 0;
      color: var(--text-primary);
    }
  }

  .results-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }
  }

  .diff-format-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    user-select: none;
  }

  .styled-checkbox {
    height: 1.6rem;
    width: 1.6rem;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    cursor: pointer;
    position: relative;
    transition: all var(--transition-fast);
    margin: 0;
    flex-shrink: 0;
    padding: 0;

    &:checked {
      background-color: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--color-primary);
        font-size: 12px;
        font-weight: bold;
        line-height: 1;
      }
    }

    &:hover {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 80%);
    }
  }

  .checkbox-text {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-weight: 500;
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);

    &:hover {
      background-color: var(--surface-hover);
    }

    &.copied {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }

  .results-inner {
    display: grid;
    gap: var(--spacing-md);
  }

  .summary-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-item {
    text-align: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);

    &.added {
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
      border: 1px solid var(--color-success);
    }

    &.removed {
      background-color: color-mix(in srgb, var(--color-error), transparent 90%);
      border: 1px solid var(--color-error);
    }

    &.changed {
      background-color: color-mix(in srgb, var(--color-warning), transparent 90%);
      border: 1px solid var(--color-warning);
    }

    &.unchanged {
      background-color: color-mix(in srgb, var(--color-info), transparent 90%);
      border: 1px solid var(--color-info);
    }

    .stat-value {
      font-size: var(--font-size-xl);
      font-weight: 700;
      margin-bottom: var(--spacing-xs);
    }

    .stat-label {
      font-size: var(--font-size-sm);
      opacity: 0.8;
    }

    &.added .stat-value,
    &.added .stat-label {
      color: var(--color-success);
    }

    &.removed .stat-value,
    &.removed .stat-label {
      color: var(--color-error);
    }

    &.changed .stat-value,
    &.changed .stat-label {
      color: var(--color-warning);
    }

    &.unchanged .stat-value,
    &.unchanged .stat-label {
      color: var(--color-info);
    }
  }

  .diff-sections {
    display: grid;
    gap: var(--spacing-md);
  }

  .diff-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: 0;
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
    }

    &.added-card h4 {
      color: var(--color-success);
    }

    &.removed-card h4 {
      color: var(--color-error);
    }

    &.changed-card h4 {
      color: var(--color-warning);
    }

    &.unified {
      .code-output {
        padding: var(--spacing-md);
        background-color: var(--bg-tertiary);
        border: 1px solid var(--border-secondary);
        border-radius: var(--radius-md);
        overflow-x: auto;

        pre {
          font-family: var(--font-mono);
          font-size: var(--font-size-sm);
          color: var(--text-primary);
          white-space: pre;
          margin: 0;
          line-height: 1.4;
        }
      }
    }
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .record-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);

    code {
      font-family: var(--font-mono);
      flex: 1;
    }

    &.added {
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
    }

    &.removed {
      background-color: color-mix(in srgb, var(--color-error), transparent 90%);
      color: var(--color-error);
    }
  }

  .change-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-xs);
    border-left: 3px solid var(--color-warning);
    background-color: color-mix(in srgb, var(--color-warning), transparent 95%);
    border-radius: var(--radius-sm);
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

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
