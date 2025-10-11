// eslint.config.js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,                 // TS rules for .ts
  ...svelte.configs['flat/recommended'],           // Svelte + a11y rules
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        // Make <script lang="ts"> use TypeScript
        parser: tseslint.parser
      },
      globals: {
        ...globals.browser, // window, fetch, etc.
        ...globals.node,    // process, __dirname (if needed)
        ...globals.es2023
      }
    },
    rules: {
      // Typical useful TS rules in Svelte files
      '@typescript-eslint/consistent-type-imports': 'error',
      // Disable navigation without resolve for internal links
      'svelte/no-navigation-without-resolve': 'off'
    }
  },
  {
    files: ['**/*.svelte.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.svelte']
      },
      globals: {
        ...globals.browser,
        ...globals.es2023,
        // Svelte 5 runes globals
        $state: 'readonly',
        $derived: 'readonly',
        $effect: 'readonly',
        $props: 'readonly',
        $bindable: 'readonly',
        $inspect: 'readonly'
      }
    }
  },
  {
    rules: {
      // Prefer TS version of unused-vars, and ignore _-prefixed
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Temporarily disable no-explicit-any for API response types
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  prettier // turn off formatting-related ESLint rules (let Prettier own formatting)
]
