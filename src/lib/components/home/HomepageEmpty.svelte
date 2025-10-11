<script lang="ts">
  import { site } from '$lib/constants/site';
</script>

<div class="empty-layout">
  <h1>{site.title}</h1>
  <div class="search-hint">
    <kbd>⌘</kbd>
    <kbd>K</kbd>
    <span>to search</span>
  </div>
</div>

<style lang="scss">
  .empty-layout {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48vh;
    animation: slideDown 0.6s ease-out;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  h1 {
    opacity: 0.2;
    font-size: clamp(2rem, 5vw, 3rem);
  }

  .search-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    opacity: 0;
    animation: fadeIn 0.8s ease-out 0.2s forwards;

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      height: 2rem;
      padding: 0 var(--spacing-sm);
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--text-primary);
      box-shadow: 0 2px 0 0 var(--border-secondary);
    }

    span {
      font-weight: 400;
    }
  }

  @keyframes slideDown {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
