#!/usr/bin/env node
// twig-code-formatter lint [--fix] [--quiet] <sökvägar…>
// twig-code-formatter format [--write] <sökvägar…>   (utan --write skrivs resultatet till stdout)
//
// Exitkod: 0 = inga fel, 1 = fel kvar (eller parse-fel), 2 = felaktig användning.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { loadConfig, type PartialOptions } from './config.ts';
import { format, lint } from './engine.ts';
import type { Finding } from './rule.ts';

const USAGE = `Användning:
  twig-code-formatter lint [--fix] [--quiet] <filer eller kataloger…>
  twig-code-formatter format [--write] <filer…>`;

function collect(paths: string[]): string[] {
  const out: string[] = [];
  const walk = (p: string): void => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const name of readdirSync(p).sort()) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        walk(join(p, name));
      }
    } else if (p.endsWith('.twig')) {
      out.push(p);
    }
  };
  for (const p of paths) {
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else out.push(p);
  }
  return out;
}

const configCache = new Map<string, PartialOptions>();
function configFor(file: string): PartialOptions {
  const dir = dirname(resolve(file));
  let c = configCache.get(dir);
  if (!c) {
    c = loadConfig(dir).config;
    configCache.set(dir, c);
  }
  return c;
}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (code: number, s: string): string => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);

function report(results: Array<{ file: string; findings: Finding[] }>): void {
  let errors = 0;
  let warnings = 0;
  let fixable = 0;
  for (const { file, findings } of results) {
    if (!findings.length) continue;
    console.log(`\n${color(4, relative(process.cwd(), file) || file)}`);
    const pos = findings.map((f) => `${f.line}:${f.column}`);
    const w = Math.max(...pos.map((p) => p.length));
    findings.forEach((f, i) => {
      if (f.severity === 'error') errors++;
      else warnings++;
      if (f.edits?.length) fixable++;
      const sev = f.severity === 'error' ? color(31, 'error') : color(33, 'warning');
      console.log(`  ${pos[i]!.padEnd(w)}  ${sev.padEnd(useColor ? 16 : 7)}  ${f.message}  ${color(2, f.ruleId)}`);
    });
  }
  const total = errors + warnings;
  if (total) {
    const sym = errors ? color(31, '✖') : color(33, '✖');
    console.log(`\n${sym} ${total} ${total === 1 ? 'problem' : 'problem'} (${errors} fel, ${warnings} varningar)`);
    if (fixable) console.log(`  ${fixable} kan fixas med --fix`);
  }
}

function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  const flags = new Set(rest.filter((a) => a.startsWith('--')));
  const paths = rest.filter((a) => !a.startsWith('--'));
  if ((cmd !== 'lint' && cmd !== 'format') || paths.length === 0) {
    console.error(USAGE);
    return 2;
  }
  for (const f of flags) {
    if (!['--fix', '--quiet', '--write'].includes(f)) {
      console.error(`Okänd flagga ${f}\n${USAGE}`);
      return 2;
    }
  }
  let files: string[];
  try {
    files = collect(paths);
  } catch (e) {
    console.error((e as Error).message);
    return 2;
  }

  if (cmd === 'format') {
    let failed = false;
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const res = format(text, configFor(file));
      if (res.parseError) {
        console.error(`${file}:${res.parseError.line}:${res.parseError.column}: ${res.parseError.message}`);
        failed = true;
        continue;
      }
      if (flags.has('--write')) {
        if (res.changed) writeFileSync(file, res.output);
      } else {
        process.stdout.write(res.output);
      }
    }
    return failed ? 1 : 0;
  }

  const quiet = flags.has('--quiet');
  const results: Array<{ file: string; findings: Finding[] }> = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const options = configFor(file);
    let findings: Finding[];
    if (flags.has('--fix')) {
      const res = format(text, options);
      if (res.changed && !res.parseError) writeFileSync(file, res.output);
      findings = res.findings;
    } else {
      findings = lint(text, options).findings;
    }
    if (quiet) findings = findings.filter((f) => f.severity === 'error');
    results.push({ file, findings });
  }
  report(results);
  return results.some((r) => r.findings.some((f) => f.severity === 'error')) ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
