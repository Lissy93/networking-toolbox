<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { bgpContent } from '$lib/content/bgp';
  import '../../../../../styles/diagnostics-pages.scss';

  interface BGPPrefix {
    prefix: string;
    asn: number;
    holder: string;
    country?: string;
  }

  interface BGPPeer {
    asn: number;
    country?: string;
    prefix: string;
  }

  interface ASPath {
    path: number[];
    origin: number;
  }

  interface BGPLookupResponse {
    resource: string;
    prefixes: BGPPrefix[];
    asPath?: ASPath;
    peers: BGPPeer[];
    originAS?: number;
    originName?: string;
    announced: boolean;
    moreSpecifics?: string[];
    lessSpecifics?: string[];
    timestamp: string;
  }

  let resource = $state('8.8.8.8');
  let loading = $state(false);
  let results = $state<BGPLookupResponse | null>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { resource: '8.8.8.8', description: 'Google Public DNS (AS15169)' },
    { resource: '1.1.1.1', description: 'Cloudflare DNS (AS13335)' },
    { resource: '104.244.42.1', description: 'Twitter/X' },
    { resource: '140.82.121.4', description: 'GitHub (AS36459)' },
    { resource: '91.189.88.152', description: 'Canonical/Ubuntu servers' },
  ];

  async function lookupBGP() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/bgp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: resource.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `BGP lookup failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    resource = example.resource;
    selectedExampleIndex = index;
    lookupBGP();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  async function copyResults() {
    if (!results) return;

    let text = `BGP Route Lookup for ${results.resource}\n`;
    text += `Generated at: ${results.timestamp}\n\n`;

    if (results.announced) {
      text += `Status: Announced in BGP\n`;
    } else {
      text += `Status: Not announced in BGP\n`;
    }

    if (results.originAS) {
      text += `\nOrigin AS: AS${results.originAS}\n`;
      if (results.originName) {
        text += `Origin Name: ${results.originName}\n`;
      }
    }

    if (results.asPath) {
      text += `\nAS Path: ${results.asPath.path.join(' ')}\n`;
    }

    if (results.prefixes.length > 0) {
      text += `\nPrefixes (${results.prefixes.length}):\n`;
      results.prefixes.forEach((prefix) => {
        text += `  ${prefix.prefix} - AS${prefix.asn} (${prefix.holder})`;
        if (prefix.country) text += ` [${prefix.country}]`;
        text += '\n';
      });
    }

    if (results.peers.length > 0) {
      text += `\nPeers (${results.peers.length}):\n`;
      results.peers.forEach((peer) => {
        text += `  AS${peer.asn}`;
        if (peer.country) text += ` [${peer.country}]`;
        text += '\n';
      });
    }

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{bgpContent.title}</h1>
    <p>{bgpContent.description}</p>
  </header>

  <!-- Examples -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Example Lookups</h4>
      </summary>
      <div class="examples-grid">
        {#each examples as example, i (i)}
          <button
            class="example-card"
            class:selected={selectedExampleIndex === i}
            onclick={() => loadExample(example, i)}
            use:tooltip={`Look up BGP info for ${example.resource}`}
          >
            <h5>{example.resource}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>BGP Lookup</h3>
    </div>
    <div class="card-content">
      <div class="lookup-form">
        <label for="resource" use:tooltip={'Enter an IP address or prefix (e.g., 8.8.8.8 or 8.8.8.0/24)'}>
          IP Address or Prefix
        </label>
        <div class="input-row">
          <input
            id="resource"
            type="text"
            bind:value={resource}
            placeholder="8.8.8.8 or 8.8.8.0/24"
            onchange={() => {
              clearExampleSelection();
              if (resource.trim()) lookupBGP();
            }}
          />
          <button class="lookup-btn" onclick={lookupBGP} disabled={loading || !resource.trim()}>
            {#if loading}
              <Icon name="loader" size="sm" animate="spin" />
              Looking up...
            {:else}
              <Icon name="search" size="sm" />
              Lookup
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>BGP Routing Information for {results.resource}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <Icon name={copiedState ? 'check' : 'copy'} size="xs" />
          {copiedState ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <!-- Status -->
        <div class="status-overview">
          <div class="status-item {results.announced ? 'success' : 'warning'}">
            <Icon name={results.announced ? 'check-circle' : 'alert-circle'} size="md" />
            <div>
              <h4>{results.announced ? 'Announced in BGP' : 'Not Announced'}</h4>
              <p>
                {results.announced
                  ? 'This resource is actively advertised in the global BGP routing table'
                  : 'This resource is not currently visible in BGP'}
              </p>
            </div>
          </div>
        </div>

        <!-- Results Grid -->
        <div class="results-grid">
          <!-- Origin AS -->
          {#if results.originAS}
            <div class="result-card">
              <h4>Origin Autonomous System</h4>
              <div class="origin-as-content">
                <Icon name="building" size="md" />
                <div>
                  <div class="asn-badge">AS{results.originAS}</div>
                  {#if results.originName}
                    <div class="asn-name">{results.originName}</div>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          <!-- AS Path -->
          {#if results.asPath && results.asPath.path.length > 0}
            <div class="result-card">
              <h4>AS Path</h4>
              <div class="as-path-display">
                {#each results.asPath.path as asn, index (index)}
                  <span class="as-path-segment">
                    <span class="asn-label">AS{asn}</span>
                    {#if index < results.asPath.path.length - 1}
                      <Icon name="chevron-right" size="xs" />
                    {/if}
                  </span>
                {/each}
              </div>
              <div class="path-info">
                <small>Path length: {results.asPath.path.length} hops</small>
              </div>
            </div>
          {/if}

          <!-- Prefixes -->
          {#if results.prefixes.length > 0}
            <div class="result-card">
              <h4>BGP Prefixes ({results.prefixes.length})</h4>
              {#each results.prefixes as prefix, index (index)}
                <div class="prefix-content">
                  <div class="prefix-header">
                    <Icon name="map" size="sm" />
                    <span class="prefix-value">{prefix.prefix}</span>
                  </div>
                  <div class="prefix-details">
                    <div class="detail-row">
                      <span class="detail-label">ASN:</span>
                      <span class="detail-value">AS{prefix.asn}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Holder:</span>
                      <span class="detail-value">{prefix.holder}</span>
                    </div>
                    {#if prefix.country}
                      <div class="detail-row">
                        <span class="detail-label">Country:</span>
                        <span class="detail-value">{prefix.country}</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <!-- BGP Peers -->
          {#if results.peers && results.peers.length > 0}
            <div class="result-card">
              <h4>BGP Peers ({results.peers.length})</h4>
              <div class="peers-list">
                {#each results.peers.slice(0, 8) as peer, index (index)}
                  <div class="peer-badge">
                    <span class="peer-asn">AS{peer.asn}</span>
                    {#if peer.country}
                      <span class="peer-country">{peer.country}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Related Prefixes -->
          {#if (results.moreSpecifics && results.moreSpecifics.length > 0) || (results.lessSpecifics && results.lessSpecifics.length > 0)}
            <div class="result-card">
              <h4>Related Prefixes</h4>
              <div class="related-prefixes">
                {#if results.moreSpecifics && results.moreSpecifics.length > 0}
                  <div class="prefix-list">
                    <h5>More Specific ({results.moreSpecifics.length})</h5>
                    <div class="prefix-tags">
                      {#each results.moreSpecifics as prefix, index (index)}
                        <span class="prefix-tag more-specific">{prefix}</span>
                      {/each}
                    </div>
                  </div>
                {/if}
                {#if results.lessSpecifics && results.lessSpecifics.length > 0}
                  <div class="prefix-list">
                    <h5>Less Specific ({results.lessSpecifics.length})</h5>
                    <div class="prefix-tags">
                      {#each results.lessSpecifics as prefix, index (index)}
                        <span class="prefix-tag less-specific">{prefix}</span>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="card error-card">
      <div class="card-content">
        <div class="error-content">
          <Icon name="alert-triangle" size="md" />
          <div>
            <strong>BGP Lookup Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About BGP Routing</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{bgpContent.sections.whatIsBGP.title}</h4>
          <p>{bgpContent.sections.whatIsBGP.content}</p>
        </div>

        <div class="info-section">
          <h4>{bgpContent.sections.asPath.title}</h4>
          <p>{bgpContent.sections.asPath.content}</p>
          <ul>
            {#each bgpContent.sections.asPath.attributes as attr (attr.name)}
              <li><strong>{attr.name}:</strong> {attr.description}</li>
            {/each}
          </ul>
        </div>

        <div class="info-section">
          <h4>{bgpContent.sections.routeTypes.title}</h4>
          <ul>
            {#each bgpContent.sections.routeTypes.types as type (type.type)}
              <li>
                <strong>{type.type}:</strong>
                {type.description}
                <small>({type.indicator})</small>
              </li>
            {/each}
          </ul>
        </div>

        <div class="info-section">
          <h4>{bgpContent.sections.dataSource.title}</h4>
          <p>{bgpContent.sections.dataSource.content}</p>
        </div>
      </div>

      <div class="quick-tips">
        <h4>Quick Tips</h4>
        <ul>
          {#each bgpContent.quickTips as tip, idx (idx)}
            <li>{tip}</li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .lookup-form {
    label {
      display: block;
      margin-bottom: var(--spacing-sm);
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  .input-row {
    display: flex;
    gap: var(--spacing-md);
    align-items: stretch;

    input {
      flex: 1;
      min-width: 0;
    }

    .lookup-btn {
      flex-shrink: 0;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      flex-direction: column;

      input,
      .lookup-btn {
        width: 100%;
      }
    }
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 2px solid;

    &.success {
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 95%);
    }

    &.warning {
      border-color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
    }

    h4 {
      margin: 0;
      font-size: var(--font-size-md);
      color: var(--text-primary);
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-lg);
    margin-top: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .result-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);

    h4 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .origin-as-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .asn-badge {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: var(--font-size-lg);
    color: var(--color-primary);
  }

  .asn-name {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-xs);
  }

  .as-path-display {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    align-items: center;
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }

  .as-path-segment {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .asn-label {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
    background: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .path-info {
    margin-top: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .prefix-content {
    &:not(:last-child) {
      margin-bottom: var(--spacing-md);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }
  }

  .prefix-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .prefix-value {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-primary);
  }

  .prefix-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }

  .detail-label {
    color: var(--text-secondary);
  }

  .detail-value {
    color: var(--text-primary);
    font-weight: 500;
  }

  .peers-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .peer-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .peer-asn {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  .peer-country {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .related-prefixes {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .prefix-list {
    h5 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
    }
  }

  .prefix-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .prefix-tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid;

    &.more-specific {
      background: color-mix(in srgb, var(--color-info), transparent 90%);
      border-color: var(--color-info);
      color: var(--color-info);
    }

    &.less-specific {
      background: color-mix(in srgb, var(--color-secondary), transparent 90%);
      border-color: var(--color-secondary);
      color: var(--text-secondary);
    }
  }

  .quick-tips {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      li {
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
        line-height: 1.6;
      }
    }
  }

  .info-card {
    background: var(--bg-tertiary);
  }
</style>
