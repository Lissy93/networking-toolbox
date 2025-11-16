<script lang="ts">
  import { wildcardMasksContent } from '$lib/content/wildcard-masks.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{wildcardMasksContent.title}</h1>
      <p class="subtitle">{wildcardMasksContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{wildcardMasksContent.sections.overview.title}</h2>
      <p>{wildcardMasksContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{wildcardMasksContent.sections.difference.title}</h2>
      <p>{wildcardMasksContent.sections.difference.content}</p>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="eye" size="sm" />
          Key Difference
        </div>
        <div class="highlight-content">
          Wildcard masks are the bitwise inverse of subnet masks. If you know one, you can calculate the other by
          subtracting from 255.255.255.255.
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Conversion Examples</h2>
      {#each wildcardMasksContent.conversionExamples as example, exIdx (`${example.subnet}-${exIdx}`)}
        <div class="ref-examples">
          <div class="examples-title">{example.description}</div>
          <div class="example-item">
            <div><strong>Subnet Mask:</strong> <code>{example.subnet}</code></div>
            <div><strong>Subnet Binary:</strong> <code>{example.subnetBinary}</code></div>
            <div><strong>Wildcard Mask:</strong> <code>{example.wildcard}</code></div>
            <div><strong>Wildcard Binary:</strong> <code>{example.wildcardBinary}</code></div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{wildcardMasksContent.quickConversion.title}</h2>
      <p><strong>Formula:</strong> <code>{wildcardMasksContent.quickConversion.formula}</code></p>

      <h3>Steps:</h3>
      <ol>
        {#each wildcardMasksContent.quickConversion.steps as step, stepIdx (`${step}-${stepIdx}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>Examples:</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Subnet Mask</th>
            <th>Calculation</th>
            <th>Wildcard Mask</th>
          </tr>
        </thead>
        <tbody>
          {#each wildcardMasksContent.quickConversion.examples as example, qexIdx (`${example.subnet}-${qexIdx}`)}
            <tr>
              <td><code>{example.subnet}</code></td>
              <td>{example.calculation}</td>
              <td><code>{example.wildcard}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>ACL Examples by Platform</h2>
      {#each wildcardMasksContent.aclExamples as platform, pIdx (`${platform.title}-${pIdx}`)}
        <h3>{platform.title}</h3>
        {#each platform.entries as entry, eIdx (`${entry}-${eIdx}`)}
          <div class="ref-examples">
            <div class="examples-title">{entry.meaning}</div>
            <div class="example-item">
              <div><strong>ACL Entry:</strong> <code>{entry.acl}</code></div>
              <div><strong>Explanation:</strong> {entry.explanation}</div>
            </div>
          </div>
        {/each}
      {/each}
    </div>

    <div class="ref-section">
      <h2>Special Cases</h2>
      <div class="ref-grid two-col">
        {#each wildcardMasksContent.specialCases as specialCase, scIdx (`${specialCase.case}-${scIdx}`)}
          <div class="grid-item">
            <div class="item-title">{specialCase.case}</div>
            <div class="item-code">Wildcard: {specialCase.wildcard}</div>
            <div class="item-description">
              <strong>Meaning:</strong>
              {specialCase.meaning}<br />
              <strong>Usage:</strong>
              {specialCase.usage}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="ref-section">
      <h2>Platform Differences</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Format</th>
            <th>Example</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {#each wildcardMasksContent.platformDifferences as platform, pdIdx (`${platform.platform}-${pdIdx}`)}
            <tr>
              <td><strong>{platform.platform}</strong></td>
              <td><code style="font-size: 0.8em;">{platform.format}</code></td>
              <td><code style="font-size: 0.8em;">{platform.example}</code></td>
              <td>{platform.notes}</td>
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
            <th>CIDR</th>
            <th>Subnet Mask</th>
            <th>Wildcard Mask</th>
            <th>Addresses</th>
          </tr>
        </thead>
        <tbody>
          {#each wildcardMasksContent.quickReference as row, refIdx (`${row.subnet}-${refIdx}`)}
            <tr>
              <td><code>{row.prefix}</code></td>
              <td><code>{row.subnet}</code></td>
              <td><code>{row.wildcard}</code></td>
              <td>{row.use}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Common Mistakes</h2>
      {#each wildcardMasksContent.commonMistakes as mistake, mIdx (`${mistake.mistake}-${mIdx}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="alert-triangle" size="sm" />
            {mistake.mistake}
          </div>
          <div class="warning-content">
            <p><strong>Problem:</strong> {mistake.problem}</p>
            <p><strong>Solution:</strong> {mistake.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Tips for Success</h2>
      <div class="ref-examples">
        <div class="examples-title">Remember These</div>
        {#each wildcardMasksContent.tips as tip, tipIdx (`${tip}-${tipIdx}`)}
          <div class="example-item">
            <div class="example-description">{tip}</div>
          </div>
        {/each}
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="calculator" size="sm" />
          Quick Memory Aid
        </div>
        <div class="highlight-content">
          Wildcard 0 = "must match exactly", Wildcard 1 = "don't care". Think of it as a mask where 0 blocks changes and
          1 allows anything.
        </div>
      </div>
    </div>
  </div>
</div>
