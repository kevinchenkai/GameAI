import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/stack/' : '/'),
  server: { port: 5176 },
  preview: { port: 4176 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});
