// HTML scanning on a masked copy of the source. Twig segments are replaced with \0 (newlines are kept),
// so positions match the original and Twig expressions do not interfere with the scan.

import { TwigParseError, lineAt, type Segment } from './lexer.ts';

export interface Range {
  start: number;
  end: number;
}

export interface HtmlTag {
  start: number;
  end: number;
  name: string;
  nameStart: number;
  nameEnd: number;
  closing: boolean;
  selfClosing: boolean;
  void: boolean;
  /** The tag name is a Twig expression, e.g. `<{{ type }}>`. */
  dynamic: boolean;
  /** Position of `>`, or of `/` in `/>`. */
  closeStart: number;
  /** Quoted attribute values, including the quotes. */
  attrValues: Range[];
}

export interface RawElement {
  open: HtmlTag;
  close: HtmlTag;
}

export interface HtmlScan {
  tags: HtmlTag[];
  raw: RawElement[];
  comments: Range[];
}

export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);
export const RAW_ELEMENTS = new Set(['pre', 'textarea', 'script', 'style']);

export function maskTwig(src: string, segments: Segment[]): string {
  const chars = src.split('');
  for (const seg of segments) {
    if (seg.kind === 'text' && !seg.verbatim) continue;
    for (let i = seg.start; i < seg.end; i++) if (chars[i] !== '\n') chars[i] = '\0';
  }
  return chars.join('');
}

const NAME_CHAR = /[a-zA-Z0-9:_.-]/;

export function scanHtml(src: string, masked: string): HtmlScan {
  const tags: HtmlTag[] = [];
  const raw: RawElement[] = [];
  const comments: Range[] = [];
  const lower = masked.toLowerCase();
  let i = 0;
  while ((i = masked.indexOf('<', i)) >= 0) {
    if (masked.startsWith('<!--', i)) {
      const e = masked.indexOf('-->', i + 4);
      const end = e < 0 ? masked.length : e + 3;
      comments.push({ start: i, end });
      i = end;
      continue;
    }
    const next = masked[i + 1];
    if (next === '!' || next === '?') {
      const e = masked.indexOf('>', i);
      i = e < 0 ? masked.length : e + 1;
      continue;
    }
    const closing = next === '/';
    const nameStart = i + (closing ? 2 : 1);
    let j = nameStart;
    const first = masked[j];
    let dynamic = false;
    if (first !== undefined && /[a-zA-Z]/.test(first)) {
      while (j < masked.length && NAME_CHAR.test(masked[j]!)) j++;
    } else if (first === '\0') {
      dynamic = true;
      while (j < masked.length && masked[j] === '\0') j++;
    } else {
      i++;
      continue;
    }
    const nameEnd = j;
    const attrValues: Range[] = [];
    let lastNonWs = '';
    while (j < masked.length && masked[j] !== '>') {
      const ch = masked[j]!;
      if ((ch === '"' || ch === "'") && lastNonWs === '=') {
        const e = masked.indexOf(ch, j + 1);
        if (e < 0) break;
        attrValues.push({ start: j, end: e + 1 });
        j = e + 1;
        lastNonWs = ch;
        continue;
      }
      if (!/\s/.test(ch)) lastNonWs = ch;
      j++;
    }
    if (j >= masked.length) {
      throw new TwigParseError(
        `HTML tag "${src.slice(i, nameEnd)}" on line ${lineAt(src, i)} is never closed`,
        i,
      );
    }
    const selfClosing = masked[j - 1] === '/';
    const name = dynamic ? src.slice(nameStart, nameEnd) : src.slice(nameStart, nameEnd).toLowerCase();
    const tag: HtmlTag = {
      start: i, end: j + 1, name, nameStart, nameEnd, closing, selfClosing,
      void: !dynamic && VOID_ELEMENTS.has(name), dynamic,
      closeStart: selfClosing ? j - 1 : j, attrValues,
    };
    tags.push(tag);
    i = j + 1;

    if (!closing && !selfClosing && !dynamic && RAW_ELEMENTS.has(name)) {
      const c = lower.indexOf(`</${name}`, i);
      if (c < 0) {
        throw new TwigParseError(`<${name}> on line ${lineAt(src, tag.start)} is never closed`, tag.start);
      }
      const e = masked.indexOf('>', c);
      if (e < 0) {
        throw new TwigParseError(`</${name} on line ${lineAt(src, c)} is never closed`, c);
      }
      const close: HtmlTag = {
        start: c, end: e + 1, name, nameStart: c + 2, nameEnd: c + 2 + name.length, closing: true,
        selfClosing: false, void: false, dynamic: false, closeStart: e, attrValues: [],
      };
      tags.push(close);
      raw.push({ open: tag, close });
      i = e + 1;
    }
  }
  return { tags, raw, comments };
}
