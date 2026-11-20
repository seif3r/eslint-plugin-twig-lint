import { createRule } from '../util/rule.ts';

/** Exactly one space inside `{{ }}`, `{% %}` and `{# #}`. Newlines inside are left alone. */
export default createRule({
  name: 'delimiter-spacing',
  description: 'Require exactly one space inside Twig delimiters',
  messages: {
    afterOpen: 'Expected exactly one space after "{{open}}".',
    beforeClose: 'Expected exactly one space before "{{close}}".',
  },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      if (seg.kind === 'text') continue;
      const inner = doc.src.slice(seg.innerStart, seg.closeStart);
      if (inner.trim() === '') continue;
      const lead = /^\s*/.exec(inner)![0];
      if (!lead.includes('\n') && lead !== ' ') {
        report(seg.innerStart, 'afterOpen', { open: seg.open }, [
          { start: seg.innerStart, end: seg.innerStart + lead.length, text: ' ' },
        ]);
      }
      const trail = /\s*$/.exec(inner)![0];
      if (!trail.includes('\n') && trail !== ' ') {
        report(seg.closeStart - trail.length, 'beforeClose', { close: seg.close }, [
          { start: seg.closeStart - trail.length, end: seg.closeStart, text: ' ' },
        ]);
      }
    }
  },
});
