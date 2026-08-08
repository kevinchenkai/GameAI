/**
 * 花园建设逻辑单测
 *
 * ★ 这里的数值直接决定 Stage 0 要验证的留存心理：
 *   「再玩两关，我就能把院门修好了」。
 *   算错了不会崩，只会让整场真人测试的结论不可信。
 */

import { describe, expect, it } from 'vitest';
import {
  allNodeProgress,
  buildNodeStage,
  focusedProgress,
  isNodeUnlocked,
  nodeProgress,
} from '../../src/meta/gardenProgress';
import { applyLevelResult, createDefaultSave, type Rating, type SaveData } from '../../src/meta/save';
import { GARDEN_ECONOMY, GARDEN_NODES } from '../../src/config/garden';

const GATE = GARDEN_NODES[0]!;

/** 打通若干关攒星 */
function withClears(n: number): SaveData {
  let s = createDefaultSave();
  for (let i = 1; i <= n; i++) s = applyLevelResult(s, i, 1 as Rating).save;
  return s;
}

describe('节点解锁', () => {
  it('院门在第 1 关就解锁（unlockAtLevel = 1）', () => {
    expect(isNodeUnlocked(GATE, 0)).toBe(true);
  });
});

describe('建设进度计算', () => {
  it('全新存档：0 阶段，差满额星星', () => {
    const p = nodeProgress(createDefaultSave(), GATE);
    expect(p.stage).toBe(0);
    expect(p.complete).toBe(false);
    expect(p.nextCost).toBe(GARDEN_ECONOMY.nodeStageCost);
    expect(p.starsShort).toBe(GARDEN_ECONOMY.nodeStageCost);
    expect(p.canBuild).toBe(false);
  });

  it('★ 打通 3 关正好能建第一阶段', () => {
    const p = nodeProgress(withClears(3), GATE);
    expect(p.starsShort).toBe(0);
    expect(p.canBuild).toBe(true);
  });

  it('★ 打通 2 关时"还差 1 颗" —— 这正是结算页要显示的信息', () => {
    const p = nodeProgress(withClears(2), GATE);
    expect(p.starsShort).toBe(1);
    expect(p.canBuild).toBe(false);
  });

  /**
   * ★★ 存档可能被改坏（写了个 99）。直接拿去索引 stages[] 会得到
   *   undefined，渲染层取 assetIndex 就崩了。必须夹紧。
   */
  it('★★ 存档里的阶段数越界要夹紧，不能让渲染层拿到 undefined', () => {
    const broken: SaveData = { ...createDefaultSave(), garden: { gate: 99 } };
    const p = nodeProgress(broken, GATE);
    expect(p.stage).toBe(GATE.stages.length);
    expect(p.complete).toBe(true);
    expect(p.nextCost).toBeNull();
  });

  it('★ 负数阶段同样夹紧到 0', () => {
    const broken: SaveData = { ...createDefaultSave(), garden: { gate: -5 } };
    expect(nodeProgress(broken, GATE).stage).toBe(0);
  });
});

describe('执行建设', () => {
  it('★ 建设后阶段 +1，星星记入 spent', () => {
    const s = withClears(3);
    const r = buildNodeStage(s, 'gate');
    expect(r.built).toBe(true);
    expect(r.newStage).toBe(1);
    expect(r.save.stars.progress.spent).toBe(GARDEN_ECONOMY.nodeStageCost);
  });

  /**
   * ★ earned 是累计产出（历史），spent 是消耗。
   *   从 earned 里直接减，就再也答不出"这个玩家一共赚了多少星"。
   */
  it('★ earned 不被扣减 —— 它是累计产出，不是余额', () => {
    const s = withClears(3);
    const r = buildNodeStage(s, 'gate');
    expect(r.save.stars.progress.earned).toBe(3);
  });

  it('★★ 星星不够时什么都不发生（不扣成负数、不抛异常）', () => {
    const s = withClears(2);
    const r = buildNodeStage(s, 'gate');
    expect(r.built).toBe(false);
    expect(r.save).toEqual(s);
    expect(r.save.stars.progress.spent).toBe(0);
  });

  it('未知节点 id 不崩', () => {
    const r = buildNodeStage(withClears(9), '不存在的节点');
    expect(r.built).toBe(false);
  });

  it('★ 建满 3 阶段需要 9 关，之后不能再建', () => {
    let s = withClears(9);
    for (let i = 0; i < GATE.stages.length; i++) {
      const r = buildNodeStage(s, 'gate');
      expect(r.built).toBe(true);
      s = r.save;
    }
    const p = nodeProgress(s, GATE);
    expect(p.complete).toBe(true);
    expect(buildNodeStage(s, 'gate').built).toBe(false);
  });

  it('★ 建设消耗后，余额正确反映在下一次判断上', () => {
    let s = withClears(4); // 4 颗
    s = buildNodeStage(s, 'gate').save; // 花 3 颗，剩 1
    const p = nodeProgress(s, GATE);
    expect(p.stage).toBe(1);
    expect(p.starsShort).toBe(GARDEN_ECONOMY.nodeStageCost - 1);
  });
});

describe('结算页焦点进度', () => {
  it('返回第一个未完成节点', () => {
    expect(focusedProgress(createDefaultSave())?.node.id).toBe('gate');
  });

  it('★ 全部建完返回 null（结算页就不显示进度条）', () => {
    let s = withClears(9);
    for (let i = 0; i < GATE.stages.length; i++) s = buildNodeStage(s, 'gate').save;
    expect(focusedProgress(s)).toBeNull();
  });
});

describe('Stage 0 范围', () => {
  it('只有院门 1 个节点、3 个阶段', () => {
    expect(allNodeProgress(createDefaultSave())).toHaveLength(1);
    expect(GATE.stages).toHaveLength(3);
  });

  it('★ 每阶段 3 颗星 —— 每 3 关就有一次可见变化', () => {
    for (const st of GATE.stages) expect(st.cost).toBe(GARDEN_ECONOMY.nodeStageCost);
  });
});
