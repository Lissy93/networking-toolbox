<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { useClipboard } from '$lib/composables';
  import { t } from '$lib/stores/language';

  let domain = $state('');
  let order = $state('100');
  let preference = $state('10');
  let flags = $state('U');
  let service = $state('E2U+sip');
  let regexp = $state('!^.*$!sip:info@example.com!');
  let replacement = $state('.');

  const clipboard = useClipboard();
  let showExamples = $state(false);

  const flagOptions = $derived([
    {
      value: 'U',
      label: $t('tools/naptr-builder.flags.uFlag.label'),
      description: $t('tools/naptr-builder.flags.uFlag.description'),
    },
    {
      value: 'S',
      label: $t('tools/naptr-builder.flags.sFlag.label'),
      description: $t('tools/naptr-builder.flags.sFlag.description'),
    },
    {
      value: 'A',
      label: $t('tools/naptr-builder.flags.aFlag.label'),
      description: $t('tools/naptr-builder.flags.aFlag.description'),
    },
    {
      value: 'P',
      label: $t('tools/naptr-builder.flags.pFlag.label'),
      description: $t('tools/naptr-builder.flags.pFlag.description'),
    },
    {
      value: '',
      label: $t('tools/naptr-builder.flags.emptyFlag.label'),
      description: $t('tools/naptr-builder.flags.emptyFlag.description'),
    },
  ]);

  const serviceExamples = $derived([
    {
      value: 'E2U+sip',
      label: $t('tools/naptr-builder.services.sip.label'),
      description: $t('tools/naptr-builder.services.sip.description'),
    },
    {
      value: 'E2U+email',
      label: $t('tools/naptr-builder.services.email.label'),
      description: $t('tools/naptr-builder.services.email.description'),
    },
    {
      value: 'E2U+web+http',
      label: $t('tools/naptr-builder.services.webHttp.label'),
      description: $t('tools/naptr-builder.services.webHttp.description'),
    },
    {
      value: 'E2U+web+https',
      label: $t('tools/naptr-builder.services.webHttps.label'),
      description: $t('tools/naptr-builder.services.webHttps.description'),
    },
    {
      value: 'E2U+tel',
      label: $t('tools/naptr-builder.services.tel.label'),
      description: $t('tools/naptr-builder.services.tel.description'),
    },
    {
      value: 'E2U+fax',
      label: $t('tools/naptr-builder.services.fax.label'),
      description: $t('tools/naptr-builder.services.fax.description'),
    },
    {
      value: 'E2U+h323',
      label: $t('tools/naptr-builder.services.h323.label'),
      description: $t('tools/naptr-builder.services.h323.description'),
    },
    {
      value: 'E2U+im',
      label: $t('tools/naptr-builder.services.im.label'),
      description: $t('tools/naptr-builder.services.im.description'),
    },
  ]);

  let naptrRecord = $derived.by(() => {
    if (!domain.trim()) return '';

    const cleanDomain = domain.trim().replace(/\.$/, '');
    return `${cleanDomain}. IN NAPTR ${order} ${preference} "${flags}" "${service}" "${regexp}" ${replacement}`;
  });

  let isValid = $derived.by(() => {
    return (
      domain.trim() !== '' &&
      order !== '' &&
      preference !== '' &&
      parseInt(order) >= 0 &&
      parseInt(order) <= 65535 &&
      parseInt(preference) >= 0 &&
      parseInt(preference) <= 65535
    );
  });

  let warnings = $derived.by(() => {
    const warns = [];

    if (flags === 'U' && !regexp.includes('!')) {
      warns.push($t('tools/naptr-builder.warnings.uriFlag'));
    }

    if (flags === 'S' && replacement === '.') {
      warns.push($t('tools/naptr-builder.warnings.srvFlag'));
    }

    if (flags === '' && replacement === '.') {
      warns.push($t('tools/naptr-builder.warnings.nonTerminal'));
    }

    if (regexp && !regexp.match(/^!.*!.*!$/)) {
      warns.push($t('tools/naptr-builder.warnings.regexpFormat'));
    }

    if (parseInt(order) === parseInt(preference)) {
      warns.push($t('tools/naptr-builder.warnings.orderPreference'));
    }

    return warns;
  });

  function copyToClipboard() {
    clipboard.copy(naptrRecord, 'copy');
  }

  function downloadRecord() {
    const blob = new Blob([naptrRecord], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain.replace(/\.$/, '') || 'naptr'}-record.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('', 'download');
  }

  function loadExample(exampleType: string) {
    switch (exampleType) {
      case 'sip':
        domain = 'example.com';
        order = '100';
        preference = '10';
        flags = 'U';
        service = 'E2U+sip';
        regexp = '!^.*$!sip:info@example.com!';
        replacement = '.';
        break;
      case 'email':
        domain = 'example.com';
        order = '100';
        preference = '10';
        flags = 'U';
        service = 'E2U+email';
        regexp = '!^.*$!mailto:admin@example.com!';
        replacement = '.';
        break;
      case 'web':
        domain = 'example.com';
        order = '100';
        preference = '10';
        flags = 'U';
        service = 'E2U+web+https';
        regexp = '!^.*$!https://www.example.com/!';
        replacement = '.';
        break;
      case 'srv':
        domain = 'example.com';
        order = '100';
        preference = '10';
        flags = 'S';
        service = 'SIP+D2T';
        regexp = '';
        replacement = '_sip._tcp.example.com.';
        break;
    }
  }
</script>

<div class="container">
  <div class="card">
    <div class="card-header">
      <h1>{$t('tools/naptr-builder.title')}</h1>
      <p>{$t('tools/naptr-builder.description')}</p>
    </div>

    <div class="content">
      <!-- Examples -->
      <div class="card examples-card">
        <details bind:open={showExamples}>
          <summary class="examples-summary">
            <Icon name="lightbulb" size="sm" />
            {$t('tools/naptr-builder.examples.title')}
            <span class="chevron"><Icon name="chevron-down" size="sm" /></span>
          </summary>
          <div class="examples-grid">
            <button class="example-btn" onclick={() => loadExample('sip')}
              >{$t('tools/naptr-builder.examples.sipService')}</button
            >
            <button class="example-btn" onclick={() => loadExample('email')}
              >{$t('tools/naptr-builder.examples.emailService')}</button
            >
            <button class="example-btn" onclick={() => loadExample('web')}
              >{$t('tools/naptr-builder.examples.webService')}</button
            >
            <button class="example-btn" onclick={() => loadExample('srv')}
              >{$t('tools/naptr-builder.examples.srvDelegation')}</button
            >
          </div>
        </details>
      </div>

      <div class="main-grid">
        <!-- Input Form -->
        <div class="input-section">
          <div class="input-group">
            <label for="domain" use:tooltip={$t('tools/naptr-builder.input.domainTooltip')}
              >{$t('tools/naptr-builder.input.domainLabel')}</label
            >
            <input
              id="domain"
              type="text"
              bind:value={domain}
              placeholder={$t('tools/naptr-builder.input.domainPlaceholder')}
            />
            <p class="description">{$t('tools/naptr-builder.input.domainDescription')}</p>
          </div>

          <div class="order-grid">
            <div class="input-group">
              <label for="order" use:tooltip={$t('tools/naptr-builder.input.orderTooltip')}
                >{$t('tools/naptr-builder.input.orderLabel')}</label
              >
              <input id="order" type="number" bind:value={order} min="0" max="65535" />
              <p class="description">{$t('tools/naptr-builder.input.orderDescription')}</p>
            </div>

            <div class="input-group">
              <label for="preference" use:tooltip={$t('tools/naptr-builder.input.preferenceTooltip')}
                >{$t('tools/naptr-builder.input.preferenceLabel')}</label
              >
              <input id="preference" type="number" bind:value={preference} min="0" max="65535" />
              <p class="description">{$t('tools/naptr-builder.input.preferenceDescription')}</p>
            </div>
          </div>

          <div class="input-group">
            <label for="flags" use:tooltip={$t('tools/naptr-builder.input.flagsTooltip')}
              >{$t('tools/naptr-builder.input.flagsLabel')}</label
            >
            <select id="flags" bind:value={flags}>
              {#each flagOptions as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            <p class="description">
              {flagOptions.find((opt) => opt.value === flags)?.description ||
                $t('tools/naptr-builder.flags.selectPlaceholder')}
            </p>
          </div>

          <div class="input-group">
            <label for="service" use:tooltip={$t('tools/naptr-builder.input.serviceTooltip')}
              >{$t('tools/naptr-builder.input.serviceLabel')}</label
            >
            <input
              id="service"
              type="text"
              bind:value={service}
              placeholder={$t('tools/naptr-builder.input.servicePlaceholder')}
            />
            <details class="service-examples">
              <summary>{$t('tools/naptr-builder.services.showExamples')}</summary>
              <div class="service-list">
                {#each serviceExamples as example (example.value)}
                  <button class="service-item" onclick={() => (service = example.value)}>
                    <strong>{example.value}</strong> - {example.description}
                  </button>
                {/each}
              </div>
            </details>
          </div>

          <div class="input-group">
            <label for="regexp" use:tooltip={$t('tools/naptr-builder.input.regexpTooltip')}
              >{$t('tools/naptr-builder.input.regexpLabel')}</label
            >
            <input
              id="regexp"
              type="text"
              bind:value={regexp}
              placeholder={$t('tools/naptr-builder.input.regexpPlaceholder')}
              class="mono"
            />
            <p class="description">{$t('tools/naptr-builder.input.regexpDescription')}</p>
          </div>

          <div class="input-group">
            <label for="replacement" use:tooltip={$t('tools/naptr-builder.input.replacementTooltip')}
              >{$t('tools/naptr-builder.input.replacementLabel')}</label
            >
            <input
              id="replacement"
              type="text"
              bind:value={replacement}
              placeholder={$t('tools/naptr-builder.input.replacementPlaceholder')}
            />
            <p class="description">{$t('tools/naptr-builder.input.replacementDescription')}</p>
          </div>
        </div>

        <!-- Output -->
        <div class="output-section">
          <div class="card">
            <h3 class="section-title">{$t('tools/naptr-builder.output.title')}</h3>
            <div class="code-block">
              {#if isValid}
                <code>{naptrRecord}</code>
              {:else}
                <p class="placeholder">{$t('tools/naptr-builder.output.placeholder')}</p>
              {/if}
            </div>
          </div>

          {#if warnings.length > 0}
            <div class="message warning">
              <Icon name="alert-triangle" size="sm" />
              <div>
                <h4>{$t('tools/naptr-builder.warnings.title')}</h4>
                <ul>
                  {#each warnings as warning, index (index)}
                    <li>{warning}</li>
                  {/each}
                </ul>
              </div>
            </div>
          {/if}

          {#if isValid}
            <div class="actions">
              <button onclick={copyToClipboard} class="btn btn-primary" class:success={clipboard.isCopied('copy')}>
                <Icon name={clipboard.isCopied('copy') ? 'check' : 'copy'} size="sm" />
                {clipboard.isCopied('copy')
                  ? $t('tools/naptr-builder.output.copied')
                  : $t('tools/naptr-builder.output.copyButton')}
              </button>
              <button onclick={downloadRecord} class="btn btn-success" class:success={clipboard.isCopied('download')}>
                <Icon name={clipboard.isCopied('download') ? 'check' : 'download'} size="sm" />
                {clipboard.isCopied('download')
                  ? $t('tools/naptr-builder.output.downloaded')
                  : $t('tools/naptr-builder.output.downloadButton')}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Information Section -->
      <div class="info-section">
        <div class="card info-card">
          <h3 class="section-title">{$t('tools/naptr-builder.info.aboutTitle')}</h3>
          <p>{$t('tools/naptr-builder.info.aboutDescription')}</p>
        </div>

        <div class="info-grid">
          <div class="card info-card">
            <h4>{$t('tools/naptr-builder.info.fieldsTitle')}</h4>
            <dl class="field-list">
              <dt>Order:</dt>
              <dd>{$t('tools/naptr-builder.info.fields.order')}</dd>
              <dt>Preference:</dt>
              <dd>{$t('tools/naptr-builder.info.fields.preference')}</dd>
              <dt>Flags:</dt>
              <dd>{$t('tools/naptr-builder.info.fields.flags')}</dd>
              <dt>Service:</dt>
              <dd>{$t('tools/naptr-builder.info.fields.service')}</dd>
              <dt>RegExp:</dt>
              <dd>{$t('tools/naptr-builder.info.fields.regexp')}</dd>
              <dt>Replacement:</dt>
              <dd>{$t('tools/naptr-builder.info.fields.replacement')}</dd>
            </dl>
          </div>

          <div class="card info-card">
            <h4>{$t('tools/naptr-builder.info.useCasesTitle')}</h4>
            <ul class="use-case-list">
              <li>{$t('tools/naptr-builder.info.useCases.enum')}</li>
              <li>{$t('tools/naptr-builder.info.useCases.sip')}</li>
              <li>{$t('tools/naptr-builder.info.useCases.delegation')}</li>
              <li>{$t('tools/naptr-builder.info.useCases.protocol')}</li>
              <li>{$t('tools/naptr-builder.info.useCases.location')}</li>
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

  .content {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
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
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-md);
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

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    margin: 0 0 var(--spacing-md) 0;
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-sm);
  }

  .example-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .example-btn:hover {
    background: var(--color-primary-hover);
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
  .input-group select {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .input-group input:focus,
  .input-group select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .input-group input.mono {
    font-family: var(--font-mono);
  }

  .description {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin: 0;
  }

  .order-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .service-examples {
    margin-top: var(--spacing-sm);
  }

  .service-examples summary {
    color: var(--color-primary);
    cursor: pointer;
    font-size: var(--font-size-xs);
    transition: color var(--transition-fast);
  }

  .service-examples summary:hover {
    color: var(--color-primary-hover);
  }

  .service-list {
    margin-top: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .service-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .service-item:hover {
    background: var(--surface-hover);
    border-color: var(--color-primary);
  }

  .service-item strong {
    color: var(--text-primary);
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

  .message {
    display: flex;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
  }

  .message.warning {
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
    color: var(--color-warning);
  }

  .message h4 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .message ul {
    margin: 0;
    padding-left: var(--spacing-md);
    font-size: var(--font-size-sm);
  }

  .message li {
    margin-bottom: var(--spacing-xs);
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

  .field-list {
    font-size: var(--font-size-sm);
  }

  .field-list dt {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .field-list dd {
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-sm) var(--spacing-md);
  }

  .use-case-list {
    margin: 0;
    padding: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .use-case-list li {
    position: relative;
    padding-left: var(--spacing-md);
    margin-bottom: var(--spacing-xs);
    list-style: none;
  }

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
</style>
