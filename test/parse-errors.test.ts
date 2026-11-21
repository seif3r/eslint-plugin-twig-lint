// A file that cannot be parsed gets one fatal message with a line number, and --fix leaves it untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fix, lint } from './helpers.ts';

const cases: Array<[string, string, number, RegExp]> = [
  ['unclosed comment', '<p>\n{# note\n</p>\n', 2, /Comment on line 2 is never closed/],
  ['unclosed string', "{{ 'abc }}\n", 1, /String on line 1 is never closed/],
  ['unclosed interpolation', '{{ "#{a\n', 1, /Interpolation on line 1 is never closed/],
  ['unclosed output tag', '<p>\n  {{ title\n</p>\n', 2, /"\{\{" on line 2 is never closed/],
  ['unclosed bracket', '{{ include(\'x\', {\n  a: 1,\n', 1, /never closed \(bracket "\(" on line 1 is still open\)/],
  ['mismatched bracket', '{{ foo(1] }}\n', 1, /"\]" on line 1 does not match "\("/],
  ['unexpected closing bracket', '{{ a) }}\n', 1, /Unexpected "\)"/],
  ['unexpected character', '{{ a @ b }}\n', 1, /Unexpected character "@"/],
  ['block tag without name', '{% %}\n', 1, /Block tag on line 1 has no name/],
  ['end tag without opening tag', '<p></p>\n{% endif %}\n', 2, /\{% endif %\} on line 2 has no matching \{% if %\}/],
  ['mismatched end tag', '{% if a %}\n{% endfor %}\n', 2, /\{% endfor %\} on line 2 does not match \{% if %\} on line 1/],
  ['else outside if', '{% else %}\n', 1, /\{% else %\} on line 1 is outside/],
  ['unclosed block', '{% for a in b %}\n  {% if a %}\n  {% endif %}\n', 1, /\{% for %\} on line 1 has no \{% endfor %\}/],
  ['unclosed verbatim', '{% verbatim %}\n{{ x }}\n', 1, /\{% verbatim %\} on line 1 has no \{% endverbatim %\}/],
  ['unclosed HTML tag', '<div>\n  <a href="x"\n', 2, /HTML tag "<a" on line 2 is never closed/],
  ['unclosed pre', '<pre>\ntext\n', 1, /<pre> on line 1 is never closed/],
  ['unterminated closing pre', '<pre>text</pre\n', 1, /<\/pre on line 1 is never closed/],
];

for (const [name, text, line, message] of cases) {
  test(`parse error: ${name}`, async () => {
    const messages = await lint(text);
    assert.equal(messages.length, 1, JSON.stringify(messages));
    assert.equal(messages[0]!.fatal, true);
    assert.equal(messages[0]!.line, line);
    assert.match(messages[0]!.message, message);
    assert.equal(await fix(text), text, 'the file must be left untouched');
  });
}
