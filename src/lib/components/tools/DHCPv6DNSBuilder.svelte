<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import { useClipboard } from '$lib/composables';
  import {
    type DNSv6Config,
    type DNSv6Result,
    buildDNSv6Options,
    getDefaultDNSv6Config,
    validateDNSv6Config,
    DNSv6_EXAMPLES,
  } from '$lib/utils/dhcpv6-dns-rfc3646';

  let config = $state<DNSv6Config>({
    ...getDefaultDNSv6Config(),
    dnsServers: [''],
    searchDomains: [''],
  });
  let result = $state<DNSv6Result | null>(null);
  let validationErrors = $state<string[]>([]);
  let selectedExampleIndex = $state<number | null>(null);

  const clipboard = useClipboard();

  interface DNSv6Example {
    label: string;
    config: DNSv6Config;
    description: string;
  }

  const examples: DNSv6Example[] = [
    {
      label: 'Google Public DNS',
      config: DNSv6_EXAMPLES[0],
      description: 'Google Public DNS servers with example.com search domains',
    },
    {
      label: 'Cloudflare DNS',
      config: DNSv6_EXAMPLES[1],
      description: 'Cloudflare 1.1.1.1 DNS with local search domain',
    },
    {
      label: 'Quad9 DNS',
      config: DNSv6_EXAMPLES[2],
      description: 'Quad9 DNS with corporate search domains',
    },
    {
      label: 'Local Network',
      config: DNSv6_EXAMPLES[3],
      description: 'Local ULA DNS server with home.arpa domain',
    },
  ];

  function loadExample(example: DNSv6Example, index: number): void {
    config = {
      dnsServers: [...example.config.dnsServers],
      searchDomains: [...example.config.searchDomains],
    };
    selectedExampleIndex = index;
  }

  function checkIfExampleStillMatches(): void {
    if (selectedExampleIndex === null) return;

    const example = examples[selectedExampleIndex];
    if (!example) {
      selectedExampleIndex = null;
      return;
    }

    const dnsMatch =
      config.dnsServers.length === example.config.dnsServers.length &&
      config.dnsServers.every((s, i) => s === example.config.dnsServers[i]);

    const searchMatch =
      config.searchDomains.length === example.config.searchDomains.length &&
      config.searchDomains.every((d, i) => d === example.config.searchDomains[i]);

    if (!dnsMatch || !searchMatch) {
      selectedExampleIndex = null;
    }
  }

  function addDNSServer(): void {
    config.dnsServers = [...config.dnsServers, ''];
  }

  function removeDNSServer(index: number): void {
    if (config.dnsServers.length > 1) {
      config.dnsServers = config.dnsServers.filter((_, i) => i !== index);
    } else {
      config.dnsServers = [''];
    }
  }

  function addSearchDomain(): void {
    config.searchDomains = [...config.searchDomains, ''];
  }

  function removeSearchDomain(index: number): void {
    if (config.searchDomains.length > 1) {
      config.searchDomains = config.searchDomains.filter((_, i) => i !== index);
    } else {
      config.searchDomains = [''];
    }
  }

  $effect(() => {
    // Read config properties to trigger effect when they change
    const currentDNSServers = [...config.dnsServers];
    const currentSearchDomains = [...config.searchDomains];

    // Update validationErrors and result without tracking them (prevents infinite loop)
    untrack(() => {
      const currentConfig: DNSv6Config = {
        dnsServers: currentDNSServers,
        searchDomains: currentSearchDomains,
      };

      // Check if form is in initial empty state
      const isInitialState =
        currentConfig.dnsServers.length === 1 &&
        !currentConfig.dnsServers[0].trim() &&
        currentConfig.searchDomains.length === 1 &&
        !currentConfig.searchDomains[0].trim();

      if (isInitialState) {
        validationErrors = [];
        result = null;
      } else {
        validationErrors = validateDNSv6Config(currentConfig);

        if (validationErrors.length === 0) {
          try {
            result = buildDNSv6Options(currentConfig);
          } catch (e) {
            validationErrors = [e instanceof Error ? e.message : String(e)];
            result = null;
          }
        } else {
          result = null;
        }
      }

      checkIfExampleStillMatches();
    });
  });
</script>

<ToolContentContainer
  title="DHCPv6 DNS Options (RFC 3646)"
  description="Configure DNS servers (Option 23) and search domains (Option 24) for DHCPv6 clients. Supports IPv6 DNS servers and multiple search domains."
>
  <ExamplesCard
    {examples}
    onSelect={loadExample}
    getLabel={(ex) => ex.label}
    getDescription={(ex) => ex.description}
    selectedIndex={selectedExampleIndex}
  />

  <div class="card input-card">
    <div class="card-header">
      <h3>Option 23: DNS Recursive Name Servers</h3>
      <p class="help-text">IPv6 addresses of DNS servers for client name resolution</p>
    </div>
    <div class="card-content">
      {#each config.dnsServers as _, i (`dns-${i}`)}
        <div class="server-row">
          <div class="input-group flex-grow">
            <label for="dns-server-{i}">
              <Icon name="server" size="sm" />
              DNS Server {i + 1}
            </label>
            <input
              id="dns-server-{i}"
              type="text"
              bind:value={config.dnsServers[i]}
              placeholder="2001:4860:4860::8888"
            />
          </div>
          <button
            type="button"
            class="btn-icon btn-remove"
            onclick={() => removeDNSServer(i)}
            disabled={config.dnsServers.length === 1}
            aria-label="Remove DNS server"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>
      {/each}

      <button type="button" class="btn-add" onclick={addDNSServer}>
        <Icon name="plus" size="sm" />
        Add DNS Server
      </button>
    </div>
  </div>

  <div class="card input-card">
    <div class="card-header">
      <h3>Option 24: Domain Search List</h3>
      <p class="help-text">DNS search domains for hostname resolution</p>
    </div>
    <div class="card-content">
      {#each config.searchDomains as _, i (`domain-${i}`)}
        <div class="server-row">
          <div class="input-group flex-grow">
            <label for="search-domain-{i}">
              <Icon name="globe" size="sm" />
              Search Domain {i + 1}
            </label>
            <input id="search-domain-{i}" type="text" bind:value={config.searchDomains[i]} placeholder="example.com" />
          </div>
          <button
            type="button"
            class="btn-icon btn-remove"
            onclick={() => removeSearchDomain(i)}
            disabled={config.searchDomains.length === 1}
            aria-label="Remove search domain"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>
      {/each}

      <button type="button" class="btn-add" onclick={addSearchDomain}>
        <Icon name="plus" size="sm" />
        Add Search Domain
      </button>
    </div>
  </div>

  {#if validationErrors.length > 0}
    <div class="card errors-card">
      <h3>Validation Errors</h3>
      {#each validationErrors as error, i (i)}
        <div class="error-message">
          <Icon name="alert-triangle" size="sm" />
          {error}
        </div>
      {/each}
    </div>
  {/if}

  {#if result && validationErrors.length === 0}
    {#if result.option23}
      <div class="card results">
        <h3>Option 23: DNS Recursive Name Servers</h3>

        <div class="summary-card">
          <div><strong>Total Length:</strong> {result.option23.totalLength} bytes</div>
          <div><strong>Servers:</strong> {result.option23.servers.length}</div>
        </div>

        <div class="servers-section">
          <h4>DNS Servers</h4>
          {#each result.option23.servers as server, i (i)}
            <div class="server-item">
              <Icon name="server" size="sm" />
              <span class="field-label">Server {i + 1}:</span>
              <span class="field-value">{server}</span>
            </div>
          {/each}
        </div>

        <div class="output-group">
          <div class="output-header">
            <h4>Hex-Encoded (Compact)</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('opt23-hex')}
              onclick={() => clipboard.copy(result!.option23!.hexEncoded, 'opt23-hex')}
            >
              <Icon name={clipboard.isCopied('opt23-hex') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('opt23-hex') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.option23.hexEncoded}</pre>
        </div>

        <div class="output-group">
          <div class="output-header">
            <h4>Wire Format (Spaced)</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('opt23-wire')}
              onclick={() => clipboard.copy(result!.option23!.wireFormat, 'opt23-wire')}
            >
              <Icon name={clipboard.isCopied('opt23-wire') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('opt23-wire') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.option23.wireFormat}</pre>
        </div>
      </div>
    {/if}

    {#if result.option24}
      <div class="card results">
        <h3>Option 24: Domain Search List</h3>

        <div class="summary-card">
          <div><strong>Total Length:</strong> {result.option24.totalLength} bytes</div>
          <div><strong>Domains:</strong> {result.option24.domains.length}</div>
        </div>

        <div class="servers-section">
          <h4>Search Domains</h4>
          {#each result.option24.domains as domain, i (i)}
            <div class="server-item">
              <Icon name="globe" size="sm" />
              <span class="field-label">Domain {i + 1}:</span>
              <span class="field-value">{domain}</span>
            </div>
          {/each}
        </div>

        <div class="output-group">
          <div class="output-header">
            <h4>Hex-Encoded (Compact)</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('opt24-hex')}
              onclick={() => clipboard.copy(result!.option24!.hexEncoded, 'opt24-hex')}
            >
              <Icon name={clipboard.isCopied('opt24-hex') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('opt24-hex') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.option24.hexEncoded}</pre>
        </div>

        <div class="output-group">
          <div class="output-header">
            <h4>Wire Format (Spaced)</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('opt24-wire')}
              onclick={() => clipboard.copy(result!.option24!.wireFormat, 'opt24-wire')}
            >
              <Icon name={clipboard.isCopied('opt24-wire') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('opt24-wire') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.option24.wireFormat}</pre>
        </div>

        {#if result.option24.breakdown.length > 0}
          <div class="breakdown-section">
            <h4>Domain Encoding Breakdown</h4>
            {#each result.option24.breakdown as item, i (i)}
              <div class="breakdown-item">
                <div class="breakdown-label">{item.domain}</div>
                <div class="breakdown-hex">{item.wireFormat}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if result.examples.keaDhcp6}
      <div class="card results">
        <h3>Configuration Example</h3>

        <div class="output-group">
          <div class="output-header">
            <h4>Kea DHCPv6 Configuration</h4>
            <button
              type="button"
              class="copy-btn"
              class:copied={clipboard.isCopied('kea')}
              onclick={() => clipboard.copy(result!.examples.keaDhcp6!, 'kea')}
            >
              <Icon name={clipboard.isCopied('kea') ? 'check' : 'copy'} size="xs" />
              {clipboard.isCopied('kea') ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre class="output-value code-block">{result.examples.keaDhcp6}</pre>
        </div>
      </div>
    {/if}

    <div class="card results info-card">
      <h3>About RFC 3646</h3>
      <p>
        RFC 3646 defines DNS configuration options for DHCPv6, allowing IPv6 clients to automatically discover DNS
        servers and search domains.
      </p>
      <ul>
        <li>
          <strong>Option 23:</strong> DNS Recursive Name Server - List of IPv6 DNS server addresses (16 bytes each)
        </li>
        <li>
          <strong>Option 24:</strong> Domain Search List - DNS search domains encoded in DNS wire format (length-prefixed
          labels)
        </li>
      </ul>
      <p>
        These options are essential for IPv6 network autoconfiguration, enabling clients to resolve hostnames without
        manual DNS configuration.
      </p>
    </div>
  {/if}
</ToolContentContainer>

<style lang="scss">
  .card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-primary);
    margin-bottom: var(--spacing-lg);

    &.input-card {
      background: var(--bg-tertiary);
      .card-header {
        margin-bottom: var(--spacing-sm);
      }
    }

    h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin: 0 0 var(--spacing-sm);
      font-size: 1.25rem;
      color: var(--text-primary);
    }

    h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .card-header {
    .help-text {
      margin: var(--spacing-xs) 0 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-style: italic;
    }
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    &.flex-grow {
      flex: 1;
    }

    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    input {
      padding: var(--spacing-sm);
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.9375rem;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary), transparent 90%);
      }
    }
  }

  .server-row {
    display: flex;
    gap: var(--spacing-sm);
    align-items: flex-end;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    height: fit-content;

    &:hover:not(:disabled) {
      background: var(--surface-hover);
      border-color: var(--color-primary);
    }

    &.btn-remove {
      color: var(--color-error);

      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-error), transparent 90%);
        border-color: var(--color-error);
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn-add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: transparent;
    border: 1px dashed var(--border-secondary);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .errors-card {
    background: color-mix(in srgb, var(--color-error), transparent 95%);
    border-color: var(--color-error);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    color: var(--color-error);
    font-size: 0.9375rem;
  }

  .results {
    background: var(--bg-tertiary);
    animation: slideIn 0.3s ease-out;

    &.info-card {
      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: var(--spacing-sm) 0;
      }

      ul {
        margin: var(--spacing-md) 0;
        padding-left: var(--spacing-xl);
        color: var(--text-secondary);
        line-height: 1.8;

        li {
          margin: var(--spacing-xs) 0;

          strong {
            color: var(--text-primary);
          }
        }
      }
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .output-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-lg);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &.copied {
      background: color-mix(in srgb, var(--color-success), transparent 90%);
      border-color: var(--color-success);
      color: var(--color-success);
    }
  }

  .output-value {
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-primary);
    overflow-x: auto;
  }

  .code-block {
    white-space: pre;
    word-break: normal;
  }

  .summary-card {
    display: flex;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
    padding: var(--spacing-md);
    background: color-mix(in srgb, var(--color-info), transparent 95%);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    font-size: 0.9375rem;

    div {
      strong {
        color: var(--text-primary);
      }
    }

    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-xs);
    }
  }

  .servers-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);

    h4 {
      margin: 0 0 var(--spacing-xs);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .server-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-size: 0.9375rem;

    .field-label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .field-value {
      font-family: var(--font-mono);
      color: var(--text-primary);
    }
  }

  .breakdown-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    h4 {
      margin-bottom: var(--spacing-sm);
    }
  }

  .breakdown-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;

    .breakdown-label {
      font-weight: 500;
      color: var(--text-secondary);
      grid-column: 1;
    }

    .breakdown-hex {
      font-family: var(--font-mono);
      color: var(--color-primary);
      grid-column: 2;
    }
  }
</style>
