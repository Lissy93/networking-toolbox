<script lang="ts">
  import { Copy, Download, Check, Mail } from 'lucide-svelte';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';

  let domain = $state('');
  let mailboxDname = $state('admin.example.com.');
  let txtDname = $state('admin-info.example.com.');
  let showExamples = $state(false);

  const clipboard = useClipboard();

  const roleExamples = [
    {
      name: 'System Administrator',
      mbox: 'admin.example.com.',
      txt: 'admin-info.example.com.',
      description: 'Primary system administrator contact',
    },
    {
      name: 'Webmaster',
      mbox: 'webmaster.example.com.',
      txt: 'webmaster-info.example.com.',
      description: 'Website administrator contact',
    },
    {
      name: 'Security Contact',
      mbox: 'security.example.com.',
      txt: 'security-info.example.com.',
      description: 'Security incident response contact',
    },
    {
      name: 'DNS Administrator',
      mbox: 'dns-admin.example.com.',
      txt: 'dns-admin-info.example.com.',
      description: 'DNS zone administrator',
    },
  ];

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
    return `${txt}. IN TXT "Administrative contact for ${domain.trim().replace(/\.$/, '') || 'this domain'}. Please use the mailbox specified in the RP record for contact."`;
  });

  let isValid = $derived.by(() => {
    return domain.trim() !== '' && mailboxDname.trim() !== '';
  });

  let warnings = $derived.by(() => {
    const warns = [];

    if (mailboxDname && !mailboxDname.includes('.')) {
      warns.push('Mailbox domain name should be a fully qualified domain name');
    }

    if (txtDname && txtDname !== '.' && !txtDname.includes('.')) {
      warns.push('TXT domain name should be a fully qualified domain name or "."');
    }

    if (mailboxDname && mailboxDname.endsWith('.')) {
      // This is correct
    } else if (mailboxDname && mailboxDname !== '.') {
      warns.push('Domain names in RP records should end with a dot (.) for absolute names');
    }

    if (txtDname && txtDname.endsWith('.')) {
      // This is correct
    } else if (txtDname && txtDname !== '.') {
      warns.push('TXT domain name should end with a dot (.) for absolute names');
    }

    return warns;
  });

  let info = $derived.by(() => {
    const infos = [];

    if (mailboxDname === '.') {
      infos.push('Using "." for mailbox means no mailbox is specified');
    }

    if (txtDname === '.') {
      infos.push('Using "." for TXT means no additional text information is provided');
    }

    if (txtDname && txtDname !== '.') {
      infos.push(`Remember to create the TXT record at ${txtDname} with contact information`);
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
      <h1>RP Record Builder</h1>
      <p>Create RP (Responsible Person) records to specify administrative contacts for your domains</p>
    </div>

    <div class="card-content">
      <!-- Role Examples -->
      <details bind:open={showExamples} class="examples-section">
        <summary>
          <span>Common Role Examples</span>
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
            <label for="domain" use:tooltip={'The domain name for which this RP record will be created'}>
              Domain Name *
            </label>
            <input id="domain" type="text" bind:value={domain} placeholder="example.com" />
            <small>The domain name for this RP record</small>
          </div>

          <!-- Email to Domain Name Converter -->
          <div class="converter-section">
            <h4>Email to Domain Name Converter</h4>
            <div class="converter-input">
              <input type="email" bind:value={emailInput} placeholder="admin@example.com" />
              <button onclick={convertEmailToDname} class="btn-success" disabled={!emailInput.trim()}> Convert </button>
            </div>
            <small>Enter an email to automatically convert to domain name format</small>
          </div>

          <div class="field-group">
            <label
              for="mailbox"
              use:tooltip={"Domain name encoding the email address. Use '.' for no contact specified."}
            >
              Mailbox Domain Name *
            </label>
            <input
              id="mailbox"
              type="text"
              bind:value={mailboxDname}
              placeholder="admin.example.com."
              class="mono-input"
            />
            <small> Domain name encoding the email address (use "." for no contact) </small>
            {#if mailboxDname && mailboxDname !== '.'}
              <div class="email-preview">
                <Mail size="12" />
                Email: {dnameToEmail(mailboxDname) || 'Invalid format'}
              </div>
            {/if}
          </div>

          <div class="field-group">
            <label
              for="txt"
              use:tooltip={"Domain name where TXT record with additional contact information can be found. Use '.' for no additional info."}
            >
              TXT Domain Name
            </label>
            <input
              id="txt"
              type="text"
              bind:value={txtDname}
              placeholder="admin-info.example.com."
              class="mono-input"
            />
            <small> Domain name where TXT record with contact info can be found (use "." for none) </small>
          </div>
        </div>

        <!-- Output -->
        <div class="output-section">
          <div class="output-group">
            <h3>Generated RP Record</h3>
            <div class="code-output">
              {#if isValid}
                <pre>{rpRecord}</pre>
              {:else}
                <p class="placeholder-text">Fill in the required fields to generate the RP record</p>
              {/if}
            </div>
          </div>

          {#if txtRecord}
            <div class="output-group">
              <h3>Suggested TXT Record</h3>
              <div class="code-output txt-output">
                <pre>{txtRecord}</pre>
                <small>This TXT record should be created at the specified domain</small>
              </div>
            </div>
          {/if}

          {#if info.length > 0}
            <div class="alert alert-info">
              <h4>Information</h4>
              <ul>
                {#each info as infoItem, index (index)}
                  <li>{infoItem}</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if warnings.length > 0}
            <div class="alert alert-warning">
              <h4>Configuration Warnings</h4>
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
                  Copied!
                {:else}
                  <Copy size="16" />
                  Copy Records
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
                  Downloaded!
                {:else}
                  <Download size="16" />
                  Download
                {/if}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Information Section -->
      <div class="info-section">
        <div class="card info-card">
          <h4>About RP Records</h4>
          <p>
            RP (Responsible Person) records identify the responsible person for a domain or host. They specify both a
            mailbox (encoded as a domain name) and optionally point to a TXT record with additional contact information.
            This allows automated discovery of administrative contacts.
          </p>
        </div>

        <div class="info-grid">
          <div class="card">
            <h4>Email Encoding</h4>
            <div class="encoding-examples">
              <p>Email addresses are encoded as domain names:</p>
              <div class="code-example">
                <div><strong>Email:</strong> admin@example.com</div>
                <div><strong>Encoded:</strong> admin.example.com.</div>
              </div>
              <div class="code-example">
                <div><strong>Email:</strong> user.name@example.com</div>
                <div><strong>Encoded:</strong> user\.name.example.com.</div>
              </div>
              <small>Dots in the local part are escaped with backslashes</small>
            </div>
          </div>

          <div class="card">
            <h4>Common Use Cases</h4>
            <ul class="use-cases">
              <li>Zone administrator contact</li>
              <li>Server administrator contact</li>
              <li>Security incident response</li>
              <li>Automated contact discovery</li>
              <li>Compliance requirements</li>
            </ul>
          </div>
        </div>

        <div class="card best-practices-card">
          <h4>Best Practices</h4>
          <ul class="best-practices">
            <li>Always use fully qualified domain names ending with a dot</li>
            <li>Create corresponding TXT records with detailed contact information</li>
            <li>Keep contact information up to date and monitored</li>
            <li>Consider creating role-based contacts rather than personal ones</li>
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
