<script lang="ts">
  import {
    calculateIPv6Subnet,
    getCommonIPv6Prefixes,
    parseIPv6WithPrefix,
    type IPv6SubnetResult,
  } from '$lib/utils/ipv6-subnet-calculations.js';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import { useClipboard } from '$lib/composables';
  import { goto } from '$app/navigation';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools');
  });

  const versionOptions = [
    { value: 'ipv4' as const, label: 'IPv4' },
    { value: 'ipv6' as const, label: 'IPv6' },
  ];

  let selectedVersion = $state<'ipv4' | 'ipv6'>('ipv6');

  function handleVersionChange(version: 'ipv4' | 'ipv6') {
    if (version === 'ipv4') {
      goto('/subnetting/ipv4-subnet-calculator');
    }
  }

  let networkAddress = $state('2001:db8::/64');
  let prefixLength = $state(64);
  let subnetResult = $state<IPv6SubnetResult | null>(null);
  const clipboard = useClipboard();
  let showBinaryView = $state(false);

  const commonPrefixes = getCommonIPv6Prefixes();

  // Define preset configurations for matching
  const presetConfigs = [
    { address: '2001:db8::', prefix: 48, id: 'doc-48' },
    { address: '2001:db8::', prefix: 64, id: 'doc-64' },
    { address: 'fe80::', prefix: 64, id: 'link-local' },
    { address: '::1', prefix: 128, id: 'loopback' },
    { address: '2001:4860:4860::', prefix: 48, id: 'google-dns' },
    { address: 'ff02::1', prefix: 128, id: 'multicast' },
  ];

  /**
   * Check if current input matches a preset
   */
  function getActivePreset(): string | null {
    const currentAddress = networkAddress.split('/')[0];

    for (const preset of presetConfigs) {
      if (currentAddress === preset.address && prefixLength === preset.prefix) {
        return preset.id;
      }
    }
    return null;
  }

  // Derived value for active preset - must be after presetConfigs definition
  let activePreset = $derived(getActivePreset());

  /* Handle input change for combined address/prefix */
  function handleAddressInput(value: string) {
    const parsed = parseIPv6WithPrefix(value);
    if (parsed) {
      networkAddress = `${parsed.address}/${parsed.prefix}`;
      prefixLength = parsed.prefix;
    } else {
      networkAddress = value;
    }
  }

  /* Set preset example */
  function setPreset(address: string, prefix: number) {
    networkAddress = `${address}/${prefix}`;
    prefixLength = prefix;
  }

  /* Get prefix description */
  function getPrefixDescription(prefix: number): string {
    const common = commonPrefixes.find((p) => p.prefix === prefix);
    return common?.description || `/${prefix} - ${$t('tools.ipv6_subnet_calculator.form.customPrefixLength')}`;
  }

  /* Format large numbers */
  function formatLargeNumber(num: string): string {
    if (num.includes('≈')) return num;
    const cleaned = num.replace(/[,\s]/g, '');
    if (cleaned.length > 15) {
      return `${cleaned.slice(0, 6)}... (${cleaned.length} ${$t('tools.ipv6_subnet_calculator.format.digits')})`;
    }
    return num;
  }

  // Reactive calculation
  $effect(() => {
    const addressPart = networkAddress.split('/')[0];
    if (addressPart && prefixLength) {
      subnetResult = calculateIPv6Subnet(addressPart, prefixLength);
    }
  });

  // activePreset is now derived automatically
</script>

<ToolContentContainer
  title={$t('tools.ipv6_subnet_calculator.title')}
  description={$t('tools.ipv6_subnet_calculator.description')}
  navOptions={versionOptions}
  bind:selectedNav={selectedVersion}
  onNavChange={handleVersionChange}
  contentClass="ipv6-calc-card"
>
  <!-- Input Section -->
  <div class="input-section">
    <h3>{$t('tools.ipv6_subnet_calculator.sections.networkConfiguration')}</h3>

    <div class="input-grid">
      <div class="form-group">
        <label for="ipv6-input">{$t('tools.ipv6_subnet_calculator.form.networkAddressLabel')}</label>
        <div class="input-wrapper">
          <input
            id="ipv6-input"
            type="text"
            bind:value={networkAddress}
            oninput={(e) => handleAddressInput((e.target as HTMLInputElement)?.value || '')}
            placeholder={$t('tools.ipv6_subnet_calculator.form.networkAddressPlaceholder')}
            class="ipv6-input"
          />
          <Tooltip text={$t('tools.ipv6_subnet_calculator.tooltips.networkAddressHelp')}>
            <Icon name="help" size="sm" />
          </Tooltip>
        </div>
      </div>

      <div class="form-group">
        <label for="prefix-input">{$t('tools.ipv6_subnet_calculator.form.prefixLengthLabel')}</label>
        <div class="prefix-controls">
          <span class="prefix-display">/{prefixLength}</span>
          <input id="prefix-slider" type="range" min="1" max="128" bind:value={prefixLength} class="prefix-slider" />
          <input id="prefix-input" type="number" min="1" max="128" bind:value={prefixLength} class="prefix-number" />
        </div>
        <p class="prefix-description">{getPrefixDescription(prefixLength)}</p>
      </div>
    </div>
  </div>

  <!-- Common Presets -->
  <div class="presets-section">
    <h3>{$t('tools.ipv6_subnet_calculator.sections.commonNetworks')}</h3>
    <div class="presets-grid">
      <button
        type="button"
        class="preset-btn {activePreset === 'doc-48' ? 'active' : ''}"
        onclick={() => setPreset('2001:db8::', 48)}
      >
        {$t('tools.ipv6_subnet_calculator.presets.documentation48')}
      </button>
      <button
        type="button"
        class="preset-btn {activePreset === 'doc-64' ? 'active' : ''}"
        onclick={() => setPreset('2001:db8::', 64)}
      >
        {$t('tools.ipv6_subnet_calculator.presets.standardSubnet64')}
      </button>
      <button
        type="button"
        class="preset-btn {activePreset === 'link-local' ? 'active' : ''}"
        onclick={() => setPreset('fe80::', 64)}
      >
        {$t('tools.ipv6_subnet_calculator.presets.linkLocal64')}
      </button>
      <button
        type="button"
        class="preset-btn {activePreset === 'loopback' ? 'active' : ''}"
        onclick={() => setPreset('::1', 128)}
      >
        {$t('tools.ipv6_subnet_calculator.presets.loopback128')}
      </button>
      <button
        type="button"
        class="preset-btn {activePreset === 'google-dns' ? 'active' : ''}"
        onclick={() => setPreset('2001:4860:4860::', 48)}
      >
        {$t('tools.ipv6_subnet_calculator.presets.googleDns48')}
      </button>
      <button
        type="button"
        class="preset-btn {activePreset === 'multicast' ? 'active' : ''}"
        onclick={() => setPreset('ff02::1', 128)}
      >
        {$t('tools.ipv6_subnet_calculator.presets.multicastAllNodes')}
      </button>
    </div>
  </div>

  <!-- Results -->
  {#if subnetResult && subnetResult.success && subnetResult.subnet}
    <div class="results-section">
      <!-- Network Information -->
      <div class="info-panel">
        <h3>{$t('tools.ipv6_subnet_calculator.sections.subnetInfo')}</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{$t('tools.ipv6_subnet_calculator.results.network')}</span>
            <div class="value-copy">
              <span class="info-value">{subnetResult.subnet.networkCompressed}/{subnetResult.subnet.prefixLength}</span>
              <button
                class="btn btn-icon copy-btn"
                class:copied={clipboard.isCopied('network')}
                onclick={() =>
                  subnetResult?.subnet &&
                  clipboard.copy(
                    `${subnetResult.subnet.networkCompressed}/${subnetResult.subnet.prefixLength}`,
                    'network',
                  )}
              >
                <Icon name={clipboard.isCopied('network') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">{$t('tools.ipv6_subnet_calculator.results.totalAddresses')}</span>
            <span class="info-value large-number">{formatLargeNumber(subnetResult.subnet.totalAddresses)}</span>
          </div>
        </div>
      </div>

      <!-- Detailed Information -->
      <div class="details-section">
        <div class="details-header">
          <h3>{$t('tools.ipv6_subnet_calculator.sections.networkDetails')}</h3>
          <div class="header-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick={() => (showBinaryView = !showBinaryView)}>
              <Icon name="binary" size="sm" />
              {showBinaryView
                ? $t('tools.ipv6_subnet_calculator.actions.hide')
                : $t('tools.ipv6_subnet_calculator.actions.show')}
              {$t('tools.ipv6_subnet_calculator.actions.binary')}
            </button>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label-wrapper">
              <span class="detail-label">{$t('tools.ipv6_subnet_calculator.results.networkCompressed')}</span>
              <Tooltip text={$t('tools.ipv6_subnet_calculator.tooltips.compressedNotation')}>
                <Icon name="help" size="sm" />
              </Tooltip>
            </div>
            <div class="value-copy">
              <code class="detail-value">{subnetResult.subnet.networkCompressed}</code>
              <button
                class="btn btn-icon copy-btn"
                class:copied={clipboard.isCopied('compressed')}
                onclick={() =>
                  subnetResult?.subnet && clipboard.copy(subnetResult.subnet.networkCompressed, 'compressed')}
              >
                <Icon name={clipboard.isCopied('compressed') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label-wrapper">
              <span class="detail-label">{$t('tools.ipv6_subnet_calculator.results.networkExpanded')}</span>
              <Tooltip text={$t('tools.ipv6_subnet_calculator.tooltips.expandedNotation')}>
                <Icon name="help" size="sm" />
              </Tooltip>
            </div>
            <div class="value-copy">
              <code class="detail-value expanded">{subnetResult.subnet.networkExpanded}</code>
              <button
                class="btn btn-icon copy-btn"
                class:copied={clipboard.isCopied('expanded')}
                onclick={() => subnetResult?.subnet && clipboard.copy(subnetResult.subnet.networkExpanded, 'expanded')}
              >
                <Icon name={clipboard.isCopied('expanded') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label-wrapper">
              <span class="detail-label">{$t('tools.ipv6_subnet_calculator.results.subnetMask')}</span>
              <Tooltip text={$t('tools.ipv6_subnet_calculator.tooltips.subnetMask')}>
                <Icon name="help" size="sm" />
              </Tooltip>
            </div>
            <div class="value-copy">
              <code class="detail-value">{subnetResult.subnet.subnetMask}</code>
              <button
                class="btn btn-icon copy-btn"
                class:copied={clipboard.isCopied('mask')}
                onclick={() => subnetResult?.subnet && clipboard.copy(subnetResult.subnet.subnetMask, 'mask')}
              >
                <Icon name={clipboard.isCopied('mask') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label-wrapper">
              <span class="detail-label">{$t('tools.ipv6_subnet_calculator.results.addressRange')}</span>
              <Tooltip text={$t('tools.ipv6_subnet_calculator.tooltips.addressRange')}>
                <Icon name="help" size="sm" />
              </Tooltip>
            </div>
            <div class="value-copy">
              <code class="detail-value range">
                {subnetResult.subnet.firstAddress} - {subnetResult.subnet.lastAddress}
              </code>
              <button
                class="btn btn-icon copy-btn"
                class:copied={clipboard.isCopied('range')}
                onclick={() =>
                  subnetResult?.subnet &&
                  clipboard.copy(`${subnetResult.subnet.firstAddress} - ${subnetResult.subnet.lastAddress}`, 'range')}
              >
                <Icon name={clipboard.isCopied('range') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label-wrapper">
              <span class="detail-label">{$t('tools.ipv6_subnet_calculator.results.assignableAddresses')}</span>
              <Tooltip text={$t('tools.ipv6_subnet_calculator.tooltips.assignableAddresses')}>
                <Icon name="help" size="sm" />
              </Tooltip>
            </div>
            <div class="value-copy">
              <code class="detail-value">{formatLargeNumber(subnetResult.subnet.assignableAddresses)}</code>
              <button
                class="btn btn-icon copy-btn"
                class:copied={clipboard.isCopied('assignable')}
                onclick={() =>
                  subnetResult?.subnet && clipboard.copy(subnetResult.subnet.assignableAddresses, 'assignable')}
              >
                <Icon name={clipboard.isCopied('assignable') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label-wrapper">
              <span class="detail-label">{$t('tools.ipv6_subnet_calculator.results.reverseDnsZone')}</span>
              <Tooltip text={$t('tools.ipv6_subnet_calculator.tooltips.reverseDns')}>
                <Icon name="help" size="sm" />
              </Tooltip>
            </div>
            <div class="value-copy">
              <code class="detail-value reverse">{subnetResult.subnet.reverseZone}</code>
              <button
                class="btn btn-icon copy-btn"
                class:copied={clipboard.isCopied('reverse')}
                onclick={() => subnetResult?.subnet && clipboard.copy(subnetResult.subnet.reverseZone, 'reverse')}
              >
                <Icon name={clipboard.isCopied('reverse') ? 'check' : 'copy'} size="sm" />
              </button>
            </div>
          </div>

          {#if showBinaryView}
            <div class="detail-item full-width">
              <div class="detail-label-wrapper">
                <span class="detail-label">{$t('tools.ipv6_subnet_calculator.results.binaryPrefix')}</span>
                <Tooltip text={$t('tools.ipv6_subnet_calculator.tooltips.binaryRepresentation')}>
                  <Icon name="help" size="sm" />
                </Tooltip>
              </div>
              <div class="value-copy">
                <code class="detail-value binary-display">{subnetResult.subnet.binaryPrefix}</code>
                <button
                  class="btn btn-icon copy-btn"
                  class:copied={clipboard.isCopied('binary')}
                  onclick={() => subnetResult?.subnet && clipboard.copy(subnetResult.subnet.binaryPrefix, 'binary')}
                >
                  <Icon name={clipboard.isCopied('binary') ? 'check' : 'copy'} size="sm" />
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- IPv6 Address Structure Visualization -->
      <div class="visualization-section">
        <h3>{$t('tools.ipv6_subnet_calculator.sections.addressStructure')}</h3>
        <div class="address-structure">
          <div class="structure-header">
            <h4>{$t('tools.ipv6_subnet_calculator.sections.addressBreakdown')}</h4>
            <p>
              {$t('tools.ipv6_subnet_calculator.visualization.showingPortionsFor')}
              {subnetResult.subnet.networkCompressed}/{prefixLength}
            </p>
          </div>

          <div class="bit-visualization">
            <div class="bit-section network-bits">
              <div class="bit-header">
                <span class="bit-label">{$t('tools.ipv6_subnet_calculator.visualization.networkPortion')}</span>
                <span class="bit-count">{prefixLength} {$t('tools.ipv6_subnet_calculator.visualization.bits')}</span>
              </div>
              <div class="bit-bar" style="width: {(prefixLength / 128) * 100}%"></div>
            </div>

            <div class="bit-section host-bits">
              <div class="bit-header">
                <span class="bit-label">{$t('tools.ipv6_subnet_calculator.visualization.hostPortion')}</span>
                <span class="bit-count"
                  >{128 - prefixLength} {$t('tools.ipv6_subnet_calculator.visualization.bits')}</span
                >
              </div>
              <div class="bit-bar" style="width: {((128 - prefixLength) / 128) * 100}%"></div>
            </div>
          </div>

          <div class="bit-scale">
            <div class="scale-markers">
              <span>0</span>
              <span>32</span>
              <span>64</span>
              <span>96</span>
              <span>128</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else if subnetResult && !subnetResult.success}
    <!-- Error Display -->
    <div class="results-section">
      <div class="info-panel error">
        <h3>{$t('tools.ipv6_subnet_calculator.sections.calculationError')}</h3>
        <p class="error-message">{subnetResult.error}</p>
      </div>
    </div>
  {/if}
</ToolContentContainer>

<style>
  .btn {
    vertical-align: middle;
    display: flex;
    gap: var(--spacing-sm);
  }

  .input-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      margin-bottom: var(--spacing-md);
      color: var(--color-primary);
    }
  }

  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    position: relative;

    :global(.tooltip-trigger) {
      color: var(--text-secondary);
      opacity: 0.7;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 1;
        color: var(--color-info);
      }
    }
  }

  .ipv6-input {
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .prefix-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-xs);
  }

  .prefix-display {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-primary);
    font-size: var(--font-size-md);
    min-width: 3rem;
  }

  .prefix-slider {
    flex: 1;
    height: 0.5rem;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    appearance: none;
    cursor: pointer;
    outline: none;

    &::-webkit-slider-thumb {
      appearance: none;
      height: 1.25rem;
      width: 1.25rem;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
      box-shadow: var(--shadow-md);
      transition: transform var(--transition-fast);

      &:hover {
        transform: scale(1.1);
      }
    }

    &::-moz-range-thumb {
      height: 1.25rem;
      width: 1.25rem;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
      border: none;
      box-shadow: var(--shadow-md);
      transition: transform var(--transition-fast);

      &:hover {
        transform: scale(1.1);
      }
    }
  }

  .prefix-number {
    width: 4rem;
    text-align: center;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    &[type='number'] {
      -moz-appearance: textfield;
      appearance: textfield;
    }
  }

  .prefix-description {
    margin-top: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-style: italic;
  }

  .presets-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      margin-bottom: var(--spacing-md);
      color: var(--color-primary);
    }
  }

  .presets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--spacing-sm);
  }

  .preset-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    border-radius: var(--radius-sm);
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-secondary);
    transition: all var(--transition-fast);
    text-align: left;

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &.active {
      border-color: var(--color-primary);
      background-color: var(--surface-hover);
      color: var(--color-primary);
    }
  }

  .results-section {
    margin-top: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    .value-copy {
      justify-content: center;
    }
  }

  .info-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
  }

  .info-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);

    &.large-number {
      font-size: var(--font-size-md);
      text-align: center;
      word-break: break-all;
    }
  }

  .details-section {
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);

    h3 {
      margin: 0;
      color: var(--color-primary);
    }
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--spacing-lg);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);

    &.full-width {
      grid-column: 1 / -1;
    }
  }

  .detail-label-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-xs);

    :global(.tooltip-trigger) {
      display: flex;
      align-items: center;
      color: var(--text-secondary);
      opacity: 0.7;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 1;
        color: var(--color-info);
      }
    }
  }

  .detail-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: 600;
    flex: 1;
  }

  .value-copy {
    display: flex;
    align-items: start;
    gap: var(--spacing-sm);
    width: 100%;
    height: 100%;
  }

  .detail-value {
    font-family: var(--font-mono);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
    flex: 1;
    min-width: 0;
    font-size: var(--font-size-sm);
    word-break: break-all;
    word-wrap: anywhere;
    height: 100%;
    overflow: auto;

    &.expanded {
      font-size: var(--font-size-xs);
      letter-spacing: 0.5px;
    }

    &.range {
      font-size: var(--font-size-xs);
      line-height: 1.4;
    }

    &.reverse {
      font-size: var(--font-size-xs);
    }

    &.binary-display {
      font-size: var(--font-size-xs);
      line-height: 1.6;
      letter-spacing: 1px;
    }
  }

  .copy-btn {
    transition: all var(--transition-fast);

    &.copied {
      color: var(--color-success);
      background-color: rgba(35, 134, 54, 0.1);
      border-color: var(--color-success);
      transform: scale(1.05);
    }
  }

  .visualization-section {
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .address-structure {
    margin-top: var(--spacing-md);
  }

  .structure-header {
    text-align: center;
    margin-bottom: var(--spacing-lg);

    h4 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-xs);
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin: 0;
    }
  }

  .bit-visualization {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .bit-section {
    &.network-bits .bit-bar {
      background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
    }

    &.host-bits .bit-bar {
      background: linear-gradient(90deg, var(--color-info), var(--color-info-light));
    }
  }

  .bit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .bit-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .bit-count {
    font-family: var(--font-mono);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .bit-bar {
    height: 1.5rem;
    border-radius: var(--radius-sm);
    position: relative;
    min-width: 2px;
  }

  .bit-scale {
    margin-top: var(--spacing-sm);
  }

  .scale-markers {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .error-message {
    color: var(--color-error);
    font-weight: 500;
    margin: 0;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .input-grid {
      grid-template-columns: 1fr;
      gap: var(--spacing-md);
    }

    .presets-grid {
      grid-template-columns: 1fr;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .details-grid {
      grid-template-columns: 1fr;
      gap: var(--spacing-md);
    }

    .details-section,
    .visualization-section {
      padding: var(--spacing-md);
    }

    .details-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }
  }

  @media (max-width: 480px) {
    .prefix-controls {
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .prefix-slider {
      order: 3;
      width: 100%;
    }
  }
</style>
