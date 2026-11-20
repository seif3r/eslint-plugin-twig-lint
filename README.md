# eslint-plugin-twig-lint

An ESLint plugin that lints and formats [Twig](https://twig.symfony.com/) templates.

It fixes what is wrong and leaves the rest of your style alone: indentation of blocks, HTML and
multi-line expressions, line wrapping of long tags and expressions, and spacing. It never collapses a
multi-line expression into one line, never touches the content of `<pre>`, `<textarea>`, `<script>`,
`<style>`, comments or `{% trans %}`, and leaves a file it cannot parse untouched.

Twig is plugged into ESLint as its own language, so you get ESLint's CLI, config, `--fix`, disable
comments, output formats and editor integration.

## Install

```bash
npm install --save-dev eslint eslint-plugin-twig-lint
```

Requires ESLint 9.15 or later and Node.js 20.19 or later.

## Configure

```js
// eslint.config.js
import twigLint from 'eslint-plugin-twig-lint';

export default [
  twigLint.configs.recommended,
  {
    files: ['**/*.twig'],
    // Optional shared settings (defaults shown).
    settings: { 'twig-lint': { indentSize: 2, useTabs: false, printWidth: 80 } },
  },
];
```

```bash
npx eslint "templates/**/*.twig"
npx eslint --fix "templates/**/*.twig"
```

## Rules

All rules are enabled as `error` in `recommended` and can be fixed with `--fix`.

| Rule | What it does |
|---|---|
| `twig-lint/block-indent` | Indentation of Twig blocks and HTML elements |
| `twig-lint/nested-indent` | Indentation inside multi-line expressions: one step per line that opens brackets |
| `twig-lint/attribute-spacing` | `<p{{ attrs }}>` → `<p {{ attrs }}>` (option `mode`: `space` or `tight`) |
| `twig-lint/attribute-wrap` | One attribute per line when an opening tag is longer than `printWidth` |
| `twig-lint/expression-wrap` | Breaks Twig expressions longer than `printWidth` (maps, `set`, `if`, call arguments) |
| `twig-lint/delimiter-spacing` | Exactly one space inside `{{ }}`, `{% %}` and `{# #}` |
| `twig-lint/blank-line-after-block` | An empty line after `{% endif %}`, `{% endfor %}` and similar closing tags |
| `twig-lint/empty-lines` | At most one empty line in a row |
| `twig-lint/trailing-whitespace` | No whitespace at the end of lines |
| `twig-lint/final-newline` | Exactly one newline at the end of the file |

Every rule also accepts `indentSize`, `useTabs` and `printWidth` as options, which override the shared
settings:

```js
rules: {
  'twig-lint/attribute-spacing': ['error', { mode: 'tight' }],
  'twig-lint/expression-wrap': ['error', { printWidth: 100 }],
  'twig-lint/blank-line-after-block': 'off',
}
```

### Examples

Nested indentation is fixed without collapsing the expression:

```twig
{# before #}
{% set heading_attributes = create_attribute({
    class: [
        'teaser__heading',
      ],
  }, title_attributes) %}

{# after #}
{% set heading_attributes = create_attribute({
  class: [
    'teaser__heading',
  ],
}, title_attributes) %}
```

Long opening tags get one attribute per line, and an `{% if %}` between attributes becomes a block:

```twig
<li
  class="card-grid__item card-grid__item--featured"
  {% if is_mixed %}
    style="--card-grid-index: {{ loop.index }};"
  {% endif %}
>
  {{ item }}
</li>
```

Long conditions break at the lowest-precedence operator:

```twig
{% if has_choices
    or (visible_choices is iterable
      and visible_choices|length > 0
    )
%}
```

More examples are in [`test/fixtures`](test/fixtures), where each `input.twig` has an `expected.twig`.

## Disable comments

ESLint's disable comments work inside Twig comments:

```twig
{# eslint-disable-next-line twig-lint/attribute-wrap -- generated markup #}
<div class="…very long…">

{# eslint-disable twig-lint/blank-line-after-block #}
```

## VS Code

Install the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
and add to `.vscode/settings.json`:

```jsonc
{
  "eslint.validate": ["twig", "html.twig"],
  "eslint.format.enable": true,
  "[twig]": { "editor.defaultFormatter": "dbaeumer.vscode-eslint" }
}
```

The language id depends on which Twig extension you use. Check the language mode in the status bar.
[`examples/vscode-demo`](examples/vscode-demo) is a ready-made setup that runs the plugin from source.

## Development

```bash
npm install
npm test                  # golden fixtures and plugin tests via ESLint's API
npm run golden -- --diff  # the same fixtures via eslint --fix, with diffs
npm run typecheck
npm run build             # compiles to dist/
```

The source is TypeScript that Node runs directly (type stripping, Node 22.18+). The published package
contains compiled JavaScript in `dist/`.

`test/parse-check.php` and `test/render-check.php` check that every `expected.twig` is valid Twig and
renders the same HTML as its `input.twig`. They need a Composer project with `twig/twig`:

```bash
TWIG_AUTOLOAD=/path/to/vendor/autoload.php php test/parse-check.php test/fixtures/*/expected.twig
TWIG_AUTOLOAD=/path/to/vendor/autoload.php php test/render-check.php test/fixtures/*/
```

## License

MIT
