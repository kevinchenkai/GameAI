import { describe, expect, it } from 'vitest';
import { createDemoState } from '../src/game/config/demoLevel';
import { GameModel } from '../src/game/core/GameModel';

describe('GameModel', () => {
  it('使用 RuleEngine 推进并可重新开始', () => {
    const model = new GameModel(createDemoState());
    model.pick(0);
    expect(model.state.columns[0]).toHaveLength(1);
    model.restart();
    expect(model.state.columns[0]).toHaveLength(2);
    expect(model.state.tray).toEqual([]);
    expect(model.state.moveCount).toBe(0);
  });

  it('对外返回快照，不允许绕过模型改内部状态', () => {
    const model = new GameModel(createDemoState());
    const external = model.state;
    external.columns[0]?.pop();
    expect(model.state.columns[0]).toHaveLength(2);
  });
});
