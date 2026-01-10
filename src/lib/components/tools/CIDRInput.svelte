<script lang="ts">
  import { validateCIDR } from '$lib/utils/ip-validation.js';
  import type { ValidationResult } from '$lib/types/ip.js';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import SvgIcon from '$lib/components/global/SvgIcon.svelte';

  interface Props {
    value?: string;
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    class?: string;
  }

  let {
    value = $bindable(''),
    placeholder = '192.168.1.0/24',
    label = 'CIDR Notation',
    required = false,
    disabled = false,
    class: className = '',
  }: Props = $props();

  let validation: ValidationResult = $state({ valid: true });
  let focused = $state(false);

  /**
   * Quick CIDR presets
   */
  const cidrPresets = [
    { cidr: 8, label: '/8', hosts: '16M hosts' },
    { cidr: 16, label: '/16', hosts: '65K hosts' },
    { cidr: 24, label: '/24', hosts: '254 hosts' },
    { cidr: 25, label: '/25', hosts: '126 hosts' },
    { cidr: 26, label: '/26', hosts: '62 hosts' },
    { cidr: 27, label: '/27', hosts: '30 hosts' },
    { cidr: 28, label: '/28', hosts: '14 hosts' },
    { cidr: 30, label: '/30 (P2P)', hosts: '2 hosts' },
  ];

  /**
   * Check if current value matches a preset
   */
  function getActivePreset(): number | null {
    if (!value || !value.includes('/')) return null;
    const currentCidr = parseInt(value.split('/')[1], 10);
    return cidrPresets.find((p) => p.cidr === currentCidr)?.cidr || null;
  }

  // Derive active preset from current value
  const activePreset = $derived(getActivePreset());

  /**
   * Validates CIDR input on change
   */
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    validation = validateCIDR(value);
  }

  /**
   * Applies CIDR preset
   */
  function applyPreset(cidr: number) {
    if (value && value.includes('/')) {
      const ip = value.split('/')[0];
      value = `${ip}/${cidr}`;
    } else if (value) {
      value = `${value}/${cidr}`;
    }
    validation = validateCIDR(value);
  }
</script>

<div class="form-field {className}">
  {#if label}
    <label for="cidr-input">
      {label}
      {#if required}<span class="required">*</span>{/if}
    </label>
  {/if}

  <div class="field-input">
    <input
      id="cidr-input"
      type="text"
      {value}
      {placeholder}
      {required}
      {disabled}
      class="input-cidr"
      class:valid={validation.valid && value}
      class:invalid={!validation.valid && value}
      class:focused
      oninput={handleInput}
      onfocus={() => (focused = true)}
      onblur={() => (focused = false)}
    />

    <!-- Validation indicator -->
    <div class="field-icon">
      {#if value && validation.valid}
        <div class="status-icon success">
          <SvgIcon icon="check" size="sm" />
        </div>
      {:else if value && !validation.valid}
        <div class="status-icon error">
          <SvgIcon icon="close" size="sm" />
        </div>
      {/if}
    </div>
  </div>

  <!-- Error message -->
  {#if !validation.valid && validation.error}
    <p class="field-error fade-in">
      {validation.error}
    </p>
  {/if}

  <!-- CIDR presets -->
  <div class="presets-section">
    <p class="presets-label">Quick presets:</p>
    <div class="presets-grid">
      {#each cidrPresets as preset (preset.cidr)}
        <Tooltip text="Apply {preset.label} - {preset.hosts}" position="top">
          <button
            type="button"
            class="preset-btn {activePreset === preset.cidr ? 'active' : ''}"
            {disabled}
            onclick={() => applyPreset(preset.cidr)}
            aria-label="Apply {preset.label} preset with {preset.hosts}"
          >
            {preset.label}
          </button>
        </Tooltip>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .form-field {
    min-width: 300px;

    @media (max-width: 768px) {
      min-width: auto;
    }
  }

  .input-cidr {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    padding-right: 2.5rem;
    flex: 1;

    &.valid {
      border-color: var(--color-success);
    }

    &.invalid {
      border-color: var(--color-error);
    }

    &.focused {
      box-shadow: var(--shadow-md);
    }
  }

  .presets-section {
    margin-top: var(--spacing-md);

    .presets-label {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      margin-bottom: var(--spacing-sm);
    }

    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
    }

    .preset-btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-xs);
      border-radius: var(--radius-sm);
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-secondary);
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background-color: var(--surface-hover);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.active {
        border-color: var(--color-primary);
        background-color: var(--surface-hover);
        color: var(--color-primary);
      }
    }
  }
</style>
