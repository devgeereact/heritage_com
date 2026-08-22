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
  },
  preview: {
    port: 5112,
    strictPort: true,
  }
});