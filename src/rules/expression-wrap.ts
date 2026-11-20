import { createRule } from '../util/rule.ts';
import { expressionWrapProblems } from '../util/wrap.ts';

/** Twig expressions longer than printWidth are broken according to rules A–D in test/README.md. */
export default createRule({
  description: 'Break Twig expressions that are longer than printWidth',
  messages: { wrap: 'Twig expression is longer than {{width}} characters.' },
  check({ doc, settings, report }) {
    for (const p of expressionWrapProblems(doc, settings)) report(p.pos, 'wrap', { width: settings.printWidth }, [p.edit]);
  },
});
