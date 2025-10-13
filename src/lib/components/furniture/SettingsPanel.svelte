<script lang="ts">
  import { slide } from 'svelte/transition';
  import Icon from '$lib/components/global/Icon.svelte';
  import { accessibility, type AccessibilityOption } from '$lib/stores/accessibility';
  import { tooltip } from '$lib/actions/tooltip';
  import { theme, themes, type ThemeOption, type Theme } from '$lib/stores/theme';
  import { navbarDisplay, navbarDisplayOptions, type NavbarDisplayMode } from '$lib/stores/navbarDisplay';
  import { homepageLayout, homepageLayoutOptions, type HomepageLayoutMode } from '$lib/stores/homepageLayout';
  import { customCss } from '$lib/stores/customCss';
  import { siteCustomization } from '$lib/stores/siteCustomization';
  import { primaryColor } from '$lib/stores/primaryColor';

  interface Props {
    standalone?: boolean;
    onClose?: () => void;
  }

  let { standalone = false, onClose }: Props = $props();

  let showMoreA11y = $state(standalone);
  let showMoreThemes = $state(standalone);
  let accessibilitySettings = $state(accessibility);
  let currentTheme = $state(theme);
  let currentNavbarDisplay = $state(navbarDisplay);
  let currentHomepageLayout = $state(homepageLayout);
  let currentCustomCss = $state(customCss);
  let cssInput = $state('');
  let validationErrors = $state<string[]>([]);
  let validationWarnings = $state<string[]>([]);
  let lastStoreValue = $state('');
  let siteTitleInput = $state('');
  let siteDescriptionInput = $state('');
  let siteIconUrlInput = $state('');
  let primaryColorInput = $state('');
  let lastColorStoreValue = $state('');
  let siteCustomizationErrors = $state<string[]>([]);
  let showCustomColorInput = $state(false);

  // Preset color palette - bright & vivid
  const colorPalette = [
    '#1a75ff',
    '#7711ff',
    '#dd11ff',
    '#ff1aaa',
    '#ff1a1a',
    '#ff4422',
    '#ff7711',
    '#ffaa00',
    '#ffdd00',
    '#aadd00',
    '#11dd00',
    '#00ff77',
    '#00dddd',
    '#11bbff',
    '#44aaff',
    '#7777ff',
  ];

  // Sync cssInput with store when store changes (not when textarea changes)
  $effect(() => {
    if ($currentCustomCss !== lastStoreValue) {
      cssInput = $currentCustomCss;
      lastStoreValue = $currentCustomCss;
    }
  });

  // Sync site customization inputs with store
  $effect(() => {
    siteTitleInput = $siteCustomization.title;
    siteDescriptionInput = $siteCustomization.description;
    siteIconUrlInput = $siteCustomization.iconUrl;
  });

  // Sync primary color input with store (only when store changes)
  $effect(() => {
    if ($primaryColor !== lastColorStoreValue) {
      primaryColorInput = $primaryColor;
      lastColorStoreValue = $primaryColor;
    }
  });

  // Language selection
  let selectedLanguage = $state('en');
  const languages = [
    { code: 'en', name: 'English', available: true, flag: '🇺🇸' },
    { code: 'es', name: 'Español', available: false, flag: '🇪🇸' },
    { code: 'fr', name: 'Français', available: false, flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', available: false, flag: '🇩🇪' },
  ];

  // Handle theme change
  function handleThemeChange(themeId: ThemeOption) {
    theme.setTheme(themeId);
  }

  // Handle accessibility setting toggle
  function handleAccessibilityToggle(optionId: string) {
    accessibility.toggle(optionId);
  }

  // Handle navbar display mode change
  function handleNavbarDisplayChange(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    navbarDisplay.setMode(target.value as NavbarDisplayMode);
  }

  // Handle homepage layout mode change
  function handleHomepageLayoutChange(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    homepageLayout.setMode(target.value as HomepageLayoutMode);
  }

  // Primary accessibility options (always visible)
  const primaryA11yOptions = ['reduce-motion'];

  // Get filtered accessibility options
  const primaryOptions = $derived($accessibilitySettings.options.filter((opt) => primaryA11yOptions.includes(opt.id)));

  const additionalOptions = $derived(
    $accessibilitySettings.options.filter((opt) => !primaryA11yOptions.includes(opt.id)),
  );

  // Handle link clicks to close menu
  function handleLinkClick() {
    onClose?.();
  }

  // Handle custom CSS changes
  function handleApplyCustomCss() {
    const validation = customCss.validate(cssInput);
    validationErrors = validation.errors;
    validationWarnings = validation.warnings;

    if (validation.isValid) {
      customCss.set(cssInput);
    }
  }

  function handleClearCustomCss() {
    cssInput = '';
    customCss.clear();
    validationErrors = [];
    validationWarnings = [];
  }

  // Handle site customization
  function handleApplySiteCustomization() {
    const data = {
      title: siteTitleInput.trim(),
      description: siteDescriptionInput.trim(),
      iconUrl: siteIconUrlInput.trim(),
    };

    const validation = siteCustomization.validate(data);
    siteCustomizationErrors = validation.errors;

    if (validation.isValid) {
      siteCustomization.set(data);
      // Reload to apply title/description/icon changes
      window.location.reload();
    }
  }

  // Auto-save color when changed (only when user changes it, store validates)
  $effect(() => {
    const trimmed = primaryColorInput.trim();
    // Only save if different from store (prevents loop) - store handles validation
    if (trimmed && trimmed !== $primaryColor) {
      primaryColor.set(trimmed);
      lastColorStoreValue = trimmed;
    } else if (!trimmed && $primaryColor) {
      primaryColor.clear();
      lastColorStoreValue = '';
    }
  });

  // Reset color to default
  function handleResetColor() {
    primaryColorInput = '';
  }

  function handleClearSiteCustomization() {
    siteCustomization.clear();
    siteCustomizationErrors = [];
    // Reload to apply changes
    window.location.reload();
  }
</script>

{#snippet accessibilityOption(option: AccessibilityOption)}
  <label class="toggle-option" use:tooltip={option.description}>
    <input
      type="checkbox"
      checked={option.enabled}
      onchange={() => handleAccessibilityToggle(option.id)}
      aria-describedby="a11y-{option.id}-desc"
    />
    <span class="toggle-slider"></span>
    <div class="toggle-content">
      <span>{option.name}</span>
      <small id="a11y-{option.id}-desc" class="toggle-description">{option.description}</small>
    </div>
  </label>
{/snippet}

{#snippet themeButton(themeOption: Theme)}
  <button
    class="theme-option"
    class:active={$currentTheme === themeOption.id}
    class:disabled={!themeOption.available}
    onclick={() => handleThemeChange(themeOption.id)}
    role="radio"
    aria-checked={$currentTheme === themeOption.id}
    disabled={!themeOption.available}
  >
    <div class="theme-preview theme-preview-{themeOption.id}"></div>
    <span>
      {themeOption.name}
      {!themeOption.available ? ' (Soon)' : ''}
    </span>
  </button>
{/snippet}

<div class="settings-panel" class:standalone>
  <!-- Theme Selection -->
  <div class="settings-section theme-section">
    <h3>Theme</h3>
    <div class="theme-options" role="radiogroup" aria-label="Theme selection">
      <!-- Primary themes (always visible - first 6) -->
      {#each themes.slice(0, 6) as themeOption (themeOption.id)}
        {@render themeButton(themeOption)}
      {/each}

      <!-- Additional themes (expandable if more than 6) -->
      {#if showMoreThemes && themes.length > 6}
        <div class="additional-themes" transition:slide={{ duration: 300 }}>
          {#each themes.slice(6) as themeOption (themeOption.id)}
            {@render themeButton(themeOption)}
          {/each}
        </div>
      {/if}
    </div>

    <!-- Show more/less button (only if there are more than 6 themes) -->
    {#if themes.length > 6 && !standalone}
      <button class="show-more-btn" onclick={() => (showMoreThemes = !showMoreThemes)} aria-expanded={showMoreThemes}>
        <Icon name={showMoreThemes ? 'chevron-up' : 'chevron-down'} size="sm" />
        <span>{showMoreThemes ? 'Show less' : 'Show more themes'}</span>
      </button>
    {/if}
  </div>

  <!-- Language Selection -->
  <div class="settings-section language-section">
    <h3>Language</h3>
    <div class="language-dropdown">
      {#each languages as lang (lang.code)}
        <button
          class="language-option"
          class:active={selectedLanguage === lang.code}
          class:disabled={!lang.available}
          onclick={() => (selectedLanguage = lang.code)}
          disabled={!lang.available}
        >
          {lang.flag}
          {lang.name}
        </button>
      {/each}
    </div>
  </div>

  <!-- Homepage Layout -->
  <div class="settings-section homepage-layout-section">
    <h3>Homepage Layout</h3>
    <div class="navbar-select-wrapper">
      <select class="navbar-select" value={$currentHomepageLayout} onchange={handleHomepageLayoutChange}>
        {#each homepageLayoutOptions as option (option.id)}
          <option value={option.id}>{option.name}</option>
        {/each}
      </select>
      <div class="dropdown-icon">
        <Icon name="chevron-down" size="xs" />
      </div>
    </div>
    <small class="navbar-description">
      {homepageLayoutOptions.find((opt) => opt.id === $currentHomepageLayout)?.description}
    </small>
  </div>

  <!-- Navbar Display -->
  <div class="settings-section navbar-display-section">
    <h3>Top Navigation</h3>
    <div class="navbar-select-wrapper">
      <select class="navbar-select" value={$currentNavbarDisplay} onchange={handleNavbarDisplayChange}>
        {#each navbarDisplayOptions as option (option.id)}
          <option value={option.id}>{option.name}</option>
        {/each}
      </select>
      <div class="dropdown-icon">
        <Icon name="chevron-down" size="xs" />
      </div>
    </div>
    <small class="navbar-description">
      {navbarDisplayOptions.find((opt) => opt.id === $currentNavbarDisplay)?.description}
    </small>
  </div>

  <!-- Accessibility Options -->
  <div class="settings-section accessibility-section">
    <h3>Accessibility</h3>
    <div class="accessibility-options">
      <!-- Primary options (always visible) -->
      {#each primaryOptions as option (option.id)}
        {@render accessibilityOption(option)}
      {/each}

      <!-- Expandable additional options -->
      {#if showMoreA11y}
        <div class="additional-options" transition:slide={{ duration: 300 }}>
          {#each additionalOptions as option (option.id)}
            {@render accessibilityOption(option)}
          {/each}
        </div>
      {/if}

      <!-- Show more/less button -->
      {#if !standalone}
        <button class="show-more-btn" onclick={() => (showMoreA11y = !showMoreA11y)} aria-expanded={showMoreA11y}>
          <Icon name={showMoreA11y ? 'chevron-up' : 'chevron-down'} size="sm" />
          <span>{showMoreA11y ? 'Show less' : 'Show all a11y options'}</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Site Customization (only in standalone mode) -->
  {#if standalone}
    <div class="settings-section site-branding-section">
      <h3>Site Branding</h3>
      <p class="section-description">Customize the site title, description, and icon.</p>

      <div class="form-field">
        <label for="site-title">Site Title</label>
        <input
          id="site-title"
          type="text"
          bind:value={siteTitleInput}
          placeholder="Networking Toolbox"
          maxlength="100"
        />
      </div>

      <div class="form-field">
        <label for="site-description">Description</label>
        <input
          id="site-description"
          type="text"
          bind:value={siteDescriptionInput}
          placeholder="Your companion for all-things networking"
          maxlength="300"
        />
      </div>

      <div class="form-field">
        <label for="site-icon-url">Icon URL</label>
        <input
          id="site-icon-url"
          type="text"
          bind:value={siteIconUrlInput}
          placeholder="/favicon.svg or https://example.com/icon.png"
        />
      </div>

      {#if siteCustomizationErrors.length > 0}
        <div class="validation-messages errors">
          <Icon name="alert-triangle" size="sm" />
          <div>
            {#each siteCustomizationErrors as error (error)}
              <p>{error}</p>
            {/each}
          </div>
        </div>
      {/if}

      <div class="css-actions">
        <button class="action-btn apply" onclick={handleApplySiteCustomization}>
          <Icon name="check" size="sm" />
          Apply
        </button>
        <button class="action-btn clear" onclick={handleClearSiteCustomization}>
          <Icon name="x" size="sm" />
          Reset
        </button>
      </div>
    </div>

    <!-- Primary Color (only in standalone mode) -->
    <div class="settings-section color-section">
      <h3>Primary Color</h3>
      <p class="section-description">Choose a primary color for the interface.</p>

      <div class="color-palette">
        {#each colorPalette as color (color)}
          <button
            class="color-swatch"
            class:active={primaryColorInput === color}
            style="background-color: {color};"
            onclick={() => (primaryColorInput = color)}
            aria-label="Select color {color}"
          ></button>
        {/each}
      </div>

      <div class="color-actions">
        <button class="custom-color-toggle" onclick={() => (showCustomColorInput = !showCustomColorInput)}>
          <Icon name="palette" size="sm" />
          Use Custom Color
        </button>
        <button class="action-btn clear" onclick={handleResetColor}>
          <Icon name="undo" size="sm" />
          Reset
        </button>
      </div>

      {#if showCustomColorInput}
        <div class="custom-color-inputs" transition:slide={{ duration: 200 }}>
          <div class="color-picker-wrapper">
            <label for="color-picker">Color Picker</label>
            <input id="color-picker" type="color" bind:value={primaryColorInput} />
          </div>
          <div class="form-field">
            <label for="custom-hex">Hex Code</label>
            <input id="custom-hex" type="text" bind:value={primaryColorInput} placeholder="#2563eb" maxlength="7" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Custom CSS (only in standalone mode) -->
    <div class="settings-section custom-css-section">
      <h3>Custom CSS</h3>
      <p class="section-description">Add your own CSS to customize the appearance globally.</p>

      <textarea
        bind:value={cssInput}
        class="css-editor"
        placeholder="/* Enter your custom CSS here */"
        spellcheck="false"
        rows="10"
      ></textarea>

      <div class="css-meta">
        <span class="char-count">{cssInput.length} characters</span>
      </div>

      {#if validationErrors.length > 0}
        <div class="validation-messages errors">
          <Icon name="alert-triangle" size="sm" />
          <div>
            {#each validationErrors as error (error)}
              <p>{error}</p>
            {/each}
          </div>
        </div>
      {/if}

      {#if validationWarnings.length > 0}
        <div class="validation-messages warnings">
          <Icon name="alert-circle" size="sm" />
          <div>
            {#each validationWarnings as warning (warning)}
              <p>{warning}</p>
            {/each}
          </div>
        </div>
      {/if}

      <div class="css-actions">
        <button class="action-btn apply" onclick={handleApplyCustomCss}>
          <Icon name="check" size="sm" />
          Apply
        </button>
        <button class="action-btn clear" onclick={handleClearCustomCss}>
          <Icon name="undo" size="sm" />
          Clear
        </button>
      </div>
    </div>
  {/if}

  <!-- Navigation Links (only in dropdown mode) -->
  {#if !standalone}
    <div class="settings-section settings-links">
      <a class="settings-link" href="/settings" onclick={handleLinkClick}>
        <Icon name="settings" size="sm" />
        <span>More Settings</span>
      </a>
    </div>
  {/if}
</div>

<style lang="scss">
  .settings-panel {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: var(--spacing-md);

    &:not(.standalone) {
      position: absolute;
      top: calc(100% + var(--spacing-xs));
      right: 0;
      width: 16rem;
      z-index: 1000;
      animation: slideIn var(--transition-slow);

      @media (max-width: 768px) {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        animation: slideUp var(--transition-slow);
      }
    }

    &.standalone {
      margin: 0 auto;
      border: none;
      box-shadow: none;
      background: transparent;
      padding: 0;

      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--spacing-lg);

      .settings-section {
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin: 0;

        &.theme-section {
          grid-row: span 2;
        }
        &.accessibility-section {
          grid-row: span 2;
        }
        &.site-branding-section {
          grid-column: span 2;
        }
        &.color-section {
          grid-row: span 1;
        }
        &.custom-css-section {
          grid-column: span 2;
        }

        @media (max-width: 768px) {
          &.theme-section,
          &.accessibility-section,
          &.site-branding-section,
          &.color-section,
          &.custom-css-section {
            grid-row: span 1;
            grid-column: span 1;
          }
        }
      }

      .theme-options {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      }
    }
  }

  .settings-section {
    &:not(:last-child) {
      margin-bottom: var(--spacing-md);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-primary);
    }

    h3 {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm) 0;
    }

    .standalone & {
      h3 {
        font-size: var(--font-size-lg);
        margin-bottom: var(--spacing-md);
      }
    }
  }

  .theme-options,
  .additional-themes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: var(--spacing-xs);
    .additional-themes {
      grid-column: 1 / -1;
    }
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-normal);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);

    &:hover:not(.disabled) {
      background: var(--surface-hover);
      border-color: var(--border-secondary);
    }

    &.active {
      background: color-mix(in srgb, var(--color-primary), transparent 90%);
      border-color: var(--color-primary);
      color: var(--text-primary);
    }

    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .theme-preview {
    width: 1.5rem;
    height: 1rem;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-secondary);
    &.theme-preview-light {
      background: linear-gradient(135deg, #f4f2fa 50%, #fff 50%);
    }
    &.theme-preview-dark {
      background: linear-gradient(135deg, #0d1117 50%, #161b22 50%);
    }
    &.theme-preview-ocean {
      background: linear-gradient(135deg, #131c2b 50%, #70edb7 50%);
    }
    &.theme-preview-purple {
      background: linear-gradient(135deg, #13182b 50%, #cca6ff 50%);
    }
    &.theme-preview-cyberpunk {
      background: linear-gradient(135deg, #000308 30%, #f700ff 70%);
      box-shadow: 0 0 8px rgba(0, 255, 204, 0.4);
    }
    &.theme-preview-midnight {
      background: linear-gradient(135deg, #0a0e27 50%, #5e72e4 50%);
    }
    &.theme-preview-arctic {
      background: linear-gradient(135deg, #f0f4f8 50%, #00acc1 50%);
    }
    &.theme-preview-terminal {
      background: linear-gradient(135deg, #000000 50%, #00ff00 50%);
    }
    &.theme-preview-lightpurple {
      background: linear-gradient(135deg, #fafafa 50%, #cca6ff 50%);
    }
    &.theme-preview-muteddark {
      background: linear-gradient(135deg, #21252b 50%, #f1f86d 50%);
    }
    &.theme-preview-solarized {
      background: linear-gradient(135deg, #002b36 50%, #268bd2 50%);
    }
  }

  .language-dropdown {
    gap: var(--spacing-xs);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  }

  .language-option {
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    text-align: left;
    cursor: pointer;
    transition: all var(--transition-normal);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);

    &:hover:not(.disabled) {
      background: var(--surface-hover);
      color: var(--text-primary);
    }

    &.active {
      background: color-mix(in srgb, var(--color-primary), transparent 90%);
      border-color: var(--color-primary);
      color: var(--text-primary);
    }

    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .navbar-select-wrapper {
    position: relative;
    display: block;

    .dropdown-icon {
      position: absolute;
      right: var(--spacing-sm);
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
      width: 0.75rem;
      height: 0.75rem;
      z-index: 1;
    }
  }

  .navbar-select {
    width: 100%;
    padding: var(--spacing-sm) 2rem var(--spacing-sm) var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-normal);
    appearance: none;
    position: relative;

    &:hover {
      background: var(--surface-hover);
      border-color: var(--border-secondary);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 85%);
    }

    &:focus ~ .dropdown-icon {
      color: var(--color-primary);
      transform: translateY(-50%) rotate(180deg);
    }

    &:hover ~ .dropdown-icon {
      color: var(--text-primary);
    }

    option {
      background: var(--bg-secondary);
      color: var(--text-primary);
      padding: var(--spacing-sm);

      &:hover {
        background: var(--surface-hover);
      }

      &:checked {
        background: color-mix(in srgb, var(--color-primary), transparent 90%);
        color: var(--text-primary);
      }
    }
  }

  .navbar-description {
    color: var(--text-tertiary);
    font-size: var(--font-size-xs);
    line-height: 1.3;
    margin-top: var(--spacing-xs);
    display: none;

    .standalone & {
      display: block;
    }
  }

  .accessibility-options {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .toggle-option {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    padding: var(--spacing-xs) 0;

    input[type='checkbox'] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;

      &:checked + .toggle-slider {
        background: var(--color-primary);

        &::before {
          transform: translateX(1rem);
        }
      }

      &:focus + .toggle-slider {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
    }

    .toggle-slider {
      position: relative;
      width: 2rem;
      height: 1.125rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: 1rem;
      transition: all var(--transition-normal);
      flex-shrink: 0;
      margin-top: 0.125rem;

      &::before {
        content: '';
        position: absolute;
        top: 1px;
        left: 1px;
        width: 0.875rem;
        height: 0.875rem;
        background: var(--bg-primary);
        border-radius: 50%;
        transition: transform var(--transition-normal);
      }
    }

    .toggle-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      min-width: 0;
      flex: 1;
      font-weight: 400;
      .toggle-description {
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
        line-height: 1.3;

        .standalone & {
          display: block;
        }
      }
    }
  }

  .additional-options {
    overflow: hidden;
  }

  .show-more-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    width: 100%;
    padding: var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all var(--transition-normal);
    margin-top: var(--spacing-sm);
    justify-content: center;

    &:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
      border-color: var(--border-secondary);
    }

    &[aria-expanded='true'] {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
  }

  .settings-links {
    border-bottom: none;
    padding-bottom: 0;
    margin: 0;
    .settings-link {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-normal);
      font-size: var(--font-size-sm);
      justify-content: center;
      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
    }
  }

  .site-branding-section,
  .color-section,
  .custom-css-section {
    .section-description {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-md) 0;
    }
  }

  .site-branding-section,
  .color-section {
    .form-field {
      margin-bottom: var(--spacing-md);

      label {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
      }

      input {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-sm);
        color: var(--text-primary);
        transition: all var(--transition-normal);

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 85%);
        }

        &::placeholder {
          color: var(--text-tertiary);
        }
      }
    }
  }

  .color-section {
    .color-palette {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(30px, 1fr));
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
      width: 100%;
    }

    .color-swatch {
      aspect-ratio: 1;
      border: 2px solid transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-normal);
      position: relative;
      outline: 1px solid var(--border-primary);

      &:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      &.active {
        outline: 2px solid var(--text-primary);
        box-shadow: 0 0 0 3px var(--bg-secondary);

        &::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
          text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
        }
      }
    }

    .color-actions {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }

    .custom-color-toggle {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all var(--transition-normal);

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
        border-color: var(--border-secondary);
      }
    }

    .custom-color-inputs {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
      overflow: hidden;

      @media (max-width: 768px) {
        flex-direction: column;
      }
    }

    .color-picker-wrapper {
      flex: 0 0 auto;

      label {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
      }

      input[type='color'] {
        width: 80px;
        height: 40px;
        padding: 2px;
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        cursor: pointer;
        background: var(--bg-tertiary);

        &:hover {
          border-color: var(--border-secondary);
        }

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 85%);
        }
      }
    }
  }

  .action-btn {
    display: flex;
    align-items: center;
    display: inline-flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-normal);
    border: 1px solid var(--border-primary);

    &.apply {
      background: var(--color-primary);
      color: var(--bg-primary);
      border-color: var(--color-primary);

      &:hover {
        background: color-mix(in srgb, var(--color-primary), black 10%);
        border-color: color-mix(in srgb, var(--color-primary), black 10%);
      }
    }

    &.clear {
      background: transparent;
      color: var(--text-secondary);

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
        border-color: var(--border-secondary);
      }
    }
  }

  .custom-css-section {
    .css-editor {
      width: 100%;
      min-height: 200px;
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      font-family: 'Courier New', monospace;
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      resize: vertical;
      transition: all var(--transition-normal);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 85%);
      }

      &::placeholder {
        color: var(--text-tertiary);
      }
    }

    .css-meta {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--spacing-xs);

      .char-count {
        font-size: var(--font-size-xs);
        color: var(--text-tertiary);
      }
    }

    .validation-messages {
      display: flex;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-sm);
      margin-top: var(--spacing-md);
      font-size: var(--font-size-sm);
      line-height: 1.4;

      :global(svg) {
        flex-shrink: 0;
        margin-top: 0.125rem;
      }

      p {
        margin: 0;
        &:not(:last-child) {
          margin-bottom: var(--spacing-xs);
        }
      }

      &.errors {
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--color-error), transparent 90%),
          color-mix(in srgb, var(--color-error), transparent 95%)
        );
        border: 1px solid color-mix(in srgb, var(--color-error), transparent 70%);
        color: var(--color-error);
      }

      &.warnings {
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--color-warning), transparent 90%),
          color-mix(in srgb, var(--color-warning), transparent 95%)
        );
        border: 1px solid color-mix(in srgb, var(--color-warning), transparent 70%);
        color: var(--color-warning);
      }
    }

    .css-actions {
      display: flex;
      gap: var(--spacing-sm);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
