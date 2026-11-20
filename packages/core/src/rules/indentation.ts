// Indentering (`block-indent` och `nested-indent`).
//
// - En rad som börjar med det som stänger den innersta ramen (`}`, `)`, `%}`, `{% endif %}`, `</div>`,
//   `>` i en bruten tagg …) får samma indentering som raden som öppnade ramen.
// - Annars: indenteringen för raden som öppnade den innersta ramen + ett steg. En rad som öppnar flera
//   parenteser ger därför bara ett steg.
// - Rad som börjar med `?`/`:` (ternary): ett extra steg. Rad som börjar med `and`/`or` direkt i en
//   `{% if %}`-tagg: två steg från taggen.
// - Frysta rader (kommentarer, pre/textarea/script/style, trans, strängar och attributvärden över flera
//   rader) rörs inte.

import type { Doc, Frame } from '../parse.ts';
import type { RawFinding, Rule } from '../rule.ts';

export function indentWidth(ws: string, unit: number): number {
  let w = 0;
  for (const ch of ws) w += ch === '\t' ? unit : 1;
  return w;
}

export function indentString(width: number, unit: number, useTabs: boolean): string {
  if (!useTabs) return ' '.repeat(width);
  return '\t'.repeat(Math.floor(width / unit)) + ' '.repeat(width % unit);
}

/** Beräknar den förväntade indenteringen (i kolumner) för varje rad. Tomma rader får `undefined`. */
export function computeIndents(doc: Doc, unit: number): Array<number | undefined> {
  const { src, lines, frames } = doc;
  const cols: Array<number | undefined> = [];
  const known: number[] = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    const text = src.slice(line.start, line.end);
    const ws = /^[ \t]*/.exec(text)![0];
    const current = indentWidth(ws, unit);
    if (ws.length === text.length) {
      cols.push(undefined);
      known.push(current);
      continue;
    }
    if (doc.isFrozenLine(line.start)) {
      cols.push(current);
      known.push(current);
      continue;
    }
    const p = line.start + ws.length;
    const inner = innermost(frames, p);
    let col = 0;
    if (inner) {
      const anchor = known[doc.lineOf(inner.anchor)] ?? 0;
      col = inner.close === p ? anchor : anchor + unit * (1 + extraSteps(doc, inner, p));
    }
    cols.push(col);
    known.push(col);
  }
  return cols;
}

function innermost(frames: Frame[], p: number): Frame | undefined {
  let found: Frame | undefined;
  for (const f of frames) {
    if (f.open >= p) break;
    if (p <= f.close) found = f;
  }
  return found;
}

function extraSteps(doc: Doc, frame: Frame, p: number): number {
  if (frame.kind !== 'delim' && frame.kind !== 'bracket') return 0;
  const tok = doc.tokenAt(p);
  if (!tok) return 0;
  if (tok.value === '?' || tok.value === ':' || tok.value === '?:' || tok.value === '??') return 1;
  if (
    frame.kind === 'delim' && tok.type === 'name' && (tok.value === 'and' || tok.value === 'or') &&
    frame.seg?.kind === 'block' && (frame.seg.tag === 'if' || frame.seg.tag === 'elseif')
  ) {
    return 1;
  }
  return 0;
}

export const indentation: Rule = {
  rules: [
    { id: 'block-indent', description: 'Indentering efter Twig-block och HTML-element', defaultLevel: 'error', fixable: true },
    { id: 'nested-indent', description: 'Indentering i flerradiga uttryck', defaultLevel: 'error', fixable: true },
  ],
  run({ doc, options }) {
    const unit = options.indentSize;
    const cols = computeIndents(doc, unit);
    const findings: RawFinding[] = [];
    doc.lines.forEach((line, li) => {
      const want = cols[li];
      if (want === undefined) return;
      const text = doc.src.slice(line.start, line.end);
      const ws = /^[ \t]*/.exec(text)![0];
      const expected = indentString(want, unit, options.useTabs);
      if (ws === expected || doc.isFrozenLine(line.start)) return;
      const p = line.start + ws.length;
      const inner = innermost(doc.frames, p);
      const nested = inner?.kind === 'delim' || inner?.kind === 'bracket';
      findings.push({
        ruleId: nested ? 'nested-indent' : 'block-indent',
        pos: p,
        message: `Förväntad indentering ${want} ${options.useTabs ? 'kolumner' : 'mellanslag'}, hittade ${indentWidth(ws, unit)}`,
        edits: [{ start: line.start, end: p, text: expected }],
      });
    });
    return findings;
  },
};
