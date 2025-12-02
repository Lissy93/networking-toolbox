<script lang="ts">
  import { vlsmContent } from '$lib/content/vlsm.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{vlsmContent.title}</h1>
      <p class="subtitle">{vlsmContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{vlsmContent.sections.whatIs.title}</h2>
      <p>{vlsmContent.sections.whatIs.content}</p>
    </div>

    <div class="ref-section">
      <h2>{vlsmContent.sections.whenWhy.title}</h2>
      <p>{vlsmContent.sections.whenWhy.content}</p>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="lightbulb" size="sm" />
          Key Benefit
        </div>
        <div class="highlight-content">
          VLSM prevents IP address waste by letting you create subnets that are exactly the right size for each purpose.
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>{vlsmContent.sections.howItWorks.title}</h2>
      <p>{vlsmContent.sections.howItWorks.content}</p>
    </div>

    <div class="ref-section">
      <h2>{vlsmContent.example.title}</h2>
      <p><strong>{vlsmContent.example.scenario}</strong></p>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">Requirements</div>
          <ul>
            {#each vlsmContent.example.requirements as req, reqIdx (`${req.name}-${reqIdx}`)}
              <li>{req.name}: {req.hosts} hosts (needs {req.needsPrefix})</li>
            {/each}
          </ul>
        </div>

        <div class="grid-item">
          <div class="item-title">VLSM Solution</div>
          <ul>
            {#each vlsmContent.example.solution as subnet, subIdx (`${subnet.subnet}-${subIdx}`)}
              <li><code>{subnet.subnet}</code> - {subnet.use} ({subnet.hosts})</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Common Pitfalls and Solutions</h2>
      {#each vlsmContent.pitfalls as pitfall, pitIdx (`${pitfall.title}-${pitIdx}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="alert-triangle" size="sm" />
            {pitfall.title}
          </div>
          <div class="warning-content">
            <p><strong>Problem:</strong> {pitfall.problem}</p>
            <p><strong>Solution:</strong> {pitfall.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Best Practices</h2>
      <ul>
        {#each vlsmContent.bestPractices as practice, pracIdx (`${practice}-${pracIdx}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Quick Tips</h2>
      <div class="ref-examples">
        <div class="examples-title">Remember These</div>
        {#each vlsmContent.tips as tip, tipIdx (`${tip}-${tipIdx}`)}
          <div class="example-item">
            <div class="example-description">{tip}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
