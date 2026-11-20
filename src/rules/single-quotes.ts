import { createRule } from '../util/rule.ts';

/**
 * Strings use single quotes. A string that contains a single quote, or uses interpolation (`"#{x}"`, which
 * only works in double quotes), keeps its double quotes.
 */
export default createRule({
  name: 'single-quotes',
  description: 'Enforce single quotes for Twig strings',
  messages: { single: 'Use single quotes for this string.' },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      for (const t of seg.tokens) {
        if (t.type !== 'string' || !t.value.startsWith('"')) continue;
        const content = t.value.slice(1, -1);
        if (content.includes("'") || content.includes('#{')) continue;
        report(t.start, 'single', undefined, [{ start: t.start, end: t.end, text: `'${content.replace(/\\"/g, '"')}'` }]);
      }
    }
  },
});
