import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages에서 /spaceos2/ 경로로 호스팅됨
const isGHPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGHPages ? '/spaceos2/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  preview: {
    port: 3000,
  },
});
