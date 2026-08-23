function usesUiScale(sourceCode, node) {
  return /\b(?:fontPx|px)\s*\(/u.test(sourceCode.getText(node));
}

function propertyName(node) {
  if (node.computed) return null;
  if (node.key.type === 'Identifier') return node.key.name;
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') return node.key.value;
  return null;
}

export const requireScaledFontSizeRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require Phaser scene font sizes to use the DPR-aware UI scale helpers.',
    },
    schema: [],
    messages: {
      unscaled: '场景字号必须通过 fontPx() 或 px() 换算，避免在高 DPR 设备上缩小、模糊。',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Property(node) {
        if (propertyName(node) !== 'fontSize' || usesUiScale(sourceCode, node.value)) return;
        context.report({ node: node.value, messageId: 'unscaled' });
      },
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.computed ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'setFontSize'
        ) return;
        const [fontSize] = node.arguments;
        if (fontSize === undefined || fontSize.type === 'SpreadElement' || usesUiScale(sourceCode, fontSize)) return;
        context.report({ node: fontSize, messageId: 'unscaled' });
      },
    };
  },
};

export const stackpopUiPlugin = {
  rules: {
    'require-scaled-font-size': requireScaledFontSizeRule,
  },
};
