<script lang="ts">
  import CIDRSummarizer from '$lib/components/tools/CIDRSummarizer.svelte';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <CIDRSummarizer />

  <section class="explainer-section">
    <h3>About CIDR Summarization</h3>
    <p>
      <strong>CIDR Summarization</strong> optimizes network routing by combining multiple IP addresses, ranges, and CIDR
      blocks into the minimal set of CIDR prefixes that covers the same address space.
    </p>

    <div class="benefits-grid">
      <div class="benefit-item">
        <h4>Route Table Optimization</h4>
        <p>Reduce routing table size by aggregating multiple routes into fewer, larger prefixes</p>
      </div>
      <div class="benefit-item">
        <h4>Network Efficiency</h4>
        <p>Minimize routing protocol overhead and improve convergence times</p>
      </div>
      <div class="benefit-item">
        <h4>Dual Protocol Support</h4>
        <p>Handle mixed IPv4 and IPv6 inputs with separate optimized outputs</p>
      </div>
      <div class="benefit-item">
        <h4>Flexible Input Formats</h4>
        <p>Process single IPs, CIDR blocks, and explicit ranges in any combination</p>
      </div>
    </div>

    <div class="modes-section">
      <h4>Summarization Modes</h4>
      <div class="modes-grid">
        <div class="mode-item">
          <h5>Exact Merge</h5>
          <p>
            <strong>Conservative approach:</strong> Merges overlapping ranges exactly without additional aggregation
          </p>
          <div class="mode-example">
            <span class="example-label">Example:</span>
            <code class="example-input">192.168.1.0/24 + 192.168.2.0/24</code>
            <span class="arrow">→</span>
            <code class="example-output">192.168.1.0/24, 192.168.2.0/24</code>
          </div>
        </div>
        <div class="mode-item">
          <h5>Minimal Cover</h5>
          <p><strong>Aggressive optimization:</strong> Finds the smallest set of CIDR blocks that covers all inputs</p>
          <div class="mode-example">
            <span class="example-label">Example:</span>
            <code class="example-input">192.168.1.0/24 + 192.168.2.0/24</code>
            <span class="arrow">→</span>
            <code class="example-output">192.168.0.0/23</code>
          </div>
        </div>
      </div>
    </div>

    <div class="use-cases-section">
      <h4>Common Use Cases</h4>
      <div class="use-cases-grid">
        <div class="use-case-item">
          <h5>BGP Route Aggregation</h5>
          <p>Optimize BGP advertisements by summarizing customer routes into provider prefixes</p>
        </div>
        <div class="use-case-item">
          <h5>Firewall Rule Optimization</h5>
          <p>Reduce ACL complexity by consolidating IP ranges into fewer CIDR rules</p>
        </div>
        <div class="use-case-item">
          <h5>Network Planning</h5>
          <p>Analyze address space utilization and optimize subnet allocations</p>
        </div>
        <div class="use-case-item">
          <h5>Migration Planning</h5>
          <p>Consolidate legacy network ranges during infrastructure modernization</p>
        </div>
      </div>
    </div>

    <div class="input-formats-section">
      <h4>Supported Input Formats</h4>
      <div class="formats-grid">
        <div class="format-item">
          <h5>Single IP Addresses</h5>
          <div class="format-examples">
            <code>192.168.1.100</code>
            <code>2001:db8::1</code>
          </div>
        </div>
        <div class="format-item">
          <h5>CIDR Blocks</h5>
          <div class="format-examples">
            <code>10.0.0.0/8</code>
            <code>2001:db8::/32</code>
          </div>
        </div>
        <div class="format-item">
          <h5>IP Ranges</h5>
          <div class="format-examples">
            <code>172.16.1.1-172.16.1.100</code>
            <code>2001:db8::1-2001:db8::ffff</code>
          </div>
        </div>
        <div class="format-item">
          <h5>Mixed Lists</h5>
          <div class="format-examples">
            <code>One item per line</code>
            <code>IPv4 and IPv6 together</code>
          </div>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h4>
        <Icon name="lightbulb" size="sm" />
        Optimization Tips
      </h4>
      <p>
        For maximum efficiency, align your network allocations to power-of-2 boundaries. Contiguous address blocks
        summarize much more effectively than scattered allocations. Use the exact merge mode for conservative
        summarization or minimal cover for aggressive optimization.
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

  .benefits-grid,
  .modes-grid,
  .use-cases-grid,
  .formats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin: var(--spacing-lg) 0;
  }

  .benefit-item,
  .use-case-item,
  .format-item {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h4,
    h5 {
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

  .modes-section,
  .use-cases-section,
  .input-formats-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
  }

  .mode-item {
    border: 1px solid var(--border-primary);
    border-left: 4px solid var(--color-info);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
  }

  .mode-example {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background-color: var(--bg-primary);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);

    .example-label {
      font-weight: 600;
      color: var(--color-primary);
    }

    code {
      font-family: var(--font-mono);
      background-color: var(--bg-tertiary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-xs);

      &.example-input {
        color: var(--color-info);
      }

      &.example-output {
        color: var(--color-success);
      }
    }

    .arrow {
      color: var(--text-secondary);
      text-align: center;
      font-weight: bold;
    }
  }

  .format-examples {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);

    code {
      font-family: var(--font-mono);
      background-color: var(--bg-tertiary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-xs);
      font-size: var(--font-size-xs);
      color: var(--color-primary);
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
      gap: var(--spacing-sm);

      :global(.icon) {
        width: 1.2rem;
        height: 1.2rem;
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
    .modes-grid,
    .use-cases-grid,
    .formats-grid {
      grid-template-columns: 1fr;
    }

    .mode-example {
      .arrow {
        transform: rotate(90deg);
      }
    }
  }
</style>
