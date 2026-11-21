import { createRule } from '../util/rule.ts';

interface Options {
  /** Tags with fewer attributes than this stay on one line, however long they are. Default 2. */
  minAttributes: number;
}
import { attributeWrapProblems } from '../util/wrap.ts';

/** Opening tags longer than printWidth: one attribute per line and `>` on its own line. */
export default createRule<Options>({
  name: 'attribute-wrap',
  description: 'Put one attribute per line when an opening tag is longer than printWidth',
  optionsSchema: { minAttributes: { type: 'integer', minimum: 1 } },
  defaultOptions: { minAttributes: 2 },
  messages: { wrap: 'Opening tag <{{name}}> is longer than {{width}} characters. Put one attribute per line.' },
  check({ doc, settings, options, report }) {
    for (const p of attributeWrapProblems(doc, settings, options.minAttributes)) {
      report(p.pos, 'wrap', { name: p.name ?? '', width: settings.printWidth }, [p.edit]);
    }
  },
});
