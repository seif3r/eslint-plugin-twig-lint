import type { Level, Options } from './config.ts';
import type { Doc } from './parse.ts';

export interface Edit {
  start: number;
  end: number;
  text: string;
}

export type Severity = 'warn' | 'error';

export interface Finding {
  ruleId: string;
  severity: Severity;
  /** 1-baserad. */
  line: number;
  /** 1-baserad. */
  column: number;
  message: string;
  edits?: Edit[];
}

export type RawFinding = Omit<Finding, 'severity' | 'line' | 'column'> & { pos: number };

export interface RuleContext {
  doc: Doc;
  options: Options;
  /** Alternativ per regel-ID från `rules.<id>`. */
  ruleOptions(id: string): Record<string, unknown>;
}

export interface RuleMeta {
  id: string;
  description: string;
  defaultLevel: Level;
  fixable: boolean;
}

export interface Rule {
  /** Regel-ID:n som den här modulen rapporterar (oftast ett). */
  rules: RuleMeta[];
  /** Körs bara om minst ett av ID:na är påslaget. */
  run(ctx: RuleContext): RawFinding[];
}

export function applyEdits(text: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
  let out = '';
  let pos = 0;
  for (const e of sorted) {
    if (e.start < pos) continue; // överlappar en tidigare ändring
    out += text.slice(pos, e.start) + e.text;
    pos = e.end;
  }
  return out + text.slice(pos);
}
