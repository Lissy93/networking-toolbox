<!-- src/routes/reference/common-subnets/+page.svelte -->
<script lang="ts">
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import { COMMON_SUBNETS } from '$lib/constants/networks.js';
</script>

<div class="card">
  <header class="card-header">
    <h2>Common Subnets</h2>
    <p>Frequently used CIDR prefixes with masks, host counts, and typical usage.</p>
  </header>

  <div class="subnets-table fade-in">
    <div class="table-header">
      <span>CIDR</span>
      <span>Subnet Mask</span>
      <span>Hosts</span>
      <span>Usage</span>
    </div>

    {#each COMMON_SUBNETS as subnet (`${subnet.cidr}-${subnet.mask}`)}
      <Tooltip
        text={`/${subnet.cidr} with ${subnet.mask} supports ${subnet.hosts.toLocaleString()} hosts`}
        position="top"
      >
        <div class="table-row">
          <span class="cidr-cell">/{subnet.cidr}</span>
          <span class="mask-cell">{subnet.mask}</span>
          <span class="hosts-cell">{subnet.hosts.toLocaleString()}</span>
          <span class="usage-cell">
            {#if subnet.cidr === 8}
              Large ISPs
            {:else if subnet.cidr === 16}
              Universities
            {:else if subnet.cidr === 24}
              Small businesses
            {:else if subnet.cidr === 25}
              Departments
            {:else if subnet.cidr === 26}
              Teams
            {:else if subnet.cidr === 27}
              Small offices
            {:else if subnet.cidr === 28}
              Workgroups
            {:else if subnet.cidr === 29}
              Small groups
            {:else if subnet.cidr === 30}
              Point-to-point
            {:else}
              General use
            {/if}
          </span>
        </div>
      </Tooltip>
    {/each}
  </div>
</div>

<style lang="scss">
  .subnets-table {
    margin: var(--spacing-lg) 0;

    :global(.tooltip-container) {
      width: 100%;
    }
  }

  .table-header {
    display: grid;
    grid-template-columns: 1fr 2fr 1.5fr 2fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-primary);
    margin-bottom: var(--spacing-sm);

    > span {
      display: flex;
      align-items: center;

      &:nth-child(1),
      &:nth-child(2),
      &:nth-child(4) {
        justify-content: flex-start;
      }
      &:nth-child(3) {
        justify-content: flex-end;
      }
    }

    @media (max-width: 768px) {
      display: none;
    }
  }

  .table-row {
    display: grid;
    grid-template-columns: 1fr 2fr 1.5fr 2fr;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-xs);
    transition: background-color var(--transition-fast);
    cursor: help;

    &:hover {
      background-color: var(--surface-hover);
    }

    @media (max-width: 768px) {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
    }
  }

  .cidr-cell,
  .mask-cell,
  .hosts-cell,
  .usage-cell {
    display: flex;
    align-items: center;
    font-family: var(--font-mono);

    @media (max-width: 768px) {
      &::before {
        color: var(--text-secondary);
        font-weight: normal;
      }
    }
  }

  .cidr-cell {
    font-weight: 700;
    color: var(--color-info-light);
    justify-content: flex-start;
    @media (max-width: 768px) {
      &::before {
        content: 'CIDR: ';
      }
    }
  }

  .mask-cell {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    justify-content: flex-start;
    @media (max-width: 768px) {
      &::before {
        content: 'Mask: ';
      }
    }
  }

  .hosts-cell {
    font-size: var(--font-size-sm);
    color: var(--color-success-light);
    justify-content: flex-end;
    @media (max-width: 768px) {
      &::before {
        content: 'Hosts: ';
      }
    }
  }

  .usage-cell {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    justify-content: flex-start;
    font-family: inherit;
    @media (max-width: 768px) {
      &::before {
        content: 'Usage: ';
      }
    }
  }
</style>
