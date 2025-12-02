<!-- src/routes/cidr/mask-converter/subnet-mask-to-cidr/+page.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import { derived } from 'svelte/store';
  import { CIDR_CTX, type CidrContext } from '$lib/contexts/cidr';
  import { validateSubnetMask } from '$lib/utils/ip-validation.js';

  const { cidr, mask, handleMaskChange } = getContext<CidrContext>(CIDR_CTX);

  // Track validation state reactively
  const isValid = derived(mask, ($mask) => validateSubnetMask($mask).valid);
</script>

<div class="converter-section fade-in">
  <!-- Mask Input -->
  <div class="form-group">
    <label for="mask-input">Subnet Mask</label>
    <input
      id="mask-input"
      type="text"
      value={$mask}
      placeholder="255.255.255.0"
      class="mask-input {$isValid ? '' : 'invalid'}"
      on:input={(e) => handleMaskChange((e.target as HTMLInputElement).value)}
    />
  </div>

  <!-- Result Display -->
  <div class="result-display success">
    <div class="result-content">
      <span class="result-label">CIDR Notation</span>
      <span class="result-value">/{$cidr}</span>
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
  .mask-input {
    min-width: 16rem;
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);

    &.invalid {
      border-color: var(--color-error);
      box-shadow: 0 0 0 1px var(--color-error);
    }
  }
  .result-display {
    padding: var(--spacing-md);
    border-radius: var(--radius-lg);
    margin-top: var(--spacing-md);
    &.success {
      background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
      border: 1px solid var(--color-success);
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
