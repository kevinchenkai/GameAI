/**
 * Asset Manifest 单测 —— ★ 冻结契约 6 的守卫
 *
 * ★ 这组测试防的是一个**只在部署后才暴露**的 bug：
 *
 *   首次部署时，`config/assets.ts` 里的素材路径写成了硬编码的
 *   `/assets/...`。JS 与 CSS 由 Vite 自动加了 base 前缀（`/garden/`），
 *   但本文件里的路径是**手写字面量，Vite 不会处理它们** ——
 *   线上去请求 `/assets/piece-red.png`，实际位置是
 *   `/garden/assets/piece-red.png`，**全部素材 404，整页白屏**。
 *
 *   本地开发一切正常，因为开发期 base 恰好就是 `/`。
 *   tsc / lint / 392 项测试全绿 —— 没有任何一条碰过"路径前缀"。
 */

import { describe, expect, it } from 'vitest';
import { ASSETS, REFERENCE_ONLY } from '../../src/config/assets';

/** 把 Manifest 递归摊平成 [键路径, 值] */
function flatten(obj: unknown, prefix = ''): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (typeof obj === 'string') return [[prefix, obj]];
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...flatten(v, `${prefix}[${i}]`)));
    return out;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      out.push(...flatten(v, prefix ? `${prefix}.${k}` : k));
    }
  }
  return out;
}

const ALL = flatten(ASSETS);
const BASE = import.meta.env.BASE_URL; // 测试环境下为 '/'

describe('★★ 素材路径必须带上部署前缀（BASE_URL）', () => {
  it('Manifest 不是空的', () => {
    expect(ALL.length).toBeGreaterThan(15);
  });

  it('★ 每条路径都以 BASE_URL 开头 —— 否则部署到子目录后全部 404', () => {
    for (const [key, path] of ALL) {
      expect(path.startsWith(BASE), `${key} = ${path} 未以 BASE_URL(${BASE}) 开头`).toBe(true);
    }
  });

  /**
   * ★★ 上面那条在测试环境里 BASE_URL 恒为 '/'，几乎测不到东西 ——
   *   把 BASE 写死成 '' 的 bug 版本照样能通过。
   *
   *   真正要锁的是：**源码里没有把前缀写死**。
   *   所以这里直接读源文件，检查它确实**引用了 BASE_URL**，
   *   而不是硬编码一个以 `/assets` 开头的字面量。
   */
  it('★★ 源码必须引用 import.meta.env.BASE_URL，不得硬编码 /assets 前缀', async () => {
    const fs = await import('node:fs/promises');
    const url = await import('node:url');
    const path = await import('node:path');
    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const src = await fs.readFile(path.join(here, '../../src/config/assets.ts'), 'utf8');

    expect(src, 'assets.ts 必须用 import.meta.env.BASE_URL 拼前缀').toMatch(
      /import\.meta\.env\.BASE_URL/,
    );

    // 根路径常量不得以 '/assets' 起头（那是写死的前缀）
    const rootDecls = [...src.matchAll(/^const\s+[A-Z_]+\s*=\s*(['"`])(.*?)\1/gm)];
    for (const m of rootDecls) {
      expect(m[2]?.startsWith('/assets'), `根路径常量硬编码了前缀：${m[0]}`).toBe(false);
    }
  });

  it('★ 每条路径都落在 assets/ 下（不会误指到别处）', () => {
    for (const [key, path] of ALL) {
      expect(path, `${key}`).toMatch(/\/assets\//);
    }
  });

  it('★ 不出现重复的斜杠（BASE 与子路径拼接正确）', () => {
    for (const [key, path] of ALL) {
      expect(path.includes('//'), `${key} = ${path} 含重复斜杠`).toBe(false);
    }
  });
});

describe('Manifest 内容完整性', () => {
  it('六色棋子齐全', () => {
    expect(Object.keys(ASSETS.pieces).sort()).toEqual([
      'blue',
      'green',
      'orange',
      'purple',
      'red',
      'yellow',
    ]);
  });

  it('院门 4 阶段齐全', () => {
    expect(ASSETS.garden.gate).toHaveLength(4);
  });

  it('★ 路径互不重复（两个 key 指向同一文件多半是笔误）', () => {
    const paths = ALL.map(([, p]) => p);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('★ 文件扩展名合法', () => {
    for (const [key, path] of ALL) {
      expect(path, `${key}`).toMatch(/\.(png|jpg|jpeg|webp|mp3|ogg)$/);
    }
  });

  it('★ REFERENCE_ONLY 的两张图不在 ASSETS 里（它们不该被 preload）', () => {
    const paths = new Set(ALL.map(([, p]) => p));
    for (const ref of Object.values(REFERENCE_ONLY)) {
      expect(paths.has(ref), `${ref} 不应出现在 ASSETS 中`).toBe(false);
    }
  });
});
