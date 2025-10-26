<script lang="ts">
  import CIDRSplitter from '$lib/components/tools/CIDRSplitter.svelte';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <CIDRSplitter />

  <section class="explainer-section">
    <h3>About CIDR Subnet Splitting</h3>
    <p>
      CIDR subnet splitting divides a larger network (parent) into smaller networks (children) of equal size. This is
      essential for efficient IP address allocation and network design.
    </p>

    <div class="split-modes">
      <div class="mode-item">
        <h4><Icon name="hash" size="sm" /> Split by Count</h4>
        <p>
          Specify how many equal subnets you need. The tool calculates the required prefix length and creates exactly
          that many subnets (rounded up to the nearest power of 2).
        </p>
        <div class="mode-example">
          <div class="example-input">
            <code>192.168.1.0/24</code> → <strong>4 subnets</strong>
          </div>
          <div class="arrow">→</div>
          <div class="example-output">
            <code>192.168.1.0/26</code><br />
            <code>192.168.1.64/26</code><br />
            <code>192.168.1.128/26</code><br />
            <code>192.168.1.192/26</code>
          </div>
        </div>
      </div>

      <div class="mode-item">
        <h4><Icon name="target" size="sm" /> Split by Prefix</h4>
        <p>
          Specify the target prefix length for child subnets. The tool creates all possible subnets at that prefix
          length within the parent network.
        </p>
        <div class="mode-example">
          <div class="example-input">
            <code>10.0.0.0/16</code> → <strong>/20 subnets</strong>
          </div>
          <div class="arrow">→</div>
          <div class="example-output">
            <code>10.0.0.0/20</code> (16 subnets)<br />
            <code>10.0.16.0/20</code><br />
            <code>10.0.32.0/20</code><br />
            <span class="more">... and 13 more</span>
          </div>
        </div>
      </div>
    </div>

    <div class="key-concepts">
      <h4>Key Concepts</h4>
      <div class="concepts-grid">
        <div class="concept">
          <h5>Power of 2 Rule</h5>
          <p>Network splitting always results in a power-of-2 number of subnets due to binary addressing.</p>
        </div>
        <div class="concept">
          <h5>Prefix Length</h5>
          <p>Child subnets always have a longer prefix (smaller network) than the parent.</p>
        </div>
        <div class="concept">
          <h5>Address Space</h5>
          <p>All child subnets combined exactly equal the parent's address space.</p>
        </div>
        <div class="concept">
          <h5>Binary Boundaries</h5>
          <p>Subnet boundaries align with binary bit boundaries for efficient routing.</p>
        </div>
      </div>
    </div>

    <div class="use-cases-box">
      <h4>Common Use Cases</h4>
      <ul>
        <li><strong>Office Networks:</strong> Split a /24 into department subnets</li>
        <li><strong>Cloud VPCs:</strong> Create isolated subnets for different tiers</li>
        <li><strong>VLSM Design:</strong> Plan hierarchical network addressing</li>
        <li><strong>Data Centers:</strong> Segment networks for different services</li>
      </ul>
    </div>

    <div class="technical-notes">
      <h4>Technical Notes</h4>
      <div class="notes-grid">
        <div class="note">
          <h5>IPv4 vs IPv6</h5>
          <p>
            IPv4 uses 32-bit addresses with /0-/32 prefixes. IPv6 uses 128-bit addresses with /0-/128 prefixes. The
            splitting logic is identical for both.
          </p>
        </div>
        <div class="note">
          <h5>Network vs Host Addresses</h5>
          <p>
            In IPv4, the first address is the network address and the last is the broadcast address. IPv6 doesn't have
            broadcast, so the first and last addresses are both usable.
          </p>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .explainer-section {
    margin-top: var(--spacing-xl);
    padding: var(--spacing-xl);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);

    h3 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-md);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    h5 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
  }

  .split-modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: var(--spacing-lg);
    margin: var(--spacing-lg) 0;
  }

  .mode-item {
    border: 1px solid var(--border-primary);
    border-left: 4px solid var(--color-info);
    padding: var(--spacing-md);
    background: var(--bg-primary);
    border-radius: var(--radius-md);
  }

  .mode-example {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex-wrap: wrap;

    .arrow {
      font-size: var(--font-size-lg);
      color: var(--color-primary);
      font-weight: bold;
    }

    code {
      background-color: var(--bg-secondary);
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-xs);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
    }

    .more {
      color: var(--text-secondary);
      font-style: italic;
      font-size: var(--font-size-sm);
    }
  }

  .key-concepts {
    margin: var(--spacing-xl) 0;
  }

  .concepts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .concept {
    padding: var(--spacing-md);
    background-color: var(--bg-primary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);

    h5 {
      margin-bottom: var(--spacing-sm);
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin: 0;
    }
  }

  .use-cases-box {
    margin: var(--spacing-xl) 0;
    background-color: var(--bg-primary);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      color: var(--color-info);
      margin: 0 0 var(--spacing-sm) 0;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;

      li {
        margin-bottom: var(--spacing-xs);
        color: var(--text-primary);
        font-size: var(--font-size-sm);
        &::before {
          content: '•';
          color: var(--color-info);
          font-weight: bold;
          display: inline-block;
          width: 1em;
          margin-right: var(--spacing-xs);
        }

        strong {
          color: var(--color-info);
        }
      }
    }
  }

  .technical-notes {
    margin: var(--spacing-xl) 0;
  }

  .notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .note {
    padding: var(--spacing-md);
    background-color: var(--bg-primary);
    border: 1px solid var(--border-secondary);
    border-left: 4px solid var(--color-warning);
    border-radius: var(--radius-md);

    h5 {
      margin-bottom: var(--spacing-sm);
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin: 0;
    }
  }

  @media (max-width: 768px) {
    .split-modes {
      grid-template-columns: 1fr;
    }

    .mode-example {
      .arrow {
        transform: rotate(90deg);
      }
    }

    .concepts-grid,
    .notes-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
