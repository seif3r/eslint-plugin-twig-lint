// Indentation. Used by the `block-indent` and `nested-indent` rules, and by the wrap rules.
//
// - A line that starts with whatever closes the innermost frame (`}`, `)`, `%}`, `{% endif %}`, `</div>`,
//   `>` in a broken tag …) gets the same indentation as the line that opened the frame.
// - Otherwise: the indentation of the line that opened the innermost frame, plus one step. A line that
//   opens several brackets therefore only adds one step.
// - A line starting with `?`/`:` (ternary): one extra step. A line starting with `and`/`or` directly in an
//   `{% if %}` tag: two steps from the tag.
// - Frozen lines (comments, pre/textarea/script/style, trans, multi-line strings and attribute values)
//   are never touched.

import type { Doc, Frame } from '../language/parse.ts';
import type { Edit, SharedSettings } from './rule.ts';

export function indentWidth(ws: string, unit: number): number {
  let w = 0;
  for (const ch of ws) w += ch === '\t' ? unit : 1;
  return w;
}

export function indentString(width: number, unit: number, useTabs: boolean): string {
  if (!useTabs) return ' '.repeat(width);
  return '\t'.repeat(Math.floor(width / unit)) + ' '.repeat(width % unit);
}

/** Computes the expected indentation (in columns) of each line. Empty lines get `undefined`. */
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

export function innermost(frames: Frame[], p: number): Frame | undefined {
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

export interface IndentProblem {
  /** `nested` when the line is inside a multi-line expression, otherwise `block`. */
  kind: 'block' | 'nested';
  pos: number;
  expected: number;
  actual: number;
  edit: Edit;
}

export function indentProblems(doc: Doc, settings: SharedSettings): IndentProblem[] {
  const unit = settings.indentSize;
  const cols = computeIndents(doc, unit);
  const out: IndentProblem[] = [];
  doc.lines.forEach((line, li) => {
    const want = cols[li];
    if (want === undefined || doc.isFrozenLine(line.start)) return;
    const ws = /^[ \t]*/.exec(doc.src.slice(line.start, line.end))![0];
    const expected = indentString(want, unit, settings.useTabs);
    if (ws === expected) return;
    const p = line.start + ws.length;
    const inner = innermost(doc.frames, p);
    out.push({
      kind: inner?.kind === 'delim' || inner?.kind === 'bracket' ? 'nested' : 'block',
      pos: p,
      expected: want,
      actual: indentWidth(ws, unit),
      edit: { start: line.start, end: p, text: expected },
    });
  });
  return out;
}
