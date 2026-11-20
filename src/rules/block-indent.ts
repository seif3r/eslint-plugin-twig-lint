import { createRule } from '../util/rule.ts';
import { indentProblems } from '../util/indent.ts';

/** Indentation after Twig blocks and HTML elements, including conditional `<x>`…`</x>` pairs. */
export default createRule({
  description: 'Enforce indentation of Twig blocks and HTML elements',
  messages: { wrong: 'Expected indentation of {{expected}} but found {{actual}}.' },
  check({ doc, settings, report }) {
    for (const p of indentProblems(doc, settings)) {
      if (p.kind === 'block') report(p.pos, 'wrong', { expected: p.expected, actual: p.actual }, [p.edit]);
    }
  },
});
