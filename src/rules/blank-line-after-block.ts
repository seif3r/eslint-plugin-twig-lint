import { createRule } from '../util/rule.ts';

const MIDDLE_OR_END = /^(end\w+|else|elseif|plural)$/;

/**
 * A line that contains only a closing block tag (`{% endif %}`, `{% endfor %}` …) is followed by an empty line,
 * except before another closing tag, `{% else %}`, `</…>`, something that ends a tag or expression, or end of file.
 */
export default createRule({
  description: 'Require an empty line after a closing block tag',
  messages: { missing: 'Expected an empty line after {% {{tag}} %}.' },
  check({ doc, report }) {
    const { lines, src } = doc;
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const text = src.slice(line.start, line.end);
      const p = line.start + /^[ \t]*/.exec(text)![0].length;
      const seg = doc.segmentAt(p);
      if (!seg || seg.kind !== 'block' || seg.start !== p || !seg.tag.startsWith('end')) continue;
      if (src.slice(seg.end, line.end).trim() !== '' || doc.isFrozenLine(line.start)) continue;
      const next = lines[i + 1];
      if (!next) continue;
      const trimmed = src.slice(next.start, next.end).trim();
      if (trimmed === '') continue;
      const np = next.start + src.slice(next.start, next.end).indexOf(trimmed);
      const nseg = doc.segmentAt(np);
      if (nseg && nseg.kind === 'block' && nseg.start === np && MIDDLE_OR_END.test(nseg.tag)) continue;
      if (/^(<\/|\/?>|[)}\]]|-?%}|-?}})/.test(trimmed)) continue;
      const at = /\r$/.test(text) ? line.end - 1 : line.end;
      report(at, 'missing', { tag: seg.tag }, [{ start: at, end: at, text: eol }]);
    }
  },
});
