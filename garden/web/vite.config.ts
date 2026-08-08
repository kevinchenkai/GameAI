import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';

/**
 * 素材位于 garden/assets/（Codex 产出投放目录），不在 web/public/ 内。
 * 开发期用中间件把 /assets/* 映射过去；构建期由 buildStart 复制进 public/。
 * 这样 Codex 只管往 assets/ 丢文件，不需要碰 web/。
 */
const repoRoot = path.resolve(__dirname, '..');
const assetsRoot = path.join(repoRoot, 'assets');

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.json': 'application/json',
};

function resolveAssetPath(url: string): string | null {
  const raw = decodeURIComponent(url.split('?')[0] ?? '/');
  const safe = path.normalize(raw).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(assetsRoot, safe);
  // 目录穿越防护：解析后必须仍在 assetsRoot 内
  if (!full.startsWith(assetsRoot + path.sep)) return null;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  return full;
}

/**
 * dev server 与 preview server 的 middlewares 形状相同，
 * 但 Vite 没给它们一个公共类型。用结构类型接住，避免 any。
 */
interface HasMiddlewares {
  middlewares: {
    use(route: string, handler: (req: IncomingMessage, res: ServerResponse) => void): void;
  };
}

function mountAssets(server: HasMiddlewares): void {
  server.middlewares.use('/assets', (req, res) => {
    const file = resolveAssetPath(req.url ?? '/');
    if (!file) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.setHeader(
      'Content-Type',
      MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    );
    fs.createReadStream(file).pipe(res);
  });
}

function assetsMiddleware(): Plugin {
  return {
    name: 'garden-assets',
    configureServer: mountAssets,
    configurePreviewServer: mountAssets,
    // 构建时把 assets/ 复制到 public/assets/，随 dist 一起产出。
    // ★ 排除不进游戏的文件，避免它们被打包上线：
    //   candidates/  出图候选（每张 2~3 个，体积可观）
    //   *-master     角色基准图，1024² 且只用于派生
    //   preview-composite  Puppet 拼合验收图
    //   README.md    给 Codex 的投放说明
    buildStart() {
      const target = path.join(__dirname, 'public', 'assets');
      if (!fs.existsSync(assetsRoot)) return;
      fs.rmSync(target, { recursive: true, force: true });
      fs.cpSync(assetsRoot, target, {
        recursive: true,
        filter: (src) => {
          const base = path.basename(src);
          if (base === 'candidates' || base === 'README.md') return false;
          return !base.includes('-master.') && !base.startsWith('preview-composite.');
        },
      });
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/garden/' : '/'),
  plugins: [assetsMiddleware()],
  server: {
    port: 5175,
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});
