<script lang="ts">
  import {
    ipv4ToIPv6,
    ipv6ToIPv4,
    validateIPv4,
    validateIPv6,
    getIPv6Info,
    expandIPv6,
    compressIPv6,
    type ConversionResult,
  } from '$lib/utils/ip-family-conversions.js';
  import IPInput from './IPInput.svelte';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import SvgIcon from '$lib/components/global/SvgIcon.svelte';
  import { useClipboard } from '$lib/composables';

  interface Props {
    direction: 'ipv4-to-ipv6' | 'ipv6-to-ipv4';
    title: string;
    description: string;
  }

  let { direction, title, description }: Props = $props();

  let inputValue = $state('');
  let conversionResult = $state<ConversionResult | null>(null);
  const clipboard = useClipboard();
  let ipv6Info = $state<Record<string, any> | null>(null);

  /**
   * Perform the conversion based on direction
   */
  function performConversion() {
    if (!inputValue.trim()) {
      conversionResult = null;
      ipv6Info = null;
      return;
    }

    if (direction === 'ipv4-to-ipv6') {
      conversionResult = ipv4ToIPv6(inputValue.trim());
    } else {
      conversionResult = ipv6ToIPv4(inputValue.trim());
      // Also get IPv6 info for analysis
      if (validateIPv6(inputValue.trim()).valid) {
        ipv6Info = getIPv6Info(inputValue.trim());
      }
    }
  }

  /**
   * Validate input based on direction
   */
  function getInputValidation() {
    if (!inputValue.trim()) {
      return { valid: true };
    }

    if (direction === 'ipv4-to-ipv6') {
      return validateIPv4(inputValue.trim());
    } else {
      return validateIPv6(inputValue.trim());
    }
  }

  /**
   * Copy text to clipboard with visual feedback
   */
  // React to input changes
  $effect(() => {
    performConversion();
  });

  const validation = $derived(getInputValidation());
  const isIPv4ToIPv6 = $derived(direction === 'ipv4-to-ipv6');
  const placeholder = $derived(isIPv4ToIPv6 ? '192.168.1.1' : '::ffff:192.168.1.1');
</script>

<div class="card">
  <header class="card-header">
    <h2>{title}</h2>
    <p>{description}</p>
  </header>

  <!-- Input Section -->
  <div class="form-group">
    <IPInput bind:value={inputValue} label={isIPv4ToIPv6 ? 'IPv4 Address' : 'IPv6 Address'} {placeholder} />
  </div>

  {#if validation.valid && conversionResult}
    <div class="results-section fade-in">
      {#if conversionResult.success}
        <!-- Successful Conversion -->
        <section class="info-panel success">
          <h3>Conversion Result</h3>

          <div class="result-display">
            <div class="result-item">
              <span class="result-label">{isIPv4ToIPv6 ? 'IPv6 Address' : 'IPv4 Address'}</span>
              <div class="result-value-container">
                <code class="result-value">{conversionResult.result}</code>
                <Tooltip
                  text={clipboard.isCopied('result') ? 'Copied!' : `Copy ${isIPv4ToIPv6 ? 'IPv6' : 'IPv4'} address`}
                  position="left"
                >
                  <button
                    type="button"
                    class="copy-btn {clipboard.isCopied('result') ? 'copied' : ''}"
                    onclick={() => clipboard.copy(conversionResult?.result || '', 'result')}
                    aria-label="Copy result to clipboard"
                  >
                    <SvgIcon icon={clipboard.isCopied('result') ? 'check' : 'clipboard'} size="sm" />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div class="result-item">
              <span class="result-label">Conversion Type</span>
              <span class="conversion-type">{conversionResult.type}</span>
            </div>
          </div>
        </section>

        <!-- Detailed Information -->
        {#if conversionResult.details}
          <section class="info-panel details">
            <h3>Detailed Information</h3>

            <div class="details-grid">
              {#if isIPv4ToIPv6}
                <!-- IPv4 to IPv6 Details -->
                <div class="detail-item">
                  <span class="detail-label">Compressed Format</span>
                  <div class="detail-value-container">
                    <code class="detail-value">{conversionResult.details.compressed}</code>
                    <Tooltip
                      text={clipboard.isCopied('compressed') ? 'Copied!' : 'Copy compressed format'}
                      position="left"
                    >
                      <button
                        type="button"
                        class="copy-btn-small {clipboard.isCopied('compressed') ? 'copied' : ''}"
                        onclick={() => clipboard.copy(conversionResult?.details?.compressed || '', 'compressed')}
                      >
                        <SvgIcon icon={clipboard.isCopied('compressed') ? 'check' : 'clipboard'} size="sm" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div class="detail-item">
                  <span class="detail-label">Expanded Format</span>
                  <div class="detail-value-container">
                    <code class="detail-value">{conversionResult.details.expanded}</code>
                    <Tooltip text={clipboard.isCopied('expanded') ? 'Copied!' : 'Copy expanded format'} position="left">
                      <button
                        type="button"
                        class="copy-btn-small {clipboard.isCopied('expanded') ? 'copied' : ''}"
                        onclick={() => clipboard.copy(conversionResult?.details?.expanded || '', 'expanded')}
                      >
                        <SvgIcon icon={clipboard.isCopied('expanded') ? 'check' : 'clipboard'} size="sm" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div class="detail-item">
                  <span class="detail-label">Dotted Notation</span>
                  <div class="detail-value-container">
                    <code class="detail-value">{conversionResult.details.dotted}</code>
                    <Tooltip text={clipboard.isCopied('dotted') ? 'Copied!' : 'Copy dotted notation'} position="left">
                      <button
                        type="button"
                        class="copy-btn-small {clipboard.isCopied('dotted') ? 'copied' : ''}"
                        onclick={() => clipboard.copy(conversionResult?.details?.dotted || '', 'dotted')}
                      >
                        <SvgIcon icon={clipboard.isCopied('dotted') ? 'check' : 'clipboard'} size="sm" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              {:else}
                <!-- IPv6 to IPv4 Details -->
                {#if conversionResult.details.hex1 && conversionResult.details.hex2}
                  <div class="detail-item">
                    <span class="detail-label">Hex Components</span>
                    <code class="detail-value">{conversionResult.details.hex1}:{conversionResult.details.hex2}</code>
                  </div>
                {/if}
              {/if}
            </div>

            <div class="description-box">
              <p>{conversionResult.details.description}</p>
            </div>
          </section>
        {/if}

        <!-- IPv6 Information (for IPv6 to IPv4 conversion) -->
        {#if !isIPv4ToIPv6 && ipv6Info}
          <section class="info-panel ipv6-info">
            <h3>IPv6 Address Information</h3>

            <div class="ipv6-analysis">
              <div class="analysis-item">
                <span class="analysis-label">Address Types</span>
                <div class="type-badges">
                  {#each ipv6Info.types as type (type)}
                    <span class="type-badge">{type}</span>
                  {/each}
                </div>
              </div>

              <div class="analysis-item">
                <span class="analysis-label">Expanded Format</span>
                <div class="detail-value-container">
                  <code class="detail-value">{expandIPv6(ipv6Info.cleaned)}</code>
                  <Tooltip
                    text={clipboard.isCopied('ipv6-expanded') ? 'Copied!' : 'Copy expanded IPv6'}
                    position="left"
                  >
                    <button
                      type="button"
                      class="copy-btn-small {clipboard.isCopied('ipv6-expanded') ? 'copied' : ''}"
                      onclick={() => clipboard.copy(expandIPv6(ipv6Info?.cleaned || ''), 'ipv6-expanded')}
                    >
                      <SvgIcon icon={clipboard.isCopied('ipv6-expanded') ? 'check' : 'clipboard'} size="sm" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              <div class="analysis-item">
                <span class="analysis-label">Compressed Format</span>
                <div class="detail-value-container">
                  <code class="detail-value">{compressIPv6(ipv6Info.cleaned)}</code>
                  <Tooltip
                    text={clipboard.isCopied('ipv6-compressed') ? 'Copied!' : 'Copy compressed IPv6'}
                    position="left"
                  >
                    <button
                      type="button"
                      class="copy-btn-small {clipboard.isCopied('ipv6-compressed') ? 'copied' : ''}"
                      onclick={() => clipboard.copy(compressIPv6(ipv6Info?.cleaned || ''), 'ipv6-compressed')}
                    >
                      <SvgIcon icon={clipboard.isCopied('ipv6-compressed') ? 'check' : 'clipboard'} size="sm" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div class="description-box">
              <p>{ipv6Info.description}</p>
            </div>
          </section>
        {/if}
      {:else}
        <!-- Conversion Error -->
        <section class="info-panel error">
          <h3>Conversion Failed</h3>
          <div class="error-content">
            <p class="error-message">{conversionResult.error}</p>

            {#if conversionResult.details?.suggestion}
              <div class="suggestion-box">
                <strong>Suggestion:</strong>
                {conversionResult.details.suggestion}
              </div>
            {/if}
          </div>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .results-section {
    margin-top: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .result-display {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .result-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .result-label {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .result-value-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .result-value {
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-success);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
  }

  .conversion-type {
    color: var(--color-info);
    font-weight: 600;
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .details-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .detail-label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .detail-value-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .detail-value {
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .copy-btn,
  .copy-btn-small {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .copy-btn {
    width: 2.5rem;
    height: 2.5rem;
  }

  .copy-btn-small {
    width: 1.75rem;
    height: 1.75rem;
  }

  .copy-btn:hover,
  .copy-btn-small:hover {
    background-color: var(--surface-hover);
    color: var(--text-primary);
    border-color: var(--color-primary);
  }

  .copy-btn.copied,
  .copy-btn-small.copied {
    background-color: var(--color-success);
    color: var(--bg-secondary);
    border-color: var(--color-success);
  }

  .description-box {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--color-info);
  }

  .description-box p {
    color: var(--text-primary);
    margin: 0;
    line-height: 1.5;
  }

  .error-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .error-message {
    color: var(--color-danger);
    font-weight: 500;
    margin: 0;
  }

  .suggestion-box {
    padding: var(--spacing-md);
    background-color: var(--color-warning);
    color: var(--text-on-warning);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  .ipv6-analysis {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .analysis-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .analysis-label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .type-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .type-badge {
    background-color: var(--color-info);
    color: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .result-value-container,
    .detail-value-container {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-xs);
    }

    .copy-btn,
    .copy-btn-small {
      align-self: center;
    }
  }
</style>
