# twig-lint/attribute-wrap

Put one attribute per line when an opening tag is longer than `printWidth`.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

When an opening tag, counted from the start of the indentation to its `>`, is longer than `printWidth`, each
attribute goes on its own line one step in, and `>` goes on its own line at the tag's level. An attribute is
`name="value"` (with any Twig inside the value) or standalone output such as `{{ attributes }}`.

- An `{% if %}` … `{% endif %}` between attributes is broken out as a block, with its content one step in.
  If any of its tags uses whitespace control (`{%-` or `-%}`), it is kept on one line exactly as it is.
- Only the opening tag counts. A line that is long because of its content is left alone.
- For block elements (`div`, `li`, `p`, `figure`, `ul` …), content on the same line moves to its own lines.
  For inline elements (`a`, `span`, `strong`, `button` …), content stays right after `>`, since moving it
  would add visible spaces.
- Tags with fewer than `minAttributes` attributes (default 2) stay on one line, however long. An `{% if %}`
  between attributes counts as one attribute.
- Tags that already span several lines are not touched.

## Examples

### Incorrect

```twig
<a href="{{ url }}" class="button button--primary button--large" target="_blank" rel="noopener">Read more</a>
```

```twig
<li class="menu__item menu__item--active"{% if is_current %} aria-current="page"{% endif %}>{{ link }}</li>
```

### Correct

```twig
<a
  href="{{ url }}"
  class="button button--primary button--large"
  target="_blank"
  rel="noopener"
>Read more</a>
```

```twig
<li
  class="menu__item menu__item--active"
  {% if is_current %}
    aria-current="page"
  {% endif %}
>
  {{ link }}
</li>
```

```twig
<div class="card card--featured card--with-a-very-long-modifier-name card--highlighted">
  {{ content }}
</div>
```

<!-- test-options: {"minAttributes": 1} -->

### Incorrect with `minAttributes: 1`

```twig
<div class="card card--featured card--with-a-very-long-modifier-name card--highlighted">
  {{ content }}
</div>
```

### Correct with `minAttributes: 1`

```twig
<div
  class="card card--featured card--with-a-very-long-modifier-name card--highlighted"
>
  {{ content }}
</div>
```

## Options

| Option | Default | Description |
|---|---|---|
| `minAttributes` | `2` | Tags with fewer attributes are never broken |
| `printWidth` | `80` | Maximum length of an opening tag before it is broken |
| `indentSize` | `2` | Columns per indentation step |
| `useTabs` | `false` | Indent with tabs instead of spaces |

All three can also be set for all rules in `settings["twig-lint"]`.
