<!-- src/routes/cidr/mask-converter/cidr-to-subnet-mask/+page.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import { CIDR_CTX, type CidrContext } from '$lib/contexts/cidr';

  const { cidr, mask } = getContext<CidrContext>(CIDR_CTX);
</script>

<div class="converter-section fade-in">
  <!-- CIDR Input -->
  <div class="form-group">
    <label for="cidr-slider" class="slider-label">
      CIDR Prefix Length: /{$cidr}
    </label>

    <div class="slider-container">
      <input
        id="cidr-slider"
        type="range"
        min="0"
        max="32"
        value={$cidr}
        on:input={(e) => cidr.set(Number((e.target as HTMLInputElement).value))}
        class="cidr-slider"
      />
      <div class="slider-markers">
        <span>0</span><span>8</span><span>16</span><span>24</span><span>32</span>
      </div>
    </div>
  </div>

  <!-- Result Display -->
  <div class="result-display info">
    <div class="result-content">
      <span class="result-label">Subnet Mask</span>
      <span class="result-value">{$mask}</span>
    </div>
  </div>
</div>

<style lang="scss">
  .converter-section {
    margin: var(--spacing-lg) 0;
    display: flex;
    width: 100%;
    gap: 2rem;
    align-items: center;
    flex-wrap: wrap;
    .form-group {
      flex: 1;
    }
    .result-display {
      min-width: 20rem;
    }
  }

  .slider-label {
    display: block;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
    cursor: help;
  }

  .slider-container {
    position: relative;

    .slider-markers {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      margin-top: var(--spacing-xs);
    }
  }

  .cidr-slider {
    width: 100%;
    height: 0.5rem;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    appearance: none;
    cursor: pointer;
    outline: none;
    &::-webkit-slider-thumb {
      appearance: none;
      height: 1.25rem;
      width: 1.25rem;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
      box-shadow: var(--shadow-md);
      transition: transform var(--transition-fast);
      &:hover {
        transform: scale(1.1);
      }
    }

    &::-moz-range-thumb {
      height: 1.25rem;
      width: 1.25rem;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
      border: none;
      box-shadow: var(--shadow-md);
      transition: transform var(--transition-fast);
      &:hover {
        transform: scale(1.1);
      }
    }
  }

  .result-display {
    padding: var(--spacing-md);
    border-radius: var(--radius-lg);
    margin-top: var(--spacing-md);
    &.info {
      background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
      border: 1px solid var(--color-info);
    }
    .result-content {
      text-align: center;
      .result-label {
        display: block;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin-bottom: var(--spacing-xs);
      }
      .result-value {
        display: block;
        font-size: var(--font-size-2xl);
        font-family: var(--font-mono);
        font-weight: 700;
        color: var(--text-primary);
      }
    }
  }
</style>
