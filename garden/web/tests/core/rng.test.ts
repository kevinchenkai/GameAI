import { describe, expect, it } from 'vitest';
import { createRng, restoreRng } from '../../src/core/rng';

describe('core/rng —— 可复现随机', () => {
  it('同一种子产出完全相同的序列（复现 bug 的前提）', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 200 }, () => a.next());
    const seqB = Array.from({ length: 200 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('不同种子产出不同序列', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() 落在 [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 5000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) 落在 [0, n) 且能取到边界值', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 3000; i++) {
      const v = rng.int(6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      seen.add(v);
    }
    // 6 个值都应出现过，否则分布有问题
    expect(seen.size).toBe(6);
  });

  it('range(min, max) 闭区间，含两端', () => {
    const rng = createRng(4242);
    const seen = new Set<number>();
    for (let i = 0; i < 3000; i++) {
      const v = rng.range(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([3, 4, 5]));
  });

  it('weighted 按权重分布：权重 0 的项永不被选中', () => {
    const rng = createRng(555);
    const counts = [0, 0, 0];
    for (let i = 0; i < 6000; i++) {
      counts[rng.weighted([1, 0, 3])]! += 1;
    }
    expect(counts[1]).toBe(0);
    // 3:1 的比例，留足容差只验证方向
    expect(counts[2]!).toBeGreaterThan(counts[0]!);
  });

  it('weighted 拒绝非法权重', () => {
    const rng = createRng(1);
    expect(() => rng.weighted([0, 0])).toThrow();
    expect(() => rng.weighted([-1, 2])).toThrow();
  });

  it('shuffle 不改入参，且保留全部元素', () => {
    const rng = createRng(2024);
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = rng.shuffle(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // 入参未被改动
    expect(out.slice().sort((x, y) => x - y)).toEqual(src);
  });

  it('shuffle 同种子结果一致', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(createRng(77).shuffle(src)).toEqual(createRng(77).shuffle(src));
  });

  it('pick 拒绝空数组', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });

  it('restoreRng 从中途状态恢复，后续序列一致', () => {
    const original = createRng(31337);
    for (let i = 0; i < 50; i++) original.next();

    const resumed = restoreRng(original.getState());
    const tailA = Array.from({ length: 20 }, () => original.next());
    const tailB = Array.from({ length: 20 }, () => resumed.next());
    expect(tailA).toEqual(tailB);
  });
});
