<script lang="ts">
  import { asnContent } from '$lib/content/asn.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{asnContent.title}</h1>
      <p class="subtitle">{asnContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{asnContent.sections.overview.title}</h2>
      <p>{asnContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{asnContent.sections.asn.title}</h2>
      <p>{asnContent.sections.asn.content}</p>
    </div>

    <div class="ref-section">
      <h2>ASN Number Ranges</h2>
      {#each asnContent.asnTypes as type, index (`${type.name}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{type.name}</div>
          <div class="example-item">
            <div><strong>Range:</strong> <code>{type.range}</code></div>
            <div><strong>Description:</strong> {type.description}</div>
            <div><strong>Usage:</strong> {type.usage}</div>
            <div><strong>Examples:</strong></div>
            {#each type.examples as example, index (`example-${index}`)}
              <div class="example-input">{example}</div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{asnContent.bgpBasics.title}</h2>
      <p>{asnContent.bgpBasics.description}</p>

      <h3>Key BGP Concepts</h3>
      <div class="ref-grid two-col">
        {#each asnContent.bgpBasics.concepts as concept, index (`${concept.term}-${index}`)}
          <div class="grid-item">
            <div class="item-title">{concept.term}</div>
            <div class="item-description">
              <strong>Definition:</strong>
              {concept.definition}<br />
              <strong>Example:</strong>
              {concept.example}
            </div>
          </div>
        {/each}
      </div>

      <h3>BGP Types</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
            <th>Usage</th>
            <th>Port</th>
          </tr>
        </thead>
        <tbody>
          {#each asnContent.bgpBasics.types as type, index (`${type.type}-${index}`)}
            <tr>
              <td><strong>{type.type}</strong></td>
              <td>{type.description}</td>
              <td>{type.usage}</td>
              <td><code>{type.port}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{asnContent.ipToAsnMapping.title}</h2>
      <p>{asnContent.ipToAsnMapping.description}</p>

      <h3>How It Works</h3>
      <ol>
        {#each asnContent.ipToAsnMapping.process as step, index (`mapping-process-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>Real-World Examples</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>IP Range</th>
            <th>ASN</th>
            <th>Organization</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each asnContent.ipToAsnMapping.examples as example, index (`${example.asn}-${index}`)}
            <tr>
              <td><code>{example.ipRange}</code></td>
              <td><code>{example.asn}</code></td>
              <td><strong>{example.organization}</strong></td>
              <td>{example.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{asnContent.lookupTools.title}</h2>
      <p>{asnContent.lookupTools.description}</p>

      <div class="ref-grid three-col">
        {#each asnContent.lookupTools.methods as method, index (`${method.method}-${index}`)}
          <div class="grid-item">
            <div class="item-title">{method.method}</div>
            <div class="item-code">{method.command}</div>
            <div class="item-description">
              {method.description}<br />
              <em>{method.example}</em>
            </div>
          </div>
        {/each}
      </div>

      <h3>Common Lookup Commands</h3>
      <div class="ref-examples">
        <div class="examples-title">Try These Commands</div>
        {#each asnContent.lookupTools.commonCommands as command, index (`command-${index}`)}
          <div class="example-item">
            <code>{command}</code>
          </div>
        {/each}
      </div>
    </div>

    <div class="ref-section">
      <h2>Real-World AS Examples</h2>
      {#each asnContent.realWorldExamples as example, index (`${example.asn}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{example.scenario}: {example.asn}</div>
          <div class="example-item">
            <div><strong>Organization:</strong> {example.organization}</div>
            <div><strong>Role:</strong> {example.role}</div>
            <div><strong>IP Blocks:</strong> {example.ipBlocks}</div>
            <div><strong>Peering:</strong> {example.peers}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Benefits of the AS System</h2>
      <ul>
        {#each asnContent.benefits as benefit, index (`benefit-${index}`)}
          <li>{benefit}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Troubleshooting with ASN Information</h2>
      {#each asnContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="help-circle" size="sm" />
            {issue.issue}
          </div>
          <div class="warning-content">
            <p><strong>Likely Cause:</strong> {issue.cause}</p>
            <p><strong>Investigation:</strong> {issue.investigation}</p>
            <p><strong>Solution:</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Getting Started with ASN Knowledge</h2>
      {#each asnContent.gettingStarted as step, index (`${step.step}-${index}`)}
        <div class="ref-highlight">
          <div class="highlight-title">
            <Icon name="play-circle" size="sm" />
            {step.step}
          </div>
          <div class="highlight-content">
            <p>{step.description}</p>
            <p><strong>Action:</strong> {step.action}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Quick Facts to Remember</h2>
      <div class="ref-examples">
        <div class="examples-title">Key Points</div>
        {#each asnContent.quickFacts as fact, index (`fact-${index}`)}
          <div class="example-item">
            <div class="example-description">{fact}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
