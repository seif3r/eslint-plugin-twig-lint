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

const style = (s: string) => ({ rules: { 'twig-lint/include-style': ['error', { style: s }], 'twig-lint/isolated-include': 'off' } });

test('include-style: tag and function convert both ways', async () => {
  const tags = [
    "{% include 'card' %}\n",
    "{% include 'card' with {a: 1} %}\n",
    "{% include 'card' only %}\n",
    "{% include 'card' with vars only %}\n",
    "{% include 'card' ignore missing with {a: 1} only %}\n",
    "{% include ['a', 'b'] %}\n",
    "{%- include 'card' -%}\n",
  ];
  const functions = [
    "{{ include('card') }}\n",
    "{{ include('card', {a: 1}) }}\n",
    "{{ include('card', with_context: false) }}\n",
    "{{ include('card', vars, with_context: false) }}\n",
    "{{ include('card', {a: 1}, with_context: false, ignore_missing: true) }}\n",
    "{{ include(['a', 'b']) }}\n",
    "{{- include('card') -}}\n",
  ];
  for (const [i, tag] of tags.entries()) {
    assert.equal(await fix(tag, style('function')), functions[i]);
    assert.equal(await fix(functions[i]!, style('tag')), tag);
  }
});

test('include-style: positional and named variables', async () => {
  assert.equal(await fix("{{ include('card', {a: 1}, false) }}\n", style('tag')), "{% include 'card' with {a: 1} only %}\n");
  assert.equal(await fix("{{ include('card', variables: {a: 1}) }}\n", style('tag')), "{% include 'card' with {a: 1} %}\n");
});

test('include-style: no fix without an exact equivalent', async () => {
  for (const code of [
    "{{ include('card', sandboxed: true) }}\n",
    "{{ include('card', with_context: is_isolated) }}\n",
  ]) {
    const messages = await lint(code, style('tag'));
    assert.deepEqual(messages.map((m) => m.ruleId), ['twig-lint/include-style']);
    assert.equal(await fix(code, style('tag')), code);
  }
});

test('include-style: tag style leaves include() inside expressions alone', async () => {
  const code = "{% set html = include('card') %}\n{{ include('card')|upper }}\n";
  assert.deepEqual(await lint(code, style('tag')), []);
});

const ids = async (code: string, extra?: Record<string, unknown>) =>
  (await lint(code, extra)).map((m) => `${m.line}:${m.ruleId}:${m.severity}`);

test('warn-only rules are warnings in recommended', async () => {
  assert.deepEqual(await ids("{{ body|raw }}\n"), ['1:twig-lint/no-raw:1']);
});

test('variable-name: what is checked', async () => {
  const code = [
    "{% set first, secondValue = 1, 2 %}",
    "{% for key, ItemValue in items %}",
    "  {{ key ~ ItemValue ~ first ~ secondValue }}",
    "{% endfor %}",
    "",
    "{% macro cardList(cardItems = [], _internal = false, item2 = null) %}",
    "  {{ cardItems|map(singleCard => singleCard)|join }}",
    "{% endmacro cardList %}",
    "{{ someDrupalVariable }}",
    '',
  ].join('\n');
  assert.deepEqual((await lint(code)).filter((m) => m.ruleId === 'twig-lint/variable-name').map((m) => m.message), [
    'The variable "secondValue" should be snake_case: "second_value".',
    'The loop variable "ItemValue" should be snake_case: "item_value".',
    'The macro "cardList" should be snake_case: "card_list".',
    'The macro argument "cardItems" should be snake_case: "card_items".',
    'The arrow function parameter "singleCard" should be snake_case: "single_card".',
  ]);
});

test('isolated-include: accepted and reported forms', async () => {
  const ok = [
    "{{ include('a', {}, false) }}",
    "{{ include('a', with_context: false) }}",
    "{% set html = include('a', with_context: false) %}",
    "{% include 'a' only %}",
    "{{ helper.include('a') }}",
    "{% embed 'a' %}{% endembed %}",
    '',
  ].join('\n');
  assert.deepEqual((await lint(ok)).filter((m) => m.ruleId === 'twig-lint/isolated-include'), []);
  const bad = "{{ include('a', with_context: true) }}\n{{ include('a', with_context: isolated) }}\n{% set html = include('a') %}\n";
  assert.deepEqual((await lint(bad)).filter((m) => m.ruleId === 'twig-lint/isolated-include').map((m) => m.line), [1, 2, 3]);
});

test('isolated-include: the suggestion handles a trailing comma', async () => {
  const code = "{{ include('a', {\n  b: 1,\n},\n) }}\n";
  const [m] = (await lint(code)).filter((x) => x.ruleId === 'twig-lint/isolated-include');
  const f = m!.suggestions![0]!.fix;
  assert.equal(code.slice(0, f.range[0]) + f.text + code.slice(f.range[1]), "{{ include('a', {\n  b: 1,\n}, with_context: false,\n) }}\n");
});

test('defined-check: operands must match', async () => {
  const code = [
    "{% if node.field_tags[0].value is defined and node.field_tags[0].value is not empty %}{% endif %}",
    "{% if a is defined and b is not empty %}{% endif %}",
    "{% if c or title is defined and title is not empty %}{% endif %}",
    '',
  ].join('\n');
  assert.deepEqual((await lint(code)).filter((m) => m.ruleId === 'twig-lint/defined-check').map((m) => m.line), [1, 3]);
  const [m] = await lint("{{ x.y is defined and x.y is not empty }}\n");
  assert.equal(m!.suggestions![0]!.fix.text, '');
  assert.deepEqual(m!.suggestions![0]!.fix.range, [3, 22]);
});

test('deprecated-spaceless: filter forms', async () => {
  const code = "{{ html|spaceless }}\n{% apply spaceless|upper %}x{% endapply %}\n{{ spaceless }}\n";
  assert.deepEqual((await lint(code)).filter((m) => m.ruleId === 'twig-lint/deprecated-spaceless').map((m) => m.line), [1, 2]);
});

test('presets: drupal rules only in configs.drupal, component-reference is opt-in', () => {
  const recommended = Object.keys(plugin.configs.recommended.rules);
  assert.ok(recommended.every((id) => !id.startsWith('twig-lint/drupal/')));
  assert.deepEqual(plugin.configs.drupal.rules, {
    'twig-lint/drupal/attach-library-format': 'error',
    'twig-lint/drupal/no-translate-variable': 'warn',
  });
});

const drupal = async (code: string, extra: Record<string, unknown> = {}) => {
  const [result] = await new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: [plugin.configs.recommended, plugin.configs.drupal, { files: ['**/*.twig'], ...extra }] as ESLint.Options['overrideConfig'],
  }).lintText(code, { filePath: join(import.meta.dirname, 'x.twig') });
  return result!.messages.filter((m) => m.ruleId?.startsWith('twig-lint/drupal/')).map((m) => `${m.line}:${m.ruleId!.slice(17)}`);
};

test('drupal/no-translate-variable', async () => {
  const code = "{{ 'a' ~ 'b'|t }}\n{{ 'a' ~ label|t }}\n{{ item.label|trans }}\n{{ 'x'|t({'@a': b}) }}\n";
  assert.deepEqual(await drupal(code), ['2:no-translate-variable', '3:no-translate-variable']);
});

test('drupal/attach-library-format', async () => {
  const code = "{{ attach_library(library) }}\n{{ attach_library('a/b') }}\n{{ attach_library('a:b') }}\n{{ attach_library('A/b') }}\n";
  assert.deepEqual(await drupal(code), ['3:attach-library-format', '4:attach-library-format']);
});

test('drupal/component-reference when enabled', async () => {
  const code = [
    "{% include '@t/components/card/card.twig' only %}",
    "{% embed 'components/card.twig' only %}{% endembed %}",
    "{{ include('t:card', with_context: false) }}",
    "{{ include('@t/templates/page.html.twig', with_context: false) }}",
    '',
  ].join('\n');
  assert.deepEqual(await drupal(code), []);
  assert.deepEqual(await drupal(code, { rules: { 'twig-lint/drupal/component-reference': 'warn' } }), ['1:component-reference', '2:component-reference']);
});

test('no-raw: allow patterns match names and dotted paths', async () => {
  const code = "{{ _block_content|raw }}\n{{ content.body|raw }}\n{{ item.render()|raw }}\n{{ other|raw }}\n{{ 'x' ~ media|raw }}\n";
  const rules = { 'twig-lint/no-raw': ['warn', { allow: ['_block_*', 'content.*', 'media'] }] };
  assert.deepEqual((await lint(code, { rules })).filter((m) => m.ruleId === 'twig-lint/no-raw').map((m) => m.line), [3, 4]);
});
