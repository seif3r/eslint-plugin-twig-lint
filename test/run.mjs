#!/usr/bin/env node
// Golden-testsvit för Twig-formattering.
//
// Användning:
//   node test/run.mjs --cmd '<kommando som formatterar {file} på plats>' [--only <namn>] [--diff]
//
// {file} ersätts med sökvägen till en temporär kopia av fixturen. Kommandot ska ändra filen
// på plats. Exitkoden ignoreras för vanliga fixturer. För fixturer med expected-error.txt
// krävs att filen lämnas orörd (exitkoden får vara vad som helst).
//
// Kontrollerar för varje fixture:
//   1. resultat === expected.twig
//   2. idempotens: en andra formattering ger samma resultat
//   3. ogiltig fil (expected-error.txt) lämnas byte för byte orörd

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const cmd = opt('--cmd');
const only = opt('--only');
const showDiff = args.includes('--diff');
if (!cmd || !cmd.includes('{file}')) {
  console.error("Ange --cmd med {file}, t.ex. --cmd 'ludtwig -f -c conf.toml {file}'");
  process.exit(2);
}

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const work = mkdtempSync(join(tmpdir(), 'twig-golden-'));

function format(text, name, pass) {
  const file = join(work, `${name}.${pass}.html.twig`);
  writeFileSync(file, text);
  try {
    execSync(cmd.replaceAll('{file}', JSON.stringify(file)), { stdio: 'pipe', cwd: work });
  } catch { /* exitkod hanteras via innehållet */ }
  return readFileSync(file, 'utf8');
}

function diff(a, b, name) {
  const fa = join(work, `${name}.want`), fb = join(work, `${name}.got`);
  writeFileSync(fa, a); writeFileSync(fb, b);
  try { execSync(`diff -u ${JSON.stringify(fa)} ${JSON.stringify(fb)}`, { stdio: 'pipe' }); return ''; }
  catch (e) { return e.stdout.toString().split('\n').slice(2).join('\n'); }
}

let pass = 0, fail = 0;
for (const name of readdirSync(fixturesDir).sort()) {
  if (only && name !== only) continue;
  const dir = join(fixturesDir, name);
  const input = readFileSync(join(dir, 'input.twig'), 'utf8');
  const problems = [];

  if (existsSync(join(dir, 'expected-error.txt'))) {
    const out = format(input, name, 1);
    if (out !== input) problems.push('ogiltig fil ändrades (ska lämnas orörd)');
    if (showDiff && out !== input) problems.push(diff(input, out, name));
  } else {
    const expected = readFileSync(join(dir, 'expected.twig'), 'utf8');
    const once = format(input, name, 1);
    const twice = format(once, name, 2);
    if (once !== expected) {
      problems.push('skiljer sig från expected.twig');
      if (showDiff) problems.push(diff(expected, once, name));
    }
    if (twice !== once) {
      problems.push('inte idempotent (andra körningen ändrade filen)');
      if (showDiff) problems.push(diff(once, twice, name + '-idem'));
    }
  }

  if (problems.length) { fail++; console.log(`✗ ${name}\n    ${problems.join('\n    ')}`); }
  else { pass++; console.log(`✓ ${name}`); }
}

rmSync(work, { recursive: true, force: true });
console.log(`\n${pass} ok, ${fail} fel`);
process.exit(fail ? 1 : 0);
