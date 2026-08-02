import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: path.resolve(here, '../public'),
  plugins: [react()],
  server: {
    port: 5178,
    strictPort: true,
    host: '127.0.0.1',
    // The two files under test are symlinked in from ../.claude/skills/premium-web/assets
    // so the harness always exercises the real skill files, never a stale copy.
    fs: { allow: [path.resolve(here, '..')] },
  },
  build: {
    outDir: path.resolve(here, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(here, 'index.html'),
        reveal: path.resolve(here, 'reveal.html'),
      },
    },
  },
});
