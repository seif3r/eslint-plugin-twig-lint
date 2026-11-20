// Enkla blankstegsregler: trailing-whitespace, final-newline, empty-lines, blank-line-after-block,
// delimiter-spacing och attribute-spacing.

import type { RawFinding, Rule } from '../rule.ts';

export const trailingWhitespace: Rule = {
  rules: [{ id: 'trailing-whitespace', description: 'Mellanslag i slutet av rader', defaultLevel: 'error', fixable: true }],
  run({ doc }) {
    const out: RawFinding[] = [];
    for (const line of doc.lines) {
      const text = doc.src.slice(line.start, line.end);
      const m = /[ \t\r]+$/.exec(text);
      if (!m) continue;
      const a = line.start + m.index;
      if (doc.isPreserved(a)) continue;
      out.push({ ruleId: 'trailing-whitespace', pos: a, message: 'Mellanslag i slutet av raden', edits: [{ start: a, end: line.end, text: '' }] });
    }
    return out;
  },
};

export const finalNewline: Rule = {
  rules: [{ id: 'final-newline', description: 'Exakt en radbrytning sist i filen', defaultLevel: 'error', fixable: true }],
  run({ doc }) {
    const src = doc.src;
    if (src.length === 0) return [];
    const m = /\n*$/.exec(src)!;
    if (m[0].length === 1) return [];
    return [{
      ruleId: 'final-newline',
      pos: m.index,
      message: m[0].length === 0 ? 'Filen saknar radbrytning sist' : 'Flera radbrytningar sist i filen',
      edits: [{ start: m.index, end: src.length, text: '\n' }],
    }];
  },
};

export const emptyLines: Rule = {
  rules: [{ id: 'empty-lines', description: 'Högst en tom rad i följd', defaultLevel: 'error', fixable: true }],
  run({ doc }) {
    const out: RawFinding[] = [];
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
      const end = lines[j]!.start;
      out.push({ ruleId: 'empty-lines', pos: start, message: 'Mer än en tom rad i följd', edits: [{ start, end, text: '' }] });
      i = j;
    }
    return out;
  },
};

const MIDDLE_OR_END = /^(end\w+|else|elseif|plural)$/;

export const blankLineAfterBlock: Rule = {
  rules: [{ id: 'blank-line-after-block', description: 'Tom rad efter en avslutande blocktagg', defaultLevel: 'error', fixable: true }],
  run({ doc }) {
    const out: RawFinding[] = [];
    const { lines, src } = doc;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const text = src.slice(line.start, line.end);
      const p = line.start + /^[ \t]*/.exec(text)![0].length;
      const seg = doc.segmentAt(p);
      if (!seg || seg.kind !== 'block' || seg.start !== p || !seg.tag.startsWith('end')) continue;
      if (src.slice(seg.end, line.end).trim() !== '' || doc.isFrozenLine(line.start)) continue;
      const next = lines[i + 1];
      if (!next || i + 1 === lines.length - 1 && next.start === next.end) continue;
      const nextText = src.slice(next.start, next.end);
      const trimmed = nextText.trim();
      if (trimmed === '') continue;
      const np = next.start + nextText.indexOf(trimmed);
      const nseg = doc.segmentAt(np);
      if (nseg && nseg.kind === 'block' && nseg.start === np && MIDDLE_OR_END.test(nseg.tag)) continue;
      if (/^(<\/|\/?>|[)}\]]|-?%}|-?}})/.test(trimmed)) continue;
      out.push({
        ruleId: 'blank-line-after-block',
        pos: line.end,
        message: `Tom rad saknas efter {% ${seg.tag} %}`,
        edits: [{ start: line.end, end: line.end, text: '\n' }],
      });
    }
    return out;
  },
};

export const delimiterSpacing: Rule = {
  rules: [{ id: 'delimiter-spacing', description: 'Ett mellanslag innanför {{ }}, {% %} och {# #}', defaultLevel: 'error', fixable: true }],
  run({ doc, options }) {
    if (!options.twigTagSpacing) return [];
    const out: RawFinding[] = [];
    for (const seg of doc.segments) {
      if (seg.kind === 'text') continue;
      const inner = doc.src.slice(seg.innerStart, seg.closeStart);
      if (inner.trim() === '') continue;
      const lead = /^\s*/.exec(inner)![0];
      if (!lead.includes('\n') && lead !== ' ') {
        out.push({
          ruleId: 'delimiter-spacing', pos: seg.innerStart,
          message: `Ett mellanslag efter "${seg.open}"`,
          edits: [{ start: seg.innerStart, end: seg.innerStart + lead.length, text: ' ' }],
        });
      }
      const trail = /\s*$/.exec(inner)![0];
      if (!trail.includes('\n') && trail !== ' ') {
        out.push({
          ruleId: 'delimiter-spacing', pos: seg.closeStart - trail.length,
          message: `Ett mellanslag före "${seg.close}"`,
          edits: [{ start: seg.closeStart - trail.length, end: seg.closeStart, text: ' ' }],
        });
      }
    }
    return out;
  },
};

export const attributeSpacing: Rule = {
  rules: [{ id: 'attribute-spacing', description: 'Mellanslag före {{ attrs }} i en HTML-tagg', defaultLevel: 'error', fixable: true }],
  run({ doc, options }) {
    const mode = options.attributeSpacing;
    if (mode === 'preserve') return [];
    const out: RawFinding[] = [];
    const { src, masked } = doc;
    for (const tag of doc.htmlTags) {
      if (tag.closing) continue;
      for (const seg of doc.segments) {
        if (seg.kind !== 'output' || seg.start < tag.nameEnd || seg.start >= tag.closeStart) continue;
        if (tag.attrValues.some((v) => v.start < seg.start && seg.start < v.end)) continue;
        if (seg.open !== '{{') continue;
        const prev = masked[seg.start - 1];
        if (mode === 'space') {
          if (prev === undefined || /\s/.test(prev) || prev === '\0') continue;
          out.push({
            ruleId: 'attribute-spacing', pos: seg.start,
            message: 'Mellanslag saknas före attribut-utskriften',
            edits: [{ start: seg.start, end: seg.start, text: ' ' }],
          });
        } else {
          const ws = /[ \t]+$/.exec(src.slice(0, seg.start));
          if (!ws) continue;
          const before = masked[ws.index - 1];
          if (before === undefined || before === '\0' || before === '<' || /\s/.test(before)) continue;
          out.push({
            ruleId: 'attribute-spacing', pos: ws.index,
            message: 'Inget mellanslag före attribut-utskriften',
            edits: [{ start: ws.index, end: seg.start, text: '' }],
          });
        }
      }
    }
    return out;
  },
};
