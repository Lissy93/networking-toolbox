<script lang="ts">
  import {
    calculateVLSM,
    generateSubnetId,
    validateSubnetRequirement,
    type SubnetRequirement,
    type VLSMResult,
  } from '$lib/utils/vlsm-calculations.js';
  import { validateIPv4 } from '$lib/utils/ip-validation.js';
  import IPInput from './IPInput.svelte';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import { useClipboard } from '$lib/composables';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { SvelteSet } from 'svelte/reactivity';
  import { formatNumber } from '$lib/utils/formatters';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools.vlsm-calculator');
  });

  let networkIP = $state('192.168.1.0');
  let cidr = $state(24);
  let subnets = $state<SubnetRequirement[]>([]);
  let vlsmResult = $state<VLSMResult | null>(null);
  const clipboard = useClipboard();
  let expandedSubnets = new SvelteSet<string>();

  // Add initial subnet requirement
  $effect(() => {
    if (subnets.length === 0) {
      addSubnet();
    }
  });

  /**
   * Add a new subnet requirement
   */
  function addSubnet() {
    subnets.push({
      id: generateSubnetId(),
      name: $t('tools.vlsm-calculator.defaultSubnetName', { number: subnets.length + 1 }),
      hostsNeeded: 50,
      description: '',
    });
  }

  /**
   * Remove a subnet requirement
   */
  function removeSubnet(id: string) {
    subnets = subnets.filter((subnet) => subnet.id !== id);
    if (subnets.length === 0) {
      vlsmResult = null;
    }
  }

  /**
   * Update subnet requirement
   */
  function updateSubnet(id: string, field: keyof SubnetRequirement, value: string | number) {
    const index = subnets.findIndex((s) => s.id === id);
    if (index !== -1) {
      subnets[index] = { ...subnets[index], [field]: value };
    }
  }

  /**
   * Calculate VLSM subnets
   */
  function calculateSubnets() {
    const ipValidation = validateIPv4(networkIP);
    if (!ipValidation.valid) {
      vlsmResult = {
        success: false,
        subnets: [],
        error: ipValidation.error,
        originalNetwork: networkIP,
        originalCIDR: cidr,
        totalHostsRequested: 0,
        totalHostsProvided: 0,
        totalWastedHosts: 0,
        remainingAddresses: 0,
      };
      return;
    }

    // Validate all subnet requirements
    for (const subnet of subnets) {
      const validation = validateSubnetRequirement(subnet);
      if (!validation.valid) {
        vlsmResult = {
          success: false,
          subnets: [],
          error: `${subnet.name}: ${validation.error}`,
          originalNetwork: networkIP,
          originalCIDR: cidr,
          totalHostsRequested: 0,
          totalHostsProvided: 0,
          totalWastedHosts: 0,
          remainingAddresses: 0,
        };
        return;
      }
    }

    vlsmResult = calculateVLSM(networkIP, cidr, subnets);
  }

  /**
   * Toggle subnet details expansion
   */
  function toggleSubnetExpansion(subnetId: string) {
    if (expandedSubnets.has(subnetId)) {
      expandedSubnets.delete(subnetId);
    } else {
      expandedSubnets.add(subnetId);
    }
  }

  /**
   * Copy text to clipboard
   */
  /**
   * Get efficiency color based on waste percentage
   */
  function getEfficiencyColor(wastedHosts: number, providedHosts: number): string {
    const wastePercentage = (wastedHosts / providedHosts) * 100;
    if (wastePercentage < 25) return 'var(--color-success)';
    if (wastePercentage < 50) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  // Reactive calculations
  $effect(() => {
    if (networkIP && cidr && subnets.length > 0) {
      calculateSubnets();
    }
  });
</script>

<ToolContentContainer title={$t('tools.vlsm-calculator.title')} description={$t('tools.vlsm-calculator.description')}>
  <!-- Network Configuration -->
  <div class="network-config">
    <h3>{$t('tools.vlsm-calculator.networkConfig.title')}</h3>
    <div class="grid grid-2">
      <div class="form-group">
        <IPInput
          bind:value={networkIP}
          label={$t('tools.vlsm-calculator.networkConfig.networkAddress.label')}
          placeholder={$t('tools.vlsm-calculator.networkConfig.networkAddress.placeholder')}
        />
      </div>
      <div class="form-group">
        <label for="cidr-input">{$t('tools.vlsm-calculator.networkConfig.cidrNotation.label')}</label>
        <div class="cidr-input">
          <span class="cidr-prefix">/{cidr}</span>
          <input id="cidr-input" type="range" min="8" max="30" bind:value={cidr} class="cidr-slider" />
          <input type="number" min="8" max="30" bind:value={cidr} class="cidr-number" />
        </div>
      </div>
    </div>
  </div>

  <!-- Subnet Requirements -->
  <div class="subnet-requirements">
    <div class="requirements-header">
      <h3>{$t('tools.vlsm-calculator.subnetRequirements.title')}</h3>
      <button type="button" class="btn btn-primary" onclick={addSubnet}>
        <Icon name="plus" size="sm" />
        {$t('tools.vlsm-calculator.subnetRequirements.addSubnet')}
      </button>
    </div>

    <div class="requirements-list">
      {#each subnets as subnet, index (subnet.id)}
        <div class="requirement-item">
          <div class="requirement-header">
            <span class="requirement-number">{index + 1}</span>
            <div class="requirement-inputs">
              <input
                type="text"
                placeholder={$t('tools.vlsm-calculator.subnetRequirements.subnetName.placeholder')}
                bind:value={subnet.name}
                oninput={(e) => updateSubnet(subnet.id, 'name', (e.target as HTMLInputElement)?.value)}
                class="subnet-name-input"
              />
              <div class="hosts-input">
                <label for="hosts-{index}">{$t('tools.vlsm-calculator.subnetRequirements.hostsNeeded')}</label>
                <input
                  id="hosts-{index}"
                  type="number"
                  min="1"
                  max="16777214"
                  bind:value={subnet.hostsNeeded}
                  oninput={(e) =>
                    updateSubnet(subnet.id, 'hostsNeeded', parseInt((e.target as HTMLInputElement)?.value || '1'))}
                  class="hosts-number-input"
                />
              </div>
            </div>
            <button
              type="button"
              class="btn btn-danger-ghost"
              onclick={() => removeSubnet(subnet.id)}
              disabled={subnets.length === 1}
            >
              <Icon name="trash" size="sm" />
            </button>
          </div>

          <div class="requirement-description">
            <input
              type="text"
              placeholder={$t('tools.vlsm-calculator.subnetRequirements.description.placeholder')}
              bind:value={subnet.description}
              oninput={(e) => updateSubnet(subnet.id, 'description', (e.target as HTMLTextAreaElement)?.value)}
              class="description-input"
            />
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Results -->
  {#if vlsmResult}
    <div class="results-section">
      {#if vlsmResult.success}
        <!-- Summary -->
        <div class="info-panel success">
          <h3>{$t('tools.vlsm-calculator.summary.title')}</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">{$t('tools.vlsm-calculator.summary.totalSubnets')}</span>
              <span class="stat-value">{vlsmResult.subnets.length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{$t('tools.vlsm-calculator.summary.hostsRequested')}</span>
              <span class="stat-value">{formatNumber(vlsmResult.totalHostsRequested)}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{$t('tools.vlsm-calculator.summary.hostsProvided')}</span>
              <span class="stat-value">{formatNumber(vlsmResult.totalHostsProvided)}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{$t('tools.vlsm-calculator.summary.wastedHosts')}</span>
              <span class="stat-value danger">{formatNumber(vlsmResult.totalWastedHosts)}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{$t('tools.vlsm-calculator.summary.efficiency')}</span>
              <span
                class="stat-value"
                style="color: {getEfficiencyColor(vlsmResult.totalWastedHosts, vlsmResult.totalHostsProvided)}"
              >
                {((1 - vlsmResult.totalWastedHosts / vlsmResult.totalHostsProvided) * 100).toFixed(1)}%
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{$t('tools.vlsm-calculator.summary.remainingAddresses')}</span>
              <span class="stat-value">{formatNumber(vlsmResult.remainingAddresses)}</span>
            </div>
          </div>
        </div>

        <!-- Subnets Table -->
        <div class="subnets-table-container">
          <h3>{$t('tools.vlsm-calculator.table.title')}</h3>
          <div class="subnets-table">
            <div class="table-header">
              <div class="col-name">{$t('tools.vlsm-calculator.table.columns.subnet')}</div>
              <div class="col-network">{$t('tools.vlsm-calculator.table.columns.network')}</div>
              <div class="col-hosts">{$t('tools.vlsm-calculator.table.columns.hosts')}</div>
              <div class="col-mask">{$t('tools.vlsm-calculator.table.columns.mask')}</div>
              <div class="col-efficiency">{$t('tools.vlsm-calculator.table.columns.efficiency')}</div>
              <div class="col-actions">{$t('tools.vlsm-calculator.table.columns.actions')}</div>
            </div>

            {#each vlsmResult.subnets as subnet (subnet.id)}
              <div class="table-row">
                <div class="col-name">
                  <div class="subnet-name">{subnet.name}</div>
                  {#if subnet.description}
                    <div class="subnet-description">{subnet.description}</div>
                  {/if}
                </div>

                <div class="col-network">
                  <div class="network-info">
                    <div class="network-address">{subnet.networkAddress}/{subnet.cidr}</div>
                    <div class="address-range">
                      {subnet.firstUsableHost} - {subnet.lastUsableHost}
                    </div>
                  </div>
                </div>

                <div class="col-hosts">
                  <div class="hosts-info">
                    <div class="hosts-needed">
                      {$t('tools.vlsm-calculator.table.hostsNeeded', { count: subnet.hostsNeeded })}
                    </div>
                    <div class="hosts-provided">
                      {$t('tools.vlsm-calculator.table.hostsProvided', { count: subnet.hostsProvided })}
                    </div>
                    {#if subnet.wastedHosts > 0}
                      <div class="hosts-wasted">
                        {$t('tools.vlsm-calculator.table.hostsWasted', { count: subnet.wastedHosts })}
                      </div>
                    {/if}
                  </div>
                </div>

                <div class="col-mask">
                  <div class="mask-info">
                    <div class="subnet-mask">{subnet.subnetMask}</div>
                    <div class="wildcard-mask">{subnet.wildcardMask}</div>
                  </div>
                </div>

                <div class="col-efficiency">
                  <div
                    class="efficiency-indicator"
                    style="color: {getEfficiencyColor(subnet.wastedHosts, subnet.hostsProvided)}"
                  >
                    {((1 - subnet.wastedHosts / subnet.hostsProvided) * 100).toFixed(1)}%
                  </div>
                </div>

                <div class="col-actions">
                  <button
                    type="button"
                    class="btn btn-ghost primary-ghost {expandedSubnets.has(subnet.id) ? 'expanded' : ''}"
                    onclick={() => toggleSubnetExpansion(subnet.id)}
                  >
                    <Icon name="chevron-down" size="sm" />
                  </button>
                  <Tooltip text={$t('tools.vlsm-calculator.actions.copyNetworkInfo')} position="left">
                    <button
                      type="button"
                      class="btn btn-ghost {clipboard.isCopied(`copy-${subnet.id}`) ? 'copied' : ''}"
                      onclick={() => clipboard.copy(`${subnet.networkAddress}/${subnet.cidr}`, `copy-${subnet.id}`)}
                    >
                      <Icon name={clipboard.isCopied(`copy-${subnet.id}`) ? 'tick' : 'copy'} size="sm" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {#if expandedSubnets.has(subnet.id)}
                <div class="subnet-details">
                  <div class="details-grid">
                    <div class="detail-item">
                      <span
                        class="detail-label"
                        use:tooltip={$t('tools.vlsm-calculator.details.networkAddress.tooltip')}
                        >{$t('tools.vlsm-calculator.details.networkAddress.label')}</span
                      >
                      <code class="detail-value">{subnet.networkAddress}</code>
                    </div>
                    <div class="detail-item">
                      <span
                        class="detail-label"
                        use:tooltip={$t('tools.vlsm-calculator.details.broadcastAddress.tooltip')}
                        >{$t('tools.vlsm-calculator.details.broadcastAddress.label')}</span
                      >
                      <code class="detail-value">{subnet.broadcastAddress}</code>
                    </div>
                    <div class="detail-item">
                      <span
                        class="detail-label"
                        use:tooltip={$t('tools.vlsm-calculator.details.firstUsableHost.tooltip')}
                        >{$t('tools.vlsm-calculator.details.firstUsableHost.label')}</span
                      >
                      <code class="detail-value">{subnet.firstUsableHost}</code>
                    </div>
                    <div class="detail-item">
                      <span
                        class="detail-label"
                        use:tooltip={$t('tools.vlsm-calculator.details.lastUsableHost.tooltip')}
                        >{$t('tools.vlsm-calculator.details.lastUsableHost.label')}</span
                      >
                      <code class="detail-value">{subnet.lastUsableHost}</code>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label" use:tooltip={$t('tools.vlsm-calculator.details.subnetMask.tooltip')}
                        >{$t('tools.vlsm-calculator.details.subnetMask.label')}</span
                      >
                      <code class="detail-value">{subnet.subnetMask}</code>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label" use:tooltip={$t('tools.vlsm-calculator.details.wildcardMask.tooltip')}
                        >{$t('tools.vlsm-calculator.details.wildcardMask.label')}</span
                      >
                      <code class="detail-value">{subnet.wildcardMask}</code>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label" use:tooltip={$t('tools.vlsm-calculator.details.binaryMask.tooltip')}
                        >{$t('tools.vlsm-calculator.details.binaryMask.label')}</span
                      >
                      <code class="detail-value binary-mask">{subnet.binaryMask}</code>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label" use:tooltip={$t('tools.vlsm-calculator.details.hostBits.tooltip')}
                        >{$t('tools.vlsm-calculator.details.hostBits.label')}</span
                      >
                      <code class="detail-value"
                        >{$t('tools.vlsm-calculator.details.hostBits.value', { count: subnet.actualHostBits })}</code
                      >
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <!-- Next Available Network -->
        {#if vlsmResult.nextAvailableNetwork}
          <div class="info-panel info">
            <h4>Next Available Network</h4>
            <p>
              The next available network address for additional subnets:
              <code>{vlsmResult.nextAvailableNetwork}</code>
            </p>
          </div>
        {/if}
      {:else}
        <!-- Error -->
        <div class="info-panel error">
          <h3>{$t('tools.vlsm-calculator.error.title')}</h3>
          <p class="error-message">{vlsmResult.error}</p>
        </div>
      {/if}
    </div>
  {/if}
</ToolContentContainer>

<style>
  .btn {
    :global(.icon) {
      vertical-align: middle;
      transition: transform var(--transition-fast);
    }
    &.btn-ghost {
      height: fit-content;
      padding: var(--spacing-xs) var(--spacing-sm);
      transition: all var(--transition-fast);

      &.copied {
        background-color: var(--color-success);
        border-color: var(--color-success);
        color: var(--bg-primary);
        transform: scale(1.05);
      }
    }
    &.primary-ghost {
      background: var(--color-primary);
      color: var(--bg-primary);

      &.expanded :global(.icon) {
        transform: rotate(180deg);
      }
    }
  }

  .network-config {
    margin-bottom: var(--spacing-lg);
  }

  .cidr-input {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .cidr-prefix {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-primary);
    font-size: var(--font-size-lg);
  }

  .cidr-slider {
    flex: 1;
    margin: 0 var(--spacing-sm);
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

  .cidr-number {
    width: 4rem;
    text-align: center;

    /* Hide number input arrows */
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

  .subnet-requirements {
    margin-bottom: var(--spacing-lg);
  }

  .requirements-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .requirements-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .requirement-item {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-primary);
  }

  .requirement-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .requirement-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background-color: var(--color-primary);
    color: var(--bg-primary);
    border-radius: 50%;
    font-weight: 600;
    font-size: var(--font-size-sm);
    flex-shrink: 0;
  }

  .requirement-inputs {
    display: flex;
    gap: var(--spacing-md);
    flex: 1;
    align-items: center;
  }

  .subnet-name-input {
    flex: 1;
    min-width: 150px;
  }

  .hosts-input {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    white-space: nowrap;
  }

  .hosts-input label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .hosts-number-input {
    width: 6rem;

    /* Hide number input arrows */
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

  .requirement-description {
    margin-top: var(--spacing-sm);
    margin-left: 3rem;
  }

  .description-input {
    width: 100%;
  }

  .results-section {
    margin-top: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .stat-value.danger {
    color: var(--color-danger);
  }

  .subnets-table-container {
    width: 100%;
  }

  .subnets-table {
    display: flex;
    flex-direction: column;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border-primary);
  }

  .table-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 100px 80px;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-primary);
    font-weight: 600;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .table-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 100px 80px;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-primary);
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .subnet-name {
    font-weight: 600;
    color: var(--color-primary);
  }

  .subnet-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .network-address {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  .address-range {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .hosts-needed {
    color: var(--text-primary);
    font-weight: 500;
  }

  .hosts-provided {
    color: var(--color-success);
    font-size: var(--font-size-sm);
  }

  .hosts-wasted {
    color: var(--color-danger);
    font-size: var(--font-size-sm);
  }

  .subnet-mask {
    font-family: var(--font-mono);
    color: var(--text-primary);
  }

  .wildcard-mask {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .efficiency-indicator {
    font-weight: 600;
    text-align: center;
  }

  .col-actions {
    display: flex;
    gap: var(--spacing-xs);
    justify-content: center;
  }

  .subnet-details {
    grid-column: 1 / -1;
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-top: 1px solid var(--border-primary);
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(228px, 1fr));
    gap: var(--spacing-md);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .detail-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detail-value {
    font-family: var(--font-mono);
    background-color: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .binary-mask {
    font-size: var(--font-size-xs);
    word-break: break-all;
  }

  .error-message {
    color: var(--color-danger);
    font-weight: 500;
    margin: 0;
  }

  @media (max-width: 768px) {
    .requirement-inputs {
      flex-direction: column;
      align-items: stretch;
    }

    .hosts-input {
      justify-content: space-between;
    }

    .table-header,
    .table-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-xs);
    }

    .table-header > div,
    .table-row > div {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-header > div::before,
    .table-row > div::before {
      content: attr(data-label);
      font-weight: 600;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }

    .col-actions {
      justify-content: flex-end;
    }

    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
