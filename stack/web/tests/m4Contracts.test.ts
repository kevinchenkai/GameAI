import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('M4 integration contracts', () => {
  it('adopts the Phaser WebAudio context and never constructs a second AudioContext', () => {
    const gameScene = readSource('src/game/scenes/GameScene.ts');
    expect(gameScene).toContain('adoptContext(this.sound.context)');
    const sourceFiles = fs
      .readdirSync(path.resolve(process.cwd(), 'src/game/systems'))
      .filter((filename) => filename.endsWith('.ts'))
      .map((filename) => readSource(`src/game/systems/${filename}`));
    expect([gameScene, ...sourceFiles].join('\n')).not.toMatch(/new\s+(?:window\.)?AudioContext\s*\(/);
  });

  it.each(['win', 'fail', 'restart', 'undo', 'shuffle', 'shutdown'] as const)(
    '%s transition explicitly clears pending input',
    (reason) => {
      const gameScene = readSource('src/game/scenes/GameScene.ts');
      expect(gameScene).toContain(`clearInputQueue('${reason}')`);
    },
  );

  it('landscape hint CSS requires coarse pointer, excluding desktop', () => {
    const html = readSource('index.html');
    expect(html).toContain('@media (orientation: landscape) and (pointer: coarse)');
  });
});
