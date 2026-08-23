import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HOW_TO_PLAY_PAGES } from '../src/game/config/howToPlay';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('玩法说明', () => {
  it('covers every player-facing M5 rule', () => {
    const copy = JSON.stringify(HOW_TO_PLAY_PAGES);
    expect(HOW_TO_PLAY_PAGES).toHaveLength(4);
    expect(copy).toContain('7 格');
    expect(copy).toContain('集齐 3 张');
    expect(copy).toContain('撤回：不限次数');
    expect(copy).toContain('打乱：每关 3 次');
    expect(copy).toContain('最近 5 步');
    expect(copy).toContain('3 星');
    expect(copy).toContain('2 星');
    expect(copy).toContain('1 星');
    expect(copy).toContain('自动存档');
  });

  it('registers the scene and exposes a home entry', () => {
    const main = readSource('src/main.ts');
    const home = readSource('src/game/scenes/HomeScene.ts');
    expect(main).toContain('HowToPlayScene');
    expect(home).toContain("this.scene.start('HowToPlay')");
    expect(home).toContain('玩法说明');
  });
});
