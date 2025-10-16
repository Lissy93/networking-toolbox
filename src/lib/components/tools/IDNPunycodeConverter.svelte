<script lang="ts">
  import { Copy, Download, Check, Globe, Type } from 'lucide-svelte';
  import { tooltip } from '$lib/actions/tooltip.js';
  import { useClipboard } from '$lib/composables';

  let inputText = $state('');
  let mode = $state('unicode-to-punycode');
  let showExamples = $state(false);

  const clipboard = useClipboard();

  const domainExamples = [
    { unicode: 'münchen.de', punycode: 'xn--mnchen-3ya.de', description: 'German city domain' },
    { unicode: '日本.jp', punycode: 'xn--wgbl6a.jp', description: 'Japanese domain' },
    { unicode: 'россия.рф', punycode: 'xn--h1alffa9f.xn--p1ai', description: 'Russian domain' },
    { unicode: 'العربية.net', punycode: 'xn--mgbah1a3hjkrd.net', description: 'Arabic domain' },
    { unicode: '한국.kr', punycode: 'xn--3e0b707e.kr', description: 'Korean domain' },
    { unicode: 'ελληνικά.gr', punycode: 'xn--hxajbheg2az3al.gr', description: 'Greek domain' },
  ];

  // Punycode implementation based on RFC 3492
  function punycodeDecode(input: string) {
    const BASE = 36;
    const TMIN = 1;
    const TMAX = 26;
    const SKEW = 38;
    const DAMP = 700;
    const INITIAL_BIAS = 72;
    const INITIAL_N = 128;

    function adapt(delta: number, numPoints: number, firstTime: boolean) {
      delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
      delta += Math.floor(delta / numPoints);
      let k = 0;
      while (delta > ((BASE - TMIN) * TMAX) >> 1) {
        delta = Math.floor(delta / (BASE - TMIN));
        k += BASE;
      }
      return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
    }

    function decode(input: string) {
      let n = INITIAL_N;
      let i = 0;
      let bias = INITIAL_BIAS;
      const output = [];

      let basic = input.lastIndexOf('-');
      if (basic < 0) basic = 0;

      for (let j = 0; j < basic; ++j) {
        const cp = input.charCodeAt(j);
        if (cp >= 128) throw new Error('Not-basic');
        output.push(cp);
      }

      for (let index = basic > 0 ? basic + 1 : 0; index < input.length; ) {
        const oldi = i;
        let w = 1;
        for (let k = BASE; ; k += BASE) {
          if (index >= input.length) throw new Error('Invalid');
          const digit = basicToDigit(input.charCodeAt(index++));
          if (digit >= BASE) throw new Error('Invalid');
          if (digit > Math.floor((0x7fffffff - i) / w)) throw new Error('Overflow');
          i += digit * w;
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (digit < t) break;
          if (w > Math.floor(0x7fffffff / (BASE - t))) throw new Error('Overflow');
          w *= BASE - t;
        }

        const out = output.length + 1;
        bias = adapt(i - oldi, out, oldi === 0);
        if (Math.floor(i / out) > 0x7fffffff - n) throw new Error('Overflow');
        n += Math.floor(i / out);
        i %= out;

        output.splice(i++, 0, n);
      }

      return String.fromCodePoint(...output);
    }

    function basicToDigit(codePoint: number) {
      if (codePoint - 48 < 10) return codePoint - 22;
      if (codePoint - 65 < 26) return codePoint - 65;
      if (codePoint - 97 < 26) return codePoint - 97;
      return BASE;
    }

    return decode(input);
  }

  function punycodeEncode(input: string) {
    const BASE = 36;
    const TMIN = 1;
    const TMAX = 26;
    const SKEW = 38;
    const DAMP = 700;
    const INITIAL_BIAS = 72;
    const INITIAL_N = 128;

    function adapt(delta: number, numPoints: number, firstTime: boolean) {
      delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
      delta += Math.floor(delta / numPoints);
      let k = 0;
      while (delta > ((BASE - TMIN) * TMAX) >> 1) {
        delta = Math.floor(delta / (BASE - TMIN));
        k += BASE;
      }
      return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
    }

    function digitToBasic(digit: number) {
      return digit + 22 + (digit < 26 ? 75 : 0);
    }

    function encode(input: string) {
      const codePoints = Array.from(input).map((char) => char.codePointAt(0) || 0);
      let n = INITIAL_N;
      let delta = 0;
      let bias = INITIAL_BIAS;

      const basic = codePoints.filter((cp) => cp < 128);
      const output = basic.map((cp) => String.fromCodePoint(cp));

      let h = basic.length;
      const b = h;

      if (b > 0) output.push('-');

      while (h < codePoints.length) {
        let m = 0x7fffffff;
        for (const cp of codePoints) {
          if (cp >= n && cp < m) m = cp;
        }

        if (m - n > Math.floor((0x7fffffff - delta) / (h + 1))) throw new Error('Overflow');
        delta += (m - n) * (h + 1);
        n = m;

        for (const cp of codePoints) {
          if (cp < n && ++delta === 0) throw new Error('Overflow');
          if (cp === n) {
            let q = delta;
            for (let k = BASE; ; k += BASE) {
              const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
              if (q < t) break;
              output.push(String.fromCodePoint(digitToBasic(t + ((q - t) % (BASE - t)))));
              q = Math.floor((q - t) / (BASE - t));
            }
            output.push(String.fromCodePoint(digitToBasic(q)));
            bias = adapt(delta, h + 1, h === b);
            delta = 0;
            ++h;
          }
        }

        ++delta;
        ++n;
      }

      return output.join('');
    }

    return encode(input);
  }

  function convertDomain(domain: string, toPunycode: boolean) {
    const parts = domain.split('.');
    return parts
      .map((part: string) => {
        if (!part) return part;

        try {
          if (toPunycode) {
            // Check if part contains non-ASCII characters
            if (!/^[\x20-\x7F]*$/.test(part)) {
              const encoded = punycodeEncode(part);
              return `xn--${encoded}`;
            }
            return part;
          } else {
            // Decode punycode
            if (part.startsWith('xn--')) {
              return punycodeDecode(part.substring(4));
            }
            return part;
          }
        } catch {
          return part; // Return original if conversion fails
        }
      })
      .join('.');
  }

  let result = $derived.by(() => {
    if (!inputText.trim()) return '';

    try {
      if (mode === 'unicode-to-punycode') {
        return convertDomain(inputText.trim(), true);
      } else {
        return convertDomain(inputText.trim(), false);
      }
    } catch {
      return 'Error: Invalid input';
    }
  });

  let isValid = $derived.by(() => {
    return inputText.trim() !== '' && result !== '' && !result.startsWith('Error:');
  });

  let warnings = $derived.by(() => {
    const warns = [];

    if (mode === 'unicode-to-punycode') {
      if (inputText && !/[\u0080-\uFFFF]/.test(inputText)) {
        warns.push('Input contains only ASCII characters - no conversion needed');
      }
    } else {
      if (inputText && !inputText.includes('xn--')) {
        warns.push('Input does not contain punycode domains (xn-- prefix)');
      }
    }

    if (inputText.length > 253) {
      warns.push('Domain name exceeds maximum length of 253 characters');
    }

    return warns;
  });

  function copyToClipboard() {
    clipboard.copy(result, 'copy');
  }

  function downloadResult() {
    const content = `Input: ${inputText}\nOutput: ${result}\n\nConversion: ${mode === 'unicode-to-punycode' ? 'Unicode → Punycode' : 'Punycode → Unicode'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idn-conversion.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clipboard.copy('downloaded', 'download');
  }

  function loadExample(example: (typeof domainExamples)[0]) {
    if (mode === 'unicode-to-punycode') {
      inputText = example.unicode;
    } else {
      inputText = example.punycode;
    }
  }

  function swapModeAndContent() {
    if (isValid) {
      const _temp = inputText;
      inputText = result;
      mode = mode === 'unicode-to-punycode' ? 'punycode-to-unicode' : 'unicode-to-punycode';
    } else {
      mode = mode === 'unicode-to-punycode' ? 'punycode-to-unicode' : 'unicode-to-punycode';
    }
  }
</script>

<div class="idn-converter">
  <div class="card">
    <div class="card-header">
      <h1>IDN Punycode Converter</h1>
      <p>Convert between Unicode domain names and Punycode (ASCII-compatible encoding)</p>
    </div>

    <div class="card-content">
      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <div class="toggle-container">
          <button
            class="toggle-btn"
            class:active={mode === 'unicode-to-punycode'}
            onclick={() => (mode = 'unicode-to-punycode')}
          >
            <Globe size="16" />
            Unicode → Punycode
          </button>
          <button
            class="toggle-btn"
            class:active={mode === 'punycode-to-unicode'}
            onclick={() => (mode = 'punycode-to-unicode')}
          >
            <Type size="16" />
            Punycode → Unicode
          </button>
        </div>
      </div>

      <!-- Examples Section -->
      <details bind:open={showExamples} class="examples-section">
        <summary>
          <div class="summary-content">
            <Globe size="20" />
            <span>Example Domains</span>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </summary>
        <div class="examples-grid">
          {#each domainExamples as example (example.unicode)}
            <button class="example-btn" onclick={() => loadExample(example)}>
              <div class="example-domain">
                {mode === 'unicode-to-punycode' ? example.unicode : example.punycode}
              </div>
              <div class="example-desc">{example.description}</div>
            </button>
          {/each}
        </div>
      </details>

      <!-- Conversion Tool -->
      <div class="conversion-card">
        <div class="conversion-header">
          <h2>
            {mode === 'unicode-to-punycode' ? 'Unicode → Punycode Conversion' : 'Punycode → Unicode Conversion'}
          </h2>
        </div>

        <div class="conversion-grid">
          <!-- Input -->
          <div class="input-card">
            <div class="input-section">
              <label for="input" use:tooltip={'Enter the domain name you want to convert'}>
                {mode === 'unicode-to-punycode' ? 'Unicode Domain Name' : 'Punycode Domain Name'}
              </label>
              <textarea
                id="input"
                bind:value={inputText}
                rows="4"
                placeholder={mode === 'unicode-to-punycode' ? 'münchen.de' : 'xn--mnchen-3ya.de'}
                class:mono-font={mode === 'punycode-to-unicode'}
              ></textarea>
              <small>
                {mode === 'unicode-to-punycode'
                  ? 'Enter Unicode domain names with international characters'
                  : 'Enter domain names containing xn-- punycode labels'}
              </small>
            </div>
          </div>

          <!-- Output -->
          <div class="output-card">
            <div class="output-section">
              <div class="output-header">
                <h3>
                  {mode === 'unicode-to-punycode' ? 'Punycode Result' : 'Unicode Result'}
                </h3>
                {#if isValid}
                  <button onclick={swapModeAndContent} class="swap-btn" use:tooltip={'Swap input and output'}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      ></path>
                    </svg>
                    Reverse
                  </button>
                {/if}
              </div>
              <div class="output-display">
                {#if isValid}
                  <pre class="result-text" class:mono-font={mode === 'unicode-to-punycode'}>{result}</pre>
                {:else if result.startsWith('Error:')}
                  <p class="error-text">{result}</p>
                {:else}
                  <p class="placeholder-text">Enter a domain name to see the conversion result</p>
                {/if}
              </div>

              {#if warnings.length > 0}
                <div class="alert alert-warning">
                  <h4>Notices</h4>
                  <ul>
                    {#each warnings as warning (warning)}
                      <li>{warning}</li>
                    {/each}
                  </ul>
                </div>
              {/if}

              {#if isValid}
                <div class="button-group">
                  <button
                    onclick={copyToClipboard}
                    class="btn-secondary"
                    class:success={clipboard.isCopied('copy')}
                    style="transform: {clipboard.isCopied('copy') ? 'scale(1.05)' : 'scale(1)'}"
                  >
                    {#if clipboard.isCopied('copy')}
                      <Check size="16" />
                      Copied!
                    {:else}
                      <Copy size="16" />
                      Copy Result
                    {/if}
                  </button>
                  <button
                    onclick={downloadResult}
                    class="btn-primary"
                    class:success={clipboard.isCopied('download')}
                    style="transform: {clipboard.isCopied('download') ? 'scale(1.05)' : 'scale(1)'}"
                  >
                    {#if clipboard.isCopied('download')}
                      <Check size="16" />
                      Downloaded!
                    {:else}
                      <Download size="16" />
                      Download
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Information Cards -->
      <div class="info-section">
        <div class="card info-card">
          <h3>About IDN and Punycode</h3>
          <p>
            Internationalized Domain Names (IDN) allow domain names to contain Unicode characters from various scripts
            and languages. Punycode is the ASCII-compatible encoding that represents Unicode domain labels, allowing
            non-ASCII domain names to work with existing DNS infrastructure.
          </p>
        </div>

        <div class="info-grid">
          <div class="card">
            <h4>How Punycode Works</h4>
            <div class="punycode-example">
              <p>Each Unicode label is encoded separately:</p>
              <div class="code-example">
                <div><strong>Unicode:</strong> <span class="unicode-text">münchen</span></div>
                <div><strong>Encoded:</strong> <span class="encoded-text">mnchen-3ya</span></div>
                <div><strong>Final:</strong> <span class="final-text">xn--mnchen-3ya</span></div>
              </div>
              <small>The <code>xn--</code> prefix identifies punycode labels</small>
            </div>
          </div>

          <div class="card">
            <h4>Common Use Cases</h4>
            <ul class="use-cases">
              <li>International domain registration</li>
              <li>Email address internationalization</li>
              <li>DNS configuration</li>
              <li>Web application development</li>
              <li>Security analysis</li>
            </ul>
          </div>

          <div class="card">
            <h4>Supported Features</h4>
            <ul class="features">
              <li>RFC 3492 compliant Punycode encoding/decoding</li>
              <li>Bidirectional conversion (Unicode ↔ Punycode)</li>
              <li>Multiple domain labels support</li>
              <li>Mixed ASCII/Unicode domain handling</li>
            </ul>
          </div>
          <div class="card security-card">
            <h4>Security Considerations</h4>
            <ul class="security-list">
              <li><strong>Homograph attacks:</strong> visually similar characters from different scripts</li>
              <li>Always validate and normalize IDN input in applications</li>
              <li>Consider implementing mixed-script detection</li>
              <li>Be aware of browser IDN display policies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .idn-converter {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--spacing-lg);

    @media (max-width: 768px) {
      padding: var(--spacing-md);
    }
  }

  .card {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);

    .card-header {
      h1 {
        color: var(--text-primary);
        font-size: var(--font-size-2xl);
        font-weight: 700;
        margin: 0;
      }

      p {
        color: var(--text-secondary);
        margin: var(--spacing-xs) 0 0;
      }
    }
  }

  .mode-toggle {
    margin-bottom: var(--spacing-lg);

    .toggle-container {
      display: flex;
      justify-content: center;
      background: var(--bg-tertiary);
      padding: var(--spacing-xs);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-primary);

      .toggle-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        background: transparent;
        color: var(--text-secondary);
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: var(--transition-fast);
        font-size: var(--font-size-sm);

        &.active {
          background: var(--bg-secondary);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        &:hover:not(.active) {
          background: var(--surface-hover);
        }
      }
    }
  }

  .examples-section {
    margin-bottom: var(--spacing-lg);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);

    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) var(--spacing-sm);
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--text-primary);
      font-weight: 600;
      transition: var(--transition-fast);

      &:hover {
        background: var(--surface-hover);
      }

      .summary-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        color: var(--color-primary);
        font-weight: 600;
      }

      .chevron {
        width: 16px;
        height: 16px;
        transition: transform var(--transition-fast);
      }
    }

    &[open] summary .chevron {
      transform: rotate(180deg);
    }

    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
    }

    .example-btn {
      text-align: left;
      padding: var(--spacing-sm);
      border: none;
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      transition: var(--transition-fast);
      cursor: pointer;

      &:hover {
        border-color: var(--color-primary);
      }

      .example-domain {
        font-weight: 600;
        font-family: var(--font-mono);
        margin-bottom: var(--spacing-xs);
      }

      .example-desc {
        font-size: var(--font-size-xs);
        opacity: 0.9;
      }
    }
  }

  .conversion-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--spacing-lg);

    .conversion-header {
      border-bottom: 1px solid var(--border-primary);
      padding: var(--spacing-lg);

      h2 {
        color: var(--text-primary);
        font-size: var(--font-size-lg);
        font-weight: 600;
        margin: 0;
      }
    }

    .conversion-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-xl);
      padding: var(--spacing-lg);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: var(--spacing-lg);
      }
    }
  }

  .input-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    .input-section {
      label {
        display: block;
        color: var(--text-primary);
        font-weight: 500;
        margin-bottom: var(--spacing-sm);
        cursor: help;
      }

      textarea {
        width: 100%;
        padding: var(--spacing-sm);
        background: var(--bg-primary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        resize: vertical;
        transition: var(--transition-fast);

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-dark);
        }

        &.mono-font {
          font-family: var(--font-mono);
        }
      }

      small {
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
        margin-top: var(--spacing-sm);
        display: block;
      }
    }
  }

  .output-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);

    .output-section {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);

      .output-header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .swap-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: transparent;
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: var(--font-size-xs);
          transition: var(--transition-fast);

          &:hover {
            background: var(--color-primary);
            color: var(--bg-primary);
          }

          svg {
            width: 12px;
            height: 12px;
          }
        }
      }

      .output-display {
        background: var(--bg-primary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        min-height: 100px;

        .result-text {
          color: var(--text-primary);
          font-size: var(--font-size-sm);
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;

          &.mono-font {
            font-family: var(--font-mono);
          }
        }

        .error-text {
          color: var(--color-error);
          font-size: var(--font-size-sm);
          margin: 0;
        }

        .placeholder-text {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          margin: 0;
        }
      }
    }
  }

  .alert {
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-md);

    h4 {
      font-weight: 600;
      margin: 0 0 var(--spacing-xs);
    }

    ul {
      margin: 0;
      padding-left: var(--spacing-md);

      li {
        margin-bottom: var(--spacing-xs);
      }
    }

    &.alert-warning {
      background: var(--color-warning-light);
      border: 1px solid var(--color-warning);
      color: var(--color-warning);
    }
  }

  .button-group {
    display: flex;
    gap: var(--spacing-sm);

    @media (max-width: 480px) {
      flex-direction: column;
    }
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-dark);
    }

    &.success {
      background: var(--color-success-light);
      border-color: var(--color-success);
      color: var(--color-success);
    }
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary-dark);
    color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-fast);

    &:hover {
      background: var(--color-primary);
      color: var(--bg-primary);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-dark);
    }

    &.success {
      background: var(--color-success);

      &:hover {
        background: var(--color-success-light);
      }
    }
  }

  .info-section {
    .info-card {
      background: color-mix(in srgb, var(--color-info-light) 8%, transparent);
      border-color: var(--color-info);
      margin-bottom: var(--spacing-lg);
      flex-direction: column;
      align-items: flex-start;

      h3 {
        color: var(--color-info);
        font-size: var(--font-size-md);
      }

      p {
        color: var(--text-primary);
        line-height: 1.6;
        margin: 0;
      }
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);

      .card {
        h4 {
          color: var(--text-primary);
          font-weight: 600;
          margin: 0 0 var(--spacing-sm);
        }

        .punycode-example {
          p {
            color: var(--text-secondary);
            margin-bottom: var(--spacing-sm);
          }

          .code-example {
            padding: var(--spacing-sm);
            background: var(--bg-primary);
            border: 1px solid var(--border-secondary);
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
            font-size: var(--font-size-xs);
            margin-bottom: var(--spacing-sm);

            div {
              color: var(--text-primary);
              margin-bottom: var(--spacing-xs);

              strong {
                color: var(--text-primary);
              }
            }

            .unicode-text {
              color: var(--color-primary);
            }

            .encoded-text {
              color: var(--color-purple);
            }

            .final-text {
              color: var(--color-success);
            }
          }

          small {
            color: var(--text-secondary);
            font-size: var(--font-size-xs);

            code {
              background: var(--bg-tertiary);
              padding: 2px var(--spacing-xs);
              border-radius: var(--radius-xs);
              font-size: var(--font-size-xs);
            }
          }
        }

        .use-cases,
        .features,
        .security-list {
          margin: 0;
          padding-left: var(--spacing-md);

          li {
            color: var(--text-secondary);
            margin-bottom: var(--spacing-xs);

            &::marker {
              color: var(--color-success);
            }
          }
        }
      }
    }

    .security-card .security-list li::marker {
      color: var(--color-warning) !important;
    }
  }
</style>
