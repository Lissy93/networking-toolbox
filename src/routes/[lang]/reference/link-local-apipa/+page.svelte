<script lang="ts">
  import { linkLocalApipaContent } from '$lib/content/link-local-apipa.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{linkLocalApipaContent.title}</h1>
      <p class="subtitle">{linkLocalApipaContent.description}</p>
    </div>

    <div class="ref-section">
      <h2>{linkLocalApipaContent.sections.overview.title}</h2>
      <p>{linkLocalApipaContent.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>{linkLocalApipaContent.apipa.title}</h2>

      <div class="ref-examples">
        <div class="examples-title">Address Range</div>
        <div class="example-item">
          <div><strong>Network:</strong> <code>{linkLocalApipaContent.apipa.range}</code></div>
          <div><strong>Full Range:</strong> <code>{linkLocalApipaContent.apipa.fullRange}</code></div>
          <div><strong>Usable Range:</strong> <code>{linkLocalApipaContent.apipa.usableRange}</code></div>
          <div><strong>Reserved:</strong> {linkLocalApipaContent.apipa.reservedAddresses.join(', ')}</div>
        </div>
      </div>

      <p>{linkLocalApipaContent.apipa.description}</p>

      <h3>When APIPA is Used</h3>
      <ul>
        {#each linkLocalApipaContent.apipa.whenUsed as reason, index (`apipa-reason-${index}`)}
          <li>{reason}</li>
        {/each}
      </ul>

      <h3>How APIPA Works</h3>
      <ol>
        {#each linkLocalApipaContent.apipa.howItWorks as step, index (`apipa-step-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>APIPA Characteristics</h3>
      <ul>
        {#each linkLocalApipaContent.apipa.characteristics as characteristic, index (`apipa-char-${index}`)}
          <li>{characteristic}</li>
        {/each}
      </ul>

      <h3>Troubleshooting APIPA Issues</h3>
      {#each linkLocalApipaContent.apipa.troubleshooting as issue, index (`${issue.symptom}-${index}`)}
        <div class="ref-warning">
          <div class="warning-title">
            <Icon name="alert-triangle" size="sm" />
            {issue.symptom}
          </div>
          <div class="warning-content">
            <p><strong>Meaning:</strong> {issue.meaning}</p>
            <p><strong>Solution:</strong> {issue.solution}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{linkLocalApipaContent.ipv6LinkLocal.title}</h2>

      <div class="ref-examples">
        <div class="examples-title">Address Range</div>
        <div class="example-item">
          <div><strong>Network:</strong> <code>{linkLocalApipaContent.ipv6LinkLocal.range}</code></div>
          <div><strong>Full Range:</strong> <code>{linkLocalApipaContent.ipv6LinkLocal.fullRange}</code></div>
          <div><strong>Common Format:</strong> <code>{linkLocalApipaContent.ipv6LinkLocal.commonFormat}</code></div>
        </div>
      </div>

      <p>{linkLocalApipaContent.ipv6LinkLocal.description}</p>

      <h3>Address Formation</h3>
      <ol>
        {#each linkLocalApipaContent.ipv6LinkLocal.formation as step, index (`ipv6-formation-${index}`)}
          <li>{step}</li>
        {/each}
      </ol>

      <h3>When IPv6 Link-Local is Used</h3>
      <ul>
        {#each linkLocalApipaContent.ipv6LinkLocal.whenUsed as use, index (`ipv6-use-${index}`)}
          <li>{use}</li>
        {/each}
      </ul>

      <h3>IPv6 Link-Local Characteristics</h3>
      <ul>
        {#each linkLocalApipaContent.ipv6LinkLocal.characteristics as characteristic, index (`ipv6-char-${index}`)}
          <li>{characteristic}</li>
        {/each}
      </ul>

      <h3>Types of IPv6 Link-Local Addresses</h3>
      <div class="ref-grid two-col">
        {#each linkLocalApipaContent.ipv6LinkLocal.types as type, index (`${type.type}-${index}`)}
          <div class="grid-item">
            <div class="item-title">{type.type}</div>
            <div class="item-description">{type.description}</div>
            <div><strong>Example:</strong> <code>{type.example}</code></div>
            <div><strong>Privacy:</strong> {type.privacy}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="ref-section">
      <h2>IPv4 APIPA vs IPv6 Link-Local Comparison</h2>

      <table class="ref-table">
        <thead>
          <tr>
            <th>Aspect</th>
            <th>IPv4 APIPA</th>
            <th>IPv6 Link-Local</th>
          </tr>
        </thead>
        <tbody>
          {#each linkLocalApipaContent.comparison as row, index (`${row.aspect}-${index}`)}
            <tr>
              <td><strong>{row.aspect}</strong></td>
              <td>{row.ipv4}</td>
              <td>{row.ipv6}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>Practical Examples</h2>
      {#each linkLocalApipaContent.practicalExamples as example, index (`${example.scenario}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{example.scenario}</div>
          <div class="example-item">
            <div><strong>IPv4 Behavior:</strong> {example.ipv4Behavior}</div>
            <div><strong>IPv6 Behavior:</strong> {example.ipv6Behavior}</div>
            <div><strong>Impact:</strong> {example.impact}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Troubleshooting Commands</h2>

      <table class="ref-table">
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Windows</th>
            <th>Linux</th>
            <th>macOS</th>
          </tr>
        </thead>
        <tbody>
          {#each linkLocalApipaContent.troubleshootingCommands as cmd, index (`${cmd.purpose}-${index}`)}
            <tr>
              <td><strong>{cmd.purpose}</strong></td>
              <td><code>{cmd.windows}</code></td>
              <td><code>{cmd.linux}</code></td>
              <td><code>{cmd.macOS}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>When to Worry</h2>
      {#each linkLocalApipaContent.whenToWorry as situation, index (`${situation.situation}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">{situation.situation}</div>
          <div class="example-item">
            <div><strong>Concern Level:</strong> {situation.concern}</div>
            <div><strong>Action:</strong> {situation.action}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>Best Practices</h2>
      <ul>
        {#each linkLocalApipaContent.bestPractices as practice, index (`practice-${index}`)}
          <li>{practice}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Common Mistakes</h2>
      <ul>
        {#each linkLocalApipaContent.commonMistakes as mistake, index (`mistake-${index}`)}
          <li>{mistake}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Quick Reference</h2>

      <div class="ref-grid two-col">
        <div class="grid-item">
          <div class="item-title">Recognition</div>
          {#each linkLocalApipaContent.quickReference.recognition as item, index (`recognition-${index}`)}
            <div class="item-description">{item}</div>
          {/each}
        </div>

        <div class="grid-item">
          <div class="item-title">Troubleshooting</div>
          {#each linkLocalApipaContent.quickReference.troubleshooting as item, index (`qr-trouble-${index}`)}
            <div class="item-description">{item}</div>
          {/each}
        </div>
      </div>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="key" size="sm" />
          Key Difference
        </div>
        <div class="highlight-content">
          IPv4 APIPA (169.254.x.x) indicates a problem - DHCP failed. IPv6 link-local (fe80::) is normal and required -
          every IPv6 interface has one.
        </div>
      </div>
    </div>
  </div>
</div>
