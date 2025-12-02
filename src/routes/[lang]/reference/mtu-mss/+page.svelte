<script lang="ts">
  import { mtuMssContent } from '$lib/content/mtu-mss.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{mtuMssContent.title}</h1>
      <p class="subtitle">{mtuMssContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{mtuMssContent.sections.overview.title}</h2>
      <p>{mtuMssContent.sections.overview.content}</p>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="formula" size="sm" />
          Key Formula
        </div>
        <div class="highlight-content">
          MSS = MTU - IP Header - TCP Header<br />
          For IPv4: MSS = MTU - 20 - 20 = MTU - 40 bytes
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Common MTU/MSS Values</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Medium</th>
            <th>MTU</th>
            <th>MSS</th>
            <th>Usage</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {#each mtuMssContent.commonValues as value, index (`${value.medium}-${index}`)}
            <tr>
              <td><strong>{value.medium}</strong></td>
              <td><code>{value.mtu}</code></td>
              <td><code>{value.mss}</code></td>
              <td>{value.usage}</td>
              <td>{value.notes}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{mtuMssContent.calculations.title}</h2>
      {#each mtuMssContent.calculations.examples as example, index (`${example.scenario}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{example.scenario}</div>
          <div class="example-item">
            <div><strong>MTU:</strong> {example.mtu} bytes</div>
            <div><strong>IP Header:</strong> {example.ipHeader} bytes</div>
            <div><strong>TCP Header:</strong> {example.tcpHeader} bytes</div>
            <div><strong>Resulting MSS:</strong> <code>{example.mss}</code> bytes</div>
            <div><strong>Calculation:</strong> {example.calculation}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Protocol Overheads</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Protocol/Header</th>
            <th>Overhead (Bytes)</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {#each mtuMssContent.overheads as overhead, index (`${overhead.protocol}-${index}`)}
            <tr>
              <td><strong>{overhead.protocol}</strong></td>
              <td><code>{overhead.overhead}</code></td>
              <td>{overhead.notes}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{mtuMssContent.discovery.title}</h2>
      <p>{mtuMssContent.discovery.description}</p>

      <h3>PMTU Discovery Process</h3>
      <ol>
        {#each mtuMssContent.discovery.process as step, index (`discovery-step-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>Common Issues</h3>
      <ul>
        {#each mtuMssContent.discovery.issues as issue, index (`discovery-issue-${index}`)}
          <li>{issue}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Troubleshooting Common Issues</h2>
      {#each mtuMssContent.troubleshooting as issue, index (`${issue.issue}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="help-circle" size="sm" />
            {issue.issue}
          </div>
          <div class="warning-content">
            <p><strong>Cause:</strong> {issue.cause}</p>
            <p><strong>Solution:</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Useful Commands</h2>

      <h3>Checking MTU Settings</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Command</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {#each mtuMssContent.commands as cmd, index (`${cmd.platform}-${index}`)}
            <tr>
              <td><strong>{cmd.platform}</strong></td>
              <td><code>{cmd.command}</code></td>
              <td>{cmd.purpose}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>Testing MTU Size</h3>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Command</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {#each mtuMssContent.testCommands as cmd, index (`${cmd.purpose}-${index}`)}
            <tr>
              <td><strong>{cmd.platform}</strong></td>
              <td><code style="font-size: 0.85em;">{cmd.command}</code></td>
              <td>{cmd.purpose}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Best Practices</h2>
      <ul>
        {#each mtuMssContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="zap" size="sm" />
          Performance Tip
        </div>
        <div class="highlight-content">
          Mismatched MTU sizes can cause significant performance issues. Always ensure consistent MTU values across your
          network path, especially for high-throughput applications.
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Quick Reference</h2>
      <div class="ref-examples">
        <div class="examples-title">Common Values to Remember</div>
        {#each mtuMssContent.quickReference as value, index (`value-${index}`)}
          <div class="example-item">
            <div class="example-input">{value}</div>
          </div>
        {/each}
      </div>

      <div class="ref-warning">
        <div class="warning-title">
          <Icon name="alert-circle" size="sm" />
          Important Note
        </div>
        <div class="warning-content">
          When troubleshooting connectivity issues, especially with VPNs or tunnels, MTU/MSS mismatches are often the
          culprit. Test with smaller packet sizes if large transfers fail but small ones succeed.
        </div>
      </div>
    </div>
  </div>
</div>
