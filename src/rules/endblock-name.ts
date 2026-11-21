import { createRule } from '../util/rule.ts';

interface Options {
  /** `always`: `{% endblock name %}` (default). `never`: `{% endblock %}`. */
  mode: 'always' | 'never';
  /** With `always`: blocks shorter than this many lines may leave out the name. Default 0 (every block). */
  minLines: number;
}

const NAMED = new Set(['block', 'macro']);

/**
 * Consistent names on `{% endblock %}` and `{% endmacro %}`. A name that does not match the opening tag is a
 * Twig compile error, and is reported in both modes.
 */
export default createRule<Options>({
  name: 'endblock-name',
  description: 'Enforce or disallow the block name on {% endblock %} and {% endmacro %}',
  optionsSchema: { mode: { enum: ['always', 'never'] }, minLines: { type: 'integer', minimum: 0 } },
  defaultOptions: { mode: 'always', minLines: 0 },
  messages: {
    missing: 'Expected {% {{tag}} {{name}} %}.',
    unexpected: 'Unexpected name on {% {{tag}} %}.',
    mismatch: '{% {{tag}} {{given}} %} does not match {% {{open}} {{name}} %}.',
  },
  check({ doc, options, report }) {
    for (const pair of doc.blocks) {
      if (!NAMED.has(pair.name)) continue;
      const open = pair.tags[0]!;
      const end = pair.tags[pair.tags.length - 1]!;
      const name = open.tokens[1];
      const endTag = end.tokens[0];
      if (!name || name.type !== 'name' || !endTag) continue;
      const given = end.tokens[1];
      const data = { tag: endTag.value, name: name.value, open: pair.name, given: given?.value ?? '' };

      if (given && given.value !== name.value) {
        const edit = options.mode === 'always'
          ? { start: given.start, end: given.end, text: name.value }
          : { start: endTag.end, end: end.tokens[end.tokens.length - 1]!.end, text: '' };
        report(given.start, 'mismatch', data, [edit]);
      } else if (options.mode === 'always' && !given && doc.lineOf(end.start) - doc.lineOf(open.start) + 1 >= options.minLines) {
        report(endTag.start, 'missing', data, [{ start: endTag.end, end: endTag.end, text: ` ${name.value}` }]);
      } else if (options.mode === 'never' && given) {
        report(given.start, 'unexpected', data, [{ start: endTag.end, end: end.tokens[end.tokens.length - 1]!.end, text: '' }]);
      }
    }
  },
});
