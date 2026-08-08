/**
 * game/textureKeys.ts —— Phaser 纹理 key 的唯一来源
 *
 * ★ 为什么单独一个文件：
 *   纹理 key 是**加载处与使用处之间的隐式契约**。散在各处写字符串，
 *   拼错了不会报错，只会静默显示不出图 —— 那是最难查的一类 bug。
 *
 * ⚠️ 这里是 **key**（Phaser 内部标识），不是**路径**。
 *   路径归 config/assets.ts（冻结契约 6），两者不要混。
 */

export const TEX = {
  /** 棋子按颜色取 key */
  piece: (color: string): string => `piece-${color}`,

  uiPanelBg: 'ui-panel-bg',
  uiBtnPrimary: 'ui-btn-primary',
  uiBtnPause: 'ui-btn-pause',
  uiMovesBadge: 'ui-moves-badge',
  uiObjectiveSlot: 'ui-objective-slot',

  levelBg: 'level-bg',

  /** 宠物 Puppet 分层（M6 接入） */
  petBody: 'pet-body',
  petTail: 'pet-tail',
  petEars: 'pet-ears',
  petEyesOpen: 'pet-eyes-open',
  petEyesBlink: 'pet-eyes-blink',
  petHappy: 'pet-happy',
  petHint: 'pet-hint',

  /** 冰块覆盖层。★ ice-2 尚未交付，渲染层会回退到 ice-1 */
  iceOverlay: (hp: number): string => `obstacle-ice-${hp}`,

  /** 院门 4 阶段（M7 花园场景） */
  gate: (stage: number): string => `garden-gate-${stage}`,

  /** 尚未交付的素材（第 3 批剩余 3 张叠加层），Stage 0 用占位渲染 */
  overlayRocketH: 'overlay-rocket-h',
  overlayRocketV: 'overlay-rocket-v',
  overlayBomb: 'overlay-bomb',
} as const;
