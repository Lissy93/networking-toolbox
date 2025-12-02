<script lang="ts">
  import { calculateSubnet } from '$lib/utils/ip-calculations.js';
  import { validateCIDR } from '$lib/utils/ip-validation.js';
  import { formatNumber } from '$lib/utils/formatters.js';
  import CIDRInput from '$lib/components/tools/CIDRInput.svelte';
  import NetworkVisualizer from '$lib/components/tools/NetworkVisualizer.svelte';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import SvgIcon from '$lib/components/global/SvgIcon.svelte';
  import ToolContentContainer from '$lib/components/global/ToolContentContainer.svelte';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';
  import { goto } from '$app/navigation';
  import type { SubnetInfo } from '$lib/types/ip.js';
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

  let selectedVersion = $state<'ipv4' | 'ipv6'>('ipv4');

  function handleVersionChange(version: 'ipv4' | 'ipv6') {
    if (version === 'ipv6') {
      goto('/subnetting/ipv6-subnet-calculator');
    }
  }

  let cidrInput = $state('192.168.1.0/24');
  let subnetInfo: SubnetInfo | null = $state(null);
  let isCalculating = $state(false);
  let hasEverShownResults = $state(false);

  /**
   * Calculate subnet info when input changes
   */
  $effect(() => {
    if (cidrInput && validateCIDR(cidrInput).valid) {
      const [ip, cidr] = cidrInput.split('/');
      try {
        subnetInfo = calculateSubnet(ip, parseInt(cidr, 10));
        if (!hasEverShownResults) {
          hasEverShownResults = true;
        }
      } catch (error) {
        console.error('Calculation error:', error);
        subnetInfo = null;
      }
    } else {
      subnetInfo = null;
    }
  });

  const clipboard = useClipboard();
</script>

<ToolContentContainer
  title={$t('tools.subnet_calculator.title')}
  description={$t('tools.subnet_calculator.description')}
  navOptions={versionOptions}
  bind:selectedNav={selectedVersion}
  onNavChange={handleVersionChange}
>
  <!-- Input -->
  <div class="form-group">
    <CIDRInput
      bind:value={cidrInput}
      label={$t('tools.subnet_calculator.input.cidr_label')}
      placeholder={$t('tools.subnet_calculator.input.cidr_placeholder')}
    />
  </div>

  <!-- Results -->
  {#if subnetInfo}
    <div class="grid grid-2">
      <!-- Network Info -->
      <section>
        <h3
          style="margin-bottom: var(--spacing-md); border-bottom: 1px solid var(--border-primary); padding-bottom: var(--spacing-xs);"
        >
          {$t('tools.subnet_calculator.sections.network_info')}
        </h3>

        <div class="info-cards">
          <div class="info-card">
            <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.network_address')}
              >{$t('tools.subnet_calculator.fields.network_address')}</span
            >
            <div class="value-copy">
              <code class="ip-value success">{subnetInfo.network.octets.join('.')}</code>
              <Tooltip
                text={clipboard.isCopied('network')
                  ? $t('tools.subnet_calculator.actions.copied')
                  : $t('tools.subnet_calculator.actions.copy_network')}
                position="top"
              >
                <button
                  type="button"
                  class="btn-icon copy-btn {clipboard.isCopied('network') ? 'copied' : ''}"
                  onclick={() => clipboard.copy(subnetInfo!.network.octets.join('.'), 'network')}
                  aria-label={$t('tools.subnet_calculator.actions.copy_network_aria')}
                >
                  <SvgIcon icon={clipboard.isCopied('network') ? 'check' : 'clipboard'} size="md" />
                </button>
              </Tooltip>
            </div>
          </div>

          <div class="info-card">
            <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.broadcast_address')}
              >{$t('tools.subnet_calculator.fields.broadcast_address')}</span
            >
            <div class="value-copy">
              <code class="ip-value error">{subnetInfo.broadcast.octets.join('.')}</code>
              <Tooltip
                text={clipboard.isCopied('broadcast')
                  ? $t('tools.subnet_calculator.actions.copied')
                  : $t('tools.subnet_calculator.actions.copy_broadcast')}
                position="top"
              >
                <button
                  type="button"
                  class="btn-icon copy-btn {clipboard.isCopied('broadcast') ? 'copied' : ''}"
                  onclick={() => clipboard.copy(subnetInfo!.broadcast.octets.join('.'), 'broadcast')}
                  aria-label={$t('tools.subnet_calculator.actions.copy_broadcast_aria')}
                >
                  <SvgIcon icon={clipboard.isCopied('broadcast') ? 'check' : 'clipboard'} size="md" />
                </button>
              </Tooltip>
            </div>
          </div>

          <div class="info-card">
            <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.subnet_mask')}
              >{$t('tools.subnet_calculator.fields.subnet_mask')}</span
            >
            <div class="value-copy">
              <code class="ip-value info">{subnetInfo.subnet.octets.join('.')}</code>
              <span class="cidr">/{subnetInfo.cidr}</span>
            </div>
          </div>

          <div class="info-card">
            <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.wildcard_mask')}
              >{$t('tools.subnet_calculator.fields.wildcard_mask')}</span
            >
            <code class="ip-value warning">{subnetInfo.wildcardMask.octets.join('.')}</code>
          </div>
        </div>
      </section>

      <!-- Host Info -->
      <section>
        <h3
          style="margin-bottom: var(--spacing-md); border-bottom: 1px solid var(--border-primary); padding-bottom: var(--spacing-xs);"
        >
          {$t('tools.subnet_calculator.sections.host_info')}
        </h3>

        <div class="info-cards">
          <div class="info-card">
            <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.total_hosts')}
              >{$t('tools.subnet_calculator.fields.total_hosts')}</span
            >
            <span class="metric-value info">{formatNumber(subnetInfo.hostCount)}</span>
          </div>

          <div class="info-card">
            <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.usable_hosts')}
              >{$t('tools.subnet_calculator.fields.usable_hosts')}</span
            >
            <span class="metric-value success">{formatNumber(subnetInfo.usableHosts)}</span>
          </div>

          <div class="info-card">
            <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.first_host')}
              >{$t('tools.subnet_calculator.fields.first_host')}</span
            >
            <code class="ip-value success">{subnetInfo.firstHost.octets.join('.')}</code>
          </div>

          <div class="info-card">
            <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.last_host')}
              >{$t('tools.subnet_calculator.fields.last_host')}</span
            >
            <code class="ip-value success">{subnetInfo.lastHost.octets.join('.')}</code>
          </div>
        </div>
      </section>
    </div>

    <!-- Binary Representation -->
    <section class="info-panel" style="margin-top: var(--spacing-lg);">
      <h3>{$t('tools.subnet_calculator.sections.binary_representation')}</h3>
      <div class="binary-display">
        <div class="binary-row">
          <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.network_binary')}
            >{$t('tools.subnet_calculator.binary.network_label')}</span
          >
          <code class="binary-value success">{subnetInfo.network.binary}</code>
        </div>
        <div class="binary-row">
          <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.mask_binary')}
            >{$t('tools.subnet_calculator.binary.mask_label')}</span
          >
          <code class="binary-value info">{subnetInfo.subnet.binary}</code>
        </div>
        <div class="binary-row">
          <span class="info-label" use:tooltip={$t('tools.subnet_calculator.tooltips.broadcast_binary')}
            >{$t('tools.subnet_calculator.binary.broadcast_label')}</span
          >
          <code class="binary-value error">{subnetInfo.broadcast.binary}</code>
        </div>
      </div>
    </section>

    <!-- Network Visualization -->
    <section style="margin-top: var(--spacing-lg);">
      <NetworkVisualizer {subnetInfo} />
    </section>
  {/if}

  <!-- Loading -->
  {#if isCalculating}
    <div class="loading" style="justify-content: center; padding: var(--spacing-xl);">
      <div class="spinner"></div>
      {$t('tools.subnet_calculator.actions.calculating')}
    </div>
  {/if}

  <!-- Explainer Section -->
  <section class="explainer-section">
    <h3>{$t('tools.subnet_calculator.explainer.title')}</h3>

    <div class="explainer-grid">
      <div class="explainer-card no-hover">
        <h4>{$t('tools.subnet_calculator.explainer.network_address.title')}</h4>
        <p>
          {$t('tools.subnet_calculator.explainer.network_address.description')}
        </p>
      </div>

      <div class="explainer-card no-hover">
        <h4>{$t('tools.subnet_calculator.explainer.broadcast_address.title')}</h4>
        <p>
          {$t('tools.subnet_calculator.explainer.broadcast_address.description')}
        </p>
      </div>

      <div class="explainer-card no-hover">
        <h4>{$t('tools.subnet_calculator.explainer.subnet_mask.title')}</h4>
        <p>
          {$t('tools.subnet_calculator.explainer.subnet_mask.description')}
        </p>
      </div>

      <div class="explainer-card no-hover">
        <h4>{$t('tools.subnet_calculator.explainer.wildcard_mask.title')}</h4>
        <p>
          {$t('tools.subnet_calculator.explainer.wildcard_mask.description')}
        </p>
      </div>

      <div class="explainer-card no-hover">
        <h4>{$t('tools.subnet_calculator.explainer.usable_hosts.title')}</h4>
        <p>
          {$t('tools.subnet_calculator.explainer.usable_hosts.description')}
        </p>
      </div>

      <div class="explainer-card no-hover">
        <h4>{$t('tools.subnet_calculator.explainer.cidr_notation.title')}</h4>
        <p>
          {$t('tools.subnet_calculator.explainer.cidr_notation.description')}
        </p>
      </div>
    </div>

    <div class="tips-box">
      <h4>{$t('tools.subnet_calculator.tips.title')}</h4>
      <ul>
        <li>{$t('tools.subnet_calculator.tips.plan_growth')}</li>
        <li>{$t('tools.subnet_calculator.tips.binary_understanding')}</li>
        <li>{$t('tools.subnet_calculator.tips.common_sizes')}</li>
        <li>{$t('tools.subnet_calculator.tips.private_networks')}</li>
      </ul>
    </div>
  </section>
</ToolContentContainer>

<style lang="scss">
  .explainer-section {
    margin-top: var(--spacing-xl);
    padding: var(--spacing-lg);
    background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-secondary);

    h3 {
      margin-bottom: var(--spacing-lg);
      text-align: center;
      color: var(--color-primary);
    }

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }
  }

  .explainer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .value-copy {
    flex: none;
  }

  .explainer-card {
    cursor: default;
  }

  .tips-box {
    background-color: var(--bg-primary);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      color: var(--color-warning);
      margin-bottom: var(--spacing-sm);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      margin-bottom: var(--spacing-sm);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      line-height: 1.6;

      &::before {
        content: '•';
        color: var(--color-warning);
        font-weight: bold;
        display: inline-block;
        width: 1em;
        margin-right: var(--spacing-xs);
      }
    }
  }
</style>
