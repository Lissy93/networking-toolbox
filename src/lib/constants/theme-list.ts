// import type { Theme } from "$lib/stores/theme";

const primaryCdn = 'https://fonts.googleapis.com/css2?family=';

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

const fonts = {
  Inter: {
    name: 'Inter',
    url: `${primaryCdn}Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap`,
    fallback: 'sans-serif',
  },
  Poppins: {
    name: 'Poppins',
    url: `${primaryCdn}Lora:ital,wght@0,400..700;1,400..700&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap`,
    fallback: 'sans',
  },
  Montserrat: {
    name: 'Montserrat',
    url: `${primaryCdn}Montserrat:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap`,
    fallback: 'sans-serif',
  },
  Raleway: {
    name: 'Raleway',
    url: `${primaryCdn}Raleway:wght@300;400;500;600;700;800&family=Source+Code+Pro:wght@400;500;600;700&display=swap`,
    fallback: 'sans-serif',
  },
  Orbitron: {
    name: 'Orbitron',
    url: `${primaryCdn}Orbitron:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap`,
    fallback: 'monospace',
  },
  JetBrainsMono: {
    name: 'JetBrains Mono',
    url: `${primaryCdn}JetBrains+Mono:wght@300;400;500;600;700;800&display=swap`,
    fallback: 'monospace',
  },
  SourceCodePro: {
    name: 'Source Code Pro',
    url: `${primaryCdn}Source+Code+Pro:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap`,
    fallback: 'monospace',
  },
  Inconsolata: {
    name: 'Inconsolata',
    url: `${primaryCdn}Inconsolata:wght@300;400;500;600;700&family=Lato:wght@300;400;700&display=swap`,
    fallback: 'monospace',
  },
  IBMPlexSans: {
    name: 'IBM Plex Sans',
    url: `${primaryCdn}IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap`,
    fallback: 'sans-serif',
  },
  Ubuntu: {
    name: 'Ubuntu',
    url: `${primaryCdn}Ubuntu:wght@300;400;500;700&family=Ubuntu+Mono:wght@400;500;700&display=swap`,
    fallback: 'monospace',
  },
  FiraCode: {
    name: 'Fira Code',
    url: `${primaryCdn}Fira+Sans:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500;600;700&display=swap`,
    fallback: 'monospace',
  },
  Outfit: {
    name: 'Outfit',
    url: `${primaryCdn}Outfit:wght@300;400;500;600;700&display=swap`,
    fallback: 'sans-serif',
  },
  Nunito: {
    name: 'Nunito',
    url: `${primaryCdn}Nunito:wght@300;400;500;600;700;800&display=swap`,
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
];
