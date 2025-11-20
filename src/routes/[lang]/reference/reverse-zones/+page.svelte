<script lang="ts">
  import { reverseZonesContent } from '$lib/content/reverse-zones.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{reverseZonesContent.title}</h1>
      <p class="subtitle">{reverseZonesContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{reverseZonesContent.sections.overview.title}</h2>
      <p>{reverseZonesContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{reverseZonesContent.sections.delegation.title}</h2>
      <p>{reverseZonesContent.sections.delegation.content}</p>
    </div>

    <div class="ref-section">
      <h2>{reverseZonesContent.ipv4Zones.title}</h2>

      <h3>Classful Boundaries (Octet-Aligned)</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>CIDR</th>
            <th>Example</th>
            <th>Reverse Zone</th>
            <th>Description</th>
            <th>Delegation</th>
          </tr>
        </thead>
        <tbody>
          {#each reverseZonesContent.ipv4Zones.classfullBoundaries as boundary, index (`${boundary.cidr}-${index}`)}
            <tr>
              <td><code>{boundary.cidr}</code></td>
              <td><code>{boundary.example}</code></td>
              <td><code>{boundary.reverseZone}</code></td>
              <td>{boundary.description}</td>
              <td>{boundary.delegation}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>Classless Delegation (CNAME Method)</h3>
      {#each reverseZonesContent.ipv4Zones.classlessDelegation as delegation, index (`${delegation.cidr}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{delegation.cidr} - {delegation.example}</div>
          <div class="example-item">
            <div><strong>Addresses:</strong> {delegation.addresses}</div>
            <div><strong>Problem:</strong> {delegation.problem}</div>
            <div><strong>Solution:</strong> {delegation.solution}</div>
            <div><strong>Zone Names:</strong></div>
            {#each delegation.zones as zone, index (`zone-${index}`)}
              <code class="example-input">{zone}</code>
            {/each}
          </div>
        </div>
      {/each}

      <h3>Practical IPv4 Examples</h3>
      {#each reverseZonesContent.ipv4Zones.practicalExamples as example, index (`${example.network}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{example.scenario}</div>
          <div class="example-item">
            <div><strong>Network:</strong> <code>{example.network}</code></div>
            <div><strong>Reverse Zone:</strong> <code>{example.reverseZone}</code></div>
            {#if example.reverseZones}
              <div><strong>Reverse Zones:</strong></div>
              {#each example.reverseZones as zone, index (`rz-${index}`)}
                <code class="example-input">{zone}</code>
              {/each}
              <div><strong>Description:</strong> {example.description}</div>
            {:else}
              <div><strong>PTR Records:</strong></div>
              {#each example.ptrRecords as record, index (`ptr-${index}`)}
                <code class="example-input">{record}</code>
              {/each}
            {/if}
            <div><strong>Delegation:</strong> {example.delegation}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{reverseZonesContent.ipv6Zones.title}</h2>

      <h3>Nibble Boundaries (4-bit Aligned)</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>CIDR</th>
            <th>Example</th>
            <th>Reverse Zone</th>
            <th>Description</th>
            <th>Delegation</th>
          </tr>
        </thead>
        <tbody>
          {#each reverseZonesContent.ipv6Zones.nibbleBoundaries as boundary, index (`${boundary.cidr}-${index}`)}
            <tr>
              <td><code>{boundary.cidr}</code></td>
              <td><code>{boundary.example}</code></td>
              <td><code>{boundary.reverseZone}</code></td>
              <td>{boundary.description}</td>
              <td>{boundary.delegation}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>Practical IPv6 Examples</h3>
      {#each reverseZonesContent.ipv6Zones.practicalExamples as example, index (`${example.network}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{example.scenario}</div>
          <div class="example-item">
            <div><strong>Network:</strong> <code>{example.network}</code></div>
            <div><strong>Master Zone:</strong> <code>{example.reverseZone}</code></div>
            <div><strong>Sub-zones:</strong></div>
            {#each example.subZones as zone, index (`subzone-${index}`)}
              <code class="example-input">{zone}</code>
            {/each}
            <div><strong>Management:</strong> {example.management}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{reverseZonesContent.zoneCreation.title}</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">IPv4 Example ({reverseZonesContent.zoneCreation.ipv4Example.network})</div>
          <div><strong>Zone Name:</strong> <code>{reverseZonesContent.zoneCreation.ipv4Example.zoneName}</code></div>

          <h4>Zone File:</h4>
          <pre><code>{reverseZonesContent.zoneCreation.ipv4Example.zoneFile}</code></pre>

          <h4>Explanation:</h4>
          <ul>
            {#each reverseZonesContent.zoneCreation.ipv4Example.explanation as point, index (`ipv4-point-${index}`)}
              <li>{point}</li>
            {/each}
          </ul>
        </div>

        <div class="grid-item">
          <div class="item-title">IPv6 Example ({reverseZonesContent.zoneCreation.ipv6Example.network})</div>
          <div><strong>Zone Name:</strong> <code>{reverseZonesContent.zoneCreation.ipv6Example.zoneName}</code></div>

          <h4>Zone File:</h4>
          <pre><code>{reverseZonesContent.zoneCreation.ipv6Example.zoneFile}</code></pre>

          <h4>Explanation:</h4>
          <ul>
            {#each reverseZonesContent.zoneCreation.ipv6Example.explanation as point, index (`ipv6-point-${index}`)}
              <li>{point}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Delegation Scenarios</h2>
      {#each reverseZonesContent.delegationScenarios as scenario, index (`${scenario.scenario}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{scenario.scenario}</div>
          <div class="example-item">
            <div><strong>Delegation:</strong> {scenario.delegation}</div>

            {#if scenario.customerActions}
              <div><strong>Customer Actions:</strong></div>
              <ul>
                {#each scenario.customerActions as action, index (`customer-${index}`)}
                  <li>{action}</li>
                {/each}
              </ul>

              <div><strong>ISP Actions:</strong></div>
              <ul>
                {#each scenario.ispActions as action, index (`isp-${index}`)}
                  <li>{action}</li>
                {/each}
              </ul>
            {:else}
              <div><strong>Process:</strong></div>
              <ol>
                {#each scenario.process as step, index (`process-${index}`)}
                  <li>{step}</li>
                {/each}
              </ol>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Troubleshooting</h2>
      {#each reverseZonesContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="help-circle" size="sm" />
            {issue.issue}
          </div>
          <div class="warning-content">
            <p><strong>Possible Causes:</strong> {issue.causes.join(', ')}</p>
            <p><strong>Diagnosis:</strong> {issue.diagnosis}</p>
            <p><strong>Solution:</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Best Practices</h2>
      <ul>
        {#each reverseZonesContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Quick Reference</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">Zone Name Formulas</div>
          {#each reverseZonesContent.quickReference.zoneFormulas as formula, index (`formula-${index}`)}
            <div class="item-code">{formula}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">Essential Records</div>
          {#each reverseZonesContent.quickReference.essentialRecords as record, index (`record-${index}`)}
            <div class="item-description">{record}</div>
          {/each}
        </div>
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="key" size="sm" />
          Key Rule
        </div>
        <div class="highlight-content">
          IPv4 reverse zones reverse the octets (192.0.2.0/24 → 2.0.192.in-addr.arpa). IPv6 reverse zones reverse the
          nibbles (2001:db8::/32 → 8.b.d.0.1.0.0.2.ip6.arpa).
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Testing Tools</h2>
      <div class="ref-grid two-col">
        {#each reverseZonesContent.tools as tool, index (`${tool.tool}-${index}`)}
          <div class="grid-item">
            <div class="item-title">{tool.tool}</div>
            <div class="item-description">{tool.purpose}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
