import { createRule } from '../util/rule.ts';

interface Options {
  /** `space`: `<p {{ attrs }}>` (default). `tight`: `<p{{ attrs }}>`. */
  mode: 'space' | 'tight';
}

/** A space before attribute output in an HTML tag: `<p{{ attrs }}>` → `<p {{ attrs }}>`. */
export default createRule<Options>({
  name: 'attribute-spacing',
  description: 'Enforce a space before attribute output in HTML tags',
  optionsSchema: { mode: { enum: ['space', 'tight'] } },
  defaultOptions: { mode: 'space' },
  messages: {
    missing: 'Expected a space before the attribute output.',
    unexpected: 'Unexpected space before the attribute output.',
  },
  check({ doc, options, report }) {
    const { src, masked } = doc;
    const outputs = doc.segments.filter((s) => s.kind === 'output' && s.open === '{{');
    for (const tag of doc.htmlTags) {
      if (tag.closing) continue;
      for (const seg of outputs) {
        if (seg.start < tag.nameEnd || seg.start >= tag.closeStart) continue;
        if (tag.attrValues.some((v) => v.start < seg.start && seg.start < v.end)) continue;
        const prev = masked[seg.start - 1];
        if (options.mode === 'space') {
          if (prev === undefined || /\s/.test(prev) || prev === '\0') continue;
          report(seg.start, 'missing', undefined, [{ start: seg.start, end: seg.start, text: ' ' }]);
        } else {
          const ws = /[ \t]+$/.exec(src.slice(0, seg.start));
          if (!ws) continue;
          const before = masked[ws.index - 1];
          if (before === undefined || before === '\0' || before === '<' || /\s/.test(before)) continue;
          report(ws.index, 'unexpected', undefined, [{ start: ws.index, end: seg.start, text: '' }]);
        }
      }
    }
  },
});
