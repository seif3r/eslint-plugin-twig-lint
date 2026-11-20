import { createRule } from '../util/rule.ts';

export default createRule({
  description: 'Require exactly one newline at the end of the file',
  messages: { missing: 'Missing newline at end of file.', extra: 'Too many newlines at end of file.' },
  check({ doc, report }) {
    const src = doc.src;
    if (src.length === 0) return;
    const m = /(\r?\n)*$/.exec(src)!;
    const count = (m[0].match(/\n/g) ?? []).length;
    if (count === 1) return;
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    report(m.index, count === 0 ? 'missing' : 'extra', undefined, [{ start: m.index, end: src.length, text: eol }]);
  },
});
