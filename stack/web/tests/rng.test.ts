import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../src/game/core/SeededRandom';

describe('SeededRandom', () => {
  it('同 seed 产生相同序列', () => {
    const first = new SeededRandom(12345);
    const second = new SeededRandom(12345);
    expect(Array.from({ length: 20 }, () => first.next())).toEqual(
      Array.from({ length: 20 }, () => second.next()),
    );
  });

  it('getState/setState 可精确恢复', () => {
    const rng = new SeededRandom(42);
    rng.next();
    const snapshot = rng.getState();
    const expected = rng.next();
    rng.setState(snapshot);
    expect(rng.next()).toBe(expected);
  });

  it('Fisher-Yates 保持元素集合且可复现', () => {
    const source = [1, 2, 3, 4, 5, 6];
    const first = new SeededRandom(7).shuffle(source);
    const second = new SeededRandom(7).shuffle(source);
    expect(first).toEqual(second);
    expect([...first].sort()).toEqual(source);
    expect(source).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
