<script lang="ts">
  import { SUB_NAV } from '$lib/constants/nav';
  import ToolsGrid from '$lib/components/global/ToolsGrid.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip.js';
  import type { NavItem, NavGroup } from '$lib/constants/nav';
  import {
    commonSubnetMasks,
    keyConcepts,
    subnettingTechniques,
    practicalTips,
    commonMistakes,
  } from '$lib/content/subnetting';
  import '../../styles/pages.scss';

  // Extract tools for subnetting section
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

  const subnettingTools = extractNavItems(SUB_NAV['/subnetting'] || []);

  function formatNumber(num: number): string {
    return num.toLocaleString();
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>Subnetting Tools</h1>
    <p class="page-description">
      Divide networks efficiently, optimize address allocation, and master network design with our comprehensive
      subnetting toolkit.
    </p>
  </header>

  <ToolsGrid tools={subnettingTools} />

  <hr class="section-divider" />

  <!-- Quick Intro -->
  <h2>What's Subnetting?</h2>
  <section class="intro-card">
    <p>
      Subnetting is the process of splitting a large network into smaller, easier-to-manage pieces. Each subnet has its
      own network address and range of IPs, which helps organize devices, improve security, and reduce wasted addresses.
      It's core to network planning (both small home labs, or managing a large office or campus).
    </p>
    <p class="tools-intro">
      These tools aim to make this easier for you, handling the math and planning for you. They calculate network and
      broadcast addresses, host ranges, and help design or summarize networks so you can focus on building, not IP
      crunching.
    </p>
  </section>

  <!-- Key Concepts Grid -->
  <section class="concepts-section">
    <h2>Essential Concepts</h2>
    <div class="concepts-grid">
      {#each keyConcepts as concept (concept.title)}
        <div class="concept-card">
          <div class="concept-header">
            <Icon name={concept.icon} size="md" />
            <h3>{concept.title}</h3>
          </div>
          <p>{concept.description}</p>
          {#if concept.example}
            <code class="concept-example">{concept.example}</code>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <!-- Techniques Comparison -->
  <section class="techniques-section">
    <h2>Subnetting Techniques</h2>
    <div class="techniques-grid">
      {#each subnettingTechniques as technique (technique.name)}
        <div class="technique-card" style="--accent-color: {technique.color}">
          <div class="technique-header">
            <Icon name={technique.icon} size="lg" />
            <h3>{technique.name}</h3>
          </div>
          <p class="technique-description">{technique.description}</p>
          <div class="technique-use-case">
            <strong>Best for:</strong>
            {technique.useCase}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Common Subnet Masks Reference -->
  <section class="masks-section">
    <h2>Common Subnet Masks</h2>
    <div class="masks-table-wrapper">
      <table class="masks-table">
        <thead>
          <tr>
            <th use:tooltip={'CIDR notation - number of network bits'}>CIDR</th>
            <th use:tooltip={'Decimal representation of the subnet mask'}>Subnet Mask</th>
            <th use:tooltip={'Number of usable host addresses per subnet'}>Hosts</th>
            <th use:tooltip={'Number of possible subnets in a /24 network'}>Subnets</th>
          </tr>
        </thead>
        <tbody>
          {#each commonSubnetMasks as mask (mask.cidr)}
            <tr>
              <td class="cidr-cell">/{mask.cidr}</td>
              <td class="mask-cell">{mask.decimal}</td>
              <td class="hosts-cell">{formatNumber(mask.hosts)}</td>
              <td class="networks-cell">{formatNumber(mask.networks)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <!-- Tips and Best Practices -->
  <div class="tips-grid">
    <section class="tips-card">
      <div class="tips-header">
        <Icon name="lightbulb" size="md" />
        <h2>Best Practices</h2>
      </div>
      <ul>
        {#each practicalTips as tip (tip)}
          <li>{tip}</li>
        {/each}
      </ul>
    </section>

    <section class="mistakes-card">
      <div class="mistakes-header">
        <Icon name="alert-triangle" size="md" />
        <h2>Common Mistakes</h2>
      </div>
      <ul>
        {#each commonMistakes as mistake (mistake)}
          <li>{mistake}</li>
        {/each}
      </ul>
    </section>
  </div>
</div>

<style>
  section {
    margin-bottom: var(--spacing-xl);
  }

  h2 {
    color: var(--text-primary);
    margin-bottom: var(--spacing-lg);
    font-size: var(--font-size-xl);
    font-weight: 600;
  }

  /* Intro Card */
  .intro-card {
    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0 0 var(--spacing-md) 0;
      font-size: var(--font-size-md);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .tools-intro {
      color: var(--text-tertiary);
      font-size: var(--font-size-sm);
    }
  }

  /* Concepts Grid */
  .concepts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-md);
  }

  .concept-card {
    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);

    p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0 0 var(--spacing-sm) 0;
    }
  }

  .concept-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    :global(.icon) {
      color: var(--color-primary);
      flex-shrink: 0;
    }

    h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
  }

  .concept-example {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-primary);
    display: inline-block;
  }

  /* Techniques Grid */
  .techniques-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);
  }

  .technique-card {
    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--accent-color);
    }
  }

  .technique-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    :global(.icon) {
      color: var(--accent-color);
      flex-shrink: 0;
    }

    h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-lg);
      font-weight: 700;
    }
  }

  .technique-description {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0 0 var(--spacing-md) 0;
  }

  .technique-use-case {
    color: var(--text-primary);
    font-size: var(--font-size-sm);

    strong {
      color: var(--accent-color);
    }
  }

  /* Subnet Masks Table */
  .masks-section {
    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    border: 1px solid var(--border-primary);
  }

  .masks-table-wrapper {
    overflow-x: auto;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
  }

  .masks-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);

    th {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
      color: var(--bg-primary);
      padding: var(--spacing-md);
      text-align: left;
      font-weight: 600;
      cursor: help;
      border: none;

      &:first-child {
        border-radius: var(--radius-sm) 0 0 0;
      }

      &:last-child {
        border-radius: 0 var(--radius-sm) 0 0;
      }
    }

    td {
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--border-primary);
      background-color: var(--bg-primary);
      transition: all ease-in 0.2s;
    }

    tr:hover td {
      background-color: var(--bg-secondary);
    }

    tr:last-child td {
      border-bottom: none;
    }

    .cidr-cell {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-primary);
    }

    .mask-cell {
      font-family: var(--font-mono);
      color: var(--text-primary);
    }

    .hosts-cell,
    .networks-cell {
      text-align: right;
      font-family: var(--font-mono);
      color: var(--text-secondary);
    }
  }

  /* Tips Grid */
  .tips-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: var(--spacing-lg);
  }

  .tips-card,
  .mistakes-card {
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    border: 1px solid var(--border-primary);

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: var(--spacing-2xs) 0;
        color: var(--text-secondary);
        line-height: 1.6;
        position: relative;
        padding-left: var(--spacing-lg);

        &::before {
          content: '•';
          position: absolute;
          left: 0;
          font-weight: bold;
          font-size: 1.2em;
        }
      }
    }
  }

  .tips-card {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-success), transparent 90%),
      color-mix(in srgb, var(--color-success), transparent 95%)
    );

    li::before {
      color: var(--color-success);
    }
  }

  .mistakes-card {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-warning), transparent 90%),
      color-mix(in srgb, var(--color-warning), transparent 95%)
    );

    li::before {
      color: var(--color-warning);
    }
  }

  .tips-header,
  .mistakes-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);

    h2 {
      margin: 0;
      font-size: var(--font-size-lg);
    }
  }

  .tips-header :global(.icon) {
    color: var(--color-success);
  }

  .mistakes-header :global(.icon) {
    color: var(--color-warning);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .concepts-grid,
    .techniques-grid,
    .tips-grid {
      grid-template-columns: 1fr;
    }

    .technique-card,
    .concept-card {
      padding: var(--spacing-md);
    }

    .masks-section,
    .intro-card {
      padding: var(--spacing-md);
    }

    .masks-table {
      font-size: var(--font-size-xs);

      th,
      td {
        padding: var(--spacing-xs) var(--spacing-sm);
      }
    }
  }

  @media (max-width: 480px) {
    .tips-grid {
      gap: var(--spacing-md);
    }

    .tips-card,
    .mistakes-card {
      padding: var(--spacing-md);
    }
  }
</style>
