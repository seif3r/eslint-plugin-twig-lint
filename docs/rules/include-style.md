# twig-lint/include-style

Enforce the `include()` function or the `{% include %}` tag.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended` (with `style: "both"`, which reports nothing)

## Rule details

Twig has two ways to include a template, and they render the same:

| Function | Tag |
|---|---|
| `{{ include('card') }}` | `{% include 'card' %}` |
| `{{ include('card', {title: t}) }}` | `{% include 'card' with {title: t} %}` |
| `{{ include('card', {title: t}, with_context: false) }}` | `{% include 'card' with {title: t} only %}` |
| `{{ include('card', ignore_missing: true) }}` | `{% include 'card' ignore missing %}` |

By default both are allowed. Set `style` to require one of them. `--fix` converts between them, keeping
whitespace control (`{{-` ↔ `{%-`).

Some function calls have no tag equivalent and are reported without a fix: `sandboxed`, a `with_context` or
`ignore_missing` that is not a literal `true` or `false`, and unknown named arguments. With `style: "tag"`,
only an output tag that is just an include call is reported. `{% set html = include('card') %}` and
`{{ include('card')|upper }}` need the function and are left alone.

`{% embed %}` and `{% extends %}` only exist as tags and are not affected.

## Examples

<!-- test-options: {"style": "function"} -->

### ❌ Incorrect with `style: "function"`

```twig
{% include 'theme:card' with {title: title} only %}
{%- include 'theme:banner' ignore missing only -%}
```

### ✅ Correct with `style: "function"`

```twig
{{ include('theme:card', {title: title}, with_context: false) }}
{{- include('theme:banner', with_context: false, ignore_missing: true) -}}
```

<!-- test-options: {"style": "tag"} -->

### ❌ Incorrect with `style: "tag"`

```twig
{{ include('theme:card', {
  title: title,
}, with_context: false) }}
```

### ✅ Correct with `style: "tag"`

```twig
{% include 'theme:card' with {
  title: title,
} only %}
```

```twig
{% set html = include('theme:card', with_context: false) %}
```

## Options

| Option | Default | Description |
|---|---|---|
| `style` | `"both"` | `"both"` allows both forms. `"function"` requires `{{ include() }}`. `"tag"` requires `{% include %}`. |

```js
"twig-lint/include-style": ["error", { style: "function" }]
```
