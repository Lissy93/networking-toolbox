<script lang="ts">
  import { specialIPv4Content } from '$lib/content/special-use-ipv4.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{specialIPv4Content.title}</h1>
      <p class="subtitle">{specialIPv4Content.description}</p>
    </div>

    <div class="ref-section">
      <h2>Complete Special-Use IPv4 Ranges</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Network</th>
            <th>Purpose</th>
            <th>RFC</th>
            <th>Routable</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each specialIPv4Content.ranges as range, rangeIdx (`${range.network}-${rangeIdx}`)}
            <tr>
              <td><code>{range.network}</code></td>
              <td>{range.purpose}</td>
              <td>{range.rfc}</td>
              <td>
                {#if range.routable}
                  <span style="color: var(--color-success)">Yes</span>
                {:else}
                  <span style="color: var(--color-error)">No</span>
                {/if}
              </td>
              <td>{range.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Common Address Categories</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">Private Networks (RFC 1918)</div>
          {#each specialIPv4Content.categories.private as network, privIdx (`${network}-${privIdx}`)}
            <div class="item-code">{network}</div>
          {/each}
          <div class="item-description">Never routed on the public internet</div>
        </div>

        <div class="grid-item">
          <div class="item-title">Test Networks (RFC 5737)</div>
          {#each specialIPv4Content.categories.testing as network, testIdx (`${network}-${testIdx}`)}
            <div class="item-code">{network}</div>
          {/each}
          <div class="item-description">Safe for documentation and examples</div>
        </div>

        <div class="grid-item">
          <div class="item-title">Carrier-Grade NAT</div>
          {#each specialIPv4Content.categories.cgnat as network, cgnatIdx (`${network}-${cgnatIdx}`)}
            <div class="item-code">{network}</div>
          {/each}
          <div class="item-description">ISP shared addressing space</div>
        </div>

        <div class="grid-item">
          <div class="item-title">Special Purpose</div>
          {#each specialIPv4Content.categories.special as network, specIdx (`${network}-${specIdx}`)}
            <div class="item-code">{network}</div>
          {/each}
          <div class="item-description">Loopback, link-local, multicast</div>
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Quick Recognition Tips</h2>
      <div class="ref-examples">
        <div class="examples-title">What Each Range Means</div>
        {#each specialIPv4Content.quickTips as tip, tipIdx (`${tip}-${tipIdx}`)}
          <div class="example-item">
            <div class="example-description">{tip}</div>
          </div>
        {/each}
      </div>

      <div class="ref-warning">
        <div class="warning-title">
          <Icon name="alert-triangle" size="sm" />
          Important Note
        </div>
        <div class="warning-content">
          If you see 100.64.x.x addresses, your ISP is using Carrier-Grade NAT (CGNAT). This can cause issues with port
          forwarding, gaming, and some applications that require direct connectivity.
        </div>
      </div>
    </div>
  </div>
</div>
