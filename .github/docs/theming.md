# Theming System

It's easy to customize the UI to theme Networking Toolbox according to your preferences.<br>
Head over to the [/settings](https://networkingtoolbox.net/settings) page to select one of the 8 built-in themes, or create your own.


<p align="center">
<img width="600" src="https://storage.googleapis.com/as93-screenshots/networking-toolbox/themes.gif" />
</p>


---

### Editing Themes

Themes are basically just CSS variables. You can view the default variables and values in [`variables.scss`](https://github.com/Lissy93/networking-toolbox/blob/main/src/styles/variables.scss), or view/add theme-specific values in [`themes.scss`](https://github.com/Lissy93/networking-toolbox/blob/main/src/styles/themes.scss).

---

### Adding New Themes
1. Add your CSS variables to [`themes.scss`](https://github.com/Lissy93/networking-toolbox/blob/main/src/styles/themes.scss)
2. Add your theme to [`theme-list.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/src/lib/constants/theme-list.ts)
3. Rebuild the app, then <kbd>Ctrl</kbd> + <kbd>,</kbd> to open the settings and select your new theme!

<details>
<summary>Example Theme Styles</summary>

```css
.theme-purple,
html[data-theme='purple'] {
  --color-primary: #cca6ff;
  --color-primary-hover: color-mix(in srgb, var(--color-primary) 70%, white 30%);
  --color-primary-dark: color-mix(in srgb, var(--color-primary) 70%, black 30%);
  --bg-primary: #13182b;
  --bg-secondary: #101b31;
  --bg-tertiary: #222e45;
  --text-secondary: #a0a7b0;
  --surface-hover: #2b384b;
  --border-primary: #30405b;
  --font-body: 'Poppins', sans-serif;
  --font-heading: 'Lora', 'Poppins', sans-serif;
}
```

</details>


<details>
<summary>Example Theme Registration</summary>

```javascript
{
  id: 'mytheme',
  name: 'My Theme',
  available: true,
  font: {
    name: 'Custom Font',
    url: 'https://fonts.googleapis.com/css2?family=Custom+Font',
    fallback: 'sans-serif'
  }
}
```
</details>

---

### Theme Logic
The theme system uses a Svelte store located in [`theme.ts`](https://github.com/Lissy93/networking-toolbox/blob/main/src/lib/stores/theme.ts) to manage themes. This store handles:
- Detecting user's system theme preference
- Getting, setting and changing themes
- Persisting the theme choice in `localStorage`
- Loading custom fonts for themes that require them


```javascript
import { theme } from '$lib/stores/theme';

// Set a theme
theme.setTheme('cyberpunk');

// Toggle between light/dark
theme.toggle();

// Check current theme
theme.subscribe(currentTheme => {
  console.log('Current theme:', currentTheme);
});
```
