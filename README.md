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
  // Parse **/*.twig as Twig and enable all rules as errors.
  twigLint.configs.recommended,

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
  Parse `**/*.twig` with the Twig language and enable all rules as `error`.

## Settings

Shared settings go in `settings["twig-lint"]`. Every rule also accepts them as options, which take precedence.

| Setting | Default | Description |
|---|---|---|
| `indentSize` | `2` | Columns per indentation step |
| `useTabs` | `false` | Indent with tabs instead of spaces |
| `printWidth` | `80` | Line width used by `attribute-wrap` and `expression-wrap` |

## Rules

All rules are in `recommended` and can be fixed with `--fix`.

| Rule | Description |
|---|---|
| [`twig-lint/block-indent`](docs/rules/block-indent.md) | Indentation of Twig blocks and HTML elements |
| [`twig-lint/nested-indent`](docs/rules/nested-indent.md) | Indentation inside multi-line expressions: one step per line that opens brackets |
| [`twig-lint/attribute-spacing`](docs/rules/attribute-spacing.md) | `<p{{ attrs }}>` → `<p {{ attrs }}>`. Option `mode`: `space` (default) or `tight` |
| [`twig-lint/attribute-wrap`](docs/rules/attribute-wrap.md) | One attribute per line when an opening tag is longer than `printWidth` |
| [`twig-lint/expression-wrap`](docs/rules/expression-wrap.md) | Breaks Twig expressions longer than `printWidth`: maps, `set`, `if` and call arguments |
| [`twig-lint/delimiter-spacing`](docs/rules/delimiter-spacing.md) | Exactly one space inside `{{ }}`, `{% %}` and `{# #}` |
| [`twig-lint/blank-line-after-block`](docs/rules/blank-line-after-block.md) | An empty line after `{% endif %}`, `{% endfor %}` and similar closing tags |
| [`twig-lint/empty-lines`](docs/rules/empty-lines.md) | At most one empty line in a row |
| [`twig-lint/trailing-whitespace`](docs/rules/trailing-whitespace.md) | No whitespace at the end of lines |
| [`twig-lint/final-newline`](docs/rules/final-newline.md) | Exactly one newline at the end of the file |

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

**Why not Prettier?**\
Prettier reprints the whole file in its own style. This plugin keeps your style and only fixes what is
wrong, and it also works as a linter with per-rule levels and disable comments.

**Is it only for Drupal?**\
No. The rules work on any Twig template. Drupal-style templates (`create_attribute()`, `<p {{ attributes }}>`,
`{% trans %}`) are well covered by the tests.

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
npm run typecheck
npm run build      # compiles to dist/
```

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
