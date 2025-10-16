import { USE_SELF_HOSTED_FONTS, SELF_HOSTED_FONTS_PATH, GOOGLE_FONTS_CDN } from '$lib/config/font-config';

const primaryCdn = GOOGLE_FONTS_CDN;

interface Theme {
  id: string;
  name: string;
  available: boolean;
  preview?: string;
  font?: {
    name: string;
    url: string;
    fallback?: string;
  };
}

// Fonts available for self-hosting (only these have been downloaded)
const SELF_HOSTED_AVAILABLE = ['Fira Code', 'Fira Sans', 'Inter'];

// Helper to get font URL (Google Fonts CDN or self-hosted)
// Only uses self-hosted path if the font family is available locally
const getFontUrl = (fontFamily: string, googleFontsUrl: string) => {
  if (USE_SELF_HOSTED_FONTS && SELF_HOSTED_AVAILABLE.includes(fontFamily)) {
    return SELF_HOSTED_FONTS_PATH;
  }
  return googleFontsUrl;
};

const fonts = {
  Inter: {
    name: 'Inter',
    url: getFontUrl('Inter', `${primaryCdn}Inter:wght@400;500;600;700&display=swap&subset=latin`),
    fallback: 'sans-serif',
  },
  Poppins: {
    name: 'Poppins',
    url: getFontUrl(
      'Poppins',
      `${primaryCdn}Poppins:wght@400;500;600;700&family=Lora:wght@400;500;600;700&display=swap&subset=latin`,
    ),
    fallback: 'sans-serif',
  },
  Montserrat: {
    name: 'Montserrat',
    url: getFontUrl(
      'Montserrat',
      `${primaryCdn}Montserrat:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap&subset=latin`,
    ),
    fallback: 'sans-serif',
  },
  Raleway: {
    name: 'Raleway',
    url: getFontUrl(
      'Raleway',
      `${primaryCdn}Raleway:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600&display=swap&subset=latin`,
    ),
    fallback: 'sans-serif',
  },
  Orbitron: {
    name: 'Orbitron',
    url: getFontUrl(
      'Orbitron',
      `${primaryCdn}Orbitron:wght@400;500;600;700&family=Share+Tech+Mono&display=swap&subset=latin`,
    ),
    fallback: 'monospace',
  },
  JetBrainsMono: {
    name: 'JetBrains Mono',
    url: getFontUrl('JetBrains Mono', `${primaryCdn}JetBrains+Mono:wght@400;500;600;700&display=swap&subset=latin`),
    fallback: 'monospace',
  },
  SourceCodePro: {
    name: 'Source Code Pro',
    url: getFontUrl(
      'Source Code Pro',
      `${primaryCdn}Source+Code+Pro:wght@400;500;600&family=Open+Sans:wght@400;500;600&display=swap&subset=latin`,
    ),
    fallback: 'monospace',
  },
  Inconsolata: {
    name: 'Inconsolata',
    url: getFontUrl(
      'Inconsolata',
      `${primaryCdn}Inconsolata:wght@400;500;600&family=Lato:wght@400;700&display=swap&subset=latin`,
    ),
    fallback: 'monospace',
  },
  IBMPlexSans: {
    name: 'IBM Plex Sans',
    url: getFontUrl(
      'IBM Plex Sans',
      `${primaryCdn}IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap&subset=latin`,
    ),
    fallback: 'sans-serif',
  },
  Ubuntu: {
    name: 'Ubuntu',
    url: getFontUrl(
      'Ubuntu',
      `${primaryCdn}Ubuntu:wght@400;500;700&family=Ubuntu+Mono:wght@400;500;700&display=swap&subset=latin`,
    ),
    fallback: 'monospace',
  },
  FiraCode: {
    name: 'Fira Code',
    url: getFontUrl(
      'Fira Code',
      `${primaryCdn}Fira+Sans:wght@400;500;600&family=Fira+Code:wght@400;500;600;700&display=swap&subset=latin`,
    ),
    fallback: 'monospace',
  },
  Outfit: {
    name: 'Outfit',
    url: getFontUrl('Outfit', `${primaryCdn}Outfit:wght@400;500;600&display=swap&subset=latin`),
    fallback: 'sans-serif',
  },
  Nunito: {
    name: 'Nunito',
    url: getFontUrl('Nunito', `${primaryCdn}Nunito:wght@400;500;600;700&display=swap&subset=latin`),
    fallback: 'sans-serif',
  },
  PlayfairDisplay: {
    name: 'Playfair Display',
    url: getFontUrl(
      'Playfair Display',
      `${primaryCdn}Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap&subset=latin`,
    ),
    fallback: 'serif',
  },
  DraculaFonts: {
    name: 'JetBrains Mono',
    url: getFontUrl(
      'JetBrains Mono',
      `${primaryCdn}JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Fira+Code:wght@400;500;600&display=swap&subset=latin`,
    ),
    fallback: 'sans-serif',
  },
};

const makePreviewGradient = (colors: string[], angle = 135, splitPercent = 50) =>
  colors.length === 0
    ? 'var(--bg-secondary)'
    : colors.length === 1
      ? colors[0]
      : `linear-gradient(${angle}deg, ${colors.map((c, i) => `${c} ${i === 0 ? 50 : splitPercent}%`).join(', ')})`;

// Available themes configuration
export const themes: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    available: true,
    preview: makePreviewGradient(['#0d1117', '#e3ed70']),
    font: fonts.FiraCode,
  },
  {
    id: 'light',
    name: 'Light',
    available: true,
    preview: makePreviewGradient(['#fafafa', '#2196f3']),
    font: fonts.Inter,
  },
  {
    id: 'purple',
    name: 'Purple',
    available: true,
    preview: makePreviewGradient(['#13182b', '#cca6ff']),
    font: fonts.Poppins,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    available: true,
    preview: makePreviewGradient(['#131c2b', '#70edb7']),
    font: fonts.Inter,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    available: true,
    preview: makePreviewGradient(['#0a0e27', '#5e72e4']),
    font: fonts.Montserrat,
  },
  {
    id: 'arctic',
    name: 'Arctic',
    available: true,
    preview: makePreviewGradient(['#f5f5f5', '#00acc1']),
    font: fonts.Raleway,
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    available: true,
    preview: makePreviewGradient(['#ff0ac5', '#e4ff00'], 135, 70),
    font: fonts.Orbitron,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    available: true,
    preview: makePreviewGradient(['#000000', '#00ff00']),
    font: fonts.JetBrainsMono,
  },
  {
    id: 'lightpurple',
    name: 'Light Purple',
    available: true,
    preview: makePreviewGradient(['#f4f2fa', '#af55fc']),
  },
  {
    id: 'muteddark',
    name: 'Muted Dark',
    available: true,
    preview: makePreviewGradient(['#282c34', '#e8ef61']),
    font: fonts.SourceCodePro,
  },
  {
    id: 'solarized',
    name: 'Solarized',
    available: true,
    preview: makePreviewGradient(['#002b36', '#268bd2']),
    font: fonts.Inconsolata,
  },
  {
    id: 'nord',
    name: 'Nord',
    available: true,
    preview: makePreviewGradient(['#2e3440', '#88c0d0']),
    font: fonts.IBMPlexSans,
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    available: true,
    preview: makePreviewGradient(['#282828', '#fabd2f']),
    font: fonts.Ubuntu,
  },
  {
    id: 'tokyonight',
    name: 'Tokyo Night',
    available: true,
    preview: makePreviewGradient(['#1a1b26', '#7aa2f7']),
    font: fonts.FiraCode,
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    available: true,
    preview: makePreviewGradient(['#1e1e2e', '#cba6f7']),
    font: fonts.Outfit,
  },
  {
    id: 'everforest',
    name: 'Everforest',
    available: true,
    preview: makePreviewGradient(['#2d353b', '#a7c080']),
    font: fonts.Nunito,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    available: true,
    preview: makePreviewGradient(['#fef6f0', '#ff6b35']),
    font: fonts.PlayfairDisplay,
  },
  {
    id: 'dracula',
    name: 'Dracula',
    available: true,
    preview: makePreviewGradient(['#282a36', '#ff79c6']),
    font: fonts.DraculaFonts,
  },
];
