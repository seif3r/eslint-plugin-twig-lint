<h1 align="center" alt="title">eslint-plugin-twig-lint</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-twig-lint"><img src="https://img.shields.io/npm/v/eslint-plugin-twig-lint?style=flat&colorA=111111&colorB=000000" alt="Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-twig-lint"><img src="https://img.shields.io/npm/dt/eslint-plugin-twig-lint.svg?style=flat&colorA=222222&colorB=000000" alt="Downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-000000?style=flat&colorA=333333" alt="License" /></a>
</p>

Lint and format Twig templates with ESLint.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [Install](#install)
  - [Setup](#setup)
  - [Editor Integration](#editor-integration)
- [Presets](#presets)
- [Settings](#settings)
- [Rules](#rules)
  - [Layout](#layout)
  - [Syntax](#syntax)
  - [Best Practices](#best-practices)
  - [Drupal](#drupal)
  - [Examples](#examples)
  - [Disabling Rules](#disabling-rules)
- [FAQ](#faq)
- [Disclaimer](#disclaimer)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Respectful**: Fixes what is wrong and keeps the rest of your style. Multi-line expressions are re-indented,
  never collapsed into one line.
- **Safe**: Only changes whitespace that does not affect the rendered page. The content of `<pre>`, `<textarea>`,
  `<script>`, `<style>`, comments and `{% trans %}` is never touched, and a file that cannot be parsed is left
  untouched.
- **Native ESLint**: Twig is a real ESLint language, so you get ESLint's CLI, config, `--fix`, disable comments,
  output formats and editor integration.
- **Configurable**: Every rule can be turned off or set to `warn` or `error`, and shared settings control
  indentation and line width.

## Installation

> [!NOTE]
> eslint-plugin-twig-lint requires the following minimum versions:
>
> - Node.js: 20.19.0
> - ESLint: 9.15.0

### Install

```sh
npm install --save-dev eslint eslint-plugin-twig-lint
```

### Setup

```js
// eslint.config.js

import twigLint from "eslint-plugin-twig-lint";

export default [
  // Parse **/*.twig as Twig and enable the general rules.
  twigLint.configs.recommended,

  // Optional: rules for Drupal themes and modules.
  twigLint.configs.drupal,

  {
    files: ["**/*.twig"],

    // Optional shared settings (defaults shown).
    settings: {
      "twig-lint": { indentSize: 2, useTabs: false, printWidth: 80 },
    },

    // Custom rule overrides (change rule levels or turn rules off).
    rules: {
      "twig-lint/blank-line-after-block": "warn",
    },
  },
];
```

If your config has entries without `files`, such as `js.configs.recommended` or a shared config, limit them to
your JavaScript files. Otherwise ESLint also runs their JavaScript rules on `.twig` files, which fails:

```js
const jsFiles = ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"];

export default [
  { ...js.configs.recommended, files: jsFiles },
  twigLint.configs.recommended,
  twigLint.configs.drupal,
];
```

Then run ESLint as usual:

```sh
npx eslint "templates/**/*.twig"
npx eslint --fix "templates/**/*.twig"
```

### Editor Integration

In VS Code, install the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
and add this to `.vscode/settings.json`:

```jsonc
{
  "eslint.validate": ["twig", "html.twig"],
  "eslint.format.enable": true,
  "[twig]": { "editor.defaultFormatter": "dbaeumer.vscode-eslint" }
}
```

The language id depends on which Twig extension you use. Check the language mode in the status bar.
[`examples/vscode-demo`](examples/vscode-demo) is a ready-made setup.

## Presets

- `recommended`\
  Parse `**/*.twig` with the Twig language and enable the general rules. Layout and syntax rules are `error`,
  best practices are `warn`.

- `drupal`\
  Enable the [Drupal rules](#drupal). Use it together with `recommended`. Opt-in rules such as
  `drupal/component-reference` stay off until you enable them.

## Settings

Shared settings go in `settings["twig-lint"]`. Every rule also accepts them as options, which take precedence.

| Setting | Default | Description |
|---|---|---|
| `indentSize` | `2` | Columns per indentation step |
| `useTabs` | `false` | Indent with tabs instead of spaces |
| `printWidth` | `80` | Line width used by `attribute-wrap` and `expression-wrap` |

## Rules

All general rules are in `recommended`. Fixable rules are fixed by `--fix` and by formatting in the editor.

### Layout

Enabled as `error`.

| Rule | Description | Fixable |
|---|---|---|
| [`twig-lint/block-indent`](docs/rules/block-indent.md) | Indentation of Twig blocks and HTML elements | yes |
| [`twig-lint/nested-indent`](docs/rules/nested-indent.md) | Indentation inside multi-line expressions: one step per line that opens brackets | yes |
| [`twig-lint/attribute-spacing`](docs/rules/attribute-spacing.md) | `<p{{ attrs }}>` → `<p {{ attrs }}>`. Option `mode`: `space` (default) or `tight` | yes |
| [`twig-lint/attribute-wrap`](docs/rules/attribute-wrap.md) | One attribute per line when an opening tag is longer than `printWidth`. Option `minAttributes` (default 2) | yes |
| [`twig-lint/expression-wrap`](docs/rules/expression-wrap.md) | Breaks Twig expressions longer than `printWidth`: maps, `set`, `if` and call arguments | yes |
| [`twig-lint/delimiter-spacing`](docs/rules/delimiter-spacing.md) | Exactly one space inside `{{ }}`, `{% %}` and `{# #}` | yes |
| [`twig-lint/blank-line-after-block`](docs/rules/blank-line-after-block.md) | An empty line after `{% endif %}`, `{% endfor %}` and similar closing tags | yes |
| [`twig-lint/empty-lines`](docs/rules/empty-lines.md) | At most one empty line in a row | yes |
| [`twig-lint/trailing-whitespace`](docs/rules/trailing-whitespace.md) | No whitespace at the end of lines | yes |
| [`twig-lint/final-newline`](docs/rules/final-newline.md) | Exactly one newline at the end of the file | yes |

### Syntax

Enabled as `error`.

| Rule | Description | Fixable |
|---|---|---|
| [`twig-lint/operator-spacing`](docs/rules/operator-spacing.md) | One space around binary operators, none around `.`, `\|` and `..` | yes |
| [`twig-lint/punctuation-spacing`](docs/rules/punctuation-spacing.md) | One space after commas, none inside brackets | yes |
| [`twig-lint/hash-spacing`](docs/rules/hash-spacing.md) | `{key: value}` and `name: value`: no space before the colon, one after | yes |
| [`twig-lint/single-quotes`](docs/rules/single-quotes.md) | `'single'` quotes unless the string contains `'` or uses interpolation | yes |
| [`twig-lint/hash-key-quotes`](docs/rules/hash-key-quotes.md) | No quotes around plain hash keys: `{'class': x}` → `{class: x}` | yes |
| [`twig-lint/trailing-comma`](docs/rules/trailing-comma.md) | A trailing comma when the closing bracket is on its own line. Option `multiline` | yes |
| [`twig-lint/named-arguments`](docs/rules/named-arguments.md) | `with_context: false` instead of the deprecated `with_context = false` | yes |
| [`twig-lint/endblock-name`](docs/rules/endblock-name.md) | `{% endblock content %}` and `{% endmacro card %}`. Options `mode`: `always` (default) or `never`, and `minLines` | yes |
| [`twig-lint/include-style`](docs/rules/include-style.md) | `{{ include() }}` or `{% include %}`. Option `style`: `both` (default), `function` or `tag` | yes |

### Best Practices

Enabled as `warn`. These rules point out code that works but may cause problems, so they are never fixed
automatically. Two of them offer a suggestion that you can apply in the editor.

| Rule | Description | Fixable |
|---|---|---|
| [`twig-lint/isolated-include`](docs/rules/isolated-include.md) | `include()` with `with_context: false` and `{% include %}` with `only`. Option `embed`. The editor suggests the fix | no |
| [`twig-lint/defined-check`](docs/rules/defined-check.md) | `x is defined and x is not empty` → `x is not empty`. Option `mode`: `simplify`, `require` or `allow`. The editor suggests the fix | no |
| [`twig-lint/variable-name`](docs/rules/variable-name.md) | `snake_case` for variables, loop variables, macros and arrow function parameters created in the template | no |
| [`twig-lint/no-raw`](docs/rules/no-raw.md) | Warns about `\|raw`, which turns off escaping. Option `allow` for known-safe values | no |
| [`twig-lint/deprecated-spaceless`](docs/rules/deprecated-spaceless.md) | Warns about the `spaceless` filter, deprecated since Twig 3.12 | no |

### Drupal

Enabled by the `drupal` preset.

| Rule | Description | Fixable | Level |
|---|---|---|---|
| [`twig-lint/drupal/attach-library-format`](docs/rules/drupal/attach-library-format.md) | `attach_library('extension/library')`, not a component ID like `'theme:button'` | no | error |
| [`twig-lint/drupal/no-translate-variable`](docs/rules/drupal/no-translate-variable.md) | `\|t` on a variable cannot be extracted for translation | no | warn |
| [`twig-lint/drupal/component-reference`](docs/rules/drupal/component-reference.md) | Include components by SDC ID, not by file path. Option `folders` | no | off (opt-in) |

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

### Disabling Rules

ESLint's disable comments work inside Twig comments:

```twig
{# eslint-disable-next-line twig-lint/attribute-wrap -- generated markup #}
<div class="…very long…">

{# eslint-disable twig-lint/blank-line-after-block #}
```

## FAQ

**Is it only for Drupal?**\
No. The general rules work on any Twig template, and Drupal-style templates (`create_attribute()`,
`<p {{ attributes }}>`, `{% trans %}`) are well covered by the tests. Rules that only make sense in Drupal are
under `twig-lint/drupal/` and only run with the `drupal` preset.

**What happens with a file that cannot be parsed?**\
ESLint reports a fatal parsing error with the line and column, and `--fix` leaves the file untouched.

**Does `--fix` change the rendered HTML?**\
It should not. The fixtures are checked by rendering both `input.twig` and `expected.twig` with Twig and
comparing the HTML trees (see [Contributing](#contributing)).

## Disclaimer

This project is not affiliated with or endorsed by Symfony, the Twig project or the ESLint project.

## Contributing

Contributions are welcome! Open an issue or a pull request.

```sh
npm install
npm test           # all fixtures and plugin tests via ESLint's API
npm run coverage   # the same, with a coverage report
npm run typecheck
npm run build      # compiles to dist/
```

CI runs the tests on Node 22 and 24 with ESLint 9.15, 9 and 10, checks that the packed package works on its
own, and runs the PHP checks below.

The source is TypeScript that Node runs directly (type stripping, Node 22.18+). The published package
contains compiled JavaScript in `dist/`.

A new formatting case is a folder in [`test/fixtures`](test/fixtures) with an `input.twig` and an
`expected.twig` (or an `expected-error.txt` for a file that must be left untouched). Two PHP scripts check
that every `expected.twig` is valid Twig and renders the same HTML as its `input.twig`. They need a Composer
project with `twig/twig`:

```sh
TWIG_AUTOLOAD=/path/to/vendor/autoload.php php test/parse-check.php test/fixtures/*/expected.twig
TWIG_AUTOLOAD=/path/to/vendor/autoload.php php test/render-check.php test/fixtures/*/
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
