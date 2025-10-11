<script lang="ts">
  import { TOP_NAV, aboutPages, SUB_NAV, STANDALONE_PAGES, type NavItem, type NavGroup } from '$lib/constants/nav';
  import { resolve } from '$app/paths';
  import Icon from '$lib/components/global/Icon.svelte';

  interface Props {
    homeMode?: boolean;
  }

  let { homeMode = false }: Props = $props();

  interface TreeNode {
    label: string;
    href: string | null;
    description?: string;
    icon?: string;
    children: TreeNode[];
  }

  const mapToNode = (item: NavItem | NavGroup): TreeNode => ({
    label: 'label' in item ? item.label : item.title,
    href: 'href' in item ? item.href : null,
    description: item.description,
    icon: 'icon' in item ? item.icon : undefined,
    children: [],
  });

  // Build tree structure from navigation data
  const siteTree: TreeNode[] = [
    ...TOP_NAV.map((topItem) => {
      const section = mapToNode(topItem);
      const subNavData = SUB_NAV[topItem.href];

      if (subNavData) {
        section.children = subNavData.map((item) => {
          if ('items' in item) {
            // It's a NavGroup with items - might have an href for the category page
            const groupNode = mapToNode(item);
            groupNode.children = item.items.map(mapToNode);
            return groupNode;
          } else {
            // It's a NavItem
            return mapToNode(item);
          }
        });
      }
      return section;
    }),
    ...(aboutPages.length
      ? [
          {
            label: 'About',
            href: resolve('/about'),
            description: 'Information about the project and documentation',
            children: aboutPages.map(mapToNode),
          },
        ]
      : []),
    ...(STANDALONE_PAGES.length
      ? [
          {
            label: 'Other Pages',
            href: resolve('/'),
            description: 'Additional tools and utilities',
            children: STANDALONE_PAGES.map(mapToNode),
          },
        ]
      : []),
  ];
</script>

{#snippet nodeLink(node: TreeNode)}
  {@const title = node.description || node.label}
  {@const ariaLabel = node.description ? `${node.label}: ${node.description}` : node.label}
  {#if node.href}
    {#if node.icon}
      <Icon name={node.icon} size="xs" />
    {/if}
    <a href={node.href} {title} aria-label={ariaLabel}>{node.label}</a>
  {:else}
    <span class={node.children.length ? 'section-title' : 'group-title'} {title} aria-label={ariaLabel}>
      {node.label}
    </span>
  {/if}
{/snippet}

{#snippet treeNode(node: TreeNode, level = 0)}
  {#if node.children.length > 0}
    <details open>
      <summary>{@render nodeLink(node)}</summary>
      <ul>
        {#each node.children as child (child.label)}
          <li>
            {#if child.children.length > 0}
              {@render treeNode(child, level + 1)}
            {:else}
              {@render nodeLink(child)}
            {/if}
          </li>
        {/each}
      </ul>
    </details>
  {:else}
    {@render nodeLink(node)}
  {/if}
{/snippet}

<div class="sitemap-page card">
  <h1>{homeMode ? 'Networking Toolbox' : 'Site Map'}</h1>
  {#if !homeMode}
    <p>
      Site-wide page listing.<br />
      For machine-readable version, see <a class="xml-link" href={resolve('/sitemap.xml')}>sitemap.xml</a>
    </p>
  {/if}

  <div class="tree">
    {#each siteTree as node (node.label)}
      {@render treeNode(node)}
    {/each}
  </div>
</div>

<style lang="scss">
  .sitemap-page {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    h1 {
      margin-bottom: var(--spacing-sm);
    }

    .xml-link {
      color: var(--color-primary);
      background: var(--bg-primary);
      border-radius: var(--radius-sm);
      padding: var(--spacing-2xs) var(--spacing-sm);
    }
  }

  .tree {
    details {
      margin: var(--spacing-xs) 0;

      &[open] > summary {
        margin-bottom: var(--spacing-xs);
      }

      summary {
        cursor: pointer;
        padding: var(--spacing-xs);
        border-radius: var(--border-radius);
        transition: background-color 0.2s;
        color: var(--color-primary);
        font-weight: bold;
        &:hover {
          background: color-mix(in srgb, var(--color-accent), transparent 90%);
        }
        &::marker {
          color: var(--color-primary-hover);
        }
      }

      ul {
        list-style: none;
        padding-left: var(--spacing-md);
        margin: var(--spacing-xs) 0;

        li {
          margin: var(--spacing-xs) 0;
          padding-left: var(--spacing-sm);
          :global(.icon) {
            opacity: 0.75;
            transition: all ease-in-out 0.2s;
          }
          &:hover > :global(.icon) {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      }
    }

    a {
      color: var(--color-link);
      text-decoration: none;
      display: inline-block;
      transition: all 0.2s;
      border-radius: var(--radius-sm);

      &:hover {
        background: color-mix(in srgb, var(--color-primary), transparent 95%);
        text-decoration: underline;
      }
    }
    .section-title,
    .group-title {
      color: var(--color-primary);
      font-weight: 400;
    }
  }
</style>
