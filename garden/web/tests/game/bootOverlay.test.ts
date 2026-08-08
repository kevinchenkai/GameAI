/**
 * bootOverlay 单测
 *
 * ★ 为什么这层值得测：它的失败形态是**游戏彻底不能玩**。
 *   遮罩是 `position: fixed; inset: 0`，只要没被移除，
 *   它就会吃掉全部触摸事件 —— 画面看着正常，棋子却点不动。
 *   这种 bug 从截图上完全看不出来。
 *
 * ★ 用十几行假 DOM 而不是 jsdom：本仓库测试环境刻意是 `node`
 *   （`core/` 零引擎依赖的收益），不值得为一个小模块引入 ~50 个包。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setDocumentForTests,
  hideBootOverlay,
  setBootError,
  setBootProgress,
  type MinimalDocument,
  type MinimalElement,
} from '../../src/game/bootOverlay';

interface FakeEl extends MinimalElement {
  id: string;
  removed: boolean;
  classes: string[];
  listeners: Record<string, (() => void)[]>;
  fire(type: string): void;
}

function makeEl(id: string): FakeEl {
  const el: FakeEl = {
    id,
    removed: false,
    classes: [],
    listeners: {},
    style: { width: '' },
    textContent: '',
    classList: {
      add(token) {
        el.classes.push(token);
      },
    },
    addEventListener(type, cb) {
      (el.listeners[type] ??= []).push(cb);
    },
    remove() {
      el.removed = true;
    },
    fire(type) {
      for (const cb of el.listeners[type] ?? []) cb();
    },
  };
  return el;
}

function mount(ids: string[] = ['boot', 'boot-fill', 'boot-hint']): Record<string, FakeEl> {
  const els: Record<string, FakeEl> = {};
  for (const id of ids) els[id] = makeEl(id);
  const doc: MinimalDocument = {
    getElementById: (id) => els[id] ?? null,
  };
  __setDocumentForTests(doc);
  return els;
}

afterEach(() => {
  __setDocumentForTests(null);
  vi.useRealTimers();
});

describe('加载进度条', () => {
  let els: Record<string, FakeEl>;
  beforeEach(() => {
    els = mount();
  });

  const width = (): number => parseFloat(els['boot-fill']!.style.width);

  it('进度映射到 15%~100%（JS 到达时最慢的一段已经过去了）', () => {
    setBootProgress(0);
    expect(width()).toBeCloseTo(15, 1);
    setBootProgress(1);
    expect(width()).toBeCloseTo(100, 1);
  });

  it('进度单调不倒退', () => {
    const seen: number[] = [];
    for (const r of [0, 0.2, 0.5, 0.8, 1]) {
      setBootProgress(r);
      seen.push(width());
    }
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i] as number).toBeGreaterThan(seen[i - 1] as number);
    }
  });

  it('★ 越界的进度值被夹住，不会画出 -20% 或 300% 的条', () => {
    setBootProgress(-5);
    expect(width()).toBeCloseTo(15, 1);
    setBootProgress(99);
    expect(width()).toBeCloseTo(100, 1);
  });

  it('★★ NaN 不会写出非法 CSS（否则进度条会卡在上一个宽度不动）', () => {
    setBootProgress(0.5);
    const before = els['boot-fill']!.style.width;
    setBootProgress(Number.NaN);
    expect(els['boot-fill']!.style.width).not.toContain('NaN');
    expect(els['boot-fill']!.style.width).not.toBe(before);
  });

  it('错误信息会显示出来（停住的进度条必须交代原因）', () => {
    setBootError('加载失败了，请刷新页面重试');
    expect(els['boot-hint']!.textContent).toBe('加载失败了，请刷新页面重试');
  });
});

describe('★★ 收起遮罩 —— 失败形态是"游戏点不动"', () => {
  let els: Record<string, FakeEl>;
  beforeEach(() => {
    vi.useFakeTimers();
    els = mount();
  });

  it('★★ 兜底定时器一定会把遮罩从 DOM 里移除', () => {
    hideBootOverlay();
    expect(els['boot']!.removed).toBe(false); // 还在淡出

    vi.advanceTimersByTime(600);
    // ★ 关键：真的移除，而不只是变透明。
    //   透明但还在 = 看得见棋盘却点不动，最难排查的那一类
    expect(els['boot']!.removed).toBe(true);
  });

  it('★ transitionend 先到时也会移除（不必等兜底定时器）', () => {
    hideBootOverlay();
    els['boot']!.fire('transitionend');
    expect(els['boot']!.removed).toBe(true);
  });

  it('★ 两条路径都触发也不会出错', () => {
    hideBootOverlay();
    els['boot']!.fire('transitionend');
    expect(() => vi.advanceTimersByTime(600)).not.toThrow();
    expect(els['boot']!.removed).toBe(true);
  });

  it('收起时进度条补满 —— 不要停在 87% 就消失', () => {
    setBootProgress(0.4);
    hideBootOverlay();
    expect(parseFloat(els['boot-fill']!.style.width)).toBeCloseTo(100, 1);
  });
});

describe('★ DOM 缺失时静默降级（加载指示器不该把游戏搞崩）', () => {
  it('没有遮罩节点时三个函数都不抛错', () => {
    mount(['game']); // 只有 #game，没有 #boot
    expect(() => setBootProgress(0.5)).not.toThrow();
    expect(() => setBootError('x')).not.toThrow();
    expect(() => hideBootOverlay()).not.toThrow();
  });

  it('★ 遮罩只有一半节点时也不抛错（DOM 尚未完整时可能发生）', () => {
    mount(['boot']); // 有 #boot 但没有 fill / hint
    expect(() => setBootProgress(0.5)).not.toThrow();
    expect(() => hideBootOverlay()).not.toThrow();
  });
});
