import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  // Project block 11 in the workspace port scheme (see ~/.claude/CLAUDE.md, "Dev-server ports").
  // strictPort so a clash fails loudly instead of drifting to a random port.
  // Previously this defaulted to Vite's shared 5173, which no project owns.
  server: {
    port: 5112,
    strictPort: true,
    // Same-origin route to the local staging API, for trying staff cookie auth
    // (STAFF_COOKIE_AUTH, A15): set VITE_API_BASE=/api-staging in .env.local.
    // Unused unless you do; see docs/LOCAL-STAGING.md.
    proxy: {
      '/api-staging': {
        target: process.env.HERITOS_STAGING_API || 'http://127.0.0.1:8088',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-staging/, ''),
      },
    },
  },
  preview: {
    port: 5112,
    strictPort: true,
  }
});