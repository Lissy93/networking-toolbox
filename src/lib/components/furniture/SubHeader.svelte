<script lang="ts">
  import { page } from '$app/stores';
  import { SUB_NAV } from '$lib/constants/nav';
  import { findSectionKey, isActive } from '$lib/utils/nav-helpers';

  $: currentPath = $page.url?.pathname ?? '/';
  $: sectionKey = findSectionKey(currentPath); // e.g. '/reference' or '/cidr'
  $: navStructure = sectionKey ? SUB_NAV[sectionKey] : null;

  // Check if the structure contains any groups
  $: hasGroups = navStructure && navStructure.some((item) => 'title' in item);
</script>

{#if navStructure}
  <nav class="sub-nav" aria-label="Section">
    <div class="container">
      {#if hasGroups}
        <!-- Mixed navigation with groups and flat items -->
        <div class="mixed-nav">
          <!-- Render all groups first -->
          {#each navStructure as item ('title' in item ? item.title : item.href)}
            {#if 'title' in item}
              <div class="nav-group">
                <div class="group-title">{item.title}</div>
                <div class="group-links">
                  {#each item.items as link (link.href)}
                    <a
                      href={link.href}
                      class="sub-nav-link {isActive(currentPath, link.href) ? 'active' : ''}"
                      aria-current={isActive(currentPath, link.href) ? 'page' : undefined}
                    >
                      {link.label}
                    </a>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}

          <!-- Render standalone links under "More" group if any exist -->
          {#if navStructure.some((item) => 'href' in item)}
            <div class="nav-group">
              <div class="group-title">More</div>
              <div class="group-links">
                {#each navStructure as item ('title' in item ? item.title : item.href)}
                  {#if 'href' in item}
                    <a
                      href={item.href}
                      class="sub-nav-link {isActive(currentPath, item.href) ? 'active' : ''}"
                      aria-current={isActive(currentPath, item.href) ? 'page' : undefined}
                    >
                      {item.label}
                    </a>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <!-- Flat navigation -->
        <div class="sub-nav-links">
          {#each navStructure as link ('href' in link ? link.href : link.title)}
            {#if 'href' in link}
              <a
                href={link.href}
                class="sub-nav-link {isActive(currentPath, link.href) ? 'active' : ''}"
                aria-current={isActive(currentPath, link.href) ? 'page' : undefined}
              >
                {link.label}
              </a>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </nav>
{/if}

<style>
  /* Base sub-nav styles */
  .sub-nav {
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-primary);
    padding: var(--spacing-sm) 0;
    display: none;
    @media (max-width: 768px) {
      display: none;
    }
  }

  /* Flat navigation styles (existing) */
  .sub-nav-links {
    display: flex;
    gap: var(--spacing-md);
    overflow-x: auto;
    padding-bottom: var(--spacing-xs);
    scrollbar-width: thin;
    scrollbar-color: var(--border-primary) transparent;
  }

  .sub-nav-links::-webkit-scrollbar {
    height: 4px;
  }

  .sub-nav-links::-webkit-scrollbar-track {
    background: transparent;
  }

  .sub-nav-links::-webkit-scrollbar-thumb {
    background: var(--border-primary);
    border-radius: var(--radius-sm);
  }

  .sub-nav-links::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
  }

  .sub-nav-link {
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-decoration: none;
    transition: all var(--transition-fast);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .sub-nav-link:hover {
    color: var(--color-primary);
    background-color: var(--surface-hover);
  }

  .sub-nav-link.active {
    color: var(--color-primary);
    background-color: var(--surface-hover);
    font-weight: 500;
  }

  /* Mixed navigation styles */
  .mixed-nav {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-start;
    overflow-x: auto;
    padding-bottom: var(--spacing-xs);
    scrollbar-width: thin;
    scrollbar-color: var(--border-primary) transparent;
  }

  .mixed-nav::-webkit-scrollbar {
    height: 4px;
  }

  .mixed-nav::-webkit-scrollbar-track {
    background: transparent;
  }

  .mixed-nav::-webkit-scrollbar-thumb {
    background: var(--border-primary);
    border-radius: var(--radius-sm);
  }

  .mixed-nav::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
  }

  .nav-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex-shrink: 0;
  }

  .group-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--spacing-xs) var(--spacing-md);
    white-space: nowrap;
  }

  .group-links {
    display: flex;
    gap: var(--spacing-md);
    flex-shrink: 0;
  }

  /* Responsive styles */
  @media (max-width: 768px) {
    .sub-nav-links {
      gap: var(--spacing-sm);
    }

    .mixed-nav {
      gap: var(--spacing-sm);
    }

    .group-links {
      gap: var(--spacing-sm);
    }
  }
</style>
