import { createRule } from '../util/rule.ts';
import { spacingProblems } from '../util/spacing.ts';

/** `{key: value}` and `name: value` arguments: no space before the colon and one after it. */
export default createRule({
  name: 'hash-spacing',
  description: 'Enforce spacing around the colon in hashes and named arguments',
  messages: {
    before: 'Unexpected space before ":".',
    after: 'Expected one space after ":".',
  },
  check({ doc, report }) {
    for (const p of spacingProblems(doc)) {
      if (p.rule !== 'hash-spacing') continue;
      report(p.pos, p.want ? 'after' : 'before', undefined, [{ start: p.start, end: p.end, text: p.want }]);
    }
  },
});
