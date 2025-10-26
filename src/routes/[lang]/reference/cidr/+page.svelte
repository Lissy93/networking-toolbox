<script lang="ts">
  import { cidrContent } from '$lib/content/cidr.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{cidrContent.title}</h1>
      <p class="subtitle">{cidrContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{cidrContent.sections.whatIs.title}</h2>
      <p>{cidrContent.sections.whatIs.content}</p>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="info" size="sm" />
          Quick Example
        </div>
        <div class="highlight-content">
          In <code>192.168.1.0/24</code>, the network is 192.168.1.0 and there are 254 usable host addresses
          (192.168.1.1 through 192.168.1.254).
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>{cidrContent.sections.whyReplaced.title}</h2>
      <p>{cidrContent.sections.whyReplaced.content}</p>
    </div>

    <div class="ref-section">
      <h2>{cidrContent.sections.howToRead.title}</h2>
      <p>{cidrContent.sections.howToRead.content}</p>
    </div>

    <div class="ref-section">
      <h2>Common Examples</h2>
      <div class="ref-examples">
        <div class="examples-title">Network Examples</div>
        {#each cidrContent.examples as example, index (`${example.cidr}-${index}`)}
          <div class="example-item">
            <span class="example-input">{example.cidr}</span>
            <span class="example-arrow">→</span>
            <span class="example-output">{example.hosts}</span>
            <div class="example-description">{example.description}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="ref-section">
      <h2>Prefix Length Reference Table</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Prefix</th>
            <th>Subnet Mask</th>
            <th>Usable Hosts</th>
            <th>Typical Use</th>
          </tr>
        </thead>
        <tbody>
          {#each cidrContent.prefixTable as row, index (`${row.prefix}-${index}`)}
            <tr>
              <td><code>{row.prefix}</code></td>
              <td><code>{row.mask}</code></td>
              <td>{row.hosts}</td>
              <td>{row.typical}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Key Points to Remember</h2>
      <ul>
        {#each cidrContent.keyPoints as point, index (`point-${index}`)}
          <li>{point}</li>
        {/each}
      </ul>

      <div class="ref-warning">
        <div class="warning-title">
          <Icon name="alert-triangle" size="sm" />
          Remember
        </div>
        <div class="warning-content">
          The first and last addresses in any network are reserved (network address and broadcast address), so the
          usable host count is always 2 less than the total addresses.
        </div>
      </div>
    </div>
  </div>
</div>
