import { describe, expect, it } from 'vitest';
import { resolvePetDecision } from '../../src/game/pet/reactionResolver';
import type { PetRuntimeState } from '../../src/game/pet/state';
import type { CoreTurnSummary } from '../../src/core/types';
import { COMBO_EXCITED_THRESHOLD } from '../../src/config/tuning';

function turn(over: Partial<CoreTurnSummary> = {}): CoreTurnSummary {
  return { maxCascade: 1, totalCleared: 3, specialCreated: [], result: 'continue', ...over };
}

function pet(over: Partial<PetRuntimeState> = {}): PetRuntimeState {
  return { energy: 0, maxEnergy: 100, skillReady: false, state: 'idle', ...over };
}

describe('resolvePetDecision —— 优先级 Victory > Pet Skill > Big Combo > Hint', () => {
  it('赢了演 victory', () => {
    expect(resolvePetDecision(turn({ result: 'win' }), pet())).toEqual({
      type: 'reaction',
      state: 'victory',
    });
  });

  it('输了演 encourage', () => {
    expect(resolvePetDecision(turn({ result: 'lose' }), pet())).toEqual({
      type: 'reaction',
      state: 'encourage',
    });
  });

  it('★ 赢了就不该再放技能 —— 即使技能已就绪', () => {
    const d = resolvePetDecision(turn({ result: 'win' }), pet({ skillReady: true }));
    expect(d).toEqual({ type: 'reaction', state: 'victory' });
  });

  it('★ 输了也不该放技能', () => {
    const d = resolvePetDecision(turn({ result: 'lose' }), pet({ skillReady: true }));
    expect(d).toEqual({ type: 'reaction', state: 'encourage' });
  });

  it('★ 技能就绪返回 skillOffer 而非 skill —— 此时棋盘还没变', () => {
    const d = resolvePetDecision(turn(), pet({ skillReady: true }));
    expect(d).toEqual({ type: 'skillOffer' });
    // 决策阶段永远不会直接给出 'skill'：那是窗口结束后才进入的状态
    expect(d).not.toEqual({ type: 'reaction', state: 'skill' });
  });

  it('★ 技能优先于大 Combo', () => {
    const d = resolvePetDecision(
      turn({ maxCascade: COMBO_EXCITED_THRESHOLD + 5 }),
      pet({ skillReady: true }),
    );
    expect(d).toEqual({ type: 'skillOffer' });
  });

  it('达到阈值的连锁演 excited', () => {
    expect(resolvePetDecision(turn({ maxCascade: COMBO_EXCITED_THRESHOLD }), pet())).toEqual({
      type: 'reaction',
      state: 'excited',
    });
  });

  it('未达阈值回落 idle', () => {
    expect(resolvePetDecision(turn({ maxCascade: COMBO_EXCITED_THRESHOLD - 1 }), pet())).toEqual({
      type: 'reaction',
      state: 'idle',
    });
  });

  it('Stage 0 场景：skillReady 恒 false 时，决策只在 victory/encourage/excited/idle 之间', () => {
    const stage0Pet = pet({ skillReady: false });
    const results = [
      resolvePetDecision(turn({ result: 'win' }), stage0Pet),
      resolvePetDecision(turn({ result: 'lose' }), stage0Pet),
      resolvePetDecision(turn({ maxCascade: 9 }), stage0Pet),
      resolvePetDecision(turn(), stage0Pet),
    ];
    for (const r of results) expect(r.type).toBe('reaction');
  });
});
