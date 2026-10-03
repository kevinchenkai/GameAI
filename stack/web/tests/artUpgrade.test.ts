import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ASSETS, PRELOAD_ASSETS } from '../src/game/config/assets';

async function inspect(file: string) {
  const buffer = await fs.readFile(path.resolve('public', file));
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  let luminance = 0, weight = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      const alpha = data[offset + 3]! / 255;
      if (alpha === 0) continue;
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
      luminance += (data[offset]! * 0.2126 + data[offset + 1]! * 0.7152 + data[offset + 2]! * 0.0722) * alpha;
      weight += alpha;
    }
  }
  return { buffer, metadata, left, top, right, bottom,
    subjectSize: Math.max(right - left + 1, bottom - top + 1), meanL: luminance / weight };
}

describe('delivered art v2 pixels, not just declared ratios', () => {
  for (const [name, definition] of Object.entries(ASSETS.tiles)) {
    it(`${name}: real alpha, 62–68% silhouette and 206px frame safe area`, async () => {
      const art = await inspect(definition.path);
      expect(art.metadata.width).toBe(256);
      expect(art.metadata.height).toBe(256);
      expect(art.metadata.hasAlpha).toBe(true);
      expect(art.subjectSize / 256).toBeGreaterThanOrEqual(0.62);
      expect(art.subjectSize).toBeLessThanOrEqual(174);
      expect(art.left).toBeGreaterThanOrEqual(25);
      expect(art.top).toBeGreaterThanOrEqual(25);
      expect(art.right).toBeLessThan(231);
      expect(art.bottom).toBeLessThan(231);
      expect(art.buffer.length).toBeLessThan(30 * 1024);
      expect(definition.path).toMatch(/_v2\.webp$/);
    });
  }

  it('preserves two grayscale contrast separations', async () => {
    const [bell, pot, bone, fish] = await Promise.all([
      ASSETS.tiles.bell, ASSETS.tiles.flowerpot, ASSETS.tiles.bone, ASSETS.tiles.fish,
    ].map((definition) => inspect(definition.path)));
    expect(pot!.meanL).toBeLessThanOrEqual(140);
    expect(bell!.meanL - pot!.meanL).toBeGreaterThanOrEqual(38);
    expect(bone!.meanL - fish!.meanL).toBeGreaterThanOrEqual(25);
  });

  it('backgrounds meet portrait dimensions and budgets; preload total stays below 300 KiB', async () => {
    for (const definition of Object.values(ASSETS.bg)) {
      const buffer = await fs.readFile(path.resolve('public', definition.path));
      const metadata = await sharp(buffer).metadata();
      expect([metadata.width, metadata.height]).toEqual([1125, 2436]);
      expect(buffer.length).toBeLessThan(200 * 1024);
    }
    const sizes = await Promise.all(PRELOAD_ASSETS.map(async ({ path: assetPath }) =>
      (await fs.stat(path.resolve('public', assetPath))).size));
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBeLessThan(300 * 1024);
  });

  it('review record hashes match shipped files', async () => {
    const review = JSON.parse(await fs.readFile('../docs/art_review/upgrade_20261002/assets.json', 'utf8')) as {
      assets: Array<{ path: string; sha256: string; bytes: number }>;
    };
    expect(review.assets).toHaveLength(13);
    for (const asset of review.assets) {
      const buffer = await fs.readFile(path.resolve('public', asset.path));
      expect(buffer.length).toBe(asset.bytes);
      expect(createHash('sha256').update(buffer).digest('hex')).toBe(asset.sha256);
    }
  });
});
