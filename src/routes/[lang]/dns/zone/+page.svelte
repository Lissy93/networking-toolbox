<script>
  import Icon from '$lib/components/global/Icon.svelte';
  import { SUB_NAV } from '$lib/constants/nav.js';

  const zoneTools = (() => {
    const dnsNavGroup = SUB_NAV['/dns']?.find(
      (group) => typeof group === 'object' && 'title' in group && group.title === 'Zone File Tools',
    );
    return dnsNavGroup && 'items' in dnsNavGroup ? dnsNavGroup.items : [];
  })();
</script>

<div class="zone-tools-page">
  <div class="hero-section">
    <div class="hero-content">
      <h1>DNS Zone File Tools</h1>
      <p>
        Professional tools for DNS zone file analysis, validation, and management. Built for network administrators, DNS
        engineers, and automation workflows.
      </p>
    </div>
  </div>

  <div class="tools-grid">
    {#each zoneTools as tool (tool.href)}
      <a href={tool.href} class="tool-card">
        <div class="tool-icon">
          <Icon name="file" size="lg" />
        </div>
        <div class="tool-info">
          <h3>{tool.label}</h3>
          <p>{tool.description}</p>
        </div>
        <div class="tool-arrow">
          <Icon name="chevron-right" size="sm" />
        </div>
      </a>
    {/each}
  </div>

  <div class="features-section">
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">
          <Icon name="check-circle" size="lg" />
        </div>
        <div class="feature-content">
          <h4>Zone Validation</h4>
          <p>
            Comprehensive RFC compliance checking with detailed error reporting and recommendations for fixing common
            issues.
          </p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <Icon name="git-compare" size="lg" />
        </div>
        <div class="feature-content">
          <h4>Change Tracking</h4>
          <p>
            Compare zone file versions to track DNS changes, plan migrations, and audit modifications with unified diff
            support.
          </p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <Icon name="bar-chart" size="lg" />
        </div>
        <div class="feature-content">
          <h4>Analytics & Insights</h4>
          <p>
            Deep analysis of record distribution, TTL patterns, name lengths, and zone health metrics for optimization.
          </p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <Icon name="shield" size="lg" />
        </div>
        <div class="feature-content">
          <h4>Standards Compliance</h4>
          <p>
            Ensure DNS names meet RFC length limits and zone files follow best practices for reliable DNS operation.
          </p>
        </div>
      </div>
    </div>
  </div>

  <div class="use-cases-section">
    <h2>Common Use Cases</h2>
    <div class="use-cases-grid">
      <div class="use-case">
        <h4>DNS Migration Planning</h4>
        <p>
          Compare existing and target zones to understand exactly what changes during migrations and ensure nothing is
          missed.
        </p>
      </div>

      <div class="use-case">
        <h4>Zone File Cleanup</h4>
        <p>
          Normalize messy zone files with consistent formatting, proper ordering, duplicate removal, and error
          correction.
        </p>
      </div>

      <div class="use-case">
        <h4>Compliance Auditing</h4>
        <p>
          Validate zone files against DNS standards to identify potential issues before they cause resolution failures.
        </p>
      </div>

      <div class="use-case">
        <h4>Configuration Analysis</h4>
        <p>
          Understand zone structure, identify optimization opportunities, and track DNS infrastructure growth over time.
        </p>
      </div>
    </div>
  </div>

  <div class="best-practices-section">
    <h2>Zone File Best Practices</h2>
    <div class="practices-grid">
      <div class="practice">
        <Icon name="check" size="sm" />
        <span>Always include SOA and NS records for proper delegation</span>
      </div>

      <div class="practice">
        <Icon name="check" size="sm" />
        <span>Use fully qualified domain names ending with dots</span>
      </div>

      <div class="practice">
        <Icon name="check" size="sm" />
        <span>Maintain consistent TTL values based on change frequency</span>
      </div>

      <div class="practice">
        <Icon name="check" size="sm" />
        <span>Keep domain names under 63 characters per label</span>
      </div>

      <div class="practice">
        <Icon name="check" size="sm" />
        <span>Remove duplicate records to avoid confusion</span>
      </div>

      <div class="practice">
        <Icon name="check" size="sm" />
        <span>Validate zones after changes before deployment</span>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .zone-tools-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  .hero-section {
    text-align: center;
    margin-bottom: var(--spacing-2xl);
    padding: var(--spacing-2xl) 0;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-primary), transparent 95%),
      color-mix(in srgb, var(--color-secondary), transparent 95%)
    );
    border-radius: var(--radius-lg);
  }

  .hero-content {
    h1 {
      font-size: var(--font-size-3xl);
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }

    p {
      font-size: var(--font-size-lg);
      color: var(--text-secondary);
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-2xl);
  }

  .tool-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-xl);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--surface-hover);
      border-color: var(--color-primary);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .tool-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      background-color: color-mix(in srgb, var(--color-primary), transparent 90%);
      color: var(--color-primary);
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }

    .tool-info {
      flex: 1;

      h3 {
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
      }

      p {
        color: var(--text-secondary);
        line-height: 1.5;
        margin: 0;
      }
    }

    .tool-arrow {
      color: var(--text-secondary);
      transition: transform var(--transition-fast);
    }

    &:hover .tool-arrow {
      transform: translateX(4px);
      color: var(--color-primary);
    }
  }

  .features-section {
    margin-bottom: var(--spacing-2xl);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-lg);
  }

  .feature-card {
    padding: var(--spacing-xl);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    text-align: center;

    .feature-icon {
      display: flex;
      justify-content: center;
      margin-bottom: var(--spacing-md);
      color: var(--color-primary);
    }

    .feature-content {
      h4 {
        font-size: var(--font-size-md);
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: var(--spacing-sm);
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0;
      }
    }
  }

  .use-cases-section {
    margin-bottom: var(--spacing-2xl);

    h2 {
      text-align: center;
      font-size: var(--font-size-2xl);
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-xl);
    }
  }

  .use-cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .use-case {
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    h4 {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: var(--spacing-sm);
    }

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  }

  .best-practices-section {
    h2 {
      text-align: center;
      font-size: var(--font-size-2xl);
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-xl);
    }
  }

  .practices-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
  }

  .practice {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background-color: color-mix(in srgb, var(--color-success), transparent 95%);
    border: 1px solid color-mix(in srgb, var(--color-success), transparent 80%);
    border-radius: var(--radius-md);
    color: var(--color-success);
    font-size: var(--font-size-sm);
  }

  @media (max-width: 768px) {
    .zone-tools-page {
      padding: var(--spacing-lg) var(--spacing-md);
    }

    .hero-content h1 {
      font-size: var(--font-size-2xl);
    }

    .hero-content p {
      font-size: var(--font-size-md);
    }

    .tools-grid {
      grid-template-columns: 1fr;
    }

    .tool-card {
      flex-direction: column;
      text-align: center;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .use-cases-grid {
      grid-template-columns: 1fr;
    }

    .practices-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
