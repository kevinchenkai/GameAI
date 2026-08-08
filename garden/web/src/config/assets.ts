/**
 * config/assets.ts —— Asset Manifest ★ 唯一的素材路径真相源（冻结契约 6）
 *
 * ★ 硬性纪律：Scene / Gameplay 代码中**不允许出现任何硬编码素材文件名**
 *   （eslint 强制：src/game/** 里禁止出现 .png/.jpg 字面量）。
 *
 * 这一层间接同时满足两条看似冲突的原则：
 *   | 开发期（未部署） | ✅ 同名覆盖（piece-red.png 直接盖），Manifest 不变 |
 *   | 发布期（已部署） | ⚠️ 改图必须换名（piece-red-v2.png），**只改本文件一处** |
 *   后者是因为服务器 expires 30d，同名改图玩家 30 天内看到旧图。
 *
 * → Codex 开发期**直接用规范文件名，不要主动加 -v2**；版本号由本文件管理。
 */

const PIECES = '/assets/pieces';
const PET = '/assets/pet';
const OBSTACLES = '/assets/obstacles';
const UI = '/assets/ui';
const GARDEN = '/assets/garden';

export const ASSETS = {
  pieces: {
    yellow: `${PIECES}/piece-yellow.png`, // 香蕉（弯月）
    green: `${PIECES}/piece-green.png`, // 梨（葫芦）
    blue: `${PIECES}/piece-blue.png`, // 蓝莓（星萼）
    orange: `${PIECES}/piece-orange.png`, // 橘子（颗粒圆）
    purple: `${PIECES}/piece-purple.png`, // 葡萄串（聚合）
    red: `${PIECES}/piece-red.png`, // 苹果（圆带叶）
  },

  /**
   * 特殊棋子做成**通用叠加层**，叠在普通棋子上。
   * 资产量从 18 张（6 色 × 3 种）降到 3 张，且颜色永远匹配。
   */
  overlays: {
    rocketH: `${PIECES}/overlay-rocket-h.png`,
    rocketV: `${PIECES}/overlay-rocket-v.png`,
    bomb: `${PIECES}/overlay-bomb.png`,
  },

  /** 彩虹球是唯一独立素材（它本来就无色）。V1 Full，Stage 0 不做 */
  special: {
    rainbow: `${PIECES}/special-rainbow.png`,
  },

  pet: {
    /**
     * ★ Puppet 分层：Idle 由这 5 层动态合成，不需要 idle 整图。
     * 锚点由 config/pet-rig.ts 定义，**不由 PNG 定义**（PNG 存不了 pivot）。
     */
    puppet: {
      body: `${PET}/wangcai/body.png`, // 含头部（Stage 0 不拆 head）
      tail: `${PET}/wangcai/tail.png`,
      ears: `${PET}/wangcai/ears.png`,
      eyesOpen: `${PET}/wangcai/eyes-open.png`,
      eyesBlink: `${PET}/wangcai/eyes-blink.png`,
    },
    /** 整图状态。Stage 0 只要 happy 与 hint */
    happy: `${PET}/pet-wangcai-happy.png`,
    hint: `${PET}/pet-wangcai-hint.png`,
  },

  obstacles: {
    ice1: `${OBSTACLES}/obstacle-ice-1.png`, // 单层，半透明
    ice2: `${OBSTACLES}/obstacle-ice-2.png`, // 双层
  },

  ui: {
    panelBg: `${UI}/ui-panel-bg.png`, // 九宫格可拉伸，四角 48px
    btnPrimary: `${UI}/ui-btn-primary.png`,
    btnPause: `${UI}/ui-btn-pause.png`,
    movesBadge: `${UI}/ui-moves-badge.png`,
    objectiveSlot: `${UI}/ui-objective-slot.png`,
  },

  garden: {
    /** 背景无透明需求，用 JPG（质量 85），省 60% 体积 */
    levelBg: `${GARDEN}/level-bg.jpg`,
    bgSpring: `${GARDEN}/garden-bg-spring.jpg`,
    /** 院门 4 阶段：必须严格同构图同视角，色调由冷灰递进到暖亮 */
    gate: [
      `${GARDEN}/garden-gate-0.png`,
      `${GARDEN}/garden-gate-1.png`,
      `${GARDEN}/garden-gate-2.png`,
      `${GARDEN}/garden-gate-3.png`,
    ],
  },
} as const;

/**
 * ★ 不进游戏，仅作角色基准与验收用。
 *   列在这里是为了让「这两张不该被 preload」这件事是显式的，而不是靠记忆。
 */
export const REFERENCE_ONLY = {
  // 文件名与美术工单 §4.2 规格表一致（工单 §6 的路径树写成 wangcai-master.png，
  // 与规格表冲突；以规格表为准，Codex 的开工顺序与 prompt 用的也是这个名字）
  petMaster: `${PET}/pet-wangcai-master.png`,
  petPuppetComposite: `${PET}/wangcai/preview-composite.png`,
} as const;
