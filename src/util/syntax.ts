// Token classification for the spacing and syntax rules: which tokens are binary or unary operators,
// what a `:` means (ternary, hash key or named argument), and which `(` starts a call.

import type { Segment, Token } from '../language/lexer.ts';

/** Operators written as words. `not` is unary; the rest are binary (`starts with` / `ends with` start with these). */
export const WORD_OPERATORS = new Set(['and', 'or', 'not', 'in', 'is', 'matches', 'starts', 'ends', 'xor']);

/** Operators that take no spaces around them. */
const TIGHT_OPERATORS = new Set(['.', '?.', '|', '..']);

export type ColonKind = 'ternary' | 'hash' | 'named' | 'other';

export interface SegmentSyntax {
  seg: Segment;
  tokens: Token[];
  /** What each `:` token means, by token index. */
  colons: Map<number, ColonKind>;
  isOpener(i: number): boolean;
  isCloser(i: number): boolean;
  isTight(i: number): boolean;
  isUnary(i: number): boolean;
  isBinary(i: number): boolean;
  /** `(` that starts the arguments of a function, filter, method or macro call. */
  isCallParen(i: number): boolean;
  /** The `(` of a macro definition: `{% macro name(…) %}`. */
  isMacroDefinition(i: number): boolean;
}

const punct = (t: Token | undefined, values: string): boolean =>
  t !== undefined && t.type === 'punctuation' && values.includes(t.value);

export function analyze(seg: Segment): SegmentSyntax {
  const tokens = seg.tokens;
  const colons = new Map<number, ColonKind>();
  const levels: Array<{ char: string; pending: number }> = [{ char: '', pending: 0 }];
  tokens.forEach((t, i) => {
    const level = levels[levels.length - 1]!;
    if (punct(t, '([{')) levels.push({ char: t.value, pending: 0 });
    else if (punct(t, ')]}')) {
      if (levels.length > 1) levels.pop();
    } else if (punct(t, '?')) level.pending++;
    else if (punct(t, ':')) {
      if (level.pending > 0) {
        level.pending--;
        colons.set(i, 'ternary');
      } else colons.set(i, level.char === '{' ? 'hash' : level.char === '(' ? 'named' : 'other');
    }
  });

  const isTagName = (i: number): boolean => seg.kind === 'block' && i === 0;
  const isWordOperator = (i: number): boolean => {
    const t = tokens[i];
    if (!t || t.type !== 'name' || !WORD_OPERATORS.has(t.value) || isTagName(i)) return false;
    const prev = tokens[i - 1];
    // `x.is`, `x|in` and hash keys like `{ in: 1 }` are names, not operators.
    if (prev && (punct(prev, '.|') || (prev.type === 'operator' && prev.value === '?.'))) return false;
    const next = tokens[i + 1];
    if (next && punct(next, ':') && colons.get(i + 1) !== 'ternary') return false;
    return true;
  };

  const syntax: SegmentSyntax = {
    seg,
    tokens,
    colons,
    isOpener: (i) => punct(tokens[i], '([{'),
    isCloser: (i) => punct(tokens[i], ')]}'),
    isTight(i) {
      const t = tokens[i];
      return t !== undefined && (t.type === 'punctuation' || t.type === 'operator') && TIGHT_OPERATORS.has(t.value);
    },
    isUnary(i) {
      const t = tokens[i];
      if (!t) return false;
      if (t.type === 'name') return t.value === 'not' && isWordOperator(i);
      if (t.type !== 'operator' || (t.value !== '-' && t.value !== '+')) return false;
      const prev = tokens[i - 1];
      if (!prev || isTagName(i - 1)) return true;
      if (prev.type === 'operator') return true;
      if (punct(prev, '([{,?|')) return true;
      if (punct(prev, ':')) return true;
      return prev.type === 'name' && isWordOperator(i - 1);
    },
    isBinary(i) {
      const t = tokens[i];
      if (!t || syntax.isUnary(i)) return false;
      if (t.type === 'operator') return !TIGHT_OPERATORS.has(t.value);
      if (punct(t, '?')) return true;
      if (punct(t, ':')) return colons.get(i) === 'ternary';
      return t.type === 'name' && isWordOperator(i);
    },
    isCallParen(i) {
      if (!punct(tokens[i], '(')) return false;
      const prev = tokens[i - 1];
      if (!prev) return false;
      if (prev.type === 'name') return !isTagName(i - 1) && !isWordOperator(i - 1);
      return punct(prev, ')]');
    },
    isMacroDefinition(i) {
      return seg.kind === 'block' && seg.tag === 'macro' && i === 2 && punct(tokens[i], '(');
    },
  };
  return syntax;
}

/** The text between token `i` and token `i + 1`. */
export function gapAfter(src: string, tokens: Token[], i: number): { start: number; end: number; text: string } {
  const start = tokens[i]!.end;
  const end = tokens[i + 1]!.start;
  return { start, end, text: src.slice(start, end) };
}
