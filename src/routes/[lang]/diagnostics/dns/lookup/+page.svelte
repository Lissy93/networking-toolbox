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
  import { t } from '$lib/stores/language';
  import '../../../../../styles/diagnostics-pages.scss';

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

  const recordTypes = $derived([
    {
      value: 'A',
      label: $t('diagnostics/dns-lookup.recordTypes.A.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.A.description'),
    },
    {
      value: 'AAAA',
      label: $t('diagnostics/dns-lookup.recordTypes.AAAA.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.AAAA.description'),
    },
    {
      value: 'CNAME',
      label: $t('diagnostics/dns-lookup.recordTypes.CNAME.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.CNAME.description'),
    },
    {
      value: 'MX',
      label: $t('diagnostics/dns-lookup.recordTypes.MX.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.MX.description'),
    },
    {
      value: 'TXT',
      label: $t('diagnostics/dns-lookup.recordTypes.TXT.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.TXT.description'),
    },
    {
      value: 'NS',
      label: $t('diagnostics/dns-lookup.recordTypes.NS.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.NS.description'),
    },
    {
      value: 'SOA',
      label: $t('diagnostics/dns-lookup.recordTypes.SOA.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.SOA.description'),
    },
    {
      value: 'CAA',
      label: $t('diagnostics/dns-lookup.recordTypes.CAA.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.CAA.description'),
    },
    {
      value: 'PTR',
      label: $t('diagnostics/dns-lookup.recordTypes.PTR.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.PTR.description'),
    },
    {
      value: 'SRV',
      label: $t('diagnostics/dns-lookup.recordTypes.SRV.label'),
      description: $t('diagnostics/dns-lookup.recordTypes.SRV.description'),
    },
  ]);

  const resolvers = $derived([
    { value: 'cloudflare', label: $t('diagnostics/dns-lookup.resolvers.cloudflare') },
    { value: 'google', label: $t('diagnostics/dns-lookup.resolvers.google') },
    { value: 'quad9', label: $t('diagnostics/dns-lookup.resolvers.quad9') },
    { value: 'opendns', label: $t('diagnostics/dns-lookup.resolvers.opendns') },
  ]);

  const examplesList = $derived([
    {
      domain: $t('diagnostics/dns-lookup.examples.items.exampleA.domain'),
      type: $t('diagnostics/dns-lookup.examples.items.exampleA.type'),
      description: $t('diagnostics/dns-lookup.examples.items.exampleA.description'),
      tooltip: $t('diagnostics/dns-lookup.examples.items.exampleA.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-lookup.examples.items.googleMX.domain'),
      type: $t('diagnostics/dns-lookup.examples.items.googleMX.type'),
      description: $t('diagnostics/dns-lookup.examples.items.googleMX.description'),
      tooltip: $t('diagnostics/dns-lookup.examples.items.googleMX.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-lookup.examples.items.cloudflareAAAA.domain'),
      type: $t('diagnostics/dns-lookup.examples.items.cloudflareAAAA.type'),
      description: $t('diagnostics/dns-lookup.examples.items.cloudflareAAAA.description'),
      tooltip: $t('diagnostics/dns-lookup.examples.items.cloudflareAAAA.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-lookup.examples.items.githubDMARC.domain'),
      type: $t('diagnostics/dns-lookup.examples.items.githubDMARC.type'),
      description: $t('diagnostics/dns-lookup.examples.items.githubDMARC.description'),
      tooltip: $t('diagnostics/dns-lookup.examples.items.githubDMARC.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-lookup.examples.items.microsoftTXT.domain'),
      type: $t('diagnostics/dns-lookup.examples.items.microsoftTXT.type'),
      description: $t('diagnostics/dns-lookup.examples.items.microsoftTXT.description'),
      tooltip: $t('diagnostics/dns-lookup.examples.items.microsoftTXT.tooltip'),
    },
    {
      domain: $t('diagnostics/dns-lookup.examples.items.netflixNS.domain'),
      type: $t('diagnostics/dns-lookup.examples.items.netflixNS.type'),
      description: $t('diagnostics/dns-lookup.examples.items.netflixNS.description'),
      tooltip: $t('diagnostics/dns-lookup.examples.items.netflixNS.tooltip'),
    },
  ]);

  const examples = useExamples(() => examplesList);

  async function performLookup() {
    diagnosticState.startOperation();

    // Client-side validation
    const validation = validateDNSLookupInput(domainName, useCustomResolver, customResolver);
    if (!validation.isValid) {
      diagnosticState.setError(validation.error || $t('diagnostics/dns-lookup.error.invalidInput'));
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
          throw new Error($t('diagnostics/dns-lookup.error.invalidRequest'));
        } else if (response.status === 500 || response.status === 403) {
          throw new Error($t('diagnostics/dns-lookup.error.serviceUnavailable'));
        }

        throw new Error($t('diagnostics/dns-lookup.error.lookupFailed', { status: response.status }));
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
    <h1>{$t('diagnostics/dns-lookup.title')}</h1>
    <p>{$t('diagnostics/dns-lookup.subtitle')}</p>
  </header>

  <!-- Examples -->
  <ExamplesCard
    examples={examplesList}
    selectedIndex={examples.selectedIndex}
    onSelect={loadExample}
    getLabel={(ex: { domain: string; type: string }) => `${ex.domain} (${ex.type})`}
    getDescription={(ex: { description: string }) => ex.description}
    getTooltip={(ex: { tooltip: string }) => ex.tooltip}
  />

  <!-- Input Form -->
  <div class="card input-card">
    <div class="card-header">
      <h3>{$t('diagnostics/dns-lookup.form.title')}</h3>
    </div>
    <div class="card-content">
      <!-- First Row: Domain Name -->
      <div class="form-row">
        <div class="form-group">
          <label for="domain" use:tooltip={$t('diagnostics/dns-lookup.form.domainTooltip')}>
            {$t('diagnostics/dns-lookup.form.domainLabel')}
          </label>
          <input
            id="domain"
            type="text"
            bind:value={domainName}
            placeholder={$t('diagnostics/dns-lookup.form.domainPlaceholder')}
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
          <label for="type" use:tooltip={$t('diagnostics/dns-lookup.form.recordTypeTooltip')}>
            {$t('diagnostics/dns-lookup.form.recordTypeLabel')}
          </label>
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
          <label for="dns-resolver" use:tooltip={$t('diagnostics/dns-lookup.form.dnsResolverTooltip')}>
            {$t('diagnostics/dns-lookup.form.dnsResolverLabel')}
          </label>
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
              placeholder={$t('diagnostics/dns-lookup.form.customResolverPlaceholder')}
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
            {$t('diagnostics/dns-lookup.form.useCustomResolver')}
          </label>
        </div>
      </div>

      <div class="action-section">
        <ActionButton
          loading={diagnosticState.loading}
          disabled={!validation.isValid}
          icon="search"
          loadingText={$t('diagnostics/dns-lookup.form.performing')}
          onclick={performLookup}
        >
          {$t('diagnostics/dns-lookup.form.lookupButton')}
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
            <strong>{$t('diagnostics/dns-lookup.noRecords.title')}</strong>
            <p>{diagnosticState.results.message}</p>
            <p class="help-text">
              {$t('diagnostics/dns-lookup.noRecords.usingResolver', { resolver: diagnosticState.results.resolver })}
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results -->
  {#if diagnosticState.results && !diagnosticState.results.noRecords}
    <ResultsCard
      title={$t('diagnostics/dns-lookup.results.title')}
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
                <div class="record-ttl" use:tooltip={$t('diagnostics/dns-lookup.results.ttlTooltip')}>
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
            <p>{$t('diagnostics/dns-lookup.results.noRecordsMessage', { domain: domainName, type: recordType })}</p>
          </div>
        </div>
      {/if}
    </ResultsCard>
  {/if}

  <ErrorCard title={$t('diagnostics/dns-lookup.error.title')} error={diagnosticState.error} />
</div>

<style lang="scss">
  // Styles now use diagnostics-pages.scss
  // Most styles moved to shared stylesheet for reusability
</style>
