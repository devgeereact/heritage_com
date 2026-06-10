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
  // Honour the PORT env (used by the preview tool) so dev binds the expected port.
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  }
});