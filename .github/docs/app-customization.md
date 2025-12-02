# Customization Guide

You can customize Networking Toolbox extensively to fit your branding and user experience needs.
Covering everything from UI, behaviour, branding, accessibility, localization and more.

## Available Settings
- Site name, logo, and description
- Homepage and navbar layout
- Theme, primary color, font and scale
- Custom styles via CSS
- Accessibility options
- Language and localization
- Bookmarked tools

## Applying Settings

> [!TIP]
> The easiest way to get started, is by visiting [the settings page](https://www.networkingtoolbox.net/settings), making your desired changes, and then exporting the configuration (at the bottom of the page). This will give you a `.env` file which you can use in your deployment.

#### Option #1 - Localstorage
This is what is used on networkingtoolbox.net, allowing users to set their own preferences which persists across sessions, but not across devices. These can be changed on the [Settings Page](https://networkingtoolbox.net/settings).

#### Option #2 - Container settings
When deploying (via Docker or similar), you can set settings via environment variables or a mounted file to define default settings for all users. These will be applied everywhere, wherever the user is accessing the app from.


> [!NOTE]
> These customizations only affect the default values. Users can still customize their personal preferences through the settings menu, and those will be stored in their browser's localStorage.

---

### Disabling Settings

Once you've configured Networking Toolbox to your preferense, you can optionally disable the UI settings menu and functionality, to prevent users from editing site branding, colors or other settings. This can be done by setting  `NTB_DISABLE_SETTINGS='true'` in your environmental variables.

---


## Applying in Docker

To get started, take a look at our sample  [`.env`](https://gist.githubusercontent.com/Lissy93/3c5f85dc0e2263a4706d3e136f0a076e/raw/62a00f625c920ac9e1cafe60721213e2ea233581/.env.example).


- With Docker run, include: `--env-file .env`
- And with docker-compose, just add: `env_file: [ .env ]`
- Or with any other NPM command: `env $(.env | xargs) npm start`
  
An example extract from a `docker-compose.yml`:

```yaml
environment:
  - NTB_HOMEPAGE_LAYOUT=categories
  - NTB_NAVBAR_DISPLAY=default
  - NTB_DEFAULT_THEME=dark
  - NTB_FONT_SCALE=2
```

---

## Available Environment Variables

### Branding

- **`NTB_SITE_TITLE`**
  - **Description:** The name/title of your site
  - **Default:** `Networking Toolbox`
  - **Example:** `NTB_SITE_TITLE='My Network Tools'`

- **`NTB_SITE_DESCRIPTION`**
  - **Description:** Site description shown in navbar and SEO meta tags
  - **Default:** `Your companion for all-things networking`
  - **Example:** `NTB_SITE_DESCRIPTION='Internal network utilities'`

- **`NTB_SITE_ICON`**
  - **Description:** Logo/icon to display in the navbar (path to image or URL)
  - **Default:** Empty (uses default icon)
  - **Example:** `NTB_SITE_ICON='/custom-logo.svg'` or `NTB_SITE_ICON='https://example.com/logo.png'`

### Layout & Display

- **`NTB_HOMEPAGE_LAYOUT`**
  - **Description:** Default homepage layout style
  - **Options:** `categories`, `default`, `minimal`, `carousel`, `bookmarks`, `small-icons`, `list`, `search`, `empty`
  - **Default:** `categories`
  - **Example:** `NTB_HOMEPAGE_LAYOUT='minimal'`

- **`NTB_NAVBAR_DISPLAY`**
  - **Description:** Default navbar display mode
  - **Options:** `default`, `bookmarked`, `frequent`, `none`
  - **Default:** `default`
  - **Example:** `NTB_NAVBAR_DISPLAY='bookmarked'`

### Theme & Appearance

- **`NTB_DEFAULT_THEME`**
  - **Description:** Default color theme
  - **Options:** `dark`, `light`, `midnight`, `arctic`, `ocean`, `purple`, `cyberpunk`, `terminal`, `lightpurple`, `muteddark`, `solarized`, `nord`, `gruvbox`, `tokyonight`, `catppuccin`, `everforest`, `sunset`, `dracula`
  - **Default:** `ocean`
  - **Example:** `NTB_DEFAULT_THEME='dark'`

- **`NTB_PRIMARY_COLOR`**
  - **Description:** Primary color for the interface (hex code)
  - **Default:** Empty (uses theme default)
  - **Example:** `NTB_PRIMARY_COLOR='#ff6b35'`

- **`NTB_FONT_SCALE`**
  - **Description:** Default font size level
  - **Options:** `0` (Very Small), `1` (Small), `2` (Normal), `3` (Large), `4` (Very Large)
  - **Default:** `2`
  - **Example:** `NTB_FONT_SCALE='3'`

### Localization

- **`NTB_DEFAULT_LANGUAGE`**
  - **Description:** Default language for the interface
  - **Options:** `en`, `es`, `fr`, `de` (currently only `en` is fully supported)
  - **Default:** `en`
  - **Example:** `NTB_DEFAULT_LANGUAGE='en'`

### Features

- **`NTB_SHOW_TIPS_ON_HOMEPAGE`**
  - **Description:** Show helpful tips on the homepage
  - **Options:** `true`, `false`
  - **Default:** `false`
  - **Example:** `NTB_SHOW_TIPS_ON_HOMEPAGE='true'`

- **`NTB_DISABLE_SETTINGS`**
  - **Description:** Disable the settings page and hide the settings button in the navbar
  - **Options:** `true`, `false`
  - **Default:** `false`
  - **Example:** `NTB_DISABLE_SETTINGS='true'`
  - **Note:** When enabled, users cannot access or modify any settings. The settings page shows "Settings for this instance have been disabled by your administrator."

### Security Settings

> [!IMPORTANT]
> These settings protect against SSRF (Server-Side Request Forgery) attacks when using custom DNS servers in diagnostic tools.

- **`NTB_ALLOW_CUSTOM_DNS`**
  - **Description:** Allow users to specify custom DNS server IPs
  - **Options:** `true`, `false`
  - **Default:** `false` (for security)
  - **Example:** `NTB_ALLOW_CUSTOM_DNS='true'`
  - **Security Note:** When `false`, only servers from `NTB_ALLOWED_DNS_SERVERS` can be used

- **`NTB_BLOCK_PRIVATE_DNS_IPS`**
  - **Description:** Block private/internal IP addresses for DNS servers
  - **Options:** `true`, `false`
  - **Default:** `true` (for security)
  - **Example:** `NTB_BLOCK_PRIVATE_DNS_IPS='true'`
  - **Security Note:** Prevents SSRF attacks by blocking RFC1918 and other private IP ranges

- **`NTB_ALLOWED_DNS_SERVERS`**
  - **Description:** Comma-separated list of allowed DNS server IPs
  - **Default:** Comprehensive list of trusted public DNS providers (Google, Cloudflare, Quad9, OpenDNS, etc.)
  - **Example:** `NTB_ALLOWED_DNS_SERVERS='8.8.8.8,1.1.1.1,9.9.9.9'`
  - **Note:** Only used when `NTB_ALLOW_CUSTOM_DNS='false'`

### Analytics Settings

- **`NTB_ANALYTICS_DOMAIN`**
  - **Description:** Domain for analytics tracking (for Plausible or similar)
  - **Default:** `networking-toolbox.as93.net`
  - **Example:** `NTB_ANALYTICS_DOMAIN='myapp.example.com'`
  - **Disable:** Set to `false` to disable analytics: `NTB_ANALYTICS_DOMAIN='false'`

- **`NTB_ANALYTICS_DSN`**
  - **Description:** URL to the analytics script
  - **Default:** `https://no-track.as93.net/js/script.js`
  - **Example:** `NTB_ANALYTICS_DSN='https://plausible.io/js/script.js'`
  - **Disable:** Set to `false` to disable analytics: `NTB_ANALYTICS_DSN='false'`
  - **Note:** Analytics is disabled if either `NTB_ANALYTICS_DOMAIN` or `NTB_ANALYTICS_DSN` is set to `false`

---

## Example Configurations

### Minimal Production Setup
```bash
NTB_SITE_TITLE='Corporate Network Tools'
NTB_SITE_DESCRIPTION='Internal IT utilities'
NTB_DEFAULT_THEME='dark'
NTB_HOMEPAGE_LAYOUT='categories'
```

### High Security Configuration
```bash
NTB_ALLOW_CUSTOM_DNS='false'
NTB_BLOCK_PRIVATE_DNS_IPS='true'
NTB_ALLOWED_DNS_SERVERS='8.8.8.8,1.1.1.1'
NTB_ANALYTICS_DOMAIN='false'
NTB_ANALYTICS_DSN='false'
```

### Full Customization
```bash
NTB_SITE_TITLE='DevOps Toolkit'
NTB_SITE_DESCRIPTION='Network diagnostic utilities'
NTB_SITE_ICON='/custom-logo.svg'
NTB_HOMEPAGE_LAYOUT='minimal'
NTB_NAVBAR_DISPLAY='bookmarked'
NTB_DEFAULT_THEME='cyberpunk'
NTB_PRIMARY_COLOR='#00ff88'
NTB_FONT_SCALE='2'
NTB_DEFAULT_LANGUAGE='en'
NTB_SHOW_TIPS_ON_HOMEPAGE='true'
NTB_ALLOW_CUSTOM_DNS='true'
NTB_BLOCK_PRIVATE_DNS_IPS='true'
NTB_ANALYTICS_DOMAIN='myapp.example.com'
NTB_ANALYTICS_DSN='https://plausible.io/js/script.js'
```

### Self-Hosted (No Analytics)
```bash
NTB_SITE_TITLE='Internal Network Tools'
NTB_DEFAULT_THEME='dark'
NTB_ANALYTICS_DOMAIN='false'
NTB_ANALYTICS_DSN='false'
```

