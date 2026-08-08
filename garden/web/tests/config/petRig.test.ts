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
