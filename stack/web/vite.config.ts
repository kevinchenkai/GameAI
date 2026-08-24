import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/stack/' : '/'),
  server: { port: 5176 },
  preview: { port: 4176 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        /**
         * ★ Phaser 单独切 chunk。
         *
         *   首屏体积不变（两个 chunk 都要下），收益在**回访**：
         *   Phaser 约占 bundle 的 96%，且版本极少动。切开后业务代码
         *   每次更新只让用户重下几十 KB，而不是整包 1.5 MB。
         *   配合静态资源 30 天缓存，Phaser 那份基本一次下载长期复用。
         */
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
