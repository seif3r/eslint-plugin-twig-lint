// Radbrytning: `attribute-wrap` (öppningstaggar längre än printWidth) och `expression-wrap`
// (Twig-uttryck längre än printWidth, regel A–D i test/README.md).
//
// Reglerna bestämmer bara var raderna bryts. Indenteringsregeln, som körs efteråt, sätter den
// slutliga indenteringen, så att resultatet alltid följer samma indenteringsmodell.

import type { Segment, Token } from '../lexer.ts';
import type { HtmlTag } from '../html.ts';
import type { BlockPair, Doc } from '../parse.ts';
import type { RawFinding, Rule } from '../rule.ts';
import { computeIndents, indentString } from './indentation.ts';

const BLOCK_ELEMENTS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'dd', 'div', 'dl', 'dt', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'header', 'hgroup', 'li', 'main', 'nav', 'ol', 'p', 'section',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'select', 'optgroup', 'option', 'summary',
]);

interface Ctx {
  doc: Doc;
  cols: Array<number | undefined>;
  unit: number;
  useTabs: boolean;
}

/** Bygger ersättningstext av rader med relativa nivåer. Första raden får ingen indentering. */
function render(ctx: Ctx, baseCol: number, lines: Array<[number, string]>): string {
  return lines
    .map(([level, text], i) => (i === 0 ? text : indentString(baseCol + level * ctx.unit, ctx.unit, ctx.useTabs) + text))
    .join('\n');
}

/** Kolumn för raden där `pos` ligger, och om `pos` är första tecknet (utom blanksteg) på raden. */
function lineInfo(ctx: Ctx, pos: number): { col: number; atStart: boolean; li: number } {
  const li = ctx.doc.lineOf(pos);
  const line = ctx.doc.lines[li]!;
  const before = ctx.doc.src.slice(line.start, pos);
  return { col: ctx.cols[li] ?? 0, atStart: before.trim() === '', li };
}

function sameLine(doc: Doc, a: number, b: number): boolean {
  return doc.lineOf(a) === doc.lineOf(b);
}

// ---------------------------------------------------------------------------------------------
// attribute-wrap

interface AttrItem {
  start: number;
  end: number;
  pair?: BlockPair;
}

function attributeItems(doc: Doc, tag: HtmlTag, from: number, to: number): AttrItem[] {
  const { masked } = doc;
  const items: AttrItem[] = [];
  const blockOpener = (pos: number): BlockPair | undefined => {
    const seg = doc.segmentAt(pos);
    if (!seg || seg.kind !== 'block' || seg.start !== pos) return undefined;
    return doc.blocks.find((b) => b.tags[0] === seg);
  };
  let i = from;
  while (i < to) {
    while (i < to && /\s/.test(masked[i]!)) i++;
    if (i >= to) break;
    const start = i;
    const pair = blockOpener(i);
    if (pair) {
      const end = pair.tags[pair.tags.length - 1]!.end;
      items.push({ start, end, pair });
      i = end;
      continue;
    }
    while (i < to && !/\s/.test(masked[i]!)) {
      if (i > start && blockOpener(i)) break;
      const value = tag.attrValues.find((v) => v.start === i);
      if (value) {
        i = value.end;
        continue;
      }
      const seg = doc.segmentAt(i);
      if (seg && seg.kind !== 'text') {
        i = seg.end;
        continue;
      }
      i++;
    }
    items.push({ start, end: i });
  }
  return items;
}

function hasWhitespaceControl(pair: BlockPair): boolean {
  return pair.tags.some((t) => /[-~]/.test(t.open.slice(2)) || /^[-~]/.test(t.close));
}

/** Rader (med nivå relativt taggen) för attributen. */
function attributeLines(doc: Doc, tag: HtmlTag, items: AttrItem[], level: number): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  for (const item of items) {
    const pair = item.pair;
    if (!pair || hasWhitespaceControl(pair)) {
      out.push([level, doc.src.slice(item.start, item.end)]);
      continue;
    }
    pair.tags.forEach((t, k) => {
      out.push([level, doc.src.slice(t.start, t.end)]);
      const next = pair.tags[k + 1];
      if (!next) return;
      out.push(...attributeLines(doc, tag, attributeItems(doc, tag, t.end, next.start), level + 1));
    });
  }
  return out;
}

export const attributeWrap: Rule = {
  rules: [{ id: 'attribute-wrap', description: 'Ett attribut per rad när öppningstaggen är längre än printWidth', defaultLevel: 'error', fixable: true }],
  run({ doc, options }) {
    if (options.attributeWrap !== 'auto') return [];
    const ctx: Ctx = { doc, cols: computeIndents(doc, options.indentSize), unit: options.indentSize, useTabs: options.useTabs };
    const out: RawFinding[] = [];
    for (const tag of doc.htmlTags) {
      if (tag.closing || !sameLine(doc, tag.start, tag.end)) continue;
      const li = doc.lineOf(tag.start);
      const line = doc.lines[li]!;
      if (doc.isFrozenLine(line.start)) continue;
      const first = line.start + /^[ \t]*/.exec(doc.src.slice(line.start, line.end))![0].length;
      const col = ctx.cols[li] ?? 0;
      if (col + (tag.end - first) <= options.printWidth) continue;
      const items = attributeItems(doc, tag, tag.nameEnd, tag.closeStart);
      if (!items.length) continue;

      const lines: Array<[number, string]> = [[0, doc.src.slice(tag.start, tag.nameEnd)]];
      lines.push(...attributeLines(doc, tag, items, 1));
      const closer = doc.src.slice(tag.closeStart, tag.end);
      let end = tag.end;
      const rest = doc.src.slice(tag.end, line.end);
      const element = doc.elements.find(([o]) => o === tag);
      if (rest.trim() && BLOCK_ELEMENTS.has(tag.name) && !tag.selfClosing) {
        const close = element?.[1];
        if (close && sameLine(doc, close.start, tag.end)) {
          const content = doc.src.slice(tag.end, close.start).trim();
          if (content) {
            lines.push([0, closer], [1, content], [0, doc.src.slice(close.start, close.end)]);
            end = close.end;
          } else {
            lines.push([0, closer]);
          }
        } else {
          lines.push([0, closer], [1, rest.trim()]);
          end = line.end;
        }
      } else {
        lines.push([0, closer]);
      }
      out.push({
        ruleId: 'attribute-wrap',
        pos: tag.start,
        message: `Öppningstaggen <${tag.name}> är längre än ${options.printWidth} tecken: ett attribut per rad`,
        edits: [{ start: tag.start, end, text: render(ctx, col, lines) }],
      });
    }
    return out;
  },
};

// ---------------------------------------------------------------------------------------------
// expression-wrap

const isOpenBracket = (t: Token | undefined): boolean => t !== undefined && t.type === 'punctuation' && '([{'.includes(t.value);

/** Index (inom [from, to]) för token på toppnivå, dvs. inte inuti parenteser. */
function topLevel(tokens: Token[], from: number, to: number): number[] {
  const out: number[] = [];
  for (let k = from; k <= to; k++) {
    out.push(k);
    const t = tokens[k]!;
    if (t.match !== undefined) k = t.match - 1;
  }
  return out;
}

/** Delar [from, to] vid kommatecken på toppnivå. Ett avslutande komma ger ingen tom del. */
function splitCommas(tokens: Token[], from: number, to: number): Array<[number, number]> {
  const parts: Array<[number, number]> = [];
  let a = from;
  for (const k of topLevel(tokens, from, to)) {
    const t = tokens[k]!;
    if (t.type === 'punctuation' && t.value === ',') {
      if (k > a) parts.push([a, k - 1]);
      a = k + 1;
    }
  }
  if (a <= to) parts.push([a, to]);
  return parts;
}

function text(src: string, tokens: Token[], a: number, b: number): string {
  return src.slice(tokens[a]!.start, tokens[b]!.end);
}

const LOGIC = new Set(['and', 'or']);
const TERNARY = new Set(['?', ':', '?:', '??']);

function hasTopLevel(tokens: Token[], from: number, to: number, values: Set<string>): boolean {
  return topLevel(tokens, from, to).some((k) => {
    const t = tokens[k]!;
    return (t.type !== 'string') && values.has(t.value);
  });
}

/** Bryter ett anrop `callee(args)` vars stängande parentes är `close`. Null om det inte går. */
function wrapCall(src: string, seg: Segment, close: number): Array<[number, string]> | null {
  const tokens = seg.tokens;
  const closeTok = tokens[close];
  if (!closeTok || closeTok.value !== ')') return null;
  const open = tokens.findIndex((t) => t.match === close);
  if (open < 1 || tokens[open - 1]!.type !== 'name') return null;
  if (close === open + 1) return null;
  const args = splitCommas(tokens, open + 1, close - 1);

  // A: map/array som argument kramas.
  const hug = args.find(([a, b]) => isOpenBracket(tokens[a]) && tokens[a]!.value !== '(' && tokens[a]!.match === b && b > a + 1);
  if (hug) {
    const [a, b] = hug;
    const lines: Array<[number, string]> = [[0, src.slice(seg.start, tokens[a]!.end)]];
    for (const [x, y] of splitCommas(tokens, a + 1, b - 1)) lines.push([1, `${text(src, tokens, x, y)},`]);
    lines.push([0, src.slice(tokens[b]!.start, seg.end)]);
    return lines;
  }
  // B1/D: ett argument per rad, avslutande komma.
  const lines: Array<[number, string]> = [[0, src.slice(seg.start, tokens[open]!.end)]];
  for (const [x, y] of args) lines.push([1, `${text(src, tokens, x, y)},`]);
  lines.push([0, src.slice(tokens[close]!.start, seg.end)]);
  return lines;
}

function wrapSet(src: string, seg: Segment, width: number, col: number): Array<[number, string]> | null {
  const tokens = seg.tokens;
  const eq = tokens[2];
  if (tokens.length < 4 || tokens[1]!.type !== 'name' || !eq || eq.value !== '=') return null;
  const from = 3;
  const to = tokens.length - 1;
  const ternary = hasTopLevel(tokens, from, to, TERNARY);
  const logic = hasTopLevel(tokens, from, to, LOGIC);
  if (!ternary && !logic && tokens[to]!.value === ')') {
    const lines = wrapCall(src, seg, to);
    if (lines && col + lines[0]![1].length <= width) return lines;
  }
  // B2: bryt efter `=`, `%}` på egen rad.
  const lines: Array<[number, string]> = [[0, src.slice(seg.start, eq.end)]];
  const top = topLevel(tokens, from, to);
  const q = top.find((k) => tokens[k]!.value === '?' && tokens[k]!.type === 'punctuation');
  const c = q === undefined ? undefined : top.find((k) => k > q && tokens[k]!.value === ':');
  if (q !== undefined && c !== undefined && q > from && c > q + 1 && c < to) {
    // B3: ternary bryts alltid.
    lines.push([1, text(src, tokens, from, q - 1)]);
    lines.push([2, `? ${text(src, tokens, q + 1, c - 1)}`]);
    lines.push([2, `: ${text(src, tokens, c + 1, to)}`]);
  } else {
    lines.push([1, text(src, tokens, from, to)]);
  }
  lines.push([0, seg.close]);
  return lines;
}

/** C: `{% if a or (b and c) %}` bryts vid operatorn med lägst prioritet på toppnivå. */
function wrapIf(src: string, seg: Segment): Array<[number, string]> | null {
  const tokens = seg.tokens;
  const from = 1;
  const to = tokens.length - 1;
  if (!hasTopLevel(tokens, from, to, LOGIC)) return null;
  const lines: Array<[number, string]> = [];
  conditionLines(src, tokens, from, to, 0, 2, src.slice(seg.start, tokens[from]!.start), lines);
  lines.push([0, seg.close]);
  return lines;
}

function splitLogic(tokens: Token[], from: number, to: number): { ops: number[] } {
  const top = topLevel(tokens, from, to);
  const isOp = (k: number, v: string) => tokens[k]!.type === 'name' && tokens[k]!.value === v;
  let ops = top.filter((k) => isOp(k, 'or'));
  if (!ops.length) ops = top.filter((k) => isOp(k, 'and'));
  return { ops };
}

/**
 * Skriver villkoret [from, to] som rader. Första operanden hamnar efter `prefix` på nivån `level`,
 * operatorerna på egna rader på nivån `opLevel`.
 */
function conditionLines(
  src: string, tokens: Token[], from: number, to: number, level: number, opLevel: number, prefix: string,
  out: Array<[number, string]>,
): void {
  const { ops } = splitLogic(tokens, from, to);
  const bounds = [from - 1, ...ops, to + 1];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const a = bounds[k]! + 1;
    const b = bounds[k + 1]! - 1;
    const lead = k === 0 ? prefix : `${tokens[bounds[k]!]!.value} `;
    const lvl = k === 0 ? level : opLevel;
    operandLines(src, tokens, a, b, lvl, lead, out);
  }
}

function operandLines(src: string, tokens: Token[], a: number, b: number, level: number, lead: string, out: Array<[number, string]>): void {
  const t = tokens[a]!;
  if (t.value === '(' && t.type === 'punctuation' && t.match === b && hasTopLevel(tokens, a + 1, b - 1, LOGIC)) {
    conditionLines(src, tokens, a + 1, b - 1, level, level + 1, `${lead}(`, out);
    out.push([level, ')']);
    return;
  }
  out.push([level, lead + text(src, tokens, a, b)]);
}

function wrapOutput(src: string, seg: Segment): Array<[number, string]> | null {
  const tokens = seg.tokens;
  const last = tokens.length - 1;
  if (last < 2 || tokens[last]!.value !== ')') return null;
  const open = tokens.findIndex((t) => t.match === last);
  // Bara ett rent anrop: callee-kedja av namn och punkter före parentesen.
  for (let k = 0; k < open; k++) {
    const t = tokens[k]!;
    if (!(t.type === 'name' || (t.type === 'punctuation' && t.value === '.'))) return null;
  }
  return wrapCall(src, seg, last);
}

export const expressionWrap: Rule = {
  rules: [{ id: 'expression-wrap', description: 'Bryt Twig-uttryck som är längre än printWidth', defaultLevel: 'error', fixable: true }],
  run({ doc, options }) {
    const ctx: Ctx = { doc, cols: computeIndents(doc, options.indentSize), unit: options.indentSize, useTabs: options.useTabs };
    const out: RawFinding[] = [];
    for (const seg of doc.segments) {
      if (seg.kind !== 'output' && seg.kind !== 'block') continue;
      if (!sameLine(doc, seg.start, seg.end)) continue;
      const info = lineInfo(ctx, seg.start);
      const line = doc.lines[info.li]!;
      if (!info.atStart || doc.src.slice(seg.end, line.end).trim() !== '' || doc.isFrozenLine(line.start)) continue;
      if (info.col + (seg.end - seg.start) <= options.printWidth) continue;
      let lines: Array<[number, string]> | null = null;
      if (seg.kind === 'block' && seg.tag === 'set') lines = wrapSet(doc.src, seg, options.printWidth, info.col);
      else if (seg.kind === 'block' && (seg.tag === 'if' || seg.tag === 'elseif')) lines = wrapIf(doc.src, seg);
      else if (seg.kind === 'output') lines = wrapOutput(doc.src, seg);
      if (!lines || lines.length < 2) continue;
      out.push({
        ruleId: 'expression-wrap',
        pos: seg.start,
        message: `Uttrycket är längre än ${options.printWidth} tecken`,
        edits: [{ start: seg.start, end: seg.end, text: render(ctx, info.col, lines) }],
      });
    }
    return out;
  },
};
