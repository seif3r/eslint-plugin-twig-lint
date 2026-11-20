import { createRule } from '../util/rule.ts';
import { spacingProblems } from '../util/spacing.ts';

/** One space after a comma and none before it. No space just inside `(`, `[` and `{`. */
export default createRule({
  name: 'punctuation-spacing',
  description: 'Enforce spacing around commas and inside brackets in Twig expressions',
  messages: {
    space: 'Expected one space between "{{before}}" and "{{after}}".',
    tight: 'Unexpected space between "{{before}}" and "{{after}}".',
  },
  check({ doc, report }) {
    for (const p of spacingProblems(doc)) {
      if (p.rule !== 'punctuation-spacing') continue;
      report(p.pos, p.want ? 'space' : 'tight', { before: p.before, after: p.after }, [{ start: p.start, end: p.end, text: p.want }]);
    }
  },
});
