import { createRule } from '../util/rule.ts';
import { spacingProblems } from '../util/spacing.ts';

/**
 * One space around binary operators (`==`, `~`, `and`, `?`, `:` in a ternary, `=>` …) and after `not`.
 * No space around `.`, `?.`, `|` and `..`, and none after a unary `-` or `+`.
 */
export default createRule({
  name: 'operator-spacing',
  description: 'Enforce spacing around operators in Twig expressions',
  messages: {
    space: 'Expected one space between "{{before}}" and "{{after}}".',
    tight: 'Unexpected space between "{{before}}" and "{{after}}".',
  },
  check({ doc, report }) {
    for (const p of spacingProblems(doc)) {
      if (p.rule !== 'operator-spacing') continue;
      report(p.pos, p.want ? 'space' : 'tight', { before: p.before, after: p.after }, [{ start: p.start, end: p.end, text: p.want }]);
    }
  },
});
