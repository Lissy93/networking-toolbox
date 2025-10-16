<script lang="ts">
  import Icon from '$lib/components/global/Icon.svelte';
  import { tooltip } from '$lib/actions/tooltip';

  interface TXTChunk {
    chunk: string;
    length: number;
    escaped: string;
    escapedLength: number;
  }

  interface ValidationResult {
    isValid: boolean;
    message: string;
    type: 'error' | 'warning' | 'success';
  }

  let rawText = $state('');
  let maxChunkLength = $state(255);
  let escapeQuotes = $state(true);
  let escapeBackslashes = $state(true);
  let preserveSpaces = $state(true);
  let showExamples = $state(false);
  let selectedExample = $state<string | null>(null);

  const chunks = $derived.by(() => {
    if (!rawText.trim()) return [];

    const text = rawText.trim();
    const chunkList: TXTChunk[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      let chunkSize = Math.min(remaining.length, maxChunkLength);
      let chunk = remaining.substring(0, chunkSize);

      // Escape the chunk
      let escaped = chunk;
      if (escapeBackslashes) {
        escaped = escaped.replace(/\\/g, '\\\\');
      }
      if (escapeQuotes) {
        escaped = escaped.replace(/"/g, '\\"');
      }
      if (!preserveSpaces) {
        escaped = escaped.replace(/\s+/g, ' ');
      }

      // If escaped version is too long, reduce chunk size
      while (escaped.length > maxChunkLength && chunkSize > 1) {
        chunkSize--;
        chunk = remaining.substring(0, chunkSize);
        escaped = chunk;
        if (escapeBackslashes) {
          escaped = escaped.replace(/\\/g, '\\\\');
        }
        if (escapeQuotes) {
          escaped = escaped.replace(/"/g, '\\"');
        }
        if (!preserveSpaces) {
          escaped = escaped.replace(/\s+/g, ' ');
        }
      }

      chunkList.push({
        chunk,
        length: chunk.length,
        escaped,
        escapedLength: escaped.length,
      });

      remaining = remaining.substring(chunkSize);
    }

    return chunkList;
  });

  const validation = $derived.by((): ValidationResult => {
    if (!rawText.trim()) {
      return {
        isValid: false,
        message: 'Please enter text to escape',
        type: 'error',
      };
    }

    if (maxChunkLength < 1 || maxChunkLength > 255) {
      return {
        isValid: false,
        message: 'Chunk length must be between 1 and 255 characters',
        type: 'error',
      };
    }

    const oversizedChunks = chunks.filter((chunk) => chunk.escapedLength > maxChunkLength);
    if (oversizedChunks.length > 0) {
      return {
        isValid: false,
        message: `${oversizedChunks.length} chunk(s) exceed the maximum length after escaping`,
        type: 'error',
      };
    }

    if (chunks.length > 10) {
      return {
        isValid: true,
        message: `Text split into ${chunks.length} chunks (consider splitting across multiple TXT records)`,
        type: 'warning',
      };
    }

    return {
      isValid: true,
      message: `Text successfully split into ${chunks.length} chunk(s)`,
      type: 'success',
    };
  });

  const totalLength = $derived(chunks.reduce((sum, chunk) => sum + chunk.escapedLength, 0));
  const dnsRecord = $derived(chunks.map((chunk) => `"${chunk.escaped}"`).join(' '));
  const zoneFileFormat = $derived(() => {
    if (chunks.length === 0) return '';
    if (chunks.length === 1) return `example.com. IN TXT "${chunks[0].escaped}"`;
    return `example.com. IN TXT (\n${chunks.map((chunk) => `    "${chunk.escaped}"`).join('\n')}\n)`;
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function exportAsZoneFile() {
    if (!zoneFileFormat()) return;
    const blob = new Blob([zoneFileFormat()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'txt-record.zone';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function loadExample(text: string) {
    rawText = text;
    selectedExample = text;
    showExamples = false;
  }

  const exampleTexts = [
    {
      name: 'SPF Record',
      description: 'Sender Policy Framework record for email authentication',
      value: 'v=spf1 include:_spf.google.com include:mailgun.org include:servers.mcsv.net ~all',
    },
    {
      name: 'DKIM Key',
      description: 'DomainKeys Identified Mail public key record',
      value:
        'k=rsa; t=s; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDGGYGqwVF6+nQKQ5R7fPqqJLmPjGYGqwVF6+nQKQ5R7fPqqJLmPjGYGqwVF6+nQKQ5R7fPqqJLmPjGYGqwVF6+nQKQ5R7fPqqJLmPjGYGqwVF6+nQKQ5R7fPqqJLmPjGYGqwVF6+nQKQ5R7fPqqJLmPjGYGqwVF6',
    },
    {
      name: 'Domain Verification',
      description: 'Google domain ownership verification token',
      value: 'google-site-verification=rXOxyZounnZasA8Z7oaD3c14JdjS9aKSWvsR1EbUSIQ',
    },
    {
      name: 'Long Text Sample',
      description: 'Text that will need to be split into multiple chunks',
      value:
        'This is a very long text string that will definitely exceed the 255 character limit for DNS TXT records and will need to be properly escaped and split into multiple chunks. The escaping tool should handle this automatically and show you exactly how many chunks are created and what the final DNS record format will look like when you publish it to your DNS provider.',
    },
  ];
</script>

<div class="card">
  <div class="card-header">
    <h1>TXT Record Escape Tool</h1>
    <p class="card-subtitle">
      Safely escape and split TXT record strings into DNS-compatible chunks (≤255 characters each).
    </p>
  </div>

  <div class="grid-layout">
    <div class="input-section">
      <div class="text-input-config">
        <div class="input-group">
          <label for="rawText" use:tooltip={'The original text that will be escaped and split into chunks'}>
            <Icon name="edit" size="sm" />
            Text to Escape
          </label>
          <textarea id="rawText" bind:value={rawText} placeholder="Enter your raw text here..." rows="6"></textarea>
        </div>

        <div class="config-row">
          <div class="input-group">
            <label
              for="maxChunkLength"
              use:tooltip={'Maximum length for each chunk (DNS TXT record limit is 255 characters)'}
            >
              <Icon name="ruler" size="sm" />
              Max Chunk Length
            </label>
            <input id="maxChunkLength" type="number" bind:value={maxChunkLength} min="1" max="255" />
          </div>

          <div class="escape-options">
            <h4 use:tooltip={'Configure how the text should be escaped for DNS compatibility'}>
              <Icon name="settings" size="sm" />
              Escape Options
            </h4>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={escapeQuotes} />
                <span>Escape Quotes (")</span>
                <span use:tooltip={'Escape double quote characters as \\"'}><Icon name="help" size="sm" /></span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={escapeBackslashes} />
                <span>Escape Backslashes (\\)</span>
                <span use:tooltip={'Escape backslash characters as \\\\'}><Icon name="help" size="sm" /></span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={preserveSpaces} />
                <span>Preserve Spacing</span>
                <span use:tooltip={'Keep original whitespace formatting instead of normalizing spaces'}
                  ><Icon name="help" size="sm" /></span
                >
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="validation-section">
        <div class="validation-status {validation.type}">
          <Icon
            name={validation.type === 'error' ? 'error' : validation.type === 'warning' ? 'warning' : 'check-circle'}
            size="sm"
          />
          {validation.message}
        </div>
      </div>
    </div>

    <div class="results-section">
      {#if chunks.length > 0}
        <div class="chunks-section">
          <div class="section-header">
            <h3>Escaped Chunks ({chunks.length})</h3>
            <div class="stats">
              <span class="stat" use:tooltip={'Total length after escaping'}>
                {totalLength} chars
              </span>
            </div>
          </div>

          <div class="chunks-list">
            {#each chunks as chunk, index (index)}
              <div class="chunk-item">
                <div class="chunk-header">
                  <span class="chunk-number">Chunk {index + 1}</span>
                  <span class="chunk-length">{chunk.escapedLength}/{maxChunkLength}</span>
                </div>
                <div class="chunk-content">
                  <code>"{chunk.escaped}"</code>
                  <button
                    type="button"
                    class="copy-btn"
                    onclick={() => copyToClipboard(`"${chunk.escaped}"`)}
                    use:tooltip={'Copy this chunk to clipboard'}
                  >
                    <Icon name="copy" size="sm" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="output-section">
          <div class="section-header">
            <h3>DNS Record Format</h3>
            <div class="actions">
              <button
                type="button"
                class="copy-btn"
                onclick={() => copyToClipboard(dnsRecord)}
                use:tooltip={'Copy single-line DNS record format'}
              >
                <Icon name="copy" size="sm" />
                Copy
              </button>
              <button type="button" class="export-btn" onclick={exportAsZoneFile} use:tooltip={'Download as zone file'}>
                <Icon name="download" size="sm" />
                Export
              </button>
            </div>
          </div>

          <div class="output-formats">
            <div class="format-section">
              <h4>Single Line Format:</h4>
              <div class="code-block">
                <code>{dnsRecord}</code>
              </div>
            </div>

            <div class="format-section">
              <h4>Zone File Format:</h4>
              <div class="code-block">
                <pre><code>{zoneFileFormat()}</code></pre>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="examples-section">
    <details class="examples-toggle" bind:open={showExamples}>
      <summary>
        <Icon name="lightbulb" size="sm" />
        Example Texts
      </summary>
      <div class="examples-grid">
        {#each exampleTexts as example (example.name)}
          <button
            type="button"
            class="example-card"
            class:selected={selectedExample === example.value}
            onclick={() => loadExample(example.value)}
          >
            <div class="example-header">
              <strong>{example.name}</strong>
            </div>
            <p class="example-description">{example.description}</p>
            <div class="example-preview">
              {example.value.substring(0, 80)}{example.value.length > 80 ? '...' : ''}
            </div>
          </button>
        {/each}
      </div>
    </details>
  </div>
</div>

<style lang="scss">
  .text-input-config {
    margin-bottom: var(--spacing-lg);

    textarea,
    input[type='number'] {
      background: var(--bg-primary);
    }
  }

  .config-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .escape-options {
    h4 {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin: 0 0 var(--spacing-sm) 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: baseline;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    font-size: var(--font-size-sm);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--color-surface-variant);
      color: var(--color-primary);
    }

    input[type='checkbox'] {
      margin: 0;
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
    }

    span:first-of-type {
      flex: 1;
      margin-left: var(--spacing-xs);
    }

    span:last-child {
      margin-left: auto;
    }
  }

  .validation-section {
    margin: var(--spacing-md) 0;
  }

  .validation-status {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);

    &.success {
      background: color-mix(in srgb, var(--color-success), transparent 95%);
      color: var(--color-success);
      border: 1px solid var(--color-success);
    }

    &.warning {
      color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning), transparent 95%);
      border: 1px solid var(--color-warning);
    }

    &.error {
      color: var(--color-error);
      background: color-mix(in srgb, var(--color-error), transparent 95%);
      border: 1px solid var(--color-error);
    }
  }

  .chunks-section,
  .output-section {
    margin-bottom: var(--spacing-lg);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    h3 {
      margin: 0;
      color: var(--color-text);
    }

    .stats {
      display: flex;
      gap: var(--spacing-sm);
    }

    .stat {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      font-family: var(--font-mono);
    }

    .actions {
      display: flex;
      gap: var(--spacing-sm);
    }
  }

  .chunks-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-height: 400px;
    overflow-y: auto;
  }

  .chunk-item {
    background: var(--bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
  }

  .chunk-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
    font-size: var(--font-size-sm);
  }

  .chunk-number {
    font-weight: 600;
    color: var(--color-primary);
  }

  .chunk-length {
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
  }

  .chunk-content {
    position: relative;

    code {
      display: block;
      padding: var(--spacing-xs);
      background: var(--color-surface-variant);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      word-break: break-all;
      white-space: pre-wrap;
      margin-bottom: var(--spacing-xs);
    }

    .copy-btn {
      color: var(--bg-secondary);
      position: absolute;
      top: var(--spacing-xs);
      right: var(--spacing-xs);
    }
  }

  .output-formats {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .format-section {
    h4 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  }

  .code-block {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);

    code,
    pre {
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      margin: 0;
      word-break: break-all;
      white-space: pre-wrap;
    }
  }

  .examples-section {
    margin-top: var(--spacing-lg);
  }

  .examples-toggle {
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    summary {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      cursor: pointer;
      border: 1px solid var(--color-border);
      &:hover {
        background: var(--color-surface-variant);
      }
    }
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .example-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    background: var(--color-surface);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;

    &:hover {
      background: var(--color-surface-variant);
      border-color: var(--color-primary);
    }

    &.selected {
      border-color: var(--color-primary);
      background: var(--color-primary-bg);
    }

    .example-header {
      width: 100%;
      strong {
        color: var(--color-primary);
        font-size: var(--font-size-sm);
      }
    }

    .example-description {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      width: 100%;
    }

    .example-preview {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      font-family: var(--font-mono);
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .copy-btn,
  .export-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-primary);
    color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  .export-btn {
    background: var(--color-success);

    &:hover {
      background: var(--color-success-hover);
    }
  }
</style>
