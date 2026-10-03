import { describe, expect, it, vi } from 'vitest';
import { AnimationTasks } from '../src/game/systems/AnimationTasks';

describe('animation lifecycle', () => {
  it('redrawing settles outstanding tweens and waits without running completion', async () => {
    const tasks = new AnimationTasks();
    const stop = vi.fn();
    let complete!: () => void;
    const animation = tasks.run((done) => { complete = done; return stop; });
    const wait = tasks.run(() => stop);
    tasks.cancelAll();
    expect(await Promise.all([animation, wait])).toEqual([false, false]);
    expect(stop).toHaveBeenCalledTimes(2);
    complete();
    tasks.cancelAll();
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('completed work is removed and a new scene can animate after cancellation', async () => {
    const tasks = new AnimationTasks();
    const stop = vi.fn();
    const finished = tasks.run((done) => { done(); return stop; });
    expect(await finished).toBe(true);
    tasks.cancelAll();
    expect(stop).not.toHaveBeenCalled();
    let complete!: () => void;
    const next = tasks.run((done) => { complete = done; return stop; });
    complete();
    expect(await next).toBe(true);
  });

  it('failed animation creation rejects and does not leave a cancellation behind', async () => {
    const tasks = new AnimationTasks();
    await expect(tasks.run(() => { throw new Error('destroyed scene'); })).rejects.toThrow('destroyed scene');
    expect(() => tasks.cancelAll()).not.toThrow();
  });
});
