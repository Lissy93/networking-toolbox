<script lang="ts">
  import { convertIPFormats, decimalToIP, binaryToIP, hexToIP, getIPClass } from '$lib/utils/ip-conversions.js';
  import { validateIPv4 } from '$lib/utils/ip-validation.js';
  import IPInput from './IPInput.svelte';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '../global/Icon.svelte';
  import { useClipboard } from '$lib/composables';

  let ipAddress = $state('192.168.1.1');
  let formats = $state({
    binary: '',
    decimal: '',
    hex: '',
    octal: '',
  });
  let ipClass = $state({ class: '', type: '', description: '' });
  const clipboard = useClipboard();
  let formatErrors = $state<Record<string, string>>({});

  /**
   * Updates all format conversions when IP changes
   */
  $effect(() => {
    if (ipAddress && validateIPv4(ipAddress).valid) {
      formats = convertIPFormats(ipAddress);
      ipClass = getIPClass(ipAddress);
      // Clear any format errors when a valid IP is set from the main input
      formatErrors = {};
    }
  });

  /**
   * Converts from decimal to IP
   */
  function handleDecimalInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();

    if (!value) {
      formatErrors = { ...formatErrors, decimal: '' };
      return;
    }

    const decimal = parseInt(value);

    if (isNaN(decimal)) {
      formatErrors = { ...formatErrors, decimal: 'Must be a valid number' };
      return;
    }

    if (decimal < 0 || decimal > 4294967295) {
      formatErrors = { ...formatErrors, decimal: 'Must be between 0 and 4,294,967,295' };
      return;
    }

    try {
      ipAddress = decimalToIP(decimal);
      formatErrors = { ...formatErrors, decimal: '' };
    } catch (err) {
      formatErrors = { ...formatErrors, decimal: 'Invalid decimal value' };
      console.error('Invalid decimal conversion:', err);
    }
  }

  /**
   * Converts from binary to IP
   */
  function handleBinaryInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();

    if (!value) {
      formatErrors = { ...formatErrors, binary: '' };
      return;
    }

    // Remove invalid characters and check format
    const cleanBinary = value.replace(/[^01.\s]/g, '');
    const binaryDigits = cleanBinary.replace(/[.\s]/g, '');

    if (cleanBinary !== value) {
      formatErrors = { ...formatErrors, binary: 'Only 0, 1, dots, and spaces allowed' };
      return;
    }

    if (binaryDigits.length !== 32) {
      formatErrors = { ...formatErrors, binary: 'Must be exactly 32 binary digits (8 digits per octet)' };
      return;
    }

    // Validate octet structure (should be 8.8.8.8 format)
    const parts = cleanBinary.split('.');
    if (parts.length !== 4) {
      formatErrors = { ...formatErrors, binary: 'Must use dotted format: 8bits.8bits.8bits.8bits' };
      return;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].replace(/\s/g, '');
      if (part.length !== 8) {
        formatErrors = { ...formatErrors, binary: `Octet ${i + 1} must be exactly 8 bits` };
        return;
      }
    }

    try {
      ipAddress = binaryToIP(cleanBinary);
      formatErrors = { ...formatErrors, binary: '' };
    } catch (err) {
      formatErrors = { ...formatErrors, binary: 'Invalid binary format' };
      console.error('Invalid binary conversion:', err);
    }
  }

  /**
   * Converts from hex to IP
   */
  function handleHexInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();

    if (!value) {
      formatErrors = { ...formatErrors, hex: '' };
      return;
    }

    // Remove invalid characters and check format
    const cleanHex = value.replace(/[^0-9a-fA-F.x]/g, '');
    const hexDigits = cleanHex.replace(/[.x]/g, '');

    if (cleanHex !== value) {
      formatErrors = { ...formatErrors, hex: 'Only hex digits (0-9, A-F), dots, and x allowed' };
      return;
    }

    if (hexDigits.length !== 8) {
      formatErrors = { ...formatErrors, hex: 'Must be exactly 8 hex digits (2 digits per octet)' };
      return;
    }

    // Validate format (should be 0xXX.0xXX.0xXX.0xXX or XX.XX.XX.XX)
    const parts = cleanHex.split('.');
    if (parts.length !== 4) {
      formatErrors = { ...formatErrors, hex: 'Must use dotted format: 0xXX.0xXX.0xXX.0xXX' };
      return;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let hexPart = part;

      if (part.startsWith('0x') || part.startsWith('0X')) {
        hexPart = part.slice(2);
      }

      if (hexPart.length !== 2) {
        formatErrors = { ...formatErrors, hex: `Octet ${i + 1} must be exactly 2 hex digits` };
        return;
      }

      if (!/^[0-9a-fA-F]{2}$/.test(hexPart)) {
        formatErrors = { ...formatErrors, hex: `Octet ${i + 1} contains invalid hex digits` };
        return;
      }
    }

    try {
      ipAddress = hexToIP(cleanHex);
      formatErrors = { ...formatErrors, hex: '' };
    } catch (err) {
      formatErrors = { ...formatErrors, hex: 'Invalid hexadecimal format' };
      console.error('Invalid hex conversion:', err);
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h2>IP Address Converter</h2>
    <p>Convert IP addresses between different number formats.</p>
  </header>

  <!-- Main IP Input -->
  <div class="form-group">
    <IPInput bind:value={ipAddress} label="IP Address" placeholder="192.168.1.1" />
  </div>

  {#if validateIPv4(ipAddress).valid}
    <div class="results-section fade-in">
      <!-- IP Class Information -->
      <section class="info-panel info">
        <h3>IP Class Information</h3>
        <div class="grid grid-3">
          <div class="class-info">
            <span class="info-label">Class</span>
            <span class="class-value">{ipClass.class}</span>
          </div>
          <div class="class-info">
            <span class="info-label">Type</span>
            <span class="class-value type">{ipClass.type}</span>
          </div>
          <div class="class-info">
            <span class="info-label">Usage</span>
            <span class="class-description">{ipClass.description}</span>
          </div>
        </div>
      </section>

      <!-- Format Conversions -->
      <div class="grid grid-2 conversions-grid">
        <!-- Binary Format -->
        <div class="format-group">
          <label for="binary-input">Binary Format</label>
          <div class="format-input">
            <input
              id="binary-input"
              type="text"
              value={formats.binary}
              placeholder="11000000.10101000.00000001.00000001"
              class="format-field binary {formatErrors.binary ? 'error' : ''}"
              oninput={handleBinaryInput}
            />
            <Tooltip
              text={clipboard.isCopied('binary') ? 'Copied!' : 'Copy binary format to clipboard'}
              position="left"
            >
              <button
                type="button"
                class="copy-btn {clipboard.isCopied('binary') ? 'copied' : ''}"
                onclick={() => clipboard.copy(formats.binary, 'binary')}
                aria-label="Copy binary format to clipboard"
              >
                <Icon name={clipboard.isCopied('binary') ? 'check' : 'copy'} size="sm" />
              </button>
            </Tooltip>
          </div>
          {#if formatErrors.binary}
            <div class="error-message">{formatErrors.binary}</div>
          {/if}
        </div>

        <!-- Decimal Format -->
        <div class="format-group">
          <label for="decimal-input">Decimal Format</label>
          <div class="format-input">
            <input
              id="decimal-input"
              type="text"
              value={formats.decimal}
              placeholder="3232235777"
              class="format-field decimal {formatErrors.decimal ? 'error' : ''}"
              oninput={handleDecimalInput}
            />
            <Tooltip
              text={clipboard.isCopied('decimal') ? 'Copied!' : 'Copy decimal format to clipboard'}
              position="left"
            >
              <button
                type="button"
                class="copy-btn {clipboard.isCopied('decimal') ? 'copied' : ''}"
                onclick={() => clipboard.copy(formats.decimal, 'decimal')}
                aria-label="Copy decimal format to clipboard"
              >
                <Icon name={clipboard.isCopied('decimal') ? 'check' : 'copy'} size="sm" />
              </button>
            </Tooltip>
          </div>
          {#if formatErrors.decimal}
            <div class="error-message">{formatErrors.decimal}</div>
          {/if}
        </div>

        <!-- Hexadecimal Format -->
        <div class="format-group">
          <label for="hex-input">Hexadecimal Format</label>
          <div class="format-input">
            <input
              id="hex-input"
              type="text"
              value={formats.hex}
              placeholder="0xC0.0xA8.0x01.0x01"
              class="format-field hex {formatErrors.hex ? 'error' : ''}"
              oninput={handleHexInput}
            />
            <Tooltip
              text={clipboard.isCopied('hex') ? 'Copied!' : 'Copy hexadecimal format to clipboard'}
              position="left"
            >
              <button
                type="button"
                class="copy-btn {clipboard.isCopied('hex') ? 'copied' : ''}"
                onclick={() => clipboard.copy(formats.hex, 'hex')}
                aria-label="Copy hexadecimal format to clipboard"
              >
                <Icon name={clipboard.isCopied('hex') ? 'check' : 'copy'} size="sm" />
              </button>
            </Tooltip>
          </div>
          {#if formatErrors.hex}
            <div class="error-message">{formatErrors.hex}</div>
          {/if}
        </div>

        <!-- Octal Format -->
        <div class="format-group">
          <label for="octal-input">Octal Format</label>
          <div class="format-input">
            <input
              id="octal-input"
              type="text"
              value={formats.octal}
              placeholder="0300.0250.001.001"
              class="format-field octal"
              readonly
            />
            <Tooltip text={clipboard.isCopied('octal') ? 'Copied!' : 'Copy octal format to clipboard'} position="left">
              <button
                type="button"
                class="copy-btn {clipboard.isCopied('octal') ? 'copied' : ''}"
                onclick={() => clipboard.copy(formats.octal, 'octal')}
                aria-label="Copy octal format to clipboard"
              >
                <Icon name={clipboard.isCopied('octal') ? 'check' : 'copy'} size="sm" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<div class="ip-explanation-docs">
  <!-- Number Formats Explanation -->
  <div class="card">
    <h3>
      <Icon name="info" size="md" />
      Number Format Explanations
    </h3>
    <div class="explainer-content">
      <div class="format-explanations">
        <!-- Binary Format -->
        <div class="format-explanation">
          <h4><span class="format-badge binary">Binary (Base-2)</span></h4>
          <p>
            <strong>What it is:</strong> Uses only digits 0 and 1, representing how computers internally store IP addresses.
          </p>
          <p><strong>Example:</strong> <code>192.168.1.1 = 11000000.10101000.00000001.00000001</code></p>
          <p>
            <strong>Usage:</strong> Low-level networking, subnet calculations, understanding network/host boundaries.
          </p>
          <p><strong>How to read:</strong> Each octet is 8 bits. Binary 11000000 = 128+64 = 192 in decimal.</p>
        </div>

        <!-- Decimal Format -->
        <div class="format-explanation">
          <h4><span class="format-badge decimal">Decimal (Base-10)</span></h4>
          <p><strong>What it is:</strong> The entire IP as a single large number (0-4,294,967,295).</p>
          <p><strong>Example:</strong> <code>192.168.1.1 = 3,232,235,777</code></p>
          <p><strong>Usage:</strong> Database storage, mathematical operations, IP range calculations.</p>
          <p><strong>Calculation:</strong> (192×256³) + (168×256²) + (1×256) + 1 = 3,232,235,777</p>
        </div>

        <!-- Hexadecimal Format -->
        <div class="format-explanation">
          <h4><span class="format-badge hex">Hexadecimal (Base-16)</span></h4>
          <p>
            <strong>What it is:</strong> Uses digits 0-9 and letters A-F, common in programming and system administration.
          </p>
          <p><strong>Example:</strong> <code>192.168.1.1 = 0xC0.0xA8.0x01.0x01</code></p>
          <p><strong>Usage:</strong> Programming, system logs, network debugging, firmware configuration.</p>
          <p><strong>Conversion:</strong> 192 = C0 hex, 168 = A8 hex. Each hex digit represents 4 bits.</p>
        </div>

        <!-- Octal Format -->
        <div class="format-explanation">
          <h4><span class="format-badge octal">Octal (Base-8)</span></h4>
          <p><strong>What it is:</strong> Uses digits 0-7, less common but still found in some Unix systems.</p>
          <p><strong>Example:</strong> <code>192.168.1.1 = 0300.0250.001.001</code></p>
          <p><strong>Usage:</strong> Legacy Unix configurations, file permissions, some network tools.</p>
          <p><strong>Note:</strong> Leading zeros indicate octal format. 0300 octal = 192 decimal.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- IP Classes Explanation -->
  <div class="card">
    <h3>
      <Icon name="info" size="md" />
      IP Address Classes
    </h3>
    <div class="explainer-content">
      <p>IP address classes are historical categories that determine network size and usage patterns:</p>

      <div class="class-explanations">
        <div class="class-explanation">
          <h4><span class="class-badge class-a">Class A</span></h4>
          <p><strong>Range:</strong> 1.0.0.0 to 126.255.255.255</p>
          <p><strong>Default Mask:</strong> 255.0.0.0 (/8)</p>
          <p><strong>Networks:</strong> 126 networks, 16.7 million hosts each</p>
          <p><strong>Usage:</strong> Large organizations, ISPs, government networks</p>
        </div>

        <div class="class-explanation">
          <h4><span class="class-badge class-b">Class B</span></h4>
          <p><strong>Range:</strong> 128.0.0.0 to 191.255.255.255</p>
          <p><strong>Default Mask:</strong> 255.255.0.0 (/16)</p>
          <p><strong>Networks:</strong> 16,384 networks, 65,534 hosts each</p>
          <p><strong>Usage:</strong> Universities, medium-large organizations</p>
        </div>

        <div class="class-explanation">
          <h4><span class="class-badge class-c">Class C</span></h4>
          <p><strong>Range:</strong> 192.0.0.0 to 223.255.255.255</p>
          <p><strong>Default Mask:</strong> 255.255.255.0 (/24)</p>
          <p><strong>Networks:</strong> 2.1 million networks, 254 hosts each</p>
          <p><strong>Usage:</strong> Small businesses, home networks</p>
        </div>
      </div>

      <div class="class-notes">
        <h4>Special Ranges</h4>
        <ul>
          <li><strong>Class D (224-239):</strong> Multicast addresses for group communication</li>
          <li><strong>Class E (240-255):</strong> Reserved for experimental use</li>
          <li><strong>Private Networks:</strong> 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16</li>
          <li><strong>Loopback:</strong> 127.0.0.0/8 (localhost addresses)</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Usage Guide -->
  <div class="card">
    <h3>
      <Icon name="lightbulb" size="md" />
      When to Use Each Format
    </h3>
    <div class="explainer-content">
      <div class="usage-scenarios">
        <div class="usage-scenario">
          <h4>Network Administration</h4>
          <ul>
            <li><strong>Dotted Decimal:</strong> Daily configuration and documentation</li>
            <li><strong>Binary:</strong> Subnet calculations and VLSM planning</li>
            <li><strong>Hexadecimal:</strong> Debugging network captures and logs</li>
          </ul>
        </div>

        <div class="usage-scenario">
          <h4>Programming & Development</h4>
          <ul>
            <li><strong>Decimal:</strong> Database storage and IP range operations</li>
            <li><strong>Hexadecimal:</strong> Low-level socket programming</li>
            <li><strong>Binary:</strong> Bitwise operations and subnet masking</li>
          </ul>
        </div>

        <div class="usage-scenario">
          <h4>Troubleshooting & Analysis</h4>
          <ul>
            <li><strong>Binary:</strong> Understanding subnet boundaries</li>
            <li><strong>Hexadecimal:</strong> Reading network packet captures</li>
            <li><strong>Decimal:</strong> Quick IP range calculations</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  h3 {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .results-section {
    margin-top: var(--spacing-lg);
  }

  .class-info {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .class-value {
    display: block;
    font-size: var(--font-size-xl);
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--color-primary);
    margin-top: var(--spacing-xs);
  }

  .class-value.type {
    color: var(--color-info-light);
  }

  .class-description {
    display: block;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .conversions-grid {
    margin-top: var(--spacing-lg);
  }

  .format-group {
    margin-bottom: var(--spacing-md);
  }

  .format-input {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .format-field {
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
  }

  .format-field.binary {
    border-color: var(--color-info);
  }

  .format-field.decimal {
    border-color: var(--color-success);
  }

  .format-field.hex {
    border-color: var(--color-warning);
  }

  .format-field.octal {
    border-color: var(--text-secondary);
    background-color: var(--bg-tertiary);
    cursor: default;
  }

  .copy-btn {
    width: 2rem;
    height: 2rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .copy-btn:hover {
    background-color: var(--surface-hover);
    color: var(--text-primary);
    border-color: var(--color-primary);
  }

  .copy-btn.copied {
    color: var(--color-success);
    background-color: rgba(35, 134, 54, 0.1);
  }

  .format-field.error {
    border-color: var(--color-danger) !important;
    background-color: rgba(var(--color-danger-rgb), 0.05);
  }

  .error-message {
    margin-top: var(--spacing-xs);
    color: var(--color-danger);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .ip-explanation-docs {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-top: 2rem;
    width: 100%;
    .card {
      width: 100%;
    }
  }

  /* Format explanation styles */
  .format-explanations {
    display: grid;
    gap: var(--spacing-lg);
  }

  .format-explanation {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--border-primary);
  }

  .format-badge {
    display: inline-block;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--bg-primary);
  }

  .format-badge.binary {
    background-color: var(--color-info);
  }

  .format-badge.decimal {
    background-color: var(--color-success);
  }

  .format-badge.hex {
    background-color: var(--color-warning);
  }

  .format-badge.octal {
    background-color: var(--text-secondary);
  }

  /* Class explanation styles */
  .class-explanations {
    display: grid;
    gap: var(--spacing-md);
    margin: var(--spacing-md) 0;
  }

  .class-explanation {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--border-primary);
  }

  .class-badge {
    display: inline-block;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--bg-primary);
    width: fit-content;
    display: flex;
    &.class-a {
      background-color: var(--color-info);
    }
    &.class-b {
      background-color: var(--color-success);
    }
    &.class-c {
      background-color: var(--color-warning);
    }
  }
  .class-notes {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
  }

  .class-notes ul {
    margin: var(--spacing-sm) 0 0 var(--spacing-md);
  }

  .class-notes li {
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
  }

  /* Usage scenarios styles */
  .usage-scenarios {
    display: grid;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-md);
  }

  .usage-scenario {
    padding: var(--spacing-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
  }

  .usage-scenario h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
  }

  .usage-scenario ul {
    margin: var(--spacing-sm) 0 0 var(--spacing-md);
  }

  .usage-scenario li {
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
  }

  /* Explainer card content styles */
  .explainer-content p {
    color: var(--text-primary);
    line-height: 1.6;
    margin-bottom: var(--spacing-sm);
  }

  .explainer-content code {
    background-color: var(--bg-primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .explainer-content h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
  }

  @media (max-width: 768px) {
    .format-input {
      flex-direction: column;
      align-items: stretch;
    }

    .copy-btn {
      align-self: center;
    }
  }
</style>
