# twig-lint/named-arguments

Enforce `name: value` for named arguments.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

Named arguments use a colon: `include('x', with_context: false)`. The `name = value` form is deprecated since
Twig 3.12. Default values in a macro definition, such as `{% macro list(items = []) %}`, use `=` and are not
affected.

## Examples

### ❌ Incorrect

```twig
{{ include('theme:card', with_context = false) }}
```

### ✅ Correct

```twig
{{ include('theme:card', with_context: false) }}
```

```twig
{% macro list(items = [], title = '') %}
  {{ title }}
{% endmacro list %}
```

## Options

This rule has no options of its own.
