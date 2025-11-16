<script lang="ts">
  import { cgnatContent } from '$lib/content/cgnat.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{cgnatContent.title}</h1>
      <p class="subtitle">{cgnatContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{cgnatContent.sections.overview.title}</h2>
      <p>{cgnatContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{cgnatContent.sections.why.title}</h2>
      <p>{cgnatContent.sections.why.content}</p>
    </div>

    <div class="ref-section">
      <h2>CGNAT Address Range</h2>
      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="globe" size="sm" />
          Shared Address Space
        </div>
        <div class="highlight-content">
          <p><strong>Range:</strong> <code>{cgnatContent.addressRange.range}</code></p>
          <p><strong>Full Range:</strong> <code>{cgnatContent.addressRange.fullRange}</code></p>
          <p><strong>Total Addresses:</strong> {cgnatContent.addressRange.totalAddresses}</p>
          <p><strong>RFC:</strong> {cgnatContent.addressRange.rfc}</p>
        </div>
      </div>

      <h3>Address Breakdown</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Network Block</th>
            <th>Available Addresses</th>
            <th>Typical Use</th>
          </tr>
        </thead>
        <tbody>
          {#each cgnatContent.addressRange.breakdown as block, index (`${block.network}-${index}`)}
            <tr>
              <td><code>{block.network}</code></td>
              <td>{block.addresses}</td>
              <td>{block.use}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{cgnatContent.howItWorks.title}</h2>
      <p>{cgnatContent.howItWorks.description}</p>

      <h3>Two-Layer NAT System</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Layer</th>
            <th>Location</th>
            <th>Inside Address</th>
            <th>Outside Address</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {#each cgnatContent.howItWorks.layers as layer, index (`${layer.layer}-${index}`)}
            <tr>
              <td><strong>{layer.layer}</strong></td>
              <td>{layer.location}</td>
              <td><code>{layer.inside}</code></td>
              <td><code>{layer.outside}</code></td>
              <td>{layer.purpose}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>Traffic Flow</h3>
      <ol>
        {#each cgnatContent.howItWorks.flow as step, index (`flow-step-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>
    </div>

    <div class="ref-section">
      <h2>{cgnatContent.identification.title}</h2>
      {#each cgnatContent.identification.methods as method, index (`${method.method}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{method.method}</div>
          <div class="example-item">
            <div><strong>Description:</strong> {method.description}</div>
            <div>
              <strong>CGNAT Indicator:</strong> <span style="color: var(--color-error)">{method.cgnatIndicator}</span>
            </div>
            <div>
              <strong>Normal Indicator:</strong>
              <span style="color: var(--color-success)">{method.normalIndicator}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Impact on Services</h2>

      <h3>Negative Impacts</h3>
      {#each cgnatContent.impacts.negative as impact, index (`${impact.impact}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="x-circle" size="sm" />
            {impact.impact}
          </div>
          <div class="warning-content">
            <p><strong>Description:</strong> {impact.description}</p>
            <p><strong>Affected Services:</strong> {impact.affectedServices.join(', ')}</p>
            <p><strong>Workaround:</strong> {impact.workaround}</p>
          </div>
        </div>
      {/each}

      <h3>Positive Aspects</h3>
      <ul>
        {#each cgnatContent.impacts.positive as positive, index (`positive-${index}`)}
          <li>{positive}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Workarounds and Solutions</h2>
      {#each cgnatContent.workarounds as solution, index (`${solution.solution}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{solution.solution}</div>
          <div class="example-item">
            <div><strong>Description:</strong> {solution.description}</div>
            <div><strong>Effectiveness:</strong> {solution.effectiveness}</div>
            <div><strong>Cost:</strong> {solution.cost}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Troubleshooting Common Issues</h2>
      {#each cgnatContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="help-circle" size="sm" />
            {issue.issue}
          </div>
          <div class="warning-content">
            <p><strong>Cause:</strong> {issue.cause}</p>
            <p><strong>Diagnosis:</strong> {issue.diagnosis}</p>
            <p><strong>Solution:</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Quick CGNAT Check</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">Steps to Check</div>
          <ol>
            {#each cgnatContent.quickCheck.steps as step, index (`quickcheck-step-${index}`)}
              <li>{step}</li>
            {/each}
          </ol>
        </div>

        <div class="grid-item">
          <div class="item-title">What to Do Next</div>
          <ul>
            {#each cgnatContent.quickCheck.whatToDo as action, index (`whatToDo-${index}`)}
              <li>{action}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Best Practices</h2>
      <ul>
        {#each cgnatContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>ISP Perspective</h2>
      <div class="ref-examples">
        <div class="examples-title">Why ISPs Use CGNAT</div>
        {#each cgnatContent.ispPerspective as reason, index (`isp-reason-${index}`)}
          <div class="example-item">
            <div class="example-description">{reason}</div>
          </div>
        {/each}
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="info" size="sm" />
          Understanding the Trade-off
        </div>
        <div class="highlight-content">
          CGNAT is a necessary compromise. It allows ISPs to provide affordable internet service during IPv4 exhaustion,
          but at the cost of some functionality. The long-term solution is IPv6 adoption.
        </div>
      </div>
    </div>
  </div>
</div>
