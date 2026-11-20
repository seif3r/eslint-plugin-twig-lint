import { createRule } from '../util/rule.ts';
import { analyze } from '../util/syntax.ts';

interface Options {
  /** `true` (default): require a trailing comma when the closing bracket is on its own line. `false`: disallow it. */
  multiline: boolean;
}

/**
 * Trailing commas in hashes, arrays and call arguments. When the closing bracket starts its own line, the last
 * item gets a comma (or loses it with `multiline: false`). When the closing bracket is on the same line as the
 * last item, there is never a comma. Parentheses that group an expression, such as `(a and b)`, and arrow
 * function parameters are not affected.
 */
export default createRule<Options>({
  name: 'trailing-comma',
  description: 'Enforce trailing commas in multi-line hashes, arrays and arguments',
  optionsSchema: { multiline: { type: 'boolean' } },
  defaultOptions: { multiline: true },
  messages: {
    missing: 'Expected a trailing comma.',
    unexpected: 'Unexpected trailing comma.',
  },
  check({ doc, options, report }) {
    const { src } = doc;
    for (const seg of doc.segments) {
      if (seg.kind !== 'output' && seg.kind !== 'block') continue;
      const s = analyze(seg);
      const { tokens } = s;
      tokens.forEach((open, i) => {
        if (open.match === undefined || open.match === i + 1) return;
        if (open.value === '(' && !s.isCallParen(i)) return;
        const after = tokens[open.match + 1];
        if (after && after.type === 'operator' && after.value === '=>') return;
        const close = tokens[open.match]!;
        const last = tokens[open.match - 1]!;
        const hasComma = last.type === 'punctuation' && last.value === ',';
        const lineStart = src.lastIndexOf('\n', close.start - 1) + 1;
        const ownLine = src.slice(lineStart, close.start).trim() === '';
        if (ownLine && options.multiline && !hasComma) {
          report(last.end, 'missing', undefined, [{ start: last.end, end: last.end, text: ',' }]);
        } else if (hasComma && (!ownLine || !options.multiline)) {
          report(last.start, 'unexpected', undefined, [{ start: last.start, end: last.end, text: '' }]);
        }
      });
    }
  },
});
