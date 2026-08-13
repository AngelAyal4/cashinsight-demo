import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 30000,
    // Los archivos de test comparten la misma base MongoDB: corren en serie.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/password.ts',
        'src/lib/session.ts',
        'src/lib/password-reset.ts',
        'src/lib/rate-limit.ts',
        'src/proxy.ts',
        'src/lib/monthly-date.ts',
        'src/lib/monthly-cycle.ts',
        'src/lib/financial-metrics.ts',
        'src/lib/budget-progress.ts',
        'src/lib/couple-balance.ts',
        'src/lib/format.ts',
        'src/lib/notification-triggers.ts',
        'src/app/api/**/route.ts',
        'src/app/robots.ts',
        'src/app/sitemap.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});