import { createRule } from '../util/rule.ts';

/** `|raw` turns off escaping, which is an XSS risk unless the value is known to be safe. */
export default createRule({
  name: 'no-raw',
  description: 'Warn about the raw filter, which turns off escaping',
  type: 'problem',
  level: 'warn',
  fixable: false,
  messages: { raw: '|raw turns off escaping. Make sure the value is safe, or disable this warning with a comment that says why.' },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      seg.tokens.forEach((t, i) => {
        const prev = seg.tokens[i - 1];
        if (t.type === 'name' && t.value === 'raw' && prev?.type === 'punctuation' && prev.value === '|') report(t.start, 'raw');
      });
    }
  },
});
