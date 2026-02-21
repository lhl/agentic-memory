import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/test/vitest.setup.ts'],
    globalSetup: ['./src/test/vitest.global-setup.ts']
  }
});
