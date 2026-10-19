import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    hookTimeout: 30000,
    env: { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'Password123' },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
