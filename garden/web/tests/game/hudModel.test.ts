/**
 * hudModel 单测 —— HUD "显示什么"的那一半
 *
 * ★ 拆出这一层就是为了让它可测：
 *   "还剩几步、目标完成没有、显示成几分之几"是可以断言的；
 *   "画得好不好看"只能靠眼睛。能测的部分不该混在 Phaser 里。
 */

import { describe, expect, it } from 'vitest';
import { buildHudView, MOVES_WARN_AT } from '../../src/game/ui/hudModel';
import { getLevel } from '../../src/config/levels/index';
import type { LevelConfig } from '../../src/core/types';

const level = (id: number): LevelConfig => getLevel(id) as LevelConfig;

describe('HUD 数据', () => {
  it('剩余步数原样透传', () => {
    const v = buildHudView(level(1), {}, 17);
    expect(v.movesLeft).toBe(17);
  });

  it('未开始时每个目标都是 0/N', () => {
    const lv = level(1);
    const v = buildHudView(lv, {}, lv.moves);
    expect(v.objectives).toHaveLength(lv.objectives.length);
    for (const o of v.objectives) {
      expect(o.done).toBe(0);
      expect(o.remaining).toBe(o.need);
      expect(o.complete).toBe(false);
    }
    expect(v.allComplete).toBe(false);
  });

  it('★★ 超额进度不会显示成 7/5 —— done 被夹在 need 以内', () => {
    const lv = level(1);
    const first = lv.objectives[0];
    if (!first || first.kind !== 'collect') throw new Error('关卡 1 的首个目标应是 collect');

    // 一次大连锁消掉远超目标的数量，progress 记的是原始值
    const progress = { [`collect:${first.piece}`]: first.count + 40 };
    const v = buildHudView(lv, progress, 10);
    const o = v.objectives[0];

    expect(o?.done).toBe(first.count); // ★ 不是 count + 40
    expect(o?.remaining).toBe(0);
    expect(o?.complete).toBe(true);
  });

  it('部分完成时 done/need 对得上', () => {
    const lv = level(1);
    const first = lv.objectives[0];
    if (!first || first.kind !== 'collect') throw new Error('关卡 1 的首个目标应是 collect');

    const partial = Math.max(1, Math.floor(first.count / 2));
    const v = buildHudView(lv, { [`collect:${first.piece}`]: partial }, 10);
    const o = v.objectives[0];

    expect(o?.done).toBe(partial);
    expect(o?.remaining).toBe(first.count - partial);
    expect(o?.complete).toBe(false);
  });

  it('★ 全部目标达成时 allComplete 为真', () => {
    const lv = level(1);
    const progress: Record<string, number> = {};
    for (const o of lv.objectives) {
      if (o.kind === 'collect') progress[`collect:${o.piece}`] = o.count;
      else if (o.kind === 'clearObstacle') progress[`clearObstacle:${o.obstacle}`] = o.count;
      else progress[`dropDown:${o.item}`] = o.count;
    }
    const v = buildHudView(lv, progress, 3);
    expect(v.allComplete).toBe(true);
    expect(v.objectives.every((o) => o.complete)).toBe(true);
  });

  it('collect 类带颜色（用来取棋子贴图），其它类没有', () => {
    const lv = level(1);
    const v = buildHudView(lv, {}, 10);
    for (const [i, o] of v.objectives.entries()) {
      const src = lv.objectives[i];
      if (src?.kind === 'collect') expect(o.color).toBe(src.piece);
      else expect(o.color).toBeNull();
    }
  });
});

describe('★ 步数吃紧提示', () => {
  it(`剩 ${MOVES_WARN_AT} 步及以下才告警`, () => {
    expect(buildHudView(level(1), {}, MOVES_WARN_AT + 1).movesLow).toBe(false);
    expect(buildHudView(level(1), {}, MOVES_WARN_AT).movesLow).toBe(true);
    expect(buildHudView(level(1), {}, 0).movesLow).toBe(true);
  });
});

describe('★ 含破障目标的关卡（关卡 4 起有冰）', () => {
  it('破障目标也能正确算出 done/need', () => {
    const lv = level(4);
    const ice = lv.objectives.find((o) => o.kind === 'clearObstacle');
    if (!ice || ice.kind !== 'clearObstacle') return; // 该关没有破障目标就跳过

    const v = buildHudView(lv, { [`clearObstacle:${ice.obstacle}`]: 2 }, 10);
    const o = v.objectives.find((x) => x.kind === 'clearObstacle');
    expect(o?.done).toBe(2);
    expect(o?.need).toBe(ice.count);
    expect(o?.color).toBeNull();
  });
});
