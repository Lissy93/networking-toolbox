<!-- src/routes/cidr/mask-converter/+layout.svelte -->
<script lang="ts">
  import { setContext } from 'svelte';
  import { writable, derived, get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { cidrToMask, maskToCidr } from '$lib/utils/ip-calculations.js';
  import { validateSubnetMask } from '$lib/utils/ip-validation.js';
  import { COMMON_SUBNETS } from '$lib/constants/networks.js';
  import { CIDR_CTX, type CidrContext } from '$lib/contexts/cidr';

  // Shared state as stores so pages can subscribe & update reactively
  const cidr = writable<number>(24);
  const mask = writable<string>('255.255.255.0');

  // Keep mask in sync when CIDR changes (single source of truth -> cidr)
  cidr.subscribe(($cidr) => {
    const m = cidrToMask($cidr).octets.join('.');
    if (get(mask) !== m) mask.set(m);
  });

  // Mask changes -> attempt to update CIDR (only when valid)
  function handleMaskChange(value: string) {
    mask.set(value);
    if (validateSubnetMask(value).valid) {
      const newCidr = maskToCidr(value);
      if (get(cidr) !== newCidr) cidr.set(newCidr);
    }
  }

  function getSubnetInfo(c: number) {
    const subnet = COMMON_SUBNETS.find((s) => s.cidr === c);
    return (
      subnet || {
        cidr: c,
        mask: cidrToMask(c).octets.join('.'),
        hosts: Math.pow(2, 32 - c) - 2,
      }
    );
  }

  const subnetInfo = derived(cidr, ($c) => getSubnetInfo($c));

  // Dynamic title based on current route
  $: isCidrToMask = ($page.url?.pathname ?? '/').includes('cidr-to-subnet-mask');
  $: title = isCidrToMask ? 'CIDR → Subnet Mask Converter' : 'Subnet Mask → CIDR Converter';
  $: description = isCidrToMask
    ? 'Convert CIDR notation to subnet mask format'
    : 'Convert subnet mask format to CIDR notation';

  // Switch between converter modes
  function switchMode() {
    const newPath = isCidrToMask
      ? '/cidr/mask-converter/subnet-mask-to-cidr'
      : '/cidr/mask-converter/cidr-to-subnet-mask';
    goto(newPath);
  }

  // Provide everything to children through context
  const ctx: CidrContext = {
    cidr,
    mask,
    handleMaskChange,
    getSubnetInfo,
    COMMON_SUBNETS: Array.from(COMMON_SUBNETS),
  };
  setContext(CIDR_CTX, ctx);
</script>

<div class="card">
  <header class="card-header row">
    <div class="left">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div class="right">
      <Tooltip text="Switch converter direction" position="left">
        <button
          class="switch-button"
          onclick={switchMode}
          aria-label="Switch between CIDR to subnet mask and subnet mask to CIDR converters"
        >
          <Icon name="refresh" size="sm" />
          Switch
        </button>
      </Tooltip>
    </div>
  </header>

  <!-- Per-page converter UIs render here -->
  <slot />

  <!-- Subnet Information (shared) -->
  <section class="info-panel">
    <h3>Subnet Information</h3>
    <div class="grid grid-3">
      <Tooltip
        text="Number of bits used for network identification - higher values create smaller, more specific subnets"
        position="top"
      >
        <div class="info-metric">
          <span class="info-label">Network Bits</span>
          <span class="metric-value info">{$cidr}</span>
        </div>
      </Tooltip>
      <Tooltip
        text="Number of bits available for host addresses - more host bits allow for more devices"
        position="top"
      >
        <div class="info-metric">
          <span class="info-label">Host Bits</span>
          <span class="metric-value info">{32 - $cidr}</span>
        </div>
      </Tooltip>
      <Tooltip
        text="Number of IP addresses available for devices (excludes network and broadcast addresses)"
        position="top"
      >
        <div class="info-metric">
          <span class="info-label">Usable Hosts</span>
          <span class="metric-value success">
            {get(subnetInfo).hosts.toLocaleString()}
          </span>
        </div>
      </Tooltip>
    </div>
  </section>

  <!-- Common Subnets (shared) -->
  <section class="common-subnets-section">
    <h3>Common Subnets</h3>
    <div class="subnets-grid">
      {#each COMMON_SUBNETS as subnet, index (index)}
        <Tooltip text="Click to select this common subnet configuration" position="top">
          <button
            type="button"
            class="subnet-card {$cidr === subnet.cidr ? 'active' : ''}"
            onclick={() => cidr.set(subnet.cidr)}
            aria-label="Select /{subnet.cidr} subnet with {subnet.hosts.toLocaleString()} hosts"
          >
            <div class="subnet-info">
              <div class="subnet-cidr">
                <span class="cidr-notation">/{subnet.cidr}</span>
                <span class="subnet-mask">{subnet.mask}</span>
              </div>
              <span class="host-count">{subnet.hosts.toLocaleString()} hosts</span>
            </div>
          </button>
        </Tooltip>
      {/each}
    </div>
  </section>

  <!-- Explainer (shared) -->
  <section class="explainer-section">
    <h3>Understanding CIDR and Subnet Masks</h3>

    <div class="explainer-grid">
      <div class="explainer-card no-hover">
        <h4>CIDR Notation</h4>
        <p>
          CIDR (Classless Inter-Domain Routing) uses a slash followed by a number (e.g., /24) to indicate how many bits
          are used for the network portion of an IP address.
        </p>
      </div>

      <div class="explainer-card no-hover">
        <h4>Subnet Mask</h4>
        <p>
          A 32-bit number that masks an IP address to divide it into network and host portions. Written in dotted
          decimal notation (e.g., 255.255.255.0).
        </p>
      </div>

      <div class="explainer-card no-hover">
        <h4>Network Bits</h4>
        <p>
          The leftmost bits in an IP address that identify the network. More network bits mean smaller subnets with
          fewer available host addresses.
        </p>
      </div>

      <div class="explainer-card no-hover">
        <h4>Host Bits</h4>
        <p>
          The remaining bits used for host addresses within the network. More host bits allow for more devices but fewer
          possible subnets.
        </p>
      </div>
    </div>

    <div class="conversion-examples">
      <h4>Common Conversions</h4>
      <div class="examples-grid">
        <div class="example-item">
          <span class="example-cidr">/24</span>
          <span class="example-arrow">↔</span>
          <span class="example-mask">255.255.255.0</span>
          <span class="example-desc">254 hosts</span>
        </div>
        <div class="example-item">
          <span class="example-cidr">/25</span>
          <span class="example-arrow">↔</span>
          <span class="example-mask">255.255.255.128</span>
          <span class="example-desc">126 hosts</span>
        </div>
        <div class="example-item">
          <span class="example-cidr">/26</span>
          <span class="example-arrow">↔</span>
          <span class="example-mask">255.255.255.192</span>
          <span class="example-desc">62 hosts</span>
        </div>
        <div class="example-item">
          <span class="example-cidr">/30</span>
          <span class="example-arrow">↔</span>
          <span class="example-mask">255.255.255.252</span>
          <span class="example-desc">2 hosts</span>
        </div>
      </div>
    </div>

    <div class="tips-box">
      <h4>🔧 Usage Tips</h4>
      <ul>
        <li><strong>Smaller CIDR = Bigger Network:</strong> /16 has more hosts than /24</li>
        <li><strong>Binary Thinking:</strong> Each bit doubles or halves the number of addresses</li>
        <li><strong>/30 for Links:</strong> Perfect for point-to-point connections (only 2 usable IPs)</li>
        <li><strong>Planning:</strong> Start with larger subnets and subdivide as needed</li>
      </ul>
    </div>
  </section>
</div>

<style lang="scss">
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    .left {
      flex: 1;
      min-width: 200px;
    }
    .right {
      min-width: 100px;
      text-align: right;
    }
  }

  .switch-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    &:active {
      transform: translateY(0);
      box-shadow: none;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    :global(.icon) {
      transition: transform var(--transition-fast);
    }

    &:hover :global(.icon) {
      transform: rotate(180deg);
    }
  }
  .info-panel {
    margin-top: var(--spacing-xl);

    .info-metric {
      text-align: center;

      .info-label {
        display: block;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin-bottom: var(--spacing-xs);
      }
    }
  }

  .common-subnets-section {
    margin-top: var(--spacing-lg);

    .subnets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
      justify-content: space-between;
    }

    .subnet-card {
      padding: var(--spacing-sm);
      text-align: left;
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg);
      background-color: var(--bg-secondary);
      transition: all var(--transition-fast);
      cursor: pointer;
      width: 100%;

      &:hover {
        background-color: var(--surface-hover);
        border-color: var(--color-primary);
      }

      &.active {
        background-color: var(--surface-hover);
        border-color: var(--color-primary);
        box-shadow: var(--shadow-md);
      }
    }

    .subnet-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .subnet-cidr {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .cidr-notation {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }

    .subnet-mask {
      font-family: var(--font-mono);
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
    }

    .host-count {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      text-align: right;
    }
  }

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

    .explainer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .explainer-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);
      transition: all var(--transition-fast);
      cursor: default;
    }

    .conversion-examples {
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-md);
      background-color: var(--bg-primary);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-primary);

      h4 {
        color: var(--color-info-light);
        margin-bottom: var(--spacing-md);
        text-align: center;
      }

      .examples-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--spacing-sm);
      }

      .example-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-sm);
        background-color: var(--bg-secondary);
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);

        .example-cidr {
          color: var(--color-info-light);
          font-weight: 700;
          min-width: 2rem;
        }

        .example-arrow {
          color: var(--text-secondary);
          margin: 0 var(--spacing-xs);
        }

        .example-mask {
          color: var(--color-success-light);
          font-weight: 600;
          flex: 1;
          text-align: center;
        }

        .example-desc {
          color: var(--text-secondary);
          font-size: var(--font-size-xs);
          min-width: 4rem;
          text-align: right;
        }
      }
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

        li {
          margin-bottom: var(--spacing-xs);
          color: var(--text-primary);
          font-size: var(--font-size-sm);
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
    }
  }

  @media (max-width: 768px) {
    .common-subnets-section {
      .subnet-info {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-xs);
      }

      .host-count {
        text-align: left;
      }
    }

    .explainer-section {
      padding: var(--spacing-md);

      .explainer-grid {
        grid-template-columns: 1fr;
      }

      .conversion-examples {
        .examples-grid {
          grid-template-columns: 1fr;
        }

        .example-item {
          flex-direction: column;
          gap: var(--spacing-xs);
          text-align: center;
        }
      }
    }
  }
</style>
