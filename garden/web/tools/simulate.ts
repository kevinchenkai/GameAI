/**
 * tools/simulate.ts —— 关卡可解性模拟器（M3）
 *
 *   npm run simulate -- --level 12 --runs 1000
 *
 * ★ **这个工具应该在写关卡之前先做**（框架 §11.3）。
 *   手工试关一关 5 分钟，30 关调 3 轮 = 7.5 小时；模拟器 30 秒跑完。
 *   这是 30 关调优的刚需工具，也是 core/ 零 Phaser 依赖的最大回报——
 *   没有那条契约，这个文件根本跑不起来。
 *
 * 输出形如：
 *   关卡 12：通过率 68%  平均剩余步数 2.3  死局率 0.4%
 *   → 建议：通过率偏低，+2 步 或 减 1 色
 */

import { getLevel } from '../src/config/levels/index';

interface SimReport {
  readonly levelId: number;
  readonly runs: number;
  readonly winRate: number;
  readonly avgMovesLeft: number;
  readonly deadlockRate: number;
}

function parseArgs(argv: readonly string[]): { level: number; runs: number } {
  const get = (flag: string, fallback: number): number => {
    const i = argv.indexOf(flag);
    if (i < 0) return fallback;
    const raw = argv[i + 1];
    const n = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  return { level: get('--level', 1), runs: get('--runs', 1000) };
}

function main(): void {
  const { level: levelId, runs } = parseArgs(process.argv.slice(2));
  const level = getLevel(levelId);

  if (!level) {
    console.error(`关卡 ${levelId} 不存在（关卡数据在 M7 补齐）。`);
    process.exit(1);
  }

  // M3：用贪心 AI 跑 runs 局，统计 SimReport 并给出调优建议
  console.log(`模拟器待实现（M3）。目标关卡 ${levelId}，计划跑 ${runs} 局。`);
}

export type { SimReport };

main();
