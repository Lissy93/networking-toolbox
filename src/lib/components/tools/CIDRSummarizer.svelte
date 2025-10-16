<script lang="ts">
  import { summarizeCIDRs, type SummarizationResult } from '$lib/utils/cidr-summarization-fixed.js';
  import { useClipboard } from '$lib/composables';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '$lib/components/global/Icon.svelte';
  import SvgIcon from '$lib/components/global/SvgIcon.svelte';

  let inputText = $state(`192.168.1.1
192.168.1.0/24
10.0.0.5-10.0.0.13
2001:db8::1
2001:db8::/64`);
  let mode = $state<'exact-merge' | 'minimal-cover'>('exact-merge');
  let result = $state<SummarizationResult | null>(null);
  const clipboard = useClipboard();
  let selectedExample = $state<string | null>(null);

  const modes = [
    {
      value: 'exact-merge' as const,
      label: 'Exact Merge',
      description: 'Merge overlapping ranges exactly without additional aggregation',
    },
    {
      value: 'minimal-cover' as const,
      label: 'Minimal Cover',
      description: 'Find the smallest set of CIDR blocks that covers all inputs',
    },
  ];

  const examples = [
    {
      label: 'Mixed IPv4/IPv6',
      content: `192.168.1.0/24
10.0.0.0/16
2001:db8::/32
::1`,
    },
    {
      label: 'Overlapping Ranges',
      content: `192.168.1.0-192.168.1.100
192.168.1.50-192.168.1.200
192.168.2.0/24`,
    },
    {
      label: 'Single IPs',
      content: `10.0.0.1
10.0.0.2
10.0.0.3
10.0.0.4`,
    },
    {
      label: 'Mode Comparison',
      content: `192.168.1.1
192.168.1.3
192.168.1.5
192.168.1.7
192.168.1.9-192.168.1.12`,
    },
    {
      label: 'Complex Mix',
      content: `172.16.0.0/12
192.168.1.1
192.168.1.5-192.168.1.10
10.0.0.0/8
2001:db8::/48
fe80::/10`,
    },
  ];

  /* Set example content */
  function setExample(content: string) {
    inputText = content;
    selectedExample = content;
    performSummarization();
  }

  /* Copy all results */
  function copyAllResults() {
    if (!result) return;

    const sections = [];
    if (result.ipv4.length > 0) {
      sections.push('IPv4:', ...result.ipv4);
    }
    if (result.ipv6.length > 0) {
      sections.push('IPv6:', ...result.ipv6);
    }

    clipboard.copy(sections.join('\n'), 'all-results');
  }

  /* Clear input */
  function clearInput() {
    inputText = '';
    result = null;
  }

  /* Perform summarization */
  function performSummarization() {
    if (!inputText.trim()) {
      result = null;
      return;
    }

    try {
      result = summarizeCIDRs(inputText, mode);
    } catch (error) {
      result = {
        ipv4: [],
        ipv6: [],
        stats: {
          originalIpv4Count: 0,
          originalIpv6Count: 0,
          summarizedIpv4Count: 0,
          summarizedIpv6Count: 0,
          totalAddressesCovered: '0',
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Reactive summarization
  $effect(() => {
    if (inputText.trim() || mode) {
      performSummarization();
    }
  });

  // Check if current input matches selected example
  $effect(() => {
    if (selectedExample && inputText.trim() !== selectedExample.trim()) {
      selectedExample = null;
    }
  });
</script>

<div class="card">
  <header class="card-header">
    <h2>CIDR Summarization Tool</h2>
    <p>
      Convert mixed IP addresses, CIDR blocks, and ranges into optimized CIDR prefixes with separate IPv4/IPv6 results.
    </p>
  </header>

  <!-- Mode Selection -->
  <div class="mode-section">
    <h3>Summarization Mode</h3>
    <div class="tabs">
      {#each modes as modeOption (modeOption.value)}
        <button
          type="button"
          class="tab"
          class:active={mode === modeOption.value}
          onclick={() => (mode = modeOption.value)}
        >
          {modeOption.label}
          <Tooltip text={modeOption.description} position="top">
            <Icon name="help" size="sm" />
          </Tooltip>
        </button>
      {/each}
    </div>
  </div>

  <!-- Input Section -->
  <div class="input-section">
    <h3>Input Data</h3>
    <div class="form-group">
      <label for="input-text">
        Enter IP addresses, CIDR blocks, or ranges (one per line)
        <Tooltip text="Supports: single IPs (192.168.1.1), CIDR blocks (10.0.0.0/8), ranges (172.16.0.1-172.16.0.100)">
          <Icon name="help" size="sm" />
        </Tooltip>
      </label>
      <div class="input-wrapper">
        <textarea
          id="input-text"
          bind:value={inputText}
          placeholder="192.168.1.0/24&#10;10.0.0.1-10.0.0.10&#10;2001:db8::/32"
          class="input-textarea"
          rows="8"
        ></textarea>

        <button type="button" class="btn btn-secondary btn-sm clear-btn" onclick={clearInput}>
          <Tooltip text="Clear input"><Icon name="trash" size="sm" /></Tooltip>
        </button>
      </div>
    </div>

    <!-- Examples -->
    <div class="examples-section">
      <h4>Quick Examples</h4>
      <div class="examples-grid">
        {#each examples as example (example.label)}
          <button
            type="button"
            class="example-btn"
            class:selected={selectedExample === example.content}
            onclick={() => setExample(example.content)}
          >
            {example.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Results Section -->
  {#if result}
    <div class="results-section">
      {#if result.errors.length > 0}
        <div class="info-panel error">
          <h3>Parsing Errors</h3>
          <ul class="error-list">
            {#each result.errors as error (error)}
              <li>{error}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if result.ipv4.length > 0 || result.ipv6.length > 0}
        <div class="summary-header">
          <h3>Summarization Results</h3>
          <Tooltip text="Copy all IPv4 and IPv6 results to clipboard">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              class:copied={clipboard.isCopied('all-results')}
              onclick={copyAllResults}
            >
              <SvgIcon icon={clipboard.isCopied('all-results') ? 'check' : 'clipboard'} size="md" />
              Copy All
            </button>
          </Tooltip>
        </div>

        <div class="results-grid">
          <!-- IPv4 Results -->
          {#if result.ipv4.length > 0}
            <div class="result-panel ipv4">
              <div class="panel-header">
                <h4>IPv4 CIDR Blocks ({result.ipv4.length})</h4>
                <Tooltip text="Copy all IPv4 CIDR blocks to clipboard">
                  <button
                    type="button"
                    class="btn btn-icon"
                    class:copied={clipboard.isCopied('ipv4')}
                    onclick={() => clipboard.copy((result?.ipv4 || []).join('\n'), 'ipv4')}
                  >
                    <SvgIcon icon={clipboard.isCopied('ipv4') ? 'check' : 'clipboard'} size="md" />
                  </button>
                </Tooltip>
              </div>
              <div class="cidr-list">
                {#each result.ipv4 as cidr (cidr)}
                  <div class="cidr-item">
                    <code class="cidr-block">{cidr}</code>
                    <Tooltip text="Copy this CIDR block to clipboard">
                      <button
                        type="button"
                        class="btn btn-icon btn-xs"
                        class:copied={clipboard.isCopied(cidr)}
                        onclick={() => clipboard.copy(cidr, cidr)}
                      >
                        <SvgIcon icon={clipboard.isCopied(cidr) ? 'check' : 'clipboard'} size="sm" />
                      </button>
                    </Tooltip>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- IPv6 Results -->
          {#if result.ipv6.length > 0}
            <div class="result-panel ipv6">
              <div class="panel-header">
                <h4>IPv6 CIDR Blocks ({result.ipv6.length})</h4>
                <Tooltip text="Copy all IPv6 CIDR blocks to clipboard">
                  <button
                    type="button"
                    class="btn btn-icon"
                    class:copied={clipboard.isCopied('ipv6')}
                    onclick={() => clipboard.copy((result?.ipv6 || []).join('\n'), 'ipv6')}
                  >
                    <SvgIcon icon={clipboard.isCopied('ipv6') ? 'check' : 'clipboard'} size="md" />
                  </button>
                </Tooltip>
              </div>
              <div class="cidr-list">
                {#each result.ipv6 as cidr (cidr)}
                  <div class="cidr-item">
                    <code class="cidr-block">{cidr}</code>
                    <Tooltip text="Copy this CIDR block to clipboard">
                      <button
                        type="button"
                        class="btn btn-icon btn-xs"
                        class:copied={clipboard.isCopied(cidr)}
                        onclick={() => clipboard.copy(cidr, cidr)}
                      >
                        <SvgIcon icon={clipboard.isCopied(cidr) ? 'check' : 'clipboard'} size="sm" />
                      </button>
                    </Tooltip>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Statistics -->
        <div class="stats-section">
          <h4>Summarization Statistics</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <Tooltip text="Number of individual IPv4 items in the original input">
                <span class="stat-label">Original IPv4 Items</span>
              </Tooltip>
              <span class="stat-value">{result.stats.originalIpv4Count}</span>
            </div>
            <div class="stat-card">
              <Tooltip text="Number of CIDR blocks after IPv4 summarization">
                <span class="stat-label">Summarized IPv4 Blocks</span>
              </Tooltip>
              <span class="stat-value">{result.stats.summarizedIpv4Count}</span>
            </div>
            <div class="stat-card">
              <Tooltip text="Number of individual IPv6 items in the original input">
                <span class="stat-label">Original IPv6 Items</span>
              </Tooltip>
              <span class="stat-value">{result.stats.originalIpv6Count}</span>
            </div>
            <div class="stat-card">
              <Tooltip text="Number of CIDR blocks after IPv6 summarization">
                <span class="stat-label">Summarized IPv6 Blocks</span>
              </Tooltip>
              <span class="stat-value">{result.stats.summarizedIpv6Count}</span>
            </div>
            <div class="stat-card">
              <Tooltip text="Total number of individual IP addresses covered by all summarized blocks">
                <span class="stat-label">Total Addresses Covered</span>
              </Tooltip>
              <span class="stat-value large">{result.stats.totalAddressesCovered}</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  /* ---------- Reusable tokens (no visual change) ---------- */
  %section-title {
    color: var(--color-primary);
    margin-bottom: var(--spacing-md);
  }

  %bg-surface {
    background-color: var(--bg-secondary);
  }

  %tooltip-fade {
    opacity: 0.7;
    transition: opacity var(--transition-fast);
  }

  /* ---------- Mode selection ---------- */
  .mode-section {
    margin-bottom: var(--spacing-lg);
    h3 {
      @extend %section-title;
    }
    .tabs {
      .tab {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        :global(.tooltip-trigger) {
          @extend %tooltip-fade;
        }
      }
    }
  }

  /* ---------- Input section ---------- */
  .input-section {
    margin-bottom: var(--spacing-lg);
    h3,
    h4 {
      @extend %section-title;
    }
    .input-wrapper {
      position: relative;
      .clear-btn {
        position: absolute;
        top: var(--spacing-sm);
        right: var(--spacing-sm);
      }
    }
    .input-textarea {
      width: 100%;
      min-height: 200px;
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      resize: vertical;
      padding-right: 4rem;
    }
  }

  /* ---------- Examples ---------- */
  .examples-section {
    margin-top: var(--spacing-md);
    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--spacing-sm);
    }
    .example-btn {
      padding: var(--spacing-sm);
      background-color: var(--bg-tertiary);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      transition: all var(--transition-fast);
      position: relative;

      &:hover {
        background-color: var(--surface-hover);
        border-color: var(--color-primary);
        transform: translateY(-1px);
      }

      &.selected {
        background-color: color-mix(in srgb, var(--color-primary), transparent 90%);
        border-color: var(--color-primary);
        border-width: 2px;
        color: var(--color-primary);
        font-weight: 600;

        &::after {
          content: '';
          position: absolute;
          top: var(--spacing-xs);
          right: var(--spacing-xs);
          width: 8px;
          height: 8px;
          background-color: var(--color-primary);
          border-radius: 50%;
        }
      }
    }
  }

  /* ---------- Results top-level ---------- */
  .results-section {
    border-top: 2px solid var(--border-secondary);
    padding-top: var(--spacing-lg);
  }

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    h3 {
      color: var(--color-primary);
      margin: 0;
    }
  }
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  /* ---------- Result panels (IPv4 / IPv6) ---------- */
  .result-panel {
    @extend %bg-surface;
    border-radius: var(--radius-lg);
    overflow: hidden;
    &.ipv4 {
      border: 2px solid var(--color-info);
    }
    &.ipv6 {
      border: 2px solid var(--color-success);
    }
    .panel-header {
      padding: var(--spacing-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      h4 {
        margin: 0;
        color: var(--bg-secondary);
        font-size: var(--font-size-md);
      }
    }
    &.ipv4 .panel-header {
      background: linear-gradient(135deg, var(--color-info), var(--color-info-light));
    }
    &.ipv6 .panel-header {
      background: linear-gradient(135deg, var(--color-success), var(--color-success-light));
    }
  }

  .cidr-list {
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .cidr-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
  }

  .cidr-block {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  /* ---------- Stats ---------- */
  .stats-section {
    h4 {
      @extend %section-title;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .stat-card {
    @extend %bg-surface;
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    justify-content: space-between;
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-primary);
    &.large {
      font-size: var(--font-size-xl);
    }
  }

  /* ---------- Errors ---------- */
  .error-list {
    margin: var(--spacing-sm) 0;
    padding-left: var(--spacing-md);
    li {
      color: var(--color-error);
      margin-bottom: var(--spacing-xs);
    }
  }

  /* ---------- Labels & tooltips ---------- */
  label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    :global(.tooltip-trigger) {
      color: var(--text-secondary);
      @extend %tooltip-fade;
    }
  }

  /* ---------- Buttons (local tweaks) ---------- */
  .btn {
    &.copied {
      color: var(--color-success);
      background-color: color-mix(in srgb, var(--color-success), transparent 90%);
      border-color: var(--color-success);
      transform: scale(1.05);

      :global(.icon) {
        animation: success-pulse 0.3s ease-out;
      }
    }

    :global(.icon) {
      width: 1rem;
      height: 1rem;
      transition: transform var(--transition-fast);
    }

    &.btn-xs :global(.icon) {
      width: 0.75rem;
      height: 0.75rem;
    }

    &:hover:not(.copied) :global(.icon) {
      transform: scale(1.1);
    }
  }

  @keyframes success-pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }

  @media (max-width: 768px) {
    .results-grid {
      grid-template-columns: 1fr;
    }
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .examples-grid {
      grid-template-columns: 1fr;
    }
    .summary-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }
  }
</style>
