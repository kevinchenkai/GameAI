/**
 * tools/simulate.ts —— 关卡可解性模拟器 CLI
 *
 *   npm run simulate -- --level 12 --runs 1000
 *   npm run simulate -- --all --runs 200
 *   npm run simulate -- --level 3 --ai random
 *
 * 真正的模拟逻辑在 core/simulate.ts（那样才能被单测覆盖）。
 * 本文件只做参数解析与输出。
 */

import { LEVELS, getLevel } from '../src/config/levels/index';
import { formatReport, simulateLevel, type AiKind } from '../src/core/simulate';
import { validateLevelConfig } from '../src/core/validateLevel';

interface Args {
  level: number | null;
  all: boolean;
  runs: number;
  ai: AiKind;
  seed: number;
}

function parseArgs(argv: readonly string[]): Args {
  const num = (flag: string, fallback: number): number => {
    const i = argv.indexOf(flag);
    if (i < 0) return fallback;
    const raw = argv[i + 1];
    const n = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const aiRaw = argv[argv.indexOf('--ai') + 1];
  return {
    level: argv.includes('--level') ? num('--level', 1) : null,
    all: argv.includes('--all'),
    runs: num('--runs', 200),
    ai: aiRaw === 'random' ? 'random' : 'greedy',
    seed: num('--seed', 20260808),
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (LEVELS.length === 0) {
    console.log('尚无关卡数据（M7 补齐）。');
    console.log('用法：npm run simulate -- --level 1 --runs 500');
    return;
  }

  const targets = args.all
    ? LEVELS
    : (() => {
        const id = args.level ?? 1;
        const lv = getLevel(id);
        if (!lv) {
          console.error(`关卡 ${id} 不存在。可用：${LEVELS.map((l) => l.id).join(', ')}`);
          process.exit(1);
        }
        return [lv];
      })();

  console.log(`AI=${args.ai}  每关 ${args.runs} 局  seed=${args.seed}\n`);

  let anyProblem = false;
  for (const level of targets) {
    // ★ 先校验再模拟 —— 非法关卡的模拟结果没有意义
    const v = validateLevelConfig(level);
    if (!v.ok) {
      console.error(`关卡 ${level.id} 校验未通过，跳过模拟：`);
      for (const e of v.errors) console.error(`  ❌ [${e.code}] ${e.message}`);
      anyProblem = true;
      continue;
    }
    for (const w of v.warnings) console.warn(`  ⚠️  [${w.code}] ${w.message}`);

    const report = simulateLevel(level, { runs: args.runs, ai: args.ai, seed: args.seed });
    console.log(formatReport(report));
    console.log();

    // "各项指标正常" 与 "新手关…符合预期" 都表示无需调整
    const OK_PREFIXES = ['各项指标正常', '新手关'];
    if (report.suggestions.some((s) => !OK_PREFIXES.some((p) => s.startsWith(p)))) {
      anyProblem = true;
    }
  }

  if (anyProblem) {
    console.log('⚠️ 有关卡需要调整，见上面的建议。');
  } else {
    console.log('✅ 全部关卡指标正常。');
  }
}

main();
