import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

/**
 * 这份配置的作用不是"代码风格"，而是**用机器强制框架 §14 的冻结契约**。
 * 契约靠人自觉会漏，靠 lint 才不会。每条规则下面注明它守的是哪条契约。
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/assets/**'],
  },

  // ——— 通用 ———
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error', // 契约：不写 any
      '@typescript-eslint/consistent-type-imports': 'warn',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ——— 契约 1：core/ 与 config/ 零 Phaser 依赖，且不认识旺财 ———
  {
    files: ['src/core/**/*.ts', 'src/config/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'phaser', message: '契约 1：core/ 与 config/ 零 Phaser 依赖。' },
          ],
          patterns: [
            {
              group: ['**/game/**'],
              message: '契约 1：core/ 与 config/ 不得依赖 game/ 层（依赖方向是单向的）。',
            },
          ],
        },
      ],
    },
  },

  // ——— 契约 1（续）：core/ 里不得出现宠物概念 ———
  // config/pet.ts 是宠物**配置**，属于合法例外，故只对 core/ 施加。
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // 匹配 petXxx / PetXxx 标识符；PetActionCommand 例外见下方 override
          selector: 'Identifier[name=/^[Pp]et[A-Z]/]',
          message:
            '契约 1：core/ 不认识旺财。宠物状态属于 game/pet/ 层。' +
            '（唯一例外是 core/petAction.ts 的 PetActionCommand——core 只认识"命令"，不认识"谁发的"。）',
        },
        {
          selector: 'Identifier[name=/^(wangcai|Wangcai)/]',
          message: '契约 1：core/ 不认识旺财。',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: '契约：core/ 必须能在 Node 里跑（关卡模拟器依赖此点）。' },
        { name: 'document', message: '契约：core/ 必须能在 Node 里跑。' },
        { name: 'localStorage', message: '契约：core/ 无副作用，存档归 meta/ 层。' },
      ],
    },
  },

  // core/petAction.ts 是契约 4 明文规定的边界文件，豁免上面的命名限制
  {
    files: ['src/core/petAction.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // ——— 可复现随机：禁止散用 Math.random() ———
  {
    files: ['src/**/*.ts', 'tools/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: '随机必须走 core/rng.ts 的可种子化实现——复现 bug 依赖它。',
        },
      ],
    },
  },

  // rng.ts 自己是随机的唯一来源，但它用的是自实现 PRNG，不需要 Math.random
  // 这里保留 override 位以备将来需要（如 createRandomSeed 用时间戳而非 Math.random）
  {
    files: ['src/core/rng.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },

  // ——— 契约 6：素材路径只走 Asset Manifest ———
  {
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/\\.(png|jpg|jpeg|webp|mp3|ogg)$/]',
          message: '契约 6：素材路径只走 config/assets.ts 的 ASSETS.*，不得硬编码文件名。',
        },
      ],
    },
  },

  // config/assets.ts 就是 Manifest 本身，是唯一允许出现文件名的地方
  {
    files: ['src/config/assets.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // ——— 测试与工具放宽 ———
  {
    files: ['tests/**/*.ts', 'tools/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
