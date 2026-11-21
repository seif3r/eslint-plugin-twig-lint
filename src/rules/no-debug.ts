import { createRule, type Edit } from '../util/rule.ts';

interface Options {
  /** Debug functions and filters to report. Replaces the default list. */
  functions: string[];
}

/** Twig's dump(), and the debug helpers from Drupal's Devel and Twig Tweak modules. */
export const DEFAULT_DEBUG_FUNCTIONS = [
  'dump',
  'dd',
  'drupal_dump',
  'kint',
  'ksm',
  'kpr',
  'dpm',
  'dsm',
  'devel_dump',
  'devel_message',
  'devel_breakpoint',
];

/** Debug output such as `{{ dump(x) }}` or `{{ kint(x) }}` should not be committed. */
export default createRule<Options>({
  name: 'no-debug',
  description: 'Disallow debug output such as dump() and kint()',
  type: 'problem',
  level: 'warn',
  fixable: false,
  hasSuggestions: true,
  optionsSchema: { functions: { type: 'array', items: { type: 'string', minLength: 1 } } },
  defaultOptions: { functions: DEFAULT_DEBUG_FUNCTIONS },
  messages: {
    debug: 'Remove the debug output "{{name}}" before committing.',
    remove: 'Remove this debug output.',
  },
  check({ doc, options, suggest }) {
    const names = new Set(options.functions);
    const { src } = doc;
    for (const seg of doc.segments) {
      if (seg.kind !== 'output' && seg.kind !== 'block') continue;
      const tokens = seg.tokens;
      tokens.forEach((t, i) => {
        if (t.type !== 'name' || !names.has(t.value)) return;
        const prev = tokens[i - 1];
        const next = tokens[i + 1];
        const isFilter = prev?.type === 'punctuation' && prev.value === '|';
        const isCall = next?.type === 'punctuation' && next.value === '(' && !(prev && prev.value === '.');
        if (!isFilter && !isCall) return;
        // Suggest removing the whole tag when it holds nothing but the debug call: {{ dump(x) }}.
        const suggestions = [];
        const whole = seg.kind === 'output' && isCall && i === 0 && next.match === tokens.length - 1;
        if (whole) {
          const lineStart = src.lastIndexOf('\n', seg.start - 1) + 1;
          const lineEnd = src.indexOf('\n', seg.end);
          const before = src.slice(lineStart, seg.start);
          const after = src.slice(seg.end, lineEnd < 0 ? src.length : lineEnd);
          const alone = before.trim() === '' && after.trim() === '';
          const edit: Edit = alone
            ? { start: lineStart, end: lineEnd < 0 ? src.length : lineEnd + 1, text: '' }
            : { start: seg.start, end: seg.end, text: '' };
          suggestions.push({ messageId: 'remove', edits: [edit] });
        }
        suggest(t.start, 'debug', { name: isFilter ? `|${t.value}` : `${t.value}()` }, suggestions);
      });
    }
  },
});
