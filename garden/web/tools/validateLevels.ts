/**
 * tools/validateLevels.ts —— 关卡批量校验（CI 用）
 *
 *   npm run validate-levels
 *
 * ★ 非法关卡**报错中止（exit 1），不静默失败**。
 *   同一份校验也纳入 npm test（tests/core/levels.test.ts）。
 */

import { LEVELS } from '../src/config/levels/index';
import { validateLevelConfig } from '../src/core/validateLevel';

function main(): void {
  if (LEVELS.length === 0) {
    console.log('尚无关卡数据（M7 补齐）。跳过校验。');
    return;
  }

  let failed = 0;
  for (const level of LEVELS) {
    const result = validateLevelConfig(level);
    for (const w of result.warnings) {
      console.warn(`⚠️  关卡 ${level.id} [${w.code}] ${w.message}`);
    }
    if (!result.ok) {
      failed++;
      for (const e of result.errors) {
        console.error(`❌ 关卡 ${level.id} [${e.code}] ${e.message}`);
      }
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} / ${LEVELS.length} 关校验未通过。`);
    process.exit(1);
  }
  console.log(`✅ ${LEVELS.length} 关全部通过校验。`);
}

main();
