#!/usr/bin/env node
// Golden test suite for Twig formatting.
//
// Usage:
//   node test/run.mjs --cmd '<command that formats {file} in place>' [--only <name>] [--diff]
//
// {file} is replaced with the path to a temporary copy of the fixture. The command must change the
// file in place. The exit code is ignored for normal fixtures. For fixtures with expected-error.txt
// the file must be left untouched (the exit code can be anything).
//
// Checks for each fixture:
//   1. result === expected.twig
//   2. idempotence: formatting a second time gives the same result
//   3. an invalid file (expected-error.txt) is left byte for byte untouched

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
  console.error("Pass --cmd with {file}, e.g. --cmd 'eslint --fix {file}'");
  process.exit(2);
}

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const work = mkdtempSync(join(tmpdir(), 'twig-golden-'));

function format(text, name, pass) {
  const file = join(work, `${name}.${pass}.html.twig`);
  writeFileSync(file, text);
  try {
    execSync(cmd.replaceAll('{file}', JSON.stringify(file)), { stdio: 'pipe', cwd: work });
  } catch { /* the exit code is judged by the file content */ }
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
    if (out !== input) problems.push('invalid file was changed (must be left untouched)');
    if (showDiff && out !== input) problems.push(diff(input, out, name));
  } else {
    const expected = readFileSync(join(dir, 'expected.twig'), 'utf8');
    const once = format(input, name, 1);
    const twice = format(once, name, 2);
    if (once !== expected) {
      problems.push('differs from expected.twig');
      if (showDiff) problems.push(diff(expected, once, name));
    }
    if (twice !== once) {
      problems.push('not idempotent (the second run changed the file)');
      if (showDiff) problems.push(diff(once, twice, name + '-idem'));
    }
  }

  if (problems.length) { fail++; console.log(`✗ ${name}\n    ${problems.join('\n    ')}`); }
  else { pass++; console.log(`✓ ${name}`); }
}

rmSync(work, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
