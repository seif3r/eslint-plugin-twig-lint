// Splits a Twig template into segments: text, output ({{ }}), block ({% %}) and comments ({# #}).
// Output and block contents are tokenized. `}}`/`%}` only ends a segment when no brackets are open,
// just like Twig's own lexer. The contents of {% verbatim %}/{% raw %} are not tokenized.

export type TokenType = 'name' | 'number' | 'string' | 'operator' | 'punctuation';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  /** For opening brackets: index of the matching closing bracket in the same segment. */
  match?: number;
}

export type SegmentKind = 'text' | 'output' | 'block' | 'comment';

export interface Segment {
  kind: SegmentKind;
  start: number;
  end: number;
  /** Twig segments: position right after the opening delimiter (including `-`/`~`). */
  innerStart: number;
  /** Twig segments: start of the closing delimiter (including `-`/`~`). */
  closeStart: number;
  /** The opening delimiter, e.g. `{{`, `{%-`. Empty for text. */
  open: string;
  /** The closing delimiter, e.g. `}}`, `-%}`. Empty for text. */
  close: string;
  tokens: Token[];
  /** Block segments: the tag name (first name token). */
  tag: string;
  /** Text inside {% verbatim %}/{% raw %}. */
  verbatim: boolean;
}

export class TwigParseError extends Error {
  offset: number;
  constructor(message: string, offset: number) {
    super(message);
    this.name = 'TwigParseError';
    this.offset = offset;
  }
}

const NAME = /[a-zA-Z_\x7f-￿][a-zA-Z0-9_\x7f-￿]*/y;
const NUMBER = /[0-9][0-9_]*(?:\.[0-9][0-9_]*)?(?:[eE][+-]?[0-9]+)?/y;
const OPERATOR = /===|!==|<=>|\.\.\.|==|!=|<=|>=|\.\.|\?\?|\?:|\?\.|=>|\*\*|\/\/|[+\-*/%~<>=!]/y;
const PUNCTUATION = '()[]{}?:.,|';
const CLOSER_FOR: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

export function lineAt(src: string, pos: number): number {
  let line = 1;
  const end = Math.min(pos, src.length);
  for (let i = 0; i < end; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

function isWs(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}

function textSegment(start: number, end: number, verbatim = false): Segment {
  return { kind: 'text', start, end, innerStart: start, closeStart: end, open: '', close: '', tokens: [], tag: '', verbatim };
}

export function lex(src: string): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  while (pos < src.length) {
    const at = findOpen(src, pos);
    if (at < 0) {
      out.push(textSegment(pos, src.length));
      break;
    }
    if (at > pos) out.push(textSegment(pos, at));
    const seg = lexTwig(src, at);
    out.push(seg);
    pos = seg.end;
    if (seg.kind === 'block' && (seg.tag === 'verbatim' || seg.tag === 'raw')) {
      const re = new RegExp(`\\{%[-~]?\\s*end${seg.tag}\\s*[-~]?%\\}`, 'g');
      re.lastIndex = pos;
      const m = re.exec(src);
      if (!m) {
        throw new TwigParseError(
          `{% ${seg.tag} %} on line ${lineAt(src, seg.start)} has no {% end${seg.tag} %}`,
          seg.start,
        );
      }
      if (m.index > pos) out.push(textSegment(pos, m.index, true));
      pos = m.index;
    }
  }
  return out;
}

function findOpen(src: string, from: number): number {
  let i = src.indexOf('{', from);
  while (i >= 0) {
    const next = src[i + 1];
    if (next === '{' || next === '%' || next === '#') return i;
    i = src.indexOf('{', i + 1);
  }
  return -1;
}

function lexTwig(src: string, start: number): Segment {
  const type = src[start + 1];
  let i = start + 2;
  let open = src.slice(start, i);
  if (src[i] === '-' || src[i] === '~') {
    open += src[i];
    i++;
  }
  const innerStart = i;

  if (type === '#') {
    const c = src.indexOf('#}', i);
    if (c < 0) {
      throw new TwigParseError(`Comment on line ${lineAt(src, start)} is never closed`, start);
    }
    let closeStart = c;
    if (c - 1 >= innerStart && (src[c - 1] === '-' || src[c - 1] === '~')) closeStart = c - 1;
    return {
      kind: 'comment', start, end: c + 2, innerStart, closeStart, open,
      close: src.slice(closeStart, c + 2), tokens: [], tag: '', verbatim: false,
    };
  }

  const closeDelim = type === '{' ? '}}' : '%}';
  const kind = type === '{' ? 'output' : 'block';
  const tokens: Token[] = [];
  const stack: number[] = [];
  const n = src.length;

  const finish = (closeStart: number, end: number): Segment => {
    const first = tokens[0];
    const tag = kind === 'block' && first && first.type === 'name' ? first.value : '';
    if (kind === 'block' && !tag) {
      throw new TwigParseError(`Block tag on line ${lineAt(src, start)} has no name`, start);
    }
    return {
      kind, start, end, innerStart, closeStart, open, close: src.slice(closeStart, end),
      tokens, tag, verbatim: false,
    };
  };

  for (;;) {
    while (i < n && isWs(src[i])) i++;
    if (stack.length === 0) {
      if (src.startsWith(closeDelim, i)) return finish(i, i + 2);
      if ((src[i] === '-' || src[i] === '~') && src.startsWith(closeDelim, i + 1)) return finish(i, i + 3);
    }
    if (i >= n) {
      const firstOpen = stack[0];
      if (firstOpen !== undefined) {
        const tk = tokens[firstOpen]!;
        throw new TwigParseError(
          `"${open}" on line ${lineAt(src, start)} is never closed (bracket "${tk.value}" on line ${lineAt(src, tk.start)} is still open)`,
          start,
        );
      }
      throw new TwigParseError(`"${open}" on line ${lineAt(src, start)} is never closed`, start);
    }
    const c = src[i]!;

    if (c === '"' || c === "'") {
      const e = scanString(src, i);
      tokens.push({ type: 'string', value: src.slice(i, e), start: i, end: e });
      i = e;
      continue;
    }
    NUMBER.lastIndex = i;
    let m = NUMBER.exec(src);
    if (m) {
      tokens.push({ type: 'number', value: m[0], start: i, end: i + m[0].length });
      i += m[0].length;
      continue;
    }
    NAME.lastIndex = i;
    m = NAME.exec(src);
    if (m) {
      tokens.push({ type: 'name', value: m[0], start: i, end: i + m[0].length });
      i += m[0].length;
      continue;
    }
    OPERATOR.lastIndex = i;
    m = OPERATOR.exec(src);
    if (m) {
      tokens.push({ type: 'operator', value: m[0], start: i, end: i + m[0].length });
      i += m[0].length;
      continue;
    }
    if (PUNCTUATION.includes(c)) {
      if (CLOSER_FOR[c]) {
        stack.push(tokens.length);
      } else if (c === ')' || c === ']' || c === '}') {
        const top = stack.pop();
        if (top === undefined) {
          throw new TwigParseError(`Unexpected "${c}" on line ${lineAt(src, i)}`, i);
        }
        const opener = tokens[top]!;
        if (CLOSER_FOR[opener.value] !== c) {
          throw new TwigParseError(
            `"${c}" on line ${lineAt(src, i)} does not match "${opener.value}" on line ${lineAt(src, opener.start)}`,
            i,
          );
        }
        opener.match = tokens.length;
      }
      tokens.push({ type: 'punctuation', value: c, start: i, end: i + 1 });
      i++;
      continue;
    }
    throw new TwigParseError(`Unexpected character "${c}" on line ${lineAt(src, i)}`, i);
  }
}

function scanString(src: string, start: number): number {
  const q = src[start];
  let j = start + 1;
  while (j < src.length) {
    const ch = src[j];
    if (ch === '\\') {
      j += 2;
    } else if (ch === q) {
      return j + 1;
    } else if (q === '"' && ch === '#' && src[j + 1] === '{') {
      j = skipInterpolation(src, j + 2);
    } else {
      j++;
    }
  }
  throw new TwigParseError(`String on line ${lineAt(src, start)} is never closed`, start);
}

function skipInterpolation(src: string, from: number): number {
  let depth = 1;
  let j = from;
  while (j < src.length) {
    const ch = src[j];
    if (ch === '"' || ch === "'") {
      j = scanString(src, j);
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return j + 1;
    j++;
  }
  throw new TwigParseError(`Interpolation on line ${lineAt(src, from)} is never closed`, from);
}
