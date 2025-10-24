<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { validateDNSLookupInput, formatDNSError } from '$lib/utils/dns-validation.js';
  import { useDiagnosticState, useClipboard, useExamples, useSimpleValidation } from '$lib/composables';
  import ExamplesCard from '$lib/components/common/ExamplesCard.svelte';
  import ActionButton from '$lib/components/common/ActionButton.svelte';
  import ResultsCard from '$lib/components/common/ResultsCard.svelte';
  import ErrorCard from '$lib/components/common/ErrorCard.svelte';
  import WarningCard from '$lib/components/common/WarningCard.svelte';
  import '../../../../styles/diagnostics-pages.scss';

  let domainName = $state('example.com');
  let recordType = $state('A');
  let resolver = $state('cloudflare');
  let customResolver = $state('');
  let useCustomResolver = $state(false);

  const diagnosticState = useDiagnosticState<any>();
  const clipboard = useClipboard();

  // Reactive validation state
  const validation = useSimpleValidation(() => {
    const validationResult = validateDNSLookupInput(domainName, useCustomResolver, customResolver);
    return validationResult.isValid;
  });

  const recordTypes = [
    { value: 'A', label: 'A', description: 'IPv4 address records' },
    { value: 'AAAA', label: 'AAAA', description: 'IPv6 address records' },
    { value: 'CNAME', label: 'CNAME', description: 'Canonical name records' },
    { value: 'MX', label: 'MX', description: 'Mail exchange records' },
    { value: 'TXT', label: 'TXT', description: 'Text records' },
    { value: 'NS', label: 'NS', description: 'Name server records' },
    { value: 'SOA', label: 'SOA', description: 'Start of authority records' },
    { value: 'CAA', label: 'CAA', description: 'Certificate authority authorization' },
    { value: 'PTR', label: 'PTR', description: 'Pointer records' },
    { value: 'SRV', label: 'SRV', description: 'Service records' },
  ];

  const resolvers = [
    { value: 'cloudflare', label: 'Cloudflare (1.1.1.1)' },
    { value: 'google', label: 'Google (8.8.8.8)' },
    { value: 'quad9', label: 'Quad9 (9.9.9.9)' },
    { value: 'opendns', label: 'OpenDNS (208.67.222.222)' },
  ];

  const examplesList = [
    { domain: 'example.com', type: 'A', description: 'Basic A record lookup' },
    { domain: 'google.com', type: 'MX', description: 'Mail server records' },
    { domain: 'cloudflare.com', type: 'AAAA', description: 'IPv6 addresses' },
    { domain: '_dmarc.github.com', type: 'TXT', description: 'DMARC policy record' },
    { domain: 'microsoft.com', type: 'TXT', description: 'Multiple TXT records (SPF, verification)' },
    { domain: 'netflix.com', type: 'NS', description: 'Name server records' },
  ];

  const examples = useExamples(examplesList);

  async function performLookup() {
    diagnosticState.startOperation();

    // Client-side validation
    const validation = validateDNSLookupInput(domainName, useCustomResolver, customResolver);
    if (!validation.isValid) {
      diagnosticState.setError(validation.error || 'Invalid input');
      return;
    }

    try {
      const resolverOpts =
        useCustomResolver && customResolver ? { server: customResolver.trim(), preferDoH: false } : { doh: resolver };

      const response = await fetch('/api/internal/diagnostics/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lookup',
          name: domainName.trim(),
          type: recordType,
          resolverOpts,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Try to parse JSON response
        let responseData = null;
        try {
          responseData = JSON.parse(errorText);
        } catch {
          // JSON parsing failed, will use status-based fallback
        }

        // Handle 404 as "no records found" (warning, not error)
        if (response.status === 404 && responseData?.noRecords) {
          diagnosticState.setResults({
            noRecords: true,
            message: responseData.message,
            name: responseData.name,
            type: responseData.type,
            resolver: useCustomResolver && customResolver ? customResolver.trim() : resolver,
          });
          return; // Don't throw error, just set results
        }

        // Helper to check if error message is helpful
        const isUnhelpfulError = (msg: string) => {
          return !msg || msg.includes('undefined') || msg === 'null' || msg.trim().length === 0;
        };

        // Use API error message if available and helpful
        if (responseData?.error && !isUnhelpfulError(responseData.error)) {
          throw new Error(responseData.error);
        }

        // Use API message if available and helpful
        if (responseData?.message && !isUnhelpfulError(responseData.message)) {
          throw new Error(responseData.message);
        }

        // Fallback to status-based messages
        if (response.status === 400) {
          throw new Error('Invalid request. Please check your input values.');
        } else if (response.status === 500 || response.status === 403) {
          throw new Error('DNS lookup service temporarily unavailable. Please try again.');
        }

        throw new Error(`Lookup failed (${response.status})`);
      }

      const data = await response.json();
      diagnosticState.setResults(data);
    } catch (err: unknown) {
      // Enhanced error handling using utility
      diagnosticState.setError(formatDNSError(err));
    }
  }

  function loadExample(example: (typeof examplesList)[0], index: number) {
    domainName = example.domain;
    recordType = example.type;
    examples.select(index);
    performLookup();
  }

  async function copyResults() {
    if (!diagnosticState.results?.Answer?.length) return;
    const text = diagnosticState.results.Answer.map((r: unknown) => (r as { data: string }).data).join('\n');
    await clipboard.copy(text);
  }
</script>

<div class="card">
  <header class="card-header">
    <h1>DNS Lookup Tool</h1>
    <p>
      Resolve DNS records for any domain using various public resolvers or custom DNS servers. Supports all common
      record types with detailed response information.
    </p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    getLabel={(ex) => `${ex.domain} (${ex.type})`}
    getDescription={(ex) => ex.description}
    getTooltip={(ex) => `Query ${ex.type} records for ${ex.domain}`}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>Lookup Configuration</h3>
    </div>
    <div class="card-content">
      <!-- First Row: Domain Name -->
      <div class="form-row">
        <div class="form-group">
          <label for="domain" use:tooltip={'Enter the domain name to query'}> Domain Name </label>
          <input
            id="domain"
            type="text"
            bind:value={domainName}
            placeholder="example.com"
            onchange={() => {
              examples.clear();
              if (domainName) performLookup();
            }}
          />
        </div>
      </div>

      <!-- Second Row: Record Type and DNS Resolver -->
      <div class="form-row two-columns">
        <div class="form-group">
          <label for="type" use:tooltip={'Select the DNS record type to query'}> Record Type </label>
          <select
            id="type"
            bind:value={recordType}
            onchange={() => {
              examples.clear();
              if (domainName) performLookup();
            }}
          >
            {#each recordTypes as type, index (index)}
              <option value={type.value} title={type.description}>{type.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="dns-resolver" use:tooltip={'Choose a DNS resolver to use for the query'}> DNS Resolver </label>
          {#if !useCustomResolver}
            <select
              id="dns-resolver"
              bind:value={resolver}
              onchange={() => {
                examples.clear();
                if (domainName) performLookup();
              }}
            >
              {#each resolvers as res, index (index)}
                <option value={res.value}>{res.label}</option>
              {/each}
            </select>
          {/if}
          {#if useCustomResolver}
            <input
              type="text"
              bind:value={customResolver}
              placeholder="8.8.8.8 or custom IP"
              onchange={() => {
                examples.clear();
                if (domainName) performLookup();
              }}
            />
          {/if}
          <label class="checkbox-group">
            <input
              type="checkbox"
              bind:checked={useCustomResolver}
              onchange={() => {
                examples.clear();
                if (domainName) performLookup();
              }}
            />
            Use custom resolver
          </label>
        </div>
      </div>

      <div class="action-section">
        <ActionButton
          loading={diagnosticState.loading}
          disabled={!validation.isValid}
          icon="search"
          loadingText="Performing Lookup..."
          onclick={performLookup}
        >
          Lookup DNS Records
        </ActionButton>
      </div>
    </div>
  </div>

  <!-- Warnings -->
  <WarningCard warnings={diagnosticState.results?.warnings || []} />

  <!-- No Records Warning -->
  {#if diagnosticState.results?.noRecords}
    <div class="card warning-card">
      <div class="card-content">
        <div class="warning-content">
          <Icon name="info" size="md" />
          <div>
            <strong>No Records Found</strong>
            <p>{diagnosticState.results.message}</p>
            <p class="help-text">Using resolver: {diagnosticState.results.resolver}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if diagnosticState.results && !diagnosticState.results.noRecords}
    <ResultsCard
      title="DNS Records Found"
      onCopy={copyResults}
      copied={clipboard.isCopied()}
      showCopyButton={diagnosticState.results.Answer?.length > 0}
    >
      {#if diagnosticState.results.Answer?.length > 0}
        <div class="records-list">
          {#each diagnosticState.results.Answer as record, i (i)}
            <div class="record-item">
              <div class="record-data mono">{record.data}</div>
              {#if record.TTL}
                <div class="record-ttl" use:tooltip={'Time To Live - how long this record can be cached'}>
                  TTL: {record.TTL}s
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="card warning-card no-records">
          <div class="warning-content">
            <Icon name="alert-triangle" size="md" />
            <p>No records found for <code>{domainName}</code> ({recordType})</p>
          </div>
        </div>
      {/if}
    </ResultsCard>
  {/if}

  <ErrorCard title="Lookup Failed" error={diagnosticState.error} />
</div>

<style lang="scss">
  // Styles now use diagnostics-pages.scss
  // Most styles moved to shared stylesheet for reusability
</style>
