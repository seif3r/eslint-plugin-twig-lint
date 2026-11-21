import { createRule } from '../../util/rule.ts';

const TRANSLATE_FILTERS = new Set(['t', 'trans']);

/**
 * `|t` and `|trans` translate a string literal. On a variable, Drupal's string extraction (used to build
 * translation files) cannot see the text, so it never gets translated. Pass translated strings in from PHP,
 * or use a literal with placeholders: `'Hello @name'|t({'@name': name})`.
 */
export default createRule({
  name: 'drupal/no-translate-variable',
  description: 'Disallow translating a variable with |t',
  type: 'problem',
  level: 'warn',
  fixable: false,
  messages: { variable: '|{{filter}} on something other than a string literal cannot be extracted for translation.' },
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
