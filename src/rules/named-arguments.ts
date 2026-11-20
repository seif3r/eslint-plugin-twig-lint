import { createRule } from '../util/rule.ts';
import { analyze } from '../util/syntax.ts';
import { splitCommas } from '../util/wrap.ts';

/**
 * Named arguments use a colon: `include('x', with_context: false)`. The `name = value` form is deprecated
 * since Twig 3.12. Default values in a macro definition (`{% macro list(items = []) %}`) are not affected.
 */
export default createRule({
  name: 'named-arguments',
  description: 'Enforce `name: value` for named arguments',
  messages: { colon: 'Use "{{name}}:" instead of "{{name}} =" for a named argument.' },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      if (seg.kind !== 'output' && seg.kind !== 'block') continue;
      const s = analyze(seg);
      const { tokens } = s;
      tokens.forEach((open, i) => {
        if (!s.isCallParen(i) || s.isMacroDefinition(i) || open.match === undefined || open.match === i + 1) return;
        for (const [a, b] of splitCommas(tokens, i + 1, open.match - 1)) {
          const name = tokens[a]!;
          const eq = tokens[a + 1];
          if (name.type !== 'name' || !eq || a + 1 > b || eq.type !== 'operator' || eq.value !== '=') continue;
          report(eq.start, 'colon', { name: name.value }, [{ start: name.end, end: eq.end, text: ':' }]);
        }
      });
    }
  },
});
