# twig-lint/expression-wrap

Break Twig expressions that are longer than `printWidth`.

Fixable: yes. Level: `error` in `recommended`.

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
- **D. Other output tags (`{{ … }}`)**
  1. A filter chain (a value followed by `|filter` steps) breaks before each `|`, one step in, with `}}`
     on the last line. This only applies when the whole expression is the chain: in `a ~ b|upper` or a
     ternary, breaking at `|` would misrepresent precedence, so those are left alone.
  2. A plain function or macro call gets one argument per line with a trailing comma.

- **E. One element of an expression that already spans several lines** (a map entry, an array item or an
  argument on its own line):
  1. A ternary value breaks before `?` and `:`, one step in.
  2. Otherwise the value breaks before each operator of the lowest precedence at the top level, with the
     operator first on the line, one step in. Only `~`, `+`, `-`, `and`, `or` and `??` are broken. If the
     lowest operator is a comparison or `starts with`, the line is left long.
  3. A parenthesized ternary that is still too long after that keeps its condition after `(`, puts `?` and `:`
     on their own lines one step in, and `)` on its own line.

  A map key or named argument stays on the first line.

Strings are never broken, and parentheses are never added or removed. If none of the above applies, the line
is left long. Apart from E, tags that already span several lines are not touched.

## Examples

### Incorrect

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

```twig
{{ items|filter(item => item.visible)|map(item => item.title)|join(', ')|default('No items') }}
```

```twig
{% set grid_attributes = create_attribute({
  style: 'grid-template-columns: minmax(0, 1fr)' ~ (columns|length > 1 ? ' repeat(' ~ (columns|length - 1) ~ ', fit-content(20rem))' : '') ~ ';',
  title: is_featured ? 'Featured content for the current visitor' : 'Regular content for everyone',
}) %}
```

### Correct

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

```twig
{{ items
  |filter(item => item.visible)
  |map(item => item.title)
  |join(', ')
  |default('No items') }}
```

```twig
{% set grid_attributes = create_attribute({
  style: 'grid-template-columns: minmax(0, 1fr)'
    ~ (columns|length > 1
      ? ' repeat(' ~ (columns|length - 1) ~ ', fit-content(20rem))'
      : ''
    )
    ~ ';',
  title: is_featured
    ? 'Featured content for the current visitor'
    : 'Regular content for everyone',
}) %}
```

## Options

| Option | Default | Description |
|---|---|---|
| `printWidth` | `80` | Maximum line length before an expression is broken |
| `indentSize` | `2` | Columns per indentation step |
| `useTabs` | `false` | Indent with tabs instead of spaces |

All three can also be set for all rules in `settings["twig-lint"]`.
