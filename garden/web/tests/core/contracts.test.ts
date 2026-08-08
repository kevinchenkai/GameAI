/**
 * tests/core/contracts.test.ts —— ★ 用测试守住冻结契约
 *
 * eslint 守语法层面（不许 import Phaser、不许出现 petXxx 标识符），
 * 本文件守**结构层面**：源码里是否真的没有那些字段。
 *
 * 两者互补：lint 挡新写的代码，测试挡"改坏了但 lint 规则没覆盖到"的情况。
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
  });
}

const coreFiles = walk(join(SRC, 'core'));
const configFiles = walk(join(SRC, 'config'));
const gameFiles = walk(join(SRC, 'game'));

describe('冻结契约 1 —— core/ 不认识 Phaser', () => {
  it('core/ 与 config/ 中没有 import Phaser', () => {
    for (const f of [...coreFiles, ...configFiles]) {
      const src = readFileSync(f, 'utf8');
      expect(src, `${f} 违反契约 1`).not.toMatch(/from\s+['"]phaser['"]/i);
    }
  });

  it('core/ 中没有 DOM / localStorage 依赖（关卡模拟器要能在 Node 里跑）', () => {
    for (const f of coreFiles) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      expect(src, `${f} 用了 DOM`).not.toMatch(/\b(document|localStorage)\s*\./);
    }
  });
});

describe('冻结契约 1 —— core/ 也不认识旺财', () => {
  it('★ CoreTurnSummary 不含 petSkillReady（PATCH A 修的就是这条）', () => {
    const types = readFileSync(join(SRC, 'core/types.ts'), 'utf8');
    const match = types.match(/interface CoreTurnSummary\s*\{[\s\S]*?\n\}/);
    expect(match, '找不到 CoreTurnSummary 定义').not.toBeNull();
    expect(match![0]).not.toMatch(/petSkillReady|petEnergy/);
  });

  it('core/ 里除 petAction.ts 外不出现宠物标识符', () => {
    for (const f of coreFiles) {
      if (f.endsWith('petAction.ts')) continue; // 契约 4 明文规定的边界文件
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      expect(code, `${f} 出现宠物概念`).not.toMatch(/\b[Pp]et[A-Z]\w*/);
      expect(code, `${f} 出现旺财`).not.toMatch(/wangcai/i);
    }
  });

  it('CoreGameEvent 中不含任何 pet* 事件', () => {
    const types = readFileSync(join(SRC, 'core/types.ts'), 'utf8');
    const match = types.match(/export type CoreGameEvent =[\s\S]*?;\n/);
    expect(match).not.toBeNull();
    expect(match![0]).not.toMatch(/t:\s*'pet/);
  });
});

describe('冻结契约 6 —— 素材路径只走 Asset Manifest', () => {
  it('game/ 中不出现硬编码素材文件名', () => {
    for (const f of gameFiles) {
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      expect(code, `${f} 硬编码了素材路径`).not.toMatch(/['"][^'"]*\.(png|jpg|jpeg|webp|mp3|ogg)['"]/);
    }
  });
});

describe('可复现随机 —— 禁止散用 Math.random()', () => {
  it('src/ 中除 rng.ts 外不出现 Math.random', () => {
    for (const f of [...coreFiles, ...configFiles, ...gameFiles]) {
      if (f.endsWith('core/rng.ts')) continue;
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      expect(code, `${f} 用了 Math.random()`).not.toMatch(/Math\s*\.\s*random/);
    }
  });

  it('rng.ts 本身也不依赖 Math.random（用的是自实现 mulberry32）', () => {
    const code = readFileSync(join(SRC, 'core/rng.ts'), 'utf8').replace(
      /\/\*[\s\S]*?\*\/|\/\/.*/g,
      '',
    );
    expect(code).not.toMatch(/Math\s*\.\s*random/);
  });
});

describe('冻结范围 —— Stage 0 不实现宠物技能', () => {
  it('决策入口只有 reaction 与 skillOffer 两种，没有直接给出 skill 的分支', () => {
    const src = readFileSync(join(SRC, 'game/pet/reactionResolver.ts'), 'utf8').replace(
      /\/\*[\s\S]*?\*\/|\/\/.*/g,
      '',
    );
    // 决策阶段绝不返回 state: 'skill'——那是窗口结束后才进入的状态
    expect(src).not.toMatch(/state:\s*'skill'/);
    expect(src).toMatch(/type:\s*'skillOffer'/);
  });
});
