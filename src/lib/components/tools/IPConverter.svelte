<script lang="ts">
  import { convertIPFormats, decimalToIP, binaryToIP, hexToIP, getIPClass } from '$lib/utils/ip-conversions.js';
  import { validateIPv4 } from '$lib/utils/ip-validation.js';
  import IPInput from './IPInput.svelte';
  import Tooltip from '$lib/components/global/Tooltip.svelte';
  import Icon from '../global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import { t } from '$lib/stores/language';

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
      formatErrors = { ...formatErrors, decimal: $t('tools/ip-converter.errors.mustBeValidNumber') };
      return;
    }

    if (decimal < 0 || decimal > 4294967295) {
      formatErrors = { ...formatErrors, decimal: $t('tools/ip-converter.errors.decimalOutOfRange') };
      return;
    }

    try {
      ipAddress = decimalToIP(decimal);
      formatErrors = { ...formatErrors, decimal: '' };
    } catch (err) {
      formatErrors = { ...formatErrors, decimal: $t('tools/ip-converter.errors.invalidDecimal') };
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
      formatErrors = { ...formatErrors, binary: $t('tools/ip-converter.errors.binaryOnlyDigits') };
      return;
    }

    if (binaryDigits.length !== 32) {
      formatErrors = { ...formatErrors, binary: $t('tools/ip-converter.errors.binaryMust32Bits') };
      return;
    }

    // Validate octet structure (should be 8.8.8.8 format)
    const parts = cleanBinary.split('.');
    if (parts.length !== 4) {
      formatErrors = { ...formatErrors, binary: $t('tools/ip-converter.errors.binaryDottedFormat') };
      return;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].replace(/\s/g, '');
      if (part.length !== 8) {
        formatErrors = { ...formatErrors, binary: $t('tools/ip-converter.errors.binaryOctetLength', { octet: i + 1 }) };
        return;
      }
    }

    try {
      ipAddress = binaryToIP(cleanBinary);
      formatErrors = { ...formatErrors, binary: '' };
    } catch (err) {
      formatErrors = { ...formatErrors, binary: $t('tools/ip-converter.errors.invalidBinary') };
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
      formatErrors = { ...formatErrors, hex: $t('tools/ip-converter.errors.hexOnlyDigits') };
      return;
    }

    if (hexDigits.length !== 8) {
      formatErrors = { ...formatErrors, hex: $t('tools/ip-converter.errors.hexMust8Digits') };
      return;
    }

    // Validate format (should be 0xXX.0xXX.0xXX.0xXX or XX.XX.XX.XX)
    const parts = cleanHex.split('.');
    if (parts.length !== 4) {
      formatErrors = { ...formatErrors, hex: $t('tools/ip-converter.errors.hexDottedFormat') };
      return;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let hexPart = part;

      if (part.startsWith('0x') || part.startsWith('0X')) {
        hexPart = part.slice(2);
      }

      if (hexPart.length !== 2) {
        formatErrors = { ...formatErrors, hex: $t('tools/ip-converter.errors.hexOctetLength', { octet: i + 1 }) };
        return;
      }

      if (!/^[0-9a-fA-F]{2}$/.test(hexPart)) {
        formatErrors = { ...formatErrors, hex: $t('tools/ip-converter.errors.hexInvalidDigits', { octet: i + 1 }) };
        return;
      }
    }

    try {
      ipAddress = hexToIP(cleanHex);
      formatErrors = { ...formatErrors, hex: '' };
    } catch (err) {
      formatErrors = { ...formatErrors, hex: $t('tools/ip-converter.errors.invalidHex') };
      console.error('Invalid hex conversion:', err);
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h2>{$t('tools/ip-converter.title')}</h2>
    <p>{$t('tools/ip-converter.description')}</p>
  </header>

  <!-- Main IP Input -->
  <div class="form-group">
    <IPInput
      bind:value={ipAddress}
      label={$t('tools/ip-converter.input.ipAddress')}
      placeholder={$t('tools/ip-converter.input.placeholder')}
    />
  </div>

  {#if validateIPv4(ipAddress).valid}
    <div class="results-section fade-in">
      <!-- IP Class Information -->
      <section class="info-panel info">
        <h3>{$t('tools/ip-converter.ipClasses.title')}</h3>
        <div class="grid grid-3">
          <div class="class-info">
            <span class="info-label">{$t('common.labels.type')}</span>
            <span class="class-value">{ipClass.class}</span>
          </div>
          <div class="class-info">
            <span class="info-label">{$t('common.labels.type')}</span>
            <span class="class-value type">{ipClass.type}</span>
          </div>
          <div class="class-info">
            <span class="info-label">{$t('common.labels.usage')}</span>
            <span class="class-description">{ipClass.description}</span>
          </div>
        </div>
      </section>

      <!-- Format Conversions -->
      <div class="grid grid-2 conversions-grid">
        <!-- Binary Format -->
        <div class="format-group">
          <label for="binary-input">{$t('tools/ip-converter.formats.binary.title')}</label>
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
              text={clipboard.isCopied('binary')
                ? $t('common.clipboard.copied')
                : $t('common.clipboard.copyBinaryFormat')}
              position="left"
            >
              <button
                type="button"
                class="copy-btn {clipboard.isCopied('binary') ? 'copied' : ''}"
                onclick={() => clipboard.copy(formats.binary, 'binary')}
                aria-label={$t('common.clipboard.copyBinaryFormat')}
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
          <label for="decimal-input">{$t('tools/ip-converter.formats.decimal.title')}</label>
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
              text={clipboard.isCopied('decimal')
                ? $t('common.clipboard.copied')
                : $t('common.clipboard.copyDecimalFormat')}
              position="left"
            >
              <button
                type="button"
                class="copy-btn {clipboard.isCopied('decimal') ? 'copied' : ''}"
                onclick={() => clipboard.copy(formats.decimal, 'decimal')}
                aria-label={$t('common.clipboard.copyDecimalFormat')}
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
          <label for="hex-input">{$t('tools/ip-converter.formats.hexadecimal.title')}</label>
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
              text={clipboard.isCopied('hex') ? $t('common.clipboard.copied') : $t('common.clipboard.copyHexFormat')}
              position="left"
            >
              <button
                type="button"
                class="copy-btn {clipboard.isCopied('hex') ? 'copied' : ''}"
                onclick={() => clipboard.copy(formats.hex, 'hex')}
                aria-label={$t('common.clipboard.copyHexFormat')}
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
          <label for="octal-input">{$t('tools/ip-converter.formats.octal.title')}</label>
          <div class="format-input">
            <input
              id="octal-input"
              type="text"
              value={formats.octal}
              placeholder="0300.0250.001.001"
              class="format-field octal"
              readonly
            />
            <Tooltip
              text={clipboard.isCopied('octal')
                ? $t('common.clipboard.copied')
                : $t('common.clipboard.copyOctalFormat')}
              position="left"
            >
              <button
                type="button"
                class="copy-btn {clipboard.isCopied('octal') ? 'copied' : ''}"
                onclick={() => clipboard.copy(formats.octal, 'octal')}
                aria-label={$t('common.clipboard.copyOctalFormat')}
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
      {$t('tools/ip-converter.explanations.title')}
    </h3>
    <div class="explainer-content">
      <div class="format-explanations">
        <!-- Binary Format -->
        <div class="format-explanation">
          <h4><span class="format-badge binary">{$t('tools/ip-converter.formats.binary.badge')}</span></h4>
          <p>
            <strong>{$t('tools/ip-converter.explanations.whatItIs')}</strong>
            {$t('tools/ip-converter.formats.binary.whatItIs')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.example')}</strong>
            <code>{$t('tools/ip-converter.formats.binary.example')}</code>
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.usage')}</strong>
            {$t('tools/ip-converter.formats.binary.usage')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.howToRead')}</strong>
            {$t('tools/ip-converter.formats.binary.howToRead')}
          </p>
        </div>

        <!-- Decimal Format -->
        <div class="format-explanation">
          <h4><span class="format-badge decimal">{$t('tools/ip-converter.formats.decimal.badge')}</span></h4>
          <p>
            <strong>{$t('tools/ip-converter.explanations.whatItIs')}</strong>
            {$t('tools/ip-converter.formats.decimal.whatItIs')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.example')}</strong>
            <code>{$t('tools/ip-converter.formats.decimal.example')}</code>
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.usage')}</strong>
            {$t('tools/ip-converter.formats.decimal.usage')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.calculation')}</strong>
            {$t('tools/ip-converter.formats.decimal.calculation')}
          </p>
        </div>

        <!-- Hexadecimal Format -->
        <div class="format-explanation">
          <h4><span class="format-badge hex">{$t('tools/ip-converter.formats.hexadecimal.badge')}</span></h4>
          <p>
            <strong>{$t('tools/ip-converter.explanations.whatItIs')}</strong>
            {$t('tools/ip-converter.formats.hexadecimal.whatItIs')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.example')}</strong>
            <code>{$t('tools/ip-converter.formats.hexadecimal.example')}</code>
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.usage')}</strong>
            {$t('tools/ip-converter.formats.hexadecimal.usage')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.conversion')}</strong>
            {$t('tools/ip-converter.formats.hexadecimal.conversion')}
          </p>
        </div>

        <!-- Octal Format -->
        <div class="format-explanation">
          <h4><span class="format-badge octal">{$t('tools/ip-converter.formats.octal.badge')}</span></h4>
          <p>
            <strong>{$t('tools/ip-converter.explanations.whatItIs')}</strong>
            {$t('tools/ip-converter.formats.octal.whatItIs')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.example')}</strong>
            <code>{$t('tools/ip-converter.formats.octal.example')}</code>
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.usage')}</strong>
            {$t('tools/ip-converter.formats.octal.usage')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.note')}</strong>
            {$t('tools/ip-converter.formats.octal.note')}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- IP Classes Explanation -->
  <div class="card">
    <h3>
      <Icon name="info" size="md" />
      {$t('tools/ip-converter.explanations.ipClassesTitle')}
    </h3>
    <div class="explainer-content">
      <p>{$t('tools/ip-converter.ipClasses.description')}</p>

      <div class="class-explanations">
        <div class="class-explanation">
          <h4><span class="class-badge class-a">{$t('tools/ip-converter.ipClasses.classA.badge')}</span></h4>
          <p>
            <strong>{$t('tools/ip-converter.explanations.range')}</strong>
            {$t('tools/ip-converter.ipClasses.classA.range')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.defaultMask')}</strong>
            {$t('tools/ip-converter.ipClasses.classA.defaultMask')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.networks')}</strong>
            {$t('tools/ip-converter.ipClasses.classA.networks')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.usage')}</strong>
            {$t('tools/ip-converter.ipClasses.classA.usage')}
          </p>
        </div>

        <div class="class-explanation">
          <h4><span class="class-badge class-b">{$t('tools/ip-converter.ipClasses.classB.badge')}</span></h4>
          <p>
            <strong>{$t('tools/ip-converter.explanations.range')}</strong>
            {$t('tools/ip-converter.ipClasses.classB.range')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.defaultMask')}</strong>
            {$t('tools/ip-converter.ipClasses.classB.defaultMask')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.networks')}</strong>
            {$t('tools/ip-converter.ipClasses.classB.networks')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.usage')}</strong>
            {$t('tools/ip-converter.ipClasses.classB.usage')}
          </p>
        </div>

        <div class="class-explanation">
          <h4><span class="class-badge class-c">{$t('tools/ip-converter.ipClasses.classC.badge')}</span></h4>
          <p>
            <strong>{$t('tools/ip-converter.explanations.range')}</strong>
            {$t('tools/ip-converter.ipClasses.classC.range')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.defaultMask')}</strong>
            {$t('tools/ip-converter.ipClasses.classC.defaultMask')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.networks')}</strong>
            {$t('tools/ip-converter.ipClasses.classC.networks')}
          </p>
          <p>
            <strong>{$t('tools/ip-converter.explanations.usage')}</strong>
            {$t('tools/ip-converter.ipClasses.classC.usage')}
          </p>
        </div>
      </div>

      <div class="class-notes">
        <h4>{$t('tools/ip-converter.ipClasses.specialRanges.title')}</h4>
        <ul>
          <li>{$t('tools/ip-converter.ipClasses.specialRanges.classD')}</li>
          <li>{$t('tools/ip-converter.ipClasses.specialRanges.classE')}</li>
          <li>{$t('tools/ip-converter.ipClasses.specialRanges.privateNetworks')}</li>
          <li>{$t('tools/ip-converter.ipClasses.specialRanges.loopback')}</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Usage Guide -->
  <div class="card">
    <h3>
      <Icon name="lightbulb" size="md" />
      {$t('tools/ip-converter.useCases.title')}
    </h3>
    <div class="explainer-content">
      <div class="usage-scenarios">
        <div class="usage-scenario">
          <h4>{$t('tools/ip-converter.useCases.networkAdmin.title')}</h4>
          <ul>
            <li>
              <strong>{$t('tools/ip-converter.explanations.dottedDecimal')}</strong>
              {$t('tools/ip-converter.useCases.networkAdmin.dottedDecimal')}
            </li>
            <li>
              <strong>{$t('tools/ip-converter.explanations.binary')}</strong>
              {$t('tools/ip-converter.useCases.networkAdmin.binary')}
            </li>
            <li>
              <strong>{$t('tools/ip-converter.explanations.hexadecimal')}</strong>
              {$t('tools/ip-converter.useCases.networkAdmin.hexadecimal')}
            </li>
          </ul>
        </div>

        <div class="usage-scenario">
          <h4>{$t('tools/ip-converter.useCases.programming.title')}</h4>
          <ul>
            <li>
              <strong>{$t('tools/ip-converter.explanations.decimal')}</strong>
              {$t('tools/ip-converter.useCases.programming.decimal')}
            </li>
            <li>
              <strong>{$t('tools/ip-converter.explanations.hexadecimal')}</strong>
              {$t('tools/ip-converter.useCases.programming.hexadecimal')}
            </li>
            <li>
              <strong>{$t('tools/ip-converter.explanations.binary')}</strong>
              {$t('tools/ip-converter.useCases.programming.binary')}
            </li>
          </ul>
        </div>

        <div class="usage-scenario">
          <h4>{$t('tools/ip-converter.useCases.troubleshooting.title')}</h4>
          <ul>
            <li>
              <strong>{$t('tools/ip-converter.explanations.binary')}</strong>
              {$t('tools/ip-converter.useCases.troubleshooting.binary')}
            </li>
            <li>
              <strong>{$t('tools/ip-converter.explanations.hexadecimal')}</strong>
              {$t('tools/ip-converter.useCases.troubleshooting.hexadecimal')}
            </li>
            <li>
              <strong>{$t('tools/ip-converter.explanations.decimal')}</strong>
              {$t('tools/ip-converter.useCases.troubleshooting.decimal')}
            </li>
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
