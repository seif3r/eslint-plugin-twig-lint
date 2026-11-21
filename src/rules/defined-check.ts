import type { Token } from '../language/lexer.ts';
import { createRule } from '../util/rule.ts';

interface Options {
  /**
   * `simplify` (default): `x is defined and x is not empty` → `x is not empty`, which is the same when
   * `strict_variables` is off (Drupal's default). `allow`: no problems. `require`: `x is not empty` must be
   * preceded by `x is defined and`, for projects that run with `strict_variables`.
   */
  mode: 'simplify' | 'allow' | 'require';
}

const isName = (t: Token | undefined, value: string): boolean => t !== undefined && t.type === 'name' && t.value === value;

/** Start index of the operand that ends at token `end`: a chain of names, `.`, `?.`, subscripts and calls. */
function operandStart(tokens: Token[], end: number): number {
  const openerOf = new Map<number, number>();
  tokens.forEach((t, i) => {
    if (t.match !== undefined) openerOf.set(t.match, i);
  });
  let k = end;
  for (;;) {
    const t = tokens[k];
    if (!t) return k + 1;
    if (openerOf.has(k)) {
      k = openerOf.get(k)!;
      const before = tokens[k - 1];
      if (before && (before.type === 'name' || openerOf.has(k - 1))) {
        k -= 1;
        continue;
      }
      return k;
    }
    if (t.type !== 'name') return k + 1;
    const link = tokens[k - 1];
    if (link && (link.value === '.' || link.value === '?.')) {
      k -= 2;
      continue;
    }
    return k;
  }
}

const textOf = (tokens: Token[], a: number, b: number): string => tokens.slice(a, b + 1).map((t) => t.value).join('');

export default createRule<Options>({
  name: 'defined-check',
  description: 'Simplify or require "is defined" before "is not empty"',
  type: 'suggestion',
  level: 'warn',
  fixable: false,
  hasSuggestions: true,
  optionsSchema: { mode: { enum: ['simplify', 'allow', 'require'] } },
  defaultOptions: { mode: 'simplify' },
  messages: {
    simplify: '"{{x}} is defined and {{x}} is not empty" can be written "{{x}} is not empty" when strict_variables is off (Drupal\'s default).',
    require: '"{{x}} is not empty" should be preceded by "{{x}} is defined and" when strict_variables is on.',
    useSimplified: 'Replace with "{{x}} is not empty".',
    addDefined: 'Add "{{x}} is defined and".',
  },
  check({ doc, options, suggest }) {
    if (options.mode === 'allow') return;
    for (const seg of doc.segments) {
      if (seg.kind !== 'output' && seg.kind !== 'block') continue;
      const t = seg.tokens;
      t.forEach((tok, i) => {
        // `X is not empty` with the operand ending at i - 1.
        if (!isName(tok, 'is') || !isName(t[i + 1], 'not') || !isName(t[i + 2], 'empty')) return;
        const start = operandStart(t, i - 1);
        if (start > i - 1) return;
        const x = textOf(t, start, i - 1);
        // Look for `X is defined and` right before it.
        const and = start - 1;
        let guarded = false;
        let guardStart = -1;
        if (isName(t[and], 'and') && isName(t[and - 1], 'defined') && isName(t[and - 2], 'is')) {
          const gStart = operandStart(t, and - 3);
          if (gStart <= and - 3 && textOf(t, gStart, and - 3) === x) {
            guarded = true;
            guardStart = gStart;
          }
        }
        if (options.mode === 'simplify' && guarded) {
          suggest(t[guardStart]!.start, 'simplify', { x }, [{
            messageId: 'useSimplified', data: { x },
            edits: [{ start: t[guardStart]!.start, end: t[start]!.start, text: '' }],
          }]);
        } else if (options.mode === 'require' && !guarded) {
          suggest(t[start]!.start, 'require', { x }, [{
            messageId: 'addDefined', data: { x },
            edits: [{ start: t[start]!.start, end: t[start]!.start, text: `${x} is defined and ` }],
          }]);
        }
      });
    }
  },
});
