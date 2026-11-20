# twig-lint/expression-wrap

Break Twig expressions that are longer than `printWidth`.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

A Twig tag that is alone on its line and longer than `printWidth` is broken into several lines. Which break
is used depends on the expression:

- **A. A map or array argument** is hugged: the entries go one per line with a trailing comma, and the rest
  of the call stays on the closing line.
- **B. `{% set x = … %}`**
  1. If the value ends with a function call, the call's arguments go one per line, and `) %}` stays on the
     closing line.
  2. Otherwise the line breaks after `=`, the value goes one step in, and `%}` goes on its own line.
  3. A ternary in a broken `set` is always broken, with `?` and `:` on their own lines.
- **C. `{% if %}` and `{% elseif %}`** break at the lowest-precedence operator (`or` before `and`) at the top
  level. The first condition stays on the `{% if` line. A parenthesized group with `and`/`or` is always broken
  too. `%}` goes on its own line.
- **D. A plain function or macro call** gets one argument per line with a trailing comma.

Strings are never broken, and parentheses are never added or removed. If none of the above applies, the line
is left long. Tags that already span several lines are not touched.

## Examples

### ❌ Incorrect

```twig
{{ include('theme:card', {title: card.title, url: card.url, image: card.image}, with_context: false) }}
```

```twig
{% set visible_items = items|default([])|filter((item, key) => not (key starts with '#')) %}
```

```twig
{% set label = is_active ? 'This item is active' : item.fallback_label|default('Inactive') %}
```

```twig
{% if is_active or (items is iterable and items|length > 0 and show_empty_state == false) %}
  {{ items|join(', ') }}
{% endif %}
```

```twig
{{ macros.card_list(page.title ? page.title : 'Untitled', page.items, page.layout) }}
```

### ✅ Correct

```twig
{{ include('theme:card', {
  title: card.title,
  url: card.url,
  image: card.image,
}, with_context: false) }}
```

```twig
{% set visible_items = items|default([])|filter(
  (item, key) => not (key starts with '#'),
) %}
```

```twig
{% set label =
  is_active
    ? 'This item is active'
    : item.fallback_label|default('Inactive')
%}
```

```twig
{% if is_active
    or (items is iterable
      and items|length > 0
      and show_empty_state == false
    )
%}
  {{ items|join(', ') }}
{% endif %}
```

```twig
{{ macros.card_list(
  page.title ? page.title : 'Untitled',
  page.items,
  page.layout,
) }}
```

## Options

| Option | Default | Description |
|---|---|---|
| `printWidth` | `80` | Maximum line length before an expression is broken |
| `indentSize` | `2` | Columns per indentation step |
| `useTabs` | `false` | Indent with tabs instead of spaces |

All three can also be set for all rules in `settings["twig-lint"]`.
