import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // core/ 是零 Phaser 依赖的纯逻辑，跑在 node 环境即可——
    // 这正是「core 可脚本验证」的直接收益，不需要 jsdom。
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/core/**'],
      reporter: ['text', 'html'],
    },
  },
});
