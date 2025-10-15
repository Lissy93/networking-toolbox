<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { parseZoneFile, checkNameLengths, type NameLengthViolation } from '$lib/utils/zone-parser.js';
  import { useClipboard } from '$lib/composables';

  let zoneInput = $state('');
  let results = $state<{
    violations: NameLengthViolation[];
    totalNames: number;
    validNames: number;
  } | null>(null);
  const clipboard = useClipboard();
  let activeExampleIndex = $state<number | null>(null);

  const examples = [
    {
      name: 'Valid Names',
      content: `example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
www.example.com.	IN	A	192.0.2.1
mail.example.com.	IN	A	192.0.2.10
blog.example.com.	IN	CNAME	www.example.com.`,
      description: 'Zone with all names within DNS limits',
    },
    {
      name: 'Long Labels',
      content: `example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
this-is-a-very-long-subdomain-name-that-exceeds-the-sixty-three-character-label-limit.example.com.	IN	A	192.0.2.1
another-extremely-long-label-name-that-is-definitely-over-the-limit.example.com.	IN	A	192.0.2.2`,
      description: 'Zone with labels exceeding 63-character limit',
    },
    {
      name: 'Very Long FQDN',
      content: `example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
this.is.a.very.deep.subdomain.structure.with.many.labels.that.together.create.a.fully.qualified.domain.name.that.might.exceed.the.maximum.allowed.length.of.two.hundred.fifty.five.characters.which.could.cause.issues.in.dns.resolution.and.should.be.avoided.example.com.	IN	A	192.0.2.1`,
      description: 'Zone with FQDN exceeding 255-character limit',
    },
    {
      name: 'Mixed Issues',
      content: `example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
www.example.com.	IN	A	192.0.2.1
this-label-is-exactly-sixty-three-characters-long-and-should-be-valid-ok.example.com.	IN	A	192.0.2.2
this-label-is-definitely-over-sixty-three-characters-and-will-cause-a-violation.example.com.	IN	A	192.0.2.3
very.deep.nested.subdomain.with.lots.of.labels.creating.a.domain.name.that.is.extremely.long.and.definitely.over.the.limit.of.two.hundred.fifty.five.characters.which.makes.it.invalid.according.to.dns.specifications.example.com.	IN	CNAME	www.example.com.`,
      description: 'Mix of valid names and various violations',
    },
  ];

  function loadExample(example: (typeof examples)[0], index: number) {
    zoneInput = example.content;
    activeExampleIndex = index;
    checkNames();
  }

  function clearActiveIfChanged() {
    if (activeExampleIndex !== null) {
      const activeExample = examples[activeExampleIndex];
      if (!activeExample || zoneInput !== activeExample.content) {
        activeExampleIndex = null;
      }
    }
  }

  function checkNames() {
    if (!zoneInput.trim()) {
      results = null;
      return;
    }

    try {
      const parsed = parseZoneFile(zoneInput);
      const violations = checkNameLengths(parsed);

      // Count unique names
      const uniqueNames = new Set(parsed.records.map((r) => r.owner));

      results = {
        violations,
        totalNames: uniqueNames.size,
        validNames: uniqueNames.size - new Set(violations.map((v) => v.name)).size,
      };
    } catch (error) {
      console.error('Failed to check names:', error);
      results = null;
    }
  }

  function copyResults() {
    if (!results) return;
    const reportText = formatReportForCopy(results);
    clipboard.copy(reportText);
  }

  function formatReportForCopy(data: typeof results): string {
    if (!data) return '';

    const lines: string[] = [];

    lines.push(`DNS Name Length Validation Report`);
    lines.push(`===============================\n`);

    lines.push(`Total Names Checked: ${data.totalNames}`);
    lines.push(`Valid Names: ${data.validNames}`);
    lines.push(`Names with Violations: ${data.violations.length}\n`);

    if (data.violations.length > 0) {
      lines.push(`Violations Found:`);
      lines.push(`-----------------`);

      const labelViolations = data.violations.filter((v) => v.type === 'label');
      const fqdnViolations = data.violations.filter((v) => v.type === 'fqdn');

      if (labelViolations.length > 0) {
        lines.push(`\nLabel Length Violations (${labelViolations.length}):`);
        for (const violation of labelViolations) {
          lines.push(`  ${violation.name} - ${violation.length} characters (limit: ${violation.limit})`);
        }
      }

      if (fqdnViolations.length > 0) {
        lines.push(`\nFQDN Length Violations (${fqdnViolations.length}):`);
        for (const violation of fqdnViolations) {
          lines.push(`  ${violation.name} - ${violation.length} characters (limit: ${violation.limit})`);
        }
      }
    } else {
      lines.push(`All names are within DNS length limits! ✓`);
    }

    return lines.join('\n');
  }

  function handleInputChange() {
    clearActiveIfChanged();
    checkNames();
  }

  function getViolationSeverity(violation: NameLengthViolation): string {
    const excess = violation.length - violation.limit;
    if (excess > 50) return 'severe';
    if (excess > 20) return 'high';
    if (excess > 10) return 'medium';
    return 'low';
  }

  function getViolationColor(violation: NameLengthViolation): string {
    const severity = getViolationSeverity(violation);
    switch (severity) {
      case 'severe':
        return 'var(--color-error)';
      case 'high':
        return 'var(--color-error)';
      case 'medium':
        return 'var(--color-warning)';
      case 'low':
        return 'var(--color-warning)';
      default:
        return 'var(--color-warning)';
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DNS Name Length Checker</h1>
    <p>Validate DNS names against RFC length limits: 63 bytes per label, 255 bytes per FQDN</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="ruler" size="sm" />
        <div>
          <strong>Label Limits:</strong> Each DNS label must be 63 characters or fewer.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="maximize" size="sm" />
        <div>
          <strong>FQDN Limits:</strong> Complete domain names must be 255 characters or fewer.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="alert-triangle" size="sm" />
        <div>
          <strong>Compliance:</strong> Exceeding limits causes DNS resolution failures.
        </div>
      </div>
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Name Length Examples</h3>
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
    <div class="input-group">
      <label
        for="zone-input"
        use:tooltip={'Paste DNS zone file content to validate all domain names against length limits'}
      >
        <Icon name="file" size="sm" />
        Zone File Content
      </label>
      <textarea
        id="zone-input"
        bind:value={zoneInput}
        oninput={handleInputChange}
        placeholder="example.com.	IN	SOA	ns1.example.com. admin.example.com. 2023010101 3600 1800 1209600 86400
www.example.com.	IN	A	192.0.2.1
very-long-subdomain-name.example.com.	IN	A	192.0.2.2"
        class="zone-textarea"
        rows="10"
      ></textarea>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <section class="results-section">
      <div class="results-header">
        <h3>Name Length Validation Results</h3>
        <button class="copy-button {clipboard.isCopied() ? 'copied' : ''}" onclick={copyResults}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
          {clipboard.isCopied() ? 'Copied!' : 'Copy Report'}
        </button>
      </div>

      <div class="results-inner">
        <!-- Summary Stats -->
        <div class="summary-card">
          <div class="summary-stats">
            <div class="stat-item total">
              <div class="stat-icon">
                <Icon name="hash" size="lg" />
              </div>
              <div class="stat-info">
                <div class="stat-value">{results.totalNames}</div>
                <div class="stat-label">Total Names</div>
              </div>
            </div>

            <div class="stat-item valid">
              <div class="stat-icon">
                <Icon name="check-circle" size="lg" />
              </div>
              <div class="stat-info">
                <div class="stat-value">{results.validNames}</div>
                <div class="stat-label">Valid Names</div>
              </div>
            </div>

            <div class="stat-item violations">
              <div class="stat-icon">
                <Icon name="alert-triangle" size="lg" />
              </div>
              <div class="stat-info">
                <div class="stat-value">{results.violations.length}</div>
                <div class="stat-label">Violations</div>
              </div>
            </div>

            <div class="stat-item compliance">
              <div class="stat-icon">
                <Icon name={results.violations.length === 0 ? 'shield-check' : 'shield-alert'} size="lg" />
              </div>
              <div class="stat-info">
                <div class="stat-value">
                  {results.violations.length === 0
                    ? '100%'
                    : `${((results.validNames / results.totalNames) * 100).toFixed(1)}%`}
                </div>
                <div class="stat-label">Compliance</div>
              </div>
            </div>
          </div>
        </div>

        {#if results.violations.length === 0}
          <!-- Success State -->
          <div class="success-card">
            <div class="success-content">
              <Icon name="check-circle" size="lg" />
              <div class="success-message">
                <h4>All Names Valid!</h4>
                <p>All {results.totalNames} domain names in your zone comply with DNS length limits.</p>
              </div>
            </div>
          </div>
        {:else}
          <!-- Violations List -->
          <div class="violations-section">
            <h4>Length Limit Violations</h4>

            <!-- Label Violations -->
            {#if results.violations.filter((v) => v.type === 'label').length > 0}
              <div class="violation-category">
                <h5>
                  <Icon name="tag" size="sm" />
                  Label Length Violations ({results.violations.filter((v) => v.type === 'label').length})
                </h5>
                <div class="violations-list">
                  {#each results.violations.filter((v) => v.type === 'label') as violation (violation.name)}
                    <div class="violation-item" style="border-left-color: {getViolationColor(violation)}">
                      <div class="violation-header">
                        <div class="violation-name">{violation.name}</div>
                        <div class="violation-stats">
                          <span class="violation-length" style="color: {getViolationColor(violation)}">
                            {violation.length} chars
                          </span>
                          <span class="violation-limit">
                            (limit: {violation.limit})
                          </span>
                          <span class="violation-excess">
                            +{violation.length - violation.limit} over
                          </span>
                        </div>
                      </div>
                      {#if violation.labels}
                        <div class="violation-labels">
                          <strong>Labels:</strong>
                          {#each violation.labels as label, index (label)}
                            <span class="label-item {label.length > 63 ? 'invalid' : 'valid'}">
                              {label} <span class="label-length">({label.length})</span>
                            </span>
                            {#if index < violation.labels.length - 1}•{/if}
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- FQDN Violations -->
            {#if results.violations.filter((v) => v.type === 'fqdn').length > 0}
              <div class="violation-category">
                <h5>
                  <Icon name="globe" size="sm" />
                  FQDN Length Violations ({results.violations.filter((v) => v.type === 'fqdn').length})
                </h5>
                <div class="violations-list">
                  {#each results.violations.filter((v) => v.type === 'fqdn') as violation (violation.name)}
                    <div class="violation-item" style="border-left-color: {getViolationColor(violation)}">
                      <div class="violation-header">
                        <div class="violation-name">{violation.name}</div>
                        <div class="violation-stats">
                          <span class="violation-length" style="color: {getViolationColor(violation)}">
                            {violation.length} chars
                          </span>
                          <span class="violation-limit">
                            (limit: {violation.limit})
                          </span>
                          <span class="violation-excess">
                            +{violation.length - violation.limit} over
                          </span>
                        </div>
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
        <h4>DNS Name Limits</h4>
        <p>
          DNS names have strict length limits defined by RFC specifications. Each label (part between dots) must be 63
          octets or less, and the complete FQDN must not exceed 255 octets including the length encoding.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Impact of Violations</h4>
        <p>
          Names exceeding these limits will cause DNS resolution failures. Some resolvers may truncate names, while
          others will reject them entirely. This can break applications and services relying on these names.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Common Causes</h4>
        <p>
          Long names often result from deep subdomain structures, verbose naming conventions, or automated name
          generation. Consider shorter alternatives or restructuring your DNS hierarchy to stay within limits.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Best Practices</h4>
        <p>
          Use concise, descriptive names. Avoid unnecessary subdomains and overly verbose labels. Regularly validate
          zone files during development. Consider using aliases or redirects for shorter public-facing names.
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
    background: var(--bg-tertiary);

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
    background: var(--bg-tertiary);
    margin-bottom: var(--spacing-xl);
  }

  .input-group {
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
    min-height: 250px;
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
    margin-bottom: var(--spacing-lg);

    h3 {
      margin: 0;
      color: var(--text-primary);
    }
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
    gap: var(--spacing-lg);
  }

  .summary-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);

    &.total {
      background-color: color-mix(in srgb, var(--color-primary), transparent 95%);
      border: 1px solid var(--color-primary);
    }

    &.valid {
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
      border: 1px solid var(--color-success);
    }

    &.violations {
      background-color: color-mix(in srgb, var(--color-error), transparent 90%);
      border: 1px solid var(--color-error);
    }

    &.compliance {
      background-color: color-mix(in srgb, var(--color-info), transparent 90%);
      border: 1px solid var(--color-info);
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background-color: var(--bg-tertiary);
    }

    .stat-info {
      flex: 1;

      .stat-value {
        font-size: var(--font-size-xl);
        font-weight: 700;
        font-family: var(--font-mono);
        line-height: 1;
        margin-bottom: var(--spacing-xs);
      }

      .stat-label {
        font-size: var(--font-size-sm);
        opacity: 0.8;
      }
    }

    &.total {
      .stat-icon {
        color: var(--color-primary);
      }

      .stat-value,
      .stat-label {
        color: var(--color-primary);
      }
    }

    &.valid {
      .stat-icon {
        color: var(--color-success);
      }

      .stat-value,
      .stat-label {
        color: var(--color-success);
      }
    }

    &.violations {
      .stat-icon {
        color: var(--color-error);
      }

      .stat-value,
      .stat-label {
        color: var(--color-error);
      }
    }

    &.compliance {
      .stat-icon {
        color: var(--color-info);
      }

      .stat-value,
      .stat-label {
        color: var(--color-info);
      }
    }
  }

  .success-card {
    background-color: color-mix(in srgb, var(--color-success), transparent 90%);
    border: 1px solid var(--color-success);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    text-align: center;
  }

  .success-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    color: var(--color-success);

    .success-message {
      h4 {
        margin: 0 0 var(--spacing-sm);
        color: var(--color-success);
        font-size: var(--font-size-lg);
      }

      p {
        margin: 0;
        color: var(--color-success);
        opacity: 0.8;
      }
    }
  }

  .violations-section {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);

    h4 {
      margin-top: 0;
      margin-bottom: var(--spacing-lg);
      color: var(--color-error);
      font-size: var(--font-size-md);
    }
  }

  .violation-category {
    margin-bottom: var(--spacing-xl);

    &:last-child {
      margin-bottom: 0;
    }

    h5 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0 0 var(--spacing-md);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .violations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .violation-item {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-left: 4px solid;
    border-radius: var(--radius-sm);
  }

  .violation-header {
    display: flex;
    flex-direction: column-reverse;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-sm);
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .violation-name {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-primary);
      word-break: break-all;
      flex: 1;
    }

    .violation-stats {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: var(--font-size-sm);
      flex-shrink: 0;

      @media (max-width: 768px) {
        flex-wrap: wrap;
      }

      .violation-length {
        font-family: var(--font-mono);
        font-weight: 600;
      }

      .violation-limit {
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
      }

      .violation-excess {
        color: var(--color-error);
        font-weight: 600;
        font-size: var(--font-size-xs);
      }
    }
  }

  .violation-labels {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.6;

    strong {
      color: var(--text-primary);
    }

    .label-item {
      font-family: var(--font-mono);

      &.valid {
        color: var(--text-secondary);
      }

      &.invalid {
        color: var(--color-error);
        font-weight: 600;
      }

      .label-length {
        font-size: var(--font-size-xs);
        opacity: 0.7;
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

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
