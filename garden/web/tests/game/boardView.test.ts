/**
 * BoardView 单测 —— 用假 Phaser 场景测尺寸复位逻辑
 *
 * ★ 为什么值得为这点事写测试：
 *   M4 真机预览时出现过"棋子放大到占满半屏"。原因是 EventPlayer 在
 *   spawn 时用 `setScale(1)` 复位尺寸 —— 但素材原图 512px、一格只有
 *   ~40pt，`setDisplaySize` 设的是 ~0.078 的**分数缩放**，
 *   `setScale(1)` 等于把棋子放大到原图大小。
 *
 *   tsc 全过、365 项测试全绿，因为**没有任何一条测试碰过渲染尺寸**。
 *   这条补上那个缺口。
 */

import { describe, expect, it } from 'vitest';
import { BoardView } from '../../src/game/render/BoardView';
import { computeLayout } from '../../src/game/render/layout';
import { createSession } from '../../src/core/session';
import { getLevel } from '../../src/config/levels/index';
import type { LevelConfig } from '../../src/core/types';

/** 源贴图边长 —— 与美术工单一致（棋子 512×512） */
const SOURCE_PX = 512;

interface FakeImage {
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  scene: object | null;
  /** BoardView 靠 texture.key 判断叠加层要不要重建（rocketH → bomb） */
  texture: { key: string };
  setDisplaySize(w: number, h: number): FakeImage;
  setScale(s: number): FakeImage;
  setPosition(x: number, y: number): FakeImage;
  setAlpha(a: number): FakeImage;
  destroy(): void;
}

function makeFakeImage(scene: object, x: number, y: number, key = ''): FakeImage {
  const img: FakeImage = {
    x,
    y,
    texture: { key },
    displayWidth: SOURCE_PX,
    displayHeight: SOURCE_PX,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    scene,
    setDisplaySize(w, h) {
      img.displayWidth = w;
      img.displayHeight = h;
      // 真实 Phaser 语义：displaySize 反推 scale
      img.scaleX = w / SOURCE_PX;
      img.scaleY = h / SOURCE_PX;
      return img;
    },
    setScale(s) {
      img.scaleX = s;
      img.scaleY = s;
      img.displayWidth = SOURCE_PX * s;
      img.displayHeight = SOURCE_PX * s;
      return img;
    },
    setPosition(nx, ny) {
      img.x = nx;
      img.y = ny;
      return img;
    },
    setAlpha(a) {
      img.alpha = a;
      return img;
    },
    destroy() {
      img.scene = null;
    },
  };
  return img;
}

/** 只实现 BoardView 用到的那部分 Phaser.Scene */
function makeFakeScene() {
  const created: FakeImage[] = [];
  const scene = {
    add: {
      image(x: number, y: number, key: string) {
        const img = makeFakeImage(scene, x, y, key);
        created.push(img);
        return img;
      },
      graphics() {
        const g = {
          fillStyle: () => g,
          fillRoundedRect: () => g,
          lineStyle: () => g,
          strokeRoundedRect: () => g,
          destroy: () => undefined,
        };
        return g;
      },
      container() {
        return {
          add: () => undefined,
          removeAll: () => undefined,
          bringToTop: () => undefined,
        };
      },
    },
  };
  return { scene, created };
}

const LAYOUT = computeLayout(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });

function buildView() {
  const { scene, created } = makeFakeScene();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const view = new BoardView(scene as any, LAYOUT);
  const level = getLevel(1) as LevelConfig;
  const session = createSession(level, 20260808);
  view.build(session.board);
  return { view, created, session };
}

describe('★ 回归：棋子尺寸不会被复位成原图大小', () => {
  it('建出来的棋子就是一格大小，不是 512px', () => {
    const { created } = buildView();
    expect(created.length).toBeGreaterThan(0);
    for (const img of created) {
      expect(img.displayWidth).toBeLessThan(LAYOUT.pieceSizePt + 1);
      expect(img.displayWidth).toBeGreaterThan(0);
    }
  });

  it('★★ resetSpriteSize 复位后仍是一格大小（曾经 setScale(1) 把它放大到 512）', () => {
    const { view, created } = buildView();
    const img = created[0];
    if (!img) throw new Error('没有创建任何精灵');
    const expected = img.displayWidth;

    // 模拟消除动画把它缩到 0
    img.setScale(0);
    expect(img.displayWidth).toBe(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view.resetSpriteSize(img as any);
    expect(img.displayWidth).toBeCloseTo(expected, 5);
    // ★ 关键断言：绝不能等于原图尺寸
    expect(img.displayWidth).not.toBe(SOURCE_PX);
  });

  it('★ 棋子不超出格子（留缝，不互相挤）', () => {
    const { created } = buildView();
    for (const img of created) {
      expect(img.displayWidth).toBeLessThanOrEqual(LAYOUT.pieceSizePt);
    }
  });
});

describe('★★ 回归：reconcile 让渲染层与 core 的棋盘完全对齐', () => {
  /**
   * M4 实测过一次：core 有 64 个棋子，渲染层只剩 51 个 ——
   * 精灵的增删分散在动画里，任何一条路径漏掉，渲染就和 core 悄悄分家，
   * **不报错，只是有些棋子看不见**。
   */
  const idsOnBoard = (session: ReturnType<typeof createSession>): number[] => {
    const out: number[] = [];
    for (const c of session.board.cells) if (c?.piece) out.push(c.piece.id);
    return out;
  };

  it('★ 漏建的精灵会被补回来', () => {
    const { view, session } = buildView();
    const ids = idsOnBoard(session);
    // 模拟"动画路径漏掉了几个 spawn"
    for (const id of ids.slice(0, 10)) view.removeSprite(id);
    for (const id of ids.slice(0, 10)) expect(view.spriteOf(id)).toBeUndefined();

    view.reconcile(session.board);
    for (const id of ids) expect(view.spriteOf(id), `棋子 ${id} 没有精灵`).toBeDefined();
  });

  it('★ 残留的"幽灵棋子"会被删掉', () => {
    const { view, session } = buildView();
    const ghostPiece = { id: 999999, color: 'red', special: 'none' } as const;
    view.ensureSprite(ghostPiece, { col: 0, row: 0 });
    expect(view.spriteOf(999999)).toBeDefined();

    view.reconcile(session.board);
    expect(view.spriteOf(999999)).toBeUndefined();
  });

  it('★ 对账后精灵数恰好等于棋盘上的棋子数', () => {
    const { view, session } = buildView();
    const ids = idsOnBoard(session);
    view.removeSprite(ids[0] as number);
    view.ensureSprite({ id: 888888, color: 'blue', special: 'none' }, { col: 0, row: 0 });

    view.reconcile(session.board);
    const alive = ids.filter((id) => view.spriteOf(id) !== undefined);
    expect(alive.length).toBe(ids.length);
    expect(view.spriteOf(888888)).toBeUndefined();
  });

  it('★ 对账后尺寸仍是一格大小（不会顺手放大成原图）', () => {
    const { view, session, created } = buildView();
    const ids = idsOnBoard(session);
    view.removeSprite(ids[0] as number);
    view.reconcile(session.board);
    for (const img of created) {
      if (img.scene === null) continue; // 已销毁的不算
      expect(img.displayWidth).toBeLessThanOrEqual(LAYOUT.pieceSizePt);
      expect(img.displayWidth).not.toBe(SOURCE_PX);
    }
  });

  it('★ 重复对账是幂等的（不会越对越多）', () => {
    const { view, session } = buildView();
    const ids = idsOnBoard(session);
    view.reconcile(session.board);
    view.reconcile(session.board);
    view.reconcile(session.board);
    const alive = ids.filter((id) => view.spriteOf(id) !== undefined);
    expect(alive.length).toBe(ids.length);
  });
});

/**
 * ★ 冰块是 Stage 0 唯一障碍，且它的**玩法语义靠渲染传达**：
 *   玩家要能看见冰下面是什么棋子，才能规划下一步。
 *   所以"冰有没有画出来""棋子有没有一起活着"必须锁住。
 */
describe('★ 冰块覆盖层', () => {
  const buildIceView = () => {
    const { scene, created } = makeFakeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = new BoardView(scene as any, LAYOUT);
    // 关卡 4 是首个含冰关卡（6 块 1hp 冰）
    const level = getLevel(4) as LevelConfig;
    const session = createSession(level, 20260808);
    view.build(session.board);
    return { view, created, session };
  };

  it('★ 冰下面的棋子仍然存在（冰是护甲，不是替换）', () => {
    const { view, session } = buildIceView();
    let iced = 0;
    const b = session.board;
    for (let row = 0; row < b.rows; row++) {
      for (let col = 0; col < b.cols; col++) {
        const cell = b.cells[row * b.cols + col];
        if (!cell?.obstacle) continue;
        iced++;
        expect(cell.piece, '冰格下必须有棋子').toBeTruthy();
        expect(view.spriteOf(cell.piece!.id), '冰下棋子必须有精灵').toBeDefined();
      }
    }
    expect(iced).toBeGreaterThan(0); // 确认这关真的有冰
  });

  it('★ 冰被清掉后棋子精灵仍在（obstacleClear 不该带走棋子）', () => {
    const { view, session } = buildIceView();
    const b = session.board;
    let target: { col: number; row: number; id: number } | null = null;
    for (let row = 0; row < b.rows && !target; row++) {
      for (let col = 0; col < b.cols && !target; col++) {
        const cell = b.cells[row * b.cols + col];
        if (cell?.obstacle && cell.piece) target = { col, row, id: cell.piece.id };
      }
    }
    if (!target) throw new Error('关卡 4 应当有冰');

    view.clearObstacle({ col: target.col, row: target.row });
    expect(view.spriteOf(target.id)).toBeDefined();
  });

  it('★ reconcile 后冰仍在（对账不能把障碍弄丢）', () => {
    const { view, session } = buildIceView();
    view.reconcile(session.board);
    const b = session.board;
    for (let row = 0; row < b.rows; row++) {
      for (let col = 0; col < b.cols; col++) {
        const cell = b.cells[row * b.cols + col];
        if (cell?.piece) expect(view.spriteOf(cell.piece.id)).toBeDefined();
      }
    }
  });
});

describe('★ 回归：不把已销毁的精灵交出去', () => {
  it('spriteOf 对已销毁的精灵返回 undefined', () => {
    const { view, session } = buildView();
    const firstCell = session.board.cells.find((c) => c.piece);
    const id = firstCell?.piece?.id;
    if (id === undefined) throw new Error('棋盘上没有棋子');

    expect(view.spriteOf(id)).toBeDefined();
    view.removeSprite(id);
    expect(view.spriteOf(id)).toBeUndefined();
  });

  it('ensureSprite 对已销毁的 id 重建，而不是返回死引用', () => {
    const { view, session, created } = buildView();
    const cell = session.board.cells.find((c) => c.piece);
    const piece = cell?.piece;
    if (!piece) throw new Error('棋盘上没有棋子');

    const before = created.length;
    view.removeSprite(piece.id);
    const revived = view.ensureSprite(piece, { col: 0, row: 0 });

    expect(created.length).toBe(before + 1); // 确实新建了
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((revived as any).scene).not.toBeNull();
  });
});

describe('★★ 特殊棋子叠加层', () => {
  const OVERLAY_KEYS = ['overlay-rocket-h', 'overlay-rocket-v', 'overlay-bomb'];
  const overlays = (created: FakeImage[]): FakeImage[] =>
    created.filter((i) => OVERLAY_KEYS.includes(i.texture.key) && i.scene !== null);

  /** 把棋盘上第一颗棋子改造成特殊棋子（core 的 Piece 是 readonly，测试里绕过） */
  const makeSpecial = (
    session: ReturnType<typeof createSession>,
    kind: 'rocketH' | 'rocketV' | 'bomb' | 'none',
  ): number => {
    const cell = session.board.cells.find((c) => c.piece);
    const piece = cell?.piece;
    if (!piece) throw new Error('棋盘上没有棋子');
    (piece as { special: string }).special = kind;
    return piece.id;
  };

  it('普通棋盘上一个叠加层都不该有', () => {
    const { created } = buildView();
    expect(overlays(created)).toHaveLength(0);
  });

  it('★ 棋子变成特殊棋子后，对账会补上叠加层', () => {
    const { view, session, created } = buildView();
    makeSpecial(session, 'rocketH');

    view.reconcile(session.board);

    const ov = overlays(created);
    expect(ov).toHaveLength(1);
    expect(ov[0]?.texture.key).toBe('overlay-rocket-h');
  });

  it('★★ 叠加层满格，不乘 PIECE_FILL —— 火箭要触到格子两端才能连成线', () => {
    const { view, session, created } = buildView();
    makeSpecial(session, 'rocketH');
    view.reconcile(session.board);

    const ov = overlays(created)[0];
    if (!ov) throw new Error('没有叠加层');
    expect(ov.displayWidth).toBeCloseTo(LAYOUT.pieceSizePt, 5);
    // 棋子本身是留缝的，叠加层必须比它大
    expect(ov.displayWidth).toBeGreaterThan(view.pieceSize);
  });

  it('★★ 特殊棋子被消耗后，叠加层不会赖在棋盘上', () => {
    const { view, session, created } = buildView();
    makeSpecial(session, 'bomb');
    view.reconcile(session.board);
    expect(overlays(created)).toHaveLength(1);

    // 特殊属性被消耗掉（core 语义：放完就变回普通棋子）
    makeSpecial(session, 'none');
    view.reconcile(session.board);
    expect(overlays(created)).toHaveLength(0);
  });

  it('★★ 棋子被消除后，叠加层跟着一起消失（不留浮在空格上的火箭）', () => {
    const { view, session, created } = buildView();
    const id = makeSpecial(session, 'rocketV');
    view.reconcile(session.board);
    expect(overlays(created)).toHaveLength(1);

    view.removeSprite(id);
    expect(overlays(created)).toHaveLength(0);
  });

  it('★ 种类变了要换贴图，不是留着旧的', () => {
    const { view, session, created } = buildView();
    makeSpecial(session, 'rocketH');
    view.reconcile(session.board);
    expect(overlays(created)[0]?.texture.key).toBe('overlay-rocket-h');

    makeSpecial(session, 'bomb');
    view.reconcile(session.board);

    const ov = overlays(created);
    expect(ov).toHaveLength(1);
    expect(ov[0]?.texture.key).toBe('overlay-bomb');
  });

  it('★ 反复对账不会堆出重复叠加层', () => {
    const { view, session, created } = buildView();
    makeSpecial(session, 'bomb');
    for (let i = 0; i < 5; i++) view.reconcile(session.board);
    expect(overlays(created)).toHaveLength(1);
  });

  it('★ followOverlay 让标记跟住棋子（下落中不脱节）', () => {
    const { view, session, created } = buildView();
    const id = makeSpecial(session, 'rocketH');
    view.reconcile(session.board);

    const sprite = view.spriteOf(id) as unknown as FakeImage;
    sprite.setPosition(123, 456);
    sprite.setAlpha(0.5);
    view.followOverlay(id);

    const ov = overlays(created)[0];
    expect(ov?.x).toBe(123);
    expect(ov?.y).toBe(456);
    expect(ov?.alpha).toBe(0.5);
  });

  it('★ clear() 把叠加层也清干净', () => {
    const { view, session, created } = buildView();
    makeSpecial(session, 'bomb');
    view.reconcile(session.board);
    view.clear();
    expect(overlays(created)).toHaveLength(0);
  });
});
