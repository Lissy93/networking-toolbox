<script lang="ts">
  import { supernetContent } from '$lib/content/supernetting.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{supernetContent.title}</h1>
      <p class="subtitle">{supernetContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{supernetContent.sections.whatIs.title}</h2>
      <p>{supernetContent.sections.whatIs.content}</p>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="target" size="sm" />
          Main Goal
        </div>
        <div class="highlight-content">
          Reduce the number of routes in routing tables while maintaining connectivity to all networks.
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>{supernetContent.sections.requirements.title}</h2>
      <p>{supernetContent.sections.requirements.content}</p>
    </div>

    <div class="ref-section">
      <h2>Summarization Examples</h2>
      {#each supernetContent.examples as example, exIdx (`${example.title}-${exIdx}`)}
        <div class="ref-examples">
          <div class="examples-title">{example.title}</div>
          <div class="example-item">
            <div><strong>Individual Networks:</strong></div>
            {#each example.networks as network, netIdx (`${network}-${netIdx}`)}
              <div class="example-input">{network}</div>
            {/each}
            <div class="example-arrow">↓ Summarizes to ↓</div>
            <div class="example-output">{example.summary}</div>
            <div class="example-description">{example.explanation} - {example.addresses}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{supernetContent.stepByStep.title}</h2>
      <ol>
        {#each supernetContent.stepByStep.steps as step, stepIdx (`${step}-${stepIdx}`)}
          <li>{step}</li>
        {/each}
      </ol>
    </div>

    <div class="ref-section">
      <h2>{supernetContent.binaryExample.title}</h2>
      <p><strong>{supernetContent.binaryExample.scenario}</strong></p>

      <table class="ref-table">
        <thead>
          <tr>
            <th>Network</th>
            <th>Binary Representation</th>
          </tr>
        </thead>
        <tbody>
          {#each supernetContent.binaryExample.binary as row, rowIdx (`${row.network}-${rowIdx}`)}
            <tr>
              <td><code>{row.network}</code></td>
              <td><code>{row.binary}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="eye" size="sm" />
          Analysis
        </div>
        <div class="highlight-content">
          {supernetContent.binaryExample.analysis}
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Benefits of Route Summarization</h2>
      <ul>
        {#each supernetContent.benefits as benefit, benIdx (`${benefit}-${benIdx}`)}
          <li>{benefit}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Common Pitfalls</h2>
      {#each supernetContent.pitfalls as pitfall, pitIdx (`${pitfall.title}-${pitIdx}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="alert-triangle" size="sm" />
            {pitfall.title}
          </div>
          <div class="warning-content">
            <p><strong>Problem:</strong> {pitfall.problem}</p>
            <p><strong>Example:</strong> {pitfall.example}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Quick Reference Table</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Input Networks</th>
            <th>Summary Prefix</th>
            <th>Routes Saved</th>
          </tr>
        </thead>
        <tbody>
          {#each supernetContent.quickReference as row, refIdx (`${row.networks}-${refIdx}`)}
            <tr>
              <td>{row.networks}</td>
              <td><code>{row.summary}</code></td>
              <td>{row.saves}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
