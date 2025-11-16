<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { setOperationsContent } from '$lib/content/cidr-set-operations';
</script>

<slot />

<section class="reference">
  <h3>{setOperationsContent.title}</h3>
  <p>{setOperationsContent.description}</p>

  <div class="operations-grid">
    {#each setOperationsContent.operations as operation, index (index)}
      <div class="operation-card">
        <div class="operation-header">
          <div class="operation-symbol">{operation.symbol}</div>
          <div class="operation-name">{operation.name}</div>
        </div>
        <div class="operation-desc">{operation.description}</div>
        <div class="operation-example">
          <strong>Example:</strong> <code>{operation.example}</code>
        </div>
      </div>
    {/each}
  </div>

  <div class="patterns-section">
    <h4>Common Network Patterns</h4>
    <div class="patterns-grid">
      {#each setOperationsContent.patterns as pattern, index (index)}
        <div class="pattern-card">
          <h5><Icon name={pattern.icon} size="sm" /> {pattern.title}</h5>
          <ul>
            {#each pattern.items as item, index (index)}
              <li><strong>{item.term}:</strong> {item.description}</li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>

  <div class="notes-section">
    <h4>Implementation Notes</h4>
    <div class="notes-grid">
      {#each setOperationsContent.notes as note, index (index)}
        <div class="note-item">
          <h5>{note.title}</h5>
          <p>{note.content}</p>
        </div>
      {/each}
    </div>
  </div>

  <div class="best-practices info-panel info">
    <h4>Best Practices</h4>
    <ul>
      {#each setOperationsContent.bestPractices as practice, index (index)}
        <li><strong>{practice.term}:</strong> {practice.description}</li>
      {/each}
    </ul>
  </div>
</section>

<style lang="scss">
  .reference {
    margin-top: var(--spacing-xl);
    padding: var(--spacing-xl);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);

    h3 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    h4 {
      color: var(--text-primary);
      margin: var(--spacing-xl) 0 var(--spacing-md) 0;
      font-size: var(--font-size-md);
      font-weight: 600;
    }

    h5 {
      color: var(--color-primary);
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    > p {
      color: var(--text-secondary);
      margin-bottom: var(--spacing-lg);
      line-height: 1.6;
    }
  }

  .operations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }

  .operation-card {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);

    .operation-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-sm);

      .operation-symbol {
        font-size: var(--font-size-xl);
        font-weight: bold;
        color: var(--color-primary);
        width: 70px;
        text-align: center;
      }

      .operation-name {
        font-weight: 600;
        color: var(--text-primary);
        font-size: var(--font-size-md);
      }
    }

    .operation-desc {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: var(--spacing-sm);
    }

    .operation-example {
      padding: var(--spacing-sm);
      background-color: var(--bg-secondary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);

      strong {
        color: var(--color-primary);
      }

      code {
        font-family: var(--font-mono);
        background-color: var(--bg-secondary);
        padding: 1px var(--spacing-xs);
        border-radius: var(--radius-xs);
        font-size: var(--font-size-xs);
      }
    }
  }

  .patterns-section .patterns-grid,
  .notes-section .notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }

  .notes-section .notes-grid {
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  }

  .pattern-card,
  .note-item {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);

    h5 {
      margin-bottom: var(--spacing-sm);
    }
  }

  .note-item {
    p {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0;
    }
  }

  .pattern-card {
    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        margin-bottom: var(--spacing-xs);
        font-size: var(--font-size-sm);
        color: var(--text-secondary);

        strong {
          color: var(--color-primary);
        }
      }
    }
  }

  .pattern-card {
    border-left: 4px solid var(--color-info);
  }

  .best-practices {
    background-color: var(--bg-primary);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    h4 {
      color: var(--color-info);
      margin: 0 0 var(--spacing-sm) 0;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;

      li {
        margin-bottom: var(--spacing-xs);
        color: var(--text-primary);
        font-size: var(--font-size-sm);
        position: relative;
        padding-left: 1em;

        &::before {
          content: '•';
          color: var(--color-info);
          font-weight: bold;
          position: absolute;
          left: 0;
        }

        strong {
          color: var(--color-info);
        }
      }
    }
  }

  @media (max-width: 768px) {
    .operations-grid,
    .patterns-grid,
    .notes-grid {
      grid-template-columns: 1fr;
    }

    .operation-card .operation-header {
      flex-direction: column;
      text-align: center;
      gap: var(--spacing-sm);
    }
  }
</style>
