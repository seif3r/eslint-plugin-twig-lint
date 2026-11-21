import { createRule } from '../../util/rule.ts';

const TRANSLATE_FILTERS = new Set(['t', 'trans']);

/**
 * `|t` and `|trans` on a variable cannot be found by string extraction (translation files, potx,
 * localize.drupal.org), because the text is not in the template. Drupal only registers the string when it is
 * rendered, and it is translated once someone translates it under Interface translation. Use a literal with
 * placeholders, translate in PHP, or use content translation for content such as taxonomy terms.
 */
export default createRule({
  name: 'drupal/no-translate-variable',
  description: 'Disallow translating a variable with |t',
  type: 'problem',
  level: 'warn',
  fixable: false,
  messages: {
    variable: '|{{filter}} on a variable cannot be extracted for translation. The string is only translatable after it has been rendered once and translated under Interface translation.',
  },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      seg.tokens.forEach((t, i) => {
        const pipe = seg.tokens[i - 1];
        const operand = seg.tokens[i - 2];
        if (t.type !== 'name' || !TRANSLATE_FILTERS.has(t.value) || pipe?.type !== 'punctuation' || pipe.value !== '|') return;
        if (operand?.type === 'string') return;
        report(t.start, 'variable', { filter: t.value });
      });
    }
  },
});
