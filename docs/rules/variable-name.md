# twig-lint/variable-name

Enforce `snake_case` for names created in the template.

Fixable: no. Level: `warn` in `recommended`.

## Rule details

Names that the template itself creates use `snake_case`:

- variables from `{% set %}`,
- loop variables in `{% for key, value in … %}`,
- macro names and macro arguments,
- arrow function parameters, such as `item` in `items|filter(item => item.visible)`.

Variables that come from outside the template, such as those passed in by Drupal, are not checked, since
the template does not choose their names. The rule has no fix, because renaming a variable means changing
every place it is used.

## Examples

### Incorrect

```twig
{% set itemCount = items|length %}
{% for productItem in items|filter(visibleItem => visibleItem.active) %}
  {{ productItem.title }}
{% endfor %}
```

### Correct

```twig
{% set item_count = items|length %}
{% for product_item in items|filter(visible_item => visible_item.active) %}
  {{ product_item.title }}
{% endfor %}
```

## Options

This rule has no options of its own.
