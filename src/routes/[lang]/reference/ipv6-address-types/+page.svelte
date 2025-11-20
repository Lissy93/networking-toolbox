<script lang="ts">
  import { ipv6AddressTypesContent } from '$lib/content/ipv6-address-types.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{ipv6AddressTypesContent.title}</h1>
      <p class="subtitle">{ipv6AddressTypesContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{ipv6AddressTypesContent.sections.overview.title}</h2>
      <p>{ipv6AddressTypesContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>Unicast Address Types</h2>
      {#each ipv6AddressTypesContent.unicastTypes as type, index (`${type.type}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{type.type}</div>
          <div class="example-item">
            <div><strong>Prefix:</strong> <code>{type.prefix}</code></div>
            <div><strong>Range:</strong> <code>{type.range}</code></div>
            <div><strong>Description:</strong> {type.description}</div>
            <div><strong>Usage:</strong> {type.usage}</div>
            <div><strong>Example:</strong> <code>{type.example}</code></div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Special Addresses</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Name</th>
            <th>Description</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
          {#each ipv6AddressTypesContent.specialAddresses as addr, index (`${addr.address}-${index}`)}
            <tr>
              <td><code>{addr.address}</code></td>
              <td>{addr.name}</td>
              <td>{addr.description}</td>
              <td>{addr.usage}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Multicast Address Scopes</h2>
      <p>All multicast addresses start with <code>ff</code>. The second byte indicates scope:</p>

      {#each ipv6AddressTypesContent.multicastTypes as scope, index (`${scope.scope}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{scope.scope} Scope</div>
          <div class="example-item">
            <div><strong>Prefix:</strong> <code>{scope.prefix}</code></div>
            <div><strong>Description:</strong> {scope.description}</div>
            {#if scope.examples.length > 0}
              <div><strong>Common Addresses:</strong></div>
              {#each scope.examples as example, index (`example-${index}`)}
                <div class="example-input">{example}</div>
              {/each}
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{ipv6AddressTypesContent.anycast.title}</h2>
      <p>{ipv6AddressTypesContent.anycast.description}</p>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="share" size="sm" />
          Example
        </div>
        <div class="highlight-content">
          {ipv6AddressTypesContent.anycast.example}
        </div>
      </div>

      <h3>Common Anycast Uses</h3>
      <ul>
        {#each ipv6AddressTypesContent.anycast.commonUses as use, index (`use-${index}`)}
          <li>{use}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Reserved Address Ranges</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Prefix</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {#each ipv6AddressTypesContent.reservedRanges as range, index (`${range.prefix}-${index}`)}
            <tr>
              <td><code>{range.prefix}</code></td>
              <td>{range.purpose}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Quick Recognition Tips</h2>
      <div class="ref-examples">
        <div class="examples-title">Remember These Patterns</div>
        {#each ipv6AddressTypesContent.quickTips as tip, index (`tip-${index}`)}
          <div class="example-item">
            <div class="example-description">{tip}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
