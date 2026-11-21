// Checks the examples in docs/rules/*.md:
// - every "Correct" example has no problems with the recommended config,
// - every "Incorrect" example is reported by the rule the page documents,
// - --fix turns the n-th "Incorrect" example into the n-th "Correct" example.
// A `<!-- test-options: {...} -->` comment sets the rule's options for the examples that follow it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import plugin from '../src/index.ts';

const docsDir = join(import.meta.dirname, '..', 'docs', 'rules');
const filePath = join(import.meta.dirname, 'x.twig');

interface Group {
  options: string;
  incorrect: string[];
  correct: string[];
}

function examples(markdown: string): Group[] {
  const groups: Group[] = [{ options: '', incorrect: [], correct: [] }];
  let section: 'incorrect' | 'correct' | null = null;
  const re = /^<!-- test-options: (.*) -->$|^### (❌ Incorrect|✅ Correct)\b.*$|^## |^```twig\n([\s\S]*?)^```$/gm;
  for (const m of markdown.matchAll(re)) {
    if (m[1] !== undefined) groups.push({ options: m[1], incorrect: [], correct: [] });
    else if (m[2]) section = m[2].includes('Incorrect') ? 'incorrect' : 'correct';
    else if (m[0].startsWith('## ')) section = null;
    else if (section && m[3] !== undefined) groups[groups.length - 1]![section].push(m[3]);
  }
  return groups.filter((g) => g.incorrect.length || g.correct.length);
}

function eslint(rule: string, options: string, fix = false): ESLint {
  const config: Record<string, unknown>[] = [plugin.configs.recommended];
  if (options) config.push({ files: ['**/*.twig'], rules: { [rule]: ['error', JSON.parse(options)] } });
  return new ESLint({ cwd: import.meta.dirname, overrideConfigFile: true, overrideConfig: config as ESLint.Options['overrideConfig'], fix });
}

test('every rule has a docs page', () => {
  const pages = readdirSync(docsDir).map((f) => f.replace(/\.md$/, '')).sort();
  assert.deepEqual(pages, Object.keys(plugin.rules).sort());
});

for (const page of readdirSync(docsDir).sort()) {
  const rule = `twig-lint/${page.replace(/\.md$/, '')}`;
  const groups = examples(readFileSync(join(docsDir, page), 'utf8'));

  test(`docs: ${rule}`, async () => {
    assert.ok(groups.some((g) => g.incorrect.length) && groups.some((g) => g.correct.length), 'page has no examples');
    for (const { options, incorrect, correct } of groups) {
      const linter = eslint(rule, options);
      const fixer = eslint(rule, options, true);
      const label = options ? ` (options ${options})` : '';
      for (const code of correct) {
        const [result] = await linter.lintText(code, { filePath });
        assert.deepEqual(result!.messages.map((m) => `${m.line}: ${m.ruleId} ${m.message}`), [], `correct example${label}:\n${code}`);
      }
      for (const [i, code] of incorrect.entries()) {
        const [result] = await linter.lintText(code, { filePath });
        assert.ok(result!.messages.some((m) => m.ruleId === rule), `incorrect example${label} is not reported by ${rule}:\n${code}`);
        const [fixed] = await fixer.lintText(code, { filePath });
        if (correct[i] !== undefined) assert.equal(fixed!.output ?? code, correct[i], `--fix of incorrect example ${i + 1}${label}`);
      }
    }
  });
}
