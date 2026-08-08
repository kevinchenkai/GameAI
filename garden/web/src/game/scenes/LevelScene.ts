/**
 * game/scenes/LevelScene.ts —— 关卡场景（M0 骨架，实现见 M4/M5）
 *
 * 职责边界（不要越界）：
 *   - 拿玩家输入 → 交给 core.applyMove()
 *   - 拿 CoreGameEvent[] → 交给 EventPlayer 播放、交给 PetController 消费
 *   - **不自己维护棋盘状态**（事件序列是唯一真相源）
 *   - **不自己决定何时解锁输入**（归 TurnController，冻结契约 7）
 */

import Phaser from 'phaser';

export class LevelScene extends Phaser.Scene {
  constructor() {
    super('Level');
  }

  create(): void {
    // M4：布局（computeLayout）→ 建棋盘精灵 → 接输入
  }
}
