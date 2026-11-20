import { createRule } from '../util/rule.ts';
import { analyze } from '../util/syntax.ts';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * No quotes around hash keys that do not need them: `{'class': x}` → `{class: x}`. Keys that are not plain
 * identifiers, such as `'aria-label'` or `'0'`, keep their quotes.
 */
export default createRule({
  name: 'hash-key-quotes',
  description: 'Disallow unnecessary quotes around hash keys',
  messages: { unquote: 'Unnecessary quotes around the hash key {{key}}.' },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      if (seg.kind !== 'output' && seg.kind !== 'block') continue;
      const s = analyze(seg);
      seg.tokens.forEach((t, i) => {
        if (t.type !== 'string' || s.colons.get(i + 1) !== 'hash') return;
        const prev = seg.tokens[i - 1];
        if (!prev || prev.type !== 'punctuation' || (prev.value !== '{' && prev.value !== ',')) return;
        const key = t.value.slice(1, -1);
        if (!IDENTIFIER.test(key)) return;
        report(t.start, 'unquote', { key: t.value }, [{ start: t.start, end: t.end, text: key }]);
      });
    }
  },
});
