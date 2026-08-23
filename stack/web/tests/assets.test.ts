import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ASSETS,
  DEFERRED_AUDIO_ASSETS,
  PRELOAD_ASSETS,
  RENDERED_TEXTURE_KEYS,
} from '../src/game/config/assets';

describe('M4 asset manifest', () => {
  it('every preloaded texture key is owned by a rendering layer', () => {
    const loaded = PRELOAD_ASSETS.map(({ key }) => key).sort();
    const rendered = [...RENDERED_TEXTURE_KEYS].sort();
    expect(new Set(loaded).size).toBe(loaded.length);
    expect(loaded).toEqual(rendered);
  });

  it('manifest paths are lowercase WebP files and every M4 preload asset exists', () => {
    for (const { path: relativePath } of PRELOAD_ASSETS) {
      expect(relativePath).toMatch(/^assets\/[a-z_]+\/[a-z0-9_]+\.webp$/);
      expect(fs.existsSync(path.resolve(process.cwd(), 'public', relativePath))).toBe(true);
    }
  });

  it('preloads the settings and how-to-play artwork', () => {
    const loaded = new Set(PRELOAD_ASSETS.map(({ key }) => key));
    expect(loaded.has(ASSETS.ui.settings.key)).toBe(true);
    expect(loaded.has(ASSETS.ui.hint.key)).toBe(true);
  });

  it('keeps versioned BGM outside the first-screen preload path and within the transfer budget', () => {
    expect(PRELOAD_ASSETS.some(({ path: relativePath }) => relativePath.startsWith('assets/audio/'))).toBe(false);
    expect(DEFERRED_AUDIO_ASSETS).toEqual([ASSETS.audio.backgroundMusic]);
    expect(ASSETS.audio.backgroundMusic.paths).toEqual([
      'assets/audio/windy_loop_v1.m4a',
      'assets/audio/windy_loop_v1.mp3',
    ]);
    for (const relativePath of ASSETS.audio.backgroundMusic.paths) {
      const absolutePath = path.resolve(process.cwd(), 'public', relativePath);
      expect(fs.existsSync(absolutePath)).toBe(true);
      expect(fs.statSync(absolutePath).size).toBeLessThan(600 * 1024);
      expect(relativePath).toMatch(/^assets\/audio\/[a-z0-9_]+_v\d+\.(?:m4a|mp3)$/);
      const encodedAudio = fs.readFileSync(absolutePath);
      expect(encodedAudio.includes(Buffer.from('163 key'))).toBe(false);
      expect(encodedAudio.includes(Buffer.from("Don't modify"))).toBe(false);
    }
  });
});
