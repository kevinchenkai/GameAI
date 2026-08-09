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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

  /**
   * ★★ Manifest 里的每个文件都必须**真的存在于 assets/**。
   *
   *   ⚠️ 这条防的是"改图换文件名"时漏改一头：
   *   nginx 对图片设了 `expires 30d`（根 CLAUDE.md §1.1），
   *   所以改图**必须换文件名**，否则用户 30 天内还看到旧图。
   *   而换名时如果只改了文件、忘了改 Manifest（或反过来），
   *   线上就是**素材 404**——本地开发期未必立刻发现，
   *   因为浏览器可能还缓存着旧名那张。
   *
   *   （实际发生过：叠加层重做后同名覆盖，服务器 md5 已是新版，
   *   手机上仍是旧样式，排查了一轮才定位到是 30 天缓存。）
   */
  it('★★ 每个 Manifest 路径在 assets/ 下都有对应文件', () => {
    const root = resolve(__dirname, '../../../assets');
    /**
     * ★ `special.rainbow` 属 Stage 0.5，**故意不加载也不出图**
     *   （BootScene 里有对应注释）。它在 Manifest 里只是先占好路径，
     *   不该因为"文件还没有"就让这条测试红。
     */
    const NOT_YET = new Set(['special.rainbow']);
    const missing: string[] = [];
    for (const [key, path] of ALL) {
      if (NOT_YET.has(key)) continue;
      // 路径形如 `<BASE>/assets/pieces/x.png`，取 assets/ 之后的部分
      const rel = path.slice(path.indexOf('/assets/') + '/assets/'.length);
      if (!existsSync(resolve(root, rel))) missing.push(`${key} → assets/${rel}`);
    }
    expect(missing, `Manifest 指向了不存在的文件：\n${missing.join('\n')}`).toEqual([]);
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

/**
 * ★★ 回归：**preload 的每一张贴图都必须真的被画出来**。
 *
 *   实测踩到：UI 五张贴图 + 关卡背景一共 **660KB（占首屏 54%）**
 *   在 BootScene 里被预加载，但渲染层对它们的引用次数是 **0** ——
 *   Panel / HudView / ResultPanel 全部用 Graphics 画，从没用过整图。
 *   下载完就躺在纹理缓存里等着被 GC。
 *
 *   这类浪费**没有任何症状**：不报错、不白屏、功能完全正常，
 *   只是所有人的首屏都多等一截。靠人 review 很难发现，
 *   所以用测试钉住：BootScene 里 load 的 TEX，必须在别处被引用。
 */
describe('★★ 首屏纪律：preload 的贴图必须有人用', () => {
  const SRC = resolve(__dirname, '../../src');

  /** 读整个 src/ 的 .ts 文本（文件不多，直接全读） */
  function allSources(): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = resolve(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.ts')) out.push({ path: p, text: readFileSync(p, 'utf8') });
      }
    };
    walk(SRC);
    return out;
  }

  it('BootScene 预加载的每个 TEX.xxx 都在渲染层被引用', () => {
    const sources = allSources();
    const boot = sources.find((s) => s.path.endsWith('BootScene.ts'));
    expect(boot).toBeDefined();

    // 只取 this.load.image(TEX.xxx, ...) 里的 key 名
    const loaded = [...(boot as { text: string }).text.matchAll(/this\.load\.image\(\s*TEX\.(\w+)/g)].map(
      (m) => m[1] as string,
    );
    expect(loaded.length).toBeGreaterThan(0);

    const unused: string[] = [];
    for (const key of loaded) {
      // 在 BootScene 与 textureKeys 之外，是否还有人引用这个 key
      const used = sources.some(
        (s) =>
          !s.path.endsWith('BootScene.ts') &&
          !s.path.endsWith('textureKeys.ts') &&
          new RegExp(`TEX\\.${key}\\b`).test(s.text),
      );
      if (!used) unused.push(key);
    }

    expect(unused, `这些贴图被预加载但没人画：${unused.join(', ')}`).toEqual([]);
  });
});
