import { readFileSync as readFileSyncNode, readdirSync as readdirSyncNode } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  ALL_COLORS,
  ENV_HEX,
  ENV_PALETTE,
  MIN_LUMINANCE_SEPARATION,
  PIECE_DEFS,
  type PieceDef,
} from '../../src/config/pieces';

/** ITU-R BT.709 —— 与美术工单 §1.2 用的是同一个公式 */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}


/**
 * 最小 PNG 解码器 —— 只为读像素，不引图像库。
 * ★ 必须支持**调色板 PNG（colorType 3）**：素材经 pngquant 压缩后就是这种格式。
 */
function decodeRgba(buf: Buffer): { data: Buffer; width: number; height: number } {
  let i = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let plte: Uint8Array = Buffer.alloc(0);
  let trns: Uint8Array = Buffer.alloc(0);
  const idat: Buffer[] = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.subarray(i + 4, i + 8).toString('ascii');
    const data = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9] as number;
    } else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    i += 12 + len;
  }
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * ch;
  const raw = inflateSync(Buffer.concat(idat));
  const un = Buffer.alloc(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[pos] as number;
    pos++;
    const line = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    const prev = y > 0 ? un.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? (line[x - ch] as number) : 0;
      const b = prev[x] as number;
      const c = x >= ch ? (prev[x - ch] as number) : 0;
      const cur = line[x] as number;
      if (f === 1) line[x] = (cur + a) & 255;
      else if (f === 2) line[x] = (cur + b) & 255;
      else if (f === 3) line[x] = (cur + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        line[x] = (cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    line.copy(un, y * stride);
  }
  const out = Buffer.alloc(width * height * 4);
  for (let n = 0; n < width * height; n++) {
    if (colorType === 6) un.copy(out, n * 4, n * 4, n * 4 + 4);
    else if (colorType === 2) {
      un.copy(out, n * 4, n * 3, n * 3 + 3);
      out[n * 4 + 3] = 255;
    } else {
      const idx = un[n] as number;
      out[n * 4] = plte[idx * 3] as number;
      out[n * 4 + 1] = plte[idx * 3 + 1] as number;
      out[n * 4 + 2] = plte[idx * 3 + 2] as number;
      out[n * 4 + 3] = idx < trns.length ? (trns[idx] as number) : 255;
    }
  }
  return { data: out, width, height };
}

describe('config/pieces —— 色板灰度可分辨性', () => {
  it('六色齐备', () => {
    expect(ALL_COLORS).toHaveLength(6);
    for (const c of ALL_COLORS) expect(PIECE_DEFS[c]).toBeDefined();
  });

  it('记录的 luminance 与色值实际算出来的一致（防止改色忘了改注释）', () => {
    for (const c of ALL_COLORS) {
      const def = PIECE_DEFS[c];
      expect(luminance(def.hex)).toBeCloseTo(def.luminance, 0);
    }
  });

  it('★ 任意两色灰度差 ≥ 阈值 —— 这是原色板 4 对冲突的修正结果', () => {
    const defs: PieceDef[] = ALL_COLORS.map((c) => PIECE_DEFS[c]);
    const conflicts: string[] = [];

    for (let i = 0; i < defs.length; i++) {
      for (let j = i + 1; j < defs.length; j++) {
        const a = defs[i]!;
        const b = defs[j]!;
        const delta = Math.abs(a.luminance - b.luminance);
        if (delta < MIN_LUMINANCE_SEPARATION) {
          conflicts.push(`${a.color} vs ${b.color}: Δ=${delta.toFixed(1)}`);
        }
      }
    }

    expect(conflicts).toEqual([]);
  });

  it('每色都有独立造型关键词 —— 轮廓本身足以区分，不依赖颜色', () => {
    const shapes = ALL_COLORS.map((c) => PIECE_DEFS[c].shape);
    expect(new Set(shapes).size).toBe(shapes.length);

    const fruits = ALL_COLORS.map((c) => PIECE_DEFS[c].fruit);
    expect(new Set(fruits).size).toBe(fruits.length);
  });

  it('高光比主色亮、阴影比主色暗', () => {
    for (const c of ALL_COLORS) {
      const def = PIECE_DEFS[c];
      expect(luminance(def.highlight)).toBeGreaterThan(def.luminance);
      expect(luminance(def.shadow)).toBeLessThan(def.luminance);
    }
  });
});

/**
 * ★★ 校验**真实交付 PNG** 的明度，而不是配置里写的规格值。
 *
 *   ⚠️ 上面那组测试查的是 `config/pieces.ts` 的 `luminance` 字段 ——
 *   那是**工单规格**，规格自洽所以永远是绿的。
 *   而美术素材工单 §5 自己警告过：
 *     「§1.2 保证的是**色块**的灰度差；实际图有高光、阴影、纹理，
 *       会把有效明度**拉近**。算过 ≠ 画出来没问题。」
 *   实测证实了这条预言：交付图偏差最大 −13.5 / +16.1，阶梯被压缩。
 *
 *   所以这里直接读 PNG 像素。★ 只统计 alpha > 200 的像素 ——
 *   把透明背景算进去会把所有值拉向背景色，六色看起来"都差不多"，
 *   得出完全错误的结论。
 */
describe('★★ 真实交付图的明度（不是配置里的规格值）', () => {
  const PIECES_DIR = resolvePath(__dirname, '../../../assets/pieces');

  /** 实测各色平均灰度。允许调色板 PNG（素材经 pngquant 压缩） */
  function meanLuminance(color: string): number {
    const { data, width, height } = decodeRgba(
      readFileSyncNode(resolvePath(PIECES_DIR, `piece-${color}.png`)),
    );
    let sum = 0;
    let n = 0;
    for (let i = 0; i < width * height; i++) {
      const a = data[i * 4 + 3] as number;
      if (a <= 200) continue; // ★ 只看不透明区
      // ★ 与本文件上方的 luminance() 用同一组 BT.709 系数，两处必须一致
      sum +=
        0.2126 * (data[i * 4] as number) +
        0.7152 * (data[i * 4 + 1] as number) +
        0.0722 * (data[i * 4 + 2] as number);
      n++;
    }
    return n > 0 ? sum / n : 0;
  }

  const COLORS = ['yellow', 'green', 'blue', 'orange', 'purple', 'red'] as const;

  it('六色明度顺序与工单一致（阶梯方向没搞反）', () => {
    const lums = COLORS.map((c) => meanLuminance(c));
    for (let i = 0; i < lums.length - 1; i++) {
      expect((lums[i] as number) > (lums[i + 1] as number), `${COLORS[i]} 应亮于 ${COLORS[i + 1]}`).toBe(
        true,
      );
    }
  });

  /**
   * ★ 判据用**项目统一的 BT.709**（与本文件上方 luminance() 一致）。
   *
   *   ⚠️ 系数选错会得出完全相反的结论：我曾用 BT.601（0.299/0.587/0.114）
   *   量过一次，算出 green/blue = 17.0、purple/red = 18.8，
   *   看着像是"交付图不达标"；换回项目在用的 BT.709 后是 25.2 / 22.7，
   *   全部达标。**两个公式对绿色的权重差很多**（0.587 vs 0.7152），
   *   而六色里绿、蓝、紫的判定恰恰最依赖绿通道。
   *   —— 度量口径必须和规格用的是同一个，否则测的是另一回事。
   */
  it('★★ 真实交付图两两明度差 ≥ 阈值（规格自洽 ≠ 画出来没问题）', () => {
    const lums = COLORS.map((c) => meanLuminance(c));
    let min = Infinity;
    let pair = '';
    for (let i = 0; i < lums.length; i++) {
      for (let j = i + 1; j < lums.length; j++) {
        const d = Math.abs((lums[i] as number) - (lums[j] as number));
        if (d < min) {
          min = d;
          pair = `${COLORS[i]}/${COLORS[j]}`;
        }
      }
    }
    expect(min, `最小明度差出现在 ${pair}`).toBeGreaterThanOrEqual(MIN_LUMINANCE_SEPARATION);
  });

  it('实测值与工单规格的偏差在可接受范围（±8）', () => {
    for (const c of COLORS) {
      const spec = PIECE_DEFS[c].luminance;
      expect(Math.abs(meanLuminance(c) - spec), `${c} 偏离规格过多`).toBeLessThan(8);
    }
  });
});

/**
 * ★★ 回归：**色值只能有一个来源**。
 *
 *   实测踩到：UI 代码里散落 16 处硬编码 `0x8a6a4a` / `'#FFB03A'` 之类，
 *   与色板里的 `panelStroke` / `btnPrimary` 是同一个颜色却各写各的。
 *   换主题要在 6 个文件里翻，而且**改漏了不报错**——
 *   只是某个描边留在旧配色上，肉眼极难发现。
 *
 *   这条测试扫渲染层源码，禁止再出现硬编码色值。
 */
describe('★★ 色值单一来源：渲染层禁止硬编码颜色', () => {
  const SRC = resolvePath(__dirname, '../../src/game');

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const e of readdirSyncNode(dir, { withFileTypes: true })) {
      const p = resolvePath(dir, e.name);
      if (e.isDirectory()) out.push(...walk(p));
      else if (e.name.endsWith('.ts')) out.push(p);
    }
    return out;
  }

  it('game/ 下没有 0xRRGGBB 字面量', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      const text = readFileSyncNode(f, 'utf8');
      for (const [i, line] of text.split('\n').entries()) {
        // 跳过注释行——注释里提到色值是允许的（说明用）
        const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
        const m = code.match(/0x[0-9a-fA-F]{6}\b/);
        if (m) offenders.push(`${f.replace(SRC, 'game')}:${i + 1}  ${m[0]}`);
      }
    }
    expect(offenders, `请改用 ENV_HEX.*：\n${offenders.join('\n')}`).toEqual([]);
  });

  it("game/ 下没有 color: '#RRGGBB' 字面量", () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      const text = readFileSyncNode(f, 'utf8');
      for (const [i, line] of text.split('\n').entries()) {
        const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
        if (/color:\s*'#[0-9a-fA-F]{3,8}'/.test(code)) {
          offenders.push(`${f.replace(SRC, 'game')}:${i + 1}`);
        }
      }
    }
    expect(offenders, `请改用 ENV_PALETTE.*：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('★ ENV_HEX 与 ENV_PALETTE 一一对应且数值一致', () => {
    expect(Object.keys(ENV_HEX).sort()).toEqual(Object.keys(ENV_PALETTE).sort());
    for (const [k, v] of Object.entries(ENV_PALETTE)) {
      const n = ENV_HEX[k as keyof typeof ENV_HEX];
      expect('#' + n.toString(16).toUpperCase().padStart(6, '0')).toBe(v.toUpperCase());
    }
  });
});
