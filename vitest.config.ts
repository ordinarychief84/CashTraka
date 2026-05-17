import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Vitest is the unit-test runner for CashTraka's service layer.
 *
 * Tests live alongside the code they exercise, suffixed `.test.ts`.
 * Only PURE service tests live here — anything that needs a real DB
 * goes in a future `e2e/` Playwright suite, not Vitest.
 *
 * Tests are deterministic, mock-free where possible, and may import
 * any service or helper using the `@/` alias that matches the
 * Next.js tsconfig `paths` setup.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Disable Vite's PostCSS pipeline for the unit-test layer. The unit
  // tests never import stylesheets, and the auto-discovered postcss.config.js
  // pulls in the Tailwind plugin chain which on some node_modules layouts
  // hits a stale ts-interface-checker `./util` resolution error.
  css: { postcss: { plugins: [] } },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // .next/types pulls in app-router-internal types that fail to
    // resolve outside the Next.js build context.
    exclude: ['node_modules', '.next', 'dist'],
    environment: 'node',
    testTimeout: 5_000,
  },
});
