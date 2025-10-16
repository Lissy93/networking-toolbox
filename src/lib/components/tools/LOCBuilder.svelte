<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { useClipboard } from '$lib/composables';

  let domain = $state('');
  let latitude = $state('37.7749');
  let longitude = $state('-122.4194');
  let altitude = $state('10');
  let size = $state('1');
  let horizontalPrecision = $state('10000');
  let verticalPrecision = $state('10');

  let locString = $state('');
  let parseMode = $state(false);
  let showExamples = $state(false);

  const clipboard = useClipboard();

  const cityExamples = [
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194, alt: 10 },
    { name: 'New York', lat: 40.7128, lng: -74.006, alt: 10 },
    { name: 'London', lat: 51.5074, lng: -0.1278, alt: 11 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503, alt: 40 },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093, alt: 58 },
  ];

  function degreesToLOC(degrees: number, isLongitude = false) {
    const hemisphere = isLongitude ? (degrees >= 0 ? 'E' : 'W') : degrees >= 0 ? 'N' : 'S';

    const absDegrees = Math.abs(degrees);
    const deg = Math.floor(absDegrees);
    const minFloat = (absDegrees - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = Math.round((minFloat - min) * 60 * 1000);

    return `${deg.toString().padStart(isLongitude ? 3 : 2, '0')} ${min.toString().padStart(2, '0')} ${sec.toString().padStart(5, '0')}.000 ${hemisphere}`;
  }

  function altitudeToLOC(altMeters: number) {
    const altCm = Math.round((altMeters + 100000) * 100);
    return altCm.toString().padStart(8, '0');
  }

  function sizeToLOC(sizeMeters: number) {
    if (sizeMeters === 0) return '00';

    let mantissa = 0;
    let exponent = 0;
    let value = sizeMeters * 100; // Convert to centimeters

    while (value >= 10) {
      value /= 10;
      exponent++;
    }

    mantissa = Math.round(value);
    if (mantissa >= 10) {
      mantissa = Math.round(mantissa / 10);
      exponent++;
    }

    return (mantissa * 16 + exponent).toString(16).padStart(2, '0');
  }

  let locRecord = $derived.by(() => {
    if (parseMode) {
      return parseLocString();
    } else {
      return generateLocRecord();
    }
  });

  function generateLocRecord() {
    if (!domain.trim()) return '';

    const latLoc = degreesToLOC(parseFloat(latitude));
    const lngLoc = degreesToLOC(parseFloat(longitude), true);
    const altLoc = altitudeToLOC(parseFloat(altitude));
    const sizeLoc = sizeToLOC(parseFloat(size));
    const hpLoc = sizeToLOC(parseFloat(horizontalPrecision));
    const vpLoc = sizeToLOC(parseFloat(verticalPrecision));

    return `${domain.trim()}. IN LOC ${latLoc} ${lngLoc} ${altLoc}m ${sizeLoc} ${hpLoc} ${vpLoc}`;
  }

  function parseLocString() {
    if (!locString.trim()) return '';
    return `Parsed: ${locString}`;
  }

  function _locToData(locRecord: string) {
    // Simplified parsing for demo
    const parts = locRecord.split(' ');
    if (parts.length < 8) return null;

    return {
      lat: 'Parsed latitude',
      lng: 'Parsed longitude',
      alt: 'Parsed altitude',
      size: 'Parsed size',
    };
  }

  let isValid = $derived.by(() => {
    if (parseMode) {
      return locString.trim() !== '';
    } else {
      return (
        domain.trim() !== '' &&
        !isNaN(parseFloat(latitude)) &&
        !isNaN(parseFloat(longitude)) &&
        !isNaN(parseFloat(altitude))
      );
    }
  });

  function copyToClipboard() {
    clipboard.copy(locRecord, 'copy');
  }

  function downloadRecord() {
    const blob = new Blob([locRecord], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain.replace(/\.$/, '') || 'loc'}-record.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('', 'download');
  }

  function loadCity(city: { name: string; lat: number; lng: number; alt: number }) {
    latitude = city.lat.toString();
    longitude = city.lng.toString();
    altitude = city.alt.toString();
    parseMode = false;
  }
</script>

<div class="container">
  <div class="card">
    <div class="card-header">
      <h1>LOC Record Builder</h1>
      <p>Convert latitude/longitude coordinates ↔ DNS LOC records for geographic positioning</p>
    </div>

    <div class="content">
      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <button class="mode-btn" class:active={!parseMode} onclick={() => (parseMode = false)}>
          <Icon name="map-pin" size="sm" />
          Coordinates → LOC
        </button>
        <button class="mode-btn" class:active={parseMode} onclick={() => (parseMode = true)}>
          <Icon name="file" size="sm" />
          LOC → Coordinates
        </button>
      </div>

      <!-- Examples -->
      <div class="examples-card">
        <details bind:open={showExamples}>
          <summary class="examples-summary">
            <Icon name="lightbulb" size="sm" />
            City Examples
            <Icon name="chevron-down" size="sm" />
          </summary>
          <div class="examples-grid">
            {#each cityExamples as city (city.name)}
              <button class="example-btn" onclick={() => loadCity(city)}>
                {city.name}
              </button>
            {/each}
          </div>
        </details>
      </div>

      <div class="main-grid">
        <!-- Input Form -->
        <div class="input-section card">
          <div class="input-group">
            <label for="domain" use:tooltip={'Domain name for the LOC record'}>Domain Name *</label>
            <input id="domain" type="text" bind:value={domain} placeholder="example.com" />
          </div>

          {#if parseMode}
            <div class="input-group">
              <label for="locString" use:tooltip={'Paste existing LOC record to parse'}>LOC Record String</label>
              <textarea
                id="locString"
                bind:value={locString}
                placeholder="example.com. IN LOC 37 46 29.000 N 122 25 10.000 W 10.00m 1m 10000m 10m"
                rows="3"
              ></textarea>
            </div>
          {:else}
            <div class="coord-grid">
              <div class="input-group">
                <label for="latitude" use:tooltip={'Latitude in decimal degrees (-90 to 90)'}>Latitude *</label>
                <input
                  id="latitude"
                  type="number"
                  bind:value={latitude}
                  step="0.000001"
                  min="-90"
                  max="90"
                  placeholder="37.7749"
                />
              </div>

              <div class="input-group">
                <label for="longitude" use:tooltip={'Longitude in decimal degrees (-180 to 180)'}>Longitude *</label>
                <input
                  id="longitude"
                  type="number"
                  bind:value={longitude}
                  step="0.000001"
                  min="-180"
                  max="180"
                  placeholder="-122.4194"
                />
              </div>
            </div>

            <div class="input-group">
              <label for="altitude" use:tooltip={'Altitude in meters above sea level'}>Altitude (m) *</label>
              <input id="altitude" type="number" bind:value={altitude} step="0.1" placeholder="10" />
            </div>

            <div class="precision-grid">
              <div class="input-group">
                <label for="size" use:tooltip={'Size/diameter of the location in meters'}>Size (m)</label>
                <input id="size" type="number" bind:value={size} step="0.1" min="0" placeholder="1" />
              </div>

              <div class="input-group">
                <label for="horizontalPrecision" use:tooltip={'Horizontal precision in meters'}>H. Precision (m)</label>
                <input
                  id="horizontalPrecision"
                  type="number"
                  bind:value={horizontalPrecision}
                  step="1"
                  min="0"
                  placeholder="10000"
                />
              </div>

              <div class="input-group">
                <label for="verticalPrecision" use:tooltip={'Vertical precision in meters'}>V. Precision (m)</label>
                <input
                  id="verticalPrecision"
                  type="number"
                  bind:value={verticalPrecision}
                  step="0.1"
                  min="0"
                  placeholder="10"
                />
              </div>
            </div>
          {/if}
        </div>

        <!-- Output -->
        <div class="output-section">
          <div class="card">
            <h3 class="section-title">
              {parseMode ? 'Parsed Coordinates' : 'Generated LOC Record'}
            </h3>
            <div class="code-block">
              {#if isValid}
                <code>{locRecord}</code>
              {:else}
                <p class="placeholder">Fill in the required fields to generate the LOC record</p>
              {/if}
            </div>
          </div>

          {#if isValid}
            <div class="actions">
              <button onclick={copyToClipboard} class="btn btn-primary" class:success={clipboard.isCopied('copy')}>
                <Icon name={clipboard.isCopied('copy') ? 'check' : 'copy'} size="sm" />
                {clipboard.isCopied('copy') ? 'Copied!' : 'Copy Record'}
              </button>
              <button onclick={downloadRecord} class="btn btn-success" class:success={clipboard.isCopied('download')}>
                <Icon name={clipboard.isCopied('download') ? 'check' : 'download'} size="sm" />
                {clipboard.isCopied('download') ? 'Downloaded!' : 'Download'}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Information Section -->
      <div class="info-section">
        <div class="card info-card">
          <h3>About LOC Records</h3>
          <p>
            LOC (Location) records store geographic location information in DNS. They specify latitude, longitude,
            altitude, and precision values, allowing applications to discover the physical location associated with a
            domain name.
          </p>
        </div>

        <div class="info-grid">
          <div class="card info-card">
            <h4>Record Format</h4>
            <ul class="format-list">
              <li><strong>Latitude/Longitude:</strong> Degrees, minutes, seconds</li>
              <li><strong>Altitude:</strong> Meters above/below sea level</li>
              <li><strong>Size:</strong> Diameter of the location sphere</li>
              <li><strong>Precision:</strong> Horizontal and vertical accuracy</li>
            </ul>
          </div>

          <div class="card info-card">
            <h4>Use Cases</h4>
            <ul class="use-case-list">
              <li>Geographic service discovery</li>
              <li>Network topology mapping</li>
              <li>Emergency services location</li>
              <li>Content delivery optimization</li>
              <li>Legal jurisdiction identification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
  }

  .card {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .mode-toggle {
    display: inline-flex;
    width: fit-content;
    background: var(--bg-tertiary);
    padding: var(--spacing-xs);
    border-radius: var(--radius-md);
    gap: var(--spacing-xs);
  }

  .mode-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .mode-btn.active {
    background: var(--color-primary);
    color: var(--bg-primary);
    box-shadow: var(--shadow-sm);
  }

  .mode-btn:not(.active):hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .examples-card {
    padding: var(--spacing-md);
  }

  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    color: var(--text-primary);
    font-weight: 600;
    font-size: var(--font-size-sm);
  }

  .examples-summary:hover {
    color: var(--color-primary);
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    margin-top: var(--spacing-md);
    gap: var(--spacing-sm);
  }

  .example-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--color-primary);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
    &:hover {
      background: var(--bg-primary);
      color: var(--color-primary);
    }
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
  }

  @media (max-width: 768px) {
    .main-grid {
      grid-template-columns: 1fr;
    }
  }

  .input-section,
  .output-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .input-group label {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .input-group input,
  .input-group textarea {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .input-group input:focus,
  .input-group textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .input-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .coord-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .precision-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin: 0 0 var(--spacing-md) 0;
  }

  .code-block {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .code-block code {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    word-break: break-all;
    white-space: pre-wrap;
  }

  .code-block .placeholder {
    color: var(--text-secondary);
    font-style: italic;
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-normal);
    text-decoration: none;
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--bg-primary);
  }

  .btn-primary:hover:not(.success) {
    background: var(--color-primary-hover);
  }

  .btn-success {
    background: var(--color-success);
    color: var(--bg-primary);
  }

  .btn-success:hover:not(.success) {
    background: var(--color-success-light);
  }

  .btn.success {
    background: var(--color-success) !important;
    transform: scale(1.05);
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
  }

  .info-card {
    padding: var(--spacing-md);
    flex-direction: column;
    align-items: normal;
    justify-content: flex-start;
  }

  .info-card h3,
  .info-card h4 {
    color: var(--text-primary);
    font-size: var(--font-size-md);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .info-card p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    line-height: 1.5;
    margin: 0;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  @media (max-width: 768px) {
    .info-grid {
      grid-template-columns: 1fr;
    }
  }

  .format-list,
  .use-case-list {
    margin: 0;
    padding: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .format-list li,
  .use-case-list li {
    position: relative;
    padding-left: var(--spacing-md);
    margin-bottom: var(--spacing-xs);
    list-style: none;
  }

  .format-list li::before,
  .use-case-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.5em;
    width: 6px;
    height: 6px;
    background: var(--color-primary);
    border-radius: 50%;
  }

  .format-list strong {
    color: var(--text-primary);
  }
</style>
