<script lang="ts">
  import { multicastContent } from '$lib/content/multicast.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{multicastContent.title}</h1>
      <p class="subtitle">{multicastContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{multicastContent.sections.overview.title}</h2>
      <p>{multicastContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{multicastContent.ipv4Multicast.title}</h2>
      <p><strong>Range:</strong> <code>{multicastContent.ipv4Multicast.range}</code></p>

      {#each multicastContent.ipv4Multicast.classes as multicastClass, index (`${multicastClass.name}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{multicastClass.name}</div>
          <div class="example-item">
            <div><strong>Range:</strong> <code>{multicastClass.range}</code></div>
            <div><strong>Description:</strong> {multicastClass.description}</div>
            <div><strong>Scope:</strong> {multicastClass.scope}</div>
            <div><strong>Examples:</strong></div>
            {#each multicastClass.examples as example, index (`example-${index}`)}
              <div class="example-input">{example}</div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{multicastContent.ipv6Multicast.title}</h2>
      <p><strong>Range:</strong> <code>{multicastContent.ipv6Multicast.range}</code></p>

      <h3>Address Structure</h3>
      <p><strong>Format:</strong> <code>{multicastContent.ipv6Multicast.structure.format}</code></p>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">Flag Bits</div>
          {#each multicastContent.ipv6Multicast.structure.flags as flag, index (`flag-${index}`)}
            <div class="item-code">{flag.bit} - {flag.meaning}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">Scope Values</div>
          {#each multicastContent.ipv6Multicast.structure.scopes as scope, index (`scope-${index}`)}
            <div class="item-code">{scope.code} - {scope.name}</div>
          {/each}
        </div>
      </div>

      <h3>Well-Known IPv6 Multicast Addresses</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each multicastContent.ipv6Multicast.wellKnown as addr, index (`${addr.address}-${index}`)}
            <tr>
              <td><code>{addr.address}</code></td>
              <td>{addr.name}</td>
              <td>{addr.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Common Protocol Multicast Addresses</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Protocol</th>
            <th>IPv4</th>
            <th>IPv6</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {#each multicastContent.commonProtocols as protocol, index (`${protocol.protocol}-${index}`)}
            <tr>
              <td><strong>{protocol.protocol}</strong></td>
              <td><code>{protocol.ipv4}</code></td>
              <td><code>{protocol.ipv6}</code></td>
              <td>{protocol.purpose}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Important Limitations</h2>
      {#each multicastContent.limitations as limitation, index (`${limitation.title}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="alert-triangle" size="sm" />
            {limitation.title}
          </div>
          <div class="warning-content">
            <p>{limitation.description}</p>
            <ul>
              {#each limitation.details as detail, index (`detail-${index}`)}
                <li>{detail}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Troubleshooting Common Issues</h2>
      {#each multicastContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{issue.issue}</div>
          <div class="example-item">
            <div><strong>Common Causes:</strong></div>
            <ul>
              {#each issue.causes as cause, index (`cause-${index}`)}
                <li>{cause}</li>
              {/each}
            </ul>
            <div><strong>Solutions:</strong></div>
            <ul>
              {#each issue.solutions as solution, index (`solution-${index}`)}
                <li>{solution}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Best Practices</h2>
      <ul>
        {#each multicastContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Quick Reference</h2>
      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">IPv4 Quick List</div>
          {#each multicastContent.quickReference.ipv4 as addr, index (`ipv4-${index}`)}
            <div class="item-code">{addr}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">IPv6 Quick List</div>
          {#each multicastContent.quickReference.ipv6 as addr, index (`ipv6-${index}`)}
            <div class="item-code">{addr}</div>
          {/each}
        </div>
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="wifi" size="sm" />
          Key Remember
        </div>
        <div class="highlight-content">
          Most multicast addresses are designed for local subnet use only. Without proper multicast routing
          configuration, traffic won't cross router boundaries.
        </div>
      </div>
    </div>
  </div>
</div>
