import type { Token } from '../language/lexer.ts';
import { createRule } from '../util/rule.ts';

interface Options {
  /** Values where `|raw` is fine: variable names or dotted paths, with `*` as a wildcard. Default `[]`. */
  allow: string[];
}

const glob = (pattern: string): RegExp =>
  new RegExp(`^${pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

/** The name or dotted path right before `|` at index `pipe`, e.g. `content.body`, or null for anything else. */
function operand(tokens: Token[], pipe: number): string | null {
  let k = pipe - 1;
  const parts: string[] = [];
  for (;;) {
    const t = tokens[k];
    if (!t || t.type !== 'name') return null;
    parts.unshift(t.value);
    const dot = tokens[k - 1];
    if (!dot || dot.value !== '.') break;
    parts.unshift('.');
    k -= 2;
  }
  const before = tokens[k - 1];
  if (before && (before.value === '|' || before.value === ')' || before.value === ']')) return null;
  return parts.join('');
}

/** `|raw` turns off escaping, which is an XSS risk unless the value is known to be safe. */
export default createRule<Options>({
  name: 'no-raw',
  description: 'Warn about the raw filter, which turns off escaping',
  type: 'problem',
  level: 'warn',
  fixable: false,
  optionsSchema: { allow: { type: 'array', items: { type: 'string', minLength: 1 } } },
  defaultOptions: { allow: [] },
  messages: { raw: '|raw turns off escaping. Make sure the value is safe, or disable this warning with a comment that says why.' },
  check({ doc, options, report }) {
    const allowed = options.allow.map(glob);
    for (const seg of doc.segments) {
      seg.tokens.forEach((t, i) => {
        const prev = seg.tokens[i - 1];
        if (t.type !== 'name' || t.value !== 'raw' || prev?.type !== 'punctuation' || prev.value !== '|') return;
        const value = operand(seg.tokens, i - 1);
        if (value !== null && allowed.some((re) => re.test(value))) return;
        report(t.start, 'raw');
      });
    }
  },
});
