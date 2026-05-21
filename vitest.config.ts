import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['packages/**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@ferrlabs/mcp-core': fileURLToPath(
        new URL('./packages/mcp-core/src/index.ts', import.meta.url),
      ),
    },
  },
});
