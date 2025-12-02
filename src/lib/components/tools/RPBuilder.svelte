<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { Copy, Download, Check, Mail } from 'lucide-svelte';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';
  import { t, loadTranslations, locale } from '$lib/stores/language';

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools');
  });

  let domain = $state('');
  let mailboxDname = $state('admin.example.com.');
  let txtDname = $state('admin-info.example.com.');
  let showExamples = $state(false);

  const clipboard = useClipboard();

  const roleExamples = $derived([
    {
      name: $t('tools.rp_builder.examples.roles.systemAdmin.name'),
      mbox: 'admin.example.com.',
      txt: 'admin-info.example.com.',
      description: $t('tools.rp_builder.examples.roles.systemAdmin.description'),
    },
    {
      name: $t('tools.rp_builder.examples.roles.webmaster.name'),
      mbox: 'webmaster.example.com.',
      txt: 'webmaster-info.example.com.',
      description: $t('tools.rp_builder.examples.roles.webmaster.description'),
    },
    {
      name: $t('tools.rp_builder.examples.roles.security.name'),
      mbox: 'security.example.com.',
      txt: 'security-info.example.com.',
      description: $t('tools.rp_builder.examples.roles.security.description'),
    },
    {
      name: $t('tools.rp_builder.examples.roles.dnsAdmin.name'),
      mbox: 'dns-admin.example.com.',
      txt: 'dns-admin-info.example.com.',
      description: $t('tools.rp_builder.examples.roles.dnsAdmin.description'),
    },
  ]);

  let rpRecord = $derived.by(() => {
    if (!domain.trim()) return '';

    const cleanDomain = domain.trim().replace(/\.$/, '');
    const mbox = mailboxDname.trim() || '.';
    const txt = txtDname.trim() || '.';

    return `${cleanDomain}. IN RP ${mbox} ${txt}`;
  });

  let txtRecord = $derived.by(() => {
    if (!txtDname.trim() || txtDname === '.') return '';

    const txt = txtDname.trim().replace(/\.$/, '');
    const domainName = domain.trim().replace(/\.$/, '') || 'this domain';
    return `${txt}. IN TXT "Administrative contact for ${domainName}. Please use the mailbox specified in the RP record for contact."`;
  });

  let isValid = $derived.by(() => {
    return domain.trim() !== '' && mailboxDname.trim() !== '';
  });

  let warnings = $derived.by(() => {
    const warns = [];

    if (mailboxDname && !mailboxDname.includes('.')) {
      warns.push($t('tools.rp_builder.alerts.warnings.mailboxFqdn'));
    }

    if (txtDname && txtDname !== '.' && !txtDname.includes('.')) {
      warns.push($t('tools.rp_builder.alerts.warnings.txtFqdn'));
    }

    if (mailboxDname && mailboxDname.endsWith('.')) {
      // This is correct
    } else if (mailboxDname && mailboxDname !== '.') {
      warns.push($t('tools.rp_builder.alerts.warnings.mailboxDot'));
    }

    if (txtDname && txtDname.endsWith('.')) {
      // This is correct
    } else if (txtDname && txtDname !== '.') {
      warns.push($t('tools.rp_builder.alerts.warnings.txtDot'));
    }

    return warns;
  });

  let info = $derived.by(() => {
    const infos = [];

    if (mailboxDname === '.') {
      infos.push($t('tools.rp_builder.alerts.info.noMailbox'));
    }

    if (txtDname === '.') {
      infos.push($t('tools.rp_builder.alerts.info.noTxt'));
    }

    if (txtDname && txtDname !== '.') {
      infos.push($t('tools.rp_builder.alerts.info.txtRecord', { txtDname }));
    }

    return infos;
  });

  function copyToClipboard() {
    let content = rpRecord;
    if (txtRecord) {
      content += '\n\n; Suggested TXT record:\n' + txtRecord;
    }
    clipboard.copy(content, 'copy');
  }

  function downloadRecord() {
    let content = rpRecord;
    if (txtRecord) {
      content += '\n\n; Suggested TXT record:\n' + txtRecord;
    }
    content +=
      '\n\n; RP Record Format:\n; domain IN RP mailbox-dname txt-dname\n; mailbox-dname: domain name that encodes the email address\n; txt-dname: domain name where TXT record with contact info can be found';

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain.replace(/\.$/, '') || 'rp'}-record.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('downloaded', 'download');
  }

  function loadRoleExample(role: { name: string; description: string; mbox: string; txt: string }) {
    mailboxDname = role.mbox;
    txtDname = role.txt;
    if (!domain) domain = 'example.com';
  }

  function emailToDname(email: string) {
    if (!email.includes('@')) return email;
    const [local, domain] = email.split('@');
    return `${local.replace(/\./g, '\\.')}.${domain}.`;
  }

  function dnameToEmail(dname: string) {
    if (!dname.includes('.') || dname === '.') return '';
    const parts = dname.replace(/\.$/, '').split('.');
    if (parts.length < 2) return '';
    const domain = parts.slice(-2).join('.');
    const local = parts.slice(0, -2).join('.').replace(/\\\./g, '.');
    return `${local}@${domain}`;
  }

  let emailInput = $state('');

  function convertEmailToDname() {
    if (emailInput.trim()) {
      mailboxDname = emailToDname(emailInput.trim());
      emailInput = '';
    }
  }
</script>

<div class="rp-builder">
  <div class="card">
    <div class="card-header">
      <h1>{$t('tools.rp_builder.title')}</h1>
      <p>{$t('tools.rp_builder.subtitle')}</p>
    </div>

    <div class="card-content">
      <!-- Role Examples -->
      <details bind:open={showExamples} class="examples-section">
        <summary>
          <span>{$t('tools.rp_builder.examples.title')}</span>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </summary>
        <div class="examples-grid">
          {#each roleExamples as role (role.name)}
            <button class="example-btn" onclick={() => loadRoleExample(role)}>
              <div class="example-name">{role.name}</div>
              <div class="example-desc">{role.description}</div>
            </button>
          {/each}
        </div>
      </details>

      <div class="form-grid">
        <!-- Input Form -->
        <div class="input-section">
          <div class="field-group">
            <label for="domain" use:tooltip={$t('tools.rp_builder.form.domain.tooltip')}>
              {$t('tools.rp_builder.form.domain.label')} *
            </label>
            <input
              id="domain"
              type="text"
              bind:value={domain}
              placeholder={$t('tools.rp_builder.form.domain.placeholder')}
            />
            <small>{$t('tools.rp_builder.form.domain.help')}</small>
          </div>

          <!-- Email to Domain Name Converter -->
          <div class="converter-section">
            <h4>{$t('tools.rp_builder.form.converter.title')}</h4>
            <div class="converter-input">
              <input
                type="email"
                bind:value={emailInput}
                placeholder={$t('tools.rp_builder.form.converter.placeholder')}
              />
              <button onclick={convertEmailToDname} class="btn-success" disabled={!emailInput.trim()}>
                {$t('tools.rp_builder.form.converter.button')}
              </button>
            </div>
            <small>{$t('tools.rp_builder.form.converter.help')}</small>
          </div>

          <div class="field-group">
            <label for="mailbox" use:tooltip={$t('tools.rp_builder.form.mailbox.tooltip')}>
              {$t('tools.rp_builder.form.mailbox.label')} *
            </label>
            <input
              id="mailbox"
              type="text"
              bind:value={mailboxDname}
              placeholder={$t('tools.rp_builder.form.mailbox.placeholder')}
              class="mono-input"
            />
            <small> {$t('tools.rp_builder.form.mailbox.help')} </small>
            {#if mailboxDname && mailboxDname !== '.'}
              <div class="email-preview">
                <Mail size="12" />
                {$t('tools.rp_builder.form.mailbox.emailPreview')}
                {dnameToEmail(mailboxDname) || $t('tools.rp_builder.output.invalidFormat')}
              </div>
            {/if}
          </div>

          <div class="field-group">
            <label for="txt" use:tooltip={$t('tools.rp_builder.form.txt.tooltip')}>
              {$t('tools.rp_builder.form.txt.label')}
            </label>
            <input
              id="txt"
              type="text"
              bind:value={txtDname}
              placeholder={$t('tools.rp_builder.form.txt.placeholder')}
              class="mono-input"
            />
            <small> {$t('tools.rp_builder.form.txt.help')} </small>
          </div>
        </div>

        <!-- Output -->
        <div class="output-section">
          <div class="output-group">
            <h3>{$t('tools.rp_builder.output.rpRecord')}</h3>
            <div class="code-output">
              {#if isValid}
                <pre>{rpRecord}</pre>
              {:else}
                <p class="placeholder-text">{$t('tools.rp_builder.output.placeholder')}</p>
              {/if}
            </div>
          </div>

          {#if txtRecord}
            <div class="output-group">
              <h3>{$t('tools.rp_builder.output.txtRecord')}</h3>
              <div class="code-output txt-output">
                <pre>{txtRecord}</pre>
                <small>{$t('tools.rp_builder.output.txtHelp')}</small>
              </div>
            </div>
          {/if}

          {#if info.length > 0}
            <div class="alert alert-info">
              <h4>{$t('tools.rp_builder.alerts.info.title')}</h4>
              <ul>
                {#each info as infoItem, index (index)}
                  <li>{infoItem}</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if warnings.length > 0}
            <div class="alert alert-warning">
              <h4>{$t('tools.rp_builder.alerts.warnings.title')}</h4>
              <ul>
                {#each warnings as warning, index (index)}
                  <li>{warning}</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if isValid}
            <div class="button-group">
              <button
                onclick={copyToClipboard}
                class="btn-secondary"
                class:success={clipboard.isCopied('copy')}
                style="transform: {clipboard.isCopied('copy') ? 'scale(1.05)' : 'scale(1)'}"
              >
                {#if clipboard.isCopied('copy')}
                  <Check size="16" />
                  {$t('tools.rp_builder.buttons.copied')}
                {:else}
                  <Copy size="16" />
                  {$t('tools.rp_builder.buttons.copy')}
                {/if}
              </button>
              <button
                onclick={downloadRecord}
                class="btn-primary"
                class:success={clipboard.isCopied('download')}
                style="transform: {clipboard.isCopied('download') ? 'scale(1.05)' : 'scale(1)'}"
              >
                {#if clipboard.isCopied('download')}
                  <Check size="16" />
                  {$t('tools.rp_builder.buttons.downloaded')}
                {:else}
                  <Download size="16" />
                  {$t('tools.rp_builder.buttons.download')}
                {/if}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Information Section -->
      <div class="info-section">
        <div class="card info-card">
          <h4>{$t('tools.rp_builder.info.about.title')}</h4>
          <p>
            {$t('tools.rp_builder.info.about.description')}
          </p>
        </div>

        <div class="info-grid">
          <div class="card">
            <h4>{$t('tools.rp_builder.info.encoding.title')}</h4>
            <div class="encoding-examples">
              <p>{$t('tools.rp_builder.info.encoding.description')}</p>
              <div class="code-example">
                <div><strong>Email:</strong> {$t('tools.rp_builder.info.encoding.examples.simple.email')}</div>
                <div><strong>Encoded:</strong> {$t('tools.rp_builder.info.encoding.examples.simple.encoded')}</div>
              </div>
              <div class="code-example">
                <div><strong>Email:</strong> {$t('tools.rp_builder.info.encoding.examples.complex.email')}</div>
                <div><strong>Encoded:</strong> {$t('tools.rp_builder.info.encoding.examples.complex.encoded')}</div>
              </div>
              <small>{$t('tools.rp_builder.info.encoding.note')}</small>
            </div>
          </div>

          <div class="card">
            <h4>{$t('tools.rp_builder.info.useCases.title')}</h4>
            <ul class="use-cases">
              <li>{$t('tools.rp_builder.info.useCases.items.zone')}</li>
              <li>{$t('tools.rp_builder.info.useCases.items.server')}</li>
              <li>{$t('tools.rp_builder.info.useCases.items.security')}</li>
              <li>{$t('tools.rp_builder.info.useCases.items.automated')}</li>
              <li>{$t('tools.rp_builder.info.useCases.items.compliance')}</li>
            </ul>
          </div>
        </div>

        <div class="card best-practices-card">
          <h4>{$t('tools.rp_builder.info.bestPractices.title')}</h4>
          <ul class="best-practices">
            <li>{$t('tools.rp_builder.info.bestPractices.items.fqdn')}</li>
            <li>{$t('tools.rp_builder.info.bestPractices.items.txtRecords')}</li>
            <li>{$t('tools.rp_builder.info.bestPractices.items.upToDate')}</li>
            <li>{$t('tools.rp_builder.info.bestPractices.items.rolesBased')}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .card {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);

    .card-header {
      h1 {
        color: var(--text-primary);
        font-size: var(--font-size-2xl);
        font-weight: 700;
        margin: 0;
      }

      p {
        color: var(--text-secondary);
        margin: var(--spacing-xs) 0 0;
      }
    }
  }

  .examples-section {
    margin-bottom: var(--spacing-lg);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) var(--spacing-sm);
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--text-primary);
      font-weight: 600;
      transition: var(--transition-fast);

      &:hover {
        background: var(--surface-hover);
      }

      .chevron {
        width: 16px;
        height: 16px;
        transition: transform var(--transition-fast);
      }
    }

    &[open] summary .chevron {
      transform: rotate(180deg);
    }

    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
    }

    .example-btn {
      text-align: left;
      padding: var(--spacing-sm);
      border: none;
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      transition: var(--transition-fast);
      cursor: pointer;

      &:hover {
        border-color: var(--color-primary);
      }

      .example-name {
        font-weight: 600;
        margin-bottom: var(--spacing-xs);
      }

      .example-desc {
        font-size: var(--font-size-xs);
        opacity: 0.9;
      }
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xl);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: var(--spacing-lg);
    }
  }

  .input-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);

    .field-group {
      label {
        display: block;
        color: var(--text-primary);
        font-weight: 500;
        margin-bottom: var(--spacing-xs);
        cursor: help;
      }

      input {
        width: 100%;
        padding: var(--spacing-sm);
        background: var(--bg-primary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        transition: var(--transition-fast);

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-dark);
        }
      }

      .mono-input {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
      }

      small {
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
        margin-top: var(--spacing-xs);
        display: block;
      }

      .email-preview {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        color: var(--color-info);
        font-size: var(--font-size-xs);
        margin-top: var(--spacing-xs);
      }
    }
  }

  .converter-section {
    padding: var(--spacing-sm);
    background: color-mix(in srgb, var(--color-success) 8%, transparent);
    border: 1px solid var(--color-success);
    border-radius: var(--radius-md);

    h4 {
      color: var(--color-success);
      font-weight: 600;
      margin: 0 0 var(--spacing-sm);
    }

    .converter-input {
      display: flex;
      gap: var(--spacing-sm);

      input {
        flex: 1;
        padding: var(--spacing-xs);
        border: 1px solid var(--color-success);
        border-radius: var(--radius-sm);
        background: var(--bg-primary);
        color: var(--text-primary);

        &:focus {
          outline: none;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-success), transparent 80%);
        }
      }
    }

    small {
      color: var(--color-success);
      font-size: var(--font-size-xs);
      margin-top: var(--spacing-xs);
      display: block;
    }
  }

  .output-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);

    .output-group {
      .code-output {
        padding: var(--spacing-md);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);

        pre {
          font-family: var(--font-mono);
          font-size: var(--font-size-sm);
          color: var(--text-primary);
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
        }

        .placeholder-text {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          margin: 0;
        }

        small {
          color: var(--text-secondary);
          font-size: var(--font-size-xs);
          margin-top: var(--spacing-sm);
          display: block;
        }
      }

      .txt-output {
        background: color-mix(in srgb, var(--color-info) 8%, transparent);
        border-color: var(--color-info);

        pre {
          color: var(--color-info);
        }

        small {
          color: var(--color-info);
        }
      }
    }
  }

  .alert {
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-md);

    h4 {
      font-weight: 600;
      margin: 0 0 var(--spacing-xs);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-md);

      li {
        margin-bottom: var(--spacing-xs);
      }
    }

    &.alert-info {
      background: color-mix(in srgb, var(--color-info) 8%, transparent);
      border: 1px solid var(--color-info);
      color: var(--color-info);
    }

    &.alert-warning {
      background: color-mix(in srgb, var(--color-warning) 8%, transparent);
      border: 1px solid var(--color-warning);
      color: var(--color-warning);
    }
  }

  .button-group {
    display: flex;
    gap: var(--spacing-sm);

    @media (max-width: 480px) {
      flex-direction: column;
    }
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-dark);
    }

    &.success {
      border-color: var(--color-success);
      color: var(--color-success);
    }
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-fast);

    &:hover {
      background: var(--color-primary);
      color: var(--bg-primary);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-dark);
    }

    &.success {
      background: color-mix(in srgb, var(--color-success) 8%, transparent);

      &:hover {
        background: var(--color-success-light);
      }
    }
  }

  .btn-success {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: color-mix(in srgb, var(--color-success) 8%, transparent);
    color: var(--text-primary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--color-success-light);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .info-section {
    margin-top: var(--spacing-xl);

    .info-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      margin-bottom: var(--spacing-lg);
      flex-direction: column;
      align-items: baseline;

      h4 {
        color: var(--text-primary);
        font-weight: 600;
        margin: 0 0 var(--spacing-sm);
      }

      p {
        color: var(--text-primary);
        line-height: 1.6;
        margin: 0;
      }
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);

      .card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);

        h4 {
          color: var(--text-primary);
          font-weight: 600;
          margin: 0 0 var(--spacing-sm);
        }

        .encoding-examples {
          p {
            color: var(--text-secondary);
            margin-bottom: var(--spacing-sm);
          }

          .code-example {
            padding: var(--spacing-xs);
            background: var(--bg-primary);
            border: 1px solid var(--border-secondary);
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
            font-size: var(--font-size-xs);
            margin-bottom: var(--spacing-xs);

            div {
              color: var(--text-primary);
            }
          }

          small {
            color: var(--text-secondary);
            font-size: var(--font-size-xs);
          }
        }

        .use-cases {
          margin: 0;
          padding-left: var(--spacing-md);

          li {
            color: var(--text-secondary);
            margin-bottom: var(--spacing-xs);
            position: relative;

            &::marker {
              color: var(--color-primary);
            }
          }
        }
      }
    }

    .best-practices-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);

      h4 {
        color: var(--text-primary);
        font-weight: 600;
        margin: 0 0 var(--spacing-sm);
      }

      .best-practices {
        margin: 0;
        padding-left: var(--spacing-md);

        li {
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);

          &::marker {
            color: var(--color-primary);
          }
        }
      }
    }
  }
</style>
