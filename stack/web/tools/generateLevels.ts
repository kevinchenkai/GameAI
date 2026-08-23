import fs from 'node:fs';
import path from 'node:path';
import { LEVEL_CURVE } from '../src/game/config/levelCurve';
import { generateLevel } from '../src/game/core/LevelGenerator';

const outputDirectory = path.resolve(process.cwd(), 'levels');
fs.mkdirSync(outputDirectory, { recursive: true });

for (const entry of LEVEL_CURVE.filter(({ kind }) => kind === 'generated')) {
  const level = generateLevel(entry);
  const filename = `level${String(entry.id).padStart(3, '0')}.json`;
  fs.writeFileSync(path.join(outputDirectory, filename), `${JSON.stringify(level, null, 2)}\n`);
  console.log(`${filename}: ${entry.kind}, seed=${entry.seed}`);
}

console.log('level001.json-level005.json are hand-authored and were left unchanged.');
