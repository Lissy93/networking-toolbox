<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { useClipboard } from '$lib/composables';
  import { t, loadTranslations, locale } from '$lib/stores/language';

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools');
  });

  let domain = $state('example.com');
  let port = $state(443);
  let protocol = $state('tcp');
  let inputType = $state('certificate');
  let certificateInput = $state('');
  let hashInput = $state('');

  let usage = $state(3);
  let selector = $state(1);
  let matchingType = $state(1);

  let showExamples = $state(false);
  let selectedExample = $state<string | null>(null);
  const clipboard = useClipboard();

  const usageDescriptions = $derived({
    0: $t('tools.tlsa_generator.parameters.usage.descriptions.caConstraint'),
    1: $t('tools.tlsa_generator.parameters.usage.descriptions.serviceConstraint'),
    2: $t('tools.tlsa_generator.parameters.usage.descriptions.trustAnchor'),
    3: $t('tools.tlsa_generator.parameters.usage.descriptions.domainIssued'),
  });

  const selectorDescriptions = $derived({
    0: $t('tools.tlsa_generator.parameters.selector.descriptions.fullCert'),
    1: $t('tools.tlsa_generator.parameters.selector.descriptions.spki'),
  });

  const matchingTypeDescriptions = $derived({
    0: $t('tools.tlsa_generator.parameters.matching.descriptions.exact'),
    1: $t('tools.tlsa_generator.parameters.matching.descriptions.sha256'),
    2: $t('tools.tlsa_generator.parameters.matching.descriptions.sha512'),
  });

  const tlsaRecord = $derived.by(() => {
    let associationData = '';

    if (inputType === 'hash') {
      associationData = hashInput
        .trim()
        .replace(/[^a-fA-F0-9]/g, '')
        .toLowerCase();
    } else if (inputType === 'certificate') {
      if (certificateInput.trim()) {
        associationData = $t('tools.tlsa_generator.output.generated_hash_placeholder');
      }
    }

    if (!associationData) return null;

    return {
      usage,
      selector,
      matchingType,
      certificateAssociation: associationData,
    };
  });

  const dnsRecord = $derived.by(() => {
    if (!tlsaRecord) return '';
    return `_${port}._${protocol}.${domain}. IN TLSA ${tlsaRecord.usage} ${tlsaRecord.selector} ${tlsaRecord.matchingType} ${tlsaRecord.certificateAssociation}`;
  });

  const validation = $derived.by(() => {
    const warnings = [];
    const errors = [];

    if (!domain.trim()) {
      errors.push($t('tools.tlsa_generator.validation.errors.domainRequired'));
    } else if (!domain.includes('.')) {
      warnings.push($t('tools.tlsa_generator.validation.warnings.domainTld'));
    }

    if (port < 1 || port > 65535) {
      errors.push($t('tools.tlsa_generator.validation.errors.portRange'));
    }

    if (inputType === 'certificate') {
      if (!certificateInput.trim()) {
        errors.push($t('tools.tlsa_generator.validation.errors.certificateRequired'));
      } else if (!certificateInput.includes('BEGIN CERTIFICATE') && !certificateInput.includes('BEGIN PUBLIC KEY')) {
        warnings.push($t('tools.tlsa_generator.validation.warnings.pemFormat'));
      }
    } else if (inputType === 'hash') {
      if (!hashInput.trim()) {
        errors.push($t('tools.tlsa_generator.validation.errors.hashRequired'));
      } else {
        const cleanHash = hashInput.trim().replace(/[^a-fA-F0-9]/g, '');
        if (matchingType === 1 && cleanHash.length !== 64) {
          warnings.push($t('tools.tlsa_generator.validation.warnings.sha256Length'));
        } else if (matchingType === 2 && cleanHash.length !== 128) {
          warnings.push($t('tools.tlsa_generator.validation.warnings.sha512Length'));
        } else if (!/^[a-fA-F0-9]+$/.test(cleanHash)) {
          errors.push($t('tools.tlsa_generator.validation.errors.hexOnly'));
        }
      }
    }

    if (usage === 0 || usage === 2) {
      warnings.push($t('tools.tlsa_generator.validation.warnings.usageTypes02'));
    }

    if (selector === 0) {
      warnings.push($t('tools.tlsa_generator.validation.warnings.selectorFull'));
    }

    if (matchingType === 0) {
      warnings.push($t('tools.tlsa_generator.validation.warnings.exactMatch'));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  });

  function copyToClipboard(text: string, buttonId: string) {
    clipboard.copy(text, buttonId);
  }

  function exportAsZoneFile() {
    if (!dnsRecord) return;

    const zoneContent = dnsRecord;
    const blob = new Blob([zoneContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-tlsa-record.zone`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('downloaded', 'export-tlsa');
  }

  async function generateHashFromInput() {
    if (inputType === 'certificate' && certificateInput.trim()) {
      const demoHash =
        matchingType === 1
          ? 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
          : 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      hashInput = demoHash;
      inputType = 'hash';
    }
  }

  const exampleConfigurations = $derived([
    {
      name: $t('tools.tlsa_generator.examples.https.name'),
      description: $t('tools.tlsa_generator.examples.https.description'),
      domain: 'example.com',
      port: 443,
      protocol: 'tcp',
      usage: 3,
      selector: 1,
      matchingType: 1,
      hash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    {
      name: $t('tools.tlsa_generator.examples.smtp.name'),
      description: $t('tools.tlsa_generator.examples.smtp.description'),
      domain: 'mail.example.com',
      port: 587,
      protocol: 'tcp',
      usage: 3,
      selector: 1,
      matchingType: 1,
      hash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    },
    {
      name: $t('tools.tlsa_generator.examples.ca.name'),
      description: $t('tools.tlsa_generator.examples.ca.description'),
      domain: 'secure.example.com',
      port: 443,
      protocol: 'tcp',
      usage: 2,
      selector: 1,
      matchingType: 2,
      hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
  ]);

  function loadExample(example: {
    name: string;
    description: string;
    domain: string;
    port: number;
    protocol: string;
    usage: number;
    selector: number;
    matchingType: number;
    hash: string;
  }) {
    domain = example.domain;
    port = example.port;
    protocol = example.protocol;
    usage = example.usage;
    selector = example.selector;
    matchingType = example.matchingType;
    hashInput = example.hash;
    inputType = 'hash';
    certificateInput = '';
    selectedExample = example.name;
  }

  const securityTips = $derived([
    $t('tools.tlsa_generator.security.tips.usage3'),
    $t('tools.tlsa_generator.security.tips.selectorSpki'),
    $t('tools.tlsa_generator.security.tips.hashTypes'),
    $t('tools.tlsa_generator.security.tips.multipleCerts'),
    $t('tools.tlsa_generator.security.tips.testRecords'),
  ]);
</script>

<div class="container">
  <div class="card">
    <div class="card-header">
      <h1>{$t('tools.tlsa_generator.title')}</h1>
      <p>
        {$t('tools.tlsa_generator.subtitle')}
      </p>
    </div>

    <div class="main-grid">
      <div class="input-section">
        <!-- Service Configuration -->
        <div class="card sub-card">
          <h3 class="section-title">
            <Icon name="globe" size="sm" />
            {$t('tools.tlsa_generator.service.title')}
          </h3>

          <div class="service-grid">
            <div class="input-group">
              <label for="domain" use:tooltip={$t('tools.tlsa_generator.service.domain.tooltip')}
                >{$t('tools.tlsa_generator.service.domain.label')}</label
              >
              <input
                id="domain"
                type="text"
                bind:value={domain}
                placeholder={$t('tools.tlsa_generator.service.domain.placeholder')}
              />
            </div>

            <div class="input-group">
              <label for="port" use:tooltip={$t('tools.tlsa_generator.service.port.tooltip')}
                >{$t('tools.tlsa_generator.service.port.label')}</label
              >
              <input
                id="port"
                type="number"
                bind:value={port}
                min="1"
                max="65535"
                placeholder={$t('tools.tlsa_generator.service.port.placeholder')}
              />
            </div>

            <div class="input-group">
              <label for="protocol" use:tooltip={$t('tools.tlsa_generator.service.protocol.tooltip')}
                >{$t('tools.tlsa_generator.service.protocol.label')}</label
              >
              <select id="protocol" bind:value={protocol}>
                <option value="tcp">{$t('tools.tlsa_generator.service.protocol.options.tcp')}</option>
                <option value="udp">{$t('tools.tlsa_generator.service.protocol.options.udp')}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- TLSA Parameters -->
        <div class="card sub-card">
          <h3 class="section-title">
            <Icon name="settings" size="sm" />
            {$t('tools.tlsa_generator.parameters.title')}
          </h3>

          <div class="input-group">
            <label for="usage" use:tooltip={$t('tools.tlsa_generator.parameters.usage.tooltip')}
              >{$t('tools.tlsa_generator.parameters.usage.label')}</label
            >
            <select id="usage" bind:value={usage}>
              <option value={0}>{$t('tools.tlsa_generator.parameters.usage.options.caConstraint')}</option>
              <option value={1}>{$t('tools.tlsa_generator.parameters.usage.options.serviceConstraint')}</option>
              <option value={2}>{$t('tools.tlsa_generator.parameters.usage.options.trustAnchor')}</option>
              <option value={3}>{$t('tools.tlsa_generator.parameters.usage.options.domainIssued')}</option>
            </select>
            <p class="description">{usageDescriptions[usage as keyof typeof usageDescriptions]}</p>
          </div>

          <div class="input-group">
            <label for="selector" use:tooltip={$t('tools.tlsa_generator.parameters.selector.tooltip')}
              >{$t('tools.tlsa_generator.parameters.selector.label')}</label
            >
            <select id="selector" bind:value={selector}>
              <option value={0}>{$t('tools.tlsa_generator.parameters.selector.options.fullCert')}</option>
              <option value={1}>{$t('tools.tlsa_generator.parameters.selector.options.spki')}</option>
            </select>
            <p class="description">{selectorDescriptions[selector as keyof typeof selectorDescriptions]}</p>
          </div>

          <div class="input-group">
            <label for="matchingType" use:tooltip={$t('tools.tlsa_generator.parameters.matching.tooltip')}
              >{$t('tools.tlsa_generator.parameters.matching.label')}</label
            >
            <select id="matchingType" bind:value={matchingType}>
              <option value={0}>{$t('tools.tlsa_generator.parameters.matching.options.exact')}</option>
              <option value={1}>{$t('tools.tlsa_generator.parameters.matching.options.sha256')}</option>
              <option value={2}>{$t('tools.tlsa_generator.parameters.matching.options.sha512')}</option>
            </select>
            <p class="description">{matchingTypeDescriptions[matchingType as keyof typeof matchingTypeDescriptions]}</p>
          </div>
        </div>

        <!-- Certificate Data -->
        <div class="card sub-card">
          <h3 class="section-title">
            <Icon name="key" size="sm" />
            {$t('tools.tlsa_generator.certificate.title')}
          </h3>

          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" bind:group={inputType} value="certificate" />
              <span>{$t('tools.tlsa_generator.certificate.pemOption')}</span>
            </label>
            <label class="radio-option">
              <input type="radio" bind:group={inputType} value="hash" />
              <span>{$t('tools.tlsa_generator.certificate.hashOption')}</span>
            </label>
          </div>

          {#if inputType === 'certificate'}
            <div class="input-group">
              <label for="certificate" use:tooltip={$t('tools.tlsa_generator.certificate.pemTooltip')}
                >{$t('tools.tlsa_generator.certificate.pemLabel')}</label
              >
              <textarea
                id="certificate"
                bind:value={certificateInput}
                placeholder="-----BEGIN CERTIFICATE-----&#10;MIIFXzCCA0egAwIBAgIJAKZ5QeHxw...&#10;-----END CERTIFICATE-----"
                rows="8"
              ></textarea>
              <button
                type="button"
                onclick={generateHashFromInput}
                disabled={!certificateInput.trim()}
                class="btn btn-secondary"
                use:tooltip={$t('tools.tlsa_generator.certificate.generateTooltip')}
              >
                <Icon name="arrow-right" size="sm" />
                {$t('tools.tlsa_generator.certificate.generateButton')}
              </button>
            </div>
          {:else}
            <div class="input-group">
              <label
                for="hash"
                use:tooltip={$t('tools.tlsa_generator.certificate.hashTooltip', {
                  type:
                    matchingType === 1
                      ? 'SHA-256'
                      : matchingType === 2
                        ? 'SHA-512'
                        : $t('tools.tlsa_generator.certificate.exact'),
                })}>{$t('tools.tlsa_generator.certificate.hashLabel')}</label
              >
              <textarea
                id="hash"
                bind:value={hashInput}
                placeholder={matchingType === 1
                  ? 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
                  : matchingType === 2
                    ? 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
                    : 'Certificate or key data'}
                rows="3"
              ></textarea>
            </div>
          {/if}
        </div>
      </div>

      <div class="output-section">
        {#if tlsaRecord}
          <!-- Generated Record -->
          <div class="card">
            <div class="card-header-with-actions">
              <h3>{$t('tools.tlsa_generator.output.title')}</h3>
              <div class="actions">
                <button
                  type="button"
                  class="btn btn-primary"
                  class:success={clipboard.isCopied('copy-tlsa')}
                  onclick={() => copyToClipboard(dnsRecord, 'copy-tlsa')}
                  use:tooltip={$t('tools.tlsa_generator.output.copy.tooltip')}
                >
                  <Icon name={clipboard.isCopied('copy-tlsa') ? 'check' : 'copy'} size="sm" />
                  {clipboard.isCopied('copy-tlsa')
                    ? $t('tools.tlsa_generator.output.copy.copied')
                    : $t('tools.tlsa_generator.output.copy.button')}
                </button>
                <button
                  type="button"
                  class="btn btn-success"
                  class:success={clipboard.isCopied('export-tlsa')}
                  onclick={exportAsZoneFile}
                  use:tooltip={$t('tools.tlsa_generator.output.export.tooltip')}
                >
                  <Icon name={clipboard.isCopied('export-tlsa') ? 'check' : 'download'} size="sm" />
                  {clipboard.isCopied('export-tlsa')
                    ? $t('tools.tlsa_generator.output.export.downloaded')
                    : $t('tools.tlsa_generator.output.export.button')}
                </button>
              </div>
            </div>

            <div class="code-block">
              <code>{dnsRecord}</code>
            </div>

            <div class="breakdown">
              <h4>{$t('tools.tlsa_generator.output.breakdown.title')}</h4>
              <div class="breakdown-grid">
                <div class="breakdown-item">
                  <strong>{$t('tools.tlsa_generator.output.breakdown.service')}</strong> _{port}._{protocol}
                </div>
                <div class="breakdown-item">
                  <strong>{$t('tools.tlsa_generator.output.breakdown.usage')}</strong>
                  {usage} ({Object.values(usageDescriptions)[usage].split(' - ')[0]})
                </div>
                <div class="breakdown-item">
                  <strong>{$t('tools.tlsa_generator.output.breakdown.selector')}</strong>
                  {selector} ({Object.values(selectorDescriptions)[selector].split(' - ')[0]})
                </div>
                <div class="breakdown-item">
                  <strong>{$t('tools.tlsa_generator.output.breakdown.matching')}</strong>
                  {matchingType} ({Object.values(matchingTypeDescriptions)[matchingType].split(' - ')[0]})
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Validation -->
        <div class="card">
          <h3 class="section-title">
            <Icon name="bar-chart" size="sm" />
            {$t('tools.tlsa_generator.validation.title')}
          </h3>

          <div class="status-center">
            <div class="status-item">
              <span>{$t('tools.tlsa_generator.validation.status.label')}</span>
              <span class="status" class:valid={validation.isValid} class:invalid={!validation.isValid}>
                {validation.isValid
                  ? $t('tools.tlsa_generator.validation.status.valid')
                  : $t('tools.tlsa_generator.validation.status.invalid')}
              </span>
            </div>
          </div>

          {#if validation.errors.length > 0}
            <div class="message error">
              <Icon name="x-circle" size="sm" />
              <div>
                {#each validation.errors as error, index (index)}
                  <div>{error}</div>
                {/each}
              </div>
            </div>
          {/if}

          {#if validation.warnings.length > 0}
            <div class="message warning">
              <Icon name="alert-triangle" size="sm" />
              <div>
                {#each validation.warnings as warning, index (index)}
                  <div>{warning}</div>
                {/each}
              </div>
            </div>
          {/if}

          {#if validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0}
            <div class="message success">
              <Icon name="check-circle" size="sm" />
              <div>{$t('tools.tlsa_generator.validation.readyToDeploy')}</div>
            </div>
          {/if}
        </div>

        <!-- Security Best Practices -->
        <div class="card">
          <h3 class="section-title">
            <Icon name="shield" size="sm" />
            {$t('tools.tlsa_generator.security.title')}
          </h3>

          <ul class="tips-list">
            {#each securityTips as tip, index (index)}
              <li>{tip}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <!-- Examples -->
    <div class="card examples-card">
      <details bind:open={showExamples}>
        <summary class="examples-summary">
          <Icon name="lightbulb" size="sm" />
          {$t('tools.tlsa_generator.examples.title')}
          <span class="chevron"><Icon name="chevron-down" size="sm" /></span>
        </summary>
        <div class="examples-grid">
          {#each exampleConfigurations as example (example.name)}
            <button
              type="button"
              class="example-card"
              class:selected={selectedExample === example.name}
              onclick={() => loadExample(example)}
            >
              <div class="example-name">{example.name}</div>
              <p class="example-description">{example.description}</p>
              <div class="example-config">
                <div>
                  {$t('tools.tlsa_generator.examples.config.port')}: <code>{example.port}/{example.protocol}</code>
                </div>
                <div>
                  {$t('tools.tlsa_generator.examples.config.usage')}: <code>{example.usage}</code>, {$t(
                    'tools.tlsa_generator.examples.config.selector',
                  )}: <code>{example.selector}</code>, {$t('tools.tlsa_generator.examples.config.type')}:
                  <code>{example.matchingType}</code>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </details>
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

  .card-header {
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-primary);
  }

  .card-header h1 {
    color: var(--text-primary);
    font-size: var(--font-size-2xl);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .card-header p {
    color: var(--text-secondary);
    margin: 0;
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
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

  .sub-card {
    padding: var(--spacing-md);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin: 0 0 var(--spacing-md) 0;
  }

  .service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
  .input-group select,
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
  .input-group select:focus,
  .input-group textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .input-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-style: italic;
    margin-top: var(--spacing-xs);
  }

  .radio-group {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  @media (max-width: 768px) {
    .radio-group {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: background-color var(--transition-fast);
  }

  .radio-option:hover {
    background: var(--surface-hover);
  }

  .radio-option input[type='radio'] {
    width: 16px;
    height: 16px;
  }

  .radio-option span {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
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

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--bg-primary);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--color-info);
    color: var(--bg-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-info-light);
  }

  .btn-success {
    background: var(--color-success);
    color: var(--bg-primary);
  }

  .btn-success:hover:not(:disabled) {
    background: var(--color-success-light);
  }

  .btn.success {
    background: var(--color-success) !important;
    transform: scale(1.05);
  }

  .card-header-with-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-primary);
  }

  .card-header-with-actions h3 {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin: 0;
  }

  .actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .code-block {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin: var(--spacing-md);
  }

  .code-block code {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    word-break: break-all;
  }

  .breakdown {
    padding: var(--spacing-md);
  }

  .breakdown h4 {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-sm);
  }

  @media (max-width: 768px) {
    .breakdown-grid {
      grid-template-columns: 1fr;
    }
  }

  .breakdown-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .breakdown-item strong {
    color: var(--color-primary);
  }

  .status-center {
    display: flex;
    justify-content: center;
    margin-bottom: var(--spacing-md);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .status-item span:first-child {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .status {
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .status.valid {
    color: var(--color-success);
  }

  .status.invalid {
    color: var(--color-error);
  }

  .message {
    display: flex;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
  }

  .message:last-child {
    margin-bottom: 0;
  }

  .message.success {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
    color: var(--color-success);
  }

  .message.warning {
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
    color: var(--color-warning);
  }

  .message.error {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
    color: var(--color-error);
  }

  .message div {
    font-size: var(--font-size-sm);
  }

  .tips-list {
    margin: 0;
    padding-left: var(--spacing-md);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .tips-list li {
    margin-bottom: var(--spacing-sm);
    line-height: 1.5;
  }

  .tips-list li:last-child {
    margin-bottom: 0;
  }

  .examples-card {
    margin-top: var(--spacing-lg);
  }

  .examples-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    color: var(--text-primary);
    font-weight: 600;
    padding: var(--spacing-md);
  }

  .examples-summary:hover {
    color: var(--color-primary);
  }

  .chevron {
    margin-left: auto;
    transform: rotate(0deg);
    transition: transform var(--transition-normal);
  }

  details[open] .chevron {
    transform: rotate(180deg);
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-md);
    padding: 0 var(--spacing-md) var(--spacing-md);
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }
  }

  .example-card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-normal);
    text-align: left;
  }

  .example-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .example-card.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);
  }

  .example-name {
    color: var(--color-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .example-description {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .example-config {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .example-config code {
    font-family: var(--font-mono);
    background: var(--bg-primary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-xs);
    color: var(--color-primary);
  }
</style>
