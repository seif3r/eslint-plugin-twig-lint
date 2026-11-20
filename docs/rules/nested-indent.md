# twig-lint/nested-indent

Enforce indentation inside multi-line Twig expressions.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

A multi-line expression keeps its line breaks and is re-indented:

- Each **line** that opens brackets adds **one** step, however many brackets it opens.
  `create_attribute({` adds one step, not two.
- A line that starts with a closing bracket (`}`, `]`, `)`) or closing delimiter (`%}`, `}}`) gets the same
  indentation as the line that opened it.
- A line that starts with `?` or `:` in a ternary gets one extra step.
- A line that starts with `and` or `or` directly inside an `{% if %}` or `{% elseif %}` tag is indented two
  steps, so it stands out from the block content.

Expressions are never collapsed into one line. Long single-line expressions are broken by
[`expression-wrap`](expression-wrap.md).

## Examples

### ❌ Incorrect

```twig
{% set attributes = create_attribute({
    class: [
        'card',
      ],
  }) %}
```

### ✅ Correct

```twig
{% set attributes = create_attribute({
  class: [
    'card',
  ],
}) %}
```

```twig
{% set label =
  is_active
    ? 'Active'
    : 'Inactive'
%}
```

```twig
{% if is_active
    or is_pending
%}
  {{ label }}
{% endif %}
```

## Options

| Option | Default | Description |
|---|---|---|
| `indentSize` | `2` | Columns per indentation step |
| `useTabs` | `false` | Indent with tabs instead of spaces |

Both can also be set for all rules in `settings["twig-lint"]`.
