import { defineConfig } from 'vitest/config';
import path from 'path';

// Mirrors the `paths` in tsconfig.base.json and the webpack aliases so specs
// can import modules the same way source files do.
export default defineConfig({
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@common': path.resolve(__dirname, 'src/common'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@cli': path.resolve(__dirname, 'src/cli'),
      '@root': path.resolve(__dirname),
    },
  },
});
