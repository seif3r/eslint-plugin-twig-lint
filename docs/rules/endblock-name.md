# twig-lint/endblock-name

Enforce or disallow the block name on `{% endblock %}` and `{% endmacro %}`.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

Twig lets you repeat the name on the closing tag of a block or macro: `{% endblock content %}`,
`{% endmacro card %}`. This rule makes a template use one style. By default the name is required, which
makes long blocks easier to follow.

A name that does not match the opening tag, such as `{% block header %}` … `{% endblock footer %}`, is a Twig
compile error. It is reported in both modes and fixed to the right name (or removed with `"never"`).

With `minLines`, short blocks may leave out the name, since their start is in view anyway. A wrong name is
still reported.

Short blocks without an end tag, such as `{% block title page_title %}`, are not affected.

## Examples

### ❌ Incorrect

```twig
{% block content %}
  {{ content }}
{% endblock %}
```

```twig
{% macro card(title) %}
  <h3>{{ title }}</h3>
{% endmacro cards %}
```

### ✅ Correct

```twig
{% block content %}
  {{ content }}
{% endblock content %}
```

```twig
{% macro card(title) %}
  <h3>{{ title }}</h3>
{% endmacro card %}
```

<!-- test-options: {"minLines": 4} -->

### ❌ Incorrect with `minLines: 4`

```twig
{% block content %}
  <h2>{{ title }}</h2>
  {{ content }}
{% endblock %}
```

### ✅ Correct with `minLines: 4`

```twig
{% block content %}
  <h2>{{ title }}</h2>
  {{ content }}
{% endblock content %}
```

```twig
{% block title %}{{ title }}{% endblock %}
```

## Options

| Option | Default | Description |
|---|---|---|
| `mode` | `"always"` | `"always"` requires the name on the end tag. `"never"` removes it: `{% endblock %}` |
| `minLines` | `0` | With `"always"`: blocks shorter than this many lines, counting the opening and closing tag lines, may leave out the name |

```js
"twig-lint/endblock-name": ["error", { mode: "always", minLines: 10 }]
```
