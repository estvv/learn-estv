import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 1100 },
  test: { environment: 'happy-dom' },
  server: {
    proxy: {
      '/api': { target: process.env.API_TARGET ?? 'http://localhost:3014', changeOrigin: true },
    },
  },
});
