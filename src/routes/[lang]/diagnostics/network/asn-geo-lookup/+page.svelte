<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { asnGeoContent } from '$lib/content/asn-geo';
  import '../../../../../styles/diagnostics-pages.scss';

  interface ASNGeoResponse {
    ip: string;
    asn?: number;
    asnOrg?: string;
    isp?: string;
    organization?: string;
    country?: string;
    countryCode?: string;
    region?: string;
    regionName?: string;
    city?: string;
    zip?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    mobile?: boolean;
    proxy?: boolean;
    hosting?: boolean;
    timestamp: string;
  }

  let ip = $state('8.8.8.8');
  let loading = $state(false);
  let results = $state<ASNGeoResponse | null>(null);
  let error = $state<string | null>(null);
  let copiedState = $state(false);
  let selectedExampleIndex = $state<number | null>(null);

  const examples = [
    { ip: '8.8.8.8', description: 'Google Public DNS' },
    { ip: '2.58.47.0', description: 'M247 Proton' },
    { ip: '1.1.1.1', description: 'Cloudflare DNS' },
    { ip: '140.82.121.4', description: 'GitHub' },
    { ip: '151.101.1.140', description: 'Fastly CDN' },
    { ip: '2606:4700:4700::1111', description: 'Cloudflare IPv6' },
  ];

  async function lookupIP() {
    loading = true;
    error = null;
    results = null;

    try {
      const response = await fetch('/api/internal/diagnostics/asn-geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `Lookup failed: ${response.status}`);
      }

      results = await response.json();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }

  function loadExample(example: (typeof examples)[0], index: number) {
    ip = example.ip;
    selectedExampleIndex = index;
    lookupIP();
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  async function copyResults() {
    if (!results) return;

    let text = `ASN & Geolocation Lookup for ${results.ip}\n`;
    text += `Generated at: ${results.timestamp}\n\n`;

    if (results.asn) {
      text += `ASN: AS${results.asn}\n`;
      if (results.asnOrg) text += `AS Organization: ${results.asnOrg}\n`;
    }
    if (results.isp) text += `ISP: ${results.isp}\n`;
    if (results.organization) text += `Organization: ${results.organization}\n`;

    text += `\nLocation:\n`;
    if (results.city) text += `City: ${results.city}\n`;
    if (results.regionName) text += `Region: ${results.regionName}\n`;
    if (results.country) text += `Country: ${results.country} (${results.countryCode})\n`;
    if (results.zip) text += `ZIP: ${results.zip}\n`;
    if (results.timezone) text += `Timezone: ${results.timezone}\n`;

    if (results.latitude !== undefined && results.longitude !== undefined) {
      text += `\nCoordinates: ${results.latitude}, ${results.longitude}\n`;
    }

    text += `\nConnection Type:\n`;
    text += `Mobile: ${results.mobile ? 'Yes' : 'No'}\n`;
    text += `Proxy/VPN: ${results.proxy ? 'Yes' : 'No'}\n`;
    text += `Hosting/Datacenter: ${results.hosting ? 'Yes' : 'No'}\n`;

    await navigator.clipboard.writeText(text);
    copiedState = true;
    setTimeout(() => (copiedState = false), 1500);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{asnGeoContent.title}</h1>
    <p>{asnGeoContent.description}</p>
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
            use:tooltip={`Look up ${example.ip}`}
          >
            <h5>{example.ip}</h5>
            <p>{example.description}</p>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>IP Lookup</h3>
    </div>
    <div class="card-content">
      <div class="lookup-form">
        <div class="input-row">
          <label for="ip" use:tooltip={'Enter an IPv4 or IPv6 address'}> IP Address </label>
          <input
            id="ip"
            type="text"
            bind:value={ip}
            placeholder="8.8.8.8 or 2001:4860:4860::8888"
            onchange={() => {
              clearExampleSelection();
              if (ip.trim()) lookupIP();
            }}
          />
        </div>
        <button class="lookup-btn" onclick={lookupIP} disabled={loading || !ip.trim()}>
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

  <!-- Results -->
  {#if results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>Results for {results.ip}</h3>
        <button class="copy-btn" onclick={copyResults} disabled={copiedState}>
          <Icon name={copiedState ? 'check' : 'copy'} size="xs" />
          {copiedState ? 'Copied!' : 'Copy Results'}
        </button>
      </div>
      <div class="card-content">
        <div class="results-grid">
          <!-- Network Information -->
          <div class="result-card">
            <h4>Network Information</h4>
            <div class="info-list">
              {#if results.asn}
                <div class="info-item">
                  <Icon name="hash" size="sm" />
                  <div class="info-content">
                    <span class="info-label">ASN</span>
                    <span class="info-value asn-badge">AS{results.asn}</span>
                  </div>
                </div>
              {/if}
              {#if results.asnOrg}
                <div class="info-item">
                  <Icon name="building" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Organization</span>
                    <span class="info-value">{results.asnOrg}</span>
                  </div>
                </div>
              {/if}
              {#if results.isp}
                <div class="info-item">
                  <Icon name="wifi" size="sm" />
                  <div class="info-content">
                    <span class="info-label">ISP</span>
                    <span class="info-value">{results.isp}</span>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Geographic Location -->
          <div class="result-card">
            <h4>Geographic Location</h4>
            <div class="info-list">
              {#if results.country}
                <div class="info-item">
                  <Icon name="flag" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Country</span>
                    <span class="info-value">{results.country} ({results.countryCode})</span>
                  </div>
                </div>
              {/if}
              {#if results.regionName}
                <div class="info-item">
                  <Icon name="map-pin" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Region</span>
                    <span class="info-value">{results.regionName}</span>
                  </div>
                </div>
              {/if}
              {#if results.city}
                <div class="info-item">
                  <Icon name="building" size="sm" />
                  <div class="info-content">
                    <span class="info-label">City</span>
                    <span class="info-value">{results.city}</span>
                  </div>
                </div>
              {/if}
              {#if results.timezone}
                <div class="info-item">
                  <Icon name="clock" size="sm" />
                  <div class="info-content">
                    <span class="info-label">Timezone</span>
                    <span class="info-value">{results.timezone}</span>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Coordinates -->
          {#if results.latitude !== undefined && results.longitude !== undefined}
            <div class="result-card">
              <h4>Coordinates</h4>
              <div class="coordinates-display">
                <div class="coordinate-info">
                  <div class="coordinate-item">
                    <Icon name="navigation" size="md" />
                    <div class="coordinate-values">
                      <div class="coordinate-row">
                        <span class="coordinate-label">Latitude:</span>
                        <span class="coordinate-value">{results.latitude.toFixed(4)}°</span>
                      </div>
                      <div class="coordinate-row">
                        <span class="coordinate-label">Longitude:</span>
                        <span class="coordinate-value">{results.longitude.toFixed(4)}°</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${results.latitude}&mlon=${results.longitude}&zoom=12`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="map-link"
                  >
                    <Icon name="external-link" size="xs" />
                    View full map
                  </a>
                </div>
                <div class="map-container">
                  <iframe
                    title="Location map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${results.longitude - 0.1},${results.latitude - 0.1},${results.longitude + 0.1},${results.latitude + 0.1}&layer=mapnik&marker=${results.latitude},${results.longitude}`}
                    style="border: 0"
                  ></iframe>
                </div>
              </div>
            </div>
          {/if}

          <!-- Connection Type -->
          <div class="result-card">
            <h4>Connection Type</h4>
            <div class="connection-flags">
              <div class="flag-item" class:active={results.mobile}>
                <Icon name={results.mobile ? 'check-circle' : 'circle'} size="sm" />
                <span>Mobile Network</span>
              </div>
              <div class="flag-item" class:active={results.proxy}>
                <Icon name={results.proxy ? 'check-circle' : 'circle'} size="sm" />
                <span>Proxy/VPN</span>
              </div>
              <div class="flag-item" class:active={results.hosting}>
                <Icon name={results.hosting ? 'check-circle' : 'circle'} size="sm" />
                <span>Hosting/Datacenter</span>
              </div>
            </div>
          </div>
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
            <strong>Lookup Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>About ASN & Geolocation</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{asnGeoContent.sections.whatIsGeoIP.title}</h4>
          <p>{asnGeoContent.sections.whatIsGeoIP.content}</p>
        </div>

        <div class="info-section">
          <h4>{asnGeoContent.sections.accuracy.title}</h4>
          <ul>
            {#each asnGeoContent.sections.accuracy.levels as level (level.level)}
              <li>
                <strong>{level.level} ({level.accuracy}):</strong>
                {level.description}
              </li>
            {/each}
          </ul>
        </div>

        <div class="info-section">
          <h4>{asnGeoContent.sections.asnExplained.title}</h4>
          <p>{asnGeoContent.sections.asnExplained.content}</p>
        </div>

        <div class="info-section">
          <h4>{asnGeoContent.sections.dataSource.title}</h4>
          <p>{asnGeoContent.sections.dataSource.content}</p>
        </div>
      </div>

      <div class="quick-tips">
        <h4>Quick Tips</h4>
        <ul>
          {#each asnGeoContent.quickTips as tip, idx (idx)}
            <li>{tip}</li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .lookup-form {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-end;

    label {
      display: block;
      margin-bottom: var(--spacing-sm);
      color: var(--text-primary);
      font-weight: 500;
    }

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .input-row {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;

    input {
      width: 100%;
    }
  }

  .lookup-btn {
    flex-shrink: 0;
    white-space: nowrap;
    @media (max-width: 768px) {
      width: 100%;
    }
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-lg);

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

  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .info-item {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .info-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .info-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-weight: 500;
  }

  .asn-badge {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--color-primary);
  }

  .coordinates-display {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-start;

    @media (max-width: 768px) {
      flex-direction: column;
    }
  }

  .coordinate-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    flex: 1;
  }

  .coordinate-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .coordinate-values {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .coordinate-row {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-md);
    font-size: var(--font-size-sm);
  }

  .coordinate-label {
    color: var(--text-secondary);
  }

  .coordinate-value {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  .map-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-primary);
    text-decoration: none;
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    transition: all 0.2s;

    &:hover {
      background: color-mix(in srgb, var(--color-primary), transparent 90%);
    }
  }

  .map-container {
    flex: 1;
    min-width: 200px;
    height: 150px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--border-color);

    iframe {
      width: 100%;
      height: 100%;
    }

    @media (max-width: 768px) {
      width: 100%;
      height: 200px;
    }
  }

  .connection-flags {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .flag-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    transition: all 0.2s;

    &.active {
      color: var(--color-success);
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 95%);
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
