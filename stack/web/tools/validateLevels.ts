import {
  validateLevelDefinition,
  verifyLevelSolution,
  verifyLevelSolvable,
} from '../src/game/core/LevelValidation';
import {
  measureGreedyCurve,
  validateGreedyCurve,
} from '../src/game/core/LevelDifficultyValidation';
import { validateM3LevelSet } from '../src/game/core/LevelSetValidation';
import { loadLevels } from './loadLevels';

function main(): void {
  const loaded = loadLevels();
  let schemaValid = 0;
  let countValid = 0;
  let solvable = 0;
  let solutionVerified = 0;
  const errors: string[] = [];

  for (const { filename, level } of loaded) {
    schemaValid += 1;
    const validationErrors = validateLevelDefinition(level);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors.map((error) => `${filename}: ${error}`));
      continue;
    }
    countValid += 1;
    try {
      verifyLevelSolvable(level);
      solvable += 1;
      verifyLevelSolution(level);
      solutionVerified += 1;
    } catch (error: unknown) {
      errors.push(`${filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const setErrors = validateM3LevelSet(loaded.map(({ level }) => level));
  errors.push(...setErrors.map((error) => `level-set: ${error}`));
  const greedyCurve = measureGreedyCurve(loaded.map(({ level }) => level));
  const curveValidation = validateGreedyCurve(greedyCurve);
  errors.push(...curveValidation.errors.map((error) => `difficulty: ${error}`));

  console.log(`${schemaValid}/${loaded.length} levels schema valid`);
  console.log(`${countValid}/${loaded.length} levels count/depth valid`);
  console.log(`${solvable}/${loaded.length} levels solvable (shared-rule Solver)`);
  console.log(`${solutionVerified}/${loaded.length} levels solution verified (step-by-step)`);
  console.log(`${setErrors.length === 0 ? '20/20' : '0/20'} levels match the V0.3.2 curve`);
  console.log(`${curveValidation.errors.length === 0 ? '20/20' : '0/20'} levels pass the V0.3.2 Greedy curve`);
  curveValidation.warnings.forEach((warning) => console.warn(`WARNING: ${warning}`));

  if (errors.length > 0) {
    errors.forEach((error) => console.error(error));
    process.exitCode = 1;
  }
}

main();
