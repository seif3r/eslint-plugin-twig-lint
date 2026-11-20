import { createRule } from '../util/rule.ts';
import { attributeWrapProblems } from '../util/wrap.ts';

/** Opening tags longer than printWidth: one attribute per line and `>` on its own line. */
export default createRule({
  description: 'Put one attribute per line when an opening tag is longer than printWidth',
  messages: { wrap: 'Opening tag <{{name}}> is longer than {{width}} characters. Put one attribute per line.' },
  check({ doc, settings, report }) {
    for (const p of attributeWrapProblems(doc, settings)) {
      report(p.pos, 'wrap', { name: p.name ?? '', width: settings.printWidth }, [p.edit]);
    }
  },
});
