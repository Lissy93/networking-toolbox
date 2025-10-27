<script lang="ts">
  import '../../../../styles/pages.scss';
  import '../../../../styles/converters.scss';
  import '../../../../styles/components.scss';
  import Icon from '$lib/components/global/Icon.svelte';
</script>

<div class="container">
  <slot />

  <!-- IPv6 Notation Information Section -->
  <div class="info-cards-section">
    <div class="explainer-card no-hover">
      <h3>
        <Icon name="info" size="md" />
        Understanding IPv6 Address Notation
      </h3>
      <div class="explainer-content">
        <div class="format-explanations">
          <!-- Expanded Form -->
          <div class="format-explanation">
            <h4><span class="format-badge expanded">Expanded (Full) Format</span></h4>
            <p><strong>Structure:</strong> All 32 hexadecimal characters with colons every 4 digits</p>
            <p><strong>Example:</strong> <code>2001:0db8:85a3:0000:0000:8a2e:0370:7334</code></p>
            <p><strong>Usage:</strong> Debugging, detailed analysis, and when precision is required</p>
            <p><strong>Benefits:</strong> Shows complete address structure, easier to parse programmatically</p>
          </div>

          <!-- Compressed Form -->
          <div class="format-explanation">
            <h4><span class="format-badge compressed">Compressed (Shortened) Format</span></h4>
            <p><strong>Structure:</strong> Uses :: to represent consecutive zero groups, removes leading zeros</p>
            <p><strong>Example:</strong> <code>2001:db8:85a3::8a2e:370:7334</code></p>
            <p><strong>Usage:</strong> Configuration files, user interfaces, documentation</p>
            <p><strong>Benefits:</strong> Shorter, more readable, standard representation</p>
          </div>

          <!-- Compression Rules -->
          <div class="format-explanation">
            <h4><span class="format-badge rules">Compression Rules</span></h4>
            <p><strong>Double Colon (::):</strong> Represents one or more consecutive zero groups</p>
            <p><strong>Single Use:</strong> Only one :: allowed per address to avoid ambiguity</p>
            <p><strong>Leading Zeros:</strong> Remove leading zeros from each group (0001 → 1)</p>
            <p><strong>Preference:</strong> Compress the longest sequence of consecutive zeros</p>
          </div>
        </div>
      </div>
    </div>

    <div class="explainer-card no-hover">
      <h3>
        <Icon name="lightbulb" size="md" />
        Conversion Use Cases & Applications
      </h3>
      <div class="explainer-content">
        <div class="usage-scenarios">
          <div class="usage-scenario">
            <h4>Expand IPv6 Addresses</h4>
            <ul>
              <li><strong>Network Analysis:</strong> Compare addresses byte-by-byte</li>
              <li><strong>Database Storage:</strong> Consistent format for indexing</li>
              <li><strong>Debugging:</strong> See complete address structure</li>
              <li><strong>Programming:</strong> Easier parsing and manipulation</li>
              <li><strong>Security:</strong> Avoid address obfuscation issues</li>
            </ul>
          </div>

          <div class="usage-scenario">
            <h4>Compress IPv6 Addresses</h4>
            <ul>
              <li><strong>User Interface:</strong> Shorter, more readable addresses</li>
              <li><strong>Configuration:</strong> Cleaner config files and logs</li>
              <li><strong>Documentation:</strong> Standard format for examples</li>
              <li><strong>URLs:</strong> Shorter addresses in IPv6 URLs</li>
              <li><strong>Network Equipment:</strong> Standard display format</li>
            </ul>
          </div>

          <div class="usage-scenario">
            <h4>Real-world Scenarios</h4>
            <ul>
              <li><strong>Network Monitoring:</strong> Consistent address formatting</li>
              <li><strong>API Integration:</strong> Standardize input/output formats</li>
              <li><strong>Data Migration:</strong> Convert between address formats</li>
              <li><strong>Educational Tools:</strong> Demonstrate IPv6 structure</li>
              <li><strong>Quality Assurance:</strong> Validate address representations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="explainer-card no-hover">
      <h3>
        <Icon name="code" size="md" />
        Technical Examples & Standards
      </h3>
      <div class="explainer-content">
        <div class="examples-grid">
          <div class="example-item">
            <h4>Common Address Types</h4>
            <div class="code-examples">
              <div class="code-pair">
                <div class="code-label">Loopback:</div>
                <div class="code-block">
                  <code class="expanded">::1</code>
                  <span class="arrow">↔</span>
                  <code class="compressed">0000:0000:0000:0000:0000:0000:0000:0001</code>
                </div>
              </div>
              <div class="code-pair">
                <div class="code-label">Link-Local:</div>
                <div class="code-block">
                  <code class="expanded">fe80::1</code>
                  <span class="arrow">↔</span>
                  <code class="compressed">fe80:0000:0000:0000:0000:0000:0000:0001</code>
                </div>
              </div>
              <div class="code-pair">
                <div class="code-label">Documentation:</div>
                <div class="code-block">
                  <code class="expanded">2001:db8::</code>
                  <span class="arrow">↔</span>
                  <code class="compressed">2001:0db8:0000:0000:0000:0000:0000:0000</code>
                </div>
              </div>
            </div>
          </div>

          <div class="example-item">
            <h4>Best Practices</h4>
            <ul>
              <li><strong>RFC 5952:</strong> Follow standard compression guidelines</li>
              <li><strong>Consistency:</strong> Use same format throughout applications</li>
              <li><strong>Validation:</strong> Always validate both input and output</li>
              <li><strong>Case Sensitivity:</strong> Lowercase preferred (RFC 5952)</li>
              <li><strong>Leading Zeros:</strong> Always remove for compressed form</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  h3 :global(.icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-primary);
  }

  .usage-scenarios,
  .format-explanations,
  .explainer-card {
    display: grid;
    gap: var(--spacing-md);

    h3 {
      margin-bottom: 0;
      color: var(--color-primary);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .usage-scenario,
    .format-explanation,
    .example-item {
      padding: var(--spacing-md);
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-md);
      border-left: 4px solid var(--border-primary);

      h4 {
        color: var(--text-primary);
        margin-bottom: var(--spacing-sm);
      }

      ul {
        margin: var(--spacing-sm) 0 0 var(--spacing-md);

        li {
          margin-bottom: var(--spacing-xs);
          color: var(--text-primary);
        }
      }
    }
  }

  .info-cards-section {
    margin-top: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .format-badge {
    color: var(--bg-primary);
    border-radius: var(--radius-xs);
    padding: 0.1rem 0.25rem;
    font-weight: 600;

    &.expanded {
      background-color: var(--color-info);
    }
    &.compressed {
      background-color: var(--color-success);
    }
    &.rules {
      background-color: var(--color-warning);
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .code-examples {
    margin-top: var(--spacing-sm);
  }

  .code-pair {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-secondary);
  }

  .code-label {
    font-weight: 600;
    color: var(--color-primary);
    font-size: var(--font-size-sm);
  }

  .code-block {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;

    code {
      font-family: var(--font-mono);
      background-color: var(--bg-primary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-xs);
      border: 1px solid var(--border-primary);
      font-size: var(--font-size-xs);

      &.expanded {
        color: var(--color-info);
      }

      &.compressed {
        color: var(--color-success);
      }
    }

    .arrow {
      color: var(--text-secondary);
      font-weight: bold;
      opacity: 0.7;
    }
  }

  @media (max-width: 768px) {
    .examples-grid {
      grid-template-columns: 1fr;
    }

    .code-block {
      flex-direction: column;
      align-items: stretch;

      .arrow {
        text-align: center;
      }
    }
  }
</style>
