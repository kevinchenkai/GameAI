import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/assets/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/game/core/**/*.ts', 'src/game/config/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'phaser', message: 'core/ 与 config/ 必须保持零 Phaser 依赖。' }],
          patterns: [{ group: ['**/scenes/**', '**/objects/**'], message: '依赖方向必须由表现层指向 core。' }],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'core/config 必须能在 Node 环境运行。' },
        { name: 'document', message: 'core/config 必须能在 Node 环境运行。' },
        { name: 'localStorage', message: '持久化不属于 core/config。' },
      ],
    },
  },
  {
    files: ['src/**/*.ts', 'tools/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: '随机行为必须使用 SeededRandom。' },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', 'tools/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];
