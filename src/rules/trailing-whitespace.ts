import { createRule } from '../util/rule.ts';

export default createRule({
  description: 'Disallow whitespace at the end of lines',
  messages: { trailing: 'Trailing whitespace.' },
  check({ doc, report }) {
    for (const line of doc.lines) {
      const m = /[ \t]+(?=\r?$)/.exec(doc.src.slice(line.start, line.end));
      if (!m) continue;
      const a = line.start + m.index;
      if (doc.isPreserved(a)) continue;
      report(a, 'trailing', undefined, [{ start: a, end: a + m[0].length, text: '' }]);
    }
  },
});
