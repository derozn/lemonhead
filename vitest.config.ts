import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*', 'tools/*'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      // Spec §3: 100% coverage on the calculation engine, enforced in CI.
      // Schemas joined at 100% at the 2026-08 revisit (backlog verdict): they
      // become the LLM-output validation boundary in Phase 3.
      thresholds: {
        'packages/entitlements/src/**': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        'packages/schemas/src/**': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});
