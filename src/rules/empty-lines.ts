import { createRule } from '../util/rule.ts';

export default createRule({
  name: 'empty-lines',
  description: 'Allow at most one empty line in a row',
  messages: { tooMany: 'More than one empty line in a row.' },
  check({ doc, report }) {
    const { lines, src } = doc;
    const blank = (i: number): boolean => {
      const l = lines[i];
      return l !== undefined && i < lines.length - 1 && /^[ \t\r]*$/.test(src.slice(l.start, l.end)) && !doc.isPreserved(l.start);
    };
    for (let i = 0; i < lines.length; i++) {
      if (!blank(i) || !blank(i + 1)) continue;
      let j = i + 1;
      while (blank(j)) j++;
      const start = lines[i + 1]!.start;
      report(start, 'tooMany', undefined, [{ start, end: lines[j]!.start, text: '' }]);
      i = j;
    }
  },
});
