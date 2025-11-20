<script lang="ts">
  import IPv6SubnetCalculator from '$lib/components/tools/IPv6SubnetCalculator.svelte';
  import Icon from '$lib/components/global/Icon.svelte';

  import '$lib/../styles/pages.scss';
</script>

<div class="page-container">
  <IPv6SubnetCalculator />

  <section class="explainer-section">
    <h3>About IPv6 Subnetting</h3>
    <p>
      <strong>IPv6 subnetting</strong> uses 128-bit addresses and hierarchical prefix-based allocation to provide virtually
      unlimited address space. Unlike IPv4, IPv6 simplifies subnet planning with:
    </p>

    <div class="benefits-grid">
      <div class="benefit-item">
        <h4>Massive Address Space</h4>
        <p>128-bit addressing provides 2^128 addresses - virtually unlimited for any network</p>
      </div>
      <div class="benefit-item">
        <h4>Simplified Subnetting</h4>
        <p>Standard /64 subnets eliminate complex subnet calculations</p>
      </div>
      <div class="benefit-item">
        <h4>Hierarchical Design</h4>
        <p>Provider-independent addressing with clear network hierarchy</p>
      </div>
      <div class="benefit-item">
        <h4>No Broadcast Domain</h4>
        <p>Uses multicast instead of broadcast, improving network efficiency</p>
      </div>
    </div>

    <div class="addressing-section">
      <h4>IPv6 Address Structure</h4>
      <div class="address-types-grid">
        <div class="address-type-item">
          <h5>Global Unicast (2000::/3)</h5>
          <p>Internet-routable addresses for global connectivity</p>
        </div>
        <div class="address-type-item">
          <h5>Link-Local (fe80::/10)</h5>
          <p>Local network communication, automatically configured</p>
        </div>
        <div class="address-type-item">
          <h5>Unique Local (fc00::/7)</h5>
          <p>Private addresses for internal networks (like RFC 1918)</p>
        </div>
        <div class="address-type-item">
          <h5>Multicast (ff00::/8)</h5>
          <p>One-to-many communication replacing broadcast</p>
        </div>
      </div>
    </div>

    <div class="best-practices-section">
      <h4>IPv6 Subnetting Best Practices</h4>
      <div class="practices-grid">
        <div class="practice-item">
          <h5>Standard /64 Subnets</h5>
          <p>Use /64 for all LAN segments to ensure SLAAC and privacy extensions work properly</p>
        </div>
        <div class="practice-item">
          <h5>Hierarchical Allocation</h5>
          <p>Plan address space hierarchically: /48 sites, /56 small sites, /64 subnets</p>
        </div>
        <div class="practice-item">
          <h5>Address Compression</h5>
          <p>Use :: notation to compress consecutive zero groups for readability</p>
        </div>
        <div class="practice-item">
          <h5>Documentation Prefix</h5>
          <p>Use 2001:db8::/32 for examples and documentation</p>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h4>
        <Icon name="lightbulb" size="sm" />
        IPv6 Planning Tip
      </h4>
      <p>
        IPv6's massive address space eliminates the need for complex subnetting. Focus on logical network hierarchy
        rather than conserving addresses. A single /64 subnet provides more addresses than the entire IPv4 internet.
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

  .addressing-section,
  .best-practices-section {
    margin: var(--spacing-lg) 0;

    h4 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
  }

  .address-types-grid,
  .practices-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .address-type-item,
  .practice-item {
    padding: var(--spacing-md);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    h5 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
      font-weight: 600;
      font-family: var(--font-mono);
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
    .address-types-grid,
    .practices-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
