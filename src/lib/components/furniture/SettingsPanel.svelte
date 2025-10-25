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
  import { fontScale, fontScaleOptions, type FontScaleLevel } from '$lib/stores/fontScale';
  import { storage } from '$lib/utils/localStorage';
  import * as config from '$lib/config/customizable-settings';
  import SegmentedControl from '$lib/components/global/SegmentedControl.svelte';

  interface Props {
    standalone?: boolean;
    onClose?: () => void;
  }

  let { standalone = false, onClose }: Props = $props();

  // UI State
  let showMoreA11y = $state(standalone);
  let showMoreThemes = $state(standalone);
  let showCustomColorInput = $state(false);
  let selectedLanguage = $state('en');

  // Store subscriptions
  let accessibilitySettings = $state(accessibility);
  let currentTheme = $state(theme);
  let currentNavbarDisplay = $state(navbarDisplay);
  let currentHomepageLayout = $state(homepageLayout);
  let currentCustomCss = $state(customCss);
  let currentFontScale = $state(fontScale);

  // Form inputs
  let cssInput = $state('');
  let siteTitleInput = $state('');
  let siteDescriptionInput = $state('');
  let siteIconUrlInput = $state('');
  let primaryColorInput = $state('');

  // Validation & sync state
  let validationErrors = $state<string[]>([]);
  let validationWarnings = $state<string[]>([]);
  let siteCustomizationErrors = $state<string[]>([]);
  let lastStoreValue = $state('');
  let lastColorStoreValue = $state('');
  let envVarsCopied = $state(false);
  let envFormat = $state<'env' | 'docker'>('env');
  let showExportSettings = $state(false);
  let showExportStyles = $state(false);

  // Constants
  const PRIMARY_A11Y_OPTIONS: string[] = [];
  const COLOR_PALETTE = [
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
  const LANGUAGES = [
    { code: 'en', name: 'English', available: true, flag: '🇺🇸' },
    { code: 'es', name: 'Español', available: false, flag: '🇪🇸' },
    { code: 'fr', name: 'Français', available: false, flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', available: false, flag: '🇩🇪' },
  ];

  // Derived state
  const primaryOptions = $derived(
    $accessibilitySettings.options.filter((opt) => PRIMARY_A11Y_OPTIONS.includes(opt.id)),
  );
  // const primaryOptions = $derived(
  //   $accessibilitySettings.options.filter((opt) => PRIMARY_A11Y_OPTIONS.includes(opt.id)),
  // );
  const additionalOptions = $derived(
    $accessibilitySettings.options.filter((opt) => !PRIMARY_A11Y_OPTIONS.includes(opt.id)),
  );

  // Sync effects
  $effect(() => {
    if ($currentCustomCss !== lastStoreValue) {
      cssInput = $currentCustomCss;
      lastStoreValue = $currentCustomCss;
    }
  });

  $effect(() => {
    siteTitleInput = $siteCustomization.title;
    siteDescriptionInput = $siteCustomization.description;
    siteIconUrlInput = $siteCustomization.iconUrl;
  });

  $effect(() => {
    if ($primaryColor !== lastColorStoreValue) {
      primaryColorInput = $primaryColor;
      lastColorStoreValue = $primaryColor;
    }
  });

  $effect(() => {
    const trimmed = primaryColorInput.trim();
    if (trimmed && trimmed !== $primaryColor) {
      primaryColor.set(trimmed);
      lastColorStoreValue = trimmed;
    } else if (!trimmed && $primaryColor) {
      primaryColor.clear();
      lastColorStoreValue = '';
    }
  });

  // Event handlers
  const handlers = {
    themeChange: (themeId: ThemeOption) => theme.setTheme(themeId),
    a11yToggle: (optionId: string) => accessibility.toggle(optionId),
    navbarChange: (e: Event) =>
      navbarDisplay.setMode((e.currentTarget as HTMLSelectElement).value as NavbarDisplayMode),
    homepageChange: (e: Event) =>
      homepageLayout.setMode((e.currentTarget as HTMLSelectElement).value as HomepageLayoutMode),
    fontScaleChange: (e: Event) =>
      fontScale.setLevel(parseInt((e.currentTarget as HTMLInputElement).value, 10) as FontScaleLevel),
    linkClick: () => onClose?.(),

    applyCustomCss: () => {
      const validation = customCss.validate(cssInput);
      validationErrors = validation.errors;
      validationWarnings = validation.warnings;
      if (validation.isValid) customCss.set(cssInput);
    },

    clearCustomCss: () => {
      cssInput = '';
      customCss.clear();
      validationErrors = [];
      validationWarnings = [];
    },

    applySiteCustomization: () => {
      const data = {
        title: siteTitleInput.trim(),
        description: siteDescriptionInput.trim(),
        iconUrl: siteIconUrlInput.trim(),
      };
      const validation = siteCustomization.validate(data);
      siteCustomizationErrors = validation.errors;
      if (validation.isValid) {
        siteCustomization.set(data);
        window.location.reload();
      }
    },

    clearSiteCustomization: () => {
      siteCustomization.clear();
      siteCustomizationErrors = [];
      window.location.reload();
    },

    resetColor: () => {
      primaryColorInput = '';
    },

    clearAllData: () => {
      if (
        window.confirm(
          'Your theme, language, home and nav layout, site branding, accessibility preferences, custom CSS and all other settings will be discarded. This will also clear your bookmarks, recent tools and other history. Are you sure you want to proceed?',
        )
      ) {
        storage.clear();
        window.location.reload();
      }
    },

    copyEnvVars: async () => {
      try {
        await navigator.clipboard.writeText(envVarsString);
        envVarsCopied = true;
        setTimeout(() => (envVarsCopied = false), 2000);
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = envVarsString;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        envVarsCopied = true;
        setTimeout(() => (envVarsCopied = false), 2000);
      }
    },
  };

  // Live-updating env vars string - reacts to store changes
  const envVarsString = $derived.by(() => {
    // Trigger reactivity on store changes
    void $currentTheme;
    void $currentFontScale;
    void $currentHomepageLayout;
    void $currentNavbarDisplay;
    void $primaryColor;
    void $siteCustomization;

    const envVars = config.getUserSettingsList();

    if (envFormat === 'docker') {
      const filtered = envVars.filter(({ value }) => value !== '');
      return 'environment:\n' + filtered.map(({ name, value }) => `  - ${name}=${value}`).join('\n');
    }

    return envVars.map(({ name, value }) => `${name}='${value}'`).join('\n');
  });
</script>

{#snippet validationMessages(errors: string[], warnings: string[])}
  {#if errors.length > 0}
    <div class="validation-messages errors">
      <Icon name="alert-triangle" size="sm" />
      <div>
        {#each errors as error (error)}
          <p>{error}</p>
        {/each}
      </div>
    </div>
  {/if}
  {#if warnings.length > 0}
    <div class="validation-messages warnings">
      <Icon name="alert-circle" size="sm" />
      <div>
        {#each warnings as warning (warning)}
          <p>{warning}</p>
        {/each}
      </div>
    </div>
  {/if}
{/snippet}

{#snippet actionButtons(applyHandler: () => void, clearHandler: () => void, applyLabel = 'Apply', clearLabel = 'Clear')}
  <div class="css-actions">
    <button class="action-btn apply" onclick={applyHandler}>
      <Icon name="check" size="sm" />
      {applyLabel}
    </button>
    <button class="action-btn clear" onclick={clearHandler}>
      <Icon name={clearLabel === 'Reset' ? 'x' : 'undo'} size="sm" />
      {clearLabel}
    </button>
  </div>
{/snippet}

{#snippet accessibilityOption(option: AccessibilityOption)}
  <label class="toggle-option" use:tooltip={option.description}>
    <input
      type="checkbox"
      checked={option.enabled}
      onchange={() => handlers.a11yToggle(option.id)}
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
    onclick={() => handlers.themeChange(themeOption.id)}
    role="radio"
    aria-checked={$currentTheme === themeOption.id}
    disabled={!themeOption.available}
  >
    <div class="theme-preview" style="background: {themeOption.preview || 'var(--bg-secondary)'}"></div>
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

  {#if standalone}
    <div class="settings-section font-size-section">
      <h3>Font Scale</h3>
      <div class="font-scale-slider">
        <input
          type="range"
          min="0"
          max="4"
          step="1"
          value={$currentFontScale}
          oninput={handlers.fontScaleChange}
          aria-label="Font scale"
          class="slider"
        />
        <div class="slider-labels">
          {#each fontScaleOptions as option (option.level)}
            <span class="slider-label" class:active={$currentFontScale === option.level}>{option.label}</span>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Language Selection -->
  <div class="settings-section language-section">
    <h3>Language</h3>
    <div class="language-dropdown">
      {#each LANGUAGES as lang (lang.code)}
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
      <select class="navbar-select" value={$currentHomepageLayout} onchange={handlers.homepageChange}>
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
      <select class="navbar-select" value={$currentNavbarDisplay} onchange={handlers.navbarChange}>
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

      {@render validationMessages(siteCustomizationErrors, [])}
      {@render actionButtons(handlers.applySiteCustomization, handlers.clearSiteCustomization, 'Apply', 'Reset')}
    </div>

    <!-- Primary Color (only in standalone mode) -->
    <div class="settings-section color-section">
      <h3>Primary Color</h3>
      <p class="section-description">Choose a primary color for the interface.</p>

      <div class="color-palette">
        {#each COLOR_PALETTE as color (color)}
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
        <button class="action-btn clear" onclick={handlers.resetColor}>
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
        rows="5"
      ></textarea>

      <div class="css-meta">
        <span class="char-count">{cssInput.length} characters</span>
      </div>

      {@render validationMessages(validationErrors, validationWarnings)}
      {@render actionButtons(handlers.applyCustomCss, handlers.clearCustomCss)}
    </div>
  {/if}

  {#if standalone}
    <div class="settings-section info-more-section">
      <h3>Not found what you were looking for?</h3>
      <p class="line-1">Good news! The code is open source and easy to work with.</p>
      <p>
        Simply <a href="https://github.com/Lissy93/networking-toolbox/fork">fork the repo</a>, follow our
        <a href="/about/building">dev setup instructions</a>, make whatever changes and customizations you like, and
        then <a href="/about/deploying">deploy your own instance</a>.
      </p>
      <p>
        We also offer enterprise <a href="/about/support">support services</a>, where we can make custom changes for
        you.
      </p>
    </div>
  {/if}
  {#if standalone}
    <div class="settings-section delete-section">
      <h3>Delete Data</h3>
      <div class="caution-message">
        <Icon name="alert-triangle" size="sm" />
        <p>Caution: This will reset all local data.</p>
      </div>
      <button class="action-btn danger" onclick={handlers.clearAllData}>
        <Icon name="trash" size="sm" />
        Clear all Data
      </button>
    </div>
  {/if}

  <!-- Docs for saving settings -->
  {#if standalone}
    <div class="settings-section saving-section">
      <h3>Syncing Settings and Backup/Restore</h3>
      <p class="line-1">
        Your settings are saved in your browser's local storage, and so they will be retained even after you quit the
        app.
      </p>
      <p>
        Since we don't require login/signup to use the app, there is currently no way to automatically sync your
        settings across devices. But if you're self-hosting Networking Toolbox, you can apply settings in your config,
        by including the following environment variables. This way, you're settings will be applied to all users across
        all devices.
      </p>
      <button
        class="show-more-btn"
        onclick={() => (showExportSettings = !showExportSettings)}
        aria-expanded={showExportSettings}
      >
        <Icon name={showExportSettings ? 'chevron-up' : 'chevron-down'} size="sm" />
        <span>Export Settings</span>
      </button>
      {#if showExportSettings}
        <div class="env-vars-section" transition:slide={{ duration: 300 }}>
          <div class="env-header">
            <h4>Environment Variables</h4>
            <SegmentedControl
              options={[
                { value: 'env', label: '.env' },
                { value: 'docker', label: 'docker-compose' },
              ]}
              bind:value={envFormat}
            />
          </div>
          <p class="section-description">
            Current environment variable values. Copy and paste into your config file for self-hosted instances.
          </p>

          <pre class="env-block"><code>{envVarsString}</code></pre>

          <button class="action-btn apply" onclick={handlers.copyEnvVars}>
            <Icon name={envVarsCopied ? 'check' : 'copy'} size="sm" />
            {envVarsCopied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      {/if}

      <button
        class="show-more-btn"
        onclick={() => (showExportStyles = !showExportStyles)}
        aria-expanded={showExportStyles}
      >
        <Icon name={showExportStyles ? 'chevron-up' : 'chevron-down'} size="sm" />
        <span>Export Styles</span>
      </button>
      {#if showExportStyles}
        <div class="env-vars-section" transition:slide={{ duration: 300 }}>
          <div class="env-header">
            <h4>Custom CSS</h4>
          </div>
          <p class="section-description">Apply your custom CSS to your self-hosted instance by mounting a CSS file.</p>

          <div class="code-block-section">
            <p class="code-label">1. Create a file named <code>custom-styles.css</code></p>

            <p class="code-label">2. Paste the following content:</p>
            <pre class="code-block"><code
                >{$currentCustomCss ||
                  '/* No custom CSS saved yet */\n/* Add your custom styles in the Custom CSS section above */'}</code
              ></pre>

            <p class="code-label">3. Mount the file to your Docker container:</p>

            <div class="mount-options">
              <p class="mount-option-label"><strong>Option A:</strong> Docker Compose</p>
              <pre class="code-block"><code
                  >services:
  networking-toolbox:
    volumes:
      - ./custom-styles.css:/app/static/custom-styles.css:ro</code
                ></pre>

              <p class="mount-option-label"><strong>Option B:</strong> Docker Run</p>
              <pre class="code-block"><code
                  >docker run -v $(pwd)/custom-styles.css:/app/static/custom-styles.css:ro ...</code
                ></pre>

              <p class="mount-option-label"><strong>Option C:</strong> Edit file directly in container</p>
              <pre class="code-block"><code
                  >docker exec -it &lt;container-name&gt; sh -c 'cat &gt; /app/static/custom-styles.css &lt;&lt; "EOF"
{$currentCustomCss || '/* Your custom CSS here */'}
EOF'</code
                ></pre>
            </div>

            <div class="info-message">
              <Icon name="info" size="sm" />
              <p>
                <strong>Note:</strong> For Options A &amp; B, create the <code>custom-styles.css</code> file before starting
                your container. Docker cannot mount individual files that don't exist yet.
              </p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Navigation Links (only in dropdown mode) -->
  {#if !standalone}
    <div class="settings-section settings-links">
      <a class="settings-link" href="/settings" onclick={handlers.linkClick}>
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
          grid-row: span 3;
        }
        &.language-section {
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
        &.info-more-section {
          grid-column: span 2;
        }
        &.saving-section {
          grid-column: 1/-1;
          .line-1 {
            color: var(--text-tertiary);
            font-size: var(--font-size-md);
            font-style: italic;
          }
        }

        .theme-option {
          flex-direction: column;
        }

        @media (max-width: 768px) {
          &.theme-section,
          &.accessibility-section,
          &.site-branding-section,
          &.color-section,
          &.info-more-section,
          &.custom-css-section {
            grid-row: span 1;
            grid-column: span 1;
          }
        }
        @media (max-width: 990px) {
          &.site-branding-section {
            grid-column: span 1;
          }
          &.delete-section {
            grid-column: 1 / -1;
          }
          &.info-more-section {
            grid-column: 1 / -1;
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
        margin-bottom: var(--spacing-sm);
      }
    }
  }

  .theme-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: var(--spacing-xs);
  }

  .additional-themes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: var(--spacing-xs);
    grid-column: 1 / -1;
  }

  .theme-option {
    display: flex;
    flex-direction: row;
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
      border-color: var(--border-secondary);
    }
  }

  .theme-preview {
    width: 1.5rem;
    height: 1rem;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-secondary);
  }

  .font-scale-slider {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);

    .slider {
      width: 100%;
      height: 0.375rem;
      background: linear-gradient(to right, var(--bg-tertiary) 0%, var(--border-primary) 50%, var(--bg-tertiary) 100%);
      border-radius: var(--radius-sm);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
      position: relative;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 1.25rem;
        height: 1.25rem;
        background: var(--color-primary);
        border: 2px solid var(--bg-secondary);
        border-radius: 50%;
        cursor: pointer;
        transition: all var(--transition-normal);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

        &:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
        }
      }

      &::-moz-range-thumb {
        width: 1.25rem;
        height: 1.25rem;
        background: var(--color-primary);
        border: 2px solid var(--bg-secondary);
        border-radius: 50%;
        cursor: pointer;
        transition: all var(--transition-normal);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

        &:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
        }
      }

      &:focus {
        &::-webkit-slider-thumb {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        &::-moz-range-thumb {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
      }
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-sm);
      color: var(--text-tertiary);
      margin-top: var(--spacing-xs);

      .slider-label {
        flex: 1;
        text-align: center;
        transition: all var(--transition-fast);
        font-size: var(--font-size-xs);

        &.active {
          color: var(--color-primary);
          font-weight: 500;
        }

        &:first-child {
          text-align: left;
        }
        &:last-child {
          text-align: right;
        }
      }
    }
  }

  .language-dropdown {
    gap: var(--spacing-xs);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  }

  .language-option,
  .theme-option {
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

  .show-more-btn,
  .custom-color-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all var(--transition-normal);

    &:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
      border-color: var(--border-secondary);
    }
  }

  .show-more-btn {
    min-width: 14rem;
    display: flex;
    justify-content: center;
    margin: var(--spacing-md) auto 0 auto;

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
      justify-content: center;
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
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
      float: right;
      width: fit-content !important;

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
      min-height: 120px;
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

  .info-more-section {
    .line-1 {
      font-style: italic;
      color: var(--text-tertiary);
      font-size: var(--font-size-md);
    }
    p {
      margin: 0 0 var(--spacing-sm) 0;
    }
    a {
      color: var(--color-primary);
      transition: all var(--transition-normal);
      &:hover {
        text-decoration: underline;
        color: color-mix(in srgb, var(--color-primary), black 10%);
      }
    }
  }

  .delete-section {
    .caution-message {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-warning), transparent 90%),
        color-mix(in srgb, var(--color-warning), transparent 95%)
      );
      border: 1px solid color-mix(in srgb, var(--color-warning), transparent 70%);
      border-radius: var(--radius-sm);
      margin-bottom: var(--spacing-md);

      :global(svg) {
        flex-shrink: 0;
        color: var(--color-warning);
      }

      p {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--text-primary);
        font-weight: 500;
      }
    }

    .action-btn.danger {
      width: 100%;
      justify-content: center;
      background: var(--color-error);
      color: var(--bg-secondary);
      border-color: var(--color-error);

      &:hover {
        background: color-mix(in srgb, var(--color-error), black 15%);
        border-color: color-mix(in srgb, var(--color-error), black 15%);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px color-mix(in srgb, var(--color-error), transparent 60%);
      }

      &:active {
        transform: translateY(0);
        box-shadow: none;
      }
    }
  }

  .saving-section {
    .show-more-btn {
      margin-top: var(--spacing-md);
    }

    .env-vars-section {
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--border-primary);

      .env-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-sm);

        h4 {
          margin: 0;
          font-size: var(--font-size-md);
          font-weight: 600;
          color: var(--text-primary);
        }
      }

      .section-description {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin: 0 0 var(--spacing-md) 0;
      }

      .env-block {
        width: 100%;
        padding: var(--spacing-md);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        margin-bottom: var(--spacing-md);
        overflow-x: auto;

        code {
          font-family: 'Courier New', monospace;
          font-size: var(--font-size-sm);
          color: var(--text-primary);
          line-height: 1.6;
          white-space: pre;
          padding: 0;
        }
      }

      .action-btn {
        width: 100%;
        justify-content: center;
      }

      .code-block-section {
        margin-top: var(--spacing-md);

        .code-label {
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--text-primary);
          margin: var(--spacing-md) 0 var(--spacing-xs) 0;

          &:first-child {
            margin-top: 0;
          }

          code {
            background: var(--bg-tertiary);
            padding: 0.125rem 0.375rem;
            border-radius: var(--radius-xs);
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
        }

        .mount-options {
          margin-top: var(--spacing-sm);
          padding-left: var(--spacing-md);
          border-left: 2px solid var(--border-primary);

          .mount-option-label {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            margin: var(--spacing-md) 0 var(--spacing-xs) 0;

            &:first-child {
              margin-top: 0;
            }

            strong {
              color: var(--text-primary);
              font-weight: 600;
            }
          }
        }

        .code-block {
          width: 100%;
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-sm);
          margin-bottom: var(--spacing-sm);
          overflow-x: auto;

          code {
            font-family: 'Courier New', monospace;
            font-size: var(--font-size-sm);
            color: var(--text-primary);
            line-height: 1.6;
            white-space: pre;
            padding: 0;
          }
        }

        .info-message {
          display: flex;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-info), transparent 90%),
            color-mix(in srgb, var(--color-info), transparent 95%)
          );
          border: 1px solid color-mix(in srgb, var(--color-info), transparent 70%);
          border-radius: var(--radius-sm);
          margin-top: var(--spacing-md);

          :global(svg) {
            flex-shrink: 0;
            color: var(--color-info);
            margin-top: 0.125rem;
          }

          p {
            margin: 0;
            font-size: var(--font-size-sm);
            color: var(--text-primary);
            line-height: 1.5;

            strong {
              font-weight: 600;
            }

            code {
              background: var(--bg-tertiary);
              padding: 0.125rem 0.375rem;
              border-radius: var(--radius-xs);
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
            }
          }
        }
      }
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
