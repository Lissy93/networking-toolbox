<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { parseZoneFile, generateZoneStats, type ZoneStats } from '$lib/utils/zone-parser.js';
  import { useClipboard } from '$lib/composables';

  let zoneInput = $state('');
  let results = $state<ZoneStats | null>(null);
  const clipboard = useClipboard();
  let activeExampleIndex = $state<number | null>(null);

  const examples = [
    {
      name: 'Simple Zone',
      content: `$ORIGIN example.com.
$TTL 86400
@	IN	SOA	ns1.example.com. admin.example.com. (
		2023010101	; Serial
		10800		; Refresh
		3600		; Retry
		604800		; Expire
		86400 )		; Minimum TTL

	IN	NS	ns1.example.com.
	IN	NS	ns2.example.com.
	IN	MX	10	mail.example.com.

www	300	IN	A	192.0.2.1
mail	IN	A	192.0.2.10
ftp	IN	CNAME	www.example.com.`,
      description: 'Basic zone with common record types',
    },
    {
      name: 'Complex Zone',
      content: `$ORIGIN example.com.
$TTL 3600
@	IN	SOA	ns1.example.com. hostmaster.example.com. 2023010101 10800 3600 604800 86400
	IN	NS	ns1.example.com.
	IN	NS	ns2.example.com.
	IN	NS	ns3.example.com.
	IN	MX	10	mail.example.com.
	IN	TXT	"v=spf1 mx include:_spf.google.com ~all"

www	300	IN	A	192.0.2.1
www	300	IN	AAAA	2001:db8::1
api	300	IN	A	192.0.2.2
cdn	300	IN	A	203.0.113.1
mail	3600	IN	A	192.0.2.10
mail	3600	IN	AAAA	2001:db8::10

_http._tcp	IN	SRV	0 5 80 www.example.com.
_https._tcp	IN	SRV	0 5 443 www.example.com.
_sip._tcp	IN	SRV	10 60 5060 sip.example.com.

blog	IN	CNAME	www.example.com.
shop	IN	CNAME	www.example.com.`,
      description: 'Comprehensive zone with diverse record types and TTLs',
    },
    {
      name: 'Large Organization',
      content: `$ORIGIN bigcorp.com.
$TTL 7200

@	IN	SOA	dns1.bigcorp.com. hostmaster.bigcorp.com. (
		2023010201 21600 3600 1209600 86400 )

; Name servers
	IN	NS	dns1.bigcorp.com.
	IN	NS	dns2.bigcorp.com.
	IN	NS	dns3.bigcorp.com.
	IN	NS	dns4.bigcorp.com.

; Mail servers
	IN	MX	10	mx1.bigcorp.com.
	IN	MX	20	mx2.bigcorp.com.
	IN	MX	30	mx-backup.bigcorp.com.

; Web services
www	300	IN	A	203.0.113.10
www	300	IN	A	203.0.113.11
www	300	IN	A	203.0.113.12
app	300	IN	A	203.0.113.20
api	300	IN	A	203.0.113.30
cdn	60	IN	A	203.0.113.40

; Mail infrastructure
mx1	IN	A	203.0.113.100
mx2	IN	A	203.0.113.101
mx-backup	IN	A	203.0.113.102

; DNS infrastructure
dns1	IN	A	203.0.113.110
dns2	IN	A	203.0.113.111
dns3	IN	A	203.0.113.112
dns4	IN	A	203.0.113.113

; Regional offices
london	IN	A	203.0.113.200
tokyo	IN	A	203.0.113.201
sydney	IN	A	203.0.113.202`,
      description: 'Large organization with multiple services and locations',
    },
  ];

  function loadExample(example: (typeof examples)[0], index: number) {
    zoneInput = example.content;
    activeExampleIndex = index;
    analyzeZone();
  }

  function clearActiveIfChanged() {
    if (activeExampleIndex !== null) {
      const activeExample = examples[activeExampleIndex];
      if (!activeExample || zoneInput !== activeExample.content) {
        activeExampleIndex = null;
      }
    }
  }

  function analyzeZone() {
    if (!zoneInput.trim()) {
      results = null;
      return;
    }

    try {
      const parsed = parseZoneFile(zoneInput);
      results = generateZoneStats(parsed);
    } catch (error) {
      console.error('Failed to analyze zone:', error);
      results = null;
    }
  }

  function formatStatsForCopy(stats: ZoneStats): string {
    const lines: string[] = [];

    lines.push(`DNS Zone Statistics Report`);
    lines.push(`========================\n`);

    lines.push(`Total Records: ${stats.totalRecords}\n`);

    lines.push(`Records by Type:`);
    Object.entries(stats.recordsByType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        lines.push(`  ${type}: ${count}`);
      });
    lines.push('');

    lines.push(`TTL Distribution:`);
    Object.entries(stats.ttlDistribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([ttl, count]) => {
        lines.push(`  ${ttl}s: ${count} record${count !== 1 ? 's' : ''}`);
      });
    lines.push('');

    lines.push(`Name Statistics:`);
    lines.push(`  Shortest name: ${stats.nameDepths.min} characters`);
    lines.push(`  Longest name: ${stats.nameDepths.max} characters`);
    lines.push(`  Average length: ${stats.nameDepths.average.toFixed(1)} characters`);
    lines.push('');

    lines.push(`Largest Record: ${stats.largestRecord.size} bytes`);
    lines.push(`  ${stats.largestRecord.record.owner} ${stats.largestRecord.record.type}`);
    lines.push('');

    lines.push(`Zone Health:`);
    lines.push(`  Has SOA: ${stats.sanityChecks.hasSoa ? 'Yes' : 'No'}`);
    lines.push(`  Has NS records: ${stats.sanityChecks.hasNs ? 'Yes' : 'No'}`);
    lines.push(`  Duplicate records: ${stats.sanityChecks.duplicates.length}`);
    lines.push(`  Orphaned glue: ${stats.sanityChecks.orphanedGlue.length}`);

    return lines.join('\n');
  }

  function handleInputChange() {
    clearActiveIfChanged();
    analyzeZone();
  }

  function getTTLColor(ttl: number): string {
    if (ttl < 300) return 'var(--color-error)';
    if (ttl < 3600) return 'var(--color-warning)';
    if (ttl < 86400) return 'var(--color-success)';
    return 'var(--color-info)';
  }

  function getTTLLabel(ttl: number): string {
    if (ttl < 300) return 'Very Short';
    if (ttl < 3600) return 'Short';
    if (ttl < 86400) return 'Medium';
    return 'Long';
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DNS Zone Statistics</h1>
    <p>Analyze zone file structure, record distribution, and configuration health</p>
  </header>

  <!-- Educational Overview -->
  <div class="card info-card">
    <div class="overview-content">
      <div class="overview-item">
        <Icon name="bar-chart" size="sm" />
        <div>
          <strong>Record Analysis:</strong> Count and categorize all DNS records by type and TTL.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="ruler" size="sm" />
        <div>
          <strong>Size Metrics:</strong> Identify largest records and analyze name length distribution.
        </div>
      </div>
      <div class="overview-item">
        <Icon name="shield" size="sm" />
        <div>
          <strong>Health Checks:</strong> Validate zone structure and identify potential issues.
        </div>
      </div>
    </div>
  </div>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="sm" />
        <h3>Zone Analysis Examples</h3>
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
      <label for="zone-input" use:tooltip={'Paste your DNS zone file for comprehensive statistical analysis'}>
        <Icon name="file" size="sm" />
        Zone File Content
      </label>
      <textarea
        id="zone-input"
        bind:value={zoneInput}
        oninput={handleInputChange}
        placeholder="$ORIGIN example.com.
$TTL 3600
@	IN	SOA	ns1.example.com. admin.example.com. (
		2023010101	; Serial
		10800		; Refresh
		3600		; Retry
		604800		; Expire
		86400 )		; Minimum TTL

	IN	NS	ns1.example.com.
	IN	NS	ns2.example.com.

www	IN	A	192.0.2.1"
        class="zone-textarea"
        rows="12"
      ></textarea>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <section class="results-section">
      <div class="results-header">
        <h3>Zone Analysis Report</h3>
        <button
          class="copy-button {clipboard.isCopied() ? 'copied' : ''}"
          onclick={() => results && clipboard.copy(formatStatsForCopy(results))}
        >
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="sm" />
          {clipboard.isCopied() ? 'Copied!' : 'Copy Report'}
        </button>
      </div>

      <div class="results-inner">
        <!-- Overview Stats -->
        <div class="overview-stats">
          <div class="stat-card primary">
            <div class="stat-icon">
              <Icon name="hash" size="lg" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{results.totalRecords}</div>
              <div class="stat-label">Total Records</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="layers" size="lg" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{Object.keys(results.recordsByType).length}</div>
              <div class="stat-label">Record Types</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="clock" size="lg" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{Object.keys(results.ttlDistribution).length}</div>
              <div class="stat-label">Unique TTLs</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="ruler" size="lg" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{results.nameDepths.average.toFixed(1)}</div>
              <div class="stat-label">Avg Name Length</div>
            </div>
          </div>
        </div>

        <!-- Record Type Distribution -->
        <div class="chart-card">
          <h4>
            <Icon name="pie" size="sm" />
            Record Type Distribution
          </h4>
          <div class="record-types-chart">
            {#each Object.entries(results.recordsByType).sort(([, a], [, b]) => b - a) as [type, count] (type)}
              <div class="type-row">
                <div class="type-info">
                  <span class="type-name">{type}</span>
                  <span class="type-count">{count} record{count !== 1 ? 's' : ''}</span>
                </div>
                <div class="type-bar-container">
                  <div class="type-bar" style="width: {(count / results.totalRecords) * 100}%"></div>
                </div>
                <div class="type-percentage">
                  {((count / results.totalRecords) * 100).toFixed(1)}%
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- TTL Distribution -->
        <div class="chart-card">
          <h4>
            <Icon name="clock" size="sm" />
            TTL Distribution
          </h4>
          <div class="ttl-distribution">
            {#each Object.entries(results.ttlDistribution).sort(([a], [b]) => parseInt(a) - parseInt(b)) as [ttl, count] (ttl)}
              <div class="ttl-row">
                <div class="ttl-info">
                  <span class="ttl-value" style="color: {getTTLColor(parseInt(ttl))}">
                    {parseInt(ttl)}s
                  </span>
                  <span class="ttl-label">({getTTLLabel(parseInt(ttl))})</span>
                </div>
                <div class="ttl-count">{count} record{count !== 1 ? 's' : ''}</div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Name Length Analysis -->
        <div class="analysis-card">
          <h4>
            <Icon name="ruler" size="sm" />
            Name Length Analysis
          </h4>
          <div class="name-stats">
            <div class="name-stat">
              <div class="name-stat-label">Shortest Name</div>
              <div class="name-stat-value">{results.nameDepths.min} chars</div>
            </div>
            <div class="name-stat">
              <div class="name-stat-label">Longest Name</div>
              <div class="name-stat-value">{results.nameDepths.max} chars</div>
              <div class="name-stat-detail">{results.longestName.name}</div>
            </div>
            <div class="name-stat">
              <div class="name-stat-label">Average Length</div>
              <div class="name-stat-value">{results.nameDepths.average.toFixed(1)} chars</div>
            </div>
          </div>
        </div>

        <!-- Largest Record -->
        <div class="analysis-card">
          <h4>
            <Icon name="maximize" size="sm" />
            Largest Record
          </h4>
          <div class="largest-record">
            <div class="record-size">{results.largestRecord.size} bytes</div>
            <div class="record-details">
              <div class="record-owner">{results.largestRecord.record.owner}</div>
              <div class="record-type-data">
                {results.largestRecord.record.type}
                {results.largestRecord.record.rdata}
              </div>
            </div>
          </div>
        </div>

        <!-- Health Checks -->
        <div class="health-card">
          <h4>
            <Icon name="shield" size="sm" />
            Zone Health Checks
          </h4>
          <div class="health-checks">
            <div class="health-check {results.sanityChecks.hasSoa ? 'pass' : 'fail'}">
              <Icon name={results.sanityChecks.hasSoa ? 'check-circle' : 'x-circle'} size="sm" />
              <span>SOA Record Present</span>
            </div>

            <div class="health-check {results.sanityChecks.hasNs ? 'pass' : 'fail'}">
              <Icon name={results.sanityChecks.hasNs ? 'check-circle' : 'x-circle'} size="sm" />
              <span>NS Records Present</span>
            </div>

            <div class="health-check {results.sanityChecks.duplicates.length === 0 ? 'pass' : 'warn'}">
              <Icon name={results.sanityChecks.duplicates.length === 0 ? 'check-circle' : 'alert-triangle'} size="sm" />
              <span>
                {results.sanityChecks.duplicates.length === 0
                  ? 'No Duplicate Records'
                  : `${results.sanityChecks.duplicates.length} Duplicate Record${results.sanityChecks.duplicates.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            <div class="health-check {results.sanityChecks.orphanedGlue.length === 0 ? 'pass' : 'warn'}">
              <Icon
                name={results.sanityChecks.orphanedGlue.length === 0 ? 'check-circle' : 'alert-triangle'}
                size="sm"
              />
              <span>
                {results.sanityChecks.orphanedGlue.length === 0
                  ? 'No Orphaned Glue Records'
                  : `${results.sanityChecks.orphanedGlue.length} Orphaned Glue Record${results.sanityChecks.orphanedGlue.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Educational Content -->
  <div class="education-card">
    <div class="education-grid">
      <div class="education-item info-panel">
        <h4>Zone Statistics</h4>
        <p>
          Zone statistics help understand DNS structure, identify optimization opportunities, and spot potential issues.
          Analyze record distribution, TTL patterns, and naming conventions for better zone management.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>TTL Strategy</h4>
        <p>
          TTL distribution reveals caching patterns. Short TTLs enable quick changes but increase DNS load. Long TTLs
          reduce queries but slow propagation. Balance based on change frequency and traffic patterns.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Record Analysis</h4>
        <p>
          Record type distribution shows zone complexity. Heavy A/AAAA records suggest web services, many MX records
          indicate mail infrastructure, and diverse types show comprehensive DNS usage.
        </p>
      </div>

      <div class="education-item info-panel">
        <h4>Health Monitoring</h4>
        <p>
          Regular zone analysis catches configuration drift, identifies duplicates, and ensures essential records exist.
          Use statistics to track zone growth and optimize DNS performance over time.
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
    min-height: 300px;
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

  .overview-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);

    &.primary {
      border-color: var(--color-primary);
      background-color: color-mix(in srgb, var(--color-primary), transparent 95%);
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background-color: var(--bg-tertiary);
      color: var(--color-primary);
    }

    .stat-info {
      flex: 1;

      .stat-value {
        font-size: var(--font-size-2xl);
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-mono);
        line-height: 1;
      }

      .stat-label {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin-top: var(--spacing-xs);
      }
    }
  }

  .chart-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: 0;
      margin-bottom: var(--spacing-lg);
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .record-types-chart {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .type-row {
    display: grid;
    grid-template-columns: 150px 1fr auto;
    gap: var(--spacing-md);
    align-items: center;
  }

  .type-info {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .type-name {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-primary);
      font-size: var(--font-size-sm);
    }

    .type-count {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }
  }

  .type-bar-container {
    height: 24px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
    position: relative;
  }

  .type-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
    border-radius: var(--radius-sm);
    min-width: 4px;
  }

  .type-percentage {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-align: right;
    min-width: 50px;
  }

  .ttl-distribution {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .ttl-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    background-color: var(--bg-tertiary);

    .ttl-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      .ttl-value {
        font-family: var(--font-mono);
        font-weight: 600;
        font-size: var(--font-size-sm);
      }

      .ttl-label {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
      }
    }

    .ttl-count {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  .analysis-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);

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

  .name-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-lg);
  }

  .name-stat {
    text-align: center;

    .name-stat-label {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xs);
    }

    .name-stat-value {
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--color-primary);
      font-family: var(--font-mono);
    }

    .name-stat-detail {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      font-family: var(--font-mono);
      margin-top: var(--spacing-xs);
      word-break: break-all;
    }
  }

  .largest-record {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);

    .record-size {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--color-warning);
      font-family: var(--font-mono);
    }

    .record-details {
      flex: 1;

      .record-owner {
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
      }

      .record-type-data {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }
    }
  }

  .health-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: 0;
      margin-bottom: var(--spacing-lg);
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .health-checks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .health-check {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);

    &.pass {
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
      color: var(--color-success);
      border: 1px solid var(--color-success);
    }

    &.warn {
      background-color: color-mix(in srgb, var(--color-warning), transparent 90%);
      color: var(--color-warning);
      border: 1px solid var(--color-warning);
    }

    &.fail {
      background-color: color-mix(in srgb, var(--color-error), transparent 90%);
      color: var(--color-error);
      border: 1px solid var(--color-error);
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

    .type-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-sm);
      text-align: center;
    }

    .largest-record {
      flex-direction: column;
      text-align: center;
    }

    .health-checks {
      grid-template-columns: 1fr;
    }

    .education-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
