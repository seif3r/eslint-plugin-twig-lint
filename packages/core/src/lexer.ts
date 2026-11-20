// Delar upp en Twig-mall i segment: text, output ({{ }}), block ({% %}) och kommentarer ({# #}).
// Innehållet i output och block tokeniseras. `}}`/`%}` avslutar bara när parentesstacken är tom,
// precis som Twigs egen lexer. Innehållet i {% verbatim %}/{% raw %} tokeniseras inte.

export type TokenType = 'name' | 'number' | 'string' | 'operator' | 'punctuation';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  /** För öppnande parenteser: index för den matchande stängande parentesen i samma segment. */
  match?: number;
}

export type SegmentKind = 'text' | 'output' | 'block' | 'comment';

export interface Segment {
  kind: SegmentKind;
  start: number;
  end: number;
  /** Twig-segment: position direkt efter öppningsavgränsaren (inklusive `-`/`~`). */
  innerStart: number;
  /** Twig-segment: start för stängningsavgränsaren (inklusive `-`/`~`). */
  closeStart: number;
  /** Öppningsavgränsaren, t.ex. `{{`, `{%-`. Tom för text. */
  open: string;
  /** Stängningsavgränsaren, t.ex. `}}`, `-%}`. Tom för text. */
  close: string;
  tokens: Token[];
  /** Block-segment: taggnamnet (första namn-token). */
  tag: string;
  /** Text inuti {% verbatim %}/{% raw %}. */
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
          `{% ${seg.tag} %} på rad ${lineAt(src, seg.start)} saknar {% end${seg.tag} %}`,
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
      throw new TwigParseError(`Kommentaren på rad ${lineAt(src, start)} stängs aldrig`, start);
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
      throw new TwigParseError(`Blocktaggen på rad ${lineAt(src, start)} saknar namn`, start);
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
          `"${open}" på rad ${lineAt(src, start)} stängs aldrig (parentesen "${tk.value}" på rad ${lineAt(src, tk.start)} är öppen)`,
          start,
        );
      }
      throw new TwigParseError(`"${open}" på rad ${lineAt(src, start)} stängs aldrig`, start);
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
          throw new TwigParseError(`Oväntad "${c}" på rad ${lineAt(src, i)}`, i);
        }
        const opener = tokens[top]!;
        if (CLOSER_FOR[opener.value] !== c) {
          throw new TwigParseError(
            `"${c}" på rad ${lineAt(src, i)} matchar inte "${opener.value}" på rad ${lineAt(src, opener.start)}`,
            i,
          );
        }
        opener.match = tokens.length;
      }
      tokens.push({ type: 'punctuation', value: c, start: i, end: i + 1 });
      i++;
      continue;
    }
    throw new TwigParseError(`Oväntat tecken "${c}" på rad ${lineAt(src, i)}`, i);
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
  throw new TwigParseError(`Strängen på rad ${lineAt(src, start)} stängs aldrig`, start);
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
  throw new TwigParseError(`Interpolationen på rad ${lineAt(src, from)} stängs aldrig`, from);
}
