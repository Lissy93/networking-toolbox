<script lang="ts">
  import { tooltip } from '$lib/actions/tooltip.js';
  import Icon from '$lib/components/global/Icon.svelte';
  import { useClipboard } from '$lib/composables';
  import {
    generateRegex,
    getLanguageExamples,
    getRegexRUrl,
    ADVANCED_OPTIONS,
    type RegexType,
    type Mode,
    type IPv4Options,
    type IPv6Options,
    type CrossOptions,
    type RegexResult,
    type AdvancedOption,
  } from '$lib/utils/ip-regex-gen.js';
  import { validateRegexInput, type RegexValidation } from '$lib/utils/ip-regex-validator.js';

  let mode = $state<Mode>('simple');
  let regexType = $state<RegexType>('ipv4');
  const clipboard = useClipboard();

  // Advanced options
  let ipv4Options = $state<IPv4Options>({
    allowLeadingZeros: false,
    requireAllOctets: true,
    allowPrivateOnly: false,
    allowPublicOnly: false,
    wordBoundaries: true,
    caseInsensitive: false,
  });

  let ipv6Options = $state<IPv6Options>({
    allowCompressed: true,
    allowFullForm: true,
    allowZoneId: false,
    allowEmbeddedIPv4: true,
    wordBoundaries: true,
    caseInsensitive: true,
    allowBrackets: false,
  });

  let crossOptions = $state<CrossOptions>({
    exactMatch: false,
    engineSafeBoundaries: false,
    allowPort: false,
    allowCIDR: false,
    namedCaptures: false,
  });

  let openLanguageExample = $state<string | null>(null);
  let result = $state<RegexResult | null>(null);

  // Track custom test cases separately from defaults
  let customValidCases = $state<string[]>([]);
  let customInvalidCases = $state<string[]>([]);

  // Editable regex state
  let isEditingRegex = $state<boolean>(false);
  let editablePattern = $state<string>('');
  let editableFlags = $state<string>('');
  let regexValidation = $state<RegexValidation | null>(null);

  // Editable test cases state
  let isEditingTestCases = $state<boolean>(false);
  let editableValidCases = $state<string[]>([]);
  let editableInvalidCases = $state<string[]>([]);
  let newValidCase = $state<string>('');
  let newInvalidCase = $state<string>('');

  // Live test case validation
  let testCaseResults = $state<{
    valid: { text: string; matches: boolean; error?: string }[];
    invalid: { text: string; matches: boolean; error?: string }[];
  }>({ valid: [], invalid: [] });

  function handleRegexGeneration() {
    const newResult = generateRegex(regexType, mode, ipv4Options, ipv6Options, crossOptions);

    // Combine default test cases with custom ones
    const combinedTestCases = {
      valid: [...newResult.testCases.valid, ...customValidCases],
      invalid: [...newResult.testCases.invalid, ...customInvalidCases],
    };

    result = {
      ...newResult,
      testCases: combinedTestCases,
    };

    // Reset editing state when generating new regex
    if (isEditingRegex) {
      editablePattern = newResult.pattern;
      editableFlags = newResult.flags;
      validateEditableRegex();
    }

    // Update editable test cases to match combined test cases
    if (isEditingTestCases) {
      editableValidCases = [...combinedTestCases.valid];
      editableInvalidCases = [...combinedTestCases.invalid];
    }
  }

  function handleOptionChange() {
    handleRegexGeneration();
  }

  function getOptionValue(option: AdvancedOption): boolean {
    switch (option.optionsObject) {
      case 'ipv4Options':
        return ipv4Options[option.key as keyof typeof ipv4Options] as boolean;
      case 'ipv6Options':
        return ipv6Options[option.key as keyof typeof ipv6Options] as boolean;
      case 'crossOptions':
        return crossOptions[option.key as keyof typeof crossOptions] as boolean;
      default:
        return false;
    }
  }

  function setOptionValue(option: AdvancedOption, value: boolean) {
    switch (option.optionsObject) {
      case 'ipv4Options':
        (ipv4Options as unknown as Record<string, boolean>)[option.key] = value;
        break;
      case 'ipv6Options':
        (ipv6Options as unknown as Record<string, boolean>)[option.key] = value;
        break;
      case 'crossOptions':
        (crossOptions as unknown as Record<string, boolean>)[option.key] = value;
        break;
    }
  }

  function validateEditableRegex() {
    if (!editablePattern) {
      regexValidation = { ok: false, error: 'Pattern cannot be empty' };
      return;
    }

    regexValidation = validateRegexInput(editablePattern, editableFlags);
  }

  function enableRegexEditing() {
    if (!result) return;

    isEditingRegex = true;
    editablePattern = result.pattern;
    editableFlags = result.flags;
    validateEditableRegex();
  }

  function applyRegexEdits() {
    if (!regexValidation?.ok || !result) return;

    // Create updated result with custom regex
    result = {
      ...result,
      pattern: editablePattern,
      flags: editableFlags,
      description: `Custom ${result.description.includes('IPv4') ? 'IPv4' : result.description.includes('IPv6') ? 'IPv6' : 'IP'} pattern`,
    };

    // Re-validate test cases against new pattern
    if (isEditingTestCases) {
      validateTestCases();
    } else {
      // Update test case validation manually since effects won't trigger during editing
      updateTestCaseValidation();
    }

    // Close the edit field after applying
    isEditingRegex = false;
    regexValidation = null;
  }

  function cancelRegexEditing() {
    isEditingRegex = false;
    regexValidation = null;
  }

  function enableTestCaseEditing() {
    if (!result) return;

    isEditingTestCases = true;
    editableValidCases = [...result.testCases.valid];
    editableInvalidCases = [...result.testCases.invalid];
  }

  function addValidTestCase() {
    if (!newValidCase.trim()) return;

    editableValidCases = [...editableValidCases, newValidCase.trim()];
    newValidCase = '';
    validateTestCases();
  }

  function addInvalidTestCase() {
    if (!newInvalidCase.trim()) return;

    editableInvalidCases = [...editableInvalidCases, newInvalidCase.trim()];
    newInvalidCase = '';
    validateTestCases();
  }

  function removeValidTestCase(index: number) {
    editableValidCases = editableValidCases.filter((_, i) => i !== index);
    validateTestCases();
  }

  function removeInvalidTestCase(index: number) {
    editableInvalidCases = editableInvalidCases.filter((_, i) => i !== index);
    validateTestCases();
  }

  function validateTestCases() {
    if (!result || !regexValidation?.ok) return;

    try {
      const _regex = new RegExp(editablePattern, editableFlags);

      // Update result with new test cases
      result = {
        ...result,
        testCases: {
          valid: editableValidCases,
          invalid: editableInvalidCases,
        },
      };

      // Update live validation
      updateTestCaseValidation();
    } catch {
      // If regex is invalid, don't update test cases
    }
  }

  function updateTestCaseValidation() {
    if (!result) {
      testCaseResults = { valid: [], invalid: [] };
      return;
    }

    // Use current regex (either original or edited)
    const currentPattern = isEditingRegex ? editablePattern : result.pattern;
    const currentFlags = isEditingRegex ? editableFlags : result.flags;

    // If editing regex and it's invalid, don't update validation
    if (isEditingRegex && !regexValidation?.ok) {
      testCaseResults = { valid: [], invalid: [] };
      return;
    }

    try {
      const regex = new RegExp(currentPattern, currentFlags);

      const validCases = isEditingTestCases ? editableValidCases : result.testCases.valid;
      const invalidCases = isEditingTestCases ? editableInvalidCases : result.testCases.invalid;

      testCaseResults = {
        valid: validCases.map((text) => {
          try {
            const matches = regex.test(text);
            return { text, matches };
          } catch (error) {
            return { text, matches: false, error: String(error) };
          }
        }),
        invalid: invalidCases.map((text) => {
          try {
            const matches = regex.test(text);
            return { text, matches };
          } catch (error) {
            return { text, matches: false, error: String(error) };
          }
        }),
      };
    } catch {
      // If regex compilation fails, mark all as errors
      const validCases = isEditingTestCases ? editableValidCases : result.testCases.valid;
      const invalidCases = isEditingTestCases ? editableInvalidCases : result.testCases.invalid;

      testCaseResults = {
        valid: validCases.map((text) => ({ text, matches: false, error: 'Invalid regex' })),
        invalid: invalidCases.map((text) => ({ text, matches: false, error: 'Invalid regex' })),
      };
    }
  }

  function applyTestCaseEdits() {
    if (!result) return;

    // Get the current default test cases for comparison
    const defaultResult = generateRegex(regexType, mode, ipv4Options, ipv6Options, crossOptions);

    // Identify custom test cases (ones not in the default set)
    customValidCases = editableValidCases.filter((testCase) => !defaultResult.testCases.valid.includes(testCase));
    customInvalidCases = editableInvalidCases.filter((testCase) => !defaultResult.testCases.invalid.includes(testCase));

    // Update result with all test cases
    result.testCases.valid = [...editableValidCases];
    result.testCases.invalid = [...editableInvalidCases];

    // Re-validate with the updated test cases
    validateTestCases();

    // Close the test case editor after applying
    isEditingTestCases = false;
    newValidCase = '';
    newInvalidCase = '';
  }

  function cancelTestCaseEditing() {
    if (!result) return;

    isEditingTestCases = false;
    editableValidCases = [...result.testCases.valid];
    editableInvalidCases = [...result.testCases.invalid];
    newValidCase = '';
    newInvalidCase = '';
  }

  // Reactive validation for editable regex only
  $effect(() => {
    if (isEditingRegex && (editablePattern || editableFlags)) {
      validateEditableRegex();
    }
  });

  // Safe real-time test case updates while editing - with debouncing and safety checks
  $effect(() => {
    if (isEditingRegex && regexValidation?.ok && editablePattern && result) {
      // Debounce the validation to avoid excessive updates
      const timeoutId = setTimeout(() => {
        try {
          // Only update if pattern is reasonably safe (not too complex)
          if (editablePattern.length < 500 && !editablePattern.includes('(.+)*')) {
            updateTestCaseValidation();
          }
        } catch (error) {
          // Ignore errors during live editing
          console.warn('Live validation error:', error);
        }
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
  });

  // Update test case validation only when result changes or when not editing
  $effect(() => {
    if (result && !isEditingRegex && !isEditingTestCases) {
      updateTestCaseValidation();
    }
  });

  // Generate initial regex
  handleRegexGeneration();
</script>

<div class="card">
  <header class="card-header">
    <h2>IP Regex Generator</h2>
    <p>Generate safe and reliable regular expressions for IPv4 and IPv6 address validation</p>
  </header>

  <!-- Mode Selection -->
  <section class="mode-section">
    <div class="mode-toggle">
      <button
        class="mode-button {mode === 'simple' ? 'active' : ''}"
        onclick={() => {
          mode = 'simple';
          handleRegexGeneration();
        }}
      >
        <Icon name="zap" size="sm" />
        Simple Mode
      </button>
      <button
        class="mode-button {mode === 'advanced' ? 'active' : ''}"
        onclick={() => {
          mode = 'advanced';
          handleRegexGeneration();
        }}
      >
        <Icon name="settings" size="sm" />
        Advanced Mode
      </button>
    </div>
  </section>

  <!-- Type Selection -->
  <section class="type-section">
    <h4>IP Address Type</h4>
    <div class="type-options">
      <label class="type-option">
        <input type="radio" bind:group={regexType} value="ipv4" onchange={handleRegexGeneration} />
        <div class="option-content">
          <Icon name="ipv6-ipv4" size="sm" />
          <span>IPv4 Only</span>
        </div>
      </label>

      <label class="type-option">
        <input type="radio" bind:group={regexType} value="ipv6" onchange={handleRegexGeneration} />
        <div class="option-content">
          <Icon name="ipv4-ipv6" size="sm" />
          <span>IPv6 Only</span>
        </div>
      </label>

      <label class="type-option">
        <input type="radio" bind:group={regexType} value="both" onchange={handleRegexGeneration} />
        <div class="option-content">
          <Icon name="network" size="sm" />
          <span>Both IPv4 & IPv6</span>
        </div>
      </label>
    </div>
  </section>

  <!-- Advanced Options -->
  {#if mode === 'advanced'}
    <section class="options-section">
      <h4>Advanced Options</h4>
      <div class="options-grid">
        {#each ADVANCED_OPTIONS as option (`${option.ipClass}-${option.key}`)}
          {#if option.showForType.includes(regexType)}
            <label class="checkbox-label checkbox-option" class:selected={getOptionValue(option)}>
              <input
                type="checkbox"
                checked={getOptionValue(option)}
                onchange={(e) => {
                  setOptionValue(option, e.currentTarget.checked);
                  handleOptionChange();
                }}
              />
              <div class="checkbox-text">
                <div class="top-line">
                  <span class="option-label">{option.label}</span>
                  <span class="ip-class">{option.ipClass}</span>
                </div>
                <span class="option-description">{option.description}</span>
              </div>
            </label>
          {/if}
        {/each}
      </div>
    </section>
  {/if}

  <!-- Results -->
  {#if result}
    <section class="results-section">
      <div class="results-header">
        <h3>Generated Pattern</h3>
      </div>

      <!-- Regex Pattern -->
      <div class="regex-output">
        {#if isEditingRegex}
          <!-- Editable Regex -->
          <div class="regex-editor">
            <div class="editor-header">
              <span class="pattern-label">Edit Regular Expression</span>
              <div class="editor-actions">
                <button
                  class="apply-button"
                  onclick={applyRegexEdits}
                  disabled={!regexValidation?.ok}
                  use:tooltip={regexValidation?.ok ? 'Apply changes' : 'Fix validation errors first'}
                >
                  <Icon name="check" size="sm" />
                  Apply
                </button>
                <button class="cancel-button" onclick={cancelRegexEditing} use:tooltip={'Cancel editing'}>
                  <Icon name="x" size="sm" />
                  Cancel
                </button>
              </div>
            </div>

            <div class="editor-fields">
              <div class="field-group">
                <label for="pattern-input">Pattern:</label>
                <input
                  id="pattern-input"
                  type="text"
                  bind:value={editablePattern}
                  class="pattern-input {regexValidation && !regexValidation.ok ? 'error' : ''}"
                  placeholder="Enter regex pattern..."
                />
              </div>

              <div class="field-group">
                <label for="flags-input">Flags:</label>
                <input
                  id="flags-input"
                  type="text"
                  bind:value={editableFlags}
                  class="flags-input {regexValidation && !regexValidation.ok ? 'error' : ''}"
                  placeholder="g, i, m, etc."
                  maxlength="10"
                />
              </div>
            </div>

            {#if regexValidation}
              {#if regexValidation.ok}
                <div class="validation-success">
                  <Icon name="check-circle" size="sm" />
                  Valid regex pattern
                </div>
              {:else}
                <div class="validation-error">
                  <Icon name="alert-circle" size="sm" />
                  {regexValidation.error}
                </div>
              {/if}
            {/if}

            <div class="pattern-preview">
              <span class="preview-label">Preview:</span>
              <code class="pattern-code">/{editablePattern || '...'}/{editableFlags}</code>
            </div>
          </div>
        {:else}
          <!-- Display Mode -->
          <div class="regex-pattern">
            <div class="pattern-header">
              <h4 class="pattern-label">Regular Expression</h4>

              <div class="results-actions">
                {#if !isEditingRegex}
                  <button class="edit-button" onclick={enableRegexEditing} use:tooltip={'Edit this regex pattern'}>
                    <Icon name="edit" size="xs" />
                    Edit Pattern
                  </button>
                {/if}
                <a
                  href={getRegexRUrl(result)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="regexr-button"
                  use:tooltip={'Test this pattern on RegexR.com'}
                >
                  <Icon name="regexr" size="xs" />
                  Test on RegexR
                </a>
                <button
                  class="copy-button {clipboard.isCopied('pattern') ? 'copied' : ''}"
                  onclick={() => result && clipboard.copy(result.pattern, 'pattern')}
                >
                  <Icon name={clipboard.isCopied('pattern') ? 'check' : 'copy'} size="sm" />
                  {clipboard.isCopied('pattern') ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <code class="pattern-code">/{result.pattern}/{result.flags}</code>
          </div>
        {/if}

        {#if result.flags}
          <div class="regex-flags">
            <span class="flags-label">Flags:</span>
            <code class="flags-code">{result.flags}</code>
            <span class="flags-description">
              {#if result.flags.includes('i')}
                Case insensitive
              {/if}
            </span>
          </div>
        {/if}

        <div class="regex-description">
          <Icon name="info" size="sm" />
          {result.description}
        </div>
      </div>

      <!-- Test Cases -->
      <div class="test-cases">
        <div class="test-cases-header">
          <h4 class="pattern-label">Test Cases</h4>
          {#if !isEditingTestCases}
            <div class="results-actions">
              <button class="edit-button" onclick={enableTestCaseEditing} use:tooltip={'Edit test cases'}>
                <Icon name="edit" size="xs" />
                Edit Test Cases
              </button>
            </div>
          {:else}
            <div class="editor-actions">
              <button class="apply-button" onclick={applyTestCaseEdits} use:tooltip={'Apply test case changes'}>
                <Icon name="check" size="sm" />
                Apply
              </button>
              <button class="cancel-button" onclick={cancelTestCaseEditing} use:tooltip={'Cancel editing'}>
                <Icon name="x" size="sm" />
                Cancel
              </button>
            </div>
          {/if}
        </div>

        <div class="test-grid">
          <div class="test-group valid">
            <h5>
              <Icon name="check-circle" size="sm" />
              Should Match ({isEditingTestCases ? editableValidCases.length : result.testCases.valid.length})
            </h5>

            {#if isEditingTestCases}
              <div class="test-editor">
                <div class="add-test-case">
                  <input
                    type="text"
                    bind:value={newValidCase}
                    placeholder="Add new valid test case..."
                    class="test-input"
                    onkeydown={(e) => e.key === 'Enter' && addValidTestCase()}
                  />
                  <button
                    class="add-button"
                    onclick={addValidTestCase}
                    disabled={!newValidCase.trim()}
                    use:tooltip={'Add test case'}
                  >
                    <Icon name="plus" size="sm" />
                  </button>
                </div>
                <div class="test-list editable">
                  {#each editableValidCases as testCase, index (`valid-${index}`)}
                    <div class="test-case-item valid">
                      <code class="test-case valid">{testCase}</code>
                      <button
                        class="remove-button"
                        onclick={() => removeValidTestCase(index)}
                        use:tooltip={'Remove test case'}
                      >
                        <Icon name="x" size="xs" />
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="test-list">
                {#each testCaseResults.valid as testResult (`valid-result-${testResult.text}`)}
                  <div class="test-case-with-status">
                    <code class="test-case valid">{testResult.text}</code>
                    <span class="test-status {testResult.matches ? 'pass' : 'fail'}">
                      {testResult.matches ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="test-group invalid">
            <h5>
              <Icon name="x-circle" size="sm" />
              Should Not Match ({isEditingTestCases ? editableInvalidCases.length : result.testCases.invalid.length})
            </h5>

            {#if isEditingTestCases}
              <div class="test-editor">
                <div class="add-test-case">
                  <input
                    type="text"
                    bind:value={newInvalidCase}
                    placeholder="Add new invalid test case..."
                    class="test-input"
                    onkeydown={(e) => e.key === 'Enter' && addInvalidTestCase()}
                  />
                  <button
                    class="add-button"
                    onclick={addInvalidTestCase}
                    disabled={!newInvalidCase.trim()}
                    use:tooltip={'Add test case'}
                  >
                    <Icon name="plus" size="sm" />
                  </button>
                </div>
                <div class="test-list editable">
                  {#each editableInvalidCases as testCase, index (`invalid-${index}`)}
                    <div class="test-case-item invalid">
                      <code class="test-case invalid">{testCase}</code>
                      <button
                        class="remove-button"
                        onclick={() => removeInvalidTestCase(index)}
                        use:tooltip={'Remove test case'}
                      >
                        <Icon name="x" size="xs" />
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="test-list">
                {#each testCaseResults.invalid as testResult (`invalid-result-${testResult.text}`)}
                  <div class="test-case-with-status">
                    <code class="test-case invalid">{testResult.text}</code>
                    <span class="test-status {!testResult.matches ? 'pass' : 'fail'}">
                      {!testResult.matches ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Pattern Info -->
      <div class="documentation">
        <h4>Pattern Info</h4>
        <div class="doc-grid">
          {#if result.tradeoffs.length > 0}
            <div class="doc-section info-panel warning">
              <h4>
                <Icon name="balance-scale" size="sm" />
                Trade-offs
              </h4>
              <ul class="doc-list">
                {#each result.tradeoffs as tradeoff (tradeoff)}
                  <li>{tradeoff}</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if result.limitations.length > 0}
            <div class="doc-section info-panel warning">
              <h4>
                <Icon name="alert-triangle" size="sm" />
                Limitations
              </h4>
              <ul class="doc-list">
                {#each result.limitations as limitation (limitation)}
                  <li>{limitation}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>

        <!-- Recommendations -->
        <div class="doc-section info-panel info">
          <h4>
            <Icon name="lightbulb" size="sm" />
            Recommendations
          </h4>
          <ul class="doc-list">
            <li>For production use, combine regex validation with dedicated IP parsing libraries</li>
            <li>Test regex performance with your expected input size and patterns</li>
            <li>Always validate regex patterns against your specific use case requirements</li>
            <li>Consider semantic validation beyond pattern matching (reserved ranges, etc.)</li>
          </ul>
        </div>
      </div>

      <!-- Implementation Examples -->
      <div class="language-examples">
        <h4>Implementation Examples</h4>
        <div class="language-accordion">
          {#each getLanguageExamples(result.pattern, result.flags) as example (example.name)}
            <div class="language-item">
              <button
                class="language-header"
                onclick={() => (openLanguageExample = openLanguageExample === example.name ? null : example.name)}
              >
                <div class="language-info">
                  <img src="https://cdn.simpleicons.org/{example.icon}" alt={example.name} class="language-icon" />
                  <span class="language-name">{example.name}</span>
                </div>
                <Icon name="chevron-down" size="sm" rotate={openLanguageExample === example.name ? 180 : 0} />
              </button>

              <div class="language-content" class:open={openLanguageExample === example.name}>
                <div class="code-container">
                  <button
                    class="copy-code-btn {clipboard.isCopied(example.name.toLowerCase()) ? 'copied' : ''}"
                    onclick={() => clipboard.copy(example.code, example.name.toLowerCase())}
                    use:tooltip={'Copy code snippet'}
                  >
                    <Icon name={clipboard.isCopied(example.name.toLowerCase()) ? 'check' : 'copy'} size="xs" />
                  </button>
                  <pre class="code-block"><code>{example.code}</code></pre>
                </div>
                {#if example.note}
                  <p class="usage-note">{example.note}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}
</div>

<style lang="scss">
  .mode-section {
    margin-bottom: var(--spacing-lg);

    .mode-toggle {
      display: flex;
      gap: var(--spacing-sm);
      justify-content: center;
    }

    .mode-button {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-lg);
      background-color: var(--bg-secondary);
      border: 2px solid var(--border-primary);
      border-radius: var(--radius-lg);
      font-weight: 600;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-primary);
        background-color: var(--surface-hover);
      }

      &.active {
        border-color: var(--color-primary);
        background-color: var(--color-primary);
        color: var(--bg-primary);
      }
    }
  }

  .type-section {
    margin-bottom: var(--spacing-lg);

    h4 {
      margin-bottom: var(--spacing-md);
    }

    .type-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-md);

      input {
        display: none;
      }
    }

    .type-option {
      display: flex;
      padding: var(--spacing-md);
      background-color: var(--bg-secondary);
      border: 2px solid var(--border-primary);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      cursor: pointer;

      &:hover {
        border-color: var(--color-primary);
      }
      &:has(input:checked) {
        border-color: var(--color-primary);
        background-color: var(--surface-hover);
      }

      .option-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-weight: 600;
      }
    }
  }

  .options-section {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);

    h4 {
      margin-bottom: var(--spacing-lg);
      color: var(--color-info-light);
    }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-md);

      .checkbox-label {
        input {
          padding: var(--spacing-sm);
          &::after {
            font-size: var(--font-size-sm);
          }
        }

        .checkbox-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;

          .top-line {
            display: flex;
            justify-content: space-between;
            width: 100%;

            .option-label {
              font-weight: 600;
              color: var(--text-primary);
            }

            .ip-class {
              color: var(--text-secondary);
              background: var(--bg-secondary);
              font-size: var(--font-size-xs);
              padding: var(--spacing-2xs) var(--spacing-xs);
              border-radius: var(--radius-sm);
              font-weight: 600;
            }
          }

          .option-description {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
          }
        }
      }

      .checkbox-option {
        align-items: flex-start;
        padding: var(--spacing-sm);
        background-color: var(--bg-tertiary);
        border: 2px solid transparent;
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);

        &:hover {
          background-color: var(--surface-hover);
        }
        &.selected {
          border-color: var(--color-primary);
          background-color: color-mix(in srgb, var(--color-primary), transparent 95%);
        }
      }
    }
  }

  .results-section {
    border-top: 1px solid var(--border-secondary);
    padding-top: var(--spacing-lg);

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);

      h3 {
        margin: 0;
      }
    }

    .results-actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      .edit-button,
      .regexr-button {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-xs) var(--spacing-sm);
        // background-color: var(--color-primary);
        background: var(--bg-secondary);
        color: var(--text-secondary);
        text-decoration: none;
        border-radius: var(--radius-md);
        font-weight: 600;
        transition: all var(--transition-fast);
        &:hover {
          filter: brightness(0.9);
          transform: translateY(-1px);
        }
      }

      .edit-button {
        background: var(--color-info);
        color: var(--bg-primary);
      }
      .regexr-button {
        background: var(--color-warning);
        color: var(--bg-primary);
      }
      .copy-button {
        background: var(--color-success);
        color: var(--bg-primary);
      }
    }

    // Shared button styles
    .apply-button,
    .cancel-button {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 600;
      transition: all var(--transition-fast);

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .apply-button {
      background-color: var(--color-success);
      color: var(--bg-primary);

      &:hover:not(:disabled) {
        background-color: var(--color-success-light);
      }
    }

    .cancel-button {
      background-color: var(--color-error);
      color: var(--bg-primary);

      &:hover {
        background-color: var(--color-error-light);
      }
    }

    .regex-output {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);

      .regex-pattern {
        margin-bottom: var(--spacing-md);

        .pattern-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);

          .pattern-label {
            font-weight: 600;
            font-size: var(--font-size-sm);
          }
        }

        .pattern-code {
          display: block;
          font-family: var(--font-mono);
          font-size: var(--font-size-lg);
          font-weight: 600;
          color: var(--color-primary-light);
          background-color: var(--bg-primary);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          word-break: break-all;
          line-height: 1.4;
        }
      }

      .regex-flags {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
        font-size: var(--font-size-sm);

        .flags-label {
          color: var(--text-secondary);
          font-weight: 600;
        }

        .flags-code {
          font-family: var(--font-mono);
          color: var(--color-warning-light);
          font-weight: 600;
        }

        .flags-description {
          color: var(--text-secondary);
          font-style: italic;
        }
      }

      .regex-description {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        color: var(--text-secondary);
        font-style: italic;
      }

      // Regex Editor Styles
      .regex-editor {
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);

          .editor-actions {
            display: flex;
            gap: var(--spacing-xs);
          }
        }

        .editor-fields {
          display: grid;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);

          .field-group {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);

            label {
              font-weight: 600;
              font-size: var(--font-size-sm);
              color: var(--text-primary);
            }

            .pattern-input,
            .flags-input {
              padding: var(--spacing-sm);
              border: 2px solid var(--border-primary);
              border-radius: var(--radius-sm);
              background-color: var(--bg-primary);
              font-family: var(--font-mono);
              font-size: var(--font-size-sm);
              transition: border-color var(--transition-fast);

              &:focus {
                outline: none;
                border-color: var(--color-primary);
              }

              &.error {
                border-color: var(--color-error);
              }
            }

            .pattern-input {
              min-width: 300px;
            }

            .flags-input {
              max-width: 150px;
            }
          }
        }

        .validation-success,
        .validation-error {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          margin-bottom: var(--spacing-md);
        }

        .validation-success {
          background-color: color-mix(in srgb, var(--color-success), transparent 90%);
          color: var(--color-success-light);
          border: 1px solid var(--color-success);
        }

        .validation-error {
          background-color: color-mix(in srgb, var(--color-error), transparent 90%);
          color: var(--color-error-light);
          border: 1px solid var(--color-error);
        }

        .pattern-preview {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);

          .preview-label {
            font-weight: 600;
            font-size: var(--font-size-sm);
          }
        }
      }
    }

    .copy-button {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      transition: all var(--transition-fast);
      &.copied {
        background-color: var(--color-success);
        color: var(--bg-primary);
        border-color: var(--color-success);
      }
    }

    .test-cases {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);

      .test-cases-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-sm);

        .pattern-label {
          font-weight: 600;
          font-size: var(--font-size-sm);
          margin: 0;
        }
      }
    }

    .documentation,
    .language-examples {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
      gap: var(--spacing-md);
      display: flex;
      flex-direction: column;

      > h4 {
        margin: 0;
        font-weight: 600;
        font-size: var(--font-size-sm);
      }
    }

    .language-accordion {
      .language-item {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-sm);
        overflow: hidden;

        .language-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: none;
          border: none;
          transition: background-color var(--transition-fast);

          &:hover {
            background-color: var(--surface-hover);
          }

          .language-info {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);

            .language-icon {
              width: 1.25rem;
              height: 1.25rem;
            }

            .language-name {
              font-weight: 600;
              color: var(--text-primary);
            }
          }
        }

        .language-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;

          &.open {
            max-height: 500px;
          }

          .code-container {
            position: relative;
            background-color: var(--bg-secondary);
            border-top: 1px solid var(--border-secondary);

            .copy-code-btn {
              position: absolute;
              top: var(--spacing-sm);
              right: var(--spacing-sm);
              z-index: 1;
              background-color: var(--bg-secondary);
              border: 1px solid var(--border-primary);
              border-radius: var(--radius-sm);
              padding: var(--spacing-xs);
              transition: all var(--transition-fast);

              &:hover {
                background-color: var(--surface-hover);
              }

              &.copied {
                background-color: var(--color-success);
                color: var(--bg-primary);
                border-color: var(--color-success);
              }
            }

            .code-block {
              background-color: var(--bg-primary);
              padding: var(--spacing-md);
              margin: 0;
              font-family: var(--font-mono);
              font-size: var(--font-size-sm);
              line-height: 1.5;
              overflow-x: auto;
              color: var(--text-primary);

              code {
                background: none;
                padding: 0;
                font-family: inherit;
                font-size: inherit;
                color: inherit;
              }
            }
          }

          .usage-note {
            background-color: var(--bg-secondary);
            padding: var(--spacing-sm) var(--spacing-md);
            margin: 0;
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            font-style: italic;
            border-top: 1px solid var(--border-secondary);
          }
        }
      }
    }

    .test-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);

      .test-group {
        h5 {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-md);
          font-size: var(--font-size-md);
          font-weight: 600;
        }

        &.valid h5 {
          color: var(--color-success-light);
        }
        &.invalid h5 {
          color: var(--color-error-light);
        }

        .test-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);

          .test-case {
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
            font-size: var(--font-size-sm);

            &.valid {
              background-color: var(--color-success);
              color: var(--bg-primary);
            }

            &.invalid {
              background-color: var(--color-error);
              color: var(--bg-primary);
            }
          }

          .test-case-with-status {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-xs);

            .test-case {
              flex: 1;
              margin: 0;
            }

            .test-status {
              font-size: var(--font-size-xs);
              font-weight: 700;
              padding: var(--spacing-2xs) var(--spacing-xs);
              border-radius: var(--radius-xs);
              min-width: 2.5rem;
              text-align: center;

              &.pass {
                color: var(--color-success-light);
                background-color: color-mix(in srgb, var(--color-success), transparent 85%);
              }

              &.fail {
                color: var(--color-error-light);
                background-color: color-mix(in srgb, var(--color-error), transparent 85%);
              }
            }
          }
        }

        .test-editor {
          .add-test-case {
            display: flex;
            gap: var(--spacing-xs);
            margin-bottom: var(--spacing-sm);

            .test-input {
              flex: 1;
              padding: var(--spacing-xs) var(--spacing-sm);
              border: 2px solid var(--border-primary);
              border-radius: var(--radius-sm);
              background-color: var(--bg-primary);
              font-family: var(--font-mono);
              font-size: var(--font-size-sm);
              transition: border-color var(--transition-fast);

              &:focus {
                outline: none;
                border-color: var(--color-primary);
              }

              &::placeholder {
                color: var(--text-secondary);
                font-style: italic;
              }
            }

            .add-button {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: var(--spacing-xs);
              background-color: var(--color-primary);
              color: var(--bg-primary);
              border-radius: var(--radius-sm);
              transition: all var(--transition-fast);
              min-width: 2.5rem;

              &:hover:not(:disabled) {
                background-color: var(--color-primary-dark);
              }

              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }
            }
          }

          .test-list.editable {
            .test-case-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: var(--spacing-xs);
              padding: var(--spacing-xs);
              background-color: var(--bg-tertiary);
              border-radius: var(--radius-sm);
              transition: all var(--transition-fast);

              &:hover {
                background-color: var(--surface-hover);
              }

              .test-case {
                margin: 0;
                flex: 1;
              }

              .remove-button {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--spacing-2xs);
                background-color: var(--color-error);
                color: var(--bg-primary);
                border-radius: var(--radius-xs);
                transition: all var(--transition-fast);
                margin-left: var(--spacing-sm);
                min-width: 1.5rem;
                height: 1.5rem;

                &:hover {
                  background-color: var(--color-error-light);
                  transform: scale(1.1);
                }
              }
            }
          }
        }
      }
    }

    .doc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--spacing-lg);

      .doc-section h4 {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-md);
        font-size: var(--font-size-md);
      }

      .doc-section.warning h4 {
        color: var(--color-warning-light);
      }

      .doc-list {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          padding: var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-sm);

          &::before {
            content: '•';
            color: var(--color-warning);
            display: inline-block;
            font-size: var(--font-size-md);
            line-height: 1;
            margin-right: var(--spacing-xs);
          }
        }
      }
    }
  }

  @media (max-width: 768px) {
    .mode-section .mode-toggle {
      flex-direction: column;
    }
    .type-section .type-options {
      grid-template-columns: 1fr;
    }
    .options-section .options-grid {
      grid-template-columns: 1fr;
    }
    .results-section {
      .test-grid,
      .doc-grid {
        grid-template-columns: 1fr;
      }

      .results-header,
      .regex-output .pattern-header {
        flex-direction: column;
        gap: var(--spacing-sm);
        align-items: stretch;
      }

      .results-header {
        gap: var(--spacing-md);
      }
    }
  }
</style>
