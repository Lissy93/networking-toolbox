<script lang="ts">
  import { ipv6EmbeddedIPv4Content } from '$lib/content/ipv6-embedded-ipv4.js';

  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="page-container">
  <div class="ref-page">
    <div class="ref-header">
      <h1>{ipv6EmbeddedIPv4Content.title}</h1>
      <p class="subtitle">{ipv6EmbeddedIPv4Content.description}</p>
    </div>

    <div class="ref-section">
      <h2>{ipv6EmbeddedIPv4Content.sections.overview.title}</h2>
      <p>{ipv6EmbeddedIPv4Content.sections.overview.content}</p>
    </div>

    <div class="ref-section">
      <h2>IPv4-in-IPv6 Mechanisms</h2>
      {#each ipv6EmbeddedIPv4Content.mechanisms as mechanism, index (`${mechanism.name}-${index}`)}
        <div class="ref-examples">
          <div class="examples-title">
            {mechanism.name}
            <span
              style="color: {mechanism.status === 'Active'
                ? 'var(--color-success)'
                : mechanism.status === 'Deprecated'
                  ? 'var(--color-error)'
                  : 'var(--color-warning)'}">[{mechanism.status}]</span
            >
          </div>
          <div class="example-item">
            <div><strong>Prefix:</strong> <code>{mechanism.prefix}</code></div>
            <div><strong>Purpose:</strong> {mechanism.purpose}</div>
            <div><strong>Format:</strong> <code>{mechanism.format}</code></div>
            <div><strong>Examples:</strong></div>
            {#each mechanism.examples as example, index (`example-${index}`)}
              <div class="example-input">{example}</div>
            {/each}
            <div><strong>Usage:</strong></div>
            <ul>
              {#each mechanism.usage as use, index (`use-${index}`)}
                <li>{use}</li>
              {/each}
            </ul>
            <div class="example-description"><strong>Note:</strong> {mechanism.notes}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="ref-section">
      <h2>{ipv6EmbeddedIPv4Content.recognition.title}</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th>Pattern</th>
            <th>Meaning</th>
            <th>What to Do</th>
          </tr>
        </thead>
        <tbody>
          {#each ipv6EmbeddedIPv4Content.recognition.patterns as pattern, index (`${pattern.pattern}-${index}`)}
            <tr>
              <td><code>{pattern.pattern}</code></td>
              <td>{pattern.meaning}</td>
              <td>{pattern.action}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="ref-section">
      <h2>{ipv6EmbeddedIPv4Content.conversion.title}</h2>
      <p>To understand embedded addresses, you need to convert IPv4 addresses to hexadecimal:</p>

      <table class="ref-table">
        <thead>
          <tr>
            <th>IPv4 Address</th>
            <th>Hex Equivalent</th>
            <th>Breakdown</th>
          </tr>
        </thead>
        <tbody>
          {#each ipv6EmbeddedIPv4Content.conversion.examples as example, index (`${example.ipv4}-${index}`)}
            <tr>
              <td><code>{example.ipv4}</code></td>
              <td><code>{example.hex}</code></td>
              <td>{example.breakdown}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <div class="ref-highlight">
        <div class="highlight-title">
          <Icon name="calculator" size="sm" />
          Quick Tip
        </div>
        <div class="highlight-content">
          Each IPv4 octet becomes 2 hex digits. For example: 192 = C0, 168 = A8, so 192.168.1.1 becomes C0A8:0101.
        </div>
      </div>
    </div>

    <div class="ref-section">
      <h2>Modern Usage Guidelines</h2>
      <ul>
        {#each ipv6EmbeddedIPv4Content.modernUsage as guideline, index (`guideline-${index}`)}
          <li>{guideline}</li>
        {/each}
      </ul>
    </div>

    <div class="ref-section">
      <h2>Common Troubleshooting Issues</h2>
      {#each ipv6EmbeddedIPv4Content.troubleshooting as issue, index (`${issue.issue}-${index}`)}
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
      <h2>Security Considerations</h2>
      <div class="ref-examples">
        <div class="examples-title">Important Security Notes</div>
        {#each ipv6EmbeddedIPv4Content.securityNotes as note, index (`note-${index}`)}
          <div class="example-item">
            <div class="example-description">{note}</div>
          </div>
        {/each}
      </div>

      <div class="ref-warning">
        <div class="warning-title">
          <Icon name="shield-alert" size="sm" />
          Security Warning
        </div>
        <div class="warning-content">
          Many IPv4-in-IPv6 transition mechanisms have known security vulnerabilities. Disable unused mechanisms and
          monitor for unexpected embedded address patterns in your network.
        </div>
      </div>
    </div>
  </div>
</div>
