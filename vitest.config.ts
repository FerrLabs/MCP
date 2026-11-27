import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['packages/**/__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@ferrlabs/mcp-core': fileURLToPath(
        new URL('./packages/mcp-core/src/index.ts', import.meta.url),
      ),
    },
  },
});
