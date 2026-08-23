import { randomInt } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const RANDOM_SEED_COUNT = 5;
const RANDOM_SEED_MAX = 1_000_000_000;

function parseSeedList(args: readonly string[]): number[] | null {
  const prefixed = args.find((argument) => argument.startsWith('--trial-seeds='));
  const flagIndex = args.indexOf('--trial-seeds');
  const raw = prefixed?.slice('--trial-seeds='.length) ??
    (flagIndex >= 0 ? args[flagIndex + 1] : undefined);
  if (raw === undefined) return null;
  const seeds = raw.split(',').map((value) => Number(value.trim()));
  if (
    seeds.length === 0 ||
    seeds.some((seed) => !Number.isInteger(seed) || seed < 0)
  ) {
    throw new Error(`trial seeds must be comma-separated non-negative integers, actual: ${raw}`);
  }
  return [...new Set(seeds)];
}

function randomSeeds(): number[] {
  const seeds = new Set<number>();
  while (seeds.size < RANDOM_SEED_COUNT) seeds.add(randomInt(0, RANDOM_SEED_MAX));
  return [...seeds];
}

const seeds = parseSeedList(process.argv.slice(2)) ?? randomSeeds();
console.log(`Stable validation trial seeds: ${seeds.join(', ')}`);

let failed = false;
for (const seed of seeds) {
  const result = spawnSync(
    'npm',
    ['run', 'validate-levels', '--', `--trial-seed=${seed}`],
    { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
  );
  if (result.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
