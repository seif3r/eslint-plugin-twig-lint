import { createRule } from '../util/rule.ts';

/**
 * The `spaceless` filter (`{% apply spaceless %}`, `|spaceless`) is deprecated since Twig 3.12, and the
 * `{% spaceless %}` tag was removed in Twig 3.0.
 */
export default createRule({
  name: 'deprecated-spaceless',
  description: 'Warn about the deprecated spaceless filter',
  type: 'problem',
  level: 'warn',
  fixable: false,
  messages: {
    filter: 'The spaceless filter is deprecated since Twig 3.12.',
    tag: 'The {% spaceless %} tag was removed in Twig 3.0.',
  },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      if (seg.kind === 'block' && seg.tag === 'spaceless') {
        report(seg.start, 'tag');
        continue;
      }
      seg.tokens.forEach((t, i) => {
        if (t.type !== 'name' || t.value !== 'spaceless') return;
        const prev = seg.tokens[i - 1];
        const afterPipe = prev?.type === 'punctuation' && prev.value === '|';
        const afterApply = seg.kind === 'block' && seg.tag === 'apply' && i === 1;
        if (afterPipe || afterApply) report(t.start, 'filter');
      });
    }
  },
});
