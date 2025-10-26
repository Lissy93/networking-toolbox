<script lang="ts">
  import { privateVsPublicContent } from '$lib/content/private-vs-public-ip.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{privateVsPublicContent.title}</h1>
      <p class="subtitle">{privateVsPublicContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{privateVsPublicContent.sections.overview.title}</h2>
      <p>{privateVsPublicContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>Private IP Address Ranges (RFC 1918)</h2>
      {#each privateVsPublicContent.privateRanges as range, index (`${range.range}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{range.range} - {range.class}</div>
          <div class="example-item">
            <div><strong>Full Range:</strong> <code>{range.fullRange}</code></div>
            <div><strong>Total Addresses:</strong> {range.addresses}</div>
            <div><strong>Common Use:</strong> {range.commonUse}</div>
            <div><strong>Examples:</strong></div>
            {#each range.examples as example, index (`example-${index}`)}
              <code class="example-input">{example}</code>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Public IP Addresses</h2>
      <p>{privateVsPublicContent.publicRanges.description}</p>

      <h3>Characteristics</h3>
      <ul>
        {#each privateVsPublicContent.publicRanges.characteristics as characteristic, index (`char-${index}`)}
          <li>{characteristic}</li>
        {/each}
      </ul>

      <h3>Examples</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Public IP</th>
            <th>Owner/Service</th>
          </tr>
        </thead>
        <tbody>
          {#each privateVsPublicContent.publicRanges.examples as example, index (`public-example-${index}`)}
            <tr>
              <td><code>{example.ip}</code></td>
              <td>{example.owner}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{privateVsPublicContent.natImplications.title}</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">{privateVsPublicContent.natImplications.privateToPublic.title}</div>
          <div class="item-description">{privateVsPublicContent.natImplications.privateToPublic.description}</div>

          <h4>Process:</h4>
          <ol>
            {#each privateVsPublicContent.natImplications.privateToPublic.process as step, index (`nat-step-${index}`)}
              <li>{step}</li>
            {/each}
          </ol>

          <h4>Benefits:</h4>
          <ul>
            {#each privateVsPublicContent.natImplications.privateToPublic.benefits as benefit, index (`benefit-${index}`)}
              <li>{benefit}</li>
            {/each}
          </ul>
        </div>

        <div class="grid-item">
          <div class="item-title">{privateVsPublicContent.natImplications.publicToPrivate.title}</div>
          <div class="item-description">{privateVsPublicContent.natImplications.publicToPrivate.description}</div>

          <h4>Challenges:</h4>
          <ul>
            {#each privateVsPublicContent.natImplications.publicToPrivate.challenges as challenge, index (`challenge-${index}`)}
              <li>{challenge}</li>
            {/each}
          </ul>

          <h4>Solutions:</h4>
          <ul>
            {#each privateVsPublicContent.natImplications.publicToPrivate.solutions as solution, index (`solution-${index}`)}
              <li>{solution}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Quick Identification Methods</h2>

      <table class="ref-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Description</th>
            <th>Private Indicator</th>
            <th>Public Indicator</th>
          </tr>
        </thead>
        <tbody>
          {#each privateVsPublicContent.identification.quickCheck as method, index (`method-${index}`)}
            <tr>
              <td><strong>{method.method}</strong></td>
              <td>{method.description}</td>
              <td><code>{method.private}</code></td>
              <td><code>{method.public}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>Useful Tools</h3>
      <div class="ref-grid two-col">
        {#each privateVsPublicContent.identification.tools as tool, index (`${tool.tool}-${index}`)}
          <div class="grid-item">
            <div class="item-title">{tool.tool}</div>
            <div class="item-description">{tool.purpose}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="ref-section">
      <h2>Common Network Scenarios</h2>
      {#each privateVsPublicContent.commonScenarios as scenario, index (`${scenario.scenario}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{scenario.scenario}</div>
          <div class="example-item">
            <div><strong>Setup:</strong> {scenario.setup}</div>
            <div><strong>Private IPs:</strong> {scenario.privateIPs}</div>
            <div><strong>Public IP:</strong> {scenario.publicIP}</div>
            <div><strong>NAT Behavior:</strong> {scenario.natBehavior}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Troubleshooting Common Issues</h2>
      {#each privateVsPublicContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="help-circle" size="sm" />
            {issue.issue}
          </div>
          <div class="warning-content">
            <p><strong>Possible Causes:</strong> {issue.possibleCauses.join(', ')}</p>
            <p><strong>Diagnosis:</strong> {issue.diagnosis}</p>
            <p><strong>Solution:</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Security Considerations</h2>
      {#each privateVsPublicContent.securityConsiderations as security, index (`${security.aspect}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{security.aspect}</div>
          <div class="example-item">
            <ul>
              {#each security.considerations as consideration, index (`consideration-${index}`)}
                <li>{consideration}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Best Practices</h2>
      <ul>
        {#each privateVsPublicContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Quick Reference</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">Private IP Ranges</div>
          {#each privateVsPublicContent.quickReference.privateRanges as range, index (`qr-range-${index}`)}
            <div class="item-code">{range}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">Identification Tips</div>
          {#each privateVsPublicContent.quickReference.identificationTips as tip, index (`qr-tip-${index}`)}
            <div class="item-description">{tip}</div>
          {/each}
        </div>
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="key" size="sm" />
          Key Rule
        </div>
        <div class="highlight-content">
          If an IP starts with 10, 172.16-31, or 192.168, it's private. Everything else (except other reserved ranges)
          is public. Private IPs need NAT to reach the internet.
        </div>
      </div>
    </div>
  </div>
</div>
