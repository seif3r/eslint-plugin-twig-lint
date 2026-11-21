// Edge cases: protected content, settings, line endings, ESLint comments, wrap fallbacks and the SourceCode API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import plugin, { TwigLanguage, type TwigNode } from '../src/index.ts';
import { filePath, fix, lint, problems } from './helpers.ts';

// --- Content that must never be touched -----------------------------------------------------------

test('script, style, HTML comments and verbatim/raw keep their content', async () => {
  const input = [
    '<!DOCTYPE html>', '<div>', '<script>', '    if (a) {   ', '  b();', '', '', '', '    }', '</script>',
    '<style>', '   .a {color:red;}  ', '</style>', '<!--', '      {{x}} comment   ', '-->',
    '{% verbatim %}', '    {{not twig}}   ', '{% endverbatim %}', '{% raw %}', '  {{also not}}', '{% endraw %}', '</div>', '',
  ].join('\n');
  const expected = [
    '<!DOCTYPE html>', '<div>', '  <script>', '    if (a) {   ', '  b();', '', '', '', '    }', '</script>',
    // An HTML comment is HTML, so its lines keep their indentation, but Twig inside it still runs and is
    // formatted, and trailing spaces are removed.
    '  <style>', '   .a {color:red;}  ', '</style>', '  <!--', '      {{ x }} comment', '-->',
    '  {% verbatim %}', '    {{not twig}}   ', '{% endverbatim %}', '  {% raw %}', '  {{also not}}', '{% endraw %}', '</div>', '',
  ].join('\n');
  assert.equal(await fix(input), expected);
  assert.equal(await fix(expected), expected);
});

test('trans and plural content is left alone', async () => {
  const input = '<p>\n{% trans %}\n      One   item\n{% plural count %}\n   {{ count }} items\n{% endtrans %}\n</p>\n';
  assert.equal(await fix(input), '<p>\n  {% trans %}\n      One   item\n{% plural count %}\n   {{ count }} items\n{% endtrans %}\n</p>\n');
});

// --- Settings --------------------------------------------------------------------------------------

test('useTabs indents with tabs', async () => {
  const input = '<div>\n<p>\n{{ x }}\n</p>\n</div>\n';
  assert.equal(await fix(input, { settings: { 'twig-lint': { useTabs: true } } }), '<div>\n\t<p>\n\t\t{{ x }}\n\t</p>\n</div>\n');
});

test('printWidth decides when a tag is wrapped', async () => {
  const tag = '<a href="{{ url }}" class="button button--primary button--large" target="_blank">Read more</a>\n';
  const opening = tag.indexOf('>') + 1;
  assert.equal(opening, 81);
  assert.notEqual(await fix(tag), tag);
  assert.equal(await fix(tag, { settings: { 'twig-lint': { printWidth: 81 } } }), tag);
  assert.equal(await fix(tag, { rules: { 'twig-lint/attribute-wrap': ['error', { printWidth: 120 }] } }), tag);
});

// --- Line endings and end of file -------------------------------------------------------------------

test('final-newline: missing, extra and empty file', async () => {
  assert.equal(await fix('<p>x</p>'), '<p>x</p>\n');
  assert.equal(await fix('<p>x</p>\n\n\n'), '<p>x</p>\n');
  assert.equal(await fix(''), '');
  assert.deepEqual(await problems(''), []);
});

test('CRLF: final newline and blank line after a block', async () => {
  assert.equal(await fix('<p>x</p>\r\n\r\n'), '<p>x</p>\r\n');
  assert.equal(await fix('{% if a %}\r\n  x\r\n{% endif %}\r\n<p>y</p>\r\n'), '{% if a %}\r\n  x\r\n{% endif %}\r\n\r\n<p>y</p>\r\n');
});

// --- ESLint comments ----------------------------------------------------------------------------

test('eslint-disable-line', async () => {
  assert.deepEqual(await problems('{{a}} {# eslint-disable-line twig-lint/delimiter-spacing #}\n{{b}}\n'), [
    '2:twig-lint/delimiter-spacing', '2:twig-lint/delimiter-spacing',
  ]);
});

test('eslint-disable-line spanning several lines is reported', async () => {
  const messages = await lint('{{ a }} {# eslint-disable-line\n  twig-lint/delimiter-spacing #}\n');
  assert.ok(messages.some((m) => m.ruleId === null && /should not span multiple lines/.test(m.message)));
});

test('inline config comments change rule levels', async () => {
  assert.deepEqual(await problems('{# eslint twig-lint/delimiter-spacing: off #}\n{{a}}\n'), []);
  const messages = await lint('{# eslint twig-lint/delimiter-spacing: [nope #}\n{{ a }}\n');
  assert.equal(messages.length, 1);
  assert.equal(messages[0]!.ruleId, null);
});

test('unused disable comments are reported', async () => {
  const messages = await lint('{# eslint-disable-next-line twig-lint/no-raw #}\n{{ a }}\n', {
    linterOptions: { reportUnusedDisableDirectives: 'warn' },
  });
  assert.equal(messages.length, 1);
  assert.match(messages[0]!.message, /Unused eslint-disable directive/);
});

// --- Wrap fallbacks ------------------------------------------------------------------------------------

test('attribute-wrap: block element with content and closing tag on later lines', async () => {
  const input = '<li class="menu__item menu__item--active menu__item--expanded" data-menu-depth="1">{{ link }}\n</li>\n';
  assert.ok(input.indexOf('>') + 1 > 80);
  assert.equal(await fix(input), '<li\n  class="menu__item menu__item--active menu__item--expanded"\n  data-menu-depth="1"\n>\n  {{ link }}\n</li>\n');
});

test('attribute-wrap: empty element keeps its closing tag after >', async () => {
  const input = '<div class="placeholder placeholder--large placeholder--with-border" data-id="1"></div>\n';
  assert.equal(await fix(input), '<div\n  class="placeholder placeholder--large placeholder--with-border"\n  data-id="1"\n></div>\n');
});

test('expression-wrap: set falls back to breaking after = when the call does not fit', async () => {
  const input = "{% set formatted_publication_date_label = node.field_publication_date.value|date('Y-m-d') %}\n";
  assert.equal(await fix(input), "{% set formatted_publication_date_label =\n  node.field_publication_date.value|date('Y-m-d')\n%}\n");
});

test('deprecated-spaceless: the removed spaceless tag', async () => {
  assert.ok((await problems('{% spaceless %}<b>x</b>{% endspaceless %}\n')).includes('1:twig-lint/deprecated-spaceless'));
});

// --- Language and SourceCode -----------------------------------------------------------------------

test('SourceCode: traversal, parents, ranges and locations', () => {
  const language = new TwigLanguage();
  // Options for other languages (from configs without `files`) are ignored, not rejected.
  language.validateLanguageOptions({ ecmaVersion: 'latest', sourceType: 'module' });
  language.validateLanguageOptions({});
  const file = { body: '<p>{{ a }}</p>\n{# c #}\n', path: filePath };
  const result = language.parse(file);
  assert.ok(result.ok);
  const sc = language.createSourceCode(file, result);
  const steps = [...sc.traverse()];
  assert.equal(steps.length, 2 * (1 + result.ast.children!.length));
  assert.equal([...sc.traverse()].length, steps.length, 'traverse is cached');
  const output = result.ast.children!.find((n: TwigNode) => n.type === 'TwigOutput')!;
  assert.equal(sc.getParent(output), result.ast);
  assert.deepEqual(sc.getRange(output), [3, 10]);
  assert.deepEqual(sc.getLoc(output).start, { line: 1, column: 4, offset: 3 });
  assert.deepEqual(sc.comments.map((c) => c.value), [' c ']);
  assert.ok(plugin.meta.namespace === 'twig-lint');
});

test('multi-line strings keep their content', async () => {
  const input = "<div>\n{{ 'first line   \n      second line'|nl2br }}\n</div>\n";
  assert.equal(await fix(input), "<div>\n  {{ 'first line   \n      second line'|nl2br }}\n</div>\n");
});

test('interpolation can contain strings and hashes', async () => {
  const input = '{{ "Hello #{ name ?: \'guest\' } and #{ {a: \'}\'}|length }" }}\n';
  assert.deepEqual(await problems(input), []);
});

test('JavaScript language options from a global config do not break Twig files', async () => {
  const messages = await lint('{{ a }}\n', { languageOptions: { ecmaVersion: 'latest', sourceType: 'module' } });
  assert.deepEqual(messages, []);
});
