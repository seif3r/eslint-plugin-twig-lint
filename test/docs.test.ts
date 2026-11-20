// Checks the examples in docs/rules/*.md:
// - every "Correct" example has no problems with the recommended config,
// - every "Incorrect" example is reported by the rule the page documents,
// - --fix turns the n-th "Incorrect" example into the n-th "Correct" example.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import plugin from '../src/index.ts';

const docsDir = join(import.meta.dirname, '..', 'docs', 'rules');
const filePath = join(import.meta.dirname, 'x.twig');

function examples(markdown: string): { incorrect: string[]; correct: string[] } {
  const out = { incorrect: [] as string[], correct: [] as string[] };
  let section: 'incorrect' | 'correct' | null = null;
  const re = /^### (❌ Incorrect|✅ Correct)$|^## |^```twig\n([\s\S]*?)^```$/gm;
  for (const m of markdown.matchAll(re)) {
    if (m[1]) section = m[1].includes('Incorrect') ? 'incorrect' : 'correct';
    else if (m[0].startsWith('## ')) section = null;
    else if (section && m[2] !== undefined) out[section].push(m[2]);
  }
  return out;
}

const eslint = new ESLint({ cwd: import.meta.dirname, overrideConfigFile: true, overrideConfig: [plugin.configs.recommended] as ESLint.Options['overrideConfig'] });
const fixer = new ESLint({ cwd: import.meta.dirname, overrideConfigFile: true, overrideConfig: [plugin.configs.recommended] as ESLint.Options['overrideConfig'], fix: true });

test('every rule has a docs page', () => {
  const pages = readdirSync(docsDir).map((f) => f.replace(/\.md$/, '')).sort();
  assert.deepEqual(pages, Object.keys(plugin.rules).sort());
});

for (const page of readdirSync(docsDir).sort()) {
  const rule = `twig-lint/${page.replace(/\.md$/, '')}`;
  const { incorrect, correct } = examples(readFileSync(join(docsDir, page), 'utf8'));

  test(`docs: ${rule}`, async () => {
    assert.ok(incorrect.length > 0 && correct.length > 0, 'page has no examples');
    for (const code of correct) {
      const [result] = await eslint.lintText(code, { filePath });
      assert.deepEqual(result!.messages.map((m) => `${m.line}: ${m.ruleId} ${m.message}`), [], `correct example:\n${code}`);
    }
    for (const [i, code] of incorrect.entries()) {
      const [result] = await eslint.lintText(code, { filePath });
      assert.ok(result!.messages.some((m) => m.ruleId === rule), `incorrect example is not reported by ${rule}:\n${code}`);
      const [fixed] = await fixer.lintText(code, { filePath });
      if (correct[i] !== undefined) assert.equal(fixed!.output ?? code, correct[i], `--fix of incorrect example ${i + 1}`);
    }
  });
}
