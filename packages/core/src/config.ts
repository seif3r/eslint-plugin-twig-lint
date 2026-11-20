// Inställningar. Lager (senare vinner): inbyggda standardvärden → projektfil → anroparens inställningar
// (t.ex. VS Code). `rules` slås ihop per regel.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type Level = 'off' | 'warn' | 'error';

export type RuleSetting = Level | ({ level?: Level; enabled?: boolean } & Record<string, unknown>);

export interface Options {
  indentSize: number;
  useTabs: boolean;
  attributeSpacing: 'space' | 'tight' | 'preserve';
  multilineExpressions: 'preserve' | 'collapse';
  nestedIndent: 'relative' | 'ludtwig';
  endblockName: 'preserve' | 'add' | 'remove';
  twigTagSpacing: boolean;
  printWidth: number;
  attributeWrap: 'auto' | 'preserve';
  presets: string[];
  rules: Record<string, RuleSetting>;
}

export type PartialOptions = Partial<Options>;

export const CONFIG_FILE = '.twig-code-formatter.json';

export const DEFAULT_OPTIONS: Options = {
  indentSize: 2,
  useTabs: false,
  attributeSpacing: 'space',
  multilineExpressions: 'preserve',
  nestedIndent: 'relative',
  endblockName: 'preserve',
  twigTagSpacing: true,
  printWidth: 80,
  attributeWrap: 'auto',
  presets: [],
  rules: {},
};

export function resolveOptions(...layers: Array<PartialOptions | undefined>): Options {
  const out: Options = { ...DEFAULT_OPTIONS, rules: {} };
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined || value === null) continue;
      if (key === 'rules') {
        for (const [id, setting] of Object.entries(value as Record<string, RuleSetting>)) {
          out.rules[id] = mergeSetting(out.rules[id], setting);
        }
      } else if (key in DEFAULT_OPTIONS) {
        (out as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }
  return out;
}

function mergeSetting(prev: RuleSetting | undefined, next: RuleSetting): RuleSetting {
  if (typeof next === 'string' || prev === undefined) return next;
  const base = typeof prev === 'string' ? { level: prev } : prev;
  return { ...base, ...next };
}

/** Normaliserar en regelinställning till nivå och alternativ. */
export function ruleSetting(options: Options, id: string, defaultLevel: Level): { level: Level; options: Record<string, unknown> } {
  const s = options.rules[id];
  if (s === undefined) return { level: defaultLevel, options: {} };
  if (typeof s === 'string') return { level: s, options: {} };
  const { level, enabled, ...rest } = s;
  let lvl: Level = level ?? defaultLevel;
  if (enabled === false) lvl = 'off';
  else if (enabled === true && lvl === 'off') lvl = 'error';
  return { level: lvl, options: rest };
}

export interface LoadedConfig {
  config: PartialOptions;
  /** Sökväg till projektfilen, om den hittades. */
  path?: string;
}

/** Letar efter `.twig-code-formatter.json` från `dir` och uppåt. */
export function loadConfig(dir: string): LoadedConfig {
  let cur = dir;
  for (;;) {
    const file = join(cur, CONFIG_FILE);
    if (existsSync(file)) {
      const text = readFileSync(file, 'utf8');
      try {
        return { config: JSON.parse(stripJsonComments(text)) as PartialOptions, path: file };
      } catch (e) {
        throw new Error(`Kunde inte läsa ${file}: ${(e as Error).message}`);
      }
    }
    const parent = dirname(cur);
    if (parent === cur) return { config: {} };
    cur = parent;
  }
}

function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      out += ch;
      if (ch === '\\') out += text[++i] ?? '';
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2);
      i = e < 0 ? text.length : e + 1;
    } else {
      out += ch;
    }
  }
  return out;
}
