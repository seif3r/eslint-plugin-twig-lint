// Builds a document model of a template: segments, HTML tags, block pairs and frames.
// A frame is a region that indents its content: a Twig block, an HTML element, a bracket,
// a Twig delimiter that spans several lines, or an opening tag that is broken over several lines.

import { lex, lineAt, TwigParseError, type Segment, type Token } from './lexer.ts';
import { maskTwig, scanHtml, type HtmlTag, type Range } from './html.ts';

export interface Line {
  start: number;
  /** Slut, exklusive radbrytningen. */
  end: number;
}

export type FrameKind = 'delim' | 'bracket' | 'block' | 'element' | 'tag' | 'virtual';

export interface Frame {
  kind: FrameKind;
  /** The content starts after this position. */
  open: number;
  /** Position of whatever closes the frame. A line that starts here gets the anchor line's indentation. */
  close: number;
  /** Position on the line that the frame's indentation is counted from. */
  anchor: number;
  seg?: Segment;
}

export interface BlockPair {
  name: string;
  /** Opening tag, any middle tags (else/elseif/plural) and end tag. */
  tags: Segment[];
  parent: BlockPair | null;
}

export interface Doc {
  src: string;
  segments: Segment[];
  lines: Line[];
  masked: string;
  htmlTags: HtmlTag[];
  /** Matched HTML elements (opening, closing). */
  elements: Array<[HtmlTag, HtmlTag]>;
  blocks: BlockPair[];
  frames: Frame[];
  /** Regions where line indentation is never touched. */
  frozen: Range[];
  /** Regions where whitespace is significant (pre, strings, attribute values …). */
  preserved: Range[];
  lineOf(pos: number): number;
  segmentAt(pos: number): Segment | undefined;
  tokenAt(pos: number): Token | undefined;
  isFrozenLine(lineStart: number): boolean;
  isPreserved(pos: number): boolean;
}

const PAIRED = new Set([
  'if', 'for', 'block', 'macro', 'embed', 'apply', 'autoescape', 'filter', 'spaceless', 'with', 'sandbox',
  'trans', 'cache', 'guard', 'set',
]);
const MIDDLE: Record<string, string[]> = { else: ['if', 'for'], elseif: ['if'], plural: ['trans'] };

export function parse(src: string): Doc {
  const segments = lex(src);
  const lines = splitLines(src);
  const lineStarts = lines.map((l) => l.start);
  const lineOf = (pos: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid]! <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const blocks = pairBlocks(src, segments);
  const masked = maskTwig(src, segments);
  const html = scanHtml(src, masked);
  const elements = pairElements(html.tags, blocks);
  const frames: Frame[] = [];
  const frozen: Range[] = [];
  const preserved: Range[] = [];

  for (const seg of segments) {
    if (seg.kind === 'comment') {
      frozen.push({ start: seg.start, end: seg.end });
      continue;
    }
    if (seg.kind === 'text') {
      if (seg.verbatim) {
        frozen.push({ start: seg.start, end: seg.end });
        preserved.push({ start: seg.start, end: seg.end });
      }
      continue;
    }
    frames.push({ kind: 'delim', open: seg.start, close: seg.closeStart, anchor: seg.start, seg });
    seg.tokens.forEach((tk) => {
      if (tk.match !== undefined) {
        frames.push({ kind: 'bracket', open: tk.start, close: seg.tokens[tk.match]!.start, anchor: tk.start, seg });
      }
      if (tk.type === 'string' && src.slice(tk.start, tk.end).includes('\n')) {
        frozen.push({ start: tk.start, end: tk.end });
        preserved.push({ start: tk.start, end: tk.end });
      }
    });
  }

  for (const b of blocks) {
    for (let k = 0; k + 1 < b.tags.length; k++) {
      const t = b.tags[k]!;
      const next = b.tags[k + 1]!;
      frames.push({ kind: 'block', open: t.end, close: next.start, anchor: t.start, seg: t });
    }
    if (b.name === 'trans') {
      const open = b.tags[0]!;
      const end = b.tags[b.tags.length - 1]!;
      frozen.push({ start: open.end, end: end.start });
      preserved.push({ start: open.end, end: end.start });
    }
  }

  for (const [o, c] of elements) frames.push({ kind: 'element', open: o.end, close: c.start, anchor: o.start });
  for (const t of html.tags) {
    if (!t.closing) frames.push({ kind: 'tag', open: t.start, close: t.closeStart, anchor: t.start });
    for (const v of t.attrValues) {
      frozen.push(v);
      preserved.push(v);
    }
  }
  for (const r of html.raw) {
    frozen.push({ start: r.open.end, end: r.close.start });
    preserved.push({ start: r.open.end, end: r.close.start });
  }
  for (const c of html.comments) frozen.push(c);

  frames.push(...conditionalPairs(src, blocks, html.tags));
  frames.sort((a, b) => a.open - b.open);

  const twigSegs = segments.filter((s) => s.kind !== 'text');
  const segmentAt = (pos: number): Segment | undefined => {
    let lo = 0;
    let hi = twigSegs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = twigSegs[mid]!;
      if (pos < s.start) hi = mid - 1;
      else if (pos >= s.end) lo = mid + 1;
      else return s;
    }
    return undefined;
  };

  return {
    src, segments, lines, masked, htmlTags: html.tags, elements, blocks, frames, frozen, preserved,
    lineOf,
    segmentAt,
    tokenAt(pos) {
      return segmentAt(pos)?.tokens.find((t) => t.start === pos);
    },
    isFrozenLine(lineStart) {
      return frozen.some((r) => r.start < lineStart && lineStart <= r.end);
    },
    isPreserved(pos) {
      return preserved.some((r) => r.start <= pos && pos < r.end);
    },
  };
}

export function splitLines(src: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (;;) {
    const nl = src.indexOf('\n', start);
    if (nl < 0) {
      lines.push({ start, end: src.length });
      return lines;
    }
    lines.push({ start, end: nl });
    start = nl + 1;
  }
}

function pairBlocks(src: string, segments: Segment[]): BlockPair[] {
  const blockSegs = segments.filter((s) => s.kind === 'block');
  const tagNames = new Set(blockSegs.map((s) => s.tag));
  const isOpener = (s: Segment): boolean => {
    if (s.tag.startsWith('end') || MIDDLE[s.tag]) return false;
    if (s.tag === 'set') return !s.tokens.some((t) => t.type === 'operator' && t.value === '=');
    if (s.tag === 'block') return s.tokens.length === 2;
    return PAIRED.has(s.tag) || tagNames.has(`end${s.tag}`);
  };

  const pairs: BlockPair[] = [];
  const stack: BlockPair[] = [];
  for (const s of blockSegs) {
    const top = stack[stack.length - 1];
    if (s.tag.startsWith('end') && s.tag.length > 3) {
      const name = s.tag.slice(3);
      if (!top) {
        throw new TwigParseError(`{% ${s.tag} %} on line ${lineAt(src, s.start)} has no matching {% ${name} %}`, s.start);
      }
      if (top.name !== name) {
        throw new TwigParseError(
          `{% ${s.tag} %} on line ${lineAt(src, s.start)} does not match {% ${top.name} %} on line ${lineAt(src, top.tags[0]!.start)}`,
          s.start,
        );
      }
      top.tags.push(s);
      stack.pop();
      continue;
    }
    const parents = MIDDLE[s.tag];
    if (parents) {
      if (!top || !parents.includes(top.name)) {
        throw new TwigParseError(`{% ${s.tag} %} on line ${lineAt(src, s.start)} is outside ${parents.map((p) => `{% ${p} %}`).join('/')}`, s.start);
      }
      top.tags.push(s);
      continue;
    }
    if (isOpener(s)) {
      const pair: BlockPair = { name: s.tag, tags: [s], parent: top ?? null };
      pairs.push(pair);
      stack.push(pair);
    }
  }
  const open = stack[0];
  if (open) {
    const last = stack[stack.length - 1]!;
    throw new TwigParseError(
      `{% ${last.name} %} on line ${lineAt(src, last.tags[0]!.start)} has no {% end${last.name} %}`,
      last.tags[0]!.start,
    );
  }
  return pairs;
}

/** Pairs HTML tags within the same Twig branch. Tags opened in one branch and closed in another are not paired. */
function pairElements(tags: HtmlTag[], blocks: BlockPair[]): Array<[HtmlTag, HtmlTag]> {
  type Ev = { pos: number; kind: 'push' | 'pop' | 'open' | 'close'; tag?: HtmlTag };
  const events: Ev[] = [];
  for (const b of blocks) {
    events.push({ pos: b.tags[0]!.end, kind: 'push' });
    for (const mid of b.tags.slice(1, -1)) {
      events.push({ pos: mid.start, kind: 'pop' }, { pos: mid.end, kind: 'push' });
    }
    events.push({ pos: b.tags[b.tags.length - 1]!.start, kind: 'pop' });
  }
  for (const t of tags) {
    if (t.closing) events.push({ pos: t.start, kind: 'close', tag: t });
    else if (!t.void && !t.selfClosing) events.push({ pos: t.end, kind: 'open', tag: t });
  }
  events.sort((a, b) => a.pos - b.pos);

  const result: Array<[HtmlTag, HtmlTag]> = [];
  const stacks: HtmlTag[][] = [[]];
  for (const ev of events) {
    if (ev.kind === 'push') stacks.push([]);
    else if (ev.kind === 'pop') stacks.pop();
    else {
      const cur = stacks[stacks.length - 1]!;
      if (ev.kind === 'open') cur.push(ev.tag!);
      else {
        for (let k = cur.length - 1; k >= 0; k--) {
          if (cur[k]!.name === ev.tag!.name) {
            result.push([cur[k]!, ev.tag!]);
            cur.length = k;
            break;
          }
        }
      }
    }
  }
  return result;
}

/**
 * Two sibling {% if %} blocks where the first contains only an opening tag and the second only the
 * matching closing tag: everything between the blocks is indented one step.
 */
function conditionalPairs(src: string, blocks: BlockPair[], tags: HtmlTag[]): Frame[] {
  const frames: Frame[] = [];
  const onlyTag = (b: BlockPair): HtmlTag | undefined => {
    if (b.name !== 'if' || b.tags.length !== 2) return undefined;
    const start = b.tags[0]!.end;
    const end = b.tags[1]!.start;
    const inside = tags.filter((t) => t.start >= start && t.end <= end);
    if (inside.length !== 1) return undefined;
    const t = inside[0]!;
    return src.slice(start, end).trim() === src.slice(t.start, t.end) ? t : undefined;
  };
  for (const a of blocks) {
    const opener = onlyTag(a);
    if (!opener || opener.closing || opener.void || opener.selfClosing) continue;
    const aEnd = a.tags[1]!;
    const b = blocks.find((x) => {
      if (x.parent !== a.parent || x.tags[0]!.start < aEnd.end) return false;
      const t = onlyTag(x);
      return t !== undefined && t.closing && t.name === opener.name;
    });
    if (b) frames.push({ kind: 'virtual', open: aEnd.end, close: b.tags[0]!.start, anchor: a.tags[0]!.start });
  }
  return frames;
}
