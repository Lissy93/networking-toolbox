<script lang="ts">
  import { COMMON_SUBNETS } from '$lib/constants/networks.js';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import SvgIcon from '$lib/components/global/SvgIcon.svelte';
  import { formatNumber } from '$lib/utils/formatters';
  import '../../styles/converters.scss';
  import '../../styles/components.scss';
</script>

<div class="card">
  <header class="card-header">
    <h2>Common Subnets Reference</h2>
    <p>Frequently used subnet configurations with CIDR notation, masks, and host counts.</p>
  </header>

  <!-- Common Subnets Table -->
  <div class="subnets-table">
    <div class="table-header">
      <span>CIDR</span>
      <span>Subnet Mask</span>
      <span>Hosts</span>
      <span>Usage</span>
    </div>

    {#each COMMON_SUBNETS as subnet (subnet.cidr)}
      <Tooltip
        text="/{subnet.cidr} subnet with mask {subnet.mask} supports {formatNumber(subnet.hosts)} hosts"
        position="top"
      >
        <div class="table-row">
          <span class="cidr-cell">
            /{subnet.cidr}
          </span>
          <span class="mask-cell">
            {subnet.mask}
          </span>
          <span class="hosts-cell">
            {formatNumber(subnet.hosts)}
          </span>
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

  <!-- Explainer Section -->
  <div class="explainer-card">
    <h3>
      <SvgIcon icon="bulb" size="md" />
      Subnet Planning Guidelines
    </h3>
    <div class="explainer-content">
      <p>
        Choosing the right subnet size is crucial for efficient network design. Consider future growth, address
        conservation, and security requirements when planning subnets.
      </p>
      <div class="planning-tips">
        <h4>Planning Considerations</h4>
        <ul>
          <li><strong>Future Growth:</strong> Always plan for 2-3x current requirements</li>
          <li><strong>VLSM:</strong> Use Variable Length Subnet Masking for efficient allocation</li>
          <li><strong>Security:</strong> Separate different network segments and services</li>
          <li><strong>Point-to-Point Links:</strong> Use /30 or /31 for WAN connections</li>
        </ul>
      </div>
    </div>
  </div>
</div>
