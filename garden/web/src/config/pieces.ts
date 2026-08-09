/**
 * config/pieces.ts —— 棋子定义
 *
 * ★ 色板已按**灰度可分辨性**重算（美术工单 V1.1 §1.2）。
 *   原色板有 4 对灰度冲突（orange/blue Δ=5.8 最严重），
 *   在昏暗环境 + 老年视力下等同于"两个棋子看起来一样"。
 *   现色板最小两两灰度差 = 25.7。
 *
 * 灰度按 ITU-R BT.709：Y = 0.2126R + 0.7152G + 0.0722B
 *
 * ⚠️ 这里的 luminance 是**色块**的理论值。实际图有高光、阴影、纹理，
 *   会把有效明度拉近——所以美术验收仍必须做 40px 灰度联合测试，
 *   算过 ≠ 画出来没问题。
 */

import type { PieceColor } from '../core/types';

export interface PieceDef {
  readonly color: PieceColor;
  /** 主色（十六进制字符串，便于与美术工单核对） */
  readonly hex: string;
  readonly highlight: string;
  readonly shadow: string;
  /** BT.709 灰度值，仅供校验脚本使用 */
  readonly luminance: number;
  /** 造型——三层编码之一：**轮廓本身就足以区分，不依赖颜色** */
  readonly shape: string;
  readonly fruit: string;
}

export const PIECE_DEFS: Readonly<Record<PieceColor, PieceDef>> = {
  yellow: {
    color: 'yellow',
    hex: '#FFDE5C',
    highlight: '#FFEC9B',
    shadow: '#D9B12E',
    luminance: 219.6,
    shape: '弯月形',
    fruit: '香蕉',
  },
  green: {
    color: 'green',
    hex: '#7FD957',
    highlight: '#A8E88A',
    shadow: '#4E9E33',
    luminance: 188.5,
    shape: '葫芦形（上窄下宽）',
    fruit: '梨',
  },
  blue: {
    color: 'blue',
    hex: '#5FB0E8',
    highlight: '#9BCFF2',
    shadow: '#3579AD',
    luminance: 162.8,
    shape: '小球 + 顶部星形花萼',
    fruit: '蓝莓',
  },
  orange: {
    color: 'orange',
    hex: '#E0701F',
    highlight: '#F0A163',
    shadow: '#A34D11',
    luminance: 130.0,
    shape: '圆形 + 颗粒感 + 顶部蒂',
    fruit: '橘子',
  },
  purple: {
    color: 'purple',
    hex: '#7B4FB0',
    highlight: '#A87FD4',
    shadow: '#523175',
    luminance: 95.4,
    shape: '多球聚合（三角轮廓）',
    fruit: '葡萄串',
  },
  red: {
    color: 'red',
    hex: '#B82533',
    highlight: '#DB5C67',
    shadow: '#7D1622',
    luminance: 69.3,
    shape: '圆形 + 顶部凹陷 + 小叶子',
    fruit: '苹果',
  },
};

export const ALL_COLORS: readonly PieceColor[] = [
  'yellow',
  'green',
  'blue',
  'orange',
  'purple',
  'red',
];

/** 灰度差底线——低于此值视为"昏暗环境下不可分辨" */
export const MIN_LUMINANCE_SEPARATION = 20;

/** 环境色板（UI / 花园），与美术工单 §1.2 保持一致 */
export const ENV_PALETTE = {
  skyLight: '#FFF6E5',
  skyDeep: '#FFE3C0',
  grass: '#8FD98A',
  soil: '#B98A63',
  wood: '#D9A66C',
  stone: '#CFC5B4',
  panelBg: '#FFFBF2',
  panelStroke: '#8A6A4A',
  btnPrimary: '#FFB03A',
  /** 主按钮上的文字 —— 橙底上用深棕，不用纯黑 */
  btnPrimaryText: '#4A3520',
  /** 次按钮底色（浅奶油） */
  btnSecondary: '#FFF6E5',
  /** 压暗遮罩（scrim） */
  scrim: '#2A1E12',
  /** 冰块图标的底板 —— 冰是半透明覆盖层，单独当图标会太淡 */
  icePlate: '#E8F4F8',
  /** 目标完成的对勾 */
  success: '#3FA34D',
  /** 步数吃紧时的警示色。★ 只变色不闪烁 */
  warn: '#D2691E',
  /** 格子底板的阴影（配 CELL.backdropAlpha 使用，不是主题色） */
  cellShadow: '#000000',
  textDark: '#5A4632',
} as const;

/**
 * ★★ `ENV_PALETTE` 的**数值版**，供 Phaser Graphics 使用。
 *
 *   Graphics 的 `fillStyle` / `lineStyle` 只吃 `0xRRGGBB` 数字，
 *   而上面的色板是 `'#RRGGBB'` 字符串（便于与美术工单核对）。
 *   两种形态都需要，但**色值只能有一个来源** ——
 *   否则改主题时必然改漏一处。
 *
 *   ⚠️ 这正是之前的实际状况：代码里散落 16 处硬编码 `0x8a6a4a` 之类，
 *   与色板里的 `panelStroke` 是同一个颜色却各写各的。
 *   换主题要在 6 个文件里翻，且**改漏了不报错**。
 *
 *   这里由字符串**自动派生**，不手写第二份。
 */
export const ENV_HEX: Readonly<Record<keyof typeof ENV_PALETTE, number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(ENV_PALETTE).map(([k, v]) => [k, Number.parseInt(v.slice(1), 16)]),
  ) as Record<keyof typeof ENV_PALETTE, number>,
);
