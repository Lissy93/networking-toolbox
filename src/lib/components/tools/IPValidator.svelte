<script lang="ts">
  import { tooltip as _tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import '../../../styles/diagnostics-pages.scss';

  let inputValue = $state('');
  let selectedExampleIndex = $state<number | null>(null);
  let result = $state<{
    isValid: boolean;
    type: 'ipv4' | 'ipv6' | null;
    errors: string[];
    warnings: string[];
    details: {
      normalizedForm?: string;
      addressType?: string;
      scope?: string;
      isPrivate?: boolean;
      isReserved?: boolean;
      info?: string[];
      compressedForm?: string;
      embeddedIPv4?: string;
      zoneId?: string;
      hasEmbeddedIPv4?: boolean;
    };
  } | null>(null);

  // Common test cases for quick validation
  const testCases = [
    { label: 'Valid IPv4', value: '192.168.1.1', valid: true },
    { label: 'Valid IPv6', value: '2001:db8::1', valid: true },
    { label: 'IPv4 with leading zeros', value: '192.168.001.001', valid: false },
    { label: 'IPv4 octet too large', value: '192.168.1.256', valid: false },
    { label: 'IPv6 with multiple ::', value: '2001::db8::1', valid: false },
    { label: 'IPv6 too many groups', value: '2001:db8:85a3:0000:0000:8a2e:0370:7334:extra', valid: false },
  ];

  function validateIPv4(ip: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    details: Record<string, any>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = { info: [] };

    // Check basic format
    if (!ip.includes('.')) {
      errors.push('IPv4 addresses must contain dots (.) to separate octets');
      return { isValid: false, errors, warnings, details };
    }

    const parts = ip.split('.');

    // Check number of octets
    if (parts.length !== 4) {
      errors.push(`IPv4 addresses must have exactly 4 octets, found ${parts.length}`);
      return { isValid: false, errors, warnings, details };
    }

    const octets: number[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const octetNum = i + 1;

      // Check if empty
      if (part === '') {
        errors.push(`Octet ${octetNum} is empty`);
        continue;
      }

      // Check for non-numeric characters
      if (!/^\d+$/.test(part)) {
        errors.push(`Octet ${octetNum} contains non-numeric characters: "${part}"`);
        continue;
      }

      // Check for leading zeros (except for single zero)
      if (part.length > 1 && part[0] === '0') {
        errors.push(`Octet ${octetNum} has leading zeros: "${part}" (should be "${parseInt(part)})")`);
        continue;
      }

      // Parse and validate range
      const value = parseInt(part, 10);
      if (isNaN(value)) {
        errors.push(`Octet ${octetNum} is not a valid number: "${part}"`);
        continue;
      }

      if (value < 0 || value > 255) {
        errors.push(`Octet ${octetNum} out of range: ${value} (must be 0-255)`);
        continue;
      }

      octets.push(value);
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings, details };
    }

    // Additional analysis for valid IPs
    const [a, b, c, d] = octets;
    details.normalizedForm = `${a}.${b}.${c}.${d}`;

    // Determine address type and scope
    if (a === 127) {
      details.addressType = 'Loopback';
      details.scope = 'Host';
      details.info.push('Used for local loopback communications');
    } else if (a === 10) {
      details.addressType = 'Private';
      details.scope = 'Private Network';
      details.isPrivate = true;
      details.info.push('RFC 1918 private address space (10.0.0.0/8)');
    } else if (a === 172 && b >= 16 && b <= 31) {
      details.addressType = 'Private';
      details.scope = 'Private Network';
      details.isPrivate = true;
      details.info.push('RFC 1918 private address space (172.16.0.0/12)');
    } else if (a === 192 && b === 168) {
      details.addressType = 'Private';
      details.scope = 'Private Network';
      details.isPrivate = true;
      details.info.push('RFC 1918 private address space (192.168.0.0/16)');
    } else if (a === 169 && b === 254) {
      details.addressType = 'Link-Local (APIPA)';
      details.scope = 'Link-Local';
      details.isReserved = true;
      details.info.push('Automatic Private IP Addressing');
    } else if (a >= 224 && a <= 239) {
      details.addressType = 'Multicast';
      details.scope = 'Multicast';
      details.isReserved = true;
      details.info.push('Used for multicast communications (224.0.0.0/4)');
    } else if (a >= 240) {
      details.addressType = 'Reserved';
      details.scope = 'Reserved';
      details.isReserved = true;
      details.info.push('Reserved for future use');
    } else if (a === 0) {
      details.addressType = 'Network Address';
      details.scope = 'Special Use';
      details.isReserved = true;
      details.info.push('"This network" address');
    } else if (d === 0) {
      details.addressType = 'Network Address';
      details.scope = 'Network';
      warnings.push('This appears to be a network address (host portion is 0)');
    } else if (d === 255) {
      details.addressType = 'Broadcast Address';
      details.scope = 'Network';
      warnings.push('This appears to be a broadcast address (host portion is all 1s)');
    } else {
      details.addressType = 'Public';
      details.scope = 'Internet';
      details.isPrivate = false;
      details.info.push('Publicly routable address');
    }

    return { isValid: true, errors: [], warnings, details };
  }

  function validateIPv6(ip: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    details: Record<string, any>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = { info: [] };

    // Check for zone ID (remove it for validation but note it)
    let cleanIP = ip;
    let zoneId = '';
    if (ip.includes('%')) {
      const parts = ip.split('%');
      if (parts.length > 2) {
        errors.push('Multiple % symbols found - invalid zone ID format');
        return { isValid: false, errors, warnings, details };
      }
      cleanIP = parts[0];
      zoneId = parts[1];
      details.zoneId = zoneId;
      details.info.push(`Zone ID specified: %${zoneId}`);
    }

    // Check for :: (compression)
    const doubleColonCount = (cleanIP.match(/::/g) || []).length;
    if (doubleColonCount > 1) {
      errors.push('Multiple :: sequences found - only one :: allowed per address');
      return { isValid: false, errors, warnings, details };
    }

    // Handle :: expansion
    let expandedIP = cleanIP;
    if (cleanIP.includes('::')) {
      const parts = cleanIP.split('::');
      if (parts.length > 2) {
        errors.push('Invalid :: usage - malformed compression');
        return { isValid: false, errors, warnings, details };
      }

      const leftParts = parts[0] ? parts[0].split(':') : [];
      const rightParts = parts[1] ? parts[1].split(':') : [];

      // Calculate how many groups to insert
      const totalParts = leftParts.length + rightParts.length;
      const missingGroups = 8 - totalParts;

      if (missingGroups < 0) {
        errors.push('Too many groups in compressed IPv6 address');
        return { isValid: false, errors, warnings, details };
      }

      const middleParts = Array(missingGroups).fill('0000');
      const allParts = [...leftParts, ...middleParts, ...rightParts];
      expandedIP = allParts.join(':');
    }

    // Check for embedded IPv4
    const ipv4Pattern = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
    const ipv4Match = expandedIP.match(ipv4Pattern);

    if (ipv4Match) {
      // Validate the IPv4 part
      const ipv4Part = ipv4Match[0];
      const ipv4Result = validateIPv4(ipv4Part);

      if (!ipv4Result.isValid) {
        errors.push(`Invalid embedded IPv4 address: ${ipv4Result.errors.join(', ')}`);
        return { isValid: false, errors, warnings, details };
      }

      // Convert IPv4 to two IPv6 groups
      const [, a, b, c, d] = ipv4Match;
      const group1 = ((parseInt(a) << 8) + parseInt(b)).toString(16).padStart(4, '0');
      const group2 = ((parseInt(c) << 8) + parseInt(d)).toString(16).padStart(4, '0');

      expandedIP = expandedIP.replace(ipv4Pattern, `${group1}:${group2}`);
      details.hasEmbeddedIPv4 = true;
      details.embeddedIPv4 = ipv4Part;
      details.info.push(`Contains embedded IPv4 address: ${ipv4Part}`);
    }

    // Split into groups and validate
    const groups = expandedIP.split(':');

    if (groups.length !== 8) {
      if (!cleanIP.includes('::')) {
        errors.push(`IPv6 addresses must have 8 groups, found ${groups.length} (use :: for compression)`);
      } else {
        errors.push(`Invalid IPv6 compression - results in ${groups.length} groups instead of 8`);
      }
      return { isValid: false, errors, warnings, details };
    }

    // Validate each group
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupNum = i + 1;

      if (group === '') {
        errors.push(`Group ${groupNum} is empty`);
        continue;
      }

      if (group.length > 4) {
        errors.push(`Group ${groupNum} too long: "${group}" (max 4 hex digits)`);
        continue;
      }

      if (!/^[0-9a-fA-F]+$/.test(group)) {
        errors.push(`Group ${groupNum} contains invalid characters: "${group}" (only 0-9, a-f, A-F allowed)`);
        continue;
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings, details };
    }

    // Normalize the address
    const normalizedGroups = groups.map((group) => group.toLowerCase().padStart(4, '0'));
    const fullForm = normalizedGroups.join(':');
    details.normalizedForm = fullForm;

    // Analyze address type
    const firstGroup = normalizedGroups[0];
    const firstTwoGroups = normalizedGroups.slice(0, 2).join(':');

    if (fullForm === '0000:0000:0000:0000:0000:0000:0000:0001') {
      details.addressType = 'Loopback';
      details.scope = 'Host';
      details.info.push('IPv6 loopback address (::1)');
    } else if (fullForm === '0000:0000:0000:0000:0000:0000:0000:0000') {
      details.addressType = 'Unspecified';
      details.scope = 'Special Use';
      details.info.push('IPv6 unspecified address (::)');
    } else if (firstGroup === 'fe80') {
      details.addressType = 'Link-Local';
      details.scope = 'Link-Local';
      details.info.push('IPv6 link-local address');
    } else if (firstGroup === 'fec0') {
      details.addressType = 'Site-Local (Deprecated)';
      details.scope = 'Site-Local';
      details.info.push('Deprecated site-local address');
      warnings.push('Site-local addresses are deprecated (RFC 3879)');
    } else if (firstTwoGroups === 'fc00' || firstTwoGroups === 'fd00') {
      details.addressType = 'Unique Local';
      details.scope = 'Private Network';
      details.isPrivate = true;
      details.info.push('RFC 4193 Unique Local Address');
    } else if (firstGroup.startsWith('ff')) {
      details.addressType = 'Multicast';
      details.scope = 'Multicast';
      details.info.push('IPv6 multicast address');
    } else if (firstTwoGroups === '2001' && normalizedGroups[1] === '0db8') {
      details.addressType = 'Documentation';
      details.scope = 'Documentation';
      details.isReserved = true;
      details.info.push('RFC 3849 documentation address');
      warnings.push('This is a documentation address (not for production use)');
    } else if (firstGroup >= '2000' && firstGroup <= '3fff') {
      details.addressType = 'Global Unicast';
      details.scope = 'Internet';
      details.isPrivate = false;
      details.info.push('Globally routable IPv6 address');
    } else {
      details.addressType = 'Reserved';
      details.scope = 'Reserved';
      details.isReserved = true;
      details.info.push('Reserved address space');
    }

    // Check for compressed form
    if (cleanIP.includes('::')) {
      const compressedForm = compressIPv6(fullForm);
      details.compressedForm = compressedForm;
      if (cleanIP !== compressedForm) {
        details.info.push(`Standard compressed form: ${compressedForm}`);
      }
    }

    return { isValid: true, errors: [], warnings, details };
  }

  function compressIPv6(fullForm: string): string {
    // Find the longest sequence of consecutive zero groups
    const groups = fullForm.split(':');
    let bestStart = -1;
    let bestLength = 0;
    let currentStart = -1;
    let currentLength = 0;

    for (let i = 0; i < groups.length; i++) {
      if (groups[i] === '0000') {
        if (currentStart === -1) {
          currentStart = i;
          currentLength = 1;
        } else {
          currentLength++;
        }
      } else {
        if (currentLength > bestLength && currentLength > 1) {
          bestStart = currentStart;
          bestLength = currentLength;
        }
        currentStart = -1;
        currentLength = 0;
      }
    }

    // Check final sequence
    if (currentLength > bestLength && currentLength > 1) {
      bestStart = currentStart;
      bestLength = currentLength;
    }

    // Apply compression
    let result = groups.map((group) => group.replace(/^0+/, '') || '0').join(':');

    if (bestStart !== -1) {
      const beforeZeros = groups.slice(0, bestStart).map((group) => group.replace(/^0+/, '') || '0');
      const afterZeros = groups.slice(bestStart + bestLength).map((group) => group.replace(/^0+/, '') || '0');

      if (beforeZeros.length === 0) {
        result = '::' + afterZeros.join(':');
      } else if (afterZeros.length === 0) {
        result = beforeZeros.join(':') + '::';
      } else {
        result = beforeZeros.join(':') + '::' + afterZeros.join(':');
      }
    }

    return result;
  }

  function validateIP(input: string) {
    if (!input.trim()) {
      result = null;
      return;
    }

    const trimmed = input.trim();

    // Determine if this looks like IPv4 or IPv6
    const hasColons = trimmed.includes(':');
    const hasDots = trimmed.includes('.');

    if (hasColons && hasDots) {
      // Could be IPv6 with embedded IPv4
      const ipv6Result = validateIPv6(trimmed);
      result = {
        isValid: ipv6Result.isValid,
        type: 'ipv6',
        errors: ipv6Result.errors,
        warnings: ipv6Result.warnings,
        details: ipv6Result.details,
      };
    } else if (hasColons) {
      // IPv6
      const ipv6Result = validateIPv6(trimmed);
      result = {
        isValid: ipv6Result.isValid,
        type: 'ipv6',
        errors: ipv6Result.errors,
        warnings: ipv6Result.warnings,
        details: ipv6Result.details,
      };
    } else if (hasDots) {
      // IPv4
      const ipv4Result = validateIPv4(trimmed);
      result = {
        isValid: ipv4Result.isValid,
        type: 'ipv4',
        errors: ipv4Result.errors,
        warnings: ipv4Result.warnings,
        details: ipv4Result.details,
      };
    } else {
      // Neither format detected
      result = {
        isValid: false,
        type: null,
        errors: ['Input does not appear to be an IP address (no dots or colons found)'],
        warnings: [],
        details: {},
      };
    }
  }

  function setTestCase(testCase: { value: string }, index: number) {
    inputValue = testCase.value;
    selectedExampleIndex = index;
    validateIP(inputValue);
  }

  function clearExampleSelection() {
    selectedExampleIndex = null;
  }

  function handleInput() {
    clearExampleSelection();
    validateIP(inputValue);
  }

  // Validate on component load if there's initial input
  $effect(() => {
    if (inputValue) {
      validateIP(inputValue);
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h1>IP Address Validator</h1>
    <p>Validate IPv4 and IPv6 addresses with detailed error analysis and format checking</p>
  </header>

  <!-- Input Section -->
  <section class="input-section">
    <div class="input-group">
      <label for="ip-input">
        <Icon name="globe" size="sm" />
        Enter IP Address
      </label>
      <input
        id="ip-input"
        type="text"
        bind:value={inputValue}
        oninput={handleInput}
        placeholder="e.g., 192.168.1.1 or 2001:db8::1"
        class="ip-input {result?.isValid === true ? 'valid' : result?.isValid === false ? 'invalid' : ''}"
        autocomplete="off"
        spellcheck="false"
      />
      <div class="input-hint">Supports IPv4 (192.168.1.1), IPv6 (2001:db8::1), and various formats</div>
    </div>
  </section>

  <!-- Test Cases -->
  <div class="card examples-card">
    <details class="examples-details">
      <summary class="examples-summary">
        <Icon name="chevron-right" size="xs" />
        <h4>Quick Test Cases</h4>
      </summary>
      <div class="examples-grid">
        {#each testCases as testCase, index (`test-case-${index}`)}
          <button
            class="example-card {testCase.valid ? 'valid-example' : 'invalid-example'}"
            class:selected={selectedExampleIndex === index}
            onclick={() => setTestCase(testCase, index)}
          >
            <div class="test-case-label">
              <Icon name={testCase.valid ? 'check-circle' : 'x-circle'} size="sm" />
              <h5>{testCase.label}</h5>
            </div>
            <code class="test-case-value">{testCase.value}</code>
          </button>
        {/each}
      </div>
    </details>
  </div>

  <!-- Results -->
  {#if result && inputValue.trim()}
    <section class="results-section">
      <div class="validation-result {result.isValid ? 'valid' : 'invalid'}">
        <div class="result-header">
          <div class="result-status">
            <Icon name={result.isValid ? 'check-circle' : 'x-circle'} size="lg" />
            <div class="status-text">
              <h2>{result.isValid ? 'Valid' : 'Invalid'} IP Address</h2>
              {#if result.type}
                <span class="ip-type">{result.type.toUpperCase()} Format</span>
              {/if}
            </div>
          </div>

          {#if result.isValid && result.details.normalizedForm}
            <div class="normalized-form">
              <span class="normalized-label">Normalized:</span>
              <code class="normalized-value">{result.details.normalizedForm}</code>
            </div>
          {/if}
        </div>

        <!-- Errors -->
        {#if result.errors.length > 0}
          <div class="errors-section">
            <h4>
              <Icon name="alert-circle" size="sm" />
              Issues Found ({result.errors.length})
            </h4>
            <ul class="error-list">
              {#each result.errors as error (error)}
                <li class="error-item">
                  <Icon name="x" size="xs" />
                  {error}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Warnings -->
        {#if result.warnings.length > 0}
          <div class="warnings-section">
            <h4>
              <Icon name="alert-triangle" size="sm" />
              Warnings ({result.warnings.length})
            </h4>
            <ul class="warning-list">
              {#each result.warnings as warning (warning)}
                <li class="warning-item">
                  <Icon name="alert-triangle" size="xs" />
                  {warning}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Details -->
        {#if result.isValid && Object.keys(result.details).length > 0}
          <div class="details-section">
            <h4>
              <Icon name="info" size="sm" />
              Address Details
            </h4>

            <div class="details-grid">
              {#if result.details.addressType}
                <div class="detail-item">
                  <span class="detail-label">Type:</span>
                  <span class="detail-value">{result.details.addressType}</span>
                </div>
              {/if}

              {#if result.details.scope}
                <div class="detail-item">
                  <span class="detail-label">Scope:</span>
                  <span class="detail-value">{result.details.scope}</span>
                </div>
              {/if}

              {#if result.details.isPrivate !== undefined}
                <div class="detail-item">
                  <span class="detail-label">Routing:</span>
                  <span class="detail-value {result.details.isPrivate ? 'private' : 'public'}">
                    {result.details.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
              {/if}

              {#if result.details.compressedForm}
                <div class="detail-item">
                  <span class="detail-label">Compressed:</span>
                  <code class="detail-value compressed">{result.details.compressedForm}</code>
                </div>
              {/if}

              {#if result.details.embeddedIPv4}
                <div class="detail-item">
                  <span class="detail-label">Embedded IPv4:</span>
                  <code class="detail-value embedded">{result.details.embeddedIPv4}</code>
                </div>
              {/if}

              {#if result.details.zoneId}
                <div class="detail-item">
                  <span class="detail-label">Zone ID:</span>
                  <code class="detail-value zone">%{result.details.zoneId}</code>
                </div>
              {/if}
            </div>

            {#if result.details.info && result.details.info.length > 0}
              <div class="info-section">
                <h5>Additional Information</h5>
                <ul class="info-list">
                  {#each result.details.info as info (info)}
                    <li class="info-item">
                      <Icon name="info" size="xs" />
                      {info}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- SEO Content -->
  <section class="about-content">
    <div class="about-grid">
      <div class="about-section">
        <h3>How to Tell if an IP Address is Valid</h3>
        <p>
          Valid IP addresses follow specific rules. For IPv4, you need exactly four numbers (0-255) separated by dots,
          like 192.168.1.1. For IPv6, you need eight groups of hex digits separated by colons, though you can compress
          consecutive zeros with :: (like 2001:db8::1). The validator checks these rules and tells you exactly what's
          wrong when something doesn't match.
        </p>
      </div>

      <div class="about-section">
        <h3>What Happens When Addresses Are Invalid</h3>
        <p>
          Invalid IP addresses cause real problems. Your router might reject them, network connections fail, or software
          crashes. Common mistakes include typos like "192.168.1.256" (256 is too big), missing parts like "192.168.1",
          or extra zeros like "192.168.01.01". This tool catches these errors before they break your network setup.
        </p>
      </div>

      <div class="about-section">
        <h3>Why Some Addresses Have Warnings</h3>
        <p>
          Some valid addresses come with warnings because they have special meanings. For example, addresses ending in
          .0 are usually network addresses, and ones ending in .255 are broadcast addresses. Private addresses like
          192.168.x.x won't work on the internet. The tool explains what each address type means so you know if it's
          right for your use case.
        </p>
      </div>
    </div>
  </section>
</div>

<style lang="scss">
  .input-section {
    margin-bottom: var(--spacing-xl);
  }

  .input-group {
    label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--text-primary);
      font-size: var(--font-size-md);
    }
  }

  .ip-input {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-lg);
    font-family: var(--font-mono);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
    }

    &.valid {
      border-color: var(--color-success);
    }

    &.invalid {
      border-color: var(--color-error);
    }

    &::placeholder {
      color: var(--text-secondary);
      font-style: italic;
    }
  }

  .input-hint {
    margin-top: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-style: italic;
  }

  .example-card {
    &.valid-example {
      border-left: 3px solid var(--color-success);

      &:hover,
      &.selected {
        border-color: var(--color-success) !important;

        .test-case-label :global(svg) {
          color: var(--color-success);
        }
      }
    }

    &.invalid-example {
      border-left: 3px solid var(--color-error);

      &:hover,
      &.selected {
        border-color: var(--color-error) !important;

        .test-case-label :global(svg) {
          color: var(--color-error);
        }
      }
    }

    .test-case-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-xs);

      :global(svg) {
        transition: color var(--transition-fast);
      }

      h5 {
        margin: 0;
        font-weight: 600;
        color: var(--text-primary);
        font-size: var(--font-size-sm);
      }
    }
  }

  .test-case-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin: 0;
    display: block;
  }

  .results-section {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
  }

  .validation-result {
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);

    &.valid {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-success), transparent 55%),
        color-mix(in srgb, var(--color-success), transparent 65%)
      );
      border: 1px solid var(--color-success);
      color: var(--text-primary);
      .details-section {
        background: color-mix(in srgb, var(--bg-secondary), transparent 60%);
      }
    }

    &.invalid {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-error), transparent 55%),
        color-mix(in srgb, var(--color-error), transparent 65%)
      );
      border: 1px solid var(--color-error);
      color: var(--text-primary);
      .errors-section {
        background: color-mix(in srgb, var(--bg-secondary), transparent 50%);
      }
    }
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .result-status {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .status-text {
    h2 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: var(--font-size-xl);
      font-weight: 700;
    }
  }

  .ip-type {
    font-size: var(--font-size-sm);
    font-weight: 600;
    opacity: 0.9;
  }

  .normalized-form {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
  }

  .normalized-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    opacity: 0.9;
  }

  .normalized-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--bg-primary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
  }

  .errors-section,
  .warnings-section,
  .details-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-md);

    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0 0 var(--spacing-md) 0;
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .error-list,
  .warning-list,
  .info-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .error-item,
  .warning-item,
  .info-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
    line-height: 1.4;
    color: var(--text-primary);
  }
  .info-item {
    flex-direction: row;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .detail-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
  }

  .detail-value {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);

    &.private {
      color: var(--color-warning-light);
    }

    &.public {
      color: var(--color-info-light);
    }

    &.compressed,
    &.embedded,
    &.zone {
      font-family: var(--font-mono);
      background-color: var(--bg-primary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
    }
  }

  .info-section {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-secondary);

    h5 {
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .about-content {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-xl);
    margin-top: var(--spacing-xl);

    h3 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-md);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
    }
  }

  .about-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-xl);
  }

  @media (max-width: 768px) {
    .result-header {
      flex-direction: column;
    }

    .details-grid {
      grid-template-columns: 1fr;
    }

    .about-grid {
      grid-template-columns: 1fr;
    }

    .normalized-form {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
