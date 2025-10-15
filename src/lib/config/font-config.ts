/**
 * Font Loading Configuration
 * Hybrid approach: Use self-hosted fonts for downloaded fonts, Google Fonts CDN for others
 */

// Set to true to use self-hosted fonts for Fira Code, Fira Sans, and Inter
// Other theme fonts will continue using Google Fonts CDN
// Set to false to use Google Fonts CDN for all fonts
export const USE_SELF_HOSTED_FONTS = true;

// Self-hosted fonts base path
export const SELF_HOSTED_FONTS_PATH = '/fonts/fonts.css';

// Google Fonts CDN base
export const GOOGLE_FONTS_CDN = 'https://fonts.googleapis.com/css2?family=';
