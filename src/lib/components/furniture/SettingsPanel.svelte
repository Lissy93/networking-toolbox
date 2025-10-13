<script lang="ts">
  import { slide } from 'svelte/transition';
  import Icon from '$lib/components/global/Icon.svelte';
  import { accessibility, type AccessibilityOption } from '$lib/stores/accessibility';
  import { tooltip } from '$lib/actions/tooltip';
  import { theme, themes, type ThemeOption, type Theme } from '$lib/stores/theme';
  import { navbarDisplay, navbarDisplayOptions, type NavbarDisplayMode } from '$lib/stores/navbarDisplay';
  import { homepageLayout, homepageLayoutOptions, type HomepageLayoutMode } from '$lib/stores/homepageLayout';

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
  <div class="settings-section">
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
  <div class="settings-section">
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
  <div class="settings-section">
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
  <div class="settings-section">
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
  <div class="settings-section">
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
