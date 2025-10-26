<script lang="ts">
  import { ipv6PrefixLengthsContent } from '$lib/content/ipv6-prefix-lengths.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{ipv6PrefixLengthsContent.title}</h1>
      <p class="subtitle">{ipv6PrefixLengthsContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{ipv6PrefixLengthsContent.sections.overview.title}</h2>
      <p>{ipv6PrefixLengthsContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>Common IPv6 Prefix Lengths</h2>
      {#each ipv6PrefixLengthsContent.commonPrefixes as prefix, index (`${prefix.prefix}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{prefix.prefix} - {prefix.name}</div>
          <div class="example-item">
            <div><strong>Capacity:</strong> {prefix.hosts}</div>
            <div><strong>Typical Use:</strong> {prefix.typical}</div>
            <div><strong>Description:</strong> {prefix.description}</div>
            <div><strong>Examples:</strong></div>
            {#each prefix.examples as example, index (`prefix-example-${index}`)}
              <div class="example-input">{example}</div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Usage Guidelines</h2>

      <div class="ref-grid three-col">
        <div class="grid-item">
          <div class="item-title">{ipv6PrefixLengthsContent.usageGuidelines.residential.title}</div>
          {#each ipv6PrefixLengthsContent.usageGuidelines.residential.allocations as alloc, index (`residential-${index}`)}
            <div class="item-code">{alloc.size}</div>
            <div class="item-description">{alloc.description}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">{ipv6PrefixLengthsContent.usageGuidelines.enterprise.title}</div>
          {#each ipv6PrefixLengthsContent.usageGuidelines.enterprise.allocations as alloc, index (`enterprise-${index}`)}
            <div class="item-code">{alloc.size}</div>
            <div class="item-description">{alloc.description}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">{ipv6PrefixLengthsContent.usageGuidelines.subnets.title}</div>
          {#each ipv6PrefixLengthsContent.usageGuidelines.subnets.allocations as alloc, index (`subnets-${index}`)}
            <div class="item-code">{alloc.size}</div>
            <div class="item-description">{alloc.description}</div>
          {/each}
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>IPv4 vs IPv6 Comparison</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>IPv4 Equivalent</th>
            <th>IPv6 Usage</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {#each ipv6PrefixLengthsContent.comparison.mappings as mapping, index (`${mapping.ipv4}-${index}`)}
            <tr>
              <td><code>{mapping.ipv4}</code></td>
              <td><code>{mapping.ipv6}</code></td>
              <td>{mapping.note}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Quick Reference Table</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Prefix</th>
            <th>Available /64 Subnets</th>
            <th>Typical Use</th>
          </tr>
        </thead>
        <tbody>
          {#each ipv6PrefixLengthsContent.quickReference as row, index (`${row.prefix}-${index}`)}
            <tr>
              <td><code>{row.prefix}</code></td>
              <td>{row.subnets}</td>
              <td>{row.note}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Best Practices</h2>
      <ul>
        {#each ipv6PrefixLengthsContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="star" size="sm" />
          Key Rule
        </div>
        <div class="highlight-content">
          Always use /64 for end-user networks. This is required for SLAAC (Stateless Address Autoconfiguration) and
          many IPv6 features.
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Planning Tips</h2>
      <div class="ref-examples">
        <div class="examples-title">Remember These</div>
        {#each ipv6PrefixLengthsContent.tips as tip, index (`tip-${index}`)}
          <div class="example-item">
            <div class="example-description">{tip}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
