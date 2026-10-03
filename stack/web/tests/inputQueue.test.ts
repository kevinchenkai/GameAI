import { describe, expect, it, vi } from 'vitest';
import { InputQueue } from '../src/game/systems/InputQueue';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('InputQueue', () => {
  it('shutdown discards pending input and rejects new taps even after current work settles', async () => {
    const first = deferred();
    const handled: number[] = [];
    const queue = new InputQueue(async (column) => { handled.push(column); await first.promise; });
    queue.enqueue(0);
    queue.enqueue(1);
    queue.dispose();
    expect(queue.enqueue(2)).toBe(false);
    first.resolve();
    await Promise.resolve();
    expect(handled).toEqual([0]);
    expect(queue.pendingCount).toBe(0);
  });

  it('a rejected handler clears stale input and the queue remains usable', async () => {
    const onError = vi.fn();
    const handled: number[] = [];
    const queue = new InputQueue(async (column) => {
      if (column === 0) throw new Error('interrupted animation');
      handled.push(column);
    }, onError);
    queue.enqueue(0);
    queue.enqueue(1);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(handled).toEqual([]);
    queue.enqueue(2);
    await vi.waitFor(() => expect(handled).toEqual([2]));
  });

  it('animation processing can retain at most two pending taps and drops the third', async () => {
    const first = deferred();
    const handled: number[] = [];
    const queue = new InputQueue(async (columnIndex) => {
      handled.push(columnIndex);
      if (columnIndex === 0) await first.promise;
    });

    expect(queue.enqueue(0)).toBe(true);
    expect(queue.enqueue(1)).toBe(true);
    expect(queue.enqueue(2)).toBe(true);
    expect(queue.enqueue(3)).toBe(false);
    expect(queue.pendingCount).toBe(2);
    first.resolve();
    await vi.waitFor(() => expect(handled).toEqual([0, 1, 2]));
  });

  it('re-evaluates a repeated column tap when it leaves the queue', async () => {
    const first = deferred();
    const visibleTops = ['paw', 'grass'];
    const picked: string[] = [];
    const queue = new InputQueue(async () => {
      const top = visibleTops.shift();
      if (top !== undefined) picked.push(top);
      if (picked.length === 1) await first.promise;
    });

    queue.enqueue(0);
    queue.enqueue(0);
    first.resolve();
    await vi.waitFor(() => expect(picked).toEqual(['paw', 'grass']));
  });

  it('clear removes old pending taps before terminal and lifecycle transitions', async () => {
    const first = deferred();
    const handled: number[] = [];
    const queue = new InputQueue(async (columnIndex) => {
      handled.push(columnIndex);
      if (columnIndex === 0) await first.promise;
    });
    queue.enqueue(0);
    queue.enqueue(1);
    queue.enqueue(2);
    queue.clear();
    expect(queue.pendingCount).toBe(0);
    first.resolve();
    await vi.waitFor(() => expect(handled).toEqual([0]));
  });
});
