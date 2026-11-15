import { defineConfig } from 'vitest/config';

// Keeps TestPal's tests separate from the repo root's vitest config.
export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
  },
});
