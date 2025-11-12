<script lang="ts">
  import type { SubnetInfo } from '$lib/types/ip.js';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import { formatNumber } from '$lib/utils/formatters';
  import { t, loadTranslations, locale } from '$lib/stores/language';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  // Load translations for this tool
  onMount(async () => {
    await loadTranslations(get(locale), 'tools.network-visualizer');
  });

  interface Props {
    subnetInfo: SubnetInfo;
    class?: string;
  }

  let { subnetInfo, class: className = '' }: Props = $props();

  /**
   * Generates visual representation of network range
   */
  function generateNetworkBlocks() {
    const totalHosts = subnetInfo.hostCount;
    const _usableHosts = subnetInfo.usableHosts;

    // For visualization, we'll show up to 256 blocks max
    const maxBlocks = 256;
    const blocksToShow = Math.min(totalHosts, maxBlocks);
    const blockSize = totalHosts > maxBlocks ? Math.ceil(totalHosts / maxBlocks) : 1;

    const blocks = [];

    for (let i = 0; i < blocksToShow; i++) {
      const isNetwork = i === 0;
      const isBroadcast = i === blocksToShow - 1 && totalHosts > 2;
      const _isUsable = !isNetwork && !isBroadcast;

      blocks.push({
        id: i,
        type: isNetwork ? 'network' : isBroadcast ? 'broadcast' : 'usable',
        represents: blockSize,
        tooltip: isNetwork
          ? $t('tools.network-visualizer.addressTypes.networkAddress')
          : isBroadcast
            ? $t('tools.network-visualizer.addressTypes.broadcastAddress')
            : blockSize > 1
              ? $t('tools.network-visualizer.addressTypes.usableHosts')
              : $t('tools.network-visualizer.addressTypes.usableHost'),
      });
    }

    return blocks;
  }

  let networkBlocks = $derived(generateNetworkBlocks());
  let usablePercentage = $derived(subnetInfo.hostCount > 0 ? (subnetInfo.usableHosts / subnetInfo.hostCount) * 100 : 0);

  /**
   * Get color class based on address utilization percentage
   */
  function getUtilizationColor(percentage: number): string {
    if (percentage >= 70) return 'success';
    if (percentage >= 40) return 'warning';
    return 'error';
  }
</script>

<div class="network-visualizer {className}">
  <section class="visualizer-section">
    <h3>{$t('tools.network-visualizer.sections.networkVisualization')}</h3>

    <!-- Network Range Bar -->
    <div class="range-section">
      <div class="range-header">
        <span class="range-label">{$t('tools.network-visualizer.ranges.addressRange')}</span>
        <span class="range-count">
          {$t('tools.network-visualizer.ranges.totalAddresses', { count: formatNumber(subnetInfo.hostCount) })}
        </span>
      </div>

      <div class="range-bar">
        <!-- Network Address -->
        <div
          class="range-segment network"
          style="width: {100 / subnetInfo.hostCount}%"
          title={$t('tools.network-visualizer.addressTypes.networkAddress')}
        >
          {#if subnetInfo.hostCount <= 32}
            <span class="segment-label">N</span>
          {/if}
        </div>

        <!-- Usable Hosts -->
        <div
          class="range-segment usable"
          style="left: {100 / subnetInfo.hostCount}%; width: {usablePercentage * (1 - 2 / subnetInfo.hostCount)}%"
          title={$t('tools.network-visualizer.tooltips.usableHostAddresses')}
        ></div>

        <!-- Broadcast Address -->
        {#if subnetInfo.hostCount > 1}
          <div
            class="range-segment broadcast"
            style="width: {100 / subnetInfo.hostCount}%"
            title={$t('tools.network-visualizer.addressTypes.broadcastAddress')}
          >
            {#if subnetInfo.hostCount <= 32}
              <span class="segment-label">B</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Legend -->
      <div class="range-legend">
        <div class="legend-item">
          <div class="legend-color network"></div>
          <span>{$t('tools.network-visualizer.legend.network')}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color usable"></div>
          <span
            >{$t('tools.network-visualizer.legend.usableHosts', { count: formatNumber(subnetInfo.usableHosts) })}</span
          >
        </div>
        {#if subnetInfo.hostCount > 1}
          <div class="legend-item">
            <div class="legend-color broadcast"></div>
            <span>{$t('tools.network-visualizer.legend.broadcast')}</span>
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- Binary Subnet Mask Visualization -->
  <section class="binary-section">
    <h4>{$t('tools.network-visualizer.sections.binaryBreakdown')}</h4>

    <div class="binary-display">
      {#each subnetInfo.subnet.octets as octet, i (i)}
        <div class="binary-row">
          <span class="octet-decimal">
            {octet.toString().padStart(3, '0')}
          </span>
          <span class="arrow">→</span>
          <div class="bits-group">
            {#each octet.toString(2).padStart(8, '0').split('') as bit, bitIndex (bitIndex)}
              <Tooltip
                text={$t('tools.network-visualizer.binary.bitTooltip', {
                  type:
                    bit === '1'
                      ? $t('tools.network-visualizer.binary.networkBit')
                      : $t('tools.network-visualizer.binary.hostBit'),
                  position: i * 8 + bitIndex + 1,
                })}
                position="top"
              >
                <span class="bit-box {bit === '1' ? 'network-bit' : 'host-bit'}">
                  {bit}
                </span>
              </Tooltip>
            {/each}
          </div>
          <span class="octet-label">
            {$t('tools.network-visualizer.binary.octetLabel', { number: i + 1 })}
          </span>
        </div>
      {/each}
    </div>

    <div class="binary-summary">
      <div class="bit-stats">
        <div class="bit-stat">
          <div class="legend-color network"></div>
          <span>{$t('tools.network-visualizer.binary.networkBits', { count: subnetInfo.cidr })}</span>
        </div>
        <div class="bit-stat">
          <div class="legend-color host"></div>
          <span>{$t('tools.network-visualizer.binary.hostBits', { count: 32 - subnetInfo.cidr })}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Address Grid (for smaller subnets) -->
  {#if subnetInfo.hostCount <= 64}
    <section class="grid-section">
      <h4>{$t('tools.network-visualizer.sections.addressGrid')}</h4>

      <div class="address-grid-wrap">
        <div class="address-grid">
          {#each networkBlocks as block (block.id)}
            <Tooltip text={block.tooltip} position="top">
              <div class="address-block {block.type}">
                {#if block.type === 'network'}
                  N
                {:else if block.type === 'broadcast'}
                  B
                {:else}
                  {block.id}
                {/if}
              </div>
            </Tooltip>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Efficiency Metrics -->
  <section class="efficiency-section">
    <h4>{$t('tools.network-visualizer.sections.networkEfficiency')}</h4>

    <div class="efficiency-grid">
      <div class="efficiency-metric">
        <div class="metric-value {getUtilizationColor(usablePercentage)}">
          {usablePercentage.toFixed(1)}%
        </div>
        <div class="metric-label">{$t('tools.network-visualizer.efficiency.addressUtilization')}</div>
      </div>

      <div class="efficiency-metric">
        <div class="metric-value">
          {subnetInfo.cidr}/32
        </div>
        <div class="metric-label">Network Specificity</div>
      </div>
    </div>
  </section>
</div>

<style lang="scss">
  .network-visualizer {
    max-width: 100%;
  }

  .visualizer-section {
    margin-bottom: var(--spacing-lg);

    h3 {
      margin-bottom: var(--spacing-md);
    }
  }

  .range-section {
    margin-bottom: var(--spacing-md);

    .range-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);

      .range-label {
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--text-primary);
      }

      .range-count {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }
    }

    .range-bar {
      position: relative;
      height: 2rem;
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--border-primary);

      .range-segment {
        position: absolute;
        top: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        &.network {
          left: 0;
          background-color: var(--color-info);
        }

        &.usable {
          background-color: var(--color-success);
        }

        &.broadcast {
          right: 0;
          background-color: var(--color-error);
        }

        .segment-label {
          font-size: var(--font-size-xs);
          color: var(--bg-tertiary);
          font-weight: 600;
        }
      }
    }

    .range-legend {
      display: flex;
      justify-content: center;
      gap: var(--spacing-lg);
      margin-top: var(--spacing-sm);

      .legend-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-sm);
      }
    }
  }

  .legend-color {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: var(--radius-sm);

    &.network {
      background-color: var(--color-info);
    }
    &.usable {
      background-color: var(--color-success);
    }
    &.broadcast {
      background-color: var(--color-error);
    }
    &.host {
      background-color: var(--text-secondary);
    }
  }

  .binary-section {
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);

    h4 {
      margin-bottom: var(--spacing-sm);
    }

    .binary-display {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);

      .binary-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);

        .octet-decimal {
          width: 3rem;
          color: var(--text-secondary);
          text-align: right;
        }

        .arrow {
          font-size: var(--font-size-lg);
          color: var(--text-secondary);
        }

        .bits-group {
          display: flex;
          gap: var(--spacing-xs);

          .bit-box {
            width: 1.5rem;
            height: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--font-size-xs);
            border-radius: var(--radius-sm);
            cursor: help;

            &.network-bit {
              background-color: var(--color-info);
              color: var(--bg-secondary);
            }

            &.host-bit {
              background-color: var(--bg-secondary);
              color: var(--text-secondary);
              border: 1px solid var(--border-primary);
            }
          }
        }

        .octet-label {
          color: var(--text-secondary);
          font-size: var(--font-size-xs);
        }

        @media (max-width: 768px) {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--spacing-xs);
        }
      }
    }

    .binary-summary {
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-sm);
      border-top: 1px solid var(--border-primary);

      .bit-stats {
        display: flex;
        justify-content: space-between;
        font-size: var(--font-size-sm);

        .bit-stat {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          flex-direction: column;
          gap: var(--spacing-sm);
        }
      }
    }
  }

  .grid-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      margin-bottom: var(--spacing-sm);
    }

    .address-grid-wrap {
      padding: var(--spacing-md);
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-lg);
      width: 100%;

      .address-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: var(--spacing-xs);
        width: fit-content;

        @media (max-width: 768px) {
          grid-template-columns: repeat(4, 1fr);
        }

        .address-block {
          width: 3rem;
          height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-xs);
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: transform var(--transition-fast);
          color: var(--bg-tertiary);

          &:hover {
            transform: scale(1.1);
          }

          &.network {
            background-color: var(--color-info);
          }

          &.broadcast {
            background-color: var(--color-error);
          }

          &.usable {
            background-color: var(--color-success);
            &:hover {
              background-color: var(--color-success-light);
            }
          }
        }
      }
    }
  }

  .efficiency-section {
    padding: var(--spacing-md);
    background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-secondary);

    h4 {
      margin-bottom: var(--spacing-sm);
    }

    .efficiency-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);

      .efficiency-metric {
        text-align: center;

        .metric-value {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          color: var(--color-info-light);
          margin-bottom: var(--spacing-xs);
        }

        .metric-label {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }
      }

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }
  }

  /* Color coding for address utilization */
  .metric-value.success {
    color: var(--color-success) !important;
  }

  .metric-value.warning {
    color: var(--color-warning) !important;
  }

  .metric-value.error {
    color: var(--color-error) !important;
  }
</style>
