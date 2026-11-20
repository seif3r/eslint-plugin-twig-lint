# twig-lint/endblock-name

Enforce or disallow the block name on `{% endblock %}` and `{% endmacro %}`.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

Twig lets you repeat the name on the closing tag of a block or macro: `{% endblock content %}`,
`{% endmacro card %}`. This rule makes a template use one style. By default the name is required, which
makes long blocks easier to follow.

A name that does not match the opening tag, such as `{% block header %}` … `{% endblock footer %}`, is a Twig
compile error. It is reported in both modes and fixed to the right name (or removed with `"never"`).

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

## Options

| Option | Default | Description |
|---|---|---|
| `mode` | `"always"` | `"always"` requires the name on the end tag. `"never"` removes it: `{% endblock %}` |

```js
"twig-lint/endblock-name": ["error", { mode: "never" }]
```
