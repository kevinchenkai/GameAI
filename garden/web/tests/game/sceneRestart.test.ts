/**
 * ★★ 回归：`scene.restart()` 后必须显式复位每一项局内状态
 *
 * Phaser 的 `scene.restart()` **不重建实例**，只是再跑一次 `create()`。
 * 所以"字段初始化式"（`private turn = createTurnState()`）只在第一次
 * 执行，之后永远保留上一局的值。
 *
 * 实测踩到：过关后点「下一关」，新关卡相位仍停在 `PRESENTATION` ——
 * **棋盘看着完全正常，但一下都点不动，且没有任何报错**。
 *
 * 这类 bug 用 Phaser 场景很难测（要真起一个引擎），所以这里退一步测
 * **契约本身**：把"该复位的字段"列成清单，逐条断言 create() 里有复位。
 * 源码文本检查比不测强得多 —— 至少加字段时会被提醒。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createTurnState } from '../../src/game/TurnController';
import { createGestureState } from '../../src/game/input/gesture';

const here = path.dirname(fileURLToPath(import.meta.url));
const SCENE = path.join(here, '../../src/game/scenes/LevelScene.ts');

/**
 * ★ 跨局必须复位的字段。
 *   新增"记录本局状态"的字段时，**要同时加到这里和 create() 里**。
 */
const MUST_RESET = [
  'this.turn = createTurnState();',
  'this.gesture = createGestureState();',
  'this.playStartedAt = 0;',
  'this.playTotalMs = 0;',
  'this.settingsButton = null;',
];

describe('★★ scene.restart() 后的状态复位', () => {
  it('★★ create() 里逐项复位了所有跨局状态', async () => {
    const src = await fs.readFile(SCENE, 'utf8');
    const create = src.slice(src.indexOf('create(): void {'));
    for (const line of MUST_RESET) {
      expect(create, `create() 缺少复位：${line}`).toContain(line);
    }
  });

  it('★ 复位用的是全新状态，不是复用旧对象', () => {
    const a = createTurnState();
    const b = createTurnState();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('★ 全新回合状态就是可输入的（否则重开后永远点不动）', () => {
    const t = createTurnState();
    expect(t.phase).toBe('READY_FOR_INPUT');
    expect(t.resultPopupOpen).toBe(false);
    expect(t.bufferedMove).toBeNull();
  });

  it('★ 全新手势状态是空的（残留选中会让重开后第一次滑动换错棋子）', () => {
    const g = createGestureState();
    expect(g.selected).toBeNull();
    expect(g.downCell).toBeNull();
    expect(g.consumed).toBe(false);
  });

  /**
   * ★ 这条守的是"别把复位写在 create() 外面"：
   *   写在构造函数里等于没写（restart 不调构造函数）。
   */
  it('★★ 复位必须在 create() 内，不能在构造函数里', async () => {
    const src = await fs.readFile(SCENE, 'utf8');
    const ctorStart = src.indexOf('constructor()');
    const ctorEnd = src.indexOf('create(): void {');
    const ctor = src.slice(ctorStart, ctorEnd);
    for (const line of MUST_RESET) {
      expect(ctor, `复位不该写在构造函数里：${line}`).not.toContain(line);
    }
  });
});
