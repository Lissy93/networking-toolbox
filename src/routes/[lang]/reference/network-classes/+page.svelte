<!-- src/routes/reference/network-classes/+page.svelte -->
<script lang="ts">
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import { NETWORK_CLASSES } from '$lib/constants/networks.js';
</script>

<div class="card">
  <header class="card-header">
    <h2>Network Classes</h2>
    <p>Class A/B/C overview with default masks, ranges, and typical usage.</p>
  </header>

  <div class="reference-section fade-in">
    {#each Object.entries(NETWORK_CLASSES) as [className, classInfo] (className)}
      <Tooltip
        text={`Class ${className} networks use ${classInfo.defaultMask} (/${classInfo.cidr}) and cover ${classInfo.range}`}
        position="top"
      >
        <div class="reference-card">
          <div class="card-header-inline">
            <div class="class-info">
              <div class="class-badge {className.toLowerCase()}">
                {className}
              </div>
              <div class="class-details">
                <h3>Class {className}</h3>
                <span class="mask-info">
                  {classInfo.defaultMask} (/{classInfo.cidr})
                </span>
              </div>
            </div>
            <span class="range-badge">
              {classInfo.range.split(' - ')[0]} - {classInfo.range.split(' - ')[1]}
            </span>
          </div>

          <p class="class-description">
            {classInfo.description}
          </p>

          <p class="usage-info">
            <strong>Typical Usage:</strong>
            {classInfo.usage}
          </p>
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

  .class-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .class-badge {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: var(--text-primary);

    &.a {
      background-color: var(--color-info);
    }
    &.b {
      background-color: var(--color-success);
    }
    &.c {
      background-color: var(--color-warning);
    }
  }

  .class-details {
    h3 {
      margin: 0;
      color: var(--text-primary);
      font-weight: 600;
    }
  }

  .mask-info {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .range-badge {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
  }

  .class-description {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
  }
  .usage-info {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }
</style>
