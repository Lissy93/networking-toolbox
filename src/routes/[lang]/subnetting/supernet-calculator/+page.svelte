<script lang="ts">
  import SupernetCalculator from '$lib/components/tools/SupernetCalculator.svelte';

  import '$lib/../styles/pages.scss';
  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <SupernetCalculator />

  <section class="explainer-section">
    <h3>About Supernetting</h3>
    <p>
      <strong>Supernetting</strong> (also called route aggregation or CIDR block aggregation) is the process of combining
      multiple smaller networks into a single larger network. This technique is essential for:
    </p>

    <div class="benefits-grid">
      <div class="benefit-item">
        <h4>Reduced Routing Tables</h4>
        <p>Fewer routes mean faster lookups and reduced memory usage in routers</p>
      </div>
      <div class="benefit-item">
        <h4>Improved Scalability</h4>
        <p>Internet routing scales better with aggregated routes instead of individual subnets</p>
      </div>
      <div class="benefit-item">
        <h4>Better Performance</h4>
        <p>Reduced route advertisements and faster convergence in routing protocols</p>
      </div>
      <div class="benefit-item">
        <h4>Easier Management</h4>
        <p>Simplified network policies and access control lists</p>
      </div>
    </div>

    <div class="use-cases-section">
      <h4>When to Use Supernetting</h4>
      <div class="use-cases-grid">
        <div class="use-case-item">
          <h5>ISP Route Aggregation</h5>
          <p>Combining customer routes for BGP advertisements</p>
        </div>
        <div class="use-case-item">
          <h5>Enterprise Networks</h5>
          <p>Summarizing branch office networks at headquarters</p>
        </div>
        <div class="use-case-item">
          <h5>Data Centers</h5>
          <p>Aggregating server farm subnets for external advertisement</p>
        </div>
        <div class="use-case-item">
          <h5>Network Redesign</h5>
          <p>Optimizing existing IP allocations for better summarization</p>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h4>
        <Icon name="lightbulb" size="sm" />
        Pro Tip
      </h4>
      <p>
        For optimal supernetting, design your IP allocation strategy from the beginning. Contiguous, power-of-2 sized
        networks aggregate much more efficiently than scattered allocations.
      </p>
    </div>
  </section>
</div>

<style>
  .explainer-section {
    margin-top: var(--spacing-xl);
    padding: var(--spacing-lg);
    background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-secondary);

    h3 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin: var(--spacing-lg) 0;
  }

  .benefit-item {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h4 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.5;
      margin: 0;
    }
  }

  .use-cases-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
  }

  .use-cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .use-case-item {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h5 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.5;
      margin: 0;
    }
  }

  .info-box {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: linear-gradient(135deg, rgba(9, 105, 218, 0.1), rgba(31, 111, 235, 0.05));
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);

    h4 {
      color: var(--color-info);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      :global(.icon) {
        width: 1.25em;
        height: 1.25em;
      }
    }

    p {
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      line-height: 1.6;
      margin: 0;
    }
  }

  @media (max-width: 768px) {
    .benefits-grid,
    .use-cases-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
