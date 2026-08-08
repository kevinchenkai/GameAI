/**
 * game/render/BoardView.ts —— 棋盘精灵的持有者
 *
 * ★ 冻结契约：**渲染层不维护自己的棋盘状态**。
 *   本类只持有 `pieceId → Sprite` 的映射 —— 那是"哪个精灵代表哪个棋子"，
 *   不是"棋盘长什么样"。想知道某格现在是什么，问 core，不要问这里。
 *
 * ★ 为什么按 **pieceId** 索引而不是按坐标：
 *   下落时同一个棋子换了格子，但它还是同一个精灵（要做位移动画）。
 *   按坐标索引就得在每次 fall 后重建映射，既慢又容易错位。
 *   core 给每个棋子发了稳定 id，正是为这个准备的。
 */

import type Phaser from 'phaser';
import type { BoardState, Piece, Pos, SpecialKind } from '../../core/types';
import { cellCenter, type LayoutResult } from './layout';
import { TEX } from '../textureKeys';

/** 棋子贴图相对格子的占比 —— 留一点缝，棋子之间不要挤在一起 */
const PIECE_FILL = 0.86;

/**
 * 特殊棋子 → 叠加层纹理。`none` 与 `rainbow` 无叠加层
 * （rainbow 是独立整图素材，且 Stage 0 不做）。
 */
const OVERLAY_TEX: Partial<Record<SpecialKind, string>> = {
  rocketH: TEX.overlayRocketH,
  rocketV: TEX.overlayRocketV,
  bomb: TEX.overlayBomb,
};

export class BoardView {
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly obstacleFx = new Map<string, Phaser.GameObjects.Image>();
  /**
   * 特殊棋子叠加层，按 **pieceId** 索引（和棋子精灵一致，不按坐标）——
   * 叠加层要跟着棋子一起下落，坐标每回合都在变。
   */
  private readonly overlayFx = new Map<number, Phaser.GameObjects.Image>();
  private readonly layer: Phaser.GameObjects.Container;
  private selection: Phaser.GameObjects.Graphics | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private layout: LayoutResult,
  ) {
    this.layer = scene.add.container(0, 0);
  }

  /** 建立初始棋盘的全部精灵 */
  build(board: BoardState): void {
    this.clear();
    this.drawBackdrop(board);
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row * board.cols + col];
        if (!cell || !cell.piece) continue;
        const sprite = this.createSprite(cell.piece, { col, row });
        this.syncOverlay(cell.piece, sprite);
        if (cell.obstacle) this.showObstacle({ col, row }, cell.obstacle.hp);
      }
    }
  }

  /**
   * ★ 与 core 的棋盘**对账** —— 每回合结束调用一次。
   *
   *   动机：精灵的增删分散在动画里（`match` 靠补间 onComplete 销毁、
   *   `spawn` 靠事件补建），任何一条路径漏掉，渲染就和 core 悄悄分家 ——
   *   **不报错，只是有些棋子看不见或者赖着不走**。
   *   M4 实测过一次：core 有 64 个棋子，渲染层只剩 51 个。
   *
   *   与其在每条动画路径上小心翼翼，不如每回合结束核对一次总账：
   *   core 有而我没有的补建，我有而 core 没有的删掉。
   *   代价是 O(格子数)，一回合一次，可以忽略。
   *
   * ⚠️ 这**不违反**"渲染层不维护棋盘状态"：这里是拿 core 的棋盘当真相
   *   去校正自己，方向是单向的 —— 正是契约要求的那个方向。
   */
  reconcile(board: BoardState): void {
    const wanted = new Map<number, Pos>();
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row * board.cols + col];
        if (cell?.piece) wanted.set(cell.piece.id, { col, row });
      }
    }

    // core 有、渲染层没有 → 补建（并摆到正确位置）
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const piece = board.cells[row * board.cols + col]?.piece;
        if (!piece) continue;
        const sprite = this.ensureSprite(piece, { col, row });
        const c = cellCenter(this.layout, col, row);
        sprite.setPosition(c.x, c.y);
        sprite.setAlpha(1);
        this.resetSpriteSize(sprite);
        // ★ 叠加层一并对账：棋子可能在本回合刚变成 / 不再是特殊棋子
        this.syncOverlay(piece, sprite);
      }
    }

    // 渲染层有、core 没有 → 删掉（残留的"幽灵棋子"）
    for (const id of [...this.sprites.keys()]) {
      if (!wanted.has(id)) this.removeSprite(id);
    }
    // 叠加层同理：棋子没了，它的标记也不该赖着
    for (const id of [...this.overlayFx.keys()]) {
      if (!wanted.has(id)) this.removeOverlay(id);
    }

    // 障碍同理对账
    for (const [key, g] of this.obstacleFx) {
      const parts = key.split(',');
      const col = Number(parts[0]);
      const row = Number(parts[1]);
      const cell = board.cells[row * board.cols + col];
      if (!cell?.obstacle) {
        g.destroy();
        this.obstacleFx.delete(key);
      }
    }
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row * board.cols + col];
        if (cell?.obstacle) this.showObstacle({ col, row }, cell.obstacle.hp);
      }
    }
  }

  /** 棋盘底板：把可玩格子画出来，洞不画 —— 玩家要能看出哪里是洞 */
  private drawBackdrop(board: BoardState): void {
    const g = this.scene.add.graphics();
    const s = this.layout.pieceSizePt;
    g.fillStyle(0x000000, 0.06);
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row * board.cols + col];
        if (!cell || cell.blocked) continue;
        const c = cellCenter(this.layout, col, row);
        g.fillRoundedRect(c.x - s / 2 + 2, c.y - s / 2 + 2, s - 4, s - 4, 8);
      }
    }
    this.layer.add(g);
  }

  private createSprite(piece: Piece, at: Pos): Phaser.GameObjects.Image {
    const c = cellCenter(this.layout, at.col, at.row);
    const img = this.scene.add.image(c.x, c.y, TEX.piece(piece.color));
    this.resetSpriteSize(img);
    this.layer.add(img);
    this.sprites.set(piece.id, img);
    return img;
  }

  /**
   * ★ 把精灵尺寸复位到"一格该有的大小"。
   *
   * ⚠️ **不要在外部用 `setScale(1)` 复位**。素材原图是 512px，
   *   一格只有 ~40pt，`setDisplaySize` 设的是 ~0.078 的**分数缩放**；
   *   `setScale(1)` 会把棋子放大到原图尺寸 —— 一颗苹果占满半个屏幕。
   *   （这个 bug 在 M4 真机预览里出现过，靠单测抓不到，只能靠看。）
   */
  resetSpriteSize(img: Phaser.GameObjects.Image): void {
    const size = this.layout.pieceSizePt * PIECE_FILL;
    img.setDisplaySize(size, size);
  }

  /**
   * ★ 只返回**还活着**的精灵。
   *
   *   消除是靠补间的 onComplete 销毁的，销毁与"从 map 里删掉"之间
   *   存在一个窗口；把已销毁的精灵交出去，后续 tween 会静默失效，
   *   表现成"某个棋子不动了"——极难定位。
   */
  spriteOf(id: number): Phaser.GameObjects.Image | undefined {
    const s = this.sprites.get(id);
    if (!s || !s.scene) return undefined;
    return s;
  }

  /** 供 EventPlayer 在 spawn 时补建精灵 */
  ensureSprite(piece: Piece, at: Pos): Phaser.GameObjects.Image {
    const existing = this.spriteOf(piece.id);
    if (existing) return existing;
    // 已销毁的残留条目要先清掉，否则 map 会越积越大
    this.sprites.delete(piece.id);
    return this.createSprite(piece, at);
  }

  removeSprite(id: number): void {
    // ★ 先撤标记再撤棋子 —— 否则棋子消失了，火箭还浮在空格上
    this.removeOverlay(id);
    const s = this.sprites.get(id);
    if (!s) return;
    s.destroy();
    this.sprites.delete(id);
  }

  /**
   * 冰块覆盖层。
   *
   * ★ **必须画在棋子之上** —— 冰是盖在棋子上的一层护甲（core 语义：
   *   棋子照常参与匹配，冰只是挡住一次消除）。画在棋子下面就看不见了。
   *
   * ★ ice-1 / ice-2 均已交付，两张都是真半透明
   *   （有效不透明度 48% / 44%，ice-2 靠**裂纹更少、边缘更实**表达"更厚"，
   *   不是靠更不透明 —— 这是刻意的，见下）。
   *
   * ⚠️ 不要因为"想让冰更明显"而调高不透明度：
   *   实测 48% 已经把六色的最小相邻灰度差从 22.7 压到 12.3
   *   （详见 orders/LEGIBILITY-SPEC.md §5.1）。再高会连色相层一起吃掉。
   */
  showObstacle(at: Pos, hp: number): void {
    const key = `${at.col},${at.row}`;
    this.obstacleFx.get(key)?.destroy();
    const s = this.layout.pieceSizePt;
    const c = cellCenter(this.layout, at.col, at.row);

    // hp ≥ 2 用更厚的那张贴图；两张不透明度相近，差别在裂纹与边缘
    const img = this.scene.add.image(c.x, c.y, TEX.iceOverlay(hp >= 2 ? 2 : 1));
    img.setDisplaySize(s, s);
    this.layer.add(img);
    // ★ 显式置顶 —— 不依赖"恰好后加入"这种巧合。
    //   棋子会在 spawn / reconcile 时后加入 layer，不置顶就会盖住冰。
    this.layer.bringToTop(img);
    this.obstacleFx.set(key, img);
  }

  clearObstacle(at: Pos): void {
    const key = `${at.col},${at.row}`;
    this.obstacleFx.get(key)?.destroy();
    this.obstacleFx.delete(key);
  }

  /**
   * 把某个棋子的特殊叠加层同步到位。
   *
   * ★ 叠加层是**通用素材**（3 张，不分颜色），叠在普通棋子贴图之上 ——
   *   所以特殊棋子会保留自己的水果外观，玩家仍看得出"这是一颗苹果，
   *   而且它蓄了能量"。这正是 6×3=18 张独立素材换不来的好处。
   *
   * ★ 叠加层**满格**（不乘 PIECE_FILL）：火箭要触到格子两端，
   *   多格相接才能连成一条线。棋子留缝、标记不留缝，是刻意的。
   *
   * ⚠️ 位置必须跟着棋子精灵走，而不是重新算格心 ——
   *   下落补间进行中时格心是"终点"，跟着精灵才不会脱节。
   */
  private syncOverlay(piece: Piece, sprite: Phaser.GameObjects.Image): void {
    const key = OVERLAY_TEX[piece.special];
    const existing = this.overlayFx.get(piece.id);

    if (!key) {
      // 特殊棋子被消耗掉了（或从来就是普通棋子）
      if (existing) {
        existing.destroy();
        this.overlayFx.delete(piece.id);
      }
      return;
    }

    const size = this.layout.pieceSizePt;
    let img = existing;
    // 换了种类（如 rocketH → bomb）就重建，纹理 key 无法原地改得干净
    if (img && img.texture.key !== key) {
      img.destroy();
      img = undefined;
      this.overlayFx.delete(piece.id);
    }
    if (!img || !img.scene) {
      img = this.scene.add.image(sprite.x, sprite.y, key);
      this.layer.add(img);
      this.overlayFx.set(piece.id, img);
    }
    img.setPosition(sprite.x, sprite.y);
    img.setDisplaySize(size, size);
    img.setAlpha(sprite.alpha);
    // ★ 必须在棋子之上；棋子会在 spawn / reconcile 时后加入 layer
    this.layer.bringToTop(img);
  }

  /** 叠加层跟随棋子精灵移动 —— 下落 / 交换补间每帧调用 */
  followOverlay(pieceId: number): void {
    const img = this.overlayFx.get(pieceId);
    const sprite = this.spriteOf(pieceId);
    if (!img || !img.scene) return;
    if (!sprite) {
      img.destroy();
      this.overlayFx.delete(pieceId);
      return;
    }
    img.setPosition(sprite.x, sprite.y);
    img.setAlpha(sprite.alpha);
  }

  private removeOverlay(id: number): void {
    this.overlayFx.get(id)?.destroy();
    this.overlayFx.delete(id);
  }

  /** 点选模式的选中框 */
  showSelection(at: Pos | null): void {
    this.selection?.destroy();
    this.selection = null;
    if (!at) return;
    const s = this.layout.pieceSizePt;
    const c = cellCenter(this.layout, at.col, at.row);
    const g = this.scene.add.graphics();
    g.lineStyle(4, 0xffb03a, 1);
    g.strokeRoundedRect(c.x - s / 2 + 2, c.y - s / 2 + 2, s - 4, s - 4, 8);
    this.layer.add(g);
    this.selection = g;
  }

  positionOf(at: Pos): { x: number; y: number } {
    return cellCenter(this.layout, at.col, at.row);
  }

  get pieceSize(): number {
    return this.layout.pieceSizePt * PIECE_FILL;
  }

  setLayout(layout: LayoutResult): void {
    this.layout = layout;
  }

  clear(): void {
    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
    for (const g of this.overlayFx.values()) g.destroy();
    this.overlayFx.clear();
    for (const g of this.obstacleFx.values()) g.destroy();
    this.obstacleFx.clear();
    this.selection?.destroy();
    this.selection = null;
    this.layer.removeAll(true);
  }
}
