import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Nest DI needs legacy decorators plus `design:paramtypes` metadata; oxc reads
  // these from here rather than from tsconfig.json.
  oxc: {
    target: 'es2021',
    decorator: { legacy: true, emitDecoratorMetadata: true },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.mts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
    },
  },
});
