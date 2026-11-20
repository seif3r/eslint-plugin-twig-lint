// Spacing between tokens inside Twig tags, shared by operator-spacing, punctuation-spacing and
// hash-spacing. Only gaps on a single line are checked: line breaks are left to the indentation and wrap
// rules, so multi-line expressions keep their layout.

import type { Doc } from '../language/parse.ts';
import { analyze, gapAfter } from './syntax.ts';

export type SpacingRule = 'operator-spacing' | 'punctuation-spacing' | 'hash-spacing';

export interface SpacingProblem {
  rule: SpacingRule;
  /** Offset of the gap (the end of the token before it). */
  pos: number;
  start: number;
  end: number;
  /** The expected gap: `''` or `' '`. */
  want: string;
  /** The tokens on each side of the gap. */
  before: string;
  after: string;
}

export function spacingProblems(doc: Doc): SpacingProblem[] {
  const out: SpacingProblem[] = [];
  for (const seg of doc.segments) {
    if (seg.kind !== 'output' && seg.kind !== 'block') continue;
    const s = analyze(seg);
    const { tokens } = s;
    for (let i = 0; i + 1 < tokens.length; i++) {
      const gap = gapAfter(doc.src, tokens, i);
      if (gap.text.includes('\n')) continue;
      const a = tokens[i]!;
      const b = tokens[i + 1]!;
      let rule: SpacingRule | null = null;
      let want = '';
      const colonA = s.colons.get(i);
      const colonB = s.colons.get(i + 1);
      if (b.value === ',' && b.type === 'punctuation') [rule, want] = ['punctuation-spacing', ''];
      else if (a.value === ',' && a.type === 'punctuation') [rule, want] = ['punctuation-spacing', s.isCloser(i + 1) ? '' : ' '];
      else if (s.isOpener(i) || s.isCloser(i + 1)) [rule, want] = ['punctuation-spacing', ''];
      else if (colonB === 'hash' || colonB === 'named') [rule, want] = ['hash-spacing', ''];
      else if (colonA === 'hash' || colonA === 'named') [rule, want] = ['hash-spacing', ' '];
      else if (s.isTight(i) || s.isTight(i + 1)) [rule, want] = ['operator-spacing', ''];
      else if (s.isUnary(i) && a.type === 'operator') [rule, want] = ['operator-spacing', ''];
      else if (s.isBinary(i) || s.isBinary(i + 1) || s.isUnary(i)) [rule, want] = ['operator-spacing', ' '];
      if (!rule || gap.text === want) continue;
      out.push({ rule, pos: gap.start, start: gap.start, end: gap.end, want, before: a.value, after: b.value });
    }
  }
  return out;
}
