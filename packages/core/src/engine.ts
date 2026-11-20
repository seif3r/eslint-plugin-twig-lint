// Regelmotor. `lint` kör varje regel mot originaltexten. `format` kör de fixbara reglerna i följd
// (texten tolkas om efter varje regel) tills inget ändras. Om texten inte går att tolka returneras
// originaltexten orörd tillsammans med ett `parse-error`.

import { resolveOptions, ruleSetting, type Level, type Options, type PartialOptions } from './config.ts';
import { lineAt, TwigParseError } from './lexer.ts';
import { parse, type Doc } from './parse.ts';
import { applyEdits, type Finding, type RawFinding, type Rule, type RuleContext, type RuleMeta } from './rule.ts';
import { indentation } from './rules/indentation.ts';
import { attributeWrap, expressionWrap } from './rules/wrap.ts';
import {
  attributeSpacing, blankLineAfterBlock, delimiterSpacing, emptyLines, finalNewline, trailingWhitespace,
} from './rules/whitespace.ts';

/** I den ordning de körs vid fix. */
export const RULES: Rule[] = [
  delimiterSpacing,
  attributeSpacing,
  attributeWrap,
  expressionWrap,
  indentation,
  trailingWhitespace,
  emptyLines,
  blankLineAfterBlock,
  finalNewline,
];

export const RULE_META: RuleMeta[] = [
  { id: 'parse-error', description: 'Filen går inte att tolka', defaultLevel: 'error', fixable: false },
  { id: 'unused-disable', description: 'Avstängningskommentar som inte stänger av något', defaultLevel: 'warn', fixable: false },
  ...RULES.flatMap((r) => r.rules),
];

export interface LintResult {
  findings: Finding[];
  /** Satt om filen inte gick att tolka. */
  parseError?: Finding;
}

export interface FormatResult extends LintResult {
  output: string;
  changed: boolean;
}

function levelOf(options: Options, id: string): Level {
  const meta = RULE_META.find((m) => m.id === id);
  return ruleSetting(options, id, meta?.defaultLevel ?? 'error').level;
}

function contextFor(doc: Doc, options: Options): RuleContext {
  return { doc, options, ruleOptions: (id) => ruleSetting(options, id, 'error').options };
}

function parseErrorFinding(src: string, e: TwigParseError): Finding {
  const line = lineAt(src, e.offset);
  const lineStart = src.lastIndexOf('\n', e.offset - 1) + 1;
  return { ruleId: 'parse-error', severity: 'error', line, column: e.offset - lineStart + 1, message: e.message };
}

function tryParse(src: string): Doc | TwigParseError {
  try {
    return parse(src);
  } catch (e) {
    if (e instanceof TwigParseError) return e;
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------
// Avstängningskommentarer: {# twig-lint-disable[-next-line|-line] [regler] [-- motivering] #}

interface Directive {
  kind: 'disable' | 'enable' | 'disable-line' | 'disable-next-line';
  rules: string[] | null; // null = alla
  line: number; // 0-baserad, raden där kommentaren slutar
  pos: number;
  used: boolean;
}

function directives(doc: Doc): Directive[] {
  const out: Directive[] = [];
  for (const seg of doc.segments) {
    if (seg.kind !== 'comment') continue;
    const body = doc.src.slice(seg.innerStart, seg.closeStart).trim();
    const m = /^twig-lint-(disable-next-line|disable-line|disable|enable)\b([\s\S]*)$/.exec(body);
    if (!m) continue;
    const list = m[2]!.split(/\s--\s|^--\s/)[0]!.trim();
    out.push({
      kind: m[1] as Directive['kind'],
      rules: list ? list.split(/[\s,]+/).filter(Boolean) : null,
      line: doc.lineOf(seg.end - 1),
      pos: seg.start,
      used: false,
    });
  }
  return out;
}

function isDisabled(dirs: Directive[], ruleId: string, line: number, pos: number): boolean {
  if (ruleId === 'parse-error') return false;
  const covers = (d: Directive) => d.rules === null || d.rules.includes(ruleId);
  for (const d of dirs) {
    if ((d.kind === 'disable-next-line' && d.line + 1 === line) || (d.kind === 'disable-line' && d.line === line)) {
      if (covers(d)) {
        d.used = true;
        return true;
      }
    }
  }
  let active: Directive | null = null;
  for (const d of dirs) {
    if (d.pos > pos) break;
    if (!covers(d)) continue;
    if (d.kind === 'disable') active = d;
    else if (d.kind === 'enable') active = null;
  }
  if (active) {
    active.used = true;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------

function runRule(rule: Rule, doc: Doc, options: Options, dirs: Directive[]): Finding[] {
  if (!rule.rules.some((m) => levelOf(options, m.id) !== 'off')) return [];
  const out: Finding[] = [];
  for (const raw of rule.run(contextFor(doc, options))) {
    const level = levelOf(options, raw.ruleId);
    if (level === 'off') continue;
    const li = doc.lineOf(raw.pos);
    if (isDisabled(dirs, raw.ruleId, li, raw.pos)) continue;
    out.push(toFinding(doc, raw, level));
  }
  return out;
}

function toFinding(doc: Doc, raw: RawFinding, level: Exclude<Level, 'off'>): Finding {
  const li = doc.lineOf(raw.pos);
  const { pos: _pos, ...rest } = raw;
  return { ...rest, severity: level, line: li + 1, column: raw.pos - doc.lines[li]!.start + 1 };
}

export function lint(text: string, options?: PartialOptions | Options): LintResult {
  const opts = resolveOptions(options);
  const src = text.replace(/\r\n/g, '\n');
  const doc = tryParse(src);
  if (doc instanceof TwigParseError) {
    const err = parseErrorFinding(src, doc);
    return { findings: [err], parseError: err };
  }
  const dirs = directives(doc);
  const findings = RULES.flatMap((r) => runRule(r, doc, opts, dirs));
  const unusedLevel = levelOf(opts, 'unused-disable');
  if (unusedLevel !== 'off') {
    for (const d of dirs) {
      if (d.used || d.kind === 'enable') continue;
      findings.push(toFinding(doc, {
        ruleId: 'unused-disable', pos: d.pos,
        message: `Avstängningskommentaren stänger inte av något${d.rules ? ` (${d.rules.join(', ')})` : ''}`,
      }, unusedLevel));
    }
  }
  findings.sort((a, b) => a.line - b.line || a.column - b.column);
  return { findings };
}

export function format(text: string, options?: PartialOptions | Options): FormatResult {
  const opts = resolveOptions(options);
  const crlf = text.includes('\r\n');
  let src = text.replace(/\r\n/g, '\n');
  const first = tryParse(src);
  if (first instanceof TwigParseError) {
    const err = parseErrorFinding(src, first);
    return { output: text, changed: false, findings: [err], parseError: err };
  }
  for (let pass = 0; pass < 10; pass++) {
    const before = src;
    for (const rule of RULES) {
      if (!rule.rules.some((m) => m.fixable)) continue;
      const doc = tryParse(src);
      if (doc instanceof TwigParseError) {
        // En regel gav ogiltig text. Det är en bugg i formattern: lämna filen orörd.
        const err = parseErrorFinding(src, doc);
        err.message = `Internt fel i formattern (efter regeln ${rule.rules[0]!.id}): ${err.message}`;
        return { output: text, changed: false, findings: [err], parseError: err };
      }
      const findings = runRule(rule, doc, opts, directives(doc));
      const edits = findings.flatMap((f) => f.edits ?? []);
      if (edits.length) src = applyEdits(src, edits);
    }
    if (src === before) break;
  }
  const last = tryParse(src);
  if (last instanceof TwigParseError) {
    const err = parseErrorFinding(src, last);
    err.message = `Internt fel i formattern: ${err.message}`;
    return { output: text, changed: false, findings: [err], parseError: err };
  }
  const output = crlf ? src.replace(/\n/g, '\r\n') : src;
  const remaining = lint(src, opts);
  return { output, changed: output !== text, findings: remaining.findings };
}
