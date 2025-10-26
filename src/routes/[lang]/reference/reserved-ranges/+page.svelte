<!-- src/routes/reference/reserved-ranges/+page.svelte -->
<script lang="ts">
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import { RESERVED_RANGES } from '$lib/constants/networks.js';
</script>

<div class="card">
  <header class="card-header">
    <h2>Reserved Ranges</h2>
    <p>Special-purpose IPv4 ranges (loopback, private, link-local, multicast, etc.).</p>
  </header>

  <div class="reference-section fade-in">
    {#each Object.entries(RESERVED_RANGES) as [rangeName, rangeInfo] (rangeName)}
      <Tooltip text={`${rangeInfo.description} — Defined in ${rangeInfo.rfc}`} position="top">
        <div class="reference-card">
          <div class="card-header-inline">
            <div class="range-info">
              <h3 class="range-address">{rangeInfo.range}</h3>
              <span class="range-description">{rangeInfo.description}</span>
            </div>
            <span class="rfc-badge">{rangeInfo.rfc}</span>
          </div>

          {#if rangeName.includes('PRIVATE')}
            <div class="private-notice">
              <strong>Private Network:</strong> Not routed on the public Internet
            </div>
          {/if}
        </div>
      </Tooltip>
    {/each}
  </div>
</div>

<style lang="scss">
  .reference-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin: var(--spacing-lg) 0;
  }

  .reference-card {
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background: var(--bg-secondary);
    padding: var(--spacing-md);
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      background-color: var(--surface-hover);
      box-shadow: var(--shadow-md);
    }
  }

  .card-header-inline {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-sm);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }
  }

  .range-info h3 {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .range-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .rfc-badge {
    font-size: var(--font-size-xs);
    color: var(--color-info-light);
    background-color: rgba(9, 105, 218, 0.1);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
  }

  .private-notice {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background-color: rgba(35, 134, 54, 0.1);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    color: var(--color-success-light);
  }
</style>
