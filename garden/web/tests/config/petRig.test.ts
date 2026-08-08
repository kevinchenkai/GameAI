/**
 * pet-rig 单测 —— Puppet 锚点与**真实交付图**的一致性
 *
 * ★★ 这个文件的价值不在于验证数学，而在于**把 rig 钉在实际 PNG 上**。
 *
 *   rig 里的坐标全部是照 assets/pet/wangcai/ 的实测值推出来的
 *   （见 pet-rig.ts 文件头）。如果 Codex 重出一版 Puppet 而尺寸变了，
 *   坐标就会**静默失效** —— 狗还是画得出来，只是耳朵长错地方。
 *   这类错误没有异常、没有类型错误，只有肉眼能发现。
 *
 *   所以这里直接读 PNG 头，把「rig 声明的尺寸」和「磁盘上的真实尺寸」
 *   锁在一起。素材一换尺寸，测试立刻红。
 */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WANGCAI_LAYER_ORDER, WANGCAI_RIG } from '../../src/config/pet-rig';

/** 素材目录：web/ 的上一级是 garden/ */
const PET_DIR = resolve(__dirname, '../../../assets/pet/wangcai');

/**
 * 读 PNG 的 IHDR 拿宽高。
 * ★ 不引入图像库 —— IHDR 永远是第一个 chunk，偏移固定，8 字节足够。
 */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(resolve(PET_DIR, file));
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG magic
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** rig 的层名 → 磁盘文件名 */
const FILE_OF: Readonly<Record<string, string>> = {
  body: 'body.png',
  ears: 'ears.png',
  eyes: 'eyes-open.png',
  tail: 'tail.png',
};

describe('★★ rig 声明的尺寸必须等于真实交付图', () => {
  it.each(Object.keys(FILE_OF))('%s', (part) => {
    const rig = WANGCAI_RIG[part as keyof typeof WANGCAI_RIG];
    const file = FILE_OF[part];
    expect(file).toBeDefined();
    const actual = pngSize(file as string);
    expect({ width: rig.width, height: rig.height }).toEqual(actual);
  });

  it('★ eyes-blink 与 eyes-open 同尺寸 —— 否则眨眼会位移', () => {
    expect(pngSize('eyes-blink.png')).toEqual(pngSize('eyes-open.png'));
  });
});

describe('绘制顺序', () => {
  it('★ tail 在 body 之前（尾巴在身体后面，不能盖住身体）', () => {
    expect(WANGCAI_LAYER_ORDER.indexOf('tail')).toBeLessThan(
      WANGCAI_LAYER_ORDER.indexOf('body'),
    );
  });

  it('★ ears / eyes 在 body 之后（耳朵盖在头上、眼睛不能被遮）', () => {
    const body = WANGCAI_LAYER_ORDER.indexOf('body');
    expect(WANGCAI_LAYER_ORDER.indexOf('ears')).toBeGreaterThan(body);
    expect(WANGCAI_LAYER_ORDER.indexOf('eyes')).toBeGreaterThan(body);
  });

  it('eyes 在最上层', () => {
    expect(WANGCAI_LAYER_ORDER[WANGCAI_LAYER_ORDER.length - 1]).toBe('eyes');
  });

  it('每层都有对应的 rig 定义，没有孤儿', () => {
    for (const part of WANGCAI_LAYER_ORDER) {
      expect(WANGCAI_RIG[part]).toBeDefined();
    }
    expect(Object.keys(WANGCAI_RIG).sort()).toEqual([...WANGCAI_LAYER_ORDER].sort());
  });
});

describe('锚点取值合法', () => {
  it.each(Object.keys(WANGCAI_RIG))('%s 的 origin 落在 0~1', (part) => {
    const r = WANGCAI_RIG[part as keyof typeof WANGCAI_RIG];
    expect(r.originX).toBeGreaterThanOrEqual(0);
    expect(r.originX).toBeLessThanOrEqual(1);
    expect(r.originY).toBeGreaterThanOrEqual(0);
    expect(r.originY).toBeLessThanOrEqual(1);
  });

  /**
   * ★ 尾巴绕**根部**转，不是绕中心转。
   *   origin 若落在几何中心（0.5, 0.5），摇尾会变成"整条尾巴绕中间打转"，
   *   看起来像螺旋桨而不是摇尾巴。
   */
  it('★ tail 的 origin 在根部（左下），不在几何中心', () => {
    expect(WANGCAI_RIG.tail.originX).toBeLessThan(0.35);
    expect(WANGCAI_RIG.tail.originY).toBeGreaterThan(0.6);
  });

  /** ★ 耳朵绕**上方根部**转，抖耳时根部应当不动 */
  it('★ ears 的 origin 在上方根部', () => {
    expect(WANGCAI_RIG.ears.originY).toBeLessThan(0.5);
  });
});

/**
 * ★★ 回归：尾巴根部必须**完全埋进臀部**。
 *
 *   真实 bug：第一版 tail=(308,103) 是按参考图的尾巴露出位置反推的，
 *   根部中心那一点确实落在 body 内（alpha=254），看数值像是"贴住了"。
 *   但把臀部放大 3 倍一看，**根部下缘与臀部之间有一条白缝** ——
 *   尾巴是悬空的，整图缩小后不明显，放大立刻露馅。
 *
 *   所以判据不能是"根部中心在不在身体里"（那会漏），
 *   必须是"**根部断面的每一个像素**都在身体里"。
 *   这条测试直接读 PNG alpha 逐像素验，纯几何、不依赖渲染。
 */
describe('★★ 尾巴根部与身体的接合', () => {
  /** 解 PNG 得到逐像素 alpha。★ 只支持 8bit RGBA，交付图都是这个格式 */
  function alphaMap(file: string): { w: number; h: number; a: (x: number, y: number) => number } {
    const buf = readFileSync(resolve(PET_DIR, file));
    let i = 8;
    let w = 0;
    let h = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idat: Buffer[] = [];
    /** 调色板 PNG 的透明度表；RGBA 图没有这一段 */
    let trns: Buffer = Buffer.alloc(0);
    while (i < buf.length) {
      const len = buf.readUInt32BE(i);
      const type = buf.subarray(i + 4, i + 8).toString('ascii');
      const data = buf.subarray(i + 8, i + 8 + len);
      if (type === 'IHDR') {
        w = data.readUInt32BE(0);
        h = data.readUInt32BE(4);
        bitDepth = data[8] as number;
        colorType = data[9] as number;
      } else if (type === 'IDAT') idat.push(data);
      else if (type === 'tRNS') trns = data;
      i += 12 + len;
    }
    expect(bitDepth).toBe(8);
    /**
     * ★ 同时支持 RGBA(6) 与**调色板(3)**。
     *   ⚠️ 素材经 pngquant 压缩后会变成调色板 PNG —— 只认 6 的话，
     *   这组几何断言会在"素材被压缩"时全部失败，
     *   而几何其实一点没变（实测根部仍 779/779 埋入）。
     *   报错还是 `expected 3 to be 6`，很容易被误读成"图坏了"。
     */
    expect([3, 6]).toContain(colorType);
    const raw = inflateSync(Buffer.concat(idat));
    const bpp = colorType === 6 ? 4 : 1;
    const stride = w * bpp;
    const out = Buffer.alloc(stride * h);
    let pos = 0;
    for (let y = 0; y < h; y++) {
      const f = raw[pos] as number;
      pos++;
      const line = Buffer.from(raw.subarray(pos, pos + stride));
      pos += stride;
      const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? (line[x - bpp] as number) : 0;
        const b = prev[x] as number;
        const c = x >= bpp ? (prev[x - bpp] as number) : 0;
        const cur = line[x] as number;
        if (f === 1) line[x] = (cur + a) & 255;
        else if (f === 2) line[x] = (cur + b) & 255;
        else if (f === 3) line[x] = (cur + ((a + b) >> 1)) & 255;
        else if (f === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          line[x] = (cur + pr) & 255;
        }
      }
      line.copy(out, y * stride);
    }
    /**
     * ★ 取 alpha：RGBA 直接读第 4 通道；调色板图要经 tRNS 查表
     *   （索引不在表里 = 完全不透明）。
     */
    const alphaAt = (x: number, y: number): number => {
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      if (colorType === 6) return out[(y * w + x) * 4 + 3] as number;
      const idx = out[y * w + x] as number;
      return idx < trns.length ? (trns[idx] as number) : 255;
    };
    return { w, h, a: alphaAt };
  }

  it('★★ 根部断面每一个像素都必须落在身体不透明区内（不能有白缝）', () => {
    const body = alphaMap('body.png');
    const tail = alphaMap('tail.png');
    const { x: ox, y: oy } = WANGCAI_RIG.tail;

    // tail.png 根部断面 = 最左侧不透明列起 12 列
    let firstCol = -1;
    for (let x = 0; x < tail.w && firstCol < 0; x++) {
      for (let y = 0; y < tail.h; y++) {
        if (tail.a(x, y) > 10) {
          firstCol = x;
          break;
        }
      }
    }
    expect(firstCol).toBeGreaterThanOrEqual(0);

    let total = 0;
    let buried = 0;
    for (let x = firstCol; x <= firstCol + 12; x++) {
      for (let y = 0; y < tail.h; y++) {
        if (tail.a(x, y) <= 10) continue;
        total++;
        if (body.a(ox + x, oy + y) > 200) buried++;
      }
    }
    expect(total).toBeGreaterThan(100); // 断面确实取到了
    expect(buried).toBe(total); // ★ 一个都不能漏在外面
  });

  it('★ 但尾巴不能整条埋进去 —— 还要看得见', () => {
    const body = alphaMap('body.png');
    const tail = alphaMap('tail.png');
    const { x: ox, y: oy } = WANGCAI_RIG.tail;
    let total = 0;
    let visible = 0;
    for (let y = 0; y < tail.h; y += 2) {
      for (let x = 0; x < tail.w; x += 2) {
        if (tail.a(x, y) <= 10) continue;
        total++;
        if (body.a(ox + x, oy + y) <= 200) visible++;
      }
    }
    expect(visible / total).toBeGreaterThan(0.5);
  });

  it('★ 尾巴不能超出 body 画布（否则会被裁成断尾）', () => {
    const tail = alphaMap('tail.png');
    const { x: ox, y: oy } = WANGCAI_RIG.tail;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < tail.h; y++) {
      for (let x = 0; x < tail.w; x++) {
        if (tail.a(x, y) > 10) {
          maxX = Math.max(maxX, ox + x);
          maxY = Math.max(maxY, oy + y);
        }
      }
    }
    expect(maxX).toBeLessThan(WANGCAI_RIG.body.width);
    expect(maxY).toBeLessThan(WANGCAI_RIG.body.height);
  });
});
