// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Error {
      message: string;
      errorId?: string;
    }
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  // Make version available globally
  const __APP_VERSION__: string;
  const __DEPLOY_ENV__: string;
}

// SVG imports
declare module '*.svg' {
  const content: string;
  export default content;
}

export {};
