/**
 * game/scenes/BootScene.ts —— 预加载
 *
 * ★ 素材路径一律走 ASSETS.*（冻结契约 6），本文件不得出现任何文件名字面量。
 *   （eslint 强制：src/game/** 里禁止出现 .png/.jpg 字面量）
 * ★ REFERENCE_ONLY 里的两张图（Master、Puppet 拼合预览）**不 preload**。
 */

import Phaser from 'phaser';
import { ASSETS } from '../../config/assets';
import { TEX } from '../textureKeys';
import { hideBootOverlay, setBootError, setBootProgress } from '../bootOverlay';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.bindLoaderProgress();

    // —— 棋子 ——
    for (const [color, path] of Object.entries(ASSETS.pieces)) {
      this.load.image(TEX.piece(color), path);
    }

    /**
     * ★★ UI 贴图与关卡背景**全部不加载** —— 它们一张都没被画过。
     *
     *   实测：`TEX.uiPanelBg / uiBtnPrimary / uiBtnPause / uiMovesBadge /
     *   uiObjectiveSlot / levelBg` 在渲染层的引用次数都是 **0**。
     *   Panel、HudView、ResultPanel 全部用 Graphics 画圆角矩形 ——
     *   这是刻意的（要按 DPR 缩放、要跟随主题色），不是漏画。
     *
     *   于是这 6 张一直在首屏白下载：**660KB，占首屏的 54%**，
     *   下载完就躺在纹理缓存里等着被 GC。
     *
     *   素材本身保留在 assets/（没删），将来真要用整图贴图时
     *   把这几行加回来即可 —— 但**别在没人画的时候预加载**。
     */

    // —— 障碍：冰（Stage 0 唯一障碍）——
    this.load.image(TEX.iceOverlay(1), ASSETS.obstacles.ice1);
    this.load.image(TEX.iceOverlay(2), ASSETS.obstacles.ice2);

    // —— 特殊棋子叠加层（Stage 0 三种，彩虹球不做）——
    this.load.image(TEX.overlayRocketH, ASSETS.overlays.rocketH);
    this.load.image(TEX.overlayRocketV, ASSETS.overlays.rocketV);
    this.load.image(TEX.overlayBomb, ASSETS.overlays.bomb);

    /**
     * ★★ 院门 4 张**故意不在这里加载**（M7 起改为 GardenScene 自己按需加载）。
     *
     *   它们合计 3064KB，占原首屏素材的 **78%**，而关卡页根本不显示它们 ——
     *   玩家要先通关 3 次才会看到花园。为了一张几分钟后才用得上的图
     *   让所有人多等几秒白屏，是纯亏。
     *
     *   见 docs/TODO-性能优化.md：首屏优化是 M8 真人测试的前置条件 ——
     *   带着 4MB 首屏去测，测到的是"加载慢"而不是"玩法好不好"。
     */

    /**
     * —— 旺财 Puppet 5 层（M6）——
     *
     * ★★ **只加载 Puppet 分层，不加载 happy / hint 整图。**
     *   Idle、开心、庆祝全部由这 5 层合成（PetView），整图是冗余的：
     *     Puppet 5 层  276 KB
     *     happy + hint 520 KB  ← 能表达的东西 Puppet 都能表达
     *   首屏每一 KB 都要还（docs/TODO-性能优化.md），这 520KB 不值得。
     *   将来若真要用整图（比如更复杂的庆祝），再按需 lazy load。
     *
     * ⚠️ preview-composite.png 是**风格参考图**，任何时候都不要 preload
     *   （216KB，且它是整体重绘的效果图，不参与合成 —— 见 pet-rig.ts）。
     */
    this.load.image(TEX.petBody, ASSETS.pet.puppet.body);
    this.load.image(TEX.petTail, ASSETS.pet.puppet.tail);
    this.load.image(TEX.petEars, ASSETS.pet.puppet.ears);
    this.load.image(TEX.petEyesOpen, ASSETS.pet.puppet.eyesOpen);
    this.load.image(TEX.petEyesBlink, ASSETS.pet.puppet.eyesBlink);

    /**
     * ★ `special.rainbow` 属 Stage 0.5，故意不在这里加载 ——
     *   preload 的每一张都会计入首屏，见 docs/TODO-性能优化.md。
     */
  }

  /**
   * 把 Phaser Loader 的进度喂给 HTML 层的进度条。
   *
   * ★ `FILE_LOAD_ERROR` 必须处理：素材 404 时 Phaser **不会中止**，
   *   它照常走完 `complete`，然后场景拿着一堆空纹理去画 ——
   *   表现是"游戏起来了但什么都看不见"，而控制台只有一行 warn。
   *   首次部署踩过一次（全部素材 404），当时排查了很久。
   */
  private bindLoaderProgress(): void {
    const failed: string[] = [];

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      setBootProgress(value);
    });

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      failed.push(file.key);
      console.error(`[Boot] 素材加载失败：${file.key} ← ${String(file.url)}`);
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (failed.length > 0) {
        setBootError(`有 ${failed.length} 项素材没能加载，画面可能不完整`);
      }
    });
  }

  create(): void {
    // ★ 必须在场景真正开始之后才收起遮罩，否则会露出一帧空背景
    hideBootOverlay();
    this.scene.start('Level');
  }
}
