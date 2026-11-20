// Tests via ESLint's API. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import plugin from '../src/index.ts';

const fixturesDir = join(import.meta.dirname, 'fixtures');

function eslint(extra: Record<string, unknown> = {}, fix = true): ESLint {
  return new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: [plugin.configs.recommended, { files: ['**/*.twig'], ...extra }] as ESLint.Options['overrideConfig'],
    fix,
  });
}

async function fix(text: string, extra?: Record<string, unknown>): Promise<string> {
  const [result] = await eslint(extra).lintText(text, { filePath: join(import.meta.dirname, 'x.twig') });
  return result!.output ?? text;
}

async function lint(text: string, extra?: Record<string, unknown>) {
  const [result] = await eslint(extra, false).lintText(text, { filePath: join(import.meta.dirname, 'x.twig') });
  return result!.messages;
}

for (const name of readdirSync(fixturesDir).sort()) {
  const dir = join(fixturesDir, name);
  const input = readFileSync(join(dir, 'input.twig'), 'utf8');
  if (existsSync(join(dir, 'expected-error.txt'))) {
    test(`golden: ${name} (invalid, left untouched)`, async () => {
      assert.equal(await fix(input), input);
      const messages = await lint(input);
      assert.equal(messages.length, 1);
      assert.equal(messages[0]!.fatal, true);
      assert.equal(messages[0]!.line, 4);
    });
    continue;
  }
  test(`golden: ${name}`, async () => {
    const expected = readFileSync(join(dir, 'expected.twig'), 'utf8');
    const once = await fix(input);
    assert.equal(once, expected);
    assert.equal(await fix(once), once, 'not idempotent');
  });
}

test('eslint-disable-next-line in a Twig comment', async () => {
  const text = '{# eslint-disable-next-line twig-lint/attribute-spacing -- on purpose #}\n<p{{ a }}>x</p>\n<p{{ a }}>y</p>\n';
  const messages = await lint(text);
  assert.deepEqual(messages.map((m) => [m.ruleId, m.line]), [['twig-lint/attribute-spacing', 3]]);
  assert.equal(await fix(text), text.replace('<p{{ a }}>y', '<p {{ a }}>y'));
});

test('eslint-disable for the rest of the file, and eslint-enable', async () => {
  const text = '{# eslint-disable twig-lint/delimiter-spacing #}\n{{a}}\n{# eslint-enable twig-lint/delimiter-spacing #}\n{{b}}\n';
  const messages = await lint(text);
  assert.deepEqual(messages.map((m) => m.line), [4, 4]);
});

test('CRLF line endings are kept', async () => {
  const text = '<div>\r\n<p{{ a }}>x</p>   \r\n</div>\r\n';
  assert.equal(await fix(text), '<div>\r\n  <p {{ a }}>x</p>\r\n</div>\r\n');
});

test('rule option: attribute-spacing tight', async () => {
  const text = '<p {{ a }}>x</p>\n';
  assert.equal(await fix(text, { rules: { 'twig-lint/attribute-spacing': ['error', { mode: 'tight' }] } }), '<p{{ a }}>x</p>\n');
});

test('shared settings: indentSize 4', async () => {
  const text = '<div>\n<p>x</p>\n</div>\n';
  assert.equal(await fix(text, { settings: { 'twig-lint': { indentSize: 4 } } }), '<div>\n    <p>x</p>\n</div>\n');
});

test('a disabled rule reports nothing', async () => {
  const text = '{{a}}\n';
  assert.deepEqual(await lint(text, { rules: { 'twig-lint/delimiter-spacing': 'off' } }), []);
});

test('a parse error is a fatal message with line and column', async () => {
  const messages = await lint('<div>\n  {% if x %}\n</div>\n');
  assert.equal(messages.length, 1);
  assert.equal(messages[0]!.fatal, true);
  assert.match(messages[0]!.message, /endif/);
  assert.equal(messages[0]!.line, 2);
});

test('rule option: endblock-name never', async () => {
  const text = '{% block a %}\n  x\n{% endblock a %}\n\n{% block b %}\n  y\n{% endblock c %}\n';
  const rules = { 'twig-lint/endblock-name': ['error', { mode: 'never' }] };
  assert.equal(await fix(text, { rules }), '{% block a %}\n  x\n{% endblock %}\n\n{% block b %}\n  y\n{% endblock %}\n');
});

test('syntax rules leave tricky but valid code alone', async () => {
  const text = [
    "{{ -x }}",
    "{{ a - -b }}",
    "{{ [1, 2, 3][1:2]|join }}",
    "{{ 6 b-and 3 }}",
    "{{ {in: 1, is: 2}|keys|join(', ') }}",
    "{{ items|map((item, key) => item.title ~ key) }}",
    "{{ value is same as(false) ? 'yes' : 'no' }}",
    "{{ (a and b) or c }}",
    "{{ user?.name ?? 'Anonymous' }}",
    "{{ items|filter(item => item.visible)|length }}",
    "{% for i in 1..3 %}",
    "  {{ loop.index0 }}",
    "{% endfor %}",
    '',
  ].join('\n');
  assert.deepEqual((await lint(text)).map((m) => `${m.line}: ${m.ruleId}`), []);
});
