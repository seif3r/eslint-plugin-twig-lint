import { createRule } from '../util/rule.ts';
import { indentProblems } from '../util/indent.ts';

/** Indentation inside multi-line Twig expressions: one step per line that opens brackets. */
export default createRule({
  description: 'Enforce indentation inside multi-line Twig expressions',
  messages: { wrong: 'Expected indentation of {{expected}} but found {{actual}}.' },
  check({ doc, settings, report }) {
    for (const p of indentProblems(doc, settings)) {
      if (p.kind === 'nested') report(p.pos, 'wrong', { expected: p.expected, actual: p.actual }, [p.edit]);
    }
  },
});
