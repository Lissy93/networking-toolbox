import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    exclude: ['tests/e2e/**/*'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    hideSkippedTests: true,
    onConsoleLog: (log, type) => {
      // Suppress expected error patterns from appearing in test output
      if (type === 'stderr' && log.includes('error:')) {
        return false; // Don't print this log
      }
      return undefined; // Use default behavior for other logs
    },
    coverage: {
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/*.svelte',
        'src/app.d.ts',
        'src/app.html',
        'src/hooks.client.ts',
        'src/hooks.server.ts',
        'src/service-worker.ts'
      ],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        global: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85
        }
      }
    }
  }
});
