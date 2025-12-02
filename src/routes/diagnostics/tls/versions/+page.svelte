<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { useDiagnosticState, useClipboard, useExamples } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import '../../../../styles/diagnostics-pages.scss';

  onMount(async () => {
    await loadTranslations(get(locale), 'diagnostics');
  });

  let host = $state('google.com:443');
  let servername = $state('');
  let useCustomServername = $state(false);
  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();
  const examplesList = $derived([
    { host: 'google.com:443', description: $t('diagnostics.tls-versions.examples.google') },
    { host: 'github.com:443', description: $t('diagnostics.tls-versions.examples.github') },
    { host: 'cloudflare.com:443', description: $t('diagnostics.tls-versions.examples.cloudflare') },
    { host: 'microsoft.com:443', description: $t('diagnostics.tls-versions.examples.microsoft') },
    { host: 'amazon.com:443', description: $t('diagnostics.tls-versions.examples.amazon') },
    { host: 'facebook.com:443', description: $t('diagnostics.tls-versions.examples.facebook') },
  ]);
  const examples = useExamples(() => examplesList);

  const tlsVersions = [
    { version: 'TLSv1', name: 'TLS 1.0', deprecated: true },
    { version: 'TLSv1.1', name: 'TLS 1.1', deprecated: true },
    { version: 'TLSv1.2', name: 'TLS 1.2', deprecated: false },
    { version: 'TLSv1.3', name: 'TLS 1.3', deprecated: false },
  ];

  // Reactive validation
  const isInputValid = $derived(() => {
    const trimmedHost = host.trim();
    if (!trimmedHost) return false;
    return /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(trimmedHost);
  });

  async function probeTLSVersions() {
    diagnosticState.startOperation();

    try {
      const response = await fetch('/api/internal/diagnostics/tls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'versions',
          host: host.trim(),
          servername: useCustomServername && servername ? servername.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `TLS versions probe failed (${response.status})`);
        } catch {
          throw new Error(`TLS versions probe failed (${response.status})`);
        }
      }

      diagnosticState.setResults(await response.json());
    } catch (err: unknown) {
      diagnosticState.setError(err instanceof Error ? err.message : $t('common.unknownError'));
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    host = example.host;
    servername = '';
    useCustomServername = false;
    examples.select(index);
    probeTLSVersions();
  }

  function getVersionStatus(
    version: string,
    supported: boolean,
    deprecated: boolean,
  ): { status: string; icon: string; class: string } {
    if (!supported) {
      return { status: $t('diagnostics.tls-versions.results.versions.notSupported'), icon: 'x-circle', class: 'error' };
    }
    if (deprecated) {
      return {
        status: $t('diagnostics.tls-versions.results.versions.supportedDeprecated'),
        icon: 'alert-triangle',
        class: 'warning',
      };
    }
    return {
      status: $t('diagnostics.tls-versions.results.versions.supported'),
      icon: 'check-circle',
      class: 'success',
    };
  }

  function getOverallSecurity(): { level: string; class: string; icon: string; description: string } {
    if (!diagnosticState.results)
      return {
        level: $t('diagnostics.tls-versions.results.security.levels.unknown'),
        class: 'secondary',
        icon: 'help-circle',
        description: $t('diagnostics.tls-versions.results.security.descriptions.unknown'),
      };

    const supportedVersions = diagnosticState.results.supportedVersions || [];
    const hasDeprecated = supportedVersions.some((v: string) => v === 'TLSv1' || v === 'TLSv1.1');
    const hasModern = supportedVersions.includes('TLSv1.3');
    const hasSecure = supportedVersions.includes('TLSv1.2');

    if (hasModern && hasSecure && !hasDeprecated) {
      return {
        level: $t('diagnostics.tls-versions.results.security.levels.excellent'),
        class: 'success',
        icon: 'shield-check',
        description: $t('diagnostics.tls-versions.results.security.descriptions.excellent'),
      };
    }
    if (hasSecure && !hasDeprecated) {
      return {
        level: $t('diagnostics.tls-versions.results.security.levels.good'),
        class: 'success',
        icon: 'shield',
        description: $t('diagnostics.tls-versions.results.security.descriptions.good'),
      };
    }
    if (hasDeprecated && hasSecure) {
      return {
        level: $t('diagnostics.tls-versions.results.security.levels.warning'),
        class: 'warning',
        icon: 'shield-alert',
        description: $t('diagnostics.tls-versions.results.security.descriptions.warning'),
      };
    }
    if (supportedVersions.length === 0) {
      return {
        level: $t('diagnostics.tls-versions.results.security.levels.critical'),
        class: 'error',
        icon: 'shield-off',
        description: $t('diagnostics.tls-versions.results.security.descriptions.critical'),
      };
    }
    return {
      level: $t('diagnostics.tls-versions.results.security.levels.poor'),
      class: 'error',
      icon: 'shield-x',
      description: $t('diagnostics.tls-versions.results.security.descriptions.poor'),
    };
  }

  async function copyVersionsInfo() {
    if (!diagnosticState.results) return;

    let text = `TLS Versions Analysis for ${host}\n`;
    text += `Generated at: ${new Date().toISOString()}\n\n`;
    text += `Supported Versions (${diagnosticState.results.totalSupported}):\n`;

    tlsVersions.forEach((tlsVer) => {
      const supported = diagnosticState.results.supported[tlsVer.version];
      text += `  ${tlsVer.name} (${tlsVer.version}): ${supported ? $t('diagnostics.tls-versions.results.versions.supported') : $t('diagnostics.tls-versions.results.versions.notSupported')}`;
      if (supported && tlsVer.deprecated) {
        text += ' (DEPRECATED)';
      }
      text += '\n';
    });

    const security = getOverallSecurity();
    text += `\nSecurity Level: ${security.level}\n`;
    text += `Description: ${security.description}\n`;

    if (diagnosticState.results.minVersion || diagnosticState.results.maxVersion) {
      text += `\nVersion Range:\n`;
      text += `  Minimum: ${diagnosticState.results.minVersion || 'Unknown'}\n`;
      text += `  Maximum: ${diagnosticState.results.maxVersion || 'Unknown'}\n`;
    }

    clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>{$t('diagnostics.tls-versions.title')}</h1>
    <p>
      {$t('diagnostics.tls-versions.description')}
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    title={$t('diagnostics.tls-versions.examples.title')}
    getLabel={(ex) => ex.host}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Probe TLS versions for ${ex.host} (${ex.description})`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics.tls-versions.form.title')}</h3>
    </div>
    <div class="card-content">
      <div class="form-row">
        <div class="form-group">
          <label for="host">
            {$t('diagnostics.tls-versions.form.host.label')}
            <input
              id="host"
              type="text"
              bind:value={host}
              placeholder={$t('diagnostics.tls-versions.form.host.placeholder')}
              class:invalid={host && !isInputValid}
              onchange={() => {
                examples.clear();
                if (isInputValid()) probeTLSVersions();
              }}
            />
            {#if host && !isInputValid}
              <span class="error-text">{$t('diagnostics.tls-versions.form.host.error')}</span>
            {/if}
          </label>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="checkbox-group">
            <input
              type="checkbox"
              bind:checked={useCustomServername}
              onchange={() => {
                examples.clear();
                if (isInputValid()) probeTLSVersions();
              }}
            />
            {$t('diagnostics.tls-versions.form.servername.checkbox')}
          </label>
          {#if useCustomServername}
            <input
              type="text"
              bind:value={servername}
              placeholder={$t('diagnostics.tls-versions.form.servername.placeholder')}
              onchange={() => {
                examples.clear();
                if (isInputValid()) probeTLSVersions();
              }}
            />
          {/if}
        </div>
      </div>

      <div class="action-section">
        <button class="lookup-btn" onclick={probeTLSVersions} disabled={diagnosticState.loading || !isInputValid}>
          {#if diagnosticState.loading}
            <Icon name="loader" size="sm" animate="spin" />
            {$t('diagnostics.tls-versions.form.probing')}
          {:else}
            <Icon name="search" size="sm" />
            {$t('diagnostics.tls-versions.form.probe')}
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if diagnosticState.results}
    <div class="card results-card">
      <div class="card-header row">
        <h3>{$t('diagnostics.tls-versions.results.title')}</h3>
        <button class="copy-btn" onclick={copyVersionsInfo} disabled={clipboard.isCopied()}>
          <Icon name={clipboard.isCopied() ? 'check' : 'copy'} size="xs" />
          {clipboard.isCopied() ? $t('common.copied') : $t('common.copyResults')}
        </button>
      </div>
      <div class="card-content">
        <!-- Security Overview -->
        {#if diagnosticState.results.supported}
          {@const security = getOverallSecurity()}

          <div class="security-overview">
            <div class="status-overview">
              <div class="status-item {security.class}">
                <Icon name={security.icon} size="sm" />
                <div>
                  <span class="status-title">Security Level: {security.level}</span>
                  <p class="status-desc">{security.description}</p>
                </div>
              </div>
              <div class="status-item success">
                <Icon name="check-square" size="sm" />
                <div>
                  <span class="status-title"
                    >{diagnosticState.results.totalSupported}
                    {$t('diagnostics.tls-versions.results.versions.title')}</span
                  >
                  <p class="status-desc">
                    {$t('diagnostics.tls-versions.results.summary.outOfTested', { count: tlsVersions.length })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Version Details -->
          <div class="versions-section">
            <h4>{$t('diagnostics.tls-versions.results.versions.title')}</h4>
            <div class="versions-grid">
              {#each tlsVersions as tlsVer (tlsVer.version)}
                {@const supported = diagnosticState.results.supported[tlsVer.version]}
                {@const status = getVersionStatus(tlsVer.version, supported, tlsVer.deprecated)}

                <div class="version-item {status.class}">
                  <div class="version-header">
                    <div class="version-info">
                      <Icon name={status.icon} size="sm" />
                      <div>
                        <span class="version-name">{tlsVer.name}</span>
                        <span class="version-code mono">({tlsVer.version})</span>
                      </div>
                    </div>
                    <span class="version-status">{status.status}</span>
                  </div>

                  {#if !supported && diagnosticState.results.errors[tlsVer.version]}
                    <div class="version-error">
                      <span class="error-detail">{diagnosticState.results.errors[tlsVer.version]}</span>
                    </div>
                  {/if}

                  {#if tlsVer.deprecated}
                    <div class="version-warning">
                      <Icon name="alert-triangle" size="xs" />
                      <span>{$t('diagnostics.tls-versions.warnings.deprecated')}</span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <!-- Version Range Summary -->
          {#if diagnosticState.results.minVersion || diagnosticState.results.maxVersion}
            <div class="range-section">
              <h4>{$t('diagnostics.tls-versions.results.summary.title')}</h4>
              <div class="range-info">
                <div class="range-item">
                  <span class="range-label">{$t('diagnostics.tls-versions.results.summary.minVersion')}:</span>
                  <span class="range-value mono">{diagnosticState.results.minVersion || 'Unknown'}</span>
                </div>
                <div class="range-item">
                  <span class="range-label">{$t('diagnostics.tls-versions.results.summary.maxVersion')}:</span>
                  <span class="range-value mono">{diagnosticState.results.maxVersion || 'Unknown'}</span>
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}

  <ErrorCard title={$t('diagnostics.tls-versions.title')} error={diagnosticState.error} />

  <!-- Educational Content -->
  <div class="card info-card">
    <div class="card-header">
      <h3>{$t('diagnostics.tls-versions.educational.title')}</h3>
    </div>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-section">
          <h4>{$t('diagnostics.tls-versions.educational.versionSecurity.title')}</h4>
          <ul>
            <li>
              <strong>{$t('diagnostics.tls-versions.versions.tls13')}:</strong>
              {$t('diagnostics.tls-versions.educational.versionSecurity.tls13')}
            </li>
            <li>
              <strong>{$t('diagnostics.tls-versions.versions.tls12')}:</strong>
              {$t('diagnostics.tls-versions.educational.versionSecurity.tls12')}
            </li>
            <li>
              <strong>{$t('diagnostics.tls-versions.versions.tls11')}:</strong>
              {$t('diagnostics.tls-versions.educational.versionSecurity.tls11')}
            </li>
            <li>
              <strong>{$t('diagnostics.tls-versions.versions.tls10')}:</strong>
              {$t('diagnostics.tls-versions.educational.versionSecurity.tls10')}
            </li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.tls-versions.educational.bestPractices.title')}</h4>
          <ul>
            <li>{$t('diagnostics.tls-versions.educational.bestPractices.enableModern')}</li>
            <li>{$t('diagnostics.tls-versions.educational.bestPractices.disableDeprecated')}</li>
            <li>{$t('diagnostics.tls-versions.educational.bestPractices.updateRegularly')}</li>
            <li>{$t('diagnostics.tls-versions.educational.bestPractices.strongCiphers')}</li>
          </ul>
        </div>

        <div class="info-section">
          <h4>{$t('diagnostics.tls-versions.educational.compliance.title')}</h4>
          <p>
            {$t('diagnostics.tls-versions.educational.compliance.description')}
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .security-overview {
    margin-bottom: var(--spacing-lg);
  }

  .status-title {
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-desc {
    font-size: var(--font-size-xs);
    margin: 2px 0 0 0;
    opacity: 0.8;
  }

  .versions-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .versions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .version-item {
    border: 2px solid;
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    &.success {
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success), transparent 95%);
    }

    &.warning {
      border-color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
    }

    &.error {
      border-color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 95%);
    }
  }

  .version-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .version-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  }

  .version-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .version-code {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .version-status {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .version-error {
    margin-top: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: color-mix(in srgb, var(--color-error), transparent 90%);
    border-radius: var(--radius-xs);
    border-left: 3px solid var(--color-error);
  }

  .error-detail {
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .version-warning {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
    padding: var(--spacing-xs);
    background: color-mix(in srgb, var(--color-warning), transparent 90%);
    border-radius: var(--radius-xs);
    font-size: var(--font-size-xs);
    color: var(--text-primary);
  }

  .range-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-primary);
      padding-bottom: var(--spacing-xs);
    }
  }

  .range-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .range-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .range-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .range-value {
    color: var(--text-primary);
    font-weight: 600;
  }

  .error-text {
    color: var(--color-error);
    font-size: var(--font-size-xs);
    margin-top: var(--spacing-xs);
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>
