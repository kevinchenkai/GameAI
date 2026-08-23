const UINT32_RANGE = 0x1_0000_0000;
const NON_ZERO_FALLBACK = 0x6d2b79f5;

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = SeededRandom.normalize(seed);
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / UINT32_RANGE;
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error('maxExclusive must be a positive integer');
    }
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(input: readonly T[]): T[] {
    const result = [...input];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(index + 1);
      const value = result[index];
      const swapValue = result[swapIndex];
      if (value === undefined || swapValue === undefined) continue;
      result[index] = swapValue;
      result[swapIndex] = value;
    }
    return result;
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = SeededRandom.normalize(state);
  }

  private static normalize(seed: number): number {
    const normalized = Math.trunc(seed) >>> 0;
    return normalized === 0 ? NON_ZERO_FALLBACK : normalized;
  }
}
