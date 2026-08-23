import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { stackpopUiPlugin } from '../eslint-rules/requireScaledFontSize.js';

const linter = new Linter({ configType: 'flat' });
const ruleName = 'stackpop-ui/require-scaled-font-size';
const config = {
  languageOptions: { ecmaVersion: 2020 as const, sourceType: 'module' as const },
  plugins: { 'stackpop-ui': stackpopUiPlugin },
  rules: { [ruleName]: 'error' as const },
};

function verify(source: string): ReturnType<Linter['verify']> {
  return linter.verify(source, config);
}

describe('DPR-aware scene font lint rule', () => {
  it('accepts fontPx and computed templates that include px', () => {
    expect(verify(`const style = { fontSize: fontPx(scene, 18) };`)).toEqual([]);
    expect(verify('const style = { fontSize: `${Math.round(px(scene, 18))}px` };')).toEqual([]);
    expect(verify(`label.setFontSize(fontPx(scene, 14));`)).toEqual([]);
  });

  it.each([
    `const style = { fontSize: '18px' };`,
    'const style = { fontSize: 18 };',
    'const style = { fontSize: DESIGN_FONT_SIZE };',
    'label.setFontSize(18);',
  ])('rejects an unscaled scene font: %s', (source) => {
    expect(verify(source)).toEqual([
      expect.objectContaining({ ruleId: ruleName, messageId: 'unscaled', severity: 2 }),
    ]);
  });
});
