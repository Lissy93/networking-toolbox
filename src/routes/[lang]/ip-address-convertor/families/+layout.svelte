<script lang="ts">
  import '../../../../styles/pages.scss';
  import '../../../../styles/converters.scss';
  import '../../../../styles/components.scss';
  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="container">
  <slot />

  <!-- IPv4/IPv6 Information Section -->
  <div class="info-cards-section">
    <div class="explainer-card no-hover">
      <h3>
        <Icon name="info" size="md" />
        Understanding IPv4 and IPv6
      </h3>
      <div class="explainer-content">
        <div class="format-explanations">
          <!-- IPv4 Overview -->
          <div class="format-explanation">
            <h4><span class="format-badge ipv4">IPv4 (Internet Protocol version 4)</span></h4>
            <p><strong>Address Length:</strong> 32 bits (4 bytes)</p>
            <p><strong>Format:</strong> Dotted decimal notation (e.g., 192.168.1.1)</p>
            <p><strong>Total Addresses:</strong> ~4.3 billion addresses</p>
            <p><strong>Example:</strong> <code>203.0.113.45</code></p>
            <p><strong>Status:</strong> Widely deployed but address space exhausted</p>
          </div>

          <!-- IPv6 Overview -->
          <div class="format-explanation">
            <h4><span class="format-badge ipv6">IPv6 (Internet Protocol version 6)</span></h4>
            <p><strong>Address Length:</strong> 128 bits (16 bytes)</p>
            <p><strong>Format:</strong> Hexadecimal with colons (e.g., 2001:db8::1)</p>
            <p><strong>Total Addresses:</strong> ~340 undecillion addresses</p>
            <p><strong>Example:</strong> <code>2001:0db8:85a3:0000:0000:8a2e:0370:7334</code></p>
            <p><strong>Status:</strong> Modern standard with virtually unlimited address space</p>
          </div>

          <!-- IPv4-mapped IPv6 -->
          <div class="format-explanation">
            <h4><span class="format-badge mapped">IPv4-mapped IPv6</span></h4>
            <p><strong>Purpose:</strong> Represent IPv4 addresses within IPv6 format</p>
            <p><strong>Format:</strong> <code>::ffff:192.0.2.1</code> or <code>::ffff:c000:0201</code></p>
            <p><strong>Usage:</strong> Transition mechanism and dual-stack implementations</p>
            <p><strong>Structure:</strong> 80 zero bits + 16 one bits (ffff) + 32-bit IPv4 address</p>
          </div>
        </div>
      </div>
    </div>

    <div class="explainer-card no-hover">
      <h3>
        <Icon name="lightbulb" size="md" />
        Conversion Methods & Use Cases
      </h3>
      <div class="explainer-content">
        <div class="usage-scenarios">
          <div class="usage-scenario">
            <h4>IPv4 to IPv6 Conversion</h4>
            <ul>
              <li><strong>IPv4-mapped:</strong> Embed IPv4 addresses in IPv6 format</li>
              <li><strong>Dual-stack:</strong> Run both protocols simultaneously</li>
              <li><strong>Tunneling:</strong> Encapsulate IPv4 traffic in IPv6 packets</li>
              <li><strong>Migration:</strong> Gradual transition from IPv4 to IPv6</li>
            </ul>
          </div>

          <div class="usage-scenario">
            <h4>IPv6 to IPv4 Extraction</h4>
            <ul>
              <li><strong>Legacy Support:</strong> Extract IPv4 from mapped addresses</li>
              <li><strong>Compatibility:</strong> Interface with IPv4-only systems</li>
              <li><strong>Debugging:</strong> Identify original IPv4 addresses</li>
              <li><strong>Analysis:</strong> Traffic analysis and monitoring</li>
            </ul>
          </div>

          <div class="usage-scenario">
            <h4>Real-world Applications</h4>
            <ul>
              <li><strong>Web Servers:</strong> Handle both IPv4 and IPv6 clients</li>
              <li><strong>Load Balancers:</strong> Route traffic between IP versions</li>
              <li><strong>Network Monitoring:</strong> Unified logging and analysis</li>
              <li><strong>API Integration:</strong> Service compatibility layers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="explainer-card no-hover">
      <h3>
        <Icon name="warning" size="md" />
        Important Considerations
      </h3>
      <div class="explainer-content">
        <div class="class-notes">
          <h4>Limitations & Best Practices</h4>
          <ul>
            <li>
              <strong>IPv4-mapped IPv6:</strong> Only works for representing IPv4 addresses, not true IPv6 migration
            </li>
            <li><strong>Security:</strong> IPv4-mapped addresses may bypass IPv6-specific security rules</li>
            <li><strong>Performance:</strong> Native IPv6 is preferred over IPv4-mapped when possible</li>
            <li><strong>Compatibility:</strong> Not all applications handle IPv4-mapped IPv6 correctly</li>
            <li><strong>Best Practice:</strong> Use dual-stack configuration rather than relying solely on mapping</li>
            <li><strong>Future-proofing:</strong> Plan for IPv6-native implementations</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  h3 :global(.icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-primary);
  }

  .usage-scenarios,
  .format-explanations,
  .explainer-card {
    display: grid;
    gap: var(--spacing-md);
    h3 {
      margin-bottom: 0;
      color: var(--color-primary);
    }
    .usage-scenario,
    .format-explanation,
    .class-notes {
      padding: var(--spacing-md);
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-md);

      background-color: var(--bg-tertiary);
      border-left: 4px solid var(--border-primary);
      h4 {
        color: var(--text-primary);
        margin-bottom: var(--spacing-sm);
      }
      ul {
        margin: var(--spacing-sm) 0 0 var(--spacing-md);
        li {
          margin-bottom: var(--spacing-xs);
          color: var(--text-primary);
        }
      }
    }
    .class-notes {
      background-color: var(--bg-primary);
      border: 1px solid var(--color-warning);
      h4 {
        color: var(--color-warning);
      }
    }
  }

  .info-cards-section {
    margin-top: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .format-badge {
    color: var(--bg-primary);
    border-radius: var(--radius-xs);
    padding: 0.1rem 0.25rem;
    &.ipv4 {
      background-color: var(--color-info);
    }
    &.ipv6 {
      background-color: var(--color-success);
    }
    &.mapped {
      background-color: var(--color-warning);
    }
  }
</style>
