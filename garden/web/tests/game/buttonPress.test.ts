/**
 * 按钮按下态的**状态机**单测
 *
 * ★★ 为什么单独测这个：按下用的是**相对补间**（`y: '+=2'`）。
 *   相对补间的危险在于 press 与 release **必须严格配对** ——
 *   多一次 press 或少一次 release，按钮就会永久偏移，
 *   而且**每按一次偏一点**，越用越歪。
 *
 *   这类漂移在单次点击时完全看不出来，要连点十几次才显形，
 *   所以必须用测试锁死配对关系，不能靠肉眼。
 */

import { describe, expect, it } from 'vitest';

/**
 * 复刻 Panel.button 里的按下状态机。
 * 只保留"何时 press / 何时 release"这一层逻辑（那正是会出错的地方）。
 */
function makeButton(onClick: () => void) {
  let down = false;
  let offset = 0; // 累计位移，模拟相对补间的效果
  let clicks = 0;
  const press = (): void => void (offset += 1);
  const release = (): void => void (offset -= 1);

  return {
    get offset() {
      return offset;
    },
    get clicks() {
      return clicks;
    },
    pointerdown(): void {
      down = true;
      press();
    },
    pointerup(): void {
      if (!down) return;
      down = false;
      release();
      clicks++;
      onClick();
    },
    pointerout(): void {
      if (!down) return;
      down = false;
      release();
    },
  };
}

describe('按下 → 松开', () => {
  it('一次完整点击后回到原位，且触发一次 onClick', () => {
    let fired = 0;
    const b = makeButton(() => fired++);
    b.pointerdown();
    expect(b.offset).toBe(1); // 下沉中
    b.pointerup();
    expect(b.offset).toBe(0); // 已回弹
    expect(fired).toBe(1);
  });

  /**
   * ★★ 这是相对补间最怕的场景：连点。
   *   每次 press 都 +1、release 都 −1，只要配对就永远回到 0。
   */
  it('★★ 连点 20 次不产生位移漂移', () => {
    let fired = 0;
    const b = makeButton(() => fired++);
    for (let i = 0; i < 20; i++) {
      b.pointerdown();
      b.pointerup();
    }
    expect(b.offset).toBe(0);
    expect(fired).toBe(20);
  });
});

describe('★★ 手指滑出按钮', () => {
  /**
   * ⚠️ 滑出**不算点击**，但**必须回弹** ——
   *   否则按钮永远停在下沉状态，看起来像卡住了。
   */
  it('滑出后回弹，且不触发 onClick', () => {
    let fired = 0;
    const b = makeButton(() => fired++);
    b.pointerdown();
    b.pointerout();
    expect(b.offset).toBe(0); // 回弹了
    expect(fired).toBe(0); // 但不算点击
  });

  it('★ 滑出之后再松开，不会重复回弹（否则会向上漂）', () => {
    const b = makeButton(() => undefined);
    b.pointerdown();
    b.pointerout();
    b.pointerup(); // down 已为 false，应被忽略
    expect(b.offset).toBe(0);
  });
});

describe('★★ 异常序列不产生漂移', () => {
  it('没按下就松开 —— 忽略，不触发也不位移', () => {
    let fired = 0;
    const b = makeButton(() => fired++);
    b.pointerup();
    expect(b.offset).toBe(0);
    expect(fired).toBe(0);
  });

  it('连续两次 pointerup 只算一次点击', () => {
    let fired = 0;
    const b = makeButton(() => fired++);
    b.pointerdown();
    b.pointerup();
    b.pointerup();
    expect(b.offset).toBe(0);
    expect(fired).toBe(1);
  });

  it('★ 混乱序列（down/out/down/up/out/up）后仍回到原位', () => {
    const b = makeButton(() => undefined);
    b.pointerdown();
    b.pointerout();
    b.pointerdown();
    b.pointerup();
    b.pointerout();
    b.pointerup();
    expect(b.offset).toBe(0);
  });
});
