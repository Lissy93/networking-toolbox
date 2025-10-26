<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import { cidrContent } from '$lib/content/cidr';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip.js';
  import type { NavItem, NavGroup } from '$lib/constants/nav';
  import '../../../styles/pages.scss';

  // Extract tools for CIDR section
  function extractNavItems(items: (NavItem | NavGroup)[]): NavItem[] {
    const navItems: NavItem[] = [];
    for (const item of items) {
      if ('href' in item) {
        navItems.push(item);
      } else if ('title' in item && 'items' in item) {
        navItems.push(...item.items);
      }
    }
    return navItems;
  }

  const cidrTools = extractNavItems(SUB_NAV['/cidr'] || []);
</script>

<div class="page-container">
  <header class="page-header">
    <h1>CIDR Tools & Converters</h1>
    <p class="page-description">
      Comprehensive CIDR tools for network analysis, conversion, and optimization. Convert between notation formats,
      summarize networks, split subnets, and perform set operations on IP ranges.
    </p>
  </header>

  <ToolsGrid tools={cidrTools} />

  <!-- Core Concepts -->
  <section class="concepts-section">
    <h2>Essential CIDR Concepts</h2>
    <div class="concepts-grid">
      {#each cidrContent.coreConcepts as concept, index (index)}
        <div class="concept-card" style="--accent-color: {concept.color}">
          <div class="concept-header">
            <Icon name={concept.icon} size="md" />
            <h3>{concept.title}</h3>
          </div>
          <p>{concept.description}</p>
          <code class="concept-example">{concept.example}</code>
        </div>
      {/each}
    </div>
  </section>

  <!-- What is CIDR -->
  <section class="about-section">
    <h2>What is CIDR?</h2>
    <div class="about-grid">
      <div class="about-content">
        {#each cidrContent.aboutSection.content as paragraph, i (i)}
          <p>
            {#if i === 0}
              <strong>CIDR (Classless Inter-Domain Routing)</strong>
              {paragraph.replace('CIDR (Classless Inter-Domain Routing) ', '')}
            {:else}
              {paragraph}
            {/if}
          </p>
        {/each}
      </div>
      <div class="benefits-list">
        <h3>Why CIDR Matters</h3>
        {#each cidrContent.aboutSection.advantages as advantage, index (index)}
          <div class="benefit-item">
            <strong>{advantage.title}:</strong>
            {advantage.description}
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Common CIDR Sizes -->
  <section class="sizes-section">
    <h2>Common CIDR Block Sizes</h2>
    <div class="sizes-table-wrapper">
      <table class="sizes-table">
        <thead>
          <tr>
            <th use:tooltip={'CIDR prefix length notation'}>CIDR</th>
            <th use:tooltip={'Traditional subnet mask notation'}>Subnet Mask</th>
            <th use:tooltip={'Number of usable host addresses'}>Hosts</th>
            <th use:tooltip={'Typical use cases for this network size'}>Common Use</th>
          </tr>
        </thead>
        <tbody>
          {#each cidrContent.commonSizes as size, index (index)}
            <tr class="size-row" style="--row-color: {size.color}">
              <td class="cidr-cell"><strong>{size.cidr}</strong></td>
              <td class="mask-cell"><code>{size.mask}</code></td>
              <td class="hosts-cell">{size.hosts}</td>
              <td class="use-cell">{size.use}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="table-note">
      <strong>*</strong> /31 networks use special point-to-point addressing (RFC 3021) where both addresses are usable without
      network/broadcast addresses.
    </p>
  </section>

  <!-- How CIDR Works -->
  <section class="how-it-works">
    <h2>How CIDR Works</h2>
    <div class="explanation-grid">
      {#each cidrContent.howItWorks as item, index (index)}
        <div class="explanation-item {item.type}">
          <h3>{item.title}</h3>
          <p>{item.content}</p>

          {#if item.example.type === 'bit'}
            <div class="bit-example">
              <div class="network-bits">{item.example.networkBits}</div>
              <div class="host-bits">{item.example.hostBits}</div>
              <div class="labels">
                <span class="network-label">{item.example.networkLabel}</span>
                <span class="host-label">{item.example.hostLabel}</span>
              </div>
            </div>
          {:else if item.example.type === 'summary'}
            <div class="summary-example">
              {#if item.example.before}
                <div class="before">
                  <strong>{item.example.before.title}</strong><br />
                  {#each item.example.before.content as line, index (index)}
                    {line}<br />
                  {/each}
                </div>
              {/if}
              <div class="arrow">→</div>
              {#if item.example.after}
                <div class="after">
                  <strong>{item.example.after.title}</strong><br />
                  {#each item.example.after.content as line, index (index)}
                    {line}<br />
                  {/each}
                </div>
              {/if}
            </div>
          {:else if item.example.type === 'tip'}
            <div class="planning-tip">
              <strong>{item.example.title}</strong>
              {item.example.content}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <!-- Quick Reference -->
  <section class="quick-reference">
    <h2>Quick Reference</h2>
    <div class="reference-grid">
      {#each cidrContent.quickReference as card, index (index)}
        <div class="reference-card no-hover">
          <h3>{card.title}</h3>
          <ul>
            {#each card.items as item, index (index)}
              <li>{item}</li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </section>
</div>

<style lang="scss">
  /* Core concepts section */
  .concepts-section {
    margin: var(--spacing-xl) 0;

    .concepts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: var(--spacing-lg);
      margin-top: var(--spacing-lg);
    }

    .concept-card {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      border: 1px solid var(--border-primary);
      border-left: 4px solid var(--accent-color);

      .concept-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);

        :global(.icon) {
          color: var(--accent-color);
        }

        h3 {
          margin: 0;
          color: var(--text-primary);
        }
      }

      p {
        color: var(--text-secondary);
        margin-bottom: var(--spacing-md);
        line-height: 1.6;
      }

      .concept-example {
        display: block;
        background: var(--bg-tertiary);
        padding: var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        color: var(--accent-color);
        border: 1px solid color-mix(in srgb, var(--accent-color), transparent 80%);
      }
    }
  }

  /* About section */
  .about-section {
    margin: var(--spacing-xl) 0;
    background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-secondary);

    .about-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-xl);
      margin-top: var(--spacing-lg);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: var(--spacing-lg);
      }
    }

    .about-content p {
      margin-bottom: var(--spacing-md);
      line-height: 1.7;
    }

    .benefits-list {
      .benefit-item {
        background: var(--bg-primary);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-sm);
        border: 1px solid var(--border-primary);

        strong {
          color: var(--color-primary);
        }
      }
    }
  }

  /* Common sizes table */
  .sizes-section {
    margin: var(--spacing-xl) 0;

    .sizes-table-wrapper {
      margin-top: var(--spacing-lg);
      overflow-x: auto;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-primary);
    }

    .sizes-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-secondary);

      th {
        background: var(--bg-tertiary);
        padding: var(--spacing-md);
        text-align: left;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 2px solid var(--border-primary);
      }

      .size-row {
        border-bottom: 1px solid var(--border-secondary);

        td {
          padding: var(--spacing-md);
          vertical-align: middle;
        }

        .cidr-cell strong {
          color: var(--row-color);
          font-weight: 700;
        }

        .mask-cell code {
          background: var(--bg-tertiary);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-xs);
          font-family: var(--font-mono);
          font-size: var(--font-size-sm);
        }

        .hosts-cell {
          font-family: var(--font-mono);
          font-weight: 600;
        }

        .use-cell {
          color: var(--text-secondary);
        }
      }
    }

    .table-note {
      margin-top: var(--spacing-md);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  /* How it works section */
  .how-it-works {
    margin: var(--spacing-xl) 0;

    .explanation-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--spacing-lg);
      margin-top: var(--spacing-lg);
    }

    .explanation-item {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      border: 1px solid var(--border-primary);

      &.success {
        border-left: 4px solid var(--color-success);
      }

      &.info {
        border-left: 4px solid var(--color-info);
      }

      &.warning {
        border-left: 4px solid var(--color-warning);
      }

      h3 {
        margin-bottom: var(--spacing-md);
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: var(--spacing-md);
      }

      .bit-example {
        background: var(--bg-tertiary);
        padding: var(--spacing-md);
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        text-align: center;

        .network-bits {
          color: var(--color-success);
          display: inline;
        }

        .host-bits {
          color: var(--color-info);
          display: inline;
        }

        .labels {
          display: flex;
          justify-content: space-between;
          margin-top: var(--spacing-sm);
          font-size: var(--font-size-xs);

          .network-label {
            color: var(--color-success);
          }

          .host-label {
            color: var(--color-info);
          }
        }
      }

      .summary-example {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: var(--spacing-md);
        align-items: center;
        background: var(--bg-tertiary);
        padding: var(--spacing-md);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-sm);

        .before,
        .after {
          text-align: center;
        }

        .arrow {
          font-size: var(--font-size-lg);
          color: var(--color-primary);
          font-weight: bold;
        }
      }

      .planning-tip {
        background: color-mix(in srgb, var(--color-warning), transparent 90%);
        padding: var(--spacing-md);
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-warning);
        font-size: var(--font-size-sm);

        strong {
          color: var(--color-warning);
        }
      }
    }
  }

  /* Quick reference section */
  .quick-reference {
    margin: var(--spacing-xl) 0;

    .reference-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--spacing-lg);
      margin-top: var(--spacing-lg);
    }

    .reference-card {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      border: 1px solid var(--border-primary);

      h3 {
        margin-bottom: var(--spacing-md);
        color: var(--color-primary);
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          margin-bottom: var(--spacing-sm);
          padding-left: var(--spacing-md);
          position: relative;
          font-family: var(--font-mono);
          font-size: var(--font-size-sm);

          &::before {
            content: '→';
            color: var(--color-primary);
            position: absolute;
            left: 0;
          }
        }
      }
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .concepts-grid {
      grid-template-columns: 1fr;
    }

    .explanation-grid {
      grid-template-columns: 1fr;
    }

    .reference-grid {
      grid-template-columns: 1fr;
    }

    .summary-example {
      grid-template-columns: 1fr;
      text-align: center;

      .arrow {
        transform: rotate(90deg);
      }
    }
  }
</style>
